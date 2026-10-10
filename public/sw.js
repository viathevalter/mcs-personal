// Service Worker do Portal MCS - PWA e Push Notifications
const CACHE_NAME = 'portal-mcs-v1';

self.addEventListener('install', (event) => {
  // Ativação imediata sem esperar o término de instâncias antigas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      // Limpeza de caches antigos caso existam
      return caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      });
    })
  );
});

// Receptor de Push Notifications (compatível com Android e iOS 16.4+ standalone)
self.addEventListener('push', (event) => {
  let title = 'Portal MCS';
  let body = 'Tem um novo aviso sobre as suas horas de trabalho.';
  let icon = '/logo_mcs_transparent.png';
  let data = { url: '/portal' };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.title) title = payload.title;
      if (payload.body) body = payload.body;
      if (payload.icon) icon = payload.icon;
      if (payload.url) data.url = payload.url;
      if (payload.data) data = { ...data, ...payload.data };
    } catch (_) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body,
    icon,
    badge: '/logo_mcs_transparent.png',
    data,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'mcs-timesheet-alert'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ação ao tocar na notificação: abre ou foca a janela do Portal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/portal';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes('/portal')) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
