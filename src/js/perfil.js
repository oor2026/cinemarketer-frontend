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
                window._perfilTotalComentarios = perfil.totalComentarios || 0;
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

        if (miId && String(miId) !== String(perfil.id)) {
            btnSeguir.style.display = 'flex';
            actualizarBtnSeguir(perfil.followStatus);
            if (btnBanner) btnBanner.style.display = 'none';
            if (btnEditBio) btnEditBio.style.display = 'none';

            // Si perfil privado y no aceptado → ocultar contenido
            if (perfil.esPrivado && perfil.followStatus !== 'ACCEPTED') {
                _mostrarPerfilPrivado();
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
        <div class="perfil-comentario-item">
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
        };

        window.cerrarModalBio = function() {
            document.getElementById('modalEditarBio').style.display = 'none';
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