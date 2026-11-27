// ==============================================
// ADMIN — PLATAFORMA DE JUEGOS
// ==============================================
// Campañas del Centro de actividad (v1: Trivia). Dos vistas dentro de la
// misma sección:
//   - Lista de campañas.
//   - Detalle de una campaña, con tres pestañas: Datos, Preguntas y Tandas.
// Todo el control de qué se puede tocar y cuándo lo hace el back; esta
// pantalla además deshabilita lo que no corresponde, para no ofrecerlo.
// Endpoints: /api/admin/juegos/... (ver AdminJuegosController.java).

// "var" + reuso: si otro script vuelve a cargar este archivo, no falla y
// conserva el módulo que ya estaba (con su estado).
var adminJuegos = window.adminJuegos || {
    campanias: [],
    detalle: null,          // { campania, tandas }
    preguntas: [],
    pestania: 'datos',
    editandoPreguntaId: null,
    candidatas: [],         // preguntas generadas desde TMDb, todavía sin guardar

    ESTADOS: {
        BORRADOR:   { texto: 'Borrador',   color: '#4b5563', fondo: '#f3f4f6' },
        PROGRAMADA: { texto: 'Programada', color: '#1e40af', fondo: '#dbeafe' },
        ACTIVA:     { texto: 'Activa',     color: '#065f46', fondo: '#d1fae5' },
        CERRADA:    { texto: 'Cerrada',    color: '#92400e', fondo: '#fef3c7' },
        PUBLICADA:  { texto: 'Publicada',  color: '#5b21b6', fondo: '#ede9fe' },
        ARCHIVADA:  { texto: 'Archivada',  color: '#374151', fondo: '#e5e7eb' }
    },

    init() {
        this.inyectarEstilos();
        this.asegurarModales();
        this.verLista();
    },

    // ------------------------------------------
    // UTILIDADES
    // ------------------------------------------
    url(ruta) { return `${CONFIG.API_URL}/admin/juegos${ruta}`; },

    async pedir(ruta, opciones = {}) {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        if (opciones.body !== undefined) headers['Content-Type'] = 'application/json';
        const res = await fetch(this.url(ruta), {
            method: opciones.method || 'GET',
            headers,
            body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined
        });
        if (res.status === 204) return null;
        let cuerpo = null;
        try { cuerpo = await res.json(); } catch (e) { /* sin cuerpo */ }
        if (!res.ok) throw new Error((cuerpo && cuerpo.message) || 'No se pudo completar la acción. Intentá de nuevo.');
        return cuerpo;
    },

    aviso(mensaje, tipo) {
        if (typeof toast === 'function') toast(mensaje, tipo || 'info');
        else alert(mensaje);
    },

    esc(texto) {
        return String(texto == null ? '' : texto).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    // "2026-12-01T00:00:00" → "01/12/2026 00:00"
    fechaHora(iso) {
        if (!iso) return '—';
        const [d, t] = String(iso).split('T');
        const [y, m, dd] = d.split('-');
        return `${dd}/${m}/${y} ${(t || '').slice(0, 5)}`;
    },

    // "2026-12-01" → "lun 1/12"
    dia(iso) {
        const f = new Date(iso + 'T12:00:00');
        const nombre = f.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
        return `${nombre} ${f.getDate()}/${f.getMonth() + 1}`;
    },

    badgeEstado(estado) {
        const e = this.ESTADOS[estado] || this.ESTADOS.BORRADOR;
        return `<span class="jg-badge" style="color:${e.color};background:${e.fondo};">${e.texto}</span>`;
    },

    contenedor() { return document.getElementById('adminJuegosContenido'); },

    // ------------------------------------------
    // VISTA: LISTA DE CAMPAÑAS
    // ------------------------------------------
    async verLista() {
        this.detalle = null;
        const cont = this.contenedor();
        if (!cont) return;
        document.getElementById('adminJuegosBtnNueva').style.display = '';
        cont.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
        try {
            this.campanias = await this.pedir('/campanias');
        } catch (e) {
            cont.innerHTML = `<div class="jg-vacio">${this.esc(e.message)}</div>`;
            return;
        }
        if (!this.campanias.length) {
            cont.innerHTML = '<div class="jg-vacio">Todavía no hay campañas. Creá la primera con "Nueva campaña".</div>';
            return;
        }
        cont.innerHTML = `
            <div class="jg-tabla-wrap">
                <table class="jg-tabla">
                    <thead><tr><th>Campaña</th><th>Estado</th><th>Inicio</th><th>Cierre</th><th>Preguntas por día</th><th></th></tr></thead>
                    <tbody>
                        ${this.campanias.map(c => `
                            <tr class="jg-fila-link" onclick="adminJuegos.verDetalle(${Number(c.id)})">
                                <td><strong>${this.esc(c.nombre)}</strong>${c.modoAcceso === 'SIN_REGISTRO' ? ' <span class="jg-tag-sin-registro">Sin registro</span>' : ''}<div class="jg-tenue">/actividad?c=${this.esc(c.slug)}</div></td>
                                <td>${this.badgeEstado(c.estado)}</td>
                                <td>${this.fechaHora(c.inicio)}</td>
                                <td>${this.fechaHora(c.cierre)}</td>
                                <td>${Number(c.preguntasPorDia)}</td>
                                <td class="jg-flecha"><i class="fas fa-chevron-right"></i></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    nuevaCampania() {
        // Una campaña nueva arranca con valores de ejemplo: mañana, por 7 días.
        const manana = new Date(Date.now() + 864e5);
        const iso = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
        const fin = new Date(manana.getTime() + 6 * 864e5);
        this.detalle = {
            campania: {
                id: null, estado: 'BORRADOR', nombre: '', slug: '', bajada: '',
                inicio: `${iso(manana)}T00:00`, cierre: `${iso(fin)}T23:59`,
                preguntasPorDia: 10, segundosPorPregunta: 15, premioTexto: '', premioDescripcion: '', premioImagenUrl: '',
                cantidadGanadores: 1, cantidadSuplentes: 2, diasParaReclamar: 7, basesCondiciones: '', fondoUrl: '', colorAcento: '#e50914',
                modoAcceso: 'CINEMARKETER', pedirNovedades: true
            },
            tandas: null
        };
        this.preguntas = [];
        this.pestania = 'datos';
        this.renderDetalle();
    },

    // ------------------------------------------
    // VISTA: DETALLE
    // ------------------------------------------
    async verDetalle(id, pestania) {
        const cont = this.contenedor();
        cont.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
        try {
            const [detalle, preguntas] = await Promise.all([
                this.pedir(`/campanias/${id}`),
                this.pedir(`/campanias/${id}/preguntas`)
            ]);
            this.detalle = detalle;
            this.preguntas = preguntas;
        } catch (e) {
            this.aviso(e.message, 'error');
            this.verLista();
            return;
        }
        if (pestania) this.pestania = pestania;
        this.renderDetalle();
    },

    async recargar() {
        if (this.detalle && this.detalle.campania.id) await this.verDetalle(this.detalle.campania.id);
    },

    // ¿Se pueden cambiar fechas, preguntas por día y tiempo? (el back lo vuelve a controlar)
    estructuraEditable(c) {
        if (!c.id) return true;
        const antesDelInicio = new Date(c.inicio) > new Date();
        return (c.estado === 'BORRADOR' || c.estado === 'PROGRAMADA') && antesDelInicio;
    },

    bancoEditable(c) {
        return c.id && !['CERRADA', 'PUBLICADA', 'ARCHIVADA'].includes(c.estado);
    },

    diasBloqueados() {
        const set = new Set();
        (this.detalle.tandas ? this.detalle.tandas.dias : []).forEach(d => { if (d.bloqueado) set.add(d.fecha); });
        return set;
    },

    cambiarPestania(p) {
        this.pestania = p;
        this.renderDetalle();
    },

    renderDetalle() {
        const c = this.detalle.campania;
        document.getElementById('adminJuegosBtnNueva').style.display = 'none';
        const nueva = !c.id;
        const pestanias = nueva ? ['datos']
            : c.estado === 'BORRADOR' ? ['datos', 'preguntas', 'tandas']
            : ['datos', 'preguntas', 'tandas', 'ranking'];
        if (!pestanias.includes(this.pestania)) this.pestania = 'datos';
        const nombres = { datos: 'Datos', preguntas: `Preguntas (${this.preguntas.length})`, tandas: 'Tandas diarias', ranking: 'Ranking y ganadores' };

        this.contenedor().innerHTML = `
            <div class="jg-detalle-cab">
                <button type="button" class="jg-volver" onclick="adminJuegos.verLista()"><i class="fas fa-chevron-left"></i> Campañas</button>
                <div class="jg-detalle-titulo">
                    <h2>${nueva ? 'Nueva campaña' : this.esc(c.nombre)}</h2>
                    ${this.badgeEstado(c.estado)}
                </div>
                <div class="jg-acciones-estado">${nueva ? '' : this.botonesEstado(c)}</div>
            </div>
            ${nueva ? '' : this.avisoEstado(c)}
            <div class="jg-tabs">
                ${pestanias.map(p => `<button type="button" class="jg-tab ${this.pestania === p ? 'activo' : ''}" onclick="adminJuegos.cambiarPestania('${p}')">${nombres[p]}</button>`).join('')}
            </div>
            <div id="jgPanel"></div>`;

        if (this.pestania === 'preguntas' && !nueva) this.renderPreguntas();
        else if (this.pestania === 'tandas' && !nueva) this.renderTandas();
        else if (this.pestania === 'ranking' && !nueva) this.renderRanking();
        else this.renderDatos();
    },

    botonesEstado(c) {
        const b = [];
        if (c.estado === 'BORRADOR') {
            b.push(`<button type="button" class="admin-btn-primary" onclick="adminJuegos.accion('publicar')"><i class="fas fa-rocket"></i> Publicar</button>`);
            b.push(`<button type="button" class="jg-btn-peligro" onclick="adminJuegos.eliminarCampania()"><i class="fas fa-trash"></i> Borrar</button>`);
        }
        if (c.estado === 'PROGRAMADA' && new Date(c.inicio) > new Date()) {
            b.push(`<button type="button" class="admin-btn-secondary" onclick="adminJuegos.accion('volver-a-borrador')"><i class="fas fa-undo"></i> Volver a borrador</button>`);
        }
        if (c.estado === 'PUBLICADA') {
            b.push(`<button type="button" class="admin-btn-secondary" onclick="adminJuegos.accion('archivar')"><i class="fas fa-box-archive"></i> Archivar</button>`);
        }
        if (c.estado === 'ARCHIVADA') {
            b.push(`<label class="jg-ocultar" title="La landing muestra solo «Parece que la campaña ya finalizó»">
                <input type="checkbox" ${c.landingOculta ? 'checked' : ''} onchange="adminJuegos.ocultarLanding(this)">
                <span>Ocultar landing</span></label>`);
        }
        if (c.estado !== 'BORRADOR') {
            b.push(`<a class="admin-btn-secondary jg-link" href="../actividad.html#c=${encodeURIComponent(c.slug)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Ver landing</a>`);
        }
        return b.join('');
    },

    avisoEstado(c) {
        const t = this.detalle.tandas;
        if (c.estado === 'BORRADOR' && t) {
            const faltan = t.diasCompletos < t.dias.length;
            return `<div class="jg-aviso ${faltan ? 'jg-aviso-alerta' : 'jg-aviso-ok'}">
                ${faltan
                    ? `<i class="fas fa-triangle-exclamation"></i> Tandas: ${t.diasCompletos} de ${t.dias.length} días completos. ${t.faltan > 0 ? `Faltan ${t.faltan} preguntas en el banco.` : 'Con las preguntas libres alcanza: usá "Asignar automáticamente" en Tandas.'}`
                    : '<i class="fas fa-check"></i> Las tandas están completas. Si el premio y las bases están cargados, ya podés publicar.'}
            </div>`;
        }
        if (c.estado === 'ACTIVA') {
            return '<div class="jg-aviso"><i class="fas fa-circle-play"></i> La campaña está en juego: solo se pueden cambiar los textos, el premio, las bases y la estética. Las preguntas de días futuros todavía se pueden editar.</div>';
        }
        if (c.estado === 'CERRADA') {
            return '<div class="jg-aviso jg-aviso-alerta"><i class="fas fa-hourglass-end"></i> La campaña cerró. Revisá el ranking y publicá los ganadores en la pestaña "Ranking y ganadores".</div>';
        }
        return '';
    },

    async accion(cual) {
        const c = this.detalle.campania;
        const textos = {
            'publicar': '¿Publicar la campaña? Desde ese momento queda visible en su landing con la cuenta regresiva.',
            'volver-a-borrador': '¿Volver a borrador? La landing deja de mostrarse hasta que la publiques de nuevo.',
            'archivar': '¿Archivar la campaña? Pasa al historial.'
        };
        if (!confirm(textos[cual])) return;
        try {
            await this.pedir(`/campanias/${c.id}/${cual}`, { method: 'POST' });
            this.aviso('Listo', 'success');
            this.recargar();
        } catch (e) {
            this.aviso(e.message, 'error');
        }
    },

    async ocultarLanding(check) {
        const c = this.detalle.campania;
        const oculta = check.checked;
        check.disabled = true;
        try {
            const r = await this.pedir(`/campanias/${c.id}/landing-oculta`, { method: 'PUT', body: { oculta } });
            c.landingOculta = r.landingOculta;
            this.aviso(oculta ? 'Landing oculta: ahora muestra «Parece que la campaña ya finalizó»' : 'La landing se vuelve a ver', 'success');
        } catch (e) {
            check.checked = !oculta;
            this.aviso(e.message, 'error');
        } finally {
            check.disabled = false;
        }
    },

    async eliminarCampania() {
        const c = this.detalle.campania;
        if (!confirm(`¿Borrar la campaña "${c.nombre}" con todas sus preguntas? No se puede deshacer.`)) return;
        try {
            await this.pedir(`/campanias/${c.id}`, { method: 'DELETE' });
            this.aviso('Campaña borrada', 'success');
            this.verLista();
        } catch (e) {
            this.aviso(e.message, 'error');
        }
    },

    // ------------------------------------------
    // PESTAÑA: DATOS
    // ------------------------------------------
    renderDatos() {
        const c = this.detalle.campania;
        const estructura = this.estructuraEditable(c);
        const archivada = c.estado === 'ARCHIVADA';
        const slugEditable = c.estado === 'BORRADOR';
        const sinRegistro = c.modoAcceso === 'SIN_REGISTRO';
        const dis = cond => cond ? '' : 'disabled';
        const v = x => this.esc(x == null ? '' : x);

        document.getElementById('jgPanel').innerHTML = `
            <div class="jg-form">
                <fieldset class="jg-grupo" ${archivada ? 'disabled' : ''}>
                    <legend>La campaña</legend>
                    <div class="form-group-admin"><label for="jgNombre">Nombre *</label>
                        <input id="jgNombre" class="admin-input" maxlength="120" value="${v(c.nombre)}" placeholder="Trivia Doomsday Avengers"></div>
                    <div class="form-group-admin"><label for="jgSlug">Dirección</label>
                        <div class="jg-prefijo"><span>/actividad?c=</span><input id="jgSlug" class="admin-input" maxlength="80" value="${v(c.slug)}" placeholder="se arma sola con el nombre" ${dis(slugEditable)}></div>
                        ${slugEditable ? '' : '<small class="jg-ayuda">Ya publicada: la dirección no se cambia porque el enlace puede estar compartido.</small>'}</div>
                    <div class="form-group-admin"><label for="jgBajada">Bajada</label>
                        <input id="jgBajada" class="admin-input" maxlength="300" value="${v(c.bajada)}" placeholder="¿Cuánto sabés del universo Marvel?"></div>
                </fieldset>

                <fieldset class="jg-grupo" ${archivada ? 'disabled' : ''}>
                    <legend>Acceso de los jugadores</legend>
                    <div class="jg-acceso">
                        <label class="jg-acceso-opcion"><input type="radio" name="jgModoAcceso" value="CINEMARKETER" ${sinRegistro ? '' : 'checked'} ${dis(slugEditable)} onchange="adminJuegos.cambiarModoAcceso()">
                            <span><strong>Con cuenta de Cinemarketer</strong><small>Para jugar hay que ingresar o registrarse. Suma usuarios a Cinemarketer.</small></span></label>
                        <label class="jg-acceso-opcion"><input type="radio" name="jgModoAcceso" value="SIN_REGISTRO" ${sinRegistro ? 'checked' : ''} ${dis(slugEditable)} onchange="adminJuegos.cambiarModoAcceso()">
                            <span><strong>Sin registro</strong><small>Solo nombre y email. El email no se verifica: si está mal escrito, es responsabilidad de quien juega.</small></span></label>
                    </div>
                    ${slugEditable ? '' : '<small class="jg-ayuda">Ya publicada: el modo de acceso no se cambia.</small>'}
                    <label class="jg-check" id="jgNovedadesFila" ${sinRegistro ? '' : 'hidden'}><input type="checkbox" id="jgNovedades" ${c.pedirNovedades === false ? '' : 'checked'}>
                        Mostrar el check opcional "Quiero recibir novedades de Cinemarketer"</label>
                </fieldset>

                <fieldset class="jg-grupo" ${archivada ? 'disabled' : ''}>
                    <legend>Juego</legend>
                    ${estructura ? '' : '<p class="jg-ayuda">La campaña ya empezó: fechas, preguntas por día y tiempo quedan fijos.</p>'}
                    <div class="jg-fila">
                        <div class="form-group-admin"><label for="jgInicio">Inicio *</label>
                            <input id="jgInicio" type="datetime-local" class="admin-input" value="${v(String(c.inicio || '').slice(0, 16))}" ${dis(estructura)}></div>
                        <div class="form-group-admin"><label for="jgCierre">Cierre *</label>
                            <input id="jgCierre" type="datetime-local" class="admin-input" value="${v(String(c.cierre || '').slice(0, 16))}" ${dis(estructura)}></div>
                    </div>
                    <div class="jg-fila">
                        <div class="form-group-admin"><label for="jgPpd">Preguntas por día *</label>
                            <input id="jgPpd" type="number" min="1" max="30" class="admin-input" value="${v(c.preguntasPorDia)}" ${dis(estructura)}></div>
                        <div class="form-group-admin"><label for="jgSeg">Segundos por pregunta *</label>
                            <input id="jgSeg" type="number" min="5" max="120" class="admin-input" value="${v(c.segundosPorPregunta)}" ${dis(estructura)}></div>
                    </div>
                    <small class="jg-ayuda">Hora de Argentina. Cada día de la campaña se juega una tanda nueva; un intento por persona por día.</small>
                </fieldset>

                <fieldset class="jg-grupo" ${archivada ? 'disabled' : ''}>
                    <legend>Premio y ganadores</legend>
                    <div class="form-group-admin"><label for="jgPremio">Premio *</label>
                        <input id="jgPremio" class="admin-input" maxlength="300" value="${v(c.premioTexto)}" placeholder="2 entradas para el estreno"></div>
                    <div class="form-group-admin"><label for="jgPremioDesc">Descripción del premio</label>
                        <textarea id="jgPremioDesc" class="admin-textarea" rows="4" maxlength="3000" placeholder="Qué incluye, para qué cine o función, vencimiento, cómo se entrega...">${v(c.premioDescripcion)}</textarea>
                        <small class="jg-ayuda">En la landing se ve recortada en la tarjeta del premio y completa al tocarla. Si la dejás vacía, se muestra la regla del ganador y los suplentes.</small></div>
                    ${this.cajaImagen('premio')}
                    <div class="jg-fila">
                        <div class="form-group-admin"><label for="jgGanadores">Ganadores</label>
                            <input id="jgGanadores" type="number" min="1" max="20" class="admin-input" value="${v(c.cantidadGanadores || 1)}" ${dis(!['CERRADA', 'PUBLICADA', 'ARCHIVADA'].includes(c.estado))}></div>
                        <div class="form-group-admin"><label for="jgSuplentes">Suplentes</label>
                            <input id="jgSuplentes" type="number" min="0" max="5" class="admin-input" value="${v(c.cantidadSuplentes)}"></div>
                        <div class="form-group-admin"><label for="jgReclamar">Días para reclamar</label>
                            <input id="jgReclamar" type="number" min="1" max="60" class="admin-input" value="${v(c.diasParaReclamar)}"></div>
                    </div>
                    <div class="form-group-admin"><label for="jgBases">Bases y condiciones *</label>
                        <textarea id="jgBases" class="admin-textarea" rows="7" placeholder="Organizador, vigencia, mecánica, premio, cómo se elige al ganador, plazo para reclamar...">${v(c.basesCondiciones)}</textarea></div>
                </fieldset>

                <fieldset class="jg-grupo" ${archivada ? 'disabled' : ''}>
                    <legend>Estética de la landing</legend>
                    ${c.id ? '' : '<p class="jg-ayuda">Guardá la campaña para poder subir las imágenes.</p>'}
                    <div class="jg-imagenes">
                        ${this.cajaImagen('banner-desktop')}
                        ${this.cajaImagen('banner-mobile')}
                        ${this.cajaImagen('fondo-lateral')}
                    </div>
                    <div class="form-group-admin"><label for="jgColor">Color de acento</label>
                        <div class="jg-color"><input id="jgColor" type="color" value="${v(c.colorAcento || '#e50914')}"><span id="jgColorTxt">${v(c.colorAcento || '#e50914')}</span></div></div>
                </fieldset>

                ${archivada ? '' : `<div class="jg-pie-form"><button type="button" class="admin-btn-primary" id="jgBtnGuardar" onclick="adminJuegos.guardarCampania()"><i class="fas fa-save"></i> ${c.id ? 'Guardar cambios' : 'Crear campaña'}</button></div>`}
            </div>`;

        const color = document.getElementById('jgColor');
        color.addEventListener('input', () => { document.getElementById('jgColorTxt').textContent = color.value; });
    },

    // ------------------------------------------
    // IMÁGENES (se suben a Cloudinary y quedan guardadas al instante)
    // ------------------------------------------
    IMAGENES: {
        'banner-desktop': { campo: 'fondoUrl', titulo: 'Banner de escritorio', medida: '1920 × 480 px (4:1)', ayuda: 'Arriba de todo en pantallas anchas.', clase: 'jg-img-ancha' },
        'banner-mobile':  { campo: 'bannerMobileUrl', titulo: 'Banner de celular', medida: '1080 × 1080 px (cuadrada)', ayuda: 'Si no lo cargás, se usa el de escritorio recortado.', clase: 'jg-img-cuadrada' },
        'fondo-lateral':  { campo: 'fondoLateralUrl', titulo: 'Fondo de los costados (opcional)', medida: '1920 × 1080 px o más', ayuda: 'Solo escritorio, borroso a los costados. Sin imagen se ve el collage de pósters.', clase: 'jg-img-169' },
        'premio':         { campo: 'premioImagenUrl', titulo: 'Imagen del premio', medida: 'Cuadrada, 800 × 800 px', ayuda: '', clase: 'jg-img-cuadrada' }
    },

    cajaImagen(tipo) {
        const c = this.detalle.campania;
        const def = this.IMAGENES[tipo];
        const url = c[def.campo];
        const habilitada = c.id && c.estado !== 'ARCHIVADA';
        return `
            <div class="jg-img-caja" id="jgImg-${tipo}">
                <div class="jg-img-titulo">${def.titulo}</div>
                <div class="jg-img-preview ${def.clase}">
                    ${url ? `<img src="${this.esc(url)}" alt="">` : '<span><i class="fas fa-image"></i> Sin imagen</span>'}
                </div>
                <small class="jg-ayuda">${def.medida}. JPG, PNG o WEBP, hasta 5 MB.${def.ayuda ? ' ' + def.ayuda : ''}</small>
                ${habilitada ? `
                    <div class="jg-img-botones">
                        <label class="admin-btn-secondary jg-btn-chico jg-subir">
                            <i class="fas fa-upload"></i> ${url ? 'Cambiar' : 'Subir'}
                            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="adminJuegos.subirImagen('${tipo}', this)">
                        </label>
                        ${url ? `<button type="button" class="jg-btn-peligro jg-btn-chico" onclick="adminJuegos.quitarImagen('${tipo}')">Quitar</button>` : ''}
                    </div>` : ''}
            </div>`;
    },

    refrescarCaja(tipo) {
        const caja = document.getElementById(`jgImg-${tipo}`);
        if (caja) caja.outerHTML = this.cajaImagen(tipo);
    },

    async subirImagen(tipo, input) {
        const archivo = input.files && input.files[0];
        if (!archivo) return;
        if (archivo.size > 5 * 1024 * 1024) { this.aviso('La imagen pesa más de 5 MB', 'error'); input.value = ''; return; }
        const caja = document.getElementById(`jgImg-${tipo}`);
        if (caja) caja.querySelector('.jg-img-preview').innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Subiendo...</span>';
        const datos = new FormData();
        datos.append('image', archivo);
        try {
            const res = await fetch(this.url(`/campanias/${this.detalle.campania.id}/imagenes/${tipo}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: datos
            });
            let cuerpo = null;
            try { cuerpo = await res.json(); } catch (e) { /* sin cuerpo */ }
            if (!res.ok) throw new Error((cuerpo && (cuerpo.message || cuerpo.error)) || 'No se pudo subir la imagen');
            this.detalle.campania[this.IMAGENES[tipo].campo] = cuerpo[this.IMAGENES[tipo].campo];
            this.aviso('Imagen guardada', 'success');
        } catch (e) {
            this.aviso(e.message, 'error');
        }
        this.refrescarCaja(tipo);
    },

    async quitarImagen(tipo) {
        if (!confirm('¿Quitar esta imagen?')) return;
        try {
            await this.pedir(`/campanias/${this.detalle.campania.id}/imagenes/${tipo}`, { method: 'DELETE' });
            this.detalle.campania[this.IMAGENES[tipo].campo] = null;
            this.aviso('Imagen quitada', 'success');
        } catch (e) {
            this.aviso(e.message, 'error');
        }
        this.refrescarCaja(tipo);
    },

    cambiarModoAcceso() {
        const elegido = document.querySelector('input[name="jgModoAcceso"]:checked');
        document.getElementById('jgNovedadesFila').hidden = !elegido || elegido.value !== 'SIN_REGISTRO';
    },

    async guardarCampania() {
        const c = this.detalle.campania;
        const val = id => document.getElementById(id).value.trim();
        const num = id => { const n = parseInt(document.getElementById(id).value, 10); return isNaN(n) ? null : n; };
        const datos = {
            nombre: val('jgNombre'),
            slug: val('jgSlug') || null,
            bajada: val('jgBajada') || null,
            inicio: val('jgInicio') || null,
            cierre: val('jgCierre') || null,
            preguntasPorDia: num('jgPpd'),
            segundosPorPregunta: num('jgSeg'),
            premioTexto: val('jgPremio') || null,
            premioDescripcion: val('jgPremioDesc') || null,
            premioImagenUrl: c.premioImagenUrl || null,   // las imágenes se guardan al subirlas
            rewardId: c.rewardId || null,
            cantidadGanadores: num('jgGanadores'),
            cantidadSuplentes: num('jgSuplentes'),
            diasParaReclamar: num('jgReclamar'),
            basesCondiciones: val('jgBases') || null,
            fondoUrl: c.fondoUrl || null,
            colorAcento: document.getElementById('jgColor').value,
            modoAcceso: (document.querySelector('input[name="jgModoAcceso"]:checked') || {}).value || c.modoAcceso || 'CINEMARKETER',
            pedirNovedades: document.getElementById('jgNovedades').checked
        };
        if (!datos.nombre) { this.aviso('Falta el nombre de la campaña', 'error'); return; }

        const boton = document.getElementById('jgBtnGuardar');
        boton.disabled = true;
        try {
            const guardada = c.id
                ? await this.pedir(`/campanias/${c.id}`, { method: 'PUT', body: datos })
                : await this.pedir('/campanias', { method: 'POST', body: datos });
            this.aviso(c.id ? 'Cambios guardados' : 'Campaña creada. Ahora cargá las preguntas.', 'success');
            await this.verDetalle(guardada.id, c.id ? 'datos' : 'preguntas');
        } catch (e) {
            this.aviso(e.message, 'error');
            boton.disabled = false;
        }
    },

    // ------------------------------------------
    // PESTAÑA: PREGUNTAS
    // ------------------------------------------
    renderPreguntas() {
        const c = this.detalle.campania;
        const editable = this.bancoEditable(c);
        const bloqueados = this.diasBloqueados();
        const panel = document.getElementById('jgPanel');

        const barra = editable ? `
            <div class="jg-barra">
                <button type="button" class="admin-btn-primary" onclick="adminJuegos.abrirPregunta(null)"><i class="fas fa-plus"></i> Nueva pregunta</button>
                <button type="button" class="admin-btn-secondary" onclick="adminJuegos.abrirTmdb()"><i class="fas fa-wand-magic-sparkles"></i> Generar desde TMDb</button>
            </div>` : '';

        if (!this.preguntas.length) {
            panel.innerHTML = barra + '<div class="jg-vacio">El banco está vacío. Cargá preguntas a mano o generalas desde TMDb.</div>';
            return;
        }
        panel.innerHTML = barra + `<div class="jg-preguntas">${this.preguntas.map(p => {
            const jugada = p.diaAsignado && bloqueados.has(p.diaAsignado);
            const acciones = editable && !jugada ? `
                <button type="button" title="Editar" onclick="adminJuegos.abrirPregunta(${Number(p.id)})"><i class="fas fa-pen"></i></button>
                <button type="button" title="Borrar" onclick="adminJuegos.borrarPregunta(${Number(p.id)})"><i class="fas fa-trash"></i></button>` : '';
            return `
                <div class="jg-pregunta ${jugada ? 'jg-jugada' : ''}">
                    ${p.imagenUrl ? `<img src="${this.esc(p.imagenUrl)}" alt="" loading="lazy">` : ''}
                    <div class="jg-pregunta-cuerpo">
                        <div class="jg-pregunta-texto">${this.esc(p.texto)}</div>
                        <div class="jg-opciones">${this.opcionesDe(p).map((o, i) =>
                            `<span class="${i + 1 === p.indiceCorrecta ? 'jg-correcta' : ''}">${i + 1 === p.indiceCorrecta ? '<i class="fas fa-check"></i> ' : ''}${this.esc(o)}</span>`).join('')}</div>
                        <div class="jg-meta">${p.origen === 'TMDB' ? 'TMDb' : 'Manual'} · ${p.diaAsignado ? `Día ${this.dia(p.diaAsignado)}${jugada ? ' (ya jugada)' : ''}` : 'Sin día'}</div>
                    </div>
                    <div class="jg-acciones">${acciones}</div>
                </div>`;
        }).join('')}</div>`;
    },

    opcionesDe(p) {
        return [p.opcion1, p.opcion2, p.opcion3, p.opcion4].filter(o => o != null && o !== '');
    },

    abrirPregunta(id) {
        const p = id != null ? this.preguntas.find(x => x.id === id) : null;
        this.editandoPreguntaId = p ? p.id : null;
        document.getElementById('jgPregTitulo').textContent = p ? 'Editar pregunta' : 'Nueva pregunta';
        document.getElementById('jgPregTexto').value = p ? p.texto : '';
        document.getElementById('jgPregImagen').value = p && p.imagenUrl ? p.imagenUrl : '';
        this.subiendoImagenPregunta = false;
        this.pintarImagenPregunta();
        const ops = p ? this.opcionesDe(p) : [];
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`jgPregOp${i}`).value = ops[i - 1] || '';
            document.getElementById(`jgPregOk${i}`).checked = p ? p.indiceCorrecta === i : i === 1;
        }
        document.getElementById('jgPregError').textContent = '';
        document.getElementById('jgModalPregunta').classList.add('abierto');
        document.getElementById('jgPregTexto').focus();
    },

    // Imagen de la pregunta: se sube a Cloudinary apenas se elige y la URL
    // queda en el campo oculto jgPregImagen hasta que se guarda la pregunta.
    pintarImagenPregunta() {
        const caja = document.getElementById('jgPregImgCaja');
        if (!caja) return;
        const url = document.getElementById('jgPregImagen').value;
        if (this.subiendoImagenPregunta) {
            caja.innerHTML = `<div class="jg-preg-img-preview"><span><i class="fas fa-spinner fa-spin"></i> Subiendo...</span></div>`;
            return;
        }
        caja.innerHTML = `
            <div class="jg-preg-img-preview">
                ${url ? `<img src="${this.esc(url)}" alt="">` : '<span><i class="fas fa-image"></i> Sin imagen</span>'}
            </div>
            <div class="jg-preg-img-lado">
                <div class="jg-img-botones">
                    <label class="admin-btn-secondary jg-btn-chico jg-subir">
                        <i class="fas fa-upload"></i> ${url ? 'Cambiar' : 'Subir imagen'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="adminJuegos.subirImagenPregunta(this)">
                    </label>
                    ${url ? `<button type="button" class="jg-btn-peligro jg-btn-chico" onclick="adminJuegos.quitarImagenPregunta()">Quitar</button>` : ''}
                </div>
                <small class="jg-ayuda">JPG, PNG o WEBP, hasta 5 MB. Se ve arriba de la pregunta.</small>
            </div>`;
    },

    async subirImagenPregunta(input) {
        const archivo = input.files && input.files[0];
        if (!archivo) return;
        const error = document.getElementById('jgPregError');
        error.textContent = '';
        if (archivo.size > 5 * 1024 * 1024) { error.textContent = 'La imagen pesa más de 5 MB.'; input.value = ''; return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) { error.textContent = 'La imagen tiene que ser JPG, PNG o WEBP.'; input.value = ''; return; }
        this.subiendoImagenPregunta = true;
        this.pintarImagenPregunta();
        const datos = new FormData();
        datos.append('image', archivo);
        try {
            const res = await fetch(this.url(`/campanias/${this.detalle.campania.id}/imagenes/pregunta`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: datos
            });
            let cuerpo = null;
            try { cuerpo = await res.json(); } catch (e) { /* sin cuerpo */ }
            if (!res.ok || !cuerpo || !cuerpo.url) throw new Error((cuerpo && (cuerpo.message || cuerpo.error)) || 'No se pudo subir la imagen');
            document.getElementById('jgPregImagen').value = cuerpo.url;
        } catch (e) {
            error.textContent = e.message;
        }
        this.subiendoImagenPregunta = false;
        this.pintarImagenPregunta();
    },

    quitarImagenPregunta() {
        document.getElementById('jgPregImagen').value = '';
        this.pintarImagenPregunta();
    },

    async guardarPregunta() {
        const error = document.getElementById('jgPregError');
        if (this.subiendoImagenPregunta) { error.textContent = 'Esperá a que termine de subir la imagen.'; return; }
        // Opciones cargadas, en orden, y cuál quedó marcada (renumerada si hay huecos).
        const opciones = [];
        let correcta = null;
        for (let i = 1; i <= 4; i++) {
            const t = document.getElementById(`jgPregOp${i}`).value.trim();
            if (!t) continue;
            opciones.push(t);
            if (document.getElementById(`jgPregOk${i}`).checked) correcta = opciones.length;
        }
        const datos = {
            texto: document.getElementById('jgPregTexto').value.trim(),
            imagenUrl: document.getElementById('jgPregImagen').value.trim() || null,
            opciones,
            indiceCorrecta: correcta,
            origen: 'MANUAL',
            referenciaTmdb: null
        };
        if (!datos.texto) { error.textContent = 'Falta la pregunta.'; return; }
        if (opciones.length < 2) { error.textContent = 'Cargá al menos 2 opciones.'; return; }
        if (!correcta) { error.textContent = 'Marcá cuál es la opción correcta (tiene que tener texto).'; return; }

        // Al editar, se conserva el origen y la referencia de TMDb.
        if (this.editandoPreguntaId != null) {
            const actual = this.preguntas.find(x => x.id === this.editandoPreguntaId);
            if (actual) { datos.origen = actual.origen; datos.referenciaTmdb = actual.referenciaTmdb; }
        }
        try {
            if (this.editandoPreguntaId != null) {
                await this.pedir(`/preguntas/${this.editandoPreguntaId}`, { method: 'PUT', body: datos });
            } else {
                await this.pedir(`/campanias/${this.detalle.campania.id}/preguntas`, { method: 'POST', body: datos });
            }
            this.cerrarModal('jgModalPregunta');
            this.aviso('Pregunta guardada', 'success');
            this.verDetalle(this.detalle.campania.id, 'preguntas');
        } catch (e) {
            error.textContent = e.message;
        }
    },

    async borrarPregunta(id) {
        if (!confirm('¿Borrar esta pregunta?')) return;
        try {
            await this.pedir(`/preguntas/${id}`, { method: 'DELETE' });
            this.verDetalle(this.detalle.campania.id, 'preguntas');
        } catch (e) {
            this.aviso(e.message, 'error');
        }
    },

    // ------------------------------------------
    // GENERAR DESDE TMDB
    // ------------------------------------------
    // Buscador: se elige el tipo, se escribe y se suman temas a la lista.
    // Con los temas elegidos se generan las preguntas, todas juntas.
    TIPOS_TMDB: {
        PELICULA: { nombre: 'Películas', placeholder: 'Buscá una película, por ejemplo "Avengers"', icono: 'fa-film' },
        SERIE:    { nombre: 'Series',    placeholder: 'Buscá una serie, por ejemplo "Stranger Things"', icono: 'fa-tv' },
        SAGA:     { nombre: 'Sagas',     placeholder: 'Buscá una saga, por ejemplo "Harry Potter"', icono: 'fa-layer-group' },
        PERSONA:  { nombre: 'Personas',  placeholder: 'Buscá un actor, actriz o director', icono: 'fa-user' }
    },
    tmdbTipo: 'PELICULA',
    temas: [],              // [{ tipo, id, titulo, anio, imagen }]
    resultadosTmdb: [],
    _busquedaTimer: null,
    _busquedaN: 0,

    abrirTmdb() {
        this.candidatas = [];
        this.temas = [];
        this.resultadosTmdb = [];
        document.getElementById('jgTmdbBuscar').value = '';
        document.getElementById('jgTmdbCantidad').value = '20';
        document.getElementById('jgTmdbResultado').innerHTML = '';
        document.getElementById('jgTmdbSugerencias').innerHTML = '';
        document.getElementById('jgTmdbError').textContent = '';
        document.getElementById('jgTmdbAgregar').style.display = 'none';
        this.cambiarTipoTmdb('PELICULA');
        this.renderTemas();
        document.getElementById('jgModalTmdb').classList.add('abierto');
    },

    cambiarTipoTmdb(tipo) {
        this.tmdbTipo = tipo;
        document.querySelectorAll('#jgModalTmdb .jg-tipo-tmdb').forEach(b => b.classList.toggle('activo', b.dataset.tipo === tipo));
        const input = document.getElementById('jgTmdbBuscar');
        input.placeholder = this.TIPOS_TMDB[tipo].placeholder;
        this.buscarTmdb(input.value);
        input.focus();
    },

    // Espera a que se deje de escribir (350 ms) y descarta respuestas viejas.
    buscarTmdb(texto) {
        clearTimeout(this._busquedaTimer);
        const q = (texto || '').trim();
        const lista = document.getElementById('jgTmdbSugerencias');
        if (q.length < 2) { lista.innerHTML = ''; this.resultadosTmdb = []; return; }
        this._busquedaTimer = setTimeout(async () => {
            const n = ++this._busquedaN;
            lista.innerHTML = '<div class="jg-sug-vacio"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
            try {
                const res = await this.pedir(`/tmdb/buscar?tipo=${encodeURIComponent(this.tmdbTipo)}&q=${encodeURIComponent(q)}`);
                if (n !== this._busquedaN) return;
                this.resultadosTmdb = res;
                this.renderSugerencias();
            } catch (e) {
                if (n !== this._busquedaN) return;
                lista.innerHTML = `<div class="jg-sug-vacio">${this.esc(e.message)}</div>`;
            }
        }, 350);
    },

    renderSugerencias() {
        const lista = document.getElementById('jgTmdbSugerencias');
        if (!this.resultadosTmdb.length) {
            lista.innerHTML = '<div class="jg-sug-vacio">Sin resultados. Probá con otro nombre o en español.</div>';
            return;
        }
        const icono = this.TIPOS_TMDB[this.tmdbTipo].icono;
        lista.innerHTML = this.resultadosTmdb.map((r, i) => {
            const elegido = this.temas.some(t => t.tipo === r.tipo && t.id === r.id);
            return `
                <button type="button" class="jg-sug ${elegido ? 'jg-sug-elegido' : ''}" onclick="adminJuegos.agregarTema(${i})" ${elegido ? 'disabled' : ''}>
                    ${r.imagen ? `<img src="${this.esc(r.imagen)}" alt="" loading="lazy">` : `<span class="jg-sug-sinimg"><i class="fas ${icono}"></i></span>`}
                    <span class="jg-sug-texto"><strong>${this.esc(r.titulo)}</strong>
                        <small>${[r.anio, r.detalle].filter(Boolean).map(x => this.esc(x)).join(' · ')}</small></span>
                    <span class="jg-sug-accion">${elegido ? '<i class="fas fa-check"></i> Elegido' : '<i class="fas fa-plus"></i> Agregar'}</span>
                </button>`;
        }).join('');
    },

    agregarTema(i) {
        const r = this.resultadosTmdb[i];
        if (!r || this.temas.some(t => t.tipo === r.tipo && t.id === r.id)) return;
        if (this.temas.length >= 10) { document.getElementById('jgTmdbError').textContent = 'Se pueden elegir hasta 10 temas por vez.'; return; }
        this.temas.push({ tipo: r.tipo, id: r.id, titulo: r.titulo, anio: r.anio, imagen: r.imagen });
        this.renderTemas();
        this.renderSugerencias();
    },

    quitarTema(i) {
        this.temas.splice(i, 1);
        this.renderTemas();
        if (this.resultadosTmdb.length) this.renderSugerencias();
    },

    renderTemas() {
        const cont = document.getElementById('jgTmdbTemas');
        const etiqueta = { PELICULA: 'Película', SERIE: 'Serie', SAGA: 'Saga', PERSONA: 'Persona' };
        cont.innerHTML = this.temas.length
            ? this.temas.map((t, i) => `
                <span class="jg-tema">
                    <small>${etiqueta[t.tipo]}</small> ${this.esc(t.titulo)}${t.anio ? ` (${this.esc(t.anio)})` : ''}
                    <button type="button" aria-label="Quitar" onclick="adminJuegos.quitarTema(${i})"><i class="fas fa-times"></i></button>
                </span>`).join('')
            : '<span class="jg-tenue">Todavía no elegiste ningún tema. Buscá y tocá "Agregar".</span>';
        document.getElementById('jgTmdbGenerar').disabled = !this.temas.length;
    },

    async generarTmdb() {
        const error = document.getElementById('jgTmdbError');
        const resultado = document.getElementById('jgTmdbResultado');
        const cantidad = parseInt(document.getElementById('jgTmdbCantidad').value, 10) || 20;
        if (!this.temas.length) { error.textContent = 'Elegí al menos un tema.'; return; }
        error.textContent = '';
        resultado.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Armando preguntas...</div>';
        document.getElementById('jgTmdbAgregar').style.display = 'none';
        try {
            const r = await this.pedir(`/campanias/${this.detalle.campania.id}/preguntas/tmdb`, {
                method: 'POST', body: { temas: this.temas.map(t => ({ tipo: t.tipo, id: t.id })), cantidad }
            });
            this.candidatas = r.preguntas;
            resultado.innerHTML = `
                <div class="jg-tmdb-cab">
                    <strong>${r.preguntas.length} preguntas</strong>${r.descartadasPorRepetidas ? ` (${r.descartadasPorRepetidas} ya estaban en el banco)` : ''}
                    <label class="jg-todas"><input type="checkbox" checked onchange="adminJuegos.marcarTodas(this.checked)"> Todas</label>
                </div>
                ${r.preguntas.map((p, i) => `
                    <label class="jg-candidata">
                        <input type="checkbox" class="jg-cand-check" data-i="${i}" checked>
                        ${p.imagenUrl ? `<img src="${this.esc(p.imagenUrl)}" alt="" loading="lazy">` : ''}
                        <span class="jg-candidata-cuerpo">
                            <span class="jg-pregunta-texto">${this.esc(p.texto)}</span>
                            <span class="jg-opciones">${p.opciones.map((o, j) =>
                                `<span class="${j + 1 === p.indiceCorrecta ? 'jg-correcta' : ''}">${j + 1 === p.indiceCorrecta ? '<i class="fas fa-check"></i> ' : ''}${this.esc(o)}</span>`).join('')}</span>
                        </span>
                    </label>`).join('')}`;
            document.getElementById('jgTmdbAgregar').style.display = '';
        } catch (e) {
            resultado.innerHTML = '';
            error.textContent = e.message;
        }
    },

    marcarTodas(marcar) {
        document.querySelectorAll('.jg-cand-check').forEach(c => { c.checked = marcar; });
    },

    async agregarCandidatas() {
        const elegidas = [...document.querySelectorAll('.jg-cand-check')]
            .filter(c => c.checked)
            .map(c => this.candidatas[Number(c.dataset.i)]);
        if (!elegidas.length) { document.getElementById('jgTmdbError').textContent = 'No elegiste ninguna pregunta.'; return; }
        const boton = document.getElementById('jgTmdbAgregar');
        boton.disabled = true;
        try {
            const r = await this.pedir(`/campanias/${this.detalle.campania.id}/preguntas/lote`, { method: 'POST', body: elegidas });
            this.cerrarModal('jgModalTmdb');
            this.aviso(`${r.guardadas} ${r.guardadas === 1 ? 'pregunta agregada' : 'preguntas agregadas'}${r.errores.length ? `; ${r.errores.length} no entraron` : ''}`, r.errores.length ? 'info' : 'success');
            this.verDetalle(this.detalle.campania.id, 'preguntas');
        } catch (e) {
            document.getElementById('jgTmdbError').textContent = e.message;
        } finally {
            boton.disabled = false;
        }
    },

    // ------------------------------------------
    // PESTAÑA: TANDAS
    // ------------------------------------------
    renderTandas() {
        const c = this.detalle.campania;
        const t = this.detalle.tandas;
        const editable = this.bancoEditable(c);
        const porDia = {};
        const libres = [];
        this.preguntas.forEach(p => {
            if (p.diaAsignado) (porDia[p.diaAsignado] = porDia[p.diaAsignado] || []).push(p);
            else libres.push(p);
        });
        Object.values(porDia).forEach(l => l.sort((a, b) => a.ordenEnDia - b.ordenEnDia));
        const diasDisponibles = t.dias.filter(d => !d.bloqueado && d.asignadas < d.requeridas);

        // Selector para mover una pregunta: días con lugar + liberar.
        const selector = (p) => {
            if (!editable) return '';
            const opciones = diasDisponibles.filter(d => d.fecha !== p.diaAsignado)
                .map(d => `<option value="${d.fecha}">Pasar al ${this.dia(d.fecha)}</option>`).join('');
            const liberar = p.diaAsignado ? '<option value="libre">Quitar del día</option>' : '';
            if (!opciones && !liberar) return '';
            return `<select class="jg-mover" onchange="adminJuegos.moverPregunta(${Number(p.id)}, this.value)">
                <option value="">Mover…</option>${liberar}${opciones}</select>`;
        };
        const fila = (p, bloqueado) => `
            <li><span class="jg-tanda-texto">${this.esc(p.texto)}</span>${bloqueado ? '' : selector(p)}</li>`;

        const alcanza = t.faltan > 0
            ? `Te alcanzan para ${t.diasAlcanzables} de los ${t.dias.length} días. Faltan ${t.faltan} preguntas.`
            : `El banco alcanza para los ${t.dias.length} días.`;

        document.getElementById('jgPanel').innerHTML = `
            <div class="jg-resumen-tandas">
                <div><strong>${t.diasCompletos} de ${t.dias.length}</strong> días completos</div>
                <div><strong>${t.libres}</strong> preguntas sin día</div>
                <div class="${t.faltan > 0 ? 'jg-texto-alerta' : 'jg-texto-ok'}">${alcanza}</div>
                ${editable && t.libres > 0 ? `<button type="button" class="admin-btn-primary" onclick="adminJuegos.asignarAutomatico()"><i class="fas fa-shuffle"></i> Asignar automáticamente</button>` : ''}
            </div>
            <div class="jg-dias">
                ${t.dias.map(d => {
                    const lista = porDia[d.fecha] || [];
                    const completo = d.asignadas >= d.requeridas;
                    return `
                        <div class="jg-dia ${d.bloqueado ? 'jg-dia-bloqueado' : ''}">
                            <div class="jg-dia-cab">
                                <strong>${this.dia(d.fecha)}</strong>
                                <span class="${completo ? 'jg-texto-ok' : 'jg-texto-alerta'}">${d.asignadas}/${d.requeridas}</span>
                                ${d.bloqueado ? '<span class="jg-badge" style="color:#374151;background:#e5e7eb;">Ya empezó</span>' : ''}
                            </div>
                            ${lista.length ? `<ol>${lista.map(p => fila(p, d.bloqueado)).join('')}</ol>` : '<div class="jg-tenue">Sin preguntas</div>'}
                        </div>`;
                }).join('')}
            </div>
            ${libres.length ? `
                <div class="jg-libres">
                    <h4>Sin día asignado (${libres.length})</h4>
                    <ul>${libres.map(p => fila(p, false)).join('')}</ul>
                </div>` : ''}`;
    },

    async asignarAutomatico() {
        try {
            await this.pedir(`/campanias/${this.detalle.campania.id}/tandas/automatico`, { method: 'POST' });
            this.aviso('Tandas armadas', 'success');
            this.verDetalle(this.detalle.campania.id, 'tandas');
        } catch (e) {
            this.aviso(e.message, 'error');
        }
    },

    async moverPregunta(id, destino) {
        if (!destino) return;
        try {
            await this.pedir(`/preguntas/${id}/dia`, { method: 'PUT', body: { dia: destino === 'libre' ? null : destino } });
            this.verDetalle(this.detalle.campania.id, 'tandas');
        } catch (e) {
            this.aviso(e.message, 'error');
            this.renderTandas();
        }
    },

    // ------------------------------------------
    // PESTAÑA: RANKING Y GANADORES
    // ------------------------------------------
    ESTADOS_GANADOR: {
        PROPUESTO:  { texto: 'Propuesto',   color: '#1e40af', fondo: '#dbeafe' },
        EN_ESPERA:  { texto: 'En espera',   color: '#4b5563', fondo: '#f3f4f6' },
        NOTIFICADO: { texto: 'Notificado',  color: '#92400e', fondo: '#fef3c7' },
        RECLAMADO:  { texto: 'Reclamado',   color: '#5b21b6', fondo: '#ede9fe' },
        ENTREGADO:  { texto: 'Entregado',   color: '#065f46', fondo: '#d1fae5' },
        VENCIDO:    { texto: 'Venció',      color: '#991b1b', fondo: '#fee2e2' },
        DESCARTADO: { texto: 'Descartado',  color: '#991b1b', fondo: '#fee2e2' }
    },

    tiempo(ms) {
        const s = Math.max(0, ms) / 1000;
        if (s < 60) return s.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' s';
        const min = Math.floor(s / 60);
        return `${min} min ${String(Math.round(s - min * 60)).padStart(2, '0')} s`;
    },

    async renderRanking() {
        const panel = document.getElementById('jgPanel');
        panel.innerHTML = '<div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
        let datos;
        try {
            datos = await this.pedir(`/campanias/${this.detalle.campania.id}/cierre`);
        } catch (e) {
            panel.innerHTML = `<div class="jg-vacio">${this.esc(e.message)}</div>`;
            return;
        }
        const estado = datos.estadoCampania;
        const yaPublicados = estado === 'PUBLICADA' || estado === 'ARCHIVADA';
        const hayPropuesta = datos.ganadores.some(g => g.estado === 'PROPUESTO');

        const barra = [];
        if (estado === 'CERRADA') {
            barra.push(`<button type="button" class="admin-btn-${hayPropuesta ? 'secondary' : 'primary'}" onclick="adminJuegos.proponerGanadores()"><i class="fas fa-list-ol"></i> ${hayPropuesta ? 'Volver a proponer' : 'Proponer ganadores'}</button>`);
            if (hayPropuesta) barra.push(`<button type="button" class="admin-btn-primary" onclick="adminJuegos.publicarGanadores()"><i class="fas fa-bullhorn"></i> Publicar ganadores</button>`);
        }
        const ayuda = {
            ACTIVA: 'La campaña está en juego: el ranking se actualiza con cada partida. Podés descalificar a alguien si detectás algo raro.',
            PROGRAMADA: 'Todavía no empezó.',
            CERRADA: hayPropuesta
                ? 'Revisá la propuesta. Si descalificás a alguien, la propuesta se borra y hay que volver a proponer. Al publicar, cada ganador recibe el aviso y empieza a correr su plazo para reclamar.'
                : 'La campaña cerró. Revisá el ranking, descalificá si hace falta y después proponé los ganadores.',
            PUBLICADA: 'Ganadores publicados. Si el ganador no reclama a tiempo, el premio pasa solo al siguiente suplente (se revisa cada hora).',
            ARCHIVADA: 'Campaña archivada.'
        }[estado] || '';

        const ganadores = datos.ganadores.length ? `
            <h3 class="jg-subtitulo">Ganadores</h3>
            <div class="jg-tabla-wrap"><table class="jg-tabla">
                <thead><tr><th>Puesto</th><th>Participante</th><th>Rol</th><th>Estado</th><th>Reclamar hasta</th><th></th></tr></thead>
                <tbody>${datos.ganadores.map(g => {
                    const e = this.ESTADOS_GANADOR[g.estado] || this.ESTADOS_GANADOR.PROPUESTO;
                    const conPremio = g.estado === 'NOTIFICADO' || g.estado === 'RECLAMADO';
                    return `<tr>
                        <td><strong>${Number(g.puesto)}°</strong></td>
                        <td>${this.esc(g.nombre)}${g.conCuenta === false ? ' <span class="jg-tag-sin-registro">Sin registro</span>' : ''}<div class="jg-tenue">${this.esc(g.email || '')}</div>${g.motivo ? `<div class="jg-tenue">Motivo: ${this.esc(g.motivo)}</div>` : ''}</td>
                        <td>${g.rol === 'GANADOR' ? 'Ganador/a' : 'Suplente'}</td>
                        <td><span class="jg-badge" style="color:${e.color};background:${e.fondo};">${e.texto}</span></td>
                        <td>${g.reclamarHasta ? this.fechaHora(g.reclamarHasta) : '—'}</td>
                        <td class="jg-celda-acciones">${conPremio ? `
                            <button type="button" class="admin-btn-secondary jg-btn-chico" onclick="adminJuegos.marcarEntregado(${Number(g.id)})"><i class="fas fa-check"></i> Entregado</button>
                            <button type="button" class="jg-btn-peligro jg-btn-chico" onclick="adminJuegos.pasarAlSuplente(${Number(g.id)})">Pasar al suplente</button>` : ''}</td>
                    </tr>`;
                }).join('')}</tbody>
            </table></div>` : '';

        const ranking = datos.ranking.length ? `
            <h3 class="jg-subtitulo">Ranking (${datos.ranking.length} ${datos.ranking.length === 1 ? 'participante' : 'participantes'})</h3>
            <div class="jg-tabla-wrap"><table class="jg-tabla">
                <thead><tr><th>#</th><th>Participante</th><th>Aciertos</th><th>Tiempo</th><th>Días</th><th></th></tr></thead>
                <tbody>${datos.ranking.map(f => `
                    <tr class="${f.motivoDescalificacion ? 'jg-descalificado' : ''}">
                        <td><strong>${f.posicion != null ? Number(f.posicion) : '—'}</strong></td>
                        <td>${this.esc(f.nombre)}${f.conCuenta === false ? ' <span class="jg-tag-sin-registro">Sin registro</span>' : ''}<div class="jg-tenue">${this.esc(f.email || '')}</div>${f.motivoDescalificacion ? `<div class="jg-texto-alerta">Descalificado: ${this.esc(f.motivoDescalificacion)}</div>` : ''}</td>
                        <td>${Number(f.aciertos)}</td>
                        <td>${this.tiempo(f.tiempoMs)}</td>
                        <td>${Number(f.diasJugados)}</td>
                        <td class="jg-celda-acciones">${yaPublicados ? '' : f.motivoDescalificacion
                            ? `<button type="button" class="admin-btn-secondary jg-btn-chico" onclick="adminJuegos.rehabilitar(${Number(f.participanteId)})">Rehabilitar</button>`
                            : `<button type="button" class="jg-btn-peligro jg-btn-chico" onclick="adminJuegos.descalificar(${Number(f.participanteId)})">Descalificar</button>`}</td>
                    </tr>`).join('')}</tbody>
            </table></div>` : '<div class="jg-vacio">Todavía nadie jugó.</div>';

        panel.innerHTML = `
            ${ayuda ? `<p class="jg-ayuda jg-ayuda-bloque">${ayuda}</p>` : ''}
            ${barra.length ? `<div class="jg-barra">${barra.join('')}</div>` : ''}
            ${ganadores}
            ${ranking}`;
    },

    async accionCierre(ruta, body, exito) {
        try {
            await this.pedir(ruta, { method: 'POST', body });
            if (exito) this.aviso(exito, 'success');
        } catch (e) {
            this.aviso(e.message, 'error');
        }
        await this.verDetalle(this.detalle.campania.id, 'ranking');
    },

    proponerGanadores() {
        this.accionCierre(`/campanias/${this.detalle.campania.id}/ganadores/proponer`, undefined, 'Ganadores propuestos. Revisalos y publicalos.');
    },

    publicarGanadores() {
        const c = this.detalle.campania;
        if (!confirm(`¿Publicar los ganadores? Al publicar, cada ganador recibe el aviso y empieza a correr su plazo para reclamar. ' ${c.diasParaReclamar} días para reclamar. No se puede deshacer.`)) return;
        this.accionCierre(`/campanias/${c.id}/ganadores/publicar`, undefined, 'Ganadores publicados');
    },

    descalificar(participanteId) {
        const motivo = prompt('Motivo de la descalificación (queda registrado):');
        if (motivo == null) return;
        if (!motivo.trim()) { this.aviso('Escribí el motivo', 'error'); return; }
        this.accionCierre(`/campanias/${this.detalle.campania.id}/descalificar`, { participanteId, motivo: motivo.trim() }, 'Participante descalificado');
    },

    async rehabilitar(participanteId) {
        if (!confirm('¿Devolverle su lugar en el ranking?')) return;
        try {
            await this.pedir(`/campanias/${this.detalle.campania.id}/descalificar/${participanteId}`, { method: 'DELETE' });
            this.aviso('Participante rehabilitado', 'success');
        } catch (e) {
            this.aviso(e.message, 'error');
        }
        await this.verDetalle(this.detalle.campania.id, 'ranking');
    },

    marcarEntregado(ganadorId) {
        if (!confirm('¿Confirmás que el premio ya se entregó?')) return;
        this.accionCierre(`/ganadores/${ganadorId}/entregado`, undefined, 'Premio marcado como entregado');
    },

    pasarAlSuplente(ganadorId) {
        const motivo = prompt('¿Por qué pasa al suplente? (por ejemplo: no respondió, no cumple las bases)');
        if (motivo == null) return;
        if (!motivo.trim()) { this.aviso('Escribí el motivo', 'error'); return; }
        this.accionCierre(`/ganadores/${ganadorId}/pasar-al-suplente`, { motivo: motivo.trim() }, 'El premio pasó al siguiente suplente');
    },

    // ------------------------------------------
    // MODALES
    // ------------------------------------------
    cerrarModal(id) {
        document.getElementById(id).classList.remove('abierto');
    },

    asegurarModales() {
        if (document.getElementById('jgModalPregunta')) return;
        const opcion = i => `
            <div class="jg-opcion-input">
                <input type="radio" name="jgPregOk" id="jgPregOk${i}" title="Marcar como correcta">
                <input id="jgPregOp${i}" class="admin-input" maxlength="200" placeholder="Opción ${i}${i > 2 ? ' (opcional)' : ''}">
            </div>`;

        const pregunta = document.createElement('div');
        pregunta.id = 'jgModalPregunta';
        pregunta.className = 'jg-modal-overlay';
        pregunta.innerHTML = `
            <div class="jg-modal" role="dialog" aria-modal="true" aria-labelledby="jgPregTitulo">
                <div class="jg-modal-cab"><h3 id="jgPregTitulo">Nueva pregunta</h3>
                    <button type="button" class="jg-modal-cerrar" aria-label="Cerrar" onclick="adminJuegos.cerrarModal('jgModalPregunta')"><i class="fas fa-times"></i></button></div>
                <div class="jg-modal-cuerpo">
                    <div class="form-group-admin"><label for="jgPregTexto">Pregunta *</label>
                        <textarea id="jgPregTexto" class="admin-textarea" rows="2" maxlength="400"></textarea></div>
                    <div class="form-group-admin"><label>Imagen (opcional)</label>
                        <input type="hidden" id="jgPregImagen">
                        <div class="jg-preg-img" id="jgPregImgCaja"></div></div>
                    <div class="form-group-admin"><label>Opciones (marcá la correcta) *</label>
                        ${opcion(1)}${opcion(2)}${opcion(3)}${opcion(4)}</div>
                    <div id="jgPregError" class="jg-error" role="alert"></div>
                </div>
                <div class="jg-modal-pie">
                    <button type="button" class="admin-btn-secondary" onclick="adminJuegos.cerrarModal('jgModalPregunta')">Cancelar</button>
                    <button type="button" class="admin-btn-primary" onclick="adminJuegos.guardarPregunta()"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </div>`;

        const tmdb = document.createElement('div');
        tmdb.id = 'jgModalTmdb';
        tmdb.className = 'jg-modal-overlay';
        tmdb.innerHTML = `
            <div class="jg-modal jg-modal-ancho" role="dialog" aria-modal="true" aria-labelledby="jgTmdbTitulo">
                <div class="jg-modal-cab"><h3 id="jgTmdbTitulo">Generar preguntas desde TMDb</h3>
                    <button type="button" class="jg-modal-cerrar" aria-label="Cerrar" onclick="adminJuegos.cerrarModal('jgModalTmdb')"><i class="fas fa-times"></i></button></div>
                <div class="jg-modal-cuerpo">
                    <p class="jg-ayuda">Buscá películas, series, sagas o personas y sumalas a la lista. Las preguntas se arman con todos los temas juntos; después elegís cuáles entran al banco.</p>
                    <div class="jg-tipos-tmdb" role="tablist">
                        <button type="button" class="jg-tipo-tmdb" data-tipo="PELICULA" onclick="adminJuegos.cambiarTipoTmdb('PELICULA')"><i class="fas fa-film"></i> Películas</button>
                        <button type="button" class="jg-tipo-tmdb" data-tipo="SERIE" onclick="adminJuegos.cambiarTipoTmdb('SERIE')"><i class="fas fa-tv"></i> Series</button>
                        <button type="button" class="jg-tipo-tmdb" data-tipo="SAGA" onclick="adminJuegos.cambiarTipoTmdb('SAGA')"><i class="fas fa-layer-group"></i> Sagas</button>
                        <button type="button" class="jg-tipo-tmdb" data-tipo="PERSONA" onclick="adminJuegos.cambiarTipoTmdb('PERSONA')"><i class="fas fa-user"></i> Personas</button>
                    </div>
                    <div class="jg-buscador">
                        <i class="fas fa-search"></i>
                        <input id="jgTmdbBuscar" class="admin-input" autocomplete="off" aria-label="Buscar en TMDb" oninput="adminJuegos.buscarTmdb(this.value)">
                    </div>
                    <div id="jgTmdbSugerencias" class="jg-sugerencias"></div>
                    <div class="jg-temas-cab">Temas elegidos</div>
                    <div id="jgTmdbTemas" class="jg-temas"></div>
                    <div class="jg-fila jg-generar-fila">
                        <div class="form-group-admin"><label for="jgTmdbCantidad">Cantidad de preguntas</label>
                            <input id="jgTmdbCantidad" type="number" min="1" max="60" class="admin-input" style="width:110px;"></div>
                        <div class="form-group-admin jg-alinear-abajo">
                            <button type="button" class="admin-btn-primary" id="jgTmdbGenerar" onclick="adminJuegos.generarTmdb()" disabled><i class="fas fa-wand-magic-sparkles"></i> Generar preguntas</button></div>
                    </div>
                    <div id="jgTmdbError" class="jg-error" role="alert"></div>
                    <div id="jgTmdbResultado" class="jg-tmdb-resultado"></div>
                </div>
                <div class="jg-modal-pie">
                    <button type="button" class="admin-btn-secondary" onclick="adminJuegos.cerrarModal('jgModalTmdb')">Cancelar</button>
                    <button type="button" class="admin-btn-primary" id="jgTmdbAgregar" style="display:none;" onclick="adminJuegos.agregarCandidatas()"><i class="fas fa-plus"></i> Agregar seleccionadas</button>
                </div>
            </div>`;

        [pregunta, tmdb].forEach(m => {
            m.addEventListener('click', ev => { if (ev.target === m) m.classList.remove('abierto'); });
            document.body.appendChild(m);
        });
    },

    // ------------------------------------------
    // ESTILOS (propios del módulo)
    // ------------------------------------------
    inyectarEstilos() {
        if (document.getElementById('adminJuegosEstilos')) return;
        const s = document.createElement('style');
        s.id = 'adminJuegosEstilos';
        s.textContent = `
            .jg-vacio { background:#fff; border-radius:12px; padding:1.5rem; text-align:center; color:#6b7280; }
            .jg-tenue { color:#8a8f9c; font-size:0.8rem; }
            .jg-tag-sin-registro { display:inline-block; margin-left:6px; padding:1px 8px; border-radius:999px; background:#ede9fe; color:#5b21b6; font-size:0.7rem; font-weight:700; vertical-align:middle; }
            .jg-acceso { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px; }
            .jg-acceso-opcion { display:flex; gap:10px; align-items:flex-start; padding:12px; border:1.5px solid #e5e7eb; border-radius:10px; cursor:pointer; }
            .jg-acceso-opcion:has(input:checked) { border-color:#e50914; background:#fff5f5; }
            .jg-acceso-opcion input { margin-top:3px; accent-color:#e50914; }
            .jg-acceso-opcion span { display:flex; flex-direction:column; gap:3px; }
            .jg-acceso-opcion small { color:#6b7280; font-size:0.78rem; line-height:1.4; }
            .jg-check { display:flex; gap:8px; align-items:center; margin-top:10px; font-size:0.86rem; color:#374151; cursor:pointer; }
            .jg-check[hidden] { display:none; }
            .jg-badge { display:inline-block; border-radius:999px; padding:3px 10px; font-size:0.75rem; font-weight:700; white-space:nowrap; }
            .jg-tabla-wrap { overflow-x:auto; background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
            .jg-tabla { width:100%; border-collapse:collapse; font-size:0.88rem; }
            .jg-tabla th { text-align:left; padding:10px 12px; background:#f6f7fb; color:#555; font-size:0.78rem; text-transform:uppercase; letter-spacing:0.03em; white-space:nowrap; }
            .jg-tabla td { padding:10px 12px; border-top:1px solid #eef0f5; vertical-align:middle; }
            .jg-fila-link { cursor:pointer; } .jg-fila-link:hover td { background:#fafbfe; }
            .jg-flecha { color:#b0b5c2; text-align:right; }
            .jg-detalle-cab { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-bottom:12px; }
            .jg-volver { border:none; background:none; color:#1a3a6b; font-weight:700; cursor:pointer; padding:6px 0; font-family:inherit; }
            .jg-detalle-titulo { display:flex; align-items:center; gap:10px; flex:1; min-width:200px; }
            .jg-detalle-titulo h2 { margin:0; font-size:1.25rem; }
            .jg-acciones-estado { display:flex; gap:8px; flex-wrap:wrap; }
            .jg-link { text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
            .jg-btn-peligro { border:1px solid #fecaca; background:#fff; color:#b91c1c; border-radius:8px; padding:8px 14px; font-weight:600; cursor:pointer; font-family:inherit; }
            .jg-aviso { background:#eef2ff; color:#1e3a8a; border-radius:10px; padding:10px 14px; font-size:0.86rem; margin-bottom:12px; }
            .jg-aviso-alerta { background:#fef3c7; color:#92400e; }
            .jg-aviso-ok { background:#d1fae5; color:#065f46; }
            .jg-tabs { display:flex; gap:6px; border-bottom:2px solid #e5e7eb; margin-bottom:16px; }
            .jg-tab { border:none; background:none; padding:10px 14px; font-weight:700; color:#6b7280; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; font-family:inherit; }
            .jg-tab.activo { color:#1a3a6b; border-bottom-color:#e50914; }
            .jg-form { display:grid; gap:16px; max-width:820px; }
            .jg-grupo { background:#fff; border:none; border-radius:12px; padding:16px 18px; box-shadow:0 1px 4px rgba(0,0,0,0.06); margin:0; }
            .jg-grupo legend { font-weight:800; color:#1a3a6b; padding:0 4px; }
            .jg-grupo:disabled { opacity:0.7; }
            .jg-fila { display:flex; gap:12px; flex-wrap:wrap; } .jg-fila > .form-group-admin { flex:1; min-width:180px; }
            .jg-alinear-abajo { display:flex; align-items:flex-end; flex:0 0 auto !important; min-width:0 !important; }
            .jg-ayuda { display:block; color:#6b7280; font-size:0.78rem; margin:4px 0 0; }
            .jg-prefijo { display:flex; align-items:center; gap:6px; } .jg-prefijo span { color:#6b7280; font-size:0.85rem; white-space:nowrap; }
            .jg-color { display:flex; align-items:center; gap:10px; } .jg-color input { width:48px; height:36px; border:none; padding:0; background:none; cursor:pointer; }
            .jg-imagenes { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:14px; margin-bottom:14px; }
            .jg-img-caja { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
            .jg-img-titulo { font-weight:700; font-size:0.86rem; color:#374151; }
            .jg-img-preview { border:1.5px dashed #d1d5db; border-radius:10px; background:#f9fafb; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:0.82rem; }
            .jg-img-preview img { width:100%; height:100%; object-fit:cover; display:block; }
            .jg-img-ancha { aspect-ratio:4 / 1; }
            .jg-img-cuadrada { aspect-ratio:1 / 1; max-width:160px; }
            .jg-img-169 { aspect-ratio:16 / 9; }
            .jg-img-botones { display:flex; gap:6px; flex-wrap:wrap; }
            .jg-subir { cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-left:0 !important; }
            .jg-pie-form { display:flex; justify-content:flex-end; }
            .jg-barra { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
            .jg-preguntas { display:grid; gap:8px; }
            .jg-pregunta { display:flex; gap:12px; background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 4px rgba(0,0,0,0.06); align-items:flex-start; }
            .jg-pregunta img, .jg-candidata img { width:56px; height:72px; object-fit:cover; border-radius:6px; flex-shrink:0; background:#eee; }
            .jg-pregunta-cuerpo, .jg-candidata-cuerpo { flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; }
            .jg-pregunta-texto { font-weight:700; color:#16151a; }
            .jg-opciones { display:flex; flex-wrap:wrap; gap:6px; }
            .jg-opciones span { font-size:0.8rem; background:#f3f4f6; border-radius:8px; padding:3px 9px; }
            .jg-opciones .jg-correcta { background:#d1fae5; color:#065f46; font-weight:700; }
            .jg-meta { font-size:0.76rem; color:#8a8f9c; }
            .jg-jugada { opacity:0.6; }
            .jg-acciones { display:flex; gap:4px; }
            .jg-acciones button { border:none; background:#f3f4f6; color:#374151; width:32px; height:32px; border-radius:8px; cursor:pointer; }
            .jg-resumen-tandas { display:flex; flex-wrap:wrap; align-items:center; gap:18px; background:#fff; border-radius:12px; padding:12px 16px; box-shadow:0 1px 4px rgba(0,0,0,0.06); margin-bottom:14px; font-size:0.9rem; }
            .jg-texto-ok { color:#047857; font-weight:700; } .jg-texto-alerta { color:#b45309; font-weight:700; }
            .jg-dias { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px; }
            .jg-dia { background:#fff; border-radius:12px; padding:12px 14px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
            .jg-dia-bloqueado { background:#f9fafb; }
            .jg-dia-cab { display:flex; align-items:center; gap:10px; margin-bottom:8px; text-transform:capitalize; }
            .jg-dia ol, .jg-libres ul { margin:0; padding-left:20px; display:grid; gap:6px; }
            .jg-dia li, .jg-libres li { font-size:0.84rem; }
            .jg-tanda-texto { display:block; }
            .jg-mover { margin-top:3px; font-size:0.76rem; border:1px solid #d1d5db; border-radius:6px; padding:2px 4px; background:#fff; }
            .jg-libres { background:#fff; border-radius:12px; padding:12px 14px; margin-top:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
            .jg-libres h4 { margin:0 0 8px; }
            .jg-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:99999; align-items:center; justify-content:center; padding:1rem; }
            .jg-modal-overlay.abierto { display:flex; }
            .jg-modal { background:#fff; border-radius:16px; width:100%; max-width:600px; max-height:92vh; display:flex; flex-direction:column; }
            .jg-modal-ancho { max-width:860px; }
            .jg-modal-cab { background:#1a3a6b; color:#fff; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; border-radius:16px 16px 0 0; }
            .jg-modal-cab h3 { margin:0; font-size:1rem; }
            .jg-modal-cerrar { background:rgba(255,255,255,0.2); border:none; color:#fff; width:30px; height:30px; border-radius:50%; cursor:pointer; }
            .jg-modal-cuerpo { padding:1.25rem; overflow-y:auto; }
            .jg-modal-pie { display:flex; justify-content:flex-end; gap:8px; padding:0 1.25rem 1.25rem; }
            .jg-opcion-input { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
            .jg-opcion-input .admin-input { flex:1; min-width:0; }
            .jg-preg-img { display:flex; gap:12px; align-items:flex-start; }
            .jg-preg-img-preview { width:120px; aspect-ratio:4 / 3; flex-shrink:0; border:1.5px dashed #d1d5db; border-radius:10px; background:#f9fafb; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:0.8rem; text-align:center; }
            .jg-preg-img-preview img { width:100%; height:100%; object-fit:cover; display:block; }
            .jg-preg-img-lado { display:flex; flex-direction:column; gap:6px; min-width:0; }
            .jg-opcion-input input[type=radio] { width:18px; height:18px; flex-shrink:0; accent-color:#047857; }
            .jg-error { color:#b91c1c; font-size:0.85rem; min-height:1em; margin-top:8px; }
            .jg-tipos-tmdb { display:flex; gap:6px; flex-wrap:wrap; margin:10px 0; }
            .jg-tipo-tmdb { border:1.5px solid #d6d9e3; background:#fff; color:#1a3a6b; border-radius:999px; padding:6px 14px; font-weight:700; font-size:0.84rem; cursor:pointer; font-family:inherit; }
            .jg-tipo-tmdb.activo { background:#1a3a6b; border-color:#1a3a6b; color:#fff; }
            .jg-buscador { position:relative; } .jg-buscador i { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#9ca3af; }
            .jg-buscador input { padding-left:34px !important; width:100%; box-sizing:border-box; }
            .jg-sugerencias { display:grid; gap:4px; margin:8px 0 4px; max-height:300px; overflow-y:auto; }
            .jg-sug { display:flex; align-items:center; gap:10px; border:1px solid #e5e7eb; background:#fff; border-radius:10px; padding:6px 10px; text-align:left; cursor:pointer; font-family:inherit; }
            .jg-sug:hover:not(:disabled) { background:#f6f7fb; border-color:#c7cbd6; }
            .jg-sug img, .jg-sug-sinimg { width:36px; height:54px; object-fit:cover; border-radius:4px; flex-shrink:0; background:#eef0f5; display:flex; align-items:center; justify-content:center; color:#9ca3af; }
            .jg-sug-texto { flex:1; min-width:0; display:flex; flex-direction:column; } .jg-sug-texto small { color:#6b7280; }
            .jg-sug-accion { font-size:0.8rem; font-weight:700; color:#1a3a6b; white-space:nowrap; }
            .jg-sug-elegido { opacity:0.6; cursor:default; } .jg-sug-elegido .jg-sug-accion { color:#047857; }
            .jg-sug-vacio { color:#6b7280; font-size:0.85rem; padding:8px 2px; }
            .jg-temas-cab { font-weight:700; font-size:0.85rem; margin-top:10px; }
            .jg-temas { display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 4px; min-height:30px; align-items:center; }
            .jg-tema { display:inline-flex; align-items:center; gap:6px; background:#eef2ff; color:#1e3a8a; border-radius:999px; padding:4px 6px 4px 12px; font-size:0.84rem; font-weight:600; }
            .jg-tema small { font-weight:800; text-transform:uppercase; font-size:0.66rem; letter-spacing:0.04em; opacity:0.75; }
            .jg-tema button { border:none; background:rgba(30,58,138,0.12); color:#1e3a8a; width:22px; height:22px; border-radius:50%; cursor:pointer; }
            .jg-generar-fila { border-top:1px solid #eef0f5; padding-top:10px; margin-top:6px; }
            .jg-tmdb-cab { display:flex; align-items:center; gap:10px; margin:10px 0; font-size:0.88rem; }
            .jg-todas { margin-left:auto; display:flex; align-items:center; gap:6px; font-weight:600; cursor:pointer; }
            .jg-tmdb-resultado { display:grid; gap:8px; }
            .jg-candidata { display:flex; gap:10px; align-items:flex-start; border:1px solid #e5e7eb; border-radius:10px; padding:10px; cursor:pointer; }
            .jg-ocultar { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:#fff; border:1px solid #e5e7eb; font-weight:600; font-size:0.86rem; color:#374151; cursor:pointer; }
            .jg-ocultar input { width:16px; height:16px; accent-color:#b91c1c; cursor:pointer; }
            .jg-subtitulo { margin:18px 0 8px; font-size:1rem; color:#1a3a6b; }
            .jg-ayuda-bloque { background:#fff; border-radius:10px; padding:10px 14px; margin:0 0 12px; font-size:0.84rem; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
            .jg-celda-acciones { white-space:nowrap; text-align:right; }
            .jg-btn-chico { padding:5px 10px !important; font-size:0.78rem !important; margin-left:4px; }
            .jg-descalificado td { background:#fff7f7; }
            .jg-candidata input[type=checkbox] { margin-top:4px; width:18px; height:18px; flex-shrink:0; }
            @media (max-width: 640px) { .jg-detalle-cab { align-items:flex-start; } .jg-pregunta img { width:44px; height:58px; } }
        `;
        document.head.appendChild(s);
    }
};

window.adminJuegos = adminJuegos;
