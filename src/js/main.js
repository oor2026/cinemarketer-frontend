// ========== BLOQUEO DE CUENTAS DEMO — toast global ==========
// Envuelve fetch UNA sola vez acá, para que cualquier 403 tipo
// DEMO_ACCOUNT (lo tira DemoAccountWriteBlockFilter del backend)
// dispare el aviso sin importar desde qué botón se originó — así no
// hay que agregar este manejo en cada fetch suelto repartido por
// toda la app.
(function() {
    const fetchOriginal = window.fetch;
    window.fetch = async function(...args) {
        const response = await fetchOriginal.apply(this, args);
        if (response.status === 403) {
            try {
                const data = await response.clone().json();
                if (data && data.error === 'DEMO_ACCOUNT') {
                    mostrarToastDemo(data.message || 'Esta es una cuenta de demostración — no podés interactuar.');
                }
            } catch (e) {}
        }
        return response;
    };

    function mostrarToastDemo(mensaje) {
        let toastEl = document.getElementById('toastDemoAccount');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'toastDemoAccount';
            toastEl.style.cssText = 'position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%) translateY(20px); background:#1a1a1a; color:#fff; padding:0.9rem 1.4rem; border-radius:10px; font-size:0.88rem; font-weight:600; box-shadow:0 8px 24px rgba(0,0,0,0.3); z-index:999999; opacity:0; transition:opacity 0.25s ease, transform 0.25s ease; max-width:90vw; text-align:center;';
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = `<i class="fas fa-flask" style="margin-right:0.5rem;"></i>${mensaje}`;
        requestAnimationFrame(() => {
            toastEl.style.opacity = '1';
            toastEl.style.transform = 'translateX(-50%) translateY(0)';
        });
        clearTimeout(toastEl._timeout);
        toastEl._timeout = setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateX(-50%) translateY(20px)';
        }, 3500);
    }
})();

// ========== MENÚ HAMBURGUESA ==========
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');

if (menuToggle && navMenu) {
    
    // Abrir/cerrar al hacer click en hamburguesa
    menuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        // Cambiar ícono entre barras y X
        const icon = menuToggle.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

    // Cerrar al hacer click en cualquier link del menú
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });

    // Cerrar al hacer click fuera del menú
    document.addEventListener('click', function(e) {
        if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        }
    });
}

// ========== MENÚ HAMBURGUESA DASHBOARD ==========
const dashToggle = document.getElementById('dashMenuToggle');
const dashMenu = document.getElementById('dashNavMenu');

if (dashToggle && dashMenu) {
    dashToggle.addEventListener('click', function() {
        dashMenu.classList.toggle('active');
        const icon = dashToggle.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
        document.body.classList.toggle('menu-open', dashMenu.classList.contains('active'));
            });

            // Cerrar al hacer click en cualquier opción
            dashMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function() {
                    const esMobile = window.innerWidth <= 768;
                    const esNovedades = link.getAttribute('onclick') && link.getAttribute('onclick').includes('toggleNovedades');
                    if (esMobile && esNovedades) return;
                    dashMenu.classList.remove('active');
                    const icon = dashToggle.querySelector('i');
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                    document.body.classList.remove('menu-open');
                });
            });

            // Cerrar al hacer click fuera
            document.addEventListener('click', function(e) {
                if (!dashToggle.contains(e.target) && !dashMenu.contains(e.target)) {
                    dashMenu.classList.remove('active');
                    const icon = dashToggle.querySelector('i');
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                    document.body.classList.remove('menu-open');
                }
            });
}

