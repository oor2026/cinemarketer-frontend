// ==============================================
// perfil.js — Perfil público de usuario
// ==============================================

let perfilUsuarioId = null;

// ==============================================
// INICIALIZACIÓN
// ==============================================
// ==============================================
// MODO OSCURO — apagado por defecto. El diseño que
// construimos (fondo oscuro, glow rojo/azul) queda guardado
// atrás de este toggle; por defecto se ve la versión clara.
// ==============================================
window._toggleModoOscuro = function() {
    const card = document.getElementById('perfilContenido');
    if (!card) return;
    const activo = card.classList.toggle('modo-oscuro');
    localStorage.setItem('perfilModoOscuro', activo ? '1' : '0');
    document.querySelectorAll('#btnTemaToggle i, #btnFabTema i').forEach(icon => {
        icon.className = activo ? 'fas fa-sun' : 'fas fa-moon';
    });
};

window._aplicarModoOscuroGuardado = function() {
    const card = document.getElementById('perfilContenido');
    if (!card) return;
    const activo = localStorage.getItem('perfilModoOscuro') === '1';
    card.classList.toggle('modo-oscuro', activo);
    document.querySelectorAll('#btnTemaToggle i, #btnFabTema i').forEach(icon => {
        icon.className = activo ? 'fas fa-sun' : 'fas fa-moon';
    });
};

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
            // Se piden en paralelo, no en cadena: el ADN Cinéfilo (pesado)
            // ya no viene adentro de /profile, así que no bloquea el
            // primer pintado del resto de Mi Sala.
            const [response, adnResponse] = await Promise.all([
                fetch(`${CONFIG.API_URL}/users/${userId}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${CONFIG.API_URL}/users/${userId}/adn-cinefilo-completo`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!response.ok) throw new Error(`Error ${response.status}`);
            const perfil = await response.json();

            if (adnResponse.ok) {
                const adn = await adnResponse.json();
                perfil.adnCinefilo = adn.adnCinefilo;
                perfil.adnCinefiloSeries = adn.adnCinefiloSeries;
            } else {
                perfil.adnCinefilo = [];
                perfil.adnCinefiloSeries = [];
            }

                       window._aplicarModoOscuroGuardado();

                       window._perfilCounts = {
                            votacionesPeliculas: perfil.totalVotacionesPeliculas,
                            votacionesSeries: perfil.totalVotacionesSeries,
                            comentariosPeliculas: perfil.totalComentariosPeliculas,
                            comentariosSeries: perfil.totalComentariosSeries,
                            recomendadasPeliculas: perfil.totalRecomendadasPeliculas,
                            recomendadasSeries: perfil.totalRecomendadasSeries,
                            guardadasPeliculas: perfil.totalGuardadasPeliculas,
                            guardadasSeries: perfil.totalGuardadasSeries
                        };

                renderIdentidad(perfil);
                        renderStats(perfil);
                        renderVotaciones(perfil.ultimasVotaciones);
                if (typeof window.renderVotacionesSeries === 'function') {
                    window.renderVotacionesSeries(perfil.ultimasVotacionesSeries);
                }
                window._perfilTotalComentarios = perfil.totalComentarios || 0;
                                window._perfilComentariosCache = perfil.ultimosComentarios || [];
                                window._perfilComentariosSerieCache = perfil.ultimosComentariosSeries || [];
                                renderComentariosSerie(window._perfilComentariosSerieCache);
                                renderComentarios(perfil.ultimosComentarios);

                                window._inicializarFadeSpreads();
                                window._seleccionarCriterioActividad(window._actividadCriterioActual);
                                window._inicializarSwipeStacks();
                                window._inicializarModalGustoMobile();

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

    // El banner nunca se aplicaba acá — se guardaba bien en el backend,
    // pero cargarPerfil jamás leía perfil.bannerUrl para pintarlo, así
    // que al recargar la página siempre volvía a verse vacío.
    const bannerEl = document.querySelector('.perfil-banner');
    if (bannerEl && perfil.bannerUrl) {
        bannerEl.style.backgroundImage = `url('${perfil.bannerUrl}')`;
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
                } else if (bioEl) {
                    if (bioTitulo) bioTitulo.textContent = '';
                    if (bioTexto) bioTexto.textContent = 'Aún tengo la tarea de contarte quién soy…';
                    bioEl.style.display = 'block';
                }
        const miId = localStorage.getItem('userId');
        const btnSeguir = document.getElementById('btnSeguir');
        const btnBanner = document.getElementById('btnCambiarBanner');
        const btnEditBio = document.getElementById('btnEditarBio');

        const btnBloquearPerfil = document.getElementById('btnBloquearPerfil');
        const btnEditFavorita = document.getElementById('btnEditarFavorita');
        const btnCambiarAvatar = document.getElementById('btnCambiarAvatar');

                    if (miId && String(miId) !== String(perfil.id)) {
                        // El botón de privacidad (candado) no se pinta acá — el
                        // FAB "Cambiar a Series" baja a ocupar su lugar en vez
                        // de dejar un hueco vacío entre los otros dos.
                        document.querySelector('.perfil-card')?.classList.add('perfil-visitante');
                        if (btnBanner) btnBanner.style.display = 'none';
                        if (btnEditBio) btnEditBio.style.display = 'none';
                        if (btnEditFavorita) btnEditFavorita.style.display = 'none';
                        if (btnCambiarAvatar) btnCambiarAvatar.style.display = 'none';
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
                        document.querySelector('.perfil-card')?.classList.remove('perfil-visitante');
                        if (btnSeguir) btnSeguir.style.display = 'none';
                        if (btnBanner) btnBanner.style.display = 'block';
                        const btnEliminarBanner = document.getElementById('btnEliminarBanner');
                        if (btnEliminarBanner) btnEliminarBanner.style.display = perfil.bannerUrl ? 'flex' : 'none';
                        if (btnEditBio) btnEditBio.style.display = 'inline-flex';
                        const btnCandado = document.getElementById('btnCandadoPrivacidad');
                        if (btnCandado) { btnCandado.style.display = 'flex'; window._inicializarCandadoPrivacidad(); }
                        if (btnEditFavorita) btnEditFavorita.style.display = 'inline-flex';
                        if (btnCambiarAvatar) btnCambiarAvatar.style.display = 'flex';
                        const btnEditVistaCine = document.getElementById('btnEditarVistaCine');
                        if (btnEditVistaCine) btnEditVistaCine.style.display = 'inline-flex';
                        const btnEditNoMeCanso = document.getElementById('btnEditarNoMeCanso');
                        if (btnEditNoMeCanso) btnEditNoMeCanso.style.display = 'inline-flex';
                        const btnEditNoLaBanco = document.getElementById('btnEditarNoLaBanco');
                        if (btnEditNoLaBanco) btnEditNoLaBanco.style.display = 'inline-flex';
                        const btnEditSerieFavorita = document.getElementById('btnEditarSerieFavorita');
                        if (btnEditSerieFavorita) btnEditSerieFavorita.style.display = 'inline-flex';
                        const btnEditUltimaMaraton = document.getElementById('btnEditarUltimaMaraton');
                        if (btnEditUltimaMaraton) btnEditUltimaMaraton.style.display = 'inline-flex';
                        const btnEditNoMeCansoSerie = document.getElementById('btnEditarNoMeCansoSerie');
                        if (btnEditNoMeCansoSerie) btnEditNoMeCansoSerie.style.display = 'inline-flex';
                        const btnEditNoLaBancoSerie = document.getElementById('btnEditarNoLaBancoSerie');
                        if (btnEditNoLaBancoSerie) btnEditNoLaBancoSerie.style.display = 'inline-flex';
                    }

                                window._renderFavoritaVista(perfil.peliculaFavoritaId, { titulo: perfil.peliculaFavoritaTitulo, poster: perfil.peliculaFavoritaPoster });
                                window._renderVistaCineVista(perfil.ultimaVistaCineId, { titulo: perfil.ultimaVistaCineTitulo, poster: perfil.ultimaVistaCinePoster });
                                window._renderNoMeCansoVista(perfil.noMeCansoDeVerId, { titulo: perfil.noMeCansoDeVerTitulo, poster: perfil.noMeCansoDeVerPoster });
                                window._renderNoLaBancoVista(perfil.noLaBancoId, { titulo: perfil.noLaBancoTitulo, poster: perfil.noLaBancoPoster });
                                window._renderSerieFavoritaVista(perfil.serieFavoritaId, { titulo: perfil.serieFavoritaTitulo, poster: perfil.serieFavoritaPoster });
                                window._renderUltimaMaratonVista(perfil.ultimaMaratonId, { titulo: perfil.ultimaMaratonTitulo, poster: perfil.ultimaMaratonPoster });
                                window._renderNoMeCansoSerieVista(perfil.noMeCansoDeVerSerieId, { titulo: perfil.noMeCansoDeVerSerieTitulo, poster: perfil.noMeCansoDeVerSeriePoster });
                                window._renderNoLaBancoSerieVista(perfil.noLaBancoSerieId, { titulo: perfil.noLaBancoSerieTitulo, poster: perfil.noLaBancoSeriePoster });
                                window._adnSeries = perfil.adnCinefiloSeries || [];
                                window._renderAdnCinefilo(perfil.adnCinefilo);
                                window._renderRankingTrivia(perfil.rankingTriviaPeliculas, perfil.rankingTriviaSeries);

                                // Fuerza el estado inicial a Películas — sin esto, los 4 bloques de
                                // Series (Votadas/Comentadas) quedan con su display default (visible)
                                // hasta el primer click en el switch, mostrándose junto con Películas.
                                window.setAdnTipo('peliculas');
                }



// ==============================================
// RENDER STATS
// ==============================================
function renderStats(perfil) {
    document.getElementById('perfilSeguidores').textContent  = perfil.seguidores || 0;
    document.getElementById('perfilSiguiendo').textContent   = perfil.siguiendo || 0;
    document.getElementById('perfilVotaciones').textContent  = perfil.totalVotaciones || 0;
    document.getElementById('perfilComentarios').textContent = perfil.totalComentarios || 0;

        window._activarStatClickeable('perfilSeguidoresWrap', perfil.seguidores, () => window.abrirModalSeguidores('seguidores'));
    window._activarStatClickeable('perfilSiguiendoWrap', perfil.siguiendo, () => window.abrirModalSeguidores('seguidos'));
}

// ==============================================
// RENDER VOTACIONES — CARRUSEL CON LAZY POR FLECHA
// ==============================================
let _votacionesPage     = 0;
let _votacionesHayMas   = false;
let _votacionesCargando = false;

let _stackVotaciones = [];
let _stackIndice = 0;

function renderVotaciones(votaciones) {
    const wrapper = document.getElementById('perfilVotacionesWrapper');
    if (!wrapper) return;

    if (!votaciones || votaciones.length === 0) {
                wrapper.innerHTML = '<div class="cine-stack-vacio-wrap"><div class="cine-stack-vacio"></div><p class="cine-stack-vacio-lbl">Sin votaciones aún</p></div>';
        return;
    }

    _votacionesPage   = 0;
    _votacionesHayMas = votaciones.length === 8;
    _stackVotaciones  = votaciones;
    _stackIndice      = 0;

        wrapper.innerHTML = `
                      <p class="cine-stack-eyebrow">VOTACIONES (${window._perfilCounts?.votacionesPeliculas || 0})</p>
        <div class="cine-stack-area">
            <button class="cine-stack-nav prev" onclick="window._moverStackVotos(-1)"><i class="fas fa-chevron-left"></i></button>
            <div id="cineStackContainer" style="position:relative; width:100%; height:100%;"></div>
            <button class="cine-stack-nav next" onclick="window._moverStackVotos(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <p class="cine-stack-titulo" id="cineStackTitulo"></p>
    `;

    const cont = document.getElementById('cineStackContainer');
    cont.innerHTML = votaciones.map(v => {
        const poster = v.posterPath
            ? `<img src="https://image.tmdb.org/t/p/w185${v.posterPath}" alt="${v.movieTitle || ''}">`
            : `<div class="placeholder"><i class="fas fa-film"></i></div>`;
        const badgeClass = v.voto === 'LIKE' ? 'like' : 'dislike';
        const badgeIcon  = v.voto === 'LIKE' ? 'fa-thumbs-up' : 'fa-thumbs-down';
        return `
        <div class="cine-stack-card" onclick="window._abrirPeliculaDesdePerfil(${v.movieId})">
            ${poster}
            <div class="cine-stack-badge ${badgeClass}"><i class="fas ${badgeIcon}" style="font-size:0.6rem;color:white;"></i></div>
        </div>`;
    }).join('');

    window._renderStackPosiciones();
}

window._renderStackPosiciones = function() {
    const cards = document.querySelectorAll('#cineStackContainer .cine-stack-card');
    const N = _stackVotaciones.length;
    cards.forEach((card, i) => {
        let diff = i - _stackIndice;
        if (diff > N / 2) diff -= N;
        if (diff < -N / 2) diff += N;
        const offset = (diff >= 0 && diff <= 2) ? diff : -1;

        if (offset === 0) {
            card.style.transform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
            card.style.opacity = 1; card.style.zIndex = 10;
        } else if (offset === 1) {
            card.style.transform = 'translateX(-18px) translateY(10px) scale(0.94) rotate(-3deg)';
            card.style.opacity = 0.6; card.style.zIndex = 8;
        } else if (offset === 2) {
            card.style.transform = 'translateX(-36px) translateY(20px) scale(0.88) rotate(-6deg)';
            card.style.opacity = 0.3; card.style.zIndex = 7;
        } else {
            card.style.transform = 'translateX(260px) translateY(-10px) scale(0.8) rotate(16deg)';
            card.style.opacity = 0; card.style.zIndex = 5;
        }
    });
    const tituloEl = document.getElementById('cineStackTitulo');
    if (tituloEl && _stackVotaciones[_stackIndice]) {
        tituloEl.textContent = _stackVotaciones[_stackIndice].movieTitle || '—';
    }
};

window._moverStackVotos = function(dir) {
    const N = _stackVotaciones.length;
    if (N === 0) return;
    _stackIndice = (_stackIndice + dir + N) % N;
    window._renderStackPosiciones();

    if (dir > 0 && _stackIndice >= N - 2 && _votacionesHayMas && !_votacionesCargando) {
        window._cargarMasVotaciones();
    }
};

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
let _stackComentarios = [];
let _stackIndiceComentarios = 0;

function renderComentarios(comentarios) {
    const wrapper = document.getElementById('perfilComentariosList');
    if (!wrapper) return;

    if (!comentarios || comentarios.length === 0) {
                wrapper.innerHTML = '<div class="cine-stack-vacio-wrap"><div class="cine-stack-vacio"></div><p class="cine-stack-vacio-lbl">Sin comentarios aún</p></div>';
        return;
    }

        _stackComentarios = comentarios;
        _stackIndiceComentarios = 0;
        window._comentariosPage = 0;
        window._comentariosHayMas = true; // se confirma solo cuando se pide la próxima tanda
        window._comentariosCargandoMas = false;

        wrapper.innerHTML = `
                        <p class="cine-stack-eyebrow">COMENTARIOS (${window._perfilCounts?.comentariosPeliculas || 0})</p>
        <div class="cine-stack-area">
            <button class="cine-stack-nav prev" onclick="window._moverStackComentarios(-1)"><i class="fas fa-chevron-left"></i></button>
            <div id="cineStackComentariosContainer" style="position:relative; width:100%; height:100%;"></div>
            <button class="cine-stack-nav next" onclick="window._moverStackComentarios(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <p class="cine-stack-titulo" id="cineStackComentariosTitulo"></p>
    `;

    const cont = document.getElementById('cineStackComentariosContainer');
    cont.innerHTML = comentarios.map((c, i) => {
        const poster = c.posterPath
            ? `<img src="https://image.tmdb.org/t/p/w185${c.posterPath}" alt="${c.movieTitle || ''}">`
            : `<div class="placeholder"><i class="fas fa-film"></i></div>`;
        return `
        <div class="cine-stack-card" onclick="window._abrirVinetaComentario(${i})">
            ${poster}
            <div class="cine-badge-comentario"><i class="fas fa-comment-dots"></i></div>
        </div>`;
    }).join('');

    window._renderStackPosicionesComentarios();
}

window._renderStackPosicionesComentarios = function() {
    const cards = document.querySelectorAll('#cineStackComentariosContainer .cine-stack-card');
    const N = _stackComentarios.length;
    cards.forEach((card, i) => {
        let diff = i - _stackIndiceComentarios;
        if (diff > N / 2) diff -= N;
        if (diff < -N / 2) diff += N;
        const offset = (diff >= 0 && diff <= 2) ? diff : -1;

        // Solo la card de adelante (offset 0) es clickeable — las de atrás
        // asoman visualmente por debajo pero su hitbox es el cuadrado
        // completo de la card, así que sin esto un click "al costado" del
        // poster de adelante termina cayendo en la de atrás y abre la
        // viñeta de otro comentario. Para pasar a la siguiente se usan
        // las flechas prev/next, no el click directo sobre la de atrás.
        card.style.pointerEvents = offset === 0 ? 'auto' : 'none';

        if (offset === 0) {
            card.style.transform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
            card.style.opacity = 1; card.style.zIndex = 10;
        } else if (offset === 1) {
            card.style.transform = 'translateX(-18px) translateY(10px) scale(0.94) rotate(-3deg)';
            card.style.opacity = 0.6; card.style.zIndex = 8;
        } else if (offset === 2) {
            card.style.transform = 'translateX(-36px) translateY(20px) scale(0.88) rotate(-6deg)';
            card.style.opacity = 0.3; card.style.zIndex = 7;
        } else {
            card.style.transform = 'translateX(260px) translateY(-10px) scale(0.8) rotate(16deg)';
            card.style.opacity = 0; card.style.zIndex = 5;
        }
    });
    const tituloEl = document.getElementById('cineStackComentariosTitulo');
    if (tituloEl && _stackComentarios[_stackIndiceComentarios]) {
        tituloEl.textContent = _stackComentarios[_stackIndiceComentarios].movieTitle || '—';
    }
};

window._comentariosPage = 0;
window._comentariosHayMas = true;
window._comentariosCargandoMas = false;

window._moverStackComentarios = async function(dir) {
    const N = _stackComentarios.length;
    if (N === 0) return;

    const proximoIndice = (_stackIndiceComentarios + dir + N) % N;

    // Si avanzamos y estamos por volver al principio del mazo (ya vimos
    // todos los que tenemos cargados), pedimos la próxima página ANTES
    // de dar la vuelta — así el mazo sigue creciendo en vez de repetir
    // en loop siempre los mismos 5 primeros.
    if (dir > 0 && proximoIndice === 0 && window._comentariosHayMas && !window._comentariosCargandoMas) {
        window._comentariosCargandoMas = true;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/users/${perfilUsuarioId}/comentarios?page=${window._comentariosPage + 1}&size=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.comentarios && data.comentarios.length > 0) {
                    window._comentariosPage++;
                    window._comentariosHayMas = data.hayMas;
                    _agregarComentariosAlStack(data.comentarios);
                } else {
                    window._comentariosHayMas = false;
                }
            }
        } catch (e) {}
        window._comentariosCargandoMas = false;
    }

    const NFinal = _stackComentarios.length;
    _stackIndiceComentarios = (_stackIndiceComentarios + dir + NFinal) % NFinal;
    window._renderStackPosicionesComentarios();
    window._cerrarVineta();
};

