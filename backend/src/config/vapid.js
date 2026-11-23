const { createECDH } = require('node:crypto');
const webpush = require('web-push');

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || 'mailto:soporte@unilink.edu.co';

try {
  if (!vapidPublicKey && !vapidPrivateKey && process.env.NODE_ENV !== 'production') {
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const keyPair = createECDH('prime256v1');
  keyPair.setPrivateKey(Buffer.from(vapidPrivateKey, 'base64url'));
  if (!keyPair.getPublicKey().equals(Buffer.from(vapidPublicKey, 'base64url'))) {
    throw new Error('VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY deben pertenecer al mismo par.');
  }

  console.log('[UniLink Push] Web Push configurado con claves VAPID.');
} catch (error) {
  vapidPublicKey = null;
  console.warn('[UniLink Push] Web Push deshabilitado:', error.message);
}

module.exports = { webpush, vapidPublicKey };
