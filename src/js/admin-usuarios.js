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
            const blockedEl = document.getElementById('statUsuariosBloqueados');
            if (blockedEl) blockedEl.textContent = stats.blocked || 0;
            const reportedEl = document.getElementById('statUsuariosReportados');
            if (reportedEl) reportedEl.textContent = stats.reported || 0;

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

            const blockedBadge = u.blockedByCount > 0
                ? `<span class="badge badge-bloqueado" title="${u.blockedByCount} usuario(s) lo bloquearon">
                       🚫 ${u.blockedByCount}
                   </span>`
                : '';

            const reportedBadge = u.reportedByCount > 0
                ? `<span class="badge badge-reportado" title="${u.reportedByCount} usuario(s) lo reportaron"
                       style="background:#fff3e0;color:#e65100;margin-left:4px;">
                       ⚠️ ${u.reportedByCount}
                   </span>`
                : '';

            const acciones = `
                <div class="tabla-acciones">
                    <button class="btn-accion btn-ver" title="Ver detalle"
                            onclick="adminUsuarios.verDetalle(${u.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-accion btn-editar" title="Editar"
                            onclick="adminUsuarios.abrirFormulario(${u.id})">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-accion" title="Otorgar puntos"
                            style="background:#2e7d32;color:white;"
                            onclick="adminUsuarios.abrirModalOtorgarPuntos(${u.id}, '${u.name}')">
                        <i class="fas fa-coins"></i>
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
                    <td><span class="badge ${estadoClass}">${estadoText}</span> ${blockedBadge}${reportedBadge}</td>
                    <td>${acciones}</td>
                </tr>`;
        }).join('');
    },

    // Filtrar por estado
    filtrarPorEstado: function(estado) {
            this.currentFilter = estado;
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
        document.getElementById('inputUsuarioFechaNacimiento').value = '';
        document.getElementById('inputUsuarioSexo').value = '';
        document.getElementById('inputUsuarioProvincia').value = '';
        document.getElementById('inputUsuarioLocalidad').value = '';
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
                document.getElementById('inputUsuarioFechaNacimiento').value = user.birthDate || '';
                document.getElementById('inputUsuarioSexo').value = user.sexo || '';
                document.getElementById('inputUsuarioProvincia').value = user.provincia || '';
                document.getElementById('inputUsuarioLocalidad').value = user.localidad || '';
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
            birthDate: document.getElementById('inputUsuarioFechaNacimiento').value || null,
            sexo: document.getElementById('inputUsuarioSexo').value || null,
            provincia: document.getElementById('inputUsuarioProvincia').value.trim() || null,
            localidad: document.getElementById('inputUsuarioLocalidad').value.trim() || null,
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
,

verDetalle: async function(id) {
    this._detalleUserId = id;
    try {
        const response = await fetch(`${CONFIG.API_URL}/admin/users/${id}/detail`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al cargar detalle');
        const d = await response.json();

        const fmt = (dt) => dt ? new Date(dt).toLocaleString('es-AR', {
            day:'2-digit', month:'2-digit', year:'numeric',
            hour:'2-digit', minute:'2-digit'
        }) : '—';

        const fmtFecha = (dt) => dt ? new Date(dt).toLocaleDateString('es-AR', {
            day:'2-digit', month:'2-digit', year:'numeric'
        }) : '—';

        const nivelLabel = {
            'AMATEUR': '🎬 Amateur', 'CRITICO': '🎭 Crítico',
            'EXPERTO': '🏆 Experto', 'LEYENDA': '⭐ Leyenda'
        }[d.nivel] || d.nivel;

        const listadoPremios = d.premios.listado.length > 0
            ? d.premios.listado.map(p => `
                <tr>
                    <td>${p.nombre}</td>
                    <td>${p.tipo === 'TICKET' ? '🎟️ Entrada' : '🎁 Merchandising'}</td>
                    <td>${fmtFecha(p.fecha)}</td>
                </tr>`).join('')
            : '<tr><td colspan="3" style="text-align:center;color:#999;">Sin canjes</td></tr>';

        document.getElementById('modalDetalleUsuarioContenido').innerHTML = `
            <div class="detalle-grid">

                <div class="detalle-seccion">
                    <h4><i class="fas fa-user"></i> Datos personales</h4>
                    <div class="detalle-fila"><span>Nombre</span><strong>${d.nombre}</strong></div>
                    <div class="detalle-fila"><span>Email</span><strong>${d.email}</strong></div>
                    <div class="detalle-fila"><span>DNI</span><strong>${d.dni || '—'}</strong></div>
                    <div class="detalle-fila"><span>Teléfono</span><strong>${d.telefono || '—'}</strong></div>
                    <div class="detalle-fila"><span>Fecha de nacimiento</span><strong>${d.fechaNacimiento ? fmtFecha(d.fechaNacimiento) : '—'}</strong></div>
                    <div class="detalle-fila"><span>Sexo</span><strong>${d.sexo || '—'}</strong></div>
                    <div class="detalle-fila"><span>Provincia</span><strong>${d.provincia || '—'}</strong></div>
                    <div class="detalle-fila"><span>Localidad</span><strong>${d.localidad || '—'}</strong></div>
                    <div class="detalle-fila"><span>Email verificado</span><strong>${d.emailVerificado ? '✅ Sí' : '❌ No'}</strong></div>
                    <div class="detalle-fila"><span>Autenticación</span><strong>${d.googleAuth ? '🔵 Google' : '🔑 Contraseña'}</strong></div>
                    <div class="detalle-fila"><span>Miembro desde</span><strong>${fmt(d.creadoEn)}</strong></div>
                    <div class="detalle-fila"><span>Último acceso</span><strong>${fmt(d.ultimoAcceso)}</strong></div>
                </div>

                <div class="detalle-seccion">
                    <h4><i class="fas fa-id-badge"></i> Estado de cuenta</h4>
                    <div class="detalle-fila"><span>Rol</span><strong>${d.rol}</strong></div>
                    <div class="detalle-fila"><span>Estado</span><strong>${d.estado}</strong></div>
                    <div class="detalle-fila"><span>Premium</span><strong>${d.premium ? '⭐ Activo' : '—'}</strong></div>
                    <div class="detalle-fila"><span>Nivel</span><strong>${nivelLabel}</strong></div>
                </div>

                <div class="detalle-seccion">
                    <h4><i class="fas fa-coins"></i> Puntos</h4>
                    <div class="detalle-fila"><span>Disponibles</span><strong>${d.puntosDisponibles} pts</strong></div>
                    <div class="detalle-fila"><span>Acumulados (mes)</span><strong>${d.puntosAcumulados} pts</strong></div>
                    <div class="detalle-fila"><span>Canjeados histórico</span><strong>${d.puntosCanjeadosHistorico} pts</strong></div>
                </div>

                <div class="detalle-seccion">
                    <h4><i class="fas fa-chart-bar"></i> Actividad</h4>
                    <div class="detalle-fila"><span>Votaciones</span><strong>${d.totalVotaciones}</strong></div>
                    <div class="detalle-fila"><span>Comentarios</span><strong>${d.totalComentarios}</strong></div>
                    <div class="detalle-fila"><span>Recomendaciones</span><strong>${d.totalRecomendaciones}</strong></div>
                    <div class="detalle-fila"><span>Merece un punto</span><strong>${d.totalMereceUnPunto}</strong></div>
                    <div class="detalle-fila"><span>Mi lista (guardadas)</span><strong>${d.totalGuardadas}</strong></div>
                    <div class="detalle-fila"><span>Premios canjeados</span><strong>${d.premios.totalCanjeados}</strong></div>
                    <div class="detalle-fila"><span>— Entradas</span><strong>${d.premios.entradas}</strong></div>
                    <div class="detalle-fila"><span>— Merchandising</span><strong>${d.premios.merchandising}</strong></div>
                </div>

            </div>

            ${d.premios.listado.length > 0 ? `
            <div class="detalle-seccion" style="margin-top:1rem;">
                <h4><i class="fas fa-gift"></i> Historial de canjes</h4>
                <table class="admin-table" style="margin-top:0.5rem;">
                    <thead><tr><th>Premio</th><th>Tipo</th><th>Fecha</th></tr></thead>
                    <tbody>${listadoPremios}</tbody>
                </table>
            </div>` : ''}

            <div class="detalle-seccion" style="margin-top:1rem;" id="seccionBloqueadores">
                <h4><i class="fas fa-ban"></i> Bloqueado por</h4>
                <div id="bloqueadoresList" style="color:#999;font-size:0.9rem;">Cargando...</div>
            </div>
        `;

        // Cargar bloqueadores
        adminUsuarios.cargarBloqueadores(id);

        document.getElementById('modalDetalleUsuarioOverlay').classList.add('open');
        document.getElementById('modalDetalleUsuario').classList.add('open');

    } catch (error) {
        toast('Error al cargar el detalle del usuario', 'error');
    }
},

cargarBloqueadores: async function(id) {
    const cont = document.getElementById('bloqueadoresList');
    if (!cont) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/users/${id}/blockers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blockers = await res.json();
        if (blockers.length === 0) {
            cont.innerHTML = '<span style="color:#999;">Este usuario no fue bloqueado por nadie.</span>';
            return;
        }
        cont.innerHTML = `
            <div style="margin-bottom:0.75rem;color:#555;font-size:0.85rem;">
                ${blockers.length} usuario(s) lo bloquearon.
            </div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button onclick="adminUsuarios.abrirModalDesbloquear(${id})"
                    style="background:#e50914;color:white;border:none;border-radius:8px;
                           padding:0.5rem 1.25rem;font-size:0.85rem;font-weight:600;cursor:pointer;">
                    <i class="fas fa-unlock"></i> Desbloquear
                </button>
                <button onclick="adminUsuarios.abrirModalReportes(${id})"
                    style="background:#fff3e0;color:#e65100;border:1.5px solid #e65100;border-radius:8px;
                           padding:0.5rem 1.25rem;font-size:0.85rem;font-weight:600;cursor:pointer;">
                    <i class="fas fa-flag"></i> Ver reportes
                </button>
            </div>
        `;
    } catch(e) {
        cont.innerHTML = '<span style="color:#e50914;">Error al cargar.</span>';
    }
},

abrirModalDesbloquear: async function(id) {
    this._detalleUserId = id;
    const lista = document.getElementById('desbloquearLista');
    lista.innerHTML = '<div style="color:#999;">Cargando...</div>';
    document.getElementById('modalDesbloquearOverlay').style.display = 'flex';

    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/users/${id}/blockers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        this._blockers = await res.json();
        lista.innerHTML = this._blockers.map(b => `
            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;
                          border-bottom:1px solid #f0f0f0;cursor:pointer;">
                <input type="checkbox" value="${b.blockerId}" checked
                       style="width:16px;height:16px;cursor:pointer;">
                <span style="flex:1;font-size:0.88rem;">
                    <strong>${b.blockerName}</strong>
                    <span style="color:#999;font-size:0.8rem;margin-left:6px;">${b.blockerEmail}</span>
                </span>
                <span style="font-size:0.75rem;color:#bbb;">
                    ${new Date(b.blockedAt).toLocaleDateString('es-AR')}
                </span>
            </label>
        `).join('');
    } catch(e) {
        lista.innerHTML = '<div style="color:#e50914;">Error al cargar.</div>';
    }
},

