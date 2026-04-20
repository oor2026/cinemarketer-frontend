// ========== ADMIN SOPORTE ==========

const adminSoporte = (() => {

    let ticketActualId = null;
    let paginaActual = 0;
    let totalPaginas = 1;
    let filtroActual = 'todos';

    // ── Cargar lista de tickets ───────────────────────────────────────────────
    async function cargarLista(page = 0) {
        const lista = document.getElementById('adminTicketsLista');
        if (!lista) return;

        lista.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando consultas...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/support/tickets?page=${page}&size=10&filter=${filtroActual}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            const data = await response.json();

            paginaActual = data.currentPage;
            totalPaginas = data.totalPages;

            if (data.tickets.length === 0 && page === 0) {
                lista.innerHTML = `<div class="admin-vacio"><i class="fas fa-inbox"></i><p>No hay consultas de soporte.</p></div>`;
                actualizarBadgeSidebar(0);
                renderPaginacion();
                return;
            }

            const totalNoLeidos = data.tickets.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
            actualizarBadgeSidebar(totalNoLeidos);

            lista.innerHTML = data.tickets.map(t => `
                <div class="admin-ticket-item ${t.unreadCount > 0 ? 'no-leido' : ''}"
                     onclick="adminSoporte.abrirHilo(${t.id})">
                    <div class="admin-ticket-icono ${t.status === 'OPEN' ? 'abierto' : 'cerrado'}">
                        <i class="fas ${t.status === 'OPEN' ? 'fa-comment-dots' : 'fa-lock'}"></i>
                    </div>
                    <div class="admin-ticket-body">
                        <div class="admin-ticket-usuario"><i class="fas fa-user" style="font-size:0.75rem;margin-right:4px;"></i>${t.userName || 'Usuario'}</div>
                        <div class="admin-ticket-asunto">${t.subject}</div>
                        <div class="admin-ticket-preview">
                            ${truncarTexto(t.lastMessage)}
                            ${t.lastMessage && t.lastMessage.length > 80
                                ? `<span class="admin-ticket-ver-mas" onclick="event.stopPropagation(); adminSoporte.abrirHilo(${t.id})">Ver más</span>`
                                : ''}
                        </div>
                    </div>
                    <div class="admin-ticket-meta">
                        <span class="admin-ticket-fecha">${formatearFecha(t.lastMessageAt || t.createdAt)}</span>
                        ${t.unreadCount > 0
                            ? `<span class="admin-ticket-badge">${t.unreadCount}</span>`
                            : `<span class="admin-ticket-estado ${t.status === 'OPEN' ? 'abierto' : 'cerrado'}">${t.status === 'OPEN' ? 'Abierto' : 'Cerrado'}</span>`
                        }
                    </div>
                </div>
            `).join('');

            renderPaginacion();

        } catch (error) {
            lista.innerHTML = '<div class="admin-vacio"><i class="fas fa-exclamation-circle"></i><p>Error al cargar las consultas.</p></div>';
        }
    }

    // ── Abrir hilo ────────────────────────────────────────────────────────────
    async function abrirHilo(id) {
        ticketActualId = id;

        document.getElementById('adminTicketsLista').style.display = 'none';
        document.getElementById('adminHiloSection').style.display = 'block';
        document.getElementById('adminHiloMensajes').innerHTML =
            '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i></div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/support/tickets/${id}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            const ticket = await response.json();

            document.getElementById('adminHiloAsunto').textContent = ticket.subject;
            document.getElementById('adminHiloUsuario').textContent =
                `👤 ${ticket.userName || 'Usuario #' + ticket.userId}`;

            const statusEl = document.getElementById('adminHiloStatus');
            const isOpen = ticket.status === 'OPEN';
            statusEl.textContent = isOpen ? 'Abierto' : 'Cerrado';
            statusEl.className = `hilo-status ${isOpen ? 'abierto' : 'cerrado'}`;

            // Botón cerrar
            const btnCerrar = document.getElementById('btnCerrarTicket');
            btnCerrar.style.display = isOpen ? 'flex' : 'none';

            // Mensajes
            const mensajesEl = document.getElementById('adminHiloMensajes');
            if (!ticket.messages || ticket.messages.length === 0) {
                mensajesEl.innerHTML = '<div class="admin-vacio">Sin mensajes.</div>';
            } else {
                mensajesEl.innerHTML = ticket.messages.map(m => {
                    // Desde el admin: los mensajes del USER se ven a la izquierda, los del ADMIN a la derecha
                    const esAdmin = m.senderType === 'ADMIN';
                    return `
                        <div class="mensaje-burbuja ${esAdmin ? 'admin' : 'usuario'}">
                            <div class="mensaje-nombre">${m.senderName || (esAdmin ? 'Soporte' : 'Usuario')}</div>
                            <div class="mensaje-texto">${m.content}</div>
                            <div class="mensaje-fecha">${formatearFechaHora(m.createdAt)}</div>
                        </div>`;
                }).join('');
                mensajesEl.scrollTop = mensajesEl.scrollHeight;
            }

            // Área responder
            document.getElementById('adminHiloResponder').style.display = isOpen ? 'block' : 'none';
            document.getElementById('adminTicketCerradoAviso').style.display = isOpen ? 'none' : 'flex';

            // Actualizar badge sidebar
            actualizarBadgeSidebarDesdeAPI();

        } catch (error) {
            document.getElementById('adminHiloMensajes').innerHTML =
                '<div class="admin-vacio">Error al cargar los mensajes.</div>';
        }
    }

    // ── Volver a lista ────────────────────────────────────────────────────────
    function volverALista() {
        ticketActualId = null;
        document.getElementById('adminHiloSection').style.display = 'none';
        document.getElementById('adminTicketsLista').style.display = 'block';
        document.getElementById('adminHiloTexto').value = '';
        document.getElementById('adminHiloCount').textContent = '0';
        cargarLista();
    }

    // ── Enviar respuesta ──────────────────────────────────────────────────────
    async function enviarMensaje() {
        const textoEl = document.getElementById('adminHiloTexto');
        const texto = textoEl.value.trim();

        if (!texto) {
            textoEl.style.borderColor = '#e50914';
            textoEl.focus();
            return;
        }

        textoEl.style.borderColor = '#e0e0e0';
        const btn = document.querySelector('.btn-admin-enviar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/support/tickets/${ticketActualId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: texto })
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            textoEl.value = '';
            document.getElementById('adminHiloCount').textContent = '0';
            await abrirHilo(ticketActualId);

        } catch (error) {
            alert('Error al enviar la respuesta.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Responder';
        }
    }

    // ── Cerrar ticket ─────────────────────────────────────────────────────────
    async function cerrarTicket() {
        if (!confirm('¿Cerrar este ticket? El usuario verá un aviso indicando que debe abrir una nueva consulta para comunicarse.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/support/tickets/${ticketActualId}/close`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            await abrirHilo(ticketActualId); // Recargar hilo con estado cerrado

        } catch (error) {
            alert('Error al cerrar el ticket.');
        }
    }

    // ── Eliminar ticket ───────────────────────────────────────────────────────
    async function eliminarTicket() {
        if (!confirm('¿Eliminar esta consulta? Esta acción no se puede deshacer.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/support/tickets/${ticketActualId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            volverALista();

        } catch (error) {
            alert('Error al eliminar la consulta.');
        }
    }

    // ── Badge sidebar ─────────────────────────────────────────────────────────
    function actualizarBadgeSidebar(count) {
        const badge = document.getElementById('adminSoporteBadge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    async function actualizarBadgeSidebarDesdeAPI() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/admin/support/unread`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                actualizarBadgeSidebar(data.unreadCount);
            }
        } catch (e) { /* silencioso */ }
    }

    // ── Helpers de fecha ──────────────────────────────────────────────────────
    function formatearFecha(fechaStr) {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr);
        const diff = new Date() - fecha;
        if (diff < 86400000) {
            return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        }
        return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    function formatearFechaHora(fechaStr) {
        if (!fechaStr) return '';
        return new Date(fechaStr).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // ── Helpers de texto ──────────────────────────────────────────────────────
    function truncarTexto(texto, limite = 80) {
        if (!texto) return 'Sin mensajes';
        if (texto.length <= limite) return texto;
        return texto.substring(0, limite).trimEnd() + '...';
    }

    // ── Filtro por estado ─────────────────────────────────────────────────────
        function filtrarPorEstado(estado) {
            filtroActual = estado;
            cargarLista(0);
        }

    // ── Paginación ────────────────────────────────────────────────────────────
        function renderPaginacion() {
            let paginacion = document.getElementById('adminSoportePaginacion');
            if (!paginacion) {
                const contenedor = document.getElementById('adminTicketsLista');
                if (!contenedor) return;
                paginacion = document.createElement('div');
                paginacion.id = 'adminSoportePaginacion';
                paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
                contenedor.parentNode.insertBefore(paginacion, contenedor.nextSibling);
            }

            if (totalPaginas <= 1) {
                paginacion.style.display = 'none';
                return;
            }

            paginacion.style.display = 'flex';
            paginacion.innerHTML = `
                <button onclick="adminSoporte.cargarLista(${paginaActual - 1})"
                    ${paginaActual === 0 ? 'disabled' : ''}
                    style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span style="font-size:0.9rem; color:#666;">
                    Página ${paginaActual + 1} de ${totalPaginas}
                </span>
                <button onclick="adminSoporte.cargarLista(${paginaActual + 1})"
                    ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''}
                    style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        // ── API pública ───────────────────────────────────────────────────────────
                return { cargarLista, abrirHilo, volverALista, enviarMensaje, cerrarTicket, eliminarTicket, filtrarPorEstado };

            })();

// Cargar lista cuando se activa la sección soporte
// (se engancha al switchSection de adminUI)
const _adminSwitchOriginal = typeof adminUI !== 'undefined' ? adminUI.switchSection.bind(adminUI) : null;
document.addEventListener('DOMContentLoaded', () => {
    if (typeof adminUI !== 'undefined' && adminUI.switchSection) {
        const originalSwitch = adminUI.switchSection.bind(adminUI);
        adminUI.switchSection = function(section, el) {
            originalSwitch(section, el);
            if (section === 'soporte') {
                adminSoporte.cargarLista();
            }
        };
    }

    // Badge al cargar
    (async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/admin/support/unread`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const badge = document.getElementById('adminSoporteBadge');
                if (badge && data.unreadCount > 0) {
                    badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    badge.style.display = 'inline-flex';
                }
            }
        } catch (e) { /* silencioso */ }
    })();

    // Polling cada 30s
    setInterval(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/admin/support/unread`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const badge = document.getElementById('adminSoporteBadge');
                if (badge) {
                    if (data.unreadCount > 0) {
                        badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                        badge.style.display = 'inline-flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (e) { /* silencioso */ }
    }, 30000);
});
