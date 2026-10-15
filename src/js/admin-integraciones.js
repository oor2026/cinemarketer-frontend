// ==============================================
// ADMIN — INTEGRACIONES
// ==============================================
// Enlaces de las cadenas de cine hacia sus sorteos y sus promociones. En
// Cartelera, el usuario ve la cadena con su logo y al tocarla va al sitio
// oficial; acá se cargan, se activan y se ve cuántos clics recibió cada uno,
// que es el dato para la conversación comercial con la marca.
//
// Pestañas:
//   SORTEO        → atajo "Sorteos"
//   PROMO_CADENA  → atajo "Promos y bancos" › "Por cadena de cine"
// (las promos por medio de pago tienen su propia sección, más adelante)

const adminIntegraciones = {
    tipo: 'SORTEO',
    enlaces: [],
    editandoId: null,

    TIPOS: {
        SORTEO: { nombre: 'Sorteos', ejemploTitulo: 'Participá en los sorteos de Showcase' },
        PROMO_CADENA: { nombre: 'Promos por cadena', ejemploTitulo: 'Promociones de Showcase' }
    },

    VINCULOS: {
        PUBLICO: { texto: 'Público', ayuda: 'Tomado de su sitio, sin contacto', color: '#6b7280', fondo: '#f3f4f6' },
        CONTACTADO: { texto: 'Contactado', ayuda: 'Ya hablamos con la marca', color: '#92400e', fondo: '#fef3c7' },
        ACUERDO: { texto: 'Acuerdo', ayuda: 'Trabajamos en conjunto', color: '#065f46', fondo: '#d1fae5' }
    },

    init() {
        this.inyectarEstilos();
        this.asegurarModal();
        this.cargarCadenasSugeridas();
        this.cargarLista();
    },

    headers(json) {
        const h = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    },

    esc(texto) {
        return String(texto == null ? '' : texto).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    cambiarTipo(tipo) {
        this.tipo = tipo;
        document.querySelectorAll('#section-integraciones .integ-tab').forEach(b => {
            b.classList.toggle('activo', b.dataset.tipo === tipo);
        });
        this.cargarLista();
    },

    // ------------------------------------------
    // LISTA
    // ------------------------------------------
    async cargarLista() {
        const cont = document.getElementById('adminIntegracionesLista');
        if (!cont) return;
        cont.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
        const tipoPedido = this.tipo;
        try {
            const res = await fetch(`${CONFIG.API_URL}/admin/integraciones/enlaces?tipo=${encodeURIComponent(tipoPedido)}`, {
                headers: this.headers(false)
            });
            if (!res.ok) throw new Error('status ' + res.status);
            const enlaces = await res.json();
            if (tipoPedido !== this.tipo) return; // se cambió de pestaña mientras cargaba
            this.enlaces = enlaces;
            this.render();
        } catch (e) {
            cont.innerHTML = '<div class="integ-vacio">No se pudieron cargar los enlaces. Intentá de nuevo.</div>';
            const resumen = document.getElementById('adminIntegracionesResumen');
            if (resumen) resumen.textContent = '';
        }
    },

    render() {
        const cont = document.getElementById('adminIntegracionesLista');
        const resumen = document.getElementById('adminIntegracionesResumen');
        const lista = this.enlaces || [];

        const activos = lista.filter(e => e.activo).length;
        const clics = lista.reduce((s, e) => s + (e.clics || 0), 0);
        if (resumen) {
            resumen.textContent = lista.length
                ? `${lista.length} ${lista.length === 1 ? 'enlace' : 'enlaces'} · ${activos} ${activos === 1 ? 'activo' : 'activos'} · ${clics.toLocaleString('es-AR')} ${clics === 1 ? 'clic' : 'clics'} en total`
                : '';
        }

        if (!lista.length) {
            cont.innerHTML = `<div class="integ-vacio">Todavía no hay enlaces de ${this.esc(this.TIPOS[this.tipo].nombre.toLowerCase())}. Cargá el primero con "Nuevo enlace".</div>`;
            return;
        }

        cont.innerHTML = `
            <div class="integ-tabla-wrap">
                <table class="integ-tabla">
                    <thead>
                        <tr>
                            <th>Orden</th>
                            <th>Cadena</th>
                            <th>Enlace</th>
                            <th>Vínculo</th>
                            <th class="integ-num">Clics</th>
                            <th>Verificado</th>
                            <th>Activo</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lista.map(e => this.filaHtml(e)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    filaHtml(e) {
        const v = this.VINCULOS[e.estadoVinculo] || this.VINCULOS.PUBLICO;
        const verificado = e.verificadoEn
            ? new Date(e.verificadoEn + 'T12:00:00').toLocaleDateString('es-AR')
            : '<span class="integ-tenue">—</span>';
        return `
            <tr class="${e.activo ? '' : 'integ-fila-inactiva'}">
                <td>${e.orden ?? 0}</td>
                <td>
                    <strong>${this.esc(e.cadena)}</strong>
                    ${e.titulo ? `<div class="integ-tenue">${this.esc(e.titulo)}</div>` : ''}
                    ${e.notaInterna ? `<div class="integ-nota" title="${this.esc(e.notaInterna)}"><i class="fas fa-sticky-note"></i> ${this.esc(e.notaInterna)}</div>` : ''}
                </td>
                <td><a href="${this.esc(e.url)}" target="_blank" rel="noopener" class="integ-url">${this.esc(e.url)}</a></td>
                <td><span class="integ-badge" style="color:${v.color};background:${v.fondo};" title="${this.esc(v.ayuda)}">${v.texto}</span></td>
                <td class="integ-num"><strong>${(e.clics || 0).toLocaleString('es-AR')}</strong></td>
                <td>${verificado}</td>
                <td>
                    <label class="integ-switch" title="${e.activo ? 'Visible en Cartelera' : 'Oculto en Cartelera'}">
                        <input type="checkbox" ${e.activo ? 'checked' : ''} onchange="adminIntegraciones.cambiarActivo(${e.id}, this.checked, this)">
                        <span></span>
                    </label>
                </td>
                <td class="integ-acciones">
                    <button type="button" title="Editar" onclick="adminIntegraciones.abrirFormulario(${e.id})"><i class="fas fa-pen"></i></button>
                    <button type="button" title="Borrar" onclick="adminIntegraciones.borrar(${e.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    },

    async cambiarActivo(id, activo, checkbox) {
        try {
            const res = await fetch(`${CONFIG.API_URL}/admin/integraciones/enlaces/${id}/activo`, {
                method: 'PATCH',
                headers: this.headers(true),
                body: JSON.stringify({ activo })
            });
            if (!res.ok) throw new Error();
            const actualizado = await res.json();
            this.enlaces = this.enlaces.map(e => e.id === id ? actualizado : e);
            this.render();
        } catch (e) {
            if (checkbox) checkbox.checked = !activo;
            alert('No se pudo cambiar el estado. Intentá de nuevo.');
        }
    },

    async borrar(id) {
        const e = this.enlaces.find(x => x.id === id);
        if (!e) return;
        const aviso = e.clics
            ? `¿Borrar el enlace de ${e.cadena}? Se pierden sus ${e.clics} clics registrados. Si solo querés ocultarlo, desactivalo.`
            : `¿Borrar el enlace de ${e.cadena}?`;
        if (!confirm(aviso)) return;
        try {
            const res = await fetch(`${CONFIG.API_URL}/admin/integraciones/enlaces/${id}`, {
                method: 'DELETE',
                headers: this.headers(false)
            });
            if (!res.ok) throw new Error();
            this.enlaces = this.enlaces.filter(x => x.id !== id);
            this.render();
        } catch (err) {
            alert('No se pudo borrar. Intentá de nuevo.');
        }
    },

    // Nombres de las cadenas de Cartelera, como sugerencia al escribir (así el nombre
    // coincide y el atajo encuentra el logo). Si falla, se escribe a mano igual.
    async cargarCadenasSugeridas() {
        try {
            const res = await fetch(`${CONFIG.API_URL}/cartelera/cadenas`, { headers: this.headers(false) });
            if (!res.ok) return;
            const cadenas = await res.json();
            const datalist = document.getElementById('integCadenasSugeridas');
            if (datalist && Array.isArray(cadenas)) {
                datalist.innerHTML = cadenas.filter(c => c !== 'Otros cines')
                    .map(c => `<option value="${this.esc(c)}"></option>`).join('');
            }
        } catch (e) { /* sin sugerencias */ }
    },

    // ------------------------------------------
    // FORMULARIO (modal)
    // ------------------------------------------
    asegurarModal() {
        if (document.getElementById('integModalOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'integModalOverlay';
        overlay.className = 'integ-modal-overlay';
        overlay.innerHTML = `
            <div class="integ-modal" role="dialog" aria-modal="true" aria-labelledby="integModalTitulo">
                <div class="integ-modal-header">
                    <h3 id="integModalTitulo">Nuevo enlace</h3>
                    <button type="button" class="integ-modal-cerrar" aria-label="Cerrar" onclick="adminIntegraciones.cerrarFormulario()"><i class="fas fa-times"></i></button>
                </div>
                <div class="integ-modal-body">
                    <div class="form-group-admin">
                        <label for="integInputCadena">Cadena *</label>
                        <input type="text" id="integInputCadena" class="admin-input" list="integCadenasSugeridas" maxlength="100" placeholder="Ej: Showcase">
                        <datalist id="integCadenasSugeridas"></datalist>
                        <small class="integ-ayuda">Usá el mismo nombre que en Cartelera, así aparece con su logo.</small>
                    </div>
                    <div class="form-group-admin">
                        <label for="integInputUrl">Enlace *</label>
                        <input type="url" id="integInputUrl" class="admin-input" maxlength="500" placeholder="https://www.todoshowcase.com/sorteo">
                        <small class="integ-ayuda"><a href="#" onclick="event.preventDefault(); adminIntegraciones.probarEnlace()">Probar el enlace</a></small>
                    </div>
                    <div class="form-group-admin">
                        <label for="integInputTitulo">Título (opcional)</label>
                        <input type="text" id="integInputTitulo" class="admin-input" maxlength="150">
                    </div>
                    <div class="integ-fila-form">
                        <div class="form-group-admin">
                            <label for="integInputOrden">Orden</label>
                            <input type="number" id="integInputOrden" class="admin-input" min="0" value="0" style="width:100px;">
                        </div>
                        <div class="form-group-admin">
                            <label for="integInputVinculo">Vínculo con la marca</label>
                            <select id="integInputVinculo" class="admin-input">
                                <option value="PUBLICO">Público (tomado de su sitio)</option>
                                <option value="CONTACTADO">Contactado</option>
                                <option value="ACUERDO">Acuerdo</option>
                            </select>
                        </div>
                        <div class="form-group-admin">
                            <label for="integInputVerificado">Verificado el</label>
                            <div style="display:flex;gap:6px;">
                                <input type="date" id="integInputVerificado" class="admin-input">
                                <button type="button" class="admin-btn-secondary" onclick="adminIntegraciones.marcarVerificadoHoy()">Hoy</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group-admin">
                        <label for="integInputNota">Nota interna (no se muestra a los usuarios)</label>
                        <textarea id="integInputNota" class="admin-textarea" maxlength="1000" placeholder="Contacto, fuente, lo que se habló con la marca..."></textarea>
                    </div>
                    <label class="integ-check"><input type="checkbox" id="integInputActivo"> Visible en Cartelera</label>
                    <div id="integFormError" class="integ-error" role="alert"></div>
                </div>
                <div class="integ-modal-footer">
                    <button type="button" class="admin-btn-secondary" onclick="adminIntegraciones.cerrarFormulario()"><i class="fas fa-times"></i> Cancelar</button>
                    <button type="button" class="admin-btn-primary" id="integBtnGuardar" onclick="adminIntegraciones.guardar()"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', ev => { if (ev.target === overlay) this.cerrarFormulario(); });
        document.body.appendChild(overlay);
    },

    abrirFormulario(id) {
        this.asegurarModal();
        const e = id != null ? this.enlaces.find(x => x.id === id) : null;
        this.editandoId = e ? e.id : null;
        const tipoInfo = this.TIPOS[this.tipo];

        document.getElementById('integModalTitulo').textContent = e
            ? `Editar enlace · ${tipoInfo.nombre}`
            : `Nuevo enlace · ${tipoInfo.nombre}`;
        document.getElementById('integInputCadena').value = e ? e.cadena : '';
        document.getElementById('integInputUrl').value = e ? e.url : '';
        document.getElementById('integInputTitulo').value = e ? (e.titulo || '') : '';
        document.getElementById('integInputTitulo').placeholder = 'Ej: ' + tipoInfo.ejemploTitulo;
        document.getElementById('integInputOrden').value = e ? (e.orden ?? 0) : 0;
        document.getElementById('integInputVinculo').value = e ? (e.estadoVinculo || 'PUBLICO') : 'PUBLICO';
        document.getElementById('integInputVerificado').value = e ? (e.verificadoEn || '') : '';
        document.getElementById('integInputNota').value = e ? (e.notaInterna || '') : '';
        document.getElementById('integInputActivo').checked = e ? !!e.activo : false;
        document.getElementById('integFormError').textContent = '';

        document.getElementById('integModalOverlay').classList.add('abierto');
        document.getElementById('integInputCadena').focus();
    },

    cerrarFormulario() {
        const overlay = document.getElementById('integModalOverlay');
        if (overlay) overlay.classList.remove('abierto');
        this.editandoId = null;
    },

    marcarVerificadoHoy() {
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
        document.getElementById('integInputVerificado').value = hoy;
    },

    probarEnlace() {
        const url = document.getElementById('integInputUrl').value.trim();
        if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
        else document.getElementById('integFormError').textContent = 'Escribí un enlace que empiece con https://';
    },

    async guardar() {
        const error = document.getElementById('integFormError');
        const datos = {
            tipo: this.tipo,
            cadena: document.getElementById('integInputCadena').value.trim(),
            url: document.getElementById('integInputUrl').value.trim(),
            titulo: document.getElementById('integInputTitulo').value.trim() || null,
            orden: parseInt(document.getElementById('integInputOrden').value, 10) || 0,
            estadoVinculo: document.getElementById('integInputVinculo').value,
            verificadoEn: document.getElementById('integInputVerificado').value || null,
            notaInterna: document.getElementById('integInputNota').value.trim() || null,
            activo: document.getElementById('integInputActivo').checked
        };

        if (!datos.cadena) { error.textContent = 'Falta la cadena.'; return; }
        if (!/^https?:\/\//i.test(datos.url)) { error.textContent = 'El enlace tiene que empezar con https://'; return; }
        error.textContent = '';

        const boton = document.getElementById('integBtnGuardar');
        boton.disabled = true;
        try {
            const editando = this.editandoId != null;
            const res = await fetch(editando
                ? `${CONFIG.API_URL}/admin/integraciones/enlaces/${this.editandoId}`
                : `${CONFIG.API_URL}/admin/integraciones/enlaces`, {
                method: editando ? 'PUT' : 'POST',
                headers: this.headers(true),
                body: JSON.stringify(datos)
            });
            if (!res.ok) {
                let mensaje = 'No se pudo guardar. Intentá de nuevo.';
                try { const cuerpo = await res.json(); if (cuerpo && cuerpo.message) mensaje = cuerpo.message; } catch (e) { /* sin cuerpo */ }
                error.textContent = mensaje;
                return;
            }
            this.cerrarFormulario();
            await this.cargarLista();
        } catch (e) {
            error.textContent = 'No se pudo guardar. Revisá la conexión.';
        } finally {
            boton.disabled = false;
        }
    },

    // ------------------------------------------
    // ESTILOS (propios del módulo, para no depender de admin.css)
    // ------------------------------------------
    inyectarEstilos() {
        if (document.getElementById('adminIntegracionesEstilos')) return;
        const estilo = document.createElement('style');
        estilo.id = 'adminIntegracionesEstilos';
        estilo.textContent = `
            .integ-tabs { display: flex; gap: 8px; margin: 0 0 12px; }
            .integ-tab { border: 1.5px solid #d6d9e3; background: #fff; color: #1a3a6b; border-radius: 999px; padding: 7px 16px; font-weight: 700; font-size: 0.85rem; cursor: pointer; font-family: inherit; }
            .integ-tab.activo { background: #1a3a6b; border-color: #1a3a6b; color: #fff; }
            .integ-resumen { font-size: 0.85rem; color: #555; margin: 0 0 10px; min-height: 1em; }
            .integ-vacio { background: #fff; border-radius: 12px; padding: 1.5rem; text-align: center; color: #6b7280; }
            .integ-tabla-wrap { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
            .integ-tabla { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
            .integ-tabla th { text-align: left; padding: 10px 12px; background: #f6f7fb; color: #555; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
            .integ-tabla td { padding: 10px 12px; border-top: 1px solid #eef0f5; vertical-align: top; }
            .integ-num { text-align: right; }
            .integ-fila-inactiva td { opacity: 0.55; }
            .integ-tenue { color: #8a8f9c; font-size: 0.8rem; }
            .integ-nota { color: #8a6d1f; font-size: 0.78rem; margin-top: 3px; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .integ-url { color: #1a3a6b; word-break: break-all; font-size: 0.82rem; }
            .integ-badge { display: inline-block; border-radius: 999px; padding: 3px 10px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
            .integ-acciones { white-space: nowrap; }
            .integ-acciones button { border: none; background: #f3f4f6; color: #374151; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; margin-left: 4px; }
            .integ-acciones button:hover { background: #e5e7eb; }
            .integ-switch { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
            .integ-switch input { opacity: 0; width: 0; height: 0; }
            .integ-switch span { position: absolute; inset: 0; background: #cfd3dc; border-radius: 22px; transition: background 0.2s; }
            .integ-switch span::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
            .integ-switch input:checked + span { background: #16a34a; }
            .integ-switch input:checked + span::before { transform: translateX(18px); }
            .integ-switch input:focus-visible + span { outline: 2px solid #1a3a6b; outline-offset: 2px; }
            .integ-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; align-items: center; justify-content: center; padding: 1rem; }
            .integ-modal-overlay.abierto { display: flex; }
            .integ-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto; }
            .integ-modal-header { background: #1a3a6b; color: #fff; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; }
            .integ-modal-header h3 { margin: 0; font-size: 1rem; }
            .integ-modal-cerrar { background: rgba(255,255,255,0.2); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; }
            .integ-modal-body { padding: 1.25rem; }
            .integ-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 1.25rem 1.25rem; }
            .integ-fila-form { display: flex; gap: 12px; flex-wrap: wrap; }
            .integ-ayuda { display: block; color: #8a8f9c; font-size: 0.75rem; margin-top: 4px; }
            .integ-check { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-top: 4px; cursor: pointer; }
            .integ-error { color: #b91c1c; font-size: 0.85rem; margin-top: 10px; min-height: 1em; }
        `;
        document.head.appendChild(estilo);
    }
};

window.adminIntegraciones = adminIntegraciones;
