window._soporteYaCargado = false;

window.cambiarTabBandeja = function(tab, btn) {
    document.querySelectorAll('.bandeja-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.bandeja-tab-panel').forEach(p => p.classList.remove('active'));

    const panelId = tab === 'soporte' ? 'bandejaPanelSoporte'
        : tab === 'mensajes' ? 'bandejaPanelMensajes'
        : 'bandejaPanelUsuarios';
    document.getElementById(panelId).classList.add('active');

    if (tab === 'soporte' && !window._soporteYaCargado) {
        window._soporteYaCargado = true;
        consultasCargarLista();
    }
};

// ==============================================
// TAB USUARIOS — recomendaciones recibidas, agrupadas por remitente
// (misma fuente de datos que ya existía: /recommendations/received
// y /series-recommendations/received; acá solo se agrupan distinto).
// ==============================================
window._bandejaGruposUsuarios = [];

window.cargarBandejaUsuarios = async function() {
    const cont = document.getElementById('bandejaUsuariosLista');
    cont.innerHTML = '<div class="consultas-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [resPelRecib, resSerRecib, resPelEnv, resSerEnv] = await Promise.all([
            fetch(`${CONFIG.API_URL}/recommendations/received`, { headers }),
            fetch(`${CONFIG.API_URL}/series-recommendations/received`, { headers }),
            fetch(`${CONFIG.API_URL}/recommendations/sent`, { headers }),
            fetch(`${CONFIG.API_URL}/series-recommendations/sent`, { headers })
        ]);

        // Unifica el nombre del campo "la otra persona" sea cual sea la
        // dirección — recibidas usan sender*, enviadas usan receiver*.
        const recibidasPel = resPelRecib.ok ? (await resPelRecib.json()).map(r => ({ ...r, tipo: 'pelicula', direccion: 'recibida', otroId: r.senderId, otroNombre: r.senderName, otroAvatar: r.senderAvatarUrl })) : [];
        const recibidasSer = resSerRecib.ok ? (await resSerRecib.json()).map(r => ({ ...r, tipo: 'serie', direccion: 'recibida', otroId: r.senderId, otroNombre: r.senderName, otroAvatar: r.senderAvatarUrl })) : [];
        const enviadasPel = resPelEnv.ok ? (await resPelEnv.json()).map(r => ({ ...r, tipo: 'pelicula', direccion: 'enviada', otroId: r.receiverId, otroNombre: r.receiverName, otroAvatar: r.receiverAvatarUrl })) : [];
        const enviadasSer = resSerEnv.ok ? (await resSerEnv.json()).map(r => ({ ...r, tipo: 'serie', direccion: 'enviada', otroId: r.receiverId, otroNombre: r.receiverName, otroAvatar: r.receiverAvatarUrl })) : [];

        const todas = [...recibidasPel, ...recibidasSer, ...enviadasPel, ...enviadasSer];

        if (todas.length === 0) {
            cont.innerHTML = `
                <div class="bandeja-usuarios-vacio">
                    <i class="fas fa-comments"></i>
                    <p>Todavía no tenés conversaciones acá.</p>
                </div>`;
            return;
        }

        // Un canal por persona — mezcla enviadas y recibidas del mismo
        // par de usuarios en un solo grupo, separadas en 2 arrays.
        const gruposMap = new Map();
        todas.forEach(item => {
            const key = item.otroId;
            if (!gruposMap.has(key)) {
                gruposMap.set(key, {
                    otroId: item.otroId,
                    otroNombre: item.otroNombre,
                    otroAvatar: item.otroAvatar,
                    recibidas: [],
                    enviadas: []
                });
            }
            gruposMap.get(key)[item.direccion === 'recibida' ? 'recibidas' : 'enviadas'].push(item);
        });

        const grupos = Array.from(gruposMap.values());
        grupos.forEach(g => {
            g.recibidas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            g.enviadas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });

        // Ordena la lista por el intercambio más reciente, sea cual sea la dirección.
        grupos.sort((a, b) => {
            const ultA = Math.max(a.recibidas[0] ? new Date(a.recibidas[0].createdAt) : 0, a.enviadas[0] ? new Date(a.enviadas[0].createdAt) : 0);
            const ultB = Math.max(b.recibidas[0] ? new Date(b.recibidas[0].createdAt) : 0, b.enviadas[0] ? new Date(b.enviadas[0].createdAt) : 0);
            return ultB - ultA;
        });

        window._bandejaGruposUsuarios = grupos;

        cont.innerHTML = grupos.map((g, i) => {
            const ultimaRecib = g.recibidas[0];
            const ultimaEnv = g.enviadas[0];
            let ultima, direccionTexto;
            if (ultimaRecib && (!ultimaEnv || new Date(ultimaRecib.createdAt) > new Date(ultimaEnv.createdAt))) {
                ultima = ultimaRecib; direccionTexto = 'Te recomendó';
            } else {
                ultima = ultimaEnv; direccionTexto = 'Le recomendaste';
            }
            const titulo = ultima.tipo === 'serie' ? ultima.seriesTitle : ultima.movieTitle;
            const sinVer = g.recibidas.filter(it => !it.seenAt).length;
            const avatar = g.otroAvatar
                ? `<img class="bandeja-usuario-avatar" src="${g.otroAvatar}" alt="">`
                : `<div class="bandeja-usuario-avatar"></div>`;
            return `
                <div class="bandeja-usuario-fila"
                     onclick="window._clickFilaUsuarioBandeja(${i})"
                     ontouchstart="window._iniciarLongPressBandeja(${i})"
                     ontouchend="window._cancelarLongPressBandeja()"
                     ontouchmove="window._cancelarLongPressBandeja()">
                    ${avatar}
                    <div class="bandeja-usuario-info">
                        <p class="bandeja-usuario-nombre">${g.otroNombre || 'Usuario'}</p>
                        <p class="bandeja-usuario-preview">${direccionTexto}: ${titulo || ''}</p>
                    </div>
                    <div class="bandeja-usuario-meta">
                        <span class="bandeja-usuario-fecha">${consultasFormatearFecha(ultima.createdAt)}</span>
                        ${sinVer > 0 ? `<span class="bandeja-usuario-badge">${sinVer}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        cont.innerHTML = '<div class="consultas-vacio">Error al cargar tus mensajes.</div>';
    }
};

