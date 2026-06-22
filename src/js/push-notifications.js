// ==============================================
// push-notifications.js — Web Push Cinemarketer
// ==============================================

const PushNotifications = {

    _vapidPublicKey: null,

    // Inicializar — llamar desde dashboard.html después de login
    init: async function() {
        // Solo continuar si el browser soporta push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Web Push no soportado en este browser');
            return;
        }

        // No pedir permiso inmediatamente — esperar a que el usuario
        // esté usando la app (se llama desde un botón o después de X segundos)
        try {
            const registration = await navigator.serviceWorker.ready;
            const existingSub = await registration.pushManager.getSubscription();

            if (existingSub) {
                // Ya está suscripto — sincronizar con el backend
                await this._enviarAlBackend(existingSub);
            }
        } catch (e) {
            console.warn('Error inicializando push:', e);
        }
    },

    // Pedir permiso y suscribir — llamar desde un botón de UI
    solicitarPermiso: async function() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return false;
        }

        try {
            // Pedir permiso al usuario
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Permiso de notificaciones denegado');
                return false;
            }

            // Obtener clave pública VAPID del backend
            const vapidKey = await this._obtenerVapidKey();
            if (!vapidKey) return false;

            // Registrar suscripción en el browser
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this._urlBase64ToUint8Array(vapidKey)
            });

            // Enviar suscripción al backend
            await this._enviarAlBackend(subscription);
            console.log('✅ Suscripción push registrada');
            return true;

        } catch (e) {
            console.error('Error suscribiendo a push:', e);
            return false;
        }
    },

    // Desuscribir
    desuscribir: async function() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) return;

            const token = localStorage.getItem('token');
            await fetch(`${CONFIG.API_URL}/push/unsubscribe`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });

            await subscription.unsubscribe();
            console.log('✅ Desuscripto de push');
        } catch (e) {
            console.error('Error desuscribiendo:', e);
        }
    },

    // Verificar si ya tiene permiso concedido
    tienePermiso: function() {
        return Notification.permission === 'granted';
    },

    // ── Privados ──────────────────────────────────────────────────────────────

    _obtenerVapidKey: async function() {
        if (this._vapidPublicKey) return this._vapidPublicKey;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/push/vapid-public-key`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const data = await res.json();
            this._vapidPublicKey = data.publicKey;
            return this._vapidPublicKey;
        } catch (e) {
            return null;
        }
    },

    _enviarAlBackend: async function(subscription) {
        try {
            const token = localStorage.getItem('token');
            const subJson = subscription.toJSON();
            await fetch(`${CONFIG.API_URL}/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: {
                        p256dh: subJson.keys.p256dh,
                        auth: subJson.keys.auth
                    }
                })
            });
        } catch (e) {
            console.error('Error enviando suscripción al backend:', e);
        }
    },

    _urlBase64ToUint8Array: function(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

// Exponer globalmente
window.PushNotifications = PushNotifications;