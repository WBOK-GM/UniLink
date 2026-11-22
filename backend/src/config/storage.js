const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let r2Client = null;

const isR2Configured = () => {
  return !!(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
};

const getR2Client = () => {
  if (!r2Client && isR2Configured()) {
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
        }
      });
    } catch (e) {
      console.warn('[UniLink Storage] No se pudo inicializar cliente S3/R2:', e.message);
    }
  }
  return r2Client;
};

const uploadFileToR2 = async (filePath, storageKey, mimeType) => {
  if (!isR2Configured()) {
    return { success: true, mode: 'local', storageKey };
  }

  try {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = getR2Client();
    if (!client) {
      return { success: false, mode: 'local_fallback', storageKey };
    }

    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: storageKey,
      Body: fileStream,
      ContentType: mimeType || 'application/octet-stream',
      ContentLength: fileStats.size
    });

    await client.send(command);
    console.log(`[UniLink R2] Archivo persistido exitosamente en Cloudflare R2: ${storageKey}`);
    return { success: true, mode: 'r2', storageKey };
  } catch (err) {
    console.error(`[UniLink R2 Error] Falló subida a R2 de "${storageKey}":`, err.message);
    return { success: false, mode: 'local_fallback', error: err.message, storageKey };
  }
};

const getFileUrl = (storageKey) => {
  if (isR2Configured() && process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN) {
    const domain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN.replace(/\/$/, '');
    return `${domain}/${storageKey}`;
  }
  // Fallback a almacenamiento local seguro
  const host = process.env.BACKEND_HOST || 'http://localhost:5000';
  return `${host}/uploads/${storageKey}`;
};

module.exports = {
  uploadsDir,
  isR2Configured,
  uploadFileToR2,
  getFileUrl
};
