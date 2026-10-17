// ============================================================
// HEADER DE ESCRITORIO — menú de la cuenta (avatar + nivel).
// Solo actúa en pantallas de escritorio (desde 769 px, el mismo
// corte que usa dashboard.css). En celular no hace nada: el
// avatar del menú hamburguesa sigue abriendo "Mi progreso".
// ============================================================
(function () {
    var esEscritorio = window.matchMedia('(min-width: 769px)');
    var item = document.querySelector('#dashNavMenu .nav-user-profile');
    var menu = document.getElementById('navCuentaMenu');
    var disparador = item ? item.querySelector('.user-profile-mini') : null;
    if (!item || !menu || !disparador) return;

    function estaAbierto() { return menu.classList.contains('is-open'); }

    function abrir() {
        var novedades = document.getElementById('novedadesDropdown');
        if (novedades) novedades.style.display = 'none';
        menu.classList.add('is-open');
        item.classList.add('is-open');
        disparador.setAttribute('aria-expanded', 'true');
    }

    function cerrar() {
        menu.classList.remove('is-open');
        item.classList.remove('is-open');
        disparador.setAttribute('aria-expanded', 'false');
    }

    // Los atributos de accesibilidad solo aplican en escritorio
    function sincronizar() {
        if (esEscritorio.matches) {
            disparador.setAttribute('role', 'button');
            disparador.setAttribute('tabindex', '0');
            disparador.setAttribute('aria-haspopup', 'true');
            disparador.setAttribute('aria-expanded', estaAbierto() ? 'true' : 'false');
        } else {
            disparador.removeAttribute('role');
            disparador.removeAttribute('tabindex');
            disparador.removeAttribute('aria-haspopup');
            disparador.removeAttribute('aria-expanded');
            cerrar();
        }
    }

    // Se escucha en la fase de captura: en escritorio el clic en el avatar abre este menú
    // y NO ejecuta el onclick original (que abre "Mi progreso", ahora dentro del menú).
    item.addEventListener('click', function (e) {
        if (!esEscritorio.matches) return;
        if (!disparador.contains(e.target)) return;
        e.stopPropagation();
        e.preventDefault();
        if (estaAbierto()) cerrar(); else abrir();
    }, true);

    disparador.addEventListener('keydown', function (e) {
        if (!esEscritorio.matches) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (estaAbierto()) { cerrar(); } else {
                abrir();
                var primero = menu.querySelector('.nav-cuenta-item');
                if (primero) primero.focus();
            }
        }
    });

    menu.addEventListener('click', function (e) {
        if (e.target.closest('.nav-cuenta-item')) cerrar();
    });

    document.addEventListener('click', function (e) {
        if (!item.contains(e.target)) cerrar();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && estaAbierto()) { cerrar(); disparador.focus(); }
    });

    window.addEventListener('hashchange', cerrar);
    if (esEscritorio.addEventListener) esEscritorio.addEventListener('change', sincronizar);
    else if (esEscritorio.addListener) esEscritorio.addListener(sincronizar);
    sincronizar();
})();