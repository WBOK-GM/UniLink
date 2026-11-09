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

const triggerTestPush = async (req, res) => {
  try {
    const userId = req.user.id;
    const userSubs = memoryStore.push_subscriptions.filter(s => s.user_id === userId);

    const payload = JSON.stringify({
      title: '🔔 Notificación de Prueba UniLink',
      body: 'Tu dispositivo está correctamente enlazado para recibir alertas académicas.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: '/' }
    });

    let sentCount = 0;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        sentCount++;
      } catch (err) {
        console.warn('[Push Test] Error enviando a un endpoint:', err.message);
      }
    }

    return res.json({
      success: true,
      message: sentCount > 0
        ? `Notificación enviada a ${sentCount} dispositivo(s).`
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
  triggerTestPush
};
