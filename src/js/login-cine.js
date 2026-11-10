// =====================================================================================================================
// login-cine.js — Muro de pósters del login mobile
//
// El aspecto es CSS (css/login-cine.css). Este archivo solo arma el muro de pósters de arriba: pide las rutas de los pósters
// del momento (películas y series en tendencia, de TMDB) a GET /api/public/login-posters y los acomoda en cuatro columnas.
//
// El login no depende de esto para nada: no toca el formulario ni su JavaScript. Si el pedido falla, tarda o devuelve algo
// raro, el muro queda con pósters ilustrados (solo CSS) y el login funciona igual. Solo actúa en mobile (hasta 768 px).
//
// Va al final del body, después de config.js (necesita CONFIG.API_URL).
// =====================================================================================================================
(function () {
    'use strict';
    if (window._loginCine) return;

    const MOBILE = window.matchMedia('(max-width: 768px)');
    const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';
    const RUTA_VALIDA = /^\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;   // lo que llega del servidor se valida antes de armar una URL
    const COLUMNAS = 4, FILAS = 6, ANCHO = 140, ALTO = 210, SEPARACION = 12;
    const DESPLAZAMIENTOS = [-70, -170, -30, -120];                       // cada columna arranca a otra altura
    const CLAVE_CACHE = 'loginPostersV1';
    const VIGENCIA_CACHE = 6 * 60 * 60 * 1000;
    const ESPERA_API = 4000;

    // Pósters ilustrados de respaldo (solo CSS): se ven hasta que llega la imagen real, o siempre si no llega ninguna.
    const TITULOS = ['La última función', 'Noche eléctrica', 'Mares del sur', 'Código rojo', 'El farolero', 'Tras el telón', 'Horizonte', 'Papel y luz', 'Ecos', 'Doble filo', 'Territorio', 'Amanecer', 'El último tren', 'Sombra y voz', 'Costa brava', 'Ciudad fantasma', 'Mil caminos', 'Luz de gas', 'Otra vez aquí', 'Frontera', 'Isla', 'Los vecinos', 'Víspera', 'Corte final'];
    const PALETAS = [
        ['#0f2a6b', '#2563d8', '#ff4d5a'], ['#7a0a16', '#e50914', '#ffd9a0'], ['#101b3a', '#2a3f87', '#f2b84b'],
        ['#0b3b4a', '#1f8a8a', '#f6e7c1'], ['#3a1e5a', '#7b4bb0', '#ff9ab3'], ['#22252b', '#5b6270', '#e50914']
    ];

    // Equipos justos o con ahorro de datos: menos pósters (16 en vez de 24) y sin el halo rojo y azul, que es lo más pesado.
    function esLiviano() {
        const c = navigator.connection;
        return (navigator.deviceMemory && navigator.deviceMemory <= 2) || !!(c && c.saveData);
    }

    function arteDe(i, paleta) {
        const v = i % 4, a = paleta[2];
        if (v === 0) return `radial-gradient(circle at 50% 38%, ${a} 0 38px, transparent 39px), linear-gradient(to top, rgba(0,0,0,.35), transparent 45%)`;
        if (v === 1) return 'repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 7px, transparent 7px 16px), linear-gradient(to top, rgba(0,0,0,.4), transparent 55%)';
        if (v === 2) return `linear-gradient(118deg, transparent 45%, ${a} 45%, ${a} 55%, transparent 55%), linear-gradient(to top, rgba(0,0,0,.4), transparent 50%)`;
        return `radial-gradient(circle at 50% 33%, rgba(0,0,0,.6) 0 16px, transparent 17px), radial-gradient(ellipse 46px 64px at 50% 80%, rgba(0,0,0,.6) 0 96%, transparent 100%), radial-gradient(circle at 50% 36%, ${a} 0 52px, transparent 53px)`;
    }

    function crearPoster(columna, fila, liviano) {
        const i = columna * FILAS + fila;
        const paleta = PALETAS[(i * 5 + columna) % PALETAS.length];
        const poster = document.createElement('div');
        poster.className = 'lc-poster';
        poster.style.left = (12 + columna * (ANCHO + SEPARACION)) + 'px';
        poster.style.top = (DESPLAZAMIENTOS[columna] + fila * (ALTO + SEPARACION)) + 'px';
        poster.style.background = `linear-gradient(160deg, ${paleta[0]}, ${paleta[1]})`;
        const arte = document.createElement('div');
        arte.className = 'lc-arte';
        arte.style.background = arteDe(i, paleta);
        const titulo = document.createElement('div');
        titulo.className = 'lc-titulo';
        titulo.textContent = TITULOS[i % TITULOS.length];
        poster.appendChild(arte);
        poster.appendChild(titulo);
        return poster;
    }

    function construirMuro() {
        const liviano = esLiviano();
        const muro = document.createElement('div');
        muro.className = 'lc-muro' + (liviano ? ' lc-liviano' : '');
        muro.setAttribute('aria-hidden', 'true');
        const interior = document.createElement('div');
        interior.className = 'lc-muro-inner';
        const filas = liviano ? 4 : FILAS;
        for (let c = 0; c < COLUMNAS; c++) for (let f = 0; f < filas; f++) interior.appendChild(crearPoster(c, f, liviano));
        muro.appendChild(interior);
        document.body.insertBefore(muro, document.body.firstChild);
        ajustarEscala(muro);
        return muro;
    }

    // En pantallas más anchas (tablets) el muro se agranda para cubrir el ancho completo, con el giro incluido.
    function ajustarEscala(muro) {
        muro.style.setProperty('--lc-escala', String(Math.max(1, (window.innerWidth * 1.07) / 620)));
    }

    // Pósters con imagen real: cada uno reemplaza al ilustrado cuando carga (y si no carga, se queda el ilustrado).
    function ponerImagenes(muro, rutas) {
        const posters = muro.querySelectorAll('.lc-poster');
        if (!rutas.length) return;
        const inicio = Math.floor(Math.random() * rutas.length);       // cada visita arranca en otro lugar de la lista
        posters.forEach((poster, i) => {
            const img = new Image();
            img.alt = '';
            img.decoding = 'async';
            img.onload = () => img.classList.add('lc-ok');
            img.onerror = () => img.remove();
            img.src = TMDB_IMG + rutas[(inicio + i) % rutas.length];
            poster.appendChild(img);
        });
    }

    async function obtenerRutas() {
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
    }

    let muroActual = null;

    function iniciar() {
        if (muroActual || !document.body) return;
        muroActual = construirMuro();
        // El nombre accesible del enlace "Inicio" (arriba a la izquierda) sigue siendo el de antes.
        const volver = document.getElementById('backLink') || document.querySelector('.auth-footer .back-link');   // el registro no le puso id
        if (volver) volver.setAttribute('aria-label', 'Volver al inicio');
        obtenerRutas().then(rutas => { if (muroActual) ponerImagenes(muroActual, rutas); });
        window.addEventListener('resize', () => { if (muroActual) ajustarEscala(muroActual); });
    }

    window._loginCine = { iniciar, _rutaValida: RUTA_VALIDA };
    if (MOBILE.matches) iniciar();
    else if (MOBILE.addEventListener) MOBILE.addEventListener('change', e => { if (e.matches) iniciar(); });
})();