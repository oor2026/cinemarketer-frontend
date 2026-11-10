// =====================================================================================================================
// header-nav.js — Header mobile en dos niveles
//
//   Nivel 1 (siempre visible): menú, logo, PUNTOS DISPONIBLES y campanita.
//   Nivel 2 (la "extensión", #navExt): pastillas Películas / Series / Comunidad. Se muestra solo en Inicio y Comunidad
//   (lo decide el CSS con la clase modulo-* del body), se oculta al bajar y vuelve al subir.
//
// Este archivo hace cuatro cosas:
//   1. Pastillas: cambian el contenido del feed por el mismo camino que ya usaba el switch del feed (seleccionarTabFeed)
//      y llevan a Comunidad. Su estado "activa" se sincroniza solo, venga el cambio de donde venga.
//   2. Puntos: muestra availablePoints (los DISPONIBLES; nunca accumulatedPoints) de GET /users/me/points/resumen. Se
//      refresca al cambiar de módulo, al volver a la app y después de cualquier acción que escriba en la API.
//   3. Scroll: oculta y muestra SOLO la extensión (antes main.js ocultaba el header entero).
//   4. window._alturaHeaderMobile(): alto del nivel 1, para los scrollTo que dejan un margen bajo el header.
//
// Va después de feed-films.js y main.js. En escritorio no hace nada visible: la extensión y los puntos se ocultan por CSS.
// =====================================================================================================================
(function () {
    'use strict';
    if (window._headerNav) return;

    const MODULOS_CON_EXTENSION = ['feed-films', 'comunidad'];   // tiene que coincidir con el CSS (body.modulo-...)
    const TOPE_SCROLL = 60;          // por encima de esto la extensión siempre se ve
    const DELTA_MIN = 8;             // px de scroll para cambiar de estado (evita que parpadee con el pulso del dedo)
    const REFRESCO_MIN = 2500;       // ms mínimos entre dos pedidos de puntos
    const REFRESCO_DEBOUNCE = 900;   // ms que se espera después de una escritura en la API antes de pedir los puntos

    const esMobile = () => window.innerWidth <= 768;
    const navbar = () => document.querySelector('.navbar');
    const moduloActual = () => { const m = /(?:^|\s)modulo-([\w-]+)/.exec(document.body.className); return m ? m[1] : ''; };
    const conExtension = () => esMobile() && MODULOS_CON_EXTENSION.indexOf(moduloActual()) !== -1;

    // ---------------------------------------------------------------------------------------------- 1) Pastillas
    function pastillaActiva() {
        // En pleno pasaje entre feeds la pastilla ya marca a dónde vas (no el estado intermedio por el que pasa la carga).
        const enCurso = window._feedNav && window._feedNav.destinoEnCurso && window._feedNav.destinoEnCurso();
        if (enCurso) return enCurso;
        const modulo = moduloActual();
        if (modulo === 'comunidad') return 'comunidad';
        if (modulo !== 'feed-films') return null;
        if (window._tabActivo === 'comunidad') return 'comunidad';   // la pestaña vieja de Comunidad dentro del feed
        return window._tabActivo === 'series' ? 'series' : 'peliculas';
    }

    function sincronizarPastillas() {
        const activa = pastillaActiva();
        document.querySelectorAll('#navExt .nav-pastilla').forEach(b => {
            const es = b.dataset.pastilla === activa;
            b.classList.toggle('activa', es);
            if (es) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
    }

    function irA(pastilla) {
        // El pasaje entre feeds lo coordina feed-nav.js (cortina de carga, un solo destino, sin pasos intermedios).
        if (window._feedNav && window._feedNav.irA(pastilla) !== false) { sincronizarPastillas(); return; }
        if (pastilla === 'comunidad') {
            if (moduloActual() !== 'comunidad') window.location.hash = '#comunidad'; else window.scrollTo(0, 0);
            return;
        }
        // Películas / Series estando en el feed: el mismo camino que el switch de siempre.
        if (moduloActual() === 'feed-films' && typeof window.cambiarSwitchTipoInicio === 'function') {
            const cambia = window._tabActivo !== pastilla;
            window.cambiarSwitchTipoInicio(pastilla, null);
            if (cambia) window.scrollTo(0, 0);
            return;
        }
        // Viniendo de otro módulo (Comunidad): se carga el feed y arranca en la pestaña pedida (ver
        // inicializarSwitchTipoInicio en bottom-nav.js, que lee esta marca una sola vez).
        window._tabInicioPendiente = pastilla;
        if (typeof window.loadModule === 'function') window.loadModule('feed-films'); else window.location.hash = '#feed-films';
    }

    // Cualquier cambio de pestaña del feed, venga de donde venga (pastilla, deep link, otro módulo), deja las pastillas al día.
    function envolverSeleccionarTab() {
        const original = window.seleccionarTabFeed;
        if (typeof original !== 'function' || original._envueltaPastillas) return;
        const envuelta = function () { const r = original.apply(this, arguments); sincronizarPastillas(); return r; };
        Object.keys(original).forEach(k => { envuelta[k] = original[k]; });   // conserva marcas de otras envolturas
        envuelta._envueltaPastillas = true;
        window.seleccionarTabFeed = envuelta;
    }

    // -------------------------------------------------------------------------------------- 2) Puntos disponibles
    let ultimoPedido = 0, secuencia = 0, temporizador = null;

    // Hasta 999 exacto; desde 1000 compacto y redondeado hacia abajo (1,2k / 12k / 125k / 1,2M): nunca más de 4 caracteres, para
    // que el chip no llegue al logo. Redondear hacia abajo es a propósito: no se muestran puntos de más. El valor exacto queda
    // en el título y en el aria-label.
    function formatear(n) {
        n = Math.floor(n);
        if (n < 1000) return String(n);
        const con = (decimas, sufijo) => (decimas % 10 === 0 ? String(decimas / 10) : String(decimas / 10).replace('.', ',')) + sufijo;
        if (n < 10000) return con(Math.floor(n / 100), 'k');
        if (n < 1000000) return Math.floor(n / 1000) + 'k';
        if (n < 10000000) return con(Math.floor(n / 100000), 'M');
        return Math.floor(n / 1000000) + 'M';
    }

    // El chip nunca debe pisar el logo, sea cual sea el ancho de pantalla, el número o el ancho real del logo: se mide contra él.
    // Si con la moneda no entra, se la saca; si todavía no entra, se achica la letra (clases sin-moneda y letra-chica).
    function ajustarChip() {
        const chip = document.getElementById('dashPuntosMobile'), logo = document.querySelector('.navbar .logo-img');
        if (!chip || !logo || !esMobile()) return;
        chip.classList.remove('sin-moneda', 'letra-chica');
        const pisa = () => chip.getBoundingClientRect().left < logo.getBoundingClientRect().right + 2;
        if (pisa()) chip.classList.add('sin-moneda');
        if (pisa()) chip.classList.add('letra-chica');
    }

    // Mis Mensajes (header mobile): el ícono del header espeja el globito del ítem del menú (#bellBadge), que lo sigue actualizando
    // quien lo actualizaba (ese ítem queda en el HTML: escritorio lo usa). Se observa el <li> entero, por si el globito se vuelve a crear.
    function espejarMensajes() {
        const li = document.querySelector('#dashNavMenu .nav-desk-mensajes'), destino = document.getElementById('mensajesBadgeMobile'), boton = document.getElementById('dashMensajesMobile');
        if (!li || !destino || !boton) return;
        const copiar = () => {
            const origen = document.getElementById('bellBadge');
            const hay = !!origen && getComputedStyle(origen).display !== 'none' && origen.textContent.trim() !== '' && origen.textContent.trim() !== '0';
            destino.textContent = hay ? origen.textContent.trim() : '0';
            destino.style.display = hay ? 'flex' : 'none';
            boton.setAttribute('aria-label', hay ? 'Mis Mensajes: ' + origen.textContent.trim() + ' sin leer' : 'Mis Mensajes');
        };
        copiar();
        new MutationObserver(copiar).observe(li, { attributes: true, childList: true, characterData: true, subtree: true });
    }

    function pintarPuntos(n) {
        const valor = document.getElementById('dashPuntosValor'), boton = document.getElementById('dashPuntosMobile');
        if (!valor || !boton || typeof n !== 'number' || !isFinite(n)) return;
        valor.textContent = formatear(n);
        const texto = 'Tus puntos disponibles: ' + n.toLocaleString('es-AR');
        boton.title = texto; boton.setAttribute('aria-label', texto);
        ajustarChip();
    }

    window.actualizarPuntosHeader = async function () {
        const token = localStorage.getItem('token');
        if (!token || typeof CONFIG === 'undefined') return;
        ultimoPedido = Date.now();
        const mio = ++secuencia;   // si llegan dos respuestas, vale la del último pedido
        try {
            const res = await fetch(`${CONFIG.API_URL}/users/me/points/resumen`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok || mio !== secuencia) return;
            const datos = await res.json();
            if (mio === secuencia) pintarPuntos(Number(datos.availablePoints));   // DISPONIBLES, no accumulatedPoints
        } catch (e) { /* se queda con el último valor mostrado */ }
    };

    function programarRefresco() {
        clearTimeout(temporizador);
        const espera = Math.max(REFRESCO_DEBOUNCE, REFRESCO_MIN - (Date.now() - ultimoPedido));
        temporizador = setTimeout(window.actualizarPuntosHeader, espera);
    }

    // Votar, comentar, canjear... ahora puede cambiar los puntos: después de cualquier escritura exitosa en la API se vuelve a
    // pedir el resumen. Solo observa (la respuesta de cada pedido llega a quien la pidió, sin tocar).
    function observarEscrituras() {
        if (window.fetch._observaEscrituras) return;
        const original = window.fetch;
        const envuelta = function (entrada, opciones) {
            const promesa = original.apply(this, arguments);
            try {
                const url = typeof entrada === 'string' ? entrada : ((entrada && entrada.url) || '');
                const metodo = String((opciones && opciones.method) || (entrada && entrada.method) || 'GET').toUpperCase();
                if (metodo !== 'GET' && metodo !== 'HEAD' && typeof CONFIG !== 'undefined' && url.indexOf(CONFIG.API_URL) === 0) {
                    promesa.then(r => { if (r && r.ok) programarRefresco(); }, () => {});
                }
            } catch (e) { /* observar nunca debe romper un pedido */ }
            return promesa;
        };
        envuelta._observaEscrituras = true;
        window.fetch = envuelta;
    }

    // ----------------------------------------------------------------------- 3) Scroll: se oculta solo la extensión
    let ultimoY = 0, oculta = false, esperando = false;

    function fijarOculta(valor) {
        if (valor === oculta) return;
        oculta = valor;
        const nb = navbar();
        if (nb) nb.classList.toggle('nav-ext-oculta', valor);
    }

    function reiniciarScroll() { fijarOculta(false); ultimoY = Math.max(0, window.scrollY); }

    function alScrollear() {
        if (esperando) return;
        esperando = true;
        requestAnimationFrame(() => {
            esperando = false;
            const y = Math.max(0, window.scrollY);   // en iOS el rebote deja valores negativos
            if (!conExtension() || y <= TOPE_SCROLL) { fijarOculta(false); ultimoY = y; return; }
            const delta = y - ultimoY;
            if (delta >= DELTA_MIN) { fijarOculta(true); ultimoY = y; }          // bajando: se oculta
            else if (delta <= -DELTA_MIN) { fijarOculta(false); ultimoY = y; }   // subiendo: vuelve
        });
    }

    // ---------------------------------------------------------------------------------------------------- 4) Altura
    // Alto del nivel 1 (la extensión está montada encima del contenido y no suma). 0 en escritorio.
    window._alturaHeaderMobile = function () {
        const nb = navbar();
        return nb && esMobile() ? Math.round(nb.getBoundingClientRect().height) : 0;
    };

    // ------------------------------------------------------------------------------------------------------ Arranque
    function iniciar() {
        const ext = document.getElementById('navExt');
        if (ext) ext.addEventListener('click', e => { const b = e.target.closest('.nav-pastilla'); if (b) irA(b.dataset.pastilla); });

        envolverSeleccionarTab();
        observarEscrituras();
        sincronizarPastillas();
        espejarMensajes();
        window.actualizarPuntosHeader();

        window.addEventListener('scroll', alScrollear, { passive: true });
        window.addEventListener('resize', () => { reiniciarScroll(); ajustarChip(); });
        const logo = document.querySelector('.navbar .logo-img');
        if (logo && !logo.complete) logo.addEventListener('load', ajustarChip);   // hasta que carga, su ancho no se conoce
        document.addEventListener('visibilitychange', () => { if (!document.hidden) programarRefresco(); });

        // El cargador de módulos cambia la clase modulo-* del body en cada carga: ahí se reinicia el scroll, se actualizan
        // las pastillas y se refrescan los puntos.
        let ultimoModulo = moduloActual();
        new MutationObserver(() => {
            const modulo = moduloActual();
            if (modulo === ultimoModulo) return;
            ultimoModulo = modulo;
            reiniciarScroll(); sincronizarPastillas(); programarRefresco();
        }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    window._headerNav = { irA, sincronizarPastillas, _formatear: formatear, _moduloActual: moduloActual };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