window.abrirHiloUsuario = function(idx) {
    const grupo = window._bandejaGruposUsuarios[idx];
    if (!grupo) return;
    window._bandejaHiloActual = grupo;
    window._bandejaSubtabActual = 'recibidas';

    document.getElementById('bandejaUsuariosLista').style.display = 'none';
    document.getElementById('bandejaHiloUsuario').style.display = 'block';

    document.getElementById('bandejaHiloAvatar').src = grupo.otroAvatar || '';
    const nombreEl = document.getElementById('bandejaHiloNombre');
    nombreEl.textContent = grupo.otroNombre || 'Usuario';
    nombreEl.style.cursor = 'pointer';
    nombreEl.onclick = () => window.abrirPerfilUsuario(grupo.otroId);

    document.getElementById('bandejaSubtabBtnRecibidas').classList.add('active');
    document.getElementById('bandejaSubtabBtnEnviadas').classList.remove('active');
    document.getElementById('btnHiloSeleccionar').style.display = 'flex';

    window._pintarHiloUsuario();
};

window._cambiarSubtabHilo = function(subtab) {
    window._bandejaSubtabActual = subtab;
    document.getElementById('bandejaSubtabBtnRecibidas').classList.toggle('active', subtab === 'recibidas');
    document.getElementById('bandejaSubtabBtnEnviadas').classList.toggle('active', subtab === 'enviadas');

    // El modo selección solo existe en Recibidas — es lo único que se
    // puede borrar (no hay endpoint para borrar lo que vos enviaste).
    if (subtab === 'enviadas' && window._bandejaModoSeleccion) {
        window._bandejaModoSeleccion = false;
        window._bandejaSeleccionados.clear();
        document.getElementById('btnHiloSeleccionar').classList.remove('activo');
        document.getElementById('bandejaHiloBarraSeleccion').style.display = 'none';
    }
    document.getElementById('btnHiloSeleccionar').style.display = subtab === 'recibidas' ? 'flex' : 'none';

    window._pintarHiloUsuario();
};

window.volverAListaUsuarios = function() {
    document.getElementById('bandejaHiloUsuario').style.display = 'none';
    document.getElementById('bandejaUsuariosLista').style.display = 'block';
    window.cargarBandejaUsuarios(); // refresca por si cambió algo (vistas/calificaciones)
};

window._bandejaModoSeleccion = false;
window._bandejaSeleccionados = new Set(); // guarda "tipo-id", ej "pelicula-42"

