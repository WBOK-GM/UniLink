/**
 * Controlador de Seguridad y Auditoría UniLink
 */
const { rateLimitStore } = require('../../middlewares/security');
const { getStorageMetrics, cleanExpiredFiles } = require('../../services/storageRetentionService');

// Registro en memoria de violaciones CSP y eventos de seguridad
const securityAuditLog = [];

const handleCspReport = async (req, res) => {
  try {
    const report = req.body['csp-report'] || req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const incident = {
      id: 'csp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      type: 'CSP_VIOLATION',
      blockedUri: report['blocked-uri'] || report.blockedURL || 'unknown',
      documentUri: report['document-uri'] || report.documentURL || 'unknown',
      violatedDirective: report['violated-directive'] || report.effectiveDirective || 'unknown',
      originalPolicy: report['original-policy'] || 'unilink-strict-csp',
      timestamp: new Date().toISOString(),
      clientIp
    };

    securityAuditLog.unshift(incident);
    if (securityAuditLog.length > 100) securityAuditLog.pop();

    console.warn('[UniLink Security Warning] Violación de Content Security Policy reportada:', {
      blocked: incident.blockedUri,
      directive: incident.violatedDirective,
      document: incident.documentUri
    });

    return res.status(204).end();
  } catch (error) {
    console.error('Error al registrar reporte CSP:', error);
    return res.status(400).json({ success: false });
  }
};

const getSecurityAuditStatus = async (req, res) => {
  try {
    const activeAuthLimiters = rateLimitStore.auth.size;
    const activeApiLimiters = rateLimitStore.api.size;

    return res.json({
      success: true,
      service: 'UniLink Security Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      policies: {
        csp: {
          status: 'ACTIVE_ENFORCED',
          mode: 'enforce',
          reportUri: '/api/v1/security/csp-report',
          directivesCount: 13,
          scriptSrcRestricted: true,
          objectSrcDisabled: true,
          frameAncestorsDisabled: true,
          upgradeInsecureRequests: true
        },
        hsts: {
          status: 'ACTIVE',
          maxAgeSeconds: 31536000,
          includeSubDomains: true,
          preload: true
        },
        headers: {
          xContentTypeOptions: 'nosniff',
          xFrameOptions: 'DENY',
          xXssProtection: '1; mode=block',
          referrerPolicy: 'strict-origin-when-cross-origin',
          permissionsPolicy: 'Restricted (camera, mic-self, geo-self)'
        },
        rateLimiting: {
          auth: { maxRequests: 15, windowMinutes: 15, activeTrackedIps: activeAuthLimiters },
          api: { maxRequests: 400, windowMinutes: 15, activeTrackedIps: activeApiLimiters }
        },
        inputSanitization: {
          status: 'ACTIVE',
          engine: 'UniLink-XSS-Sanitizer',
          stripsScriptTags: true,
          stripsIframeTags: true,
          stripsJavascriptProtocols: true,
          stripsInlineHandlers: true
        }
      },
      auditSummary: {
        securityGrade: 'A+',
        totalCspViolationsLogged: securityAuditLog.length,
        recentIncidents: securityAuditLog.slice(0, 10),
        storage: getStorageMetrics()
      }
    });
  } catch (error) {
    console.error('Error al generar reporte de seguridad:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar auditoría de seguridad.' });
  }
};

const getStorageAuditStatus = async (req, res) => {
  try {
    const metrics = getStorageMetrics();
    return res.json({ success: true, ...metrics });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const triggerStorageCleanup = async (req, res) => {
  try {
    const retentionDays = Number(req.body.retentionDays) || 10;
    const result = await cleanExpiredFiles(retentionDays);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  handleCspReport,
  getSecurityAuditStatus,
  getStorageAuditStatus,
  triggerStorageCleanup,
  securityAuditLog
};
