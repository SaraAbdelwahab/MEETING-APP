# Implementation Plan: Enterprise Secure Video Platform

## Overview

Additive upgrade of the existing Express.js + MySQL + Socket.IO + React 19 + SimplePeer stack
across four pillars: Security (hybrid post-quantum key exchange), Integrity (Merkle-tree recording
verification + C2PA), Identity (on-device biometric presence), and Continuity (shadow sessions +
hot failover). All existing routes, models, and real-time behaviour are preserved.

Implementation language: **JavaScript** (Node.js backend, React 19 frontend), with Vitest +
fast-check for property-based tests.

---

## Tasks

- [x] 1. Database migrations — create all 8 new tables and append-only triggers
  - Create `backend/migrations/001_enterprise_security_tables.sql` with all DDL in dependency order:
    `session_keys`, `device_bindings`, `recording_chunks`, `recording_merkle_roots` (+ no-update/no-delete triggers),
    `audit_log` (+ no-update/no-delete triggers), `shadow_sessions`, `session_state_snapshots`, `biometric_device_keys`
  - Create `backend/migrations/migrate.js` — a Node script that reads and executes the SQL file against the existing MySQL pool from `backend/config/database.js`
  - Add `"migrate": "node migrations/migrate.js"` to `backend/package.json` scripts
  - _Requirements: 2.4, 3.3, 3.4, 3.5, 9.1, 11.1, 12.1, 12.2, 12.3_

- [x] 2. AuditStore service
  - [x] 2.1 Implement `backend/services/auditStore.js`
    - `write(event)` — INSERT into `audit_log`; accepts `{ eventType, userId, meetingId, deviceFingerprintHash, metadata }`; returns `{ entryId, utcTimestamp }`
    - `query(filters)` — SELECT with optional `userId`, `meetingId`, `eventType`, `fromDate`, `toDate`, `limit`, `offset`; uses indexed columns for performance
    - Export a singleton instance
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 2.2 Write property test for AuditStore append-only enforcement
    - **Property 12: Audit store and Merkle root table are append-only**
    - **Validates: Requirements 3.5, 12.3**
    - File: `backend/tests/auditStore.property.test.js`
    - Use fast-check to generate arbitrary audit entries; after writing, attempt UPDATE and DELETE via raw SQL and assert SQLSTATE 45000 is thrown

- [x] 3. KeyExchangeService
  - [x] 3.1 Install dependencies and implement `backend/services/keyExchangeService.js`
    - Install `mlkem` (ML-KEM-768) and `hkdf` npm packages in `backend/`
    - `initiateHandshake(clientX25519Pub, clientKEMEncapKey)` — generate ephemeral X25519 key pair, run ML-KEM-768 Encapsulate, call `deriveSessionKey`, INSERT into `session_keys`, return `{ sessionId, serverX25519Pub, kemCiphertext, expiresAt }`
    - `deriveSessionKey(ecdhSecret, kemSharedSecret)` — HKDF-SHA256(ikm = ecdhSecret ∥ kemSecret, salt = sessionId, info = "session-key", len = 32); returns 32-byte Buffer
    - `rotateKey(sessionId)` — mark old row `is_active = 0`, run new encapsulation, INSERT new row, emit `secure:rekey-init` via socket, write `session:key_rotation` audit entry
    - `ecdhFallback(sessionId, clientX25519Pub)` — ECDH-only path; write `session:key_rotation_fallback` WARNING audit entry; return `{ sessionId, serverX25519Pub }`
    - Schedule 30-minute rotation timer per active session
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 3.2 Write property test for `deriveSessionKey` determinism
    - **Property 1: Hybrid KEM produces a deterministic Session_Key**
    - **Validates: Requirements 1.1**
    - File: `backend/tests/keyExchange.property.test.js`
    - Use fast-check to generate arbitrary 32-byte ecdhSecret and kemSharedSecret buffers; assert output is always 32 bytes and calling twice with same inputs yields identical output

  - [ ]* 3.3 Write property test for KEM fallback audit entry
    - **Property 4: KEM fallback produces valid key and audit entry**
    - **Validates: Requirements 1.6**
    - In same file; mock ML-KEM to throw; assert `ecdhFallback` returns a 32-byte key and `audit_log` contains `session:key_rotation_fallback`

  - [ ]* 3.4 Write property test for dual failure rejection
    - **Property 5: Dual failure rejects session**
    - **Validates: Requirements 1.7**
    - Mock both ML-KEM and X25519 to throw; assert `initiateHandshake` rejects and no row is inserted into `session_keys`