function _agregarComentariosAlStack(nuevos) {
    _stackComentarios = _stackComentarios.concat(nuevos);
    const cont = document.getElementById('cineStackComentariosContainer');
    const offsetIdx = _stackComentarios.length - nuevos.length;
    const nuevoHtml = nuevos.map((c, i) => {
        const poster = c.posterPath
            ? `<img src="https://image.tmdb.org/t/p/w185${c.posterPath}" alt="${c.movieTitle || ''}">`
            : `<div class="placeholder"><i class="fas fa-film"></i></div>`;
        return `
        <div class="cine-stack-card" onclick="window._abrirVinetaComentario(${offsetIdx + i})">
            ${poster}
            <div class="cine-badge-comentario"><i class="fas fa-comment-dots"></i></div>
        </div>`;
    }).join('');
    cont.insertAdjacentHTML('beforeend', nuevoHtml);
}

window._abrirVinetaComentario = function(i) {
    const c = _stackComentarios[i];
    if (!c) return;
    const overlay   = document.getElementById('cineVinetaOverlay');
    const box       = document.getElementById('cineVinetaBox');
    const spoilerEl = document.getElementById('cineVinetaSpoiler');

        document.getElementById('cineVinetaFuente').textContent = c.movieTitle || '';
        document.getElementById('cineVinetaTexto').textContent  = c.contenido || '';
        spoilerEl.style.display = c.spoiler ? 'inline-block' : 'none';

        // Contexto para "Ver más" — reusa el mismo flujo de scroll+resaltado
        // que ya existía antes de la viñeta.
        window._vinetaContexto = { tipo: 'pelicula', id: c.movieId, commentId: c.commentId, spoiler: c.spoiler };

        const cardEl = document.querySelectorAll('#cineStackComentariosContainer .cine-stack-card')[i];
        const rect = cardEl.getBoundingClientRect();
        // Clamp contra el borde derecho de la pantalla — la viñeta mide
        // 240px fijos (.cine-vineta), y rect.left a veces deja muy poco
        // margen a la derecha (ej. en mobile, con el menú de criterios
        // empujando la tarjeta hacia la derecha).
        const maxLeft = window.innerWidth - 240 - 12;
        box.style.left = Math.min(rect.left, maxLeft) + 'px';
        box.style.top  = (rect.top - 160) + 'px';

    overlay.style.display = 'block';
    box.style.display = 'block';
    requestAnimationFrame(() => box.classList.add('show'));

    window.addEventListener('scroll', window._cerrarVinetaPorScroll, { passive: true });
};

window._cerrarVinetaPorScroll = function() {
    window._cerrarVineta();
};

window._responderDesdeVineta = function() {
    const ctx = window._vinetaContexto;
    if (!ctx || !ctx.id) return;
    window._cerrarVineta();
    if (ctx.tipo === 'serie') {
        window._abrirSerieDesdeComentario(ctx.id, ctx.commentId, ctx.spoiler);
    } else {
        window._abrirPeliculaDesdeComentario(ctx.id, ctx.commentId, ctx.spoiler);
    }
};

