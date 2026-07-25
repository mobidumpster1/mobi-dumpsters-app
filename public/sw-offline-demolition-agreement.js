// Service worker scoped, by its own logic below, to exactly one page:
// /offline-demolition-agreement.html (in any of its ?d=/?signed=1 variants).
// Every other request on the site — the rest of the app, API calls, other
// pages — passes straight through untouched; this never intercepts them.
//
// Strategy: cache-first, refresh-in-background. The base (no-query) page
// is cached immediately on install so it's available offline the moment
// this is added to the home screen — no need to have visited it "just
// right" beforehand. Any specific link variant (a customer link with
// ?d=..., or a ?signed=1 confirmation) gets cached the first time it's
// successfully loaded online, and is then servable offline on repeat
// visits to that exact link.
const CACHE_NAME = "demo-agreement-v1";
const PAGE_PATH = "/offline-demolition-agreement.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(PAGE_PATH))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestPath = new URL(event.request.url).pathname;
  if (requestPath !== PAGE_PATH) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