- [x] 4. DeviceBindingService
  - [x] 4.1 Implement `backend/services/deviceBindingService.js`
    - `bindDevice(sessionId, userId, fingerprintComponents)` — SHA-256(`hardwareConcurrency:platform:screenHash:userAgentHash:timezoneOffset`), INSERT into `device_bindings` with `expires_at = session_end + 5 min`, return `{ bindingId, fingerprintHash }`
    - `verifyFingerprint(sessionId, incomingFingerprintHash)` — SELECT from `device_bindings`; return `true` on match; throw `DeviceMismatchError` on mismatch
    - `handleMismatch(sessionId, userId, meetingId)` — write `security:device_mismatch` audit entry, emit `security:device-mismatch` socket event, terminate session
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.2 Write property test for fingerprint binding
    - **Property 6: Device fingerprint binding covers at least three attributes**
    - **Validates: Requirements 2.1**
    - File: `backend/tests/deviceBinding.property.test.js`
    - Use fast-check to generate arbitrary attribute sets; assert that changing any single attribute changes the resulting `fingerprintHash`

  - [ ]* 4.3 Write property test for fingerprint verification
    - **Property 7: Fingerprint verification correctly classifies matching and mismatching fingerprints**
    - **Validates: Requirements 2.2, 2.3**
    - In same file; assert same hash returns `true`; assert any different hash throws `DeviceMismatchError`

  - [ ]* 4.4 Write property test for binding TTL
    - **Property 8: Device binding TTL equals session duration plus five minutes**
    - **Validates: Requirements 2.4**
    - Use fast-check to generate arbitrary session durations; assert `expires_at` equals `session_end + 300000 ms` within 1 second tolerance

- [x] 5. RecordingService
  - [x] 5.1 Implement `backend/services/recordingService.js`
    - `startRecording(meetingId, userId)` — INSERT recording header row (use `recording_chunks` recording_id as UUID), return `{ recordingId }`
    - `ingestChunk(recordingId, chunkIndex, chunkBuffer)` — assert `duration_ms <= 10000`; compute `SHA-256(chunkBuffer)`; INSERT into `recording_chunks`; write chunk to `storage_path` (local `uploads/recordings/`); return `{ chunkId, sha256Hash }`
    - `finaliseRecording(recordingId)` — fetch ordered chunk hashes; build binary Merkle tree (duplicate last leaf if odd count; parent = SHA-256(left ∥ right)); INSERT into `recording_merkle_roots`; write `recording:merkle_root_stored` audit entry; return `{ merkleRoot, chunkCount }`
    - `exportWithC2PA(recordingId, requestingUserId)` — assemble MP4 from chunks; build C2PA manifest JSON with `{ recordingId, meetingId, userId, utcTimestamp, merkleRoot }`; sign with platform private key (ECDSA P-256, key loaded from env); embed manifest as MP4 metadata box; return Buffer
    - `getChunkHashes(recordingId)` — return `Array<{ chunkIndex, sha256Hash, merkleProof }>` where `merkleProof` is the sibling-hash path to root
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

  - [ ]* 5.2 Write property test for chunk size invariant
    - **Property 9: All recording chunks are at most 10 seconds**
    - **Validates: Requirements 3.1**
    - File: `backend/tests/recording.property.test.js`
    - Use fast-check to generate arbitrary chunk buffers with random `duration_ms`; assert `ingestChunk` throws when `duration_ms > 10000`

  - [ ]* 5.3 Write property test for chunk hash round-trip
    - **Property 10: Chunk hash round-trip**
    - **Validates: Requirements 3.2**
    - Use fast-check to generate arbitrary binary buffers; assert stored `sha256Hash` equals `crypto.createHash('sha256').update(buffer).digest('hex')` computed independently

  - [ ]* 5.4 Write property test for Merkle root round-trip integrity
    - **Property 11: Merkle root round-trip integrity**
    - **Validates: Requirements 3.3, 3.4, 3.6**
    - Use fast-check to generate arbitrary ordered lists of chunk hashes (1–64 items); assert computing root twice from same list yields identical result; assert stored root matches recomputed root

  - [ ]* 5.5 Write property test for C2PA manifest fields and signature
    - **Property 13: C2PA manifest contains all required fields and passes signature verification**
    - **Validates: Requirements 4.1, 4.2**
    - Assert exported buffer contains parseable C2PA manifest with all five required fields; assert signature verifies with platform public key

