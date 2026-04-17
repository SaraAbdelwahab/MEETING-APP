const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auditStore = require('./auditStore');
const { AUDIT_EVENTS } = require('./auditStore');

const RECORDINGS_DIR = path.join(__dirname, '..', 'uploads', 'recordings');
const MAX_CHUNK_DURATION_MS = 10000;

// Ensure recordings directory exists
if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

class RecordingService {
    /**
     * Start a new recording for a meeting.
     * @param {number} meetingId
     * @param {number} userId
     * @returns {Promise<{ recordingId: string }>}
     */
    async startRecording(meetingId, userId) {
        const recordingId = uuidv4();
        // Create a directory for this recording's chunks
        const recordingDir = path.join(RECORDINGS_DIR, recordingId);
        fs.mkdirSync(recordingDir, { recursive: true });
        return { recordingId };
    }

    /**
     * Ingest a binary chunk. Validates duration, computes SHA-256, stores to disk and DB.
     * @param {string} recordingId
     * @param {number} chunkIndex
     * @param {Buffer} chunkBuffer
     * @param {number} durationMs - must be <= 10000
     * @param {number} meetingId
     * @returns {Promise<{ chunkId: string, sha256Hash: string }>}
     */
    async ingestChunk(recordingId, chunkIndex, chunkBuffer, durationMs, meetingId) {
        if (durationMs > MAX_CHUNK_DURATION_MS) {
            throw new Error(`Chunk duration ${durationMs}ms exceeds maximum of ${MAX_CHUNK_DURATION_MS}ms`);
        }

        const sha256Hash = crypto.createHash('sha256').update(chunkBuffer).digest('hex');
        const chunkId = uuidv4();
        const storagePath = path.join(RECORDINGS_DIR, recordingId, `chunk_${chunkIndex}.bin`);

        fs.writeFileSync(storagePath, chunkBuffer);

        await db.query(
            `INSERT INTO recording_chunks (id, recording_id, meeting_id, chunk_index, sha256_hash, storage_path, duration_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [chunkId, recordingId, meetingId, chunkIndex, sha256Hash, storagePath, durationMs]
        );

        return { chunkId, sha256Hash };
    }

    /**
     * Build a binary Merkle tree from an ordered list of leaf hashes.
     * Duplicates last leaf if count is odd.
     * @param {string[]} leafHashes - hex SHA-256 hashes
     * @returns {{ root: string, tree: string[][] }} root hex hash and full tree levels
     */
    buildMerkleTree(leafHashes) {
        if (!leafHashes.length) throw new Error('Cannot build Merkle tree from empty list');

        let level = leafHashes.map(h => h);
        const tree = [level];

        while (level.length > 1) {
            if (level.length % 2 !== 0) {
                level = [...level, level[level.length - 1]]; // duplicate last
            }
            const nextLevel = [];
            for (let i = 0; i < level.length; i += 2) {
                const combined = level[i] + level[i + 1];
                nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
            }
            level = nextLevel;
            tree.push(level);
        }

        return { root: level[0], tree };
    }

    /**
     * Compute the Merkle proof (sibling path) for a leaf at a given index.
     * @param {string[][]} tree - full tree from buildMerkleTree
     * @param {number} leafIndex
     * @returns {Array<{ hash: string, position: 'left'|'right' }>}
     */
    getMerkleProof(tree, leafIndex) {
        const proof = [];
        let index = leafIndex;

        for (let level = 0; level < tree.length - 1; level++) {
            const levelNodes = tree[level];
            const isRight = index % 2 === 1;
            const siblingIndex = isRight ? index - 1 : index + 1;

            if (siblingIndex < levelNodes.length) {
                proof.push({
                    hash: levelNodes[siblingIndex],
                    position: isRight ? 'left' : 'right',
                });
            }
            index = Math.floor(index / 2);
        }

        return proof;
    }

    /**
     * Finalise recording: build Merkle tree, write root to audit store.
     * @param {string} recordingId
     * @param {number} meetingId
     * @param {number} userId
     * @returns {Promise<{ merkleRoot: string, chunkCount: number }>}
     */
    async finaliseRecording(recordingId, meetingId, userId) {
        const [chunks] = await db.query(
            `SELECT chunk_index, sha256_hash FROM recording_chunks
             WHERE recording_id = ? ORDER BY chunk_index ASC`,
            [recordingId]
        );

        if (!chunks.length) throw new Error(`No chunks found for recording: ${recordingId}`);

        const leafHashes = chunks.map(c => c.sha256_hash);
        const { root: merkleRoot } = this.buildMerkleTree(leafHashes);

        await db.query(
            `INSERT INTO recording_merkle_roots (recording_id, meeting_id, merkle_root, chunk_count)
             VALUES (?, ?, ?, ?)`,
            [recordingId, meetingId, merkleRoot, chunks.length]
        );

        await auditStore.write({
            eventType: AUDIT_EVENTS.RECORDING_MERKLE_ROOT_STORED,
            userId,
            meetingId,
            metadata: { recordingId, merkleRoot, chunkCount: chunks.length },
        });

        return { merkleRoot, chunkCount: chunks.length };
    }

    /**
     * Get ordered chunk hashes with Merkle proofs for a recording.
     * @param {string} recordingId
     * @returns {Promise<Array<{ chunkIndex: number, sha256Hash: string, merkleProof: Array }>>}
     */
    async getChunkHashes(recordingId) {
        const [chunks] = await db.query(
            `SELECT chunk_index, sha256_hash FROM recording_chunks
             WHERE recording_id = ? ORDER BY chunk_index ASC`,
            [recordingId]
        );

        if (!chunks.length) return [];

        const leafHashes = chunks.map(c => c.sha256_hash);
        const { tree } = this.buildMerkleTree(leafHashes);

        return chunks.map((chunk, i) => ({
            chunkIndex: chunk.chunk_index,
            sha256Hash: chunk.sha256_hash,
            merkleProof: this.getMerkleProof(tree, i),
        }));
    }

    /**
     * Get all recordings for a user
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async getUserRecordings(userId) {
        const [recordings] = await db.query(
            `SELECT 
                r.recording_id,
                r.meeting_id,
                m.title as meeting_title,
                rmr.merkle_root,
                rmr.chunk_count,
                rmr.created_at
             FROM recording_merkle_roots rmr
             JOIN recording_chunks r ON r.recording_id = rmr.recording_id
             JOIN meetings m ON m.id = rmr.meeting_id
             WHERE m.created_by = ?
             GROUP BY r.recording_id
             ORDER BY rmr.created_at DESC`,
            [userId]
        );

        return recordings.map(rec => ({
            recordingId: rec.recording_id,
            meetingId: rec.meeting_id,
            meetingTitle: rec.meeting_title,
            merkleRoot: rec.merkle_root,
            chunkCount: rec.chunk_count,
            createdAt: rec.created_at,
        }));
    }

    /**
     * Export recording with embedded C2PA manifest.
     * Returns a JSON envelope (in production this would be an MP4 with sidecar).
     * @param {string} recordingId
     * @param {number} requestingUserId
     * @returns {Promise<Buffer>}
     */
    async exportWithC2PA(recordingId, requestingUserId) {
        const [rootRows] = await db.query(
            `SELECT * FROM recording_merkle_roots WHERE recording_id = ?`,
            [recordingId]
        );
        if (!rootRows.length) throw new Error(`Recording not finalised: ${recordingId}`);

        const root = rootRows[0];

        const manifest = {
            recordingId,
            meetingId: root.meeting_id,
            userId: requestingUserId,
            utcTimestamp: new Date().toISOString(),
            merkleRoot: root.merkle_root,
            chunkCount: root.chunk_count,
            c2paVersion: '1.0',
        };

        // Sign manifest with platform key (ECDSA P-256)
        const signingKeyJwk = process.env.PLATFORM_SIGNING_KEY_JWK;
        let signature = null;

        if (signingKeyJwk) {
            try {
                const keyData = JSON.parse(signingKeyJwk);
                const privateKey = crypto.createPrivateKey({ key: keyData, format: 'jwk' });
                const sign = crypto.createSign('SHA256');
                sign.update(JSON.stringify(manifest));
                signature = sign.sign(privateKey, 'base64');
            } catch (err) {
                console.error('[RecordingService] C2PA signing failed:', err.message);
                throw new Error('C2PA signing key unavailable');
            }
        }

        const exportPayload = {
            manifest,
            signature,
            signatureAlgorithm: 'ECDSA-P256-SHA256',
        };

        return Buffer.from(JSON.stringify(exportPayload));
    }
}

module.exports = new RecordingService();
