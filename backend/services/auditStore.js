const db = require('../config/database');

// Audit event type constants
const AUDIT_EVENTS = {
    SESSION_ESTABLISHED: 'session:established',
    SESSION_KEY_ROTATION: 'session:key_rotation',
    SESSION_KEY_ROTATION_FALLBACK: 'session:key_rotation_fallback',
    SESSION_TERMINATED: 'session:terminated',
    SECURITY_DEVICE_MISMATCH: 'security:device_mismatch',
    IDENTITY_PRESENCE_FAILED: 'identity:presence_failed',
    IDENTITY_STEP_UP_ISSUED: 'identity:step_up_issued',
    IDENTITY_STEP_UP_RESOLVED: 'identity:step_up_resolved',
    IDENTITY_SESSION_TERMINATED: 'identity:session_terminated',
    RECORDING_MERKLE_ROOT_STORED: 'recording:merkle_root_stored',
    CONTINUITY_FAILOVER: 'continuity:failover',
    CONTINUITY_NO_SHADOW_AVAILABLE: 'continuity:no_shadow_available',
};

class AuditStore {
    /**
     * Append a single audit event. No update/delete permitted (enforced by DB trigger).
     * @param {{ eventType: string, userId?: number, meetingId?: number, deviceFingerprintHash?: string, metadata?: object }} event
     * @returns {Promise<{ entryId: number, utcTimestamp: Date }>}
     */
    async write(event) {
        const { eventType, userId = null, meetingId = null, deviceFingerprintHash = null, metadata = null } = event;

        if (!eventType) {
            throw new Error('AuditStore.write: eventType is required');
        }

        const query = `
            INSERT INTO audit_log (event_type, user_id, meeting_id, device_fingerprint_hash, metadata)
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            eventType,
            userId,
            meetingId,
            deviceFingerprintHash,
            metadata ? JSON.stringify(metadata) : null,
        ]);

        return {
            entryId: result.insertId,
            utcTimestamp: new Date(),
        };
    }

    /**
     * Query audit log for an authorised administrator.
     * @param {{ userId?: number, meetingId?: number, eventType?: string, fromDate?: string, toDate?: string, limit?: number, offset?: number }} filters
     * @returns {Promise<Array>}
     */
    async query(filters = {}) {
        const {
            userId,
            meetingId,
            eventType,
            fromDate,
            toDate,
            limit = 100,
            offset = 0,
        } = filters;

        const conditions = [];
        const params = [];

        if (userId !== undefined && userId !== null) {
            conditions.push('user_id = ?');
            params.push(userId);
        }
        if (meetingId !== undefined && meetingId !== null) {
            conditions.push('meeting_id = ?');
            params.push(meetingId);
        }
        if (eventType) {
            conditions.push('event_type = ?');
            params.push(eventType);
        }
        if (fromDate) {
            conditions.push('utc_timestamp >= ?');
            params.push(fromDate);
        }
        if (toDate) {
            conditions.push('utc_timestamp <= ?');
            params.push(toDate);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const query = `
            SELECT id, event_type, user_id, meeting_id, device_fingerprint_hash, metadata, utc_timestamp
            FROM audit_log
            ${where}
            ORDER BY id ASC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), parseInt(offset));
        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = new AuditStore();
module.exports.AUDIT_EVENTS = AUDIT_EVENTS;
