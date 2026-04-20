// ========== ADMIN FAQ ==========

const adminFaq = (() => {
    let editandoId = null;

    function overlayEl() {
        return document.getElementById('faqModalOverlay');
    }

    function abrirOverlay() {
        const ov = overlayEl();
        if (!ov) return;
        ov.classList.add('open'); // usa .admin-modal-overlay.open { display:flex; }
    }

    function cerrarOverlay() {
        const ov = overlayEl();
        if (!ov) return;
        ov.classList.remove('open');
    }

    // ── Ver más / Ver menos ───────────────────────────────────────────────────
    function toggleExpand(id) {
        const resp = document.getElementById(`faqResp-${id}`);
        if (!resp) return;

        const btn = resp.nextElementSibling; // .admin-faq-vermas
        if (!btn) return;

        if (!resp.classList.contains('expandida')) {
            resp.classList.add('expandida');
            btn.textContent = 'Ver menos';
        } else {
            resp.classList.remove('expandida');
            btn.textContent = 'Ver más';
        }
    }

    // ── Cargar lista ──────────────────────────────────────────────────────────
    async function cargarLista() {
        const lista = document.getElementById('adminFaqLista');
        if (!lista) return;

        lista.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/faq`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            const faqs = await response.json();

            if (faqs.length === 0) {
                lista.innerHTML = `<div class="admin-vacio"><i class="fas fa-question-circle"></i><p>No hay preguntas frecuentes. Creá la primera.</p></div>`;
                return;
            }

            lista.innerHTML = faqs.map((faq, index) => `
                <div class="admin-faq-item">
                    <div class="admin-faq-numero">${index + 1}</div>
                    <div class="admin-faq-body">
                        <div class="admin-faq-pregunta">${faq.question}</div>
                        <div class="admin-faq-respuesta" id="faqResp-${faq.id}">
                            ${faq.answer}
                        </div>
                        <div class="admin-faq-vermas"
                             onclick="adminFaq.toggleExpand(${faq.id})">
                            Ver más
                        </div>
                    </div>
                    <div class="admin-faq-acciones">
                        <button class="btn-faq-editar" onclick="adminFaq.abrirFormulario(${faq.id})">
                            <i class="fas fa-pencil-alt"></i> Editar
                        </button>
                        <button class="btn-faq-eliminar" onclick="adminFaq.eliminar(${faq.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error cargando FAQs:', error);
            lista.innerHTML = '<div class="admin-vacio"><i class="fas fa-exclamation-circle"></i><p>Error al cargar las preguntas.</p></div>';
        }
    }

    // ── Abrir formulario (null = nueva, id = editar) ──────────────────────────
    async function abrirFormulario(id = null) {
        editandoId = id;

        const inputPregunta = document.getElementById('faqInputPregunta');
        const inputRespuesta = document.getElementById('faqInputRespuesta');
        const inputOrden = document.getElementById('faqInputOrden');
        const titulo = document.getElementById('faqModalTitulo');

        if (!inputPregunta || !inputRespuesta || !inputOrden || !titulo) return;

        inputPregunta.value = '';
        inputRespuesta.value = '';
        inputOrden.value = '0';
        titulo.textContent = id ? 'Editar pregunta' : 'Nueva pregunta';

        if (id) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${CONFIG.API_URL}/admin/faq`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const faqs = await response.json();
                    const faq = faqs.find(f => f.id === id);
                    if (faq) {
                        inputPregunta.value = faq.question ?? '';
                        inputRespuesta.value = faq.answer ?? '';
                        inputOrden.value = (faq.displayOrder ?? 0);
                    }
                }
            } catch (e) {
                // continúa con campos vacíos
            }
        }

        abrirOverlay();
        setTimeout(() => inputPregunta.focus(), 50);
    }

    // ── Cerrar formulario ─────────────────────────────────────────────────────
    function cerrarFormulario(event) {
        // Cierra solo si el click fue en el fondo del overlay (no dentro del modal)
        if (event && event.target !== overlayEl()) return;
        cerrarOverlay();
        editandoId = null;
    }

    // ── Guardar (crear o editar) ──────────────────────────────────────────────
    async function guardar() {
        const inputPregunta = document.getElementById('faqInputPregunta');
        const inputRespuesta = document.getElementById('faqInputRespuesta');
        const inputOrden = document.getElementById('faqInputOrden');

        if (!inputPregunta || !inputRespuesta || !inputOrden) return;

        const pregunta = inputPregunta.value.trim();
        const respuesta = inputRespuesta.value.trim();
        const orden = parseInt(inputOrden.value, 10) || 0;

        if (!pregunta) {
            inputPregunta.style.borderColor = '#e50914';
            inputPregunta.focus();
            return;
        }
        if (!respuesta) {
            inputRespuesta.style.borderColor = '#e50914';
            inputRespuesta.focus();
            return;
        }

        inputPregunta.style.borderColor = '#e0e0e0';
        inputRespuesta.style.borderColor = '#e0e0e0';

        const btn = document.querySelector('#faqModalOverlay .btn-enviar-soporte');
        const original = btn ? btn.innerHTML : null;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            const token = localStorage.getItem('token');
            const url = editandoId
                ? `${CONFIG.API_URL}/admin/faq/${editandoId}`
                : `${CONFIG.API_URL}/admin/faq`;
            const method = editandoId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: pregunta,
                    answer: respuesta,
                    displayOrder: orden,
                    active: true
                })
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            cerrarOverlay();
            editandoId = null;
            await cargarLista();

        } catch (error) {
            console.error('Error guardando FAQ:', error);
            alert('Error al guardar la pregunta. Intentá nuevamente.');
        } finally {
            if (btn && original !== null) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    // ── Eliminar ──────────────────────────────────────────────────────────────
    async function eliminar(id) {
        if (!confirm('¿Eliminar esta pregunta frecuente? Esta acción no se puede deshacer.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/faq/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            await cargarLista();

        } catch (error) {
            console.error('Error eliminando FAQ:', error);
            alert('Error al eliminar la pregunta.');
        }
    }

    // ── API pública ───────────────────────────────────────────────────────────
    return { cargarLista, abrirFormulario, cerrarFormulario, guardar, eliminar, toggleExpand };
})();

// Enganchar al switchSection del adminUI
document.addEventListener('DOMContentLoaded', () => {
    if (typeof adminUI !== 'undefined' && adminUI.switchSection) {
        const originalSwitch = adminUI.switchSection.bind(adminUI);
        adminUI.switchSection = function(section, el) {
            originalSwitch(section, el);
            if (section === 'faq') adminFaq.cargarLista();
        };
    }
});
