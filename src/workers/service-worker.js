/**
 * Service Worker
 * Provides offline support by caching app resources
 */

// Cache version v43 - Multi-language with dynamic translation
// Updated: 2025-12-18 - Add dynamic text translation via JavaScript
const CACHE_NAME = 'wordfeud-helper-v43-production';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/joker/',
    '/joker/index.html',
    '/download/',
    '/download/index.html',
    '/en/',
    '/en/index.html',
    '/en/joker/',
    '/en/joker/index.html',
    '/en/download/',
    '/en/download/index.html',
    '/en/manifest.json',
    '/assets/styles/styles.css',
    '/src/js/main.js',
    '/src/js/init.js',
    '/src/js/ui-v2.js',
    '/src/js/searchEngine.js',
    '/src/js/wordlistLoader.js',
    '/src/js/scoring.js',
    '/src/js/utils.js',
    '/src/js/analytics.js',
    '/src/js/download.js',
    '/src/js/i18n.js',
    '/src/workers/searchWorker.js',
    '/public/words.json',
    '/translations/da.json',
    '/translations/en.json',
    '/translations/sv.json',
    '/translations/nl.json',
    '/translations/no.json',
    '/translations/pt.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing version ' + CACHE_NAME);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('📦 Service Worker: Caching static assets');

                // Cache files individually to avoid one failure breaking everything
                const cachePromises = STATIC_ASSETS.map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            await cache.put(url, response);
                            console.log('✓ Cached:', url);
                        } else {
                            console.warn('⚠️ Failed to cache (status ' + response.status + '):', url);
                        }
                    } catch (error) {
                        console.error('❌ Error caching:', url, error);
                    }
                });

                await Promise.all(cachePromises);
                console.log('✅ Service Worker: All assets cached');
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete, force activating...');
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Installation failed', error);
            })
    );
});

// Message event - handle commands from clients
self.addEventListener('message', (event) => {
    console.log('📨 Service Worker received message:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏭️ SKIP_WAITING command received, activating new version...');
        self.skipWaiting();
    }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating version ' + CACHE_NAME);

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activation complete');
                // Notify all clients that a new version is active
                return self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SW_UPDATED',
                            version: CACHE_NAME
                        });
                    });
                    return self.clients.claim();
                });
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Security: Validate request URL to prevent malicious requests
    let requestUrl;
    try {
        requestUrl = new URL(event.request.url);
    } catch (e) {
        console.error('Service Worker: Invalid request URL', e);
        return;
    }

    // Security: Only handle requests from same origin (prevent CORS attacks)
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    // Security: Only handle GET requests (prevent cache poisoning via POST/PUT)
    if (event.request.method !== 'GET') {
        return;
    }

    // Security: Block requests with suspicious patterns
    const suspiciousPatterns = /<script|javascript:|data:text\/html|vbscript:|file:/i;
    if (suspiciousPatterns.test(requestUrl.href)) {
        console.warn('Service Worker: Blocked suspicious request', requestUrl.href);
        return;
    }

    // Network-first strategy for JavaScript files with cache busting
    if (requestUrl.pathname.endsWith('.js')) {
        event.respondWith(
            // Force fetch from network, bypass cache
            fetch(event.request, { cache: 'no-store' })
                .then((response) => {
                    // Cache the new version
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first strategy for other assets
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Only cache successful responses with valid content types
                        if (networkResponse && networkResponse.status === 200) {
                            const contentType = networkResponse.headers.get('content-type');

                            // Only cache safe content types
                            const safeMimeTypes = [
                                'text/html',
                                'text/css',
                                'text/javascript',
                                'application/javascript',
                                'application/json'
                            ];

                            const isSafeType = safeMimeTypes.some(type =>
                                contentType && contentType.includes(type)
                            );

                            if (isSafeType) {
                                const responseToCache = networkResponse.clone();

                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                        }

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('Service Worker: Fetch failed', error);
                        throw error;
                    });
            })
    );
});
