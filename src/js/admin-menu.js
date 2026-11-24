// ==============================================
// admin-menu.js — Cajón del sidebar en mobile
// ==============================================
(function () {
    const body    = document.body;
    const boton   = document.getElementById('adminMenuToggle');
    const fondo   = document.getElementById('adminSidebarBackdrop');
    const sidebar = document.querySelector('.admin-sidebar');
    if (!boton || !sidebar) return;

    const mobile = window.matchMedia('(max-width: 768px)');

    function abrir() {
        body.classList.add('admin-menu-abierto');
        boton.setAttribute('aria-expanded', 'true');
    }

    function cerrar() {
        body.classList.remove('admin-menu-abierto');
        boton.setAttribute('aria-expanded', 'false');
    }

    boton.addEventListener('click', () => {
        body.classList.contains('admin-menu-abierto') ? cerrar() : abrir();
    });

    if (fondo) fondo.addEventListener('click', cerrar);

    // Al elegir una sección en mobile: cerrar el cajón y subir al inicio
    sidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.sidebar-item');
        if (!item || item.classList.contains('disabled') || !mobile.matches) return;
        cerrar();
        window.scrollTo(0, 0);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrar();
    });

    // Si se agranda la ventana a desktop, el cajón no queda "abierto"
    mobile.addEventListener('change', (e) => {
        if (!e.matches) cerrar();
    });
})();
