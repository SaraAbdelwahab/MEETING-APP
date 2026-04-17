# Requirements Document

## Introduction

This document defines requirements for upgrading the existing basic meeting app
(Express.js + MySQL + Socket.IO backend, React 19 + SimplePeer frontend) into an
enterprise-grade secure video platform. The upgrade is structured around four
advanced pillars: Security (post-quantum key exchange), Integrity (recording
tamper-detection via Merkle trees and C2PA), Identity (on-device biometric
presence verification), and Continuity (zero-friction multi-device handoff with
hot failover). All new capabilities must integrate with the existing meeting CRUD,
real-time chat, WebRTC video calls, and participant management without breaking
current functionality.

---

## Glossary

- **Platform**: The enterprise-grade secure video platform being built on top of the existing meeting app.
- **Session**: A single active video meeting instance, identified by a meeting ID and a unique session token.
- **Key_Exchange_Service**: The backend service responsible for hybrid post-quantum key negotiation and key rotation.
- **KEM**: Key Encapsulation Mechanism — a post-quantum algorithm (e.g., ML-KEM / Kyber-768) used alongside a classical ECDH exchange.
- **Session_Key**: The symmetric key derived from the hybrid key exchange, used to encrypt signaling and media metadata.
- **Device_Binding_Service**: The backend service that associates a Session_Key with a specific device fingerprint.
- **Signaling_Service**: The existing Socket.IO service extended to carry encrypted signaling envelopes.
- **Recording_Service**: The backend service that manages chunked recording ingestion, hashing, and Merkle tree construction.
- **Chunk**: A fixed-duration segment (at most 10 seconds) of a meeting recording.
- **Merkle_Root**: The root hash of a binary Merkle tree built from all Chunk hashes for a given recording.
- **Audit_Store**: An append-only log (database table or external ledger) that stores Merkle_Root entries and cannot be modified after insertion.
- **C2PA_Manifest**: A Content Credentials manifest (C2PA specification) embedded in an exported recording file to assert provenance and integrity.
- **Integrity_Verifier**: The frontend component that re-hashes playback chunks and compares them against the stored Merkle tree during playback.
- **Identity_Service**: The backend service that receives signed biometric verification tokens and issues step-up challenges.
- **Biometric_Engine**: The on-device (browser) module that performs face detection, liveness checks, and template matching without transmitting raw biometric data.
- **Verification_Token**: A signed JWT produced on-device after a successful biometric check, containing only a pass/fail assertion and a device-bound signature — no raw biometric data.
- **Presence_Check**: A periodic liveness verification triggered by the Biometric_Engine to confirm the enrolled user is still present.
- **Step_Up_Challenge**: An elevated identity verification request issued by the Identity_Service when anomalous behaviour is detected.
- **Handoff_Service**: The backend service that manages multi-device session synchronisation and hot failover.
- **Shadow_Session**: A secondary device that has joined a meeting in a listen-only, synchronised state, ready to take over as the Primary_Device.
- **Primary_Device**: The device currently transmitting audio/video and controlling meeting state.
- **Session_State_Snapshot**: A serialised record of mute state, camera state, speaking state, and meeting context at a point in time.
- **Failover_Event**: The transition of the Primary_Device role from one device to another, triggered manually or automatically on disconnection.

---

## Requirements

### Requirement 1: Hybrid Post-Quantum Session Key Exchange

**User Story:** As a security-conscious enterprise administrator, I want all meeting sessions to be established using a hybrid post-quantum key exchange, so that session keys are protected against both classical and quantum adversaries.

#### Acceptance Criteria

1. WHEN a participant initiates a session, THE Key_Exchange_Service SHALL perform a hybrid key exchange combining ECDH (X25519) with a post-quantum KEM (ML-KEM-768 / Kyber-768) to derive a shared Session_Key.
2. THE Key_Exchange_Service SHALL complete the hybrid key exchange handshake within 500 ms under normal network conditions (RTT <= 100 ms).
3. WHEN the hybrid key exchange completes, THE Signaling_Service SHALL encrypt all subsequent signaling messages using the derived Session_Key with AES-256-GCM before transmission.
4. THE Key_Exchange_Service SHALL rotate the Session_Key every 30 minutes during an active session without interrupting the media pipeline.
5. WHEN a key rotation occurs, THE Key_Exchange_Service SHALL complete the re-keying handshake before the previous Session_Key expires, ensuring zero media interruption.
6. IF the post-quantum KEM negotiation fails, THEN THE Key_Exchange_Service SHALL fall back to ECDH-only key exchange and log the fallback event with a severity level of WARNING.
7. IF the classical ECDH exchange also fails, THEN THE Key_Exchange_Service SHALL reject the session establishment and return an error code to the client.

---

### Requirement 2: Device-Bound Sessions

**User Story:** As a security administrator, I want each session key to be bound to the originating device, so that stolen session tokens cannot be replayed from a different device.

