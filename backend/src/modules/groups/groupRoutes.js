const express = require('express');
const router = express.Router();
const { getGroups, getGroupById, createGroup, joinGroup } = require('./groupController');
const { requireAuth, optionalAuth } = require('../../middlewares/auth');

router.get('/', optionalAuth, getGroups);
router.get('/:id', optionalAuth, getGroupById);
router.post('/', requireAuth, createGroup);
router.post('/:id/join', requireAuth, joinGroup);

module.exports = router;
