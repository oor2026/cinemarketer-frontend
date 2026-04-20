// js/api.js - Único archivo de servicios
const API = {
    BASE_URL: CONFIG.API_URL,

    // Método base para peticiones
async request(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(this.BASE_URL + endpoint, options);

    // Si el servidor devuelve 401, la sesión expiró o fue invalidada
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userPoints');
        window.location.replace('login.html');
        return;
    }

    return response.json();
},

    // Auth methods
    async login(email, password) {
        const response = await fetch(`${this.BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userPoints', data.totalPoints);
        }

        return { ok: response.ok, data };
    },

    // User methods
    async getProfile() {
        return this.request('/users/me', 'GET');
    },

    // Auth state
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Logout
    async logout() {
        const token = localStorage.getItem('token');

        // Avisar al servidor para invalidar el token
        if (token) {
            try {
                await fetch(`${this.BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                // Si falla la llamada, igual limpiamos localmente
            }
        }

        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userPoints');
        sessionStorage.setItem('logged_out', 'true');
        window.location.replace('login.html');
    }
};

// Interceptor global de fetch — redirige a login en cualquier 401
const _fetchOriginal = window.fetch;
window.fetch = async function(...args) {
    const response = await _fetchOriginal(...args);
    if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const esEndpointDeAccion = url.includes('/password') ||
                                   url.includes('/auth/login') ||
                                   url.includes('/users/me');
            if (url.includes(CONFIG.API_URL) && !esEndpointDeAccion) {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userPoints');
            window.location.replace('login.html');
        }
    }
    return response;
};

// Listener para detectar eliminación de token en tiempo real
window.addEventListener('storage', function(e) {
    if (e.key === 'token' && !e.newValue) {
        window.location.replace('login.html');
    }
});

// EXPONER GLOBALMENTE
window.API = API;