#### Acceptance Criteria

1. WHEN a Session_Key is derived, THE Device_Binding_Service SHALL bind the Session_Key to a device fingerprint composed of at least three stable device attributes (e.g., hardware concurrency, platform, screen resolution hash).
2. WHEN a signaling message is received, THE Device_Binding_Service SHALL verify that the device fingerprint in the message matches the fingerprint recorded at session establishment.
3. IF the device fingerprint verification fails, THEN THE Device_Binding_Service SHALL reject the message, terminate the session, and emit a security:device-mismatch audit event.
4. THE Device_Binding_Service SHALL store device fingerprint bindings in the database with a TTL equal to the session duration plus 5 minutes.

---

### Requirement 3: Chunk-Based Recording Integrity

**User Story:** As a compliance officer, I want every meeting recording to be split into verifiable chunks with cryptographic hashes, so that any tampering with the recording can be detected.

#### Acceptance Criteria

1. WHEN a meeting recording is active, THE Recording_Service SHALL split the recording into Chunks of at most 10 seconds each.
2. WHEN a Chunk is produced, THE Recording_Service SHALL compute a SHA-256 hash of the Chunk binary content and store the hash alongside the Chunk.
3. WHEN all Chunks for a recording are available, THE Recording_Service SHALL construct a binary Merkle tree from the ordered list of Chunk hashes and compute the Merkle_Root.
4. WHEN the Merkle_Root is computed, THE Recording_Service SHALL write the Merkle_Root, recording ID, meeting ID, and UTC timestamp as a single immutable entry to the Audit_Store.
5. THE Audit_Store SHALL enforce append-only semantics: no UPDATE or DELETE operations SHALL be permitted on existing entries.
6. FOR ALL valid recordings stored in the system, re-computing the Merkle tree from the stored Chunk hashes SHALL produce a Merkle_Root identical to the entry in the Audit_Store (round-trip integrity property).

---

### Requirement 4: C2PA Manifest Embedding

**User Story:** As a legal or compliance user, I want exported recordings to carry a C2PA manifest, so that the provenance and integrity of the recording can be verified by third-party tools.

#### Acceptance Criteria

1. WHEN a recording is exported, THE Recording_Service SHALL embed a C2PA manifest into the exported file containing: the recording ID, meeting ID, creator identity (user ID), UTC creation timestamp, and the Merkle_Root.
2. THE Recording_Service SHALL sign the C2PA manifest using the Platform private signing key before embedding.
3. WHEN a C2PA-compliant verifier processes the exported file, THE Recording_Service SHALL produce a manifest that passes C2PA signature verification without modification.

---

### Requirement 5: Tamper Detection During Playback

**User Story:** As a participant reviewing a recorded meeting, I want the player to alert me if the recording has been tampered with, so that I can trust the content I am watching.

#### Acceptance Criteria

1. WHEN a recording is played back, THE Integrity_Verifier SHALL re-hash each Chunk as it is decoded and compare the result against the stored Chunk hash.
2. IF a Chunk hash mismatch is detected during playback, THEN THE Integrity_Verifier SHALL pause playback, display a tamper-detection warning to the user, and log the mismatch event including the Chunk index and recording ID.
3. WHEN playback completes without any mismatch, THE Integrity_Verifier SHALL display a verification-passed indicator to the user.
4. THE Integrity_Verifier SHALL verify each Chunk hash against the Merkle tree path to the stored Merkle_Root, confirming both individual Chunk integrity and tree membership.

---

### Requirement 6: On-Device Biometric Enrollment

**User Story:** As an enterprise user, I want to enroll my biometric template on-device, so that my facial data never leaves my device.

#### Acceptance Criteria

1. WHEN a user initiates biometric enrollment, THE Biometric_Engine SHALL capture a facial template using the device camera and store the template exclusively in device-local storage (IndexedDB or equivalent).
2. THE Biometric_Engine SHALL NOT transmit raw biometric data, facial images, or facial feature vectors to any server at any time.
3. WHEN enrollment is complete, THE Biometric_Engine SHALL generate a device-bound key pair and store the private key in the browser Web Crypto API non-extractable key store.
4. THE Biometric_Engine SHALL complete the enrollment process within 10 seconds under normal device conditions.

---

### Requirement 7: Continuous Biometric Presence Checks

**User Story:** As a security administrator, I want the platform to continuously verify that the enrolled user is present during a meeting, so that unattended or impersonated sessions are detected.

#### Acceptance Criteria

1. WHILE a session is active, THE Biometric_Engine SHALL perform a Presence_Check at a configurable interval (default: every 60 seconds).
2. WHEN a Presence_Check succeeds, THE Biometric_Engine SHALL produce a Verification_Token signed with the device-bound private key and transmit only the Verification_Token to the Identity_Service.
3. WHEN a Presence_Check fails (face not detected or liveness check fails), THE Biometric_Engine SHALL mute the participant audio and video and notify the Identity_Service with a presence:failed event.
4. IF three consecutive Presence_Checks fail, THEN THE Identity_Service SHALL issue a Step_Up_Challenge requiring the user to re-enroll or re-verify before the session is restored.
5. THE Identity_Service SHALL verify the Verification_Token signature against the device-bound public key registered at enrollment before accepting a Presence_Check result.

