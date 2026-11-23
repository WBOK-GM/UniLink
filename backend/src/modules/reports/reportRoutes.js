const express = require('express');
const router = express.Router();
const { createReport, getReports, resolveReport } = require('./reportController');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

router.post('/', requireAuth, createReport);
router.get('/', requireAuth, requireAdmin, getReports);
router.post('/:id/resolve', requireAuth, requireAdmin, resolveReport);

module.exports = router;
