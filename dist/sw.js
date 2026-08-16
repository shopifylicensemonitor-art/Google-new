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



// ── Background Sync & Offline Queue ────────────────────────────────
const DB_NAME = 'PeakXOfflineDB';
const STORE_NAME = 'campaignQueue';

// Open IndexedDB to store offline queued emails
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueCampaign(requestData) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add(requestData);
  return tx.complete;
}

async function flushQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getAll = store.getAll();
    
    getAll.onsuccess = async () => {
      const items = getAll.result;
      if (items.length === 0) return resolve();
      
      // Notify clients syncing started
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SYNC_STARTED', count: items.length }));
      });

      let processed = 0;
      for (const item of items) {
        try {
          // Attempt to send
          const res = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          });
          
          if (res.ok) {
            // Remove from queue on success
            const delTx = db.transaction(STORE_NAME, 'readwrite');
            delTx.objectStore(STORE_NAME).delete(item.id);
            processed++;
            
            // Notify clients of progress
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'SYNC_PROGRESS', completed: processed, total: items.length }));
            });
          }
        } catch (e) {
          console.error("Offline sync item failed, will retry later:", e);
        }
      }
      
      // Notify clients syncing completed
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE', processed }));
      });
      resolve();
    };
    getAll.onerror = () => reject(getAll.error);
  });
}

// Intercept requests to queue offline campaigns
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/api/campaigns/send' && event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request.clone()).catch(async (error) => {
        // Queue it for background sync
        const clonedRequest = event.request.clone();
        const headers = {};
        for (const [key, value] of clonedRequest.headers.entries()) {
          headers[key] = value;
        }
        const body = await clonedRequest.text();
        
        await queueCampaign({
          url: clonedRequest.url,
          method: clonedRequest.method,
          headers,
          body,
          timestamp: Date.now()
        });
        
        // Register sync event if supported
        if ('sync' in self.registration) {
          await self.registration.sync.register('sync-campaigns');
        }

        // Return a mock response indicating queued status
        return new Response(JSON.stringify({ 
          success: true, 
          queuedOffline: true, 
          message: "You are offline. Campaign has been queued." 
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-campaigns') {
    event.waitUntil(flushQueue());
  }
});
