// ==============================================
// cartelera-modal.js - Modal de una película en un cine
// ==============================================
// Se abre al tocar una tarjeta de "Hoy cerca tuyo" (ver cartelera.js). Tiene dos slides
// que se pasan deslizando, con los puntitos o con el botón:
//   1. El póster de la película.
//   2. Las funciones de ese cine con todo el detalle: cada horario (la tarjeta muestra
//      hasta 4), formato, idioma y el precio completo de cada función.
//
// Uso:
//   window.CarteleraModal.abrir({ pelicula, poster, cine, funciones, sinopsis, cargarSinopsis }, elementoQueLoAbrio)
//   - funciones: las que devuelve el backend (peliculaTitulo, cineNombre, dia, esHoy,
//     horario, formato, idioma, y los campos de precio que describe cartelera-precio.js).
//   - sinopsis (opcional): el texto, si ya se tiene. Se muestra debajo del título, en el slide 2.
//   - cargarSinopsis (opcional): función que devuelve (como promesa) el texto de la sinopsis. Se
//     usa si no vino "sinopsis": mientras llega se ve un placeholder, y si no hay sinopsis o falla
//     el pedido simplemente no se muestra nada. Lo ya pedido se recuerda al reabrir la película.
//   - elementoQueLoAbrio (opcional): al cerrar, el foco vuelve ahí.
//
// Es una pieza aparte, con sus propios estilos, para que el resto de los atajos de
// Cartelera puedan abrir este mismo modal cuando se quiera.
(function () {
    'use strict';

    // ---------------------------------------------------------------
    // Utilidades
    // ---------------------------------------------------------------
    function esc(texto) {
        return String(texto == null ? '' : texto).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Solo se aceptan direcciones http(s) o rutas relativas: nada de "javascript:" ni "data:".
    function urlSegura(url) {
        var u = String(url == null ? '' : url).trim();
        if (/^(https?:)?\/\//i.test(u) || /^[\w./-]+$/.test(u)) return u;
        return '';
    }

    // Los pósters de TMDB vienen en un tamaño chico para las tarjetas; acá hay lugar
    // para uno más grande. Cualquier otra dirección se usa tal cual.
    function posterGrande(url) {
        var u = urlSegura(url);
        return u.replace(/(image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/)/, '$1w780$3');
    }

    // "13:20:00" → "13:20"
    function hora(h) {
        return h ? String(h).slice(0, 5) : '';
    }

    function textoFunciones(n) {
        return n === 1 ? '1 función' : n + ' funciones';
    }

    // "Hoy · miércoles 7 de octubre" / "jueves 8 de octubre"
    function etiquetaDia(dia, esHoy) {
        var fecha = new Date(dia + 'T00:00:00');
        var texto = '';
        if (!isNaN(fecha.getTime())) {
            texto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
        }
        if (esHoy) return texto ? 'Hoy · ' + texto : 'Hoy';
        return texto || String(dia || '');
    }

    // Ordena las funciones por día; dentro de cada día las junta por formato e idioma
    // ("2D · Español", "3D · Subtitulada") y las deja por horario.
    //   → [{ dia, esHoy, grupos: [{ titulo, funciones: [...] }] }]
    function agrupar(funciones) {
        var porDia = {};
        (funciones || []).forEach(function (f) {
            var dia = f.dia || '';
            if (!porDia[dia]) porDia[dia] = { dia: dia, esHoy: false, mapa: {} };
            if (f.esHoy) porDia[dia].esHoy = true;
            var titulo = [f.formato, f.idioma].filter(Boolean).join(' · ') || 'Funciones';
            if (!porDia[dia].mapa[titulo]) porDia[dia].mapa[titulo] = [];
            porDia[dia].mapa[titulo].push(f);
        });
        var porHorario = function (a, b) { return String(a.horario).localeCompare(String(b.horario)); };
        return Object.keys(porDia).sort().map(function (dia) {
            var d = porDia[dia];
            var grupos = Object.keys(d.mapa).map(function (titulo) {
                return { titulo: titulo, funciones: d.mapa[titulo].slice().sort(porHorario) };
            }).sort(function (a, b) { return porHorario(a.funciones[0], b.funciones[0]); });
            return { dia: dia, esHoy: d.esHoy, grupos: grupos };
        });
    }

    // ---------------------------------------------------------------
    // Estilos (se inyectan una sola vez, al cargar este archivo)
    // ---------------------------------------------------------------
    var ESTILOS = [
        // La tarjeta de "Hoy cerca tuyo" pasa a ser tocable
        '.cartelera-cerca-card[role="button"] { position: relative; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform .12s ease; }',
        '.cartelera-cerca-card[role="button"]:active { transform: scale(.985); }',
        '.cartelera-cerca-card[role="button"]:focus-visible { outline: 2px solid #c4321f; outline-offset: 2px; }',
        '.cartelera-cerca-card[role="button"] .cartelera-cerca-info { padding-right: 18px; }',
        '.cm-flecha { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #c9c4b8; font-size: .8rem; pointer-events: none; }',

        // Fondo y hoja
        'body.cm-abierto { overflow: hidden !important; }',
        '.cm-overlay { position: fixed; inset: 0; z-index: 10000; display: none; align-items: flex-end; justify-content: center; background: rgba(12,16,32,0); transition: background .22s ease; }',
        '.cm-overlay.cm-montado { display: flex; }',
        '.cm-overlay.cm-visible { background: rgba(12,16,32,.62); }',
        '.cm-sheet { position: relative; display: flex; flex-direction: column; width: 100%; max-width: 440px; height: 88vh; height: min(88dvh, 720px); background: #fff; border-radius: 22px 22px 0 0; overflow: hidden; outline: none; padding-bottom: env(safe-area-inset-bottom); transform: translateY(26px); opacity: 0; transition: transform .26s cubic-bezier(.2,.8,.2,1), opacity .2s ease; }',
        '.cm-overlay.cm-visible .cm-sheet { transform: none; opacity: 1; }',
        '@media (min-width: 600px) { .cm-overlay { align-items: center; } .cm-sheet { border-radius: 22px; height: min(84vh, 700px); } }',
        '@media (prefers-reduced-motion: reduce) { .cm-overlay, .cm-sheet { transition: none; } .cm-sheet { transform: none; } }',

        // Botón de cerrar y puntitos (cambian de color según el slide)
        '.cm-cerrar { position: absolute; top: 12px; right: 12px; z-index: 3; width: 36px; height: 36px; border: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: .95rem; background: rgba(12,20,48,.55); color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.16); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }',
        '.cm-puntos { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; display: flex; justify-content: center; gap: 8px; padding: 18px 0 calc(14px + env(safe-area-inset-bottom)); pointer-events: none; background: linear-gradient(to top, #5c120a 45%, rgba(92,18,10,0)); }',
        '.cm-sheet.cm-en-poster .cm-puntos { background: none; }',
        '.cm-punto { pointer-events: auto; width: 8px; height: 8px; padding: 0; border: 0; border-radius: 6px; cursor: pointer; background: rgba(255,255,255,.35); transition: width .2s ease, background .2s ease; }',
        '.cm-punto.activo { width: 22px; background: #c4321f !important; }',
        '.cm-sheet:not(.cm-en-poster) .cm-punto.activo { background: #fff !important; }',
        '.cm-cerrar:focus-visible, .cm-punto:focus-visible, .cm-btn-principal:focus-visible, .cm-volver:focus-visible { outline: 2px solid #c4321f; outline-offset: 2px; }',

        // Los dos slides, que se pasan deslizando
        '.cm-track { flex: 1; min-height: 0; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; }',
        '.cm-track::-webkit-scrollbar { display: none; }',
        '.cm-slide { flex: 0 0 100%; width: 100%; box-sizing: border-box; scroll-snap-align: start; scroll-snap-stop: always; overflow-y: auto; }',

        // Slide 1: póster
        '.cm-slide-poster { display: flex; padding: 56px 24px 64px; color: #fff; text-align: center; background: radial-gradient(120% 80% at 50% 0%, #2a4180 0%, #16264d 45%, #0c1430 100%); }',
        '.cm-poster-wrap { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 100%; }',
        '.cm-poster, .cm-poster-vacio { width: min(60vw, 240px); aspect-ratio: 2 / 3; border-radius: 14px; background: #243b72; box-shadow: 0 24px 50px -12px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08); }',
        '.cm-poster { display: block; object-fit: cover; }',
        '.cm-poster-vacio { display: flex; align-items: center; justify-content: center; font-size: 2.6rem; color: rgba(255,255,255,.35); }',
        '.cm-titulo { margin: 0; font-family: "Space Grotesk", sans-serif; font-size: 1.25rem; font-weight: 800; line-height: 1.2; }',
        '.cm-cine { font-size: .85rem; color: rgba(255,255,255,.72); }',
        '.cm-chip { display: inline-block; font-size: .72rem; font-weight: 700; color: #ffb4a8; background: rgba(240,85,63,.2); border-radius: 999px; padding: 4px 11px; }',
        '.cm-btn-principal { margin-top: 4px; border: 0; border-radius: 999px; padding: 11px 22px; cursor: pointer; font-size: .85rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #f0553f, #c4321f); box-shadow: 0 8px 18px -6px rgba(196,50,31,.6); }',

        // Slide 2: dos secciones bien distintas. LA PELÍCULA (título + sinopsis) va sobre una banda
        // azul, como el póster; EL CINE (nombre + funciones) va en una tarjeta blanca con forma de entrada.
        '.cm-slide-funciones { background: radial-gradient(120% 90% at 50% 0%, #e2543d 0%, #b82d1c 50%, #5c120a 100%); color: #16151a; padding: 0 0 64px; }',
        '.cm-etiqueta { display: flex; align-items: center; gap: 6px; font-size: .64rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }',

        // — La película
        '.cm-pelicula { padding: 14px 20px 46px; color: #fff; border-radius: 0 0 26px 26px; background: radial-gradient(120% 90% at 50% 0%, #2a4180 0%, #16264d 50%, #0c1430 100%); }',
        '.cm-volver { display: inline-block; border: 0; background: none; padding: 4px 2px; cursor: pointer; font-size: .8rem; font-weight: 700; color: rgba(255,255,255,.72); }',
        '.cm-volver:focus-visible { outline-color: #ffb4a8; }',
        '.cm-etiqueta-pelicula { margin: 12px 0 6px; color: #ffb4a8; }',
        '.cm-pelicula .cm-titulo { font-size: 1.3rem; }',
        '.cm-sinopsis { margin: 12px 0 0; }',
        '.cm-sinopsis-texto { margin: 0; font-size: .82rem; line-height: 1.55; color: rgba(255,255,255,.84); white-space: pre-line; }',
        '.cm-sinopsis-larga:not(.cm-abierta) .cm-sinopsis-texto { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }',
        '.cm-sinopsis-mas { margin-top: 4px; padding: 2px 0; border: 0; background: none; cursor: pointer; font-size: .75rem; font-weight: 700; color: #ffb4a8; }',
        '.cm-sinopsis-mas:focus-visible { outline: 2px solid #ffb4a8; outline-offset: 2px; }',
        '.cm-sinopsis-cargando span { display: block; height: 10px; margin: 9px 0; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,.10) 25%, rgba(255,255,255,.22) 50%, rgba(255,255,255,.10) 75%); background-size: 200% 100%; animation: cm-brillo 1.2s linear infinite; }',
        '.cm-sinopsis-cargando span:last-child { width: 60%; }',
        '@keyframes cm-brillo { to { background-position: -200% 0; } }',
        '@media (prefers-reduced-motion: reduce) { .cm-sinopsis-cargando span { animation: none; } }',

        // — El cine (tarjeta que se monta sobre la banda azul)
        // La tarjeta son dos mitades (nombre arriba, funciones abajo) con una muesca recortada en cada
        // borde del corte. Se recortan con máscara, así dejan ver el fondo que haya detrás, sea cual sea.
        '.cm-lugar { position: relative; margin: -24px 14px 0; filter: drop-shadow(0 14px 16px rgba(20,4,2,.45)); }',
        '.cm-lugar-cab { margin-bottom: -1px; padding: 16px 18px 14px; border-radius: 20px 20px 0 0; background: #fff; -webkit-mask: radial-gradient(circle 10px at 0 100%, #0000 98%, #000), radial-gradient(circle 10px at 100% 100%, #0000 98%, #000); -webkit-mask-composite: source-in; mask: radial-gradient(circle 10px at 0 100%, #0000 98%, #000), radial-gradient(circle 10px at 100% 100%, #0000 98%, #000); mask-composite: intersect; }',
        '.cm-etiqueta-cine { margin-bottom: 5px; color: #c4321f; }',
        '.cm-lugar-nombre { font-family: "Space Grotesk", sans-serif; font-size: 1.08rem; font-weight: 800; line-height: 1.2; color: #16151a; }',
        '.cm-lugar-meta { margin-top: 4px; font-size: .78rem; line-height: 1.35; color: #8a8478; }',
        // el corte de la entrada: línea punteada entre las dos mitades
        '.cm-lista { position: relative; padding: 2px 18px 12px; border-radius: 0 0 20px 20px; background: #fff; -webkit-mask: radial-gradient(circle 10px at 0 0, #0000 98%, #000), radial-gradient(circle 10px at 100% 0, #0000 98%, #000); -webkit-mask-composite: source-in; mask: radial-gradient(circle 10px at 0 0, #0000 98%, #000), radial-gradient(circle 10px at 100% 0, #0000 98%, #000); mask-composite: intersect; }',
        '.cm-lista::before { content: ""; position: absolute; top: 0; left: 14px; right: 14px; border-top: 2px dashed #e4dfd3; }',
        '.cm-dia { margin: 16px 0 2px; font-size: .78rem; font-weight: 800; color: #c4321f; }',
        '.cm-dia::first-letter { text-transform: uppercase; }',
        '.cm-grupo { margin-top: 14px; }',
        '.cm-grupo-titulo { display: inline-block; font-size: .7rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #16264d; background: rgba(22,38,77,.08); border-radius: 8px; padding: 3px 9px; }',
        '.cm-fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0ede6; }',
        '.cm-fila:last-child { border-bottom: 0; }',
        '.cm-hora { font-family: "Space Grotesk", sans-serif; font-size: 1.05rem; font-weight: 800; color: #16151a; }',
        '.cm-fila .cp-celda { align-items: flex-end; text-align: right; }',
        '.cm-nota { margin: 14px 28px 0; text-align: center; font-size: .7rem; line-height: 1.35; color: rgba(255,255,255,.78); }',
        '.cm-vacio { padding: 16px 0 8px; font-size: .85rem; color: #8a8478; }'
    ].join('\n');

    function inyectarEstilos() {
        if (typeof document === 'undefined' || document.getElementById('cm-estilos')) return;
        var estilo = document.createElement('style');
        estilo.id = 'cm-estilos';
        estilo.textContent = ESTILOS;
        (document.head || document.documentElement).appendChild(estilo);
    }

    // ---------------------------------------------------------------
    // Contenido de los dos slides
    // ---------------------------------------------------------------
    function htmlSlidePoster(d) {
        var url = posterGrande(d.poster);
        var poster = url
            ? '<img class="cm-poster" src="' + esc(url) + '" alt="Póster de ' + esc(d.pelicula) + '">'
            : '<div class="cm-poster-vacio"><i class="fas fa-film"></i></div>';
        var cantidad = (d.funciones || []).length;
        return '<div class="cm-poster-wrap">' + poster +
            '<h2 class="cm-titulo" id="cmTitulo">' + esc(d.pelicula) + '</h2>' +
            '<div class="cm-cine"><i class="fas fa-location-dot"></i> ' + esc(d.cine) + '</div>' +
            (cantidad ? '<span class="cm-chip">' + textoFunciones(cantidad) + '</span>' : '') +
            '<button type="button" class="cm-btn-principal" data-ir="1">Ver funciones <i class="fas fa-chevron-right"></i></button>' +
            '</div>';
    }

    function htmlFila(f) {
        var precio = window.CarteleraPrecio ? window.CarteleraPrecio.celda(f) : '';
        return '<div class="cm-fila"><span class="cm-hora">' + esc(hora(f.horario)) + '</span>' + precio + '</div>';
    }

    // Sinopsis: el texto, o un placeholder mientras se la pide. Más de 220 caracteres se muestra
    // recortada, con "Ver más".
    function htmlSinopsisTexto(texto) {
        var larga = texto.length > 220;
        return '<div class="cm-sinopsis' + (larga ? ' cm-sinopsis-larga' : '') + '">' +
            '<p class="cm-sinopsis-texto">' + esc(texto) + '</p>' +
            (larga ? '<button type="button" class="cm-sinopsis-mas" aria-expanded="false">Ver más</button>' : '') +
            '</div>';
    }

    function htmlSinopsis(d) {
        if (typeof d.sinopsis === 'string' && d.sinopsis.trim()) return htmlSinopsisTexto(d.sinopsis.trim());
        if (typeof d.cargarSinopsis === 'function') {
            return '<div class="cm-sinopsis cm-sinopsis-cargando" aria-hidden="true"><span></span><span></span><span></span></div>';
        }
        return '';
    }

    function htmlSlideFunciones(d) {
        var funciones = d.funciones || [];
        var dias = agrupar(funciones);
        var variosDias = dias.length > 1;
        var cuerpo = dias.map(function (dia) {
            return (variosDias ? '<div class="cm-dia">' + esc(etiquetaDia(dia.dia, dia.esHoy)) + '</div>' : '') +
                dia.grupos.map(function (g) {
                    return '<div class="cm-grupo"><span class="cm-grupo-titulo">' + esc(g.titulo) + '</span>' +
                        g.funciones.map(htmlFila).join('') + '</div>';
                }).join('');
        }).join('');
        if (!funciones.length) cuerpo = '<div class="cm-vacio">No hay funciones para mostrar.</div>';

        // Si hay un solo día se dice junto al cine; si hay varios, cada uno lleva su título.
        var meta = textoFunciones(funciones.length);
        if (dias.length === 1) meta = etiquetaDia(dias[0].dia, dias[0].esHoy) + ' · ' + meta;
        var hayPrecio = funciones.some(function (f) { return f && f.precioReferencia != null; });

        // Dos secciones: LA PELÍCULA (título + sinopsis, sobre azul) y EL CINE (nombre + funciones,
        // en una tarjeta con forma de entrada).
        return '<div class="cm-pelicula">' +
                '<button type="button" class="cm-volver" data-ir="0"><i class="fas fa-chevron-left"></i> Póster</button>' +
                '<span class="cm-etiqueta cm-etiqueta-pelicula"><i class="fas fa-clapperboard"></i> La película</span>' +
                '<h2 class="cm-titulo">' + esc(d.pelicula) + '</h2>' +
                htmlSinopsis(d) +
            '</div>' +
            '<section class="cm-lugar" aria-label="Funciones en ' + esc(d.cine) + '">' +
                '<div class="cm-lugar-cab">' +
                    '<span class="cm-etiqueta cm-etiqueta-cine"><i class="fas fa-location-dot"></i> El cine</span>' +
                    '<div class="cm-lugar-nombre">' + esc(d.cine) + '</div>' +
                    '<div class="cm-lugar-meta">' + esc(meta) + '</div>' +
                '</div>' +
                '<div class="cm-lista">' + cuerpo + '</div>' +
            '</section>' +
            (hayPrecio && window.CarteleraPrecio
                ? '<p class="cm-nota">Precios de referencia. Confirmalos en la boletería o en la web del cine.</p>' : '');
    }

    // ---------------------------------------------------------------
    // El modal (se arma la primera vez que se abre y se reutiliza)
    // ---------------------------------------------------------------
    var overlay = null, hoja = null, track = null, slides = [], puntos = [];
    var abierto = false, slideActual = 0, abiertoPor = null, temporizadorCierre = null;
    var sesion = 0;            // cuenta las aperturas: la respuesta tardía de otra película se descarta
    var cacheSinopsis = {};    // título → texto, para no volver a pedirla al reabrir la misma película

    // Pide la sinopsis (si hace falta) y reemplaza el placeholder. Si no hay sinopsis o el pedido
    // falla, el placeholder se saca y listo: no se muestra ningún error.
    function pedirSinopsis(d, miSesion) {
        if (typeof d.cargarSinopsis !== 'function' || (typeof d.sinopsis === 'string' && d.sinopsis.trim())) return;
        var clave = String(d.pelicula).toLowerCase();
        var poner = function (texto) {
            if (miSesion !== sesion) return;                       // ya se abrió otra película
            var lugar = slides[1].querySelector('.cm-sinopsis-cargando');
            if (!lugar) return;
            if (texto) lugar.outerHTML = htmlSinopsisTexto(texto);
            else lugar.parentNode.removeChild(lugar);
        };
        if (cacheSinopsis[clave]) { poner(cacheSinopsis[clave]); return; }
        Promise.resolve().then(function () { return d.cargarSinopsis(); }).then(function (t) {
            var texto = typeof t === 'string' ? t.trim() : '';
            if (texto) cacheSinopsis[clave] = texto;               // solo se recuerda si hubo; un fallo se reintenta
            poner(texto);
        }).catch(function () { poner(''); });
    }

    function montar() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'cm-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
            '<div class="cm-sheet cm-en-poster" role="dialog" aria-modal="true" aria-labelledby="cmTitulo" tabindex="-1">' +
                '<button type="button" class="cm-cerrar" aria-label="Cerrar"><i class="fas fa-times"></i></button>' +
                '<div class="cm-track">' +
                    '<section class="cm-slide cm-slide-poster" aria-label="Póster"></section>' +
                    '<section class="cm-slide cm-slide-funciones" aria-label="Funciones"></section>' +
                '</div>' +
                '<div class="cm-puntos">' +
                    '<button type="button" class="cm-punto activo" data-ir="0" aria-label="Ver póster"></button>' +
                    '<button type="button" class="cm-punto" data-ir="1" aria-label="Ver funciones"></button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        hoja = overlay.querySelector('.cm-sheet');
        track = overlay.querySelector('.cm-track');
        slides = Array.prototype.slice.call(overlay.querySelectorAll('.cm-slide'));
        puntos = Array.prototype.slice.call(overlay.querySelectorAll('.cm-punto'));

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) { cerrar(); return; }                       // tocar el fondo
            var cerrarBtn = e.target.closest('.cm-cerrar');
            if (cerrarBtn) { cerrar(); return; }
            var mas = e.target.closest('.cm-sinopsis-mas');          // "Ver más" / "Ver menos"
            if (mas) {
                var caja = mas.closest('.cm-sinopsis');
                var abierta = caja.classList.toggle('cm-abierta');
                mas.setAttribute('aria-expanded', abierta ? 'true' : 'false');
                mas.textContent = abierta ? 'Ver menos' : 'Ver más';
                return;
            }
            var ir = e.target.closest('[data-ir]');
            if (ir) irA(Number(ir.getAttribute('data-ir')));
        });

        // Al deslizar con el dedo, los puntitos siguen al slide que quedó a la vista.
        track.addEventListener('scroll', function () {
            if (!track.clientWidth) return;
            var n = Math.round(track.scrollLeft / track.clientWidth);
            if (n !== slideActual) mostrarSlide(n);
        });

        document.addEventListener('keydown', alTeclear);
    }

    // Solo actualiza lo que se ve (puntitos, colores, qué slide está activo).
    function mostrarSlide(n) {
        slideActual = Math.max(0, Math.min(slides.length - 1, n));
        slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === slideActual ? 'false' : 'true'); });
        puntos.forEach(function (p, i) { p.classList.toggle('activo', i === slideActual); });
        hoja.classList.toggle('cm-en-poster', slideActual === 0);
    }

    // Va a un slide: actualiza lo que se ve y mueve el carrusel.
    function irA(n, suave) {
        mostrarSlide(n);
        var x = slideActual * (track.clientWidth || 0);
        var comportamiento = suave === false ? 'auto' : 'smooth';
        if (typeof track.scrollTo === 'function') track.scrollTo({ left: x, behavior: comportamiento });
        else track.scrollLeft = x;
    }

    function elementosEnfocables() {
        var lista = hoja.querySelectorAll('button:not([disabled])');
        return Array.prototype.filter.call(lista, function (b) {
            var slide = b.closest('.cm-slide');
            return !slide || slide.getAttribute('aria-hidden') !== 'true';
        });
    }

    function alTeclear(e) {
        if (!abierto) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
        if (e.key === 'ArrowRight') { irA(slideActual + 1); return; }
        if (e.key === 'ArrowLeft') { irA(slideActual - 1); return; }
        if (e.key === 'Tab') {                                   // el foco no se escapa del modal
            var lista = elementosEnfocables();
            if (!lista.length) return;
            var primero = lista[0], ultimo = lista[lista.length - 1];
            if (e.shiftKey && (document.activeElement === primero || document.activeElement === hoja)) {
                e.preventDefault(); ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault(); primero.focus();
            }
        }
    }

    function abrir(datos, origen) {
        if (!datos || typeof document === 'undefined') return;
        montar();
        clearTimeout(temporizadorCierre);
        var miSesion = ++sesion;
        slides[0].innerHTML = htmlSlidePoster(datos);
        slides[1].innerHTML = htmlSlideFunciones(datos);
        pedirSinopsis(datos, miSesion);

        // Si el póster no carga, queda el recuadro con el ícono (en vez de la imagen rota).
        var imagen = slides[0].querySelector('.cm-poster');
        if (imagen) {
            imagen.addEventListener('error', function () {
                var vacio = document.createElement('div');
                vacio.className = 'cm-poster-vacio';
                vacio.innerHTML = '<i class="fas fa-film"></i>';
                if (imagen.parentNode) imagen.parentNode.replaceChild(vacio, imagen);
            });
        }

        abiertoPor = origen || document.activeElement;
        abierto = true;
        overlay.classList.add('cm-montado');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('cm-abierto');
        track.scrollLeft = 0;
        mostrarSlide(0);                                         // siempre arranca en el póster

        var aparecer = function () {
            overlay.classList.add('cm-visible');
            var cerrarBtn = overlay.querySelector('.cm-cerrar');
            if (cerrarBtn) cerrarBtn.focus();
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(aparecer); else aparecer();
    }

    function cerrar() {
        if (!abierto) return;
        abierto = false;
        overlay.classList.remove('cm-visible');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('cm-abierto');
        temporizadorCierre = setTimeout(function () { overlay.classList.remove('cm-montado'); }, 240);
        if (abiertoPor && typeof abiertoPor.focus === 'function' && document.body.contains(abiertoPor)) {
            abiertoPor.focus();
        }
        abiertoPor = null;
    }

    inyectarEstilos();

    window.CarteleraModal = {
        abrir: abrir,
        cerrar: cerrar,
        estaAbierto: function () { return abierto; },
        slideActual: function () { return slideActual; },
        irA: irA,
        // para pruebas
        _agrupar: agrupar,
        _posterGrande: posterGrande
    };
})();
