// ==============================================
// cartelera-precio.js - Cómo se muestra el precio de una función
// ==============================================
// Pieza compartida por los cinco atajos de Cartelera (Hoy cerca tuyo, Ya sé
// qué quiero ver, ¿Alguna recomendación?, Organizar una salida y Por cadena
// de cine). Cada función llega del backend con los datos de precio que
// tenga — ninguno, uno o varios — y esta pieza arma el bloque con lo que
// haya: no deja huecos ni inventa un dato que no vino.
//
// Campos de precio de una función (cualquiera puede faltar):
//   precioReferencia   lo que cuesta la entrada ese día (null = sin precio)
//   precioRegular      la tarifa regular de ese día
//   tarifaReducida     el precio de referencia es una tarifa reducida
//   promocion          "2X1": el precio es por entrada, comprando de a dos
//   tarifaDescripcion  cuándo rige esa tarifa ("Lun a mié")
//   precioOnline       precio comprando por web, si es menor
//   precioDesde        el cine tiene salas premium: el precio es el de la sala base
//
// Qué se muestra, en este orden y como máximo tres elementos:
//   1. El monto ("Desde $17.800"; con "c/u" si es un 2x1; "—" si no hay precio).
//   2. Una etiqueta si no es el precio de siempre: "2x1 · Miércoles" o la
//      descripción de la tarifa reducida ("Lun a mié"), con el regular tachado.
//   3. En las filas de detalle, "Online $X" si comprando online sale menos.
(function () {
    function esc(texto) {
        return String(texto).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function monto(n) {
        return '$' + Math.round(n).toLocaleString('es-AR');
    }

    // "13:20:00" → "13:20"
    function hora(h) {
        return h ? String(h).slice(0, 5) : '';
    }

    function tienePrecio(f) {
        return f != null && f.precioReferencia != null;
    }

    // Precio con el que se compara contra el presupuesto: un 2x1 no baja lo
    // que paga quien va solo, así que cuenta la entrada regular.
    function precioParaPresupuesto(f) {
        return f.promocion === '2X1' ? f.precioRegular : f.precioReferencia;
    }

    function etiqueta(f) {
        var descripcion = f.tarifaDescripcion ? esc(f.tarifaDescripcion) : '';
        if (f.promocion === '2X1') {
            return '<span class="cp-tag cp-tag-2x1">2x1 · ' + (descripcion || 'de a dos') + '</span>';
        }
        if (f.tarifaReducida) {
            return '<span class="cp-tag cp-tag-reducida">' + (descripcion || 'Precio reducido') + '</span>';
        }
        return '';
    }

    function tachado(f) {
        var esDosPorUno = f.promocion === '2X1';
        if (f.tarifaReducida && !esDosPorUno && f.precioRegular != null && f.precioRegular > f.precioReferencia) {
            return '<span class="cp-tachado">' + monto(f.precioRegular) + '</span>';
        }
        return '';
    }

    function linea(f, conDesde) {
        var prefijo = conDesde ? '<span class="cp-desde">Desde</span>' : '';
        var porPersona = f.promocion === '2X1' ? '<span class="cp-cu">c/u</span>' : '';
        return tachado(f) + prefijo + '<span class="cp-monto">' + monto(f.precioReferencia) + '</span>' + porPersona;
    }

    // Bloque de precio de UNA función, para filas de tabla.
    function celda(f) {
        if (!tienePrecio(f)) return '<span class="cp-sin">—</span>';
        var online = f.precioOnline != null
            ? '<span class="cp-online">Online ' + monto(f.precioOnline) + '</span>'
            : '';
        return '<div class="cp-celda"><div class="cp-linea">' + linea(f, f.precioDesde) + '</div>' +
            etiqueta(f) + online + '</div>';
    }

    // Resumen de varias funciones (una película en un cine, o en varios), para
    // tarjetas compactas: el precio más bajo entre las que tienen precio.
    // Dice "Desde" si hay más de un precio posible. Vacío si ninguna tiene.
    function resumen(funciones) {
        var conPrecio = (funciones || []).filter(tienePrecio);
        if (!conPrecio.length) return '';
        var mejor = conPrecio.reduce(function (a, b) {
            return b.precioReferencia < a.precioReferencia ? b : a;
        });
        var hayVariosPrecios = conPrecio.length < funciones.length ||
            conPrecio.some(function (f) { return f.precioReferencia !== mejor.precioReferencia; });
        return '<div class="cp-resumen">' + linea(mejor, mejor.precioDesde || hayVariosPrecios) +
            etiqueta(mejor) + '</div>';
    }

    window.CarteleraPrecio = {
        celda: celda,
        resumen: resumen,
        hora: hora,
        monto: monto,
        precioParaPresupuesto: precioParaPresupuesto
    };
})();
