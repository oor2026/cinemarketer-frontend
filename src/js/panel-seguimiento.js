// ==============================================
// panel-seguimiento.js — Panel de seguimiento (solo Creator activo)
// Lo carga module-loader.js; el punto de entrada es window['init_panel-seguimiento'].
// Datos: GET /api/creator/panel/{summary,timeline,publications,status,insights,publications/{id}}
// Sin librerías: los gráficos son SVG armado a mano.
// ==============================================

(function () {

    const BASE = `${(window.CONFIG && window.CONFIG.API_URL) || ''}/creator/panel`;

    const S = {
        dias: 28,
        orden: 'recent',
        serie: 'visualizaciones',
        navId: 0,
        resumen: null,
        timeline: [],
        publicaciones: [],
        estado: null,
        insights: null
    };

    const SERIES = [
        { key: 'visualizaciones', label: 'Visualizaciones' },
        { key: 'alcance', label: 'Alcance' },
        { key: 'bancos', label: 'Te banco' },
        { key: 'puntos', label: 'Merecés un punto' },
        { key: 'comentarios', label: 'Comentarios' },
        { key: 'compartidos', label: 'Compartidos' }
    ];

    const TARJETAS = [
        { key: 'visualizaciones', label: 'Visualizaciones', icono: 'fa-eye', serie: true,
          ayuda: 'Veces que se vieron tus publicaciones, incluidas las visitas a la página pública.' },
        { key: 'alcance', label: 'Alcance', icono: 'fa-user-friends', serie: true,
          ayuda: 'Personas con cuenta, distintas, que vieron tus publicaciones.' },
        { key: 'bancos', label: 'Te banco', icono: 'fa-heart', serie: true,
          ayuda: 'Reacciones "Te banco" que recibiste de otras personas en el período.' },
        { key: 'puntos', label: 'Merecés un punto', icono: 'fa-star', serie: true,
          ayuda: 'Reacciones "Merecés un punto" que recibiste de otras personas en el período.' },
        { key: 'comentarios', label: 'Comentarios', icono: 'fa-comment', serie: true,
          ayuda: 'Comentarios de otras personas en tus publicaciones (incluye respuestas).' },
        { key: 'compartidos', label: 'Compartidos (clics)', icono: 'fa-share-alt', serie: true,
          ayuda: 'Veces que alguien tocó "Compartir". Mide la intención: no podemos saber si finalmente lo compartió.' },
        { key: 'publicaciones', label: 'Publicaciones', icono: 'fa-pen-alt', serie: false,
          ayuda: 'Publicaciones activas que creaste en el período.' }
    ];

    const TERRITORIOS = {
        PELICULAS_SERIES: 'Películas y series', LO_QUE_VIENE: 'Lo que se viene', GENTE_CINE: 'Gente de cine',
        PREMIOS: 'Premios y reconocimientos', INDUSTRIA: 'Industria y negocio', EXPERIENCIA: 'La experiencia cinéfila',
        ARTE_CULTURA: 'Arte y cultura', EVENTOS: 'Eventos y comunidad'
    };
    const TONOS = {
        OPINION: 'Opinión', RESENA: 'Reseña', DEBATE: 'Debate', LISTA: 'Lista',
        CONFESION: 'Confesión', CURIOSIDAD: 'Curiosidad', PREDICCION: 'Predicción', SPOILER: 'Spoiler'
    };
    const FORMATOS = { TEXTO: 'Solo texto', IMAGEN: 'Con imagen', VIDEO: 'Con video' };
    const ICONO_FORMATO = { TEXTO: 'fa-align-left', IMAGEN: 'fa-image', VIDEO: 'fa-video' };
    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    // ------------------------------------------------------------------ utilidades
    const $ = id => document.getElementById(id);
    const esc = v => String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const num = n => Number(n || 0).toLocaleString('es-AR');
    const pct = n => `${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;

    // 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS' -> '20 nov' (sin pasar por Date: no hay corrimientos de zona horaria)
    function fmtDia(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
        return m ? `${parseInt(m[3], 10)} ${MESES[parseInt(m[2], 10) - 1]}` : '';
    }
    function fmtDiaAnio(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
        return m ? `${parseInt(m[3], 10)} ${MESES[parseInt(m[2], 10) - 1]} ${m[1]}` : '';
    }

    function nombreTerritorio(k) { return TERRITORIOS[k] || (k ? String(k).replace(/_/g, ' ').toLowerCase() : 'Sin definir'); }
    function nombreTono(k) { return TONOS[k] || (k ? String(k).replace(/_/g, ' ').toLowerCase() : 'Sin definir'); }

    async function pedir(ruta) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BASE}/${ruta}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) {
            ['token', 'userEmail', 'userRole', 'userPoints', 'userId', 'userName', 'userLevel', 'userAvatarUrl', 'userPremium', 'userCreator', 'isDemo']
                .forEach(c => localStorage.removeItem(c));
            sessionStorage.clear();
            window.location.replace('login.html');
            const e = new Error('401'); e.status = 401; throw e;
        }
        if (!res.ok) { const e = new Error(String(res.status)); e.status = res.status; throw e; }
        return res.json();
    }

    // ------------------------------------------------------------------ navegación
    window.psVolver = function () {
        const miId = localStorage.getItem('userId');
        if (miId && typeof window.abrirPerfilUsuario === 'function') window.abrirPerfilUsuario(miId);
        else if (typeof window.loadModule === 'function') window.loadModule('perfil', null);
    };

    window.psCambiarPeriodo = function (dias) {
        if (S.dias === dias) return;
        S.dias = dias;
        cargarTodo();
    };

    // ------------------------------------------------------------------ carga
    function mostrarAviso(html) {
        const a = $('psAviso'); const c = $('psContenido');
        if (c) c.style.display = 'none';
        if (a) { a.style.display = 'flex'; a.innerHTML = html; }
    }

    function marcarPeriodo() {
        document.querySelectorAll('#psPeriodos .ps-periodo').forEach(b => {
            b.classList.toggle('activo', parseInt(b.dataset.dias, 10) === S.dias);
        });
    }

    async function cargarTodo() {
        const miNav = ++S.navId;
        marcarPeriodo();
        const yaHabiaDatos = !!S.resumen && $('psContenido') && $('psContenido').style.display !== 'none';
        if (!yaHabiaDatos) {
            mostrarAviso('<img src="assets/images/icon-512.png" alt="Cinemarketer pensando" class="ps-aviso-img"><span>Cargando tu panel...</span>');
        } else {
            $('psContenido').style.opacity = '0.55';
        }
        try {
            const d = S.dias;
            const [resumen, timeline, publicaciones, estado, insights] = await Promise.all([
                pedir(`summary?days=${d}`),
                pedir(`timeline?days=${d}`),
                pedir(`publications?days=${d}&sort=${encodeURIComponent(S.orden)}`),
                pedir(`status?days=${d}`),
                pedir(`insights?days=${d}`)
            ]);
            if (miNav !== S.navId || !$('psRoot')) return; // llegó otra pedido, o el usuario ya se fue
            S.resumen = resumen; S.timeline = timeline; S.publicaciones = publicaciones;
            S.estado = estado; S.insights = insights;
            pintarTodo();
        } catch (e) {
            if (miNav !== S.navId || !$('psRoot')) return;
            if (e.status === 403) {
                const der = document.querySelector('#psRoot .ps-topbar-der');
                if (der) der.style.display = 'none';
                mostrarAviso(`
                    <i class="fas fa-lock ps-aviso-icono"></i>
                    <h3>Este panel es para Creators</h3>
                    <p>Necesitás una suscripción Creator activa para ver el seguimiento de tus publicaciones.</p>
                    <button type="button" class="ps-boton" onclick="window.psVolver()">Volver a Mi Sala</button>`);
            } else {
                mostrarAviso(`
                    <i class="fas fa-exclamation-circle ps-aviso-icono"></i>
                    <h3>No pudimos cargar tu panel</h3>
                    <p>Probá de nuevo en unos segundos.</p>
                    <button type="button" class="ps-boton" onclick="window.psReintentar()">Reintentar</button>`);
            }
        }
    }
    window.psReintentar = function () { S.resumen = null; cargarTodo(); };

    function pintarTodo() {
        $('psAviso').style.display = 'none';
        const c = $('psContenido'); c.style.display = 'block'; c.style.opacity = '';
        const r = S.resumen;
        $('psRango').textContent = `${fmtDiaAnio(r.desde)} – ${fmtDiaAnio(r.hasta)}`;
        pintarKpis();
        pintarChips();
        pintarGrafico();
        pintarTabla();
        pintarInsights();
        pintarEstado();
    }

    // ------------------------------------------------------------------ tarjetas
    function delta(actual, previo) {
        actual = Number(actual || 0); previo = Number(previo || 0);
        if (actual === 0 && previo === 0) return { cls: 'igual', txt: 'Sin actividad' };
        if (previo === 0) return { cls: 'sube', txt: '▲ Nuevo' };
        const p = Math.round(((actual - previo) / previo) * 100);
        if (p === 0) return { cls: 'igual', txt: '= Igual' };
        return p > 0 ? { cls: 'sube', txt: `▲ ${p}%` } : { cls: 'baja', txt: `▼ ${Math.abs(p)}%` };
    }

    function sparkline(key) {
        const vals = S.timeline.map(d => Number(d[key] || 0));
        if (vals.length < 2 || Math.max(...vals) === 0) return '<svg class="ps-spark" viewBox="0 0 84 26" aria-hidden="true"></svg>';
        const w = 84, h = 26, pad = 2, max = Math.max(...vals);
        const pts = vals.map((v, i) => `${(i / (vals.length - 1) * (w - pad * 2) + pad).toFixed(1)},${(h - pad - (v / max) * (h - pad * 2)).toFixed(1)}`);
        return `<svg class="ps-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="#324C89" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    }

    // Suma o resta días a una fecha 'YYYY-MM-DD' sin pasar por zonas horarias.
    function sumarDias(iso, n) {
        const [y, m, d] = iso.split('-').map(Number);
        const f = new Date(Date.UTC(y, m - 1, d + n));
        return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
    }
    // Visualizaciones, alcance y compartidos se registran recién desde "medicionDesde".
    const METRICAS_NUEVAS = ['visualizaciones', 'alcance', 'compartidos'];

    function pintarKpis() {
        const r = S.resumen; const a = r.actual || {}; const p = r.anterior || {};
        const medicion = r.medicionDesde || null;
        // Si el período anterior empieza antes de que se midiera, comparar contra "0" sería engañoso.
        const anteriorIncompleto = !!medicion && medicion > sumarDias(r.desde, -S.dias);
        const aviso = $('psMedicion');
        if (aviso) {
            const actualIncompleto = !!medicion && medicion > r.desde;
            aviso.style.display = actualIncompleto ? '' : 'none';
            aviso.textContent = actualIncompleto
                ? `Las visualizaciones, el alcance y los compartidos se miden desde el ${fmtDiaAnio(medicion)}. Antes de esa fecha no hay datos, por eso pueden verse más bajos que tus Te banco y comentarios.`
                : '';
        }
        let html = TARJETAS.map(t => {
            const d = (anteriorIncompleto && METRICAS_NUEVAS.includes(t.key))
                ? { cls: 'igual', txt: 'Sin datos previos', corto: true }
                : delta(a[t.key], p[t.key]);
            return `
            <div class="ps-kpi" data-k="${t.key}">
                <div class="ps-kpi-etiqueta"><i class="fas ${t.icono}"></i><span class="ps-kpi-nombre">${esc(t.label)}</span><span class="ps-kpi-ayuda" title="${esc(t.ayuda)}"><i class="fas fa-info-circle"></i></span></div>
                <div class="ps-kpi-fila">
                    <div class="ps-kpi-valor">${num(a[t.key])}</div>
                    ${t.serie ? sparkline(t.key) : ''}
                </div>
                <div class="ps-kpi-pie">
                    <span class="ps-delta ${d.cls}">${esc(d.txt)}${d.corto ? '' : ` <small>vs. ${S.dias} días previos</small>`}</span>
                </div>
            </div>`;
        }).join('');

        // Seguidores: total + los que ganaste en el período
        const nuevos = Number(a.seguidoresNuevos || 0);
        html += `
            <div class="ps-kpi" data-k="seguidores">
                <div class="ps-kpi-etiqueta"><i class="fas fa-user-plus"></i><span class="ps-kpi-nombre">Seguidores</span><span class="ps-kpi-ayuda" title="Total de personas que te siguen hoy y cuántas se sumaron en el período."><i class="fas fa-info-circle"></i></span></div>
                <div class="ps-kpi-fila"><div class="ps-kpi-valor">${num(r.seguidoresTotal)}</div></div>
                <div class="ps-kpi-pie">
                    <span class="ps-delta ${nuevos > 0 ? 'sube' : 'igual'}">${nuevos > 0 ? '+' : ''}${num(nuevos)} <small>en ${S.dias} días</small></span>
                </div>
            </div>`;
        $('psKpis').innerHTML = html;
        $('psKpisNota').textContent = `Las variaciones comparan con los ${S.dias} días anteriores.`;
    }

    // ------------------------------------------------------------------ gráfico
    function pintarChips() {
        $('psSerieChips').innerHTML = SERIES.map(s =>
            `<button type="button" class="ps-chip${s.key === S.serie ? ' activo' : ''}" onclick="window.psElegirSerie('${s.key}')">${esc(s.label)}</button>`
        ).join('');
    }
    window.psElegirSerie = function (key) { S.serie = key; pintarChips(); pintarGrafico(); };

    function techoBonito(max) {
        if (max <= 4) return 4;
        const pot = Math.pow(10, Math.floor(Math.log10(max)));
        const f = max / pot;
        const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
        return n * pot;
    }

    // Dibuja una serie diaria dentro de "cont". datos: [{dia, <clave>}]
    function dibujarSerie(cont, datos, clave, etiquetaSerie) {
        const total = datos.reduce((s, d) => s + Number(d[clave] || 0), 0);
        if (!datos.length || total === 0) {
            cont.innerHTML = '<div class="ps-vacio">Todavía no hay actividad de este tipo en el período elegido.</div>';
            return;
        }
        const W = Math.max(cont.clientWidth || 700, 280), H = Math.max(cont.clientHeight || 240, 160);
        const m = { l: 38, r: 12, t: 12, b: 26 };
        const iw = W - m.l - m.r, ih = H - m.t - m.b;
        const vals = datos.map(d => Number(d[clave] || 0));
        const top = techoBonito(Math.max(...vals));
        const x = i => m.l + (datos.length === 1 ? iw / 2 : (i / (datos.length - 1)) * iw);
        const y = v => m.t + ih - (v / top) * ih;

        let grilla = '';
        for (let i = 0; i <= 4; i++) {
            const v = (top / 4) * i, yy = y(v);
            grilla += `<line class="grilla" x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}"/><g class="eje"><text x="${m.l - 8}" y="${yy + 4}" text-anchor="end">${Number.isInteger(v) ? num(v) : v.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</text></g>`;
        }
        const idxEtiquetas = datos.length <= 7 ? datos.map((_, i) => i) : [0, Math.round((datos.length - 1) / 3), Math.round((datos.length - 1) * 2 / 3), datos.length - 1];
        const etiquetas = [...new Set(idxEtiquetas)].map(i =>
            `<g class="eje"><text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === datos.length - 1 ? 'end' : 'middle'}">${esc(fmtDia(datos[i].dia))}</text></g>`).join('');

        const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        const area = `${x(0).toFixed(1)},${y(0)} ${pts.join(' ')} ${x(datos.length - 1).toFixed(1)},${y(0)}`;

        cont.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(etiquetaSerie)} por día">
                ${grilla}${etiquetas}
                <polygon class="area" points="${area}"/>
                <polyline class="linea" points="${pts.join(' ')}"/>
                <line class="guia" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" style="display:none"/>
                <circle class="punto" r="4.5" cx="0" cy="0" style="display:none"/>
            </svg>
            <div class="ps-tooltip" style="display:none"></div>`;

        const svg = cont.querySelector('svg'), guia = svg.querySelector('.guia'),
              punto = svg.querySelector('.punto'), tip = cont.querySelector('.ps-tooltip');
        function mover(ev) {
            const rect = svg.getBoundingClientRect();
            const px = (ev.clientX - rect.left) * (W / rect.width);
            let i = Math.round(((px - m.l) / iw) * (datos.length - 1));
            i = Math.max(0, Math.min(datos.length - 1, i));
            const cx = x(i), cy = y(vals[i]);
            guia.setAttribute('x1', cx); guia.setAttribute('x2', cx); guia.style.display = '';
            punto.setAttribute('cx', cx); punto.setAttribute('cy', cy); punto.style.display = '';
            tip.innerHTML = `${esc(fmtDiaAnio(datos[i].dia))}<br><b>${num(vals[i])}</b> ${esc(etiquetaSerie.toLowerCase())}`;
            tip.style.display = 'block';
            // El globito no se sale de la pantalla en los extremos del gráfico.
            const mitad = tip.offsetWidth / 2;
            const izq = Math.min(Math.max((cx / W) * rect.width, mitad), Math.max(mitad, rect.width - mitad));
            tip.style.left = `${izq}px`;
            tip.style.top = `${(cy / H) * rect.height}px`;
        }
        function ocultar() { guia.style.display = 'none'; punto.style.display = 'none'; tip.style.display = 'none'; }
        svg.addEventListener('mousemove', mover);
        svg.addEventListener('mouseleave', ocultar);
        svg.addEventListener('touchstart', e => mover(e.touches[0]), { passive: true });
        svg.addEventListener('touchmove', e => mover(e.touches[0]), { passive: true });
    }

    function pintarGrafico() {
        const def = SERIES.find(s => s.key === S.serie) || SERIES[0];
        dibujarSerie($('psGrafico'), S.timeline, def.key, def.label);
    }

    // ------------------------------------------------------------------ tabla de publicaciones
    function celda(n) { return n > 0 ? `<span class="ps-num-fuerte">${num(n)}</span>` : '<span class="ps-num-cero">0</span>'; }

    function pintarTabla() {
        const cont = $('psTabla');
        if (!S.publicaciones.length) {
            cont.innerHTML = '<div class="ps-vacio">Todavía no tenés publicaciones activas para mostrar.</div>';
            return;
        }
        const th = (key, label, ordenable) => {
            const activo = ordenable && S.orden === key;
            return `<th class="${ordenable ? 'ordenable' : ''}${activo ? ' orden-activo' : ''}" ${ordenable ? `onclick="window.psOrdenar('${key}')" title="Ordenar por ${esc(label)}"` : ''}>${esc(label)}${activo ? ' ↓' : ''}</th>`;
        };
        const sel = $('psOrdenMovil'); if (sel) sel.value = S.orden;
        const mini = (v, l) => `<div class="ps-mini${v > 0 ? '' : ' cero'}"><b>${num(v)}</b><span>${esc(l)}</span></div>`;
        const tarjetas = S.publicaciones.map(p => {
            const herr = (p.herramientas || []).map(h => `<span class="ps-etiqueta herramienta">${esc(h)}</span>`).join('');
            return `
            <div class="ps-pubcard" onclick="window.psAbrirDetalle(${Number(p.id)})">
                <div class="ps-pub-titulo">${esc(p.titulo || '(Sin título)')}</div>
                <div class="ps-pub-meta">
                    <span>${esc(fmtDia(p.creadaEn))}</span>
                    <span class="ps-etiqueta"><i class="fas ${ICONO_FORMATO[p.formato] || 'fa-align-left'}"></i>${esc(FORMATOS[p.formato] || '')}</span>
                    <span class="ps-etiqueta">${esc(nombreTerritorio(p.territorio))}</span>
                    ${herr}
                </div>
                <div class="ps-pubcard-nums">
                    ${mini(p.visualizaciones, 'Vistas')}${mini(p.alcance, 'Alcance')}${mini(p.compartidos, 'Compart.')}
                    ${mini(p.bancos, 'Te banco')}${mini(p.puntos, 'Punto')}${mini(p.comentarios, 'Coment.')}
                </div>
            </div>`;
        }).join('');
        const filas = S.publicaciones.map(p => {
            const herr = (p.herramientas || []).map(h => `<span class="ps-etiqueta herramienta">${esc(h)}</span>`).join('');
            return `
            <tr onclick="window.psAbrirDetalle(${Number(p.id)})">
                <td>
                    <div class="ps-pub-titulo">${esc(p.titulo || '(Sin título)')}</div>
                    <div class="ps-pub-meta">
                        <span>${esc(fmtDia(p.creadaEn))}</span>
                        <span class="ps-etiqueta"><i class="fas ${ICONO_FORMATO[p.formato] || 'fa-align-left'}"></i>${esc(FORMATOS[p.formato] || '')}</span>
                        <span class="ps-etiqueta">${esc(nombreTerritorio(p.territorio))}</span>
                        ${herr}
                    </div>
                </td>
                <td>${celda(p.visualizaciones)}</td>
                <td>${celda(p.alcance)}</td>
                <td>${celda(p.bancos)}</td>
                <td>${celda(p.puntos)}</td>
                <td>${celda(p.comentarios)}</td>
                <td>${celda(p.compartidos)}</td>
            </tr>`;
        }).join('');
        cont.innerHTML = `
            <table class="ps-tabla">
                <thead><tr>
                    ${th('recent', 'Publicación', true)}${th('visualizaciones', 'Vistas', true)}${th('alcance', 'Alcance', false)}
                    ${th('bancos', 'Te banco', true)}${th('puntos', 'Punto', true)}${th('comentarios', 'Coment.', true)}${th('compartidos', 'Compart.', false)}
                </tr></thead>
                <tbody>${filas}</tbody>
            </table>
            <div class="ps-pubcards">${tarjetas}</div>`;
    }

    window.psOrdenar = async function (key) {
        if (S.orden === key) return;
        S.orden = key;
        const miNav = S.navId;
        try {
            const pubs = await pedir(`publications?days=${S.dias}&sort=${encodeURIComponent(S.orden)}`);
            if (miNav !== S.navId || !$('psRoot')) return;
            S.publicaciones = pubs;
            pintarTabla();
        } catch (e) { /* queda la tabla anterior */ }
    };

    // ------------------------------------------------------------------ lo que te funciona mejor
    function bloqueInsight(titulo, lista, nombre) {
        if (!lista || !lista.length) return '';
        const max = Math.max(...lista.map(i => i.promedioInteracciones), 0);
        const hayMejor = lista.length > 1 && max > 0;
        const filas = lista.slice(0, 4).map((i, idx) => {
            const ancho = max > 0 ? Math.max(4, Math.round((i.promedioInteracciones / max) * 100)) : 0;
            const mejor = hayMejor && idx === 0;
            return `
            <div class="ps-ins-fila${mejor ? ' mejor' : ''}">
                <span class="ps-ins-nombre">${esc(nombre(i.etiqueta))}${mejor ? '<span class="ps-ins-mejor">Mejor</span>' : ''}</span>
                <span class="ps-ins-valor">${i.promedioInteracciones.toLocaleString('es-AR')} <small>por pub. · ${num(i.publicaciones)} pub.</small></span>
                <div class="ps-ins-barra"><span style="width:${ancho}%"></span></div>
            </div>`;
        }).join('');
        return `<div class="ps-ins-bloque"><h4 class="ps-ins-titulo">${esc(titulo)}</h4>${filas}</div>`;
    }

    function pintarInsights() {
        const i = S.insights;
        const cont = $('psInsights');
        if (!i || !i.publicacionesAnalizadas) {
            cont.innerHTML = '<div class="ps-vacio">Cuando tengas publicaciones activas vas a ver acá qué tipo funciona mejor.</div>';
            return;
        }
        cont.innerHTML =
            bloqueInsight('Por tema', i.porTerritorio, nombreTerritorio) +
            bloqueInsight('Por tono', i.porTono, nombreTono) +
            bloqueInsight('Por formato', i.porFormato, k => FORMATOS[k] || k) +
            `<p class="ps-ins-nota">Se mide en interacciones promedio por publicación (Te banco + Merecés un punto + comentarios).${i.publicacionesAnalizadas < 5 ? ' Con pocas publicaciones los promedios son orientativos.' : ''}</p>`;
    }

    // ------------------------------------------------------------------ estado de tus publicaciones
    const ESTADOS = [
        { key: 'ACTIVA', label: 'Activas', cls: 'activa' },
        { key: 'PENDIENTE', label: 'Pendientes de revisión', cls: 'pendiente' },
        { key: 'PROCESANDO', label: 'Video en procesamiento', cls: 'procesando' },
        { key: 'RECHAZADA', label: 'Rechazadas por moderación', cls: 'rechazada' },
        { key: 'OCULTA_AUTOR', label: 'Ocultas por vos', cls: '' },
        { key: 'OCULTA_MODERACION', label: 'Ocultas por moderación', cls: 'rechazada' }
    ];
    const CAMPOS_BLOQUEO = { TITULO: 'el título', CONTENIDO: 'el contenido', HASHTAGS: 'los hashtags', TRIVIA: 'las opciones de la trivia' };

    function pintarEstado() {
        const e = S.estado; const cont = $('psEstado');
        if (!e) { cont.innerHTML = ''; return; }
        const c = e.conteo || {};
        const total = ESTADOS.reduce((s, x) => s + Number(c[x.key] || 0), 0);
        if (!total && !(e.bloqueosFiltro && e.bloqueosFiltro.total)) {
            cont.innerHTML = '<div class="ps-vacio">Todavía no hay publicaciones para mostrar.</div>';
            return;
        }
        // "Activas" se muestra siempre; el resto solo si tiene algo.
        const lista = ESTADOS.filter(x => x.key === 'ACTIVA' || Number(c[x.key] || 0) > 0).map(x => `
            <li><span class="ps-estado-nombre"><span class="ps-punto ${x.cls}"></span>${esc(x.label)}</span><span class="ps-estado-n">${num(c[x.key])}</span></li>`).join('');

        let bloqueo = '';
        const b = e.bloqueosFiltro;
        if (b && b.total > 0) {
            const partes = (b.porCampo || []).map(f => `${num(f.cantidad)} por ${esc(CAMPOS_BLOQUEO[f.campo] || 'el contenido')}`).join(', ');
            bloqueo = `<div class="ps-estado-bloqueo"><b>${num(b.total)} ${b.total === 1 ? 'intento frenado' : 'intentos frenados'}</b> por el filtro de palabras en este período (${partes}). Esos textos nunca llegaron a publicarse.</div>`;
        }

        let detalle = '';
        const items = e.items || [];
        if (items.length) {
            const etiquetaEstado = k => (ESTADOS.find(x => x.key === k) || { label: k }).label;
            detalle = `
            <details class="ps-estado-detalle">
                <summary>Ver publicaciones que no están activas (${items.length})</summary>
                <ul class="ps-estado-items">
                    ${items.map(i => `<li><span class="t">${esc(i.titulo || '(Sin título)')}</span><span class="m">${esc(etiquetaEstado(i.estado))} · ${esc(fmtDiaAnio(i.creadaEn))}</span></li>`).join('')}
                </ul>
            </details>`;
        }
        cont.innerHTML = `<ul class="ps-estado-lista">${lista}</ul>${bloqueo}${detalle}`;
        // En mobile este bloque sube (justo después del gráfico) cuando hay algo que mirar.
        const hayAlgo = ['PENDIENTE', 'RECHAZADA', 'OCULTA_MODERACION'].some(k => Number(c[k] || 0) > 0)
            || !!(b && b.total > 0);
        const card = cont.closest('.ps-estado-card');
        if (card) card.classList.toggle('ps-estado-alerta', hayAlgo);
    }

    // ------------------------------------------------------------------ detalle de una publicación
    window.psAbrirDetalle = async function (id) {
        const modal = $('psModal'); const cont = $('psModalContenido');
        if (!modal || !cont) return;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        cont.innerHTML = '<div class="ps-aviso"><img src="assets/images/icon-512.png" alt="Cinemarketer pensando" class="ps-aviso-img"><span>Cargando...</span></div>';
        try {
            const d = await pedir(`publications/${id}?days=${S.dias}`);
            if (!$('psRoot') || modal.style.display === 'none') return;
            cont.innerHTML = htmlDetalle(d);
            dibujarSerie($('psDetGrafico'), d.timeline || [], 'visualizaciones', 'Visualizaciones');
        } catch (e) {
            cont.innerHTML = `<div class="ps-aviso"><i class="fas fa-exclamation-circle ps-aviso-icono"></i><h3>No pudimos abrir el detalle</h3><p>Puede que la publicación ya no esté activa.</p></div>`;
        }
    };

    function htmlDetalle(d) {
        const herr = (d.herramientas || []).map(h => `<span class="ps-etiqueta herramienta">${esc(h)}</span>`).join('');
        const kpi = (l, v) => `<div class="ps-det-kpi"><span>${esc(l)}</span><b>${num(v)}</b></div>`;
        let html = `
            <h3 class="ps-det-titulo" id="psModalTitulo">${esc(d.titulo || '(Sin título)')}</h3>
            <div class="ps-det-meta">
                <span>Publicada el ${esc(fmtDiaAnio(d.creadaEn))}</span>
                <span class="ps-etiqueta"><i class="fas ${ICONO_FORMATO[d.formato] || 'fa-align-left'}"></i>${esc(FORMATOS[d.formato] || '')}</span>
                <span class="ps-etiqueta">${esc(nombreTerritorio(d.territorio))}</span>
                <span class="ps-etiqueta">${esc(nombreTono(d.tono))}</span>${herr}
            </div>
            <div class="ps-det-kpis">
                ${kpi('Visualizaciones', d.visualizaciones)}${kpi('Alcance', d.alcance)}${kpi('Compartidos (clics)', d.compartidos)}
                ${kpi('Te banco', d.bancos)}${kpi('Merecés un punto', d.puntos)}${kpi('Comentarios', d.comentarios)}
            </div>
            <div class="ps-det-sub">Visualizaciones por día <small>últimos ${d.dias} días</small></div>
            <div class="ps-grafico ps-det-grafico" id="psDetGrafico"></div>`;

        if (d.votacionDetalle) {
            const v = d.votacionDetalle;
            const max = Math.max(...v.opciones.map(o => o.votos), 0);
            html += `<div class="ps-det-sub">Votación <small>${num(v.totalVotos)} ${v.totalVotos === 1 ? 'voto' : 'votos'}, sin contar los tuyos</small></div>` +
                v.opciones.map(o => `
                <div class="ps-barra-fila">
                    <div class="ps-barra-cab"><span class="n">${esc(o.texto)}</span><span class="v">${num(o.votos)} · ${pct(o.porcentaje)}</span></div>
                    <div class="ps-barra"><span style="width:${max > 0 ? Math.max(2, o.porcentaje) : 0}%"></span></div>
                </div>`).join('');
        }
        if (d.triviaDetalle) {
            const t = d.triviaDetalle;
            html += `<div class="ps-det-sub">Trivia <small>${num(t.totalRespuestas)} ${t.totalRespuestas === 1 ? 'respuesta' : 'respuestas'} · <b>${pct(t.porcentajeAcierto)}</b> de acierto</small></div>` +
                t.opciones.map(o => `
                <div class="ps-barra-fila${o.correcta ? ' correcta' : ''}">
                    <div class="ps-barra-cab"><span class="n">${esc(o.texto)}${o.correcta ? '<span class="ps-ok"><i class="fas fa-check"></i> Correcta</span>' : ''}</span><span class="v">${num(o.respuestas)} · ${pct(o.porcentaje)}</span></div>
                    <div class="ps-barra"><span style="width:${t.totalRespuestas > 0 ? Math.max(2, o.porcentaje) : 0}%"></span></div>
                </div>`).join('');
        }
        return html;
    }

    window.psCerrarDetalle = function (ev) {
        if (ev && ev.target && ev.target.id !== 'psModal') return;
        const modal = $('psModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    // Esc cierra el detalle. El listener se quita solo cuando el módulo ya no está en pantalla.
    function onTecla(ev) {
        if (!$('psRoot')) { document.removeEventListener('keydown', onTecla); document.body.style.overflow = ''; return; }
        if (ev.key === 'Escape') window.psCerrarDetalle(null);
    }

    // El selector de período fijo (mobile) tiene que quedar justo debajo del header de la app,
    // pero solo si ese header es fijo; si se va con el scroll, no hay que dejarle lugar.
    function ajustarTopSticky() {
        const root = $('psRoot'); if (!root) return;
        const nb = document.querySelector('.navbar');
        let top = 0;
        if (nb) {
            const pos = getComputedStyle(nb).position;
            if (pos === 'fixed' || pos === 'sticky') top = Math.max(0, Math.round(nb.getBoundingClientRect().bottom));
        }
        root.style.setProperty('--ps-top', `${top}px`);
    }

    // Si cambia el ancho de la ventana, se redibuja el gráfico (es SVG con medidas en píxeles).
    let _resizeTimer = null;
    function onResize() {
        if (!$('psRoot')) { window.removeEventListener('resize', onResize); return; }
        ajustarTopSticky();
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => { if (S.resumen) pintarGrafico(); }, 150);
    }

    // ------------------------------------------------------------------ punto de entrada
    window['init_panel-seguimiento'] = function () {
        S.dias = 28; S.orden = 'recent'; S.serie = 'visualizaciones';
        S.resumen = null; S.timeline = []; S.publicaciones = []; S.estado = null; S.insights = null;
        document.removeEventListener('keydown', onTecla);
        document.addEventListener('keydown', onTecla);
        window.removeEventListener('resize', onResize);
        window.addEventListener('resize', onResize);
        ajustarTopSticky();
        cargarTodo();
    };
})();