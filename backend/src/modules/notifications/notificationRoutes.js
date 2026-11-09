const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  subscribePush,
  getVapidPublicKey,
  triggerTestPush
} = require('./notificationController');
const { requireAuth } = require('../../middlewares/auth');

router.get('/', requireAuth, getNotifications);
router.put('/:id/read', requireAuth, markAsRead);
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', requireAuth, subscribePush);
router.post('/test-push', requireAuth, triggerTestPush);

module.exports = router;
