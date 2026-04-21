// ==============================================
// admin-premios-premium.js - Gestión de premios y sorteos premium
// ==============================================

const adminPremiosPremium = {

    premios: [],
    datosActuales: [],
    paginaActual: 1,
    porPagina: 10,
    editandoId: null,
    imagenPendiente: null,
    filtroEstado: 'todos',
    filtroTipo: 'todos',

    // ------------------------------------------
    // INIT
    // ------------------------------------------
    async init() {
        await this.cargarPremios();
    },

    // ------------------------------------------
    // CARGAR PREMIOS PREMIUM
    // ------------------------------------------
    async cargarPremios() {
        const tbody = document.getElementById('tablaPremiosPremiumBody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>`;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/premium/rewards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            this.premios = await response.json();
            this.paginaActual = 1;
            this.aplicarFiltros();
            this.actualizarStats();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#e50914;">Error al cargar los premios premium</td></tr>`;
        }
    },

    // ------------------------------------------
    // FILTROS
    // ------------------------------------------
    aplicarFiltros() {
        let resultado = this.premios;

        if (this.filtroEstado === 'activos')   resultado = resultado.filter(p => p.active);
        if (this.filtroEstado === 'inactivos') resultado = resultado.filter(p => !p.active);

        if (this.filtroTipo === 'SORTEO')    resultado = resultado.filter(p => p.type === 'SORTEO');
        if (this.filtroTipo === 'CANJEABLE') resultado = resultado.filter(p => p.type === 'CANJEABLE');

        this.datosActuales = resultado;
        this.paginaActual  = 1;
        this.renderTabla();
    },

    filtrarPorEstado(valor) {
        this.filtroEstado = valor;
        this.aplicarFiltros();
    },

    filtrarPorTipo(valor) {
        this.filtroTipo = valor;
        this.aplicarFiltros();
    },

    // ------------------------------------------
    // RENDER TABLA
    // ------------------------------------------
    renderTabla() {
        const tbody = document.getElementById('tablaPremiosPremiumBody');
        if (!tbody) return;

        const premios      = this.datosActuales;
        const totalPaginas = Math.ceil(premios.length / this.porPagina);
        this.paginaActual  = Math.max(1, Math.min(this.paginaActual, totalPaginas || 1));
        const inicio       = (this.paginaActual - 1) * this.porPagina;
        const slice        = premios.slice(inicio, inicio + this.porPagina);

        if (premios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay premios premium que coincidan con los filtros</td></tr>`;
            this.renderPaginacion();
            return;
        }

        tbody.innerHTML = slice.map(p => {
            const tipo   = p.type === 'SORTEO' ? '🎲 Sorteo' : '⭐ Premio';
            const estado = p.active ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>';
            const puntos = p.type === 'SORTEO' ? '—' : `${p.pointsRequired} pts`;
            const fechaSorteo = p.type === 'SORTEO' && p.drawDate
                ? new Date(p.drawDate).toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' })
                : '—';
            const imagen = p.imageUrl
                ? `<img src="${p.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">`
                : `<div style="width:40px;height:40px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-star" style="color:#1a3a6b;"></i></div>`;

            const btnSorteo = p.type === 'SORTEO'
                ? `<button class="btn-accion btn-ejecutar" onclick="adminPremiosPremium.verParticipantes(${p.id})" title="Ver participantes">
                       <i class="fas fa-users"></i>
                   </button>
                   ${!p.drawExecuted ? `<button class="btn-accion" style="background:#1a3a6b;color:white;" onclick="adminPremiosPremium.ejecutarSorteo(${p.id}, '${p.name}')" title="Ejecutar sorteo">
                       <i class="fas fa-random"></i>
                   </button>` : `<span style="font-size:11px;color:#2e7d32;">✓ Ejecutado</span>`}`
                : '';

            return `
                <tr>
                    <td>${imagen}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${tipo}</td>
                    <td>${fechaSorteo}</td>
                    <td>${puntos}</td>
                    <td>${p.stock != null ? p.stock : '∞'}</td>
                    <td>${estado}</td>
                    <td style="white-space:nowrap;">
                        <div style="display:flex; flex-direction:row; align-items:center; gap:4px;">
                            ${btnSorteo}
                            <button class="btn-accion btn-imagen" onclick="adminPremiosPremium.abrirSubidaImagen(${p.id})" title="Cambiar imagen">
                                <i class="fas fa-image"></i>
                            </button>
                            <button class="btn-accion btn-editar" onclick="adminPremiosPremium.abrirFormulario(${p.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-accion btn-eliminar" onclick="adminPremiosPremium.toggleActivo(${p.id}, ${p.active})" title="${p.active ? 'Desactivar' : 'Activar'}">
                                <i class="fas fa-${p.active ? 'eye-slash' : 'eye'}"></i>
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
        let paginacion = document.getElementById('premiosPremiumPaginacion');
        if (!paginacion) {
            const seccion = document.getElementById('section-premiosPremium');
            if (!seccion) return;
            paginacion = document.createElement('div');
            paginacion.id = 'premiosPremiumPaginacion';
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
            <button onclick="adminPremiosPremium.cambiarPagina(${this.paginaActual - 1})"
                ${this.paginaActual === 1 ? 'disabled' : ''}
                style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-size:0.9rem; color:#666;">
                Página ${this.paginaActual} de ${totalPaginas}
            </span>
            <button onclick="adminPremiosPremium.cambiarPagina(${this.paginaActual + 1})"
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
        document.getElementById('section-premiosPremium')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ------------------------------------------
    // STATS
    // ------------------------------------------
    actualizarStats() {
        const total      = this.premios.length;
        const activos    = this.premios.filter(p => p.active).length;
        const sorteos    = this.premios.filter(p => p.type === 'SORTEO').length;
        const canjeables = this.premios.filter(p => p.type === 'CANJEABLE').length;
        document.getElementById('statPPTotal')?.setAttribute('data-value', total);
        document.getElementById('statPPTotal')      && (document.getElementById('statPPTotal').textContent      = total);
        document.getElementById('statPPActivos')    && (document.getElementById('statPPActivos').textContent    = activos);
        document.getElementById('statPPSorteos')    && (document.getElementById('statPPSorteos').textContent    = sorteos);
        document.getElementById('statPPCanjeables') && (document.getElementById('statPPCanjeables').textContent = canjeables);
    },

    // ------------------------------------------
    // ABRIR FORMULARIO
    // ------------------------------------------
    abrirFormulario(id = null) {
        this.editandoId      = id;
        this.imagenPendiente = null;
        const modal  = document.getElementById('modalPremiumOverlay');
        const titulo = document.getElementById('modalPremiumTitulo');

        document.getElementById('formPremiumNombre').value      = '';
        document.getElementById('formPremiumDescripcion').value = '';
        document.getElementById('formPremiumTipo').value        = 'CANJEABLE';
        document.getElementById('formPremiumPuntos').value      = '0';
        document.getElementById('formPremiumStock').value       = '';
        document.getElementById('formPremiumFechaSorteo').value = '';
        document.getElementById('formPremiumActivo').value      = 'true';
        document.getElementById('inputPremiumImagen').value     = '';
        document.getElementById('premiumImagePreview').style.display     = 'none';
        document.getElementById('premiumImagePlaceholder').style.display = 'flex';
        document.getElementById('premiumDescCount').textContent = '0';
        document.getElementById('formPremiumPartner').value  = '';
        document.getElementById('formPremiumWebsite').value  = '';
        document.getElementById('formPremiumTerminos').value = '';
        this.toggleCamposTipo('CANJEABLE');

        if (id) {
            titulo.textContent = 'Editar Premio Premium';
            const p = this.premios.find(x => x.id === id);
            if (p) {
                document.getElementById('formPremiumNombre').value      = p.name || '';
                document.getElementById('formPremiumDescripcion').value = p.description || '';
                document.getElementById('premiumDescCount').textContent = (p.description || '').length;
                document.getElementById('formPremiumTipo').value        = p.type || 'CANJEABLE';
                document.getElementById('formPremiumPuntos').value      = p.pointsRequired || 0;
                document.getElementById('formPremiumStock').value       = p.stock != null ? p.stock : '';
                document.getElementById('formPremiumPartner').value  = p.partner || '';
                document.getElementById('formPremiumWebsite').value  = p.website || '';
                document.getElementById('formPremiumTerminos').value = p.termsConditions || '';
                document.getElementById('formPremiumActivo').value      = p.active ? 'true' : 'false';
                if (p.drawDate) {
                    document.getElementById('formPremiumFechaSorteo').value = p.drawDate.substring(0, 16);
                }
                if (p.imageUrl) {
                    document.getElementById('premiumImagePreview').src            = p.imageUrl;
                    document.getElementById('premiumImagePreview').style.display  = 'block';
                    document.getElementById('premiumImagePlaceholder').style.display = 'none';
                }
                this.toggleCamposTipo(p.type);
            }
        } else {
            titulo.textContent = 'Nuevo Premio Premium';
        }

        modal.style.display = 'flex';
    },

    cerrarFormulario() {
        document.getElementById('modalPremiumOverlay').style.display     = 'none';
        document.getElementById('premiumImagePreview').style.display     = 'none';
        document.getElementById('premiumImagePlaceholder').style.display = 'flex';
        document.getElementById('inputPremiumImagen').value              = '';
        this.editandoId      = null;
        this.imagenPendiente = null;
    },

    toggleCamposTipo(tipo) {
        const campoPuntos = document.getElementById('campoPremiumPuntos');
        const campoSorteo = document.getElementById('campoPremiumFechaSorteo');
        const campoStock  = document.getElementById('campoPremiumStock');
        if (campoPuntos) campoPuntos.style.display = tipo === 'CANJEABLE' ? 'block' : 'none';
        if (campoSorteo) campoSorteo.style.display = tipo === 'SORTEO'    ? 'block' : 'none';
        if (campoStock)  campoStock.style.display  = tipo === 'CANJEABLE' ? 'block' : 'none';
    },

    // ------------------------------------------
    // PREVIEW DE IMAGEN
    // ------------------------------------------
    previewImagen(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen supera los 5MB');
            input.value = '';
            return;
        }
        this.imagenPendiente = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('premiumImagePreview').src            = e.target.result;
            document.getElementById('premiumImagePreview').style.display  = 'block';
            document.getElementById('premiumImagePlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    },

    // ------------------------------------------
    // SUBIR IMAGEN A CLOUDINARY
    // ------------------------------------------
    async subirImagen(premioId, file) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${CONFIG.API_URL}/admin/premium/rewards/${premioId}/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) throw new Error('Error al subir imagen');
        return await response.json();
    },

    // ------------------------------------------
    // SUBIDA RÁPIDA DESDE TABLA
    // ------------------------------------------
    abrirSubidaImagen(premioId) {
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen supera los 5MB');
                return;
            }
            try {
                await this.subirImagen(premioId, file);
                await this.cargarPremios();
            } catch {
                alert('Error al subir la imagen');
            }
        };
        input.click();
    },

    // ------------------------------------------
    // GUARDAR
    // ------------------------------------------
    async guardar() {
        const nombre = document.getElementById('formPremiumNombre').value.trim();
        if (!nombre) { alert('El nombre es obligatorio'); return; }

        const tipo        = document.getElementById('formPremiumTipo').value;
        const fechaSorteo = document.getElementById('formPremiumFechaSorteo').value;

        const body = {
            name:            nombre,
            description:     document.getElementById('formPremiumDescripcion').value.trim(),
            type:            tipo,
            pointsRequired:  tipo === 'CANJEABLE' ? parseInt(document.getElementById('formPremiumPuntos').value) || 0 : 0,
            stock:           document.getElementById('formPremiumStock').value ? parseInt(document.getElementById('formPremiumStock').value) : null,
            partner:         document.getElementById('formPremiumPartner').value.trim() || null,
            website:         document.getElementById('formPremiumWebsite').value.trim() || null,
            termsConditions: document.getElementById('formPremiumTerminos').value.trim() || null,
            drawDate:        tipo === 'SORTEO' && fechaSorteo ? fechaSorteo : null,
            active:          document.getElementById('formPremiumActivo').value === 'true'
        };

        const url    = this.editandoId ? `${CONFIG.API_URL}/admin/premium/rewards/${this.editandoId}` : `${CONFIG.API_URL}/admin/premium/rewards`;
        const method = this.editandoId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const saved = await response.json();

            if (this.imagenPendiente) {
                await this.subirImagen(saved.id, this.imagenPendiente);
                this.imagenPendiente = null;
            }

            this.cerrarFormulario();
            await this.cargarPremios();
        } catch (error) {
            alert('Error al guardar el premio premium');
        }
    },

    // ------------------------------------------
    // TOGGLE ACTIVO
    // ------------------------------------------
    async toggleActivo(id, activo) {
        const accion = activo ? 'desactivar' : 'activar';
        if (!confirm(`¿Querés ${accion} este premio?`)) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/premium/rewards/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ active: !activo })
            });
            if (!response.ok) throw new Error();
            await this.cargarPremios();
        } catch {
            alert('Error al actualizar el premio');
        }
    },

    // ------------------------------------------
    // VER PARTICIPANTES DEL SORTEO
    // ------------------------------------------
    async verParticipantes(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/premium/rewards/${id}/entries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const data = await response.json();

            const lista  = document.getElementById('participantesLista');
            const titulo = document.getElementById('modalParticipantesTitulo');
            const premio = this.premios.find(p => p.id === id);
            titulo.textContent = `Participantes — ${premio?.name || 'Sorteo'}`;

            if (data.entries.length === 0) {
                lista.innerHTML = '<p style="color:#888;text-align:center;padding:1rem;">Nadie se anotó aún</p>';
            } else {
                lista.innerHTML = `
                    <p style="margin-bottom:1rem;color:#555;"><strong>${data.totalEntries}</strong> participantes anotados</p>
                    <table class="admin-table">
                        <thead><tr><th>Usuario</th><th>Email</th><th>Fecha</th></tr></thead>
                        <tbody>
                            ${data.entries.map(e => `
                                <tr>
                                    <td>${e.userName}</td>
                                    <td>${e.userEmail}</td>
                                    <td>${new Date(e.enteredAt).toLocaleDateString('es-AR')}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>`;
            }

            document.getElementById('modalParticipantesOverlay').style.display = 'flex';
        } catch {
            alert('Error al cargar los participantes');
        }
    },

    cerrarParticipantes() {
        document.getElementById('modalParticipantesOverlay').style.display = 'none';
    },

    // ------------------------------------------
    // EJECUTAR SORTEO
    // ------------------------------------------
    async ejecutarSorteo(id, nombre) {
        if (!confirm(`¿Ejecutar el sorteo de "${nombre}"? Esta acción no se puede deshacer.`)) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/premium/rewards/${id}/draw`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const result = await response.json();
            alert(`🏆 Sorteo ejecutado!\nGanador: ${result.winnerName} (${result.winnerEmail})\nTotal participantes: ${result.totalParticipants}`);
            await this.cargarPremios();
        } catch {
            alert('Error al ejecutar el sorteo');
        }
    }
};