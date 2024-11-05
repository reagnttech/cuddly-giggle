const CACHE_NAME = 'hls-cache-v1';

// Install Event - Typically used for pre-caching, but we'll skip pre-caching
self.addEventListener('install', (event) => {
    // Activate the Service Worker immediately without waiting
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Dynamically cache .m3u8 and .ts files
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle requests for .m3u8 and .ts files within the same directory
    if (url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.ts')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((response) => {
                    if (response) {
                        // Serve from cache
                        return response;
                    }
                    // Fetch from network
                    return fetch(request).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            // Cache the fetched response for future use
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch((error) => {
                        console.error('Fetch failed:', error);
                        // Optionally, return a fallback response here
                        return new Response('Network error occurred', {
                            status: 408,
                            statusText: 'Network error'
                        });
                    });
                });
            })
        );
    }
});
