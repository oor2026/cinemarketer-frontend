// ==============================================
// sw.js — Service Worker Cinemarketer PWA
// ==============================================

const CACHE_NAME = 'cinemarketer-v1';

// Archivos estáticos a cachear para instalación
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/css/styles.css',
    '/css/login.css',
    '/css/dashboard.css',
    '/js/config.js',
    '/js/api.js',
    '/assets/images/icon-192.png',
    '/assets/images/icon-512.png',
    '/assets/images/isologotipo.webp',
    '/assets/images/favicon.png'
];

// ── Install: cachear assets estáticos ────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// ── Activate: limpiar caches viejos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// ── Fetch: network first para API, cache first para estáticos ────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Siempre ir a la red para llamadas a la API
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para assets estáticos: network first, fallback a cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Guardar copia en cache si es exitosa
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si no hay red, intentar desde cache
                return caches.match(event.request);
            })
    );
});