// ========== MIS CONSULTAS ==========

let consultasTicketActualId = null;
let consultasPaginaActual = 0;
let consultasTotalPaginas = 1;

// ========== SANITIZACIÓN UNIVERSAL (para input del usuario) ==========
function sanitizeUserInput(input) {
    if (!input) return '';

    // Convierte TODOS los caracteres no ASCII a entidades HTML
    return String(input).replace(/[^\x00-\x7F]/g, function(match) {
        const code = match.codePointAt(0);
        return `&#${code};`;
    })
    // Luego escapa los caracteres HTML peligrosos
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(str) {
    if (!str) return '';
    return sanitizeUserInput(str).replace(/\n/g, '<br>').replace(/\r/g, '');
}

// ========== SANITIZACIÓN PARA CONTENIDO DEL SISTEMA (mensajes automáticos) ==========
// Solo escapa caracteres HTML peligrosos, sin tocar acentos ni caracteres especiales
function escapeHtmlSafe(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '');
}

// ========== TRUNCAR TEXTOS ==========
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Función para sanitizar números/IDs
function sanitizeNumber(value) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
}

// ── Inicialización ────────────────────────────────────────────────────────────
window['init_mis-consultas'] = function() {
    consultasCargarLista();
};

// ── Cargar lista de tickets ───────────────────────────────────────────────────
async function consultasCargarLista(page = 0) {
    const lista = document.getElementById('consultasLista');
    if (!lista) return;

    lista.innerHTML = '<div class="consultas-loading"><i class="fas fa-spinner fa-spin"></i> Cargando consultas...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/me?page=${page}&size=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        consultasPaginaActual = data.currentPage;
        consultasTotalPaginas = data.totalPages;

        if (data.tickets.length === 0 && page === 0) {
            lista.innerHTML = `
                <div class="consultas-vacio">
                    <i class="fas fa-inbox"></i>
                    <p>No tenés consultas todavía.</p>
                    <p style="font-size:0.85rem; margin-top:0.5rem;">Usá el botón "Nueva consulta" para contactarnos.</p>
                </div>`;
            consultasRenderPaginacion();
            return;
        }

        lista.innerHTML = data.tickets.map(t => {
            // Usar escapeHtmlSafe para el asunto (puede venir del sistema)
            const subject = escapeHtmlSafe(t.subject);
            const lastMessage = escapeHtmlSafe(t.lastMessage || 'Sin mensajes');
            const status = t.status === 'OPEN' ? 'abierto' : 'cerrado';
            const statusIcon = t.status === 'OPEN' ? 'fa-comment-dots' : 'fa-lock';
            const fecha = consultasFormatearFecha(t.lastMessageAt || t.createdAt);
            const noLeidoClass = t.unreadCount > 0 ? 'no-leido' : '';

            return `
                <div class="ticket-item ${noLeidoClass}" onclick="consultasAbrirHilo(${sanitizeNumber(t.id)})">
                    <div class="ticket-icono ${status}">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-asunto" title="${subject}">${truncateText(subject, 60)}</div>
                        <div class="ticket-preview" title="${lastMessage}">${truncateText(lastMessage, 100)}</div>
                    </div>
                    <div class="ticket-meta">
                        <span class="ticket-fecha">${escapeHtmlSafe(fecha)}</span>
                        ${t.unreadCount > 0
                            ? `<span class="ticket-badge-unread">${sanitizeNumber(t.unreadCount)}</span>`
                            : `<span class="ticket-estado ${status}">${status === 'abierto' ? 'Abierto' : 'Cerrado'}</span>`
                        }
                    </div>
                    <button class="ticket-eliminar" onclick="event.stopPropagation(); consultasEliminarTicket(${sanitizeNumber(t.id)})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        consultasRenderPaginacion();

    } catch (error) {
        lista.innerHTML = '<div class="consultas-vacio"><i class="fas fa-exclamation-circle"></i><p>Error al cargar las consultas.</p></div>';
    }
}

// ── Abrir hilo de un ticket ───────────────────────────────────────────────────
async function consultasAbrirHilo(ticketId) {
    consultasTicketActualId = ticketId;

    document.getElementById('consultasLista').closest('.consultas-lista-section').style.display = 'none';
    const hiloSection = document.getElementById('consultasHiloSection');
    hiloSection.style.display = 'block';

    document.getElementById('hiloAsunto').textContent = 'Cargando...';
    document.getElementById('hiloMensajes').innerHTML = '<div class="consultas-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/${ticketId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const ticket = await response.json();

        // Usar textContent para el asunto — no necesita HTML
        document.getElementById('hiloAsunto').textContent = ticket.subject;

        const statusEl = document.getElementById('hiloStatus');
        statusEl.textContent = ticket.status === 'OPEN' ? 'Abierto' : 'Cerrado';
        statusEl.className = `hilo-status ${ticket.status === 'OPEN' ? 'abierto' : 'cerrado'}`;

        // Renderizar mensajes
        const mensajesEl = document.getElementById('hiloMensajes');
        if (!ticket.messages || ticket.messages.length === 0) {
            mensajesEl.innerHTML = '<div class="consultas-vacio">Sin mensajes aún.</div>';
        } else {
            mensajesEl.innerHTML = ticket.messages.map(m => {
                const senderName = m.senderType === 'ADMIN'
                    ? escapeHtmlSafe(m.senderName || 'Soporte')
                    : escapeHtml(m.senderName || 'Vos');

                // Mensajes del sistema/admin: escapeHtmlSafe (preserva acentos)
                // Mensajes del usuario: escapeHtml (sanitización completa)
                const content = m.senderType === 'ADMIN'
                    ? escapeHtmlSafe(m.content)
                    : escapeHtml(m.content);

                const fecha = consultasFormatearFechaHora(m.createdAt);
                const bubbleClass = m.senderType === 'USER' ? 'usuario' : 'admin';

                return `
                    <div class="mensaje-burbuja ${bubbleClass}">
                        <div class="mensaje-nombre">${senderName}</div>
                        <div class="mensaje-texto">${content}</div>
                        <div class="mensaje-fecha">${escapeHtmlSafe(fecha)}</div>
                    </div>
                `;
            }).join('');
            mensajesEl.scrollTop = mensajesEl.scrollHeight;
        }

        const isOpen = ticket.status === 'OPEN';
        document.getElementById('hiloResponder').style.display = isOpen ? 'block' : 'none';
        document.getElementById('hiloCerradoAviso').style.display = isOpen ? 'none' : 'flex';

        if (typeof window.actualizarBadgeNotificaciones === 'function') {
            window.actualizarBadgeNotificaciones();
        }

    } catch (error) {
        document.getElementById('hiloMensajes').innerHTML = '<div class="consultas-vacio">Error al cargar los mensajes.</div>';
    }
}

// ── Volver a la lista ─────────────────────────────────────────────────────────
function consultasVolverALista() {
    consultasTicketActualId = null;
    document.getElementById('consultasHiloSection').style.display = 'none';
    document.getElementById('consultasLista').closest('.consultas-lista-section').style.display = 'block';
    document.getElementById('hiloTexto').value = '';
    document.getElementById('hiloCount').textContent = '0';
    consultasCargarLista();
}

// ── Enviar mensaje en hilo ────────────────────────────────────────────────────
async function consultasEnviarMensaje() {
    const textoEl = document.getElementById('hiloTexto');
    const texto = textoEl.value;
    const textoSinEspacios = texto.replace(/\s/g, '');

    if (!texto.trim() || textoSinEspacios.length < 10) {
        textoEl.style.borderColor = '#e50914';
        showToast('warning', 'El mensaje debe tener al menos 10 caracteres (sin espacios).');
        textoEl.focus();
        return;
    }

    textoEl.style.borderColor = '#e0e0e0';
    const btn = document.querySelector('.btn-enviar-hilo');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/${consultasTicketActualId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: texto })
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        textoEl.value = '';
        document.getElementById('hiloCount').textContent = '0';
        await consultasAbrirHilo(consultasTicketActualId);
        showToast('success', 'Mensaje enviado correctamente.');

    } catch (error) {
        showToast('error', 'Error al enviar el mensaje. Intentá nuevamente.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';
    }
}

// ── Eliminar ticket ───────────────────────────────────────────────────────────
async function consultasEliminarTicket(ticketId) {
    if (!confirm('¿Querés eliminar esta consulta? Esta acción no se puede deshacer.')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        showToast('success', 'Consulta eliminada correctamente.');
        consultasCargarLista();

    } catch (error) {
        showToast('error', 'Error al eliminar la consulta.');
    }
}

// ── Modal nueva consulta ──────────────────────────────────────────────────────
function consultasAbrirNueva() {
    document.getElementById('nuevaConsultaOverlay').style.display = 'flex';
    document.getElementById('nuevaConsultaAsunto').value = '';
    document.getElementById('nuevaConsultaTexto').value = '';
    document.getElementById('nuevaConsultaCount').textContent = '0';
    document.getElementById('nuevaConsultaAsuntoCount').textContent = '0';
    setTimeout(() => document.getElementById('nuevaConsultaAsunto').focus(), 100);
}

function consultasCerrarNueva(event) {
    if (event && event.target !== document.getElementById('nuevaConsultaOverlay')) return;
    document.getElementById('nuevaConsultaOverlay').style.display = 'none';
}

async function consultasEnviarNueva() {
    const asunto = document.getElementById('nuevaConsultaAsunto').value.trim();
    const texto = document.getElementById('nuevaConsultaTexto').value;
    const textoSinEspacios = texto.replace(/\s/g, '');

    if (!asunto) {
        document.getElementById('nuevaConsultaAsunto').style.borderColor = '#e50914';
        showToast('warning', 'El asunto es obligatorio.');
        document.getElementById('nuevaConsultaAsunto').focus();
        return;
    }
    if (asunto.length > 60) {
        document.getElementById('nuevaConsultaAsunto').style.borderColor = '#e50914';
        showToast('warning', 'El asunto no puede superar los 60 caracteres.');
        document.getElementById('nuevaConsultaAsunto').focus();
        return;
    }
    document.getElementById('nuevaConsultaAsunto').style.borderColor = '#e0e0e0';

    if (!texto.trim() || textoSinEspacios.length < 10) {
        document.getElementById('nuevaConsultaTexto').style.borderColor = '#e50914';
        showToast('warning', 'El mensaje debe tener al menos 10 caracteres (sin espacios).');
        return;
    }

    document.getElementById('nuevaConsultaTexto').style.borderColor = '#e0e0e0';

    const btn = document.getElementById('btnEnviarNueva');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subject: asunto,
                message: texto
            })
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        document.getElementById('nuevaConsultaOverlay').style.display = 'none';
        showToast('success', '¡Consulta enviada! Te responderemos a la brevedad.');
        consultasCargarLista();

    } catch (error) {
        showToast('error', 'Error al enviar la consulta. Intentá nuevamente.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

function consultasRenderPaginacion() {
    let paginacion = document.getElementById('consultasPaginacion');
    if (!paginacion) {
        const seccion = document.querySelector('.consultas-lista-section');
        if (!seccion) return;
        paginacion = document.createElement('div');
        paginacion.id = 'consultasPaginacion';
        paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
        seccion.appendChild(paginacion);
    }

    if (consultasTotalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }

    paginacion.style.display = 'flex';
    paginacion.innerHTML = `
        <button onclick="consultasCargarLista(${consultasPaginaActual - 1})"
            ${consultasPaginaActual === 0 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span style="font-size:0.9rem; color:#666;">
            Página ${consultasPaginaActual + 1} de ${consultasTotalPaginas}
        </span>
        <button onclick="consultasCargarLista(${consultasPaginaActual + 1})"
            ${consultasPaginaActual >= consultasTotalPaginas - 1 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
function consultasFormatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const diff = hoy - fecha;
    if (diff < 86400000) {
        return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function consultasFormatearFechaHora(fechaStr) {
    if (!fechaStr) return '';
    return new Date(fechaStr).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}