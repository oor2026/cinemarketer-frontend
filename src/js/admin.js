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
            console.error('Error cargando premios:', e);
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
                            <button class="btn-accion btn-imagen" title="Cambiar imagen"
                                onclick="adminUI.abrirSubidaImagen(${p.id})">
                                <i class="fas fa-image"></i>
                            </button>
                            ${btnActivar}
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
    abrirFormulario(id = null) {
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

                if (premio.imageUrl) {
                    document.getElementById('imagePreview').src            = premio.imageUrl;
                    document.getElementById('imagePreview').style.display  = 'block';
                    document.getElementById('imagePlaceholder').style.display = 'none';
                }
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

        if (!nombre || !tipo || !puntos || !stock) {
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
            website:         document.getElementById('inputWebsite').value.trim() || null
        };

        const btnGuardar = document.querySelector('.btn-guardar');
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            let premioId = adminState.premioEditandoId;
            let method   = premioId ? 'PUT' : 'POST';
            let url      = premioId
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

            if (adminState.imagenPendiente) {
                await this.subirImagen(premioId, adminState.imagenPendiente);
            }

            toast(
                adminState.premioEditandoId ? 'Premio actualizado correctamente' : 'Premio creado correctamente',
                'success'
            );

            this.cerrarFormulario();
            this.cargarPremios();

        } catch (e) {
            console.error('Error guardando premio:', e);
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

        const response = await fetch(`${CONFIG.API_URL}/admin/rewards/${premioId}/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error('Error al subir imagen');
        return await response.json();
    },

    // ------------------------------------------
    // SUBIDA RÁPIDA DE IMAGEN DESDE TABLA
    // ------------------------------------------
    abrirSubidaImagen(premioId) {
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                toast('La imagen supera los 5MB', 'error');
                return;
            }
            try {
                await this.subirImagen(premioId, file);
                toast('Imagen actualizada correctamente', 'success');
                this.cargarPremios();
            } catch (err) {
                toast('Error al subir la imagen', 'error');
            }
        };
        input.click();
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