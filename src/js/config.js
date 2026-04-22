// ========== CONFIGURACIÓN DEL ENTORNO ==========
const CONFIG = {
    // La URL se define automáticamente según el entorno
    // En Railway: usa la variable API_BASE_URL
    // En desarrollo local: usa localhost
    API_URL: process.env.API_BASE_URL || 'http://localhost:8080/api'
};