const express = require('express');
const router = express.Router();
const { getCategories, suggestCategory } = require('./categoryController');
const { requireAuth } = require('../../middlewares/auth');

router.get('/', getCategories);
router.post('/suggest', requireAuth, suggestCategory);

module.exports = router;
