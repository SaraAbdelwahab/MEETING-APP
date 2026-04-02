const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const authMiddleware = require('../middleware/auth');

// All meeting routes require authentication
router.use(authMiddleware.verifyToken);

router.get('/:id/chat', meetingController.getChatHistory);

// Dashboard and search routes (place before /:id routes to avoid conflicts)
router.get('/dashboard/stats', meetingController.getDashboardStats);
router.get('/search', meetingController.searchMeetings);
router.get('/date/:date', meetingController.getMeetingsByDate);

// Meeting routes
router.post('/', meetingController.createMeeting);
router.get('/', meetingController.getUserMeetings);
router.get('/:id', meetingController.getMeeting);
router.put('/:id', meetingController.updateMeeting);           // Update meeting
router.delete('/:id', meetingController.deleteMeeting);        // Delete meeting
router.put('/:id/status', meetingController.updateParticipantStatus);
router.delete('/:id/participants/:userId', meetingController.removeParticipant); // Remove participant

module.exports = router;