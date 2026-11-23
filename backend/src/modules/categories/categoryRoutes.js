const express = require('express');
const router = express.Router();
const {
  getCategories,
  suggestCategory,
  getCategorySuggestions,
  approveCategorySuggestion,
  rejectCategorySuggestion,
  createCategory
} = require('./categoryController');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

// Catálogo público
router.get('/', getCategories);

// Sugerencias enviadas por estudiantes
router.post('/suggest', requireAuth, suggestCategory);

// Moderación y Gestión de Categorías (Exclusivo Administrador)
router.get('/suggestions', requireAuth, requireAdmin, getCategorySuggestions);
router.post('/suggestions/:id/approve', requireAuth, requireAdmin, approveCategorySuggestion);
router.post('/suggestions/:id/reject', requireAuth, requireAdmin, rejectCategorySuggestion);
router.post('/', requireAuth, requireAdmin, createCategory);

module.exports = router;