window._cerrarVineta = function() {
    const overlay = document.getElementById('cineVinetaOverlay');
    const box = document.getElementById('cineVinetaBox');
    if (!overlay || !box) return;
    box.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; box.style.display = 'none'; }, 200);
    window.removeEventListener('scroll', window._cerrarVinetaPorScroll);
};

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

                // Actualizar el banner visualmente sin recargar — antes apuntaba
                // a .perfil-header, un selector distinto al que usa el resto del
                // archivo (.perfil-banner) para mostrar/ocultar el banner real.
                const banner = document.querySelector('.perfil-banner');
                        if (banner && data.bannerUrl) {
                            banner.style.backgroundImage = `url('${data.bannerUrl}')`;
                        }

                                                alert('Banner actualizado correctamente.');

                                    } catch(e) {
                                        alert('Error al subir el banner. Intentá de nuevo.');
                                    }
                                };

                                window.eliminarBanner = async function() {
                                    if (!confirm('¿Querés quitar tu banner personalizado? Se va a mostrar el banner por defecto.')) return;

                                    const token = localStorage.getItem('token');
                                    try {
                                        const res = await fetch(`${CONFIG.API_URL}/users/me/banner`, {
                                            method: 'DELETE',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });

                                        if (!res.ok) throw new Error();

                                        // Vuelve al banner por defecto sin recargar — se le saca el
                                        // backgroundImage inline y CSS vuelve a mostrar el de
                                        // headerpublico.png (el mismo que .perfil-banner trae por
                                        // defecto cuando no hay bannerUrl).
                                        const banner = document.querySelector('.perfil-banner');
                                        if (banner) banner.style.backgroundImage = '';

                                        const btnEliminarBanner = document.getElementById('btnEliminarBanner');
                                        if (btnEliminarBanner) btnEliminarBanner.style.display = 'none';

                                                } catch (e) {
                                                    alert('Error al quitar el banner. Intentá de nuevo.');
                                                }
                                            };

                                            // ==============================================
                                            // CANDADO DE PRIVACIDAD DEL PERFIL
                                            // ==============================================
                                            let _miSalaEsPrivado = false;

                                            window._inicializarCandadoPrivacidad = async function() {
                                                const token = localStorage.getItem('token');

                                                const btnFab = document.getElementById('btnFabPrivacidad');
                                                if (btnFab) btnFab.style.display = 'flex';

                                                try {
                                                    const res = await fetch(`${CONFIG.API_URL}/users/me`, {
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    if (!res.ok) return;
                                                    const data = await res.json();
                                                    _miSalaEsPrivado = data.profileVisibility === 'PRIVATE';
                                                    _actualizarIconoCandado();
                                                } catch (e) {}
                                            };

                                            function _actualizarIconoCandado() {
                                                const claseIcono = _miSalaEsPrivado ? 'fas fa-lock' : 'fas fa-lock-open';
                                                const icono = document.getElementById('btnCandadoPrivacidadIcono');
                                                if (icono) icono.className = claseIcono;
                                                const iconoFab = document.getElementById('btnFabPrivacidadIcono');
                                                if (iconoFab) iconoFab.className = claseIcono;
                                            }

                                            window._abrirModalPrivacidad = function() {
                                                _actualizarTextosModalPrivacidad(_miSalaEsPrivado);
                                                document.getElementById('modalPrivacidadPerfil').style.display = 'flex';
                                            };

                                            window._cerrarModalPrivacidad = function() {
                                                document.getElementById('modalPrivacidadPerfil').style.display = 'none';
                                            };

                                            // El switch dentro del modal solo cambia la vista previa —
                                            // todavía no pega al backend. Recién pega cuando se toca
                                            // "Confirmar", como pidió el flujo (candado se cierra SI
                                            // llega a confirmar, no apenas se abre el modal).
                                            window._togglePrivacidadDesdeModal = function() {
                                                _actualizarTextosModalPrivacidad(!_miSalaEsPrivado);
                                            };

                                            function _actualizarTextosModalPrivacidad(previewPrivado) {
                                                const toggle = document.getElementById('modalPrivacidadToggle');
                                                const dot    = document.getElementById('modalPrivacidadDot');
                                                const label  = document.getElementById('modalPrivacidadLabel');
                                                const desc   = document.getElementById('modalPrivacidadDesc');

                                                toggle.dataset.preview = previewPrivado ? 'PRIVATE' : 'PUBLIC';

                                                if (previewPrivado) {
                                                    toggle.style.background = '#324C89';
                                                    dot.style.left = '22px';
                                                    label.textContent = 'Privado';
                                                    desc.textContent = 'Tu perfil es privado. Solo usuarios aprobados pueden ver tu contenido.';
                                                } else {
                                                    toggle.style.background = '#ddd';
                                                    dot.style.left = '2px';
                                                    label.textContent = 'Público';
                                                    desc.textContent = 'Tu perfil es público. Cualquier usuario puede ver tu contenido.';
                                                }
                                            }

                                            window._confirmarCambioPrivacidad = async function() {
                                                const toggle = document.getElementById('modalPrivacidadToggle');
                                                const nuevaVisibilidad = toggle.dataset.preview || (_miSalaEsPrivado ? 'PUBLIC' : 'PRIVATE');
                                                const token = localStorage.getItem('token');

                                                const btn = document.getElementById('btnConfirmarPrivacidad');
                                                btn.disabled = true;
                                                btn.textContent = 'Guardando...';

                                                try {
                                                    const res = await fetch(`${CONFIG.API_URL}/follows/privacy`, {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}`
                                                        },
                                                        body: JSON.stringify({ visibility: nuevaVisibilidad })
                                                    });
                                                    if (!res.ok) throw new Error();

                                                        _miSalaEsPrivado = nuevaVisibilidad === 'PRIVATE';
                                                        _actualizarIconoCandado();
                                                        window._cerrarModalPrivacidad();
                                                        _toastPrivacidad(_miSalaEsPrivado
                                                            ? 'Tu perfil ahora es privado'
                                                            : 'Tu perfil ahora es público');
                                                    } catch (e) {
                                                        alert('Error al actualizar la privacidad. Intentá de nuevo.');
                                                    } finally {
                                                        btn.disabled = false;
                                                        btn.textContent = 'Confirmar';
                                                    }
                                                };

                                                // Reusa el toast que ya existe para el cambio Películas/Series
                                                // (mismo elemento, mismo fundido) pero sin el flash de color de
                                                // pantalla completa — ese efecto es propio de ese otro cambio,
                                                // acá alcanza con el aviso breve.
                                                function _toastPrivacidad(mensaje) {
                                                    const toast = document.getElementById('cineModoToast');
                                                    if (!toast) return;

                                                    toast.textContent = mensaje;
                                                    toast.style.background = '#1a1a1a';
                                                    toast.style.top = 'auto';
                                                    toast.style.bottom = '2rem';
                                                    toast.style.left = '50%';
                                                    toast.style.transform = 'translateX(-50%)';
                                                    toast.style.opacity = '0';
                                                    toast.style.transition = 'none';
                                                    toast.style.display = 'block';
                                                    requestAnimationFrame(() => {
                                                        toast.style.transition = 'opacity 0.3s ease';
                                                        toast.style.opacity = '1';
                                                    });
                                                    clearTimeout(window._cineModoToastTimeout);
                                                    window._cineModoToastTimeout = setTimeout(() => {
                                                        toast.style.opacity = '0';
                                                        setTimeout(() => { toast.style.display = 'none'; }, 300);
                                                    }, 2000);
                                                }

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
                if (cd) cd.textContent = `${d}/255`;
            }

        window.guardarBio = async function() {
            const bioTitulo = document.getElementById('inputBioTitulo')?.value.trim() || '';
            const bioTexto  = document.getElementById('inputBioTexto')?.value.trim()  || '';

            if (bioTitulo.length > 50)  { alert('El título no puede superar los 50 caracteres.'); return; }
            if (bioTexto.length  > 255) { alert('La descripción no puede superar los 255 caracteres.'); return; }

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
        // PELÍCULA FAVORITA
        // ==============================================
        window._renderFavoritaVista = async function(movieId) {
            const posterEl = document.getElementById('perfilFavoritaPoster');
            const tituloEl = document.getElementById('perfilFavoritaTitulo');
            if (!posterEl || !tituloEl) return;

            if (!movieId) {
                tituloEl.textContent = 'Sin elegir todavía';
                posterEl.innerHTML = '';
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                const m = await res.json();
                tituloEl.textContent = m.title || '—';
                posterEl.innerHTML = m.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w185${m.poster_path}" alt="${m.title || ''}" style="width:100%;height:100%;object-fit:cover;">`
                    : '';
            } catch (e) {
                tituloEl.textContent = '—';
            }
        };

        // ==============================================
        // ADN CINÉFILO — balde 3D
        // ==============================================
        const EMOJI_POR_GENERO = {
            'Acción': '💥', 'Aventura': '🗺️', 'Animación': '🎨', 'Comedia': '😂',
            'Crimen': '🔪', 'Documental': '🎥', 'Drama': '🎭', 'Familia': '👨‍👩‍👧',
            'Fantasía': '🧙', 'Historia': '📜', 'Terror': '👻', 'Música': '🎵',
            'Misterio': '🔎', 'Romance': '💕', 'Ciencia ficción': '🚀',
            'Película de TV': '📺', 'Suspense': '😰', 'Bélica': '⚔️', 'Western': '🤠',
            'Action & Adventure': '🏹', 'Sci-Fi & Fantasy': '🛸', 'War & Politics': '🎖️',
            'Soap': '💔', 'Kids': '🧸', 'News': '📰', 'Reality': '🎪', 'Talk': '🎙️'
        };
        const ADN_COLORES = [
            0x2a78d6, 0xeb6834, 0x1baf7a, 0xeda100, 0xe87ba4, 0x4a3aa7, 0xe34948, 0x008300,
            0x9c27b0, 0x00bcd4, 0x795548, 0xff5722, 0x607d8b, 0xcddc39, 0x3f51b5, 0xff9800,
            0x009688, 0xc2185b, 0x8bc34a
        ];
        const NOMBRE_TOTEM_POR_GENERO = {
            'Acción': 'Bang', 'Aventura': 'Explorador', 'Animación': 'Garabato', 'Comedia': 'Risitas',
            'Crimen': 'Fisgón', 'Documental': 'Bitácora', 'Drama': 'Lágrima', 'Familia': 'Familiero',
            'Fantasía': 'Duende', 'Historia': 'Retro', 'Terror': 'Boo', 'Música': 'Compás',
            'Misterio': 'Enigma', 'Romance': 'Cupido', 'Ciencia ficción': 'Astro',
            'Película de TV': 'Maratón', 'Suspense': 'Escalofrío', 'Bélica': 'Trinchera', 'Western': 'Cowboy',
            'Action & Adventure': 'Aventurón', 'Sci-Fi & Fantasy': 'Portal', 'War & Politics': 'Debate',
            'Soap': 'Culebrón', 'Kids': 'Osito', 'News': 'Flash', 'Reality': 'Chisme', 'Talk': 'Charla'
        };

        const TOTEM_FRASE = {
            'Acción': '¡Bang! ¿Viste esa explosión?',
            'Aventura': '¿Nos vamos de aventura?',
            'Animación': '¡Dibujame una sonrisa!',
            'Comedia': 'Jajaja, ¿ya te reíste hoy?',
            'Crimen': 'Shh... estoy investigando',
            'Documental': 'Todo dato es un tesoro',
            'Drama': 'Traeme un pañuelo, por favor',
            'Familia': '¿Vemos algo todos juntos?',
            'Fantasía': '¡Abracadabra, patas de...?!',
            'Historia': 'Antes todo era mejor... ¿o no?',
            'Terror': '¡Buu! ¿Te asusté?',
            'Música': 'Subile el volumen a la vida',
            'Misterio': '¿Quién lo hizo? Yo ya lo sé',
            'Romance': 'Flechazo asegurado 💘',
            'Ciencia ficción': 'Houston, tenemos una peli',
            'Película de TV': 'Un capítulo más y ya',
            'Suspense': 'No mires atrás...',
            'Bélica': 'A las trincheras, soldado',
            'Western': 'En este pueblo mando yo 🤠',
            'Action & Adventure': 'Misión: maratonear todo hoy',
            'Sci-Fi & Fantasy': 'Cruzá el portal conmigo',
            'War & Politics': 'Un tema, dos bandos, mil opiniones',
            'Soap': '¡Qué draaama, contame todo!',
            'Kids': '¿Jugamos un rato?',
            'News': 'Titular del día: viste todo, ¿no',
            'Reality': '¿Viste lo que pasó ayer?',
            'Talk': 'Hablemos, tengo mucho para decir'
        };

                const GENERO_RASGO = {
                    'Acción': { adj: 'audaz', sust: 'acción' },
                    'Aventura': { adj: 'aventurero', sust: 'aventura' },
                    'Animación': { adj: 'animado', sust: 'animación' },
                    'Comedia': { adj: 'divertido', sust: 'comedia' },
                    'Crimen': { adj: 'intrigante', sust: 'crimen' },
                    'Documental': { adj: 'curioso', sust: 'documentales' },
                    'Drama': { adj: 'sensible', sust: 'drama' },
                    'Familia': { adj: 'hogareño', sust: 'cine familiar' },
                    'Fantasía': { adj: 'fantasioso', sust: 'fantasía' },
                    'Historia': { adj: 'nostálgico', sust: 'cine histórico' },
                    'Terror': { adj: 'tenebroso', sust: 'terror' },
                    'Música': { adj: 'melómano', sust: 'música' },
                    'Misterio': { adj: 'detectivesco', sust: 'misterio' },
                    'Romance': { adj: 'romántico', sust: 'romance' },
                    'Ciencia Ficción': { adj: 'futurista', sust: 'ciencia ficción' },
                    'Ciencia ficción': { adj: 'futurista', sust: 'ciencia ficción' },
                    'Película de TV': { adj: 'televisivo', sust: 'series' },
                    'Suspenso': { adj: 'intrigante', sust: 'suspenso' },
                    'Suspense': { adj: 'intrigante', sust: 'suspenso' },
                                        'Bélica': { adj: 'combativo', sust: 'cine bélico' },
                                        'Western': { adj: 'vaquero', sust: 'western' },
                                        'Action & Adventure': { adj: 'aventurero', sust: 'acción y aventura' },
                                        'Sci-Fi & Fantasy': { adj: 'futurista', sust: 'ciencia ficción y fantasía' },
                                        'War & Politics': { adj: 'combativo', sust: 'series bélicas y políticas' },
                                        'Soap': { adj: 'melodramático', sust: 'telenovelas' },
                                        'Kids': { adj: 'infantil', sust: 'series infantiles' },
                                        'News': { adj: 'informado', sust: 'noticieros' },
                                        'Reality': { adj: 'curioso', sust: 'reality shows' },
                                        'Talk': { adj: 'conversador', sust: 'talk shows' }
                                    };

                function _adnGenerarTitular(adnCinefilo) {
                    if (!adnCinefilo || adnCinefilo.length === 0) return '';
                    const top1 = adnCinefilo[0];
                    const top2 = adnCinefilo[1];
                    const top3 = adnCinefilo[2];

                    const esDominante = top1.porcentaje >= 35 || (top2 && (top1.porcentaje - top2.porcentaje) >= 20);
                        if (esDominante || !top2) {
                            return `Soy especialista en ${top1.genero}`;
                        }

                    const r1 = GENERO_RASGO[top1.genero] || { adj: 'apasionado', sust: top1.genero.toLowerCase() };
                    const r2 = GENERO_RASGO[top2.genero] || { adj: 'apasionado', sust: top2.genero.toLowerCase() };

                                        let frase = `Tengo espíritu ${r1.adj}, con algo de ${r2.sust}`;

                    if (top3) {
                        const r3 = GENERO_RASGO[top3.genero] || { adj: 'apasionado', sust: top3.genero.toLowerCase() };
                        frase += ` y un toque de ${r3.sust}`;
                    }

                    return frase + '.';
                }

                                        window._renderAdnCinefilo = function(adnCinefilo) {
                                            const emojiEl = document.getElementById('perfilAdnEmoji');
                                            if (!emojiEl) return;

                                            window._adnPeliculas = adnCinefilo || [];
                                            window._pintarAdn(window._adnPeliculas);
                                        };

                                        window._pintarAdn = function(datos) {
                                            const emojiEl = document.getElementById('perfilAdnEmoji');
                                                        document.getElementById('perfilAdnTitular').textContent = datos.length > 0
                                                            ? _adnGenerarTitular(datos)
                                                            : 'Aún tengo pendiente revelar mi verdadero yo...';
                                                                            const totemEl = document.getElementById('perfilAdnTotemNombre');
                                                                                        if (totemEl) {
                                                                                            totemEl.textContent = datos.length > 0
                                                                                                ? (NOMBRE_TOTEM_POR_GENERO[datos[0].genero] || datos[0].genero)
                                                                                                : '';
                                                                                        }
                                                                            window._adnGeneroActual = datos.length > 0 ? datos[0].genero : null;
                                                                            emojiEl.textContent = datos.length > 0 ? (EMOJI_POR_GENERO[datos[0].genero] || '🎞️') : '🎞️';
                                                                            emojiEl.style.cursor = 'pointer';
                                                                            emojiEl.onclick = window._abrirTotemVineta;

                                                                        const legend = document.getElementById('perfilAdnLegend');
                                                                        legend.innerHTML = '';
                                                                        legend.scrollLeft = 0;
                                                                        // Agrupar de a 3 SOLO en mobile: en desktop los pills siguen
                                                                        // siendo hijos directos de #perfilAdnLegend, sin cambios.
                                                                        const esMobile = window.matchMedia('(max-width: 768px)').matches;
                                                                        let paginaActual = null;
                                                                        // Mismo diccionario que ya usa feed-series.js para los pills
                                                                        // de género del feed de Series — TMDb no traduce estos al
                                                                        // español ni pidiéndolo en es-MX, así que hace falta el parche
                                                                        // acá también, solo para mostrar (el dato crudo en la base no
                                                                        // se toca). Emoji, tótem y la frase de arriba ya funcionan bien
                                                                        // con el nombre crudo — solo el texto del pill lo necesitaba.
                                                                        const TRADUCCIONES_GENERO_SERIE = {
                                                                            'Kids': 'Infantil',
                                                                            'Action & Adventure': 'Acción y Aventura',
                                                                            'Sci-Fi & Fantasy': 'Ciencia Ficción',
                                                                            'Soap': 'Telenovela',
                                                                            'Talk': 'Programas',
                                                                            'War & Politics': 'Bélico'
                                                                        };
                                                                        datos.forEach((g, i) => {
                                const hex = '#' + ADN_COLORES[i % ADN_COLORES.length].toString(16).padStart(6, '0');
                                const emoji = EMOJI_POR_GENERO[g.genero] || '🎞️';
                                const nombreMostrado = TRADUCCIONES_GENERO_SERIE[g.genero] || g.genero;
                                const modoSeries = document.getElementById('perfilContenido')?.classList.contains('modo-series');
                                const pill = document.createElement('span');
                                pill.style.cssText = 'display:inline-flex; align-items:center; gap:5px; background:' + hex + '35; border:1px solid ' + hex + '70; border-radius:20px; padding:4px 10px 4px 6px; cursor:pointer;';
                                pill.onclick = () => window._abrirModalGeneroAdn(g.generoId, nombreMostrado, modoSeries ? 'series' : 'peliculas', emoji);
                                pill.innerHTML =
                                    '<span style="width:18px;height:18px;border-radius:50%;background:' + hex + '25;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;">' + emoji + '</span>' +
                                                                '<span style="font-size:0.78rem;color:var(--cine-text);">' + nombreMostrado + '</span>' +
                                                    '<span style="font-size:0.78rem;font-weight:700;color:' + hex + ';">' + g.porcentaje + '%</span>';
                                                if (esMobile) {
                                                    if (i % 3 === 0) {
                                                        paginaActual = document.createElement('div');
                                                        paginaActual.className = 'cine-adn-pagina';
                                                        legend.appendChild(paginaActual);
                                                    }
                                                    paginaActual.appendChild(pill);
                                                } else {
                                                    legend.appendChild(pill);
                                                }
                                            });
                                            window._adnInicializarDots(datos.length);
                                        };

                                // Mini-carrusel de pills — solo tiene efecto visual en mobile:
                                // en desktop #perfilAdnLegend no tiene overflow-x (perfil-mobile.css
                                // no se carga ahí), así que el scroll no existe y los dots quedan
                                // ocultos por el "display:none" por defecto en perfil.html.
                                window._adnInicializarDots = function(totalPills) {
                                    const legend = document.getElementById('perfilAdnLegend');
                                    const dotsEl = document.getElementById('perfilAdnDots');
                                    if (!legend || !dotsEl) return;

                                    const totalPaginas = Math.ceil(totalPills / 3);
                                    dotsEl.innerHTML = '';
                                    if (totalPaginas <= 1) return; // 3 géneros o menos: no hace falta carrusel

                                    for (let i = 0; i < totalPaginas; i++) {
                                        const dot = document.createElement('span');
                                        dot.className = 'cine-adn-dot' + (i === 0 ? ' active' : '');
                                        dotsEl.appendChild(dot);
                                    }

                                    legend.onscroll = function() {
                                        const pagina = Math.round(legend.scrollLeft / legend.clientWidth);
                                        dotsEl.querySelectorAll('.cine-adn-dot').forEach((dot, i) => {
                                            dot.classList.toggle('active', i === pagina);
                                        });
                                    };
                                };

                                // Fade lateral de "Mis gustos" — se apaga cuando el scroll llega
                                // al final (no queda más contenido oculto para insinuar).
                                // Corre para Películas y Series por igual (ambas comparten
                                // .cine-spread), y funciona apenas se genera el DOM porque no
                                // depende de datos async, solo de medidas de layout.
                                window._inicializarFadeSpreads = function() {
                                    document.querySelectorAll('.perfil-card .cine-spread').forEach(spread => {
                                        const chequear = () => {
                                            const finAlcanzado = spread.scrollLeft + spread.clientWidth >= spread.scrollWidth - 4;
                                            spread.classList.toggle('cine-fade-oculto', finAlcanzado);
                                        };
                                        chequear();
                                        spread.onscroll = chequear;
                                    });
                                };

                                // Swipe táctil sobre el mazo — dispara el mismo click que ya
                                // tienen las flechas prev/next (sin duplicar la lógica de cada
                                // uno de los 8 _moverStackX). Delegado sobre .cine-actividad-wrap
                                // (nunca se destruye) para no tener que re-bindear cada vez que
                                // un wrapper se rerenderiza con innerHTML nuevo.
                                window._inicializarSwipeStacks = function() {
                                    const contenedor = document.querySelector('.cine-actividad-wrap');
                                    if (!contenedor || contenedor._swipeInit) return;
                                    contenedor._swipeInit = true;

                                    let startX = 0, startY = 0, area = null;

                                    contenedor.addEventListener('touchstart', (e) => {
                                        area = e.target.closest('.cine-stack-area');
                                        if (!area) return;
                                        startX = e.touches[0].clientX;
                                        startY = e.touches[0].clientY;
                                    }, { passive: true });

                                    contenedor.addEventListener('touchend', (e) => {
                                        if (!area) return;
                                        const dx = e.changedTouches[0].clientX - startX;
                                        const dy = e.changedTouches[0].clientY - startY;
                                        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                                            const btn = area.querySelector(dx < 0 ? '.cine-stack-nav.prev' : '.cine-stack-nav.next');
                                            if (btn) btn.click();
                                        }
                                        area = null;
                                    }, { passive: true });
                                };

                                    // Modal simple para "editar gusto" en mobile — sin tocar ninguna
                                    // de las 8 funciones abrir/cancelar/elegir ya existentes. Un
                                    // MutationObserver detecta cuándo cada caja pasa a
                                    // visible/oculta (algo que esas funciones YA hacen con
                                    // style.display) y la mueve dentro/fuera del modal shell. En
                                    // desktop no hace nada — esMobile() corta antes de mover nada.
                                    window._inicializarModalGustoMobile = function() {
                                        const esMobile = () => window.matchMedia('(max-width: 768px)').matches;
                                    // Mismas frases que ya se usan como label debajo de cada
                                    // póster (.cine-snapshot-lbl en perfil.html) — se reutilizan
                                    // acá como título del modal, sin inventar redacción nueva.
                                    const titulos = {
                                        perfilFavoritaEdicion:        'Mi favorita:',
                                        perfilVistaCineEdicion:       'La última que vi en el cine:',
                                        perfilNoMeCansoEdicion:       'La que no me canso de ver:',
                                        perfilNoLaBancoEdicion:       'La que todos aman y yo no banco:',
                                        perfilSerieFavoritaEdicion:   'Mi serie favorita:',
                                        perfilUltimaMaratonEdicion:   'La última que ví en maratón:',
                                        perfilNoMeCansoSerieEdicion:  'La que no me canso de ver:',
                                        perfilNoLaBancoSerieEdicion:  'La que todos aman y yo no banco:'
                                    };
                                    const ids = Object.keys(titulos);

                                        ids.forEach(id => {
                                            const el = document.getElementById(id);
                                            if (!el || el._modalGustoInit) return;
                                            el._modalGustoInit = true;

                                            const hogarOriginal = el.parentNode;
                                            const hermanoOriginal = el.nextSibling;

                                            new MutationObserver(() => {
                                                if (!esMobile()) return;
                                                const shell = document.getElementById('modalEditarGustoMobileBox');
                                                const overlay = document.getElementById('modalEditarGustoMobile');
                                                if (!shell || !overlay) return;

                                                if (el.style.display === 'none') {
                                                    overlay.style.display = 'none';
                                                    document.body.style.overflow = '';
                                                    if (el.parentNode === shell) {
                                                        hogarOriginal.insertBefore(el, hermanoOriginal);
                                                    }
                                                        } else {
                                                            shell.appendChild(el);
                                                            const tituloEl = document.getElementById('modalEditarGustoMobileTitulo');
                                                            if (tituloEl) tituloEl.textContent = titulos[id] || '';
                                                            overlay.style.display = 'flex';
                                                            document.body.style.overflow = 'hidden';
                                                        }
                                            }).observe(el, { attributes: true, attributeFilter: ['style'] });
                                        });
                                    };

                                    // Ícono de ranking (Mi Sala) — abre el mismo modal de solo
                                    // lectura que ya usa el carrusel de destacada, según cuál de
                                    // los dos chips se tocó. Gateado a mobile acá adentro (no con
                                    // CSS) para no depender de que exista un "modo desktop" del
                                    // click — en desktop el chip no reacciona en absoluto.
                                    window._abrirRankingDesdeChip = function(tipo) {
                                        if (!window.matchMedia('(max-width: 768px)').matches) return;
                                        const nombreDelPerfil = document.getElementById('perfilNombre')?.textContent || '';
                                        if (tipo === 'series' && typeof window.abrirRankingTriviaSeries === 'function') {
                                            window.abrirRankingTriviaSeries(perfilUsuarioId, nombreDelPerfil);
                                        } else if (tipo === 'peliculas' && typeof window.abrirRankingTrivia === 'function') {
                                            window.abrirRankingTrivia(perfilUsuarioId, nombreDelPerfil);
                                        }
                                    };

                                // Menú de criterios de "Mi actividad" (mobile) — de los 8
                                // wrappers (4 criterios x Películas/Series) muestra 1 solo:
                                // el que matchea el criterio elegido ACÁ y el tipo elegido
                                // en el switch Películas/Series de arriba. La clase
                                // 'cine-actividad-oculto' no hace nada en desktop (no existe
                                // esa regla fuera de perfil-mobile.css) — ahí siguen
                                // viéndose los 4 de siempre, sin este menú de por medio.
                                window._actividadCriterioActual = window._actividadCriterioActual || 'votaciones';

                                // Formato corto para contadores grandes — 999 se ve entero,
                                // de 1.000 en adelante pasa a "k", de 1.000.000 a "M". Si el
                                // resultado es un número redondo (2000 -> 2k) no muestra
                                // decimales; si no, muestra uno solo (12500 -> 12.5k).
                                window._formatearContador = function(n) {
                                    n = Number(n) || 0;
                                    if (n < 1000) return String(n);
                                    if (n < 1000000) {
                                        const val = n / 1000;
                                        return (val % 1 === 0 ? val : val.toFixed(1)) + 'k';
                                    }
                                    const val = n / 1000000;
                                    return (val % 1 === 0 ? val : val.toFixed(1)) + 'M';
                                };

                                window._seleccionarCriterioActividad = function(criterio) {
                                    window._actividadCriterioActual = criterio;

                                    document.querySelectorAll('.cine-actividad-menu-item').forEach(btn => {
                                        btn.classList.toggle('active', btn.dataset.criterio === criterio);
                                    });

                                    const grupos = {
                                        votaciones:   ['perfilVotacionesWrapper', 'perfilVotacionesSeriesWrapper'],
                                        comentarios:  ['perfilComentariosList', 'perfilComentariosSeriesList']
                                    };

                                    Object.entries(grupos).forEach(([nombre, ids]) => {
                                        ids.forEach(id => {
                                            const el = document.getElementById(id);
                                            if (el) el.classList.toggle('cine-actividad-oculto', nombre !== criterio);
                                        });
                                    });

                                    // Conteos dentro de cada pill del menú — mismos números que
                                    // ya se usaban en el título "VOTACIONES (48)" de cada mazo
                                    // (window._perfilCounts), ahora movidos acá para no repetir
                                    // el nombre del criterio dos veces en pantalla.
                                    const modoSeries = document.getElementById('perfilContenido')?.classList.contains('modo-series');
                                    const counts = window._perfilCounts || {};
                                    const valores = {
                                        Votaciones:   modoSeries ? counts.votacionesSeries   : counts.votacionesPeliculas,
                                        Comentarios:  modoSeries ? counts.comentariosSeries  : counts.comentariosPeliculas
                                    };
                                    Object.entries(valores).forEach(([nombre, valor]) => {
                                        const el = document.getElementById('cineActividadCount' + nombre);
                                        if (el) el.textContent = window._formatearContador(valor ?? 0);
                                    });
                                };

                                // Desde las 4 métricas de arriba (votaciones/comentarios/
                                // recomendadas/guardadas), scrollea hasta "Mi actividad" y
                                // activa el criterio tocado — reusa la misma función que ya
                                // usa el menú de criterios, no duplica lógica.
                                window._irAActividadDesdeMetrica = function(criterio) {
                                    window._seleccionarCriterioActividad(criterio);
                                    const destino = document.getElementById('cineActividadTitulo');
                                    if (!destino) return;
                                    // scrollIntoView no sabe que hay un navbar sticky tapando
                                    // parte de arriba — calculamos su altura real y la restamos,
                                    // más un pequeño respiro, para que el título quede justo
                                    // debajo de él, no escondido detrás.
                                    const navbar = document.querySelector('.navbar');
                                    const offset = (navbar ? navbar.offsetHeight : 0) + 12;
                                    const y = destino.getBoundingClientRect().top + window.scrollY - offset;
                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                };

                                // Mismo criterio de scroll que _irAActividadDesdeMetrica, pero
                                // apuntando a "Publicaciones en Comunidad" — no pasa por el menú
                                // de criterios de Mi actividad, es una sección aparte más abajo.
                                window._irAPublicacionesDesdeMetrica = function() {
                                    const destino = document.getElementById('perfilPublicacionesSeccion');
                                    if (!destino) return;
                                    const navbar = document.querySelector('.navbar');
                                    const offset = (navbar ? navbar.offsetHeight : 0) + 12;
                                    const y = destino.getBoundingClientRect().top + window.scrollY - offset;
                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                };

                                                window.setAdnTipo = function(tipo) {
                            document.querySelectorAll('.cine-switch-option').forEach(btn => {
                                btn.classList.toggle('active', btn.dataset.tipo === tipo);
                            });

                            document.getElementById('perfilContenido')?.classList.toggle('modo-series', tipo === 'series');

                            const eyebrow = document.getElementById('perfilAdnEyebrow');
                            const eyebrowMobile = document.getElementById('perfilAdnEyebrowMobile');
                            const totem = document.getElementById('perfilAdnEmoji');
                            const totemNombre = document.getElementById('perfilAdnTotemNombre');

                            const spreadPeliculas = document.getElementById('cineSpreadPeliculas');
                            const spreadSeries = document.getElementById('cineSpreadSeries');

                            // Votadas — misma actividad del usuario, mismo criterio de swap
                            // que el resto de los bloques (favorita, ADN, etc.)
                            const votacionesPeliculas = document.getElementById('perfilVotacionesWrapper');
                            const votacionesSeries = document.getElementById('perfilVotacionesSeriesWrapper');

                            // Comentadas — mismo criterio.
                            const comentariosPeliculas = document.getElementById('perfilComentariosList');
                            const comentariosSeries = document.getElementById('perfilComentariosSeriesList');

                            // Recomendadas y Guardadas — mismo criterio, actividad del usuario.
                            const recomendadasPeliculas = document.getElementById('perfilRecomendadasWrapper');
                            const recomendadasSeries = document.getElementById('perfilRecomendadasSeriesWrapper');
                            const guardadasPeliculas = document.getElementById('perfilGuardadasWrapper');
                            const guardadasSeries = document.getElementById('perfilGuardadasSeriesWrapper');

                                                                    const actividadTitulo = document.getElementById('cineActividadTitulo');

                                if (tipo === 'series') {
                                    if (eyebrow) { eyebrow.textContent = 'Mi Lado Seriéfilo'; eyebrow.classList.add('cine-eyebrow--series'); }
                                    if (eyebrowMobile) eyebrowMobile.textContent = 'Mi Lado Seriéfilo';
                                    if (actividadTitulo) actividadTitulo.textContent = 'Mi actividad seriéfila';
                                if (totem) totem.style.background = 'linear-gradient(155deg, rgba(122,177,255,0.16), rgba(122,177,255,0.04))';
                                if (totemNombre) totemNombre.style.color = '#7ab1ff';
                                window._pintarAdn(window._adnSeries || []);
                                if (spreadPeliculas) spreadPeliculas.style.display = 'none';
                                if (spreadSeries) spreadSeries.style.display = 'flex';
                                if (votacionesPeliculas) votacionesPeliculas.style.display = 'none';
                                if (votacionesSeries) votacionesSeries.style.display = 'block';
                                if (comentariosPeliculas) comentariosPeliculas.style.display = 'none';
                                if (comentariosSeries) comentariosSeries.style.display = 'block';
                                if (recomendadasPeliculas) recomendadasPeliculas.style.display = 'none';
                                if (recomendadasSeries) recomendadasSeries.style.display = 'block';
                                if (guardadasPeliculas) guardadasPeliculas.style.display = 'none';
                                if (guardadasSeries) guardadasSeries.style.display = 'block';
                                } else {
                                    if (eyebrow) { eyebrow.textContent = 'Mi Sala Cinéfila'; eyebrow.classList.remove('cine-eyebrow--series'); }
                                    if (eyebrowMobile) eyebrowMobile.textContent = 'Mi Sala Cinéfila';
                                    if (actividadTitulo) actividadTitulo.textContent = 'Mi actividad cinéfila';
                                if (totem) totem.style.background = 'linear-gradient(155deg, rgba(255,59,92,0.16), rgba(255,59,92,0.04))';
                                if (totemNombre) totemNombre.style.color = '#ff3b5c';
                                window._pintarAdn(window._adnPeliculas || []);
                                if (spreadSeries) spreadSeries.style.display = 'none';
                                if (spreadPeliculas) spreadPeliculas.style.display = 'flex';
                                if (votacionesSeries) votacionesSeries.style.display = 'none';
                                if (votacionesPeliculas) votacionesPeliculas.style.display = 'block';
                                if (comentariosSeries) comentariosSeries.style.display = 'none';
                                if (comentariosPeliculas) comentariosPeliculas.style.display = 'block';
                                if (recomendadasSeries) recomendadasSeries.style.display = 'none';
                                if (recomendadasPeliculas) recomendadasPeliculas.style.display = 'block';
                                if (guardadasSeries) guardadasSeries.style.display = 'none';
                                if (guardadasPeliculas) guardadasPeliculas.style.display = 'block';
                            }

                        window._actualizarVisibilidadRankingTrivia();
                        window._actualizarColorStatsSeguir();
                        window._seleccionarCriterioActividad(window._actividadCriterioActual);
                    };

                        // FAB mobile — un solo botón que alterna Películas/Series
                        // (en desktop el switch de 2 opciones sigue intacto y visible).
                                               window._toggleFabModo = function() {
                                                   const activoBtn = document.querySelector('.cine-switch-option.active');
                                                   const actual = activoBtn ? activoBtn.dataset.tipo : 'peliculas';
                                                   const nuevo = actual === 'peliculas' ? 'series' : 'peliculas';
                                                   window.setAdnTipo(nuevo);
                                                   const fab = document.getElementById('btnFabModo');
                                                   if (fab) {
                                                       fab.innerHTML = nuevo === 'series' ? '<i class="fas fa-tv"></i>' : '<i class="fas fa-film"></i>';
                                                       fab.title = nuevo === 'series' ? 'Cambiar a Películas' : 'Cambiar a Series';
                                                   }
                                                   window._flashCambioModo(nuevo);
                                               };

                                               // Como ya no queda ningún título fijo en pantalla ("Mi Sala
                                               // Cinéfila"/"Mi lado seriéfilo"), este flash + toast es la
                                               // única señal de que TODO el contenido de abajo cambió de
                                               // categoría — sin esto, un cambio repentino de color en toda
                                               // la pantalla se lee como un glitch, no como información.
                                               window._flashCambioModo = function(nuevo) {
                                                   const flash = document.getElementById('cineModoFlash');
                                                   const toast = document.getElementById('cineModoToast');
                                                   if (!flash || !toast) return;

                                                   const color = nuevo === 'series' ? '#2e6fd6' : '#e50914';
                                                   const mensaje = nuevo === 'series' ? 'Bienvenido a mi lado seriéfilo' : 'Bienvenido a mi lado cinéfilo';

                                                   flash.style.background = color;
                                                   flash.style.opacity = '0.35';
                                                   flash.style.transition = 'none';
                                                   flash.style.display = 'block';
                                                   requestAnimationFrame(() => {
                                                       flash.style.transition = 'opacity 0.5s ease';
                                                       flash.style.opacity = '0';
                                                   });
                                                   setTimeout(() => { flash.style.display = 'none'; }, 550);

                                                  toast.textContent = mensaje;
                                                  toast.style.background = color;
                                                  toast.style.top = '50%';
                                                  toast.style.bottom = 'auto';
                                                  toast.style.left = '50%';
                                                  toast.style.transform = 'translate(-50%, -50%)';
                                                  toast.style.opacity = '0';
                                                  toast.style.transition = 'none';
                                                  toast.style.display = 'block';
                                                   requestAnimationFrame(() => {
                                                       toast.style.transition = 'opacity 0.3s ease';
                                                       toast.style.opacity = '1';
                                                   });
                                                   clearTimeout(window._cineModoToastTimeout);
                                                   window._cineModoToastTimeout = setTimeout(() => {
                                                       toast.style.opacity = '0';
                                                       setTimeout(() => { toast.style.display = 'none'; }, 300);
                                                   }, 2000);
                                               };
                window._renderFavoritaVista = async function(movieId, datos) {
                    const posterEl = document.getElementById('perfilFavoritaPoster');
                    const tituloEl = document.getElementById('perfilFavoritaTitulo');
                    if (!posterEl || !tituloEl) return;

                                if (!movieId) {
                                    tituloEl.textContent = 'Sin elegir todavía';
                                    posterEl.innerHTML = '';
                                    posterEl.style.cursor = 'default';
                                    posterEl.onclick = null;
                                    return;
                                }
                                // Si ya vienen resueltos desde el payload del perfil (carga
                                // inicial), pintamos directo sin pedir nada más — evita el
                                // fetch a /movies/{id} que hacía lenta la carga de "Mis
                                // gustos". Si no vienen (recién elegido a mano), sigue
                                // pidiéndolo como siempre.
                                if (datos) {
                                    tituloEl.textContent = datos.titulo || '—';
                                    posterEl.innerHTML = datos.poster
                                        ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">`
                                        : '';
                                    posterEl.style.cursor = 'pointer';
                                    posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
                                    return;
                                }
                                try {
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (!res.ok) throw new Error();
                                    const m = await res.json();
                                    tituloEl.textContent = m.title || '—';
                                    posterEl.innerHTML = m.poster_path
                                        ? `<img src="https://image.tmdb.org/t/p/w185${m.poster_path}" alt="${m.title || ''}" style="width:100%;height:100%;object-fit:cover;">`
                                        : '';
                                    posterEl.style.cursor = 'pointer';
                                    posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
                                } catch (e) {
                                    tituloEl.textContent = '—';
                                }
                            };

                    window._renderVistaCineVista = async function(movieId) {
            const posterEl = document.getElementById('perfilVistaCinePoster');
            const tituloEl = document.getElementById('perfilVistaCineTitulo');
            if (!posterEl || !tituloEl) return;

            if (!movieId) {
                tituloEl.textContent = 'Sin elegir todavía';
                posterEl.innerHTML = '';
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                const m = await res.json();
                tituloEl.textContent = m.title || '—';
                posterEl.innerHTML = m.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w185${m.poster_path}" alt="${m.title || ''}" style="width:100%;height:100%;object-fit:cover;">`
                    : '';
            } catch (e) {
                tituloEl.textContent = '—';
            }
        };

                window.abrirEdicionFavorita = function() {
                    window.cancelarEdicionVistaCine();
                    window.cancelarEdicionNoMeCanso();
                    window.cancelarEdicionNoLaBanco();
            document.getElementById('perfilFavoritaVista').style.display = 'none';
            document.getElementById('perfilFavoritaEdicion').style.display = 'block';
            document.getElementById('btnEditarFavorita').style.display = 'none';
            const input = document.getElementById('inputFavoritaBusqueda');
            input.value = '';
            input.focus();
        };

        window.cancelarEdicionFavorita = function() {
            document.getElementById('perfilFavoritaEdicion').style.display = 'none';
            document.getElementById('favoritaResultados').style.display = 'none';
            document.getElementById('perfilFavoritaVista').style.display = 'flex';
            document.getElementById('btnEditarFavorita').style.display = 'inline-flex';
        };

                window._elegirFavorita = async function(movieId) {
                    const token = localStorage.getItem('token');
                    try {
                        const res = await fetch(`${CONFIG.API_URL}/users/me/pelicula-favorita`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ movieId })
                        });
                        if (!res.ok) throw new Error();
                        document.getElementById('perfilFavoritaEdicion').style.display = 'none';
                        document.getElementById('favoritaResultados').style.display = 'none';
                        document.getElementById('perfilFavoritaVista').style.display = 'flex';
                        document.getElementById('btnEditarFavorita').style.display = 'inline-flex';
                        await window._renderFavoritaVista(movieId);
                    } catch (e) {
                        alert('Error al guardar. Intentá de nuevo.');
                    }
                };

                window._elegirVistaCine = async function(movieId) {
                    const token = localStorage.getItem('token');
                    try {
                        const res = await fetch(`${CONFIG.API_URL}/users/me/ultima-vista-cine`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ movieId })
                        });
                        if (!res.ok) throw new Error();
                        document.getElementById('perfilVistaCineEdicion').style.display = 'none';
                        document.getElementById('vistaCineResultados').style.display = 'none';
                        document.getElementById('btnEditarVistaCine').style.display = 'inline-flex';
                        await window._renderVistaCineVista(movieId);
                    } catch (e) {
                        alert('Error al guardar. Intentá de nuevo.');
                    }
                };

                let _favoritaTimeout = null;
                window._buscarFavorita = function(query) {
            clearTimeout(_favoritaTimeout);
            const resultados = document.getElementById('favoritaResultados');
            if (!query || query.trim().length < 2) {
                resultados.style.display = 'none';
                resultados.innerHTML = '';
                return;
            }
            _favoritaTimeout = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams();
                    params.append('query', query.trim());
                    params.append('page', 1);
                    const res = await fetch(`${CONFIG.API_URL}/movies/search?${params.toString()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    const items = (data.results || []).slice(0, 6);

                    if (items.length === 0) {
                        resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>';
                        resultados.style.display = 'block';
                        return;
                    }

                    resultados.innerHTML = items.map(m => {
                        const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                        const poster = m.poster_path
                            ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">`
                            : `<div style="width:32px;height:46px;background:#f5f5f5;border-radius:4px;"></div>`;
                        return `
                            <div class="favorita-resultado-item" onclick="window._elegirFavorita(${m.id})"
                                 style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">
                                ${poster}
                                <div>
                                    <p style="font-size:0.85rem;margin:0;">${m.title || ''}</p>
                                    <p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p>
                                </div>
                            </div>`;
                    }).join('');
                    resultados.style.display = 'block';
                } catch (e) {
                    resultados.style.display = 'none';
                }
            }, 300);
        };

        window._elegirFavorita = async function(movieId) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/users/me/pelicula-favorita`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ movieId })
                });
                if (!res.ok) throw new Error();

                document.getElementById('perfilFavoritaEdicion').style.display = 'none';
                document.getElementById('favoritaResultados').style.display = 'none';
                document.getElementById('perfilFavoritaVista').style.display = 'flex';
                document.getElementById('btnEditarFavorita').style.display = 'inline-flex';

                await window._renderFavoritaVista(movieId);
            } catch (e) {
                alert('Error al guardar tu película favorita. Intentá de nuevo.');
            }
        };

                window._renderVistaCineVista = async function(movieId, datos) {
                    const posterEl = document.getElementById('perfilVistaCinePoster');
                    const tituloEl = document.getElementById('perfilVistaCineTitulo');
                    if (!posterEl || !tituloEl) return;

                            if (!movieId) {
                                tituloEl.textContent = 'Sin elegir todavía';
                                posterEl.innerHTML = '';
                                posterEl.style.cursor = 'default';
                                posterEl.onclick = null;
                                return;
                            }
                            if (datos) {
                                tituloEl.textContent = datos.titulo || '—';
                                posterEl.innerHTML = datos.poster
                                    ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">`
                                    : '';
                                posterEl.style.cursor = 'pointer';
                                posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
                                return;
                            }
                            try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (!res.ok) throw new Error();
                                const m = await res.json();
                                tituloEl.textContent = m.title || '—';
                                posterEl.innerHTML = m.poster_path
                                    ? `<img src="https://image.tmdb.org/t/p/w185${m.poster_path}" alt="${m.title || ''}" style="width:100%;height:100%;object-fit:cover;">`
                                    : '';
                                posterEl.style.cursor = 'pointer';
                                posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
                            } catch (e) {
                                tituloEl.textContent = '—';
                            }
                        };

                            window.abrirEdicionVistaCine = function() {
                    window.cancelarEdicionFavorita();
                    window.cancelarEdicionNoMeCanso();
                    window.cancelarEdicionNoLaBanco();
            document.getElementById('perfilVistaCineVista').style.display = 'none';
            document.getElementById('perfilVistaCineEdicion').style.display = 'block';
            document.getElementById('btnEditarVistaCine').style.display = 'none';
            const input = document.getElementById('inputVistaCineBusqueda');
            input.value = '';
            input.focus();
        };

            window.cancelarEdicionVistaCine = function() {
                document.getElementById('perfilVistaCineEdicion').style.display = 'none';
                document.getElementById('vistaCineResultados').style.display = 'none';
                document.getElementById('perfilVistaCineVista').style.display = 'flex';
                document.getElementById('btnEditarVistaCine').style.display = 'inline-flex';
            };

        let _vistaCineTimeout = null;
        window._buscarVistaCine = function(query) {
            clearTimeout(_vistaCineTimeout);
            const resultados = document.getElementById('vistaCineResultados');
            if (!query || query.trim().length < 2) {
                resultados.style.display = 'none';
                resultados.innerHTML = '';
                return;
            }
            _vistaCineTimeout = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams();
                    params.append('query', query.trim());
                    params.append('page', 1);
                    const res = await fetch(`${CONFIG.API_URL}/movies/search?${params.toString()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    const items = (data.results || []).slice(0, 6);
                    if (items.length === 0) {
                        resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>';
                        resultados.style.display = 'block';
                        return;
                    }
                    resultados.innerHTML = items.map(m => {
                        const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                        const poster = m.poster_path
                            ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">`
                            : `<div style="width:32px;height:46px;background:#333;border-radius:4px;"></div>`;
                        return `
                            <div class="vistacine-resultado-item" onclick="window._elegirVistaCine(${m.id})"
                                 style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">
                                ${poster}
                                <div>
                                    <p style="font-size:0.85rem;margin:0;color:#f2f0ea;">${m.title || ''}</p>
                                    <p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p>
                                </div>
                            </div>`;
                    }).join('');
                    resultados.style.display = 'block';
                } catch (e) {
                    resultados.style.display = 'none';
                }
            }, 300);
        };

        window._elegirVistaCine = async function(movieId) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/users/me/ultima-vista-cine`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ movieId })
                });
                if (!res.ok) throw new Error();

                    document.getElementById('perfilVistaCineEdicion').style.display = 'none';
                    document.getElementById('vistaCineResultados').style.display = 'none';
                    document.getElementById('perfilVistaCineVista').style.display = 'flex';
                    document.getElementById('btnEditarVistaCine').style.display = 'inline-flex';

                await window._renderVistaCineVista(movieId);
            } catch (e) {
                alert('Error al guardar. Intentá de nuevo.');
            }
        };

        window._renderNoMeCansoVista = async function(movieId, datos) {
            const posterEl = document.getElementById('perfilNoMeCansoPoster');
            const tituloEl = document.getElementById('perfilNoMeCansoTitulo');
            if (!posterEl || !tituloEl) return;
            if (!movieId) { tituloEl.textContent = 'Sin elegir todavía'; posterEl.innerHTML = ''; posterEl.style.cursor = 'default'; posterEl.onclick = null; return; }
            if (datos) {
                tituloEl.textContent = datos.titulo || '—';
                posterEl.innerHTML = datos.poster ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
                posterEl.style.cursor = 'pointer';
                posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error();
                const m = await res.json();
                tituloEl.textContent = m.title || '—';
                posterEl.innerHTML = m.poster_path ? `<img src="https://image.tmdb.org/t/p/w185${m.poster_path}" alt="${m.title || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
                posterEl.style.cursor = 'pointer';
                posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
            } catch (e) { tituloEl.textContent = '—'; }
        };

        window._renderNoLaBancoVista = async function(movieId, datos) {
            const posterEl = document.getElementById('perfilNoLaBancoPoster');
            const tituloEl = document.getElementById('perfilNoLaBancoTitulo');
            if (!posterEl || !tituloEl) return;
            if (!movieId) { tituloEl.textContent = 'Sin elegir todavía'; posterEl.innerHTML = ''; posterEl.style.cursor = 'default'; posterEl.onclick = null; return; }
            if (datos) {
                tituloEl.textContent = datos.titulo || '—';
                posterEl.innerHTML = datos.poster ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
                posterEl.style.cursor = 'pointer';
                posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error();
                const m = await res.json();
                tituloEl.textContent = m.title || '—';
                posterEl.innerHTML = m.poster_path ? `<img src="https://image.tmdb.org/t/p/w185${m.poster_path}" alt="${m.title || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
                posterEl.style.cursor = 'pointer';
                posterEl.onclick = () => window._abrirPeliculaDesdePerfil(movieId);
            } catch (e) { tituloEl.textContent = '—'; }
        };

        window.abrirEdicionNoMeCanso = function() {
            window.cancelarEdicionFavorita();
            window.cancelarEdicionVistaCine();
            window.cancelarEdicionNoLaBanco();
            document.getElementById('perfilNoMeCansoVista').style.display = 'none';
            document.getElementById('perfilNoMeCansoEdicion').style.display = 'block';
            document.getElementById('btnEditarNoMeCanso').style.display = 'none';
            const input = document.getElementById('inputNoMeCansoBusqueda');
            input.value = '';
            input.focus();
        };

        window.cancelarEdicionNoMeCanso = function() {
            document.getElementById('perfilNoMeCansoEdicion').style.display = 'none';
            document.getElementById('noMeCansoResultados').style.display = 'none';
            document.getElementById('perfilNoMeCansoVista').style.display = 'flex';
            document.getElementById('btnEditarNoMeCanso').style.display = 'inline-flex';
        };

        window.abrirEdicionNoLaBanco = function() {
            window.cancelarEdicionFavorita();
            window.cancelarEdicionVistaCine();
            window.cancelarEdicionNoMeCanso();
            document.getElementById('perfilNoLaBancoVista').style.display = 'none';
            document.getElementById('perfilNoLaBancoEdicion').style.display = 'block';
            document.getElementById('btnEditarNoLaBanco').style.display = 'none';
            const input = document.getElementById('inputNoLaBancoBusqueda');
            input.value = '';
            input.focus();
        };

        window.cancelarEdicionNoLaBanco = function() {
            document.getElementById('perfilNoLaBancoEdicion').style.display = 'none';
            document.getElementById('noLaBancoResultados').style.display = 'none';
            document.getElementById('perfilNoLaBancoVista').style.display = 'flex';
            document.getElementById('btnEditarNoLaBanco').style.display = 'inline-flex';
        };

        let _noMeCansoTimeout = null;
        window._buscarNoMeCanso = function(query) {
            clearTimeout(_noMeCansoTimeout);
            const resultados = document.getElementById('noMeCansoResultados');
            if (!query || query.trim().length < 2) { resultados.style.display = 'none'; resultados.innerHTML = ''; return; }
            _noMeCansoTimeout = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams();
                    params.append('query', query.trim());
                    params.append('page', 1);
                    const res = await fetch(`${CONFIG.API_URL}/movies/search?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    const items = (data.results || []).slice(0, 6);
                    if (items.length === 0) { resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>'; resultados.style.display = 'block'; return; }
                    resultados.innerHTML = items.map(m => {
                        const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                        const poster = m.poster_path ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">` : `<div style="width:32px;height:46px;background:#333;border-radius:4px;"></div>`;
                        return `<div class="nomecanso-resultado-item" onclick="window._elegirNoMeCanso(${m.id})" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">${poster}<div><p style="font-size:0.85rem;margin:0;color:#f2f0ea;">${m.title || ''}</p><p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p></div></div>`;
                    }).join('');
                    resultados.style.display = 'block';
                } catch (e) { resultados.style.display = 'none'; }
            }, 300);
        };

        let _noLaBancoTimeout = null;
        window._buscarNoLaBanco = function(query) {
            clearTimeout(_noLaBancoTimeout);
            const resultados = document.getElementById('noLaBancoResultados');
            if (!query || query.trim().length < 2) { resultados.style.display = 'none'; resultados.innerHTML = ''; return; }
            _noLaBancoTimeout = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('token');
                    const params = new URLSearchParams();
                    params.append('query', query.trim());
                    params.append('page', 1);
                    const res = await fetch(`${CONFIG.API_URL}/movies/search?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!res.ok) throw new Error();
                    const data = await res.json();
                    const items = (data.results || []).slice(0, 6);
                    if (items.length === 0) { resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>'; resultados.style.display = 'block'; return; }
                    resultados.innerHTML = items.map(m => {
                        const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                        const poster = m.poster_path ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">` : `<div style="width:32px;height:46px;background:#333;border-radius:4px;"></div>`;
                        return `<div class="nolabanco-resultado-item" onclick="window._elegirNoLaBanco(${m.id})" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">${poster}<div><p style="font-size:0.85rem;margin:0;color:#f2f0ea;">${m.title || ''}</p><p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p></div></div>`;
                    }).join('');
                    resultados.style.display = 'block';
                } catch (e) { resultados.style.display = 'none'; }
            }, 300);
        };

        window._elegirNoMeCanso = async function(movieId) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/users/me/no-me-canso-de-ver`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ movieId })
                });
                if (!res.ok) throw new Error();
                document.getElementById('perfilNoMeCansoEdicion').style.display = 'none';
                document.getElementById('noMeCansoResultados').style.display = 'none';
                document.getElementById('perfilNoMeCansoVista').style.display = 'flex';
                document.getElementById('btnEditarNoMeCanso').style.display = 'inline-flex';
                await window._renderNoMeCansoVista(movieId);
            } catch (e) { alert('Error al guardar. Intentá de nuevo.'); }
        };

        window._elegirNoLaBanco = async function(movieId) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/users/me/no-la-banco`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ movieId })
                });
                if (!res.ok) throw new Error();
                document.getElementById('perfilNoLaBancoEdicion').style.display = 'none';
                document.getElementById('noLaBancoResultados').style.display = 'none';
                document.getElementById('perfilNoLaBancoVista').style.display = 'flex';
                document.getElementById('btnEditarNoLaBanco').style.display = 'inline-flex';
                await window._renderNoLaBancoVista(movieId);
            } catch (e) { alert('Error al guardar. Intentá de nuevo.'); }
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

