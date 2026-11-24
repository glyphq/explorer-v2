// Bump this version when changing offline.html so installed apps refresh it.
const CACHE_NAME = "bts-pwa-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith("bts-pwa-offline-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

// Never cache authenticated HTML or API responses. Server-rendered pages need
// a connection; a precached page keeps offline navigation understandable.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    fetch(event.request, { cache: "no-store" }).catch(
      async () => (await caches.match(OFFLINE_URL)) ?? Response.error(),
    ),
  );
});

// BPP-9000 call notifications. The app server sends a JSON payload; Safari
// requires every push to display a notification immediately.
self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "BPP-9000 call";
  const timestamp = Number(payload.timestamp);
  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/favicon/favicon-32x32.png",
      body: payload.body || "Computors have agreed on this hour's call.",
      data: { url: payload.url || "/bpp9000" },
      icon: "/favicon/web-app-manifest-192x192.png",
      renotify: true,
      tag: payload.tag || "bpp-call",
      ...(Number.isFinite(timestamp) ? { timestamp } : {}),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/bpp9000", self.location.origin);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
      const existing = clients.find((client) => new URL(client.url).origin === target.origin);
      if (existing) {
        await existing.focus();
        if (existing.navigate) {
          await existing.navigate(target.href);
        }
        return;
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
