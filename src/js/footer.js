// ==============================================
// footer.js - Footer global con documentos legales
// Se inyecta automáticamente en todas las páginas
// (excluir admin agregando data-no-footer al <body>)
// ==============================================

(function() {

    // No inyectar en el admin
    if (document.body.hasAttribute('data-no-footer')) return;
    if (window.location.pathname.includes('/admin/')) return;

    // ── Contenido de los documentos ───────────────────────────────────────────
const DOCUMENTOS = {
    terminos:        { titulo: 'Términos y Condiciones', ruta: 'legal/terminos.html' },
    privacidad:      { titulo: 'Política de Privacidad', ruta: 'legal/privacidad.html' },
    cookies:         { titulo: 'Política de Cookies',    ruta: 'legal/cookies.html' },
    centroPrivacidad:{ titulo: 'Centro de Privacidad',   ruta: 'legal/centro-privacidad.html' },
    ayuda:           { titulo: 'Centro de Ayuda',        ruta: 'legal/ayuda.html' },
    avisoLegal:      { titulo: 'Aviso Legal',            ruta: 'legal/aviso-legal.html' }
};

    // ── HTML del footer ───────────────────────────────────────────────────────
    const footerHTML = `
        <footer id="cinemarketer-footer">
            <div class="footer-inner">
                <div class="footer-brand">
                    <i class="fas fa-film"></i>
                    <span>Cinemarketer</span>
                </div>
                <nav class="footer-links">
                    <button onclick="footerModal.abrir('terminos')">Términos y Condiciones</button>
                    <button onclick="footerModal.abrir('privacidad')">Política de Privacidad</button>
                    <button onclick="footerModal.abrir('cookies')">Política de Cookies</button>
                    <button onclick="footerModal.abrir('centroPrivacidad')">Centro de Privacidad</button>
                    <button onclick="footerModal.abrir('ayuda')">Centro de Ayuda</button>
                    <button onclick="footerModal.abrir('avisoLegal')">Aviso Legal</button>
                </nav>
                <p class="footer-copy">© ${new Date().getFullYear()} Cinemarketer. Todos los derechos reservados.</p>
            </div>
        </footer>

        <!-- MODAL DOCUMENTOS LEGALES -->
        <div id="footerModalOverlay" onclick="footerModal.cerrar(event)">
            <div id="footerModalCaja">
                <div id="footerModalHeader">
                    <h3 id="footerModalTitulo"></h3>
                    <button id="footerModalCerrar" onclick="footerModal.cerrar(null)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="footerModalBody"></div>
            </div>
        </div>
    `;

    // ── CSS inline ────────────────────────────────────────────────────────────
    const footerCSS = `
        #cinemarketer-footer {
            background: #111;
            color: #aaa;
            padding: 1.5rem 1rem;
            margin-top: auto;
            font-size: 0.82rem;
        }
        .footer-inner {
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            text-align: center;
        }
        .footer-brand {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: #e50914;
            font-weight: 700;
            font-size: 1rem;
        }
        .footer-links {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem 1.25rem;
        }
        .footer-links button {
            background: none;
            border: none;
            color: #aaa;
            cursor: pointer;
            font-size: 0.82rem;
            padding: 0;
            transition: color 0.2s;
            text-decoration: underline;
            text-underline-offset: 3px;
        }
        .footer-links button:hover { color: #fff; }
        .footer-copy { color: #555; margin: 0; }

        /* Modal */
        #footerModalOverlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.65);
            z-index: 99999;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        #footerModalOverlay.open { display: flex; }
        #footerModalCaja {
            background: #fff;
            border-radius: 14px;
            width: 100%;
            max-width: 640px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            overflow: hidden;
        }
        #footerModalHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #eee;
            background: #fff;
        }
        #footerModalTitulo {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0;
        }
        #footerModalCerrar {
            background: none;
            border: none;
            font-size: 1.1rem;
            color: #999;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            transition: background 0.2s, color 0.2s;
        }
        #footerModalCerrar:hover { background: #f0f0f0; color: #333; }
        #footerModalBody {
            padding: 1.5rem;
            overflow-y: auto;
            color: #444;
            font-size: 0.9rem;
            line-height: 1.7;
        }
        #footerModalBody h4 {
            color: #1a1a1a;
            font-size: 0.95rem;
            margin: 1.25rem 0 0.4rem;
        }
        #footerModalBody h4:first-child { margin-top: 0; }
        #footerModalBody p { margin: 0 0 0.5rem; }
    `;

    // ── Inyectar CSS ──────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.id = 'footer-styles';
    style.textContent = footerCSS;
    document.head.appendChild(style);

    // ── Inyectar HTML al final del body ───────────────────────────────────────
    // Si ya hay un footer nativo en la página (ej: index.html), no duplicar.
    // Solo inyectar el modal.
    const footerNativo = document.querySelector('footer.footer');
    if (footerNativo) {
        const modalHTML = `
        <div id="footerModalOverlay" onclick="footerModal.cerrar(event)">
            <div id="footerModalCaja">
                <div id="footerModalHeader">
                    <h3 id="footerModalTitulo"></h3>
                    <button id="footerModalCerrar" onclick="footerModal.cerrar(null)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="footerModalBody"></div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    // ── Asegurar que el body use flex column para que el footer quede abajo ──
    document.body.style.minHeight = '100vh';
    document.body.style.display   = document.body.style.display || 'flex';
    document.body.style.flexDirection = 'column';
    const container = document.getElementById('module-container');
    if (container) container.style.flex = '1';

    // ── API pública del modal ─────────────────────────────────────────────────
    window.footerModal = {
        abrir(key) {
            const doc = DOCUMENTOS[key];
            if (!doc) return;
            document.getElementById('footerModalTitulo').textContent = doc.titulo;
            document.getElementById('footerModalBody').innerHTML = '<p style="color:#999;text-align:center;padding:2rem">Cargando...</p>';
            document.getElementById('footerModalOverlay').classList.add('open');
            document.body.style.overflow = 'hidden';
            fetch(doc.ruta)
                .then(r => {
                    if (!r.ok) throw new Error('No se pudo cargar el documento.');
                    return r.text();
                })
                .then(html => {
                    document.getElementById('footerModalBody').innerHTML = html;
                })
                .catch(err => {
                    document.getElementById('footerModalBody').innerHTML = '<p style="color:#e50914;text-align:center;padding:2rem">Error al cargar el documento.</p>';
                    console.error('footerModal fetch error:', err);
                });
        },
        cerrar(event) {
            if (event && event.target !== document.getElementById('footerModalOverlay')) return;
            document.getElementById('footerModalOverlay').classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    // Cerrar con ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') window.footerModal.cerrar(null);
    });

})();
