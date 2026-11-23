const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('./authController');
const { requireAuth } = require('../../middlewares/auth');
const { authRateLimiter } = require('../../middlewares/security');

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, getMe);

module.exports = router;
