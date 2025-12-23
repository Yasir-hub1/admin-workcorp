/* eslint-disable no-restricted-globals */
// Service Worker mínimo y estable para Push Notifications (mismo origen / scope "/")
// Nota: esto NO es el SW de VitePWA; es un SW “simple” para asegurar que Push funcione en dev/prod.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch (e) {
    // Fallback a texto si no es JSON
    payload = { body: event.data ? event.data.text() : null };
  }

  const title = payload?.title || 'Notificación';
  const body = payload?.body || 'Tienes una nueva notificación';
  const icon = payload?.icon || '/pwa-192x192.png';
  const badge = payload?.badge || '/pwa-192x192.png';
  const tag = payload?.tag || 'default';
  const requireInteraction = !!payload?.requireInteraction;
  const data = {
    url: payload?.data?.url || payload?.url || '/',
    ...(payload?.data || {}),
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      data,
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Cerrar' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client?.url === urlToOpen && 'focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  // opcional: métrica / debug
});


