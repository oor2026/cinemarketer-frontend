// ==============================================
// BOTÓN «ATRÁS» DEL CELULAR PARA LOS MODALES DE PELÍCULA Y SERIE
//
// Cómo funciona: al abrir un modal (o la hoja de comentarios, o el selector de versión del tráiler) se agrega una entrada al historial del
// navegador, con la misma URL (no dispara ningún cambio de módulo). Cuando la persona toca «atrás», el navegador vuelve a la entrada anterior
// y avisa con «popstate»; el dashboard le pasa ese aviso a alRetroceder(), que cierra la capa de más arriba que esté abierta, en este orden:
//   1) el selector de versión del tráiler   2) la hoja de comentarios   3) el modal de película   4) el modal de serie.
// Si no hay ninguna abierta devuelve false y el dashboard sigue como siempre (atrás no hace nada, ni cambia de módulo).
//
// Qué capa cerrar se decide mirando lo que hay abierto en pantalla en ese momento (no con contadores), así no se puede desfasar.
// Cerrar con la ×, con la flecha de la hoja o tocando afuera NO toca el historial: las entradas que sobran no hacen nada, porque el
// dashboard ya anula el «atrás» fuera de los modales.
// Solo afecta a: modal de película, modal de serie, su hoja de comentarios y el selector de versión. Ningún otro modal ni los módulos.
// ==============================================
(function () {
    if (window._atrasModal) return;

    const abierto = (id) => { const m = document.getElementById(id); return !!m && m.style.display === 'flex'; };
    const empujar = () => { try { history.pushState({ atrasModal: true }, '', location.href); } catch (e) { /* sin historial: el modal funciona igual, solo que sin «atrás» */ } };

    const hayCapaAbierta = () => !!document.getElementById('tvHoja')
        || !!document.querySelector('#modalSerie .modal-fila-comentarios.comentarios-sheet-open, #modalPelicula .modal-fila-comentarios.comentarios-sheet-open')
        || abierto('modalPelicula') || abierto('modalSerie');

    // Cierra la capa de más arriba que esté abierta. true si cerró alguna.
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
    // MODO DIAGNÓSTICO (apagado por defecto). Se enciende entrando una vez con «?atrasdebug=1» en la dirección y se apaga con «?atrasdebug=0».
    // Muestra en pantalla qué pasa con el historial en cada «atrás» y guarda las últimas líneas, así, si la app se cierra, se ven al volver a entrar.
    // ----------------------------------------------------------------------------------------------
    const VERSION = 'atras-modal v5';
    let anotar = () => {};
    try {
        const q = new URLSearchParams(location.search).get('atrasdebug');
        if (q === '1') localStorage.setItem('atrasDebug', '1');
        if (q === '0') localStorage.removeItem('atrasDebug');
        if (localStorage.getItem('atrasDebug') === '1') {
            const previas = JSON.parse(localStorage.getItem('atrasLog') || '[]');
            const lineas = previas.map(l => '↩ ' + l);
            let caja = null;
            const pintar = () => {
                if (!document.body) return;
                if (!caja) { caja = document.createElement('pre'); caja.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;margin:0;padding:4px 6px;max-height:45vh;overflow:auto;background:rgba(0,0,0,.82);color:#7CFC00;font:10px/1.25 monospace;pointer-events:none;white-space:pre-wrap'; document.body.appendChild(caja); }
                caja.textContent = lineas.slice(-28).join('\n');
            };
            anotar = (txt) => {
                const h = new Date(); const l = h.toTimeString().slice(0, 8) + ' ' + txt + ' | len=' + history.length + ' st=' + JSON.stringify(history.state);
                lineas.push(l);
                try { localStorage.setItem('atrasLog', JSON.stringify(lineas.filter(x => x.charAt(0) !== '↩').slice(-25))); } catch (e) {}
                pintar();
            };
            anotar(VERSION + ' cargado');
            document.addEventListener('DOMContentLoaded', pintar);
            window.addEventListener('pagehide', () => anotar('pagehide (la página se va)'));
            window.addEventListener('popstate', () => anotar('popstate'));
            const push = history.pushState.bind(history), go = history.go.bind(history);
            history.pushState = function (...a) { anotar('pushState ' + JSON.stringify(a[0])); return push(...a); };
            history.go = function (n) { anotar('history.go(' + n + ')'); return go(n); };
        }
    } catch (e) { /* el diagnóstico nunca debe romper nada */ }

    let restaurando = false;

    window._atrasModal = {
        // Se llama ANTES de abrir el modal (solo suma una entrada si estaba cerrado: navegar de película en película dentro del mismo modal no suma).
        alAbrirModal(id) { if (!abierto(id)) empujar(); },
        // Se llama ANTES de abrir la hoja de comentarios. No suma entrada al historial: la hoja y el selector de tráiler viven DENTRO del modal,
        // que ya tiene la suya. (Se deja la función para no tener que tocar feed-films.js ni feed-series.js.)
        alAbrirHoja() {},

        // Devuelve true si cerró algo (entonces el dashboard no debe deshacer el «atrás»).
        alRetroceder() {
            if (restaurando) { restaurando = false; return true; }   // eco del history.go(1) propio: no es un «atrás» de la persona
            const cerro = cerrarCapaSuperior();
            anotar('alRetroceder -> ' + (cerro ? 'cerró una capa' : 'no había capas (frena el dashboard)'));
            if (cerro) {
                // Igual que el freno del dashboard: después de cerrar la capa se vuelve a la entrada de arriba de todo, así la persona
                // siempre queda parada arriba del historial, con entradas debajo (no se suman entradas nuevas desde acá).
                restaurando = true;
                setTimeout(() => { restaurando = false; }, 700);
                history.go(1);
            }
            return cerro;
        }
    };

})();