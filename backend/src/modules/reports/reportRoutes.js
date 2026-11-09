const express = require('express');
const router = express.Router();
const { createReport, getReports } = require('./reportController');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

router.post('/', requireAuth, createReport);
router.get('/', requireAuth, requireAdmin, getReports);

module.exports = router;
