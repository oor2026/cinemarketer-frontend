// ==============================================
// BOTÓN «ATRÁS» DEL CELULAR PARA LOS MODALES DE PELÍCULA Y SERIE  (v6)
//
// Reglas que cumple:
//   1) «Atrás» cierra la capa de más arriba que esté abierta: selector de versión del tráiler, hoja de comentarios, modal de película o de serie.
//   2) Fuera de esas capas «atrás» NO hace nada: ni cambia de módulo (queda como siempre) ni cierra la aplicación.
//
// Cómo lo logra: en el primer toque de la persona se arma un «colchón» de entradas en el historial del navegador y cada entrada lleva su número
// (history.state.n). El freno sabe SIEMPRE en qué número está parado y cuál es el de más arriba (top). Cada vez que el navegador vuelve a una
// entrada de más abajo (un «atrás»), se cierra una capa si hay alguna y se vuelve de inmediato al top, calculando cuántas entradas saltar con el
// número real (no «una más»). Si la persona toca «atrás» muy rápido varias veces, el colchón absorbe los toques y después de un instante de
// calma se vuelve a asegurar la posición, así que no se puede gastar el colchón de a poco ni salir de la aplicación.
// Las entradas SOLO se crean durante un toque real de la persona: el navegador ignora (salta) las entradas que una página agrega sin que nadie
// haya tocado nada, y por eso ahí el «atrás» no se puede frenar (ver «splash» abajo).
//
// Qué toca: solo modal de película, modal de serie, su hoja de comentarios y el selector de versión. Ningún otro modal y ningún módulo.
// El dashboard le pasa cada «popstate» a alRetroceder(); mientras no esté armado devuelve false y el dashboard frena como siempre.
// ==============================================
(function () {
    if (window._atrasModal) return;

    const COLCHON = 8;                       // entradas de reserva que se arman en el primer toque
    const ESPERA_ASEGURAR = 250;             // ms de calma después del último «atrás» para volver a asegurar la posición
    const SID = Math.random().toString(36).slice(2) + Date.now().toString(36);   // distingue las entradas de ESTA carga de las de cargas anteriores
    let armado = false, pos = 0, top = 0, temporizador = null;

    const abierto = (id) => { const m = document.getElementById(id); return !!m && m.style.display === 'flex'; };
    const propia = (s) => !!s && s.atras === true && s.sid === SID && typeof s.n === 'number';

    // ----------------------------------------------------------------------------------------------
    // MODO DIAGNÓSTICO (apagado por defecto): «?atrasdebug=1» lo enciende y «?atrasdebug=0» lo apaga.
    // Muestra en pantalla qué pasa con el historial y guarda las últimas líneas, para verlas al volver a entrar si la app se cierra.
    // ----------------------------------------------------------------------------------------------
    const VERSION = 'atras-modal v6';
    let anotar = () => {};
    try {
        const q = new URLSearchParams(location.search).get('atrasdebug');
        if (q === '1') localStorage.setItem('atrasDebug', '1');
        if (q === '0') localStorage.removeItem('atrasDebug');
        if (localStorage.getItem('atrasDebug') === '1') {
            const lineas = JSON.parse(localStorage.getItem('atrasLog') || '[]').map(l => '↩ ' + l);
            let caja = null;
            const pintar = () => {
                if (!document.body) return;
                if (!caja) { caja = document.createElement('pre'); caja.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;margin:0;padding:4px 6px;max-height:45vh;overflow:auto;background:rgba(0,0,0,.82);color:#7CFC00;font:10px/1.25 monospace;pointer-events:none;white-space:pre-wrap'; document.body.appendChild(caja); }
                caja.textContent = lineas.slice(-28).join('\n');
            };
            anotar = (txt) => {
                lineas.push(new Date().toTimeString().slice(0, 8) + ' ' + txt + ' | n=' + pos + '/' + top + ' len=' + history.length);
                try { localStorage.setItem('atrasLog', JSON.stringify(lineas.filter(x => x.charAt(0) !== '↩').slice(-25))); } catch (e) {}
                pintar();
            };
            anotar(VERSION + ' cargado');
            document.addEventListener('DOMContentLoaded', pintar);
            window.addEventListener('pagehide', () => anotar('pagehide (la página se va)'));
        }
    } catch (e) { /* el diagnóstico nunca debe romper nada */ }

    // ----------------------------------------------------------------------------------------------
    // Capas
    // ----------------------------------------------------------------------------------------------
    function cerrarCapaSuperior() {
        const tv = document.getElementById('tvHoja');
        if (tv) { const x = tv.querySelector('.tv-cerrar'); if (x) x.click(); else tv.remove(); return true; }
        if (document.querySelector('#modalSerie .modal-fila-comentarios.comentarios-sheet-open') && typeof window.cerrarComentariosSheetSerie === 'function') { window.cerrarComentariosSheetSerie(); return true; }
        if (document.querySelector('#modalPelicula .modal-fila-comentarios.comentarios-sheet-open') && typeof window.cerrarComentariosSheet === 'function') { window.cerrarComentariosSheet(); return true; }
        if (abierto('modalPelicula') && typeof window.cerrarModal === 'function') { window.cerrarModal(); return true; }
        if (abierto('modalSerie') && typeof window.cerrarModalSerie === 'function') { window.cerrarModalSerie(); return true; }
        return false;
    }

    // ----------------------------------------------------------------------------------------------
    // Historial: colchón, numeración y vuelta al top
    // ----------------------------------------------------------------------------------------------
    const marcar = (n) => { try { history.replaceState({ atras: true, sid: SID, n }, '', location.href); return true; } catch (e) { return false; } };

    function empujar() {                      // una entrada más arriba de todo (sirve para que el «atrás» de un modal no cambie la URL)
        if (!armado) return;
        try { history.pushState({ atras: true, sid: SID, n: top + 1 }, '', location.href); top += 1; pos = top; anotar('entrada nueva'); } catch (e) { /* sin historial: el modal funciona igual */ }
    }

    // Se arma en el PRIMER toque (no antes): solo así las entradas cuentan como creadas por la persona y el navegador no las saltea.
    function armar() {
        if (armado) return;
        armado = true;
        try {
            if (!marcar(0)) throw new Error('sin historial');
            for (let i = 1; i <= COLCHON; i++) history.pushState({ atras: true, sid: SID, n: i }, '', location.href);
            top = COLCHON; pos = COLCHON;
            anotar('armado (colchón de ' + COLCHON + ')');
        } catch (e) { armado = false; }
        if (armado) ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(ev => window.removeEventListener(ev, armar, true));
    }
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(ev => window.addEventListener(ev, armar, { capture: true, passive: true }));

    // Vuelve al top calculando el salto exacto. Si cayó por debajo de las entradas propias (no debería), sube de a una.
    function restaurar() {
        if (!armado) return;
        const s = history.state;
        if (!propia(s)) { history.go(1); return; }
        if (s.n < top) history.go(top - s.n);
    }
    function asegurar() { clearTimeout(temporizador); temporizador = setTimeout(restaurar, ESPERA_ASEGURAR); }

    // Una entrada que creó la app (por ejemplo al cambiar de módulo con location.hash) todavía no tiene número: se la numera como el nuevo top.
    window.addEventListener('hashchange', () => {
        if (!armado || propia(history.state)) return;     // si ya tiene número fue un «atrás/adelante», no una entrada nueva
        if (marcar(pos + 1)) { top = pos + 1; pos = top; anotar('módulo nuevo numerado'); }
    });

    window._atrasModal = {
        // Se llama ANTES de abrir el modal (solo suma una entrada si estaba cerrado: navegar de película en película dentro del mismo modal no suma).
        alAbrirModal(id) { if (!abierto(id)) empujar(); },
        // La hoja de comentarios y el selector de tráiler viven DENTRO del modal, que ya tiene su entrada: no suman nada. (Queda para no tener que tocar feed-films.js ni feed-series.js.)
        alAbrirHoja() {},

        // Lo llama el dashboard en cada «popstate». Devuelve true si se hizo cargo (entonces el dashboard no frena por su cuenta).
        alRetroceder() {
            if (!armado) return false;                    // todavía no hubo ningún toque: sigue el freno de siempre
            const s = history.state;
            if (!propia(s)) { anotar('cayó fuera del colchón'); history.go(1); asegurar(); return true; }
            const haciaAtras = s.n < pos;
            pos = s.n;
            if (!haciaAtras) { if (s.n < top) asegurar(); return true; }     // «adelante» o vuelta al top: no es un «atrás» de la persona
            const cerro = cerrarCapaSuperior();
            anotar('atrás -> ' + (cerro ? 'cerró una capa' : 'sin capas (frena)'));
            restaurar();
            asegurar();
            return true;
        }
    };
})();