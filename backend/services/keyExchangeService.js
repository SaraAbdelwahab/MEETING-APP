const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auditStore = require('./auditStore');
const { AUDIT_EVENTS } = require('./auditStore');

// Key rotation interval: 30 minutes
const KEY_ROTATION_INTERVAL_MS = 30 * 60 * 1000;
// Session key TTL: 35 minutes (rotation + 5 min buffer)
const SESSION_KEY_TTL_MS = 35 * 60 * 1000;

// In-memory rotation timers: sessionId -> timer
const rotationTimers = new Map();
// In-memory socket reference for emitting rekey events
let _io = null;

class KeyExchangeService {
    /**
     * Set the Socket.IO instance for emitting rekey events.
     */
    setIO(io) {
        _io = io;
    }

    /**
     * Derive a 32-byte Session_Key using HKDF-SHA256.
     * ikm = ecdhSecret || kemSharedSecret
     * @param {Buffer} ecdhSecret
     * @param {Buffer} kemSharedSecret
     * @param {string} sessionId - used as salt
     * @returns {Buffer} 32-byte key
     */
    deriveSessionKey(ecdhSecret, kemSharedSecret, sessionId = '') {
        const ikm = Buffer.concat([
            Buffer.isBuffer(ecdhSecret) ? ecdhSecret : Buffer.from(ecdhSecret),
            Buffer.isBuffer(kemSharedSecret) ? kemSharedSecret : Buffer.from(kemSharedSecret),
        ]);
        const salt = Buffer.from(sessionId || 'default-salt', 'utf8');
        const info = Buffer.from('session-key', 'utf8');

        // HKDF-Extract
        const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
        // HKDF-Expand (1 block = 32 bytes)
        const t = crypto.createHmac('sha256', prk).update(Buffer.concat([info, Buffer.from([0x01])])).digest();
        return t.slice(0, 32);
    }

    /**
     * Initiate hybrid KEM handshake.
     * Attempts ML-KEM-768 + X25519. Falls back to X25519-only if ML-KEM unavailable.
     * @param {string} clientX25519PubHex - client's X25519 public key (hex)
     * @param {string|null} clientKEMEncapKeyBase64 - client's ML-KEM-768 encapsulation key (base64), null for fallback
     * @param {number} meetingId
     * @param {number} userId
     * @returns {Promise<{ sessionId, serverX25519Pub, kemCiphertext, expiresAt, algorithm }>}
     */
    async initiateHandshake(clientX25519PubHex, clientKEMEncapKeyBase64, meetingId, userId) {
        const sessionId = uuidv4();

        // Generate ephemeral X25519 key pair
        const { privateKey: serverX25519Priv, publicKey: serverX25519Pub } =
            crypto.generateKeyPairSync('x25519');

        const clientX25519PubKey = crypto.createPublicKey({
            key: Buffer.from(clientX25519PubHex, 'hex'),
            format: 'der',
            type: 'spki',
        });

        // Compute ECDH shared secret
        const ecdhSecret = crypto.diffieHellman({
            privateKey: serverX25519Priv,
            publicKey: clientX25519PubKey,
        });

        let kemSharedSecret = Buffer.alloc(32, 0);
        let kemCiphertext = null;
        let algorithm = 'HYBRID_X25519_MLKEM768';

        // Attempt ML-KEM-768
        if (clientKEMEncapKeyBase64) {
            try {
                const mlkem = require('mlkem');
                const encapKey = Buffer.from(clientKEMEncapKeyBase64, 'base64');
                const { ciphertext, sharedSecret } = mlkem.encapsulate768(encapKey);
                kemSharedSecret = Buffer.from(sharedSecret);
                kemCiphertext = Buffer.from(ciphertext).toString('base64');
            } catch (kemErr) {
                // ML-KEM failed — fall back to ECDH-only
                console.warn('[KeyExchange] ML-KEM-768 failed, falling back to ECDH-only:', kemErr.message);
                algorithm = 'ECDH_X25519_ONLY';
                await auditStore.write({
                    eventType: AUDIT_EVENTS.SESSION_KEY_ROTATION_FALLBACK,
                    userId,
                    meetingId,
                    metadata: { reason: kemErr.message, sessionId },
                });
            }
        } else {
            algorithm = 'ECDH_X25519_ONLY';
        }

        const sessionKey = this.deriveSessionKey(ecdhSecret, kemSharedSecret, sessionId);
        const expiresAt = new Date(Date.now() + SESSION_KEY_TTL_MS);

        // Store session key (encrypted at rest — store as hex; in production use AES-wrap with master key)
        await db.query(
            `INSERT INTO session_keys (session_id, meeting_id, user_id, key_material, algorithm, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, meetingId, userId, sessionKey.toString('hex'), algorithm, expiresAt]
        );

        // Schedule key rotation
        this._scheduleRotation(sessionId, meetingId, userId);

        const serverX25519PubDer = serverX25519Pub.export({ type: 'spki', format: 'der' });

        return {
            sessionId,
            serverX25519Pub: serverX25519PubDer.toString('hex'),
            kemCiphertext,
            expiresAt,
            algorithm,
        };
    }

    /**
     * ECDH-only fallback handshake.
     */
    async ecdhFallback(meetingId, userId, clientX25519PubHex) {
        const sessionId = uuidv4();

        const { privateKey: serverPriv, publicKey: serverPub } =
            crypto.generateKeyPairSync('x25519');

        const clientPubKey = crypto.createPublicKey({
            key: Buffer.from(clientX25519PubHex, 'hex'),
            format: 'der',
            type: 'spki',
        });

        const ecdhSecret = crypto.diffieHellman({ privateKey: serverPriv, publicKey: clientPubKey });
        const sessionKey = this.deriveSessionKey(ecdhSecret, Buffer.alloc(32, 0), sessionId);
        const expiresAt = new Date(Date.now() + SESSION_KEY_TTL_MS);

        await db.query(
            `INSERT INTO session_keys (session_id, meeting_id, user_id, key_material, algorithm, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, meetingId, userId, sessionKey.toString('hex'), 'ECDH_X25519_ONLY', expiresAt]
        );

        await auditStore.write({
            eventType: AUDIT_EVENTS.SESSION_KEY_ROTATION_FALLBACK,
            userId,
            meetingId,
            metadata: { sessionId, reason: 'explicit-fallback' },
        });

        this._scheduleRotation(sessionId, meetingId, userId);

        const serverPubDer = serverPub.export({ type: 'spki', format: 'der' });
        return { sessionId, serverX25519Pub: serverPubDer.toString('hex') };
    }

