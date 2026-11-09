const express = require('express');
const cors = require('cors');
const path = require('path');
const { uploadsDir } = require('./config/storage');

const authRoutes = require('./modules/auth/authRoutes');
const userRoutes = require('./modules/users/userRoutes');
const categoryRoutes = require('./modules/categories/categoryRoutes');
const postRoutes = require('./modules/posts/postRoutes');
const groupRoutes = require('./modules/groups/groupRoutes');
const meetingRoutes = require('./modules/meetings/meetingRoutes');
const notificationRoutes = require('./modules/notifications/notificationRoutes');
const reportRoutes = require('./modules/reports/reportRoutes');

const app = express();

// Middlewares globales
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servidor de archivos estáticos para subidas locales (Fallback)
app.use('/uploads', express.static(uploadsDir));

// Rutas de API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);

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
