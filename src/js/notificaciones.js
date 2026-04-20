// ========== NOTIFICACIONES - BADGE CAMPANA ==========

async function actualizarBadgeNotificaciones() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/support/unread`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        const badge = document.getElementById('bellBadge');
        if (!badge) return;

        if (data.unreadCount > 0) {
            badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        // Silencioso — no interrumpir la navegación si el backend no responde
    }
}

// Ejecutar al cargar y luego cada 30 segundos
document.addEventListener('DOMContentLoaded', () => {
    actualizarBadgeNotificaciones();
    setInterval(actualizarBadgeNotificaciones, 30000);
});

// Exponer para que otros módulos puedan actualizar el badge manualmente
window.actualizarBadgeNotificaciones = actualizarBadgeNotificaciones;