---

### Requirement 8: Step-Up Verification

**User Story:** As a security administrator, I want the platform to escalate identity verification when suspicious behaviour is detected, so that compromised sessions are contained quickly.

#### Acceptance Criteria

1. WHEN the Identity_Service detects anomalous behaviour (three consecutive Presence_Check failures, or a device fingerprint change mid-session), THE Identity_Service SHALL issue a Step_Up_Challenge to the affected participant within 5 seconds of detection.
2. WHEN a Step_Up_Challenge is issued, THE Platform SHALL restrict the participant session to receive-only mode until the challenge is resolved.
3. WHEN a participant successfully completes a Step_Up_Challenge, THE Identity_Service SHALL restore full session permissions and log the resolution event.
4. IF a Step_Up_Challenge is not resolved within 120 seconds, THEN THE Identity_Service SHALL terminate the participant session and emit a security:session-terminated audit event.

---

### Requirement 9: Multi-Device Shadow Session

**User Story:** As an enterprise user, I want a secondary device to silently shadow my active session, so that I can switch devices without any meeting disruption.

#### Acceptance Criteria

1. WHEN a user joins a meeting on a second device while already active on a Primary_Device, THE Handoff_Service SHALL register the second device as a Shadow_Session for that user.
2. WHILE a Shadow_Session is active, THE Handoff_Service SHALL synchronise the Session_State_Snapshot (mute state, camera state, speaking state, meeting context) to the Shadow_Session at intervals of at most 2 seconds.
3. WHILE a Shadow_Session is active, THE Platform SHALL keep the Shadow_Session audio and video streams muted and invisible to other participants.
4. THE Handoff_Service SHALL support at most 3 simultaneous Shadow_Sessions per user per meeting.

---

### Requirement 10: Zero-Friction Device Handoff

**User Story:** As an enterprise user, I want to switch from my primary device to a shadow device instantly, so that my meeting participation is uninterrupted during a device change.

#### Acceptance Criteria

1. WHEN a user triggers a manual Failover_Event, THE Handoff_Service SHALL promote the designated Shadow_Session to Primary_Device within 2 seconds.
2. WHEN the Failover_Event completes, THE Platform SHALL restore the new Primary_Device mute state, camera state, speaking state, and meeting context from the last Session_State_Snapshot.
3. WHEN the Failover_Event completes, THE Platform SHALL notify all other participants of the device switch via a system event without interrupting their streams.
4. IF the Primary_Device disconnects unexpectedly, THEN THE Handoff_Service SHALL automatically promote the most recently synchronised Shadow_Session to Primary_Device within 3 seconds of detecting the disconnection.
5. IF no Shadow_Session is available when the Primary_Device disconnects, THEN THE Handoff_Service SHALL emit a continuity:no-shadow-available event and allow the user to rejoin normally.

---

### Requirement 11: Session State Preservation Across Devices

**User Story:** As an enterprise user, I want my meeting context to be fully preserved when I switch devices, so that I do not lose any meeting state during a handoff.

#### Acceptance Criteria

1. THE Session_State_Snapshot SHALL include: mute state (boolean), camera state (boolean), screen-share state (boolean), active speaker identity (user ID), chat scroll position (message ID), and current meeting elapsed time (milliseconds).
2. WHEN a Failover_Event occurs, THE Handoff_Service SHALL apply the Session_State_Snapshot to the new Primary_Device before unmuting its streams.
3. FOR ALL Failover_Events, the Session_State_Snapshot applied to the new Primary_Device SHALL be no older than 2 seconds at the time of promotion (staleness property).

---

### Requirement 12: Audit Logging

**User Story:** As a compliance officer, I want all security-relevant events to be recorded in an immutable audit log, so that I can investigate incidents and demonstrate regulatory compliance.

#### Acceptance Criteria

1. THE Platform SHALL write an audit log entry for each of the following events: session establishment, key rotation, key exchange fallback, device fingerprint mismatch, Presence_Check failure, Step_Up_Challenge issuance and resolution, session termination, Failover_Event, and Merkle_Root storage.
2. WHEN an audit log entry is written, THE Audit_Store SHALL record: event type, user ID, meeting ID, device fingerprint hash, UTC timestamp, and a sequential entry ID.
3. THE Audit_Store SHALL enforce append-only semantics: no UPDATE or DELETE operations SHALL be permitted on existing audit log entries.
4. WHEN an audit log query is made by an authorised administrator, THE Audit_Store SHALL return results within 2 seconds for queries spanning up to 90 days of data.
