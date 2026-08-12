// Peak Xender / OutreachFlow Pro - Service Worker
// Strategy: Cache-first for static assets, Network-first for navigation & API campaign data
const CACHE_VERSION = 'peakx-v4';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const NAV_CACHE = `${CACHE_VERSION}-nav`;
const API_CACHE = `${CACHE_VERSION}-api`;
const KNOWN_CACHES = [ASSET_CACHE, NAV_CACHE, API_CACHE];

// Core shell — cache these on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-light.jpg',
  '/favicon.ico'
];

// ── Install: pre-cache the app shell ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: wipe outdated caches and claim all tabs ───────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !KNOWN_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: route requests to the right strategy ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  const isApiRequest = url.pathname.startsWith('/api/');
  const isNavigation = request.mode === 'navigate';
  const isAsset = /\.(js|css|woff2?|png|jpg|jpeg|svg|webp|ico)(\?.*)?$/.test(url.pathname);

  // 1. API GET Requests — Network-first with cache fallback for offline access to campaign data
  if (isApiRequest && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Store a copy of successful API responses in API_CACHE
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline / Network Failure — fall back to previously cached campaign & API data
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Peak-Offline-Cache', 'true');

            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers
            });
          }

          // Return JSON error response if no cached response is found
          return new Response(
            JSON.stringify({
              error: 'Offline — No cached data available for this endpoint.',
              offline: true
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Bypass non-GET API requests (POST, PUT, DELETE) so they interact directly with server
  if (isApiRequest) return;

  // 2. Navigation Requests (HTML Pages)
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(NAV_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts)
  if (isAsset) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || networkFetch;
      })
    );
    return;
  }
});


