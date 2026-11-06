// Minimal, focused service worker: exists solely to receive Web Push
// events and display real notifications, and to route a click on one
// back into the app. This app has no other service-worker-based features
// (no offline caching, no background sync) — kept intentionally small
// rather than bundling in unrelated behavior.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Dates', body: event.data.text() };
  }

  const title = payload.title || 'Dates';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || undefined,
    // A call has to stay on screen until it is answered or dismissed; a normal
    // notification is free to auto-dismiss after a few seconds.
    requireInteraction: !!payload.requireInteraction,
    vibrate: payload.silent ? undefined : payload.vibrate || undefined,
    // A ringing call is re-sent every few seconds with the same tag: renotify
    // makes each one sound and vibrate again, so the phone keeps ringing
    // instead of beeping once. "Missed call" replaces it silently.
    renotify: payload.tag && !payload.silent ? true : undefined,
    silent: !!payload.silent,
  };
  if (payload.requireInteraction) {
    options.actions = [{ action: 'answer', title: 'Answer' }];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
