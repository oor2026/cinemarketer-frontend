// ==============================================
// comunidad.js — Feed Comunidad
// ==============================================

(function() {

    window._comunidadApiUrl = window.CONFIG?.API_URL || '';
    const API_URL = window._comunidadApiUrl;

    let _page = 0;
    let _size = 20;
    let _filtroTerritory = '';
    let _filtroTone = '';
    let _filtroHashtag = '';
    let _order = 'recent';
    let _loading = false;
    let _hasMore = true;

    // ==============================================
    // INIT
    // ==============================================
    window.initComunidad = function() {
        _page = 0;
        _hasMore = true;
        renderShell();
        cargarPublicaciones(true);
    };

    window.init_comunidad = window.initComunidad;

    // Exponer renderCard y cargarMisReacciones para uso en modal de notificaciones
    window.renderPublicacionModal = function(pub) {
        return renderCard(pub);
    };

    window.cargarReaccionesModal = function(pubId) {
        cargarMisReacciones(pubId);
    };

    // Exponer renderCard para uso en modal de notificaciones
    window.renderPublicacionModal = function(pub) {
        return renderCard(pub);
    };

    window.cargarReaccionesModal = function(pubId) {
            cargarMisReacciones(pubId);
        };

        // Puentes genéricos para que las herramientas de Creator Tools (archivos
        // aparte en js/creator-tools/) puedan leer y mutar el estado del workflow
        // sin acceso directo a la variable privada _wf, y disparar un re-render
        // después de cambiarlo. Countdown resuelve con parámetros explícitos
        // porque su estado es simple (un código de país); Votación necesita algo
        // más flexible (una lista de opciones que se agregan/quitan/editan), así
        // que usa este puente en vez de un setter puntual.
        window.getWfState = function() {
            return _wf;
        };
        window.wfRerenderWorkflow = function() {
                renderWorkflow();
            };

            // Recalcula si el botón "Continuar" del Paso 4 debe estar habilitado,
            // sin re-renderizar el panel entero — para usarlo dentro de listeners
            // de tecleo (ej. el textarea de opinión de Ranking Segmentada) sin
            // perder el foco del campo en cada letra.
            window.wfActualizarBotonContinuar = function() {
                if (_wf.paso !== 4) return;
                const btn = document.getElementById('wfBtnContinuarPaso4');
                if (!btn) return;
                const tool = (window.CreatorTools || []).find(t => t.key === _wf.creatorTool);
                const puede = !tool || typeof tool.puedeAvanzar !== 'function' || tool.puedeAvanzar(_wf);
                btn.disabled = !puede;
                btn.style.background = puede ? '#324C89' : '#e0e0e0';
                btn.style.color = puede ? 'white' : '#aaa';
                btn.style.cursor = puede ? 'pointer' : 'not-allowed';
            };

        // NOTA: window.resolverFichaPelicula ahora se define directamente en
        // js/creator-tools/ficha-pelicula.js, no acá — esa herramienta vive
        // completa en su propio archivo. novedades.js sigue llamándola igual,
        // sin cambios de su lado.

        // ==============================================
        // SHELL HTML
        // ==============================================
        function renderShell() {
        const container = document.getElementById('comunidad-container');
        if (!container) return;

        container.innerHTML = `
            <div class="com-layout">

                <!-- COLUMNA IZQUIERDA: categorías -->
                <div class="com-col-left">
                    <div class="com-col-left-inner">
                        <div class="com-categorias-label">Categorías</div>
                        <button class="com-cat-item active" data-territory="" onclick="window.filtrarComunidad('', this)">✨ Todo</button>
                        <button class="com-cat-item" data-territory="PELICULAS_SERIES" onclick="window.filtrarComunidad('PELICULAS_SERIES', this)">🎬 Películas</button>
                        <button class="com-cat-item" data-territory="LO_QUE_VIENE" onclick="window.filtrarComunidad('LO_QUE_VIENE', this)">📅 Estrenos</button>
                        <button class="com-cat-item" data-territory="GENTE_CINE" onclick="window.filtrarComunidad('GENTE_CINE', this)">🎭 Gente de cine</button>
                        <button class="com-cat-item" data-territory="PREMIOS" onclick="window.filtrarComunidad('PREMIOS', this)">🏆 Premios</button>
                        <button class="com-cat-item" data-territory="INDUSTRIA" onclick="window.filtrarComunidad('INDUSTRIA', this)">💰 Industria</button>
                        <button class="com-cat-item" data-territory="EXPERIENCIA" onclick="window.filtrarComunidad('EXPERIENCIA', this)">🍿 Experiencia</button>
                        <button class="com-cat-item" data-territory="ARTE_CULTURA" onclick="window.filtrarComunidad('ARTE_CULTURA', this)">🎓 Arte y cultura</button>
                        <button class="com-cat-item" data-territory="EVENTOS" onclick="window.filtrarComunidad('EVENTOS', this)">🎪 Eventos</button>
                    </div>
                </div>

                <!-- COLUMNA CENTRAL: feed -->
                <div class="com-col-center">
                    <!-- Caja nueva publicación -->
                        <div class="com-nueva-pub" onclick="window.abrirWorkflowPublicacion()">
                                <div class="com-nueva-pub-avatar" id="comAvatarCaja"></div>
                                <div class="com-nueva-pub-placeholder">¿Qué querés compartir sobre una película?</div>
                                <button class="com-nueva-pub-btn">+</button>
                            </div>

                            <!-- Banner Creator, solo mobile (en desktop ya está en la sidebar derecha) -->
                            <div id="comFeedCreatorBannerSlot" style="margin-bottom:0.75rem;"></div>

                            <!-- Filtro de hashtag activo -->
                        <div id="comHashtagFiltroActivo" style="display:none;align-items:center;gap:8px;
                             background:#fff0f0;border:1px solid #ffd6d6;color:#e50914;padding:8px 14px;
                             border-radius:8px;margin-bottom:0.75rem;font-size:0.85rem;font-weight:600;">
                            <i class="fas fa-hashtag"></i>
                            <span id="comHashtagFiltroTexto"></span>
                            <button onclick="window.limpiarFiltroHashtag()"
                                    style="margin-left:auto;background:none;border:none;color:#e50914;
                                           cursor:pointer;font-size:1rem;line-height:1;" title="Quitar filtro">✕</button>
                        </div>

                        <!-- Lista de publicaciones -->
                    <div class="com-feed" id="comFeed">
                        <div class="com-loading" id="comLoading">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>

                    <!-- Botón cargar más -->
                    <div id="comCargarMas" style="display:none; text-align:center; padding:1rem;">
                        <button onclick="window.cargarMasComunidad()" class="com-btn-mas">Ver más publicaciones</button>
                    </div>
                </div>

                <!-- COLUMNA DERECHA: widgets -->
                <div class="com-col-right">
                    <div class="com-col-right-inner">
                        <!-- Banner Creator (si no es Creator) o publicidad -->
                        <div class="com-widget com-widget-banner" id="comBannerRight"></div>

                        <!-- Tendencias -->
                        <div class="com-widget" id="comWidgetTendencias">
                            <div class="com-widget-title">Tendencias en Cinemarketer</div>
                            <div class="com-widget-empty">Próximamente</div>
                        </div>

                        <!-- Banner publicitario inferior -->
                        <div class="com-widget com-widget-banner" id="comBannerRightBottom">
                            <div class="com-widget-banner-ph">Publicidad</div>
                        </div>
                    </div>
                </div>

            </div>
        `;

        // Cargar avatar del usuario logueado en la caja
                const avatarUrl = localStorage.getItem('userAvatarUrl');
                const userName = localStorage.getItem('userName') || '';
                const inicial = userName.charAt(0).toUpperCase();
                const avatarEl = document.getElementById('comAvatarCaja');
                if (avatarEl) {
                    avatarEl.innerHTML = avatarUrl
                        ? `<img src="${avatarUrl}" alt="avatar">`
                        : `<span>${inicial}</span>`;
                }

                renderBannerCreator();
                                renderBannerCreatorFeed();
                            }

                            // Versión completa del banner Creator, para mobile — mismo diseño
                            // colapsable que en Mi Cuenta (reutiliza las clases .premium-banner
                            // de mi-cuenta.css/subscription.css, que ya están cargadas en toda
                            // la app). Si el usuario ya es Creator, no se muestra nada.
                            function renderBannerCreatorFeed() {
                                const slot = document.getElementById('comFeedCreatorBannerSlot');
                                if (!slot) return;

                                const isCreator = localStorage.getItem('userCreator') === 'true';
                                if (isCreator) { slot.innerHTML = ''; return; }

                                slot.innerHTML = `
                                    <div class="premium-banner creator-theme" id="comFeedCreatorBanner">
                                        <div class="premium-banner-toggle-row">
                                            <span class="premium-banner-toggle-label">🎬 Cinemarketer Creator</span>
                                            <button class="premium-banner-toggle" id="comFeedCreatorBannerToggle"
                                                    onclick="window.toggleCreatorBannerFeed()" aria-label="Colapsar banner">
                                                <i class="fas fa-chevron-up" id="comFeedCreatorBannerChevron"></i>
                                            </button>
                                        </div>
                                        <div class="premium-banner-colapsable" id="comFeedCreatorBannerColapsable">
                                            <div class="premium-banner-centro">
                                                <div class="premium-banner-badge">🎬 Para creadores</div>
                                                <p class="premium-banner-title">Cinemarketer Creator</p>
                                                <div class="premium-banner-price">$1999 <span>/ mes</span></div>
                                                <div class="premium-benefits-wrapper">
                                                    <ul class="premium-banner-benefits">
                                                        <li><span class="premium-check creator-theme"></span>Publicá con imagen y también con video/reels</li>
                                                        <li><span class="premium-check creator-theme"></span>Hasta 10 imágenes por publicación</li>
                                                        <li><span class="premium-check creator-theme"></span>Hasta 60 seg de reels por publicación</li>
                                                        <li><span class="premium-check creator-theme"></span>Publicá con encuestas, votaciones y mucho más</li>
                                                    </ul>
                                                </div>
                                                <button class="btn-suscribirse creator-theme" onclick="window.abrirDetallePlanCreator()">
                                                    Quiero ser Creator
                                                </button>
                                            </div>
                                        </div>
                                    </div>`;
                            }

                            window.toggleCreatorBannerFeed = function() {
                                const colapsable = document.getElementById('comFeedCreatorBannerColapsable');
                                const chevron    = document.getElementById('comFeedCreatorBannerChevron');
                                const label      = document.querySelector('#comFeedCreatorBanner .premium-banner-toggle-label');
                                if (!colapsable) return;
                                const colapsado = colapsable.style.display === 'none';
                                colapsable.style.display = colapsado ? '' : 'none';
                                if (chevron) chevron.classList.toggle('fa-chevron-up', colapsado);
                                if (chevron) chevron.classList.toggle('fa-chevron-down', !colapsado);
                                if (label) label.style.display = colapsado ? 'none' : 'inline';
                            };

            // Banner compacto de Creator en la columna derecha — si no es Creator,
                // banner de venta (reutiliza el modal de subscription.js). Si ya es
                // Creator, mini panel de estado en vez de caer directo a publicidad
                // genérica — mismo espíritu que el bloque "Creator activo" de Mi Cuenta,
                // condensado para el ancho angosto de este sidebar.
                async function renderBannerCreator() {
                    const slot = document.getElementById('comBannerRight');
                    if (!slot) return;

                    const isCreator = localStorage.getItem('userCreator') === 'true';
                    if (isCreator) {
                        let vencimientoTxt = '';
                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${window._comunidadApiUrl}/users/me`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.creatorUntil) {
                                    vencimientoTxt = new Date(data.creatorUntil).toLocaleDateString('es-AR', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    });
                                }
                            }
                        } catch(e) {}

                        slot.innerHTML = `
                            <div style="background:#241242;border-radius:10px;padding:0.9rem;color:white;">
                                <div style="display:inline-flex;align-items:center;gap:5px;background:#7c3aed;padding:3px 10px;
                                            border-radius:99px;font-size:0.68rem;font-weight:700;margin-bottom:8px;">
                                    <i class="fas fa-check-circle"></i> CREATOR ACTIVO
                                </div>
                                <ul style="list-style:none;padding:0;margin:0 0 8px;font-size:0.74rem;line-height:1.6;color:#e8dcff;">
                                    <li>✓ Video/reels activo</li>
                                    <li>✓ Hasta 10 imágenes por post</li>
                                    <li>✓ Hasta 60 seg de reel</li>
                                </ul>
                                <p style="margin:0;font-size:0.72rem;color:#c9a8ff;text-align:center;">
                                    ${vencimientoTxt ? `Renueva el ${vencimientoTxt}` : 'Suscripción activa'}
                                </p>
                            </div>`;
                        return;
                    }

                slot.innerHTML = `
                    <div style="background:#241242;border-radius:10px;padding:1rem;color:white;text-align:center;">
                        <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.5px;color:#c9a8ff;margin-bottom:6px;">
                            🎬 PARA CREADORES
                        </div>
                        <p style="margin:0 0 8px;font-size:0.95rem;font-weight:700;">Cinemarketer Creator</p>
                        <div style="font-size:1.3rem;font-weight:800;margin-bottom:10px;">
                            $1999 <span style="font-size:0.7rem;font-weight:400;opacity:0.7;">/ mes</span>
                        </div>
                        <ul style="list-style:none;padding:0;margin:0 0 12px;text-align:left;font-size:0.76rem;line-height:1.6;color:#e8dcff;">
                            <li>✓ Publicá con video/reels</li>
                            <li>✓ Hasta 10 imágenes por post</li>
                            <li>✓ Herramientas exclusivas</li>
                        </ul>
                        <button onclick="window.abrirDetallePlanCreator()"
                                style="width:100%;padding:8px;background:#7c3aed;border:none;border-radius:8px;
                                       color:white;font-weight:700;font-size:0.82rem;cursor:pointer;">
                            Quiero ser Creator
                        </button>
                    </div>`;
            }

    // ==============================================
    // CARGAR PUBLICACIONES
    // ==============================================
    async function cargarPublicaciones(reset = false) {
        if (_loading) return;
        _loading = true;

        if (reset) {
            _page = 0;
            _hasMore = true;
            const feed = document.getElementById('comFeed');
            if (feed) feed.innerHTML = '<div class="com-loading"><i class="fas fa-spinner fa-spin"></i></div>';
        }

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: _page,
                size: _size,
                order: _order,
            });
            if (_filtroTerritory) params.append('territoryGroup', _filtroTerritory);
            if (_filtroTone) params.append('tone', _filtroTone);
            if (_filtroHashtag) params.append('hashtag', _filtroHashtag);

            const res = await fetch(`${API_URL}/publications?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();

            const data = await res.json();
            const pubs = data.content || [];
            _hasMore = !data.last;

            const feed = document.getElementById('comFeed');
            if (!feed) return;

            if (reset) feed.innerHTML = '';

            if (pubs.length === 0 && reset) {
                feed.innerHTML = `
                    <div class="com-vacio">
                        <i class="fas fa-film"></i>
                        <p>Todavía no hay publicaciones aquí.<br>¡Sé el primero en compartir algo!</p>
                    </div>`;
            } else {
                pubs.forEach(pub => {
                    feed.insertAdjacentHTML('beforeend', renderCard(pub));
                    const cardEl = feed.querySelector(`.com-card[data-id="${pub.id}"]`);
                    if (cardEl) cardEl._pubData = pub;
                    const herramientaActivaFeed = (window.CreatorTools || []).find(t => typeof t.activoPara === 'function' && t.activoPara(pub));
                    if (herramientaActivaFeed && typeof herramientaActivaFeed.resolverEnCard === 'function') herramientaActivaFeed.resolverEnCard(pub);
                });

                // Cargar estado de reacciones propias
                pubs.forEach(pub => {
                    cargarMisReacciones(pub.id);
                });
            }

            const btnMas = document.getElementById('comCargarMas');
            if (btnMas) btnMas.style.display = _hasMore ? 'block' : 'none';

        } catch(e) {
            const feed = document.getElementById('comFeed');
            if (feed) feed.innerHTML = '<div class="com-vacio"><p>Error al cargar las publicaciones.</p></div>';
        } finally {
            _loading = false;
        }
    }

    window.cargarMasComunidad = function() {
        if (!_hasMore || _loading) return;
        _page++;
        cargarPublicaciones(false);
    };

    window.filtrarComunidad = function(territory, el) {
            _filtroTerritory = territory;
            document.querySelectorAll('.com-filtro-chip, .com-cat-item').forEach(c => c.classList.remove('active'));
            if (el) el.classList.add('active');
            window.limpiarFiltroHashtag(false);
            cargarPublicaciones(true);
        };

        window.filtrarPorHashtag = function(hashtag) {
            _filtroHashtag = hashtag;
            _filtroTerritory = '';
            _filtroTone = '';

            // El hashtag es transversal a los territorios: mostramos "Todo" activo
            // en el sidebar para comunicar que no hay restricción de categoría.
            document.querySelectorAll('.com-filtro-chip, .com-cat-item').forEach(c => c.classList.remove('active'));
            const chipTodo = document.querySelector('.com-cat-item[data-territory=""]');
            if (chipTodo) chipTodo.classList.add('active');

            const barra = document.getElementById('comHashtagFiltroActivo');
            const texto = document.getElementById('comHashtagFiltroTexto');
            if (barra && texto) {
                texto.textContent = `Mostrando publicaciones con #${hashtag}`;
                barra.style.display = 'flex';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            cargarPublicaciones(true);
        };

        window.limpiarFiltroHashtag = function(recargar = true) {
            _filtroHashtag = '';
            const barra = document.getElementById('comHashtagFiltroActivo');
            if (barra) barra.style.display = 'none';
            if (recargar) cargarPublicaciones(true);
        };

    // ==============================================
    // RENDER CARD
    // ==============================================
    function renderCard(pub) {
        const autor = pub.user || {};
        const inicial = (autor.name || 'U').charAt(0).toUpperCase();
        const avatarHtml = autor.avatarUrl
            ? `<img src="${autor.avatarUrl}" alt="${autor.name}">`
            : `<span>${inicial}</span>`;

        const hace = tiempoRelativo(pub.createdAt);
        const badgeTone = pub.tone ? `<span class="com-badge-tone">${pub.tone}</span>` : '';
        const badgeTerritory = pub.territoryGroup
            ? `<span class="com-badge-territory">${formatTerritory(pub.territoryGroup)}</span>` : '';

        // Genérico: busca en el registro de Creator Tools cuál herramienta
                // (si alguna) está activa para esta publicación, y le delega el render.
                const herramientaActivaPub = (window.CreatorTools || []).find(t => typeof t.activoPara === 'function' && t.activoPara(pub));

                const muestraPeliculaVinculada = !herramientaActivaPub || (
                    typeof herramientaActivaPub.muestraPeliculaVinculada === 'function'
                        ? herramientaActivaPub.muestraPeliculaVinculada(pub)
                        : !!herramientaActivaPub.muestraPeliculaVinculada
                );
                const peliculaHtml = pub.movieId && muestraPeliculaVinculada ? `
                    <div class="com-card-pelicula" onclick="window._abrirPeliculaDesdeModalPublicacion(${pub.movieId})">
                        <i class="fas fa-film"></i>
                        <span>Ver película vinculada</span>
                        <i class="fas fa-chevron-right" style="margin-left:auto;font-size:0.7rem;color:#ccc;"></i>
                    </div>` : '';

                const fichaPeliculaHtml = herramientaActivaPub && typeof herramientaActivaPub.renderEnCard === 'function'
                    ? herramientaActivaPub.renderEnCard(pub)
                    : '';

        const tituloHtml = pub.title
            ? `<div class="com-card-titulo" style="font-weight:700;font-size:1.15rem;color:#1a1a1a;margin:10px 0 12px;padding:0 1rem;word-break:break-word;overflow-wrap:break-word;">${escapeHtml(pub.title)}</div>`
            : '';

        const hashtagsHtml = (pub.hashtags && pub.hashtags.length > 0)
            ? `<div class="com-card-hashtags" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;padding:0 1rem;">
                    ${pub.hashtags.map(h => `<a href="javascript:void(0)" onclick="event.stopPropagation();window.filtrarPorHashtag('${h.replace(/'/g, "\\'")}')"
                        style="color:#e50914;font-size:0.85rem;font-weight:600;text-decoration:none;">#${escapeHtml(h)}</a>`).join('')}
               </div>`
            : '';

        const contenidoHtml = pub.spoiler
            ? `<div class="com-spoiler-mask" id="spoilerMask-${pub.id}">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Esta publicación contiene spoilers</span>
                    <button onclick="window.revelarSpoiler(${pub.id})">Ver bajo tu propio riesgo</button>
               </div>`
            : renderContenidoConVerMas(pub.id, pub.content);

        const carruselId = `carrusel-${pub.id}`;
                const imagenesHtml = pub.imageUrls && pub.imageUrls.length > 0
                    ? `<div class="com-card-imagenes-wrap">
                        <div class="com-card-imagenes" id="${carruselId}" ${pub.imageUrls.length > 1 ? `onscroll="window.actualizarContadorCarrusel(this)"` : ''}>
                            ${pub.imageUrls.map(url =>
                                `<img src="${url}" alt="imagen" onclick="window.abrirImagenFullscreen('${url}')">`
                            ).join('')}
                        </div>
                        ${pub.imageUrls.length > 1 ? `
                            <button class="com-carrusel-flecha izq" disabled onclick="window.moverCarrusel('${carruselId}', -1)">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="com-carrusel-flecha der" onclick="window.moverCarrusel('${carruselId}', 1)">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <span class="com-card-imagenes-contador" id="${carruselId}-contador">1/${pub.imageUrls.length}</span>
                        ` : ''}
                       </div>` : '';

        // videoUrl solo existe una vez que el video fue APPROVED — mientras está
        // PROCESSING o PENDING_REVIEW (Caso A o B), queda null a propósito y
        // por lo tanto no se renderiza nada acá, sin necesitar chequear el estado.
        const videoHtml = pub.videoUrl && pub.videoUid
            ? `<div class="com-card-video" style="border-radius:10px;overflow:hidden;margin:8px 0;">
                <iframe src="https://iframe.videodelivery.net/${pub.videoUid}"
                        style="width:100%;aspect-ratio:16/9;border:none;display:block;"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowfullscreen="true">
                </iframe>
               </div>` : '';

        const editadoHtml = pub.editedAt
            ? `<span class="com-editado">· editado</span>` : '';

        return `
            <div class="com-card" data-id="${pub.id}" data-created="${pub.createdAt || ''}" data-autor-id="${autor.id || ''}" data-autor-creator="${pub.authorWasCreator ? 'true' : 'false'}" data-video-uid="${pub.videoUid || ''}" data-movie-id="${pub.movieId || ''}" data-movie-ficha-enabled="${pub.movieFichaEnabled ? 'true' : 'false'}" data-creator-tool="${herramientaActivaPub ? herramientaActivaPub.key : ''}">
            <div class="com-card-header">
                <div class="com-card-avatar" onclick="window.abrirPerfilUsuario(${autor.id})">${avatarHtml}</div>
                <div class="com-card-meta">
                    <span class="com-card-autor" onclick="window.abrirPerfilUsuario(${autor.id})">${autor.name || 'Usuario'}</span>
                    <div class="com-card-badges">${badgeTerritory}${badgeTone}</div>
                    <span class="com-card-tiempo">${hace}${editadoHtml}</span>
                </div>
                <button class="com-card-menu-btn" onclick="window.abrirMenuPublicacion(${pub.id}, event)">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>

            ${tituloHtml}
            ${peliculaHtml}
            ${fichaPeliculaHtml}
            ${imagenesHtml}
            ${videoHtml}
            ${contenidoHtml}
            ${hashtagsHtml}

                <div class="com-card-acciones">
                <button class="com-accion-btn" onclick="window.toggleBanco(${pub.id}, this)" id="btnBanco-${pub.id}">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="com-banco-count" id="bancoCount-${pub.id}">0</span> Te banco
                </button>

                ${esPropiaPublicacion(pub) ? `
                    <button class="com-accion-btn" onclick="window.abrirComentariosPub(${pub.id})" id="btnComentar-${pub.id}">
                        <i class="fas fa-comment"></i>
                        <span id="comentCount-${pub.id}">${pub.commentCount > 0 ? pub.commentCount : ''}</span>
                        Comentar
                    </button>
                    ${puedeEditar(pub.createdAt) ? `
                    <button class="com-accion-btn" id="btnEditar-${pub.id}" onclick="window.editarPublicacion(${pub.id})">
                        <i class="fas fa-pen"></i> Editar
                    </button>` : ''}
                    <button class="com-accion-btn" onclick="window.compartirPublicacion(${pub.id})">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                ` : `
                    <button class="com-accion-btn btn-punto" onclick="window.togglePunto(${pub.id}, this)" id="btnPunto-${pub.id}" data-active="false">
                        <i class="fas fa-star"></i> ¡Merecés un punto!
                    </button>
                    <button class="com-accion-btn" onclick="window.abrirComentariosPub(${pub.id})" id="btnComentar-${pub.id}">
                        <i class="fas fa-comment"></i>
                        <span id="comentCount-${pub.id}">${pub.commentCount > 0 ? pub.commentCount : ''}</span>
                        Comentar
                    </button>
                `}
            </div>
        </div>`;
    }

    // ==============================================
    // ACCIONES
    // ==============================================
    window.revelarSpoiler = function(pubId) {
        const mask = document.getElementById(`spoilerMask-${pubId}`);
        if (mask) {
            const card = mask.closest('.com-card');
            const pub = card?._pubData;
            mask.outerHTML = renderContenidoConVerMas(pubId, pub?.content || '');
        }
    };

    window.toggleBanco = async function(pubId, btn) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/react?type=BANCO`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const countEl = document.getElementById(`bancoCount-${pubId}`);
            if (countEl) countEl.textContent = data.count;
            btn.classList.toggle('com-accion-active', data.added);
        } catch(e) {}
    };

    window.togglePunto = function(pubId, btn) {
            // Si ya dio el punto, mostrar toast irreversible
            if (btn.dataset.active === 'true') {
                window.mostrarToast('Ya le diste un punto a esta publicación. Esta acción es irreversible.', 'info');
                return;
            }

            // Obtener nombre del autor desde la card
            const card = document.querySelector(`.com-card[data-id="${pubId}"]`);
            const autorNombre = card?.querySelector('.com-card-autor')?.textContent?.trim() || 'este usuario';

            // Reutilizar el modal existente de merecePunto
            const modal = document.getElementById('modalMerecePunto');
            const nombreEl = document.getElementById('merecePuntoAutorNombre');
            const btnConfirmar = document.getElementById('btnConfirmarMerecePunto');

            if (!modal || !nombreEl || !btnConfirmar) {
                // Fallback si el modal no está disponible
                if (!confirm(`¿Querés darle un punto a ${autorNombre}? Esta acción es irreversible.`)) return;
                _ejecutarTogglePunto(pubId, btn);
                return;
            }

            nombreEl.textContent = autorNombre;
            modal.style.display = 'flex';

            // Reemplazar el onclick del botón confirmar temporalmente
            const nuevoBtn = btnConfirmar.cloneNode(true);
            btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);
            nuevoBtn.addEventListener('click', async () => {
                modal.style.display = 'none';
                await _ejecutarTogglePunto(pubId, btn);
            });
        };

        async function _ejecutarTogglePunto(pubId, btn) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/react?type=PUNTO`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    btn.classList.add('com-accion-active');
                    btn.dataset.active = 'true';
                }
            } catch(e) {}
        }

    window.compartirPublicacion = function(pubId) {
            const url = `${window.location.origin}/publicacion?id=${pubId}`;
        if (navigator.share) {
            navigator.share({ url });
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    window.abrirMenuPublicacion = function(pubId, event) {
            event.stopPropagation();

            // Si el menú ya está abierto para esta misma publicación, el click lo cierra (toggle)
            const existente = document.querySelector('.com-card-menu-dropdown');
            const yaAbiertoParaEste = existente && existente.dataset.pubId === String(pubId);

            // Cerrar cualquier menú de publicación abierto (solo puede haber uno a la vez)
            document.querySelectorAll('.com-card-menu-dropdown').forEach(m => m.remove());

            if (yaAbiertoParaEste) return;

            const btn = event.currentTarget;
            const card = btn.closest('.com-card');
            if (!card) return;

            const myId = parseInt(localStorage.getItem('userId'));
            const autorId = parseInt(card.dataset.autorId);
            const esPropia = autorId === myId;

            const rect = btn.getBoundingClientRect();

            const menu = document.createElement('div');
            menu.className = 'com-card-menu-dropdown';
            menu.dataset.pubId = pubId;
            // position:fixed (coordenadas de viewport) funciona bien tanto en el feed
            // normal como dentro del modal de publicación (que es position:fixed y
            // tiene su propio scroll interno — ahí window.scrollY no sirve).
            // z-index por encima de #modalPublicacion (999999) para que no quede tapado.
            menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;
                background:white;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.15);
                border:1px solid #eee;z-index:9999999;overflow:hidden;min-width:150px;`;

            menu.innerHTML = esPropia
            ? `<button onclick="window.ocultarPublicacion(${pubId}); this.closest('.com-card-menu-dropdown').remove();"
                       style="width:100%;padding:0.7rem 1rem;background:none;border:none;text-align:left;
                              cursor:pointer;font-size:0.85rem;color:#e50914;display:flex;align-items:center;gap:8px;">
                   <i class="fas fa-eye-slash"></i> Ocultar
               </button>`
            : `<button onclick="window.reportarPublicacion(${pubId}); this.closest('.com-card-menu-dropdown').remove();"
                       style="width:100%;padding:0.7rem 1rem;background:none;border:none;text-align:left;
                              cursor:pointer;font-size:0.85rem;color:#e50914;display:flex;align-items:center;gap:8px;">
                   <i class="fas fa-flag"></i> Reportar
               </button>
               <button onclick="window.compartirPublicacion(${pubId}); this.closest('.com-card-menu-dropdown').remove();"
                       style="width:100%;padding:0.7rem 1rem;background:none;border:none;text-align:left;
                              cursor:pointer;font-size:0.85rem;color:#333;display:flex;align-items:center;gap:8px;
                              border-top:1px solid #f0f0f0;">
                   <i class="fas fa-share-alt"></i> Compartir
               </button>`;

            document.body.appendChild(menu);

            // Cerrar apenas se detecta scroll (en vez de intentar seguir al botón —
            // así evitamos que "persiga" al usuario, tanto en la página normal
            // como dentro del scroll interno del modal de publicación)
            const cerrarPorScroll = () => {
                menu.remove();
                window.removeEventListener('scroll', cerrarPorScroll, true);
            };
            window.addEventListener('scroll', cerrarPorScroll, true);

            // Cerrar al hacer click afuera
            setTimeout(() => {
                const cerrar = (e) => {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        window.removeEventListener('scroll', cerrarPorScroll, true);
                        document.removeEventListener('click', cerrar);
                    }
                };
                document.addEventListener('click', cerrar);
            }, 0);
        };

    window.editarPublicacion = function(pubId) {
        const card = document.querySelector(`.com-card[data-id="${pubId}"]`);
        if (!card) return;

        const contenidoEl = card.querySelector('.com-card-content');
        const contenidoActual = contenidoEl ? contenidoEl.textContent.trim() : '';

        const tituloEl = card.querySelector('.com-card-titulo');
        const tituloActual = tituloEl ? tituloEl.textContent.trim() : '';

        const hashtagEls = card.querySelectorAll('.com-card-hashtags a');
        const hashtagsActuales = Array.from(hashtagEls)
            .map(a => a.textContent.trim().replace(/^#/, ''))
            .join(', ');

        const imagenesActuales = Array.from(card.querySelectorAll('.com-card-imagenes img'))
            .map(img => img.src);

        const videoUid = card.getAttribute('data-video-uid') || '';
                const movieIdActual = card.getAttribute('data-movie-id') || null;
       const movieFichaActual = card.getAttribute('data-movie-ficha-enabled') === 'true';
       const creatorToolActual = card.getAttribute('data-creator-tool') || null;

       // Pre-cargar estado del workflow en modo edición
      _wf = {
          paso: 5,
          movieId: movieIdActual ? parseInt(movieIdActual) : null,
          movieTitulo: null,
          movieFichaEnabled: movieFichaActual,
           creatorTool: creatorToolActual,
           territory: 'PELICULAS_SERIES',
           sub: null,
           tone: 'OPINION',
           title: tituloActual,
           content: contenidoActual,
           hashtags: hashtagsActuales,
           spoiler: false,
           imageUrls: imagenesActuales,
           videoUrl: null,
           _editandoId: pubId,
           _tieneVideo: !!videoUid
       };

        renderWorkflow();
            document.body.classList.add('modal-open');
        };

    window.ocultarPublicacion = function(pubId) {
            window._publicacionOcultandoId = pubId;

            // El modal ya no vive en el HTML estático de un módulo puntual (eso
            // hacía que solo funcionara en Comunidad/Películas, y quedara atrás
            // de #modalPublicacion por orden de aparición en el DOM). Se crea acá
            // mismo, con z-index por encima de #modalPublicacion (9999999, mismo
            // criterio que ya usa el menú de opciones "⋮" de la card), así
            // funciona sin importar el módulo activo y siempre queda arriba.
            let modal = document.getElementById('modalOcultarPublicacion');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modalOcultarPublicacion';
                modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999999; align-items:center; justify-content:center; padding:1rem;';
                modal.innerHTML = `
                    <div style="background:white; border-radius:16px; padding:2rem; max-width:420px; width:100%; position:relative;" onclick="event.stopPropagation()">
                        <button onclick="window.cerrarModalOcultarPublicacion()" style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">×</button>
                        <h3 style="margin:0 0 0.5rem; color:#e50914;"><i class="fas fa-ban"></i> Ocultar publicación</h3>
                        <p style="color:#666; font-size:0.9rem; margin-bottom:1.5rem;">
                            Tu publicación dejará de ser visible para otros usuarios. Esta acción es <strong>irreversible</strong>. Si la publicación tiene puntos ganados, reacciones o comentarios, todo se perderá al ocultarla.
                        </p>
                        <div style="display:flex; gap:0.75rem;">
                            <button onclick="window.cerrarModalOcultarPublicacion()"
                                    style="flex:1; padding:0.7rem; border:1.5px solid #ddd; background:none; border-radius:8px; color:#666; cursor:pointer; font-size:0.9rem;">
                                Cancelar
                            </button>
                            <button id="btnConfirmarOcultarPublicacion" onclick="window.confirmarOcultarPublicacion()"
                                    style="flex:2; padding:0.7rem; background:#e50914; border:none; border-radius:8px; color:white; font-weight:600; cursor:pointer; font-size:0.9rem;">
                                Sí, ocultar
                            </button>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
            }

            // Resguardo: si quedó "Ocultando..." deshabilitado de un uso anterior
            // (por ejemplo si el fetch tardó y el usuario reabrió el modal), lo
            // reseteamos acá para que siempre arranque limpio.
            const btnConfirmar = document.getElementById('btnConfirmarOcultarPublicacion');
            if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Sí, ocultar'; }

            modal.style.display = 'flex';
        };

    window.cerrarModalOcultarPublicacion = function() {
        const modal = document.getElementById('modalOcultarPublicacion');
        if (modal) modal.style.display = 'none';
        window._publicacionOcultandoId = null;
    };

    window.confirmarOcultarPublicacion = async function() {
        const pubId = window._publicacionOcultandoId;
        if (!pubId) return;

        const btn = document.getElementById('btnConfirmarOcultarPublicacion');
        if (btn) { btn.disabled = true; btn.textContent = 'Ocultando...'; }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                window.cerrarModalOcultarPublicacion();
                window.mostrarToast('No se pudo ocultar la publicación.', 'error');
                return;
            }

            window.cerrarModalOcultarPublicacion();

            // La card puede estar en el feed de Comunidad, o adentro de
            // #modalPublicacion (si se ocultó desde ahí — ej. desde una
            // notificación o desde un tile del Perfil). Si estaba en el modal,
            // hay que cerrarlo del todo: dejarlo abierto y vacío es lo que
            // generaba el estado visual roto (solo quedaba el header con la ✕).
            const card = document.querySelector(`.com-card[data-id="${pubId}"]`);
            const estabaEnModalPublicacion = card && card.closest('#modalPublicacionContenido');
            if (card) card.remove();
            if (estabaEnModalPublicacion && typeof window.cerrarModalPublicacion === 'function') {
                window.cerrarModalPublicacion();
            }

            // La publicación ocultada puede tener tile en dos lugares distintos
            // del Perfil a la vez: el grid compacto de 9 fijas
            // (#perfilPublicacionesList — ahí conviene recargar para tapar el
            // hueco con la próxima disponible) y/o el grid expandido de "Ver
            // todas las publicaciones" (#perfilPubsGridFull, scroll infinito —
            // ahí alcanza con sacar el tile, no hay hueco que tapar). Se usa
            // querySelectorAll porque, si el usuario ocultó desde adentro del
            // overlay expandido, el grid compacto de atrás también tiene su
            // propia copia del tile, aunque esté tapada visualmente.
            document.querySelectorAll(`[data-perfil-pub-id="${pubId}"]`).forEach(tile => {
                if (tile.closest('#perfilPubsGridFull')) {
                    tile.remove();
                } else if (tile.closest('#perfilPublicacionesList')) {
                    if (typeof cargarPublicacionesPerfil === 'function' && typeof perfilUsuarioId !== 'undefined' && perfilUsuarioId) {
                        cargarPublicacionesPerfil(perfilUsuarioId);
                    } else {
                        tile.remove();
                    }
                } else {
                    tile.remove();
                }
            });

            window.mostrarToast('Tu publicación fue ocultada correctamente.', 'success');

        } catch(e) {
            window.cerrarModalOcultarPublicacion();
            window.mostrarToast('Error al ocultar la publicación.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Sí, ocultar'; }
        }
    };

    window.abrirComentariosPub = function(pubId) {
        // Se implementa en la siguiente iteración
    };

    const LIMITE_VER_MAS = 500;

        // resolverFichaPelicula ahora vive en js/creator-tools/ficha-pelicula.js

        function renderContenidoConVerMas(pubId, content) {
            const texto = content || '';
            if (texto.length <= LIMITE_VER_MAS) {
                return `<div class="com-card-content">${escapeHtml(texto)}</div>`;
            }
            const truncado = texto.slice(0, LIMITE_VER_MAS);
            return `<div id="pubContentWrap-${pubId}" data-full="false" data-full-text="${encodeURIComponent(texto)}">
                <div class="com-card-content">${escapeHtml(truncado)}...</div>
                <div class="com-ver-mas-wrap"><a href="javascript:void(0)" class="com-ver-mas" onclick="event.stopPropagation();window.toggleVerMasPub(${pubId})">Ver más</a></div>
            </div>`;
        }

        window.toggleVerMasPub = function(pubId) {
            const wrap = document.getElementById(`pubContentWrap-${pubId}`);
            if (!wrap) return;
            const textoCompleto = decodeURIComponent(wrap.dataset.fullText || '');
            if (!textoCompleto) return;

            const esCompleto = wrap.dataset.full === 'true';
            if (esCompleto) {
                const truncado = textoCompleto.slice(0, LIMITE_VER_MAS);
                wrap.innerHTML = `<div class="com-card-content">${escapeHtml(truncado)}...</div>
                    <div class="com-ver-mas-wrap"><a href="javascript:void(0)" class="com-ver-mas" onclick="event.stopPropagation();window.toggleVerMasPub(${pubId})">Ver más</a></div>`;
                wrap.dataset.full = 'false';
            } else {
                wrap.innerHTML = `<div class="com-card-content">${escapeHtml(textoCompleto)}</div>
                    <div class="com-ver-mas-wrap"><a href="javascript:void(0)" class="com-ver-mas" onclick="event.stopPropagation();window.toggleVerMasPub(${pubId})">Ver menos</a></div>`;
                wrap.dataset.full = 'true';
            }
        };

    // ==============================================
    // HELPERS
    // ==============================================
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function tiempoRelativo(fechaStr) {
        if (!fechaStr) return '';
        const diff = Math.floor((Date.now() - new Date(fechaStr).getTime()) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;
        return new Date(fechaStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    }

    function formatTerritory(key) {
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

    function esPropiaPublicacion(pub) {
        const myId = parseInt(localStorage.getItem('userId'));
        return pub.user && pub.user.id === myId;
    }

    function puedeEditar(createdAt) {
        if (!createdAt) return false;
        const diff = (Date.now() - new Date(createdAt).getTime()) / 1000 / 60;
        return diff <= 15;
    }

    // ==============================================
        // COMENTARIOS EN PUBLICACIONES
        // ==============================================

        window.abrirComentariosPub = async function(pubId) {
            const card = document.querySelector(`.com-card[data-id="${pubId}"]`);
            if (!card) return;

            // Si ya está abierto...
            const existente = card.querySelector('.pub-comentarios-panel');
            if (existente) {
                const escribirBox = existente.querySelector('.pub-comentarios-escribir');
                // ...pero la caja de escribir quedó oculta tras enviar un comentario, reabrirla
                if (escribirBox && escribirBox.style.display === 'none') {
                    escribirBox.style.display = '';
                    escribirBox.querySelector('textarea')?.focus();
                    return;
                }
                // ...y ya estaba todo visible: cerrar el panel completo
                existente.remove();
                return;
            }

            const panel = document.createElement('div');
            panel.className = 'pub-comentarios-panel';
            panel.innerHTML = `
                <div class="pub-comentarios-lista" id="pubComentariosLista-${pubId}">
                    <div style="text-align:center;padding:1rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></div>
                </div>
                <div class="pub-comentarios-escribir">
                    <div class="pub-comentario-input-row">
                        <textarea id="pubNuevoComentario-${pubId}"
                                  placeholder="Escribí un comentario..."
                                  maxlength="2000"
                                  style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.88rem;font-family:inherit;resize:none;min-height:70px;"></textarea>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">
                        <button onclick="this.closest('.pub-comentarios-panel').remove()"
                                style="padding:6px 14px;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.85rem;">
                            Cancelar
                        </button>
                        <button onclick="window.enviarComentarioPub(${pubId})"
                                style="padding:6px 14px;border:none;background:#e50914;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.85rem;">
                            <i class="fas fa-paper-plane"></i> Enviar
                        </button>
                    </div>
                </div>`;

            card.appendChild(panel);
            await cargarComentariosPub(pubId);
            panel.querySelector(`#pubNuevoComentario-${pubId}`)?.focus();
        };

        async function cargarComentariosPub(pubId) {
            const lista = document.getElementById(`pubComentariosLista-${pubId}`);
            if (!lista) return;

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/comments?page=0&size=50`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                const comentarios = data.content || [];

                if (comentarios.length === 0) {
                    lista.innerHTML = '<div style="text-align:center;padding:1rem;color:#ccc;font-size:0.85rem;">Todavía no hay comentarios. ¡Sé el primero!</div>';
                    return;
                }

                lista.innerHTML = comentarios.map(c => renderComentarioPub(c, pubId)).join('');
                comentarios.forEach(c => chequearVerMasComentario(c.id));

                // Cargar contadores y estado de banco de cada comentario
                const tokenBanco = localStorage.getItem('token');
                comentarios.forEach(async c => {
                    try {
                        const r = await fetch(`${window._comunidadApiUrl}/publications/comments/${c.id}/banco`, {
                            headers: { 'Authorization': `Bearer ${tokenBanco}` }
                        });
                        if (!r.ok) return;
                        const d = await r.json();
                        const countEl = document.getElementById(`bancoComentCount-${c.id}`);
                        if (countEl) countEl.textContent = d.count;
                        const btn = document.getElementById(`btnBancoComent-${c.id}`);
                        if (btn && d.active) btn.style.color = '#324C89';
                    } catch(e) {}
                });

            } catch(e) {
                lista.innerHTML = '<div style="text-align:center;padding:1rem;color:#ccc;font-size:0.85rem;">Error al cargar comentarios.</div>';
            }
        }

        function renderComentarioPub(c, pubId) {
            const myId = parseInt(localStorage.getItem('userId'));
            const esPropio = c.user?.id === myId;
            const cardPub = document.querySelector(`.com-card[data-id="${pubId}"]`);
            const autorPubId = cardPub?.dataset.autorId;
            const autorEsCreator = cardPub?.dataset.autorCreator === 'true';
            const esAutorPub = autorEsCreator && c.user?.id != null && autorPubId && String(c.user.id) === String(autorPubId);
            const inicial = (c.user?.name || 'U').charAt(0).toUpperCase();
            const avatarHtml = c.user?.avatarUrl
                ? `<img src="${c.user.avatarUrl}" style="width:32px;height:32px;object-fit:cover;border-radius:50%;">`
                : `<div style="width:32px;height:32px;background:#324C89;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:0.8rem;font-weight:600;">${inicial}</div>`;

            const fecha = new Date(c.createdAt).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const puedeEditarComent = esPropio && ((Date.now() - new Date(c.createdAt).getTime()) / 1000 / 60) <= 15;

            return `
            <div class="pub-comentario-item" id="pubComment-${c.id}">
                <div style="flex-shrink:0;">${avatarHtml}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="display:flex;align-items:center;gap:5px;">
                                    <span style="font-weight:600;font-size:0.83rem;color:#333;">${c.user?.name || 'Usuario'}</span>
                                    ${esAutorPub ? `<span style="background:#e50914;color:white;font-size:0.62rem;font-weight:700;padding:1px 7px;border-radius:99px;letter-spacing:0.3px;">AUTOR</span>` : ''}
                                </span>
                                ${esPropio
                            ? `<button onclick="window.ocultarComentarioPub(${c.id}, ${pubId})"
                                       style="background:none;border:none;cursor:pointer;color:#ccc;font-size:0.75rem;padding:2px 4px;" title="Ocultar">
                                   <i class="fas fa-ban"></i>
                               </button>`
                            : `<button onclick="window.reportarComentarioPub(${c.id})"
                                       style="background:none;border:none;cursor:pointer;color:#ccc;font-size:0.75rem;padding:2px 4px;" title="Reportar">
                                   <i class="fas fa-flag"></i>
                               </button>`
                        }
                    </div>
                    <div style="font-size:0.88rem;color:#444;margin:3px 0;word-break:break-word;" class="pub-coment-texto-clamp" id="pubComentTexto-${c.id}">${c.content}</div>
                                        <a href="javascript:void(0)" class="pub-coment-ver-mas" id="pubComentVerMas-${c.id}" onclick="event.stopPropagation();window.toggleVerMasComentPub(${c.id})">Ver más</a>
                    <div style="display:flex;align-items:center;gap:0.75rem;margin-top:4px;flex-wrap:wrap;">
                        <span style="font-size:0.72rem;color:#bbb;">${fecha}</span>
                        <button onclick="window.bancarComentarioPub(${c.id}, this)"
                                style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:#999;padding:0;"
                                id="btnBancoComent-${c.id}">
                            <i class="fas fa-thumbs-up"></i> <span id="bancoComentCount-${c.id}">0</span> Te banco
                        </button>
                        ${puedeEditarComent ? `
                        <button onclick="window.editarComentarioPub(${c.id})"
                                style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:#aaa;padding:0;">
                            <i class="fas fa-pencil-alt"></i> Editar
                        </button>` : ''}
                        <button onclick="window.responderComentarioPub(${c.id}, ${pubId}, '${(c.user?.name||'').replace(/'/g,"\\'")}')"
                                style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:#999;padding:0;">
                            <i class="fas fa-reply"></i> Responder
                        </button>
                        ${(c.replyCount || 0) > 0 ? `
                        <button onclick="window.verRespuestasPub(${c.id}, ${pubId}, this)"
                                style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:#324C89;padding:0;">
                            — Ver respuestas (${c.replyCount})
                        </button>` : ''}
                    </div>
                    <div id="pubReplies-${c.id}" style="display:none;margin-top:0.5rem;padding-left:0.75rem;border-left:2px solid #f0f0f0;"></div>
                    <div id="pubReplyForm-${c.id}" style="display:none;margin-top:0.5rem;"></div>
                </div>
            </div>`;
        }

        function chequearVerMasComentario(comentId) {
            if (!window.matchMedia('(max-width: 768px)').matches) return; // solo mobile
            const textoEl = document.getElementById(`pubComentTexto-${comentId}`);
            const btnEl = document.getElementById(`pubComentVerMas-${comentId}`);
            if (!textoEl || !btnEl) return;
            if (textoEl.scrollHeight > textoEl.clientHeight + 1) {
                btnEl.style.display = 'block';
            }
        }

        window.toggleVerMasComentPub = function(comentId) {
            const textoEl = document.getElementById(`pubComentTexto-${comentId}`);
            const btnEl = document.getElementById(`pubComentVerMas-${comentId}`);
            if (!textoEl || !btnEl) return;
            const expandido = textoEl.classList.toggle('pub-coment-expandido');
            btnEl.textContent = expandido ? 'Ver menos' : 'Ver más';
        };

        window.enviarComentarioPub = async function(pubId) {
            const textarea = document.getElementById(`pubNuevoComentario-${pubId}`);
            const content = textarea?.value?.trim();
            if (!content) return;

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/comments`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, spoiler: false })
                });
                if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err.error || err.message || 'Error al enviar el comentario.');
                        }
                            textarea.value = '';
                            await cargarComentariosPub(pubId);

                            // Actualizar contador en la card
                            const countEl = document.getElementById(`comentCount-${pubId}`);
                            if (countEl) {
                                const actual = parseInt(countEl.textContent) || 0;
                                countEl.textContent = actual + 1;
                            }

                            // Cerrar solo la caja de escribir, dejando la lista de comentarios visible
                            const escribirBox = textarea.closest('.pub-comentarios-escribir');
                            if (escribirBox) escribirBox.style.display = 'none';
                        } catch(e) {
                        if (typeof window.mostrarModalErrorPublicar === 'function') {
                            window.mostrarModalErrorPublicar(e.message || 'Error al enviar el comentario.');
                        } else {
                            alert(e.message || 'Error al enviar el comentario.');
                        }
                    }
                };

        window.responderComentarioPub = function(comentId, pubId, autorNombre) {
            // Cerrar otros forms abiertos
            document.querySelectorAll('[id^="pubReplyForm-"]').forEach(f => f.style.display = 'none');

            const form = document.getElementById(`pubReplyForm-${comentId}`);
            if (!form) return;
            form.style.display = 'block';
            form.innerHTML = `
                <textarea id="pubReplyInput-${comentId}" placeholder="Respondiendo a ${autorNombre}..."
                          maxlength="2000"
                          style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;resize:none;min-height:55px;"></textarea>
                <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:4px;">
                    <button onclick="document.getElementById('pubReplyForm-${comentId}').style.display='none'"
                            style="padding:4px 10px;border:1.5px solid #ddd;background:none;border-radius:6px;color:#666;cursor:pointer;font-size:0.8rem;">
                        Cancelar
                    </button>
                    <button onclick="window.enviarRespuestaPub(${comentId}, ${pubId})"
                            style="padding:4px 10px;border:none;background:#e50914;border-radius:6px;color:white;font-weight:600;cursor:pointer;font-size:0.8rem;">
                        Enviar
                    </button>
                </div>`;
            form.querySelector(`#pubReplyInput-${comentId}`)?.focus();
        };

        window.enviarRespuestaPub = async function(parentId, pubId) {
            const textarea = document.getElementById(`pubReplyInput-${parentId}`);
            const content = textarea?.value?.trim();
            if (!content) return;

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/comments`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, spoiler: false, parentCommentId: parentId })
                });
                if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || err.message || 'Error al enviar la respuesta.');
                    }
                    document.getElementById(`pubReplyForm-${parentId}`).style.display = 'none';
                    await cargarComentariosPub(pubId);
                } catch(e) {
                    if (typeof window.mostrarModalErrorPublicar === 'function') {
                        window.mostrarModalErrorPublicar(e.message || 'Error al enviar la respuesta.');
                    } else {
                        alert(e.message || 'Error al enviar la respuesta.');
                    }
                }
            };

        window.verRespuestasPub = async function(comentId, pubId, btn) {
            const container = document.getElementById(`pubReplies-${comentId}`);
            if (!container) return;

            if (container.style.display !== 'none') {
                container.style.display = 'none';
                if (btn) btn.textContent = `— Ver respuestas`;
                return;
            }

            container.style.display = 'block';
            container._page = 0;
            container.innerHTML = '<div style="color:#ccc;font-size:0.8rem;padding:4px 0;"><i class="fas fa-spinner fa-spin"></i></div>';

            await cargarRespuestasPub(comentId, pubId, container, 0);
        };

        async function cargarRespuestasPub(comentId, pubId, container, page) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/comments/${comentId}/replies?page=${page}&size=3`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                const replies = data.content || [];

                if (page === 0) {
                    container.innerHTML = '';
                }

                // Quitar botón "Ver más" anterior si existe
                const btnMasExistente = container.querySelector('.pub-replies-ver-mas');
                if (btnMasExistente) btnMasExistente.remove();

                if (replies.length === 0 && page === 0) {
                    container.innerHTML = '<div style="color:#ccc;font-size:0.8rem;">Sin respuestas.</div>';
                    return;
                }

                replies.forEach(r => {
                        container.insertAdjacentHTML('beforeend', renderComentarioPub(r, pubId));
                    });
                    replies.forEach(r => chequearVerMasComentario(r.id));

                    if (data.hasMore) {
                    const btnMas = document.createElement('button');
                    btnMas.className = 'pub-replies-ver-mas';
                    btnMas.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.78rem;color:#324C89;padding:4px 0;display:block;';
                    btnMas.textContent = `Ver más respuestas`;
                    btnMas.onclick = () => {
                        btnMas.remove();
                        cargarRespuestasPub(comentId, pubId, container, page + 1);
                    };
                    container.appendChild(btnMas);
                }

            } catch(e) {
                container.innerHTML = '<div style="color:#ccc;font-size:0.8rem;">Error al cargar.</div>';
            }
        }

        window.editarComentarioPub = function(comentId) {
            const textoEl = document.getElementById(`pubComentTexto-${comentId}`);
            if (!textoEl || textoEl.querySelector('textarea')) return; // ya está en edición

            const actual = textoEl.textContent.trim();
            textoEl.dataset.original = actual;
            textoEl.classList.remove('pub-coment-texto-clamp', 'pub-coment-expandido');
            const btnVerMasEl = document.getElementById(`pubComentVerMas-${comentId}`);
            if (btnVerMasEl) btnVerMasEl.style.display = 'none';
            textoEl.innerHTML = `
                <textarea id="pubComentEditInput-${comentId}" maxlength="2000"
                          style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #e0e0e0;
                                 border-radius:8px;font-size:0.85rem;font-family:inherit;resize:none;min-height:55px;">${escapeHtml(actual)}</textarea>
                <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:4px;">
                    <button onclick="window.cancelarEdicionComentarioPub(${comentId})"
                            style="padding:4px 10px;border:1.5px solid #ddd;background:none;border-radius:6px;color:#666;cursor:pointer;font-size:0.8rem;">
                        Cancelar
                    </button>
                    <button onclick="window.guardarEdicionComentarioPub(${comentId})"
                            style="padding:4px 10px;border:none;background:#e50914;border-radius:6px;color:white;font-weight:600;cursor:pointer;font-size:0.8rem;">
                        Guardar
                    </button>
                </div>`;
            textoEl.querySelector('textarea')?.focus();
        };

        window.cancelarEdicionComentarioPub = function(comentId) {
            const textoEl = document.getElementById(`pubComentTexto-${comentId}`);
            if (!textoEl) return;
            textoEl.textContent = textoEl.dataset.original || '';
            textoEl.classList.add('pub-coment-texto-clamp');
            chequearVerMasComentario(comentId);
        };

        window.guardarEdicionComentarioPub = async function(comentId) {
            const textoEl = document.getElementById(`pubComentTexto-${comentId}`);
            const textarea = document.getElementById(`pubComentEditInput-${comentId}`);
            if (!textoEl || !textarea) return;

            const nuevo = textarea.value.trim();
            const actual = textoEl.dataset.original || '';

            const restaurar = (texto) => {
                textoEl.textContent = texto;
                textoEl.classList.add('pub-coment-texto-clamp');
                chequearVerMasComentario(comentId);
            };

            if (!nuevo || nuevo === actual) {
                restaurar(actual);
                return;
            }

            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${window._comunidadApiUrl}/publications/comments/${comentId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: nuevo })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    const msg = err.error || err.message || 'No se pudo editar.';
                    if (typeof window.mostrarModalErrorPublicar === 'function') {
                        window.mostrarModalErrorPublicar(msg);
                    } else {
                        alert(msg);
                    }
                    restaurar(actual);
                    return;
                }
                restaurar(nuevo);
            } catch(e) {
                const msg = 'Error al editar el comentario.';
                if (typeof window.mostrarModalErrorPublicar === 'function') {
                    window.mostrarModalErrorPublicar(msg);
                } else {
                    alert(msg);
                }
                restaurar(actual);
            }
        };

        window.bancarComentarioPub = async function(comentId, btn) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/comments/${comentId}/banco`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const countEl = document.getElementById(`bancoComentCount-${comentId}`);
                    if (countEl) countEl.textContent = data.count;
                    if (btn) btn.style.color = data.added ? '#324C89' : '#999';
                }
            } catch(e) {}
        };

                window.ocultarComentarioPub = function(comentId, pubId) {
                    if (!confirm('¿Querés ocultar este comentario? Es irreversible.')) return;
                    const token = localStorage.getItem('token');
                    fetch(`${window._comunidadApiUrl}/publications/comments/${comentId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(r => {
                        if (r.ok) {
                            const el = document.getElementById(`pubComment-${comentId}`);
                            if (el) el.remove();

                            // Actualizar contador en la card inmediatamente, sin esperar recarga
                            const countEl = document.getElementById(`comentCount-${pubId}`);
                            if (countEl) {
                                const actual = parseInt(countEl.textContent) || 0;
                                countEl.textContent = Math.max(actual - 1, 0);
                            }
                        } else alert('No se pudo ocultar.');
                    });
                };

        window.reportarComentarioPub = function(comentId) {
        const motivos = [
            { value: 'OFFENSIVE', label: 'Lenguaje ofensivo' },
            { value: 'SPAM', label: 'Spam' },
            { value: 'INAPPROPRIATE', label: 'Contenido inapropiado' },
            { value: 'OTHER', label: 'Otro' }
        ];

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:1.5rem;max-width:400px;width:100%;" onclick="event.stopPropagation()">
                <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;"><i class="fas fa-flag" style="color:#e50914;"></i> Reportar comentario</h3>
                <p style="color:#888;font-size:0.85rem;margin-bottom:1rem;">¿Por qué querés reportar este comentario?</p>
                <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;">
                    ${motivos.map(m => `
                        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.9rem;border:1.5px solid #e0e0e0;border-radius:8px;cursor:pointer;font-size:0.88rem;">
                            <input type="radio" name="reportReasonComent" value="${m.value}" style="accent-color:#e50914;"> ${m.label}
                        </label>`).join('')}
                </div>
                <textarea id="reportDescComent" placeholder="Descripción adicional (opcional)..." maxlength="500"
                          style="width:100%;padding:0.75rem;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;resize:none;height:70px;box-sizing:border-box;font-family:inherit;margin-bottom:1rem;"></textarea>
                <div style="display:flex;gap:0.75rem;">
                    <button onclick="this.closest('div[style]').parentElement.remove()"
                            style="flex:1;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                        Cancelar
                    </button>
                    <button id="btnEnviarReporteComent"
                            style="flex:2;padding:0.7rem;background:#e50914;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                        Enviar reporte
                    </button>
                </div>
            </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('btnEnviarReporteComent').addEventListener('click', async () => {
            const reason = overlay.querySelector('input[name="reportReasonComent"]:checked')?.value;
            if (!reason) { alert('Seleccioná un motivo.'); return; }
            const description = document.getElementById('reportDescComent').value;

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window._comunidadApiUrl}/publications/comments/${comentId}/report`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason, description })
                });
                overlay.remove();
                if (res.ok) {
                    window.mostrarToast('Reporte enviado. Gracias por ayudarnos a mantener la comunidad.', 'success');
                } else {
                    const errData = await res.json().catch(() => ({}));
                    if (res.status === 409 || errData?.error?.includes('Ya reportaste')) {
                        window.mostrarToast('Este comentario ya lo reportaste y pronto será revisado. Gracias.', 'info');
                    } else {
                        window.mostrarToast('No se pudo enviar el reporte.', 'error');
                    }
                }
            } catch(e) { window.mostrarToast('Error al enviar el reporte.', 'error'); }
        });
        return;
        };

})();

// ==============================================
    // WORKFLOW CREACIÓN DE PUBLICACIÓN
    // ==============================================

    const MAX_IMAGE_SIZE_MB = 5; // debe coincidir con spring.servlet.multipart.max-file-size del backend

        // Copia local: escapeHtml original vive en otro bloque (IIFE) y no es visible acá.
                function escapeHtmlWf(str) {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        const TERRITORIOS = [
        { key: 'PELICULAS_SERIES', emoji: '🎬', label: 'Películas y series',
          desc: 'Un título específico o adaptación',
          subs: ['La película', 'Adaptaciones', 'Remakes y reboots'] },
        { key: 'LO_QUE_VIENE', emoji: '📅', label: 'Lo que se viene',
          desc: 'Estrenos, anticipación, predicciones',
          subs: ['Estrenos', 'Predicciones y rumores'] },
        { key: 'GENTE_CINE', emoji: '🎭', label: 'Gente de cine',
          desc: 'Actores, directores, equipo técnico',
          subs: ['Actores y actrices', 'Directores', 'Guionistas', 'Equipo técnico'] },
        { key: 'PREMIOS', emoji: '🏆', label: 'Premios y reconocimientos',
          desc: 'Oscars, festivales, premios internacionales',
          subs: ['Oscars', 'Festivales', 'Premios internacionales'] },
        { key: 'INDUSTRIA', emoji: '💰', label: 'Industria y negocio',
          desc: 'Taquilla, estudios, plataformas, streaming',
          subs: ['Taquilla', 'Estudios y productoras', 'Plataformas y streaming', 'Conflictos e industria'] },
        { key: 'EXPERIENCIA', emoji: '🍿', label: 'La experiencia cinéfila',
          desc: 'Ir al cine, ver en casa, listas personales',
          subs: ['Ir al cine', 'Ver en casa', 'Experiencias personales', 'Listas y rankings'] },
        { key: 'ARTE_CULTURA', emoji: '🎓', label: 'Arte y cultura',
          desc: 'Análisis, cine del mundo, bandas sonoras',
          subs: ['Análisis y teoría', 'Cine del mundo', 'Música y bandas sonoras', 'Cine e historia'] },
        { key: 'EVENTOS', emoji: '🎪', label: 'Eventos y comunidad',
          desc: 'Avant premieres, ciclos, debates',
          subs: ['Eventos presenciales', 'Comunidad Cinemarketer'] }
    ];

    const TONOS = [
        { key: 'OPINION', label: '💬 Opinión' },
        { key: 'RESENA', label: '📝 Reseña' },
        { key: 'DEBATE', label: '❓ Debate' },
        { key: 'LISTA', label: '📋 Lista' },
        { key: 'CONFESION', label: '😳 Confesión' },
        { key: 'CURIOSIDAD', label: '🔍 Curiosidad' },
        { key: 'PREDICCION', label: '🎯 Predicción' },
        { key: 'SPOILER', label: '⚠️ Spoiler' }
    ];

    let _wf = {
            paso: 1,
            movieId: null,
            movieTitulo: null,
            movieFichaEnabled: false,
            creatorTool: null, // null | 'FICHA' | 'COUNTDOWN' (a futuro) — selección única
            territory: null,
            sub: null,
            tone: null,
            title: '',
            content: '',
            hashtags: '',
            spoiler: false,
            imageUrls: [],
            videoUrl: null
        };

        // Camino según estado, para header ("Paso X de Y") y navegación:
        //   Libre:                 1 → 2 → 5
        //   Vinculada, no Creator:  1 → 2 → 3 → 5
        //   Vinculada, Creator:     1 → 2 → 3 → 4 → 5
        function wfEsCreator() {
            return localStorage.getItem('userCreator') === 'true';
        }
        function wfTotalPasos() {
            if (!_wf.movieId) return 3;
            return wfEsCreator() ? 5 : 4;
        }
        function wfPasoVisible() {
            if (_wf.paso <= 3) return _wf.paso;
            if (_wf.paso === 4) return 4;
            if (_wf.paso === 5) {
                if (!_wf.movieId) return 3;
                return wfEsCreator() ? 5 : 4;
            }
            return _wf.paso;
        }
        function wfPasoAnterior() {
            if (!_wf.movieId) return 2;
            return wfEsCreator() ? 4 : 3;
        }

        window.abrirWorkflowPublicacion = function(movieId, movieTitulo) {
            _wf = { paso: 1, movieId: movieId || null, movieTitulo: movieTitulo || null, movieFichaEnabled: false, creatorTool: null,
            territory: null, sub: null, tone: null, title: '', content: '', hashtags: '',
            spoiler: false, imageUrls: [], videoUrl: null };

            renderWorkflow();
            document.body.style.overflow = 'hidden';
        };

    function renderWorkflow() {
        let overlay = document.getElementById('wfOverlay');
        let panel = document.getElementById('wfPanel');

        if (overlay && panel) {
            // Ya existe: solo actualizamos el contenido, sin recrear el DOM.
            // Recrear todo (remove + append) es lo que disparaba el scroll-behavior:
            // smooth global de styles.css en cada click de badge.
            panel.innerHTML = renderPaso();
            resolverExtraHerramientaSiCorresponde();
            return;
        }

        overlay = document.createElement('div');
        overlay.id = 'wfOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        panel = document.createElement('div');
        panel.id = 'wfPanel';
        panel.style.cssText = 'background:white;border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;padding:1.5rem 1.5rem 2rem;';

        panel.innerHTML = renderPaso();
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            resolverExtraHerramientaSiCorresponde();
        }

        function resolverExtraHerramientaSiCorresponde() {
            if (_wf.paso !== 4 || !_wf.creatorTool) return;
            const tool = (window.CreatorTools || []).find(t => t.key === _wf.creatorTool);
            if (tool && typeof tool.resolverExtra === 'function') {
                tool.resolverExtra(_wf.movieId, _wf.countdownCountryCode);
            }
        }

    function renderPaso() {
            switch(_wf.paso) {
                case 1: return renderPaso1();
                case 2: return renderPaso2();
                case 3: return renderPaso3();
                case 4: return renderPaso4();
                case 5: return renderPaso5();
                default: return '';
            }
        }

    function headerWf(titulo, paso, total) {
        return `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
                <div>
                    <p style="margin:0;font-size:0.72rem;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;">Paso ${paso} de ${total}</p>
                    <h3 style="margin:4px 0 0;font-size:1rem;font-weight:700;color:#1a1a1a;">${titulo}</h3>
                </div>
                <button onclick="window.cerrarWorkflow()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#999;padding:4px;">×</button>
            </div>`;
    }

    // PASO 3 — Buscar película (solo se llega acá si eligió "Vincular con una película" en el Paso 2)
        function renderPaso3() {
            return `
                ${headerWf('¿Sobre qué película?', 3, wfTotalPasos())}
                <input id="wfBuscador" type="text" placeholder="Escribí el título de la película..."
                       oninput="window.buscarPeliculaWf(this.value)"
                       style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:0.9rem;margin-bottom:0.75rem;font-family:inherit;">
                <div id="wfResultados" style="max-height:300px;overflow-y:auto;"></div>
                <div style="margin-top:1rem;">
                    <button onclick="window.wfPaso(2)" style="width:100%;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:10px;color:#666;cursor:pointer;font-size:0.9rem;">← Atrás</button>
                </div>`;
        }

    window.buscarPeliculaWf = async function(query) {
        const res = document.getElementById('wfResultados');
        if (!query || query.length < 2) { res.innerHTML = ''; return; }

        res.innerHTML = '<div style="text-align:center;padding:1rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></div>';

        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`${window._comunidadApiUrl}/movies/search?query=${encodeURIComponent(query)}&page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            const pelis = (data.results || []).slice(0, 6);

            if (pelis.length === 0) {
                res.innerHTML = '<p style="text-align:center;color:#ccc;font-size:0.85rem;padding:1rem;">Sin resultados</p>';
                return;
            }

            res.innerHTML = pelis.map(p => {
                const poster = p.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w92${p.poster_path}" style="width:40px;height:58px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
                    : `<div style="width:40px;height:58px;background:#f0f0f0;border-radius:6px;flex-shrink:0;"></div>`;
                const anio = p.release_date ? new Date(p.release_date).getFullYear() : '';
                return `<div onclick="window.seleccionarPeliculaWf(${p.id}, '${(p.title||'').replace(/'/g,"\\'")}', event)"
                             style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.75rem;border-radius:8px;cursor:pointer;transition:background 0.15s;"
                             onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">
                            ${poster}
                            <div>
                                <p style="margin:0;font-size:0.88rem;font-weight:600;color:#1a1a1a;">${p.title}</p>
                                <p style="margin:0;font-size:0.75rem;color:#aaa;">${anio}</p>
                            </div>
                        </div>`;
            }).join('');
        } catch(e) {
            res.innerHTML = '<p style="text-align:center;color:#ccc;font-size:0.85rem;padding:1rem;">Error al buscar</p>';
        }
    };

        window.seleccionarPeliculaWf = function(id, titulo, event) {
                if (event) event.stopPropagation();
                const cambioDePelicula = _wf.movieId && _wf.movieId !== id;
                _wf.movieId = id;
                _wf.movieTitulo = titulo;
                if (cambioDePelicula) {
                    // La película vinculada cambió — el estado de la herramienta que
                    // ya estaba armada (tráiler buscado, opciones de votación con
                    // póster de la película vieja, etc.) queda inválido. Se limpia
                    // TODO lo específico de tool, dejando solo el tool elegido, así
                    // el Paso 4 se re-renderiza desde cero para la película nueva.
                    _wf.trailerYoutubeKey = null;
                    _wf.trailerVideoNombre = null;
                    _wf.trailerOpciones = null;
                    _wf.trailerBuscando = false;
                    _wf.trailerNoEncontrado = false;
                    _wf.movieFichaEnabled = false;
                    _wf.countdownEnabled = false;
                    _wf.countdownCountryCode = null;
                    _wf.votacionOpciones = null;
                    _wf.votacionDuracionValor = null;
                    _wf.votacionDuracionUnidad = null;
                    _wf.votacionDuracionMinutos = null;
                    _wf.rankingItems = null;
                    _wf.triviaReferenciaId = null;
                    _wf.triviaReferenciaLabel = null;
                }
                _wf.paso = wfEsCreator() ? 4 : 5;
                renderWorkflow();
            };

        // PASO 1 — Territorio + sub + tono (siempre el primer paso)
        function renderPaso1() {
        const totalPasos = _wf.movieId ? 3 : 3;
        const peliculaTag = _wf.movieTitulo
            ? `<div style="display:inline-flex;align-items:center;gap:6px;background:#f4f6fb;border:1px solid #c8d4f0;border-radius:99px;padding:4px 12px;font-size:0.78rem;color:#324C89;font-weight:600;margin-bottom:1rem;">
                    <i class="fas fa-film"></i> ${_wf.movieTitulo}
                    <span onclick="window.cambiarPelicula()" style="margin-left:4px;cursor:pointer;color:#aaa;font-size:0.85rem;">×</span>
               </div>` : '';

        const gridTerr = TERRITORIOS.map(t => {
            const sel = _wf.territory === t.key;
            return `<div onclick="window.selTerritory('${t.key}')"
                         style="border:${sel ? '1.5px solid #324C89' : '1px solid #e0e0e0'};
                                background:${sel ? '#f0f4fc' : 'white'};
                                border-radius:10px;padding:0.75rem;cursor:pointer;transition:all 0.15s;">
                        <p style="margin:0 0 2px;font-size:1.1rem;">${t.emoji}</p>
                        <p style="margin:0;font-size:0.8rem;font-weight:600;color:#1a1a1a;">${t.label}</p>
                        <p style="margin:0;font-size:0.7rem;color:#aaa;line-height:1.3;">${t.desc}</p>
                    </div>`;
        }).join('');

        const terrActual = TERRITORIOS.find(t => t.key === _wf.territory);
        const subsHtml = terrActual ? `
            <div style="margin-top:1rem;">
                <p style="font-size:0.75rem;color:#888;margin:0 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Sobre qué específicamente:</p>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${terrActual.subs.map(s => {
                        const sel = _wf.sub === s;
                        return `<button onclick="window.selSub('${s.replace(/'/g,"\\'")}')"
                                        style="padding:5px 12px;border-radius:99px;font-size:0.78rem;
                                               border:${sel ? '1.5px solid #324C89' : '1px solid #e0e0e0'};
                                               background:${sel ? '#f0f4fc' : 'white'};
                                               color:${sel ? '#324C89' : '#555'};cursor:pointer;">${s}</button>`;
                    }).join('')}
                </div>
            </div>` : '';

        const tonosHtml = _wf.territory ? `
            <div style="margin-top:1rem;">
                <p style="font-size:0.75rem;color:#888;margin:0 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">¿Cómo lo expresás?</p>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${TONOS.map(t => {
                        const sel = _wf.tone === t.key;
                        return `<button onclick="window.selTone('${t.key}')"
                                        style="padding:5px 12px;border-radius:99px;font-size:0.78rem;
                                               border:${sel ? '1.5px solid #e50914' : '1px solid #e0e0e0'};
                                               background:${sel ? '#fff0f0' : 'white'};
                                               color:${sel ? '#e50914' : '#555'};cursor:pointer;">${t.label}</button>`;
                    }).join('')}
                </div>
            </div>` : '';

        const puedeAvanzar = _wf.territory && _wf.tone;

        return `
                    ${headerWf('¿De qué va tu publicación?', 1, totalPasos)}
                    ${peliculaTag}
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                        ${gridTerr}
                    </div>
                    ${subsHtml}
                    ${tonosHtml}
                    <div style="margin-top:1.25rem;">
                        <button onclick="window.wfPaso1Continuar()"
                                ${!puedeAvanzar ? 'disabled' : ''}
                                style="width:100%;padding:0.7rem;border:none;border-radius:10px;
                                       background:${puedeAvanzar ? '#324C89' : '#e0e0e0'};
                                       color:${puedeAvanzar ? 'white' : '#aaa'};
                                       cursor:${puedeAvanzar ? 'pointer' : 'not-allowed'};font-size:0.9rem;font-weight:600;">
                            Continuar →
                        </button>
                    </div>`;
            }

            window.wfPaso1Continuar = function() {
                if (_wf.movieId) {
                    _wf.paso = wfEsCreator() ? 4 : 5;
                } else {
                    _wf.paso = 2;
                }
                renderWorkflow();
            };

            window.selTerritory = function(key) {
                _wf.territory = key;
                _wf.sub = null;
                _wf.tone = null;
                renderWorkflow();
            };

            window.selSub = function(sub) {
                _wf.sub = sub;
                renderWorkflow();
            };

            window.selTone = function(key) {
                _wf.tone = key;
                renderWorkflow();
            };

            window.cambiarPelicula = function() {
                _wf.movieId = null;
                _wf.movieTitulo = null;
                _wf.creatorTool = null;
                _wf.movieFichaEnabled = false;
                _wf.paso = 2;
                renderWorkflow();
            };

            // PASO 2 — ¿Cómo armás la publicación?
            function renderPaso2() {
                const opcionLibre = `
                    <div onclick="window.wfElegirLibre()" style="border:1px solid #e0e0e0;border-radius:12px;padding:1.1rem;
                                 cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:0.9rem;margin-bottom:0.65rem;">
                        <span style="font-size:1.6rem;">✍️</span>
                        <div>
                            <p style="margin:0;font-size:0.92rem;font-weight:700;color:#1a1a1a;">Publicación libre</p>
                            <p style="margin:2px 0 0;font-size:0.78rem;color:#999;">Texto, imagen o video — sin vincular ninguna película</p>
                        </div>
                    </div>`;

                const opcionVincular = `
                    <div onclick="window.wfElegirVincular()" style="border:1px solid #e0e0e0;border-radius:12px;padding:1.1rem;
                                 cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:0.9rem;">
                        <span style="font-size:1.6rem;">🎬</span>
                        <div>
                            <p style="margin:0;font-size:0.92rem;font-weight:700;color:#1a1a1a;">Vincular con una película</p>
                            <p style="margin:2px 0 0;font-size:0.78rem;color:#999;">Elegí una película y, si sos Creator, enriquecé la publicación</p>
                        </div>
                    </div>`;

                return `
                    ${headerWf('¿Cómo armás tu publicación?', 2, wfTotalPasos())}
                    ${opcionLibre}
                    ${opcionVincular}
                    <div style="margin-top:1.25rem;">
                        <button onclick="window.wfPaso(1)" style="width:100%;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:10px;color:#666;cursor:pointer;font-size:0.9rem;">← Atrás</button>
                    </div>`;
            }

            window.wfElegirLibre = function() {
                _wf.paso = 5;
                renderWorkflow();
            };

            window.wfElegirVincular = function() {
                _wf.paso = 3;
                renderWorkflow();
            };

            // PASO 4 — Menú visual de Creator Tools (solo si hay película vinculada y es Creator)
            function renderPaso4() {
                const peliculaTag = `
                    <div style="display:inline-flex;align-items:center;gap:6px;background:#f4f6fb;border:1px solid #c8d4f0;border-radius:99px;padding:4px 12px;font-size:0.78rem;color:#324C89;font-weight:600;margin-bottom:1rem;">
                        <i class="fas fa-film"></i> ${_wf.movieTitulo || ''}
                        <span onclick="window.cambiarPelicula()" style="margin-left:4px;cursor:pointer;color:#aaa;font-size:0.85rem;">×</span>
                    </div>`;

                const leyenda = `
                    <p style="font-size:0.82rem;color:#666;margin:0 0 0.85rem;line-height:1.4;">
                        Elegí una herramienta para enriquecer tu publicación con esta película<br>
                        <span style="color:#aaa;">(opcional — si más adelante querés cambiarla, podés volver a este paso)</span>.
                    </p>`;

                const herramientas = window.CreatorTools || [];

                const gridHerramientas = herramientas.map(h => {
                    if (!h.disponible) {
                        return `<div style="border:1px dashed #e0e0e0;border-radius:12px;padding:1rem;opacity:0.5;">
                                    <p style="margin:0 0 4px;font-size:1.4rem;">${h.emoji}</p>
                                    <p style="margin:0;font-size:0.85rem;font-weight:700;color:#999;">${h.label}</p>
                                    <p style="margin:2px 0 0;font-size:0.72rem;color:#bbb;">${h.desc}</p>
                                </div>`;
                    }
                    const sel = _wf.creatorTool === h.key;
                    return `<div onclick="window.wfSeleccionarHerramienta('${h.key}')"
                                 style="position:relative;border:${sel ? '1.5px solid #7c3aed' : '1px solid #e0e0e0'};
                                        background:${sel ? '#f8f6ff' : 'white'};
                                        border-radius:12px;padding:1rem;cursor:pointer;transition:all 0.15s;">
                                ${sel ? `<span style="position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;
                                                background:#7c3aed;color:white;display:flex;align-items:center;justify-content:center;
                                                font-size:0.7rem;">✓</span>` : ''}
                                <p style="margin:0 0 4px;font-size:1.4rem;">${h.emoji}</p>
                                <p style="margin:0;font-size:0.85rem;font-weight:700;color:#1a1a1a;">${h.label}</p>
                                <p style="margin:2px 0 0;font-size:0.72rem;color:#999;">${h.desc}</p>
                            </div>`;
                }).join('');

                const toolSeleccionado = herramientas.find(h => h.key === _wf.creatorTool);
                const extraHerramienta = (toolSeleccionado && typeof toolSeleccionado.renderExtra === 'function') ? toolSeleccionado.renderExtra() : '';
                const puedeContinuarHerramienta = !toolSeleccionado || typeof toolSeleccionado.puedeAvanzar !== 'function' || toolSeleccionado.puedeAvanzar(_wf);

                return `
                    ${headerWf('Enriquecé tu publicación', 4, wfTotalPasos())}
                    ${peliculaTag}
                    ${leyenda}
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                        ${gridHerramientas}
                    </div>
                    ${extraHerramienta}
                    <div style="margin-top:1.25rem;display:flex;gap:0.75rem;">
                        <button onclick="window.wfPaso(3)" style="flex:1;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:10px;color:#666;cursor:pointer;font-size:0.9rem;">← Atrás</button>
                        <button id="wfBtnContinuarPaso4" onclick="window.wfPaso(5)"
                                ${!puedeContinuarHerramienta ? 'disabled' : ''}
                                style="flex:2;padding:0.7rem;border:none;border-radius:10px;
                                       background:${puedeContinuarHerramienta ? '#324C89' : '#e0e0e0'};
                                       color:${puedeContinuarHerramienta ? 'white' : '#aaa'};
                                       cursor:${puedeContinuarHerramienta ? 'pointer' : 'not-allowed'};font-size:0.9rem;font-weight:600;">
                            Continuar →
                        </button>
                    </div>`;
            }

            window.wfSetCreatorToolField = function(field, value) {
                _wf[field] = value;
                renderWorkflow();
            };

            window.wfSeleccionarHerramienta = function(key) {
                // Toggle: tocar la que ya estaba elegida la deselecciona
                // (vuelve a "ninguna"), en vez de necesitar un botón aparte.
                const nuevaKey = (_wf.creatorTool === key) ? null : key;
                _wf.creatorTool = nuevaKey;
                (window.CreatorTools || []).forEach(tool => {
                    if (typeof tool.onSeleccionar === 'function') {
                        tool.onSeleccionar(_wf, tool.key === nuevaKey);
                    }
                });
                const activo = (window.CreatorTools || []).find(t => t.key === nuevaKey);
                if (activo && activo.bloqueaImagenVideo) {
                    _wf.imageUrls = [];
                    _wf.videoUid = null;
                    _wf._videoFileName = null;
                }
                renderWorkflow();
            };

            // PASO 5 — Contenido
            function renderPaso5() {
        const isPremium = localStorage.getItem('userPremium') === 'true';
                const isCreator = localStorage.getItem('userCreator') === 'true';
                const puedeImagen = isPremium || isCreator;
                const puedeVideo = isCreator;
                const maxImagenes = isCreator ? 10 : isPremium ? 1 : 0;

                const spoilerCheck = _wf.tone === 'SPOILER'
                    ? `<div style="background:#fff0f0;border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;font-size:0.82rem;color:#e50914;">
                            <i class="fas fa-exclamation-triangle"></i> Tu publicación se marcará automáticamente como Spoiler.
                       </div>` : '';

                const herramientaSeleccionada = (window.CreatorTools || []).find(t => t.key === _wf.creatorTool);
                    const herramientaChip = herramientaSeleccionada ? `
                                <div style="display:flex;align-items:center;justify-content:${_wf._editandoId ? 'flex-start' : 'space-between'};background:#f8f6ff;border:1px solid #e0d6ff;
                                            border-radius:8px;padding:0.6rem 0.9rem;margin-bottom:0.75rem;font-size:0.8rem;color:#5a3fa0;">
                                    <span>${herramientaSeleccionada.emoji} ${herramientaSeleccionada.label} activada</span>
                                    ${!_wf._editandoId ? `<span onclick="window.wfPaso(4)" style="cursor:pointer;color:#7c3aed;font-weight:600;">Cambiar</span>` : ''}
                                </div>` : '';

                const upsellCreator = (_wf.movieId && !isCreator) ? `
                        <div style="background:#fff9e6;border:1px solid #f5dd8a;border-radius:8px;padding:0.65rem 0.9rem;margin-bottom:0.75rem;font-size:0.78rem;color:#8a6d00;">
                            ☝️ Con <a href="javascript:void(0)" onclick="window.iniciarSuscripcionCreator()" style="color:#324C89;font-weight:700;text-decoration:underline;cursor:pointer;">Creator</a> podés enriquecer tus publicaciones vinculadas con: ficha técnica, cuenta regresiva de estreno, votaciones, sliders de expectativa, rankings, trivias y muchas más herramientas— y tus comentarios/respuestas quedan destacados con la insignia de autor.
                        </div>` : '';

                        return `
                                    ${headerWf('Escribí tu publicación', wfPasoVisible(), wfTotalPasos())}

                                    ${herramientaChip}
                                    ${upsellCreator}
                                    ${spoilerCheck}

                        ${(() => {
                                const toolActivoTitulo = (window.CreatorTools || []).find(t => t.key === _wf.creatorTool);
                                const ocultarTitulo = toolActivoTitulo && typeof toolActivoTitulo.ocultaTituloGeneral === 'function'
                                    && toolActivoTitulo.ocultaTituloGeneral(_wf);
                                if (ocultarTitulo) return '';
                                return `
                        <input id="wfTitulo" type="text" placeholder="Título de tu publicación..." maxlength="150"
                               value="${(_wf.title || '').replace(/"/g, '&quot;')}"
                               oninput="window.wfTituloChange(this)"
                               style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e0e0e0;
                                      border-radius:10px;font-size:0.92rem;font-family:inherit;margin-bottom:0.4rem;font-weight:600;">
                        <div style="text-align:right;font-size:0.72rem;color:#bbb;margin-bottom:0.75rem;" id="wfTituloCount">
                            ${(_wf.title || '').length} / 150
                        </div>`;
                            })()}

                    ${(() => {
                            const toolActivoContenido = (window.CreatorTools || []).find(t => t.key === _wf.creatorTool);
                            const ocultarContenido = toolActivoContenido && typeof toolActivoContenido.ocultaContenidoGeneral === 'function'
                                && toolActivoContenido.ocultaContenidoGeneral(_wf);
                            if (ocultarContenido) return '';
                            return `
                        <textarea id="wfContent" placeholder="Compartí tu opinión, análisis, pregunta..." maxlength="2000"
                                  oninput="window.wfContentChange(this)"
                                  style="width:100%;box-sizing:border-box;min-height:140px;padding:12px 14px;
                                         border:1.5px solid #e0e0e0;border-radius:10px;font-size:0.9rem;
                                         font-family:inherit;resize:none;line-height:1.6;"
                        >${_wf.content}</textarea>
                        <div style="text-align:right;font-size:0.75rem;color:#bbb;margin-top:4px;" id="wfCharCount">
                            ${_wf.content.length} / 2000
                        </div>`;
                        })()}

                    <div id="wfHashtagsWrap" style="position:relative;margin-top:0.75rem;">
                                            <div id="wfHashtagsChips" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;
                                                 width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #e0e0e0;
                                                 border-radius:10px;font-family:inherit;min-height:42px;">${construirHashtagsChipsHtml()}</div>
                                            <div id="wfHashtagSugerencias" class="wf-hashtag-sugerencias" style="display:none;"></div>
                                        </div>
                                        <div style="text-align:right;font-size:0.72rem;color:#bbb;margin-top:2px;" id="wfHashtagsCount">${wfHashtagsArray().length} / 5</div>

            <div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                    ${_wf._tieneVideo ? `
                        <div style="width:100%;background:#f4f6fb;border:1px solid #c8d4f0;border-radius:8px;padding:0.65rem 0.9rem;font-size:0.78rem;color:#324C89;">
                            <i class="fas fa-video"></i> Esta publicación tiene un video adjunto y no se puede modificar.
                            Si querés cambiarlo, eliminá la publicación y volvé a publicar.
                        </div>
                    ` : (() => {
                        // Toggle versátil: si ya eligió imagen, video queda oculto (y viceversa).
                        // En cuanto saca lo que eligió (con la "×"), la otra opción reaparece sola.
                        const tieneImagenSeleccionada = (_wf.imageUrls || []).length > 0;
                        const tieneVideoSeleccionado = !!_wf.videoUid;
                        const herramientaBloqueante = _wf.creatorTool
                            ? (window.CreatorTools || []).find(t => t.key === _wf.creatorTool && t.bloqueaImagenVideo)
                            : null;
                        const modoFicha = !!herramientaBloqueante;
                        const nombreHerramientaBloqueante = herramientaBloqueante ? herramientaBloqueante.label : 'Esta herramienta';

                        let html = '';

                        if (!tieneVideoSeleccionado) {
                            const botonImagen = modoFicha
                                ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
                                                border:1px dashed #e0e0e0;border-radius:99px;font-size:0.8rem;color:#ccc;"
                                         title="${nombreHerramientaBloqueante} no se puede combinar con imagen o video, solo texto"
                                         onclick="window.mostrarToast && window.mostrarToast('${nombreHerramientaBloqueante} no se puede combinar con imagen o video, solo texto', 'info')">
                                        <i class="fas fa-image"></i> Imagen (no disponible)
                                   </span>`
                                : puedeImagen
                                ? `<label style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
                                                 border:1px solid #e0e0e0;border-radius:99px;cursor:pointer;font-size:0.8rem;color:#555;">
                                        <i class="fas fa-image"></i> Imagen (máx ${maxImagenes})
                                        <input type="file" accept="image/*" multiple style="display:none;"
                                               onchange="window.wfAdjuntarImagenes(this, ${maxImagenes})">
                                   </label>`
                                : `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
                                                border:1px dashed #e0e0e0;border-radius:99px;font-size:0.8rem;color:#ccc;"
                                         title="Disponible para usuarios Premium y Creator"
                                         onclick="window.mostrarToast && window.mostrarToast('Disponible para usuarios Premium y Creator', 'info')">
                                        <i class="fas fa-image"></i> Imagen (Premium)
                                   </span>`;
                            html += `<span id="wfSlotImagen">${botonImagen}</span>`;
                        }

                        if (!tieneImagenSeleccionada) {
                            const botonVideo = modoFicha
                                    ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
                                                    border:1px dashed #e0e0e0;border-radius:99px;font-size:0.8rem;color:#ccc;"
                                             title="${nombreHerramientaBloqueante} no se puede combinar con imagen o video, solo texto"
                                             onclick="window.mostrarToast && window.mostrarToast('${nombreHerramientaBloqueante} no se puede combinar con imagen o video, solo texto', 'info')">
                                            <i class="fas fa-video"></i> Video (no disponible)
                                       </span>`
                                    : puedeVideo
                                ? `<label style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
                                                 border:1px solid #e0e0e0;border-radius:99px;cursor:pointer;font-size:0.8rem;color:#555;">
                                        <i class="fas fa-video"></i> Video
                                        <input type="file" accept="video/*" style="display:none;"
                                               onchange="window.wfAdjuntarVideo(this)">
                                   </label>`
                                : `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
                                                border:1px dashed #e0e0e0;border-radius:99px;font-size:0.8rem;color:#ccc;"
                                         title="Disponible exclusivamente para usuarios Creator"
                                         onclick="window.mostrarToast && window.mostrarToast('Disponible exclusivamente para usuarios Creator', 'info')">
                                        <i class="fas fa-video"></i> Video (Creator)
                                   </span>`;
                            html += `<span id="wfSlotVideo">${botonVideo}</span>`;
                        }

                        return html;
                    })()}
                    </div>

            <div id="wfPreviewImagenes" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:0.5rem;">${
                            (_wf.imageUrls || []).map((url, idx) =>
                                `<div class="wf-img-tile" style="position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;flex-shrink:0;">
                                    <img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                                    <button class="wf-img-remove-btn" onclick="window.wfQuitarImagenPreview(${idx})"
                                            style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;
                                                   background:rgba(0,0,0,0.6);color:white;border:none;cursor:pointer;
                                                   display:flex;align-items:center;justify-content:center;font-size:0.8rem;line-height:1;padding:0;">
                                        ×
                                    </button>
                                </div>`
                            ).join('')
                        }</div>
            <div id="wfPreviewVideo" style="margin-top:0.5rem;">${
                            _wf.videoUid ? `
                                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f0faf0;border-radius:8px;font-size:0.8rem;color:#2e7d32;">
                                    <i class="fas fa-check-circle"></i> ${_wf._videoFileName || 'Video cargado'}
                                    <button onclick="window.wfQuitarVideo()" style="margin-left:auto;background:none;border:none;color:#999;cursor:pointer;font-size:0.9rem;">×</button>
                                </div>` : ''
                        }</div>

            <div style="margin-top:1rem;padding:0.75rem;background:#f9f9f9;border-radius:8px;font-size:0.75rem;color:#aaa;line-height:1.5;">
                Cinemarketer vela por la integridad de la comunidad. Todo contenido que viole nuestras
                                <span onclick="window.footerModal && window.footerModal.abrir('normasConvivencia'); const fmo = document.getElementById('footerModalOverlay'); if (fmo) fmo.style.zIndex = '9999999';"
                                      style="color:#324C89;cursor:pointer;text-decoration:underline;">Normas de Convivencia</span> puede resultar en la censura del contenido y sanción de tu perfil.
            </div>

            <div style="margin-top:1.25rem;display:flex;gap:0.75rem;">
                            ${!_wf._editandoId ? `<button onclick="window.wfPaso(wfPasoAnterior())" style="flex:1;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:10px;color:#666;cursor:pointer;font-size:0.9rem;">← Atrás</button>` : ''}
                            <button onclick="window.wfPublicar()"
                                    id="wfBtnPublicar"
                        style="flex:2;padding:0.7rem;background:#e50914;border:none;border-radius:10px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                    ${_wf._editandoId ? 'Guardar cambios' : 'Publicar'}
                </button>
            </div>`;
    }

    window.wfContentChange = function(el) {
        _wf.content = el.value;
        _wf.spoiler = _wf.tone === 'SPOILER';
        const count = document.getElementById('wfCharCount');
        if (count) count.textContent = `${el.value.length} / 2000`;
    };

    window.wfTituloChange = function(el) {
        _wf.title = el.value;
        const count = document.getElementById('wfTituloCount');
        if (count) count.textContent = `${el.value.length} / 150`;
    };

    function wfHashtagsArray() {
            return (_wf.hashtags || '').split(',').map(h => h.trim()).filter(Boolean);
        }

        function construirHashtagsChipsHtml() {
            const chips = wfHashtagsArray();
            const puedeAgregar = chips.length < 5;
            return `
                ${chips.map((h, i) => `
                    <span class="wf-hashtag-chip">#${escapeHtmlWf(h)}<button type="button" onclick="window.wfQuitarHashtagChip(${i})">&times;</button></span>
                `).join('')}
                ${puedeAgregar ? `
                    <input id="wfHashtagInput" type="text" maxlength="50" placeholder="${chips.length === 0 ? 'Agregar hashtag y presioná Enter...' : 'Agregar otro...'}"
                                           oninput="window.wfHashtagInputSanitize(this)"
                                           onkeydown="window.wfHashtagInputKeydown(event)"
                                           onblur="window.wfInputHashtagBlur(this)"
                                           style="border:none;outline:none;flex:1;min-width:100px;font-size:0.85rem;font-family:inherit;background:transparent;">
                ` : ''}
            `;
        }

        function wfRenderHashtagsChips(mantenerFoco) {
            const cont = document.getElementById('wfHashtagsChips');
            const countEl = document.getElementById('wfHashtagsCount');
            if (cont) cont.innerHTML = construirHashtagsChipsHtml();
            if (countEl) countEl.textContent = `${wfHashtagsArray().length} / 5`;
            if (mantenerFoco) {
                const inputEl = document.getElementById('wfHashtagInput');
                if (inputEl) inputEl.focus();
            }
        }

        const MAX_HASHTAG_LENGTH = 50;
            let _wfHashtagDebounceTimer = null;

            window.wfHashtagInputSanitize = function(el) {
                // Mismo criterio que valida el backend: solo letras (con acentos/ñ) y números,
                // y tope de 50 caracteres por hashtag (aplica igual si se tipea o se pega).
                el.value = el.value
                    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '')
                    .slice(0, MAX_HASHTAG_LENGTH);

                clearTimeout(_wfHashtagDebounceTimer);
                const valor = el.value.trim();
                if (valor.length < 2) {
                    window.wfOcultarSugerenciasHashtag();
                    return;
                }
                _wfHashtagDebounceTimer = setTimeout(() => window.wfBuscarSugerenciasHashtag(valor), 300);
            };

            window.wfHashtagInputKeydown = function(event) {
                if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
                    event.preventDefault();
                    window.wfConfirmarHashtagChip(event.target, true);
                } else if (event.key === 'Backspace' && event.target.value === '') {
                    const chips = wfHashtagsArray();
                    if (chips.length > 0) {
                        chips.pop();
                        _wf.hashtags = chips.join(', ');
                        window.wfOcultarSugerenciasHashtag();
                        wfRenderHashtagsChips(true);
                    }
                } else if (event.key === 'Escape') {
                    window.wfOcultarSugerenciasHashtag();
                }
            };

            window.wfConfirmarHashtagChip = function(el, mantenerFoco) {
                const valor = (el.value || '').trim().slice(0, MAX_HASHTAG_LENGTH);
                if (!valor) { window.wfOcultarSugerenciasHashtag(); return; }
                const chips = wfHashtagsArray();
                if (chips.length >= 5 || chips.includes(valor)) {
                    el.value = '';
                    window.wfOcultarSugerenciasHashtag();
                    return;
                }
                chips.push(valor);
                _wf.hashtags = chips.join(', ');
                window.wfOcultarSugerenciasHashtag();
                wfRenderHashtagsChips(mantenerFoco);
            };

            window.wfQuitarHashtagChip = function(index) {
                const chips = wfHashtagsArray();
                chips.splice(index, 1);
                _wf.hashtags = chips.join(', ');
                window.wfOcultarSugerenciasHashtag();
                wfRenderHashtagsChips(true);
            };

            window.wfInputHashtagBlur = function(el) {
                // Pequeño delay: si el blur fue porque se tocó una sugerencia, el
                // onmousedown de la sugerencia ya usa preventDefault, así que el
                // input nunca pierde foco en ese caso — este blur solo dispara
                // cuando el usuario realmente se fue del campo (tab, tocar "Publicar", etc).
                window.wfConfirmarHashtagChip(el);
                window.wfOcultarSugerenciasHashtag();
            };

            window.wfBuscarSugerenciasHashtag = async function(query) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${window._comunidadApiUrl}/publications/hashtags/suggest?q=${encodeURIComponent(query)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) return;
                    const sugerencias = await res.json();
                    window.wfMostrarSugerenciasHashtag(sugerencias);
                } catch(e) {}
            };

            window.wfMostrarSugerenciasHashtag = function(sugerencias) {
                const cont = document.getElementById('wfHashtagSugerencias');
                if (!cont) return;
                const chips = wfHashtagsArray();
                const disponibles = (sugerencias || []).filter(s => !chips.includes(s.nombre));

                if (disponibles.length === 0) {
                    cont.style.display = 'none';
                    cont.innerHTML = '';
                    return;
                }

                cont.innerHTML = disponibles.map(s => `
                    <div class="wf-hashtag-sugerencia-item" onmousedown="event.preventDefault();window.wfElegirSugerenciaHashtag('${s.nombre.replace(/'/g, "\\'")}')">
                        <span class="wf-hashtag-sugerencia-nombre">#${escapeHtmlWf(s.nombre)}</span>
                        <span class="wf-hashtag-sugerencia-count">${s.usageCount} publicaci${s.usageCount === 1 ? 'ón' : 'ones'}</span>
                    </div>
                `).join('');
                cont.style.display = 'block';
            };

            window.wfOcultarSugerenciasHashtag = function() {
                const cont = document.getElementById('wfHashtagSugerencias');
                if (cont) { cont.style.display = 'none'; cont.innerHTML = ''; }
            };

            window.wfElegirSugerenciaHashtag = function(nombre) {
                const chips = wfHashtagsArray();
                if (chips.length >= 5 || chips.includes(nombre)) return;
                chips.push(nombre);
                _wf.hashtags = chips.join(', ');
                window.wfOcultarSugerenciasHashtag();
                wfRenderHashtagsChips(true);
            };

        // La coma es el separador principal (permite frases de varias palabras como
        // "ciencia ficcion" -> un solo hashtag). El "#" es un separador alternativo
        // dentro de un mismo segmento, para cuando no se usan comas.
        function parsearHashtagsInput(str) {
            if (!str) return [];
            const resultado = [];
            str.split(',').forEach(segmento => {
                segmento = segmento.trim();
                if (!segmento) return;
                if (segmento.includes('#')) {
                    segmento.split('#').forEach(sub => {
                        const limpio = sub.trim().replace(/\s+/g, '');
                        if (limpio) resultado.push(limpio);
                    });
                } else {
                    const limpio = segmento.replace(/\s+/g, '');
                    if (limpio) resultado.push(limpio);
                }
            });
            return resultado.slice(0, 5);
        }

        // Solo letras (incluye acentos/ñ) y números arábigos — nada de símbolos.
        function hashtagsInvalidos(array) {
            const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]+$/;
            return array.filter(h => !regex.test(h));
        }

        function mostrarModalConfirmarSinPuntos() {
                const isPremium = localStorage.getItem('userPremium') === 'true';
                const isCreator = localStorage.getItem('userCreator') === 'true';

                let mensaje;
                if (isPremium) {
                    mensaje = 'Ya usaste tus publicaciones con puntos de hoy. Esta publicación no va a generar puntos — tu cupo se restablece a las 00 hs.';
                } else {
                    // Free o Creator-solo: mismo comportamiento de puntos (Creator no
                    // resta ni suma en este eje, solo aporta funciones).
                    mensaje = 'Ya usaste tu publicación con puntos de hoy. Esta publicación no va a generar puntos — tu cupo se restablece a las 00 hs.';
                }

                const overlay = document.createElement('div');
                overlay.id = 'modalSinPuntosOverlay';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
                overlay.innerHTML = `
                    <div style="background:white;border-radius:16px;padding:1.5rem;max-width:420px;width:100%;" onclick="event.stopPropagation()">
                        <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;">
                            <i class="fas fa-info-circle" style="color:#324C89;"></i> Esta publicación no sumará puntos
                        </h3>
                        <p style="color:#666;font-size:0.88rem;margin-bottom:1.25rem;line-height:1.5;">${mensaje}</p>
                        <div style="display:flex;gap:0.75rem;">
                            <button onclick="document.getElementById('modalSinPuntosOverlay').remove()"
                                    style="flex:1;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                                Cancelar
                            </button>
                            <button onclick="window._confirmarPublicarSinPuntos()"
                                    style="flex:1;padding:0.7rem;background:#e50914;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                                Publicar igual
                            </button>
                        </div>
                    </div>`;
                document.body.appendChild(overlay);
                overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            }

            window._confirmarPublicarSinPuntos = function() {
                const overlay = document.getElementById('modalSinPuntosOverlay');
                if (overlay) overlay.remove();
                _wf._confirmoSinPuntos = true;
                window.wfPublicar();
            };

        function mostrarModalErrorPublicar(mensaje) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        // Si el mensaje menciona "Creator", lo convertimos en un link clickeable
                // que abre el mismo modal de promoción que ya existe en Mi Cuenta —
                // un solo lugar centralizado para todo lo relacionado a "hacerse Creator",
                // así cuando se conecte el pago real (Mercado Pago) solo hay que
                // actualizar ese modal, no rastrear mensajes sueltos por la plataforma.
                let mensajeHtml = escapeHtmlWf(mensaje).replace(
                    /Creator/,
                    `<a href="javascript:void(0)" onclick="event.stopPropagation(); (typeof window.abrirDetallePlanCreator === 'function' ? window.abrirDetallePlanCreator() : (window.mostrarToast ? window.mostrarToast('Suscripción Creator próximamente.', 'info') : alert('Suscripción Creator próximamente.')))" style="color:#324C89;text-decoration:underline;font-weight:600;">Creator</a>`
                );

        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:1.5rem;max-width:420px;width:100%;" onclick="event.stopPropagation()">
                <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;">
                    <i class="fas fa-exclamation-triangle" style="color:#e50914;"></i> No se pudo publicar
                </h3>
                <p style="color:#666;font-size:0.88rem;margin-bottom:1rem;">${mensajeHtml}</p>
                <button onclick="this.closest('div[style]').parentElement.remove()"
                        style="width:100%;padding:0.7rem;background:#e50914;border:none;border-radius:8px;
                               color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                    Entendido
                </button>
            </div>`;

        document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        }
                    window.mostrarModalErrorPublicar = mostrarModalErrorPublicar;

                    function mostrarModalHashtagInvalido(invalidos) {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

            const items = invalidos.map(h => `<li>${escapeHtmlWf(h)}</li>`).join('');

            overlay.innerHTML = `
                <div style="background:white;border-radius:16px;padding:1.5rem;max-width:420px;width:100%;" onclick="event.stopPropagation()">
                    <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;">
                        <i class="fas fa-exclamation-triangle" style="color:#e50914;"></i> Hashtag inválido
                    </h3>
                    <p style="color:#666;font-size:0.88rem;margin-bottom:0.5rem;">
                        Los hashtags solo pueden tener letras y números, sin espacios ni símbolos. Estos no son válidos:
                    </p>
                    <ul style="color:#888;font-size:0.85rem;margin:0 0 1rem;padding-left:1.2rem;">${items}</ul>
                    <p style="color:#666;font-size:0.85rem;margin-bottom:1rem;">
                        Ejemplo: terror, loquemegustadelcine, etcetc
                    </p>
                    <button onclick="this.closest('div[style]').parentElement.remove()"
                            style="width:100%;padding:0.7rem;background:#e50914;border:none;border-radius:8px;
                                   color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                        Entendido
                    </button>
                </div>`;

            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        }

        function mostrarModalImagenPesada(rechazadas) {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

                const items = rechazadas.map(f =>
                            `<li>${escapeHtmlWf(f.name)} (${(f.size / 1024 / 1024).toFixed(1)}MB)</li>`).join('');

                overlay.innerHTML = `
                    <div style="background:white;border-radius:16px;padding:1.5rem;max-width:420px;width:100%;" onclick="event.stopPropagation()">
                        <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;">
                            <i class="fas fa-exclamation-triangle" style="color:#e50914;"></i> Imagen demasiado pesada
                        </h3>
                        <p style="color:#666;font-size:0.88rem;margin-bottom:0.5rem;">
                            Estas imágenes superan el tamaño máximo permitido (${MAX_IMAGE_SIZE_MB}MB) y no se adjuntaron:
                        </p>
                        <ul style="color:#888;font-size:0.85rem;margin:0 0 1rem;padding-left:1.2rem;">${items}</ul>
                        <p style="color:#666;font-size:0.85rem;margin-bottom:1rem;">
                            Elegí otra imagen o reducí su peso e intentá de nuevo.
                        </p>
                        <button onclick="this.closest('div[style]').parentElement.remove()"
                                style="width:100%;padding:0.7rem;background:#e50914;border:none;border-radius:8px;
                                       color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                            Entendido
                        </button>
                    </div>`;

                document.body.appendChild(overlay);
                overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            }

            window.wfAdjuntarImagenes = async function(input, maxImagenes) {
                    const yaCargadas = (_wf.imageUrls || []).length;
                    const espacioDisponible = Math.max(0, maxImagenes - yaCargadas);
                    const files = Array.from(input.files).slice(0, espacioDisponible);
                    const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;

            const validas = files.filter(f => f.size <= maxBytes);
            const rechazadas = files.filter(f => f.size > maxBytes);

            if (rechazadas.length > 0) {
                        mostrarModalImagenPesada(rechazadas);
                    }
            if (validas.length === 0) return;

            const preview = document.getElementById('wfPreviewImagenes');
            if (!preview) return;

            // Ocultamos Video de inmediato, apenas arranca la subida — no hay
            // que esperar a que termine, porque durante el await el usuario
            // podía seguir clickeando el botón contrario (condición de carrera).
            const slotVideoOcultarInicio = document.getElementById('wfSlotVideo');
            if (slotVideoOcultarInicio) slotVideoOcultarInicio.style.display = 'none';

            // Guardamos lo que ya había, por si la subida nueva falla y hay que conservarlo intacto
            const imageUrlsAnteriores = (_wf.imageUrls || []).slice();
            const previewHtmlAnterior = preview.innerHTML;

            _wf._subiendoImagenes = true;
            const nuevasUrls = [];
            const tilesNuevos = [];
            const token = localStorage.getItem('token');

            for (const file of validas) {
                const tileId = 'wfImgTile-' + Math.random().toString(36).slice(2, 9);
                const tile = document.createElement('div');
                tile.id = tileId;
                tile.style.cssText = 'position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;background:#f0f0f0;flex-shrink:0;';

                const previewSrc = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                tile.innerHTML = `
                    <img src="${previewSrc}" style="width:100%;height:100%;object-fit:cover;display:block;">
                    <div class="wf-img-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.45);
                         display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-spinner fa-spin" style="color:white;font-size:1.1rem;"></i>
                    </div>`;
                // Se agrega al lado de lo que ya había — todavía no se borra nada
                preview.appendChild(tile);
                tilesNuevos.push(tile);

                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const uploadRes = await fetch(`${window._comunidadApiUrl}/publications/upload-image`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });

                    if (!uploadRes.ok) {
                        const errData = await uploadRes.json().catch(() => ({}));
                        marcarTileImagenError(tileId, errData.error || 'Error al subir la imagen.');
                        continue;
                    }

                    const uploadData = await uploadRes.json();
                    nuevasUrls.push(uploadData.url);
                    tile.classList.add('wf-img-tile');

                } catch (e) {
                    marcarTileImagenError(tileId, 'Error de conexión al subir la imagen.');
                }
            }

            if (nuevasUrls.length > 0) {
                            // Al menos una subió bien — se agregan a las que ya
                            // había, no las reemplazan.
                            _wf.imageUrls = imageUrlsAnteriores.concat(nuevasUrls);
                            _wf._subiendoImagenes = false;

                            // Re-renderizamos todo el paso — no solo actualiza los tiles de
                            // preview, sino que oculta la opción de Video (toggle versátil
                            // Imagen/Video: no se pueden combinar en la misma publicación).
                            renderWorkflow();
                            return;
                        } else {
                            // Ninguna subió: restauramos exactamente lo que había antes,
                            // y volvemos a mostrar Video ya que no quedó ninguna imagen.
                            _wf.imageUrls = imageUrlsAnteriores;
                            preview.innerHTML = previewHtmlAnterior;
                            const slotVideoRestaurar = document.getElementById('wfSlotVideo');
                            if (slotVideoRestaurar) slotVideoRestaurar.style.display = '';
                        }

                        _wf._subiendoImagenes = false;
                    };

        function marcarTileImagenError(tileId, mensaje) {
            const tile = document.getElementById(tileId);
            if (tile) {
                tile.innerHTML = `
                    <div style="width:100%;height:100%;background:#fff0f0;border:1.5px solid #e50914;border-radius:6px;
                         display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;">
                        <i class="fas fa-exclamation-triangle" style="color:#e50914;font-size:0.95rem;"></i>
                        <span style="font-size:0.58rem;color:#e50914;margin-top:2px;line-height:1.1;">No se subió</span>
                    </div>`;
            }
            if (typeof window.mostrarModalErrorPublicar === 'function') {
                window.mostrarModalErrorPublicar(mensaje);
            }
        }

    window.wfQuitarImagenPreview = function(idx) {
        if (!_wf.imageUrls) return;
        _wf.imageUrls.splice(idx, 1);

        // Si era la última imagen, re-renderizamos todo el paso para que
        // reaparezca la opción de Video (toggle versátil Imagen/Video).
        if (_wf.imageUrls.length === 0) {
            renderWorkflow();
            return;
        }

        const preview = document.getElementById('wfPreviewImagenes');
        if (!preview) return;
        const tiles = preview.querySelectorAll('.wf-img-tile');
        if (tiles[idx]) tiles[idx].remove();

        preview.querySelectorAll('.wf-img-tile').forEach((tile, i) => {
            const btn = tile.querySelector('.wf-img-remove-btn');
            if (btn) btn.setAttribute('onclick', `window.wfQuitarImagenPreview(${i})`);
        });
    };

        const MAX_VIDEO_SIZE_MB = 25; // debe coincidir con el límite del backend en upload-video

        window.wfAdjuntarVideo = async function(input) {
            const file = input.files[0];
            if (!file) return;

            const preview = document.getElementById('wfPreviewVideo');
            if (!preview) return;

            if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
                // Si ya había un video válido cargado, lo conservamos — no perder
                // lo que ya estaba bien por culpa de un intento nuevo fallido.
                if (!_wf.videoUid) preview.innerHTML = '';
                if (typeof window.mostrarModalErrorPublicar === 'function') {
                    window.mostrarModalErrorPublicar(`El video supera el tamaño máximo permitido (${MAX_VIDEO_SIZE_MB}MB).`);
                }
                input.value = '';
                return;
            }

            // Validar duración leyendo la metadata localmente, antes de subir nada
            // — evita gastar minutos de storage de Cloudflare en videos que de
            // todos modos vamos a rechazar.
            const MAX_VIDEO_DURATION_SEC = 60;
            const duracionOk = await new Promise((resolve) => {
                const videoEl = document.createElement('video');
                videoEl.preload = 'metadata';
                videoEl.onloadedmetadata = () => {
                    URL.revokeObjectURL(videoEl.src);
                    resolve(videoEl.duration <= MAX_VIDEO_DURATION_SEC);
                };
                videoEl.onerror = () => {
                    URL.revokeObjectURL(videoEl.src);
                    resolve(true); // si no se puede leer la duración, no bloqueamos acá — el backend igual valida tamaño
                };
                videoEl.src = URL.createObjectURL(file);
            });

            if (!duracionOk) {
                if (!_wf.videoUid) preview.innerHTML = '';
                if (typeof window.mostrarModalErrorPublicar === 'function') {
                    window.mostrarModalErrorPublicar(
                        `Este video supera los ${MAX_VIDEO_DURATION_SEC} segundos, por favor, volver a subirlo con una duración menor o igual a los ${MAX_VIDEO_DURATION_SEC} segundos.`
                    );
                }
                input.value = '';
                return;
            }

            preview.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f4f6fb;border-radius:8px;font-size:0.8rem;color:#324C89;">
                    <i class="fas fa-spinner fa-spin"></i> Subiendo ${file.name}...
                </div>`;

            _wf._subiendoVideo = true;
            _wf.videoUid = null;

            // Ocultamos Imagen de inmediato, apenas arranca la subida — mismo
            // motivo que en wfAdjuntarImagenes: cortar la condición de carrera.
            const slotImagenOcultarInicio = document.getElementById('wfSlotImagen');
            if (slotImagenOcultarInicio) slotImagenOcultarInicio.style.display = 'none';

            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch(`${window._comunidadApiUrl}/publications/upload-video`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Error al subir el video.');
                }

                const data = await res.json();
                                _wf.videoUid = data.videoUid;
                                _wf._videoFileName = file.name;
                                _wf._subiendoVideo = false;

                                // Re-renderizamos todo el paso — oculta la opción de Imagen
                                // (toggle versátil: no se pueden combinar en la misma publicación),
                                // igual que ya hace wfAdjuntarImagenes en el sentido inverso.
                                renderWorkflow();
                                return;

                            } catch (e) {
                                preview.innerHTML = '';
                                if (typeof window.mostrarModalErrorPublicar === 'function') {
                                    window.mostrarModalErrorPublicar(e.message || 'Error al subir el video.');
                                }
                                input.value = '';
                                _wf._subiendoVideo = false;
                                // Restauramos Imagen ya que el video no llegó a subirse
                                const slotImagenRestaurar = document.getElementById('wfSlotImagen');
                                if (slotImagenRestaurar) slotImagenRestaurar.style.display = '';
                            }
                        };

        window.wfQuitarVideo = function() {
                _wf.videoUid = null;
                _wf._videoFileName = null;
                renderWorkflow();
            };

    window.wfPaso = function(paso) {
        _wf.paso = paso;
        renderWorkflow();
    };

    // PUBLICAR
        window.wfPublicar = async function() {
            if (!_wf._editandoId && (!_wf.title || _wf.title.trim().length < 3)) {
                alert('Escribí un título antes de publicar.');
                return;
            }
            const toolActivoPublicar = (window.CreatorTools || []).find(t => t.key === _wf.creatorTool);
            const ocultaContenidoPublicar = toolActivoPublicar && typeof toolActivoPublicar.ocultaContenidoGeneral === 'function'
                && toolActivoPublicar.ocultaContenidoGeneral(_wf);
            if (!ocultaContenidoPublicar && (!_wf.content || _wf.content.trim().length < 3)) {
                alert('Escribí algo antes de publicar.');
                return;
            }

            const hashtagsFinal = parsearHashtagsInput(_wf.hashtags);
            const invalidos = hashtagsInvalidos(hashtagsFinal);
            if (invalidos.length > 0) {
                mostrarModalHashtagInvalido(invalidos);
                return;
            }

            if (_wf._subiendoImagenes) {
                if (typeof window.mostrarModalErrorPublicar === 'function') {
                    window.mostrarModalErrorPublicar('Esperá a que termine de subirse la imagen antes de publicar.');
                }
                return;
            }
            if (_wf._subiendoVideo) {
                if (typeof window.mostrarModalErrorPublicar === 'function') {
                    window.mostrarModalErrorPublicar('Esperá a que termine de subirse el video antes de publicar.');
                }
                return;
            }

            // Antes de crear (no aplica a edición), chequeamos si esta
            // publicación va a sumar puntos. Si no va a sumar, el usuario
            // decide ANTES de publicar, no se entera después con un toast.
            if (!_wf._editandoId && !_wf._confirmoSinPuntos) {
                try {
                    const token = localStorage.getItem('token');
                    const resLimit = await fetch(`${window._comunidadApiUrl}/publications/limit`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (resLimit.ok) {
                        const info = await resLimit.json();
                        const sumaPuntos = info.publicacionesConPuntosHoy < info.limitePuntos;
                        if (!sumaPuntos) {
                            mostrarModalConfirmarSinPuntos();
                            return; // si confirma, el modal vuelve a llamar wfPublicar()
                        }
                    }
                } catch(e) {
                    // Si falla la consulta, no bloqueamos publicar — sigue el
                    // flujo normal y el backend decide como siempre.
                }
            }

            const btn = document.getElementById('wfBtnPublicar');

            // MODO EDICIÓN
            if (_wf._editandoId) {
                if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
                try {
                    const token = localStorage.getItem('token');
                                        const imageUrls = _wf.imageUrls || [];

                                        const hashtagsArrayEdit = parsearHashtagsInput(_wf.hashtags);
                    const res = await fetch(`${window._comunidadApiUrl}/publications/${_wf._editandoId}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: _wf.title.trim(),
                            content: _wf.content.trim(),
                            hashtags: hashtagsArrayEdit,
                            imageUrls,
                            videoUid: _wf.videoUid || null
                        })
                    });
                    const data = await res.json();
                            if (data.id) {
                                window.cerrarWorkflow();
                                const card = document.querySelector(`.com-card[data-id="${_wf._editandoId}"]`);

                                // Si la edición hizo que la publicación vuelva a caer en
                                // revisión (mismo control de cuenta nueva/riesgo que aplica
                                // al crear), NO corresponde mostrar el cambio en pantalla —
                                // el admin todavía tiene que aprobarla. Mismo criterio que
                                // ya usás al crear: ahí ni se parchea el DOM, directamente
                                // se recarga el feed y el backend la excluye solo por filtrar
                                // moderationStatus = APPROVED.
                                if (data.moderationStatus === 'PENDING_REVIEW') {
                                    if (card) card.remove();
                                    window.mostrarToast('🕓 Tu edición quedó en revisión. Mientras tanto, la publicación no se muestra en Comunidad.', 'info');
                                    return;
                                }

                                if (card) {
                                    const contenidoEl = card.querySelector('.com-card-content');
                                if (contenidoEl) contenidoEl.textContent = data.content;

                                // Título — se leía al abrir el editor pero nunca se
                                // volvía a pintar al guardar; por eso quedaba visible
                                // el viejo hasta recargar la página.
                                const _escHtmlEdit = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                                const tituloEl = card.querySelector('.com-card-titulo');
                                if (data.title) {
                                    if (tituloEl) {
                                        tituloEl.textContent = data.title;
                                    } else {
                                        card.insertAdjacentHTML('afterbegin',
                                            `<div class="com-card-titulo" style="font-weight:700;font-size:1.15rem;color:#1a1a1a;margin:10px 0 12px;padding:0 1rem;word-break:break-word;overflow-wrap:break-word;">${_escHtmlEdit(data.title)}</div>`);
                                    }
                                } else if (tituloEl) {
                                    tituloEl.remove();
                                }

                                // Hashtags — mismo caso: se leían al abrir el editor
                                // pero nunca se repintaban al guardar.
                                const hashtagsEl = card.querySelector('.com-card-hashtags');
                                if (data.hashtags && data.hashtags.length > 0) {
                                    const newHashtagsHtml = `<div class="com-card-hashtags" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;padding:0 1rem;">
                                        ${data.hashtags.map(h => `<a href="javascript:void(0)" onclick="event.stopPropagation();window.filtrarPorHashtag('${h.replace(/'/g, "\\'")}')"
                                            style="color:#e50914;font-size:0.85rem;font-weight:600;text-decoration:none;">#${_escHtmlEdit(h)}</a>`).join('')}
                                       </div>`;
                                    if (hashtagsEl) {
                                        hashtagsEl.outerHTML = newHashtagsHtml;
                                    } else {
                                        card.querySelector('.com-card-acciones')?.insertAdjacentHTML('beforebegin', newHashtagsHtml);
                                    }
                                } else if (hashtagsEl) {
                                    hashtagsEl.remove();
                                }

                                // Actualizar imágenes si cambiaron
                                const imagenesEl = card.querySelector('.com-card-imagenes');
                                if (data.imageUrls && data.imageUrls.length > 0) {
                                    const newImgHtml = `<div class="com-card-imagenes">${data.imageUrls.map(url =>
                                        `<img src="${url}" alt="imagen" onclick="window.abrirImagenFullscreen('${url}')">`
                                    ).join('')}</div>`;
                                    if (imagenesEl) {
                                        imagenesEl.outerHTML = newImgHtml;
                                    } else {
                                        contenidoEl.insertAdjacentHTML('beforebegin', newImgHtml);
                                    }
                                } else if (imagenesEl) {
                                    imagenesEl.remove();
                                }

                                const tiempoEl = card.querySelector('.com-card-tiempo');
                                if (tiempoEl && !tiempoEl.querySelector('.com-editado')) {
                                    tiempoEl.insertAdjacentHTML('beforeend', ' <span class="com-editado">· editado</span>');
                                }
                            }
                            window.mostrarToast('Publicación editada correctamente.', 'success');
                        } else {
                            mostrarModalErrorPublicar(data.error || data.message || 'No se pudo editar la publicación.');
                        }
                    } catch(e) {
                        mostrarModalErrorPublicar(e.message || 'Error al editar la publicación.');
                    } finally {
                    if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
                }
                return;
            }

            // MODO CREACIÓN
            if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

            try {
                const token = localStorage.getItem('token');
                                const imageUrls = _wf.imageUrls || [];

                                const hashtagsArray = parsearHashtagsInput(_wf.hashtags);

                                const body = {
                                    title: _wf.title.trim(),
                                    hashtags: hashtagsArray,
                                    movieId: _wf.movieId,
                                    movieFichaEnabled: _wf.movieFichaEnabled,
                                    countdownEnabled: _wf.countdownEnabled,
                                    countdownCountryCode: _wf.countdownCountryCode,
                                    votacionEnabled: _wf.votacionEnabled,
                                    opciones: (_wf.votacionOpciones || []).map(o => ({ texto: o.texto, movieId: o.movieId })),
                                    votacionDuracionMinutos: _wf.votacionDuracionMinutos,
                                    rankingEnabled: _wf.rankingEnabled,
                                    rankingFormato: _wf.rankingFormato,
                                    rankingModoTexto: _wf.rankingModoTexto,
                                    rankingItems: (_wf.rankingItems || []).map(i => ({ movieId: i.movieId, texto: i.texto })),
                                    triviaEnabled: _wf.triviaEnabled,
                                    triviaTipo: _wf.triviaTipo,
                                    triviaReferenciaTipo: _wf.triviaReferenciaTipo,
                                    triviaReferenciaId: _wf.triviaReferenciaId,
                                    triviaOpciones: (_wf.triviaOpciones || []).map(o => ({ texto: o.texto, esCorrecta: o.esCorrecta })),
                                    triviaDuracionMinutos: _wf.triviaDuracionMinutos,
                                    trailerEnabled: _wf.trailerEnabled,
                                    trailerYoutubeKey: _wf.trailerYoutubeKey,
                                    territoryGroup: _wf.territory,
                    territorySub: _wf.sub,
                    tone: _wf.tone,
                    content: _wf.content.trim(),
                    spoiler: _wf.tone === 'SPOILER',
                    imageUrls: imageUrls,
                    videoUid: _wf.videoUid || null
                };

                const res = await fetch(`${window._comunidadApiUrl}/publications`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || err.message || 'Error al publicar');
                }

                const pubCreada = await res.json().catch(() => ({}));

                window.cerrarWorkflow();
                if (window._tabActivo === 'comunidad' && typeof window.initComunidad === 'function') {
                    window.initComunidad();
                }

                if (_wf.videoUid) {
                                    mostrarToastProcesandoVideo();
                                } else {
                                    // Si ya confirmó de antemano que no sumaría puntos, no
                                    // repetimos la misma info en un segundo toast — solo éxito.
                                    mostrarToastPublicacion(_wf._confirmoSinPuntos ? -1 : pubCreada.pointsAwarded, pubCreada.moderationStatus);
                                    mostrarPuntosGanados(pubCreada.pointsAwarded);
                                }

            } catch(e) {
                mostrarModalErrorPublicar(e.message || 'Ocurrió un error al publicar. Intentá de nuevo.');
                if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
            }
        };

    window.cerrarWorkflow = function() {
            const overlay = document.getElementById('wfOverlay');
            if (overlay) overlay.remove();
            document.body.classList.remove('modal-open');
            // Defensivo: limpia cualquier resabio de estilo inline que haya podido
            // quedar pegado de una versión anterior de este modal (o de algún otro
            // código que toque overflow directo) — un inline style pisa la clase CSS.
            document.body.style.overflow = '';
        };

    function actualizarUICarrusel(el, index, total) {
            const contador = document.getElementById(`${el.id}-contador`);
            if (contador) contador.textContent = `${index + 1}/${total}`;

            const wrap = el.closest('.com-card-imagenes-wrap');
            if (wrap) {
                const flechaIzq = wrap.querySelector('.com-carrusel-flecha.izq');
                const flechaDer = wrap.querySelector('.com-carrusel-flecha.der');
                if (flechaIzq) flechaIzq.disabled = index === 0;
                if (flechaDer) flechaDer.disabled = index === total - 1;
            }
        }

        window.actualizarContadorCarrusel = function(el) {
            const total = el.querySelectorAll('img').length;
            const index = Math.max(0, Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
            el.dataset.index = index; // mantenemos sincronizado el índice también con el drag manual (mobile)
            actualizarUICarrusel(el, index, total);
        };

        window.moverCarrusel = function(carruselId, direccion) {
            const el = document.getElementById(carruselId);
            if (!el) return;
            const total = el.querySelectorAll('img').length;
            // Índice absoluto, no relativo — evita el desvío acumulado de scrollBy
            let index = parseInt(el.dataset.index || '0', 10);
            index = Math.max(0, Math.min(total - 1, index + direccion));
            el.dataset.index = index;
            el.scrollLeft = index * el.clientWidth; // más confiable que scrollTo() combinado con scroll-snap
            actualizarUICarrusel(el, index, total); // actualizamos ya, sin esperar el evento scroll
        };

    function mostrarToastPublicacion(pointsAwarded, moderationStatus) {
            const isPremium = localStorage.getItem('userPremium') === 'true';
            const isCreator = localStorage.getItem('userCreator') === 'true';

            let mensaje = '✅ ¡Publicación creada!';
            let duracion = 3000;

            // Si quedó pendiente de revisión (riesgo detectado, o cuenta
            // nueva dentro del control obligatorio de sus primeras 3 con
            // imagen/video), no corresponde decir "creada" a secas — el
            // usuario todavía no la puede ver publicada en Comunidad.
            if (moderationStatus === 'PENDING_REVIEW') {
                mensaje = '🕓 Tu publicación quedó en revisión. En breve te avisaremos el resultado.';
                duracion = 5000;
            } else if (pointsAwarded === 0) { // -1 significa "ya se avisó antes de publicar", no repetir
                if (isPremium) {
                                    mensaje = '✅ Publicación creada — agotaste tus publicaciones con puntos hoy. Podés seguir publicando, pero sin generar puntos. Tu cupo se restablece a las 00 hs.';
                                } else {
                                    mensaje = '✅ Publicación creada — ya usaste tu publicación con puntos de hoy. Podés seguir publicando, pero sin generar puntos hasta las 00 hs. Pasate a Premium para sumar hasta 10 por día.';
                                }
            duracion = 5000;
        }

            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#324C89;color:white;padding:12px 24px;border-radius:99px;font-size:0.88rem;font-weight:600;z-index:999999;box-shadow:0 4px 16px rgba(0,0,0,0.2);max-width:90vw;text-align:center;';
            toast.textContent = mensaje;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), duracion);
        }

        function mostrarToastProcesandoVideo() {
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#324C89;color:white;padding:12px 24px;border-radius:99px;font-size:0.88rem;font-weight:600;z-index:999999;box-shadow:0 4px 16px rgba(0,0,0,0.2);max-width:90vw;text-align:center;';
                toast.textContent = '🎬 Estamos procesando tu publicación, en breve te informamos.';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 5000);
            }

    window.reportarPublicacion = function(pubId) {
            const motivos = [
                { value: 'OFFENSIVE', label: 'Lenguaje ofensivo' },
                { value: 'SPAM', label: 'Spam' },
                { value: 'INAPPROPRIATE', label: 'Contenido inapropiado' },
                { value: 'OTHER', label: 'Otro' }
            ];

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

            overlay.innerHTML = `
                <div style="background:white;border-radius:16px;padding:1.5rem;max-width:400px;width:100%;" onclick="event.stopPropagation()">
                    <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;"><i class="fas fa-flag" style="color:#e50914;"></i> Reportar publicación</h3>
                    <p style="color:#888;font-size:0.85rem;margin-bottom:1rem;">¿Por qué querés reportar esta publicación?</p>
                    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;">
                        ${motivos.map(m => `
                            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.9rem;border:1.5px solid #e0e0e0;border-radius:8px;cursor:pointer;font-size:0.88rem;">
                                <input type="radio" name="reportReason" value="${m.value}" style="accent-color:#e50914;"> ${m.label}
                            </label>`).join('')}
                    </div>
                    <textarea id="reportDescPub" placeholder="Descripción adicional (opcional)..." maxlength="500"
                              style="width:100%;padding:0.75rem;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;resize:none;height:70px;box-sizing:border-box;font-family:inherit;margin-bottom:1rem;"></textarea>
                    <div style="display:flex;gap:0.75rem;">
                        <button onclick="this.closest('div[style]').parentElement.remove()"
                                style="flex:1;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                            Cancelar
                        </button>
                        <button id="btnEnviarReportePub"
                                style="flex:2;padding:0.7rem;background:#e50914;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                            Enviar reporte
                        </button>
                    </div>
                </div>`;

            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

            document.getElementById('btnEnviarReportePub').addEventListener('click', async () => {
                const reason = overlay.querySelector('input[name="reportReason"]:checked')?.value;
                if (!reason) { alert('Seleccioná un motivo.'); return; }
                const description = document.getElementById('reportDescPub').value;

                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/report`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason, description })
                    });
                    overlay.remove();
                    if (res.ok) {
                        window.mostrarToast('Reporte enviado. Gracias por ayudarnos a mantener la comunidad.', 'success');
                    } else {
                        const errData = await res.json().catch(() => ({}));
                            if (res.status === 409 || errData?.error?.includes('Ya reportaste')) {
                            window.mostrarToast('Esta publicación ya la reportaste y pronto será revisada. Gracias.', 'info');
                        } else {
                            window.mostrarToast('No se pudo enviar el reporte.', 'error');
                        }
                    }
                } catch(e) { window.mostrarToast('Error al enviar el reporte.', 'error'); }
            });
        };

        async function cargarMisReacciones(pubId) {
            try {
                const token = localStorage.getItem('token');

                // Cargar contadores, estado propio y conteo de comentarios en paralelo
                const [reacRes, bancoRes, comentRes] = await Promise.all([
                    fetch(`${window._comunidadApiUrl}/publications/${pubId}/my-reactions`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${window._comunidadApiUrl}/publications/${pubId}/reactions/count`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${window._comunidadApiUrl}/publications/${pubId}/comments/count`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                // Actualizar contadores de reacciones
                if (bancoRes.ok) {
                    const counts = await bancoRes.json();
                    const bancoCount = document.getElementById(`bancoCount-${pubId}`);
                    if (bancoCount) bancoCount.textContent = counts.banco || 0;
                }

                // Actualizar contador de comentarios
                if (comentRes.ok) {
                    const dataC = await comentRes.json();
                    const countEl = document.getElementById(`comentCount-${pubId}`);
                    if (countEl && dataC.count > 0) countEl.textContent = dataC.count;
                }

                // Actualizar estado propio
                if (reacRes.ok) {
                    const data = await reacRes.json();
                    if (data.banco) {
                        const btn = document.getElementById(`btnBanco-${pubId}`);
                        if (btn) btn.classList.add('com-accion-active');
                    }
                    if (data.punto) {
                        const btn = document.getElementById(`btnPunto-${pubId}`);
                        if (btn) {
                            btn.classList.add('com-accion-active');
                            btn.dataset.active = 'true';
                        }
                    }
                }
            } catch(e) {}
        }