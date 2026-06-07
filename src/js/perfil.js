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
    if (miId && String(miId) !== String(perfil.id)) {
        btnSeguir.style.display = 'flex';
        actualizarBtnSeguir(perfil.esSeguido);
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
                    <i class="fas ${badgeIcon}"></i>
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
// RENDER COMENTARIOS
// ==============================================
function renderComentarios(comentarios) {
    const lista = document.getElementById('perfilComentariosList');
    if (!comentarios || comentarios.length === 0) {
        lista.innerHTML = '<div class="perfil-vacio">Sin comentarios aún</div>';
        return;
    }

    lista.innerHTML = comentarios.map(c => {
        const textoClass = c.spoiler ? 'perfil-comentario-texto spoiler' : 'perfil-comentario-texto';
        const spoilerTag = c.spoiler
            ? '<span class="perfil-tag-spoiler">spoiler</span>'
            : '';

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

// ==============================================
// SEGUIR / DEJAR DE SEGUIR
// ==============================================
function actualizarBtnSeguir(esSeguido) {
    const btn = document.getElementById('btnSeguir');
    if (!btn) return;
    if (esSeguido) {
        btn.className = 'btn-seguir siguiendo';
        btn.innerHTML = '<i class="fas fa-user-check"></i> Siguiendo';
    } else {
        btn.className = 'btn-seguir';
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Seguir';
    }
}

window.toggleSeguir = async function() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnSeguir');
    const esSiguiendo = btn.classList.contains('siguiendo');

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