// =====================================================================================================================
// feed-nav.js — Pasaje entre Películas, Series y Comunidad (solo mobile)
//
// Qué resuelve:
//   1. Cada feed se pinta DE UNA VEZ. Al pasar de uno a otro, si el destino todavía no tiene todo lo suyo (carrusel principal,
//      insignias, primera fila con sus tarjetas e imágenes), se muestra una cortina con el mismo "Cargando..." del logotipo y se
//      levanta cuando está completo, en vez de ver aparecer las partes una por una. Si ya está listo (por ejemplo, volver a
//      Películas), no hay cortina: el cambio es instantáneo.
//   2. Un único destino por pasaje. Los pills del header reflejan a dónde vas desde el primer toque, y desde Comunidad se entra
//      directo a Series o a Películas, sin pasar por la otra.
//   3. Los tres feeds son independientes: cada pasaje tiene su número; si pedís otro antes de que termine, el anterior queda
//      viejo y no pinta ni levanta nada.
//   4. Precarga en segundo plano (cuando el feed actual ya está listo) del carrusel de Series y de los archivos de Comunidad.
//
// No toca feed-films.js ni feed-series.js: observa sus funciones de carga y mira el DOM. Si algo no llegara a estar "listo" por
// cualquier motivo (error de red, cambio de marcado), la cortina se levanta sola a los 6 segundos: nunca queda trabada.
// =====================================================================================================================
(function () {
    'use strict';
    if (window._feedNav) return;

    const TOPE_MS = 6000;          // máximo que puede estar la cortina
    const SONDEO_MS = 30;          // cada cuánto se revisa si el destino está listo
    const LOGO_RETRASO_MS = 220;   // la cortina entra de una; el logotipo aparece si la espera se alarga
    const SALIDA_MS = 140;         // fundido de salida

    const FUNCIONES_OBSERVADAS = [
        'cargarPeliculaDestacada', 'cargarVotoRelampago', 'cargarTriviaBadge',
        'cargarSerieDestacada', 'cargarVotoRelampagoSerie', 'cargarTriviaSeriesBadge'
    ];
    const FEEDS = {
        peliculas: { filas: '#filasGeneroContainer', destacada: '#destacadaContainer', tarjeta: '#destacadaCard', funDest: 'cargarPeliculaDestacada',
                     insignias: [['cargarVotoRelampago', '#votoRelampagoContainer'], ['cargarTriviaBadge', '#triviaBadgeContainer']],
                     imagenes: ['#destacadaCard img', '#ordenarPills img', '#filasGeneroContainer .fila-genero:first-child img'] },
        series:    { filas: '#filasSeriesContainer', destacada: '#destacadaContainerSerie', tarjeta: '#destacadaCardSerie', funDest: 'cargarSerieDestacada',
                     insignias: [['cargarVotoRelampagoSerie', '#votoRelampagoSeriesContainer'], ['cargarTriviaSeriesBadge', '#triviaSeriesBadgeContainer']],
                     imagenes: ['#destacadaCardSerie img', '#ordenarPillsSerie img', '#filasSeriesContainer .fila-genero:first-child img'] }
    };

    const esMobile = () => window.innerWidth <= 768;
    const $ = (s) => document.querySelector(s);
    const moduloActual = () => { const m = /(?:^|\s)modulo-([\w-]+)/.exec(document.body.className); return m ? m[1] : ''; };
    const visible = (el) => {
        if (!el) return false;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    };
    // Contador PROPIO de pasajes. No se comparte con el de loadModule (window._navToken): ese solo sube cuando de verdad arranca la carga de
    // un módulo, y si acá lo subiéramos, una carga en curso creería que quedó vieja y se abandonaría.
    let secuencia = 0;
    const siguienteNav = () => ++secuencia;

    const estado = { destino: null, nav: 0, sondeo: null, logo: null, ocultar: null, abierta: false, precargado: false, feedInit: false };
    const vuelo = {};   // cuántas ejecuciones de cada función de carga están en curso

    // ------------------------------------------------------------------------------------------ observar las cargas
    // Envuelve cada función de carga para saber si sigue en curso. Se llama más de una vez: algunas (trivia) se definen en
    // archivos que cargan después de este.
    function instalarObservadores() {
        FUNCIONES_OBSERVADAS.forEach((nombre) => {
            const original = window[nombre];
            if (typeof original !== 'function' || original._observada) return;
            const envuelta = function () {
                vuelo[nombre] = (vuelo[nombre] || 0) + 1;
                let r;
                try { r = original.apply(this, arguments); } catch (e) { vuelo[nombre]--; throw e; }
                return Promise.resolve(r).finally(() => { vuelo[nombre]--; });
            };
            Object.keys(original).forEach((k) => { envuelta[k] = original[k]; });
            envuelta._observada = true;
            window[nombre] = envuelta;
        });
    }

    // ---------------------------------------------------------------------------------------- ¿está listo el destino?
    function imagenesListas(selectores) {
        for (const sel of selectores) {
            for (const im of document.querySelectorAll(sel)) {
                const r = im.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) continue;       // oculta o sin lugar todavía
                // Solo las que están dentro de la primera pantalla, en los dos ejes: las tarjetas de una fila que quedan fuera, a la
                // derecha, son lazy y no cargan hasta que se acercan (esperarlas retendría la cortina hasta el tope).
                if (r.top > window.innerHeight + 50 || r.bottom < 0 || r.left > window.innerWidth || r.right < 0) continue;
                if (!im.complete) return false;
            }
        }
        return true;
    }

    function esqueletoEnVista(contenedor) {
        for (const sk of contenedor.querySelectorAll('.fila-genero-skeleton')) {
            if (visible(sk) && sk.getBoundingClientRect().top < window.innerHeight + 100) return true;
        }
        return false;
    }

    // Devuelve null si el feed está completo, o un texto con lo primero que falta (sirve para diagnosticar).
    function razonFeed(cfg, conImagenes) {
        const filas = $(cfg.filas);
        if (!visible(filas)) return 'filas-ocultas';
        const fila1 = filas.querySelector('.fila-genero');
        if (!fila1) return 'sin-fila-1';
        if (fila1.querySelector('.fila-genero-skeleton')) return 'fila-1-esqueleto';
        if (!fila1.querySelector('.fila-genero-slide, .fila-genero-vacia')) return 'fila-1-sin-tarjetas';     // la primera fila ya con tarjetas (o con su aviso)
        if (esqueletoEnVista(filas)) return 'esqueleto-en-vista';
        // Carrusel principal: se juzga por lo PINTADO, no por la función. Si ya está pintado (desde la caché de sesión) la función sigue
        // revalidando en segundo plano, y eso no se espera. Si no está pintado: se espera mientras la carga siga en curso o el
        // contenedor esté visible sin contenido; si terminó y quedó oculto, es que no hay carrusel.
        const dest = $(cfg.destacada), tarjeta = $(cfg.tarjeta);
        const pintado = visible(dest) && !!tarjeta && tarjeta.children.length > 0;
        if (!pintado && (visible(dest) || (vuelo[cfg.funDest] || 0) > 0)) return 'carrusel';
        // Insignias (trivia, voto relámpago): solo se espera a las que todavía no se mostraron y siguen cargando; así no empujan el
        // contenido cuando aparecen. Una que ya está a la vista y se está refrescando no retiene nada.
        const pendiente = cfg.insignias.find(([fun, sel]) => (vuelo[fun] || 0) > 0 && !visible($(sel)));
        if (pendiente) return 'insignia:' + pendiente[0];
        if (!conImagenes) return null;
        return imagenesListas(cfg.imagenes) ? null : 'imagenes';
    }

    function razonComunidad(conImagenes) {
        const feed = $('#comFeed');
        if (!visible(feed)) return 'feed-oculto';
        if (feed.querySelector('.com-loading')) return 'cargando';
        if (!feed.querySelector('.com-card, .com-vacio')) return 'sin-tarjetas';
        if (!conImagenes) return null;
        return imagenesListas(['#comFeed .com-card:nth-child(-n+3) img']) ? null : 'imagenes';
    }

    // conImagenes: en la comprobación inmediata (antes de mostrar cortina) no cuentan: si la estructura ya está completa el cambio es
    // instantáneo, y las imágenes que ya estén en el caché del navegador aparecen solas. Una vez con cortina sí se espera a las de la primera pantalla.
    function razonNoListo(destino, conImagenes) {
        if (conImagenes === undefined) conImagenes = true;
        if (destino === 'comunidad') return razonComunidad(conImagenes);
        const cfg = FEEDS[destino];
        return cfg ? razonFeed(cfg, conImagenes) : 'destino-desconocido';
    }
    const listo = (destino, conImagenes) => razonNoListo(destino, conImagenes) === null;

    // ---------------------------------------------------------------------------------------------- la cortina
    function crearCortina() {
        let el = document.getElementById('feedNavCargando');
        if (el) return el;
        const estilo = document.createElement('style');
        estilo.id = 'feedNavEstilos';
        estilo.textContent = `
            @keyframes feedNavLatido { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
            #feedNavCargando { position: fixed; left: 0; right: 0; z-index: 900; display: none; background: #fff; opacity: 1; transition: opacity ${SALIDA_MS}ms ease; touch-action: none; }
            #feedNavCargando.fnc-saliendo { opacity: 0; }
            #feedNavCargando .fnc-centro { position: absolute; left: 0; right: 0; top: 24%; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; text-align: center; opacity: 0; transition: opacity 0.2s ease; }
            #feedNavCargando.fnc-con-logo .fnc-centro { opacity: 1; }
            #feedNavCargando img { width: 40px; height: 40px; animation: feedNavLatido 1.1s ease-in-out infinite; }
            #feedNavCargando span { font-size: 0.85rem; color: #999; }`;
        document.head.appendChild(estilo);
        el = document.createElement('div');
        el.id = 'feedNavCargando';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = '<div class="fnc-centro"><img src="assets/images/icon-512.png" alt=""><span>Cargando...</span></div>';
        document.body.appendChild(el);
        return el;
    }

    function abrirCortina() {
        const el = crearCortina();
        clearTimeout(estado.ocultar);
        clearTimeout(estado.logo);
        // Cubre solo el contenido: el header (con sus pills) y la barra de abajo quedan a la vista.
        const bar = $('.navbar'), ext = $('#navExt'), abajo = $('#bottomNav');
        let top = bar ? bar.getBoundingClientRect().bottom : 0;
        if (ext && visible(ext)) top = Math.max(top, ext.getBoundingClientRect().bottom);
        const alto = abajo && visible(abajo) ? abajo.getBoundingClientRect().height : 0;
        el.style.top = Math.max(0, Math.round(top)) + 'px';
        el.style.bottom = Math.round(alto) + 'px';
        el.classList.remove('fnc-saliendo', 'fnc-con-logo');
        el.style.display = 'block';
        estado.abierta = true;
        estado.logo = setTimeout(() => el.classList.add('fnc-con-logo'), LOGO_RETRASO_MS);
    }

    function cerrarCortina() {
        const el = document.getElementById('feedNavCargando');
        clearTimeout(estado.logo);
        estado.abierta = false;
        if (!el || el.style.display === 'none') return;
        el.classList.add('fnc-saliendo');
        clearTimeout(estado.ocultar);
        estado.ocultar = setTimeout(() => { el.style.display = 'none'; el.classList.remove('fnc-saliendo', 'fnc-con-logo'); }, SALIDA_MS);
    }

    // -------------------------------------------------------------------------------------------- ciclo de un pasaje
    function sincronizarPills() {
        if (window._headerNav && typeof window._headerNav.sincronizarPastillas === 'function') window._headerNav.sincronizarPastillas();
    }

    function finalizar(nav, motivo) {
        if (nav !== estado.nav) return;                 // ya hay un pasaje más nuevo: este quedó viejo
        clearTimeout(estado.sondeo);
        const destino = estado.destino;
        estado.destino = null;
        cerrarCortina();
        sincronizarPills();
        window._feedNav.ultimo = { destino, motivo };
        precargar(destino);
    }

    function sondear(nav, destino) {
        const t0 = performance.now();
        let seguidos = 0;
        (function paso() {
            if (nav !== estado.nav) return;
            seguidos = listo(destino) ? seguidos + 1 : 0;
            const vencido = performance.now() - t0 > TOPE_MS;
            if (seguidos >= 2 || vencido) { finalizar(nav, vencido ? 'tope' : 'listo'); return; }
            estado.sondeo = setTimeout(paso, SONDEO_MS);
        })();
    }

    // inmediato: si ya está todo, no se muestra la cortina (el cambio es instantáneo, como hasta ahora).
    function comenzar(nav, destino, inmediato) {
        clearTimeout(estado.sondeo);
        estado.nav = nav;
        estado.destino = destino;
        if (inmediato && listo(destino, false)) { finalizar(nav, 'ya-listo'); return; }
        if (!estado.abierta) abrirCortina();      // si ya está levantada para este pasaje, no se reinicia
        sondear(nav, destino);
    }

    // --------------------------------------------------------------------------------------------- precarga
    function conexionLenta() {
        const c = navigator.connection;
        return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
    }

    function precargar(destino) {
        if (!destino || conexionLenta()) return;
        const idle = window.requestIdleCallback || ((f) => setTimeout(f, 700));
        idle(() => {
            // Carrusel de Series: con otra pestaña activa la función hace el pedido, guarda su caché de sesión y se frena antes de pintar.
            if (destino === 'peliculas' && window._tabActivo !== 'series' && typeof window.cargarSerieDestacada === 'function') window.cargarSerieDestacada();
            if (destino !== 'comunidad' && !estado.precargado && window._cmVersionSesion) {
                estado.precargado = true;
                const v = window._cmVersionSesion;
                [['style', `css/comunidad.css?v=${v}`], ['script', `js/comunidad.js?v=${v}`]].forEach(([as, href]) => {
                    const l = document.createElement('link');
                    l.rel = 'prefetch'; l.as = as; l.href = href;
                    document.head.appendChild(l);
                });
                fetch('modules/comunidad.html').catch(() => {});
            }
        }, { timeout: 2500 });
    }

    // --------------------------------------------------------------------------------------------- entradas
    // Pill del header. Devuelve false si no corresponde manejarlo acá (escritorio): el llamador sigue con su camino de siempre.
    function irA(destino) {
        if (!esMobile()) return false;
        instalarObservadores();
        const modulo = moduloActual();
        // El feed solo se considera listo para cambiar de pestaña desde adentro una vez que loadModule terminó de inicializarlo
        // (a los ~600 ms). Un pill tocado antes se anota como pendiente, así no lo pisa el "Inicio siempre arranca en Películas".
        const feedEnDom = !!$('#filasGeneroContainer') && !!$('#ordenarPills') && estado.feedInit;

        if (destino === 'comunidad') {
            if (modulo === 'comunidad') { window.scrollTo(0, 0); return true; }
            const nav = siguienteNav();
            comenzar(nav, 'comunidad', false);
            window.location.hash = '#comunidad';
            return true;
        }

        // Películas / Series con el feed ya en pantalla: el mismo camino de siempre (seleccionarTabFeed), ahora con cortina si falta algo.
        if (modulo === 'feed-films' && feedEnDom) {
            const cambia = window._tabActivo !== destino;
            const nav = siguienteNav();
            estado.nav = nav; estado.destino = destino;         // los pills ya marcan el destino durante el propio cambio
            if (typeof window.cambiarSwitchTipoInicio === 'function') window.cambiarSwitchTipoInicio(destino, null);
            if (cambia) window.scrollTo(0, 0);
            comenzar(nav, destino, true);
            return true;
        }

        // Viniendo de otro módulo (Comunidad), o con el feed todavía cargándose: se pide el destino ANTES de cargar, para que el feed
        // arranque directo en él (no pasa por Películas). El hash es lo único que dispara la carga: una sola.
        window._tabInicioPendiente = destino;
        try { localStorage.setItem('feedTabActivo', destino); } catch (e) {}
        const nav = siguienteNav();
        comenzar(nav, destino, false);
        if (modulo !== 'feed-films' || window.location.hash.replace('#', '') !== 'feed-films') window.location.hash = '#feed-films';
        return true;
    }

    // Lo llama loadModule (module-loader.js) apenas arranca cualquier módulo: cubre también la entrada por la barra de abajo,
    // un enlace o un cambio de hash, no solo los pills.
    function moduloIniciado(modulo) {
        instalarObservadores();
        if (!esMobile() || (modulo !== 'feed-films' && modulo !== 'comunidad')) {
            if (estado.destino) { estado.nav = siguienteNav(); estado.destino = null; clearTimeout(estado.sondeo); cerrarCortina(); }    // se va a otro lado: sin cortina
            return;
        }
        let destino = 'comunidad';
        if (modulo === 'feed-films') {
            estado.feedInit = false;
            destino = window._tabInicioPendiente === 'series' ? 'series' : 'peliculas';
            // La restauración interna de la última pestaña no debe pasar por otra: se deja ya fijada en el destino.
            try { localStorage.setItem('feedTabActivo', destino); } catch (e) {}
        }
        comenzar(siguienteNav(), destino, false);
    }

    // Lo llama loadModule cuando termina de inicializar el feed (después de restaurar o forzar la pestaña inicial).
    function feedInicializado() { estado.feedInit = true; }

    window._feedNav = {
        irA, moduloIniciado, feedInicializado,
        destinoEnCurso: () => estado.destino,
        estaListo: listo,
        razonNoListo,
        _vuelo: vuelo,
        ultimo: null
    };

    document.addEventListener('DOMContentLoaded', instalarObservadores);
    window.addEventListener('load', instalarObservadores);
})();
