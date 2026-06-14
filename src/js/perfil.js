// ==============================================
// perfil.js — Perfil público de usuario
// ==============================================

let perfilUsuarioId = null;

// ==============================================
// INICIALIZACIÓN
// ==============================================
window['init_perfil'] = async function(userId) {
    if (!userId) {
        const params = new URLSearchParams(window.location.search);
        userId = params.get('userId') || window._perfilUsuarioId || sessionStorage.getItem('perfilUsuarioId');
    }

    if (!userId) {
        document.getElementById('perfilContenido').innerHTML =
            '<div style="text-align:center;padding:3rem;color:#999;">Usuario no encontrado</div>';
        return;
    }

    perfilUsuarioId = userId;
    sessionStorage.setItem('perfilUsuarioId', userId);

    // Insertar botón volver si viene desde mi cuenta
    if (sessionStorage.getItem('perfilDesdeMiCuenta') === '1') {
            console.log('ENTRÓ al bloque desdeMiCuenta');
            sessionStorage.removeItem('perfilDesdeMiCuenta');
            const btnExistente = document.getElementById('btnVolverMiCuenta');
            if (!btnExistente) {
                const btn = document.createElement('div');
                btn.id = 'btnVolverMiCuenta';
                btn.style.cssText = 'margin-bottom:1rem; text-align:right;';
                btn.innerHTML = `
                    <button onclick="if(typeof loadModule==='function') loadModule('mi-cuenta');"
                        style="background:none;border:1.5px solid #1a3a6b;color:#1a3a6b;padding:0.45rem 1.1rem;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;">
                        <i class="fas fa-arrow-left"></i> Volver a Mi Cuenta
                    </button>`;
                const hero = document.querySelector('.perfil-hero');
                const card = document.querySelector('.perfil-card');
                if (card && hero) card.insertBefore(btn, hero);
            }
        }

    await cargarPerfil(userId);
};

// ==============================================
// CARGAR PERFIL
// ==============================================
async function cargarPerfil(userId) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${userId}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const perfil = await response.json();

        renderIdentidad(perfil);
                renderStats(perfil);
                renderVotaciones(perfil.ultimasVotaciones);
                renderComentarios(perfil.ultimosComentarios);

                _comentariosTotal = perfil.totalComentarios || 0;
        _actualizarNavComentarios();

    } catch (error) {
        document.getElementById('perfilContenido').innerHTML =
            '<div style="text-align:center;padding:3rem;color:#e50914;">Error al cargar el perfil</div>';
    }
}

// ==============================================
// RENDER IDENTIDAD
// ==============================================
function renderIdentidad(perfil) {
    const avatarEl = document.getElementById('perfilAvatar');
    if (perfil.avatarUrl) {
        avatarEl.innerHTML = `<img src="${perfil.avatarUrl}" alt="${perfil.nombre}">`;
    } else {
        const inicial = perfil.nombre?.charAt(0)?.toUpperCase() || 'U';
        avatarEl.innerHTML = `<span style="font-size:1.8rem;font-weight:700;color:white;">${inicial}</span>`;
    }

    document.getElementById('perfilNombre').textContent = perfil.nombre || '—';

    const badge = document.getElementById('perfilLevelBadge');
    badge.className = `perfil-level-badge level-${perfil.nivel || 'AMATEUR'}`;
    document.getElementById('perfilLevelEmoji').textContent = perfil.nivelEmoji || '🟢';
    document.getElementById('perfilLevelName').textContent = perfil.nivelDisplayName || 'Amateur';

    document.getElementById('perfilMiembro').textContent =
        perfil.miembroDesde ? `Miembro desde ${perfil.miembroDesde}` : '';

    const miId = localStorage.getItem('userId');
        const btnSeguir = document.getElementById('btnSeguir');
        const btnBanner = document.getElementById('btnCambiarBanner');

        if (miId && String(miId) !== String(perfil.id)) {
            btnSeguir.style.display = 'flex';
            actualizarBtnSeguir(perfil.esSeguido);
            if (btnBanner) btnBanner.style.display = 'none';
        } else {
            if (btnSeguir) btnSeguir.style.display = 'none';
            if (btnBanner) btnBanner.style.display = 'block';
        }
}

// ==============================================
// RENDER STATS
// ==============================================
function renderStats(perfil) {
    document.getElementById('perfilSeguidores').textContent  = perfil.seguidores || 0;
    document.getElementById('perfilSiguiendo').textContent   = perfil.siguiendo || 0;
    document.getElementById('perfilVotaciones').textContent  = perfil.totalVotaciones || 0;
    document.getElementById('perfilComentarios').textContent = perfil.totalComentarios || 0;
}

