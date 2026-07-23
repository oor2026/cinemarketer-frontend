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
                setTimeout(() => {
                    if (typeof showToast === 'function') {
                        showToast('info', 'Vista pública de tu perfil — así aparecés ante otros cinéfilos.');
                    }
                }, 600);
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

    // Reset visual por si venía de perfil bloqueado o privado
    document.querySelectorAll('.perfil-seccion').forEach(s => s.style.display = '');
    document.getElementById('perfilBloqueadoMsg')?.remove();
    document.getElementById('perfilPrivadoMsg')?.remove();
    const btnDes = document.getElementById('btnDesbloquear');
        if (btnDes) btnDes.style.display = 'none';
    const bannerReset = document.querySelector('.perfil-banner');
    if (bannerReset) { bannerReset.style.background = ''; bannerReset.style.backgroundImage = ''; }
    const avatarReset = document.getElementById('perfilAvatar');
    if (avatarReset) { avatarReset.style.background = ''; }

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${userId}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const perfil = await response.json();

        renderIdentidad(perfil);
        renderStats(perfil);
        renderVotaciones(perfil.ultimasVotaciones);
        window._perfilTotalComentarios = perfil.totalComentarios || 0;
        renderComentarios(perfil.ultimosComentarios);

        _comentariosTotal = perfil.totalComentarios || 0;
        _actualizarNavComentarios();

        cargarPublicacionesPerfil(userId);

    } catch (error) {
            console.error('Error en cargarPerfil:', error);
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

    const miembroEl = document.getElementById('perfilMiembro');
        if (miembroEl) miembroEl.textContent =
            perfil.miembroDesde ? `Miembro desde ${perfil.miembroDesde}` : '';

    // Bio
        const bioEl = document.getElementById('perfilBio');
        const bioTitulo = document.getElementById('perfilBioTitulo');
        const bioTexto = document.getElementById('perfilBioTexto');
        if (bioEl && (perfil.bioTitulo || perfil.bioTexto)) {
            if (bioTitulo) bioTitulo.textContent = perfil.bioTitulo || '';
            if (bioTexto) bioTexto.textContent = perfil.bioTexto || '';
            bioEl.style.display = 'block';
        }

        const miId = localStorage.getItem('userId');
        const btnSeguir = document.getElementById('btnSeguir');
        const btnBanner = document.getElementById('btnCambiarBanner');
        const btnEditBio = document.getElementById('btnEditarBio');

        const btnBloquearPerfil = document.getElementById('btnBloquearPerfil');

                if (miId && String(miId) !== String(perfil.id)) {
                    if (btnBanner) btnBanner.style.display = 'none';
                    if (btnEditBio) btnEditBio.style.display = 'none';
                    if (btnBloquearPerfil && !perfil.bloqueado) btnBloquearPerfil.style.display = 'flex';

                if (perfil.bloqueado) {
                    if (btnSeguir) btnSeguir.style.display = 'none';
                    _mostrarPerfilBloqueado(perfil.bloqueadoPorMi);
                } else if (perfil.esPrivado && perfil.followStatus !== 'ACCEPTED') {
                    btnSeguir.style.display = 'flex';
                    actualizarBtnSeguir(perfil.followStatus);
                    _mostrarPerfilPrivado();
                } else {
                    btnSeguir.style.display = 'flex';
                    actualizarBtnSeguir(perfil.followStatus);
                }
            } else {
            if (btnSeguir) btnSeguir.style.display = 'none';
            if (btnBanner) btnBanner.style.display = 'block';
            if (btnEditBio) btnEditBio.style.display = 'inline-flex';
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
    <div class="perfil-voto-item" title="${v.movieTitle || ''}"
         onclick="window._abrirPeliculaDesdePerfil(${v.movieId})"
         style="cursor:pointer;">
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
    _comentariosTotal = window._perfilTotalComentarios || comentarios?.length || 0;

    const seccion = document.getElementById('perfilComentariosList');
    if (!comentarios || comentarios.length === 0) {
        seccion.innerHTML = '<div class="perfil-vacio">Sin comentarios aún</div>';
        return;
    }

    const esMobile = window.innerWidth <= 600;

    if (esMobile) {
        seccion.innerHTML = `
            <div class="perfil-comentarios-swipe" id="perfilComentariosSwipe"></div>
            <div class="perfil-comentarios-dots" id="perfilComentariosDots"></div>
        `;
        _renderSwipeComentarios(comentarios);
    } else {
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
        _actualizarNavComentarios();
    }
}

function _comentarioItemHTML(c) {
    const textoClass = c.spoiler ? 'perfil-comentario-texto spoiler' : 'perfil-comentario-texto';
    const spoilerTag = c.spoiler ? '<span class="perfil-tag-spoiler">spoiler</span>' : '';
    const poster = c.posterPath
        ? `<img src="https://image.tmdb.org/t/p/w92${c.posterPath}" alt="${c.movieTitle || ''}" style="width:100%;height:100%;object-fit:cover;">`
        : `<i class="fas fa-film"></i>`;
    const banco      = c.bancoCount       || 0;
    const merece     = c.merecePuntoCount || 0;
    const respuestas = c.replyCount       || 0;
    const uid        = `cmnt-${c.commentId}`;

    const CHARS_LIMIT = window.innerWidth <= 600 ? 150 : 300;
    const contenido   = c.contenido || '';
    const esMuyLargo = contenido.length > CHARS_LIMIT;
    const textoCorto = esMuyLargo ? contenido.substring(0, CHARS_LIMIT) + '...' : contenido;

    if (esMuyLargo) {
            window[`_verMas_${uid}`] = function(btn) {
                const el = document.getElementById(`txt-${uid}`);
                if (btn.dataset.expanded === '1') {
                    el.textContent = textoCorto;
                    btn.textContent = 'Ver más';
                    btn.dataset.expanded = '0';
                } else {
                    el.textContent = contenido;
                    btn.textContent = 'Ver menos';
                    btn.dataset.expanded = '1';
                }
            };
        }

        const textoHTML = esMuyLargo ? `
            <p class="${textoClass}" id="txt-${uid}">${textoCorto}</p>
            <span class="perfil-ver-mas" onclick="window['_verMas_${uid}'](this)" data-expanded="0">Ver más</span>
        ` : `<p class="${textoClass}">${contenido}</p>`;

    return `
        <div class="perfil-comentario-item"
             onclick="window._abrirPeliculaDesdeComentario(${c.movieId}, ${c.commentId}, ${c.spoiler || false})"
             style="cursor:pointer;">
            <div class="perfil-comentario-poster">${poster}</div>
            <div class="perfil-comentario-body">
                <p class="perfil-comentario-pelicula">${c.movieTitle || 'Película no disponible'}</p>
                ${textoHTML}
                <div class="perfil-comentario-meta">
                    <span>${c.fechaRelativa || ''}</span>
                    ${spoilerTag}
                </div>
                <div class="perfil-comentario-reacciones">
                    <span title="Te banco"><i class="fas fa-thumbs-up"></i> ${banco}</span>
                    <span title="Merecés un punto"><i class="fas fa-star"></i> ${merece}</span>
                    <span title="Respuestas"><i class="fas fa-reply"></i> ${respuestas}</span>
                </div>
            </div>
        </div>`;
}

function _buildSlideHTML(grupo) {
    return `<div class="perfil-swipe-slide">${grupo.map(c => _comentarioItemHTML(c)).join('')}</div>`;
}

async function _renderSwipeComentarios(comentarios) {
    const swipe = document.getElementById('perfilComentariosSwipe');
    const dots  = document.getElementById('perfilComentariosDots');
    if (!swipe) return;

    // Cargar todas las páginas disponibles
    let todos = [...comentarios];
    const totalPags = Math.ceil(_comentariosTotal / _comentariosSize);
    const token = localStorage.getItem('token');

    for (let p = 1; p < totalPags; p++) {
        try {
            const res = await fetch(
                `${CONFIG.API_URL}/users/${perfilUsuarioId}/comentarios?page=${p}&size=${_comentariosSize}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!res.ok) break;
            const data = await res.json();
            todos = [...todos, ...data.comentarios];
        } catch(e) { break; }
    }

    // Agrupar de a 5
    const grupos = [];
    for (let i = 0; i < todos.length; i += _comentariosSize) {
        grupos.push(todos.slice(i, i + _comentariosSize));
    }

    swipe.innerHTML = grupos.map(g => _buildSlideHTML(g)).join('');

    // Dots
    const totalGrupos = grupos.length;

        const _actualizarDots = (idx) => {
            if (!dots) return;
            if (totalGrupos <= 1) { dots.innerHTML = ''; return; }

            const maxDots = totalGrupos === 2 ? 2 : 3;
            let activoDot;
            if (idx === 0) activoDot = 0;
            else if (idx >= totalGrupos - 1) activoDot = maxDots - 1;
            else activoDot = maxDots === 2 ? 1 : 1;

            dots.innerHTML = Array.from({length: maxDots}, (_, i) =>
                `<span class="perfil-dot${i === activoDot ? ' active' : ''}"></span>`
            ).join('');
        };
        _actualizarDots(0);

        swipe.addEventListener('scroll', () => {
            const idx = Math.round(swipe.scrollLeft / swipe.offsetWidth);
            _actualizarDots(idx);
        }, { passive: true });
}

function _renderItemsComentarios(comentarios) {
    const lista = document.getElementById('perfilComentariosItems');
    if (!lista) return;
    lista.innerHTML = comentarios.map(c => _comentarioItemHTML(c)).join('');
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
    const esMobile = window.innerWidth <= 600;
    if (esMobile) return;

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
function actualizarBtnSeguir(followStatus) {
    const btn = document.getElementById('btnSeguir');
    if (!btn) return;
    if (followStatus === 'ACCEPTED') {
        btn.className = 'btn-seguir';
        btn.innerHTML = '<i class="fas fa-user-check" style="color:#1a3a6b;"></i> <span style="color:#1a3a6b;">Siguiendo</span>';
    } else if (followStatus === 'PENDING') {
        btn.className = 'btn-seguir';
        btn.innerHTML = '<i class="fas fa-clock" style="color:#888;"></i> <span style="color:#888;">Invitación enviada</span>';
    } else {
        btn.className = 'btn-seguir';
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Seguir';
    }
}

window.toggleSeguir = async function() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnSeguir');
    const esSiguiendo = btn.querySelector('.fa-user-check') !== null;
    const esPendiente = btn.querySelector('.fa-clock') !== null;

    if (esPendiente) return; // No hacer nada si está pendiente

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
        actualizarBtnSeguir(data.status);
        if (data.followersCount !== undefined) {
            document.getElementById('perfilSeguidores').textContent = data.followersCount;
        }
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

        // Recargar perfil completo para reflejar estado privado
        await cargarPerfil(perfilUsuarioId);

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

        // ==============================================
        // BIO — MODAL EDITAR
        // ==============================================
        window.abrirModalBio = function() {
            const titulo = document.getElementById('perfilBioTitulo')?.textContent || '';
            const texto  = document.getElementById('perfilBioTexto')?.textContent || '';

            document.getElementById('inputBioTitulo').value = titulo;
            document.getElementById('inputBioTexto').value  = texto;
            _actualizarContadoresBio();

            document.getElementById('modalEditarBio').style.display = 'flex';
                document.body.classList.add('modal-open');
            };

            window.cerrarModalBio = function() {
                document.getElementById('modalEditarBio').style.display = 'none';
                document.body.classList.remove('modal-open');
            };

        window._actualizarContadoresBio = function _actualizarContadoresBio() {
            const t = document.getElementById('inputBioTitulo')?.value.length || 0;
            const d = document.getElementById('inputBioTexto')?.value.length  || 0;
            const ct = document.getElementById('contadorBioTitulo');
            const cd = document.getElementById('contadorBioTexto');
            if (ct) ct.textContent = `${t}/50`;
            if (cd) cd.textContent = `${d}/180`;
        }

        window.guardarBio = async function() {
            const bioTitulo = document.getElementById('inputBioTitulo')?.value.trim() || '';
            const bioTexto  = document.getElementById('inputBioTexto')?.value.trim()  || '';

            if (bioTitulo.length > 50)  { alert('El título no puede superar los 50 caracteres.'); return; }
            if (bioTexto.length  > 180) { alert('La descripción no puede superar los 180 caracteres.'); return; }

            const btn = document.getElementById('btnGuardarBio');
            if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${CONFIG.API_URL}/users/me/bio`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ bioTitulo, bioTexto })
                });

                if (!res.ok) throw new Error();

                // Actualizar visualmente sin recargar
                const bioEl     = document.getElementById('perfilBio');
                const tituloEl  = document.getElementById('perfilBioTitulo');
                const textoEl   = document.getElementById('perfilBioTexto');

                if (bioTitulo || bioTexto) {
                    if (tituloEl) tituloEl.textContent = bioTitulo;
                    if (textoEl)  textoEl.textContent  = bioTexto;
                    if (bioEl)    bioEl.style.display   = 'block';
                } else {
                    if (bioEl) bioEl.style.display = 'none';
                }

                window.cerrarModalBio();

            } catch(e) {
                alert('Error al guardar la biografía. Intentá de nuevo.');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
            }
        };

        // ==============================================
        // MODAL SEGUIDORES / SEGUIDOS
        // ==============================================
        let _seguidoresList = [];

        window.abrirModalSeguidores = async function(tipo) {
            const modal  = document.getElementById('modalSeguidores');
            const titulo = document.getElementById('modalSeguidoresTitulo');
            const lista  = document.getElementById('listaSeguidores');
            const buscar = document.getElementById('buscarSeguidor');

            titulo.textContent = tipo === 'seguidores' ? 'Seguidores' : 'Seguidos';
            buscar.value = '';
            lista.innerHTML = '<div style="text-align:center;color:#ccc;padding:2rem;"><i class="fas fa-spinner fa-spin"></i></div>';
            modal.style.display = 'flex';

            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/users/${perfilUsuarioId}/${tipo}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                _seguidoresList = await res.json();
                _renderListaSeguidores(_seguidoresList);
            } catch(e) {
                lista.innerHTML = '<div style="text-align:center;color:#e50914;padding:2rem;">Error al cargar</div>';
            }
        };

        window.cerrarModalSeguidores = function() {
            document.getElementById('modalSeguidores').style.display = 'none';
            _seguidoresList = [];
        };

        window.filtrarSeguidores = function(query) {
            const filtrado = _seguidoresList.filter(u =>
                u.nombre.toLowerCase().includes(query.toLowerCase())
            );
            _renderListaSeguidores(filtrado);
        };

        function _renderListaSeguidores(usuarios) {
            const lista = document.getElementById('listaSeguidores');
            if (!usuarios.length) {
                lista.innerHTML = '<div style="text-align:center;color:#ccc;padding:2rem;">Sin resultados</div>';
                return;
            }
            lista.innerHTML = usuarios.map(u => {
                const avatar = u.avatarUrl
                    ? `<img src="${u.avatarUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
                    : `<div style="width:40px;height:40px;border-radius:50%;background:#324C89;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.9rem;">${u.nombre?.charAt(0) || 'U'}</div>`;
                return `
                    <div onclick="window.cerrarModalSeguidores(); window.abrirPerfilUsuario(${u.id})"
                        style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.5rem;border-radius:8px;cursor:pointer;transition:background 0.15s;"
                        onmouseover="this.style.background='#f5f5f5'"
                        onmouseout="this.style.background='none'">
                        ${avatar}
                        <div>
                            <p style="margin:0;font-size:0.9rem;font-weight:600;color:#333;">${u.nombre}</p>
                            <p style="margin:0;font-size:0.75rem;color:#aaa;">${u.nivel}</p>
                        </div>
                    </div>`;
            }).join('');
        }

        // ==============================================
        // PERFIL PRIVADO
        // ==============================================
        function _mostrarPerfilPrivado() {
            // Ocultar secciones de contenido
            document.querySelectorAll('.perfil-seccion').forEach(s => s.style.display = 'none');

            // Ocultar banner y avatar
            const banner = document.querySelector('.perfil-banner');
            if (banner) {
                banner.style.background = '#e0e0e0';
                banner.style.backgroundImage = 'none';
            }
            const avatar = document.getElementById('perfilAvatar');
            if (avatar) {
                avatar.innerHTML = '';
                avatar.style.background = '#ccc';
            }

            // Ocultar seguidores y seguidos — quitar clickeable y mostrar solo números sin modal
            const statsClickables = document.querySelectorAll('.perfil-stat-clickable');
            statsClickables.forEach(s => {
                s.classList.remove('perfil-stat-clickable');
                s.style.cursor = 'default';
                s.style.color = '';
                s.onclick = null;
            });

            // Mostrar seguidores/seguidos pero sin clickeable ni modal
            const seguidoresEl = document.getElementById('perfilSeguidores');
            const siguiendoEl  = document.getElementById('perfilSiguiendo');
            if (seguidoresEl) seguidoresEl.textContent = '—';
            if (siguiendoEl)  siguiendoEl.textContent  = '—';

            // Insertar mensaje de perfil privado
            const card = document.getElementById('perfilContenido');
            const existente = document.getElementById('perfilPrivadoMsg');
            if (existente) return;

            const msg = document.createElement('div');
            msg.id = 'perfilPrivadoMsg';
            msg.style.cssText = 'text-align:center; padding:3rem 1.5rem; color:#888;';
            msg.innerHTML = `
                <div style="font-size:2.5rem; margin-bottom:1rem;">🔒</div>
                <p style="font-size:1rem; font-weight:600; color:#333; margin:0 0 0.5rem;">Este perfil es privado</p>
                <p style="font-size:0.88rem; color:#aaa; margin:0 0 1.5rem; line-height:1.6;">
                    Para ver el contenido de este perfil,<br>enviá una invitación y esperá que sea aceptada.
                </p>
            `;
            card.appendChild(msg);
                    }

            window.desbloquearUsuario = function() {
                document.getElementById('modalDesbloquear').style.display = 'flex';
            };

            window.confirmarDesbloquear = async function() {
                document.getElementById('modalDesbloquear').style.display = 'none';
                const token = localStorage.getItem('token');
                try {
                    const res = await fetch(`${CONFIG.API_URL}/users/${perfilUsuarioId}/unblock`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) return;

                    const btnDesbloquear = document.getElementById('btnDesbloquear');
                    if (btnDesbloquear) btnDesbloquear.style.display = 'none';
                    document.getElementById('perfilBloqueadoMsg')?.remove();
                    await cargarPerfil(perfilUsuarioId);
                } catch(e) {}
            };

        function _mostrarPerfilBloqueado(bloqueadoPorMi) {
            // Ocultar secciones
            document.querySelectorAll('.perfil-seccion').forEach(s => s.style.display = 'none');

            // Ocultar bio, stats clickeables
            const bioEl = document.getElementById('perfilBio');
            if (bioEl) bioEl.style.display = 'none';

            const statsClickables = document.querySelectorAll('.perfil-stat-clickable');
            statsClickables.forEach(s => {
                s.onclick = null;
                s.style.cursor = 'default';
            });

            // Ocultar números de seguidores/seguidos
            const segEl = document.getElementById('perfilSeguidores')?.closest('.perfil-stat-inline');
            const sigEl = document.getElementById('perfilSiguiendo')?.closest('.perfil-stat-inline');
            if (segEl) segEl.style.display = 'none';
            if (sigEl) sigEl.style.display = 'none';

            // Ocultar votaciones y comentarios stats
            const votEl = document.getElementById('perfilVotaciones')?.closest('.perfil-stat-inline');
            const comEl = document.getElementById('perfilComentarios')?.closest('.perfil-stat-inline');
            if (votEl) votEl.style.display = 'none';
            if (comEl) comEl.style.display = 'none';

            // Ocultar banner y avatar
            const banner = document.querySelector('.perfil-banner');
            if (banner) {
                banner.style.background = '#e0e0e0';
                banner.style.backgroundImage = 'none';
            }
            const avatar = document.getElementById('perfilAvatar');
            if (avatar) {
                avatar.innerHTML = '';
                avatar.style.background = '#ccc';
            }

            // Mensaje central
            const card = document.getElementById('perfilContenido');
            const existente = document.getElementById('perfilBloqueadoMsg');
            if (existente) return;

            const msg = document.createElement('div');
                        msg.id = 'perfilBloqueadoMsg';
                        msg.style.cssText = 'text-align:center; padding:3rem 1.5rem; color:#888;';
                        msg.innerHTML = bloqueadoPorMi ? `
                                <div style="font-size:2.5rem; margin-bottom:1rem;">🚫</div>
                                <p style="font-size:1rem; font-weight:600; color:#333; margin:0 0 0.5rem;">Bloqueaste a este usuario</p>
                                <p style="font-size:0.88rem; color:#aaa; margin:0 0 1.5rem; line-height:1.6;">
                                    No podés ver el contenido de este perfil.
                                </p>
                            ` : `
                            <div style="font-size:2.5rem; margin-bottom:1rem;">🚫</div>
                            <p style="font-size:1rem; font-weight:600; color:#333; margin:0 0 0.5rem;">No podés ver este perfil</p>
                            <p style="font-size:0.88rem; color:#aaa; margin:0 0 1.5rem; line-height:1.6;">
                                Este usuario no permite que veas su contenido.
                            </p>
                        `;
                        card.appendChild(msg);

                        if (bloqueadoPorMi) {
                            const btnDesbloquear = document.getElementById('btnDesbloquear');
                            if (btnDesbloquear) btnDesbloquear.style.display = 'flex';
                        }
                    }

                    window.desbloquearUsuario = async function() {
                        const token = localStorage.getItem('token');
                        try {
                            const res = await fetch(`${CONFIG.API_URL}/users/${perfilUsuarioId}/unblock`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) return;

                            const btnDes = document.getElementById('btnDesbloquear');
                                if (btnDes) btnDes.style.display = 'none';
                            document.getElementById('perfilBloqueadoMsg')?.remove();
                            await cargarPerfil(perfilUsuarioId);
                        } catch(e) {}
                    };
// ==============================================
// BLOQUEAR DESDE PERFIL
// ==============================================
window.abrirModalBloquearPerfil = function() {
    const nombre = document.getElementById('perfilNombre')?.textContent || 'este usuario';
    document.getElementById('bloquearNombrePerfil').textContent = nombre;
    const chk = document.getElementById('checkReportarAlBloquearPerfil');
    if (chk) chk.checked = false;
    document.getElementById('modalBloquearPerfil').style.display = 'flex';
};

window.cerrarModalBloquearPerfil = function() {
    document.getElementById('modalBloquearPerfil').style.display = 'none';
};

window.confirmarBloquearPerfil = async function() {
    const token = localStorage.getItem('token');
    const reportar = document.getElementById('checkReportarAlBloquearPerfil')?.checked || false;

    const btn = document.getElementById('btnConfirmarBloquearPerfil');
    if (btn) { btn.disabled = true; btn.textContent = 'Bloqueando...'; }

    try {
        const res = await fetch(`${CONFIG.API_URL}/users/${perfilUsuarioId}/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reportar, reason: reportar ? 'Reportado al bloquear' : null })
        });
        if (!res.ok) throw new Error();

        window.cerrarModalBloquearPerfil();
        await cargarPerfil(perfilUsuarioId);

    } catch(e) {
        alert('Error al bloquear. Intentá de nuevo.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sí, bloquear'; }
    }
};

