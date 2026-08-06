// ==============================================
// admin-notificaciones.js - Envío de notificaciones internas + push
// ==============================================

const adminNotificaciones = {

    usuariosSeleccionados: [], // [{id, name, email}]
    timeoutBusqueda: null,

    async init() {
        await this.cargarHistorial();
    },

    cambiarTargetType(tipo) {
        document.getElementById('notifSegmentos').style.display = tipo === 'SEGMENTS' ? 'flex' : 'none';
        document.getElementById('notifUsuarios').style.display = tipo === 'USERS' ? 'block' : 'none';
    },

    cambiarEnvio(modo) {
        const fechaInput = document.getElementById('notifFechaProgramada');
        fechaInput.style.display = modo === 'programado' ? 'inline-block' : 'none';
        document.getElementById('notifBtnLabel').textContent = modo === 'programado' ? 'Programar' : 'Enviar ahora';
    },

    // ------------------------------------------
    // BUSCADOR DE USUARIOS
    // ------------------------------------------
    buscarUsuarios(texto) {
        clearTimeout(this.timeoutBusqueda);
        const lista = document.getElementById('notifResultadosLista');
        if (!texto || texto.trim().length < 2) {
            lista.style.display = 'none';
            return;
        }
        this.timeoutBusqueda = setTimeout(async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/notifications/users/search?q=${encodeURIComponent(texto)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const usuarios = await response.json();
                const yaElegidos = new Set(this.usuariosSeleccionados.map(u => u.id));
                const disponibles = usuarios.filter(u => !yaElegidos.has(u.id));

                if (disponibles.length === 0) {
                    lista.innerHTML = `<div style="padding:0.6rem 0.8rem;color:#888;font-size:0.85rem;">Sin resultados</div>`;
                } else {
                    lista.innerHTML = disponibles.map(u => `
                        <div onclick="adminNotificaciones.agregarUsuario(${u.id}, '${(u.name || '').replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')"
                             style="padding:0.6rem 0.8rem;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:0.85rem;"
                             onmouseover="this.style.background='#f7f7f7'" onmouseout="this.style.background='white'">
                            <strong>${u.name || '(sin nombre)'}</strong><br>
                            <small style="color:#888;">${u.email || '—'} · ID: ${u.id}</small>
                        </div>`).join('');
                }
                lista.style.display = 'block';
            } catch (e) {
                lista.style.display = 'none';
            }
        }, 300);
    },

    agregarUsuario(id, name, email) {
        if (this.usuariosSeleccionados.some(u => u.id === id)) return;
        this.usuariosSeleccionados.push({ id, name, email });
        document.getElementById('notifBuscarUsuario').value = '';
        document.getElementById('notifResultadosLista').style.display = 'none';
        this.renderSeleccionados();
    },

    quitarUsuario(id) {
        this.usuariosSeleccionados = this.usuariosSeleccionados.filter(u => u.id !== id);
        this.renderSeleccionados();
    },

    renderSeleccionados() {
        const cont = document.getElementById('notifUsuariosSeleccionados');
        cont.innerHTML = this.usuariosSeleccionados.map(u => `
            <span style="display:inline-flex;align-items:center;gap:0.4rem;background:#eef2ff;color:#1a3a6b;
                         padding:0.3rem 0.6rem;border-radius:20px;font-size:0.8rem;">
                ${u.name || u.email || ('ID ' + u.id)}
                <i class="fas fa-times" style="cursor:pointer;" onclick="adminNotificaciones.quitarUsuario(${u.id})"></i>
            </span>`).join('');
    },

    // ------------------------------------------
    // ENVIAR / PROGRAMAR
    // ------------------------------------------
    async enviar() {
        const title = document.getElementById('notifTitulo').value.trim();
        const message = document.getElementById('notifMensaje').value.trim();
        const targetType = document.querySelector('input[name="notifTargetType"]:checked').value;
        const envio = document.querySelector('input[name="notifEnvio"]:checked').value;

        if (!title || !message) { alert('Completá título y mensaje'); return; }

        const body = { title, message, targetType };

        if (targetType === 'SEGMENTS') {
            const segments = Array.from(document.querySelectorAll('.notif-segmento-check:checked')).map(c => c.value);
            if (segments.length === 0) { alert('Elegí al menos un segmento (Free, Premium o Creator)'); return; }
            body.segments = segments;
        } else {
            if (this.usuariosSeleccionados.length === 0) { alert('Agregá al menos un usuario'); return; }
            body.userIds = this.usuariosSeleccionados.map(u => u.id);
        }

        if (envio === 'programado') {
            const fecha = document.getElementById('notifFechaProgramada').value;
            if (!fecha) { alert('Elegí una fecha y hora'); return; }
            body.scheduledAt = fecha; // datetime-local ya viene en formato ISO local (yyyy-MM-ddTHH:mm)
        }

        const confirmacion = envio === 'programado'
            ? `¿Programar esta notificación para el ${new Date(body.scheduledAt).toLocaleString('es-AR')}?`
            : '¿Enviar esta notificación ahora?';
        if (!confirm(confirmacion)) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Error al crear la notificación');
            }
            this.resetForm();
            await this.cargarHistorial();
            alert(envio === 'programado' ? 'Notificación programada correctamente.' : 'Notificación enviada correctamente.');
        } catch (e) {
            alert(e.message);
        }
    },

    resetForm() {
        document.getElementById('notifTitulo').value = '';
        document.getElementById('notifMensaje').value = '';
        document.querySelectorAll('.notif-segmento-check').forEach(c => c.checked = false);
        this.usuariosSeleccionados = [];
        this.renderSeleccionados();
        document.getElementById('notifFechaProgramada').value = '';
    },

    // ------------------------------------------
    // HISTORIAL
    // ------------------------------------------
    async cargarHistorial() {
        const tbody = document.getElementById('tablaNotificacionesBody');
        if (!tbody) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const campanas = await response.json();

            if (campanas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Todavía no enviaste ninguna notificación</td></tr>`;
                return;
            }

            tbody.innerHTML = campanas.map(c => {
                const destino = c.targetType === 'SEGMENTS'
                    ? (c.targetSegments || []).join(', ')
                    : `${(c.targetUserIds || []).length} usuario(s) puntual(es)`;
                const estadoBadge = c.status === 'SENT'
                    ? '<span class="badge-activo">Enviada</span>'
                    : '<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:12px;font-size:11px;">Programada</span>';
                const fecha = c.status === 'SENT'
                    ? (c.sentAt ? new Date(c.sentAt).toLocaleString('es-AR') : '—')
                    : (c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('es-AR') : '—');

                return `
                    <tr>
                        <td><strong>${c.title}</strong></td>
                        <td>${destino}</td>
                        <td>${estadoBadge}</td>
                        <td>${fecha}</td>
                        <td>${c.recipientsCount ?? '—'}</td>
                        <td>${c.createdBy || '—'}</td>
                    </tr>`;
            }).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="loading-row" style="color:#e50914;">Error al cargar el historial</td></tr>`;
        }
    }
};