// ==============================================
// RENDER VOTACIONES — CARRUSEL CON LAZY POR FLECHA
// ==============================================
let _votacionesPage     = 0;
let _votacionesHayMas   = false;
let _votacionesCargando = false;

function renderVotaciones(votaciones) {
    const wrapper = document.getElementById('perfilVotacionesWrapper');
    if (!wrapper) return;

    if (!votaciones || votaciones.length === 0) {
        wrapper.innerHTML = '<div class="perfil-vacio">Sin votaciones aún</div>';
        return;
    }

    _votacionesPage   = 0;
    _votacionesHayMas = votaciones.length === 8;

    wrapper.innerHTML = `
        <div class="perfil-carrusel-outer">
            <button class="perfil-carrusel-arrow left" onclick="window.scrollCarrusel(-1)">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="perfil-carrusel-track" id="perfilCarruselTrack">
                ${votaciones.map(v => buildVotoItem(v)).join('')}
            </div>
            <button class="perfil-carrusel-arrow right" onclick="window.scrollCarrusel(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function buildVotoItem(v) {
    const poster = v.posterPath
        ? `<img src="https://image.tmdb.org/t/p/w185${v.posterPath}" alt="${v.movieTitle || ''}">`
        : `<i class="fas fa-film"></i>`;
    const badgeClass = v.voto === 'LIKE' ? 'like' : 'dislike';
    const badgeIcon  = v.voto === 'LIKE' ? 'fa-thumbs-up' : 'fa-thumbs-down';
    return `
        <div class="perfil-voto-item" title="${v.movieTitle || ''}">
            <div class="perfil-voto-poster">
                ${poster}
                <div class="perfil-voto-badge ${badgeClass}">
                    <i class="fas ${badgeIcon}" style="font-size:0.55rem;color:white;"></i>
                </div>
            </div>
            <span class="perfil-voto-titulo">${v.movieTitle || '—'}</span>
        </div>`;
}

window.scrollCarrusel = async function(dir) {
    const track = document.getElementById('perfilCarruselTrack');
    if (!track) return;

    const itemWidth = track.querySelector('.perfil-voto-item')?.offsetWidth || 104;
    const visibles  = Math.floor(track.clientWidth / itemWidth);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const alFinal   = track.scrollLeft >= maxScroll - 10;

    if (dir === 1 && alFinal) {
        if (_votacionesHayMas && !_votacionesCargando) {
            await cargarSiguienteLoteVotaciones(track, itemWidth, visibles);
        } else if (!_votacionesHayMas) {
            mostrarFinVotaciones(track);
        }
    } else {
        track.scrollBy({ left: dir * itemWidth * visibles, behavior: 'smooth' });
    }
};

async function cargarSiguienteLoteVotaciones(track, itemWidth, visibles) {
    _votacionesCargando = true;
    _votacionesPage++;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(
            `${CONFIG.API_URL}/users/${perfilUsuarioId}/votaciones?page=${_votacionesPage}&size=8`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();

        _votacionesHayMas = data.hayMas;

        data.votaciones.forEach(v => {
            track.insertAdjacentHTML('beforeend', buildVotoItem(v));
        });

        setTimeout(() => {
            track.scrollBy({ left: itemWidth * visibles, behavior: 'smooth' });
        }, 100);

    } catch (e) {
        _votacionesPage--;
    } finally {
        _votacionesCargando = false;
    }
}

function mostrarFinVotaciones(track) {
    if (track.querySelector('.perfil-fin-votaciones')) return;
    track.insertAdjacentHTML('beforeend', `
        <div class="perfil-fin-votaciones">
            <i class="fas fa-check-circle"></i>
            <span>No hay más</span>
        </div>
    `);
    track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
}

// ==============================================
// RENDER COMENTARIOS CON PAGINACIÓN
// ==============================================
let _comentariosPage   = 0;
let _comentariosTotal  = 0;
const _comentariosSize = 5;

function renderComentarios(comentarios) {
    _comentariosPage  = 0;
    _comentariosTotal = comentarios?.length || 0;

    const seccion = document.getElementById('perfilComentariosList');
    if (!comentarios || comentarios.length === 0) {
        seccion.innerHTML = '<div class="perfil-vacio">Sin comentarios aún</div>';
        return;
    }

    seccion.innerHTML = `
        <div id="perfilComentariosItems"></div>
        <div class="perfil-comentarios-nav" id="perfilComentariosNav">
            <button class="perfil-carrusel-arrow left" onclick="window.cambiarPaginaComentarios(-1)">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span id="perfilComentariosInfo" style="font-size:0.8rem;color:#999;"></span>
            <button class="perfil-carrusel-arrow right" onclick="window.cambiarPaginaComentarios(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    _renderItemsComentarios(comentarios);
}

