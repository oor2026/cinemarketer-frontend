// ==============================================
// novedades.js - Dropdown de actividad social
// ==============================================

window.toggleNovedades = function(e) {
    e.preventDefault();
    const dropdown = document.getElementById('novedadesDropdown');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        window.cargarNovedades();
    } else {
        dropdown.style.display = 'none';
    }
};

// Cerrar al click fuera
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('novedadesDropdown');
    if (!dropdown) return;
    if (!dropdown.contains(e.target) && !e.target.closest('[onclick*="toggleNovedades"]')) {
        dropdown.style.display = 'none';
    }
});

window.cargarNovedades = async function() {
    const lista = document.getElementById('novedadesLista');
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const novedades = await res.json();

        // Actualizar badge
        const noLeidas = novedades.filter(n => !n.read).length;
        const badge = document.getElementById('novedadesBadge');
        if (badge) {
            badge.textContent = noLeidas;
            badge.style.display = noLeidas > 0 ? 'inline-block' : 'none';
        }

        if (novedades.length === 0) {
            lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Sin novedades por ahora</div>';
            return;
        }

        lista.innerHTML = novedades.map(n => `
            <div onclick="window.clickNovedad(${n.movieId}, ${n.commentId}, '${n.type}')"
                style="padding:0.75rem 1rem;border-bottom:1px solid #f5f5f5;cursor:${n.type === 'REPLY' ? 'pointer' : 'default'};
                       background:${n.read ? 'white' : '#f0f4ff'};
                       transition:background 0.2s;"
                onmouseover="this.style.background='#f8f8f8'"
                onmouseout="this.style.background='${n.read ? 'white' : '#f0f4ff'}'">
                <div style="display:flex;align-items:flex-start;gap:0.5rem;">
                    <span style="font-size:1rem;flex-shrink:0;">${n.type === 'BANCO' ? '👍' : n.type === 'MERECE_PUNTO' ? '⭐' : '💬'}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.83rem;color:#333;line-height:1.4;">${n.message}</div>
                        <div style="font-size:0.75rem;color:#999;margin-top:0.2rem;">${new Date(n.createdAt).toLocaleDateString('es-ES')} ${new Date(n.createdAt).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    ${!n.read ? '<span style="width:8px;height:8px;background:#e50914;border-radius:50%;flex-shrink:0;margin-top:4px;"></span>' : ''}
                </div>
            </div>
        `).join('');

    } catch(e) {
        lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Error al cargar novedades</div>';
    }
};

window.clickNovedad = async function(movieId, commentId, type) {
    // Solo navega en respuestas
    if (type !== 'REPLY') return;
    document.getElementById('novedadesDropdown').style.display = 'none';
    if (typeof window.abrirDetallePelicula === 'function') {
        window.abrirDetallePelicula(movieId);
    }
};

window.marcarTodasLeidas = async function() {
    const token = localStorage.getItem('token');
    try {
        await fetch(`${CONFIG.API_URL}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        window.cargarNovedades();
    } catch(e) {}
};

// Cargar badge al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById('novedadesBadge');
        if (badge && data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline-block';
        }
    } catch(e) {}
});