- [x] 6. IdentityService
  - [x] 6.1 Implement `backend/services/identityService.js`
    - `registerDeviceKey(userId, deviceId, publicKeyJwk)` — INSERT into `biometric_device_keys`; return `{ keyId }`
    - `verifyPresenceToken(userId, deviceId, verificationToken)` — fetch `public_key_jwk` from `biometric_device_keys`; import key via `crypto.subtle.importKey`; verify JWT signature; assert payload contains only `{ userId, deviceId, timestamp, result }`; return `{ valid, timestamp }`
    - `recordPresenceFailure(userId, sessionId, meetingId)` — increment in-memory consecutive failure counter; write `identity:presence_failed` audit entry; if counter reaches 3 call `issueStepUpChallenge`; return `{ consecutiveFailures, stepUpIssued }`
    - `issueStepUpChallenge(userId, sessionId)` — emit `identity:step-up-challenge` socket event; set session to receive-only mode; write `identity:step_up_issued` audit entry; start 120-second expiry timer that calls session termination; return `{ challengeId, expiresAt }`
    - `resolveStepUpChallenge(challengeId, userId, verificationToken)` — verify token; cancel expiry timer; restore full session permissions; write `identity:step_up_resolved` audit entry; return `{ resolved }`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 6.2 Write property test for three consecutive failures triggering step-up
    - **Property 18: Three consecutive presence failures trigger a step-up challenge**
    - **Validates: Requirements 7.3, 7.4**
    - File: `backend/tests/identity.property.test.js`
    - Use fast-check to generate arbitrary `userId`/`sessionId` pairs; call `recordPresenceFailure` exactly 3 times; assert `stepUpIssued = true` on third call and `audit_log` contains `identity:step_up_issued`

  - [ ]* 6.3 Write property test for step-up challenge round-trip
    - **Property 19: Step-up challenge restricts and then restores session permissions**
    - **Validates: Requirements 8.2, 8.3**
    - Assert session is receive-only after `issueStepUpChallenge`; assert full permissions restored after `resolveStepUpChallenge` with valid token

  - [ ]* 6.4 Write property test for unresolved challenge termination
    - **Property 20: Unresolved step-up challenge terminates session after 120 seconds**
    - **Validates: Requirements 8.4**
    - Use Vitest fake timers; advance clock 120 seconds; assert session terminated and `audit_log` contains `identity:session_terminated`

  - [ ]* 6.5 Write property test for Verification_Token payload
    - **Property 17: Presence check token is correctly signed and contains no raw biometric data**
    - **Validates: Requirements 7.2, 7.5**
    - Use fast-check to generate arbitrary token payloads; assert `verifyPresenceToken` rejects tokens containing any field outside `{ userId, deviceId, timestamp, result }`

- [x] 7. HandoffService
  - [x] 7.1 Implement `backend/services/handoffService.js`
    - `registerShadow(userId, meetingId, shadowSocketId, deviceFingerprint)` — check existing active shadow count; reject if >= 3; INSERT into `shadow_sessions`; return `{ shadowSessionId }`
    - `syncSnapshot(userId, meetingId, snapshot)` — validate snapshot has all 6 required fields (`muteState`, `cameraState`, `screenShareState`, `activeSpeakerId`, `chatScrollMessageId`, `elapsedMs`); INSERT into `session_state_snapshots`; UPDATE `shadow_sessions.last_synced_at`; emit snapshot to shadow socket
    - `promote(userId, meetingId, shadowSessionId)` — fetch latest snapshot; UPDATE `shadow_sessions` set `is_active = 0` for old primary; emit `handoff:promote` to shadow socket with snapshot; write `continuity:failover` audit entry; return `{ newPrimarySocketId, snapshot }`
    - `handlePrimaryDisconnect(userId, meetingId)` — SELECT shadow with MAX(`last_synced_at`) where `is_active = 1`; if found call `promote`; else write `continuity:no_shadow_available` audit entry; return `{ promoted, shadowSessionId? }`
    - Exclude shadow socket IDs from participant list broadcasts in `socketService.js`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3_

  - [ ]* 7.2 Write property test for shadow session capacity limit
    - **Property 21: Shadow session registration and capacity limit**
    - **Validates: Requirements 9.1, 9.4**
    - File: `backend/tests/handoff.property.test.js`
    - Use fast-check to generate arbitrary user/meeting IDs; register 3 shadows and assert success; register 4th and assert rejection

  - [ ]* 7.3 Write property test for snapshot staleness invariant
    - **Property 23: Snapshot staleness invariant on failover**
    - **Validates: Requirements 10.2, 11.1, 11.2, 11.3**
    - Use fast-check to generate arbitrary snapshots; assert `captured_at` is within 2000 ms of promotion timestamp; assert all 6 required fields present with correct types

  - [ ]* 7.4 Write property test for auto-promotion selects most recent shadow
    - **Property 24: Auto-promotion selects most recently synchronised shadow**
    - **Validates: Requirements 10.4**
    - Use fast-check to generate multiple shadow sessions with different `last_synced_at` values; assert `handlePrimaryDisconnect` promotes the one with the latest timestamp