function _renderItemsComentarios(comentarios) {
    const lista = document.getElementById('perfilComentariosItems');
    if (!lista) return;

    lista.innerHTML = comentarios.map(c => {
        const textoClass = c.spoiler ? 'perfil-comentario-texto spoiler' : 'perfil-comentario-texto';
        const spoilerTag = c.spoiler ? '<span class="perfil-tag-spoiler">spoiler</span>' : '';
        return `
            <div class="perfil-comentario-item">
                <div class="perfil-comentario-poster">
                    <i class="fas fa-film"></i>
                </div>
                <div class="perfil-comentario-body">
                    <p class="perfil-comentario-pelicula">${c.movieTitle || 'Película no disponible'}</p>
                    <p class="${textoClass}">${c.contenido || ''}</p>
                    <div class="perfil-comentario-meta">
                        <span>${c.fechaRelativa || ''}</span>
                        ${spoilerTag}
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.cambiarPaginaComentarios = async function(dir) {
    const nuevaPagina = _comentariosPage + dir;
    const totalPaginas = Math.ceil(_comentariosTotal / _comentariosSize);
    if (nuevaPagina < 0 || nuevaPagina >= totalPaginas) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(
            `${CONFIG.API_URL}/users/${perfilUsuarioId}/comentarios?page=${nuevaPagina}&size=${_comentariosSize}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();

        _comentariosPage  = nuevaPagina;
        _comentariosTotal = data.total;

        _renderItemsComentarios(data.comentarios);
        _actualizarNavComentarios();

    } catch(e) {}
};

function _actualizarNavComentarios() {
    const totalPaginas = Math.ceil(_comentariosTotal / _comentariosSize);
    const info = document.getElementById('perfilComentariosInfo');
    if (info) info.textContent = `${_comentariosPage + 1} / ${totalPaginas}`;

    const nav = document.getElementById('perfilComentariosNav');
    if (!nav) return;
    const btns = nav.querySelectorAll('.perfil-carrusel-arrow');
    btns[0].disabled = _comentariosPage <= 0;
    btns[1].disabled = _comentariosPage >= totalPaginas - 1;
}

// ==============================================
// SEGUIR / DEJAR DE SEGUIR
// ==============================================
function actualizarBtnSeguir(esSeguido) {
    const btn = document.getElementById('btnSeguir');
    if (!btn) return;
    if (esSeguido) {
        btn.className = 'btn-seguir';
        btn.innerHTML = '<i class="fas fa-user-check" style="color:#1a3a6b;"></i> <span style="color:#1a3a6b;">Siguiendo</span>';
    } else {
        btn.className = 'btn-seguir';
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Seguir';
    }
}

window.toggleSeguir = async function() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnSeguir');
    const esSiguiendo = btn.querySelector('.fa-user-check') !== null;

    if (esSiguiendo) {
        const nombre = document.getElementById('perfilNombre').textContent;
        document.getElementById('dejarSeguirNombre').textContent = nombre;
        document.getElementById('modalDejarSeguir').style.display = 'flex';
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_URL}/follows/${perfilUsuarioId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        actualizarBtnSeguir(true);
        document.getElementById('perfilSeguidores').textContent = data.followersCount;
    } catch (e) {}
};

window.cerrarDejarSeguir = function() {
    document.getElementById('modalDejarSeguir').style.display = 'none';
};

window.confirmarDejarSeguir = async function() {
    const token = localStorage.getItem('token');
    window.cerrarDejarSeguir();
    try {
        const res = await fetch(`${CONFIG.API_URL}/follows/${perfilUsuarioId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        actualizarBtnSeguir(false);
        document.getElementById('perfilSeguidores').textContent = data.followersCount;
    } catch (e) {}
};

window.subirBanner = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamaño máx 2MB
    if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no puede superar los 2MB.');
        return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me/banner`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) throw new Error();

        const data = await res.json();

        // Actualizar el header visualmente sin recargar
        const header = document.querySelector('.perfil-header');
                if (header && data.bannerUrl) {
                    header.style.backgroundImage = `url('${data.bannerUrl}')`;
                }

                alert('Banner actualizado correctamente.');

            } catch(e) {
                alert('Error al subir el banner. Intentá de nuevo.');
            }
        };