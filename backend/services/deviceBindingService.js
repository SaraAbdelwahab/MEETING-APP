const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auditStore = require('./auditStore');
const { AUDIT_EVENTS } = require('./auditStore');

class DeviceMismatchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DeviceMismatchError';
        this.code = 'DEVICE_MISMATCH';
    }
}

class DeviceBindingService {
    /**
     * Compute a SHA-256 fingerprint hash from device attributes.
     * Covers at least 5 stable attributes (satisfies >= 3 requirement).
     * @param {{ hardwareConcurrency, platform, screenHash, userAgentHash, timezoneOffset }} components
     * @returns {string} hex fingerprint hash
     */
    computeFingerprintHash(components) {
        const { hardwareConcurrency, platform, screenHash, userAgentHash, timezoneOffset } = components;
        const raw = [hardwareConcurrency, platform, screenHash, userAgentHash, timezoneOffset].join(':');
        return crypto.createHash('sha256').update(raw).digest('hex');
    }

    /**
     * Bind a Session_Key to a device fingerprint at session establishment.
     * @param {string} sessionId
     * @param {number} userId
     * @param {object} fingerprintComponents
     * @param {Date} sessionExpiresAt - session expiry; binding TTL = sessionExpiresAt + 5 min
     * @returns {Promise<{ bindingId: string, fingerprintHash: string }>}
     */
    async bindDevice(sessionId, userId, fingerprintComponents, sessionExpiresAt) {
        const fingerprintHash = this.computeFingerprintHash(fingerprintComponents);
        const bindingId = uuidv4();

        // TTL = session duration + 5 minutes
        const expiresAt = new Date((sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : Date.now()) + 5 * 60 * 1000);

        await db.query(
            `INSERT INTO device_bindings (id, session_id, user_id, fingerprint_hash, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [bindingId, sessionId, userId, fingerprintHash, expiresAt]
        );

        return { bindingId, fingerprintHash };
    }

    /**
     * Verify that an incoming fingerprint hash matches the stored binding.
     * @param {string} sessionId
     * @param {string} incomingFingerprintHash
     * @returns {Promise<true>} - throws DeviceMismatchError on failure
     */
    async verifyFingerprint(sessionId, incomingFingerprintHash) {
        const [rows] = await db.query(
            `SELECT fingerprint_hash FROM device_bindings
             WHERE session_id = ? AND expires_at > NOW()
             ORDER BY bound_at DESC LIMIT 1`,
            [sessionId]
        );

        if (!rows.length) {
            throw new DeviceMismatchError(`No active binding found for session: ${sessionId}`);
        }

        if (rows[0].fingerprint_hash !== incomingFingerprintHash) {
            throw new DeviceMismatchError(`Fingerprint mismatch for session: ${sessionId}`);
        }

        return true;
    }

    /**
     * Handle a device mismatch: write audit entry, emit socket event, terminate session.
     * @param {string} sessionId
     * @param {number} userId
     * @param {number} meetingId
     * @param {string} fingerprintHash
     * @param {object} io - Socket.IO instance
     */
    async handleMismatch(sessionId, userId, meetingId, fingerprintHash, io) {
        await auditStore.write({
            eventType: AUDIT_EVENTS.SECURITY_DEVICE_MISMATCH,
            userId,
            meetingId,
            deviceFingerprintHash: fingerprintHash,
            metadata: { sessionId },
        });

        if (io) {
            io.to(`session:${sessionId}`).emit('security:device-mismatch', {
                sessionId,
                message: 'Device fingerprint mismatch. Session terminated.',
            });
        }

        // Mark binding as expired
        await db.query(
            `UPDATE device_bindings SET expires_at = NOW() WHERE session_id = ?`,
            [sessionId]
        );
    }
}

module.exports = new DeviceBindingService();
module.exports.DeviceMismatchError = DeviceMismatchError;
