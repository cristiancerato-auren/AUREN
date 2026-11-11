const CACHE_NAME = "auren-shell-v1";
const OFFLINE_URL = "/offline.html";
const APP_ASSETS = [
  OFFLINE_URL,
  "/index.html",
  "/living.html",
  "/studio.html",
  "/journal.html",
  "/account.html",
  "/manifest.webmanifest",
  "/assets/icons/auren-app.svg",
  "/assets/icons/auren-app-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("auren-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Only navigations get an offline fallback. Auth, Supabase, checkout and user data
// are deliberately never cached by this service worker.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match(request);
        const cached = cachedPage || await caches.match(OFFLINE_URL);
        return cached || new Response("AUREN è offline. Riprova quando torni online.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      })
    );
    return;
  }

  const url = new URL(request.url);
  if (APP_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
