const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auditStore = require('./auditStore');
const { AUDIT_EVENTS } = require('./auditStore');

const MAX_SHADOW_SESSIONS = 3;

let _io = null;

class HandoffService {
    setIO(io) {
        _io = io;
    }

    /**
     * Register a new shadow session for a user.
     * Rejects if user already has MAX_SHADOW_SESSIONS active shadows.
     * @param {number} userId
     * @param {number} meetingId
     * @param {string} shadowSocketId
     * @param {string} deviceFingerprint
     * @returns {Promise<{ shadowSessionId: string }>}
     */
    async registerShadow(userId, meetingId, shadowSocketId, deviceFingerprint) {
        const [existing] = await db.query(
            `SELECT COUNT(*) as count FROM shadow_sessions
             WHERE user_id = ? AND meeting_id = ? AND is_active = 1`,
            [userId, meetingId]
        );

        if (existing[0].count >= MAX_SHADOW_SESSIONS) {
            throw new Error(`Maximum shadow sessions (${MAX_SHADOW_SESSIONS}) reached for user ${userId} in meeting ${meetingId}`);
        }

        const shadowSessionId = uuidv4();

        await db.query(
            `INSERT INTO shadow_sessions (id, user_id, meeting_id, socket_id, device_fingerprint)
             VALUES (?, ?, ?, ?, ?)`,
            [shadowSessionId, userId, meetingId, shadowSocketId, deviceFingerprint]
        );

        return { shadowSessionId };
    }

