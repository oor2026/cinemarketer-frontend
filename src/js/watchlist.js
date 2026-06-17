// ==============================================
// watchlist.js — Mi lista (guardar películas)
// ==============================================

let _watchlistCache = [];
let _watchlistModalId = null;

// ── Toggle guardar desde card o modal ─────────────────────────
window.toggleWatchlist = async function(movieId, event) {
    if (event) event.stopPropagation();

    // Feedback optimista inmediato
    const btns = document.querySelectorAll(`.btn-watchlist[data-movie-id="${movieId}"]`);
    const btnModal = document.getElementById('btnWatchlistModal');
    const yaGuardado = btns[0]?.classList.contains('guardado') ||
                       btnModal?.classList.contains('guardado');
    btns.forEach(btn => _actualizarBtnWatchlist(btn, !yaGuardado));
    if (btnModal) _actualizarBtnWatchlist(btnModal, !yaGuardado);

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/watchlist/${movieId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const saved = data.saved;

        // Actualizar cards del feed
        document.querySelectorAll(`.btn-watchlist[data-movie-id="${movieId}"]`).forEach(btn => {
            _actualizarBtnWatchlist(btn, saved);
        });
        // Actualizar botón del modal si está abierto
        const btnModal = document.getElementById('btnWatchlistModal');
        if (btnModal) _actualizarBtnWatchlist(btnModal, saved);

        // Toast feedback
                _mostrarToastWatchlist(saved ? 'Guardada en tu lista' : 'Quitada de tu lista');

                // Refrescar conteo en tab
                const countEl = document.getElementById('countMiLista');
                if (countEl) {
                    const n = parseInt(countEl.textContent) || 0;
                    countEl.textContent = saved ? n + 1 : Math.max(0, n - 1);
                }

                // Siempre refrescar la lista — esté visible o no
                window.cargarMiLista();

    } catch (e) {
            // Revertir si falló
            btns.forEach(btn => _actualizarBtnWatchlist(btn, yaGuardado));
            if (btnModal) _actualizarBtnWatchlist(btnModal, yaGuardado);
        }
    };

// ── Verificar estado al abrir modal de película ─────────────────
window.verificarEstadoWatchlist = async function(movieId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/watchlist/${movieId}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        // Actualizar cards del feed
        document.querySelectorAll(`.btn-watchlist[data-movie-id="${movieId}"]`).forEach(btn => {
            _actualizarBtnWatchlist(btn, data.saved);
        });
        // Actualizar botón del modal
        const btnModal = document.getElementById('btnWatchlistModal');
        if (btnModal) _actualizarBtnWatchlist(btnModal, data.saved);
    } catch (e) {}
};

function _actualizarBtnWatchlist(btn, saved) {
    const icon = btn.querySelector('i');
    if (saved) {
        btn.classList.add('guardado');
        btn.title = 'Quitar de mi lista';
        if (icon) {
            icon.style.color = '#e50914';
            icon.style.filter = 'drop-shadow(0 0 4px white) drop-shadow(0 0 8px white) drop-shadow(0 0 12px white)';
        }
    } else {
        btn.classList.remove('guardado');
        btn.title = 'Guardar en mi lista';
        if (icon) {
            icon.style.color = 'white';
            icon.style.filter = '';
        }
    }
}

