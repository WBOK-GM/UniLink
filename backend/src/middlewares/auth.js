const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'unilink_super_secret_jwt_key_2026_academics';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado: Token no proporcionado o inválido.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Sesión expirada o token no válido. Por favor inicia sesión nuevamente.'
    });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Ignorar para auth opcional
    }
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Acceso restringido: Se requieren permisos de administrador.'
    });
  }
  next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  JWT_SECRET
};
