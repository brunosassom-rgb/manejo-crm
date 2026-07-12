// Manejo CRM — service worker for the static app shell only.
//
// Bump CACHE_VERSION on every deploy that touches index.html/app.js/style.css
// (or any file in SHELL_FILES). Without this, phones with the app installed
// keep serving a stale app.js indefinitely, with no visible reload affordance.
const CACHE_VERSION = "v16";
const CACHE_NAME = `manejo-shell-${CACHE_VERSION}`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./assets/favicon.ico",
  "./assets/favicon-16.png",
  "./assets/favicon-32.png",
  "./assets/favicon-180.png",
  "./assets/brand-mark.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only ever handle same-origin GET requests for the static shell.
  // Everything else (Supabase API/storage/auth calls, Google Fonts, any
  // cross-origin request) passes straight through, untouched — the sync
  // layer is the single source of truth for data freshness, never this SW.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Stale-while-revalidate: answer instantly from cache when available,
  // refresh the cache in the background so the next load picks up changes.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
