const CACHE_SHELL = 'penelope-shell-v5';
const CACHE_IMAGES = 'penelope-images-v1';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_SHELL).then(cache =>
            cache.addAll([
                './selector.html',
                './index.html',
                './contrato.html',
                './logistica.html',
                './css/selector.css',
                './js/selector.js',
                './favicon.svg',
                './penelope.png'
            ])
        )
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_SHELL && k !== CACHE_IMAGES)
                    .map(k => caches.delete(k))
            )
        )
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // No interceptar peticiones externas ni no-GET
    if (url.origin !== self.location.origin) return;
    if (event.request.method !== 'GET') return;

    if (url.pathname.includes('/imagenes/')) {
        event.respondWith(
            caches.open(CACHE_IMAGES).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    }).catch(() => cached || new Response('', { status: 503, statusText: 'Offline' }));
                })
            )
        );
    } else {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_SHELL).then(c => c.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    }
});
