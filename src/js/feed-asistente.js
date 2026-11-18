// =====================================================================================================================
// feed-asistente.js — Botón flotante del asistente en Inicio (escritorio)
//
// El aspecto es CSS (css/feed-cine-desktop.css, sección «ASISTENTE FLOTANTE»). Es el mismo lente rojo del botón «Asistente» de
// la barra inferior de mobile: abre el mismo asistente (window.abrirAsistenteBottomNav). Al scrollear «habla» con la viñeta
// «¿Necesitás de mi ayuda?»: la primera vez que pasás los 120 px y después como mucho una vez cada 20 segundos.
//
// El feed se inyecta con innerHTML dentro de #module-container (y los <script> de esos módulos no se ejecutan), por eso este
// archivo va en dashboard.html y vigila #module-container: cuando aparece el feed (#fcdHero) agrega el botón a <body>, y cuando
// el módulo cambia (Mi Sala, Comunidad, Cartelera…) lo saca. Desde 769 px; en mobile no hace nada (ahí está la barra inferior).
// =====================================================================================================================
(function () {
    'use strict';
    if (window._feedAsistente) return;

    const ANCHO_MIN = window.matchMedia('(min-width: 769px)');
    const DESPLAZAMIENTO_MIN = 120;     // px de scroll para que hable
    const ENTRE_VINETAS = 20000;        // ms mínimos entre una viñeta y la siguiente
    const DURACION_VINETA = 4000;       // ms que se queda a la vista
    let ultimaVineta = 0;
    let temporizador = null;

    function abrirAsistente() {
        if (typeof window.abrirAsistenteBottomNav === 'function') window.abrirAsistenteBottomNav();
        else if (typeof window.abrirBuscadorAsistido === 'function') window.abrirBuscadorAsistido();
    }

    function construir() {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.id = 'fcdAsistenteFab';
        boton.className = 'fcd-fab';
        boton.setAttribute('aria-label', 'Abrir el asistente');
        boton.title = 'Asistente';
        boton.innerHTML =
            '<span class="fcd-fab-circulo"><i class="fas fa-glasses" aria-hidden="true"></i></span>' +
            '<span class="fcd-fab-vineta" id="fcdFabVineta" aria-hidden="true"><span class="fcd-fab-vineta-inner">¿Necesitás de mi ayuda?</span></span>';
        boton.addEventListener('click', abrirAsistente);
        document.body.appendChild(boton);
    }

    function mostrarVineta() {
        const vineta = document.getElementById('fcdFabVineta');
        if (!vineta) return;
        vineta.classList.add('visible');
        ultimaVineta = Date.now();
        clearTimeout(temporizador);
        temporizador = setTimeout(() => vineta.classList.remove('visible'), DURACION_VINETA);
    }

    function alScrollear() {
        if (!document.getElementById('fcdAsistenteFab')) return;
        if (window.scrollY > DESPLAZAMIENTO_MIN && Date.now() - ultimaVineta > ENTRE_VINETAS) mostrarVineta();
    }

    function sincronizar() {
        const hayFeed = !!document.getElementById('fcdHero');
        const boton = document.getElementById('fcdAsistenteFab');
        if (hayFeed && ANCHO_MIN.matches) { if (!boton) construir(); }
        else if (boton) { clearTimeout(temporizador); boton.remove(); }
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
        window.addEventListener('scroll', alScrollear, { passive: true });
        window.addEventListener('resize', programar);
        if (ANCHO_MIN.addEventListener) ANCHO_MIN.addEventListener('change', programar);
        sincronizar();
    }

    window._feedAsistente = { sincronizar };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
