// One-release PWA repair worker: removes old app-shell caches and unregisters itself.
// Push notifications use /push-sw.js and are not affected.

function isAppShellCache(name) {
  return (
    name === "html-nav" ||
    name === "static-assets" ||
    name === "images" ||
    name.startsWith("workbox-precache-") ||
    /(^|-)precache-v\d+-/.test(name) ||
    /(^|-)runtime-/.test(name)
  );
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.filter(isAppShellCache).map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);