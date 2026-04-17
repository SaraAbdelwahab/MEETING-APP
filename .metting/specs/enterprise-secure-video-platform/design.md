# Design Document: Enterprise Secure Video Platform

## Overview

This document describes the technical design for upgrading the existing meeting app
(Express.js + MySQL + Socket.IO + React 19 + SimplePeer) into an enterprise-grade
secure video platform. The upgrade is additive: all existing routes, models, and
real-time behaviour are preserved. New capabilities are layered on top via dedicated
service classes, new database tables, and new frontend contexts/components.

The four pillars and their primary owners:

| Pillar | Backend Service | Frontend Component |
|---|---|---|
| Security | KeyExchangeService, DeviceBindingService | SecureSignalingLayer |
| Integrity | RecordingService, AuditStore | IntegrityVerifier |
| Identity | IdentityService | BiometricEngine |
| Continuity | HandoffService | DeviceHandoffManager |

### Key Design Decisions

- No raw biometric data leaves the device. The BiometricEngine runs entirely in the
  browser using the Web Crypto API and face-api.js. Only a signed JWT
  (Verification_Token) is transmitted.
- Post-quantum crypto is additive. ML-KEM-768 is combined with X25519 ECDH in a
  hybrid KEM. If the PQ library is unavailable the system falls back to ECDH-only and
  logs a WARNING — it never silently degrades.
- Append-only audit semantics are enforced at the database layer via a MySQL trigger
  that raises an error on any UPDATE or DELETE against audit_log and
  recording_merkle_roots.
- Shadow sessions are invisible to other participants. The HandoffService keeps
  shadow streams muted and excludes them from the participant list broadcast.
- Existing Socket.IO events are unchanged. New encrypted signaling events use a
  separate secure:* namespace prefix so legacy clients are unaffected.

---

## Architecture

### High-Level Component Diagram

```
+---------------------------------------------------------------------+
|                        React 19 Frontend                            |
|                                                                     |
|  +----------------+  +------------------+  +--------------------+  |
|  |  AuthContext   |  |  SocketContext   |  |   WebRTCContext    |  |
|  +----------------+  +------------------+  +--------------------+  |
|                                                                     |
|  +----------------------------------------------------------------+ |
|  |           SecureSignalingLayer  (NEW)                          | |
|  |  wraps SocketContext - encrypts/decrypts secure:* events       | |
|  +----------------------------------------------------------------+ |
|                                                                     |
|  +-----------------+  +------------------+  +------------------+   |
|  | BiometricEngine |  | IntegrityVerifier|  |DeviceHandoffMgr  |   |
|  |    (NEW)        |  |    (NEW)         |  |    (NEW)         |   |
|  +-----------------+  +------------------+  +------------------+   |
+---------------------------------------------------------------------+
                              | HTTPS / WSS
+---------------------------------------------------------------------+
|                     Express.js Backend                              |
|                                                                     |
|  +----------------------------------------------------------------+ |
|  |                  SocketService (existing)                      | |
|  |  + secure:* event handlers delegated to new services           | |
|  +----------------------------------------------------------------+ |
|                                                                     |
|  +------------------+  +------------------+  +------------------+  |
|  |KeyExchangeService|  |DeviceBindingServ.|  |  IdentityService |  |
|  |    (NEW)         |  |    (NEW)         |  |    (NEW)         |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                     |
|  +------------------+  +------------------+  +------------------+  |
|  | RecordingService |  |  HandoffService  |  |   AuditStore     |  |
|  |    (NEW)         |  |    (NEW)         |  |    (NEW)         |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                     |
|  +----------------------------------------------------------------+ |
|  |                  MySQL (existing pool)                         | |
|  |  + 8 new tables (see Data Models section)                      | |
|  +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Session Establishment Sequence

```
Client                              Backend
  |                                    |
  |-- POST /api/sessions/init -------->|  (1) Client sends X25519 pub key + ML-KEM-768 encap key
  |                                    |  KeyExchangeService derives shared secret (HKDF-SHA256)
  |<-- { kemCiphertext,                |  (2) Server returns KEM ciphertext + X25519 pub key
  |      serverX25519Pub, sessionId }  |
  |                                    |
  |  [Client decapsulates KEM,         |
  |   combines with X25519 DH,         |
  |   derives Session_Key]             |
  |                                    |
  |-- secure:session-ready ----------->|  (3) Encrypted hello (AES-256-GCM, Session_Key)
  |                                    |  DeviceBindingService records fingerprint
  |<-- secure:session-ack -------------|  (4) Session active
