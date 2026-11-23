// ==============================================
// volver.js — Volver a donde estaba después de ingresar o registrarse
// ==============================================
// Una página que manda a ingresar (por ejemplo, /actividad?c=...) guarda su
// dirección con cmVolver.guardar() y abre login.html?volver=...
// Login, Google y el registro la leen con cmVolver.destino() y, al terminar,
// vuelven ahí en lugar de ir al dashboard.
//
// - Solo acepta direcciones internas ("/algo"), nunca otro sitio.
// - Dura 24 horas: alcanza para registrarse y verificar el mail en el mismo
//   navegador, sin que días después un login normal termine en otro lado.
window.cmVolver = {
    CLAVE: 'volverDespuesDeLogin',
    VIGENCIA_MS: 24 * 60 * 60 * 1000,

    _segura: function (ruta) {
        if (typeof ruta !== 'string') return null;
        ruta = ruta.trim();
        // "/actividad?c=x" sí; "//otro.com", "https://...", "/\otro" no.
        if (!/^\/(?![\/\\])/.test(ruta) || ruta.indexOf('\\') !== -1) return null;
        if (/^\/(login|register)(\.html)?([?#]|$)/i.test(ruta)) return null;
        return ruta;
    },

    guardar: function (ruta) {
        const segura = this._segura(ruta);
        if (!segura) return;
        try {
            localStorage.setItem(this.CLAVE, JSON.stringify({ ruta: segura, ts: Date.now() }));
        } catch (e) { /* sin almacenamiento: queda el ?volver= de la dirección */ }
    },

    destino: function () {
        const deLaDireccion = this._segura(new URLSearchParams(location.search).get('volver'));
        if (deLaDireccion) return deLaDireccion;
        try {
            const guardado = JSON.parse(localStorage.getItem(this.CLAVE) || 'null');
            if (guardado && Date.now() - guardado.ts < this.VIGENCIA_MS) return this._segura(guardado.ruta);
        } catch (e) { /* dato roto: se ignora */ }
        return null;
    },

    limpiar: function () {
        try { localStorage.removeItem(this.CLAVE); } catch (e) { /* nada */ }
    },

    // Devuelve el destino y lo borra, para usarlo una sola vez.
    usar: function () {
        const d = this.destino();
        this.limpiar();
        return d;
    },

    // "login.html" → "login.html?volver=%2Factividad%3Fc%3Dx" (si hay destino)
    conVolver: function (pagina) {
        const d = this.destino();
        return d ? pagina + (pagina.indexOf('?') === -1 ? '?' : '&') + 'volver=' + encodeURIComponent(d) : pagina;
    }
};

// Al llegar con ?volver=, se guarda (sirve para el ida y vuelta del mail de
// verificación) y los enlaces entre login y registro lo pasan de mano.
(function () {
    const d = window.cmVolver._segura(new URLSearchParams(location.search).get('volver'));
    if (d) window.cmVolver.guardar(d);
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.cmVolver.destino()) return;
        document.querySelectorAll('a[href]').forEach(function (a) {
            const href = a.getAttribute('href');
            if (/^\/?(login|register)\.html$/.test(href)) a.setAttribute('href', window.cmVolver.conVolver(href));
        });
    });
})();