window._abrirSerieDesdePerfil = async function(seriesId) {
    if (!seriesId) return;

    if (typeof window._asegurarModalPeliculaEnDOM === 'function') {
        await window._asegurarModalPeliculaEnDOM();
    }
    if (typeof window.abrirDetalleSerie === 'function') {
        window.abrirDetalleSerie(seriesId);
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

                        // Ya venía en la respuesta (es un Page de Spring), solo faltaba leerlo.
                        const metricaPub = document.getElementById('perfilPublicaciones');
                        if (metricaPub) metricaPub.textContent = data.totalElements ?? pubs.length;

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
                                <span class="cine-ver-todas-pub" onclick="window.abrirTodasLasPublicacionesPerfil(${userId})"
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

            const herramientaActivaTile = (window.CreatorTools || []).find(t => typeof t.activoPara === 'function' && t.activoPara(pub));
                        if (herramientaActivaTile) {
                            return `
                                <div class="perfil-pub-tile" data-perfil-pub-id="${pub.id}" onclick="window.abrirPublicacionDesdePerfi(${pub.id})"
                                     style="aspect-ratio:1;border-radius:8px;overflow:hidden;position:relative;cursor:pointer;
                                            background:#f8f6ff;display:flex;flex-direction:column;">
                                    <div style="padding:8px 10px 4px;text-align:center;">
                                        <span style="font-size:0.66rem;font-weight:800;color:#5a3fa0;text-transform:uppercase;
                                                     letter-spacing:0.3px;">
                                            ${herramientaActivaTile.label}
                                        </span>
                                    </div>
                                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0 10px;">
                                            <span style="font-size:2.2rem;line-height:1;">${herramientaActivaTile.emoji}</span>
                                            ${pub.title ? `<p style="font-size:0.72rem;font-weight:600;color:#5a3fa0;margin:0;line-height:1.3;text-align:center;
                                                                       display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                                                ${escapeHtmlPerfil(pub.title)}
                                            </p>` : ''}
                                        </div>
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

window._activarStatClickeable = function(wrapId, cantidad, onClickFn) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.dataset.cantidad = cantidad;
    if (cantidad > 0) {
        wrap.style.cursor = 'pointer';
        wrap.onclick = onClickFn;
    } else {
        wrap.style.cursor = 'default';
        wrap.onclick = null;
    }
    window._actualizarColorStatsSeguir();
};

// Rojo en modo Películas, azul en modo Series — mismo criterio de color
// que el resto de "Mi Sala". Se re-llama desde setAdnTipo cada vez que
// cambia el switch, así el color sigue al modo aunque la cantidad de
// seguidores/seguidos no haya cambiado.
window._actualizarColorStatsSeguir = function() {
    const tipo = document.querySelector('.cine-switch-option.active')?.dataset.tipo || 'peliculas';
    const color = tipo === 'series' ? 'var(--cine-accent-series)' : 'var(--cine-accent)';
    ['perfilSeguidoresWrap', 'perfilSiguiendoWrap'].forEach(id => {
        const wrap = document.getElementById(id);
        if (!wrap) return;
        const lbl = wrap.querySelector('.cine-stat-lbl');
        const cantidad = Number(wrap.dataset.cantidad || 0);
        if (!lbl) return;
        if (cantidad > 0) { lbl.style.color = color; lbl.style.textDecoration = 'underline'; }
        else { lbl.style.color = ''; lbl.style.textDecoration = 'none'; }
    });
};

// ==============================================
// ÚLTIMOS COMENTARIOS DE SERIES — toggle en el mismo header
// ==============================================
window._perfilComentariosTipo = 'pelicula';
let _stackComentariosSeries = [];
let _stackIndiceComentariosSeries = 0;

function renderComentariosSerie(comentarios) {
    const wrapper = document.getElementById('perfilComentariosSeriesList');
    if (!wrapper) return;

    if (!comentarios || comentarios.length === 0) {
                wrapper.innerHTML = '<div class="cine-stack-vacio-wrap"><div class="cine-stack-vacio cine-stack-vacio--series"></div><p class="cine-stack-vacio-lbl">Sin comentarios aún</p></div>';
        return;
    }

        _stackComentariosSeries = comentarios;
        _stackIndiceComentariosSeries = 0;
        window._comentariosSeriesPage = 0;
        window._comentariosSeriesHayMas = true;
        window._comentariosSeriesCargandoMas = false;

        wrapper.innerHTML = `
                          <p class="cine-stack-eyebrow">COMENTARIOS (${window._perfilCounts?.comentariosSeries || 0})</p>
        <div class="cine-stack-area">
            <button class="cine-stack-nav prev" onclick="window._moverStackComentariosSeries(-1)"><i class="fas fa-chevron-left"></i></button>
            <div id="cineStackComentariosSeriesContainer" style="position:relative; width:100%; height:100%;"></div>
            <button class="cine-stack-nav next" onclick="window._moverStackComentariosSeries(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <p class="cine-stack-titulo" id="cineStackComentariosSeriesTitulo"></p>
    `;

    const cont = document.getElementById('cineStackComentariosSeriesContainer');
    cont.innerHTML = comentarios.map((c, i) => {
        const poster = c.posterPath
            ? `<img src="https://image.tmdb.org/t/p/w185${c.posterPath}" alt="${c.seriesTitle || ''}">`
            : `<div class="placeholder"><i class="fas fa-tv"></i></div>`;
        return `
        <div class="cine-stack-card" onclick="window._abrirVinetaComentarioSerie(${i})">
            ${poster}
            <div class="cine-badge-comentario"><i class="fas fa-comment-dots"></i></div>
        </div>`;
    }).join('');

    window._renderStackPosicionesComentariosSeries();
}

window._renderStackPosicionesComentariosSeries = function() {
    const cards = document.querySelectorAll('#cineStackComentariosSeriesContainer .cine-stack-card');
    const N = _stackComentariosSeries.length;
    cards.forEach((card, i) => {
        let diff = i - _stackIndiceComentariosSeries;
        if (diff > N / 2) diff -= N;
        if (diff < -N / 2) diff += N;
        const offset = (diff >= 0 && diff <= 2) ? diff : -1;

        // Mismo fix que en Películas comentadas: solo la card de adelante
        // es clickeable, las de atrás quedan inertes hasta pasar al frente.
        card.style.pointerEvents = offset === 0 ? 'auto' : 'none';

        if (offset === 0) {
            card.style.transform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
            card.style.opacity = 1; card.style.zIndex = 10;
        } else if (offset === 1) {
            card.style.transform = 'translateX(-18px) translateY(10px) scale(0.94) rotate(-3deg)';
            card.style.opacity = 0.6; card.style.zIndex = 8;
        } else if (offset === 2) {
            card.style.transform = 'translateX(-36px) translateY(20px) scale(0.88) rotate(-6deg)';
            card.style.opacity = 0.3; card.style.zIndex = 7;
        } else {
            card.style.transform = 'translateX(260px) translateY(-10px) scale(0.8) rotate(16deg)';
            card.style.opacity = 0; card.style.zIndex = 5;
        }
    });
    const tituloEl = document.getElementById('cineStackComentariosSeriesTitulo');
    if (tituloEl && _stackComentariosSeries[_stackIndiceComentariosSeries]) {
        tituloEl.textContent = _stackComentariosSeries[_stackIndiceComentariosSeries].seriesTitle || '—';
    }
};

window._moverStackComentariosSeries = async function(dir) {
    const N = _stackComentariosSeries.length;
    if (N === 0) return;

    const proximoIndice = (_stackIndiceComentariosSeries + dir + N) % N;

    if (dir > 0 && proximoIndice === 0 && window._comentariosSeriesHayMas && !window._comentariosSeriesCargandoMas) {
        window._comentariosSeriesCargandoMas = true;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/users/${perfilUsuarioId}/comentarios-series?page=${window._comentariosSeriesPage + 1}&size=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.comentarios && data.comentarios.length > 0) {
                    window._comentariosSeriesPage++;
                    window._comentariosSeriesHayMas = data.hayMas;
                    _agregarComentariosSerieAlStack(data.comentarios);
                } else {
                    window._comentariosSeriesHayMas = false;
                }
            }
        } catch (e) {}
        window._comentariosSeriesCargandoMas = false;
    }

    const NFinal = _stackComentariosSeries.length;
    _stackIndiceComentariosSeries = (_stackIndiceComentariosSeries + dir + NFinal) % NFinal;
    window._renderStackPosicionesComentariosSeries();
    window._cerrarVineta();
};

function _agregarComentariosSerieAlStack(nuevos) {
    _stackComentariosSeries = _stackComentariosSeries.concat(nuevos);
    const cont = document.getElementById('cineStackComentariosSeriesContainer');
    const offsetIdx = _stackComentariosSeries.length - nuevos.length;
    const nuevoHtml = nuevos.map((c, i) => {
        const poster = c.posterPath
            ? `<img src="https://image.tmdb.org/t/p/w185${c.posterPath}" alt="${c.seriesTitle || ''}">`
            : `<div class="placeholder"><i class="fas fa-tv"></i></div>`;
        return `
        <div class="cine-stack-card" onclick="window._abrirVinetaComentarioSerie(${offsetIdx + i})">
            ${poster}
            <div class="cine-badge-comentario"><i class="fas fa-comment-dots"></i></div>
        </div>`;
    }).join('');
    cont.insertAdjacentHTML('beforeend', nuevoHtml);
}

window._abrirVinetaComentarioSerie = function(i) {
    const c = _stackComentariosSeries[i];
    if (!c) return;
    const overlay   = document.getElementById('cineVinetaOverlay');
    const box       = document.getElementById('cineVinetaBox');
    const spoilerEl = document.getElementById('cineVinetaSpoiler');

        document.getElementById('cineVinetaFuente').textContent = c.seriesTitle || '';
        document.getElementById('cineVinetaTexto').textContent  = c.contenido || '';
        spoilerEl.style.display = c.spoiler ? 'inline-block' : 'none';

        window._vinetaContexto = { tipo: 'serie', id: c.seriesId, commentId: c.commentId, spoiler: c.spoiler };

        const cardEl = document.querySelectorAll('#cineStackComentariosSeriesContainer .cine-stack-card')[i];
        const rect = cardEl.getBoundingClientRect();
        const maxLeft = window.innerWidth - 240 - 12;
        box.style.left = Math.min(rect.left, maxLeft) + 'px';
        box.style.top  = (rect.top - 160) + 'px';

    overlay.style.display = 'block';
    box.style.display = 'block';
    requestAnimationFrame(() => box.classList.add('show'));

    window.addEventListener('scroll', window._cerrarVinetaPorScroll, { passive: true });
};

window._abrirTotemVineta = function() {
    if (!window._adnGeneroActual) return;

    const overlay = document.getElementById('totemVinetaOverlay');
    const box = document.getElementById('totemVinetaBox');
    const textoEl = document.getElementById('totemVinetaTexto');
    const totemEl = document.getElementById('perfilAdnEmoji');
    if (!overlay || !box || !textoEl || !totemEl) return;

    textoEl.textContent = TOTEM_FRASE[window._adnGeneroActual] || '¡Hola! 👋';

        const rect = totemEl.getBoundingClientRect();
        const maxLeft = window.innerWidth - 160 - 12;
        box.style.left = Math.min(Math.max(rect.left, 12), maxLeft) + window.scrollX + 'px';
        box.style.top  = (rect.top - 60) + window.scrollY + 'px';

    overlay.style.display = 'block';
    box.style.display = 'block';
    requestAnimationFrame(() => box.classList.add('show'));

    window.addEventListener('scroll', window._cerrarTotemVineta, { passive: true });
};

window._cerrarTotemVineta = function() {
    const overlay = document.getElementById('totemVinetaOverlay');
    const box = document.getElementById('totemVinetaBox');
    if (!overlay || !box) return;
    box.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; box.style.display = 'none'; }, 200);
    window.removeEventListener('scroll', window._cerrarTotemVineta);
};

window._abrirSerieDesdeComentario = async function(seriesId, commentId, esSpoiler) {
    if (!seriesId) return;

    if (typeof window._asegurarModalPeliculaEnDOM === 'function') {
        await window._asegurarModalPeliculaEnDOM();
    }

    if (typeof window.abrirDetalleSerie !== 'function') return;

    window.abrirDetalleSerie(seriesId);

    if (commentId) {
        setTimeout(async () => {
            if (esSpoiler && typeof window.activarModoSpoilerSerie === 'function') {
                window.activarModoSpoilerSerie(true);
            }
            await new Promise(r => setTimeout(r, 600));

            let intentos = 0;
            const buscarYResaltar = () => {
                const comentarioEl = document.getElementById(`comment-serie-${commentId}`);
                if (comentarioEl) {
                    const scrollContainer = document.querySelector('#modalSerie .modal-body')
                                        || document.querySelector('#modalSerie .modal-contenido');
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
// SERIE FAVORITA
// ==============================================
window._renderSerieFavoritaVista = async function(seriesId, datos) {
    const posterEl = document.getElementById('perfilSerieFavoritaPoster');
    const tituloEl = document.getElementById('perfilSerieFavoritaTitulo');
    if (!posterEl || !tituloEl) return;
    if (!seriesId) { tituloEl.textContent = 'Sin elegir todavía'; posterEl.innerHTML = ''; posterEl.style.cursor = 'default'; posterEl.onclick = null; return; }
    if (datos) {
        tituloEl.textContent = datos.titulo || '—';
        posterEl.innerHTML = datos.poster ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
        return;
    }
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const s = await res.json();
        tituloEl.textContent = s.name || '—';
        posterEl.innerHTML = s.poster_path
            ? `<img src="https://image.tmdb.org/t/p/w185${s.poster_path}" alt="${s.name || ''}" style="width:100%;height:100%;object-fit:cover;">`
            : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
    } catch (e) { tituloEl.textContent = '—'; }
};

window.abrirEdicionSerieFavorita = function() {
    window.cancelarEdicionUltimaMaraton();
    window.cancelarEdicionNoMeCansoSerie();
    window.cancelarEdicionNoLaBancoSerie();
    document.getElementById('perfilSerieFavoritaVista').style.display = 'none';
    document.getElementById('perfilSerieFavoritaEdicion').style.display = 'block';
    document.getElementById('btnEditarSerieFavorita').style.display = 'none';
    const input = document.getElementById('inputSerieFavoritaBusqueda');
    input.value = '';
    input.focus();
};

window.cancelarEdicionSerieFavorita = function() {
    document.getElementById('perfilSerieFavoritaEdicion').style.display = 'none';
    document.getElementById('serieFavoritaResultados').style.display = 'none';
    document.getElementById('perfilSerieFavoritaVista').style.display = 'flex';
    document.getElementById('btnEditarSerieFavorita').style.display = 'inline-flex';
};

let _serieFavoritaTimeout = null;
window._buscarSerieFavorita = function(query) {
    clearTimeout(_serieFavoritaTimeout);
    const resultados = document.getElementById('serieFavoritaResultados');
    if (!query || query.trim().length < 2) { resultados.style.display = 'none'; resultados.innerHTML = ''; return; }
    _serieFavoritaTimeout = setTimeout(async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('query', query.trim());
            params.append('page', 1);
            const res = await fetch(`${CONFIG.API_URL}/series/search?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const items = (data.results || []).slice(0, 6);
            if (items.length === 0) {
                resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>';
                resultados.style.display = 'block';
                return;
            }
            resultados.innerHTML = items.map(s => {
                const anio = s.first_air_date ? s.first_air_date.slice(0, 4) : '';
                const poster = s.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w92${s.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">`
                    : `<div style="width:32px;height:46px;background:#f5f5f5;border-radius:4px;"></div>`;
                return `
                    <div class="favorita-resultado-item" onclick="window._elegirSerieFavorita(${s.id})"
                         style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">
                        ${poster}
                        <div>
                            <p style="font-size:0.85rem;margin:0;">${s.name || ''}</p>
                            <p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p>
                        </div>
                    </div>`;
            }).join('');
            resultados.style.display = 'block';
        } catch (e) { resultados.style.display = 'none'; }
    }, 300);
};

