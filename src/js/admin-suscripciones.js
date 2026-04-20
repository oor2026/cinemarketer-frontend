// ==============================================
// admin-suscripciones.js - Gestión de suscripciones premium
// ==============================================

const adminSuscripciones = {

    suscripciones: [],
    datosActuales: [],
    filtroActual: 'todas',
    paginaActual: 1,
    porPagina: 10,

    // ------------------------------------------
    // INIT
    // ------------------------------------------
    async init() {
        await this.cargarSuscripciones();
    },

    // ------------------------------------------
    // CARGAR SUSCRIPCIONES
    // ------------------------------------------
    async cargarSuscripciones() {
        const tbody = document.getElementById('tablaSuscripcionesBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/subscriptions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            this.suscripciones = await response.json();
            this.paginaActual = 1;
            this.datosActuales = this.aplicarFiltro(this.suscripciones);
            this.renderTabla();
            this.actualizarStats();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row" style="color:#e50914;">Error al cargar las suscripciones</td></tr>`;
        }
    },

    // ------------------------------------------
    // FILTRO
    // ------------------------------------------
    aplicarFiltro(subs) {
        if (this.filtroActual === 'activas')    return subs.filter(s => s.status === 'ACTIVE');
        if (this.filtroActual === 'canceladas') return subs.filter(s => s.status === 'CANCELLED');
        if (this.filtroActual === 'expiradas')  return subs.filter(s => s.status === 'EXPIRED');
        return subs;
    },

    filtrar(valor) {
        this.filtroActual = valor;
        this.paginaActual = 1;
        this.datosActuales = this.aplicarFiltro(this.suscripciones);
        this.renderTabla();
    },

    buscar(texto) {
        const lower = texto.toLowerCase();
        this.paginaActual = 1;
        this.datosActuales = this.suscripciones.filter(s =>
            (s.planName || '').toLowerCase().includes(lower)
        );
        this.renderTabla();
    },

    // ------------------------------------------
    // RENDER TABLA
    // ------------------------------------------
    renderTabla() {
        const tbody = document.getElementById('tablaSuscripcionesBody');
        if (!tbody) return;

        const subs = this.datosActuales;

        if (subs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay suscripciones que mostrar</td></tr>`;
            this.renderPaginacion();
            return;
        }

        const totalPaginas = Math.ceil(subs.length / this.porPagina);
        this.paginaActual = Math.max(1, Math.min(this.paginaActual, totalPaginas));
        const inicio = (this.paginaActual - 1) * this.porPagina;
        const slice  = subs.slice(inicio, inicio + this.porPagina);

        tbody.innerHTML = slice.map(s => {
            const estadoBadge = {
                'ACTIVE':    '<span class="badge-activo">Activa</span>',
                'CANCELLED': '<span class="badge-inactivo">Cancelada</span>',
                'EXPIRED':   '<span class="badge-inactivo">Expirada</span>',
                'PENDING':   '<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:12px;font-size:11px;">Pendiente</span>'
            }[s.status] || s.status;

            const renovacion = s.nextBillingDate
                ? new Date(s.nextBillingDate).toLocaleDateString('es-AR')
                : '—';
            const vencimiento = s.endDate
                ? new Date(s.endDate).toLocaleDateString('es-AR')
                : '—';
            const ultimoPago = s.lastPaymentStatus
                ? (s.lastPaymentStatus === 'approved'
                    ? '<span style="color:#2e7d32;">✓ Aprobado</span>'
                    : `<span style="color:#e50914;">${s.lastPaymentStatus}</span>`)
                : '—';

            return `
                <tr>
                    <td><strong>${s.planName || 'Premium'}</strong><br><small style="color:#888;">${s.planType || 'Mensual'}</small></td>
                    <td>${estadoBadge}</td>
                    <td>${s.startDate ? new Date(s.startDate).toLocaleDateString('es-AR') : '—'}</td>
                    <td>${vencimiento}</td>
                    <td>${renovacion}</td>
                    <td>${ultimoPago}</td>
                    <td class="acciones-col">
                        ${s.status === 'ACTIVE' ? `
                        <button class="btn-accion btn-eliminar" onclick="adminSuscripciones.cancelar(${s.subscriptionId})" title="Cancelar suscripción">
                            <i class="fas fa-ban"></i>
                        </button>` : ''}
                        <button class="btn-accion btn-editar" onclick="adminSuscripciones.verDetalle(${s.subscriptionId})" title="Ver historial de pagos">
                            <i class="fas fa-history"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        this.renderPaginacion();
    },

    // ------------------------------------------
    // PAGINACIÓN
    // ------------------------------------------
    renderPaginacion() {
        let paginacion = document.getElementById('suscripcionesPaginacion');
        if (!paginacion) {
            const seccion = document.getElementById('section-suscripciones');
            if (!seccion) return;
            paginacion = document.createElement('div');
            paginacion.id = 'suscripcionesPaginacion';
            paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
            seccion.appendChild(paginacion);
        }

        const total        = this.datosActuales.length;
        const totalPaginas = Math.ceil(total / this.porPagina);

        if (totalPaginas <= 1) {
            paginacion.style.display = 'none';
            return;
        }

        paginacion.style.display = 'flex';
        paginacion.innerHTML = `
            <button onclick="adminSuscripciones.cambiarPagina(${this.paginaActual - 1})"
                ${this.paginaActual === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${this.paginaActual} de ${totalPaginas}
            </span>
            <button onclick="adminSuscripciones.cambiarPagina(${this.paginaActual + 1})"
                ${this.paginaActual >= totalPaginas ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    },

    cambiarPagina(pagina) {
        const totalPaginas = Math.ceil(this.datosActuales.length / this.porPagina);
        if (pagina < 1 || pagina > totalPaginas) return;
        this.paginaActual = pagina;
        this.renderTabla();
        document.getElementById('section-suscripciones')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ------------------------------------------
    // STATS
    // ------------------------------------------
    actualizarStats() {
        const total      = this.suscripciones.length;
        const activas    = this.suscripciones.filter(s => s.status === 'ACTIVE').length;
        const canceladas = this.suscripciones.filter(s => s.status === 'CANCELLED').length;
        const expiradas  = this.suscripciones.filter(s => s.status === 'EXPIRED').length;
        document.getElementById('statSubsTotal')      && (document.getElementById('statSubsTotal').textContent = total);
        document.getElementById('statSubsActivas')    && (document.getElementById('statSubsActivas').textContent = activas);
        document.getElementById('statSubsCanceladas') && (document.getElementById('statSubsCanceladas').textContent = canceladas);
        document.getElementById('statSubsExpiradas')  && (document.getElementById('statSubsExpiradas').textContent = expiradas);
    },

    // ------------------------------------------
    // CANCELAR
    // ------------------------------------------
    async cancelar(id) {
        if (!confirm('¿Cancelar esta suscripción? El usuario mantendrá el acceso hasta fin del período pagado.')) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/subscriptions/${id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            await this.cargarSuscripciones();
        } catch {
            alert('Error al cancelar la suscripción');
        }
    },

    // ------------------------------------------
    // VER DETALLE / HISTORIAL DE PAGOS
    // ------------------------------------------
    async verDetalle(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/subscriptions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            const pagos = data.payments || [];

            const contenido = document.getElementById('detalleSubsContenido');
            contenido.innerHTML = `
                <h4 style="margin-bottom:1rem;">Historial de pagos</h4>
                ${pagos.length === 0
                    ? '<p style="color:#888;">Sin pagos registrados</p>'
                    : `<table class="admin-table">
                        <thead><tr><th>ID MP</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
                        <tbody>
                            ${pagos.map(p => `
                                <tr>
                                    <td>${p.mpPaymentId || '—'}</td>
                                    <td>$${p.amount || '—'}</td>
                                    <td>${p.status === 'approved'
                                        ? '<span style="color:#2e7d32;">✓ Aprobado</span>'
                                        : `<span style="color:#e50914;">${p.status}</span>`}</td>
                                    <td>${p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-AR') : '—'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>`}`;

            document.getElementById('modalDetalleSubsOverlay').style.display = 'flex';
        } catch {
            alert('Error al cargar el detalle');
        }
    },

    cerrarDetalle() {
        document.getElementById('modalDetalleSubsOverlay').style.display = 'none';
    },

    // ------------------------------------------
    // ALTA MANUAL
    // ------------------------------------------
    abrirAltaManual() {
        document.getElementById('inputAltaManualUserId').value = '';
        document.getElementById('modalAltaManualOverlay').style.display = 'flex';
    },

    cerrarAltaManual() {
        document.getElementById('modalAltaManualOverlay').style.display = 'none';
    },

    async confirmarAltaManual() {
        const userId = document.getElementById('inputAltaManualUserId').value.trim();
        if (!userId) { alert('Ingresá el ID del usuario'); return; }
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/subscriptions/${userId}/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
            });
            if (!response.ok) throw new Error();
            this.cerrarAltaManual();
            await this.cargarSuscripciones();
        } catch {
            alert('Error al activar la suscripción manualmente');
        }
    }
};