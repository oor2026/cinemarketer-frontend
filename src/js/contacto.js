function contacto_toggleFaq(item) {
    const estaAbierto = item.classList.contains('abierto');
    document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('abierto');
        i.querySelector('.faq-respuesta').style.display = 'none';
    });
    if (!estaAbierto) {
        item.classList.add('abierto');
        item.querySelector('.faq-respuesta').style.display = 'block';
    }
}

function contacto_abrirSoporte() {
    document.getElementById('soporteOverlay').style.display = 'flex';
    document.getElementById('soporteTexto').value = '';
    document.getElementById('soporteCount').textContent = '0';
    setTimeout(() => document.getElementById('soporteTexto').focus(), 100);
}

function contacto_cerrarSoporte(event) {
    if (event && event.target !== document.getElementById('soporteOverlay')) return;
    document.getElementById('soporteOverlay').style.display = 'none';
}

async function contacto_enviarSoporte() {
    const texto = document.getElementById('soporteTexto').value.trim();
    if (texto.length < 10) {
        showToast('warning', 'Tu consulta debe tener al menos 10 caracteres.');
        return;
    }
    if (texto.length > 1000) {
        showToast('warning', 'Tu consulta no puede superar los 1000 caracteres.');
        return;
    }

    const btn = document.querySelector('.btn-enviar-soporte');
    const originalHtml = btn ? btn.innerHTML : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subject: 'Consulta de soporte',
                message: texto
            })
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        document.getElementById('soporteOverlay').style.display = 'none';
        showToast('success', '¡Consulta recibida! Nos pondremos en contacto a la brevedad.');

    } catch (error) {
        console.error('Error enviando consulta de soporte:', error);
        showToast('error', 'Error al enviar la consulta. Intentá nuevamente.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

// ── Inicialización del módulo ─────────────────────────────────────────────────
window.init_contacto = function() {
    contacto_cargarFaqs();
};

// ── Cargar FAQs desde el backend ──────────────────────────────────────────────
async function contacto_cargarFaqs() {
    const lista = document.getElementById('faqLista');
    if (!lista) return;

    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${CONFIG.API_URL}/faq`, { headers });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const faqs = await response.json();

        if (faqs.length === 0) {
            lista.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">No hay preguntas frecuentes disponibles.</div>';
            return;
        }

        lista.innerHTML = faqs.map(faq => `
            <div class="faq-item" onclick="contacto_toggleFaq(this)">
                <div class="faq-pregunta">
                    <span>${faq.question}</span>
                    <i class="fas fa-chevron-down faq-chevron"></i>
                </div>
                <div class="faq-respuesta">
                    <p>${faq.answer}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error cargando FAQs:', error);
        lista.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">Error al cargar las preguntas frecuentes.</div>';
    }
}