window._actualizarAvisoPendientesBandeja = function() {
    const grupo = window._bandejaHiloActual;
    const aviso = document.getElementById('bandejaHiloAvisoPendientes');
    if (!grupo || !aviso) return;

    const esEnviadas = window._bandejaSubtabActual === 'enviadas';
    const items = esEnviadas ? grupo.enviadas : grupo.recibidas;
    const pendientes = items.filter(it => !it.seenAt).length;

    if (pendientes === 0) {
        aviso.style.display = 'none';
        return;
    }

    if (esEnviadas) {
        aviso.textContent = pendientes === 1
            ? '1 de tus recomendaciones aún no fue marcada como vista.'
            : `${pendientes} de tus recomendaciones aún no fueron marcadas como vistas.`;
    } else {
        aviso.textContent = pendientes === 1
            ? 'Tenés 1 recomendación de película o serie que no marcaste como vista todavía.'
            : `Tenés ${pendientes} recomendaciones de películas o series que no marcaste como vistas todavía.`;
    }
    aviso.style.display = 'block';
};

window._pintarHiloUsuario = function() {
    window._actualizarAvisoPendientesBandeja();

    const grupo = window._bandejaHiloActual;
    const cont = document.getElementById('bandejaHiloItems');
    const esEnviadas = window._bandejaSubtabActual === 'enviadas';
    const items = esEnviadas ? grupo.enviadas : grupo.recibidas;

    if (items.length === 0) {
        cont.innerHTML = `<p style="text-align:center;color:#999;font-size:0.85rem;padding:1.5rem 0;">${esEnviadas ? 'Todavía no le recomendaste nada.' : 'Todavía no te recomendó nada.'}</p>`;
        return;
    }

    cont.innerHTML = items.map(item => {
        const esSerie = item.tipo === 'serie';
        const titulo = esSerie ? item.seriesTitle : item.movieTitle;
        const poster = esSerie ? item.seriesPosterPath : item.moviePosterPath;
        const posterHtml = poster
            ? `<img src="https://image.tmdb.org/t/p/w154${poster}" alt="${titulo || ''}">`
            : '';
        const idContenido = esSerie ? item.seriesId : item.movieId;

        let accion;
        if (esEnviadas) {
            // Solo lectura — no hay endpoint para que quien envía marque
            // vista/califique lo suyo, eso lo hace quien lo recibió.
            if (!item.seenAt) {
                accion = `<p style="font-size:0.78rem;color:#999;margin:0;">Todavía no la vio</p>`;
            } else if (!item.rating) {
                accion = `<p style="font-size:0.78rem;color:#999;margin:0;">La vio, sin calificar</p>`;
            } else {
                accion = `<div class="bandeja-hilo-estrellas solo-lectura">${[1,2,3,4,5].map(n =>
                    `<i class="fas fa-star${n <= item.rating ? ' activa' : ''}"></i>`
                ).join('')}</div>`;
            }
        } else if (!item.seenAt) {
            accion = `<button class="btn-marcar-vista" onclick="window._marcarVistaBandeja(${item.id}, '${item.tipo}')">Marcar como vista</button>`;
        } else if (!item.rating) {
            accion = `<div class="bandeja-hilo-estrellas">${[1,2,3,4,5].map(n =>
                `<i class="fas fa-star" onclick="window._calificarBandeja(${item.id}, '${item.tipo}', ${n})"></i>`
            ).join('')}</div>`;
        } else {
            accion = `<div class="bandeja-hilo-estrellas solo-lectura">${[1,2,3,4,5].map(n =>
                `<i class="fas fa-star${n <= item.rating ? ' activa' : ''}"></i>`
            ).join('')}</div>`;
        }

        const claveSel = `${item.tipo}-${item.id}`;
        const checkbox = (!esEnviadas && window._bandejaModoSeleccion)
            ? `<input type="checkbox" class="bandeja-hilo-checkbox" ${window._bandejaSeleccionados.has(claveSel) ? 'checked' : ''} onchange="window._toggleSeleccionItemBandeja('${claveSel}')">`
            : '';

        return `
            <div class="bandeja-hilo-card">
                ${checkbox}
                <div class="bandeja-hilo-poster" style="cursor:pointer;" onclick="window._abrirFichaRapidaBandeja(${idContenido}, '${item.tipo}')">${posterHtml}</div>
                <div class="bandeja-hilo-card-body">
                    <p class="bandeja-hilo-card-tipo">${esSerie ? '📺 Serie' : '🎬 Película'}</p>
                    <p class="bandeja-hilo-card-titulo" style="cursor:pointer;" onclick="window._abrirFichaRapidaBandeja(${idContenido}, '${item.tipo}')">${titulo || ''}</p>
                    <p class="bandeja-hilo-card-fecha">${consultasFormatearFechaHora(item.createdAt)}</p>
                    ${accion}
                </div>
            </div>`;
    }).join('');
};

