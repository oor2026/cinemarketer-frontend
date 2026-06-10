// ==============================================
// admin.js - Panel de administración
// ==============================================

const API_BASE = CONFIG.API_URL;
const token = localStorage.getItem('token');

// ==============================================
// ESTADO
// ==============================================
const adminState = {
    premios: [],
    premiosActuales: [],
    premiosPagina: 1,
    premiosPorPagina: 10,
    premioEditandoId: null,
    imagenPendiente: null
};

// ==============================================
// INIT
// ==============================================
document.addEventListener('DOMContentLoaded', async () => {

    if (!token) {
        window.location.replace('../login.html');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            window.location.replace('../login.html');
            return;
        }

        const profile = await response.json();

        if (profile.role !== 'ADMIN') {
            window.location.replace('../dashboard.html');
            return;
        }

        document.body.style.visibility = 'visible';
        document.body.style.opacity    = '1';
        document.getElementById('adminUserName').textContent = profile.name || profile.email;

    } catch (e) {
        window.location.replace('../login.html');
        return;
    }

    adminUI.cargarPremios();

    const activeSection = document.querySelector('.admin-section.active');
    if (activeSection) {
        const sectionId = activeSection.id.replace('section-', '');
        if (sectionId === 'canjes' && typeof adminCanjes !== 'undefined') {
            adminCanjes.init();
        } else if (sectionId === 'usuarios' && typeof adminUsuarios !== 'undefined') {
            adminUsuarios.init();
        } else if (sectionId === 'soporte' && typeof adminSoporte !== 'undefined') {
            adminSoporte.init();
        } else if (sectionId === 'faq' && typeof adminFaq !== 'undefined') {
            adminFaq.init();
        } else if (sectionId === 'avatares' && typeof adminAvatares !== 'undefined') {
            adminAvatares.init();
        } else if (sectionId === 'estadisticas' && typeof adminEstadisticas !== 'undefined') {
            adminEstadisticas.init();
        }
    }
});

