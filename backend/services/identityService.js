const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auditStore = require('./auditStore');
const { AUDIT_EVENTS } = require('./auditStore');

const STEP_UP_TIMEOUT_MS = 120 * 1000; // 120 seconds
const MAX_CONSECUTIVE_FAILURES = 3;

// In-memory state (use Redis in production for multi-instance)
const consecutiveFailures = new Map(); // `${userId}:${sessionId}` -> count
const stepUpChallenges = new Map();    // challengeId -> { userId, sessionId, timer, expiresAt }
const sessionPermissions = new Map();  // sessionId -> 'full' | 'receive-only'

let _io = null;

class IdentityService {
    setIO(io) {
        _io = io;
    }

    /**
     * Register a device's public key at enrollment.
     * @param {number} userId
     * @param {string} deviceId
     * @param {object} publicKeyJwk
     * @returns {Promise<{ keyId: string }>}
     */
    async registerDeviceKey(userId, deviceId, publicKeyJwk) {
        const keyId = uuidv4();

        await db.query(
            `INSERT INTO biometric_device_keys (id, user_id, device_id, public_key_jwk)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE public_key_jwk = VALUES(public_key_jwk), enrolled_at = NOW(), is_active = 1`,
            [keyId, userId, deviceId, JSON.stringify(publicKeyJwk)]
        );

        return { keyId };
    }

    /**
     * Verify a Verification_Token JWT signed by the device private key.
     * Ensures payload contains only { userId, deviceId, timestamp, result }.
     * @param {number} userId
     * @param {string} deviceId
     * @param {string} verificationToken - base64url JWT
     * @returns {Promise<{ valid: boolean, timestamp: Date }>}
     */
    async verifyPresenceToken(userId, deviceId, verificationToken) {
        const [rows] = await db.query(
            `SELECT public_key_jwk FROM biometric_device_keys
             WHERE user_id = ? AND device_id = ? AND is_active = 1`,
            [userId, deviceId]
        );

        if (!rows.length) throw new Error(`No enrolled device key for user ${userId} device ${deviceId}`);

        const publicKeyJwk = JSON.parse(rows[0].public_key_jwk);

        // Decode JWT (header.payload.signature)
        const parts = verificationToken.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

        // Strict payload validation — no raw biometric data allowed
        const allowedFields = new Set(['userId', 'deviceId', 'timestamp', 'result']);
        const payloadFields = Object.keys(payload);
        const hasExtraFields = payloadFields.some(f => !allowedFields.has(f));
        if (hasExtraFields) {
            throw new Error('Verification token contains disallowed fields');
        }

        // Verify signature using device public key
        const signingInput = `${parts[0]}.${parts[1]}`;
        const signature = Buffer.from(parts[2], 'base64url');

        const publicKey = crypto.createPublicKey({ key: publicKeyJwk, format: 'jwk' });
        const verify = crypto.createVerify('SHA256');
        verify.update(signingInput);
        const valid = verify.verify(publicKey, signature);

        if (valid) {
            await db.query(
                `UPDATE biometric_device_keys SET last_used_at = NOW() WHERE user_id = ? AND device_id = ?`,
                [userId, deviceId]
            );
        }

        return { valid, timestamp: new Date(payload.timestamp) };
    }

    /**
     * Record a presence check failure. Issues step-up after 3 consecutive failures.
     * @param {number} userId
     * @param {string} sessionId
     * @param {number} meetingId
     * @returns {Promise<{ consecutiveFailures: number, stepUpIssued: boolean }>}
     */
    async recordPresenceFailure(userId, sessionId, meetingId) {
        const key = `${userId}:${sessionId}`;
        const count = (consecutiveFailures.get(key) || 0) + 1;
        consecutiveFailures.set(key, count);

        await auditStore.write({
            eventType: AUDIT_EVENTS.IDENTITY_PRESENCE_FAILED,
            userId,
            meetingId,
            metadata: { sessionId, consecutiveFailures: count },
        });

        let stepUpIssued = false;
        if (count >= MAX_CONSECUTIVE_FAILURES) {
            await this.issueStepUpChallenge(userId, sessionId, meetingId);
            consecutiveFailures.delete(key); // reset counter
            stepUpIssued = true;
        }

        return { consecutiveFailures: count, stepUpIssued };
    }

