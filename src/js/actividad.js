// ==============================================
// actividad.js — Centro de actividad (landing pública de una campaña de juego)
// Dirección: /actividad?c=slug-de-la-campania
// ==============================================
(function () {
    'use strict';

    const API = CONFIG.API_URL;
    // La campaña llega en ?c=slug. También se acepta #c=slug: en producción el
    // servidor redirige "actividad.html" a "actividad" y en ese salto pierde el
    // "?c=", pero el navegador conserva lo que va después del "#".
    const slugDeLaDireccion = new URLSearchParams(location.search).get('c');
    const slug = (slugDeLaDireccion || new URLSearchParams(location.hash.slice(1)).get('c') || '').trim().toLowerCase();
    if (slug && !slugDeLaDireccion) {
        history.replaceState(null, '', `${location.pathname}?c=${encodeURIComponent(slug)}`);
    }
    const AR = '-03:00'; // las fechas del servidor vienen en hora de Argentina, sin zona

    const estado = {
        landing: null,
        desfaseMs: 0,     // hora del servidor − hora del dispositivo
        relojes: [],      // intervalos de las cuentas regresivas
        partida: null,
        timerPregunta: null,
        respondiendo: false,
        pestania: null    // pestaña elegida en el celular (ranking / premio / como)
    };

    // ------------------------------------------
    // Utilidades
    // ------------------------------------------
    const $ = id => document.getElementById(id);

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function token() {
        try { return localStorage.getItem('token'); } catch (e) { return null; }
    }

    // ---- Campañas sin registro: el navegador recuerda quién se anotó ----
    // cmJuego:<slug>       → { token, nombre } del participante de esta campaña
    // cmJuegoEmail:<slug>  → el email con que se anotó desde este dispositivo
    //                        (no deja anotar otro email desde acá)
    const CLAVE_JUEGO = `cmJuego:${slug}`;
    const CLAVE_EMAIL = `cmJuegoEmail:${slug}`;

    function participante() {
        try { return JSON.parse(localStorage.getItem(CLAVE_JUEGO)) || null; } catch (e) { return null; }
    }

    function guardarParticipante(datos, email) {
        try {
            localStorage.setItem(CLAVE_JUEGO, JSON.stringify({ token: datos.token, nombre: datos.nombre }));
            localStorage.setItem(CLAVE_EMAIL, email.trim().toLowerCase());
        } catch (e) { /* sin almacenamiento */ }
    }

    function olvidarParticipante() {
        try { localStorage.removeItem(CLAVE_JUEGO); } catch (e) { /* nada */ }
    }

    function emailDeEsteDispositivo() {
        try { return localStorage.getItem(CLAVE_EMAIL); } catch (e) { return null; }
    }

    const sinRegistro = () => !!(estado.landing && estado.landing.campania.modoAcceso === 'SIN_REGISTRO');

    // Con cuenta: /juegos/... con el login. Sin registro: /public/juegos/...?t=token
    function rutaJuego(accion) {
        const base = encodeURIComponent(slug);
        if (!sinRegistro()) return `/juegos/${base}/${accion}`;
        const p = participante();
        return `/public/juegos/${base}/${accion}${p ? `?t=${encodeURIComponent(p.token)}` : ''}`;
    }

    async function pedir(ruta, opciones = {}) {
        const headers = {};
        const t = opciones.sinToken ? null : token();
        if (t) headers['Authorization'] = `Bearer ${t}`;
        if (opciones.body !== undefined) headers['Content-Type'] = 'application/json';
        const res = await fetch(API + ruta, {
            method: opciones.method || 'GET',
            headers,
            body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined
        });
        let cuerpo = null;
        try { cuerpo = await res.json(); } catch (e) { /* sin cuerpo */ }
        if (!res.ok) {
            const error = new Error((cuerpo && (cuerpo.message || cuerpo.error)) || 'Algo salió mal. Probá de nuevo.');
            error.status = res.status;
            throw error;
        }
        return cuerpo;
    }

    const fecha = iso => new Date(String(iso).slice(0, 19) + AR);
    const ahoraServidor = () => Date.now() + estado.desfaseMs;

    function fechaLarga(iso) {
        return fecha(iso).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric',
            month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        }).replace(',', ' a las') + ' h';
    }

    function fechaCorta(iso) {
        return fecha(iso).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        }) + ' h';
    }

    // 3200 → "3,2 s"; 75000 → "1 min 15 s"
    function tiempo(ms) {
        const s = Math.max(0, ms) / 1000;
        if (s < 60) return s.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' s';
        const min = Math.floor(s / 60);
        return `${min} min ${String(Math.round(s - min * 60)).padStart(2, '0')} s`;
    }

    function aviso(texto) {
        const el = $('actAviso');
        el.textContent = texto;
        el.hidden = false;
        clearTimeout(aviso._t);
        aviso._t = setTimeout(() => { el.hidden = true; }, 3500);
    }

    // Texto oscuro sobre acentos claros, blanco sobre los oscuros.
    function aplicarAcento(hex) {
        const color = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#e50914';
        const r = parseInt(color.substr(1, 2), 16), g = parseInt(color.substr(3, 2), 16), b = parseInt(color.substr(5, 2), 16);
        const luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        document.documentElement.style.setProperty('--acento', color);
        document.documentElement.style.setProperty('--sobre-acento', luz > 0.62 ? '#14121a' : '#ffffff');
    }

    // ------------------------------------------
    // Login y vuelta
    // ------------------------------------------
    function irA(pagina) {
        if (window.cmVolver) window.cmVolver.guardar(location.pathname + location.search);
        // El destino va después del "#": en producción "login.html" redirige a "login"
        // y en ese salto se pierde lo que va después del "?".
        location.href = `${pagina}#volver=${encodeURIComponent(location.pathname + location.search)}`;
    }

    function renderCuenta() {
        const cont = $('actCuenta');
        if (sinRegistro()) {
            const yo = estado.landing.yo;
            // En celular se ve solo el ícono; al tocarlo aparece el nombre.
            cont.innerHTML = yo && yo.nombre
                ? `<div class="act-participante-wrap">
                       <button type="button" class="act-btn-chico act-participante" data-accion="ver-participante" aria-expanded="false" aria-label="Participás como ${esc(yo.nombre)}"><i class="fas fa-user"></i> <span>${esc(yo.nombre)}</span></button>
                       <div class="act-participante-pop" hidden>Participás como <strong>${esc(yo.nombre)}</strong></div>
                   </div>`
                : '';
            return;
        }
        if (estado.landing && estado.landing.yo) {
            cont.innerHTML = '<a class="act-btn-chico" href="dashboard.html"><i class="fas fa-house"></i> <span>Mi Cinemarketer</span></a>';
        } else {
            cont.innerHTML = '<button type="button" class="act-btn-chico" data-accion="ingresar">Ingresar</button>';
        }
    }

    // ------------------------------------------
    // Carga de la landing
    // ------------------------------------------
    async function cargar() {
        if (!slug) { renderError('Falta indicar qué actividad querés ver.'); return; }
        let landing;
        const p = participante();
        const rutaLanding = `/public/juegos/${encodeURIComponent(slug)}${p ? `?t=${encodeURIComponent(p.token)}` : ''}`;
        try {
            landing = await pedir(rutaLanding);
        } catch (e) {
            // Token vencido: se muestra igual, como visitante.
            if ((e.status === 401 || e.status === 403) && token()) {
                try { landing = await pedir(rutaLanding, { sinToken: true }); }
                catch (e2) { renderError(e2.message); return; }
            } else if (e.status === 410) {
                renderFinalizada();
                return;
            } else {
                renderError(e.status === 404 ? 'No encontramos esta actividad. Revisá el enlace.' : e.message);
                return;
            }
        }
        estado.landing = landing;
        // Sin registro con un token que ya no sirve: se olvida y vuelve a pedir los datos.
        if (sinRegistro() && p && !landing.yo) olvidarParticipante();
        estado.desfaseMs = fecha(landing.ahora).getTime() - Date.now();
        aplicarAcento(landing.campania.colorAcento);
        document.title = `${landing.campania.nombre} — Cinemarketer`;
        renderCuenta();
        renderLanding();
    }

    // Campaña archivada con la landing oculta desde el admin: pantalla negra y una sola leyenda.
    function renderFinalizada() {
        document.body.classList.add('act-finalizada');
        document.title = 'Cinemarketer';
        $('act').innerHTML = '<p class="act-finalizada-texto">Parece que la campaña ya finalizó</p>';
    }

    function renderError(texto) {
        $('act').innerHTML = `
            <section class="act-error">
                <i class="fas fa-film"></i>
                <h1>Uy</h1>
                <p>${esc(texto)}</p>
                <a class="act-btn" href="index.html">Ir a Cinemarketer</a>
            </section>`;
        renderCuenta();
    }

    // ------------------------------------------
    // Landing
    // ------------------------------------------
    function renderLanding() {
        estado.relojes.forEach(clearInterval);
        estado.relojes = [];
        const L = estado.landing;
        const c = L.campania;
        const enJuego = c.estado === 'PROGRAMADA' || c.estado === 'ACTIVA'; // después del cierre, "cómo se juega" ya no hace falta

        $('act').innerHTML = `
            <section class="act-hero ${c.fondoUrl || c.bannerMobileUrl ? 'con-imagen' : 'sin-imagen'}">
                ${banner(c)}
                <div class="act-hero-contenido">
                    <span class="act-etiqueta">${etiquetaEstado(L)}</span>
                    <h1>${esc(c.nombre)}</h1>
                    ${c.bajada ? `<p class="act-bajada">${esc(c.bajada)}</p>` : ''}
                </div>
            </section>

            <div class="act-tablero">
                <div class="act-col act-col-accion">
                    ${bloquePremioPropio(L)}
                    <section class="act-panel-accion"><div class="act-accion">${bloqueAccion(L)}</div></section>
                </div>
                ${pestanias(L, enJuego)}
                <div class="act-col act-col-info">
                    ${L.ganadores.length ? bloqueGanadores(L) : ''}
                    <button type="button" class="act-tarjeta act-premio" data-panel="premio" data-accion="premio" aria-label="Ver el premio completo">
                        ${c.premioImagenUrl ? `<img src="${esc(c.premioImagenUrl)}" alt="" loading="lazy">` : '<span class="act-premio-icono"><i class="fas fa-trophy"></i></span>'}
                        <span class="act-premio-cuerpo">
                            <span class="act-premio-etiqueta">El premio</span>
                            <span class="act-premio-texto">${esc(c.premioTexto || 'A confirmar')}</span>
                            <span class="act-premio-desc">${esc(c.premioDescripcion || reglaPremio(c))}</span>
                            <span class="act-premio-ver">Ver detalle <i class="fas fa-chevron-right"></i></span>
                        </span>
                    </button>
                    <section class="act-tarjeta act-como" data-panel="como">
                        ${enJuego ? `<h2>Cómo se juega</h2>
                        <ol class="act-pasos">
                            <li><span>1</span><div><strong>Una tanda por día</strong><p>${c.preguntasPorDia} preguntas nuevas cada día, ${c.segundosPorPregunta} segundos para cada una.</p></div></li>
                            <li><span>2</span><div><strong>Sumá todos los días</strong><p>El ranking acumula tus aciertos. Si empatás, gana quien respondió más rápido.</p></div></li>
                            <li><span>3</span><div><strong>Ganá el premio</strong><p>El ranking cierra el ${esc(fechaLarga(c.cierre))}.</p></div></li>
                        </ol>` : ''}
                        <button type="button" class="act-bases ${enJuego ? '' : 'sola'}" data-accion="bases">
                            <i class="fas fa-file-lines"></i> Bases y condiciones <i class="fas fa-chevron-right act-bases-flecha"></i>
                        </button>
                    </section>
                </div>
                <div class="act-col act-col-ranking" data-panel="ranking">
                    ${bloqueRanking(L)}
                </div>
            </div>

            <footer class="act-pie">Una actividad de <a href="index.html">Cinemarketer</a></footer>`;

        document.querySelectorAll('[data-cuenta]').forEach(el => iniciarCuenta(el));
        aplicarPestania();
        fondoLateral(c);
    }

    // ------------------------------------------
    // Pestañas (solo celular): en escritorio todo está a la vista.
    // En juego: Ranking · Premio · Cómo se juega.
    // Cerrada: Ganadores · Ranking · Bases (esta abre el modal).
    // ------------------------------------------
    function pestanias(L, enJuego) {
        const lista = L.ganadores.length
            ? [['premio', 'Ganadores'], ['ranking', 'Ranking']]
            : [['ranking', 'Ranking'], ['premio', 'Premio']];
        if (enJuego) lista.push(['como', 'Cómo jugar']);
        if (!estado.pestania || !lista.some(p => p[0] === estado.pestania)) estado.pestania = lista[0][0];
        return `
            <nav class="act-pestanias" role="tablist" aria-label="Secciones">
                ${lista.map(([id, texto]) => `<button type="button" role="tab" data-pestania="${id}">${texto}</button>`).join('')}
                ${enJuego ? '' : '<button type="button" data-accion="bases">Bases</button>'}
            </nav>`;
    }

    function aplicarPestania() {
        document.querySelectorAll('.act-pestanias [data-pestania]').forEach(b => {
            const activa = b.dataset.pestania === estado.pestania;
            b.classList.toggle('activa', activa);
            b.setAttribute('aria-selected', activa ? 'true' : 'false');
        });
        document.querySelectorAll('#act [data-panel]').forEach(p => {
            p.classList.toggle('act-oculto-movil', p.dataset.panel !== estado.pestania);
        });
    }

    // Banner: uno para escritorio y otro para celular. Si falta uno, se usa el otro.
    function banner(c) {
        const escritorio = c.fondoUrl, celular = c.bannerMobileUrl;
        if (!escritorio && !celular) return '';
        return `
            <div class="act-hero-img ${celular ? 'con-celular' : ''}">
                <picture>
                    ${celular ? `<source media="(max-width: 768px)" srcset="${esc(celular)}">` : ''}
                    <img src="${esc(escritorio || celular)}" alt="">
                </picture>
            </div>`;
    }

    // ------------------------------------------
    // Fondo de los costados (solo escritorio, desde 1100 px)
    // Con imagen propia: grande y borrosa detrás. Sin imagen: el muro de
    // pósters del login (mismo endpoint y caché), también borroso.
    // ------------------------------------------
    const ESCRITORIO = window.matchMedia('(min-width: 1100px)');
    const RUTA_POSTER = /^\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;

    function fondoLateral(c) {
        if (!ESCRITORIO.matches) {
            ESCRITORIO.addEventListener('change', function una() {
                if (!ESCRITORIO.matches) return;
                ESCRITORIO.removeEventListener('change', una);
                fondoLateral(c);
            });
            return;
        }
        let capa = $('actFondo');
        if (!capa) {
            capa = document.createElement('div');
            capa.id = 'actFondo';
            capa.className = 'act-fondo';
            capa.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(capa, document.body.firstChild);
        }
        const clave = c.fondoLateralUrl || 'posters';
        if (capa.dataset.clave === clave) return; // ya armado: no se rehace en cada recarga
        capa.dataset.clave = clave;
        capa.innerHTML = '';
        if (c.fondoLateralUrl) {
            const img = document.createElement('div');
            img.className = 'act-fondo-img';
            img.style.backgroundImage = `url("${c.fondoLateralUrl.replace(/"/g, '%22')}")`;
            capa.appendChild(img);
        } else {
            armarMuro(capa);
        }
    }

    function armarMuro(capa) {
        const anchoLado = Math.max(200, (window.innerWidth - 1180) / 2 + 60);
        const columnas = Math.ceil((anchoLado + 260) / 152);
        const filas = Math.ceil((window.innerHeight + 420) / 222);
        const posters = [];
        ['izq', 'der'].forEach(lado => {
            const panel = document.createElement('div');
            panel.className = `act-muro act-muro-${lado}`;
            const interior = document.createElement('div');
            interior.className = 'act-muro-inner';
            for (let col = 0; col < columnas; col++) {
                const columna = document.createElement('div');
                columna.className = 'act-muro-col';
                for (let f = 0; f < filas; f++) {
                    const p = document.createElement('div');
                    p.className = 'act-poster';
                    columna.appendChild(p);
                    posters.push(p);
                }
                interior.appendChild(columna);
            }
            panel.appendChild(interior);
            capa.appendChild(panel);
        });
        rutasPosters().then(rutas => {
            if (!rutas.length) return; // quedan los rectángulos de color
            const inicio = Math.floor(Math.random() * rutas.length);
            posters.forEach((p, i) => {
                const img = new Image();
                img.alt = '';
                img.decoding = 'async';
                img.loading = 'lazy';
                img.onload = () => img.classList.add('ok');
                img.onerror = () => img.remove();
                img.src = 'https://image.tmdb.org/t/p/w154' + rutas[(inicio + i * 7) % rutas.length];
                p.appendChild(img);
            });
        });
    }

    // Mismo pedido y misma caché que el muro del login.
    async function rutasPosters() {
        try {
            const g = JSON.parse(sessionStorage.getItem('loginPostersV1') || 'null');
            if (g && Date.now() - g.t < 6 * 3600 * 1000 && Array.isArray(g.rutas) && g.rutas.length) return g.rutas;
        } catch (e) { /* sin caché */ }
        try {
            const res = await fetch(`${API}/public/login-posters`);
            if (!res.ok) return [];
            const datos = await res.json();
            const rutas = (Array.isArray(datos.posters) ? datos.posters : []).filter(r => typeof r === 'string' && RUTA_POSTER.test(r));
            if (rutas.length) { try { sessionStorage.setItem('loginPostersV1', JSON.stringify({ t: Date.now(), rutas })); } catch (e) { /* sin caché */ } }
            return rutas;
        } catch (e) {
            return [];
        }
    }

    function etiquetaEstado(L) {
        const c = L.campania;
        switch (c.estado) {
            case 'PROGRAMADA': return '<i class="fas fa-clock"></i> Muy pronto';
            case 'ACTIVA': return `<i class="fas fa-circle act-vivo"></i> En juego · Día ${L.diaNumero} de ${L.diasTotales}`;
            case 'CERRADA': return '<i class="fas fa-hourglass-end"></i> Ranking cerrado';
            default: return '<i class="fas fa-trophy"></i> Ganadores publicados';
        }
    }

    // El botón principal según el momento de la campaña y del jugador.
    function bloqueAccion(L) {
        const c = L.campania;
        const yo = L.yo;
        if (c.modoAcceso === 'SIN_REGISTRO' && !yo) return bloqueAnotarse(L);
        if (c.estado === 'PROGRAMADA') {
            return `
                <p class="act-accion-titulo">Empieza en</p>
                ${cuenta(L.proximaTanda)}
                ${yo ? '<p class="act-tenue">Ya tenés todo listo. Volvé cuando arranque.</p>'
                     : '<button type="button" class="act-btn" data-ir="register.html">Creá tu cuenta gratis para jugar</button><button type="button" class="act-link" data-accion="ingresar">Ya tengo cuenta</button>'}`;
        }
        if (c.estado === 'ACTIVA') {
            if (!yo) {
                return `
                    <button type="button" class="act-btn act-btn-grande" data-accion="ingresar"><i class="fas fa-play"></i> Ingresá para jugar</button>
                    <button type="button" class="act-link" data-ir="register.html">No tengo cuenta: crear una gratis</button>
                    <p class="act-tenue">Necesitás una cuenta de Cinemarketer para entrar al ranking.</p>`;
            }
            if (yo.descalificado) {
                return '<p class="act-accion-titulo">Tu participación en esta actividad fue anulada.</p><p class="act-tenue">Si creés que es un error, escribinos a soporte.</p>';
            }
            if (yo.hoy === 'TERMINADO') {
                return `
                    <p class="act-accion-titulo">Hoy hiciste ${yo.hoyAciertos} de ${c.preguntasPorDia}</p>
                    ${L.proximaTanda
                        ? `<p class="act-tenue">La próxima tanda sale en</p>${cuenta(L.proximaTanda)}`
                        : `<p class="act-tenue">Era el último día. El ranking cierra en</p>${cuenta(c.cierre)}`}
                    <button type="button" class="act-btn act-btn-secundario" data-accion="compartir"><i class="fas fa-share-nodes"></i> Desafiar a alguien</button>
                    ${misDatos(yo)}`;
            }
            return `
                ${misDatos(yo)}
                <button type="button" class="act-btn act-btn-grande" data-accion="jugar">
                    <i class="fas fa-play"></i> ${yo.hoy === 'EN_CURSO' ? 'Seguir la tanda de hoy' : 'Jugar la tanda de hoy'}
                </button>
                <p class="act-tenue">${c.preguntasPorDia} preguntas · ${c.segundosPorPregunta} segundos cada una · un intento por día</p>`;
        }
        if (c.estado === 'CERRADA') {
            return `<p class="act-accion-titulo">El ranking ya cerró</p><p class="act-tenue">Estamos revisando los resultados. Muy pronto publicamos ${quienesGanan(c)}.</p>`;
        }
        return `<p class="act-accion-titulo">¡Gracias por jugar!</p><p class="act-tenue">Mirá quién se llevó el premio.</p>${misDatos(yo)}`;
    }

    // Sin registro y todavía sin anotarse en este dispositivo.
    function bloqueAnotarse(L) {
        const c = L.campania;
        if (c.estado === 'PROGRAMADA') {
            return `
                <p class="act-accion-titulo">Empieza en</p>
                ${cuenta(L.proximaTanda)}
                <button type="button" class="act-btn" data-accion="anotarse">Anotarme para jugar</button>
                <p class="act-tenue">Solo te pedimos tu nombre y tu email. No hace falta crear una cuenta.</p>`;
        }
        if (c.estado === 'ACTIVA') {
            return `
                <button type="button" class="act-btn act-btn-grande" data-accion="anotarse"><i class="fas fa-play"></i> Jugar</button>
                <p class="act-tenue">Solo tu nombre y tu email. Sin crear cuenta.</p>
                <button type="button" class="act-link" data-accion="anotarse">Ya jugué desde otro dispositivo</button>`;
        }
        const titulo = c.estado === 'CERRADA'
            ? '<p class="act-accion-titulo">El ranking ya cerró</p><p class="act-tenue">Estamos revisando los resultados. Muy pronto publicamos al ganador o ganadora.</p>'
            : '<p class="act-accion-titulo">¡Gracias por jugar!</p><p class="act-tenue">Mirá quién se llevó el premio.</p>';
        return `${titulo}
            <button type="button" class="act-link" data-accion="anotarse">¿Participaste? Ingresá tu nombre y email para ver tu resultado</button>`;
    }

    // Resumen de la posición propia (solo si ya jugó algún día).
    function misDatos(yo) {
        if (!yo || !yo.posicion) return '';
        return `
            <div class="act-mis-datos">
                <div><strong>${yo.posicion}°</strong><small>tu puesto</small></div>
                <div><strong>${yo.aciertos}</strong><small>aciertos</small></div>
                <div><strong>${yo.diasJugados}</strong><small>${yo.diasJugados === 1 ? 'día jugado' : 'días jugados'}</small></div>
            </div>`;
    }

    // Aviso propio cuando a quien mira le tocó el premio (o quedó de suplente).
    function bloquePremioPropio(L) {
        const p = L.yo && L.yo.premio;
        if (!p) return '';
        let html;
        if (p.estado === 'NOTIFICADO' && p.puedeReclamar) {
            html = `
                <div><strong>¡Ganaste el premio!</strong>
                <p>Tenés tiempo hasta el ${esc(fechaLarga(p.reclamarHasta))} para reclamarlo.</p></div>
                <button type="button" class="act-btn" data-accion="reclamar"><i class="fas fa-gift"></i> Reclamar mi premio</button>`;
        } else if (p.estado === 'RECLAMADO') {
            html = `<div><strong>Ya reclamaste tu premio</strong><p>Te escribimos ${sinRegistro() ? 'al email que cargaste' : 'al mail de tu cuenta'} para coordinar la entrega.</p></div>`;
        } else if (p.estado === 'ENTREGADO') {
            html = '<div><strong>Premio entregado</strong><p>¡Que lo disfrutes!</p></div>';
        } else if (p.estado === 'VENCIDO' || (p.estado === 'NOTIFICADO' && !p.puedeReclamar)) {
            html = '<div><strong>Se venció el plazo para reclamar</strong><p>El premio pasó al siguiente suplente.</p></div>';
        } else if (p.estado === 'EN_ESPERA') {
            html = '<div><strong>Quedaste como suplente</strong><p>Si el premio no se reclama a tiempo, te avisamos.</p></div>';
        } else {
            return '';
        }
        return `<section class="act-mi-premio">${html}</section>`;
    }

    function bloqueGanadores(L) {
        return `
            <section class="act-tarjeta act-ganadores" data-panel="premio">
                <h2><i class="fas fa-trophy"></i> Ganadores</h2>
                <ul>
                    ${L.ganadores.map(g => `
                        <li class="${g.tienePremio ? 'act-con-premio' : ''}">
                            ${avatar(g.nombre, g.avatar)}
                            <div><strong>${esc(g.nombre)}</strong>
                                <small>${g.rol === 'GANADOR' ? (g.puesto === 1 ? 'Primer puesto' : `Puesto ${g.puesto}`) : `Suplente · puesto ${g.puesto}`}${g.tienePremio ? ' · se lleva el premio' : ''}</small></div>
                        </li>`).join('')}
                </ul>
            </section>`;
    }

    function bloqueRanking(L) {
        const yo = L.yo;
        const estoyEnTop = L.ranking.some(f => f.soyYo);
        const fila = f => `
            <li class="${f.soyYo ? 'act-soy-yo' : ''}">
                <span class="act-puesto ${f.posicion <= 3 ? 'act-podio-' + f.posicion : ''}">${f.posicion}</span>
                ${avatar(f.nombre, f.avatar)}
                <span class="act-rank-nombre">${esc(f.nombre)}${f.soyYo && f.nombre !== 'Vos' ? ' <small>(vos)</small>' : ''}</span>
                <span class="act-rank-dato"><strong>${f.aciertos}</strong><small>${tiempo(f.tiempoMs)}</small></span>
            </li>`;
        let mio = '';
        if (yo && yo.posicion && !estoyEnTop) {
            mio = `<div class="act-rank-mio">${fila({ posicion: yo.posicion, nombre: 'Vos', avatar: null, aciertos: yo.aciertos, tiempoMs: yo.tiempoMs, soyYo: true })}</div>`;
        }
        return `
            <section class="act-tarjeta act-ranking">
                <div class="act-ranking-cab">
                    <h2>Ranking</h2>
                    <span class="act-tenue">${L.participantes} ${L.participantes === 1 ? 'participante' : 'participantes'}</span>
                </div>
                ${L.ranking.length
                    ? `<div class="act-rank-titulos"><span>Puesto</span><span>Aciertos · tiempo</span></div>
                       <ol class="act-rank-lista">${L.ranking.map(fila).join('')}</ol>${mio}`
                    : `<p class="act-vacio">${L.campania.estado === 'PROGRAMADA' ? 'El ranking arranca con la primera tanda.' : 'Todavía nadie jugó. ¡Podés ser el primer puesto!'}</p>`}
            </section>`;
    }

    function avatar(nombre, url) {
        if (url) return `<img class="act-avatar" src="${esc(url)}" alt="" loading="lazy">`;
        return `<span class="act-avatar act-avatar-letra" aria-hidden="true">${esc((nombre || '?').charAt(0).toUpperCase())}</span>`;
    }

    // ------------------------------------------
    // Cuentas regresivas
    // ------------------------------------------
    function cuenta(iso) {
        return `<div class="act-cuenta-regresiva" data-cuenta="${esc(iso)}" role="timer">
            <div><strong data-u="d">0</strong><small>días</small></div>
            <div><strong data-u="h">00</strong><small>horas</small></div>
            <div><strong data-u="m">00</strong><small>min</small></div>
            <div><strong data-u="s">00</strong><small>seg</small></div>
        </div>`;
    }

    function iniciarCuenta(el) {
        const destino = fecha(el.dataset.cuenta).getTime();
        const pintar = () => {
            const falta = destino - ahoraServidor();
            if (falta <= 0) {
                estado.relojes.forEach(clearInterval);
                estado.relojes = [];
                setTimeout(cargar, 1500); // cambió el momento de la campaña
                return;
            }
            const s = Math.floor(falta / 1000);
            el.querySelector('[data-u="d"]').textContent = Math.floor(s / 86400);
            el.querySelector('[data-u="h"]').textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, '0');
            el.querySelector('[data-u="m"]').textContent = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
            el.querySelector('[data-u="s"]').textContent = String(s % 60).padStart(2, '0');
        };
        pintar();
        estado.relojes.push(setInterval(pintar, 1000));
    }

    // ------------------------------------------
    // Partida
    // ------------------------------------------
    async function jugar() {
        abrirJuego('<div class="act-juego-centro"><i class="fas fa-spinner fa-spin"></i></div>');
        try {
            const partida = await pedir(rutaJuego('iniciar'), { method: 'POST' });
            mostrarPartida(partida);
        } catch (e) {
            if (e.status === 401 && sinRegistro()) { olvidarParticipante(); salirDelJuegoSinPreguntar(); abrirAnotarse(); return; }
            if (e.status === 401) { cerrarJuego(); irA('login.html'); return; }
            mostrarErrorJuego(e.message);
        }
    }

    function abrirJuego(html) {
        const j = $('actJuego');
        j.innerHTML = html;
        j.hidden = false;
        document.body.classList.add('act-sin-scroll');
    }

    function cerrarJuego() {
        clearInterval(estado.timerPregunta);
        $('actJuego').hidden = true;
        $('actJuego').innerHTML = '';
        document.body.classList.remove('act-sin-scroll');
    }

    function mostrarErrorJuego(texto) {
        abrirJuego(`
            <div class="act-juego-centro">
                <p>${esc(texto)}</p>
                <button type="button" class="act-btn" data-accion="salir">Volver</button>
            </div>`);
    }

    function mostrarPartida(partida) {
        estado.partida = partida;
        if (partida.estado === 'TERMINADO') mostrarResultado(partida.resultado);
        else mostrarPregunta(partida.pregunta);
    }

    function mostrarPregunta(p) {
        clearInterval(estado.timerPregunta);
        estado.respondiendo = false;
        const c = estado.landing.campania;
        abrirJuego(`
            <div class="act-juego-cab">
                <button type="button" class="act-juego-cerrar" data-accion="salir" aria-label="Salir"><i class="fas fa-times"></i></button>
                <span class="act-juego-titulo">${esc(c.nombre)}</span>
                <span class="act-juego-num">${p.numero}/${p.total}</span>
            </div>
            <div class="act-progreso" aria-hidden="true"><span style="width:${((p.numero - 1) / p.total) * 100}%"></span></div>
            <div class="act-juego-cuerpo">
                <div class="act-reloj" aria-hidden="true"><span id="actRelojBarra"></span></div>
                <div class="act-reloj-num" id="actRelojNum" aria-live="off">${Math.ceil(p.restanteMs / 1000)}</div>
                ${p.imagenUrl ? `<img class="act-pregunta-img" src="${esc(p.imagenUrl)}" alt="">` : ''}
                <h2 class="act-pregunta">${esc(p.texto)}</h2>
                <div class="act-opciones ${p.opciones.length > 2 ? 'act-opciones-4' : ''}">
                    ${p.opciones.map(o => `
                        <button type="button" class="act-opcion" data-opcion="${o.indice}">${esc(o.texto)}</button>`).join('')}
                </div>
                <div class="act-feedback" id="actFeedback" role="status"></div>
            </div>`);

        // El reloj del navegador es solo visual: el que cuenta es el del servidor.
        const total = p.segundos * 1000;
        const fin = Date.now() + p.restanteMs;
        const barra = $('actRelojBarra');
        const num = $('actRelojNum');
        const pintar = () => {
            const falta = Math.max(0, fin - Date.now());
            barra.style.width = (falta / total * 100) + '%';
            barra.classList.toggle('act-reloj-urgente', falta < 4000);
            num.textContent = Math.ceil(falta / 1000);
            if (falta <= 0) {
                clearInterval(estado.timerPregunta);
                responder(p.id, null);
            }
        };
        pintar();
        estado.timerPregunta = setInterval(pintar, 100);
    }

    async function responder(preguntaId, opcion) {
        if (estado.respondiendo) return;
        estado.respondiendo = true;
        clearInterval(estado.timerPregunta);
        const botones = document.querySelectorAll('.act-opcion');
        botones.forEach(b => { b.disabled = true; });
        const elegido = opcion == null ? null : document.querySelector(`.act-opcion[data-opcion="${opcion}"]`);
        if (elegido) elegido.classList.add('act-elegida');

        let r;
        try {
            r = await pedir(rutaJuego('responder'), {
                method: 'POST', body: { preguntaId, opcion }
            });
        } catch (e) {
            // Puede pasar si se respondió desde otra pestaña: se retoma desde el servidor.
            if (e.status === 409) { jugar(); return; }
            mostrarErrorJuego(e.message);
            return;
        }
        const fb = $('actFeedback');
        if (r.fueraDeTiempo || opcion == null) {
            fb.innerHTML = '<i class="fas fa-hourglass-end"></i> Se acabó el tiempo';
            fb.className = 'act-feedback act-mal';
        } else if (r.correcta) {
            elegido && elegido.classList.add('act-bien');
            fb.innerHTML = '<i class="fas fa-check"></i> ¡Bien!';
            fb.className = 'act-feedback act-bien-txt';
        } else {
            elegido && elegido.classList.add('act-mal-btn');
            fb.innerHTML = '<i class="fas fa-xmark"></i> No era esa';
            fb.className = 'act-feedback act-mal';
        }
        setTimeout(() => mostrarPartida(r.siguiente), 1000);
    }

    function mostrarResultado(res) {
        clearInterval(estado.timerPregunta);
        const c = estado.landing.campania;
        const perfecto = res.aciertos === res.total;
        abrirJuego(`
            <div class="act-juego-cab">
                <button type="button" class="act-juego-cerrar" data-accion="salir" aria-label="Cerrar"><i class="fas fa-times"></i></button>
                <span class="act-juego-titulo">${esc(c.nombre)}</span>
                <span></span>
            </div>
            <div class="act-resultado">
                <p class="act-resultado-sup">${perfecto ? '¡Tanda perfecta!' : 'Tanda de hoy terminada'}</p>
                <div class="act-resultado-num"><strong>${res.aciertos}</strong><span>/${res.total}</span></div>
                <p class="act-tenue">aciertos en ${tiempo(res.tiempoMs)}</p>
                <div class="act-resultado-datos">
                    <div><strong>${res.posicion ? res.posicion + '°' : '—'}</strong><small>en el ranking</small></div>
                    <div><strong>${res.aciertosTotales}</strong><small>aciertos acumulados</small></div>
                    <div><strong>${res.diasJugados}</strong><small>${res.diasJugados === 1 ? 'día jugado' : 'días jugados'}</small></div>
                </div>
                ${res.proximaTanda
                    ? `<p class="act-accion-titulo">Volvé mañana para seguir sumando</p>${cuenta(res.proximaTanda)}`
                    : `<p class="act-accion-titulo">Era el último día de la campaña</p><p class="act-tenue">Cuando cierre el ranking, publicamos ${quienesGanan(estado.landing.campania)}.</p>`}
                <div class="act-resultado-botones">
                    <button type="button" class="act-btn" data-accion="compartir" data-aciertos="${res.aciertos}" data-total="${res.total}"><i class="fas fa-share-nodes"></i> Desafiar a alguien</button>
                    <button type="button" class="act-btn act-btn-secundario" data-accion="salir">Ver el ranking</button>
                </div>
            </div>`);
        $('actJuego').querySelectorAll('[data-cuenta]').forEach(el => iniciarCuenta(el));
    }

    // ------------------------------------------
    // Compartir y reclamar
    // ------------------------------------------
    async function compartir(boton) {
        const c = estado.landing.campania;
        // La misma dirección en la que se está viendo la página (sin redirecciones de por medio).
        const url = `${location.origin}${location.pathname}?c=${encodeURIComponent(c.slug)}`;
        const aciertos = boton && boton.dataset.aciertos;
        const texto = aciertos != null
            ? `Hice ${aciertos}/${boton.dataset.total} en "${c.nombre}" 🎬 ¿Me superás?`
            : `Estoy jugando "${c.nombre}" en Cinemarketer 🎬 ¿Te animás?`;
        if (navigator.share) {
            try { await navigator.share({ title: c.nombre, text: texto, url }); } catch (e) { /* lo canceló */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(`${texto} ${url}`);
            aviso('Copiamos el enlace. Pegalo donde quieras.');
        } catch (e) {
            aviso(url);
        }
    }

    async function reclamar(boton) {
        boton.disabled = true;
        try {
            await pedir(rutaJuego('reclamar'), { method: 'POST' });
            aviso(`¡Listo! Te escribimos ${sinRegistro() ? 'al email que cargaste' : 'al mail de tu cuenta'} para coordinar la entrega.`);
            cargar();
        } catch (e) {
            aviso(e.message);
            boton.disabled = false;
        }
    }

    // ------------------------------------------
    // Eventos (delegados)
    // ------------------------------------------
    function mostrarParticipante(boton, ver) {
        const pop = boton.parentElement.querySelector('.act-participante-pop');
        if (!pop) return;
        pop.hidden = !ver;
        boton.setAttribute('aria-expanded', ver ? 'true' : 'false');
    }

    document.addEventListener('click', ev => {
        // Un toque fuera del nombre del participante lo cierra.
        const abierto = document.querySelector('.act-participante[aria-expanded="true"]');
        if (abierto && !ev.target.closest('.act-participante-wrap')) mostrarParticipante(abierto, false);

        const pestania = ev.target.closest('[data-pestania]');
        if (pestania) { estado.pestania = pestania.dataset.pestania; aplicarPestania(); return; }

        const ir = ev.target.closest('[data-ir]');
        if (ir) { irA(ir.dataset.ir); return; }

        const opcion = ev.target.closest('.act-opcion');
        if (opcion && !opcion.disabled && estado.partida && estado.partida.pregunta) {
            responder(estado.partida.pregunta.id, Number(opcion.dataset.opcion));
            return;
        }

        const accion = ev.target.closest('[data-accion]');
        if (!accion) return;
        switch (accion.dataset.accion) {
            case 'jugar': jugar(); break;
            case 'compartir': compartir(accion); break;
            case 'reclamar': reclamar(accion); break;
            case 'salir': salirDelJuego(); break;
            case 'bases': abrirBases(); break;
            case 'premio': abrirPremio(); break;
            case 'ingresar': abrirIngreso(); break;
            case 'anotarse': abrirAnotarse(); break;
            case 'ver-participante': mostrarParticipante(accion, accion.getAttribute('aria-expanded') !== 'true'); break;
            case 'ingresar-google': ingresarConGoogle(); break;
            case 'ver-clave': verClave(accion); break;
            case 'cerrar-modal': cerrarModal(); break;
        }
    });

    function salirDelJuegoSinPreguntar() {
        cerrarJuego();
        estado.partida = null;
        $('actJuego').hidden = true;
        if ($('actModal') === null || $('actModal').hidden) document.body.classList.remove('act-sin-scroll');
    }

    function salirDelJuego() {
        const enPregunta = estado.partida && estado.partida.estado === 'EN_CURSO' && !estado.respondiendo;
        if (enPregunta && !confirm('Si salís, el reloj de esta pregunta sigue corriendo. Podés volver hoy y seguir desde donde quedaste. ¿Salir?')) return;
        cerrarJuego();
        estado.partida = null;
        cargar();
    }

    // ------------------------------------------
    // Modales: bases y condiciones, y detalle del premio
    // ------------------------------------------
    let focoAntesDelModal = null;

    // "Gana quien termine 1°..." o "Ganan los 3 primeros...", según la campaña.
    function reglaPremio(c) {
        const n = c.cantidadGanadores || 1;
        const suplentes = c.cantidadSuplentes > 0
            ? ` Hay ${c.cantidadSuplentes} ${c.cantidadSuplentes === 1 ? 'suplente' : 'suplentes'} por si no se reclama.` : '';
        return (n > 1 ? `Ganan los ${n} primeros del ranking: cada uno se lleva el premio.` : 'Gana quien termine 1° en el ranking.') + suplentes;
    }

    function quienesGanan(c) {
        return (c && c.cantidadGanadores > 1) ? 'a quienes ganaron' : 'al ganador o ganadora';
    }

    function abrirModal(titulo, subtitulo, cuerpo, clase) {
        let modal = $('actModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'actModal';
            modal.className = 'act-modal';
            modal.addEventListener('click', ev => { if (ev.target === modal) cerrarModal(); });
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="act-modal-caja ${clase || ''}" role="dialog" aria-modal="true" aria-labelledby="actModalTitulo">
                <div class="act-modal-cab">
                    <div>
                        <h2 id="actModalTitulo">${titulo}</h2>
                        ${subtitulo ? `<p class="act-tenue">${subtitulo}</p>` : ''}
                    </div>
                    <button type="button" class="act-juego-cerrar" data-accion="cerrar-modal" aria-label="Cerrar"><i class="fas fa-times"></i></button>
                </div>
                <div class="act-modal-cuerpo">${cuerpo}</div>
            </div>`;
        focoAntesDelModal = document.activeElement;
        modal.hidden = false;
        document.body.classList.add('act-sin-scroll');
        modal.querySelector('[data-accion="cerrar-modal"]').focus();
    }

    function cerrarModal() {
        const modal = $('actModal');
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        if ($('actJuego').hidden) document.body.classList.remove('act-sin-scroll');
        if (focoAntesDelModal) focoAntesDelModal.focus();
    }

    function abrirBases() {
        const c = estado.landing.campania;
        abrirModal('Bases y condiciones', esc(c.nombre),
            c.basesCondiciones ? esc(c.basesCondiciones).replace(/\n/g, '<br>') : '<p class="act-tenue">Todavía no se publicaron las bases.</p>');
    }

    function abrirPremio() {
        const c = estado.landing.campania;
        const cuerpo = `
            ${c.premioImagenUrl ? `<img class="act-modal-premio-img" src="${esc(c.premioImagenUrl)}" alt="${esc(c.premioTexto || 'Premio')}">` : ''}
            <div class="act-modal-premio-info">
            <h3 class="act-modal-premio-titulo">${esc(c.premioTexto || 'A confirmar')}</h3>
            ${c.premioDescripcion ? `<p>${esc(c.premioDescripcion).replace(/\n/g, '<br>')}</p>` : ''}
            <div class="act-modal-premio-regla">
                <i class="fas fa-trophy"></i>
                <span>${esc(reglaPremio(c))} Quien gana tiene ${c.diasParaReclamar} ${c.diasParaReclamar === 1 ? 'día' : 'días'} para reclamarlo; si no, pasa al siguiente suplente.</span>
            </div>
            <button type="button" class="act-link" data-accion="bases">Ver bases y condiciones</button>
            </div>`;
        abrirModal('El premio', esc(c.nombre), cuerpo, 'act-modal-premio');
    }

    // ------------------------------------------
    // Ingresar sin salir de la landing
    // Quien ya tiene cuenta entra acá mismo (mail y contraseña, o Google) y
    // sigue jugando: no hay idas y vueltas al login que se puedan perder.
    // Crear cuenta sigue yendo al registro (necesita verificar el mail), y el
    // destino viaja en el mail de verificación.
    // ------------------------------------------
    // El navegador interno de Instagram/Facebook no permite ingresar con Google.
    const enNavegadorDeApp = () => /Instagram|FBAN|FBAV/.test(navigator.userAgent || '');
    let googleListo = null;

    function cargarGoogle() {
        if (enNavegadorDeApp()) return Promise.resolve(false);
        if (window.google && window.google.accounts) return Promise.resolve(true);
        if (!googleListo) {
            googleListo = new Promise(resolver => {
                const s = document.createElement('script');
                s.src = 'https://accounts.google.com/gsi/client';
                s.async = true;
                s.onload = () => resolver(true);
                s.onerror = () => { googleListo = null; resolver(false); };
                document.head.appendChild(s);
            });
        }
        return googleListo;
    }

    function guardarDestino() {
        if (window.cmVolver) window.cmVolver.guardar(location.pathname + location.search);
    }

    function abrirIngreso() {
        guardarDestino();
        cargarGoogle(); // se adelanta la carga para que el botón de Google responda al toque
        abrirModal('Ingresá con tu cuenta de Cinemarketer', 'Para jugar y entrar al ranking necesitás tu cuenta de Cinemarketer.', `
            <form id="actLoginForm" class="act-login" novalidate>
                <img class="act-login-logo" src="assets/images/isologotipo.webp" alt="Cinemarketer">
                <label for="actLoginEmail">Correo electrónico</label>
                <input id="actLoginEmail" type="email" inputmode="email" autocomplete="email" maxlength="78" placeholder="tu@email.com" required>
                <label for="actLoginClave">Contraseña</label>
                <div class="act-login-clave">
                    <input id="actLoginClave" type="password" autocomplete="current-password" maxlength="30" placeholder="••••••••" required>
                    <button type="button" data-accion="ver-clave" aria-label="Mostrar contraseña"><i class="fas fa-eye"></i></button>
                </div>
                <div id="actLoginError" class="act-login-error" role="alert"></div>
                <button type="submit" class="act-btn act-login-btn" id="actLoginBtn">Ingresar y jugar</button>
                <a class="act-login-olvide" href="forgot-password.html">¿Olvidaste tu contraseña?</a>
                <div class="act-login-o"><span>o</span></div>
                <button type="button" class="act-login-google" id="googleLoginBtn" data-accion="ingresar-google">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    Continuar con Google
                </button>
                <p class="act-login-registro">¿No tenés cuenta? <button type="button" class="act-link" data-ir="register.html">Creala gratis</button></p>
            </form>`, 'act-modal-login');
        const email = $('actLoginEmail');
        if (email) email.focus();
    }

    function errorIngreso(texto) {
        const el = $('actLoginError');
        if (el) el.textContent = texto || '';
    }

    function verClave(boton) {
        const input = $('actLoginClave');
        if (!input) return;
        const ver = input.type === 'password';
        input.type = ver ? 'text' : 'password';
        boton.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
        boton.innerHTML = `<i class="fas ${ver ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    }

    // Mismos datos que guarda login.html, para que el resto de Cinemarketer reconozca la sesión.
    function guardarSesion(d) {
        try {
            localStorage.setItem('token', d.token);
            localStorage.setItem('userEmail', d.email);
            localStorage.setItem('userRole', d.role);
            localStorage.setItem('userPoints', d.totalPoints);
            localStorage.setItem('userLevel', d.level || 'AMATEUR');
        } catch (e) { /* sin almacenamiento */ }
    }

    async function ingresar(ev) {
        ev.preventDefault();
        const email = ($('actLoginEmail').value || '').trim();
        const clave = $('actLoginClave').value || '';
        if (!email || !clave) { errorIngreso('Completá tu mail y tu contraseña.'); return; }
        errorIngreso('');
        const boton = $('actLoginBtn');
        boton.disabled = true;
        boton.textContent = 'Ingresando...';
        const restaurar = () => { boton.disabled = false; boton.textContent = 'Ingresar y jugar'; };

        let res, datos = {};
        try {
            res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: clave })
            });
            const texto = await res.text();
            try { datos = texto ? JSON.parse(texto) : {}; } catch (e) { /* sin cuerpo */ }
        } catch (e) {
            errorIngreso('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.');
            restaurar();
            return;
        }

        if (!res.ok) {
            if (res.status === 429) errorIngreso(datos.message || 'Demasiados intentos. Probá de nuevo en unos minutos.');
            else if (res.status === 403 && datos.message) errorIngreso(datos.message);
            else if (res.status === 403) errorIngreso('Tu cuenta todavía no está verificada. Revisá tu mail y tocá el enlace de verificación.');
            else if (res.status === 401) errorIngreso('El mail o la contraseña no son correctos. Si tu cuenta es con Google, usá "Continuar con Google".');
            else errorIngreso(datos.message || 'No pudimos iniciar sesión. Probá de nuevo.');
            restaurar();
            return;
        }

        guardarSesion(datos);
        // El onboarding es parte del alta: va primero y después vuelve acá (el destino ya está guardado).
        if (datos.role !== 'ADMIN' && datos.necesitaOnboardingSala) {
            location.replace('onboarding-sala.html');
            return;
        }
        if (window.cmVolver) window.cmVolver.limpiar();
        cerrarModal();
        aviso('¡Listo! Ya podés jugar.');
        cargar();
    }

    async function ingresarConGoogle() {
        if (enNavegadorDeApp()) { abrirEnNavegador(); return; }
        guardarDestino(); // google-auth.js vuelve a esta misma página (o pasa antes por el onboarding)
        const ok = await cargarGoogle();
        if (!ok || !window.googleAuth || !window.google) {
            errorIngreso('No pudimos abrir Google. Probá de nuevo o ingresá con tu mail y contraseña.');
            return;
        }
        window.googleAuth.iniciar();
    }

    // Desde Instagram/Facebook: se abre ESTA actividad en el navegador del teléfono,
    // y ahí se ingresa con Google sin perderse.
    function abrirEnNavegador() {
        if (/android/i.test(navigator.userAgent)) {
            const destino = location.host + location.pathname + location.search;
            location.href = `intent://${destino}#Intent;scheme=https;package=com.android.chrome;end`;
            return;
        }
        errorIngreso('Instagram no permite ingresar con Google. Tocá ··· arriba a la derecha y elegí «Abrir en el navegador»: se va a abrir esta misma actividad y ahí podés ingresar. También podés entrar acá con tu mail y contraseña.');
    }

    // ------------------------------------------
    // Sin registro: anotarse con nombre y email
    // ------------------------------------------
    function abrirAnotarse() {
        const c = estado.landing.campania;
        const yaAnotado = emailDeEsteDispositivo();
        const nuevo = c.estado === 'PROGRAMADA' || c.estado === 'ACTIVA';
        const bases = c.basesCondiciones
            ? `<details class="act-anotarse-bases"><summary>Ver bases y condiciones</summary><div>${esc(c.basesCondiciones).replace(/\n/g, '<br>')}</div></details>`
            : '';
        abrirModal(nuevo ? 'Anotate para jugar' : 'Ingresá tus datos',
            nuevo ? 'Sin crear cuenta: solo tu nombre y tu email.' : 'Usá el mismo nombre y email con que jugaste.', `
            <form id="actAnotarseForm" class="act-login" novalidate>
                <label for="actAnotNombre">Nombre y apellido</label>
                <input id="actAnotNombre" type="text" autocomplete="name" maxlength="120" placeholder="Como querés aparecer" required>
                <label for="actAnotEmail">Email</label>
                <input id="actAnotEmail" type="email" inputmode="email" autocomplete="email" maxlength="200" placeholder="tu@email.com" required
                    ${yaAnotado ? `value="${esc(yaAnotado)}"` : ''}>
                <p class="act-login-aviso"><i class="fas fa-triangle-exclamation"></i> Revisá bien tu email: es el único medio para contactarte si ganás. No lo verificamos, por lo que si contiene errores no podremos entregarte el premio.</p>
                ${nuevo ? '<p class="act-tenue act-anotarse-nota">Si ya jugaste desde otro dispositivo, escribí el mismo nombre y email y seguís donde estabas.</p>' : ''}
                <label class="act-check"><input type="checkbox" id="actAnotBases"> <span>Leí y acepto las bases y condiciones de esta actividad.</span></label>
                ${bases}
                ${c.pedirNovedades ? '<label class="act-check"><input type="checkbox" id="actAnotNovedades"> <span>Quiero recibir novedades de Cinemarketer (opcional).</span></label>' : ''}
                <p class="act-tenue act-anotarse-legal">Usamos tu nombre y email para esta actividad. Pueden compartirse con el organizador del evento. En el ranking solo se ve tu nombre y la inicial de tu apellido.</p>
                <div id="actAnotError" class="act-login-error" role="alert"></div>
                <button type="submit" class="act-btn act-login-btn" id="actAnotBtn">${nuevo ? (c.estado === 'ACTIVA' ? 'Anotarme y jugar' : 'Anotarme') : 'Ver mi resultado'}</button>
            </form>`, 'act-modal-login');
        const primero = $('actAnotNombre');
        if (primero) primero.focus();
    }

    async function anotarse(ev) {
        ev.preventDefault();
        const nombre = ($('actAnotNombre').value || '').trim();
        const email = ($('actAnotEmail').value || '').trim();
        const error = $('actAnotError');
        if (!nombre) { error.textContent = 'Escribí tu nombre y apellido.'; return; }
        if (!email) { error.textContent = 'Escribí tu email.'; return; }
        if (!$('actAnotBases').checked) { error.textContent = 'Para participar tenés que aceptar las bases y condiciones.'; return; }
        const previo = emailDeEsteDispositivo();
        if (previo && previo !== email.toLowerCase()) {
            error.textContent = `Desde este dispositivo ya participa ${previo}. Usá ese mismo email.`;
            return;
        }
        error.textContent = '';
        const boton = $('actAnotBtn');
        const textoBoton = boton.textContent;
        boton.disabled = true;
        boton.textContent = 'Un momento...';
        try {
            const datos = await pedir(`/public/juegos/${encodeURIComponent(slug)}/anotarse`, {
                method: 'POST',
                sinToken: true,
                body: {
                    nombre, email, aceptaBases: true,
                    aceptaNovedades: !!($('actAnotNovedades') && $('actAnotNovedades').checked)
                }
            });
            guardarParticipante(datos, email);
            cerrarModal();
            aviso(datos.yaEstabaAnotado ? `¡Hola de nuevo, ${datos.nombre}!` : '¡Listo! Ya estás participando.');
            await cargar();
            if (estado.landing && estado.landing.campania.estado === 'ACTIVA' && estado.landing.yo
                && estado.landing.yo.hoy !== 'TERMINADO' && !estado.landing.yo.descalificado) {
                jugar();
            }
        } catch (e) {
            error.textContent = e.message;
            boton.disabled = false;
            boton.textContent = textoBoton;
        }
    }

    // google-auth.js avisa con showToast: en la landing se usa el aviso propio.
    if (typeof window.showToast !== 'function') window.showToast = (tipo, texto) => aviso(texto);

    document.addEventListener('submit', ev => {
        if (ev.target && ev.target.id === 'actLoginForm') ingresar(ev);
        if (ev.target && ev.target.id === 'actAnotarseForm') anotarse(ev);
    });

    document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && $('actModal') && !$('actModal').hidden) { cerrarModal(); return; }
        if ($('actJuego').hidden || !estado.partida || !estado.partida.pregunta) return;
        const n = Number(ev.key);
        const botones = document.querySelectorAll('.act-opcion');
        if (n >= 1 && n <= botones.length && !botones[n - 1].disabled) botones[n - 1].click();
    });

    cargar();
})();