// ── Hide/show navbar on scroll (solo mobile y solo en feed-films) ──
(function() {
    let lastScrollY = 0;
    let ticking = false;

    // Si el navbar quedó oculto por scroll dentro del feed y el usuario
    // navega a otro módulo (por ejemplo, un perfil público) sin volver a
    // scrollear en el feed antes, la clase navbar-hidden se quedaba pegada
    // para siempre — porque la única lógica que la saca vive adentro del
    // scroll handler, que corta apenas el hash deja de ser feed-films.
    // Por eso hay que restaurarlo explícitamente al cambiar de módulo.
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.replace('#', '') || 'feed-films';
        if (hash !== 'feed-films') {
            const navbar = document.querySelector('.navbar');
            if (navbar) navbar.classList.remove('navbar-hidden');
        }
    });

    window.addEventListener('scroll', function() {
        if (window.innerWidth > 768) return;

        const hash = window.location.hash.replace('#', '') || 'feed-films';
        if (hash !== 'feed-films') return;

        const currentScrollY = window.scrollY;

        if (!ticking) {
            requestAnimationFrame(function() {
                const navbar = document.querySelector('.navbar');
                if (!navbar) { ticking = false; return; }

                if (currentScrollY > lastScrollY && currentScrollY > 60) {
                    // Scroll hacia abajo — ocultar
                    navbar.classList.add('navbar-hidden');
                } else {
                    // Scroll hacia arriba — mostrar
                    navbar.classList.remove('navbar-hidden');
                }

                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
})();

// ── Botones flotantes "Volver arriba" + "Nueva publicación" (solo mobile) ──
(function() {
    let btnArriba = null;
    let btnNuevaPub = null;

    function crearBotonArriba() {
        if (btnArriba) return btnArriba;
        btnArriba = document.createElement('button');
        btnArriba.id = 'btnVolverArriba';
        btnArriba.setAttribute('aria-label', 'Volver arriba');
        btnArriba.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btnArriba.onclick = function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        document.body.appendChild(btnArriba);
        return btnArriba;
    }

        function crearBotonNuevaPub() {
            if (btnNuevaPub) return btnNuevaPub;
            btnNuevaPub = document.createElement('button');
            btnNuevaPub.id = 'btnNuevaPubFlotante';
            btnNuevaPub.setAttribute('aria-label', 'Crear publicación');
            btnNuevaPub.innerHTML = '<i class="fas fa-plus"></i>';
            btnNuevaPub.onclick = function() {
                if (typeof window.abrirWorkflowPublicacion === 'function') {
                    window.abrirWorkflowPublicacion();
                }
            };
            document.body.appendChild(btnNuevaPub);
            return btnNuevaPub;
        }

                let btnBuscar = null;
                function crearBotonBuscar() {
                    if (btnBuscar) return btnBuscar;
                    btnBuscar = document.createElement('button');
                    btnBuscar.id = 'btnBuscarFlotante';
                    btnBuscar.setAttribute('aria-label', 'Buscar');
                    btnBuscar.innerHTML = `
                        <i class="fas fa-search"></i>
                        <span class="buscador-vineta-mobile" id="buscadorVinetaMobile">
                            <span class="buscador-vineta-mobile-inner"><p>¿Necesitás de mi ayuda?</p></span>
                        </span>
                    `;
                    btnBuscar.onclick = function() {
                        if (typeof window.abrirBuscadorAsistido === 'function') {
                            window.abrirBuscadorAsistido();
                        }
                    };
                    document.body.appendChild(btnBuscar);
                    return btnBuscar;
                }

                // Viñeta del botón de buscar — mismo patrón que la de trivia,
                // solo mobile. Valores de partida (5s visible / cada 60s),
                // a afinar después.
                let buscadorVinetaInterval = null;
                function buscadorMostrarVineta() {
                    console.log('[vineta-buscador] tick', { innerWidth: window.innerWidth, btnBuscarExiste: !!btnBuscar, esVisible: btnBuscar && btnBuscar.classList.contains('visible') });
                    if (window.innerWidth > 768) return;
                    if (!btnBuscar || !btnBuscar.classList.contains('visible')) return;
                    const vineta = document.getElementById('buscadorVinetaMobile');
                    if (!vineta) { console.log('[vineta-buscador] no se encontró #buscadorVinetaMobile en el DOM'); return; }
                    vineta.classList.add('visible');
                    console.log('[vineta-buscador] mostrada');
                    setTimeout(() => vineta.classList.remove('visible'), 3000);
                }
                function buscadorIniciarVinetaPeriodica() {
                    console.log('[vineta-buscador] iniciarPeriodica llamado, interval actual:', buscadorVinetaInterval);
                    if (buscadorVinetaInterval) return;
                    buscadorMostrarVineta();
                    buscadorVinetaInterval = setInterval(buscadorMostrarVineta, 9000);
                    console.log('[vineta-buscador] interval arrancado:', buscadorVinetaInterval);
                }
                function buscadorDetenerVinetaPeriodica() {
                    if (buscadorVinetaInterval) {
                        clearInterval(buscadorVinetaInterval);
                        buscadorVinetaInterval = null;
                    }
                    const vineta = document.getElementById('buscadorVinetaMobile');
                    if (vineta) vineta.classList.remove('visible');
                }

                window.addEventListener('scroll', function() {
                    if (window.innerWidth > 768) {
                        if (btnArriba) btnArriba.classList.remove('visible');
                        if (btnNuevaPub) btnNuevaPub.classList.remove('visible');
                        if (btnBuscar) btnBuscar.classList.remove('visible');
                        buscadorDetenerVinetaPeriodica();
                        return;
                    }

                    const hash = window.location.hash.replace('#', '') || 'feed-films';
                    if (hash !== 'feed-films') {
                        if (btnArriba) btnArriba.classList.remove('visible');
                        if (btnNuevaPub) btnNuevaPub.classList.remove('visible');
                        if (btnBuscar) btnBuscar.classList.remove('visible');
                        buscadorDetenerVinetaPeriodica();
                        return;
                    }

                    const enComunidad = window._tabActivo === 'comunidad';
                    const scrolleado = window.scrollY > 400;

                    const a = crearBotonArriba();
                    if (scrolleado) { a.classList.add('visible'); } else { a.classList.remove('visible'); }

                    const p = crearBotonNuevaPub();
                    if (scrolleado && enComunidad) { p.classList.add('visible'); } else { p.classList.remove('visible'); }

                    const b = crearBotonBuscar();
                    if (scrolleado && !enComunidad) {
                        b.classList.add('visible');
                        buscadorIniciarVinetaPeriodica();
                    } else {
                        b.classList.remove('visible');
                        // Ojo: acá NO se corta el intervalo. En mobile el
                        // scroll a veces "rebota" y hace que scrollY baje
                        // de 400 por un instante — si cortábamos el
                        // intervalo ahí, dependía de que sigas generando
                        // eventos de scroll para que se vuelva a armar, y
                        // si te quedabas quieto después de ese rebote, la
                        // viñeta no volvía a aparecer nunca más. El propio
                        // buscadorMostrarVineta() ya chequea si el botón
                                                // está visible antes de mostrar nada, así que ese
                                                // chequeo alcanza como resguardo.
                                            }
                                        }, { passive: true });
                                    })();

                        // ========== MODAL DE PROGRESO — ícono nuevo del header ==========
                        // Copia del modal que hoy vive en Configuración (mi-cuenta.js/html),
                        // pero acá global — funciona desde cualquier módulo. Nombres propios
                        // para no chocar con la copia vieja mientras conviven las dos; esa
                        // copia se saca de Configuración en un paso aparte, después de
                        // confirmar que esta funciona bien.
                        window.abrirModalProgresoHeader = function() {
                            const modal = document.getElementById('modalProgresoHeader');
                            const body  = document.getElementById('modalProgresoHeaderBody');
                            if (!modal || !body) return;

                            const nivel = window._perfilNivel || 'AMATEUR';
                            const profile = window._perfilData || {};

                            body.innerHTML = _renderProgresoBodyHeader(nivel, profile);
                            modal.style.display = 'flex';
                            document.body.classList.add('modal-open');
                        };

                        window.cerrarModalProgresoHeader = function() {
                            const modal = document.getElementById('modalProgresoHeader');
                            if (modal) modal.style.display = 'none';
                            document.body.classList.remove('modal-open');
                        };

                        function _checkProgresoHeader(cumple) {
                            return cumple
                                ? `<i class="fas fa-check-circle" style="color:#2e7d32;font-size:17px;flex-shrink:0;"></i>`
                                : `<i class="far fa-circle" style="color:#ccc;font-size:17px;flex-shrink:0;"></i>`;
                        }

                        function _itemProgresoHeader(cumple, texto) {
                            const color = cumple ? 'color:#333;' : 'color:#999;';
                            return `<div style="display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:8px;">
                                ${_checkProgresoHeader(cumple)}
                                <span style="${color}">${texto}</span>
                            </div>`;
                        }

                        const _NIVELES_INFO_HEADER = {
                            AMATEUR:        { nombre: 'Amateur',        emoji: '🟢' },
                            COLABORADOR:    { nombre: 'Colaborador',    emoji: '🔵' },
                            CRITICO:        { nombre: 'Crítico',        emoji: '🟣' },
                            JURADO_EXPERTO: { nombre: 'Jurado Experto', emoji: '🏆' },
                        };

                        function _renderProgresoBodyHeader(nivel, p) {
                            const btnAceptar = `<button onclick="window.cerrarModalProgresoHeader()"
                                style="width:100%;background:#324C89;border:none;color:white;padding:0.65rem;border-radius:8px;font-size:14px;cursor:pointer;margin-top:1.25rem;">
                                Aceptar
                            </button>`;

                            if (nivel === 'JURADO_EXPERTO') {
                                return `
                                    <div style="text-align:center;padding:0.5rem 0;">
                                        <div style="font-size:36px;margin-bottom:0.75rem;">🏆</div>
                                        <div style="font-size:17px;font-weight:600;color:#333;margin-bottom:0.5rem;">¡Sos Jurado Experto!</div>
                                        <div style="font-size:13px;color:#888;line-height:1.6;margin-bottom:0.5rem;">
                                            Alcanzaste el nivel más alto de Cinemarketer. Tu dedicación y pasión por el cine te llevaron hasta acá. ¡Seguí siendo parte de nuestra comunidad!
                                        </div>
                                    </div>
                                    ${btnAceptar}`;
                            }

                            const infoActual = _NIVELES_INFO_HEADER[nivel] || _NIVELES_INFO_HEADER.AMATEUR;
                            const encabezado = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid #eee;">
                                <span style="font-size:20px;">${infoActual.emoji}</span>
                                <span style="font-size:15px;color:#333;">Hoy sos <strong>${infoActual.nombre}</strong></span>
                            </div>`;

                            let titulo = '';
                            let emoji  = '';
                            let items  = '';

                            if (nivel === 'AMATEUR') {
                                titulo = 'Colaborador'; emoji = '🔵';
                                const emailOk     = p.emailVerified || !!p.googleId;
                                const perfilOk    = !!(p.name && p.dni && p.phone && p.avatarUrl && p.provincia && p.localidad);
                                const peliculasOk = (p.reviewsCount || 0) >= 100;
                                const comentOk    = (p.commentsUniqueMoviesCount || 0) >= 50;
                                const bioOk       = !!(p.bioTitulo && p.bioTexto);
                                items = _itemProgresoHeader(emailOk,     'Email verificado') +
                                        _itemProgresoHeader(perfilOk,    'Perfil completo al 100%') +
                                        _itemProgresoHeader(peliculasOk, '100 películas únicas votadas') +
                                        _itemProgresoHeader(comentOk,    '50 comentarios en películas distintas') +
                                        _itemProgresoHeader(bioOk,       'Bio completada en Mi Sala');
                            }

                            if (nivel === 'COLABORADOR') {
                                titulo = 'Crítico'; emoji = '🟣';
                                const peliculasOk     = (p.reviewsCount || 0) >= 200;
                                const comentOk        = (p.commentsUniqueMoviesCount || 0) >= 100;
                                const publicacionesOk = (p.publicationsCount || 0) >= 50;
                                const seguidosOk      = (p.usuariosSeguidosCount || 0) >= 25;
                                const diasOk          = (p.diasActivos || 0) >= 60;
                                const recomendOk      = (p.recommendationsCount || 0) >= 30;
                                const teBancoOk       = (p.teBancoRecibidosCount || 0) >= 20;
                                const puntosOk        = (p.totalRedeemedPoints || 0) >= 4000;
                                items = _itemProgresoHeader(peliculasOk,     '200 películas únicas votadas') +
                                        _itemProgresoHeader(comentOk,        '100 comentarios en películas distintas') +
                                        _itemProgresoHeader(publicacionesOk, '50 publicaciones en Comunidad') +
                                        _itemProgresoHeader(seguidosOk,      '25 usuarios seguidos') +
                                        _itemProgresoHeader(diasOk,          '60 días activos en la plataforma') +
                                        _itemProgresoHeader(recomendOk,      '30 recomendaciones enviadas') +
                                        _itemProgresoHeader(teBancoOk,       '20 "Te banco" de usuarios distintos') +
                                        _itemProgresoHeader(puntosOk,        '4.000 puntos canjeados');
                            }

                            if (nivel === 'CRITICO') {
                                titulo = 'Jurado Experto'; emoji = '🏆';
                                const premiumOk       = !!p.isPremium;
                                const peliculasOk     = (p.reviewsCount || 0) >= 500;
                                const comentOk        = (p.commentsUniqueMoviesCount || 0) >= 300;
                                const publicacionesOk = (p.publicationsCount || 0) >= 200;
                                const seguidosOk      = (p.usuariosSeguidosCount || 0) >= 100;
                                const diasOk          = (p.diasActivos || 0) >= 120;
                                const recomendOk      = (p.recommendationsCount || 0) >= 200;
                                const teBancoOk       = (p.teBancoRecibidosCount || 0) >= 100;
                                const merecePuntoOk   = (p.merecePuntosCount || 0) >= 100;
                                const seguidoresOk    = (p.seguidoresGanadosCount || 0) >= 100;
                                const puntosOk        = (p.totalRedeemedPoints || 0) >= 20000;
                                items = _itemProgresoHeader(premiumOk,       'Suscripción Premium activa') +
                                        _itemProgresoHeader(peliculasOk,     '500 películas únicas votadas') +
                                        _itemProgresoHeader(comentOk,        '300 comentarios en películas distintas') +
                                        _itemProgresoHeader(publicacionesOk, '200 publicaciones en Comunidad') +
                                        _itemProgresoHeader(seguidosOk,      '100 usuarios seguidos') +
                                        _itemProgresoHeader(diasOk,          '120 días activos en la plataforma') +
                                        _itemProgresoHeader(recomendOk,      '200 recomendaciones enviadas') +
                                        _itemProgresoHeader(teBancoOk,       '100 "Te banco" de usuarios distintos') +
                                        _itemProgresoHeader(merecePuntoOk,   '100 "Merecés un punto" recibidos') +
                                        _itemProgresoHeader(seguidoresOk,    '100 seguidores ganados') +
                                        _itemProgresoHeader(puntosOk,        '20.000 puntos canjeados');
                            }

                                return `
                                    ${encabezado}
                                    <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Próximo objetivo</div>
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem;">
                                        <span style="font-size:20px;">${emoji}</span>
                                        <span style="font-size:17px;font-weight:600;color:#333;">${titulo}</span>
                                    </div>
                                    ${items}
                                    ${btnAceptar}`;
                            }