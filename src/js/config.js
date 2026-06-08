// ========== CONFIGURACIÓN DEL ENTORNO ==========
const CONFIG = {
    // La URL se define automáticamente según el entorno
    // En Railway: usa la variable API_BASE_URL
    // En desarrollo local: usa localhost
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8080/api'
        : 'https://cinemarketer-backend-production.up.railway.app/api'
};