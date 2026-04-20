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
    });

    // Cerrar al hacer click en cualquier opción
    dashMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            dashMenu.classList.remove('active');
            const icon = dashToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!dashToggle.contains(e.target) && !dashMenu.contains(e.target)) {
            dashMenu.classList.remove('active');
            const icon = dashToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        }
    });
}