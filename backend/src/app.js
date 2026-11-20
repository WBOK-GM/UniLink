const express = require('express');
const cors = require('cors');
const path = require('path');
const { uploadsDir } = require('./config/storage');
const {
  securityHeaders,
  apiRateLimiter,
  authRateLimiter,
  sanitizeInput
} = require('./middlewares/security');

const authRoutes = require('./modules/auth/authRoutes');
const userRoutes = require('./modules/users/userRoutes');
const categoryRoutes = require('./modules/categories/categoryRoutes');
const postRoutes = require('./modules/posts/postRoutes');
const groupRoutes = require('./modules/groups/groupRoutes');
const meetingRoutes = require('./modules/meetings/meetingRoutes');
const notificationRoutes = require('./modules/notifications/notificationRoutes');
const reportRoutes = require('./modules/reports/reportRoutes');
const securityRoutes = require('./modules/security/securityRoutes');

const app = express();

// 1. Cabeceras de Seguridad y Content Security Policy (Sesión 22)
app.use(securityHeaders);

// 2. Limitador de tasa global para la API
app.use(apiRateLimiter);

// 3. Middlewares de análisis de cuerpo y desinfección
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Sanitización y desinfección de entradas contra inyecciones XSS
app.use(sanitizeInput);

// Servidor de archivos estáticos para subidas locales con soporte de visualización en marco (PWA In-App Viewer)
app.use('/uploads', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'self' http://localhost:* http://127.0.0.1:*");
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(uploadsDir));

// Rutas de API v1
app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/security', securityRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'UniLink API REST',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[UniLink Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor en UniLink.'
  });
});

module.exports = app;
