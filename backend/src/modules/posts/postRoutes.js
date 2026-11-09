const express = require('express');
const router = express.Router();
const { getPosts, createPost, reactToPost, deactivatePost } = require('./postController');
const { requireAuth, optionalAuth } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');

router.get('/', optionalAuth, getPosts);
router.post('/', requireAuth, upload.array('attachments', 5), createPost);
router.post('/:id/react', requireAuth, reactToPost);
router.delete('/:id', requireAuth, deactivatePost);

module.exports = router;
