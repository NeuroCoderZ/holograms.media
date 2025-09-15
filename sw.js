const CACHE_NAME = 'jules-ai-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  // Add paths to main JS files, e.g., '/js/main.js', '/js/ui/uiManager.js' etc.
  // Add paths to critical assets like favicons, logos
  '/js/app.js', // Assuming app.js is a main entry point - will verify this later
  '/js/main.js', // Added main.js as it's a common entry point name
  '/js/core/configManager.js',
  '/js/core/stateManager.js',
  '/js/core/pwaInstall.js',
  '/js/core/appStatePersistence.js', // Added, seems important
  '/js/core/firebaseInit.js', // Added, seems important
  '/js/lib/utils.js',
  '/js/services/api.js',
  '/js/services/auth.js',
  '/js/services/firebaseStorageService.js', // Added
  '/js/ui/uiManager.js',
  '/js/ui/mainUI.js', // This might be part of uiManager or a separate init
  '/js/ui/panelManager.js',
  '/js/ui/promptManager.js',
  '/js/ui/fileEditor.js',
  '/js/ui/layoutManager.js',
  '/js/ui/gestureAreaVisualization.js',
  '/js/ui/versionManager.js',
  '/favicon.ico',
  '/icons/icon-192x192.png', // From manifest
  '/icons/icon-512x512.png'  // From manifest
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})))
          .catch(error => {
            console.error('Failed to cache one or more URLs during install:', error);
            // Optionally, you could decide not to fail the entire install
            // or to retry caching specific failed URLs.
          });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          networkResponse => {
            // Optionally, cache new requests dynamically
            // if (networkResponse && networkResponse.status === 200 && urlsToCache.includes(event.request.url)) {
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME)
            //     .then(cache => {
            //       cache.put(event.request, responseToCache);
            //     });
            // }
            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetch failed; returning offline page instead.', error);
          // Optionally, return a custom offline page:
          // return caches.match('/offline.html');
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
