const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const isR2Configured = () => {
  return !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
};

const getFileUrl = (storageKey) => {
  if (isR2Configured() && process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN) {
    return `${process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN}/${storageKey}`;
  }
  // Fallback a almacenamiento local seguro
  const host = process.env.BACKEND_HOST || 'http://localhost:5000';
  return `${host}/uploads/${storageKey}`;
};

module.exports = {
  uploadsDir,
  isR2Configured,
  getFileUrl
};