- [ ] 8. Checkpoint — backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Extend SocketService with secure:* event handlers
  - [x] 9.1 Modify `backend/services/socketService.js` to wire new services
    - Import `KeyExchangeService`, `DeviceBindingService`, `IdentityService`, `HandoffService`, `AuditStore`
    - Register `secure:session-ready` handler — call `DeviceBindingService.bindDevice`, write `session:established` audit entry, emit `secure:session-ack`
    - Register `secure:rekey-confirm` handler — complete key rotation handshake
    - Register `presence:token` handler — call `IdentityService.verifyPresenceToken`; on failure call `recordPresenceFailure`
    - Register `handoff:register-shadow` handler — call `HandoffService.registerShadow`
    - Register `handoff:request` handler — call `HandoffService.promote`
    - Register `handoff:snapshot` handler — call `HandoffService.syncSnapshot`
    - Modify `handleDisconnect` to call `HandoffService.handlePrimaryDisconnect` for primary devices
    - Filter shadow socket IDs from `meeting-participants` broadcast
    - _Requirements: 1.3, 2.2, 2.3, 7.2, 7.3, 9.1, 9.2, 9.3, 10.4_

- [x] 10. Add REST endpoints for new services
  - [x] 10.1 Create `backend/routes/securityRoutes.js` and `backend/controllers/securityController.js`
    - `POST /api/sessions/init` — calls `KeyExchangeService.initiateHandshake`; returns `{ sessionId, serverX25519Pub, kemCiphertext, expiresAt }`
    - `POST /api/sessions/:sessionId/rotate` — calls `KeyExchangeService.rotateKey`
    - `POST /api/identity/enroll` — calls `IdentityService.registerDeviceKey`
    - `POST /api/identity/challenge/:challengeId/resolve` — calls `IdentityService.resolveStepUpChallenge`
    - `GET /api/recordings/:recordingId/chunks` — calls `RecordingService.getChunkHashes`
    - `GET /api/recordings/:recordingId/export` — calls `RecordingService.exportWithC2PA`
    - `GET /api/audit` — calls `AuditStore.query` (admin-only, add role check middleware)
    - Mount routes in `backend/app.js`
    - _Requirements: 1.1, 1.4, 4.1, 5.1, 6.3, 12.4_

