// ==============================================
// admin-canjes.js - Gestión de canjes para admin
// ==============================================

const adminCanjes = {
    currentPage: 0,
    totalPages: 1,
    totalItems: 0,
    currentFilter: 'todos',
    searchQuery: '',
    tipoActivo: 'comunes', // 'comunes' | 'premium'

    // Paginación frontend para filtros por estado
    datosActuales: [],
    paginaActual: 1,
    porPagina: 10,

    // Inicializar
    init: function() {
        this.renderTabs();
        this.tipoActivo = 'comunes';
        this._activarTab('comunes');
        const select = document.getElementById('filtroEstadoCanjes');
        const valorInicial = (select && select.value) ? select.value : 'todos';
        if (valorInicial === 'todos') {
            this.cargarCanjes(0);
        } else {
            this.cargarPorEstado(valorInicial);
        }
    },

    // ------------------------------------------
    // TABS COMUNES / PREMIUM
    // ------------------------------------------
    renderTabs: function() {
        const section = document.getElementById('section-canjes');
        if (!section || document.getElementById('canjesTabs')) return;

        const tabsHTML = `
            <div id="canjesTabs" style="display:flex; gap:0.5rem; margin-bottom:1rem;">
                <button id="tabCanjesComunes"
                    onclick="adminCanjes.switchTipo('comunes')"
                    style="padding:0.45rem 1.2rem; border-radius:6px; border:1px solid #ddd;
                           cursor:pointer; font-weight:600; background:#e50914; color:white;">
                    🎁 Comunes
                </button>
                <button id="tabCanjesPremium"
                    onclick="adminCanjes.switchTipo('premium')"
                    style="padding:0.45rem 1.2rem; border-radius:6px; border:1px solid #ddd;
                           cursor:pointer; font-weight:600; background:white; color:#333;">
                    ⭐ Premium
                </button>
            </div>`;

        const statsRow = section.querySelector('.stats-row') || section.querySelector('table') || section.firstElementChild;
        if (statsRow) {
            statsRow.insertAdjacentHTML('beforebegin', tabsHTML);
        } else {
            section.insertAdjacentHTML('afterbegin', tabsHTML);
        }
    },

    _activarTab: function(tipo) {
        const btnComunes = document.getElementById('tabCanjesComunes');
        const btnPremium = document.getElementById('tabCanjesPremium');
        if (!btnComunes || !btnPremium) return;
        if (tipo === 'comunes') {
            btnComunes.style.background = '#e50914';
            btnComunes.style.color = 'white';
            btnPremium.style.background = 'white';
            btnPremium.style.color = '#333';
        } else {
            btnPremium.style.background = '#e50914';
            btnPremium.style.color = 'white';
            btnComunes.style.background = 'white';
            btnComunes.style.color = '#333';
        }
    },

    switchTipo: function(tipo) {
        this.tipoActivo = tipo;
        this._activarTab(tipo);
        this.currentFilter = 'todos';
        const select = document.getElementById('filtroEstadoCanjes');
        if (select) select.value = 'todos';
        if (tipo === 'comunes') {
            this.cargarCanjes(0);
        } else {
            this.cargarCanjesPremium();
        }
    },

    // ==============================================
    // CANJES COMUNES
    // ==============================================
    cargarCanjes: async function(page = 0) {
        const tbody = document.getElementById('tablaCanjesBody');
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">
            <i class="fas fa-spinner fa-spin"></i> Cargando canjes...</td></tr>`;

        try {
            const url = `${CONFIG.API_URL}/admin/redemptions?page=${page}&size=${this.porPagina}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const data = await response.json();
            this.currentPage  = data.currentPage;
            this.totalPages   = data.totalPages;
            this.totalItems   = data.totalItems;
            this.currentFilter = 'todos';
            this.renderTabla(data.redemptions);
            this.actualizarStats();
            this.actualizarPaginacion();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">
                Error al cargar los canjes</td></tr>`;
        }
    },

    cargarPorEstado: async function(estado) {
        const tbody = document.getElementById('tablaCanjesBody');
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">
            <i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;
        try {
            this.currentFilter = estado;
            const response = await fetch(`${CONFIG.API_URL}/admin/redemptions/status/${estado}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const canjes = await response.json();
            this.datosActuales = canjes;
            this.paginaActual  = 1;
            this.totalItems    = canjes.length;
            const paginacionBackend = document.getElementById('canjesPagination');
            if (paginacionBackend) paginacionBackend.style.display = 'none';
            this.renderTablaFrontend();
            await this.actualizarStats();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">
                Error al cargar los canjes</td></tr>`;
        }
    },

    // ==============================================
    // CANJES PREMIUM
    // ==============================================
    cargarCanjesPremium: async function(estado = null) {
        const tbody = document.getElementById('tablaCanjesBody');
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">
            <i class="fas fa-spinner fa-spin"></i> Cargando canjes premium...</td></tr>`;

        const paginacionBackend = document.getElementById('canjesPagination');
        if (paginacionBackend) paginacionBackend.style.display = 'none';
        const paginacionFrontend = document.getElementById('canjesFrontendPaginacion');
        if (paginacionFrontend) paginacionFrontend.style.display = 'none';

        try {
            const url = estado && estado !== 'todos'
                ? `${CONFIG.API_URL}/admin/premium/redemptions/status/${estado}`
                : `${CONFIG.API_URL}/admin/premium/redemptions`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const canjes = await response.json();

            this.datosActuales = canjes;
            this.paginaActual  = 1;
            this.totalItems    = canjes.length;

            if (canjes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No hay canjes premium registrados</td></tr>`;
                return;
            }

            tbody.innerHTML = this.generarFilasPremium(canjes.slice(0, this.porPagina));
            this.renderPaginacionFrontendPremium();

        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">
                Error al cargar los canjes premium</td></tr>`;
        }
    },

    generarFilasPremium: function(canjes) {
        return canjes.map(c => {
            const fecha = new Date(c.redeemedAt).toLocaleDateString('es-ES');

            const estadoClass = {
                'PENDING':     'badge-pendiente',
                'COORDINATED': 'badge-coordinado',
                'COMPLETED':   'badge-completado',
                'EXPIRED':     'badge-expirado',
                'CANCELLED':   'badge-cancelado'
            }[c.status] || '';

            const estadoText = {
                'PENDING':     'Pendiente',
                'COORDINATED': 'Coordinado',
                'COMPLETED':   'Completado',
                'EXPIRED':     'Expirado',
                'CANCELLED':   'Cancelado'
            }[c.status] || c.status;

            const acciones = (c.status === 'PENDING' || c.status === 'COORDINATED') ? `
                <button class="btn-accion btn-completar" title="Marcar como usado"
                        onclick="adminCanjes.marcarPremiumComoUsado(${c.id})">
                    <i class="fas fa-check"></i>
                </button>
            ` : '';

            return `
                <tr>
                    <td>${fecha}</td>
                    <td>
                        <div class="usuario-info">
                            <strong>${c.userName || 'N/A'}</strong><br>
                            <small>${c.userEmail || 'N/A'}</small>
                        </div>
                    </td>
                    <td>
                        <div class="premio-info">
                            ${c.rewardImageUrl
                                ? `<img src="${c.rewardImageUrl}" alt="${c.rewardName}" class="tabla-img-mini">`
                                : `<div class="tabla-img-placeholder-mini"><i class="fas fa-star"></i></div>`
                            }
                            <span>${c.rewardName || 'N/A'}</span>
                        </div>
                    </td>
                    <td><strong>${c.pointsSpent}</strong> pts</td>
                    <td><code class="codigo-canje">${c.redemptionCode || '-'}</code></td>
                    <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                    <td>-</td>
                    <td>
                        <div class="tabla-acciones">
                            ${acciones}
                            <button class="btn-accion btn-ver" title="Ver detalles"
                                    onclick="adminCanjes.verDetallesPremium(${c.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-accion btn-eliminar" title="Eliminar"
                                    onclick="adminCanjes.eliminarCanjePremium(${c.id})"
                                    style="background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    renderPaginacionFrontendPremium: function() {
        let paginacion = document.getElementById('canjesFrontendPaginacion');
        if (!paginacion) {
            const seccion = document.getElementById('section-canjes');
            if (!seccion) return;
            paginacion = document.createElement('div');
            paginacion.id = 'canjesFrontendPaginacion';
            paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
            seccion.appendChild(paginacion);
        }
        const totalPaginas = Math.ceil(this.datosActuales.length / this.porPagina);
        if (totalPaginas <= 1) { paginacion.style.display = 'none'; return; }
        paginacion.style.display = 'flex';
        paginacion.innerHTML = `
            <button onclick="adminCanjes.cambiarPaginaPremium(${this.paginaActual - 1})"
                ${this.paginaActual === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${this.paginaActual} de ${totalPaginas}
            </span>
            <button onclick="adminCanjes.cambiarPaginaPremium(${this.paginaActual + 1})"
                ${this.paginaActual >= totalPaginas ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-right"></i>
            </button>`;
    },

    cambiarPaginaPremium: function(pagina) {
        const totalPaginas = Math.ceil(this.datosActuales.length / this.porPagina);
        if (pagina < 1 || pagina > totalPaginas) return;
        this.paginaActual = pagina;
        const inicio = (pagina - 1) * this.porPagina;
        const tbody = document.getElementById('tablaCanjesBody');
        tbody.innerHTML = this.generarFilasPremium(this.datosActuales.slice(inicio, inicio + this.porPagina));
        this.renderPaginacionFrontendPremium();
    },

    marcarPremiumComoUsado: async function(id) {
        if (!confirm('¿Confirmás marcar este canje premium como usado?')) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/premium/redemptions/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'COMPLETED' })
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            toast('Canje premium marcado como usado correctamente', 'success');
            const select = document.getElementById('filtroEstadoCanjes');
            this.cargarCanjesPremium(select?.value || 'todos');
        } catch (error) {
            toast('Error al marcar el canje premium como usado', 'error');
        }
    },

    eliminarCanjePremium: async function(id) {
        if (!confirm('¿Confirmás eliminar este canje premium?')) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/premium/redemptions/${id}/delete`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            toast('Canje premium eliminado correctamente', 'success');
            const select = document.getElementById('filtroEstadoCanjes');
            this.cargarCanjesPremium(select?.value || 'todos');
        } catch {
            toast('Error al eliminar el canje premium', 'error');
        }
    },

    // ==============================================
    // RENDER TABLA COMUNES
    // ==============================================
    renderTabla: function(canjes) {
        const tbody = document.getElementById('tablaCanjesBody');
        const paginacionFrontend = document.getElementById('canjesFrontendPaginacion');
        if (paginacionFrontend) paginacionFrontend.style.display = 'none';
        if (canjes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No hay canjes registrados</td></tr>`;
            return;
        }
        tbody.innerHTML = this.generarFilas(canjes);
    },

    renderTablaFrontend: function() {
        const tbody = document.getElementById('tablaCanjesBody');
        if (!tbody) return;
        const datos       = this.datosActuales;
        const totalPag    = Math.ceil(datos.length / this.porPagina);
        this.paginaActual = Math.max(1, Math.min(this.paginaActual, totalPag || 1));
        const inicio      = (this.paginaActual - 1) * this.porPagina;
        const slice       = datos.slice(inicio, inicio + this.porPagina);
        if (datos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No hay canjes registrados</td></tr>`;
            this.renderPaginacionFrontend();
            return;
        }
        tbody.innerHTML = this.generarFilas(slice);
        this.renderPaginacionFrontend();
    },

    generarFilas: function(canjes) {
        return canjes.map(c => {
            const fecha = new Date(c.redemptionDate).toLocaleDateString('es-ES');
            const vence = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-ES') : '-';

            const estadoClass = {
                'PENDING':     'badge-pendiente',
                'COORDINATED': 'badge-coordinado',
                'COMPLETED':   'badge-completado',
                'EXPIRED':     'badge-expirado',
                'CANCELLED':   'badge-cancelado'
            }[c.status] || '';

            const estadoText = {
                'PENDING':     'Pendiente',
                'COORDINATED': 'Coordinado',
                'COMPLETED':   'Completado',
                'EXPIRED':     'Expirado',
                'CANCELLED':   'Cancelado'
            }[c.status] || c.status;

            const acciones = (c.status === 'PENDING' || c.status === 'COORDINATED') ? `
                <button class="btn-accion btn-completar" title="Marcar como usado"
                        onclick="adminCanjes.marcarComoUsado(${c.id})">
                    <i class="fas fa-check"></i>
                </button>
            ` : '';

            return `
                <tr>
                    <td>${fecha}</td>
                    <td>
                        <div class="usuario-info">
                            <strong>${c.user?.name || 'N/A'}</strong><br>
                            <small>${c.user?.email || 'N/A'}</small>
                        </div>
                    </td>
                    <td>
                        <div class="premio-info">
                            ${c.reward?.imageUrl
                                ? `<img src="${c.reward.imageUrl}" alt="${c.reward.name}" class="tabla-img-mini">`
                                : `<div class="tabla-img-placeholder-mini"><i class="fas fa-gift"></i></div>`
                            }
                            <span>${c.reward?.name || 'N/A'}</span>
                        </div>
                    </td>
                    <td><strong>${c.pointsSpent}</strong> pts</td>
                    <td><code class="codigo-canje">${c.redemptionCode || '-'}</code></td>
                    <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                    <td>${vence}</td>
                    <td>
                        <div class="tabla-acciones">
                            ${acciones}
                            <button class="btn-accion btn-ver" title="Ver detalles"
                                    onclick="adminCanjes.verDetalles(${c.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-accion btn-eliminar" title="Eliminar"
                                    onclick="adminCanjes.eliminarCanje(${c.id})"
                                    style="background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    // ------------------------------------------
    // PAGINACIÓN FRONTEND (filtros por estado)
    // ------------------------------------------
    renderPaginacionFrontend: function() {
        let paginacion = document.getElementById('canjesFrontendPaginacion');
        if (!paginacion) {
            const seccion = document.getElementById('section-canjes');
            if (!seccion) return;
            paginacion = document.createElement('div');
            paginacion.id = 'canjesFrontendPaginacion';
            paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
            seccion.appendChild(paginacion);
        }
        const totalPaginas = Math.ceil(this.datosActuales.length / this.porPagina);
        if (totalPaginas <= 1) { paginacion.style.display = 'none'; return; }
        paginacion.style.display = 'flex';
        paginacion.innerHTML = `
            <button onclick="adminCanjes.cambiarPaginaFrontend(${this.paginaActual - 1})"
                ${this.paginaActual === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${this.paginaActual} de ${totalPaginas}
            </span>
            <button onclick="adminCanjes.cambiarPaginaFrontend(${this.paginaActual + 1})"
                ${this.paginaActual >= totalPaginas ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-right"></i>
            </button>`;
    },

    cambiarPaginaFrontend: function(pagina) {
        const totalPaginas = Math.ceil(this.datosActuales.length / this.porPagina);
        if (pagina < 1 || pagina > totalPaginas) return;
        this.paginaActual = pagina;
        this.renderTablaFrontend();
        document.getElementById('section-canjes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // Actualizar estadísticas
    actualizarStats: async function() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/redemptions?page=0&size=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar estadísticas');
            const data = await response.json();
            const total = data.totalItems || data.redemptions?.length || 0;
            document.getElementById('statCanjesTotal').textContent = total;

            if (data.redemptions && Array.isArray(data.redemptions)) {
                const pendientes  = data.redemptions.filter(r => r.status === 'PENDING').length;
                const completados = data.redemptions.filter(r => r.status === 'COMPLETED').length;
                const expirados   = data.redemptions.filter(r => r.status === 'EXPIRED').length;
                const cancelados  = data.redemptions.filter(r => r.status === 'CANCELLED').length;
                document.getElementById('statCanjesPendientes').textContent  = pendientes;
                document.getElementById('statCanjesCompletados').textContent = completados;
                document.getElementById('statCanjesExpirados').textContent   = expirados;
                const canceladosEl = document.getElementById('statCanjesCancelados');
                if (canceladosEl) canceladosEl.textContent = cancelados;
                const badge = document.getElementById('adminCanjesBadge');
                if (badge) {
                    if (pendientes > 0) { badge.textContent = pendientes; badge.style.display = 'inline'; }
                    else { badge.style.display = 'none'; }
                }
            }
        } catch (error) {}
    },

    // ==============================================
    // VER DETALLES DEL CANJE (MODAL)
    // ==============================================
    verDetalles: async function(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/redemptions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al obtener detalles');
            const canje = await response.json();

            document.getElementById('detalle-user-id').textContent       = canje.user?.id || '-';
            document.getElementById('detalle-user-nombre').textContent   = canje.user?.name || '-';
            document.getElementById('detalle-user-email').textContent    = canje.user?.email || '-';
            document.getElementById('detalle-user-dni').textContent      = canje.user?.dni || '-';
            document.getElementById('detalle-user-telefono').textContent = canje.user?.phone || '-';
            document.getElementById('detalle-premio-id').textContent     = canje.reward?.id || '-';
            document.getElementById('detalle-premio-nombre').textContent = canje.reward?.name || '-';
            document.getElementById('detalle-premio-puntos').textContent = canje.reward?.pointsRequired ? canje.reward.pointsRequired + ' pts' : '-';
            document.getElementById('detalle-premio-partner').textContent = canje.reward?.partner || '-';

            const websiteSpan = document.getElementById('detalle-premio-website');
            if (canje.reward?.website) {
                websiteSpan.innerHTML = `<a href="${canje.reward.website}" target="_blank" rel="noopener noreferrer">${canje.reward.website}</a>`;
            } else {
                websiteSpan.textContent = '-';
            }

            const imagenDiv = document.getElementById('detalle-premio-imagen');
            if (canje.reward?.imageUrl) {
                imagenDiv.innerHTML = `<img src="${canje.reward.imageUrl}" alt="${canje.reward.name}">`;
            } else {
                imagenDiv.innerHTML = '<i class="fas fa-gift"></i>';
            }

            document.getElementById('detalle-fecha').textContent  = canje.redemptionDate ? new Date(canje.redemptionDate).toLocaleDateString('es-ES') : '-';
            document.getElementById('detalle-codigo').textContent = canje.redemptionCode || '-';

            const estadoSpan = document.getElementById('detalle-estado');
            estadoSpan.textContent = this.getEstadoTexto(canje.status);
            estadoSpan.className   = `value badge ${this.getEstadoClass(canje.status)}`;

            document.getElementById('detalle-puntos').textContent = canje.pointsSpent ? canje.pointsSpent + ' pts' : '-';
            document.getElementById('detalle-vence').textContent  = canje.expiresAt ? new Date(canje.expiresAt).toLocaleDateString('es-ES') : '-';
            document.getElementById('detalle-usado').textContent  = canje.usedAt ? new Date(canje.usedAt).toLocaleDateString('es-ES') : 'No usado';

            const terminosBox = document.getElementById('detalle-terminos-box');
            const terminosP   = document.getElementById('detalle-terminos');
            if (canje.reward?.termsConditions) {
                terminosBox.style.display = 'block';
                terminosP.textContent = canje.reward.termsConditions;
            } else {
                terminosBox.style.display = 'none';
            }

                await this._cargarSeccionPuntosEntrega(canje, 'free', id);

                const modal = document.getElementById('modalDetalleCanje');
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('open'), 10);

            } catch (error) {
                toast('Error al cargar los detalles del canje', 'error');
            }
        },

        // ==============================================
        // VER DETALLES DEL CANJE PREMIUM (mismo modal que Free)
        // ==============================================
        verDetallesPremium: async function(id) {
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/premium/redemptions/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Error al obtener detalles');
                const canje = await response.json();

                document.getElementById('detalle-user-id').textContent       = '-';
                document.getElementById('detalle-user-nombre').textContent   = canje.userName || '-';
                document.getElementById('detalle-user-email').textContent    = canje.userEmail || '-';
                document.getElementById('detalle-user-dni').textContent      = '-';
                document.getElementById('detalle-user-telefono').textContent = '-';
                document.getElementById('detalle-premio-id').textContent     = canje.rewardId || '-';
                document.getElementById('detalle-premio-nombre').textContent = canje.rewardName || '-';
                document.getElementById('detalle-premio-puntos').textContent = canje.rewardPointsRequired ? canje.rewardPointsRequired + ' pts' : '-';
                document.getElementById('detalle-premio-partner').textContent = canje.rewardPartner || '-';

                const websiteSpan = document.getElementById('detalle-premio-website');
                if (canje.rewardWebsite) {
                    websiteSpan.innerHTML = `<a href="${canje.rewardWebsite}" target="_blank" rel="noopener noreferrer">${canje.rewardWebsite}</a>`;
                } else {
                    websiteSpan.textContent = '-';
                }

                const imagenDiv = document.getElementById('detalle-premio-imagen');
                imagenDiv.innerHTML = canje.rewardImageUrl
                    ? `<img src="${canje.rewardImageUrl}" alt="${canje.rewardName}">`
                    : '<i class="fas fa-star"></i>';

                document.getElementById('detalle-fecha').textContent  = canje.redeemedAt ? new Date(canje.redeemedAt).toLocaleDateString('es-ES') : '-';
                document.getElementById('detalle-codigo').textContent = canje.redemptionCode || '-';

                const estadoSpan = document.getElementById('detalle-estado');
                estadoSpan.textContent = this.getEstadoTexto(canje.status);
                estadoSpan.className   = `value badge ${this.getEstadoClass(canje.status)}`;

                document.getElementById('detalle-puntos').textContent = canje.pointsSpent ? canje.pointsSpent + ' pts' : '-';
                document.getElementById('detalle-vence').textContent  = '-';
                document.getElementById('detalle-usado').textContent  = canje.status === 'COMPLETED' ? 'Sí' : 'No usado';

                const terminosBox = document.getElementById('detalle-terminos-box');
                const terminosP   = document.getElementById('detalle-terminos');
                if (canje.rewardTermsConditions) {
                    terminosBox.style.display = 'block';
                    terminosP.textContent = canje.rewardTermsConditions;
                } else {
                    terminosBox.style.display = 'none';
                }

                await this._cargarSeccionPuntosEntrega(canje, 'premium', id);

                const modal = document.getElementById('modalDetalleCanje');
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('open'), 10);

            } catch (error) {
                toast('Error al cargar los detalles del canje premium', 'error');
            }
        },

        // ==============================================
        // PUNTOS DE ENTREGA — centro de autogestión
        // ==============================================
        _cargarSeccionPuntosEntrega: async function(canje, tipo, id) {
            this._modalTipo = tipo;   // 'free' | 'premium' — lo usan agregarPuntoEntrega/eliminarPuntoEntrega
            this._modalId   = id;

            let box = document.getElementById('detalle-puntos-entrega-box');
            if (!box) {
                box = document.createElement('div');
                box.id = 'detalle-puntos-entrega-box';
                box.style.cssText = 'margin-top:1rem; padding-top:1rem; border-top:1px solid #eee;';
                const referencia = document.getElementById('detalle-terminos-box');
                if (referencia && referencia.parentElement) {
                    referencia.insertAdjacentElement('afterend', box);
                }
            }
            if (!box.isConnected) return; // no se encontró dónde insertarlo — no rompemos el resto del modal

            const deliveryMethod = canje.reward?.deliveryMethod || canje.rewardDeliveryMethod || null;

            if (deliveryMethod === 'ENVIO_DOMICILIO') {
                box.innerHTML = `
                    <h4 style="margin:0 0 0.5rem;">📦 Envío a domicilio</h4>
                    <p style="font-size:0.85rem; color:#666;">
                        ${canje.deliveryAddress
                            ? `El usuario declaró esta dirección: <strong>${canje.deliveryAddress}</strong>`
                            : 'El usuario todavía no declaró la dirección de envío desde el centro de autogestión.'}
                    </p>`;
                return;
            }

            box.innerHTML = `<h4 style="margin:0 0 0.5rem;">📍 Puntos de entrega</h4><p class="loading-row" style="padding:0.5rem 0;"><i class="fas fa-spinner fa-spin"></i></p>`;

            const prefijo = tipo === 'premium' ? 'admin/premium/redemptions' : 'admin/redemptions';
            try {
                const res = await fetch(`${CONFIG.API_URL}/${prefijo}/${id}/delivery-points`, { headers: { 'Authorization': `Bearer ${token}` } });
                const puntos = res.ok ? await res.json() : [];
                this._renderPuntosEntrega(box, puntos, canje.chosenDeliveryPointId);
            } catch (e) {
                box.innerHTML += `<p style="color:#e50914;font-size:0.85rem;">Error al cargar los puntos de entrega.</p>`;
            }
        },

        _renderPuntosEntrega: function(box, puntos, elegidoId) {
            const listaHtml = puntos.length === 0
                ? `<p style="font-size:0.85rem; color:#999;">Todavía no cargaste ningún punto de entrega para este canje.</p>`
                : puntos.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; padding:0.5rem 0; border-bottom:1px solid #f2f2f2;">
                        <div>
                            <strong>${p.locationReference}</strong>${p.id === elegidoId ? ' <span class="badge badge-completado" style="font-size:0.7rem;">Elegido por el usuario</span>' : ''}
                            <div style="font-size:0.8rem; color:#666;">${p.scheduleInfo}</div>
                        </div>
                        <button class="btn-accion btn-eliminar" title="Eliminar" onclick="adminCanjes.eliminarPuntoEntrega(${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>`).join('');

            box.innerHTML = `
                <h4 style="margin:0 0 0.5rem;">📍 Puntos de entrega</h4>
                <div id="detalle-puntos-lista">${listaHtml}</div>
                <div style="display:flex; flex-direction:column; gap:0.4rem; margin-top:0.75rem;">
                    <input type="text" id="nuevoPuntoReferencia" placeholder="Referencia aproximada (ej: Palermo, CABA)" style="padding:0.4rem; border:1px solid #ddd; border-radius:6px;">
                    <textarea id="nuevoPuntoHorario" placeholder="Día y horario (ej: Martes y Jueves de 14 a 18hs)" rows="2" style="padding:0.4rem; border:1px solid #ddd; border-radius:6px;"></textarea>
                    <button class="btn-accion" style="align-self:flex-start; background:#e50914; color:white; padding:0.4rem 1rem;" onclick="adminCanjes.agregarPuntoEntrega()">
                        <i class="fas fa-plus"></i> Agregar punto
                    </button>
                </div>`;
        },

        agregarPuntoEntrega: async function() {
            const referencia = document.getElementById('nuevoPuntoReferencia').value.trim();
            const horario     = document.getElementById('nuevoPuntoHorario').value.trim();
            if (!referencia || !horario) {
                toast('Completá referencia y horario', 'error');
                return;
            }
            const prefijo = this._modalTipo === 'premium' ? 'admin/premium/redemptions' : 'admin/redemptions';
            try {
                const res = await fetch(`${CONFIG.API_URL}/${prefijo}/${this._modalId}/delivery-points`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ locationReference: referencia, scheduleInfo: horario })
                });
                if (!res.ok) throw new Error();
                toast('Punto de entrega agregado', 'success');
                this._modalTipo === 'premium' ? this.verDetallesPremium(this._modalId) : this.verDetalles(this._modalId);
            } catch (e) {
                toast('Error al agregar el punto de entrega', 'error');
            }
        },

        eliminarPuntoEntrega: async function(pointId) {
            if (!confirm('¿Eliminar este punto de entrega?')) return;
            const prefijo = this._modalTipo === 'premium' ? 'admin/premium/redemptions' : 'admin/redemptions';
            try {
                const res = await fetch(`${CONFIG.API_URL}/${prefijo}/delivery-points/${pointId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error();
                toast('Punto eliminado', 'success');
                this._modalTipo === 'premium' ? this.verDetallesPremium(this._modalId) : this.verDetalles(this._modalId);
            } catch (e) {
                toast('Error al eliminar el punto', 'error');
            }
        },

    cerrarModalDetalles: function() {
        const modal = document.getElementById('modalDetalleCanje');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => { modal.style.display = 'none'; }, 250);
        }
    },

    getEstadoTexto: function(status) {
        return { 'PENDING': 'Pendiente', 'COORDINATED': 'Coordinado', 'COMPLETED': 'Completado', 'EXPIRED': 'Expirado', 'CANCELLED': 'Cancelado' }[status] || status;
    },

    getEstadoClass: function(status) {
        return { 'PENDING': 'badge-pendiente', 'COORDINATED': 'badge-coordinado', 'COMPLETED': 'badge-completado', 'EXPIRED': 'badge-expirado', 'CANCELLED': 'badge-cancelado' }[status] || '';
    },

    buscar: function(query) {
        this.searchQuery = query;
        if (query.length <= 2) {
            if (this.tipoActivo === 'premium') {
                this.cargarCanjesPremium(this.currentFilter !== 'todos' ? this.currentFilter : null);
            } else if (this.currentFilter === 'todos') {
                this.cargarCanjes(0);
            } else {
                this.cargarPorEstado(this.currentFilter);
            }
        }
    },

    cambiarPagina: function(direccion) {
        let nuevaPagina = direccion === 'siguiente' ? this.currentPage + 1 : this.currentPage - 1;
        if (nuevaPagina < 0 || nuevaPagina >= this.totalPages) return;
        if (this.currentFilter === 'todos') this.cargarCanjes(nuevaPagina);
    },

    actualizarPaginacion: function() {
        const pagination   = document.getElementById('canjesPagination');
        const btnAnterior  = document.getElementById('btnCanjesAnterior');
        const btnSiguiente = document.getElementById('btnCanjesSiguiente');
        const infoPagina   = document.getElementById('canjesPageInfo');
        if (this.currentFilter !== 'todos' || this.totalPages <= 1) {
            if (pagination) pagination.style.display = 'none';
            return;
        }
        pagination.style.display  = 'flex';
        btnAnterior.disabled  = this.currentPage === 0;
        btnSiguiente.disabled = this.currentPage === this.totalPages - 1;
        infoPagina.textContent = `Página ${this.currentPage + 1} de ${this.totalPages}`;
    },

    // ==============================================
    // MARCAR CANJE COMÚN COMO USADO
    // ==============================================
    marcarComoUsado: async function(id) {
        if (!confirm('¿Confirmás marcar este canje como usado?')) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/redemptions/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'COMPLETED' })
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            toast('Canje marcado como usado correctamente', 'success');
            if (this.currentFilter === 'todos') {
                this.cargarCanjes(this.currentPage);
            } else {
                this.cargarPorEstado(this.currentFilter);
            }
        } catch (error) {
            toast('Error al marcar el canje como usado', 'error');
        }
    },

    filtrarPorEstado: function(estado) {
        this.currentFilter = estado;
        if (this.tipoActivo === 'premium') {
            this.cargarCanjesPremium(estado !== 'todos' ? estado : null);
        } else if (estado === 'todos') {
            this.cargarCanjes(0);
        } else {
            this.cargarPorEstado(estado);
        }
    },

    eliminarCanje: async function(id) {
        if (!confirm('¿Confirmás eliminar este canje? No aparecerá más en el historial.')) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/redemptions/${id}/delete`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            toast('Canje eliminado correctamente', 'success');
            if (this.currentFilter === 'todos') {
                this.cargarCanjes(this.currentPage);
            } else {
                this.cargarPorEstado(this.currentFilter);
            }
        } catch {
            toast('Error al eliminar el canje', 'error');
        }
    }
};

// Cargar por default al entrar a la sección
document.addEventListener('DOMContentLoaded', () => {
    const sec = document.getElementById('section-canjes');
    if (sec && sec.classList.contains('active')) {
        adminCanjes.init();
    }

    if (typeof adminUI !== 'undefined' && adminUI.switchSection && !adminUI.__canjesHooked) {
        adminUI.__canjesHooked = true;
        const originalSwitch = adminUI.switchSection.bind(adminUI);
        adminUI.switchSection = function(section, el) {
            originalSwitch(section, el);
            if (section === 'canjes') {
                adminCanjes.init();
            }
        };
    }
});