window._toggleSeleccionModoBandeja = function() {
    window._bandejaModoSeleccion = !window._bandejaModoSeleccion;
    window._bandejaSeleccionados.clear();
    document.getElementById('btnHiloSeleccionar').classList.toggle('activo', window._bandejaModoSeleccion);
    document.getElementById('bandejaHiloBarraSeleccion').style.display = 'none';
    window._pintarHiloUsuario();
};

window._toggleSeleccionItemBandeja = function(clave) {
    if (window._bandejaSeleccionados.has(clave)) {
        window._bandejaSeleccionados.delete(clave);
    } else {
        window._bandejaSeleccionados.add(clave);
    }
    const n = window._bandejaSeleccionados.size;
    const barra = document.getElementById('bandejaHiloBarraSeleccion');
    barra.style.display = n > 0 ? 'flex' : 'none';
    document.getElementById('bandejaHiloSeleccionCount').textContent = `${n} seleccionada${n === 1 ? '' : 's'}`;
};

window._deleteRecomendacionBackend = async function(id, tipo) {
    const url = tipo === 'serie'
        ? `${CONFIG.API_URL}/series-recommendations/${id}`
        : `${CONFIG.API_URL}/recommendations/${id}`;
    const token = localStorage.getItem('token');
    await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
};

window._ocultarEnviadaBackend = async function(id, tipo) {
    const url = tipo === 'serie'
        ? `${CONFIG.API_URL}/series-recommendations/sent/${id}`
        : `${CONFIG.API_URL}/recommendations/sent/${id}`;
    const token = localStorage.getItem('token');
    await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
};

window._eliminarSeleccionadosBandeja = function() {
    const n = window._bandejaSeleccionados.size;
    if (n === 0) return;

    window._abrirConfirmGenericoBandeja(
        `¿Eliminar ${n} recomendación${n === 1 ? '' : 'es'}? Esta acción no se puede deshacer.`,
        async () => {
                        const grupo = window._bandejaHiloActual;
                        for (const clave of window._bandejaSeleccionados) {
                            const [tipo, idStr] = clave.split('-');
                            const id = parseInt(idStr, 10);
                            await window._deleteRecomendacionBackend(id, tipo);
                            grupo.recibidas = grupo.recibidas.filter(it => !(it.tipo === tipo && it.id === id));
                        }

                        window._bandejaSeleccionados.clear();
                        window._bandejaModoSeleccion = false;
                        document.getElementById('btnHiloSeleccionar').classList.remove('activo');
                        document.getElementById('bandejaHiloBarraSeleccion').style.display = 'none';

                        window._pintarHiloUsuario();
        }
    );
};
window._eliminarConversacionBandeja = function() {
    const grupo = window._bandejaHiloActual;
    if (grupo.recibidas.length === 0 && grupo.enviadas.length === 0) return;
    window._abrirConfirmGenericoBandeja(
        `¿Estás seguro de eliminar todo el chat de recomendaciones con ${grupo.otroNombre}? Vas a dejar de verlo de tu lado — ${grupo.otroNombre} conserva su parte intacta.`,
        async () => {
            for (const item of grupo.recibidas) {
                await window._deleteRecomendacionBackend(item.id, item.tipo);
            }
            for (const item of grupo.enviadas) {
                await window._ocultarEnviadaBackend(item.id, item.tipo);
            }
            window.volverAListaUsuarios();
        }
    );
};

window._marcarVistaBandeja = function(id, tipo) {
    const nombre = window._bandejaHiloActual?.senderName || 'esta persona';
    window._abrirConfirmGenericoBandeja(
        `Una vez marcada como vista, no vas a poder volver atrás — y a ${nombre} le va a llegar el aviso de que la viste. ¿Confirmás?`,
        async () => {
            const url = tipo === 'serie'
                ? `${CONFIG.API_URL}/series-recommendations/${id}/seen`
                : `${CONFIG.API_URL}/recommendations/${id}/seen`;
            try {
                const token = localStorage.getItem('token');
                await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                const item = window._bandejaHiloActual.recibidas.find(it => it.id === id && it.tipo === tipo);
                if (item) item.seenAt = new Date().toISOString();
                window._pintarHiloUsuario();
            } catch (e) {}
        },
        'Sí, ya la vi'
    );
};