window._elegirSerieFavorita = async function(seriesId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me/serie-favorita`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ seriesId })
        });
        if (!res.ok) throw new Error();
        document.getElementById('perfilSerieFavoritaEdicion').style.display = 'none';
        document.getElementById('serieFavoritaResultados').style.display = 'none';
        document.getElementById('perfilSerieFavoritaVista').style.display = 'flex';
        document.getElementById('btnEditarSerieFavorita').style.display = 'inline-flex';
        await window._renderSerieFavoritaVista(seriesId);
    } catch (e) { alert('Error al guardar. Intentá de nuevo.'); }
};

// ==============================================
// ÚLTIMA QUE VI EN MARATÓN
// ==============================================
window._renderUltimaMaratonVista = async function(seriesId, datos) {
    const posterEl = document.getElementById('perfilUltimaMaratonPoster');
    const tituloEl = document.getElementById('perfilUltimaMaratonTitulo');
    if (!posterEl || !tituloEl) return;
    if (!seriesId) { tituloEl.textContent = 'Sin elegir todavía'; posterEl.innerHTML = ''; posterEl.style.cursor = 'default'; posterEl.onclick = null; return; }
    if (datos) {
        tituloEl.textContent = datos.titulo || '—';
        posterEl.innerHTML = datos.poster ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
        return;
    }
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const s = await res.json();
        tituloEl.textContent = s.name || '—';
        posterEl.innerHTML = s.poster_path
            ? `<img src="https://image.tmdb.org/t/p/w185${s.poster_path}" alt="${s.name || ''}" style="width:100%;height:100%;object-fit:cover;">`
            : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
    } catch (e) { tituloEl.textContent = '—'; }
};

window.abrirEdicionUltimaMaraton = function() {
    window.cancelarEdicionSerieFavorita();
    window.cancelarEdicionNoMeCansoSerie();
    window.cancelarEdicionNoLaBancoSerie();
    document.getElementById('perfilUltimaMaratonVista').style.display = 'none';
    document.getElementById('perfilUltimaMaratonEdicion').style.display = 'block';
    document.getElementById('btnEditarUltimaMaraton').style.display = 'none';
    const input = document.getElementById('inputUltimaMaratonBusqueda');
    input.value = '';
    input.focus();
};

window.cancelarEdicionUltimaMaraton = function() {
    document.getElementById('perfilUltimaMaratonEdicion').style.display = 'none';
    document.getElementById('ultimaMaratonResultados').style.display = 'none';
    document.getElementById('perfilUltimaMaratonVista').style.display = 'flex';
    document.getElementById('btnEditarUltimaMaraton').style.display = 'inline-flex';
};

let _ultimaMaratonTimeout = null;
window._buscarUltimaMaraton = function(query) {
    clearTimeout(_ultimaMaratonTimeout);
    const resultados = document.getElementById('ultimaMaratonResultados');
    if (!query || query.trim().length < 2) { resultados.style.display = 'none'; resultados.innerHTML = ''; return; }
    _ultimaMaratonTimeout = setTimeout(async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('query', query.trim());
            params.append('page', 1);
            const res = await fetch(`${CONFIG.API_URL}/series/search?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const items = (data.results || []).slice(0, 6);
            if (items.length === 0) {
                resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>';
                resultados.style.display = 'block';
                return;
            }
            resultados.innerHTML = items.map(s => {
                const anio = s.first_air_date ? s.first_air_date.slice(0, 4) : '';
                const poster = s.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w92${s.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">`
                    : `<div style="width:32px;height:46px;background:#f5f5f5;border-radius:4px;"></div>`;
                return `
                    <div class="favorita-resultado-item" onclick="window._elegirUltimaMaraton(${s.id})"
                         style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">
                        ${poster}
                        <div>
                            <p style="font-size:0.85rem;margin:0;">${s.name || ''}</p>
                            <p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p>
                        </div>
                    </div>`;
            }).join('');
            resultados.style.display = 'block';
        } catch (e) { resultados.style.display = 'none'; }
    }, 300);
};

