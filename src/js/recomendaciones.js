// ==============================================
// recomendaciones.js - Sistema de recomendaciones
// ==============================================

window._recMovieId = null;
window._recMovieTitulo = null;
window._recTodosUsuarios = [];
window._recSeleccionados = new Set();
window._recContextoSeleccionado = null;

let _recPaginaActual = 0;
let _recQueryActual = '';
let _recCargando = false;

// -----------------------------------------------
// ABRIR PANEL
// -----------------------------------------------
window.abrirPanelRecomendar = async function(movieId, event) {
    if (event) event.stopPropagation();

    window._recMovieId = movieId;
    window._recSeleccionados = new Set();
    window._recContextoSeleccionado = null;
    _recPaginaActual = 0;
    _recQueryActual = '';
    _recCargando = false;

    document.getElementById('recBuscadorUsuario').value = '';
    document.getElementById('recSeleccionadosRow').style.display = 'none';
    document.getElementById('recSeleccionadosTags').innerHTML = '';
    document.querySelectorAll('.rec-ctx-chip.selected').forEach(c => c.classList.remove('selected'));
    document.getElementById('btnEnviarRecomendacion').style.opacity = '0.5';
    document.getElementById('btnEnviarRecomendacion').style.cursor = 'not-allowed';

    const panel = document.getElementById('panelRecomendar');
        panel.style.display = 'flex';
        document.body.classList.add('modal-open');

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            window._recMovieTitulo = data.title || data.titulo || 'Película';
            document.getElementById('recTituloFilm').textContent = window._recMovieTitulo;
            const img = document.getElementById('recPosterImg');
            if (data.poster_path) {
                img.src = `https://image.tmdb.org/t/p/w92${data.poster_path}`;
                img.style.display = 'block';
            }
        }
    } catch(e) {}

    await _cargarUsuarios(movieId);
};

// -----------------------------------------------
// CERRAR PANEL
// -----------------------------------------------
window.cerrarPanelRecomendar = function() {
    document.getElementById('panelRecomendar').style.display = 'none';
    const modalPelicula = document.getElementById('modalPelicula');
    if (!modalPelicula || modalPelicula.style.display === 'none') {
        document.body.classList.remove('modal-open');
    }
    window._recMovieId = null;
    window._recTodosUsuarios = [];
    window._recSeleccionados = new Set();
    window._recContextoSeleccionado = null;
    _recPaginaActual = 0;
    _recQueryActual = '';
    _recCargando = false;
};

