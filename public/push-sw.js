// Push-only service worker for OXIDAȚII.
// No caching, no fetch interception — safe to coexist with Lovable preview iframe.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "OXIDAȚII", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "OXIDAȚII";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/app", ...(payload.data || {}) },
    vibrate: [60, 30, 60],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            client.focus();
            return client.navigate(targetUrl);
          }
        } catch (e) {}
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
