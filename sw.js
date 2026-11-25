/* ==========================================================================
   Saktah Tarbiyah — Service Worker (Offline Support & App Shell Cache)
   ========================================================================== */

const CACHE_NAME = "saktah-tarbiyah-v2";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./manifest.json",
  "./logo-saktah.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigasi halaman: Network-first dengan fallback cache offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          }
          return networkRes;
        })
        .catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./")))
    );
    return;
  }

  // Aset same-origin: Cache-first dengan pembaruan jaringan
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // Font eksternal (Google Fonts): Stale-while-revalidate jika tersedia online
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
