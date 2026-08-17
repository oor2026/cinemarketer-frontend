// ==============================================
// sw.js — Service Worker Cinemarketer PWA
// ==============================================

const CACHE_NAME = 'cinemarketer-v2'; // subir este número cada vez que cambie la lista de STATIC_ASSETS

// Solo assets verdaderamente estáticos — íconos, manifest, logo. Nunca
// código de la app (JS/CSS/HTML de módulos), que se sirve siempre fresco
// más abajo, igual que ya se hace con /api/.
const STATIC_ASSETS = [
    '/assets/images/icon-192.png',
    '/assets/images/icon-512.png',
    '/assets/images/isologotipo.webp',
    '/assets/images/favicon.png'
];

// Extensiones/origen que SÍ pueden cachearse con fallback offline —
// imágenes propias, fuentes. Todo lo demás (.js, .css, .html, y
// cualquier fetch de loadModule) va siempre a red, sin caché de
// respaldo, para que nunca quede pegada una versión vieja de la app.
const CACHEABLE_EXTENSIONS = /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i;

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API, y cualquier request de mismo origen que no sea un asset
    // estático (JS, CSS, HTML de módulos, fuentes de datos) — siempre red,
    // nunca caché de respaldo. Un hiccup de red puntual no debe dejar
    // pegada una versión vieja del código de la app.
    const esMismoOrigen = url.origin === self.location.origin;
    const esAssetCacheable = esMismoOrigen && CACHEABLE_EXTENSIONS.test(url.pathname);

    if (url.pathname.startsWith('/api/') || !esAssetCacheable) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Solo llega acá lo que sí es un asset estático cacheable — con
    // fallback a caché por si en ese momento puntual no hay red (ej.
    // abrir la app sin conexión), no como comportamiento normal.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ── Push: recibir notificación del backend ────────────────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'Cinemarketer', body: 'Tenés una novedad', icon: '/assets/images/icon-192.png' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/assets/images/icon-192.png',
        badge: '/assets/images/badge-icon-v2.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/dashboard.html' },
        actions: [
            { action: 'open', title: 'Ver' },
            { action: 'close', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ── Click en la notificación ──────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/dashboard.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una pestaña abierta, enfocarla
            for (const client of clientList) {
                if (client.url.includes('dashboard.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});