- [x] 11. SecureSignalingLayer frontend context
  - [x] 11.1 Create `meeting-app-frontend/src/context/SecureSignalingContext.jsx`
    - Install `mlkem` npm package in `meeting-app-frontend/`
    - On mount: generate X25519 key pair via `crypto.subtle.generateKey`; generate ML-KEM-768 encap key; POST to `/api/sessions/init`; decapsulate KEM ciphertext; combine with X25519 DH; derive `Session_Key` via HKDF-SHA256; store as non-extractable `CryptoKey` in memory only
    - `secureEmit(event, payload)` — encrypt payload with AES-256-GCM using `Session_Key`; emit `secure:${event}` via `SocketContext.emit`
    - `onSecure(event, handler)` — register listener on `secure:${event}`; decrypt incoming payload before passing to handler
    - `offSecure(event)` — remove listener
    - Expose `{ sessionKey, sessionId, secureEmit, onSecure, offSecure, keyStatus }`
    - Handle `secure:rekey-init` — decapsulate new KEM ciphertext, derive new key, emit `secure:rekey-confirm`, update `keyStatus`
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [ ]* 11.2 Write property test for signaling encryption round-trip
    - **Property 2: Signaling encryption round-trip**
    - **Validates: Requirements 1.3**
    - File: `meeting-app-frontend/src/tests/secureSignaling.property.test.js`
    - Use fast-check to generate arbitrary plaintext strings and 32-byte keys; assert encrypt→decrypt returns original plaintext; assert ciphertext !== plaintext

  - [ ]* 11.3 Write property test for key rotation retires old key
    - **Property 3: Key rotation retires old key**
    - **Validates: Requirements 1.4, 1.5**
    - Assert old `session_id` is `is_active = 0` after rotation; assert new key encrypts/decrypts correctly; assert old key cannot decrypt new-key ciphertext

  - [x] 11.4 Wrap `WebRTCProvider` with `SecureSignalingProvider` in `meeting-app-frontend/src/App.jsx`
    - Import and add `<SecureSignalingProvider>` inside `<SocketProvider>` and outside `<WebRTCProvider>`
    - _Requirements: 1.3_

- [x] 12. BiometricEngine frontend component
  - [x] 12.1 Install face-api.js and create `meeting-app-frontend/src/components/security/BiometricEngine.jsx`
    - Install `face-api.js` in `meeting-app-frontend/`
    - `enroll()` — load face-api.js models from `/models`; capture frame from `localStream` video track; run `faceapi.detectSingleFace().withFaceLandmarks().withFaceDescriptor()`; store `Float32Array` descriptor in IndexedDB (`biometric-store` / `descriptors`); generate ECDSA P-256 non-extractable key pair via `crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])`; store public key JWK in IndexedDB; POST public key JWK to `/api/identity/enroll`; set `enrollmentStatus = 'enrolled'`
    - `startPresenceChecks(intervalMs = 60000)` — set interval; each tick: capture frame, run face detection, compare descriptor Euclidean distance against enrolled template (threshold 0.6); on match: sign `{ userId, deviceId, timestamp, result: 'pass' }` with device private key, produce JWT, POST to `presence:token` socket event; on no match: mute local tracks, emit `presence:failed`
    - `stopPresenceChecks()` — clear interval
    - `respondToChallenge()` — re-run enrollment flow; on success emit `identity:challenge-response`
    - Expose `{ enrollmentStatus, presenceStatus, enroll, startPresenceChecks, stopPresenceChecks, respondToChallenge }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_

  - [ ]* 12.2 Write property test for non-extractable private key
    - **Property 16: Device private key is non-extractable**
    - **Validates: Requirements 6.3**
    - File: `meeting-app-frontend/src/tests/biometric.property.test.js`
    - After `enroll()`, call `crypto.subtle.exportKey('pkcs8', privateKey)` and assert it throws `DOMException` with `name = 'InvalidAccessError'`

  - [ ]* 12.3 Write property test for Verification_Token payload
    - **Property 17: Presence check token contains no raw biometric data**
    - **Validates: Requirements 7.2, 7.5**
    - Use fast-check to generate arbitrary presence check results; assert JWT payload contains only `{ userId, deviceId, timestamp, result }` and no Float32Array or image data fields

  - [x] 12.4 Integrate `BiometricEngine` into `MeetingRoom.jsx`
    - Import and render `<BiometricEngine localStream={localStream} />` inside the meeting room
    - Show enrollment prompt on first join; show presence status indicator in meeting header
    - _Requirements: 6.1, 7.1_

- [x] 13. IntegrityVerifier frontend component
  - [x] 13.1 Create `meeting-app-frontend/src/components/security/IntegrityVerifier.jsx`
    - `startVerification(recordingId)` — GET `/api/recordings/:recordingId/chunks` to fetch `Array<{ chunkIndex, sha256Hash, merkleProof }>`; set `verificationState = 'verifying'`
    - `verifyChunk(chunkIndex, chunkBuffer)` — compute `SHA-256(chunkBuffer)` via `crypto.subtle.digest`; compare against stored hash; verify Merkle proof path to stored root; on mismatch: set `verificationState = 'tampered'`, set `tamperDetails`, pause playback, display warning; on all chunks verified: set `verificationState = 'passed'`
    - Expose `{ verificationState, tamperDetails, startVerification, verifyChunk }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 13.2 Write property test for integrity verifier chunk classification
    - **Property 14: Integrity verifier correctly classifies chunks**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - File: `meeting-app-frontend/src/tests/integrityVerifier.property.test.js`
    - Use fast-check to generate arbitrary chunk buffers; assert unmodified buffer returns `'passed'`; assert any single-byte mutation returns `'tampered'`; assert Merkle proof validation is included

