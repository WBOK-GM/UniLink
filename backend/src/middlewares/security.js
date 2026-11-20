/**
 * Middlewares de Seguridad UniLink PWA (Sesión 22: Seguridad en PWA)
 * - Content Security Policy (CSP) & Security HTTP Headers
 * - Rate Limiting (Protección contra fuerza bruta y DoS)
 * - Sanitización y Desinfección de Entradas (Prevención de XSS e inyecciones)
 */

const escapeHtml = require('escape-html');

// Almacén en memoria para Rate Limiting
const rateLimitStore = {
  auth: new Map(), // IP -> { count, resetTime }
  api: new Map()    // IP -> { count, resetTime }
};

// Limpieza periódica de registros caducados cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.auth.entries()) {
    if (now > record.resetTime) rateLimitStore.auth.delete(ip);
  }
  for (const [ip, record] of rateLimitStore.api.entries()) {
    if (now > record.resetTime) rateLimitStore.api.delete(ip);
  }
}, 10 * 60 * 1000);

/**
 * Generador de limitador de tasa deslizante en memoria
 * @param {string} type 'auth' | 'api'
 * @param {number} maxRequests Límite máximo de peticiones
 * @param {number} windowMs Ventana de tiempo en milisegundos
 */
function createRateLimiter(type, maxRequests, windowMs) {
  return (req, res, next) => {
    // Excluir health check
    if (req.path === '/health') return next();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const store = rateLimitStore[type];
    const now = Date.now();

    const record = store.get(ip);

    if (!record || now > record.resetTime) {
      store.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    record.count++;
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: `Demasiadas solicitudes. Límite excedido para ${type === 'auth' ? 'autenticación' : 'la API'}. Reintenta en ${retryAfter} segundos.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter
      });
    }

    next();
  };
}

// 1. Limitador para Auth (15 intentos por 15 minutos por IP)
const authRateLimiter = createRateLimiter('auth', 15, 15 * 60 * 1000);

// 2. Limitador Global para API (400 peticiones por 15 minutos por IP)
const apiRateLimiter = createRateLimiter('api', 400, 15 * 60 * 1000);

/**
 * 3. Cabeceras HTTP de Seguridad y CSP Estricto (Sesión 22)
 */
function securityHeaders(req, res, next) {
  // Directivas de Política de Seguridad del Contenido (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com",
    "connect-src 'self' http://localhost:* ws://localhost:* https://*.tile.openstreetmap.org",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/v1/security/csp-report"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // Prevención de MIME-Sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevención de Clickjacking / Framing
  res.setHeader('X-Frame-Options', 'DENY');

  // Filtro XSS para navegadores heredados
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy para proteger URLs y datos sensibles
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS (HTTP Strict Transport Security - 1 año)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Permissions Policy restringiendo sensores no requeridos
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');

  // Deshabilitar cabecera identificatoria de Express
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * 4. Desinfección y Sanitización Recursiva de Entradas
 * Neutraliza etiquetas script, atributos on* y enlaces javascript:
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  let sanitized = str;

  // Remover scripts completos y etiquetas peligrosas
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  // Neutralizar atributos javascript: y manejadores inline onerror, onload, onclick, etc.
  sanitized = sanitized.replace(/javascript:[^"'\s]*/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^>\s]+/gi, '');

  return sanitized.trim();
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  // Evitar procesar buffers o archivos de multer
  if (Buffer.isBuffer(obj) || obj.buffer) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeObject(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = {
  securityHeaders,
  authRateLimiter,
  apiRateLimiter,
  sanitizeInput,
  sanitizeString,
  rateLimitStore
};
