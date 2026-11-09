const express = require('express');
const router = express.Router();
const { getMeetings, createMeeting, rsvpMeeting } = require('./meetingController');
const { requireAuth, optionalAuth } = require('../../middlewares/auth');

router.get('/', optionalAuth, getMeetings);
router.post('/', requireAuth, createMeeting);
router.post('/:id/rsvp', requireAuth, rsvpMeeting);

module.exports = router;
