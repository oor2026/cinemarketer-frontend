// ==============================================
// footer.js - SOLO comportamiento (NO UI)
// ==============================================

(function () {

    if (document.body.hasAttribute('data-no-footer')) return;
    if (window.location.pathname.includes('/admin/')) return;

    const DOCUMENTOS = {
        terminos:        { titulo: 'Términos y Condiciones', ruta: 'legal/terminos.html' },
        privacidad:      { titulo: 'Política de Privacidad', ruta: 'legal/privacidad.html' },
        cookies:         { titulo: 'Política de Cookies', ruta: 'legal/cookies.html' },
        centroPrivacidad:{ titulo: 'Centro de Privacidad', ruta: 'legal/centro-privacidad.html' },
        ayuda:           { titulo: 'Centro de Ayuda', ruta: 'legal/ayuda.html' },
        avisoLegal:      { titulo: 'Aviso Legal', ruta: 'legal/aviso-legal.html' },
        normasConvivencia: { titulo: 'Normas de Convivencia', ruta: 'legal/normas.html' }
    };

    // ─────────────────────────────────────────────
    // MODAL GLOBAL
    // ─────────────────────────────────────────────
    window.footerModal = {
        abrir(key) {
            const doc = DOCUMENTOS[key];
            if (!doc) return;

            const overlay = document.getElementById('footerModalOverlay');
            const titulo = document.getElementById('footerModalTitulo');
            const body = document.getElementById('footerModalBody');

            if (!overlay || !titulo || !body) return;

            titulo.textContent = doc.titulo;
            body.innerHTML = 'Cargando...';
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';

            fetch(doc.ruta)
                .then(r => r.text())
                .then(html => {
                    body.innerHTML = html;
                })
                .catch(() => {
                    body.innerHTML = '<p>Error al cargar documento</p>';
                });
        },

        cerrar(e) {
            const overlay = document.getElementById('footerModalOverlay');
            if (!overlay) return;

            if (e && e.target !== overlay) return;

            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    // ─────────────────────────────────────────────
    // INIT: enganchar footer existente
    // ─────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        const overlay = document.getElementById('footerModalOverlay');
        if (!overlay) return;

        overlay.addEventListener('click', footerModal.cerrar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') footerModal.cerrar();
        });

    });

})();