const CACHE = "picado-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.add(OFFLINE_URL);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api")) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});