window._elegirUltimaMaraton = async function(seriesId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me/ultima-maraton`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ seriesId })
        });
        if (!res.ok) throw new Error();
        document.getElementById('perfilUltimaMaratonEdicion').style.display = 'none';
        document.getElementById('ultimaMaratonResultados').style.display = 'none';
        document.getElementById('perfilUltimaMaratonVista').style.display = 'flex';
        document.getElementById('btnEditarUltimaMaraton').style.display = 'inline-flex';
        await window._renderUltimaMaratonVista(seriesId);
    } catch (e) { alert('Error al guardar. Intentá de nuevo.'); }
};

// ==============================================
// LA QUE NO ME CANSO DE VER (SERIE)
// ==============================================
window._renderNoMeCansoSerieVista = async function(seriesId, datos) {
    const posterEl = document.getElementById('perfilNoMeCansoSeriePoster');
    const tituloEl = document.getElementById('perfilNoMeCansoSerieTitulo');
    if (!posterEl || !tituloEl) return;
    if (!seriesId) { tituloEl.textContent = 'Sin elegir todavía'; posterEl.innerHTML = ''; posterEl.style.cursor = 'default'; posterEl.onclick = null; return; }
    if (datos) {
        tituloEl.textContent = datos.titulo || '—';
        posterEl.innerHTML = datos.poster ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
        return;
    }
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const s = await res.json();
        tituloEl.textContent = s.name || '—';
        posterEl.innerHTML = s.poster_path
            ? `<img src="https://image.tmdb.org/t/p/w185${s.poster_path}" alt="${s.name || ''}" style="width:100%;height:100%;object-fit:cover;">`
            : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
    } catch (e) { tituloEl.textContent = '—'; }
};

window.abrirEdicionNoMeCansoSerie = function() {
    window.cancelarEdicionSerieFavorita();
    window.cancelarEdicionUltimaMaraton();
    window.cancelarEdicionNoLaBancoSerie();
    document.getElementById('perfilNoMeCansoSerieVista').style.display = 'none';
    document.getElementById('perfilNoMeCansoSerieEdicion').style.display = 'block';
    document.getElementById('btnEditarNoMeCansoSerie').style.display = 'none';
    const input = document.getElementById('inputNoMeCansoSerieBusqueda');
    input.value = '';
    input.focus();
};

window.cancelarEdicionNoMeCansoSerie = function() {
    document.getElementById('perfilNoMeCansoSerieEdicion').style.display = 'none';
    document.getElementById('noMeCansoSerieResultados').style.display = 'none';
    document.getElementById('perfilNoMeCansoSerieVista').style.display = 'flex';
    document.getElementById('btnEditarNoMeCansoSerie').style.display = 'inline-flex';
};

let _noMeCansoSerieTimeout = null;
window._buscarNoMeCansoSerie = function(query) {
    clearTimeout(_noMeCansoSerieTimeout);
    const resultados = document.getElementById('noMeCansoSerieResultados');
    if (!query || query.trim().length < 2) { resultados.style.display = 'none'; resultados.innerHTML = ''; return; }
    _noMeCansoSerieTimeout = setTimeout(async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('query', query.trim());
            params.append('page', 1);
            const res = await fetch(`${CONFIG.API_URL}/series/search?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const items = (data.results || []).slice(0, 6);
            if (items.length === 0) {
                resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>';
                resultados.style.display = 'block';
                return;
            }
            resultados.innerHTML = items.map(s => {
                const anio = s.first_air_date ? s.first_air_date.slice(0, 4) : '';
                const poster = s.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w92${s.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">`
                    : `<div style="width:32px;height:46px;background:#f5f5f5;border-radius:4px;"></div>`;
                return `
                    <div class="favorita-resultado-item" onclick="window._elegirNoMeCansoSerie(${s.id})"
                         style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">
                        ${poster}
                        <div>
                            <p style="font-size:0.85rem;margin:0;">${s.name || ''}</p>
                            <p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p>
                        </div>
                    </div>`;
            }).join('');
            resultados.style.display = 'block';
        } catch (e) { resultados.style.display = 'none'; }
    }, 300);
};