window._calificarBandeja = async function(id, tipo, rating) {
    const url = tipo === 'serie'
        ? `${CONFIG.API_URL}/series-recommendations/${id}/rate`
        : `${CONFIG.API_URL}/recommendations/${id}/rate`;
    try {
        const token = localStorage.getItem('token');
        await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
        const item = window._bandejaHiloActual.recibidas.find(it => it.id === id && it.tipo === tipo);
        if (item) item.rating = rating;
        window._pintarHiloUsuario();
    } catch (e) {}
};

window._abrirFichaRapidaBandeja = async function(id, tipo) {
    const modal = document.getElementById('bandejaFichaRapida');
    const body = document.getElementById('bandejaFichaRapidaBody');
    body.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i></div>';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const url = tipo === 'serie'
        ? `${CONFIG.API_URL}/series/${id}`
        : `${CONFIG.API_URL}/movies/${id}`;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const d = await res.json();

        const titulo = tipo === 'serie' ? d.name : d.title;
        const posterHtml = d.poster_path
            ? `<img class="bandeja-ficha-poster" src="https://image.tmdb.org/t/p/w300${d.poster_path}" alt="${titulo || ''}">`
            : '';

        body.innerHTML = `
            ${posterHtml}
            <p class="bandeja-ficha-titulo">${titulo || ''}</p>
            <p class="bandeja-ficha-tipo">${tipo === 'serie' ? '📺 Serie' : '🎬 Película'}</p>
            <p class="bandeja-ficha-overview">${d.overview || 'Sin sinopsis disponible.'}</p>
            <button class="bandeja-ficha-cerrar" onclick="window._cerrarFichaRapidaBandeja()">Cerrar</button>
        `;
    } catch (e) {
        body.innerHTML = '<p style="text-align:center;color:#999;padding:1rem;">No se pudo cargar. Probá de nuevo.</p>';
    }
};

window._cerrarFichaRapidaBandeja = function() {
    document.getElementById('bandejaFichaRapida').style.display = 'none';
    document.body.style.overflow = '';
};

// ==============================================
// LONG-PRESS PARA ELIMINAR CHAT (mobile) — mantener presionada la
// fila en la lista, patrón estándar de mensajería. touchstart arranca
// un timer de 550ms; si se suelta o se mueve el dedo antes (scroll),
// se cancela y queda como un tap normal (abre el hilo).
// ==============================================
window._bandejaLongPressTimer = null;
window._bandejaLongPressDisparado = false;
window._bandejaChatAEliminarIdx = null;

window._iniciarLongPressBandeja = function(idx) {
    window._bandejaLongPressDisparado = false;
    window._bandejaLongPressTimer = setTimeout(() => {
        window._bandejaLongPressDisparado = true;
        if (navigator.vibrate) navigator.vibrate(30); // feedback táctil sutil, si el dispositivo lo soporta
        window._confirmarEliminarChatBandeja(idx);
    }, 550);
};

window._cancelarLongPressBandeja = function() {
    clearTimeout(window._bandejaLongPressTimer);
};

window._clickFilaUsuarioBandeja = function(idx) {
    if (window._bandejaLongPressDisparado) {
        // Ya se disparó el long-press — este click es el "fantasma"
        // que dispara el touch al soltar, no un tap real. Se ignora.
        window._bandejaLongPressDisparado = false;
        return;
    }
    window.abrirHiloUsuario(idx);
};

// Modal de confirmación genérico — un mensaje + una acción a
// ejecutar si se confirma. Reusado por las 3 vías de borrado.
window._bandejaConfirmCallback = null;

window._abrirConfirmGenericoBandeja = function(mensaje, callback, textoBoton) {
    document.getElementById('bandejaConfirmGenericoTexto').textContent = mensaje;
    document.getElementById('bandejaConfirmGenericoBtnOk').textContent = textoBoton || 'Eliminar';
    window._bandejaConfirmCallback = callback;
    document.getElementById('bandejaConfirmGenerico').style.display = 'flex';
};

window._cerrarConfirmGenericoBandeja = function() {
    document.getElementById('bandejaConfirmGenerico').style.display = 'none';
    window._bandejaConfirmCallback = null;
};

window._ejecutarConfirmGenericoBandeja = function() {
    const cb = window._bandejaConfirmCallback;
    window._cerrarConfirmGenericoBandeja();
    if (cb) cb();
};