// -----------------------------------------------
// CARGAR USUARIOS INICIALES (seguidos → sugeridos)
// -----------------------------------------------
async function _cargarUsuarios(movieId) {
    const lista = document.getElementById('recListaUsuarios');
    lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">Cargando usuarios...</div>';

    try {
        const token = localStorage.getItem('token');
        const resSeguidos = await fetch(`${CONFIG.API_URL}/follows/following`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let usuarios = [];

        if (resSeguidos.ok) {
            const seguidos = await resSeguidos.json();
            if (seguidos && seguidos.length > 0) {
                usuarios = seguidos.map(u => ({ ...u, fuente: 'seguido' }));
            }
        }

        if (usuarios.length === 0) {
            const resSin = await fetch(`${CONFIG.API_URL}/recommendations/movie/${movieId}/suggested-users?limit=8`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resSin.ok) {
                const sinInteraccion = await resSin.json();
                usuarios = (sinInteraccion || []).map(u => ({ ...u, fuente: 'sugerido' }));
            }
        }

        window._recTodosUsuarios = usuarios;
        _renderizarUsuarios(usuarios);

    } catch(e) {
        lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">No se pudieron cargar usuarios.</div>';
    }
}

// -----------------------------------------------
// RENDERIZAR CHIPS DE USUARIOS (lista inicial/seguidos)
// -----------------------------------------------
function _renderizarUsuarios(usuarios) {
    const lista = document.getElementById('recListaUsuarios');

    if (!usuarios || usuarios.length === 0) {
        lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">No hay usuarios disponibles por ahora.</div>';
        return;
    }

    lista.innerHTML = usuarios.map(u => {
        const iniciales = (u.name || u.nombre || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        const avatarHtml = (u.profileImageUrl || u.profile_image_url || u.avatarUrl)
            ? `<img src="${u.profileImageUrl || u.profile_image_url || u.avatarUrl}" alt="${iniciales}">`
            : iniciales;
        const nombre = u.name || u.nombre || 'Usuario';
        const seleccionado = window._recSeleccionados.has(u.id) ? 'selected' : '';
        return `
            <div class="rec-usuario-chip ${seleccionado}" data-id="${u.id}" data-nombre="${nombre}" onclick="window.toggleUsuarioRec(this)">
                <div class="chip-avatar">${avatarHtml}</div>
                <span>${nombre}</span>
            </div>
        `;
    }).join('');
}

// -----------------------------------------------
// BUSCAR CON SCROLL INFINITO
// -----------------------------------------------
window.filtrarUsuariosRec = async function(query) {
    _recQueryActual = query.trim();
    _recPaginaActual = 0;

    const lista = document.getElementById('recListaUsuarios');

    if (!_recQueryActual) {
        _renderizarUsuarios(window._recTodosUsuarios);
        return;
    }

    lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">Buscando...</div>';
    await _cargarPaginaUsuarios(true);
};

async function _cargarPaginaUsuarios(reemplazar = false) {
    if (_recCargando) return;
    _recCargando = true;

    const lista = document.getElementById('recListaUsuarios');
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(
            `${CONFIG.API_URL}/users/search?q=${encodeURIComponent(_recQueryActual)}&page=${_recPaginaActual}&size=8`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const usuarios = data.users || [];
        const hasMore = data.hasMore || false;

        if (reemplazar) {
            if (usuarios.length === 0) {
                lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">No hay usuarios que coincidan con tu búsqueda.</div>';
                _recCargando = false;
                return;
            }
            lista.innerHTML = '';
        }

        // Agregar chips
        usuarios.forEach(u => {
            const iniciales = (u.name || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
            const avatarHtml = u.avatarUrl
                ? `<img src="${u.avatarUrl}" alt="${iniciales}">`
                : iniciales;
            const seleccionado = window._recSeleccionados.has(u.id) ? 'selected' : '';
            const chip = document.createElement('div');
            chip.className = `rec-usuario-chip ${seleccionado}`;
            chip.dataset.id = u.id;
            chip.dataset.nombre = u.name;
            chip.setAttribute('onclick', 'window.toggleUsuarioRec(this)');
            chip.innerHTML = `<div class="chip-avatar">${avatarHtml}</div><span>${u.name}</span>`;
            lista.appendChild(chip);
        });

        // Quitar sentinel anterior
        const oldSentinel = lista.querySelector('.rec-scroll-sentinel');
        if (oldSentinel) oldSentinel.remove();

        // Agregar nuevo sentinel si hay más resultados
        if (hasMore) {
            const sentinel = document.createElement('div');
            sentinel.className = 'rec-scroll-sentinel';
            sentinel.style.height = '1px';
            lista.appendChild(sentinel);

            const scrollContainer = lista.closest('[style*="overflow"]') || lista.parentElement;
            const observer = new IntersectionObserver(async (entries) => {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    _recPaginaActual++;
                    await _cargarPaginaUsuarios(false);
                }
            }, { root: scrollContainer });

            observer.observe(sentinel);
        }

    } catch(e) {
        if (reemplazar) {
            lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">Error al buscar usuarios.</div>';
        }
    }

    _recCargando = false;
}

// -----------------------------------------------
// TOGGLE SELECCIÓN DE USUARIO
// -----------------------------------------------
window.toggleUsuarioRec = function(chip) {
    const id = parseInt(chip.dataset.id);
    const nombre = chip.dataset.nombre;

    if (window._recSeleccionados.has(id)) {
        window._recSeleccionados.delete(id);
        chip.classList.remove('selected');
    } else {
        window._recSeleccionados.add(id);
        chip.classList.add('selected');
    }

    _actualizarSeleccionados();
    _actualizarBotonEnviar();
};

// -----------------------------------------------
// TOGGLE CONTEXTO
// -----------------------------------------------
window.toggleContextoRec = function(chip) {
    const ctx = chip.dataset.ctx;
    if (window._recContextoSeleccionado === ctx) {
        window._recContextoSeleccionado = null;
        chip.classList.remove('selected');
    } else {
        document.querySelectorAll('.rec-ctx-chip.selected').forEach(c => c.classList.remove('selected'));
        window._recContextoSeleccionado = ctx;
        chip.classList.add('selected');
    }
};

// -----------------------------------------------
// ACTUALIZAR TAGS DE SELECCIONADOS
// -----------------------------------------------
function _actualizarSeleccionados() {
    const row = document.getElementById('recSeleccionadosRow');
    const tags = document.getElementById('recSeleccionadosTags');

    if (window._recSeleccionados.size === 0) {
        row.style.display = 'none';
        return;
    }

    row.style.display = 'block';

    // Recolectar nombres desde chips visibles en el DOM
    const chipsVisibles = document.querySelectorAll('.rec-usuario-chip.selected');
    const nombres = Array.from(chipsVisibles).map(c => c.dataset.nombre || 'Usuario');

    tags.innerHTML = nombres.map(n => `
        <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:#e8eef7;color:#1a3a6b;border:1px solid #c5d3f0;">${n}</span>
    `).join('');
}

// -----------------------------------------------
// HABILITAR/DESHABILITAR BOTÓN ENVIAR
// -----------------------------------------------
function _actualizarBotonEnviar() {
    const btn = document.getElementById('btnEnviarRecomendacion');
    if (window._recSeleccionados.size > 0) {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    } else {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
}

// -----------------------------------------------
// ENVIAR RECOMENDACIÓN
// -----------------------------------------------
window.enviarRecomendacion = async function() {
    if (window._recSeleccionados.size === 0) return;

    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnEnviarRecomendacion');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
            const responses = await Promise.all(
                Array.from(window._recSeleccionados).map(receiverId =>
                    fetch(`${CONFIG.API_URL}/recommendations`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            movieId: window._recMovieId,
                            receiverId: receiverId,
                            contextType: window._recContextoSeleccionado || null
                        })
                    }).then(async r => ({ ok: r.ok, data: await r.json(), receiverId }))
                )
            );

            const exitosas  = responses.filter(r => r.ok);
            const duplicadas = responses.filter(r => !r.ok && r.data?.error?.includes('Ya le recomendaste'));
            const sinPuntos  = exitosas.some(r => r.data?.sinPuntos === true);

            window.cerrarPanelRecomendar();

            if (duplicadas.length > 0 && exitosas.length === 0) {
                // Todas duplicadas
                const nombres = Array.from(document.querySelectorAll('.rec-usuario-chip.selected'))
                    .map(c => c.dataset.nombre).join(', ');
                _mostrarToast(`Ya le recomendaste esta película a ${nombres}.`, true);
            } else if (sinPuntos) {
                _mostrarModalLimiteRecomendacion();
            } else if (exitosas.length > 0) {
                _mostrarToast(exitosas.length === 1
                    ? 'Recomendación enviada'
                    : `${exitosas.length} recomendaciones enviadas`
                );
            }

        } catch(e) {
                _mostrarToast('Error al enviar. Intentá de nuevo.', true);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-envelope"></i> Recomendar';
                _actualizarBotonEnviar();
            }
};

