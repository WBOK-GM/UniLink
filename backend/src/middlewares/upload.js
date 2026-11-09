const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadsDir } = require('../config/storage');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueKey = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, uniqueKey);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Imágenes
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Documentos
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Audios
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'
  ];

  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  },
  fileFilter
});

module.exports = upload;