- [x] 14. DeviceHandoffManager frontend component
  - [x] 14.1 Create `meeting-app-frontend/src/components/security/DeviceHandoffManager.jsx`
    - On mount: emit `handoff:register-shadow` if a primary session already exists for this user in this meeting; listen for `handoff:promote` event
    - `initiateHandoff(targetShadowId)` — emit `handoff:request` with `{ targetShadowId }`; await `handoff:promoted` confirmation; restore state from received snapshot
    - `acceptPromotion()` — on receiving `handoff:promote` socket event: unmute local tracks; apply snapshot state (mute, camera, screen-share, elapsed time); emit `handoff:accepted`
    - Expose `{ role, shadowSessions, initiateHandoff, acceptPromotion }`
    - Render a device-switcher UI button in `MeetingRoom.jsx` when `role === 'primary'` and `shadowSessions.length > 0`
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 11.1, 11.2_

  - [ ]* 14.2 Write property test for shadow session exclusion from participant list
    - **Property 22: Shadow sessions are excluded from participant broadcasts**
    - **Validates: Requirements 9.3**
    - File: `backend/tests/handoff.property.test.js` (extend existing)
    - Use fast-check to generate meetings with one primary and N shadow sessions; assert `meeting-participants` broadcast contains only the primary socket ID for that user

- [ ] 15. Checkpoint — all components wired
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Snapshot sync loop in MeetingRoom
  - [x] 16.1 Add snapshot emission to `meeting-app-frontend/src/components/meetings/MeetingRoom.jsx`
    - Every 2 seconds while in call, emit `handoff:snapshot` via `SocketContext.emit` with current state: `{ muteState: !isAudioEnabled, cameraState: isVideoEnabled, screenShareState: isScreenSharing, activeSpeakerId: null, chatScrollMessageId: null, elapsedMs: Date.now() - callStartTime }`
    - Clear interval on unmount / call end
    - _Requirements: 9.2, 11.1_

- [x] 17. Audit log admin endpoint and query
  - [x] 17.1 Add admin role check middleware `backend/middleware/adminAuth.js`
    - Extend existing JWT middleware to check `req.user.role === 'admin'`; return 403 if not admin
  - [x] 17.2 Wire `GET /api/audit` in `securityRoutes.js` behind `adminAuth` middleware
    - Pass query params `{ userId, meetingId, eventType, fromDate, toDate, limit, offset }` to `AuditStore.query`
    - _Requirements: 12.4_

  - [ ]* 17.3 Write property test for audit entry completeness
    - **Property 25: Audit entries contain all required fields for every event type**
    - **Validates: Requirements 12.1, 12.2**
    - File: `backend/tests/auditStore.property.test.js` (extend existing)
    - Use fast-check to generate all 12 audit event types with arbitrary user/meeting IDs; assert every written entry contains `event_type`, `user_id`, `meeting_id`, `device_fingerprint_hash`, `utc_timestamp`, and a monotonically increasing `id`

- [x] 18. Install test dependencies and configure Vitest
  - [x] 18.1 Install `vitest` and `@fast-check/vitest` in both `backend/` and `meeting-app-frontend/`
    - Add `vitest.config.js` to `backend/` with `{ test: { environment: 'node' } }`
    - Add `"test": "vitest --run"` to `backend/package.json` scripts
    - Confirm `meeting-app-frontend/` already has Vite; add `"test": "vitest --run"` to its scripts
    - _Requirements: (testing infrastructure)_

- [x] 19. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural boundaries
- Property tests validate universal correctness guarantees; unit tests validate specific examples
- The migration script (task 1) must be run before any backend service tests
- face-api.js model weights must be placed in `meeting-app-frontend/public/models/` before BiometricEngine tests run
- The platform ECDSA P-256 signing key for C2PA must be generated and stored in `backend/.env` as `PLATFORM_SIGNING_KEY_JWK`
