const express = require('express');
const router = express.Router();
const securityController = require('./securityController');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

// Endpoint receptor de reportes de violación de Content Security Policy (CSP)
router.post('/csp-report', express.json({ type: ['application/json', 'application/csp-report'] }), securityController.handleCspReport);

// Estado y auditoría de seguridad
router.get('/audit', securityController.getSecurityAuditStatus);

// Métricas de almacenamiento del servidor (LRU 10 Días)
router.get('/storage', securityController.getStorageAuditStatus);

// Tarea de mantenimiento de retención de archivos (Exclusivo Administrador)
router.post('/clean-storage', requireAuth, requireAdmin, securityController.triggerStorageCleanup);

module.exports = router;
