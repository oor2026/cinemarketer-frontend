// ==============================================
// novedades.js - Dropdown de actividad social
// ==============================================

window.toggleNovedades = function(e) {
    e.preventDefault();
    const esMobile = window.innerWidth <= 768;

    if (esMobile) {
        const acordeon = document.getElementById('novedadesMobile');
        const chevron = document.getElementById('novedadesChevron');
        const abierto = acordeon.style.display === 'block';
        acordeon.style.display = abierto ? 'none' : 'block';
        if (chevron) chevron.style.transform = abierto ? 'rotate(0deg)' : 'rotate(180deg)';
        if (!abierto) window.cargarNovedadesMobile();
    } else {
        const dropdown = document.getElementById('novedadesDropdown');
        if (dropdown.style.display === 'none') {
            dropdown.style.display = 'block';
            window.cargarNovedades();
        } else {
            dropdown.style.display = 'none';
        }
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
            <div onclick="window.clickNovedad(${n.id}, ${n.movieId}, ${n.commentId}, ${n.replyId || 'null'}, '${n.type}', ${n.read})"
                style="padding:0.75rem 1rem;border-bottom:1px solid #f5f5f5;cursor:pointer;
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

window.clickNovedad = async function(notificationId, movieId, commentId, replyId, type, yaLeida) {
    const token = localStorage.getItem('token');

    // Marcar como leída si no lo está
    if (!yaLeida) {
        try {
            await fetch(`${CONFIG.API_URL}/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch(e) {}

        // Actualizar badge inmediatamente
        const badge = document.getElementById('novedadesBadge');
        if (badge) {
            const actual = parseInt(badge.textContent) || 0;
            const nuevo = Math.max(0, actual - 1);
            badge.textContent = nuevo;
            badge.style.display = nuevo > 0 ? 'inline-block' : 'none';
        }

        // Recargar lista para actualizar visual
        window.cargarNovedades();
    }

        // Navegar solo en respuestas
            if (type === 'REPLY') {
                const dropdown = document.getElementById('novedadesDropdown');
                if (dropdown) dropdown.style.display = 'none';

                if (typeof window.abrirDetallePelicula === 'function') {

                    // Consultar si el comentario padre es spoiler antes de abrir
                    if (commentId) {
                        try {
                            const token2 = localStorage.getItem('token');
                            const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}`, {
                                headers: { 'Authorization': `Bearer ${token2}` }
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.spoiler) {
                                    modoSpoilerActivo = true;
                                }
                            }
                        } catch(e) {}
                    }

                   window.abrirDetallePelicula(movieId);

                           if (replyId && commentId) {
                              setTimeout(async () => {
                                  // Aplicar modo spoiler visual ahora que el modal ya está abierto
                                  if (modoSpoilerActivo && typeof window.activarModoSpoiler === 'function') {
                                      window.activarModoSpoiler(true);
                                  }
                                  // Esperar a que cargarComentariosPelicula termine de renderizar
                                  await new Promise(resolve => setTimeout(resolve, 600));

                                  const container = document.querySelector(`.replies-container-${commentId}`);
                                  if (container) {
                                      container.style.display = 'block';
                                      await window.cargarRespuestas(commentId, 0);
                                  }

                                  setTimeout(() => {
                                      const containerFinal = document.querySelector(`.replies-container-${commentId}`);
                                      const bancoBtns = containerFinal
                                          ? containerFinal.querySelectorAll(`button[onclick*="toggleReplyBanco(${replyId}"]`)
                                          : [];
                                      const targetEl = bancoBtns.length > 0
                                          ? bancoBtns[0].closest('div[style*="display:flex"]')
                                          : null;
                                      if (targetEl) {
                                          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          targetEl.style.transition = 'background 0.3s';
                                          targetEl.style.background = '#fff3cd';
                                          setTimeout(() => { targetEl.style.background = ''; }, 3000);
                                      }
                                  }, 600);
                              }, 800);
                          }
                }
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

window.cargarNovedadesMobile = async function() {
    const lista = document.getElementById('novedadesListaMobile');
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const novedades = await res.json();

        if (novedades.length === 0) {
            lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Sin novedades por ahora</div>';
            return;
        }

        lista.innerHTML = novedades.map(n => `
            <div onclick="window.clickNovedad(${n.id}, ${n.movieId}, ${n.commentId}, ${n.replyId || 'null'}, '${n.type}', ${n.read})"
                style="padding:0.75rem 1rem;border-bottom:1px solid #eee;cursor:pointer;
                       background:${n.read ? 'white' : '#f0f4ff'};">
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