window._elegirNoMeCansoSerie = async function(seriesId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me/no-me-canso-de-ver-serie`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ seriesId })
        });
        if (!res.ok) throw new Error();
        document.getElementById('perfilNoMeCansoSerieEdicion').style.display = 'none';
        document.getElementById('noMeCansoSerieResultados').style.display = 'none';
        document.getElementById('perfilNoMeCansoSerieVista').style.display = 'flex';
        document.getElementById('btnEditarNoMeCansoSerie').style.display = 'inline-flex';
        await window._renderNoMeCansoSerieVista(seriesId);
    } catch (e) { alert('Error al guardar. Intentá de nuevo.'); }
};

// ==============================================
// LA QUE TODOS AMAN Y YO NO BANCO (SERIE)
// ==============================================
window._renderNoLaBancoSerieVista = async function(seriesId, datos) {
    const posterEl = document.getElementById('perfilNoLaBancoSeriePoster');
    const tituloEl = document.getElementById('perfilNoLaBancoSerieTitulo');
    if (!posterEl || !tituloEl) return;
    if (!seriesId) { tituloEl.textContent = 'Sin elegir todavía'; posterEl.innerHTML = ''; posterEl.style.cursor = 'default'; posterEl.onclick = null; return; }
    if (datos) {
        tituloEl.textContent = datos.titulo || '—';
        posterEl.innerHTML = datos.poster ? `<img src="https://image.tmdb.org/t/p/w185${datos.poster}" alt="${datos.titulo || ''}" style="width:100%;height:100%;object-fit:cover;">` : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
        return;
    }
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const s = await res.json();
        tituloEl.textContent = s.name || '—';
        posterEl.innerHTML = s.poster_path
            ? `<img src="https://image.tmdb.org/t/p/w185${s.poster_path}" alt="${s.name || ''}" style="width:100%;height:100%;object-fit:cover;">`
            : '';
        posterEl.style.cursor = 'pointer';
        posterEl.onclick = () => window._abrirSerieDesdePerfil(seriesId);
    } catch (e) { tituloEl.textContent = '—'; }
};

window.abrirEdicionNoLaBancoSerie = function() {
    window.cancelarEdicionSerieFavorita();
    window.cancelarEdicionUltimaMaraton();
    window.cancelarEdicionNoMeCansoSerie();
    document.getElementById('perfilNoLaBancoSerieVista').style.display = 'none';
    document.getElementById('perfilNoLaBancoSerieEdicion').style.display = 'block';
    document.getElementById('btnEditarNoLaBancoSerie').style.display = 'none';
    const input = document.getElementById('inputNoLaBancoSerieBusqueda');
    input.value = '';
    input.focus();
};

window.cancelarEdicionNoLaBancoSerie = function() {
    document.getElementById('perfilNoLaBancoSerieEdicion').style.display = 'none';
    document.getElementById('noLaBancoSerieResultados').style.display = 'none';
    document.getElementById('perfilNoLaBancoSerieVista').style.display = 'flex';
    document.getElementById('btnEditarNoLaBancoSerie').style.display = 'inline-flex';
};

let _noLaBancoSerieTimeout = null;
window._buscarNoLaBancoSerie = function(query) {
    clearTimeout(_noLaBancoSerieTimeout);
    const resultados = document.getElementById('noLaBancoSerieResultados');
    if (!query || query.trim().length < 2) { resultados.style.display = 'none'; resultados.innerHTML = ''; return; }
    _noLaBancoSerieTimeout = setTimeout(async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('query', query.trim());
            params.append('page', 1);
            const res = await fetch(`${CONFIG.API_URL}/series/search?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const items = (data.results || []).slice(0, 6);
            if (items.length === 0) {
                resultados.innerHTML = '<div style="padding:0.6rem;color:#999;font-size:0.85rem;">Sin resultados</div>';
                resultados.style.display = 'block';
                return;
            }
            resultados.innerHTML = items.map(s => {
                const anio = s.first_air_date ? s.first_air_date.slice(0, 4) : '';
                const poster = s.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w92${s.poster_path}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;">`
                    : `<div style="width:32px;height:46px;background:#f5f5f5;border-radius:4px;"></div>`;
                return `
                    <div class="favorita-resultado-item" onclick="window._elegirNoLaBancoSerie(${s.id})"
                         style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;">
                        ${poster}
                        <div>
                            <p style="font-size:0.85rem;margin:0;">${s.name || ''}</p>
                            <p style="font-size:0.75rem;color:#999;margin:0;">${anio}</p>
                        </div>
                    </div>`;
            }).join('');
            resultados.style.display = 'block';
        } catch (e) { resultados.style.display = 'none'; }
    }, 300);
};

