const CACHE_NAME = 'shiksha-unified-erp-v2.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Install Event: Pre-cache core app shell and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

// 2. Activate Event: Clean up all old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Bypass cache for Google Apps Script API, Network-First for HTML/JS
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Never cache Google Apps Script API calls or POST requests (ensures 100% live sync)
  if (
    event.request.method !== 'GET' ||
    reqUrl.hostname.includes('script.google.com') ||
    reqUrl.hostname.includes('script.googleusercontent.com')
  ) {
    return;
  }

  // Network-First Strategy for same-origin app files (index.html, manifest.json)
  if (reqUrl.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-First with Network Fallback for external CDNs (Tailwind, FontAwesome, Chart.js)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
      );
    })
  );
});
