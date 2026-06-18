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
