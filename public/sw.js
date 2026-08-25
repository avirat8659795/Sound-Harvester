// SoundHarvest Service Worker - Resilient Network-First PWA Strategy
const CACHE_NAME = 'soundharvest-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept API endpoints, audio streams, Vite dev modules, or source files
  if (
    url.includes('/api/') ||
    url.includes('/src/') ||
    url.includes('/node_modules/') ||
    url.includes('/@') ||
    url.includes('hot-update') ||
    url.includes('.ts') ||
    url.includes('.tsx') ||
    url.includes('.map') ||
    url.includes('soundharvest-yt-player') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-First: Always attempt to fetch the latest version from server
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