// ==============================================
// UI CONTROLLER
// ==============================================
const adminUI = {

    // ------------------------------------------
    // SWITCH DE SECCIÓN (sidebar)
    // ------------------------------------------
    switchSection(sectionName, el) {
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${sectionName}`)?.classList.add('active');

        if (sectionName === 'premios') {
            // No hace falta, ya se cargan al inicio
        } else if (sectionName === 'premiosPremium' && typeof adminPremiosPremium !== 'undefined') {
            adminPremiosPremium.init();
        } else if (sectionName === 'suscripciones' && typeof adminSuscripciones !== 'undefined') {
            adminSuscripciones.init();
        } else if (sectionName === 'canjes' && typeof adminCanjes !== 'undefined') {
            adminCanjes.init();
        } else if (sectionName === 'usuarios' && typeof adminUsuarios !== 'undefined') {
            adminUsuarios.init();
        } else if (sectionName === 'soporte' && typeof adminSoporte !== 'undefined') {
            if (adminSoporte.cargarLista) adminSoporte.cargarLista();
        } else if (sectionName === 'faq' && typeof adminFaq !== 'undefined') {
            if (adminFaq.cargarLista) adminFaq.cargarLista();
        } else if (sectionName === 'avatares' && typeof adminAvatares !== 'undefined') {
            if (adminAvatares.init) adminAvatares.init();
        } else if (sectionName === 'supervision' && typeof adminSupervision !== 'undefined') {
            adminSupervision.init();
        } else if (sectionName === 'estadisticas' && typeof adminEstadisticas !== 'undefined') {
            adminEstadisticas.init();
        } else if (sectionName === 'comercial' && typeof adminComercial !== 'undefined') {
            adminComercial.cargar();
        }
    },

    // ------------------------------------------
    // CARGAR PREMIOS
    // ------------------------------------------
    async cargarPremios() {
        const tbody = document.getElementById('tablaPremiosBody');
        tbody.innerHTML = `<tr><td colspan="7" class="loading-row">
            <i class="fas fa-spinner fa-spin"></i> Cargando premios...</td></tr>`;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/rewards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            adminState.premios = await response.json();
            adminState.premiosPagina   = 1;
            adminState.premiosActuales = adminState.premios;
            this.renderTabla();
            this.actualizarStats(adminState.premios);

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row" style="color:#e50914;">
                Error al cargar premios</td></tr>`;
        }
    },

    // ------------------------------------------
    // RENDER TABLA
    // ------------------------------------------
    renderTabla() {
        const tbody = document.getElementById('tablaPremiosBody');
        const premios      = adminState.premiosActuales;
        const porPagina    = adminState.premiosPorPagina;
        const totalPaginas = Math.ceil(premios.length / porPagina);
        adminState.premiosPagina = Math.max(1, Math.min(adminState.premiosPagina, totalPaginas || 1));
        const inicio = (adminState.premiosPagina - 1) * porPagina;
        const slice  = premios.slice(inicio, inicio + porPagina);

        if (premios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay premios cargados aún</td></tr>`;
            this.renderPaginacion();
            return;
        }

        tbody.innerHTML = slice.map(p => {
            const img = p.imageUrl
                ? `<img src="${p.imageUrl}" alt="${p.name}" class="tabla-img">`
                : `<div class="tabla-img-placeholder"><i class="fas fa-gift"></i></div>`;

            const tipoBadge = p.rewardType === 'TICKET'
                            ? `<span class="badge badge-ticket">🎟️ Entrada</span>`
                            : p.rewardType === 'DESCUENTO'
                            ? `<span class="badge badge-merch">🏷️ Descuento</span>`
                            : p.rewardType === 'EXPERIENCIA'
                            ? `<span class="badge badge-merch">🎟️ Experiencia</span>`
                            : `<span class="badge badge-merch">🎁 Merch</span>`;

            let estadoBadge;
            if (!p.active) {
                estadoBadge = `<span class="badge badge-inactivo">Inactivo</span>`;
            } else if (!p.hasStock) {
                estadoBadge = `<span class="badge badge-agotado">Agotado</span>`;
            } else {
                estadoBadge = `<span class="badge badge-activo">Activo</span>`;
            }

            const btnActivar = p.active
                ? `<button class="btn-accion btn-desactivar" title="Desactivar"
                       onclick="adminUI.toggleActivo(${p.id}, false)">
                       <i class="fas fa-ban"></i></button>`
                : `<button class="btn-accion btn-activar" title="Activar"
                       onclick="adminUI.toggleActivo(${p.id}, true)">
                       <i class="fas fa-check"></i></button>`;

            return `
                <tr>
                    <td>${img}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${tipoBadge}</td>
                    <td><strong>${p.pointsRequired}</strong> pts</td>
                    <td>${p.stock}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <div class="tabla-acciones">
                            <button class="btn-accion btn-editar" title="Editar"
                                onclick="adminUI.abrirFormulario(${p.id})">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-accion btn-imagen" title="Gestionar imágenes"
                                onclick="adminUI.abrirFormulario(${p.id})">
                                <i class="fas fa-images"></i>
                            </button>
                            ${btnActivar}
                            <button class="btn-accion btn-eliminar" title="Eliminar"
                                onclick="adminUI.eliminarPremio(${p.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        this.renderPaginacion();
    },

    // ------------------------------------------
    // PAGINACIÓN
    // ------------------------------------------
    renderPaginacion() {
        let paginacion = document.getElementById('premiosPaginacion');
        if (!paginacion) {
            const seccion = document.getElementById('section-premios');
            if (!seccion) return;
            paginacion = document.createElement('div');
            paginacion.id = 'premiosPaginacion';
            paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
            seccion.appendChild(paginacion);
        }

        const total        = adminState.premiosActuales.length;
        const totalPaginas = Math.ceil(total / adminState.premiosPorPagina);

        if (totalPaginas <= 1) {
            paginacion.style.display = 'none';
            return;
        }

        paginacion.style.display = 'flex';
        paginacion.innerHTML = `
            <button onclick="adminUI.cambiarPagina(${adminState.premiosPagina - 1})"
                ${adminState.premiosPagina === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${adminState.premiosPagina} de ${totalPaginas}
            </span>
            <button onclick="adminUI.cambiarPagina(${adminState.premiosPagina + 1})"
                ${adminState.premiosPagina >= totalPaginas ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    },

    cambiarPagina(pagina) {
        const totalPaginas = Math.ceil(adminState.premiosActuales.length / adminState.premiosPorPagina);
        if (pagina < 1 || pagina > totalPaginas) return;
        adminState.premiosPagina = pagina;
        this.renderTabla();
        document.getElementById('section-premios')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ------------------------------------------
    // STATS
    // ------------------------------------------
    actualizarStats(premios) {
        document.getElementById('statTotal').textContent     = premios.length;
        document.getElementById('statActivos').textContent   = premios.filter(p => p.active && p.hasStock).length;
        document.getElementById('statAgotados').textContent  = premios.filter(p => p.active && !p.hasStock).length;
        document.getElementById('statInactivos').textContent = premios.filter(p => !p.active).length;
    },

    // ------------------------------------------
    // FILTRAR TABLA
    // ------------------------------------------
    filtrarPremios(query) {
        const q = query.toLowerCase();
        const estadoActivo = document.getElementById('filtroEstadoPremios')?.value || 'todos';
        const base = this._aplicarFiltroEstado(adminState.premios, estadoActivo);
        adminState.premiosActuales = base.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
        adminState.premiosPagina = 1;
        this.renderTabla();
    },

    filtrarPorEstado(estado) {
        const query = document.querySelector('#section-premios .search-input')?.value || '';
        const q = query.toLowerCase();
        const base = this._aplicarFiltroEstado(adminState.premios, estado);
        adminState.premiosActuales = q
            ? base.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q))
            : base;
        adminState.premiosPagina = 1;
        this.renderTabla();
    },

    _aplicarFiltroEstado(premios, estado) {
        switch (estado) {
            case 'activos':   return premios.filter(p => p.active && p.stock > 0);
            case 'inactivos': return premios.filter(p => !p.active);
            case 'agotados':  return premios.filter(p => p.active && p.stock === 0);
            default:          return premios;
        }
    },

    // ------------------------------------------
    // ABRIR FORMULARIO (crear o editar)
    // ------------------------------------------
    async abrirFormulario(id = null) {
        adminState.premioEditandoId = id;
        adminState.imagenPendiente  = null;

        document.getElementById('inputNombre').value      = '';
        document.getElementById('inputTipo').value        = '';
        document.getElementById('inputDescripcion').value = '';
        document.getElementById('descCount').textContent  = '0';
        document.getElementById('inputPuntos').value      = '';
        document.getElementById('inputStock').value       = '';
        document.getElementById('inputVencimiento').value = '';
        document.getElementById('inputActivo').value      = 'true';
        document.getElementById('inputTerminos').value    = '';
        document.getElementById('imagePreview').style.display     = 'none';
        document.getElementById('imagePlaceholder').style.display = 'flex';
        document.getElementById('inputImagen').value      = '';

        // Ocultar galería por defecto
        const wrapper = document.getElementById('galeriaImagenes');
        const grid    = document.getElementById('galeriaImagenesGrid');
        if (wrapper) wrapper.style.display = 'none';
        if (grid)    grid.innerHTML = '';

        if (id) {
            const premio = adminState.premios.find(p => p.id === id);
            if (premio) {
                document.getElementById('modalTitulo').textContent     = 'Editar Premio';
                document.getElementById('btnGuardarLabel').textContent = 'Guardar cambios';
                document.getElementById('inputNombre').value           = premio.name || '';
                document.getElementById('inputTipo').value             = premio.rewardType || '';
                document.getElementById('inputDescripcion').value      = premio.description || '';
                document.getElementById('descCount').textContent       = (premio.description || '').length;
                document.getElementById('inputPuntos').value           = premio.pointsRequired || '';
                document.getElementById('inputStock').value            = premio.stock || '';
                document.getElementById('inputVencimiento').value      = premio.expiryDate || '';
                document.getElementById('inputActivo').value           = String(premio.active);
                document.getElementById('inputTerminos').value         = premio.termsConditions || '';
                document.getElementById('inputPartner').value          = premio.partner || '';
                document.getElementById('inputWebsite').value          = premio.website || '';

                adminUI.toggleCamposTipoComun(premio.rewardType);
                if (premio.rewardType === 'MERCHANDISING') {
                    document.getElementById('inputMarca').value      = premio.brand || '';
                    document.getElementById('inputMaterial').value   = premio.material || '';
                    document.getElementById('inputColor').value      = premio.color || '';
                    document.getElementById('inputTalle').value      = premio.size || '';
                    document.getElementById('inputDimensiones').value = premio.dimensions || '';
                    document.getElementById('inputPeso').value       = premio.weight || '';
                    document.getElementById('inputOrigen').value     = premio.origin || '';
                    document.getElementById('inputUnidades').value   = premio.unitsIncluded || '';
                    document.getElementById('inputCondicion').value  = premio.condition || '';
                }
                if (premio.rewardType === 'TICKET') {
                    document.getElementById('inputCadenaCine').value          = premio.cinemaChain || '';
                    document.getElementById('inputFormatoCine').value         = premio.cinemaFormat || '';
                    document.getElementById('inputCantidadEntradas').value    = premio.ticketsIncluded || '';
                    document.getElementById('inputIncluyeConsumicion').value  = premio.includesSnack != null ? String(premio.includesSnack) : '';
                    document.getElementById('inputRestriccionesCine').value   = premio.cinemaRestrictions || '';
                }
                if (premio.rewardType === 'DESCUENTO') {
                    document.getElementById('inputDescuentoTipo').value       = premio.discountType || 'PERCENTAGE';
                    document.getElementById('inputDescuentoValor').value      = premio.discountValue || '';
                    document.getElementById('inputCanalDescuento').value      = premio.discountChannel || '';
                    document.getElementById('inputCompraMinima').value        = premio.minimumPurchase || '';
                    document.getElementById('inputProductosAplicables').value = premio.applicableProducts || '';
                    document.getElementById('inputAcumulable').value          = premio.stackable != null ? String(premio.stackable) : 'false';
                }
                if (premio.rewardType === 'EXPERIENCIA') {
                    document.getElementById('inputExperienciaTipo').value  = premio.experienceType || '';
                    document.getElementById('inputEventoFecha').value      = premio.eventDate ? premio.eventDate.substring(0,16) : '';
                    document.getElementById('inputEventoCupo').value       = premio.maxCapacity || '';
                    document.getElementById('inputEventoUbicacion').value  = premio.location || '';
                    document.getElementById('inputDuracion').value         = premio.duration || '';
                    document.getElementById('inputIncluyeTraslado').value  = premio.includesTransport != null ? String(premio.includesTransport) : 'false';
                    document.getElementById('inputAptoAcompanante').value  = premio.companionAllowed != null ? String(premio.companionAllowed) : 'false';
                    if (premio.requirements) {
                        const reqs = premio.requirements.split(',').map(r => r.trim());
                        document.querySelectorAll('input[name="requisito"]').forEach(cb => {
                            cb.checked = reqs.includes(cb.value);
                        });
                    }
                }

                if (premio.imageUrl) {
                    document.getElementById('imagePreview').src            = premio.imageUrl;
                    document.getElementById('imagePreview').style.display  = 'block';
                    document.getElementById('imagePlaceholder').style.display = 'none';
                }

                // Cargar galería de imágenes existentes
                await this.cargarGaleriaImagenes(id, 'COMMON');
            }
        } else {
            document.getElementById('modalTitulo').textContent     = 'Nuevo Premio';
            document.getElementById('btnGuardarLabel').textContent = 'Crear Premio';
            document.getElementById('inputPartner').value = '';
            document.getElementById('inputWebsite').value = '';
        }

        document.getElementById('modalOverlay').classList.add('open');
        document.getElementById('adminModal').classList.add('open');
    },

    cerrarFormulario() {
        document.getElementById('modalOverlay').classList.remove('open');
        document.getElementById('adminModal').classList.remove('open');
        adminState.premioEditandoId = null;
        adminState.imagenPendiente  = null;
        adminUI.toggleCamposTipoComun('');
        const galeriaEl = document.getElementById('galeriaImagenesGrid');
        const wrapper   = document.getElementById('galeriaImagenes');
        if (galeriaEl) galeriaEl.innerHTML = '';
        if (wrapper)   wrapper.style.display = 'none';
    },

    toggleCamposTipoComun(tipo) {
        const campoMerchandising = document.getElementById('campoMerchandisingComun');
        const campoTicket        = document.getElementById('campoTicketComun');
        const campoDescuento     = document.getElementById('campoDescuentoComun');
        const campoExperiencia   = document.getElementById('campoExperienciaComun');
        const campoPuntos        = document.getElementById('inputPuntos')?.closest('.form-group');
        const campoStock         = document.getElementById('inputStock')?.closest('.form-group');
        const campoVenci         = document.getElementById('inputVencimiento')?.closest('.form-group');

        if (campoMerchandising) campoMerchandising.style.display = tipo === 'MERCHANDISING' ? 'block' : 'none';
        if (campoTicket)        campoTicket.style.display        = tipo === 'TICKET'        ? 'block' : 'none';
        if (campoDescuento)     campoDescuento.style.display     = tipo === 'DESCUENTO'     ? 'block' : 'none';
        if (campoExperiencia)   campoExperiencia.style.display   = tipo === 'EXPERIENCIA'   ? 'block' : 'none';

        if (campoPuntos) campoPuntos.style.display = 'block';
        if (campoStock)  campoStock.style.display  = 'block';
        if (campoVenci)  campoVenci.style.display  = 'block';
    },

    // ------------------------------------------
    // PREVIEW DE IMAGEN (antes de guardar)
    // ------------------------------------------
    previewImagen(input) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast('La imagen supera los 5MB', 'error');
            input.value = '';
            return;
        }

        adminState.imagenPendiente = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreview').src            = e.target.result;
            document.getElementById('imagePreview').style.display  = 'block';
            document.getElementById('imagePlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    // ------------------------------------------
    // GUARDAR PREMIO (crear o editar)
    // ------------------------------------------
    async guardarPremio() {
        const nombre  = document.getElementById('inputNombre').value.trim();
        const tipo    = document.getElementById('inputTipo').value;
        const puntos  = document.getElementById('inputPuntos').value;
        const stock   = document.getElementById('inputStock').value;
        const puntosNum = parseInt(puntos);
        const stockNum  = parseInt(stock);

        if (isNaN(puntosNum) || puntosNum < 1 || puntosNum > 999999) {
            toast('Los puntos requeridos deben estar entre 1 y 999.999', 'error');
            return;
        }
        if (isNaN(stockNum) || stockNum < 0 || stockNum > 99999) {
            toast('El stock debe estar entre 0 y 99.999', 'error');
            return;
        }
        if (!nombre || !tipo) {
            toast('Completá todos los campos obligatorios', 'error');
            return;
        }
        if (tipo !== 'EXPERIENCIA' && (!puntos || !stock)) {
            toast('Completá todos los campos obligatorios', 'error');
            return;
        }

        const payload = {
            name:            nombre,
            rewardType:      tipo,
            description:     document.getElementById('inputDescripcion').value.trim(),
            pointsRequired:  parseInt(puntos),
            stock:           parseInt(stock),
            expiryDate:      document.getElementById('inputVencimiento').value || null,
            termsConditions: document.getElementById('inputTerminos').value.trim(),
            active:          document.getElementById('inputActivo').value === 'true',
            partner:         document.getElementById('inputPartner').value.trim() || null,
            website:         document.getElementById('inputWebsite').value.trim() || null,
            discountValue:        tipo === 'DESCUENTO' ? parseFloat(document.getElementById('inputDescuentoValor').value) || null : null,
            discountType:         tipo === 'DESCUENTO' ? document.getElementById('inputDescuentoTipo').value : null,
            discountChannel:      tipo === 'DESCUENTO' ? document.getElementById('inputCanalDescuento').value || null : null,
            minimumPurchase:      tipo === 'DESCUENTO' ? parseFloat(document.getElementById('inputCompraMinima').value) || null : null,
            applicableProducts:   tipo === 'DESCUENTO' ? document.getElementById('inputProductosAplicables').value.trim() || null : null,
            stackable:            tipo === 'DESCUENTO' ? document.getElementById('inputAcumulable').value === 'true' : null,
            experienceType:       tipo === 'EXPERIENCIA' ? document.getElementById('inputExperienciaTipo').value.trim() || null : null,
            location:             tipo === 'EXPERIENCIA' ? document.getElementById('inputEventoUbicacion').value.trim() || null : null,
            eventDate:            tipo === 'EXPERIENCIA' ? document.getElementById('inputEventoFecha').value || null : null,
            maxCapacity:          tipo === 'EXPERIENCIA' ? parseInt(document.getElementById('inputEventoCupo').value) || null : null,
            duration:             tipo === 'EXPERIENCIA' ? document.getElementById('inputDuracion').value.trim() || null : null,
            includesTransport:    tipo === 'EXPERIENCIA' ? document.getElementById('inputIncluyeTraslado').value === 'true' : null,
            requirements:         tipo === 'EXPERIENCIA' ? Array.from(document.querySelectorAll('input[name="requisito"]:checked')).map(cb => cb.value).join(', ') || null : null,
            companionAllowed:     tipo === 'EXPERIENCIA' ? document.getElementById('inputAptoAcompanante').value === 'true' : null,
            brand:                tipo === 'MERCHANDISING' ? document.getElementById('inputMarca').value.trim() || null : null,
            material:             tipo === 'MERCHANDISING' ? document.getElementById('inputMaterial').value.trim() || null : null,
            color:                tipo === 'MERCHANDISING' ? document.getElementById('inputColor').value.trim() || null : null,
            size:                 tipo === 'MERCHANDISING' ? document.getElementById('inputTalle').value.trim() || null : null,
            dimensions:           tipo === 'MERCHANDISING' ? document.getElementById('inputDimensiones').value.trim() || null : null,
            weight:               tipo === 'MERCHANDISING' ? document.getElementById('inputPeso').value.trim() || null : null,
            origin:               tipo === 'MERCHANDISING' ? document.getElementById('inputOrigen').value.trim() || null : null,
            unitsIncluded:        tipo === 'MERCHANDISING' ? document.getElementById('inputUnidades').value.trim() || null : null,
            condition:            tipo === 'MERCHANDISING' ? document.getElementById('inputCondicion').value || null : null,
            cinemaChain:          tipo === 'TICKET' ? document.getElementById('inputCadenaCine').value.trim() || null : null,
            cinemaFormat:         tipo === 'TICKET' ? document.getElementById('inputFormatoCine').value || null : null,
            cinemaRestrictions:   tipo === 'TICKET' ? document.getElementById('inputRestriccionesCine').value.trim() || null : null,
            ticketsIncluded:      tipo === 'TICKET' ? parseInt(document.getElementById('inputCantidadEntradas').value) || null : null,
            includesSnack:        tipo === 'TICKET' ? (document.getElementById('inputIncluyeConsumicion').value !== '' ? document.getElementById('inputIncluyeConsumicion').value === 'true' : null) : null,
        };

        const btnGuardar = document.querySelector('.btn-guardar');
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            let premioId  = adminState.premioEditandoId;
            const esNuevo = !premioId;
            const method  = premioId ? 'PUT' : 'POST';
            const url     = premioId
                ? `${CONFIG.API_URL}/admin/rewards/${premioId}`
                : `${CONFIG.API_URL}/admin/rewards`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            const premioGuardado = await response.json();
            premioId = premioGuardado.id;

            // Subir imagen pendiente si hay
            if (adminState.imagenPendiente) {
                await this.subirImagen(premioId, adminState.imagenPendiente);
            }

            toast(
                esNuevo ? 'Premio creado correctamente' : 'Premio actualizado correctamente',
                'success'
            );

            this.cerrarFormulario();
            await this.cargarPremios();

            // Si era nuevo, reabrir en modo edición para agregar más imágenes
            if (esNuevo && premioId) {
                await this.abrirFormulario(premioId);
            }

        } catch (e) {
            toast('Error al guardar el premio', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = `<i class="fas fa-save"></i> <span id="btnGuardarLabel">Guardar</span>`;
        }
    },

    // ------------------------------------------
    // SUBIR IMAGEN
    // ------------------------------------------
    async subirImagen(premioId, file) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${CONFIG.API_URL}/admin/rewards/${premioId}/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) throw new Error('Error al subir imagen');
        return await response.json();
    },

    // Subida rápida desde tabla (abre edición directamente)
    abrirSubidaImagen(premioId) {
        this.abrirFormulario(premioId);
    },

    // ------------------------------------------
    // GALERÍA DE IMÁGENES (múltiples)
    // ------------------------------------------
    async cargarGaleriaImagenes(premioId, tipo = 'COMMON') {
        const endpoint = tipo === 'PREMIUM'
            ? `${CONFIG.API_URL}/admin/premium/rewards/${premioId}/images`
            : `${CONFIG.API_URL}/admin/rewards/${premioId}/images`;

        try {
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const images = await res.json();
            this.renderGaleriaImagenes(images, premioId, tipo);
        } catch (e) {
            console.error('Error cargando galería:', e);
        }
    },

    renderGaleriaImagenes(images, premioId, tipo = 'COMMON') {
        const galeriaEl = tipo === 'PREMIUM'
            ? document.getElementById('galeriaImagenesPremiumGrid')
            : document.getElementById('galeriaImagenesGrid');
        const wrapper = tipo === 'PREMIUM'
            ? document.getElementById('galeriaImagenesPremium')
            : document.getElementById('galeriaImagenes');
        if (!galeriaEl || !wrapper) return;
        wrapper.style.display = 'block';

        if (images.length === 0) {
            galeriaEl.innerHTML = `
                <div style="display:inline-block;margin:0.3rem;vertical-align:top;">
                    <label style="width:80px;height:80px;border:2px dashed #ccc;border-radius:8px;
                                  display:flex;flex-direction:column;align-items:center;justify-content:center;
                                  cursor:pointer;color:#aaa;font-size:0.7rem;text-align:center;">
                        <i class="fas fa-plus" style="font-size:1.2rem;margin-bottom:0.2rem;"></i>
                        Agregar
                        <input type="file" accept="image/*" style="display:none;"
                               onchange="adminUI.agregarImagenGaleria(${premioId}, this, '${tipo}')">
                    </label>
                </div>`;
            return;
        }

        galeriaEl.innerHTML = images.map(img => `
            <div style="position:relative;display:inline-block;margin:0.3rem;">
                <img src="${img.imageUrl}" alt="imagen"
                     style="width:80px;height:80px;object-fit:cover;border-radius:8px;
                            border:3px solid ${img.primary ? '#e50914' : '#e0e0e0'};cursor:pointer;"
                     title="${img.primary ? 'Imagen principal' : 'Clic para hacer principal'}"
                     onclick="adminUI.marcarPrincipal(${premioId}, ${img.id}, '${tipo}')">
                ${img.primary ? `<span style="position:absolute;top:2px;left:2px;background:#e50914;color:white;
                    font-size:0.6rem;padding:1px 4px;border-radius:4px;font-weight:700;">Principal</span>` : ''}
                <button onclick="adminUI.eliminarImagenGaleria(${premioId}, ${img.id}, '${tipo}')"
                    style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:white;
                           border:none;border-radius:50%;width:18px;height:18px;font-size:0.65rem;
                           cursor:pointer;line-height:1;padding:0;" title="Eliminar imagen">✕</button>
            </div>
        `).join('');

        // Botón agregar si hay menos de 5
        if (images.length < 5) {
            galeriaEl.innerHTML += `
                <div style="display:inline-block;margin:0.3rem;vertical-align:top;">
                    <label style="width:80px;height:80px;border:2px dashed #ccc;border-radius:8px;
                                  display:flex;flex-direction:column;align-items:center;justify-content:center;
                                  cursor:pointer;color:#aaa;font-size:0.7rem;text-align:center;">
                        <i class="fas fa-plus" style="font-size:1.2rem;margin-bottom:0.2rem;"></i>
                        Agregar
                        <input type="file" accept="image/*" style="display:none;"
                               onchange="adminUI.agregarImagenGaleria(${premioId}, this, '${tipo}')">
                    </label>
                </div>`;
        }
    },

    async agregarImagenGaleria(premioId, input, tipo = 'COMMON') {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast('La imagen supera los 5MB', 'error');
            return;
        }

        const endpoint = tipo === 'PREMIUM'
            ? `${CONFIG.API_URL}/admin/premium/rewards/${premioId}/images`
            : `${CONFIG.API_URL}/admin/rewards/${premioId}/images`;

        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!res.ok) {
                const err = await res.json();
                toast(err.error || 'Error al subir imagen', 'error');
                return;
            }
            toast('Imagen agregada correctamente', 'success');
            await this.cargarGaleriaImagenes(premioId, tipo);
            this.cargarPremios();
        } catch (e) {
            toast('Error al subir imagen', 'error');
        }
    },

    async marcarPrincipal(premioId, imageId, tipo = 'COMMON') {
        const endpoint = tipo === 'PREMIUM'
            ? `${CONFIG.API_URL}/admin/premium/rewards/${premioId}/images/${imageId}/primary`
            : `${CONFIG.API_URL}/admin/rewards/${premioId}/images/${imageId}/primary`;

        try {
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            toast('Imagen principal actualizada', 'success');
            await this.cargarGaleriaImagenes(premioId, tipo);
            this.cargarPremios();
        } catch (e) {
            toast('Error al marcar imagen principal', 'error');
        }
    },

    async eliminarImagenGaleria(premioId, imageId, tipo = 'COMMON') {
        if (!confirm('¿Eliminar esta imagen?')) return;

        const endpoint = tipo === 'PREMIUM'
            ? `${CONFIG.API_URL}/admin/premium/rewards/${premioId}/images/${imageId}`
            : `${CONFIG.API_URL}/admin/rewards/${premioId}/images/${imageId}`;

        try {
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            toast('Imagen eliminada correctamente', 'success');
            await this.cargarGaleriaImagenes(premioId, tipo);
            this.cargarPremios();
        } catch (e) {
            toast('Error al eliminar imagen', 'error');
        }
    },

    // ------------------------------------------
    // ACTIVAR / DESACTIVAR
    // ------------------------------------------
    async toggleActivo(premioId, activar) {
        const accion = activar ? 'activar' : 'desactivar';
        if (!confirm(`¿Confirmás ${accion} este premio?`)) return;

        try {
            const url = activar
                ? `${CONFIG.API_URL}/admin/rewards/${premioId}/activate`
                : `${CONFIG.API_URL}/admin/rewards/${premioId}`;
            const method = activar ? 'PATCH' : 'DELETE';

            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error();
            toast(`Premio ${activar ? 'activado' : 'desactivado'} correctamente`, 'success');
            this.cargarPremios();

        } catch (e) {
            toast(`Error al ${accion} el premio`, 'error');
        }
    },

    // ------------------------------------------
    // ELIMINAR (borrado lógico)
    // ------------------------------------------
    async eliminarPremio(premioId) {
        if (!confirm('¿Confirmás eliminar este premio? No aparecerá más en la plataforma.')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/rewards/${premioId}/delete`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error();
            toast('Premio eliminado correctamente', 'success');
            this.cargarPremios();

        } catch (e) {
            toast('Error al eliminar el premio', 'error');
        }
    }
};

// ==============================================
// TOAST
// ==============================================
function toast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    container.appendChild(t);

    setTimeout(() => t.remove(), 3500);
}

// Cargar script de canjes
const scriptCanjes = document.createElement('script');
scriptCanjes.src = '../js/admin-canjes.js';
document.head.appendChild(scriptCanjes);