    /**
     * Rotate the session key for an active session.
     */
    async rotateKey(sessionId) {
        const [rows] = await db.query(
            `SELECT * FROM session_keys WHERE session_id = ? AND is_active = 1`,
            [sessionId]
        );
        if (!rows.length) throw new Error(`No active session key for sessionId: ${sessionId}`);

        const old = rows[0];

        // Mark old key inactive
        await db.query(
            `UPDATE session_keys SET is_active = 0, rotated_at = NOW() WHERE session_id = ?`,
            [sessionId]
        );

        // Generate new session key (simplified: new random key for rotation)
        const newSessionId = uuidv4();
        const newKey = crypto.randomBytes(32);
        const expiresAt = new Date(Date.now() + SESSION_KEY_TTL_MS);

        await db.query(
            `INSERT INTO session_keys (session_id, meeting_id, user_id, key_material, algorithm, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [newSessionId, old.meeting_id, old.user_id, newKey.toString('hex'), old.algorithm, expiresAt]
        );

        await auditStore.write({
            eventType: AUDIT_EVENTS.SESSION_KEY_ROTATION,
            userId: old.user_id,
            meetingId: old.meeting_id,
            metadata: { oldSessionId: sessionId, newSessionId },
        });

        // Emit rekey event to client via socket
        if (_io) {
            _io.to(`session:${sessionId}`).emit('secure:rekey-init', {
                newSessionId,
                kemCiphertext: null, // simplified; full impl would re-encapsulate
            });
        }

        // Schedule next rotation
        this._scheduleRotation(newSessionId, old.meeting_id, old.user_id);

        return { newSessionId };
    }

    /**
     * Get the active session key material for a session.
     */
    async getSessionKey(sessionId) {
        const [rows] = await db.query(
            `SELECT key_material FROM session_keys WHERE session_id = ? AND is_active = 1 AND expires_at > NOW()`,
            [sessionId]
        );
        if (!rows.length) return null;
        return Buffer.from(rows[0].key_material, 'hex');
    }

    /**
     * Terminate a session (mark key inactive, write audit entry).
     */
    async terminateSession(sessionId, userId, meetingId) {
        await db.query(
            `UPDATE session_keys SET is_active = 0 WHERE session_id = ?`,
            [sessionId]
        );
        this._clearRotationTimer(sessionId);
        await auditStore.write({
            eventType: AUDIT_EVENTS.SESSION_TERMINATED,
            userId,
            meetingId,
            metadata: { sessionId },
        });
    }

    _scheduleRotation(sessionId, meetingId, userId) {
        this._clearRotationTimer(sessionId);
        const timer = setTimeout(async () => {
            try {
                await this.rotateKey(sessionId);
            } catch (err) {
                console.error(`[KeyExchange] Key rotation failed for session ${sessionId}:`, err.message);
            }
        }, KEY_ROTATION_INTERVAL_MS);
        rotationTimers.set(sessionId, timer);
    }

    _clearRotationTimer(sessionId) {
        if (rotationTimers.has(sessionId)) {
            clearTimeout(rotationTimers.get(sessionId));
            rotationTimers.delete(sessionId);
        }
    }
}

module.exports = new KeyExchangeService();
