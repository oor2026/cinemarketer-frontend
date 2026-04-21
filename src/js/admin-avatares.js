// ==============================================
// admin-avatares.js - Gestión de avatares para admin
// ==============================================

const adminAvatares = {
    currentPage: 0,
    totalPages: 1,
    currentFilter: 'todas',
    estadoFilter: 'todos',
    searchQuery: '',
    editandoId: null,
    imagenSeleccionada: null,

    // ==============================================
    // INICIALIZACIÓN
    // ==============================================
    init: function() {
        this.cargarAvatares();
    },

    // ==============================================
    // CARGAR AVATARES
    // ==============================================
cargarAvatares: async function(page = 0) {
    const tbody = document.getElementById('tablaAvataresBody');
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row">
        <i class="fas fa-spinner fa-spin"></i> Cargando avatares...</td></tr>`;

    try {
        let url = `${CONFIG.API_URL}/admin/avatars?page=${page}&size=20`;
        if (this.currentFilter && this.currentFilter !== 'todas') {
            url += `&category=${encodeURIComponent(this.currentFilter)}`;
        }
        if (this.estadoFilter && this.estadoFilter !== 'todos') {
            url += `&estado=${encodeURIComponent(this.estadoFilter)}`;
        }
        if (this.searchQuery) {
            url += `&search=${encodeURIComponent(this.searchQuery)}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        const data = await response.json();

        this.currentPage = data.currentPage || 0;
        this.totalPages  = data.totalPages  || 1;

        this.renderTabla(data.avatars || data);
        this.actualizarStats();
        this.actualizarPaginacion();

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">
            Error al cargar los avatares</td></tr>`;
    }
},

    // ==============================================
    // RENDERIZAR TABLA
    // ==============================================
    renderTabla: function(avatares) {
        const tbody = document.getElementById('tablaAvataresBody');

        if (!avatares || avatares.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row">
                No hay avatares cargados aún</td></tr>`;
            return;
        }

        tbody.innerHTML = avatares.map(a => {
            const preview = a.imageUrl
                ? `<img src="${a.imageUrl}" alt="${a.name}" class="tabla-img-mini" style="border-radius: 50%; width: 50px; height: 50px; object-fit: cover;">`
                : `<div class="tabla-img-placeholder-mini"><i class="fas fa-image"></i></div>`;

            const nivelBadge = a.requiredLevel
                ? `<span class="badge nivel-${a.requiredLevel}">${a.requiredLevel}</span>`
                : `<span class="badge">Todos</span>`;

            const estadoBadge = a.active
                ? `<span class="badge badge-activo">Activo</span>`
                : `<span class="badge badge-inactivo">Inactivo</span>`;

            const defaultBadge = a.isDefault
                ? `<span class="badge badge-importante">⭐ Sí</span>`
                : `<span class="badge">No</span>`;

            return `
                <tr>
                    <td>${preview}</td>
                    <td><strong>${a.name}</strong></td>
                    <td>${a.category || '—'}</td>
                    <td>${nivelBadge}</td>
                    <td>${a.sortOrder || 0}</td>
                    <td>${estadoBadge}</td>
                    <td>${defaultBadge}</td>
                    <td>
                        <div class="tabla-acciones">
                            <button class="btn-accion btn-editar" title="Editar"
                                onclick="adminAvatares.abrirFormulario(${a.id})">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-accion btn-imagen" title="Cambiar imagen"
                                onclick="adminAvatares.cambiarImagen(${a.id})">
                                <i class="fas fa-image"></i>
                            </button>
                            ${a.active
                                ? `<button class="btn-accion btn-desactivar" title="Desactivar"
                                    onclick="adminAvatares.toggleActivo(${a.id}, false)">
                                    <i class="fas fa-ban"></i>
                                  </button>`
                                : `<button class="btn-accion btn-activar" title="Activar"
                                    onclick="adminAvatares.toggleActivo(${a.id}, true)">
                                    <i class="fas fa-check"></i>
                                  </button>`
                            }
                                  <button class="btn-accion btn-eliminar" title="Eliminar"
                                        onclick="adminAvatares.eliminar(${a.id}, '${a.name}')">
                                        <i class="fas fa-trash"></i>
                                  </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    // ==============================================
    // STATS RÁPIDAS
    // ==============================================
    actualizarStats: async function() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/avatars/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('statAvataresTotal').textContent   = stats.totalAvatars  || 0;
                document.getElementById('statAvataresActivos').textContent = stats.activeAvatars || 0;
                document.getElementById('statAvataresPorNivel').textContent = stats.inactiveAvatars || 0;
                document.getElementById('statAvataresUsados').textContent  = stats.usedByUsers   || 0;
            }
        } catch (error) {
        }
    },

    // ==============================================
    // FILTROS
    // ==============================================
    filtrarPorCategoria: function(categoria) {
        this.currentFilter = categoria;
        this.cargarAvatares(0);
    },

    filtrarPorEstado: function(estado) {
        this.estadoFilter = estado;
        this.cargarAvatares(0);
    },

    buscar: function(query) {
        this.searchQuery = query;
        this.cargarAvatares(0);
    },

    // ==============================================
    // ABRIR FORMULARIO (CREAR/EDITAR)
    // ==============================================
    abrirFormulario: async function(id = null) {
        this.editandoId = id;

        // Resetear formulario
        document.getElementById('inputAvatarNombre').value    = '';
        document.getElementById('inputAvatarCategoria').value = '';
        document.getElementById('inputAvatarNivel').value     = '';
        document.getElementById('inputAvatarOrden').value     = '0';
        document.getElementById('inputAvatarActivo').value    = 'true';
        document.getElementById('inputAvatarDefault').value   = 'false';
        document.getElementById('avatarImagePreview').style.display     = 'none';
        document.getElementById('avatarImagePlaceholder').style.display = 'block';
        document.getElementById('inputAvatarImagen').value   = '';
        this.imagenSeleccionada = null;

        if (id) {
            // Modo edición — cargar datos existentes
            document.getElementById('modalAvatarTitulo').textContent     = 'Editar Avatar';
            document.getElementById('btnAvatarGuardarLabel').textContent = 'Guardar cambios';

            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/avatars/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const avatar = await response.json();

                document.getElementById('inputAvatarNombre').value    = avatar.name          || '';
                document.getElementById('inputAvatarCategoria').value = avatar.category      || '';
                document.getElementById('inputAvatarNivel').value     = avatar.requiredLevel || '';
                document.getElementById('inputAvatarOrden').value     = avatar.sortOrder     ?? 0;
                document.getElementById('inputAvatarActivo').value    = String(avatar.active);
                document.getElementById('inputAvatarDefault').value   = String(avatar.isDefault || false);

                if (avatar.imageUrl) {
                    const preview = document.getElementById('avatarImagePreview');
                    preview.src = avatar.imageUrl;
                    preview.style.display = 'block';
                    document.getElementById('avatarImagePlaceholder').style.display = 'none';
                }
            } catch (error) {
                toast('Error al cargar datos del avatar', 'error');
                return;
            }
        } else {
            document.getElementById('modalAvatarTitulo').textContent     = 'Nuevo Avatar';
            document.getElementById('btnAvatarGuardarLabel').textContent = 'Crear Avatar';
        }

        document.getElementById('modalAvatarOverlay').style.display = 'block';
        document.getElementById('modalAvatar').style.display        = 'flex';
    },

    // ==============================================
    // CERRAR FORMULARIO
    // ==============================================
    cerrarFormulario: function() {
        document.getElementById('modalAvatarOverlay').style.display = 'none';
        document.getElementById('modalAvatar').style.display        = 'none';
        this.editandoId         = null;
        this.imagenSeleccionada = null;
    },

    // ==============================================
    // PREVIEW DE IMAGEN EN FORMULARIO
    // ==============================================
    previewImagen: function(input) {
        const file = input.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast('Solo se permiten imágenes JPG, PNG o WEBP', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast('La imagen no puede superar los 5MB', 'error');
            return;
        }

        this.imagenSeleccionada = file;

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('avatarImagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('avatarImagePlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    // ==============================================
    // GUARDAR AVATAR (CREAR O EDITAR)
    // ==============================================
    guardarAvatar: async function() {
        const nombre    = document.getElementById('inputAvatarNombre').value.trim();
        const categoria = document.getElementById('inputAvatarCategoria').value;

        if (!nombre)    { toast('El nombre es obligatorio', 'error');  return; }
        if (!categoria) { toast('Seleccioná una categoría', 'error');  return; }
        if (!this.editandoId && !this.imagenSeleccionada) {
            toast('Seleccioná una imagen para el avatar', 'error');
            return;
        }

        const btn = document.querySelector('#modalAvatar .btn-guardar');
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const data = {
                name:          nombre,
                category:      categoria,
                requiredLevel: document.getElementById('inputAvatarNivel').value || null,
                sortOrder:     parseInt(document.getElementById('inputAvatarOrden').value) || 0,
                active:        document.getElementById('inputAvatarActivo').value  === 'true',
                isDefault:     document.getElementById('inputAvatarDefault').value === 'true'
            };

            const formData = new FormData();
            formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
            if (this.imagenSeleccionada) {
                formData.append('image', this.imagenSeleccionada);
            }

            const url    = this.editandoId
                ? `${CONFIG.API_URL}/admin/avatars/${this.editandoId}`
                : `${CONFIG.API_URL}/admin/avatars`;
            const method = this.editandoId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                toast(this.editandoId ? 'Avatar actualizado' : 'Avatar creado', 'success');
                this.cerrarFormulario();
                this.cargarAvatares(this.currentPage);
            } else {
                const err = await response.json().catch(() => ({}));
                toast(err.message || 'Error al guardar el avatar', 'error');
            }
        } catch (error) {
            toast('Error de conexión con el servidor', 'error');
        } finally {
            btn.disabled  = false;
            btn.innerHTML = `<i class="fas fa-save"></i> <span id="btnAvatarGuardarLabel">${this.editandoId ? 'Guardar cambios' : 'Crear Avatar'}</span>`;
        }
    },

    // ==============================================
    // CAMBIAR IMAGEN (acceso rápido desde tabla)
    // ==============================================
    cambiarImagen: function(id) {
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                toast('Solo se permiten imágenes JPG, PNG o WEBP', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast('La imagen no puede superar los 5MB', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/avatars/${id}/image`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (response.ok) {
                    toast('Imagen actualizada', 'success');
                    this.cargarAvatares(this.currentPage);
                } else {
                    toast('Error al subir imagen', 'error');
                }
            } catch (error) {
                toast('Error de conexión', 'error');
            }
        };
        input.click();
    },

    // ==============================================
    // ACTIVAR / DESACTIVAR
    // ==============================================
