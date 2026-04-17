const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const securityController = require('../controllers/securityController');

// All routes require authentication
router.use(authMiddleware.verifyToken);

// Session key exchange
router.post('/sessions/init', securityController.initSession);
router.post('/sessions/:sessionId/rotate', securityController.rotateKey);

// Identity / biometric enrollment
router.post('/identity/enroll', securityController.enrollDevice);
router.post('/identity/challenge/:challengeId/resolve', securityController.resolveChallenge);

// Recording integrity
router.get('/recordings', securityController.getUserRecordings);
router.get('/recordings/:recordingId/chunks', securityController.getRecordingChunks);
router.get('/recordings/:recordingId/export', securityController.exportRecording);

// Audit log (admin only)
router.get('/audit', adminAuth, securityController.queryAuditLog);

module.exports = router;
