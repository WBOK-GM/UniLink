const CACHE_NAME = 'unilink-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-48x48.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Instalación y cache del App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[UniLink SW] Precaching app shell assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activación y limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Estrategia de Fetch: Network-first con fallback a cache para navegación y recursos estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Evitar interceptar llamadas a la API o extensiones
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  // REGLA ZERO-FOOTPRINT ADMIN:
  // Nunca guardar en caché de disco chunks o recursos administrativos
  if (url.pathname.includes('admin') || url.pathname.includes('Admin') || url.pathname.includes('security')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback a caché cuando no hay red
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Sin conexión a internet.', { status: 503, statusText: 'Offline' });
      })
  );
});

// 4. Recepción de Notificaciones Push (Web Push API)
self.addEventListener('push', (event) => {
  let data = {
    title: '🎓 UniLink Notificación',
    body: 'Tienes una nueva actualización en tu comunidad académica.',
    icon: '/icons/icon-192x192.png',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100], // Patrón de vibración si está soportado
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const resolvedUrl = new URL(targetUrl, self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === resolvedUrl.href && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(resolvedUrl.href);
      }
    })
  );
});

// 6. Background Sync (Sincronización en segundo plano)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    console.log('[UniLink SW] Sincronización en segundo plano disparada.');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});
