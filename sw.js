// Service worker: network-first with revalidation, so a new deploy shows up on
// the next launch (GitHub Pages lets browsers cache files for 10 minutes, and
// home-screen apps hold on even longer). Falls back to the cache offline.
const CACHE = 'aiflappy';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req, { cache: 'no-cache' }); // revalidate (cheap 304s)
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req);
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});