```

### Key Rotation Sequence

```
Backend (timer fires at T+30min)
  |
  |-- secure:rekey-init -----------> Client   (new KEM encapsulation)
  |<-- secure:rekey-confirm --------- Client   (client decapsulates, sends encrypted ack)
  |
  |  [old key retired, new Session_Key active]
  |  [AuditStore.write(key_rotation event)]
```

### Failover Sequence

```
Primary Device        Shadow Device          Backend
      |                     |                   |
      |                     |<-- snapshot -------|  (every 2s)
      |                     |                   |
      X  (disconnect)       |                   |
                            |                   |  HandoffService detects primary disconnect (<3s)
                            |<-- promote --------|
                            |                   |
                            |-- streams unmuted  |
                            |-- state restored   |
                            |-- notify peers ----|---> Other Participants
```

---

## Components and Interfaces

### Backend Services

#### KeyExchangeService

Responsible for hybrid post-quantum key exchange and periodic key rotation.

```javascript
class KeyExchangeService {
  // Initiate hybrid KEM handshake. Returns server public material.
  async initiateHandshake(clientX25519Pub, clientKEMEncapKey)
    // => { sessionId, serverX25519Pub, kemCiphertext, expiresAt }

  // Derive Session_Key from combined ECDH + KEM shared secrets using HKDF-SHA256.
  deriveSessionKey(ecdhSecret, kemSharedSecret)
    // => Buffer (32 bytes, AES-256-GCM key)

  // Rotate key for an active session. Emits secure:rekey-init via socket.
  async rotateKey(sessionId)
    // => { newSessionId, kemCiphertext }

  // Fallback: ECDH-only if ML-KEM unavailable. Logs WARNING to AuditStore.
  async ecdhFallback(sessionId, clientX25519Pub)
    // => { sessionId, serverX25519Pub }
}
```

Algorithm detail for hybrid KEM:
1. Server generates ephemeral X25519 key pair.
2. Server runs ML-KEM-768 Encapsulate(clientKEMEncapKey) to get (kemCiphertext, kemSecret).
3. Server computes ecdhSecret = X25519(serverPriv, clientX25519Pub).
4. sessionKey = HKDF-SHA256(ikm = ecdhSecret || kemSecret, salt = sessionId, info = "session-key", len = 32).
5. Server stores sessionKey in session_keys table encrypted at rest with server master key.

#### DeviceBindingService

```javascript
class DeviceBindingService {
  // Bind a Session_Key to a device fingerprint at session establishment.
  async bindDevice(sessionId, userId, fingerprintComponents)
    // fingerprintComponents: { hardwareConcurrency, platform, screenHash, userAgentHash, timezoneOffset }
    // => { bindingId, fingerprintHash }

  // Verify incoming message fingerprint against stored binding.
  async verifyFingerprint(sessionId, incomingFingerprintHash)
    // => boolean — throws DeviceMismatchError on failure

  // Emit security:device-mismatch audit event and terminate session.
  async handleMismatch(sessionId, userId, meetingId)
    // => void
}
```

Fingerprint hash: SHA-256(hardwareConcurrency + ":" + platform + ":" + screenHash + ":" + userAgentHash + ":" + timezoneOffset) stored as hex in device_bindings.fingerprint_hash.

#### RecordingService

```javascript
class RecordingService {
  // Start a new recording for a meeting. Returns recordingId.
  async startRecording(meetingId, userId)
    // => { recordingId }