window._confirmarEliminarChatBandeja = function(idx) {
    const grupo = window._bandejaGruposUsuarios[idx];
    if (!grupo || (grupo.recibidas.length === 0 && grupo.enviadas.length === 0)) return;
    window._abrirConfirmGenericoBandeja(
        `¿Estás seguro de eliminar todo el chat de recomendaciones con ${grupo.otroNombre || 'este usuario'}? Vas a dejar de verlo de tu lado — ${grupo.otroNombre || 'la otra persona'} conserva su parte intacta.`,
        async () => {
            for (const item of grupo.recibidas) {
                await window._deleteRecomendacionBackend(item.id, item.tipo);
            }
            for (const item of grupo.enviadas) {
                await window._ocultarEnviadaBackend(item.id, item.tipo);
            }
            window.cargarBandejaUsuarios();
        }
    );
};

// ========== MIS CONSULTAS ==========

let consultasTicketActualId = null;
let consultasPaginaActual = 0;
let consultasTotalPaginas = 1;

// ========== SANITIZACIÓN UNIVERSAL (para input del usuario) ==========
function sanitizeUserInput(input) {
    if (!input) return '';

    // Convierte TODOS los caracteres no ASCII a entidades HTML
    return String(input).replace(/[^\x00-\x7F]/g, function(match) {
        const code = match.codePointAt(0);
        return `&#${code};`;
    })
    // Luego escapa los caracteres HTML peligrosos
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(str) {
    if (!str) return '';
    return sanitizeUserInput(str).replace(/\n/g, '<br>').replace(/\r/g, '');
}

// ========== SANITIZACIÓN PARA CONTENIDO DEL SISTEMA (mensajes automáticos) ==========
// Solo escapa caracteres HTML peligrosos, sin tocar acentos ni caracteres especiales
function escapeHtmlSafe(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '');
}

// ========== TRUNCAR TEXTOS ==========
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Función para sanitizar números/IDs
function sanitizeNumber(value) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
}

// ── Inicialización ────────────────────────────────────────────────────────────
window['init_mis-consultas'] = function() {
    window.cargarBandejaUsuarios();
};

