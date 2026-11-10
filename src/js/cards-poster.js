// =====================================================================================================================
// cards-poster.js — Tarjetas de película y serie como póster (feed, solo mobile)
//
// El diseño es CSS (ver "TARJETAS DE PELÍCULA Y SERIE COMO PÓSTER" en feed-films.html). Este archivo hace una sola cosa:
// decidir qué título va sobre cada póster, con el mismo criterio que el modal de detalle (modal-hero.js):
//   - si el póster YA TRAE el título impreso, no se agrega nada                    -> clase "titulo-impreso"
//   - si no, pero TMDB tiene el logo del título, se muestra el logo                -> clase "con-logo"
//   - si no hay logo, se muestra el texto del título                               (sin clase)
// Mientras se decide, el texto queda oculto ("titulo-cargando"), hasta ESPERA_MAX ms: así no aparece un instante y se va.
//
// Cada tarjeta pide sus imágenes recién cuando se acerca a la pantalla, y de a pocas a la vez. La respuesta se guarda en la
// misma memoria que usa el modal (window._modalHero.imagenes), así que abrir el detalle después no vuelve a pedir nada.
// Necesita modal-hero.js cargado ANTES. Si no está, o si el pedido falla, queda el texto. En escritorio no hace nada.
// =====================================================================================================================
(function () {
    'use strict';
    if (window._cardsPoster) return;

    const MOBILE = window.matchMedia('(max-width: 768px)');
    const ESPERA_MAX = 1200;      // ms que se espera a TMDB antes de mostrar el texto
    const SIMULTANEOS = 3;        // pedidos a la vez
    const ANCHO_LOGO = 'w300';
    const TMDB_IMG = 'https://image.tmdb.org/t/p/';
    const SELECTOR = '.fila-genero-slide .pelicula-card, .fila-genero-slide .serie-card';

    const preparadas = new WeakSet();
    const cola = [];
    let enCurso = 0;

    function tipoDe(card) { return card.classList.contains('serie-card') ? 'serie' : 'pelicula'; }

    // Ruta del póster de la tarjeta (por ejemplo "/abc.jpg"), tal como la guarda TMDB, para saber si trae título impreso.
    function posterDe(card) {
        const img = card.querySelector('.pelicula-poster img, .serie-poster img');
        const m = img && /\/t\/p\/w\d+(\/[^?#]+)/.exec(img.getAttribute('src') || '');
        return m ? m[1] : null;
    }

    function tituloDe(card) {
        const t = card.querySelector('.pelicula-titulo, .serie-titulo');
        return t ? t.textContent.trim() : '';
    }

    // Corre las tareas de a SIMULTANEOS; cada una devuelve una promesa. Si falla, el resultado es "sin imágenes".
    function encolar(tarea) {
        return new Promise(resolver => {
            cola.push(() => {
                enCurso++;
                Promise.resolve().then(tarea).catch(() => ({ logo: null, posters: [] })).then(r => { enCurso--; resolver(r); siguiente(); });
            });
            siguiente();
        });
    }
    function siguiente() { while (enCurso < SIMULTANEOS && cola.length) cola.shift()(); }

    function precargar(url) {
        return new Promise(resolver => {
            const img = new Image();
            const corte = setTimeout(() => resolver(false), 4000);
            img.onload = () => { clearTimeout(corte); resolver(true); };
            img.onerror = () => { clearTimeout(corte); resolver(false); };
            img.src = url;
        });
    }

    function resolverTitulo(card) {
        const api = window._modalHero;
        const id = Number(card.dataset.id), tipo = tipoDe(card);
        const terminar = () => card.classList.remove('titulo-cargando');
        if (!id || !api || typeof api.imagenes !== 'function') { terminar(); return; }
        const espera = setTimeout(terminar, ESPERA_MAX);

        encolar(() => api.imagenes(tipo, id)).then(async img => {
            if (!card.isConnected) { clearTimeout(espera); return; }
            let url = null;
            if (api._posterConTitulo(img.posters, posterDe(card))) {
                card.classList.add('titulo-impreso');
            } else if (img.logo) {
                const candidato = TMDB_IMG + ANCHO_LOGO + img.logo;
                if (await precargar(candidato)) url = candidato;
            }
            if (url && card.isConnected) {
                const logo = card.querySelector('.card-p-logo');
                if (logo) { logo.src = url; logo.alt = tituloDe(card); card.classList.add('con-logo'); }
            }
            clearTimeout(espera);
            terminar();
        });
    }

    // Un observador por fila, con la propia fila (el carril que scrollea) como raíz: así el margen de 200 px a los costados
    // sí cuenta y la próxima tarjeta pide su logo un poco antes de entrar. Con la pantalla como raíz, el margen no se aplica
    // a lo que el scroll horizontal tiene recortado.
    const observadores = new WeakMap();
    function observadorDe(carril) {
        let o = observadores.get(carril);
        if (!o) {
            o = new IntersectionObserver((entradas, obs) => {
                entradas.forEach(e => { if (e.isIntersecting) { obs.unobserve(e.target); resolverTitulo(e.target); } });
            }, { root: carril, rootMargin: '0px 200px 0px 200px' });
            observadores.set(carril, o);
        }
        return o;
    }

    function preparar(card) {
        if (preparadas.has(card)) return;
        preparadas.add(card);
        const info = card.querySelector('.pelicula-info, .serie-info');
        if (!info) return;
        if (!info.querySelector('.card-p-logo')) {
            const logo = document.createElement('img');
            logo.className = 'card-p-logo'; logo.alt = ''; logo.decoding = 'async';
            info.insertBefore(logo, info.firstChild);
        }
        card.classList.add('titulo-cargando');
        const carril = card.closest('.fila-genero-track');
        if (carril && typeof IntersectionObserver === 'function') observadorDe(carril).observe(card); else resolverTitulo(card);
    }

    function escanear(raiz) {
        if (!MOBILE.matches || !raiz) return;
        if (raiz.matches && raiz.matches(SELECTOR)) preparar(raiz);
        if (raiz.querySelectorAll) raiz.querySelectorAll(SELECTOR).forEach(preparar);
    }

    function iniciar() {
        escanear(document);
        new MutationObserver(cambios => {
            cambios.forEach(c => c.addedNodes.forEach(n => { if (n.nodeType === 1) escanear(n); }));
        }).observe(document.body, { childList: true, subtree: true });
        const alCambiar = e => { if (e.matches) escanear(document); };
        if (MOBILE.addEventListener) MOBILE.addEventListener('change', alCambiar); else MOBILE.addListener(alCambiar);
    }

    window._cardsPoster = { escanear, _preparadas: preparadas };
    if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
