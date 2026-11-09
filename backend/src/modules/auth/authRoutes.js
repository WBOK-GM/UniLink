const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('./authController');
const { requireAuth } = require('../../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);

module.exports = router;