window._elegirNoLaBancoSerie = async function(seriesId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me/no-la-banco-serie`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ seriesId })
        });
        if (!res.ok) throw new Error();
        document.getElementById('perfilNoLaBancoSerieEdicion').style.display = 'none';
        document.getElementById('noLaBancoSerieResultados').style.display = 'none';
        document.getElementById('perfilNoLaBancoSerieVista').style.display = 'flex';
        document.getElementById('btnEditarNoLaBancoSerie').style.display = 'inline-flex';
        await window._renderNoLaBancoSerieVista(seriesId);
    } catch (e) { alert('Error al guardar. Intentá de nuevo.'); }
};

// ==============================================
// RANKING TRIVIA — pilar "Saber"
// Cada card se muestra solo si el usuario jugó esa trivia alguna vez
// (ranking null = nunca jugó, no se renderiza esa card puntual).
// ==============================================
window._renderRankingTrivia = function(rankingPeliculas, rankingSeries) {
    const wrapperPeliculas = document.getElementById('rankingTriviaPeliculasWrapper');
    const numeroPeliculas = document.getElementById('rankingTriviaPeliculasNumero');
    if (wrapperPeliculas && numeroPeliculas) {
        if (rankingPeliculas != null) {
            numeroPeliculas.textContent = '#' + rankingPeliculas;
            wrapperPeliculas.dataset.tieneRanking = '1';
        } else {
            wrapperPeliculas.dataset.tieneRanking = '0';
        }
    }

    const wrapperSeries = document.getElementById('rankingTriviaSeriesWrapper');
    const numeroSeries = document.getElementById('rankingTriviaSeriesNumero');
    if (wrapperSeries && numeroSeries) {
        if (rankingSeries != null) {
            numeroSeries.textContent = '#' + rankingSeries;
            wrapperSeries.dataset.tieneRanking = '1';
        } else {
            wrapperSeries.dataset.tieneRanking = '0';
        }
    }

    // La visibilidad real (cuál de las dos se ve) la decide el switch
    // Películas/Series, no esta función — solo deja marcado si hay dato.
        window._actualizarVisibilidadRankingTrivia();
        window._actualizarColorStatsSeguir();
    };

window._abrirModalGeneroAdn = async function(generoId, generoNombre, tipo, emoji) {
    const modal = document.getElementById('modalGeneroAdn');
    const tituloEl = document.getElementById('modalGeneroAdnTitulo');
    const carrusel = document.getElementById('modalGeneroAdnCarrusel');
    if (!modal || !tituloEl || !carrusel) return;

        const palabraTipo = tipo === 'series' ? 'series' : 'pelis';
        const esMobile = window.matchMedia('(max-width: 768px)').matches;
                    const colorGenero = tipo === 'series' ? '#2e6fd6' : '#e50914';
                tituloEl.innerHTML = esMobile
                    ? `Estas ${palabraTipo} componen mi lado de:<br><span class="modal-genero-adn-nombre-centrado" style="color:${colorGenero};">${generoNombre} ${emoji || ''}</span>`
                    : `Estas ${palabraTipo} componen mi lado de ${generoNombre} ${emoji || ''}`;
    carrusel.innerHTML = '<div style="padding:1rem;"><i class="fas fa-spinner fa-spin"></i></div>';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const url = tipo === 'series'
        ? `${CONFIG.API_URL}/users/${perfilUsuarioId}/adn-cinefilo-series/genero/${generoId}/series`
        : `${CONFIG.API_URL}/users/${perfilUsuarioId}/adn-cinefilo/genero/${generoId}/peliculas`;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const items = await res.json();

                if (items.length === 0) {
                    carrusel.classList.remove('mazo-mobile');
                    carrusel.innerHTML = '<p style="padding:1rem; color:#999; font-size:0.85rem;">No hay nada para mostrar todavía.</p>';
                    return;
                }

                                // Mazo apilado en ambos casos — desktop navega con las
                                // flechas, mobile con swipe, pero el look es el mismo.
                                window._pintarMazoGeneroAdn(items, tipo, carrusel);
                            } catch (e) {
                carrusel.classList.remove('mazo-mobile');
                carrusel.innerHTML = '<p style="padding:1rem; color:#999; font-size:0.85rem;">No se pudo cargar. Probá de nuevo.</p>';
            }
        };

        // Mazo apilado (mobile) — misma idea visual que "Mi actividad": una
        // carta arriba (clickeable, abre la ficha), 2 asomando atrás como
        // referencia, y swipe para pasar a la siguiente. Autocontenido, no
        // depende de _inicializarSwipeStacks (esa está atada a los 8
        // wrappers fijos de "Mi actividad"; acá la cantidad es variable
        // según el género).
                window._pintarMazoGeneroAdn = function(items, tipo, carrusel) {
                    carrusel.classList.add('mazo-mobile');
                    let indice = 0;
                    const N = items.length;

                    // Las flechas de desktop (fuera de esta función) llaman a
                    // window._moverCarruselGeneroAdn(direccion) — se reasigna acá
                    // adentro, con closure sobre indice/pintar/N, mismo criterio
                    // que ya usa el swipe táctil un poco más abajo.
                    window._moverCarruselGeneroAdn = function(direccion) {
                        indice = direccion < 0 ? (indice - 1 + N) % N : (indice + 1) % N;
                        pintar();
                    };

            let tituloMazo = document.getElementById('modalGeneroAdnMazoTitulo');
            if (tituloMazo) tituloMazo.remove();
            tituloMazo = document.createElement('p');
            tituloMazo.id = 'modalGeneroAdnMazoTitulo';
            carrusel.after(tituloMazo);

            // Todas las cartas se crean una sola vez (todas centradas en el
            // mismo punto vía CSS), y lo único que cambia al navegar es su
            // transform/opacity/z-index — igual que _renderStackPosiciones en
            // "Mi actividad", no se recrea el HTML en cada swipe.
                carrusel.innerHTML = items.map(item => {
                    const id = tipo === 'series' ? item.seriesId : item.movieId;
                    const abrir = tipo === 'series'
                        ? `window._cerrarModalGeneroAdn(); window._abrirSerieDesdePerfil(${id})`
                        : `window._cerrarModalGeneroAdn(); window._abrirPeliculaDesdePerfil(${id})`;
                    const poster = item.poster
                        ? `<img src="https://image.tmdb.org/t/p/w185${item.poster}" alt="" style="width:100%;height:100%;object-fit:cover;">`
                        : '';
                    return `<div class="modal-genero-adn-card" onclick="${abrir}">${poster}</div>`;
                }).join('');

            const cards = carrusel.querySelectorAll('.modal-genero-adn-card');

            const pintar = () => {
                cards.forEach((card, i) => {
                    let diff = i - indice;
                    if (diff > N / 2) diff -= N;
                    if (diff < -N / 2) diff += N;
                    const offset = (diff >= 0 && diff <= 2) ? diff : -1;

                    if (offset === 0) {
                        card.style.transform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
                        card.style.opacity = 1; card.style.zIndex = 10;
                    } else if (offset === 1) {
                        card.style.transform = 'translateX(-18px) translateY(10px) scale(0.94) rotate(-3deg)';
                        card.style.opacity = 0.6; card.style.zIndex = 8;
                    } else if (offset === 2) {
                        card.style.transform = 'translateX(-36px) translateY(20px) scale(0.88) rotate(-6deg)';
                        card.style.opacity = 0.3; card.style.zIndex = 7;
                    } else {
                        card.style.transform = 'translateX(260px) translateY(-10px) scale(0.8) rotate(16deg)';
                        card.style.opacity = 0; card.style.zIndex = 5;
                    }
                });
                tituloMazo.textContent = items[indice] ? items[indice].titulo : '';
            };

            pintar();

            let startX = 0;
            carrusel.ontouchstart = (e) => { startX = e.touches[0].clientX; };
            carrusel.ontouchend = (e) => {
                const dx = e.changedTouches[0].clientX - startX;
                if (Math.abs(dx) < 40) return;
                indice = dx < 0 ? (indice - 1 + N) % N : (indice + 1) % N;
                pintar();
            };
        };

window._cerrarModalGeneroAdn = function() {
    const modal = document.getElementById('modalGeneroAdn');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window._actualizarVisibilidadRankingTrivia = function() {
    const tipo = document.querySelector('.cine-switch-option.active')?.dataset.tipo || 'peliculas';
    const wrapperPeliculas = document.getElementById('rankingTriviaPeliculasWrapper');
    const wrapperSeries = document.getElementById('rankingTriviaSeriesWrapper');
    if (wrapperPeliculas) {
        wrapperPeliculas.style.display = (tipo === 'peliculas' && wrapperPeliculas.dataset.tieneRanking === '1') ? 'block' : 'none';
    }
    if (wrapperSeries) {
        wrapperSeries.style.display = (tipo === 'series' && wrapperSeries.dataset.tieneRanking === '1') ? 'block' : 'none';
    }
};


// ==============================================
// SELECTOR DE AVATAR (calcado de mi-cuenta.js, adaptado a Mi Sala:
// actualiza #perfilAvatar en vez de #profileAvatar, y usa
// showToast(tipo, msg) en vez de mostrarToast(msg, tipo) — perfil.js
// ya usa esa firma en otro lado de este mismo archivo).
// ==============================================
let avatarSeleccionado = null;
let avatarCategoriaActual = 'predefinidos';

window.abrirSelectorAvatar = function() {
    avatarSeleccionado = null;
    document.getElementById('avatarError').style.display = 'none';

    document.querySelectorAll('.avatar-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.avatar-tab:first-child').classList.add('active');

    document.getElementById('avatarFileInput').value = '';
    document.getElementById('avatarPreview').style.display = 'none';

    document.getElementById('modalSelectorAvatar').style.display = 'flex';

    const tabPredefinidos = document.querySelector('.avatar-tab:first-child');
    window.cambiarCategoriaAvatar('predefinidos', tabPredefinidos);
};

window.cerrarSelectorAvatar = function() {
    document.getElementById('modalSelectorAvatar').style.display = 'none';
};

window.cambiarCategoriaAvatar = function(categoria, btn) {
    document.querySelectorAll('.avatar-tab').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');

    avatarCategoriaActual = categoria;

    if (categoria === 'predefinidos') {
        document.getElementById('avatarPredefinidos').style.display = 'grid';
        document.getElementById('avatarPersonalizado').style.display = 'none';
        _cargarAvataresPredefinidosPerfil();
    } else {
        document.getElementById('avatarPredefinidos').style.display = 'none';
        document.getElementById('avatarPersonalizado').style.display = 'block';
        _inicializarFileInputAvatarPerfil();

        const fileInput = document.getElementById('avatarFileInput');
        const preview = document.getElementById('avatarPreview');
        const previewImg = document.getElementById('avatarPreviewImg');
        if (fileInput?.files[0] && preview && previewImg) {
            const reader = new FileReader();
            reader.onload = e => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    }
};

async function _cargarAvataresPredefinidosPerfil() {
    const grid = document.getElementById('avatarPredefinidos');
    grid.innerHTML = '<div class="avatar-loading"><i class="fas fa-spinner fa-spin"></i> Cargando avatares...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/avatars/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al cargar avatares');
        const avatares = await response.json();

        if (avatares.length === 0) {
            grid.innerHTML = '<div class="avatar-loading">No hay avatares disponibles</div>';
            return;
        }

        grid.innerHTML = avatares.map(avatar => `
            <div class="avatar-item" onclick="window.seleccionarAvatar(${avatar.id}, this)">
                <img src="${avatar.imageUrl}" alt="${avatar.name}">
                <span class="avatar-item-name">${avatar.name}</span>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<div class="avatar-loading">Error al cargar avatares</div>';
    }
}

window.seleccionarAvatar = function(avatarId, elemento) {
    document.querySelectorAll('.avatar-item').forEach(item => item.classList.remove('selected'));
    elemento.classList.add('selected');
    avatarSeleccionado = avatarId;
};

function _inicializarFileInputAvatarPerfil() {
    const fileInput = document.getElementById('avatarFileInput');
    if (!fileInput || fileInput._listenerAttached) return;
    fileInput._listenerAttached = true;

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const errorEl = document.getElementById('avatarError');

        if (!file.type.startsWith('image/')) {
            errorEl.textContent = 'Solo se permiten archivos de imagen (JPG, PNG, WEBP)';
            errorEl.style.display = 'block';
            this.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            errorEl.textContent = 'La imagen no puede superar los 5MB';
            errorEl.style.display = 'block';
            this.value = '';
            return;
        }

        errorEl.style.display = 'none';

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('avatarPreview');
            const img = document.getElementById('avatarPreviewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}

window.guardarAvatar = async function() {
    const errorEl = document.getElementById('avatarError');
    errorEl.style.display = 'none';

    const btn    = document.getElementById('btnGuardarAvatar');
    const texto  = document.getElementById('btnGuardarAvatarTexto');
    const loader = document.getElementById('btnGuardarAvatarLoader');

    btn.disabled = true;
    texto.style.display  = 'none';
    loader.style.display = 'inline-block';

    try {
        const token = localStorage.getItem('token');
        let response;

        if (avatarCategoriaActual === 'predefinidos') {
            if (!avatarSeleccionado) throw new Error('Seleccioná un avatar');
            response = await fetch(`${CONFIG.API_URL}/users/me/avatar/${avatarSeleccionado}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else {
            const fileInput = document.getElementById('avatarFileInput');
            const file = fileInput.files[0];
            if (!file) throw new Error('Seleccioná una imagen');

            const formData = new FormData();
            formData.append('file', file);

            response = await fetch(`${CONFIG.API_URL}/users/me/avatar/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
        }

        const data = await response.json();

        if (response.ok) {
            // Foto en Mi Sala
            const avatarContainer = document.getElementById('perfilAvatar');
            if (avatarContainer) avatarContainer.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" class="avatar-img">`;

            // Y en el header del dashboard, si está presente
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) headerAvatar.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" class="avatar-img">`;

            window.cerrarSelectorAvatar();
            if (typeof showToast === 'function') {
                showToast('success', data.message || 'Avatar actualizado');
            }
        } else {
            throw new Error(data.message || 'Error al guardar avatar');
        }
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        texto.style.display  = 'inline';
        loader.style.display = 'none';
    }
};

// ==============================================
// CERRAR EDICIÓN AL CLICKEAR AFUERA — "Mis gustos o
// preferencias" (Favorita/VistaCine/NoMeCanso/NoLaBanco,
// Películas y Series). Un click en cualquier parte de la
// pantalla que no sea el panel abierto ni su lápiz cierra
// la edición y vuelve el mazo a su vista normal.
// ==============================================
document.addEventListener('click', function(e) {
    const paneles = [
        ['perfilFavoritaEdicion', 'btnEditarFavorita', 'cancelarEdicionFavorita'],
        ['perfilVistaCineEdicion', 'btnEditarVistaCine', 'cancelarEdicionVistaCine'],
        ['perfilNoMeCansoEdicion', 'btnEditarNoMeCanso', 'cancelarEdicionNoMeCanso'],
        ['perfilNoLaBancoEdicion', 'btnEditarNoLaBanco', 'cancelarEdicionNoLaBanco'],
        ['perfilSerieFavoritaEdicion', 'btnEditarSerieFavorita', 'cancelarEdicionSerieFavorita'],
        ['perfilUltimaMaratonEdicion', 'btnEditarUltimaMaraton', 'cancelarEdicionUltimaMaraton'],
        ['perfilNoMeCansoSerieEdicion', 'btnEditarNoMeCansoSerie', 'cancelarEdicionNoMeCansoSerie'],
        ['perfilNoLaBancoSerieEdicion', 'btnEditarNoLaBancoSerie', 'cancelarEdicionNoLaBancoSerie']
    ];
    paneles.forEach(function(item) {
        const panel = document.getElementById(item[0]);
        const boton = document.getElementById(item[1]);
        if (!panel || panel.style.display === 'none') return;
        if (panel.contains(e.target)) return;
        if (boton && boton.contains(e.target)) return;
        if (typeof window[item[2]] === 'function') window[item[2]]();
    });
});