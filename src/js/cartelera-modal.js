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
//   - cine (opcional): el nombre del cine. Si no viene, se toma de las funciones (cineNombre): con un solo
//     cine se ve igual que siempre; con VARIOS (Organizar una salida) el slide de funciones muestra arriba
//     "Tu mejor salida" (la función más barata y la más temprana) y debajo los cines apilados, ordenables.
//   - slideInicial (opcional): 1 para abrir directo en las funciones. Por defecto abre en el póster.
//   - contexto (opcional): lo que la persona eligió antes para organizar su salida, para recordárselo en
//     "Tu mejor salida": { fecha: 'AAAA-MM-DD', preferencias: ['Por la tarde', 'Hasta $20.000'] }.
//   - ahora (opcional, solo para pruebas): "HH:MM" que se toma como la hora actual.
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
    // Varios cines (Organizar una salida)
    // ---------------------------------------------------------------
    // Cuando las funciones son de más de un cine, el slide de funciones cambia: arriba "Tu mejor salida"
    // (la función más barata y la más temprana) y abajo todos los cines apilados, que se pueden ordenar.
    var CINES_VISIBLES = 3;          // cuántos cines se ven antes de "Ver N cines más"
    var salidaActual = null;         // { cines, ahora, expandida } mientras hay un modal de varios cines abierto

    // Agrupa las funciones por cine, en el orden en que aparecen.  → [{ nombre, funciones: [...] }]
    function agruparPorCine(funciones) {
        var orden = [], mapa = {};
        (funciones || []).forEach(function (f) {
            var nombre = String((f && f.cineNombre) || '').trim();
            if (!mapa[nombre]) { mapa[nombre] = { nombre: nombre, funciones: [] }; orden.push(mapa[nombre]); }
            mapa[nombre].funciones.push(f);
        });
        return orden;
    }

    // Hora actual de Argentina ("HH:MM"), la misma en cualquier teléfono o computadora.
    function ahoraArgentina() {
        try {
            var texto = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false
            }).format(new Date());
            return texto.replace(/^24/, '00');                     // algunos motores dicen "24:05" a la medianoche
        } catch (e) {
            var d = new Date();
            return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        }
    }

    // "01:20" → 1520: las funciones de madrugada (00:00 a 04:59) van después de las de la noche.
    function minutosOrden(h) {
        var p = String(h || '').split(':');
        var m = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
        return m < 300 ? m + 1440 : m;
    }

    // ¿Esta función de hoy ya empezó? Una de madrugada todavía no, mientras sea de día.
    function yaEmpezo(f, ahora) {
        if (!f || !f.esHoy) return false;
        var h = hora(f.horario);
        if (h < '05:00' && ahora >= '05:00') return false;
        return h < ahora;
    }

    // El precio con el que se compara una función. Es el mismo criterio del filtro de presupuesto: un 2x1 no
    // baja lo que paga quien va solo. null si la función no tiene precio de referencia.
    function precioOrden(f) {
        if (!f || f.precioReferencia == null) return null;
        var p = window.CarteleraPrecio ? window.CarteleraPrecio.precioParaPresupuesto(f) : f.precioReferencia;
        return p == null ? null : p;
    }

    // El precio como se ve en la pantalla: "$17.800" (y "c/u" si es un 2x1). Vacío si no hay.
    function textoPrecio(f) {
        if (!f || f.precioReferencia == null || !window.CarteleraPrecio) return '';
        return window.CarteleraPrecio.monto(f.precioReferencia) + (f.promocion === '2X1' ? ' c/u' : '');
    }

    // La función más barata y la más temprana entre las que TODAVÍA no empezaron. Desempata la más barata por
    // horario y la más temprana por precio. → { barata: {f, cine}|null, temprana: {f, cine}|null }
    function elegirMejores(cines, ahora) {
        var barata = null, temprana = null;
        var antes = function (a, b) { return minutosOrden(hora(a.horario)) - minutosOrden(hora(b.horario)); };
        cines.forEach(function (c) {
            c.funciones.forEach(function (f) {
                if (yaEmpezo(f, ahora)) return;
                var x = { f: f, cine: c.nombre };
                var p = precioOrden(f);
                if (p != null) {
                    var pb = barata ? precioOrden(barata.f) : null;
                    if (!barata || p < pb || (p === pb && antes(f, barata.f) < 0)) barata = x;
                }
                if (!temprana) { temprana = x; return; }
                var d = antes(f, temprana.f);
                if (d < 0) { temprana = x; return; }
                if (d === 0) {
                    var pt = precioOrden(temprana.f);
                    if (p != null && (pt == null || p < pt)) temprana = x;
                }
            });
        });
        return { barata: barata, temprana: temprana };
    }

    // Ordena los cines: por el precio más bajo o por el horario más temprano (solo cuentan las funciones que
    // todavía no empezaron). Los cines sin dato van al final; el empate se desempata por el otro criterio y por nombre.
    function ordenarCines(cines, criterio, ahora) {
        var NULO = 1e9;
        var claves = cines.map(function (c) {
            var precio = null, hor = null;
            c.funciones.forEach(function (f) {
                if (yaEmpezo(f, ahora)) return;
                var p = precioOrden(f);
                if (p != null && (precio == null || p < precio)) precio = p;
                var m = minutosOrden(hora(f.horario));
                if (hor == null || m < hor) hor = m;
            });
            return { c: c, p: precio == null ? NULO : precio, h: hor == null ? NULO : hor };
        });
        claves.sort(function (a, b) {
            var d = criterio === 'hora' ? (a.h - b.h || a.p - b.p) : (a.p - b.p || a.h - b.h);
            return d || String(a.c.nombre).localeCompare(String(b.c.nombre));
        });
        return claves.map(function (x) { return x.c; });
    }

    function textoVerMas(n) {
        return n === 1 ? 'Ver 1 cine más' : 'Ver ' + n + ' cines más';
    }

    // La marca de una función que no tiene el precio de siempre: "2x1" o "Reducida". Vacío si no corresponde.
    function htmlMarcaFuncion(f) {
        if (f.promocion === '2X1') return '<span class="cm-chip-tag cm-chip-tag-2x1">2x1</span>';
        return f.tarifaReducida ? '<span class="cm-chip-tag cm-chip-tag-reducida">Reducida</span>' : '';
    }

    // Un horario, como botoncito: la hora, el precio debajo y, si corresponde, "2x1" o "Reducida".
    function htmlChipFuncion(f) {
        var precio = textoPrecio(f);
        return '<div class="cm-chip-f"><b>' + esc(hora(f.horario)) + '</b><small>' + (precio ? esc(precio) : '—') + '</small>' + htmlMarcaFuncion(f) + '</div>';
    }

    // Un cine: tarjeta con forma de entrada, con su precio más bajo y sus horarios.
    function htmlTicketCine(c, idx, oculto, mostrarDia) {
        var dias = agrupar(c.funciones);
        var variosDias = mostrarDia || dias.length > 1;          // si el modal mezcla días, cada tarjeta dice el suyo
        var cantidadGrupos = 0;
        dias.forEach(function (d) { cantidadGrupos += d.grupos.length; });
        var unSoloFormato = !variosDias && cantidadGrupos === 1;   // un solo formato va en la línea de abajo, no como título
        var cuerpo = dias.map(function (dia) {
            return (variosDias ? '<div class="cm-dia">' + esc(etiquetaDia(dia.dia, dia.esHoy)) + '</div>' : '') +
                dia.grupos.map(function (g) {
                    return (unSoloFormato ? '' : '<div class="cm-grupo"><span class="cm-grupo-titulo">' + esc(g.titulo) + '</span></div>') +
                        '<div class="cm-chips-f">' + g.funciones.map(htmlChipFuncion).join('') + '</div>';
                }).join('');
        }).join('');
        var meta = (unSoloFormato ? dias[0].grupos[0].titulo + ' · ' : '') + textoFunciones(c.funciones.length);

        var conPrecio = c.funciones.filter(function (f) { return f.precioReferencia != null; });
        var desde = '';
        if (conPrecio.length && window.CarteleraPrecio) {
            var minimo = Math.min.apply(null, conPrecio.map(function (f) { return f.precioReferencia; }));
            var varios = conPrecio.length < c.funciones.length ||
                conPrecio.some(function (f) { return f.precioReferencia !== minimo; });
            desde = '<div class="cm-t-desde">' + (varios ? '<small>Desde</small>' : '') +
                '<b>' + esc(window.CarteleraPrecio.monto(minimo)) + '</b></div>';
        }
        return '<section class="cm-lugar cm-ticket' + (oculto ? ' cm-oculto' : '') + '" data-cine="' + idx + '" aria-label="Funciones en ' + esc(c.nombre) + '">' +
            '<div class="cm-lugar-cab cm-t-cab"><div class="cm-t-fila">' +
                '<span class="cm-t-icono"><i class="fas fa-location-dot"></i></span>' +
                '<div class="cm-t-txt"><div class="cm-lugar-nombre">' + esc(c.nombre || 'Cine') + '</div>' +
                    '<div class="cm-lugar-meta">' + esc(meta) + '</div></div>' + desde +
            '</div></div>' +
            '<div class="cm-lista cm-t-lista">' + cuerpo + '</div>' +
            '</section>';
    }

    // Una de las dos recomendaciones: el cine, la hora y el precio, con su etiqueta.
    function htmlPick(x, etiquetas) {
        var f = x.f;
        var formato = [f.formato, f.idioma].filter(Boolean).join(' · ');
        var precio = textoPrecio(f);
        var marca = htmlMarcaFuncion(f);
        var ets = etiquetas.map(function (e) {
            return '<span class="cm-pick-et cm-pick-et-' + e.clase + '"><i class="fas ' + e.icono + '"></i> ' + esc(e.texto) + '</span>';
        }).join('');
        return '<div class="cm-pick"><div class="cm-pick-ets">' + ets + '</div>' +
            '<div class="cm-pick-fila"><span class="cm-t-icono"><i class="fas fa-location-dot"></i></span>' +
                '<div class="cm-t-txt"><div class="cm-pick-cine">' + esc(x.cine || 'Cine') + '</div>' +
                    ((formato || marca) ? '<div class="cm-pick-meta">' + esc(formato) + (formato && marca ? ' ' : '') + marca + '</div>' : '') + '</div>' +
                '<div class="cm-pick-dato"><b>' + esc(hora(f.horario)) + '</b>' + (precio ? '<span>' + esc(precio) + '</span>' : '') + '</div>' +
            '</div></div>';
    }

    // La banda azul con el título y la sinopsis: la misma que en el slide de un solo cine. "extra" es lo que se
    // quiera sumar al final de la banda (acá, el título de "Tu mejor salida").
    function htmlBandaPelicula(d, extra) {
        return '<div class="cm-pelicula">' +
            '<button type="button" class="cm-volver" data-ir="0"><i class="fas fa-chevron-left"></i> Póster</button>' +
            '<span class="cm-etiqueta cm-etiqueta-pelicula"><i class="fas fa-clapperboard"></i> La película</span>' +
            '<h2 class="cm-titulo">' + esc(d.pelicula) + '</h2>' +
            htmlSinopsis(d) +
            (extra || '') +
            '</div>';
    }

    // "2026-10-09" → "09/10/2026". Vacío si no es una fecha con ese formato.
    function formatearFecha(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
        return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
    }

    // El título de "Tu mejor salida", dentro de la banda azul. Le recuerda a la persona lo que eligió antes para
    // organizar su salida: el día y, si los indicó, la franja horaria y el presupuesto.
    //   contexto: { fecha: 'AAAA-MM-DD', preferencias: ['Por la tarde', 'Hasta $20.000'] }   (todo opcional)
    // Si no vino la fecha se usa el día de las funciones.
    function htmlTituloMejorSalida(contexto, diaDeLasFunciones) {
        var c = contexto || {};
        var fecha = formatearFecha(c.fecha) || formatearFecha(diaDeLasFunciones);
        var prefs = (c.preferencias || []).filter(function (p) { return p && String(p).trim(); });
        return '<div class="cm-mejor"><span class="cm-mejor-titulo">Tu mejor salida' + (fecha ? ' para el día ' + esc(fecha) : '') + '</span>' +
            (prefs.length ? '<span class="cm-mejor-pref">' + prefs.map(function (p) { return esc(p); }).join(' · ') + '</span>' : '') +
            '</div>';
    }

    // Slide de funciones cuando hay varios cines. Las recomendaciones solo se arman si todas las funciones son
    // de un mismo día (en Organizar una salida siempre lo son): "la más barata" entre días no tendría sentido.
    function htmlSlideFuncionesVarios(d) {
        var cines = d.cines;
        var funciones = d.funciones || [];
        var ahora = d.ahora || ahoraArgentina();
        var dias = agrupar(funciones);
        var unDia = dias.length === 1;

        var mejores = unDia ? elegirMejores(cines, ahora) : { barata: null, temprana: null };
        var picks = '', titulo = '';
        if (mejores.barata || mejores.temprana) {
            var etBarata = { clase: 'barata', icono: 'fa-tag', texto: 'La más barata' };
            var esHoy = !!(mejores.temprana && mejores.temprana.f.esHoy);
            var etTemprana = { clase: 'temprana', icono: 'fa-clock', texto: esHoy ? 'La próxima' : 'La más temprana' };
            var misma = mejores.barata && mejores.temprana && mejores.barata.f === mejores.temprana.f;
            picks = '<div class="cm-picks">' +
                (misma ? htmlPick(mejores.barata, [etBarata, etTemprana])
                    : (mejores.barata ? htmlPick(mejores.barata, [etBarata]) : '') +
                      (mejores.temprana ? htmlPick(mejores.temprana, [etTemprana]) : '')) +
                '</div>';
            titulo = htmlTituloMejorSalida(d.contexto, unDia ? dias[0].dia : '');
        }

        // La lista de abajo no repite las funciones que ya se recomendaron arriba. Los cines que se quedan sin
        // funciones no aparecen, y si no queda ninguna función no se muestra la lista (ni su título ni el orden).
        var recomendadas = [];
        if (mejores.barata) recomendadas.push(mejores.barata.f);
        if (mejores.temprana) recomendadas.push(mejores.temprana.f);
        var restantes = cines.map(function (c) {
            return { nombre: c.nombre, funciones: c.funciones.filter(function (f) { return recomendadas.indexOf(f) < 0; }) };
        }).filter(function (c) { return c.funciones.length; });
        var cantidad = 0;
        restantes.forEach(function (c) { cantidad += c.funciones.length; });

        salidaActual = { cines: restantes, ahora: ahora, expandida: false };
        var ordenados = ordenarCines(restantes, 'precio', ahora);
        var pila = ordenados.map(function (c, i) { return htmlTicketCine(c, restantes.indexOf(c), i >= CINES_VISIBLES, !unDia); }).join('');
        var ocultos = Math.max(0, restantes.length - CINES_VISIBLES);
        var hayPrecio = funciones.some(function (f) { return f && f.precioReferencia != null; });

        var lista = '';
        if (restantes.length) {
            lista = '<div class="cm-seccion cm-seccion-todas">' + (recomendadas.length ? 'Más funciones' : 'Todas las funciones') + ' · ' + cantidad + '</div>' +
                (unDia ? '<div class="cm-seccion-dia">' + esc(etiquetaDia(dias[0].dia, dias[0].esHoy)) + '</div>' : '') +
                (restantes.length > 1
                    ? '<div class="cm-orden" role="group" aria-label="Ordenar los cines"><span>Ordenar</span>' +
                        '<button type="button" class="cm-orden-btn on" data-orden="precio" aria-pressed="true">Más barata</button>' +
                        '<button type="button" class="cm-orden-btn" data-orden="hora" aria-pressed="false">Más temprano</button></div>'
                    : '') +
                '<div class="cm-pila">' + pila + '</div>' +
                (ocultos ? '<button type="button" class="cm-mas-cines">' + textoVerMas(ocultos) + ' <i class="fas fa-chevron-down"></i></button>' : '');
        }

        return htmlBandaPelicula(d, titulo) + picks + lista +
            (hayPrecio && window.CarteleraPrecio
                ? '<p class="cm-nota">Precios de referencia. Confirmalos en la boletería o en la web del cine.</p>' : '');
    }

    // Reordena los cines que ya están en pantalla y marca qué orden está elegido.
    function aplicarOrden(criterio) {
        if (!salidaActual || !hoja) return;
        var pila = hoja.querySelector('.cm-pila');
        if (!pila) return;
        ordenarCines(salidaActual.cines, criterio, salidaActual.ahora).forEach(function (c, i) {
            var t = pila.querySelector('[data-cine="' + salidaActual.cines.indexOf(c) + '"]');
            if (!t) return;
            pila.appendChild(t);
            t.classList.toggle('cm-oculto', !salidaActual.expandida && i >= CINES_VISIBLES);
        });
        Array.prototype.forEach.call(hoja.querySelectorAll('.cm-orden-btn'), function (b) {
            var activo = b.getAttribute('data-orden') === criterio;
            b.classList.toggle('on', activo);
            b.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });
    }

    // "Ver N cines más": muestra los que faltaban y saca el botón (el foco pasa a la hoja, para no perderse).
    function verMasCines() {
        if (!salidaActual || !hoja) return;
        salidaActual.expandida = true;
        Array.prototype.forEach.call(hoja.querySelectorAll('.cm-ticket'), function (t) { t.classList.remove('cm-oculto'); });
        var boton = hoja.querySelector('.cm-mas-cines');
        if (boton && boton.parentNode) boton.parentNode.removeChild(boton);
        if (typeof hoja.focus === 'function') hoja.focus({ preventScroll: true });
    }

    // Copia los datos y resuelve el cine: el que vino, o el que dicen las funciones. Si son varios, "cines" tiene
    // la lista y "cine" dice cuántos son (así lo muestra el póster).
    function prepararDatos(datos) {
        var d = {};
        for (var k in datos) { if (Object.prototype.hasOwnProperty.call(datos, k)) d[k] = datos[k]; }
        if (!d.cine || !String(d.cine).trim()) {
            var cines = agruparPorCine(d.funciones);
            if (cines.length > 1) { d.cines = cines; d.cine = cines.length + ' cines'; }
            else if (cines.length === 1) d.cine = cines[0].nombre;
        }
        return d;
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
        '.cm-vacio { padding: 16px 0 8px; font-size: .85rem; color: #8a8478; }',

        // — Varios cines (Organizar una salida): "Tu mejor salida" y los cines apilados
        '.cm-seccion { margin: 0 0 8px 4px; font-size: .64rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: rgba(255,255,255,.9); }',
        '.cm-picks { position: relative; margin: -22px 14px 0; }',
        '.cm-mejor { margin: 16px 0 0; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.16); }',
        '.cm-mejor-titulo { display: block; font-size: .95rem; font-weight: 800; letter-spacing: .05em; line-height: 1.3; text-transform: uppercase; color: #fff; }',
        '.cm-mejor-pref { display: block; margin-top: 4px; font-size: .88rem; font-weight: 700; line-height: 1.35; color: #ffb4a8; }',
        '.cm-pick { margin-bottom: 10px; padding: 11px 14px 12px; border-radius: 16px; background: #fff; box-shadow: 0 12px 16px -10px rgba(20,4,2,.5); }',
        '.cm-pick-ets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }',
        '.cm-pick-et { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-size: .62rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }',
        '.cm-pick-et-barata { color: #1b6b45; background: #e3f4ea; }',
        '.cm-pick-et-temprana { color: #16264d; background: rgba(22,38,77,.09); }',
        '.cm-pick-fila, .cm-t-fila { display: flex; align-items: center; gap: 11px; }',
        '.cm-t-icono { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: .85rem; color: #fff; background: #16264d; }',
        '.cm-t-txt { flex: 1; min-width: 0; }',
        '.cm-pick-cine { font-family: "Space Grotesk", sans-serif; font-size: .98rem; font-weight: 800; line-height: 1.2; color: #16151a; }',
        '.cm-pick-meta { margin-top: 1px; font-size: .74rem; color: #8a8478; }',
        '.cm-pick-dato { text-align: right; line-height: 1.15; }',
        '.cm-pick-dato b { display: block; font-family: "Space Grotesk", sans-serif; font-size: 1.25rem; font-weight: 800; color: #16151a; }',
        '.cm-pick-dato span { font-size: .78rem; font-weight: 800; color: #c4321f; }',
        '.cm-seccion-todas { margin: 18px 18px 2px; }',
        '.cm-pelicula + .cm-seccion-todas { margin-top: -22px; }',
        '.cm-seccion-dia { margin: 0 18px 8px; font-size: .78rem; font-weight: 700; color: rgba(255,255,255,.8); }',
        '.cm-seccion-dia::first-letter { text-transform: uppercase; }',
        '.cm-orden { display: flex; align-items: center; gap: 8px; margin: 10px 14px 0; }',
        '.cm-orden > span { font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.8); }',
        '.cm-orden-btn { border: 0; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: .74rem; font-weight: 700; color: #fff; background: rgba(255,255,255,.18); white-space: nowrap; }',
        '.cm-orden-btn.on { color: #16264d; background: #fff; }',
        '.cm-orden-btn:focus-visible, .cm-mas-cines:focus-visible { outline: 2px solid #ffb4a8; outline-offset: 2px; }',
        '.cm-pila { display: flex; flex-direction: column; gap: 14px; padding: 12px 14px 0; }',
        '.cm-pila .cm-lugar { margin: 0; }',
        '.cm-oculto { display: none; }',
        '.cm-t-cab { padding-bottom: 12px; }',
        '.cm-t-desde { text-align: right; line-height: 1.1; }',
        '.cm-t-desde small { display: block; font-size: .62rem; color: #8a8478; }',
        '.cm-t-desde b { font-family: "Space Grotesk", sans-serif; font-size: 1rem; font-weight: 800; color: #16151a; }',
        '.cm-t-lista { padding-bottom: 14px; }',
        '.cm-chips-f { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }',
        '.cm-chip-f { min-width: 74px; padding: 7px 10px 6px; border: 1px solid #e4dfd3; border-radius: 12px; text-align: center; background: #fff; }',
        '.cm-chip-f b { display: block; font-family: "Space Grotesk", sans-serif; font-size: 1rem; font-weight: 800; line-height: 1.15; color: #16151a; }',
        '.cm-chip-f small { display: block; margin-top: 1px; font-size: .68rem; font-weight: 700; color: #8a8478; }',
        '.cm-chip-tag { display: inline-block; margin-top: 3px; padding: 1px 6px; border-radius: 6px; font-size: .58rem; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; }',
        '.cm-chip-tag-2x1 { color: #1b6b45; background: #e3f4ea; }',
        '.cm-chip-tag-reducida { color: #16264d; background: rgba(22,38,77,.09); }',
        '.cm-mas-cines { display: block; margin: 14px auto 0; border: 0; border-radius: 999px; padding: 10px 20px; cursor: pointer; font-size: .82rem; font-weight: 700; color: #fff; background: rgba(255,255,255,.18); }',

        // — Sin slide de póster (Organizar una salida): solo las funciones, sin puntitos ni "‹ Póster"
        '.cm-sheet.cm-solo-funciones .cm-slide-poster, .cm-sheet.cm-solo-funciones .cm-puntos, .cm-sheet.cm-solo-funciones .cm-volver { display: none; }',
        '.cm-sheet.cm-solo-funciones .cm-slide-funciones { padding-bottom: 24px; }'
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
    var soloFunciones = false;    // true mientras el modal abierto no tiene slide de póster
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
            var orden = e.target.closest('.cm-orden-btn');           // "Más barata" / "Más temprano"
            if (orden) { aplicarOrden(orden.getAttribute('data-orden')); return; }
            if (e.target.closest('.cm-mas-cines')) { verMasCines(); return; }
            var ir = e.target.closest('[data-ir]');
            if (ir) irA(Number(ir.getAttribute('data-ir')));
        });

        // Al deslizar con el dedo, los puntitos siguen al slide que quedó a la vista.
        track.addEventListener('scroll', function () {
            if (soloFunciones || !track.clientWidth) return;
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
        if (soloFunciones) n = 1;                                // sin póster: la única pantalla es la de funciones
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
        datos = prepararDatos(datos);                            // copia; resuelve si son uno o varios cines
        salidaActual = null;
        soloFunciones = datos.soloFunciones === true;            // sin slide de póster (Organizar una salida)
        hoja.classList.toggle('cm-solo-funciones', soloFunciones);
        if (soloFunciones) { hoja.removeAttribute('aria-labelledby'); hoja.setAttribute('aria-label', String(datos.pelicula || '')); }
        else { hoja.setAttribute('aria-labelledby', 'cmTitulo'); hoja.removeAttribute('aria-label'); }
        slides[0].innerHTML = soloFunciones ? '' : htmlSlidePoster(datos);
        slides[1].innerHTML = datos.cines ? htmlSlideFuncionesVarios(datos) : htmlSlideFunciones(datos);
        slides[0].scrollTop = 0;                                 // cada apertura empieza arriba
        slides[1].scrollTop = 0;
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
        var inicial = (soloFunciones || datos.slideInicial === 1) ? 1 : 0;   // por defecto arranca en el póster
        track.scrollLeft = soloFunciones ? 0 : inicial * (track.clientWidth || 0);   // sin animación
        mostrarSlide(inicial);

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