// -----------------------------------------------
// TOAST
// -----------------------------------------------
function _mostrarToast(mensaje, esError = false) {
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: ${esError ? '#e50914' : '#1a3a6b'};
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
    }, 3000);
}

// -----------------------------------------------
// MODAL LÍMITE DIARIO DE RECOMENDACIONES
// -----------------------------------------------
function _mostrarModalLimiteRecomendacion() {
    const existing = document.getElementById('modalLimiteRecomendacion');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modalLimiteRecomendacion';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:2rem;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <div style="font-size:2.5rem;margin-bottom:0.75rem;">🎬</div>
            <h3 style="margin:0 0 0.75rem;color:#333;font-size:1.1rem;font-weight:700;">Ya generaste todos tus puntos de recomendaciones por hoy</h3>
            <p style="color:#666;font-size:0.9rem;margin:0 0 1.5rem;line-height:1.6;text-align:left;">
                Podés seguir recomendando películas, pero estas no sumarán puntos.
                <br>A las 00hs se renueva tu límite diario y volverás a ganar puntos con tus recomendaciones.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                <button onclick="document.getElementById('modalLimiteRecomendacion').remove()"
                    style="padding:0.75rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                    Entendido
                </button>
                <p style="color:#888;font-size:0.85rem;margin:0 0 0.25rem;">
                    ¿Querés recomendar sin límites y ganar puntos ilimitados?
                </p>
                <button onclick="document.getElementById('modalLimiteRecomendacion').remove(); if(typeof cerrarModal==='function') cerrarModal(); if(typeof abrirDetallePlan==='function') abrirDetallePlan();"
                    style="padding:0.75rem;background:#e50914;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;width:100%;">
                    Quiero ser Premium
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Cerrar al click en overlay
document.addEventListener('click', function(e) {
    const panel = document.getElementById('panelRecomendar');
    if (panel && panel.style.display !== 'none' && e.target === panel) {
        window.cerrarPanelRecomendar();
    }
});