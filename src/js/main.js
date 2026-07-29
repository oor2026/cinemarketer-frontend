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

    window.addEventListener('scroll', function() {
        if (window.innerWidth > 768) {
            if (btnArriba) btnArriba.classList.remove('visible');
            if (btnNuevaPub) btnNuevaPub.classList.remove('visible');
            return;
        }

        const hash = window.location.hash.replace('#', '') || 'feed-films';
        if (hash !== 'feed-films') {
            if (btnArriba) btnArriba.classList.remove('visible');
            if (btnNuevaPub) btnNuevaPub.classList.remove('visible');
            return;
        }

        const enComunidad = window._tabActivo === 'comunidad';
        const scrolleado = window.scrollY > 400;

        const a = crearBotonArriba();
        if (scrolleado) { a.classList.add('visible'); } else { a.classList.remove('visible'); }

        const p = crearBotonNuevaPub();
        if (scrolleado && enComunidad) { p.classList.add('visible'); } else { p.classList.remove('visible'); }
    }, { passive: true });
})();