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
        window.location.replace('login.html');
    }
};

// EXPONER GLOBALMENTE
window.API = API;