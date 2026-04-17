const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const authMiddleware = require('../middleware/auth');

// All meeting routes require authentication
router.use(authMiddleware.verifyToken);

// Dashboard and search routes (MUST be before /:id routes to avoid conflicts)
router.get('/stats', meetingController.getDashboardStats);
router.get('/search', meetingController.searchMeetings);
router.get('/date/:date', meetingController.getMeetingsByDate);

// Meeting CRUD routes
router.post('/', meetingController.createMeeting);
router.get('/', meetingController.getUserMeetings);
router.get('/:id', meetingController.getMeeting);
router.get('/:id/chat', meetingController.getChatHistory);
router.put('/:id', meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting);
router.put('/:id/status', meetingController.updateParticipantStatus);
router.post('/:id/join', meetingController.joinMeeting);
router.delete('/:id/participants/:userId', meetingController.removeParticipant);

module.exports = router;