  // Ingest a binary chunk. Computes SHA-256, stores chunk + hash.
  async ingestChunk(recordingId, chunkIndex, chunkBuffer)
    // => { chunkId, sha256Hash }

  // Finalise recording: build Merkle tree, write root to AuditStore.
  async finaliseRecording(recordingId)
    // => { merkleRoot, chunkCount }

  // Export recording with embedded C2PA manifest.
  async exportWithC2PA(recordingId, requestingUserId)
    // => Buffer (MP4 with C2PA manifest sidecar)

  // Retrieve ordered chunk hashes for a recording (used by IntegrityVerifier).
  async getChunkHashes(recordingId)
    // => Array<{ chunkIndex, sha256Hash, merkleProof }>
}
```

Merkle tree construction:
- Leaves: SHA-256(chunkBuffer) for each chunk in order.
- If chunk count is odd, duplicate the last leaf.
- Build bottom-up: parent = SHA-256(leftChild || rightChild).
- Root stored in recording_merkle_roots and audit_log.

#### IdentityService

```javascript
class IdentityService {
  // Register device public key at enrollment.
  async registerDeviceKey(userId, deviceId, publicKeyJwk)
    // => { keyId }

  // Verify a Verification_Token JWT signed by device private key.
  async verifyPresenceToken(userId, deviceId, verificationToken)
    // => { valid: boolean, timestamp: Date }

  // Record a presence check failure. Issue Step_Up_Challenge after 3 consecutive failures.
  async recordPresenceFailure(userId, sessionId, meetingId)
    // => { consecutiveFailures, stepUpIssued: boolean }

  // Issue a Step_Up_Challenge. Restricts session to receive-only.
  async issueStepUpChallenge(userId, sessionId)
    // => { challengeId, expiresAt }

  // Resolve a Step_Up_Challenge. Restores full permissions.
  async resolveStepUpChallenge(challengeId, userId, verificationToken)
    // => { resolved: boolean }
}
```

#### HandoffService

```javascript
class HandoffService {
  // Register a new shadow session for a user.
  async registerShadow(userId, meetingId, shadowSocketId, deviceFingerprint)
    // => { shadowSessionId }

  // Push a Session_State_Snapshot to all shadow sessions for a user.
  async syncSnapshot(userId, meetingId, snapshot)
    // => void

  // Promote a shadow session to Primary_Device (manual or automatic).
  async promote(userId, meetingId, shadowSessionId)
    // => { newPrimarySocketId, snapshot }

  // Handle primary device disconnect. Auto-promote most recent shadow.
  async handlePrimaryDisconnect(userId, meetingId)
    // => { promoted: boolean, shadowSessionId?: string }
}
```

#### AuditStore

```javascript
class AuditStore {
  // Append a single audit event. No update/delete permitted.
  async write(event)
    // event: { eventType, userId, meetingId, deviceFingerprintHash, metadata }
    // => { entryId, utcTimestamp }

