const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');
const { webpush, vapidPublicKey } = require('../../config/vapid');

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

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, error: 'Objeto de suscripción Push inválido.' });
    }

    const existingIndex = memoryStore.push_subscriptions.findIndex(
      s => s.endpoint === subscription.endpoint
    );

    const subRecord = {
      id: uuidv4(),
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      created_at: new Date()
    };

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
  return res.json({
    success: true,
    publicKey: vapidPublicKey
  });
};

/**
 * Envía una notificación Web Push a todos los endpoints registrados de un usuario
 */
const sendPushToUser = async (userId, payload) => {
  try {
    const userSubs = memoryStore.push_subscriptions.filter(s => s.user_id === userId);
    if (!userSubs || userSubs.length === 0) {
      return { sent: 0 };
    }

    const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let sentCount = 0;

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, stringifiedPayload);
        sentCount++;
      } catch (err) {
        console.warn(`[UniLink Push] Error despachando a endpoint de usuario ${userId}:`, err.message);
        // Si el endpoint expiró (410 Gone / 404 Not Found), retirar la suscripción
        if (err.statusCode === 410 || err.statusCode === 404) {
          const idx = memoryStore.push_subscriptions.findIndex(s => s.endpoint === sub.endpoint);
          if (idx >= 0) memoryStore.push_subscriptions.splice(idx, 1);
        }
      }
    }
    return { sent: sentCount };
  } catch (error) {
    console.warn('[UniLink Push] Error general en sendPushToUser:', error.message);
    return { sent: 0, error: error.message };
  }
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
    const userId = req.user.id;
    const result = await sendPushToUser(userId, {
      title: '🔔 Notificación de Prueba UniLink',
      body: 'Tu dispositivo está correctamente enlazado para recibir alertas académicas.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: '/' }
    });

    return res.json({
      success: true,
      message: result.sent > 0
        ? `Notificación enviada a ${result.sent} dispositivo(s).`
        : 'Suscripción registrada, pero no se pudo contactar el push service (o modo offline local).'
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