// ── Cargar lista de tickets ───────────────────────────────────────────────────
async function consultasCargarLista(page = 0) {
    const lista = document.getElementById('consultasLista');
    if (!lista) return;

    lista.innerHTML = '<div class="consultas-loading"><i class="fas fa-spinner fa-spin"></i> Cargando consultas...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/me?page=${page}&size=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        consultasPaginaActual = data.currentPage;
        consultasTotalPaginas = data.totalPages;

        if (data.tickets.length === 0 && page === 0) {
            lista.innerHTML = `
                <div class="consultas-vacio">
                    <i class="fas fa-inbox"></i>
                    <p>No tenés consultas todavía.</p>
                    <p style="font-size:0.85rem; margin-top:0.5rem;">Usá el botón "Nueva consulta" para contactarnos.</p>
                </div>`;
            consultasRenderPaginacion();
            return;
        }

        lista.innerHTML = data.tickets.map(t => {
            // Usar escapeHtmlSafe para el asunto (puede venir del sistema)
            const subject = escapeHtmlSafe(t.subject);
            const lastMessage = escapeHtmlSafe((t.lastMessage || 'Sin mensajes').replace(/\n/g, ' ').replace(/\r/g, ''));
            const status = t.status === 'OPEN' ? 'abierto' : 'cerrado';
            const statusIcon = t.status === 'OPEN' ? 'fa-comment-dots' : 'fa-lock';
            const fecha = consultasFormatearFecha(t.lastMessageAt || t.createdAt);
            const noLeidoClass = t.unreadCount > 0 ? 'no-leido' : '';

            return `
                <div class="ticket-item ${noLeidoClass}" onclick="consultasAbrirHilo(${sanitizeNumber(t.id)})">
                    <div class="ticket-icono ${status}">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-asunto" title="${subject}">
                            <span style="font-size:0.75rem;color:#999;font-weight:400;margin-right:0.4rem;">Ticket #${sanitizeNumber(t.id)}</span>${truncateText(subject, 60)}
                        </div>
                        <div class="ticket-preview" title="${lastMessage}">${truncateText(lastMessage, 100)}</div>
                    </div>
                    <div class="ticket-meta">
                        <span class="ticket-fecha">${escapeHtmlSafe(fecha)}</span>
                        ${t.unreadCount > 0
                            ? `<span class="ticket-badge-unread">${sanitizeNumber(t.unreadCount)}</span>`
                            : `<span class="ticket-estado ${status}">${status === 'abierto' ? 'Abierto' : 'Cerrado'}</span>`
                        }
                    </div>
                    <button class="ticket-eliminar" onclick="event.stopPropagation(); consultasEliminarTicket(${sanitizeNumber(t.id)})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        consultasRenderPaginacion();

    } catch (error) {
        lista.innerHTML = '<div class="consultas-vacio"><i class="fas fa-exclamation-circle"></i><p>Error al cargar las consultas.</p></div>';
    }
}

// ── Abrir hilo de un ticket ───────────────────────────────────────────────────
async function consultasAbrirHilo(ticketId) {
    consultasTicketActualId = ticketId;

    document.getElementById('consultasLista').closest('.consultas-lista-section').style.display = 'none';
    const hiloSection = document.getElementById('consultasHiloSection');
    hiloSection.style.display = 'block';

    document.getElementById('hiloAsunto').textContent = 'Cargando...';
    document.getElementById('hiloMensajes').innerHTML = '<div class="consultas-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/${ticketId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const ticket = await response.json();

        // Usar textContent para el asunto — no necesita HTML
        document.getElementById('hiloAsunto').textContent = `Ticket #${ticketId} — ${ticket.subject}`;

        const statusEl = document.getElementById('hiloStatus');
        statusEl.textContent = ticket.status === 'OPEN' ? 'Abierto' : 'Cerrado';
        statusEl.className = `hilo-status ${ticket.status === 'OPEN' ? 'abierto' : 'cerrado'}`;

        // Renderizar mensajes
        const mensajesEl = document.getElementById('hiloMensajes');
        if (!ticket.messages || ticket.messages.length === 0) {
            mensajesEl.innerHTML = '<div class="consultas-vacio">Sin mensajes aún.</div>';
        } else {
            mensajesEl.innerHTML = ticket.messages.map(m => {
                const senderName = m.senderType === 'ADMIN'
                    ? escapeHtmlSafe(m.senderName || 'Soporte')
                    : escapeHtml(m.senderName || 'Vos');

                // Mensajes del sistema/admin: escapeHtmlSafe (preserva acentos)
                // Mensajes del usuario: escapeHtml (sanitización completa)
                const content = m.senderType === 'ADMIN'
                    ? escapeHtmlSafe(m.content)
                    : escapeHtml(m.content);

                const fecha = consultasFormatearFechaHora(m.createdAt);
                const bubbleClass = m.senderType === 'USER' ? 'usuario' : 'admin';

                return `
                    <div class="mensaje-burbuja ${bubbleClass}">
                        <div class="mensaje-nombre">${senderName}</div>
                        <div class="mensaje-texto">${content}</div>
                        <div class="mensaje-fecha">${escapeHtmlSafe(fecha)}</div>
                    </div>
                `;
            }).join('');
            mensajesEl.scrollTop = mensajesEl.scrollHeight;
        }

        const isOpen = ticket.status === 'OPEN';
        document.getElementById('hiloResponder').style.display = isOpen ? 'block' : 'none';
        document.getElementById('hiloCerradoAviso').style.display = isOpen ? 'none' : 'flex';

        if (typeof window.actualizarBadgeNotificaciones === 'function') {
            window.actualizarBadgeNotificaciones();
        }

    } catch (error) {
        document.getElementById('hiloMensajes').innerHTML = '<div class="consultas-vacio">Error al cargar los mensajes.</div>';
    }
}

// ── Volver a la lista ─────────────────────────────────────────────────────────
function consultasVolverALista() {
    consultasTicketActualId = null;
    document.getElementById('consultasHiloSection').style.display = 'none';
    document.getElementById('consultasLista').closest('.consultas-lista-section').style.display = 'block';
    document.getElementById('hiloTexto').value = '';
    document.getElementById('hiloCount').textContent = '0';
    consultasCargarLista();
}

// ── Enviar mensaje en hilo ────────────────────────────────────────────────────
async function consultasEnviarMensaje() {
    const textoEl = document.getElementById('hiloTexto');
    const texto = textoEl.value;
    const textoSinEspacios = texto.replace(/\s/g, '');

    if (!texto.trim() || textoSinEspacios.length < 10) {
        textoEl.style.borderColor = '#e50914';
        showToast('warning', 'El mensaje debe tener al menos 10 caracteres (sin espacios).');
        textoEl.focus();
        return;
    }

    textoEl.style.borderColor = '#e0e0e0';
    const btn = document.querySelector('.btn-enviar-hilo');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/${consultasTicketActualId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: texto })
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        textoEl.value = '';
        document.getElementById('hiloCount').textContent = '0';
        await consultasAbrirHilo(consultasTicketActualId);
        showToast('success', 'Mensaje enviado correctamente.');

    } catch (error) {
        showToast('error', 'Error al enviar el mensaje. Intentá nuevamente.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar';
    }
}

