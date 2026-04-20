// ==============================================
// admin-supervision.js - Módulo de Supervisión
// ==============================================

const adminSupervision = {

    pestanaActual: 'reported',
    datosActuales: [],
    paginaActual: 1,
    porPagina: 20,

    // Palabras prohibidas
    palabrasActuales: [],
    palabrasFiltradas: [],
    palabrasPagina: 1,
    palabrasPorPagina: 20,

    // ------------------------------------------
    // INIT
    // ------------------------------------------
    async init() {
        await this.cargarStats();
        setTimeout(() => {
            const btnReportados = document.querySelector('.supervision-tab');
            this.cambiarPestana('reported', btnReportados);
        }, 100);
    },

    // ------------------------------------------
    // STATS (badge sidebar)
    // ------------------------------------------
    async cargarStats() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/supervision/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const stats = await response.json();

            const total = (stats.reportados || 0) + (stats.pendientes || 0);
            const badge = document.getElementById('adminSupervisionBadge');
            if (badge) {
                if (total > 0) {
                    badge.textContent = total;
                    badge.style.display = 'inline';
                } else {
                    badge.style.display = 'none';
                }
            }

            document.getElementById('statSupReportados') && (document.getElementById('statSupReportados').textContent = stats.reportados || 0);
            document.getElementById('statSupPendientes') && (document.getElementById('statSupPendientes').textContent = stats.pendientes || 0);
            document.getElementById('statSupResueltos')  && (document.getElementById('statSupResueltos').textContent  = stats.resueltos  || 0);

        } catch (error) {
            console.error('Error cargando stats supervisión:', error);
        }
    },

    // ------------------------------------------
    // CAMBIAR PESTAÑA
    // ------------------------------------------
    async cambiarPestana(pestana, el) {
        document.querySelectorAll('.supervision-tab').forEach(t => {
            t.style.border     = '1.5px solid #ddd';
            t.style.background = 'white';
            t.style.color      = '#555';
            t.style.fontWeight = 'normal';
            t.classList.remove('active');
        });

        if (el) {
            el.style.border     = '1.5px solid #e50914';
            el.style.background = '#fff0f0';
            el.style.color      = '#e50914';
            el.style.fontWeight = '600';
            el.classList.add('active');
        }

        this.pestanaActual = pestana;
        this.paginaActual  = 1;

        const tablaComentarios = document.getElementById('tablaSupervisionWrapper');
        const tablaPalabras    = document.getElementById('tablaPalabrasWrapper');

        if (pestana === 'palabras') {
            if (tablaComentarios) tablaComentarios.style.display = 'none';
            if (tablaPalabras)    tablaPalabras.style.display    = 'block';
            await this.cargarPalabras();
        } else {
            if (tablaComentarios) tablaComentarios.style.display = 'block';
            if (tablaPalabras)    tablaPalabras.style.display    = 'none';
            await this.cargarPestana(pestana);
        }
    },

    async cargarPestana(pestana) {
        const tbody = document.getElementById('tablaSupervisionBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

        const endpoints = {
            reported: 'reported',
            pending:  'pending',
            resolved: 'resolved'
        };

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/supervision/${endpoints[pestana]}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            this.datosActuales = await response.json();
            this.paginaActual  = 1;
            this.renderTabla();
        } catch (error) {
            console.error('Error cargando supervisión:', error);
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row" style="color:#e50914;">Error al cargar los datos</td></tr>`;
        }
    },

    // ------------------------------------------
    // RENDER TABLA COMENTARIOS
    // ------------------------------------------
    renderTabla() {
        const tbody = document.getElementById('tablaSupervisionBody');
        if (!tbody) return;

        const datos       = this.datosActuales;
        const totalPag    = Math.ceil(datos.length / this.porPagina);
        this.paginaActual = Math.max(1, Math.min(this.paginaActual, totalPag || 1));
        const inicio      = (this.paginaActual - 1) * this.porPagina;
        const slice       = datos.slice(inicio, inicio + this.porPagina);

        if (datos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay comentarios en esta categoría</td></tr>`;
            this.renderPaginacion();
            return;
        }

        tbody.innerHTML = slice.map(c => {
            const statusBadge = {
                'APPROVED':      '<span class="badge-activo">Aprobado</span>',
                'PENDING_REVIEW':'<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:12px;font-size:11px;">Revisión</span>',
                'AUTO_HIDDEN':   '<span class="badge-inactivo">Auto-ocultado</span>',
                'REMOVED':       '<span class="badge-inactivo">Eliminado</span>',
                'REJECTED':      '<span class="badge-inactivo">Rechazado</span>'
            }[c.moderationStatus] || c.moderationStatus;

            const contenidoCorto = c.content?.length > 80
                ? c.content.substring(0, 80) + '...'
                : (c.content || '');

            const toxicity = c.toxicityScore != null
                ? `<span style="color:${c.toxicityScore >= 0.6 ? '#e50914' : '#2e7d32'};">${(c.toxicityScore * 100).toFixed(0)}%</span>`
                : '—';

            const fecha = c.createdAt
                ? new Date(c.createdAt).toLocaleDateString('es-AR')
                : '—';

            return `
                <tr>
                    <td>
                        <div style="font-size:0.85rem;color:#333;max-width:250px;">${contenidoCorto}</div>
                        <small style="color:#999;">Película ID: ${c.movieId}</small>
                    </td>
                    <td>
                        <strong style="font-size:0.85rem;">${c.authorName || '—'}</strong><br>
                        <small style="color:#888;">${c.authorEmail || ''}</small>
                    </td>
                    <td style="text-align:center;">
                        ${c.reportCount > 0
                            ? `<span style="background:#fff0f0;color:#e50914;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${c.reportCount}</span>`
                            : '<span style="color:#ccc;">—</span>'}
                    </td>
                    <td style="text-align:center;">${toxicity}</td>
                    <td>${statusBadge}</td>
                    <td style="color:#888;font-size:0.8rem;">${fecha}</td>
                    <td class="acciones-col">
                        <div style="display:flex;flex-direction:row;align-items:center;gap:4px;">
                            ${this.generarAcciones(c)}
                        </div>
                    </td>
                </tr>`;
        }).join('');

        this.renderPaginacion();
    },

    generarAcciones(c) {
        let acciones = `
            <button class="btn-accion btn-editar" onclick="adminSupervision.verDetalle(${c.commentId})" title="Ver detalle">
                <i class="fas fa-eye"></i>
            </button>`;

        if (c.moderationStatus !== 'REMOVED') {
            acciones += `
                <button class="btn-accion btn-eliminar" onclick="adminSupervision.abrirModalEliminar(${c.commentId})" title="Eliminar comentario">
                    <i class="fas fa-trash"></i>
                </button>`;
        }

        if (c.moderationStatus === 'AUTO_HIDDEN' || c.moderationStatus === 'PENDING_REVIEW') {
            acciones += `
                <button class="btn-accion btn-activar" onclick="adminSupervision.restaurar(${c.commentId})" title="Restaurar comentario">
                    <i class="fas fa-check"></i>
                </button>`;
        }

        if (c.reportCount > 0 && c.moderationStatus !== 'REMOVED') {
            acciones += `
                <button class="btn-accion" style="background:#f0f0f0;color:#555;" onclick="adminSupervision.descartarReportes(${c.commentId})" title="Descartar reportes">
                    <i class="fas fa-ban"></i>
                </button>`;
        }

        return acciones;
    },

    // ------------------------------------------
    // PAGINACIÓN COMENTARIOS
    // ------------------------------------------
    renderPaginacion() {
        let paginacion = document.getElementById('supervisionPaginacion');
        if (!paginacion) {
            const wrapper = document.getElementById('tablaSupervisionWrapper');
            if (!wrapper) return;
            paginacion = document.createElement('div');
            paginacion.id = 'supervisionPaginacion';
            paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
            wrapper.appendChild(paginacion);
        }

        const totalPaginas = Math.ceil(this.datosActuales.length / this.porPagina);

        if (totalPaginas <= 1) {
            paginacion.style.display = 'none';
            return;
        }

        paginacion.style.display = 'flex';
        paginacion.innerHTML = `
            <button onclick="adminSupervision.cambiarPagina(${this.paginaActual - 1})"
                ${this.paginaActual === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${this.paginaActual} de ${totalPaginas}
            </span>
            <button onclick="adminSupervision.cambiarPagina(${this.paginaActual + 1})"
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
        document.getElementById('section-supervision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ------------------------------------------
    // VER DETALLE
    // ------------------------------------------
    verDetalle(commentId) {
        const c = this.datosActuales.find(x => x.commentId === commentId);
        if (!c) return;

        const contenido = document.getElementById('supDetalleContenido');
        if (!contenido) return;

        const reportesHTML = c.reports && c.reports.length > 0
            ? `<table class="admin-table" style="margin-top:0.5rem;">
                <thead><tr><th>Usuario</th><th>Motivo</th><th>Descripción</th><th>Fecha</th></tr></thead>
                <tbody>
                    ${c.reports.map(r => `
                        <tr>
                            <td>${r.reporterName}<br><small style="color:#888;">${r.reporterEmail}</small></td>
                            <td>${this.traducirMotivo(r.reason)}</td>
                            <td>${r.description || '—'}</td>
                            <td>${new Date(r.createdAt).toLocaleDateString('es-AR')}</td>
                        </tr>`).join('')}
                </tbody>
              </table>`
            : '<p style="color:#888;margin:0.5rem 0;">Sin reportes de usuarios</p>';

        contenido.innerHTML = `
            <div style="margin-bottom:1rem;">
                <strong>Autor:</strong> ${c.authorName} (${c.authorEmail})<br>
                <strong>Película ID:</strong> ${c.movieId}<br>
                <strong>Fecha:</strong> ${c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-AR') : '—'}<br>
                ${c.toxicityScore != null ? `<strong>Score de toxicidad:</strong> ${(c.toxicityScore * 100).toFixed(1)}%<br>` : ''}
                <strong>Estado:</strong> ${c.moderationStatus}
            </div>
            <div style="background:#f9f9f9;border-radius:8px;padding:1rem;margin-bottom:1rem;border-left:3px solid #e50914;">
                <strong>Comentario:</strong>
                <p style="margin:0.5rem 0 0;color:#444;">${c.content}</p>
            </div>
            <div>
                <strong>Reportes recibidos (${c.reportCount || 0}):</strong>
                ${reportesHTML}
            </div>
        `;

        document.getElementById('modalSupervisionDetalle').style.display = 'flex';
    },

    cerrarDetalle() {
        document.getElementById('modalSupervisionDetalle').style.display = 'none';
    },

    traducirMotivo(reason) {
        const motivos = {
            'OFFENSIVE':     'Lenguaje ofensivo',
            'INSULT':        'Insulto personal',
            'SPAM':          'Spam',
            'INAPPROPRIATE': 'Contenido inapropiado',
            'OTHER':         'Otro'
        };
        return motivos[reason] || reason;
    },

    // ------------------------------------------
    // MODAL ELIMINAR
    // ------------------------------------------
    abrirModalEliminar(commentId) {
        document.getElementById('inputSupRazon').value = '';
        document.getElementById('modalSupEliminar').style.display = 'flex';
        document.getElementById('modalSupEliminar').dataset.commentId = commentId;
    },

    cerrarModalEliminar() {
        document.getElementById('modalSupEliminar').style.display = 'none';
    },

    async confirmarEliminar() {
        const modal     = document.getElementById('modalSupEliminar');
        const commentId = modal.dataset.commentId;
        const razon     = document.getElementById('inputSupRazon').value.trim();

        if (!razon) {
            alert('El motivo de eliminación es obligatorio.');
            return;
        }

        const btn = document.getElementById('btnConfirmarEliminar');
        btn.disabled = true;
        btn.textContent = 'Eliminando...';

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/supervision/${commentId}/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: razon })
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            this.cerrarModalEliminar();
            toast('Comentario eliminado y usuario notificado', 'success');
            await this.cargarStats();
            await this.cargarPestana(this.pestanaActual);

        } catch (error) {
            console.error('Error eliminando comentario:', error);
            toast('Error al eliminar el comentario', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sí, eliminar';
        }
    },

    // ------------------------------------------
    // RESTAURAR
    // ------------------------------------------
    async restaurar(commentId) {
        if (!confirm('¿Restaurar este comentario? Volverá a ser visible para los usuarios.')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/supervision/${commentId}/restore`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            toast('Comentario restaurado correctamente', 'success');
            await this.cargarStats();
            await this.cargarPestana(this.pestanaActual);
        } catch {
            toast('Error al restaurar el comentario', 'error');
        }
    },

    // ------------------------------------------
    // DESCARTAR REPORTES
    // ------------------------------------------
    async descartarReportes(commentId) {
        if (!confirm('¿Descartar todos los reportes de este comentario? El comentario seguirá visible.')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/supervision/${commentId}/dismiss`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            toast('Reportes descartados. El comentario sigue visible.', 'success');
            await this.cargarStats();
            await this.cargarPestana(this.pestanaActual);
        } catch {
            toast('Error al descartar los reportes', 'error');
        }
    },

    // ------------------------------------------
    // PALABRAS PROHIBIDAS
    // ------------------------------------------
    async cargarPalabras() {
        const tbody = document.getElementById('tablaPalabrasBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="3" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

        // Limpiar buscador
        const buscador = document.getElementById('buscarPalabra');
        if (buscador) buscador.value = '';

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/banned-words`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            this.palabrasActuales  = await response.json();
            this.palabrasFiltradas = this.palabrasActuales;
            this.palabrasPagina    = 1;
            this.renderPalabras();
        } catch (error) {
            console.error('Error cargando palabras:', error);
            tbody.innerHTML = `<tr><td colspan="3" class="loading-row" style="color:#e50914;">Error al cargar la lista</td></tr>`;
        }
    },

    buscarPalabra(texto) {
        const q = texto.toLowerCase().trim();
        this.palabrasFiltradas = q
            ? this.palabrasActuales.filter(p => p.word.includes(q))
            : this.palabrasActuales;
        this.palabrasPagina = 1;
        this.renderPalabras();
    },

    renderPalabras() {
        const tbody = document.getElementById('tablaPalabrasBody');
        if (!tbody) return;

        const datos       = this.palabrasFiltradas;
        const totalPag    = Math.ceil(datos.length / this.palabrasPorPagina);
        this.palabrasPagina = Math.max(1, Math.min(this.palabrasPagina, totalPag || 1));
        const inicio      = (this.palabrasPagina - 1) * this.palabrasPorPagina;
        const slice       = datos.slice(inicio, inicio + this.palabrasPorPagina);

        if (datos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="loading-row">No se encontraron palabras</td></tr>`;
            this.renderPaginacionPalabras();
            return;
        }

        tbody.innerHTML = slice.map(p => `
            <tr>
                <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:0.9rem;">${p.word}</code></td>
                <td>
                    ${p.severity === 'BLOCK'
                        ? '<span class="badge-inactivo">🚫 Bloquear</span>'
                        : '<span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:12px;font-size:11px;">⚠️ Revisión</span>'}
                </td>
                <td class="acciones-col">
                    <button class="btn-accion btn-eliminar" onclick="adminSupervision.eliminarPalabra(${p.id}, '${p.word}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`).join('');

        this.renderPaginacionPalabras();
    },

    renderPaginacionPalabras() {
        let paginacion = document.getElementById('palabrasPaginacion');
        if (!paginacion) {
            const wrapper = document.getElementById('tablaPalabrasWrapper');
            if (!wrapper) return;
            paginacion = document.createElement('div');
            paginacion.id = 'palabrasPaginacion';
            paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
            wrapper.appendChild(paginacion);
        }

        const totalPaginas = Math.ceil(this.palabrasFiltradas.length / this.palabrasPorPagina);

        if (totalPaginas <= 1) {
            paginacion.style.display = 'none';
            return;
        }

        paginacion.style.display = 'flex';
        paginacion.innerHTML = `
            <button onclick="adminSupervision.cambiarPaginaPalabras(${this.palabrasPagina - 1})"
                ${this.palabrasPagina === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${this.palabrasPagina} de ${totalPaginas}
                <small style="color:#aaa;">(${this.palabrasFiltradas.length} palabras)</small>
            </span>
            <button onclick="adminSupervision.cambiarPaginaPalabras(${this.palabrasPagina + 1})"
                ${this.palabrasPagina >= totalPaginas ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    },

    cambiarPaginaPalabras(pagina) {
        const totalPaginas = Math.ceil(this.palabrasFiltradas.length / this.palabrasPorPagina);
        if (pagina < 1 || pagina > totalPaginas) return;
        this.palabrasPagina = pagina;
        this.renderPalabras();
        document.getElementById('tablaPalabrasWrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    async agregarPalabra() {
        const inputWord     = document.getElementById('inputNuevaPalabra');
        const inputSeverity = document.getElementById('selectSeveridad');
        const word          = inputWord?.value.trim();
        const severity      = inputSeverity?.value || 'BLOCK';

        if (!word) {
            alert('Ingresá una palabra');
            inputWord?.focus();
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/banned-words`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ word, severity })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Error al agregar la palabra');
                return;
            }

            inputWord.value = '';
            toast(`Palabra "${data.word}" agregada correctamente`, 'success');
            await this.cargarPalabras();

        } catch (error) {
            console.error('Error agregando palabra:', error);
            toast('Error al agregar la palabra', 'error');
        }
    },

    async eliminarPalabra(id, word) {
        if (!confirm(`¿Eliminar la palabra "${word}" de la lista negra?`)) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/banned-words/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error();
            toast(`Palabra "${word}" eliminada`, 'success');
            await this.cargarPalabras();

        } catch {
            toast('Error al eliminar la palabra', 'error');
        }
    }
};