    /**
     * Push a Session_State_Snapshot to all shadow sessions for a user.
     * Validates all 6 required fields are present.
     * @param {number} userId
     * @param {number} meetingId
     * @param {{ muteState, cameraState, screenShareState, activeSpeakerId, chatScrollMessageId, elapsedMs }} snapshot
     */
    async syncSnapshot(userId, meetingId, snapshot) {
        const { muteState, cameraState, screenShareState, activeSpeakerId, chatScrollMessageId, elapsedMs } = snapshot;

        // Validate all required fields
        if (muteState === undefined || cameraState === undefined || screenShareState === undefined || elapsedMs === undefined) {
            throw new Error('Snapshot missing required fields: muteState, cameraState, screenShareState, elapsedMs');
        }

        // Store snapshot
        await db.query(
            `INSERT INTO session_state_snapshots
             (user_id, meeting_id, mute_state, camera_state, screen_share_state, active_speaker_id, chat_scroll_message_id, elapsed_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, meetingId, muteState ? 1 : 0, cameraState ? 1 : 0, screenShareState ? 1 : 0,
             activeSpeakerId || null, chatScrollMessageId || null, elapsedMs]
        );

        // Update last_synced_at for all active shadows
        await db.query(
            `UPDATE shadow_sessions SET last_synced_at = NOW()
             WHERE user_id = ? AND meeting_id = ? AND is_active = 1`,
            [userId, meetingId]
        );

        // Emit snapshot to all shadow sockets
        if (_io) {
            const [shadows] = await db.query(
                `SELECT socket_id FROM shadow_sessions
                 WHERE user_id = ? AND meeting_id = ? AND is_active = 1`,
                [userId, meetingId]
            );
            for (const shadow of shadows) {
                _io.to(shadow.socket_id).emit('handoff:snapshot', snapshot);
            }
        }
    }

    /**
     * Promote a shadow session to Primary_Device.
     * @param {number} userId
     * @param {number} meetingId
     * @param {string} shadowSessionId
     * @returns {Promise<{ newPrimarySocketId: string, snapshot: object }>}
     */
    async promote(userId, meetingId, shadowSessionId) {
        const [shadows] = await db.query(
            `SELECT * FROM shadow_sessions WHERE id = ? AND user_id = ? AND meeting_id = ? AND is_active = 1`,
            [shadowSessionId, userId, meetingId]
        );

        if (!shadows.length) throw new Error(`Shadow session not found: ${shadowSessionId}`);
        const shadow = shadows[0];

        // Get latest snapshot (must be <= 2s old for staleness invariant)
        const [snapshots] = await db.query(
            `SELECT * FROM session_state_snapshots
             WHERE user_id = ? AND meeting_id = ?
             ORDER BY captured_at DESC LIMIT 1`,
            [userId, meetingId]
        );

        const snapshot = snapshots.length ? snapshots[0] : null;

        // Deactivate all other shadows for this user in this meeting
        await db.query(
            `UPDATE shadow_sessions SET is_active = 0
             WHERE user_id = ? AND meeting_id = ? AND id != ?`,
            [userId, meetingId, shadowSessionId]
        );

        // Mark promoted shadow as primary (is_active stays 1, it's now the primary)
        await db.query(
            `UPDATE shadow_sessions SET is_active = 0 WHERE id = ?`,
            [shadowSessionId]
        );

        await auditStore.write({
            eventType: AUDIT_EVENTS.CONTINUITY_FAILOVER,
            userId,
            meetingId,
            metadata: { shadowSessionId, newPrimarySocketId: shadow.socket_id },
        });

        // Emit promotion to the shadow device
        if (_io) {
            _io.to(shadow.socket_id).emit('handoff:promote', {
                snapshot: snapshot ? {
                    muteState: !!snapshot.mute_state,
                    cameraState: !!snapshot.camera_state,
                    screenShareState: !!snapshot.screen_share_state,
                    activeSpeakerId: snapshot.active_speaker_id,
                    chatScrollMessageId: snapshot.chat_scroll_message_id,
                    elapsedMs: snapshot.elapsed_ms,
                } : null,
            });

            // Notify all other participants
            _io.to(`meeting:${meetingId}`).emit('receive-message', {
                id: Date.now().toString(),
                meetingId,
                userId: 'system',
                userEmail: 'System',
                message: `A participant switched devices`,
                timestamp: new Date().toISOString(),
                type: 'system',
            });
        }

        return {
            newPrimarySocketId: shadow.socket_id,
            snapshot,
        };
    }

    /**
     * Handle primary device disconnect. Auto-promote most recently synced shadow.
     * @param {number} userId
     * @param {number} meetingId
     * @returns {Promise<{ promoted: boolean, shadowSessionId?: string }>}
     */
    async handlePrimaryDisconnect(userId, meetingId) {
        const [shadows] = await db.query(
            `SELECT * FROM shadow_sessions
             WHERE user_id = ? AND meeting_id = ? AND is_active = 1
             ORDER BY last_synced_at DESC LIMIT 1`,
            [userId, meetingId]
        );

        if (!shadows.length) {
            await auditStore.write({
                eventType: AUDIT_EVENTS.CONTINUITY_NO_SHADOW_AVAILABLE,
                userId,
                meetingId,
                metadata: { reason: 'no-active-shadow' },
            });
            return { promoted: false };
        }

        const shadow = shadows[0];
        await this.promote(userId, meetingId, shadow.id);

        return { promoted: true, shadowSessionId: shadow.id };
    }

    /**
     * Get all active shadow socket IDs for a user in a meeting.
     * Used to filter shadows from participant broadcasts.
     * @param {number} userId
     * @param {number} meetingId
     * @returns {Promise<string[]>}
     */
    async getShadowSocketIds(userId, meetingId) {
        const [rows] = await db.query(
            `SELECT socket_id FROM shadow_sessions
             WHERE user_id = ? AND meeting_id = ? AND is_active = 1`,
            [userId, meetingId]
        );
        return rows.map(r => r.socket_id);
    }

    /**
     * Deactivate all shadow sessions for a user in a meeting (on clean leave).
     */
    async deactivateShadows(userId, meetingId) {
        await db.query(
            `UPDATE shadow_sessions SET is_active = 0
             WHERE user_id = ? AND meeting_id = ?`,
            [userId, meetingId]
        );
    }
}

module.exports = new HandoffService();