// ── Cargar Mi lista ────────────────────────────────────────────
window.cargarMiLista = async function() {
    const token = localStorage.getItem('token');
    const lista = document.getElementById('panelMiLista');
    if (!lista) return;
    lista.innerHTML = '<div class="mi-red-vacio">Cargando...</div>';
    try {
        const res = await fetch(`${CONFIG.API_URL}/watchlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        _watchlistCache = res.ok ? await res.json() : [];
        const countEl = document.getElementById('countMiLista');
        if (countEl) countEl.textContent = _watchlistCache.length;
        renderMiLista();
    } catch (e) {
        lista.innerHTML = '<div class="mi-red-vacio">Error al cargar tu lista</div>';
    }
};

function renderMiLista() {
    const lista = document.getElementById('panelMiLista');
    if (!lista) return;

    if (_watchlistCache.length === 0) {
        lista.innerHTML = '<div class="mi-red-vacio">Guardá películas para verlas después</div>';
        return;
    }

    lista.innerHTML = _watchlistCache.map(w => {
        const posterUrl = w.moviePosterPath
            ? `https://image.tmdb.org/t/p/w185${w.moviePosterPath}`
            : null;

        const yaVista    = !!w.seenAt;
        const yaCalificada = !!w.rating;

        const estrellasActivas = [1,2,3,4,5].map(i => `
            <span onclick="window.seleccionarEstrellaWatchlist(${w.id}, ${i})"
                  style="cursor:pointer;font-size:1.3rem;color:${yaCalificada && w.rating >= i ? '#E8A800' : '#ddd'};"
                  data-wl-id="${w.id}" data-star="${i}">★</span>
        `).join('');

        const estrellasDeshabilitadas = `
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:0.72rem;color:#aaa;margin-left:4px;">Marcá como vista para calificar</span>
        `;

        const sinopsis = w.movieOverview
            ? `<p style="font-size:0.78rem;color:#666;margin:4px 0 6px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${w.movieOverview}</p>`
            : '';

        return `
            <div style="display:flex;align-items:flex-start;gap:0.85rem;padding:0.9rem 0;border-bottom:1px solid #f5f5f5;position:relative;">
                <button onclick="window.eliminarDeWatchlist(${w.id})"
                        title="Quitar de mi lista"
                        style="position:absolute;top:8px;right:0;background:none;border:none;cursor:pointer;color:#ccc;font-size:1rem;padding:4px;line-height:1;"
                        onmouseover="this.style.color='#e50914'"
                        onmouseout="this.style.color='#ccc'">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ${posterUrl
                    ? `<img src="${posterUrl}" alt="${w.movieTitle || 'Película'}"
                                    onclick="window.abrirDetallePeliculaDesdeWatchlist(${w.movieId})"
                                    style="width:85px;height:128px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer;">`
                            : `<div onclick="window.abrirDetallePeliculaDesdeWatchlist(${w.movieId})"
                             style="width:85px;height:128px;background:#1a3a6b;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;cursor:pointer;">🎬</div>`
                }
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.92rem;font-weight:600;color:#333;margin-bottom:4px;padding-right:1.5rem;">
                        ${w.movieTitle || '—'}
                    </div>
                    ${sinopsis}
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        ${!yaVista
                            ? `<button onclick="window.abrirModalYaLaViWatchlist(${w.id})"
                                       style="font-size:0.8rem;padding:4px 12px;border-radius:8px;background:#1a3a6b;color:white;border:none;cursor:pointer;font-weight:500;">
                                   ✓ Ya la vi
                               </button>`
                            : `<span style="font-size:0.75rem;color:#1d9e75;font-weight:500;">✓ Vista</span>`
                        }
                    </div>
                    <div style="display:flex;align-items:center;gap:2px;margin-top:6px;flex-wrap:wrap;">
                        ${yaVista ? estrellasActivas : estrellasDeshabilitadas}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ── Ya la vi ───────────────────────────────────────────────────
window.abrirModalYaLaViWatchlist = function(wlId) {
    _watchlistModalId = wlId;
    // Reusar el mismo modal que recomendaciones
    const modal = document.getElementById('modalYaLaVi');
    if (modal) {
        // Override confirmar para watchlist
        window._yaLaViModo = 'watchlist';
        modal.style.display = 'flex';
    }
};

// Override de confirmarYaLaVi para manejar ambos modos
const _confirmarYaLaViOriginal = window.confirmarYaLaVi;
window.confirmarYaLaVi = async function() {
    if (window._yaLaViModo === 'watchlist') {
        const wlId = _watchlistModalId;
        if (!wlId) return;
        window.cerrarModalYaLaVi?.();
        window._yaLaViModo = null;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${CONFIG.API_URL}/watchlist/${wlId}/seen`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const w = _watchlistCache.find(x => x.id === wlId);
                if (w) w.seenAt = new Date().toISOString();
                renderMiLista();
            }
        } catch (e) {}
    } else {
        if (_confirmarYaLaViOriginal) _confirmarYaLaViOriginal();
    }
};

// ── Calificar ──────────────────────────────────────────────────
window.seleccionarEstrellaWatchlist = async function(wlId, rating) {
    const w = _watchlistCache.find(x => x.id === wlId);
    if (!w || !w.seenAt || w.rating) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/watchlist/${wlId}/rate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rating })
        });
        if (res.ok) {
            w.rating = rating;
            renderMiLista();
        }
    } catch (e) {}
};

// ── Eliminar ───────────────────────────────────────────────────
window.eliminarDeWatchlist = async function(wlId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/watchlist/${wlId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            _watchlistCache = _watchlistCache.filter(x => x.id !== wlId);
            const countEl = document.getElementById('countMiLista');
            if (countEl) countEl.textContent = _watchlistCache.length;
            renderMiLista();
        }
    } catch (e) {}
};

// ── Toast ──────────────────────────────────────────────────────
function _mostrarToastWatchlist(mensaje) {
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: #1a3a6b;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 99px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 9999999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ── Marcar estado watchlist en todas las cards del feed ────────
window.marcarWatchlistEnFeed = async function() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/watchlist/ids`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const savedIds = await res.json(); // [1234, 5678, ...]

        document.querySelectorAll('.btn-watchlist[data-movie-id]').forEach(btn => {
            const movieId = parseInt(btn.dataset.movieId);
            _actualizarBtnWatchlist(btn, savedIds.includes(movieId));
        });
    } catch (e) {}
};

window.abrirDetallePeliculaDesdeWatchlist = function(movieId) {
    const modalExiste = !!document.getElementById('modalPelicula');

    if (typeof window.abrirDetallePelicula === 'function' && modalExiste) {
        window.abrirDetallePelicula(movieId);
        return;
    }

    // Navegar al feed y esperar que el modal esté en el DOM
    if (typeof loadModule === 'function') {
        loadModule('feed-films', null, true);
        let intentos = 0;
        const interval = setInterval(() => {
            intentos++;
            const modal = document.getElementById('modalPelicula');
            if (typeof window.abrirDetallePelicula === 'function' && modal) {
                clearInterval(interval);
                setTimeout(() => window.abrirDetallePelicula(movieId), 300);
            }
            if (intentos > 100) clearInterval(interval);
        }, 100);
    }
};