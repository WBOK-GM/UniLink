const express = require('express');
const router = express.Router();
const { getPosts, createPost, reactToPost, ratePost, deactivatePost, reactivatePost } = require('./postController');
const { requireAuth, optionalAuth } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');

router.get('/', optionalAuth, getPosts);
router.post('/', requireAuth, upload.array('attachments', 5), createPost);
router.post('/:id/react', requireAuth, reactToPost);
router.post('/:id/rate', requireAuth, ratePost);
router.patch('/:id/reactivate', requireAuth, reactivatePost);
router.delete('/:id', requireAuth, deactivatePost);

module.exports = router;