seleccionarTodosBlockers: function(checked) {
    document.querySelectorAll('#desbloquearLista input[type="checkbox"]')
        .forEach(cb => cb.checked = checked);
},

confirmarDesbloquear: async function() {
    const seleccionados = [...document.querySelectorAll('#desbloquearLista input[type="checkbox"]:checked')]
        .map(cb => parseInt(cb.value));

    if (seleccionados.length === 0) {
        toast('Seleccioná al menos un usuario', 'warning');
        return;
    }

    const btn = document.getElementById('btnConfirmarDesbloquear');
    btn.disabled = true;
    btn.textContent = 'Desbloqueando...';

    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/users/${this._detalleUserId}/blocks`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ blockerIds: seleccionados })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        document.getElementById('modalDesbloquearOverlay').style.display = 'none';
        toast(`${data.desbloqueados} bloqueo(s) eliminado(s) correctamente`, 'success');
        adminUsuarios.cargarBloqueadores(this._detalleUserId);
        adminUsuarios.cargarUsuarios(0);
    } catch(e) {
        toast('Error al desbloquear', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar desbloqueo';
    }
},

abrirModalReportes: async function(id) {
    const lista = document.getElementById('reportesLista');
    lista.innerHTML = '<div style="color:#999;padding:1rem;">Cargando...</div>';
    document.getElementById('modalReportesOverlay').style.display = 'flex';

    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/users/${id}/reporters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const reporters = await res.json();
        if (reporters.length === 0) {
            lista.innerHTML = '<div style="color:#999;padding:1rem;">Este usuario no fue reportado.</div>';
            return;
        }
        lista.innerHTML = reporters.map(r => `
            <div style="display:flex;align-items:center;gap:1rem;padding:0.6rem 0;
                        border-bottom:1px solid #f0f0f0;">
                <div style="flex:1;">
                    <strong style="font-size:0.88rem;">${r.reporterName}</strong>
                    <span style="color:#999;font-size:0.8rem;margin-left:6px;">${r.reporterEmail}</span>
                </div>
                <span style="font-size:0.78rem;color:#888;white-space:nowrap;">
                    ${new Date(r.reportedAt).toLocaleString('es-AR', {
                        day:'2-digit', month:'2-digit', year:'numeric',
                        hour:'2-digit', minute:'2-digit'
                    })}
                </span>
            </div>
        `).join('');
    } catch(e) {
        lista.innerHTML = '<div style="color:#e50914;padding:1rem;">Error al cargar reportes.</div>';
    }
},

abrirModalOtorgarPuntos: function(userId, nombre) {
    this._otorgarUserId = userId;
    document.getElementById('otorgarPuntosNombre').textContent = nombre;
    document.getElementById('otorgarPuntosInput').value = '';
    document.getElementById('otorgarPuntosTipo').value = 'disponibles';
    document.getElementById('otorgarPuntosError').style.display = 'none';
    document.getElementById('modalOtorgarPuntosOverlay').style.display = 'flex';
},

confirmarOtorgarPuntos: async function() {
    const puntos = parseInt(document.getElementById('otorgarPuntosInput').value);
    const tipo = document.getElementById('otorgarPuntosTipo').value;
    const errorEl = document.getElementById('otorgarPuntosError');
    errorEl.style.display = 'none';

    if (!puntos || puntos <= 0) {
        errorEl.textContent = 'Ingresá un valor mayor a 0.';
        errorEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('btnConfirmarOtorgarPuntos');
    btn.disabled = true;
    btn.textContent = 'Otorgando...';

    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/users/${this._otorgarUserId}/grant-points`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points: puntos, type: tipo })
        });
        if (!res.ok) throw new Error();
        document.getElementById('modalOtorgarPuntosOverlay').style.display = 'none';
        toast(`${puntos} puntos otorgados correctamente`, 'success');
        adminUsuarios.cargarUsuarios(0);
    } catch(e) {
        errorEl.textContent = 'Error al otorgar puntos. Intentá de nuevo.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar';
    }
},

cerrarDetalleUsuario: function() {
    document.getElementById('modalDetalleUsuarioOverlay').classList.remove('open');
    document.getElementById('modalDetalleUsuario').classList.remove('open');
}
};