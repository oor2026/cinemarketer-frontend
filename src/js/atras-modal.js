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

    window._atrasModal = {
        // Se llama ANTES de abrir el modal (solo suma una entrada si estaba cerrado: navegar de película en película dentro del mismo modal no suma).
        alAbrirModal(id) { if (!abierto(id)) empujar(); },
        // Se llama ANTES de abrir la hoja de comentarios.
        alAbrirHoja(fila) { if (fila && !fila.classList.contains('comentarios-sheet-open')) empujar(); },

        // Devuelve true si cerró algo (entonces el dashboard no debe deshacer el «atrás»).
        alRetroceder() {
            const cerro = cerrarCapaSuperior();
            // Al cerrar la ÚLTIMA capa hay que dejar al historial como lo espera el freno del dashboard: parado sobre una entrada que
            // tenga otra DEBAJO. Si no (por ejemplo cuando el navegador salteó entradas al volver), el siguiente «atrás» sale de la
            // aplicación. Por eso, cuando ya no queda nada abierto, se suma una entrada nueva: queda arriba de todo y el freno de
            // siempre (history.go(1)) vuelve a funcionar.
            if (cerro && !hayCapaAbierta()) { try { history.pushState({ root: true }, '', location.href); } catch (e) { /* sin historial */ } }
            return cerro;
        }
    };

    // El selector de versión del tráiler se agrega al <body> al abrirse: ahí se suma su entrada al historial.
    if (typeof MutationObserver !== 'undefined') {
        const vigilar = () => new MutationObserver((cambios) => {
            for (const c of cambios) for (const n of c.addedNodes) if (n.id === 'tvHoja') empujar();
        }).observe(document.body, { childList: true });
        if (document.body) vigilar(); else document.addEventListener('DOMContentLoaded', vigilar);   // el script puede cargarse en el <head>
    }
})();