// ==============================================
// admin-canjes.js - Gestión de canjes para admin
// ==============================================

const adminCanjes = {
    currentPage: 0,
    totalPages: 1,
    totalItems: 0,
    currentFilter: 'todos',
    searchQuery: '',

    // Paginación frontend para filtros por estado
    datosActuales: [],
    paginaActual: 1,
    porPagina: 10,

    // Inicializar - Carga según el valor del select
    init: function() {
        const select = document.getElementById('filtroEstadoCanjes');
        const valorInicial = (select && select.value) ? select.value : 'todos';

        if (valorInicial === 'todos') {
            this.cargarCanjes(0);
        } else {
            this.cargarPorEstado(valorInicial);
        }
    },

    // Cargar canjes desde API (todos) — paginación backend con size=10
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
            console.error('Error cargando canjes:', error);
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">
                Error al cargar los canjes</td></tr>`;
        }
    },

    // Cargar por estado — paginación frontend
    cargarPorEstado: async function(estado, page = 0) {
        const tbody = document.getElementById('tablaCanjesBody');
        const estadoTexto = estado === 'PENDING' ? 'pendientes' :
                            estado === 'COMPLETED' ? 'completados' :
                            estado === 'EXPIRED' ? 'expirados' : 'cancelados';

        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">
            <i class="fas fa-spinner fa-spin"></i> Cargando canjes ${estadoTexto}...</td></tr>`;

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

            // Ocultar paginación backend, usar paginación frontend
            const paginacionBackend = document.getElementById('canjesPagination');
            if (paginacionBackend) paginacionBackend.style.display = 'none';

            this.renderTablaFrontend();
            await this.actualizarStats();

        } catch (error) {
            console.error('Error cargando por estado:', error);
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">
                Error al cargar los canjes</td></tr>`;
        }
    },

    // Renderizar tabla con datos ya paginados (backend)
    renderTabla: function(canjes) {
        const tbody = document.getElementById('tablaCanjesBody');

        // Ocultar paginación frontend si estaba visible
        const paginacionFrontend = document.getElementById('canjesFrontendPaginacion');
        if (paginacionFrontend) paginacionFrontend.style.display = 'none';

        if (canjes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No hay canjes registrados</td></tr>`;
            return;
        }

        tbody.innerHTML = this.generarFilas(canjes);
    },

    // Renderizar tabla con paginación frontend (filtros por estado)
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

    // Generar HTML de filas (compartido)
    generarFilas: function(canjes) {
        return canjes.map(c => {
            const fecha = new Date(c.redemptionDate).toLocaleDateString('es-ES');
            const vence = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-ES') : '-';

            const estadoClass = {
                'PENDING':   'badge-pendiente',
                'COMPLETED': 'badge-completado',
                'EXPIRED':   'badge-expirado',
                'CANCELLED': 'badge-cancelado'
            }[c.status] || '';

            const estadoText = {
                'PENDING':   'Pendiente',
                'COMPLETED': 'Completado',
                'EXPIRED':   'Expirado',
                'CANCELLED': 'Cancelado'
            }[c.status] || c.status;

            const acciones = c.status === 'PENDING' ? `
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
                            ${c.reward?.imageUrl ?
                                `<img src="${c.reward.imageUrl}" alt="${c.reward.name}" class="tabla-img-mini">` :
                                `<div class="tabla-img-placeholder-mini"><i class="fas fa-gift"></i></div>`
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

        if (totalPaginas <= 1) {
            paginacion.style.display = 'none';
            return;
        }

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
            </button>
        `;
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
                    if (pendientes > 0) {
                        badge.textContent = pendientes;
                        badge.style.display = 'inline';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            } else {
                const estados = ['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'];
                for (const estado of estados) {
                    const res = await fetch(`${CONFIG.API_URL}/admin/redemptions/status/${estado}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const lista = await res.json();
                        const elementoId = `statCanjes${estado.charAt(0) + estado.slice(1).toLowerCase()}s`;
                        const elemento = document.getElementById(elementoId);
                        if (elemento) elemento.textContent = lista.length;

                        if (estado === 'PENDING') {
                            const badge = document.getElementById('adminCanjesBadge');
                            if (badge) {
                                if (lista.length > 0) {
                                    badge.textContent = lista.length;
                                    badge.style.display = 'inline';
                                } else {
                                    badge.style.display = 'none';
                                }
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error actualizando stats:', error);
        }
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

            const modal = document.getElementById('modalDetalleCanje');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('open'), 10);

        } catch (error) {
            console.error('Error cargando detalles:', error);
            toast('Error al cargar los detalles del canje', 'error');
        }
    },

    // ==============================================
    // CERRAR MODAL DE DETALLES
    // ==============================================
    cerrarModalDetalles: function() {
        const modal = document.getElementById('modalDetalleCanje');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => { modal.style.display = 'none'; }, 250);
        }
    },

    // ==============================================
    // FUNCIONES AUXILIARES PARA ESTADOS
    // ==============================================
    getEstadoTexto: function(status) {
        const estados = {
            'PENDING':   'Pendiente',
            'COMPLETED': 'Completado',
            'EXPIRED':   'Expirado',
            'CANCELLED': 'Cancelado'
        };
        return estados[status] || status;
    },

    getEstadoClass: function(status) {
        const clases = {
            'PENDING':   'badge-pendiente',
            'COMPLETED': 'badge-completado',
            'EXPIRED':   'badge-expirado',
            'CANCELLED': 'badge-cancelado'
        };
        return clases[status] || '';
    },

    // Buscar
    buscar: function(query) {
        this.searchQuery = query;
        if (query.length > 2) {
            console.log('Buscando:', query);
        } else {
            if (this.currentFilter === 'todos') {
                this.cargarCanjes(0);
            } else {
                this.cargarPorEstado(this.currentFilter);
            }
        }
    },

    // Paginación backend (filtro "todos")
    cambiarPagina: function(direccion) {
        let nuevaPagina = direccion === 'siguiente' ? this.currentPage + 1 : this.currentPage - 1;
        if (nuevaPagina < 0 || nuevaPagina >= this.totalPages) return;

        if (this.currentFilter === 'todos') {
            this.cargarCanjes(nuevaPagina);
        }
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
    // MARCAR CANJE COMO USADO
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
            console.error('Error marcando canje como usado:', error);
            toast('Error al marcar el canje como usado', 'error');
        }
    },

    // ==============================================
    // FILTRAR POR ESTADO
    // ==============================================
    filtrarPorEstado: function(estado) {
        this.currentFilter = estado;
        if (estado === 'todos') {
            this.cargarCanjes(0);
        } else {
            this.cargarPorEstado(estado);
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
