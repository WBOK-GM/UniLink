const webpush = require('web-push');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BH6LM-jt3b3N1pw8LVSmnm3zS6U67XW8JzANZ02NW6dQy_TryhzbKMdSSmABl90Bh5XRCcMxUv_pAi1GzYDO-YE';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'LxEMebYLb1KMgc3p5ToxcWNij6sc1nZHA3SsXYezrCU';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:soporte@unilink.edu.co';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('[UniLink Push] Web Push configurado con claves VAPID.');
} catch (error) {
  console.warn('[UniLink Push] Error al inicializar VAPID (se usará modo simulado):', error.message);
}

module.exports = { webpush, vapidPublicKey };
