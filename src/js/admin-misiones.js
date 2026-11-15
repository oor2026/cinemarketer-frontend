// ==============================================
// admin-misiones.js - Misiones y Sellos (panel de admin)
// ==============================================
// Lista de misiones con filtros y estadísticas · asistente de 5 pasos para crear y editar · vista previa del sello ·
// catálogo automático (rotación) con «Actualizar ahora». Habla con /api/admin/misiones (AdminMisionController); todas
// las reglas viven en el servidor: acá solo se ofrece lo que tiene sentido y se muestran sus errores y avisos.
const adminMisiones = (function () {
    'use strict';

    // Los íconos de cada categoría de sello: los MISMOS que dibuja la aplicación (misiones.js).
    const IC = {
        votos: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
        comentarios: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        constancia: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        genero: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
        autor: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
        trivia: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        comunidad: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        especial: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
        saga: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
        elenco: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
        premios: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
        perfil: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
        recomendaciones: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
        _: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
        candado: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
    };
    const CATEGORIAS = [['votos', 'Votos'], ['comentarios', 'Comentarios'], ['constancia', 'Constancia'], ['genero', 'Género'], ['autor', 'Cine de autor'], ['trivia', 'Trivia'], ['comunidad', 'Comunidad'],
        ['especial', 'Especial'], ['saga', 'Saga'], ['elenco', 'Elenco'], ['premios', 'Premios'], ['perfil', 'Perfil'], ['recomendaciones', 'Recomendaciones']];
    const VIGENCIA = { HOY: ['Del día', 'Se reinicia todos los días'], SEMANA: ['De la semana', 'Se reinicia cada semana'], PERMANENTE: ['Permanente', 'Siempre disponible'], EVENTO: ['Evento con fechas', 'Tiene un inicio y un fin'], RACHA: ['Racha', 'Días seguidos'] };
    const AUDIENCIA = { TODOS: 'Todos', PREMIUM: 'Solo Premium', FREE: 'Solo gratuitos' };
    const VISIBILIDAD = { VISIBLE: ['Visible', 'La ven todos desde que se publica.'], MISTERIOSA: ['Misteriosa', 'Aparece como «???» hasta que el usuario junta cierta cantidad de sellos.'], OCULTA: ['Oculta', 'Nadie la ve. Sirve para tenerla preparada.'] };
    const DIFICULTAD = { FACIL: ['Fácil', 'Se muestra primero'], MEDIA: ['Media', ''], DIFICIL: ['Difícil', 'Se muestra después'] };
    const FAMILIAS = { SAGA: 'Saga', ACTOR: 'Actor o actriz', DIRECTOR: 'Director', GENERO: 'Género' };
    const ESTADO_BADGE = { BORRADOR: ['am-b-borrador', 'Borrador'], ACTIVA: ['badge-activo', 'Activa'], PAUSADA: ['am-b-pausada', 'Pausada'], PROGRAMADA: ['am-b-programada', 'Programada'], VENCIDA: ['am-b-vencida', 'Vencida'] };
    const DISTINTAS_TXT = { COMENTARIOS: 'títulos distintos', INTERVENCIONES: 'publicaciones distintas', CANJES: 'premios distintos', RECOMENDACIONES: 'títulos distintos' };
    // Qué campos del formulario son de cada paso (para mostrar los errores donde corresponde).
    const PASOS = [
        ['metrica', 'tipoContenido', 'generoId', 'directorId', 'sagaId', 'actorId', 'distintas', 'filtros'],
        ['meta', 'vigencia', 'desde', 'hasta', 'escalera', 'escaleraSobre', 'escaleraPaso'],
        ['titulo', 'descripcion', 'descripcionCumplida', 'categoria', 'selloExistenteId', 'nivelSello', 'selloNombre', 'selloDescripcion', 'selloImagenUrl', 'selloCategoria'],
        ['visibilidad', 'sellosNecesarios', 'prerrequisitoId', 'audiencia', 'dificultad', 'orden', 'accionTexto', 'accionDestino']];
    const TITULOS_PASO = ['Qué se le pide', 'Cuánto y cuándo', 'Nombre y sello', 'Visibilidad', 'Vista previa'];
    const ETQ_CAMPO = { metrica: 'Qué se le pide', tipoContenido: 'Películas o series', generoId: 'Género', directorId: 'Director', sagaId: 'Saga', actorId: 'Actor o actriz', filtros: 'Filtro', distintas: 'Distintos', meta: 'Meta', vigencia: 'Vigencia',
        desde: 'Inicio', hasta: 'Fin', escalera: 'Escalera', escaleraSobre: 'Escalera', escaleraPaso: 'Paso fijo', titulo: 'Nombre', descripcion: 'Descripción', descripcionCumplida: 'Mensaje al cumplir', categoria: 'Categoría',
        selloExistenteId: 'Sello', nivelSello: 'Nivel del sello', selloNombre: 'Nombre del sello', selloDescripcion: 'Descripción del sello', selloImagenUrl: 'Imagen', selloCategoria: 'Categoría del sello', visibilidad: 'Visibilidad',
        sellosNecesarios: 'Sellos necesarios', prerrequisitoId: 'Encadenada', audiencia: 'Audiencia', dificultad: 'Dificultad', orden: 'Orden', accionTexto: 'Texto del botón', accionDestino: 'Destino del botón' };

    const S = { iniciado: false, tab: 'misiones', todas: [], filtros: { q: '', estado: '', origen: 'MANUAL', metrica: '' }, pagina: 1, porPagina: 12, opciones: null, sellos: null, generos: null,
        cat: null, catFiltros: { familia: '', estado: '', q: '' }, act: null, timer: null, wiz: null, conf: null, cargandoLista: false, tmdbTimer: null, valTimer: null, valSeq: 0 };

    // ------------------------------------------------------------------------------------------------ utilidades
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const aviso = (m, tipo) => { if (typeof window.toast === 'function') window.toast(m, tipo || 'info'); };
    function fecha(v) {
        if (!v) return '';
        const d = Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0) : new Date(v);
        if (isNaN(d)) return '';
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    const paraInput = (v) => (v ? (Array.isArray(v) ? `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}T${String(v[3] || 0).padStart(2, '0')}:${String(v[4] || 0).padStart(2, '0')}` : String(v).slice(0, 16)) : '');
    const metricaDe = (cod) => ((S.opciones && S.opciones.metricas) || []).find((m) => m.codigo === cod) || null;

    async function api(ruta, o) {
        o = o || {};
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        let body;
        if (o.form) body = o.form;
        else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
        const res = await fetch(`${CONFIG.API_URL}/admin/misiones${ruta}`, { method: o.metodo || 'GET', headers, body });
        let data = null;
        try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
        if (!res.ok) { const err = new Error((data && data.error) || 'No se pudo completar la acción.'); err.status = res.status; err.data = data; throw err; }
        return data;
    }

    // ------------------------------------------------------------------------------------------------ el sello (idéntico al de la aplicación)
    function sello(s, estado, tam) {
        s = s || {};
        const mist = estado === 'misterioso';
        const c = mist ? 'mist' : (IC[s.categoria] && s.categoria !== '_' && s.categoria !== 'candado' ? s.categoria : '_');
        const img = !mist && typeof s.imagenUrl === 'string' && /^https:\/\//.test(s.imagenUrl);
        const dentro = mist ? '<b>?</b>' : `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[c] || IC._}</svg>${img ? `<img src="${esc(s.imagenUrl)}" alt="" onerror="this.parentNode.classList.remove('am-con-img');this.remove()">` : ''}`;
        return `<span class="am-sello am-s-${tam || 'm'} am-c-${c}${estado === 'apagado' ? ' am-apag' : ''}${img ? ' am-con-img' : ''}">${dentro}</span>`;
    }

    // ------------------------------------------------------------------------------------------------ arranque
    async function init() {
        if (!S.iniciado) {
            S.iniciado = true;
            const sec = $('section-misiones');
            sec.addEventListener('click', alClick);
            sec.addEventListener('input', alCambio);
            sec.addEventListener('change', alCambio);
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('section-misiones') && $('section-misiones').classList.contains('active')) alEscape(); });
        }
        try { if (!S.opciones) S.opciones = await api('/opciones'); } catch (e) { aviso('No se pudieron cargar las opciones de misiones.', 'error'); return; }
        const sel = $('amFiltroTipo');
        if (sel && sel.options.length <= 1) S.opciones.metricas.forEach((m) => sel.insertAdjacentHTML('beforeend', `<option value="${esc(m.codigo)}">${esc(m.etiqueta)}</option>`));
        if (S.tab === 'catalogo') cargarCatalogo(); else cargarLista();
    }

    function cambiarTab(t) {
        S.tab = t;
        $('amTabMisiones').classList.toggle('active', t === 'misiones'); $('amTabCatalogo').classList.toggle('active', t === 'catalogo');
        $('amTabMisiones').setAttribute('aria-selected', t === 'misiones'); $('amTabCatalogo').setAttribute('aria-selected', t === 'catalogo');
        $('amPanelMisiones').hidden = t !== 'misiones'; $('amPanelCatalogo').hidden = t !== 'catalogo';
        document.querySelectorAll('#section-misiones .am-solo-misiones').forEach((e) => { e.hidden = t !== 'misiones'; });
        if (t === 'catalogo') cargarCatalogo(); else cargarLista();
    }

    // ================================================================================================ LISTA
    async function cargarLista() {
        const cuerpo = $('amTablaBody');
        if (!S.todas.length) cuerpo.innerHTML = '<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando misiones...</td></tr>';
        try { S.todas = await api(''); } catch (e) { cuerpo.innerHTML = `<tr><td colspan="7" class="am-vacio">${esc(e.message)}</td></tr>`; return; }
        pintarLista();
    }

    function filtradas() {
        const f = S.filtros, q = f.q.trim().toLowerCase();
        return S.todas.filter((m) => (!f.origen || m.origen === f.origen) && (!f.estado || m.estado === f.estado) && (!f.metrica || m.metrica === f.metrica)
            && (!q || m.titulo.toLowerCase().includes(q) || ((m.sello || {}).nombre || '').toLowerCase().includes(q)));
    }

    function pintarLista() {
        const manuales = S.todas.filter((m) => m.origen === 'MANUAL');
        const cuenta = (e) => manuales.filter((m) => m.estado === e).length;
        const enCurso = manuales.reduce((a, m) => a + (m.enCurso || 0), 0), cumplieron = manuales.reduce((a, m) => a + (m.cumplieron || 0), 0);
        $('amStats').innerHTML = [['Activas', cuenta('ACTIVA') + cuenta('PROGRAMADA')], ['Borradores', cuenta('BORRADOR')], ['Pausadas', cuenta('PAUSADA')], ['Usuarios avanzando', enCurso], ['Sellos ganados', cumplieron]]
            .map(([l, n]) => `<div class="admin-stat-box"><span class="stat-num">${n}</span><span class="stat-label">${l}</span></div>`).join('');
        const lista = filtradas(), paginas = Math.max(1, Math.ceil(lista.length / S.porPagina));
        S.pagina = Math.min(S.pagina, paginas);
        const ver = lista.slice((S.pagina - 1) * S.porPagina, S.pagina * S.porPagina);
        $('amTablaBody').innerHTML = ver.length ? ver.map(fila).join('') : `<tr><td colspan="7" class="am-vacio"><i class="fas fa-flag-checkered"></i>${S.todas.length ? 'Ninguna misión coincide con los filtros.' : 'Todavía no hay misiones. Creá la primera con «Nueva misión».'}</td></tr>`;
        const pag = $('amPaginacion');
        pag.style.display = lista.length > S.porPagina ? 'flex' : 'none';
        pag.innerHTML = `<button class="btn-paginacion" data-am="pagina" data-v="-1" ${S.pagina <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Anterior</button><span class="info-pagina">Página ${S.pagina} de ${paginas} · ${lista.length} misiones</span><button class="btn-paginacion" data-am="pagina" data-v="1" ${S.pagina >= paginas ? 'disabled' : ''}>Siguiente <i class="fas fa-chevron-right"></i></button>`;
    }

    function resumenDe(m) {
        const partes = [`${esc(m.metricaEtiqueta)} · ${m.escalera ? 'escalera ' + esc(m.niveles) : 'meta ' + m.meta + ' ' + esc(m.unidad)}`];
        if (m.audiencia && m.audiencia !== 'TODOS') partes.push(AUDIENCIA[m.audiencia]);
        if (m.hasta) partes.push('hasta ' + fecha(m.hasta).slice(0, 10));
        return partes.join(' · ');
    }

    function fila(m) {
        const [clase, txt] = ESTADO_BADGE[m.estado] || ['', m.estado];
        const auto = m.origen === 'AUTO', ed = !auto;
        const publicable = ed && (m.estado === 'BORRADOR' || m.estado === 'PAUSADA');
        const dis = auto ? ' disabled title="Es parte de la rotación automática: se administra desde «Catálogo automático»"' : '';
        return `<tr data-id="${m.id}">
            <td><div class="am-celda-sello">${sello(m.sello, 'ganado', 'p')}<span class="am-nombre">${esc((m.sello || {}).nombre)}</span></div></td>
            <td><strong>${esc(m.titulo)}</strong>${auto ? ' <span class="badge am-b-auto">Automática</span>' : ''}<span class="am-sub">${resumenDe(m)}</span></td>
            <td>${esc((VIGENCIA[m.vigencia] || [m.vigencia])[0])}</td>
            <td><span class="badge ${clase}">${txt}</span></td>
            <td class="am-nums"><b>${m.enCurso || 0}</b> en curso<br><b>${m.cumplieron || 0}</b> cumplieron</td>
            <td class="am-nums">${fecha(m.actualizadaAt || m.publicadaAt) || '—'}</td>
            <td><div class="tabla-acciones">
                <button class="btn-accion btn-editar" data-am="editar" data-id="${m.id}" title="Editar" aria-label="Editar ${esc(m.titulo)}"${dis}><i class="fas fa-pen"></i></button>
                ${publicable ? `<button class="btn-accion btn-activar" data-am="publicar" data-id="${m.id}" title="Publicar" aria-label="Publicar ${esc(m.titulo)}"><i class="fas fa-play"></i></button>`
                    : `<button class="btn-accion btn-desactivar" data-am="pausar" data-id="${m.id}" title="Pausar" aria-label="Pausar ${esc(m.titulo)}"${auto || m.estado === 'BORRADOR' ? ' disabled' : ''}><i class="fas fa-pause"></i></button>`}
                <button class="btn-accion btn-duplicar" data-am="duplicar" data-id="${m.id}" title="Duplicar" aria-label="Duplicar ${esc(m.titulo)}"${dis}><i class="fas fa-copy"></i></button>
                <button class="btn-accion btn-historial" data-am="historial" data-id="${m.id}" title="Historial" aria-label="Historial de ${esc(m.titulo)}"><i class="fas fa-clock-rotate-left"></i></button>
                <button class="btn-accion btn-eliminar" data-am="eliminar" data-id="${m.id}" title="Eliminar" aria-label="Eliminar ${esc(m.titulo)}"${dis}><i class="fas fa-trash"></i></button>
            </div></td></tr>`;
    }

    const porId = (id) => S.todas.find((m) => m.id === Number(id));

    // ------------------------------------------------------------------------------------------------ acciones de la lista
    async function accionLista(que, id) {
        const m = porId(id);
        if (!m) return;
        try {
            if (que === 'publicar') {
                if (!(await confirmar({ titulo: `¿Publicar «${m.titulo}»?`, texto: ['Desde ese momento la ven los usuarios.', 'Cuenta solo lo que hagan desde que se publica: no cuenta lo que hicieron antes.'], ok: 'Publicar' }))) return;
                await api(`/${id}/publicar`, { metodo: 'POST' }); aviso('Misión publicada.', 'success');
            } else if (que === 'pausar') {
                if (!(await confirmar({ titulo: `¿Pausar «${m.titulo}»?`, texto: ['Deja de mostrarse y nadie pierde nada: el avance y los sellos ganados se conservan. Se puede volver a publicar.'], ok: 'Pausar' }))) return;
                await api(`/${id}/pausar`, { metodo: 'POST' }); aviso('Misión pausada.', 'success');
            } else if (que === 'duplicar') {
                const d = await api(`/${id}/duplicar`, { metodo: 'POST' }); aviso(`Se creó la copia «${d.titulo}» como borrador.`, 'success');
            } else if (que === 'eliminar') {
                if (!(await confirmar({ titulo: `¿Eliminar «${m.titulo}»?`, texto: ['Se borra para siempre, junto con su sello si nadie más lo usa.', 'Solo se puede si ningún usuario tiene avance. Si lo tienen, pausala en su lugar.'], ok: 'Eliminar', peligro: true }))) return;
                await api(`/${id}`, { metodo: 'DELETE' }); aviso('Misión eliminada.', 'success');
            }
        } catch (e) {
            const detalle = e.data && e.data.errores && e.data.errores.length ? ' ' + e.data.errores.map((x) => x.mensaje).join(' ') : '';
            aviso(e.message + detalle, 'error');
        }
        cargarLista();
    }

    async function verHistorial(id) {
        const m = porId(id);
        abrirModal('amHist', `<div class="modal-header"><h2>Historial · ${esc(m ? m.titulo : '')}</h2><button class="modal-cerrar" data-am="cerrar-hist" aria-label="Cerrar"><i class="fas fa-times"></i></button></div><div class="modal-body"><p class="am-cargando"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>`);
        try {
            const h = await api(`/${id}/historial`);
            $('amHist').querySelector('.modal-body').innerHTML = h.length ? `<ul class="am-hist">${h.map((x) => `<li><b>${esc(x.accion)}</b>${esc(x.detalle || '')}<small>${fecha(x.fecha)} · admin #${esc(x.usuarioId)}</small></li>`).join('')}</ul>` : '<p class="am-vacio">Sin movimientos registrados.</p>';
        } catch (e) { $('amHist').querySelector('.modal-body').innerHTML = `<p class="am-vacio">${esc(e.message)}</p>`; }
    }

    // ------------------------------------------------------------------------------------------------ modales y confirmación
    function abrirModal(id, html) {
        const m = $(id); m.innerHTML = html;
        $(id + 'Overlay').classList.add('open'); m.classList.add('open');
        m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    }
    function cerrarModal(id) { const m = $(id); if (!m) return; m.classList.remove('open'); $(id + 'Overlay').classList.remove('open'); m.innerHTML = ''; }

    function confirmar(o) {
        return new Promise((resolve) => {
            S.conf = resolve;
            abrirModal('amConfirm', `<div class="modal-header"><h2>${esc(o.titulo)}</h2></div><div class="modal-body">${(o.texto || []).map((t) => `<p>${esc(t)}</p>`).join('')}</div>
                <div class="modal-footer"><button class="btn-cancelar" data-am="conf-no">Cancelar</button><button class="${o.peligro ? 'btn-peligro' : 'btn-guardar'}" data-am="conf-ok">${esc(o.ok || 'Aceptar')}</button></div>`);
            const b = $('amConfirm').querySelector('.btn-cancelar'); if (b) b.focus();
        });
    }
    function resolverConf(v) { const r = S.conf; S.conf = null; cerrarModal('amConfirm'); if (r) r(v); }

    function alEscape() {
        if (S.conf) return resolverConf(false);
        if ($('amHist') && $('amHist').classList.contains('open')) return cerrarModal('amHist');
        if (S.wiz) cerrarWizard();
    }

    // ================================================================================================ EL ASISTENTE
    function nuevoForm() {
        return { metrica: '', tipoContenido: null, generoId: null, directorId: null, sagaId: null, actorId: null, filtroTipo: '', filtroNombre: '', distintas: false, meta: '', vigencia: '', desde: '', hasta: '',
            escaleraOn: false, escalera: '', escaleraPaso: '', escaleraSobre: '', titulo: '', descripcion: '', descripcionCumplida: '', selloModo: 'nuevo', selloExistenteId: '', nivelSello: 1, selloNombre: '', selloDescripcion: '',
            selloCategoria: '', selloImagenUrl: '', visibilidad: 'VISIBLE', sellosNecesarios: '', prerrequisitoId: '', audiencia: 'TODOS', dificultad: 'MEDIA', orden: 100, accionTexto: '', accionDestino: '' };
    }

    async function nueva() {
        await asegurarDatos();
        S.wiz = { id: null, paso: 1, f: nuevoForm(), res: null, ver: {}, bloq: new Set(), detalle: null, busca: { lista: null, q: '', cargando: false }, sinTocar: true, subiendo: false, errImagen: '' };
        abrirWizard();
    }

    async function editar(id) {
        await asegurarDatos();
        let d;
        try { d = await api(`/${id}`); } catch (e) { return aviso(e.message, 'error'); }
        const fm = d.form, f = nuevoForm();
        Object.assign(f, { metrica: fm.metrica, tipoContenido: fm.tipoContenido, generoId: fm.generoId, directorId: fm.directorId, sagaId: fm.sagaId, actorId: fm.actorId, distintas: !!fm.distintas, meta: fm.meta == null ? '' : fm.meta,
            vigencia: fm.vigencia, desde: paraInput(fm.desde), hasta: paraInput(fm.hasta), escaleraOn: !!(fm.escalera && fm.escalera.length), escalera: (fm.escalera || []).join(', '), escaleraPaso: fm.escaleraPaso == null ? '' : fm.escaleraPaso,
            escaleraSobre: fm.escaleraSobre || '', titulo: fm.titulo, descripcion: fm.descripcion, descripcionCumplida: fm.descripcionCumplida || '', selloModo: 'propio', nivelSello: fm.nivelSello || 1, selloNombre: fm.selloNombre || '',
            selloDescripcion: fm.selloDescripcion || '', selloCategoria: fm.selloCategoria || fm.categoria || '', selloImagenUrl: fm.selloImagenUrl || '', visibilidad: fm.visibilidad, sellosNecesarios: fm.sellosNecesarios == null ? '' : fm.sellosNecesarios,
            prerrequisitoId: fm.prerrequisitoId == null ? '' : fm.prerrequisitoId, audiencia: fm.audiencia, dificultad: fm.dificultad, orden: fm.orden, accionTexto: fm.accionTexto || '', accionDestino: fm.accionDestino || '' });
        f.filtroTipo = f.generoId ? 'genero' : f.directorId ? 'director' : f.actorId ? 'actor' : f.sagaId ? 'saga' : '';
        S.wiz = { id: d.id, paso: 1, f, res: null, ver: {}, bloq: new Set(d.bloqueados || []), detalle: d, busca: { lista: null, q: '', cargando: false }, sinTocar: true, subiendo: false, errImagen: '' };
        if (f.filtroTipo) {      // el nombre de lo elegido (la misión solo guarda el número)
            try {
                const n = await api(`/tmdb/nombres?${f.generoId ? 'generoId=' + f.generoId : f.directorId ? 'directorId=' + f.directorId : f.actorId ? 'actorId=' + f.actorId : 'sagaId=' + f.sagaId}`);
                const o = n.genero || n.director || n.actor || n.saga; f.filtroNombre = o ? o.nombre : '';
            } catch (e) { f.filtroNombre = ''; }
        }
        abrirWizard();
    }

    async function asegurarDatos() {
        if (!S.opciones) S.opciones = await api('/opciones');
        if (!S.sellos) { try { S.sellos = await api('/sellos'); } catch (e) { S.sellos = []; } }
    }

    function abrirWizard() {
        const w = S.wiz, edit = !!w.id;
        abrirModal('amWizard', `<div class="modal-header"><h2 id="amWizTitulo">${edit ? 'Editar misión' : 'Nueva misión'}</h2><button class="modal-cerrar" data-am="wiz-cerrar" aria-label="Cerrar"><i class="fas fa-times"></i></button></div>
            <div class="am-pasos" id="amPasos"></div><div class="modal-body" id="amWizBody"></div><div class="modal-footer" id="amWizPie"></div>`);
        renderPaso(true); programarValidacion(0);
    }

    async function cerrarWizard() {
        if (!S.wiz) return;
        if (!S.wiz.sinTocar && !(await confirmar({ titulo: '¿Salir sin guardar?', texto: ['Los cambios que hiciste en el asistente se van a perder.'], ok: 'Salir sin guardar', peligro: true }))) return;
        S.wiz = null; cerrarModal('amWizard');
    }

    // ---- el cuerpo de cada paso
    function renderPaso(cambioPaso) {
        const w = S.wiz; if (!w) return;
        const cuerpoAnt = $('amWizBody'), scroll = cuerpoAnt && !cambioPaso ? cuerpoAnt.scrollTop : 0, ae = document.activeElement;
        let selFoco = null;      // dónde estaba el foco, para devolvérselo al elemento equivalente después de redibujar
        if (!cambioPaso && ae && cuerpoAnt && cuerpoAnt.contains(ae)) selFoco = ae.id ? `#${ae.id}` : ae.dataset.am ? `[data-am="${ae.dataset.am}"]${ae.dataset.v !== undefined ? `[data-v="${String(ae.dataset.v).replace(/"/g, '')}"]` : ''}` : ae.dataset.k ? `[data-k="${ae.dataset.k}"]` : null;
        $('amPasos').innerHTML = TITULOS_PASO.map((t, i) => `<button type="button" class="am-paso${w.paso === i + 1 ? ' act' : ''}${w.paso > i + 1 ? ' hecho' : ''}" ${w.paso > i + 1 ? `data-am="wiz-ir" data-v="${i + 1}"` : 'tabindex="-1"'}><b>${w.paso > i + 1 ? '✓' : i + 1}</b>${t}</button>`).join('');
        const cuerpo = [paso1, paso2, paso3, paso4, paso5][w.paso - 1]();
        $('amWizBody').innerHTML = `<div id="amBanners"></div>${cuerpo}`;
        $('amWizBody').scrollTop = scroll;
        pintarPie(); pintarValidacion();
        if (cambioPaso) { const primero = $('amWizBody').querySelector('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), .am-tipo:not(:disabled)'); if (primero && w.paso !== 5) primero.focus({ preventScroll: true }); }
        else if (selFoco) { const n = $('amWizBody').querySelector(selFoco); if (n) n.focus({ preventScroll: true }); }
    }

    function pintarPie() {
        const w = S.wiz, edit = !!w.id, est = w.detalle ? w.detalle.estado : null, esBorrador = edit && (est === 'BORRADOR' || est === 'PAUSADA');
        let h = `<button class="btn-cancelar" data-am="wiz-cerrar">Cancelar</button>`;
        if (w.paso > 1) h += `<button class="btn-cancelar" data-am="wiz-atras"><i class="fas fa-arrow-left"></i> Atrás</button>`;
        if (w.paso < 5) h += `<button class="btn-guardar" data-am="wiz-sig">Siguiente <i class="fas fa-arrow-right"></i></button>`;
        else if (edit) h += `<button class="btn-guardar" data-am="wiz-guardar" data-publicar="0"><i class="fas fa-save"></i> Guardar cambios</button>${esBorrador ? `<button class="btn-guardar" data-am="wiz-guardar" data-publicar="1" style="background:#2e7d32"><i class="fas fa-play"></i> Guardar y publicar</button>` : ''}`;
        else h += `<button class="btn-cancelar" data-am="wiz-guardar" data-publicar="0"><i class="fas fa-save"></i> Guardar como borrador</button><button class="btn-guardar" data-am="wiz-guardar" data-publicar="1"><i class="fas fa-play"></i> Guardar y publicar</button>`;
        $('amWizPie').innerHTML = h;
    }

    const dis = (campo) => (S.wiz.bloq.has(campo) ? ' disabled' : '');
    const f = () => S.wiz.f;
    const aviso1 = () => (S.wiz.bloq.size ? `<div class="am-banner am-banner-info"><strong>Esta misión ya tiene usuarios con avance (${S.wiz.detalle.enCurso} avanzando, ${S.wiz.detalle.cumplieron} la cumplieron).</strong>No se puede cambiar el tipo, los filtros, la vigencia, la escalera ni el sello que reutiliza: cambiaría el sentido de lo que ya hicieron. Si necesitás otra cosa, duplicala como misión nueva y pausá esta.</div>` : '');

    function paso1() {
        const x = f(), m = metricaDe(x.metrica);
        let h = `${aviso1()}<h3>¿Qué se le pide al usuario?</h3><p class="am-ayuda">Elegí el tipo de misión. Después aparecen solo las opciones que tienen sentido para ese tipo.</p>
            <div class="am-campo"><div class="am-tipos" role="radiogroup" aria-label="Tipo de misión">${S.opciones.metricas.map((t) => `<button type="button" class="am-tipo${x.metrica === t.codigo ? ' sel' : ''}" role="radio" aria-checked="${x.metrica === t.codigo}" data-am="metrica" data-v="${t.codigo}"${dis('metrica')}><strong>${esc(t.etiqueta)}</strong><small>${esc(t.ayuda)}</small></button>`).join('')}</div></div>`;
        if (m && m.tipoContenido) h += `<div class="am-campo"><span class="am-etq">¿Sobre qué?</span><div class="am-seg" role="radiogroup">${[['PELICULA', 'Películas'], ['SERIE', 'Series'], ['', 'Películas y series']].map(([v, t]) => `<button type="button" class="${(x.tipoContenido || '') === v ? 'sel' : ''}" role="radio" aria-checked="${(x.tipoContenido || '') === v}" data-am="tipo" data-v="${v}"${dis('tipoContenido')}>${t}</button>`).join('')}</div></div>`;
        if (m && m.filtrosPelicula && x.tipoContenido === 'PELICULA') h += `<div class="am-campo"><span class="am-etq">Filtrar por (opcional)</span><div class="am-seg">${[['', 'Sin filtro'], ['genero', 'Género'], ['director', 'Director'], ['actor', 'Actor o actriz'], ['saga', 'Saga']].map(([v, t]) => `<button type="button" class="${x.filtroTipo === v ? 'sel' : ''}" data-am="filtro" data-v="${v}"${dis('generoId')}>${t}</button>`).join('')}</div><div id="amPicker">${picker()}</div><p class="am-nota">Se pide un solo filtro por misión. Solo vale para películas.</p></div>`;
        if (m && m.distintas) h += `<div class="am-campo"><label class="am-check"><input type="checkbox" data-k="distintas"${x.distintas ? ' checked' : ''}${dis('distintas')}> Contar solo ${DISTINTAS_TXT[m.codigo] || 'distintos'}</label></div>`;
        return h;
    }

    function picker() {
        const x = f(), t = x.filtroTipo;
        if (!t) return '';
        const idKey = { genero: 'generoId', director: 'directorId', actor: 'actorId', saga: 'sagaId' }[t];
        if (x[idKey]) return `<div style="margin-top:.6rem"><span class="am-chip">${esc(x.filtroNombre || '#' + x[idKey])}${S.wiz.bloq.has(idKey) ? '' : '<button type="button" data-am="quitar-filtro" aria-label="Quitar el filtro">✕</button>'}</span></div>`;
        if (t === 'genero') return `<select data-k="_genero" style="margin-top:.6rem;width:100%;padding:.6rem .9rem;border:1px solid #ddd;border-radius:8px"><option value="">Elegí un género…</option>${(S.generos || []).map((g) => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('')}</select>`;
        const ph = t === 'saga' ? 'Buscá una saga (por ejemplo: Harry Potter)' : t === 'director' ? 'Buscá un director (por ejemplo: Nolan)' : 'Buscá un actor o una actriz (por ejemplo: Meryl)';
        return `<input type="text" data-k="_busca" value="${esc(S.wiz.busca.q)}" placeholder="${ph}" style="margin-top:.6rem;width:100%;padding:.6rem .9rem;border:1px solid #ddd;border-radius:8px" autocomplete="off"><div id="amPickRes">${resultadosPicker()}</div>`;
    }

    function resultadosPicker() {
        const b = S.wiz.busca;
        if (b.cargando) return '<div class="am-pick-res"><div class="am-pick-nada"><i class="fas fa-spinner fa-spin"></i> Buscando…</div></div>';
        if (b.q.trim().length < 2) return '<p class="am-nota">Escribí al menos 2 letras.</p>';
        if (b.error) return `<div class="am-pick-res"><div class="am-pick-nada">${esc(b.error)}</div></div>`;
        if (!b.lista) return '';
        if (!b.lista.length) return '<div class="am-pick-res"><div class="am-pick-nada">No encontramos resultados.</div></div>';
        return `<div class="am-pick-res">${b.lista.map((o, i) => `<button type="button" class="am-pick-item" data-am="pick" data-i="${i}">${o.imagen ? `<img src="${esc(o.imagen)}" alt="">` : '<span class="am-foto"></span>'}<span><strong>${esc(o.nombre)}</strong>${o.detalle ? `<small>${esc(o.detalle)}</small>` : ''}</span></button>`).join('')}</div>`;
    }

    function paso2() {
        const x = f(), m = metricaDe(x.metrica);
        if (!m) return `<h3>¿Cuánto y cuándo?</h3><p class="am-ayuda">Primero elegí qué se le pide en el paso 1.</p>`;
        const sobre = sobreDe();
        let h = `<h3>¿Cuánto y cuándo?</h3><p class="am-ayuda">La meta, cada cuánto se renueva y, si querés, que vaya subiendo de nivel.</p>
            <div class="am-campo"><span class="am-etq">Vigencia</span><div class="am-tipos">${m.vigencias.map((v) => `<button type="button" class="am-tipo${x.vigencia === v ? ' sel' : ''}" data-am="vigencia" data-v="${v}"${dis('vigencia')}><strong>${VIGENCIA[v][0]}</strong><small>${VIGENCIA[v][1]}</small></button>`).join('')}</div></div>`;
        if (m.escalera) h += `<div class="am-campo"><label class="am-check"><input type="checkbox" data-k="escaleraOn"${x.escaleraOn ? ' checked' : ''}${dis('escalera')}> Que suba de nivel (escalera)</label><p class="am-nota">En vez de terminarse, la misión se rearma con una meta mayor y el sello sube de nivel (Nv 1, Nv 2…).</p></div>`;
        if (x.escaleraOn && m.escalera) {
            h += `<div class="am-campo"><span class="am-etq">Tipo de escalera</span><p class="am-nota" style="margin-top:0">${sobre === 'VECES' ? 'Sube de nivel por las <b>veces que se cumplió</b> la misión (cada ' + (x.vigencia === 'SEMANA' ? 'semana' : 'día') + ' que la cumple, suma una vez).' : 'Sube de nivel por el <b>avance acumulado</b>: el conteo no se reinicia al subir.'}</p></div>`;
            if (sobre === 'VECES') h += `<div class="am-campo"><label for="amMeta">Cada ${x.vigencia === 'SEMANA' ? 'semana' : 'día'} hay que lograr (${esc(m.unidad)})</label><input type="number" id="amMeta" data-k="meta" min="1" value="${esc(x.meta)}"${dis('meta')}></div>`;
            h += `<div class="am-dos"><div class="am-campo"><label for="amEsc">${sobre === 'VECES' ? 'Niveles (veces cumplida)' : 'Meta de cada nivel'}</label><input type="text" id="amEsc" data-k="escalera" value="${esc(x.escalera)}" placeholder="${sobre === 'VECES' ? '1, 5, 10, 25, 50' : '10, 25, 50, 100'}"${dis('escalera')}><p class="am-nota">Números que van creciendo, separados por coma.</p></div>
                <div class="am-campo"><label for="amPaso">Después del último, seguir de a (opcional)</label><input type="number" id="amPaso" data-k="escaleraPaso" min="1" value="${esc(x.escaleraPaso)}" placeholder="ej. 250"${dis('escaleraPaso')}><p class="am-nota">Con paso fijo la escalera nunca se termina. Sin paso, termina en el último nivel.</p></div></div><div id="amNiveles">${nivelesHtml()}</div>`;
        } else h += `<div class="am-campo"><label for="amMeta">¿Cuántos ${esc(m.unidad)}?</label><input type="number" id="amMeta" data-k="meta" min="1" max="${m.metaMax}" value="${esc(x.meta)}"${dis('meta')} style="max-width:200px"><p class="am-nota">Máximo ${m.metaMax}.</p></div>`;
        const abierto = x.vigencia === 'EVENTO' || x.desde || x.hasta;
        h += `<div class="am-campo"><span class="am-etq">${x.vigencia === 'EVENTO' ? 'Fechas del evento' : 'Programar inicio o fin (opcional)'}</span><div class="am-dos"><div><label class="am-nota" for="amDesde">Empieza</label><input type="datetime-local" id="amDesde" data-k="desde" value="${esc(x.desde)}"></div><div><label class="am-nota" for="amHasta">Termina</label><input type="datetime-local" id="amHasta" data-k="hasta" value="${esc(x.hasta)}"></div></div>${abierto ? '' : '<p class="am-nota">Si no completás nada, empieza al publicarla y no termina.</p>'}</div>`;
        return h;
    }

    function sobreDe() { const x = f(); return x.escaleraOn ? (x.vigencia === 'HOY' || x.vigencia === 'SEMANA' ? 'VECES' : 'PROGRESO') : ''; }

    function nivelesHtml() {
        const x = f(), n = String(x.escalera || '').split(',').map((s) => parseInt(s, 10)).filter((v) => !isNaN(v));
        if (!n.length) return '';
        const paso = parseInt(x.escaleraPaso, 10), chips = n.map((v, i) => `<span class="am-nivel">Nv ${i + 1}: ${v}</span>`);
        if (paso > 0) for (let i = 1; i <= 3; i++) chips.push(`<span class="am-nivel mas">Nv ${n.length + i}: ${n[n.length - 1] + i * paso}</span>`);
        if (paso > 0) chips.push('<span class="am-nivel mas">…</span>');
        return `<div class="am-niveles">${chips.join('')}</div>`;
    }

    function paso3() {
        const x = f(), edit = !!S.wiz.id, existente = x.selloModo === 'existente';
        let h = `${aviso1()}<h3>Nombre y sello</h3><p class="am-ayuda">Lo que ve el usuario: el nombre de la misión, qué tiene que hacer y el sello que gana.</p>
            <div class="am-campo"><label for="amTitulo">Nombre de la misión <span class="required">*</span></label><input type="text" id="amTitulo" data-k="titulo" maxlength="100" value="${esc(x.titulo)}" placeholder="Ej: Maratón de terror"><div class="am-cont" data-cont="titulo">${x.titulo.length}/100</div></div>
            <div class="am-campo"><label for="amDesc">Lo que se le pide <span class="required">*</span></label><textarea id="amDesc" data-k="descripcion" maxlength="255" placeholder="Ej: Votá 10 películas de terror.">${esc(x.descripcion)}</textarea><div class="am-cont" data-cont="descripcion">${x.descripcion.length}/255</div></div>
            <div class="am-campo"><label for="amCump">Mensaje al cumplirla (opcional)</label><input type="text" id="amCump" data-k="descripcionCumplida" maxlength="160" value="${esc(x.descripcionCumplida)}" placeholder="Ej: Votaste 10 películas de terror."><div class="am-cont" data-cont="descripcionCumplida">${x.descripcionCumplida.length}/160</div></div>
            <hr style="border:none;border-top:1px solid #eee;margin:1.2rem 0"><span class="am-etq">El sello</span>`;
        if (!edit) h += `<div class="am-campo"><div class="am-seg" role="radiogroup"><button type="button" class="${!existente ? 'sel' : ''}" data-am="sello-modo" data-v="nuevo">Crear un sello nuevo</button><button type="button" class="${existente ? 'sel' : ''}" data-am="sello-modo" data-v="existente">Usar uno que ya existe</button></div></div>`;
        if (existente) {
            h += `<div class="am-dos"><div class="am-campo"><label for="amSelloEx">Sello</label><select id="amSelloEx" data-k="selloExistenteId"${dis('selloExistenteId')}><option value="">Elegí un sello…</option>${(S.sellos || []).map((s) => `<option value="${s.id}"${String(x.selloExistenteId) === String(s.id) ? ' selected' : ''}>${esc(s.nombre)} (${s.misiones} ${s.misiones === 1 ? 'misión' : 'misiones'})</option>`).join('')}</select></div>
                <div class="am-campo"><label for="amNivel">Nivel que da esta misión</label><input type="number" id="amNivel" data-k="nivelSello" min="1" max="50" value="${esc(x.nivelSello)}"${dis('nivelSello')}><p class="am-nota">Un mismo sello puede tener varios niveles, uno por misión.</p></div></div>`;
            const ex = (S.sellos || []).find((s) => String(s.id) === String(x.selloExistenteId));
            if (ex) h += `<div class="am-campo" style="display:flex;gap:1rem;align-items:center">${sello(ex, 'ganado', 'g')}<span class="am-nota">«${esc(ex.nombre)}», tal como se ve hoy.</span></div>`;
            return h;
        }
        const compartido = S.wiz.detalle && S.wiz.detalle.sello && S.wiz.detalle.sello.misionesQueLoUsan > 1;
        if (compartido) h += `<div class="am-banner am-banner-av">Este sello lo usan ${S.wiz.detalle.sello.misionesQueLoUsan} misiones: si cambiás su nombre, categoría o imagen, se ve en todas.</div>`;
        h += `<div class="am-sello-ed"><div>
            <div class="am-campo"><label for="amSNombre">Nombre del sello <span class="required">*</span></label><input type="text" id="amSNombre" data-k="selloNombre" maxlength="80" value="${esc(x.selloNombre)}" placeholder="Ej: Maratón de terror"><div class="am-cont" data-cont="selloNombre">${x.selloNombre.length}/80</div></div>
            <div class="am-campo"><label for="amSDesc">Descripción del sello (opcional)</label><input type="text" id="amSDesc" data-k="selloDescripcion" maxlength="255" value="${esc(x.selloDescripcion)}" placeholder="Ej: Votaste 10 películas de terror."></div>
            <div class="am-campo"><span class="am-etq">Categoría (define su color y su ícono) <span class="required">*</span></span><div class="am-cats" role="radiogroup">${CATEGORIAS.map(([c, t]) => `<button type="button" class="am-cat${x.selloCategoria === c ? ' sel' : ''}" role="radio" aria-checked="${x.selloCategoria === c}" data-am="categoria" data-v="${c}">${sello({ categoria: c }, 'ganado', 'p')}${t}</button>`).join('')}</div></div></div>
            <div class="am-sello-lado"><span class="am-etq" style="margin:0">Imagen (opcional)</span>
              <button type="button" class="am-upload${S.wiz.subiendo ? ' cargando' : ''}" data-am="subir" aria-label="Subir imagen del sello">${x.selloImagenUrl ? `<img src="${esc(x.selloImagenUrl)}" alt="Imagen del sello">` : `<span><i class="fas ${S.wiz.subiendo ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}"></i>${S.wiz.subiendo ? 'Subiendo…' : 'Subir imagen'}</span>`}</button>
              <input type="file" id="amArchivo" accept="image/png,image/webp,image/jpeg" style="display:none">
              ${x.selloImagenUrl ? '<button type="button" class="am-link" data-am="quitar-imagen">Quitar imagen</button>' : ''}
              ${S.wiz.errImagen ? `<div class="am-banner am-banner-err" style="margin:0;font-size:.78rem" role="alert">${esc(S.wiz.errImagen)}</div>` : ''}
              <div class="am-guia">PNG, WebP o JPG · cuadrada · de ${S.opciones.imagen.minLado}×${S.opciones.imagen.minLado} a ${S.opciones.imagen.maxLado}×${S.opciones.imagen.maxLado} px · hasta ${S.opciones.imagen.maxKb} KB. Mejor con fondo transparente. Se recorta en círculo.</div>
              <div id="amSelloVivo" style="margin-top:.3rem">${sello({ categoria: x.selloCategoria, imagenUrl: x.selloImagenUrl }, 'ganado', 'xg')}</div></div></div>`;
        return h;
    }

    function paso4() {
        const x = f(), lista = S.todas.filter((m) => m.origen === 'MANUAL' && m.id !== S.wiz.id);
        let h = `${aviso1()}<h3>Visibilidad, audiencia y botón</h3><p class="am-ayuda">Quién la ve, qué tan fácil es y a dónde lleva el botón.</p>
            <div class="am-campo"><span class="am-etq">Visibilidad</span><div class="am-tipos">${Object.entries(VISIBILIDAD).map(([v, [t, d]]) => `<button type="button" class="am-tipo${x.visibilidad === v ? ' sel' : ''}" data-am="visib" data-v="${v}"><strong>${t}</strong><small>${d}</small></button>`).join('')}</div>
              ${x.visibilidad === 'MISTERIOSA' ? `<div style="max-width:260px;margin-top:.6rem"><label class="am-nota" for="amSellosNec">Se revela al juntar (sellos)</label><input type="number" id="amSellosNec" data-k="sellosNecesarios" min="1" max="500" value="${esc(x.sellosNecesarios)}" style="width:100%;padding:.6rem .9rem;border:1px solid #ddd;border-radius:8px"></div>` : ''}</div>
            <div class="am-dos"><div class="am-campo"><span class="am-etq">Audiencia</span><div class="am-seg">${Object.entries(AUDIENCIA).map(([v, t]) => `<button type="button" class="${x.audiencia === v ? 'sel' : ''}" data-am="aud" data-v="${v}">${t}</button>`).join('')}</div>${x.metrica === 'SORTEOS' ? '<p class="am-nota">Los sorteos solo los pueden cumplir los Premium: elegí «Solo Premium».</p>' : ''}</div>
              <div class="am-campo"><span class="am-etq">Dificultad</span><div class="am-seg">${Object.entries(DIFICULTAD).map(([v, [t]]) => `<button type="button" class="${x.dificultad === v ? 'sel' : ''}" data-am="dif" data-v="${v}">${t}</button>`).join('')}</div><p class="am-nota">En el inicio de la app se muestra primero la misión más fácil de cumplir.</p></div></div>
            <div class="am-campo"><label for="amPre">Encadenada (opcional)</label><select id="amPre" data-k="prerrequisitoId"${dis('prerrequisitoId')}><option value="">No: está disponible desde el principio</option>${lista.map((m) => `<option value="${m.id}"${String(x.prerrequisitoId) === String(m.id) ? ' selected' : ''}>Se desbloquea al ganar «${esc(m.titulo)}»</option>`).join('')}</select></div>
            <div class="am-dos"><div class="am-campo"><label for="amAT">Texto del botón (opcional)</label><input type="text" id="amAT" data-k="accionTexto" maxlength="40" value="${esc(x.accionTexto)}" placeholder="Ej: Ir a votar"></div>
              <div class="am-campo"><label for="amAD">A dónde lleva</label><select id="amAD" data-k="accionDestino"><option value="">—</option>${S.opciones.destinos.map((d) => `<option value="${esc(d.codigo)}"${x.accionDestino === d.codigo ? ' selected' : ''}>${esc(d.etiqueta)}</option>`).join('')}</select></div></div>
            <div class="am-campo" style="max-width:220px"><label for="amOrden">Orden (avanzado)</label><input type="number" id="amOrden" data-k="orden" min="0" max="9999" value="${esc(x.orden)}"><p class="am-nota">Desempata entre misiones igual de fáciles. Menor = primero.</p></div>`;
        return h;
    }

    function paso5() {
        const x = f(), m = metricaDe(x.metrica) || { etiqueta: '—', unidad: '' }, sobre = sobreDe();
        const cat = x.selloModo === 'existente' ? ((S.sellos || []).find((s) => String(s.id) === String(x.selloExistenteId)) || {}) : { categoria: x.selloCategoria, imagenUrl: x.selloImagenUrl, nombre: x.selloNombre };
        const meta = x.escaleraOn && sobre !== 'VECES' ? (parseInt(String(x.escalera).split(',')[0], 10) || '?') : (x.meta || '?');
        const nv = x.escaleraOn ? '<span class="nv">Nv 1</span>' : '';
        const filas = [['Tipo', esc(m.etiqueta) + (x.tipoContenido ? ' · ' + (x.tipoContenido === 'PELICULA' ? 'películas' : 'series') : '') + (x.filtroNombre ? ' · ' + esc(x.filtroNombre) : '') + (x.distintas ? ' · distintos' : '')],
            ['Meta', `${meta} ${esc(m.unidad)}${x.escaleraOn ? ' · escalera ' + esc(x.escalera) + (x.escaleraPaso ? ' (+' + esc(x.escaleraPaso) + ' después)' : '') : ''}`],
            ['Vigencia', esc((VIGENCIA[x.vigencia] || ['—'])[0]) + (x.desde ? ' · desde ' + esc(x.desde.replace('T', ' ')) : '') + (x.hasta ? ' · hasta ' + esc(x.hasta.replace('T', ' ')) : '')],
            ['Visibilidad', esc(VISIBILIDAD[x.visibilidad][0]) + (x.visibilidad === 'MISTERIOSA' ? ` (${esc(x.sellosNecesarios)} sellos)` : '')], ['Audiencia', esc(AUDIENCIA[x.audiencia])], ['Dificultad', esc(DIFICULTAD[x.dificultad][0])],
            ['Sello', x.selloModo === 'existente' ? `«${esc(cat.nombre || '?')}» · nivel ${esc(x.nivelSello)}` : esc(x.selloNombre || '—')], ['Botón', x.accionTexto ? `${esc(x.accionTexto)} → ${esc(x.accionDestino)}` : 'sin botón']];
        return `<h3>Vista previa</h3><p class="am-ayuda">Así la va a ver el usuario. Revisala y guardala como borrador o publicala.</p><div id="amBannersFinal"></div>
            <div class="am-prev"><div><h4>La misión</h4><div class="am-prev-card" id="amPrevCard">${sello(cat, 'ganado', 'g')}<div style="flex:1;min-width:0"><div class="am-prev-tags"><span>${esc((VIGENCIA[x.vigencia] || ['—'])[0])}</span>${nv ? '<span class="nv">Nv 1</span>' : ''}${x.filtroNombre ? `<span>${esc(x.filtroNombre)}</span>` : ''}</div>
              <h5>${esc(x.titulo) || 'Sin nombre'}</h5><p>${esc(x.descripcion) || 'Sin descripción'}</p><div class="am-barra"><i></i></div><span class="am-prog">0 de ${esc(meta)}</span>${x.accionTexto ? `<br><span class="am-prev-cta">${esc(x.accionTexto)}</span>` : ''}</div></div>
              <h4 style="margin-top:1.1rem">Resumen</h4><ul class="am-resumen">${filas.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('')}</ul></div>
            <div><h4>El sello en cada tamaño y estado</h4><div class="am-mat" id="amMat"><span></span><span class="am-th">Ganado</span><span class="am-th">Sin ganar</span><span class="am-th">Misterioso</span>
              ${[['Chico', 'p'], ['Mediano', 'm'], ['Grande', 'g'], ['Pantalla de logro', 'xg']].map(([n, t]) => `<span class="am-fila">${n}</span>${sello(cat, 'ganado', t)}${sello(cat, 'apagado', t)}${sello(cat, 'misterioso', t)}`).join('')}</div>
              <p class="am-nota" style="margin-top:.6rem">«Sin ganar» es como se ve en la lista del usuario antes de cumplirla. «Misterioso» no muestra nada del sello: la imagen tampoco.</p></div></div>`;
    }

    // ------------------------------------------------------------------------------------------------ validación en vivo (la hace el servidor)
    function cuerpoApi(paraValidar) {
        const x = f(), n = (v) => (v === '' || v === undefined ? null : v), num = (v) => (v === '' || v == null || isNaN(Number(v)) ? n(v) : Number(v));
        const sobre = sobreDe(), existente = x.selloModo === 'existente';
        const exSel = existente ? (S.sellos || []).find((s) => String(s.id) === String(x.selloExistenteId)) : null;
        const b = { metrica: n(x.metrica), tipoContenido: n(x.tipoContenido), generoId: x.generoId, directorId: x.directorId, sagaId: x.sagaId, actorId: x.actorId, distintas: !!x.distintas,
            meta: x.escaleraOn && sobre !== 'VECES' ? null : num(x.meta), vigencia: n(x.vigencia), desde: n(x.desde), hasta: n(x.hasta), escalera: x.escaleraOn ? n(String(x.escalera).trim()) : null,
            escaleraPaso: x.escaleraOn ? num(x.escaleraPaso) : null, escaleraSobre: x.escaleraOn ? sobre : null, titulo: n(x.titulo), descripcion: n(x.descripcion), descripcionCumplida: n(x.descripcionCumplida),
            categoria: existente ? (exSel ? exSel.categoria : null) : n(x.selloCategoria), visibilidad: n(x.visibilidad), sellosNecesarios: x.visibilidad === 'MISTERIOSA' ? num(x.sellosNecesarios) : null,
            prerrequisitoId: num(x.prerrequisitoId), audiencia: n(x.audiencia), dificultad: n(x.dificultad), orden: num(x.orden), accionTexto: n(x.accionTexto), accionDestino: n(x.accionDestino) };
        if (existente) { b.selloExistenteId = num(x.selloExistenteId); b.nivelSello = num(x.nivelSello); }
        else { b.selloNombre = n(x.selloNombre); b.selloDescripcion = n(x.selloDescripcion); b.selloCategoria = n(x.selloCategoria); b.selloImagenUrl = n(x.selloImagenUrl); }
        if (paraValidar && S.wiz.id) b.misionId = S.wiz.id;
        return b;
    }

    function programarValidacion(ms) { clearTimeout(S.valTimer); S.valTimer = setTimeout(validarAhora, ms === undefined ? 450 : ms); }

    async function validarAhora() {
        clearTimeout(S.valTimer);
        const w = S.wiz; if (!w) return null;
        const seq = ++S.valSeq;
        try {
            const r = await api('/validar', { metodo: 'POST', body: cuerpoApi(true) });
            if (seq !== S.valSeq || S.wiz !== w) return w.res;
            w.res = r; pintarValidacion(); return r;
        } catch (e) { return w.res; }
    }

    const pasoDe = (campo) => { const i = PASOS.findIndex((p) => p.includes(campo)); return i < 0 ? 5 : i + 1; };

    function pintarValidacion() {
        const w = S.wiz; if (!w) return;
        const res = w.res || { errores: [], avisos: [] }, p = w.paso;
        const errPaso = res.errores.filter((e) => (p === 5 ? true : pasoDe(e.campo) === p));
        const visibles = p === 5 || w.ver[p] ? errPaso : [];
        // marcar los campos con error
        document.querySelectorAll('#amWizBody .am-invalid').forEach((e) => e.classList.remove('am-invalid'));
        visibles.forEach((e) => document.querySelectorAll(`#amWizBody [data-k="${e.campo}"]`).forEach((el) => el.classList.add('am-invalid')));
        let h = '';
        if (visibles.length) h += `<div class="am-banner am-banner-err" role="alert"><strong>${p === 5 ? 'Falta corregir esto para poder guardar:' : 'Revisá esto antes de seguir:'}</strong><ul>${visibles.map((e) => `<li>${p === 5 && pasoDe(e.campo) <= 4 ? `<a data-am="wiz-ir" data-v="${pasoDe(e.campo)}">Paso ${pasoDe(e.campo)}</a> · ` : ''}${esc(e.mensaje)}</li>`).join('')}</ul></div>`;
        const avs = res.avisos.filter((a) => (p === 5 ? true : (a.campo !== '' && pasoDe(a.campo) === p)));
        if (avs.length) h += `<div class="am-banner am-banner-av"><strong>Tené en cuenta:</strong><ul>${avs.map((a) => `<li>${esc(a.mensaje)}</li>`).join('')}</ul></div>`;
        const dest = p === 5 ? $('amBannersFinal') : $('amBanners'); if (dest) dest.innerHTML = h; if (p === 5 && $('amBanners')) $('amBanners').innerHTML = '';
    }

    // ------------------------------------------------------------------------------------------------ navegar el asistente
    async function siguiente() {
        const w = S.wiz, r = await validarAhora();
        const hay = r && r.errores.some((e) => pasoDe(e.campo) === w.paso);
        if (hay) { w.ver[w.paso] = true; pintarValidacion(); const b = $('amBanners'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); return; }
        irAPaso(w.paso + 1);
    }
    function irAPaso(n) { const w = S.wiz; if (!w || n < 1 || n > 5) return; w.paso = n; renderPaso(true); }

    async function guardar(publicar) {
        const w = S.wiz, r = await validarAhora();
        if (!r || !r.ok) { w.ver[5] = true; pintarValidacion(); return aviso('Hay datos para corregir antes de guardar.', 'error'); }
        const body = cuerpoApi(false), edit = !!w.id;
        $('amWizPie').querySelectorAll('button').forEach((b) => { b.disabled = true; });
        try {
            const d = edit ? await api(`/${w.id}`, { metodo: 'PUT', body }) : await api('', { metodo: 'POST', body });
            let publicada = false;
            if (publicar) {
                try { await api(`/${d.id}/publicar`, { metodo: 'POST' }); publicada = true; }
                catch (e) { aviso(`Se guardó, pero no se pudo publicar: ${e.message}`, 'error'); }
            }
            aviso(publicada ? 'Misión guardada y publicada.' : (edit ? 'Cambios guardados.' : 'Misión guardada como borrador.'), 'success');
            S.wiz = null; cerrarModal('amWizard'); S.sellos = null; cargarLista();
        } catch (e) {
            pintarPie();
            if (e.data && e.data.errores && e.data.errores.length) { w.res = { ok: false, errores: e.data.errores, avisos: e.data.avisos || [] }; w.ver[5] = true; if (w.paso !== 5) irAPaso(5); else pintarValidacion(); }
            aviso(e.message, 'error');
        }
    }

    // ------------------------------------------------------------------------------------------------ imagen del sello
    async function subirImagen(file) {
        const w = S.wiz, lim = S.opciones.imagen;
        w.errImagen = '';
        if (!file) return;
        if (file.size > lim.maxKb * 1024) { w.errImagen = `La imagen pesa ${Math.round(file.size / 1024)} KB y el máximo es ${lim.maxKb} KB. Comprimila y probá de nuevo.`; return renderPaso(); }
        w.subiendo = true; renderPaso();
        try {
            const fd = new FormData(); fd.append('file', file);
            const r = await api('/imagen', { metodo: 'POST', form: fd });
            w.f.selloImagenUrl = r.url; w.sinTocar = false; programarValidacion(0);
        } catch (e) { w.errImagen = e.message; }
        w.subiendo = false; if (S.wiz === w) renderPaso();
    }

    // ------------------------------------------------------------------------------------------------ buscadores de TMDB
    async function cargarGeneros() {
        if (S.generos) return;
        try { S.generos = await api('/tmdb/generos'); } catch (e) { S.generos = []; aviso('No pudimos cargar los géneros de TMDB.', 'error'); }
        if (S.wiz && S.wiz.paso === 1) { const p = $('amPicker'); if (p) p.innerHTML = picker(); }
    }

    function buscarTmdb(q) {
        const w = S.wiz, b = w.busca, tipo = w.f.filtroTipo;
        b.q = q; b.error = ''; clearTimeout(S.tmdbTimer);
        if (q.trim().length < 2) { b.lista = null; b.cargando = false; const r = $('amPickRes'); if (r) r.innerHTML = resultadosPicker(); return; }
        b.cargando = true; const r0 = $('amPickRes'); if (r0) r0.innerHTML = resultadosPicker();
        S.tmdbTimer = setTimeout(async () => {
            try { const l = await api(`/tmdb/${tipo === 'saga' ? 'sagas' : 'personas'}?q=${encodeURIComponent(q.trim())}`); if (S.wiz !== w || b.q !== q) return; b.lista = l; b.error = ''; }
            catch (e) { if (S.wiz !== w) return; b.lista = null; b.error = e.message; }
            b.cargando = false; const r = $('amPickRes'); if (r) r.innerHTML = resultadosPicker();
        }, 350);
    }

    // ------------------------------------------------------------------------------------------------ eventos del asistente
    function marcarTocado() { if (S.wiz) S.wiz.sinTocar = false; }

    function alCambio(e) {
        const t = e.target;
        if (t.dataset.f || t.dataset.cf) {                  // filtros de la lista y del catálogo
            // Los cuadros de texto reaccionan al escribir y los desplegables al elegir. Si el cuadro también reaccionara al «change» de cuando pierde
            // el foco, volvería a dibujar la tabla en medio de un clic sobre un botón de una fila y ese clic se perdería.
            if (t.tagName === 'INPUT' ? e.type !== 'input' : e.type !== 'change') return;
            if (t.dataset.f) { S.filtros[t.dataset.f] = t.value; S.pagina = 1; return pintarLista(); }
            S.catFiltros[t.dataset.cf] = t.value; return pintarCatalogo();
        }
        if (t.id === 'amArchivo') { subirImagen(t.files && t.files[0]); t.value = ''; return; }
        if (!S.wiz || !t.dataset.k) return;
        const w = S.wiz, x = w.f, k = t.dataset.k;
        if (e.type === 'input' && (t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'datetime-local')) return;     // esos disparan «change»
        marcarTocado();
        if (k === '_busca') { if (e.type === 'input') buscarTmdb(t.value); return; }      // solo mientras se escribe: el «change» de cuando pierde el foco (al hacer clic en un resultado) volvería a buscar y se perdería el clic
        if (k === '_genero') { const g = (S.generos || []).find((o) => String(o.id) === t.value); x.generoId = g ? g.id : null; x.filtroNombre = g ? g.nombre : ''; renderPaso(); return programarValidacion(0); }
        if (t.type === 'checkbox') x[k] = t.checked; else x[k] = t.value;
        if (k === 'escaleraOn' || k === 'selloExistenteId') { renderPaso(); return programarValidacion(0); }
        const cont = document.querySelector(`#amWizBody [data-cont="${k}"]`); if (cont) cont.textContent = `${t.value.length}/${t.maxLength}`;
        if (k === 'escalera' || k === 'escaleraPaso') { const n = $('amNiveles'); if (n) n.innerHTML = nivelesHtml(); }
        if (k === 'selloNombre' || k === 'selloCategoria') { const v = $('amSelloVivo'); if (v) v.innerHTML = sello({ categoria: x.selloCategoria, imagenUrl: x.selloImagenUrl }, 'ganado', 'xg'); }
        programarValidacion(e.type === 'change' ? 0 : 450);
    }

    function alClick(e) {
        const el = e.target.closest('[data-am]'); if (!el) return;
        const a = el.dataset.am, v = el.dataset.v, w = S.wiz;
        const ACC = {
            tab: () => cambiarTab(v), nueva, pagina: () => { S.pagina += Number(v); pintarLista(); },
            editar: () => editar(el.dataset.id), publicar: () => accionLista('publicar', el.dataset.id), pausar: () => accionLista('pausar', el.dataset.id), duplicar: () => accionLista('duplicar', el.dataset.id),
            eliminar: () => accionLista('eliminar', el.dataset.id), historial: () => verHistorial(el.dataset.id), 'cerrar-hist': () => cerrarModal('amHist'),
            'conf-ok': () => resolverConf(true), 'conf-no': () => resolverConf(false),
            'wiz-cerrar': cerrarWizard, 'wiz-atras': () => irAPaso(w.paso - 1), 'wiz-sig': siguiente, 'wiz-ir': () => irAPaso(Number(v)), 'wiz-guardar': () => guardar(el.dataset.publicar === '1'),
            metrica: () => { marcarTocado(); cambiarMetrica(v); },
            tipo: () => { marcarTocado(); w.f.tipoContenido = v || null; if (v !== 'PELICULA') limpiarFiltro(); renderPaso(); programarValidacion(0); },
            filtro: () => { marcarTocado(); limpiarFiltro(); w.f.filtroTipo = v; w.busca = { lista: null, q: '', cargando: false }; if (v === 'genero') cargarGeneros(); renderPaso(); programarValidacion(0); },
            'quitar-filtro': () => { marcarTocado(); const t = w.f.filtroTipo; limpiarFiltro(); w.f.filtroTipo = t; w.busca = { lista: null, q: '', cargando: false }; renderPaso(); programarValidacion(0); },
            pick: () => { const o = w.busca.lista[Number(el.dataset.i)]; if (!o) return; marcarTocado(); const t = w.f.filtroTipo; w.f[{ director: 'directorId', actor: 'actorId', saga: 'sagaId' }[t]] = o.id; w.f.filtroNombre = o.nombre; renderPaso(); programarValidacion(0); },
            vigencia: () => { marcarTocado(); w.f.vigencia = v; renderPaso(); programarValidacion(0); },
            'sello-modo': () => { marcarTocado(); w.f.selloModo = v; renderPaso(); programarValidacion(0); },
            categoria: () => { marcarTocado(); w.f.selloCategoria = v; renderPaso(); programarValidacion(0); },
            visib: () => { marcarTocado(); w.f.visibilidad = v; renderPaso(); programarValidacion(0); },
            aud: () => { marcarTocado(); w.f.audiencia = v; renderPaso(); programarValidacion(0); },
            dif: () => { marcarTocado(); w.f.dificultad = v; renderPaso(); programarValidacion(0); },
            subir: () => { const i = $('amArchivo'); if (i) i.click(); }, 'quitar-imagen': () => { marcarTocado(); w.f.selloImagenUrl = ''; w.errImagen = ''; renderPaso(); programarValidacion(0); },
            // catálogo
            'cat-actualizar': actualizarAhora, 'cat-excluir': () => excluirObjetivo(el.dataset.id, false), 'cat-retirar': () => excluirObjetivo(el.dataset.id, true), 'cat-restaurar': () => restaurarObjetivo(el.dataset.id)
        };
        if (ACC[a]) ACC[a]();
    }

    function limpiarFiltro() { const x = f(); x.generoId = x.directorId = x.sagaId = x.actorId = null; x.filtroNombre = ''; x.filtroTipo = ''; }

    /** Al cambiar el tipo de misión se limpia lo que ese tipo no admite (el servidor lo rechazaría). */
    function cambiarMetrica(cod) {
        const x = f(), m = metricaDe(cod);
        x.metrica = cod;
        if (!m.tipoContenido) x.tipoContenido = null;
        if (!m.filtrosPelicula || x.tipoContenido !== 'PELICULA') limpiarFiltro();
        if (!m.distintas) x.distintas = false;
        if (!m.escalera) { x.escaleraOn = false; x.escalera = ''; x.escaleraPaso = ''; }
        if (!m.vigencias.includes(x.vigencia)) x.vigencia = m.vigencias.length === 1 ? m.vigencias[0] : '';
        if (cod === 'SORTEOS') x.audiencia = 'PREMIUM';
        renderPaso(); programarValidacion(0);
    }

    // ================================================================================================ CATÁLOGO AUTOMÁTICO
    async function cargarCatalogo() {
        $('amCatBody').innerHTML = '<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando catálogo...</td></tr>';
        try { S.cat = await api('/catalogo'); S.act = await api('/catalogo/estado'); } catch (e) { $('amCatBody').innerHTML = `<tr><td colspan="7" class="am-vacio">${esc(e.message)}</td></tr>`; return; }
        pintarCatalogo(); pintarEstadoAct(); if (S.act.corriendo) sondear();
    }

    function pintarCatalogo() {
        if (!S.cat) return;
        $('amCatResumen').innerHTML = S.cat.resumen.map((r) => `<div class="am-fam"><span>${esc(FAMILIAS[r.familia] || r.familia)}</span><strong>${r.total}</strong><small>${r.excluidos} excluidos${r.ultimaActualizacion ? ' · ' + fecha(r.ultimaActualizacion).slice(0, 10) : ''}</small></div>`).join('') || '<p class="am-vacio">El catálogo está vacío. Tocá «Actualizar ahora» para armarlo desde TMDB.</p>';
        const c = S.catFiltros, q = c.q.trim().toLowerCase();
        const lista = S.cat.objetivos.filter((o) => (!c.familia || o.familia === c.familia) && (!q || o.nombre.toLowerCase().includes(q)) && (!c.estado || (c.estado === 'EXCLUIDO' ? o.excluido && !o.retirado : c.estado === 'RETIRADO' ? o.retirado : !o.excluido)));
        $('amCatBody').innerHTML = lista.length ? lista.map((o) => `<tr><td>${esc(FAMILIAS[o.familia] || o.familia)}</td><td><strong>${esc(o.nombre)}</strong><span class="am-sub">TMDB #${o.tmdbId}</span></td><td>${o.meta}</td>
            <td class="am-nums"><b>${o.asignados}</b> la tienen · <b>${o.completados}</b> la completaron · <b>${o.descartados}</b> la descartaron</td>
            <td><span class="badge ${o.retirado ? 'am-b-vencida' : o.excluido ? 'am-b-pausada' : 'badge-activo'}">${o.retirado ? 'Retirado' : o.excluido ? 'Excluido' : 'Activo'}</span></td><td class="am-nums">${fecha(o.actualizadoAt).slice(0, 10)}</td>
            <td><div class="tabla-acciones">${o.excluido ? `<button class="btn-accion btn-activar" data-am="cat-restaurar" data-id="${o.id}" title="Restaurar" aria-label="Restaurar ${esc(o.nombre)}"><i class="fas fa-rotate-left"></i></button>`
                : `<button class="btn-accion btn-desactivar" data-am="cat-excluir" data-id="${o.id}" title="Excluir (no se le ofrece a nadie más)" aria-label="Excluir ${esc(o.nombre)}"><i class="fas fa-ban"></i></button><button class="btn-accion btn-eliminar" data-am="cat-retirar" data-id="${o.id}" title="Excluir y retirar a quienes ya la tienen" aria-label="Excluir y retirar ${esc(o.nombre)}"><i class="fas fa-user-slash"></i></button>`}</div></td></tr>`).join('')
            : '<tr><td colspan="7" class="am-vacio">Ningún objetivo coincide con los filtros.</td></tr>';
    }

    async function excluirObjetivo(id, retirar) {
        const o = S.cat.objetivos.find((x) => x.id === Number(id)); if (!o) return;
        const ok = await confirmar({ titulo: retirar ? `¿Excluir y retirar «${o.nombre}»?` : `¿Excluir «${o.nombre}»?`,
            texto: retirar ? [`Deja de ofrecerse y se le saca a los ${o.asignados} usuarios que hoy la tienen asignada: el sistema les pasa la siguiente.`, 'Se puede restaurar cuando quieras.'] : ['Deja de ofrecerse a quien todavía no la tiene.', `Los ${o.asignados} usuarios que ya la tienen la conservan.`, 'Se puede restaurar cuando quieras.'], ok: retirar ? 'Excluir y retirar' : 'Excluir', peligro: retirar });
        if (!ok) return;
        try { await api(`/catalogo/${id}/excluir`, { metodo: 'POST', body: { retirar } }); aviso(`«${o.nombre}» excluido.`, 'success'); } catch (e) { aviso(e.message, 'error'); }
        cargarCatalogo();
    }

    async function restaurarObjetivo(id) {
        try { await api(`/catalogo/${id}/restaurar`, { metodo: 'POST' }); aviso('Restaurado: vuelve a ofrecerse.', 'success'); } catch (e) { aviso(e.message, 'error'); }
        cargarCatalogo();
    }

    function pintarEstadoAct() {
        const a = S.act, el = $('amActEstado'), b = $('amActBoton'); if (!a || !el) return;
        const err = a.errores && a.errores.length;
        el.classList.toggle('err', !!err && !a.corriendo);
        if (a.corriendo) el.innerHTML = '<i class="fas fa-spinner am-spin"></i> Actualizando desde TMDB… tarda un par de minutos. Podés seguir usando el panel.';
        else if (a.fin) el.innerHTML = `Última actualización: ${fecha(a.fin)}.<br>${esc(a.resultado || '')}${err ? `<br><b>Problemas:</b> ${esc(a.errores.join(' · '))}` : ''}`;
        else el.textContent = 'Todavía no se actualizó desde este panel. Se actualiza sola el día 1 de cada mes a las 4:00.';
        if (b) b.disabled = !!a.corriendo;
    }

    async function actualizarAhora() {
        if (!(await confirmar({ titulo: '¿Actualizar el catálogo ahora?', texto: ['Trae de TMDB las sagas, actores, directores y géneros populares y agrega los que falten. No quita nada del catálogo ni toca lo que ya tienen asignado los usuarios.'], ok: 'Actualizar ahora' }))) return;
        try { await api('/catalogo/actualizar', { metodo: 'POST' }); aviso('Actualización iniciada.', 'success'); S.act = await api('/catalogo/estado'); pintarEstadoAct(); sondear(); }
        catch (e) { aviso(e.message, e.status === 409 ? 'info' : 'error'); }
    }

    function sondear() {
        clearInterval(S.timer);
        S.timer = setInterval(async () => {
            if (S.tab !== 'catalogo') { clearInterval(S.timer); return; }
            try { S.act = await api('/catalogo/estado'); } catch (e) { return; }
            pintarEstadoAct();
            if (!S.act.corriendo) { clearInterval(S.timer); aviso(S.act.errores && S.act.errores.length ? 'La actualización terminó con problemas.' : 'Catálogo actualizado.', S.act.errores && S.act.errores.length ? 'error' : 'success'); cargarCatalogo(); }
        }, 1500);
    }

    return { init, cambiarTab };
})();
window.adminMisiones = adminMisiones;

// Al tocar «Misiones y Sellos» en el menú se arma el módulo. No dependemos de cómo admin.js inicializa los demás: este módulo se engancha solo.
// Red de seguridad: si adminUI.switchSection no mostró la sección (por ejemplo, si solo conoce una lista fija de nombres), se muestra acá.
(function () {
    const li = document.getElementById('sidebarMisiones');
    if (!li) return;
    li.addEventListener('click', () => {
        adminMisiones.init();
        setTimeout(() => {
            const sec = document.getElementById('section-misiones');
            if (sec && !sec.classList.contains('active')) {
                document.querySelectorAll('.admin-section').forEach((s) => s.classList.toggle('active', s === sec));
                document.querySelectorAll('.sidebar-item').forEach((i) => i.classList.toggle('active', i === li));
            }
        }, 0);
    });
})();
