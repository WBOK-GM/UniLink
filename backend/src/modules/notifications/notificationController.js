const { v4: uuidv4 } = require('uuid');
const { pool, memoryStore, persistPushSubscription, deletePushSubscription } = require('../../config/db');
const { webpush, vapidPublicKey } = require('../../config/vapid');

const vapidUnavailable = 'Las notificaciones push no están configuradas correctamente en el servidor.';

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = memoryStore.notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = memoryStore.notifications.find(n => n.id === id && n.user_id === userId);
    if (notification) {
      notification.is_read = true;
    }

    return res.json({ success: true, message: 'Notificación marcada como leída.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const subscribePush = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;
    if (!vapidPublicKey) {
      return res.status(503).json({ success: false, error: vapidUnavailable });
    }

    const { endpoint, keys } = subscription || {};
    const endpointUrl = typeof endpoint === 'string' ? URL.canParse(endpoint) && new URL(endpoint) : null;
    if (endpointUrl?.protocol !== 'https:' || endpointUrl.username || endpointUrl.password ||
        typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string' ||
        !/^[A-Za-z0-9_-]{87}$/.test(keys.p256dh) || !/^[A-Za-z0-9_-]{22}$/.test(keys.auth) ||
        Buffer.from(keys.p256dh, 'base64url')[0] !== 4) {
      return res.status(400).json({ success: false, error: 'Objeto de suscripción Push inválido.' });
    }

    const subRecord = {
      id: uuidv4(),
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      created_at: new Date()
    };

    if (pool && !(await persistPushSubscription(subRecord))) {
      return res.status(503).json({
        success: false,
        error: 'No se pudo guardar la suscripción. Vuelve a intentar habilitar las notificaciones.'
      });
    }

    const existingIndex = memoryStore.push_subscriptions.findIndex(s => s.endpoint === endpoint);
    if (existingIndex >= 0) {
      memoryStore.push_subscriptions[existingIndex] = subRecord;
    } else {
      memoryStore.push_subscriptions.push(subRecord);
    }

    return res.status(201).json({
      success: true,
      message: 'Suscripción Web Push registrada exitosamente en el servidor.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getVapidPublicKey = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!vapidPublicKey) {
    return res.status(503).json({ success: false, error: vapidUnavailable });
  }
  return res.json({
    success: true,
    publicKey: vapidPublicKey
  });
};

/**
 * Envía una notificación Web Push a todos los endpoints registrados de un usuario
 */
const sendPushToUser = async (userId, payload, endpoint) => {
  const subscriptions = memoryStore.push_subscriptions.filter(
    sub => sub.user_id === userId && (!endpoint || sub.endpoint === endpoint)
  );
  const result = { sent: 0, expired: 0, failed: 0, registered: subscriptions.length };
  if (!vapidPublicKey || subscriptions.length === 0) return result;

  const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, stringifiedPayload, { timeout: 8000 });
      result.sent++;
    } catch (err) {
      console.warn(`[UniLink Push] Error despachando al usuario ${userId}:`, err.statusCode || err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        result.expired++;
        const index = memoryStore.push_subscriptions.indexOf(sub);
        if (index >= 0) {
          memoryStore.push_subscriptions.splice(index, 1);
          await deletePushSubscription(sub.id);
        }
      } else {
        result.failed++;
      }
    }
  }
  return result;
};

/**
 * Función centralizada para notificar a un usuario:
 * 1. Registra la notificación en el historial interno (in-app)
 * 2. Despacha la notificación Web Push al dispositivo (Service Worker)
 */
const notifyUser = async (userId, { title, message, url, notification_type, reference_type, reference_id }) => {
  try {
    const notif = {
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      notification_type: notification_type || 'SYSTEM',
      reference_type: reference_type || null,
      reference_id: reference_id || null,
      is_read: false,
      created_at: new Date()
    };
    memoryStore.notifications.push(notif);

    const pushPayload = {
      title,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: url || '/' }
    };

    const pushResult = await sendPushToUser(userId, pushPayload);
    return { notification: notif, pushResult };
  } catch (error) {
    console.warn('[UniLink Notify] Error en notifyUser:', error.message);
    return null;
  }
};

const triggerTestPush = async (req, res) => {
  try {
    if (!vapidPublicKey) {
      return res.status(503).json({ success: false, error: vapidUnavailable });
    }

    const { endpoint } = req.body || {};
    if (endpoint !== undefined && (typeof endpoint !== 'string' || !endpoint)) {
      return res.status(400).json({ success: false, error: 'El dispositivo de prueba es inválido.' });
    }
    const userId = req.user.id;
    const result = await sendPushToUser(userId, {
      title: '🔔 Notificación de Prueba UniLink',
      body: 'Tu dispositivo está correctamente enlazado para recibir alertas académicas.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: '/' }
    }, endpoint);

    if (!result.registered) {
      return res.status(409).json({
        success: false,
        error: 'Habilita las notificaciones push en este dispositivo antes de probarlas.'
      });
    }
    if (!result.sent && !result.failed) {
      return res.status(410).json({
        success: false,
        error: 'La suscripción expiró. Vuelve a habilitar las notificaciones push.'
      });
    }
    if (!result.sent) {
      return res.status(502).json({
        success: false,
        error: 'El servicio de notificaciones rechazó el envío. Revisa los registros del backend e inténtalo de nuevo.'
      });
    }

    return res.json({
      success: true,
      message: `El servicio push aceptó la notificación de prueba para ${result.sent} dispositivo(s).`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  subscribePush,
  getVapidPublicKey,
  triggerTestPush,
  sendPushToUser,
  notifyUser
};