    /**
     * Reset consecutive failure counter on successful presence check.
     */
    resetFailureCounter(userId, sessionId) {
        consecutiveFailures.delete(`${userId}:${sessionId}`);
    }

    /**
     * Issue a step-up challenge. Restricts session to receive-only.
     * @param {number} userId
     * @param {string} sessionId
     * @param {number} meetingId
     * @returns {Promise<{ challengeId: string, expiresAt: Date }>}
     */
    async issueStepUpChallenge(userId, sessionId, meetingId) {
        const challengeId = uuidv4();
        const expiresAt = new Date(Date.now() + STEP_UP_TIMEOUT_MS);

        // Restrict session
        sessionPermissions.set(sessionId, 'receive-only');

        // Emit challenge to client
        if (_io) {
            _io.to(`session:${sessionId}`).emit('identity:step-up-challenge', {
                challengeId,
                expiresAt,
                message: 'Identity verification required. Please complete biometric check.',
            });
        }

        await auditStore.write({
            eventType: AUDIT_EVENTS.IDENTITY_STEP_UP_ISSUED,
            userId,
            meetingId,
            metadata: { sessionId, challengeId, expiresAt },
        });

        // Auto-terminate after timeout
        const timer = setTimeout(async () => {
            if (stepUpChallenges.has(challengeId)) {
                stepUpChallenges.delete(challengeId);
                sessionPermissions.delete(sessionId);

                await auditStore.write({
                    eventType: AUDIT_EVENTS.IDENTITY_SESSION_TERMINATED,
                    userId,
                    meetingId,
                    metadata: { sessionId, challengeId, reason: 'step-up-timeout' },
                });

                if (_io) {
                    _io.to(`session:${sessionId}`).emit('identity:session-terminated', {
                        reason: 'Step-up challenge not resolved within 120 seconds',
                    });
                }
            }
        }, STEP_UP_TIMEOUT_MS);

        stepUpChallenges.set(challengeId, { userId, sessionId, meetingId, timer, expiresAt });

        return { challengeId, expiresAt };
    }

    /**
     * Resolve a step-up challenge. Restores full session permissions.
     * @param {string} challengeId
     * @param {number} userId
     * @param {string} verificationToken
     * @returns {Promise<{ resolved: boolean }>}
     */
    async resolveStepUpChallenge(challengeId, userId, verificationToken) {
        const challenge = stepUpChallenges.get(challengeId);
        if (!challenge) throw new Error(`Challenge not found or already expired: ${challengeId}`);
        if (challenge.userId !== userId) throw new Error('Challenge userId mismatch');

        // Cancel expiry timer
        clearTimeout(challenge.timer);
        stepUpChallenges.delete(challengeId);

        // Restore full permissions
        sessionPermissions.set(challenge.sessionId, 'full');

        await auditStore.write({
            eventType: AUDIT_EVENTS.IDENTITY_STEP_UP_RESOLVED,
            userId,
            meetingId: challenge.meetingId,
            metadata: { sessionId: challenge.sessionId, challengeId },
        });

        if (_io) {
            _io.to(`session:${challenge.sessionId}`).emit('identity:permissions-restored', {
                sessionId: challenge.sessionId,
            });
        }

        return { resolved: true };
    }

    /**
     * Get current session permission level.
     * @param {string} sessionId
     * @returns {'full' | 'receive-only'}
     */
    getSessionPermission(sessionId) {
        return sessionPermissions.get(sessionId) || 'full';
    }
}

module.exports = new IdentityService();