  // Query audit log for an authorised administrator.
  async query(filters)
    // filters: { userId?, meetingId?, eventType?, fromDate, toDate, limit, offset }
    // => Array<AuditEntry>
}
```

Append-only enforcement: a MySQL BEFORE UPDATE and BEFORE DELETE trigger on audit_log raises SIGNAL SQLSTATE '45000' with message 'audit_log is append-only'.

### Frontend Components

#### SecureSignalingLayer

Wraps the existing SocketContext. Intercepts secure:* events, encrypts outgoing payloads with the current Session_Key (AES-256-GCM), and decrypts incoming payloads before passing them to consumers.

```javascript
// Context value shape
{
  sessionKey: CryptoKey | null,
  sessionId: string | null,
  secureEmit: (event, payload) => void,
  onSecure: (event, handler) => void,
  offSecure: (event) => void,
  keyStatus: 'pending' | 'active' | 'rotating' | 'error',
}
```

Key exchange is performed on mount using window.crypto.subtle (X25519 ECDH) combined with the mlkem npm package (ML-KEM-768). The derived Session_Key is stored as a non-extractable CryptoKey in memory only — never in localStorage.

#### BiometricEngine

Runs entirely in the browser. Uses face-api.js for face detection and liveness estimation. The enrolled template is stored in IndexedDB as a Float32Array descriptor. The device-bound key pair is generated with:

```javascript
crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
```

The private key is non-extractable.

```javascript
// Public API
{
  enrollmentStatus: 'idle' | 'enrolling' | 'enrolled' | 'error',
  presenceStatus: 'present' | 'absent' | 'checking' | 'challenge',
  enroll: () => Promise<void>,
  startPresenceChecks: (intervalMs?) => void,
  stopPresenceChecks: () => void,
  respondToChallenge: () => Promise<void>,
}
```

Presence check flow:
1. Capture frame from localStream video track.
2. Run faceapi.detectSingleFace(frame).withFaceLandmarks().withFaceDescriptor().
3. Compare descriptor against enrolled template using Euclidean distance (threshold 0.6).
4. If match: sign { userId, deviceId, timestamp, result: 'pass' } with device private key, produce JWT, POST to IdentityService.
5. If no match: emit presence:failed event, mute local tracks.

#### IntegrityVerifier

Attached to the recording playback pipeline. Receives chunk buffers as they are decoded, re-hashes them, and verifies against the Merkle proof fetched from the backend.

```javascript
// Public API
{
  verificationState: 'idle' | 'verifying' | 'passed' | 'tampered',
  tamperDetails: { chunkIndex: number, recordingId: string } | null,
  startVerification: (recordingId) => Promise<void>,
  verifyChunk: (chunkIndex, chunkBuffer) => Promise<boolean>,
}
```

#### DeviceHandoffManager

Manages shadow session registration and failover UI.

```javascript
// Public API
{
  role: 'primary' | 'shadow' | 'none',
  shadowSessions: ShadowSession[],
  initiateHandoff: (targetShadowId) => Promise<void>,
  acceptPromotion: () => Promise<void>,
}
```

---

## Data Models

### New Database Tables

#### session_keys

```sql
CREATE TABLE session_keys (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id    CHAR(36)     NOT NULL UNIQUE,
  meeting_id    INT          NOT NULL,
  user_id       INT          NOT NULL,
  key_material  BLOB         NOT NULL,
  algorithm     VARCHAR(64)  NOT NULL DEFAULT 'HYBRID_X25519_MLKEM768',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME     NOT NULL,
  rotated_at    DATETIME     NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_session (session_id),
  INDEX idx_meeting_user (meeting_id, user_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);
```

#### device_bindings

```sql
CREATE TABLE device_bindings (
  id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id          CHAR(36)     NOT NULL,
  user_id             INT          NOT NULL,
  fingerprint_hash    CHAR(64)     NOT NULL,
  bound_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          DATETIME     NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_session (session_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### recording_chunks

```sql
CREATE TABLE recording_chunks (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  recording_id  CHAR(36)     NOT NULL,
  meeting_id    INT          NOT NULL,
  chunk_index   INT          NOT NULL,
  sha256_hash   CHAR(64)     NOT NULL,
  storage_path  VARCHAR(512) NOT NULL,
  duration_ms   INT          NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recording_chunk (recording_id, chunk_index),
  INDEX idx_recording (recording_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);
```

#### recording_merkle_roots

```sql
CREATE TABLE recording_merkle_roots (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  recording_id  CHAR(36)     NOT NULL UNIQUE,
  meeting_id    INT          NOT NULL,
  merkle_root   CHAR(64)     NOT NULL,
  chunk_count   INT          NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

DELIMITER $$
CREATE TRIGGER trg_merkle_roots_no_update
  BEFORE UPDATE ON recording_merkle_roots FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'recording_merkle_roots is append-only';
END$$
CREATE TRIGGER trg_merkle_roots_no_delete
  BEFORE DELETE ON recording_merkle_roots FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'recording_merkle_roots is append-only';
END$$
DELIMITER ;
```

#### audit_log

```sql
CREATE TABLE audit_log (
  id                      BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  event_type              VARCHAR(64)      NOT NULL,
  user_id                 INT              NULL,
  meeting_id              INT              NULL,
  device_fingerprint_hash CHAR(64)         NULL,
  metadata                JSON             NULL,
  utc_timestamp           DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_user_ts    (user_id, utc_timestamp),
  INDEX idx_meeting_ts (meeting_id, utc_timestamp),
  INDEX idx_event_ts   (event_type, utc_timestamp)
);

DELIMITER $$
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON audit_log FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is append-only';
END$$
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON audit_log FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is append-only';
END$$
DELIMITER ;
```

#### shadow_sessions

```sql
CREATE TABLE shadow_sessions (
  id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id             INT          NOT NULL,
  meeting_id          INT          NOT NULL,
  socket_id           VARCHAR(128) NOT NULL,
  device_fingerprint  CHAR(64)     NOT NULL,
  registered_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at      DATETIME     NULL,
  is_active           TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_user_meeting (user_id, meeting_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);
```

#### session_state_snapshots

```sql
CREATE TABLE session_state_snapshots (
  id                      CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id                 INT          NOT NULL,
  meeting_id              INT          NOT NULL,
  mute_state              TINYINT(1)   NOT NULL,
  camera_state            TINYINT(1)   NOT NULL,
  screen_share_state      TINYINT(1)   NOT NULL,
  active_speaker_id       INT          NULL,
  chat_scroll_message_id  VARCHAR(64)  NULL,
  elapsed_ms              BIGINT       NOT NULL,
  captured_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_user_meeting_ts (user_id, meeting_id, captured_at),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);
```

#### biometric_device_keys

```sql
CREATE TABLE biometric_device_keys (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id       INT          NOT NULL,
  device_id     VARCHAR(128) NOT NULL,
  public_key_jwk JSON        NOT NULL,
  enrolled_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at  DATETIME     NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_device (user_id, device_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Audit Event Types

| Constant | Trigger |
|---|---|
| session:established | Successful hybrid KEM handshake |
| session:key_rotation | 30-minute key rotation completed |
| session:key_rotation_fallback | ML-KEM unavailable, fell back to ECDH |
| session:terminated | Session ended (normal or forced) |
| security:device_mismatch | Fingerprint verification failed |
| identity:presence_failed | Single presence check failure |
| identity:step_up_issued | Step-up challenge issued |
| identity:step_up_resolved | Step-up challenge resolved |
| identity:session_terminated | Session terminated after unresolved challenge |
| recording:merkle_root_stored | Merkle root written to audit store |
| continuity:failover | Primary device promoted from shadow |
| continuity:no_shadow_available | Failover attempted with no shadow |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Hybrid KEM produces a deterministic Session_Key

*For any* pair of valid X25519 and ML-KEM-768 key material inputs, the KeyExchangeService.deriveSessionKey function shall produce a 32-byte output, and calling it twice with the same inputs shall produce the same output (determinism invariant).

**Validates: Requirements 1.1**

### Property 2: Signaling encryption round-trip

*For any* plaintext signaling message and any valid Session_Key, encrypting the message with AES-256-GCM and then decrypting the ciphertext with the same key shall produce the original plaintext. The ciphertext shall differ from the plaintext.

**Validates: Requirements 1.3**

### Property 3: Key rotation retires old key

*For any* active session, after a key rotation event, the old session_id shall be marked is_active = 0 in session_keys and a new session_id shall be marked is_active = 1. The new key shall be usable for encryption and the old key shall not decrypt messages encrypted with the new key.

**Validates: Requirements 1.4, 1.5**

### Property 4: KEM fallback produces valid key and audit entry

*For any* session where ML-KEM-768 encapsulation throws an error, the KeyExchangeService shall complete the handshake using ECDH-only and write an audit entry with event_type = 'session:key_rotation_fallback'. The resulting Session_Key shall be a valid 32-byte buffer.

**Validates: Requirements 1.6**

### Property 5: Dual failure rejects session

*For any* session where both ML-KEM-768 and ECDH fail, the KeyExchangeService shall return an error and shall not write a session_keys record.

**Validates: Requirements 1.7**

### Property 6: Device fingerprint binding covers at least three attributes

*For any* set of device attributes, the DeviceBindingService.bindDevice function shall produce a fingerprint_hash that changes when any single attribute changes, confirming all attributes contribute to the hash.

**Validates: Requirements 2.1**

### Property 7: Fingerprint verification correctly classifies matching and mismatching fingerprints

*For any* session with a stored fingerprint hash, presenting the same hash shall return true and presenting any different hash shall return false (or throw DeviceMismatchError).

**Validates: Requirements 2.2, 2.3**

### Property 8: Device binding TTL equals session duration plus five minutes

*For any* session with a known start time and duration, the device_bindings.expires_at value shall equal session_end_time + 5 minutes (within one second tolerance).

**Validates: Requirements 2.4**

### Property 9: All recording chunks are at most 10 seconds

*For any* recording of arbitrary duration, every chunk produced by RecordingService shall have duration_ms <= 10000.

**Validates: Requirements 3.1**

### Property 10: Chunk hash round-trip

*For any* binary chunk buffer, the SHA-256 hash stored by RecordingService.ingestChunk shall equal SHA-256(chunkBuffer) computed independently. Re-hashing the stored chunk shall reproduce the stored hash.

**Validates: Requirements 3.2**

### Property 11: Merkle root round-trip integrity

*For any* ordered list of chunk hashes, computing the Merkle root, storing it, then re-computing the Merkle root from the same chunk hashes shall produce an identical root. This is the core tamper-detection guarantee.

**Validates: Requirements 3.3, 3.4, 3.6**

### Property 12: Audit store and Merkle root table are append-only

*For any* existing row in audit_log or recording_merkle_roots, attempting an UPDATE or DELETE operation shall raise a database error (SQLSTATE 45000) and leave the row unchanged.

**Validates: Requirements 3.5, 12.3**

### Property 13: C2PA manifest contains all required fields and passes signature verification

*For any* exported recording, the embedded C2PA manifest shall contain recording_id, meeting_id, user_id, utc_timestamp, and merkle_root, and the manifest signature shall verify successfully using the platform public key.

**Validates: Requirements 4.1, 4.2**

### Property 14: Integrity verifier correctly classifies chunks

*For any* recording chunk, if the chunk buffer matches the stored hash the verifier shall return 'passed'; if the buffer is modified in any way the verifier shall return 'tampered'. The verifier shall also validate the Merkle proof path to the stored root.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 15: Biometric enrollment stores template locally and transmits no raw data

*For any* enrollment session, after BiometricEngine.enroll() completes, the facial descriptor shall exist in IndexedDB and no outbound network request during enrollment shall contain a Float32Array or raw image data.

**Validates: Requirements 6.1, 6.2**

### Property 16: Device private key is non-extractable

*For any* enrolled device, calling crypto.subtle.exportKey('pkcs8', privateKey) shall throw a DOMException with name 'InvalidAccessError', confirming the key is non-extractable.

**Validates: Requirements 6.3**

### Property 17: Presence check token is correctly signed and contains no raw biometric data

*For any* successful presence check, the Verification_Token JWT payload shall contain only { userId, deviceId, timestamp, result } and the token signature shall verify against the device public key registered at enrollment.

**Validates: Requirements 7.2, 7.5**

### Property 18: Three consecutive presence failures trigger a step-up challenge

*For any* user and session, after exactly three consecutive calls to IdentityService.recordPresenceFailure, the service shall return stepUpIssued = true and write an audit entry with event_type = 'identity:step_up_issued'.

**Validates: Requirements 7.3, 7.4**

### Property 19: Step-up challenge restricts and then restores session permissions

*For any* session, after a step-up challenge is issued the session shall be in receive-only mode; after the challenge is resolved with a valid Verification_Token the session shall return to full permissions. This is a round-trip property.

**Validates: Requirements 8.2, 8.3**

### Property 20: Unresolved step-up challenge terminates session after 120 seconds

*For any* issued step-up challenge, if no resolution arrives within 120 seconds (simulated with fake timers), the IdentityService shall terminate the session and write an audit entry with event_type = 'identity:session_terminated'.

**Validates: Requirements 8.4**

### Property 21: Shadow session registration and capacity limit

*For any* user in a meeting, registering up to three shadow sessions shall succeed; attempting to register a fourth shall be rejected. Each registered shadow shall appear in shadow_sessions with is_active = 1.

**Validates: Requirements 9.1, 9.4**

### Property 22: Shadow sessions are excluded from participant broadcasts

*For any* meeting with one primary and one or more shadow sessions, the participant list emitted by the HandoffService shall contain only the primary device entry for that user — shadow socket IDs shall not appear.

**Validates: Requirements 9.3**

### Property 23: Snapshot staleness invariant on failover

*For any* failover event, the Session_State_Snapshot applied to the new primary device shall have captured_at no more than 2000 ms before the promotion timestamp, and all six required fields (mute_state, camera_state, screen_share_state, active_speaker_id, chat_scroll_message_id, elapsed_ms) shall be present with correct types.

**Validates: Requirements 10.2, 11.1, 11.2, 11.3**

### Property 24: Auto-promotion selects most recently synchronised shadow

*For any* user with multiple shadow sessions, when the primary device disconnects unexpectedly, the HandoffService shall promote the shadow with the most recent last_synced_at timestamp.

**Validates: Requirements 10.4**

### Property 25: Audit entries contain all required fields for every event type

*For any* security-relevant event (session establishment, key rotation, key rotation fallback, device mismatch, presence failure, step-up issued, step-up resolved, session termination, failover, Merkle root storage), the AuditStore shall write exactly one entry containing event_type, user_id, meeting_id, device_fingerprint_hash, utc_timestamp, and a monotonically increasing id.

**Validates: Requirements 12.1, 12.2**

---

## Error Handling

### Key Exchange Errors

| Scenario | Behaviour |
|---|---|
| ML-KEM library unavailable or throws | Fall back to ECDH-only; write session:key_rotation_fallback audit entry; continue session |
| ECDH also fails | Return HTTP 503 to client; do not create session_keys record; write session:terminated audit entry |
| Key rotation timeout (client does not ack within 10s) | Retry once; if second attempt fails, terminate session gracefully |
| Session_Key decryption failure on incoming message | Reject message with 401; do not propagate to application layer |

### Device Binding Errors

| Scenario | Behaviour |
|---|---|
| Fingerprint mismatch on incoming message | Reject message; call handleMismatch; write security:device_mismatch audit entry; emit secure:session-terminated to client |
| Binding record not found (expired TTL) | Treat as mismatch; force re-authentication |

### Recording Errors

| Scenario | Behaviour |
|---|---|
| Chunk ingest fails (disk full, DB error) | Return error to caller; do not advance chunk_index; allow retry |
| Merkle tree construction fails | Mark recording as finalisation_failed; do not write to audit store; alert operator |
| C2PA signing key unavailable | Return 503 on export; log error; do not return unsigned manifest |

### Identity / Biometric Errors

| Scenario | Behaviour |
|---|---|
| face-api.js model load fails | Set enrollmentStatus = 'error'; surface user-facing message; do not block meeting join |
| Verification_Token signature invalid | Treat as presence failure; increment consecutive failure counter |
| Step-up challenge expires | Terminate session; write identity:session_terminated audit entry |
| IndexedDB unavailable | Fall back to in-memory template storage with a warning; note that template will not persist across page reloads |

### Continuity / Handoff Errors

| Scenario | Behaviour |
|---|---|
| No shadow session available on primary disconnect | Emit continuity:no_shadow_available; allow user to rejoin normally |
| Shadow promotion fails (socket disconnected) | Try next most-recent shadow; if none, emit continuity:no_shadow_available |
| Snapshot sync fails | Log warning; continue with last successful snapshot; do not block meeting |
| More than 3 shadow registration attempts | Return 409 Conflict; do not create shadow_sessions record |

### General Principles

- All service errors are caught at the service boundary and converted to structured error objects with a code, message, and optional metadata field.
- Errors that affect security (key exchange, device binding, identity) always write an audit entry before returning.
- The existing Express error handler in app.js is extended to handle the new error codes without exposing internal stack traces to clients.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests verify specific examples, integration points, and error conditions.
- Property tests verify universal correctness across randomly generated inputs.

### Property-Based Testing

Library selection:
- Backend (Node.js): `fast-check` (npm package)
- Frontend (React/Vite): `fast-check` (same library, runs in Vitest)

Each property test must run a minimum of 100 iterations (fast-check default is 100; set `numRuns: 100` explicitly).

Each property test must include a comment tag in the format:

```
// Feature: enterprise-secure-video-platform, Property N: <property_text>
```

Each correctness property defined above must be implemented by exactly one property-based test.

Example property test structure (fast-check + Vitest):

```javascript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('KeyExchangeService', () => {
  it('derives deterministic Session_Key from same inputs', () => {
    // Feature: enterprise-secure-video-platform, Property 1: Hybrid KEM produces a deterministic Session_Key
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }), // ecdhSecret
        fc.uint8Array({ minLength: 32, maxLength: 32 }), // kemSharedSecret
        (ecdhSecret, kemSharedSecret) => {
          const key1 = deriveSessionKey(ecdhSecret, kemSharedSecret);
          const key2 = deriveSessionKey(ecdhSecret, kemSharedSecret);
          expect(key1).toEqual(key2);
          expect(key1).toHaveLength(32);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

Unit tests focus on:
- Specific integration examples (e.g., a full session establishment with a real DB transaction in a test database)
- Error condition examples (e.g., the exact HTTP 503 response body when ECDH fails)
- Edge cases called out in the requirements (e.g., odd chunk count in Merkle tree, exactly 3 shadow sessions)

Unit test library: Vitest (frontend and backend via `vitest` with `@vitest/coverage-v8`).

### Test Coverage Targets

| Area | Property Tests | Unit Tests |
|---|---|---|
| KeyExchangeService | Properties 1, 3, 4, 5 | Session init integration, rotation timer |
| DeviceBindingService | Properties 6, 7, 8 | Mismatch audit event format |
| RecordingService | Properties 9, 10, 11 | Odd-chunk Merkle tree, C2PA export |
| AuditStore | Properties 12, 25 | Query pagination, 90-day range |
| IdentityService | Properties 18, 19, 20 | Token expiry, step-up timeout |
| BiometricEngine | Properties 15, 16, 17 | Enrollment UI state transitions |
| IntegrityVerifier | Property 14 | Tamper warning UI display |
| HandoffService | Properties 21, 22, 23, 24 | Auto-promote on disconnect |
| C2PA manifest | Property 13 | Manifest field presence |

### Integration Test Scenarios

1. Full session lifecycle: establish → rotate key → presence check → failover → terminate.
2. Tamper detection: record meeting → modify one chunk on disk → play back → verify tamper warning.
3. Step-up flow: three presence failures → challenge issued → challenge resolved → permissions restored.
4. Shadow failover: primary joins → shadow joins → primary disconnects → shadow promoted → state verified.
