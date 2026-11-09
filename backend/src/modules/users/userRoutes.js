const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('./userController');
const { requireAuth, optionalAuth } = require('../../middlewares/auth');

router.get('/:id', optionalAuth, getProfile);
router.put('/me', requireAuth, updateProfile);

module.exports = router;