window._abrirPeliculaDesdePerfil = async function(movieId) {
    if (!movieId) return;

    if (typeof window._asegurarModalPeliculaEnDOM === 'function') {
        await window._asegurarModalPeliculaEnDOM();
    }
    if (typeof window.abrirDetallePelicula === 'function') {
        window.abrirDetallePelicula(movieId);
    }
};

window._abrirPeliculaDesdeComentario = async function(movieId, commentId, esSpoiler) {
    if (!movieId) return;

    // Asegurar que el modal de película esté disponible, sin reemplazar la vista actual
    if (typeof window._asegurarModalPeliculaEnDOM === 'function') {
        await window._asegurarModalPeliculaEnDOM();
    }

    if (typeof window.abrirDetallePelicula !== 'function') return;

    // Activar modo spoiler si corresponde
    if (esSpoiler && typeof window.activarModoSpoiler === 'function') {
        window.modoSpoilerActivo = true;
    }
 console.log('[DEBUG] movieId:', movieId, 'commentId:', commentId, 'tipo:', typeof commentId);
    window.abrirDetallePelicula(movieId);
console.log('[DEBUG] if commentId?', !!commentId);
    if (commentId) {
            setTimeout(async () => {
                if (esSpoiler && typeof window.activarModoSpoiler === 'function') {
                    window.activarModoSpoiler(true);
                }
                await new Promise(r => setTimeout(r, 600));

                // En mobile, ir al slide de datos donde están los comentarios
                if (typeof window.irASlide === 'function') {
                    window.irASlide(1);
                    await new Promise(r => setTimeout(r, 400));
                }

               // Esperar a que los comentarios carguen en el modal
               let intentos = 0;
               const buscarYResaltar = () => {
                   const comentarioEl = document.getElementById(`comment-${commentId}`);
                   console.log(`[intento ${intentos}] comment-${commentId}:`, comentarioEl);
                   if (comentarioEl) {
                       const scrollContainer = document.querySelector('#modalPelicula .modal-body')
                                           || document.querySelector('#modalPelicula .modal-contenido');
                       console.log('scrollContainer:', scrollContainer);
                               console.log('scrollContainer.scrollHeight:', scrollContainer?.scrollHeight);
                               console.log('scrollContainer.clientHeight:', scrollContainer?.clientHeight);
                               console.log('comentarioEl.getBoundingClientRect():', comentarioEl.getBoundingClientRect());

                       if (scrollContainer) {
                           const containerRect = scrollContainer.getBoundingClientRect();
                           const elRect = comentarioEl.getBoundingClientRect();
                           const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - (scrollContainer.clientHeight / 2) + (elRect.height / 2);
                           scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
                       } else {
                           comentarioEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                       }
                       comentarioEl.style.transition = 'none';
                      comentarioEl.style.background = '#ffe066';
                      comentarioEl.style.borderRadius = '8px';
                      comentarioEl.style.outline = '2px solid #e50914';
                      setTimeout(() => {
                          comentarioEl.style.transition = 'background 0.8s, outline 0.8s';
                          comentarioEl.style.background = '';
                          comentarioEl.style.outline = '';
                      }, 1500);
                   } else if (intentos < 10) {
                       intentos++;
                       setTimeout(buscarYResaltar, 300);
                   }
               };
               buscarYResaltar();
            }, 800);
        }
};
// ==============================================
// PUBLICACIONES EN COMUNIDAD — PERFIL
// ==============================================
async function cargarPublicacionesPerfil(userId) {
    const lista = document.getElementById('perfilPublicacionesList');
    if (!lista) return;

    try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${CONFIG.API_URL}/publications/user/${userId}?page=0&size=9`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            const pubs = data.content || [];

            if (pubs.length === 0) {
                lista.innerHTML = '<div class="perfil-vacio">Todavía no hay publicaciones.</div>';
                return;
            }

            lista.innerHTML = `<div class="perfil-pub-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
                        ${pubs.map(pub => renderTilePublicacionPerfil(pub)).join('')}
                    </div>`;

                        // Botón ver más si hay más de 9 — abre la vista completa con scroll infinito
                        if (!data.last) {
                            lista.insertAdjacentHTML('beforeend', `
                                <div style="text-align:center;padding:0.75rem;">
                                    <span onclick="window.abrirTodasLasPublicacionesPerfil(${userId})"
                                          style="font-size:0.82rem;color:#324C89;cursor:pointer;font-weight:600;">
                                        Ver todas las publicaciones →
                                    </span>
                                </div>`);
                        }

            // Cargar contadores reales (banco + comentarios) de cada tile
            pubs.forEach(pub => cargarContadoresTilePerfil(pub.id));

            } catch(e) {
                const lista = document.getElementById('perfilPublicacionesList');
                if (lista) lista.innerHTML = '<div class="perfil-vacio">No se pudieron cargar las publicaciones.</div>';
            }
        }

        // Paleta, ícono y nombre por territorio — el label usa la misma
        // redacción que el formulario de creación ("¿De qué va tu publicación?"),
        // para que el usuario reconozca la categoría de un vistazo.
        function estiloTerritorioPerfil(key) {
            const map = {
                PELICULAS_SERIES: { bg: '#eef1fb', text: '#324C89', icon: 'fa-film', label: 'Películas y series' },
                LO_QUE_VIENE:     { bg: '#f5eefc', text: '#6b3fa0', icon: 'fa-calendar-alt', label: 'Lo que se viene' },
                GENTE_CINE:       { bg: '#fff4e5', text: '#b06a00', icon: 'fa-theater-masks', label: 'Gente de cine' },
                PREMIOS:          { bg: '#eafaf0', text: '#1e8a4c', icon: 'fa-trophy', label: 'Premios y reconocimientos' },
                INDUSTRIA:        { bg: '#fff0f0', text: '#c0392b', icon: 'fa-dollar-sign', label: 'Industria y negocio' },
                EXPERIENCIA:      { bg: '#e8f6f3', text: '#0f7a68', icon: 'fa-couch', label: 'La experiencia cinéfila' },
                ARTE_CULTURA:     { bg: '#f5eefc', text: '#6b3fa0', icon: 'fa-graduation-cap', label: 'Arte y cultura' },
                EVENTOS:          { bg: '#fdeef5', text: '#b0316b', icon: 'fa-users', label: 'Eventos y comunidad' }
            };
            return map[key] || { bg: '#f2f2f2', text: '#666', icon: 'fa-comment-alt', label: 'Publicación' };
        }

        function escapeHtmlPerfil(str) {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function renderTilePublicacionPerfil(pub) {
                    const tieneImagen = pub.imageUrls && pub.imageUrls.length > 0;
                    // Igual criterio que el feed público: el video solo se considera
                    // "visible" cuando ya está aprobado (videoUrl se completa recién
                    // ahí). videoUid solo, sin videoUrl, significa que el video
                    // todavía está pendiente/procesando — no corresponde mostrarlo.
                    const tieneVideo = !!pub.videoUid && !!pub.videoUrl;

                    if (tieneVideo) {
                        return `
                            <div class="perfil-pub-tile" data-perfil-pub-id="${pub.id}" onclick="window.abrirPublicacionDesdePerfi(${pub.id})"
                                style="aspect-ratio:1;border-radius:8px;overflow:hidden;position:relative;cursor:pointer;background:#000;">
                                <img src="https://videodelivery.net/${pub.videoUid}/thumbnails/thumbnail.jpg" alt=""
                                     style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;opacity:0.85;">
                                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                                    <div style="width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,0.5);
                                                display:flex;align-items:center;justify-content:center;">
                                        <i class="fas fa-play" style="color:white;font-size:0.9rem;margin-left:2px;"></i>
                                    </div>
                                </div>
                                <div style="position:absolute;top:6px;right:6px;color:white;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));">
                                    <i class="fas fa-video" style="font-size:0.8rem;"></i>
                                </div>
                                <div class="perfil-pub-overlay"
                                 style="position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;
                                        justify-content:center;gap:14px;opacity:0;transition:opacity .15s;">
                                <span style="color:white;font-size:0.8rem;font-weight:600;">
                                    <i class="fas fa-thumbs-up"></i> <span id="perfilPubBanco-${pub.id}">0</span>
                                </span>
                                <span style="color:white;font-size:0.8rem;font-weight:600;">
                                    <i class="fas fa-comment"></i> <span id="perfilPubComent-${pub.id}">0</span>
                                </span>
                                <span style="color:white;font-size:0.8rem;font-weight:600;">
                                    <i class="fas fa-star"></i> <span id="perfilPubPunto-${pub.id}">0</span>
                                </span>
                            </div>
                        </div>`;
                }

                    if (tieneImagen) {
                return `
                    <div class="perfil-pub-tile" data-perfil-pub-id="${pub.id}" onclick="window.abrirPublicacionDesdePerfi(${pub.id})"
                        style="aspect-ratio:1;border-radius:8px;overflow:hidden;position:relative;cursor:pointer;background:#f0f0f0;">
                        <img src="${pub.imageUrls[0]}" alt=""
                             style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">
                        ${pub.imageUrls.length > 1
                            ? `<div style="position:absolute;top:6px;right:6px;color:white;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));">
                                    <i class="fas fa-clone" style="font-size:0.8rem;"></i>
                               </div>` : ''}
                        <div class="perfil-pub-overlay"
                         style="position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;
                                justify-content:center;gap:14px;opacity:0;transition:opacity .15s;">
                        <span style="color:white;font-size:0.8rem;font-weight:600;">
                            <i class="fas fa-thumbs-up"></i> <span id="perfilPubBanco-${pub.id}">0</span>
                        </span>
                        <span style="color:white;font-size:0.8rem;font-weight:600;">
                            <i class="fas fa-star"></i> <span id="perfilPubPunto-${pub.id}">0</span>
                        </span>
                        <span style="color:white;font-size:0.8rem;font-weight:600;">
                            <i class="fas fa-comment"></i> <span id="perfilPubComent-${pub.id}">0</span>
                        </span>
                    </div>
                </div>`;
        }

            const estilo = estiloTerritorioPerfil(pub.territoryGroup);
            const textoTile = pub.spoiler
                ? 'Contiene spoilers'
                : (pub.title || pub.content || '').substring(0, 70) + ((pub.title || pub.content || '').length > 70 ? '...' : '');

            return `
                <div class="perfil-pub-tile" data-perfil-pub-id="${pub.id}" onclick="window.abrirPublicacionDesdePerfi(${pub.id})"
                     style="aspect-ratio:1;border-radius:8px;overflow:hidden;position:relative;cursor:pointer;
                            background:${estilo.bg};display:flex;flex-direction:column;">
                    <div style="padding:8px 10px;text-align:center;">
                        <span style="font-size:0.66rem;font-weight:800;color:${estilo.text};text-transform:uppercase;
                                     letter-spacing:0.3px;">
                            ${estilo.label}
                        </span>
                    </div>
                    <div style="flex:1;padding:10px 14px;display:flex;flex-direction:column;
                                align-items:center;justify-content:center;text-align:center;gap:8px;">
                        <i class="fas ${estilo.icon}" style="font-size:2.2rem;color:${estilo.text};opacity:0.9;"></i>
                        <p style="font-size:0.74rem;font-weight:600;color:${estilo.text};margin:0;line-height:1.3;
                                   display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                            ${escapeHtmlPerfil(textoTile)}
                        </p>
                    </div>
                    <div style="display:flex;justify-content:center;align-items:center;gap:14px;font-size:0.82rem;font-weight:700;color:${estilo.text};">
                        <span style="display:flex;align-items:center;"><i class="fas fa-thumbs-up" style="margin-right:4px;"></i><span id="perfilPubBanco-${pub.id}">0</span></span>
                        <span style="display:flex;align-items:center;"><i class="fas fa-comment" style="margin-right:4px;"></i><span id="perfilPubComent-${pub.id}">0</span></span>
                        <span style="display:flex;align-items:center;"><i class="fas fa-star" style="margin-right:4px;"></i><span id="perfilPubPunto-${pub.id}">0</span></span>
                    </div>
                </div>`;
        }

        async function cargarContadoresTilePerfil(pubId) {
                    try {
                        const token = localStorage.getItem('token');
                        const [reacRes, comentRes] = await Promise.all([
                            fetch(`${CONFIG.API_URL}/publications/${pubId}/reactions/count`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            }),
                            fetch(`${CONFIG.API_URL}/publications/${pubId}/comments/count`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                        ]);
                        if (reacRes.ok) {
                            const counts = await reacRes.json();
                            const elBanco = document.getElementById(`perfilPubBanco-${pubId}`);
                            if (elBanco) elBanco.textContent = counts.banco || 0;
                            const elPunto = document.getElementById(`perfilPubPunto-${pubId}`);
                            if (elPunto) elPunto.textContent = counts.punto || 0;
                        }
                        if (comentRes.ok) {
                            const dataC = await comentRes.json();
                            const el = document.getElementById(`perfilPubComent-${pubId}`);
                            if (el) el.textContent = dataC.count || 0;
                        }
                    } catch(e) {}
                }

                // ==============================================
                // TODAS LAS PUBLICACIONES — pantalla completa con scroll infinito
                // ==============================================
                let _perfilPubsFullState = null;

                window.abrirTodasLasPublicacionesPerfil = function(userId) {
                    let overlay = document.getElementById('perfilPubsOverlay');
                    if (overlay) overlay.remove();

                    const nombreUsuario = document.getElementById('perfilNombre')?.textContent?.trim() || 'este usuario';

                    overlay = document.createElement('div');
                    overlay.id = 'perfilPubsOverlay';
                    overlay.style.cssText = 'position:fixed;inset:0;background:white;z-index:999999;overflow-y:auto;';
                    const esMobile = window.innerWidth <= 768;
                    const primerNombre = nombreUsuario.split(' ')[0];
                    const textoVolver = esMobile ? '←' : '← Volver';
                    const textoNombre = esMobile ? primerNombre : nombreUsuario;
                    const colsHeader = esMobile ? '36px 1fr 36px' : '90px 1fr 90px';

                    overlay.innerHTML = `
                        <div style="position:sticky;top:0;background:#324C89;padding:0.75rem 1.25rem;
                                    display:grid;grid-template-columns:${colsHeader};align-items:center;z-index:2;">
                            <a href="javascript:void(0)" onclick="window.cerrarTodasLasPublicacionesPerfil()"
                               style="color:white;font-size:${esMobile ? '1.3rem' : '0.88rem'};font-weight:700;
                                      text-decoration:none;line-height:1;white-space:nowrap;">
                                ${textoVolver}
                            </a>
                            <h2 style="margin:0;font-size:0.9rem;font-weight:600;color:white;text-align:center;
                                       text-transform:uppercase;letter-spacing:0.5px;overflow:hidden;
                                       text-overflow:ellipsis;white-space:nowrap;">
                                <i class="fas fa-pen-alt" style="color:#e50914;"></i> Publicaciones de ${escapeHtmlPerfil(textoNombre)}
                            </h2>
                            <span></span>
                        </div>
                        <div style="max-width:900px;margin:0 auto;padding:1.25rem;">
                            <div id="perfilPubsGridFull" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;"></div>
                            <div id="perfilPubsFullLoading" style="text-align:center;padding:1.5rem;color:#ccc;">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                            <div id="perfilPubsFullFin" style="display:none;text-align:center;padding:1.5rem;color:#bbb;font-size:0.85rem;">
                                Ya viste todas las publicaciones.
                            </div>
                        </div>`;

                    document.body.appendChild(overlay);
                    document.body.style.overflow = 'hidden';

                    _perfilPubsFullState = { userId, page: 0, size: 21, loading: false, hasMore: true };
                    cargarPaginaPublicacionesFull();

                    const sentinel = document.getElementById('perfilPubsFullLoading');
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && _perfilPubsFullState.hasMore && !_perfilPubsFullState.loading) {
                            cargarPaginaPublicacionesFull();
                        }
                    }, { root: overlay, rootMargin: '200px' });
                    observer.observe(sentinel);
                    overlay._observer = observer;
                };

                window.cerrarTodasLasPublicacionesPerfil = function() {
                    const overlay = document.getElementById('perfilPubsOverlay');
                    if (overlay) {
                        if (overlay._observer) overlay._observer.disconnect();
                        overlay.remove();
                    }
                    document.body.style.overflow = '';
                };

                async function cargarPaginaPublicacionesFull() {
                    if (!_perfilPubsFullState || _perfilPubsFullState.loading || !_perfilPubsFullState.hasMore) return;
                    _perfilPubsFullState.loading = true;

                    const grid = document.getElementById('perfilPubsGridFull');
                    const loadingEl = document.getElementById('perfilPubsFullLoading');
                    const finEl = document.getElementById('perfilPubsFullFin');
                    if (!grid) { _perfilPubsFullState.loading = false; return; }

                    try {
                        const token = localStorage.getItem('token');
                        const { userId, page, size } = _perfilPubsFullState;
                        const res = await fetch(
                            `${CONFIG.API_URL}/publications/user/${userId}?page=${page}&size=${size}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        if (!res.ok) throw new Error();
                        const data = await res.json();
                        const pubs = data.content || [];

                        pubs.forEach(pub => {
                            grid.insertAdjacentHTML('beforeend', renderTilePublicacionPerfil(pub));
                            cargarContadoresTilePerfil(pub.id);
                        });

                        _perfilPubsFullState.hasMore = !data.last;
                        _perfilPubsFullState.page++;

                        if (!_perfilPubsFullState.hasMore) {
                            if (loadingEl) loadingEl.style.display = 'none';
                            if (finEl) finEl.style.display = 'block';
                        }
                    } catch(e) {
                        if (loadingEl) loadingEl.innerHTML = '<span style="color:#e50914;font-size:0.85rem;">Error al cargar más publicaciones.</span>';
                    } finally {
                        _perfilPubsFullState.loading = false;
                    }
                }

        window.abrirPublicacionDesdePerfi = function(pubId) {
        if (typeof window.abrirPublicacion === 'function') {
            window.abrirPublicacion(pubId);
        } else {
            window.open(`/publicacion?id=${pubId}`, '_blank');
        }
    };

function tiempoRelativoPerfil(fechaStr) {
    if (!fechaStr) return '';
    const diff = Math.floor((Date.now() - new Date(fechaStr).getTime()) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
    return new Date(fechaStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatTeritorioPerfil(key) {
    const map = {
        PELICULAS_SERIES: '🎬 Películas',
        LO_QUE_VIENE: '📅 Estrenos',
        GENTE_CINE: '🎭 Gente de cine',
        PREMIOS: '🏆 Premios',
        INDUSTRIA: '💰 Industria',
        EXPERIENCIA: '🍿 Experiencia',
        ARTE_CULTURA: '🎓 Arte y cultura',
        EVENTOS: '🎪 Eventos'
    };
    return map[key] || key;
}