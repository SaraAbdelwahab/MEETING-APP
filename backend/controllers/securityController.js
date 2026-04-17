const keyExchangeService = require('../services/keyExchangeService');
const identityService = require('../services/identityService');
const recordingService = require('../services/recordingService');
const auditStore = require('../services/auditStore');

const securityController = {
    // POST /api/sessions/init
    async initSession(req, res) {
        try {
            const { clientX25519Pub, clientKEMEncapKey, meetingId } = req.body;
            const userId = req.user.userId;

            if (!clientX25519Pub) {
                return res.status(400).json({ message: 'clientX25519Pub is required' });
            }

            let result;
            try {
                result = await keyExchangeService.initiateHandshake(
                    clientX25519Pub,
                    clientKEMEncapKey || null,
                    meetingId,
                    userId
                );
            } catch (kemErr) {
                // Both KEM and ECDH failed
                return res.status(503).json({ message: 'Session establishment failed', error: kemErr.message });
            }

            res.status(200).json(result);
        } catch (err) {
            console.error('[SecurityController] initSession error:', err);
            res.status(500).json({ message: 'Error initialising session' });
        }
    },

    // POST /api/sessions/:sessionId/rotate
    async rotateKey(req, res) {
        try {
            const { sessionId } = req.params;
            const result = await keyExchangeService.rotateKey(sessionId);
            res.status(200).json(result);
        } catch (err) {
            console.error('[SecurityController] rotateKey error:', err);
            res.status(500).json({ message: 'Error rotating session key' });
        }
    },

    // POST /api/identity/enroll
    async enrollDevice(req, res) {
        try {
            const { deviceId, publicKeyJwk } = req.body;
            const userId = req.user.userId;

            if (!deviceId || !publicKeyJwk) {
                return res.status(400).json({ message: 'deviceId and publicKeyJwk are required' });
            }

            const result = await identityService.registerDeviceKey(userId, deviceId, publicKeyJwk);
            res.status(200).json(result);
        } catch (err) {
            console.error('[SecurityController] enrollDevice error:', err);
            res.status(500).json({ message: 'Error enrolling device' });
        }
    },

    // POST /api/identity/challenge/:challengeId/resolve
    async resolveChallenge(req, res) {
        try {
            const { challengeId } = req.params;
            const { verificationToken } = req.body;
            const userId = req.user.userId;

            if (!verificationToken) {
                return res.status(400).json({ message: 'verificationToken is required' });
            }

            const result = await identityService.resolveStepUpChallenge(challengeId, userId, verificationToken);
            res.status(200).json(result);
        } catch (err) {
            console.error('[SecurityController] resolveChallenge error:', err);
            res.status(500).json({ message: 'Error resolving challenge' });
        }
    },

    // GET /api/recordings/:recordingId/chunks
    async getRecordingChunks(req, res) {
        try {
            const { recordingId } = req.params;
            const chunks = await recordingService.getChunkHashes(recordingId);
            res.status(200).json({ chunks });
        } catch (err) {
            console.error('[SecurityController] getRecordingChunks error:', err);
            res.status(500).json({ message: 'Error retrieving chunk hashes' });
        }
    },

    // GET /api/recordings
    async getUserRecordings(req, res) {
        try {
            const userId = req.user.userId;
            const recordings = await recordingService.getUserRecordings(userId);
            res.status(200).json({ recordings });
        } catch (err) {
            console.error('[SecurityController] getUserRecordings error:', err);
            res.status(500).json({ message: 'Error retrieving recordings' });
        }
    },

    // GET /api/recordings/:recordingId/export
    async exportRecording(req, res) {
        try {
            const { recordingId } = req.params;
            const userId = req.user.userId;

            const buffer = await recordingService.exportWithC2PA(recordingId, userId);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="recording-${recordingId}.c2pa.json"`);
            res.status(200).send(buffer);
        } catch (err) {
            console.error('[SecurityController] exportRecording error:', err);
            if (err.message.includes('not finalised')) {
                return res.status(404).json({ message: err.message });
            }
            if (err.message.includes('signing key')) {
                return res.status(503).json({ message: err.message });
            }
            res.status(500).json({ message: 'Error exporting recording' });
        }
    },

    // GET /api/audit (admin only)
    async queryAuditLog(req, res) {
        try {
            const { userId, meetingId, eventType, fromDate, toDate, limit, offset } = req.query;
            const entries = await auditStore.query({ userId, meetingId, eventType, fromDate, toDate, limit, offset });
            res.status(200).json({ entries });
        } catch (err) {
            console.error('[SecurityController] queryAuditLog error:', err);
            res.status(500).json({ message: 'Error querying audit log' });
        }
    },
};

module.exports = securityController;
