// ==============================================
// admin-usuarios.js - Gestión de usuarios para admin
// ==============================================

const adminUsuarios = {
    currentPage: 0,
    totalPages: 1,
    totalItems: 0,
    currentFilter: 'todos',
    searchQuery: '',
    usuarioEditandoId: null,

    // Inicializar
    init: function() {
        this.cargarStats();
        this.cargarUsuarios();
    },

    // Cargar estadísticas
    cargarStats: async function() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/users/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await response.json();

            document.getElementById('statUsuariosTotal').textContent = stats.total;
            document.getElementById('statUsuariosActivos').textContent = stats.active;
            document.getElementById('statUsuariosSuspendidos').textContent = stats.suspended;
            document.getElementById('statUsuariosVerificados').textContent = stats.verified;

            // Badge en sidebar
            const badge = document.getElementById('adminUsuariosBadge');
            if (stats.suspended > 0) {
                badge.textContent = stats.suspended;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }

        } catch (error) {
        }
    },

    // Cargar usuarios
    cargarUsuarios: async function(page = 0) {
        const tbody = document.getElementById('tablaUsuariosBody');
        tbody.innerHTML = `<tr><td colspan="9" class="loading-row">
            <i class="fas fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;

        try {
            let url = `${CONFIG.API_URL}/admin/users?page=${page}&size=20`;
            if (this.searchQuery) {
                url += `&search=${encodeURIComponent(this.searchQuery)}`;
            }
            if (this.currentFilter && this.currentFilter !== 'todos') {
                url += `&filter=${encodeURIComponent(this.currentFilter)}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            const data = await response.json();

            this.currentPage = data.currentPage;
            this.totalPages = data.totalPages;
            this.totalItems = data.totalItems;

            this.renderTabla(data.users);
            this.actualizarPaginacion();

        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="9" class="loading-row" style="color:#e50914;">
                Error al cargar usuarios</td></tr>`;
        }
    },

    // Renderizar tabla
    renderTabla: function(usuarios) {
        const tbody = document.getElementById('tablaUsuariosBody');

        if (usuarios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="loading-row">
                No hay usuarios registrados</td></tr>`;
            return;
        }

        tbody.innerHTML = usuarios.map(u => {
            const rolClass = {
                'ADMIN': 'badge-admin',
                'USER': 'badge-user'
            }[u.role] || '';

            let estadoClass = 'badge-activo';
            let estadoText = 'Activo';

            if (u.suspended) {
                estadoClass = 'badge-suspendido';
                estadoText = 'Suspendido';
            } else if (!u.active) {
                estadoClass = 'badge-inactivo';
                estadoText = 'Inactivo';
            }

            const acciones = `
                <div class="tabla-acciones">
                    <button class="btn-accion btn-editar" title="Editar"
                            onclick="adminUsuarios.abrirFormulario(${u.id})">
                        <i class="fas fa-pen"></i>
                    </button>
                    ${!u.suspended ? `
                        <button class="btn-accion btn-suspender" title="Suspender"
                                onclick="adminUsuarios.suspenderUsuario(${u.id})">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : `
                        <button class="btn-accion btn-reactivar" title="Reactivar"
                                onclick="adminUsuarios.reactivarUsuario(${u.id})">
                            <i class="fas fa-check"></i>
                        </button>
                    `}
                    <button class="btn-accion btn-eliminar" title="Eliminar"
                            onclick="adminUsuarios.eliminarUsuario(${u.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            return `
                <tr>
                    <td>${u.id}</td>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.dni || '-'}</td>
                    <td>${u.phone || '-'}</td>
                    <td><span class="badge ${rolClass}">${u.role}</span></td>
                    <td><strong>${u.totalPoints}</strong> pts</td>
                    <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                    <td>${acciones}</td>
                </tr>`;
        }).join('');
    },

    // Filtrar por estado
    filtrarPorEstado: function(estado) {
        this.currentFilter = estado;
        // TODO: Implementar filtro en backend
        this.cargarUsuarios(0);
    },

    // Buscar
    buscar: function(query) {
        this.searchQuery = query;
        this.cargarUsuarios(0);
    },

    // Paginación
    cambiarPagina: function(direccion) {
        let nuevaPagina = direccion === 'siguiente' ? this.currentPage + 1 : this.currentPage - 1;
        if (nuevaPagina < 0 || nuevaPagina >= this.totalPages) return;
        this.cargarUsuarios(nuevaPagina);
    },

    actualizarPaginacion: function() {
        const pagination = document.getElementById('usuariosPagination');
        const btnAnterior = document.getElementById('btnUsuariosAnterior');
        const btnSiguiente = document.getElementById('btnUsuariosSiguiente');
        const infoPagina = document.getElementById('usuariosPageInfo');

        if (this.totalPages <= 1) {
            if (pagination) pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        btnAnterior.disabled = this.currentPage === 0;
        btnSiguiente.disabled = this.currentPage === this.totalPages - 1;
        infoPagina.textContent = `Página ${this.currentPage + 1} de ${this.totalPages}`;
    },

    // ==============================================
    // ACCIONES DE USUARIO
    // ==============================================

    // Abrir formulario de creación/edición
    abrirFormulario: async function(id = null) {
        this.usuarioEditandoId = id;

        // Resetear formulario
        document.getElementById('modalUsuarioTitulo').textContent = id ? 'Editar Usuario' : 'Nuevo Usuario';
        document.getElementById('btnUsuarioGuardarLabel').textContent = id ? 'Guardar cambios' : 'Crear Usuario';
        document.getElementById('inputUsuarioNombre').value = '';
        document.getElementById('inputUsuarioEmail').value = '';
        document.getElementById('inputUsuarioDni').value = '';
        document.getElementById('inputUsuarioTelefono').value = '';
        document.getElementById('inputUsuarioRol').value = 'USER';
        document.getElementById('inputUsuarioActivo').value = 'true';

        if (id) {
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const user = await response.json();

                document.getElementById('inputUsuarioNombre').value = user.name || '';
                document.getElementById('inputUsuarioEmail').value = user.email || '';
                document.getElementById('inputUsuarioDni').value = user.dni || '';
                document.getElementById('inputUsuarioTelefono').value = user.phone || '';
                document.getElementById('inputUsuarioRol').value = user.role || 'USER';
                document.getElementById('inputUsuarioActivo').value = String(user.active);
            } catch (error) {
                toast('Error al cargar datos del usuario', 'error');
                return;
            }
        }

        document.getElementById('modalUsuarioOverlay').classList.add('open');
        document.getElementById('modalUsuario').classList.add('open');
    },

    cerrarFormulario: function() {
        document.getElementById('modalUsuarioOverlay').classList.remove('open');
        document.getElementById('modalUsuario').classList.remove('open');
        this.usuarioEditandoId = null;
    },

    // Guardar usuario (crear o editar)
    guardarUsuario: async function() {
        const nombre = document.getElementById('inputUsuarioNombre').value.trim();
        const email = document.getElementById('inputUsuarioEmail').value.trim();
        const dni = document.getElementById('inputUsuarioDni').value.trim();
        const telefono = document.getElementById('inputUsuarioTelefono').value.trim();
        const rol = document.getElementById('inputUsuarioRol').value;
        const activo = document.getElementById('inputUsuarioActivo').value === 'true';

        if (!nombre || !email) {
            toast('Nombre y email son obligatorios', 'error');
            return;
        }

        const payload = {
            name: nombre,
            email: email,
            dni: dni,
            phone: telefono,
            role: rol,
            active: activo
        };

        const btnGuardar = document.querySelector('#modalUsuario .btn-guardar');
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            let method = this.usuarioEditandoId ? 'PUT' : 'POST';
            let url = this.usuarioEditandoId
                ? `${CONFIG.API_URL}/admin/users/${this.usuarioEditandoId}`
                : `${CONFIG.API_URL}/admin/users`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 409) {
                const data = await response.json().catch(() => null);
                const msg = data?.error || 'El email ingresado ya está registrado por otro usuario.';
                toast(msg, 'error');
                return;
            }

            if (!response.ok) throw new Error('Error al guardar');

            toast(this.usuarioEditandoId ? 'Usuario actualizado' : 'Usuario creado', 'success');
            this.cerrarFormulario();
            this.cargarUsuarios(0);
            this.cargarStats();

        } catch (error) {
            toast('Error al guardar usuario', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> <span id="btnUsuarioGuardarLabel">Guardar</span>';
        }
    },

    // Suspender usuario
    suspenderUsuario: async function(id) {
        const razon = prompt('Motivo de la suspensión (opcional):');

        if (!confirm('¿Estás seguro de suspender este usuario?')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/users/${id}/suspend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: razon || '' })
            });

            if (!response.ok) throw new Error('Error al suspender');

            toast('Usuario suspendido correctamente', 'success');
            this.cargarUsuarios(this.currentPage);
            this.cargarStats();

        } catch (error) {
            toast('Error al suspender usuario', 'error');
        }
    },

    // Reactivar usuario
    reactivarUsuario: async function(id) {
        if (!confirm('¿Estás seguro de reactivar este usuario?')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/users/${id}/unsuspend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al reactivar');

            toast('Usuario reactivado correctamente', 'success');
            this.cargarUsuarios(this.currentPage);
            this.cargarStats();

        } catch (error) {
            toast('Error al reactivar usuario', 'error');
        }
    },

// Eliminar usuario - VERSIÓN CON VERIFICACIÓN DE TOKEN
eliminarUsuario: async function(id) {
    if (!confirm('¿Estás seguro de eliminar permanentemente este usuario? Esta acción no se puede deshacer.')) return;

    try {
        const token = localStorage.getItem('token');

        if (!token) {
            toast('No hay sesión activa', 'error');
            return;
        }

        const response = await fetch(`${CONFIG.API_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`  // 👈 Asegurar el formato "Bearer "
            }
        });

        const text = await response.text();

        if (!response.ok) {
            throw new Error(`Error ${response.status}${text ? ': ' + text : ''}`);
        }

        toast('Usuario eliminado correctamente', 'success');
        this.cargarUsuarios(this.currentPage);
        this.cargarStats();

    } catch (error) {
        console.error('❌ Error detallado:', error);
        toast('Error al eliminar usuario: ' + error.message, 'error');
    }
}
};