toggleActivo: async function(id, activar) {
    const accion = activar ? 'activar' : 'desactivar';
    if (!confirm(`¿Confirmás ${accion} este avatar?`)) return;

    try {
        const endpoint = activar
            ? `${CONFIG.API_URL}/admin/avatars/${id}/activate`
            : `${CONFIG.API_URL}/admin/avatars/${id}/deactivate`;

        const response = await fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast(`Avatar ${activar ? 'activado' : 'desactivado'}`, 'success');
            this.cargarAvatares(this.currentPage);
        } else {
            toast('Error al cambiar estado', 'error');
        }
    } catch (error) {
        toast('Error de conexión', 'error');
    }
},

// ==============================================
// ELIMINAR AVATAR
// ==============================================
eliminar: async function(id, nombre) {
    if (!confirm(`¿Eliminár permanentemente el avatar "${nombre}"?\nEsta acción no se puede deshacer.`)) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/admin/avatars/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast('Avatar eliminado correctamente', 'success');
            this.cargarAvatares(this.currentPage);
        } else {
            toast('Error al eliminar el avatar', 'error');
        }
    } catch (error) {
        toast('Error de conexión', 'error');
    }
},

    // ==============================================
    // PAGINACIÓN
    // ==============================================
    cambiarPagina: function(direccion) {
        let nuevaPagina = direccion === 'siguiente' ? this.currentPage + 1 : this.currentPage - 1;
        if (nuevaPagina < 0 || nuevaPagina >= this.totalPages) return;
        this.cargarAvatares(nuevaPagina);
    },

    actualizarPaginacion: function() {
        const pagination   = document.getElementById('avataresPagination');
        const btnAnterior  = document.getElementById('btnAvataresAnterior');
        const btnSiguiente = document.getElementById('btnAvataresSiguiente');
        const infoPagina   = document.getElementById('avataresPageInfo');

        if (this.totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display  = 'flex';
        btnAnterior.disabled      = this.currentPage === 0;
        btnSiguiente.disabled     = this.currentPage === this.totalPages - 1;
        infoPagina.textContent    = `Página ${this.currentPage + 1} de ${this.totalPages}`;
    }
};

// Inicializar cuando se active la sección
document.addEventListener('DOMContentLoaded', () => {
    const sec = document.getElementById('section-avatares');
    if (sec && sec.classList.contains('active')) {
        adminAvatares.init();
    }

    // Hook al switchSection del adminUI
    if (typeof adminUI !== 'undefined' && adminUI.switchSection && !adminUI.__avataresHooked) {
        adminUI.__avataresHooked = true;
        const originalSwitch = adminUI.switchSection.bind(adminUI);

        adminUI.switchSection = function(section, el) {
            originalSwitch(section, el);
            if (section === 'avatares') {
                adminAvatares.init();
            }
        };
    }
});