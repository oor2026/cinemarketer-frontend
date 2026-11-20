// =====================================================================================================================
// feed-muro.js — Fondo de pósters en los laterales del feed de Inicio (solo escritorio ancho)
//
// El aspecto es CSS (css/feed-cine-desktop.css, sección «FONDO DE PÓSTERS»). Este archivo solo arma los dos muros (izquierdo y
// derecho) con los mismos pósters del momento que usa el login (GET /api/public/login-posters, películas y series en tendencia
// de TMDB) y los pone detrás de la página, sin tocar el contenido del feed.
//
// Cómo funciona: el feed se inyecta con innerHTML dentro de #module-container, y los <script> de esos módulos no se ejecutan;
// por eso este archivo va en dashboard.html y vigila #module-container. Cuando aparece el feed (#fcdHero) agrega el fondo a
// <body>; cuando el módulo cambia (Mi Sala, Comunidad, etc.) lo saca. Si el pedido de pósters falla, quedan los pósters
// ilustrados (solo CSS) y el feed funciona igual. Menos de 1280 px de ancho: no se arma nada (no hay lugar en los laterales).
//
// Va en dashboard.html después de config.js (necesita CONFIG.API_URL), por ejemplo junto a feed-films.js.
// =====================================================================================================================
(function () {
    'use strict';
    if (window._feedMuro) return;

    const ANCHO_MIN = window.matchMedia('(min-width: 1280px)');
    const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';
    const RUTA_VALIDA = /^\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;   // lo que llega del servidor se valida antes de armar una URL
    const COLUMNAS = 3, FILAS = 5, ANCHO = 140, ALTO = 210, SEPARACION = 12;
    const DESPLAZAMIENTOS = [-60, -150, -20];                            // cada columna arranca a otra altura
    const CLAVE_CACHE = 'loginPostersV1';                                // la misma que usa el login: si ya entró por ahí, no se vuelve a pedir
    const VIGENCIA_CACHE = 6 * 60 * 60 * 1000;
    const ESPERA_API = 4000;

    const TITULOS = ['La última función', 'Noche eléctrica', 'Mares del sur', 'Código rojo', 'El farolero', 'Tras el telón', 'Horizonte', 'Papel y luz', 'Ecos', 'Doble filo', 'Territorio', 'Amanecer'];
    const PALETAS = [
        ['#0f2a6b', '#2563d8'], ['#7a0a16', '#e50914'], ['#101b3a', '#2a3f87'],
        ['#0b3b4a', '#1f8a8a'], ['#3a1e5a', '#7b4bb0'], ['#22252b', '#5b6270']
    ];

    function esLiviano() {
        const c = navigator.connection;
        return (navigator.deviceMemory && navigator.deviceMemory <= 2) || !!(c && c.saveData);
    }

    function crearPoster(columna, fila, indice) {
        const paleta = PALETAS[(indice * 5 + columna) % PALETAS.length];
        const poster = document.createElement('div');
        poster.className = 'fcd-poster';
        poster.style.left = (12 + columna * (ANCHO + SEPARACION)) + 'px';
        poster.style.top = (DESPLAZAMIENTOS[columna] + fila * (ALTO + SEPARACION)) + 'px';
        poster.style.background = `linear-gradient(160deg, ${paleta[0]}, ${paleta[1]})`;
        const titulo = document.createElement('div');
        titulo.className = 'fcd-poster-titulo';
        titulo.textContent = TITULOS[indice % TITULOS.length];
        poster.appendChild(titulo);
        return poster;
    }

    function crearLado(clase, liviano, desde) {
        const lado = document.createElement('div');
        lado.className = 'fcd-muro-lado ' + clase;
        const interior = document.createElement('div');
        interior.className = 'fcd-muro-inner';
        const filas = liviano ? 3 : FILAS;
        for (let c = 0; c < COLUMNAS; c++) for (let f = 0; f < filas; f++) interior.appendChild(crearPoster(c, f, desde + c * FILAS + f));
        lado.appendChild(interior);
        return lado;
    }

    function ajustarEscala(muro) {
        // El lado se agranda hasta cubrir toda la altura de la pantalla, con el giro incluido.
        muro.style.setProperty('--fcd-escala', String(Math.max(1, (window.innerHeight * 1.12) / 1040)));
    }

    function ponerImagenes(muro, rutas) {
        if (!rutas.length) return;
        const posters = muro.querySelectorAll('.fcd-poster');
        const inicio = Math.floor(Math.random() * rutas.length);
        posters.forEach((poster, i) => {
            const img = new Image();
            img.alt = '';
            img.decoding = 'async';
            img.onload = () => img.classList.add('fcd-ok');
            img.onerror = () => img.remove();
            img.src = TMDB_IMG + rutas[(inicio + i) % rutas.length];
            poster.appendChild(img);
        });
    }

    let promesaRutas = null;
    function obtenerRutas() {
        if (promesaRutas) return promesaRutas;
        promesaRutas = (async () => {
            try {
                const guardado = JSON.parse(sessionStorage.getItem(CLAVE_CACHE) || 'null');
                if (guardado && Date.now() - guardado.t < VIGENCIA_CACHE && Array.isArray(guardado.rutas) && guardado.rutas.length) return guardado.rutas;
            } catch (e) { /* sin caché */ }
            if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) return [];
            const control = typeof AbortController === 'function' ? new AbortController() : null;
            const corte = control ? setTimeout(() => control.abort(), ESPERA_API) : null;
            try {
                const res = await fetch(`${CONFIG.API_URL}/public/login-posters`, { signal: control ? control.signal : undefined });
                if (corte) clearTimeout(corte);
                if (!res.ok) return [];
                const datos = await res.json();
                const rutas = (Array.isArray(datos.posters) ? datos.posters : []).filter(r => typeof r === 'string' && RUTA_VALIDA.test(r));
                if (rutas.length) { try { sessionStorage.setItem(CLAVE_CACHE, JSON.stringify({ t: Date.now(), rutas })); } catch (e) { /* sin caché */ } }
                return rutas;
            } catch (e) {
                if (corte) clearTimeout(corte);
                return [];
            }
        })();
        return promesaRutas;
    }

    function construir() {
        const liviano = esLiviano();
        const muro = document.createElement('div');
        muro.id = 'fcdMuro';
        muro.className = 'fcd-muro' + (liviano ? ' fcd-liviano' : '');
        muro.setAttribute('aria-hidden', 'true');
        muro.appendChild(crearLado('fcd-muro-izq', liviano, 0));
        muro.appendChild(crearLado('fcd-muro-der', liviano, 15));
        document.body.insertBefore(muro, document.body.firstChild);
        ajustarEscala(muro);
        obtenerRutas().then(rutas => { if (muro.isConnected) ponerImagenes(muro, rutas); });
    }

    function sincronizar() {
const hayFeed = !!(document.getElementById('fcdHero') || document.getElementById('cartHero') || document.getElementById('perfilContenido') || document.getElementById('cuentaPremiumPanel') || document.getElementById('faqLista') || document.getElementById('bandejaPanelMensajes') || document.getElementById('clubGridFree') || document.getElementById('clubPubGridFree') || document.getElementById('psRoot'));
        const muro = document.getElementById('fcdMuro');
        if (hayFeed && ANCHO_MIN.matches) { if (!muro) construir(); }
        else if (muro) muro.remove();
    }

    let pendiente = false;
    function programar() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => { pendiente = false; sincronizar(); });
    }

    function iniciar() {
        const contenedor = document.getElementById('module-container') || document.body;
        new MutationObserver(programar).observe(contenedor, { childList: true, subtree: true });
        window.addEventListener('resize', () => { const m = document.getElementById('fcdMuro'); if (m) ajustarEscala(m); programar(); });
        if (ANCHO_MIN.addEventListener) ANCHO_MIN.addEventListener('change', programar);
        sincronizar();
    }

    window._feedMuro = { sincronizar, _rutaValida: RUTA_VALIDA };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
