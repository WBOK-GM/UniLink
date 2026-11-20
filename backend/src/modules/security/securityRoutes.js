const express = require('express');
const router = express.Router();
const securityController = require('./securityController');

// Endpoint receptor de reportes de violación de Content Security Policy (CSP)
router.post('/csp-report', express.json({ type: ['application/json', 'application/csp-report'] }), securityController.handleCspReport);

// Estado y auditoría de seguridad
router.get('/audit', securityController.getSecurityAuditStatus);

module.exports = router;