// ── Eliminar ticket ───────────────────────────────────────────────────────────
async function consultasEliminarTicket(ticketId) {
    if (!confirm('¿Querés eliminar esta consulta? Esta acción no se puede deshacer.')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
                showToast('success', 'Consulta eliminada correctamente.');
                consultasCargarLista();
                if (typeof window.actualizarBadgeNotificaciones === 'function') {
                    window.actualizarBadgeNotificaciones();
                }

            } catch (error) {
                showToast('error', 'Error al eliminar la consulta.');
            }
        }

// ── Modal nueva consulta ──────────────────────────────────────────────────────
function consultasAbrirNueva() {
    document.getElementById('nuevaConsultaOverlay').style.display = 'flex';
    document.body.classList.add('modal-open');
    document.getElementById('nuevaConsultaAsunto').value = '';
    document.getElementById('nuevaConsultaTexto').value = '';
    document.getElementById('nuevaConsultaCount').textContent = '0';
    document.getElementById('nuevaConsultaAsuntoCount').textContent = '0';
    setTimeout(() => document.getElementById('nuevaConsultaAsunto').focus(), 100);
}

function consultasCerrarNueva(event) {
    if (event && event.target !== document.getElementById('nuevaConsultaOverlay')) return;
    document.getElementById('nuevaConsultaOverlay').style.display = 'none';
    document.body.classList.remove('modal-open');
}

async function consultasEnviarNueva() {
    const asunto = document.getElementById('nuevaConsultaAsunto').value.trim();
    const texto = document.getElementById('nuevaConsultaTexto').value;
    const textoSinEspacios = texto.replace(/\s/g, '');

    if (!asunto) {
        document.getElementById('nuevaConsultaAsunto').style.borderColor = '#e50914';
        showToast('warning', 'El asunto es obligatorio.');
        document.getElementById('nuevaConsultaAsunto').focus();
        return;
    }
    if (asunto.length > 60) {
        document.getElementById('nuevaConsultaAsunto').style.borderColor = '#e50914';
        showToast('warning', 'El asunto no puede superar los 60 caracteres.');
        document.getElementById('nuevaConsultaAsunto').focus();
        return;
    }
    document.getElementById('nuevaConsultaAsunto').style.borderColor = '#e0e0e0';

    if (!texto.trim() || textoSinEspacios.length < 10) {
        document.getElementById('nuevaConsultaTexto').style.borderColor = '#e50914';
        showToast('warning', 'El mensaje debe tener al menos 10 caracteres (sin espacios).');
        return;
    }

    document.getElementById('nuevaConsultaTexto').style.borderColor = '#e0e0e0';

    const btn = document.getElementById('btnEnviarNueva');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/support/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subject: asunto,
                message: texto
            })
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        document.getElementById('nuevaConsultaOverlay').style.display = 'none';
                document.body.classList.remove('modal-open');
                showToast('success', '¡Consulta enviada! Te responderemos a la brevedad.');
        consultasCargarLista();

    } catch (error) {
        showToast('error', 'Error al enviar la consulta. Intentá nuevamente.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

function consultasRenderPaginacion() {
    let paginacion = document.getElementById('consultasPaginacion');
    if (!paginacion) {
        const seccion = document.querySelector('.consultas-lista-section');
        if (!seccion) return;
        paginacion = document.createElement('div');
        paginacion.id = 'consultasPaginacion';
        paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
        seccion.appendChild(paginacion);
    }

    if (consultasTotalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }

    paginacion.style.display = 'flex';
    paginacion.innerHTML = `
        <button onclick="consultasCargarLista(${consultasPaginaActual - 1})"
            ${consultasPaginaActual === 0 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span style="font-size:0.9rem; color:#666;">
            Página ${consultasPaginaActual + 1} de ${consultasTotalPaginas}
        </span>
        <button onclick="consultasCargarLista(${consultasPaginaActual + 1})"
            ${consultasPaginaActual >= consultasTotalPaginas - 1 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
function consultasFormatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const diff = hoy - fecha;
    if (diff < 86400000) {
        return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function consultasFormatearFechaHora(fechaStr) {
    if (!fechaStr) return '';
    return new Date(fechaStr).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}