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
        location.href = `${pagina}?volver=${encodeURIComponent(location.pathname + location.search)}`;
    }

    function renderCuenta() {
        const cont = $('actCuenta');
        if (estado.landing && estado.landing.yo) {
            cont.innerHTML = '<a class="act-btn-chico" href="dashboard.html"><i class="fas fa-house"></i> <span>Mi Cinemarketer</span></a>';
        } else {
            cont.innerHTML = '<button type="button" class="act-btn-chico" data-ir="login.html">Ingresar</button>';
        }
    }

    // ------------------------------------------
    // Carga de la landing
    // ------------------------------------------
    async function cargar() {
        if (!slug) { renderError('Falta indicar qué actividad querés ver.'); return; }
        let landing;
        try {
            landing = await pedir(`/public/juegos/${encodeURIComponent(slug)}`);
        } catch (e) {
            // Token vencido: se muestra igual, como visitante.
            if ((e.status === 401 || e.status === 403) && token()) {
                try { landing = await pedir(`/public/juegos/${encodeURIComponent(slug)}`, { sinToken: true }); }
                catch (e2) { renderError(e2.message); return; }
            } else {
                renderError(e.status === 404 ? 'No encontramos esta actividad. Revisá el enlace.' : e.message);
                return;
            }
        }
        estado.landing = landing;
        estado.desfaseMs = fecha(landing.ahora).getTime() - Date.now();
        aplicarAcento(landing.campania.colorAcento);
        document.title = `${landing.campania.nombre} — Cinemarketer`;
        renderCuenta();
        renderLanding();
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
        if (c.estado === 'PROGRAMADA') {
            return `
                <p class="act-accion-titulo">Empieza en</p>
                ${cuenta(L.proximaTanda)}
                ${yo ? '<p class="act-tenue">Ya tenés todo listo. Volvé cuando arranque.</p>'
                     : '<button type="button" class="act-btn" data-ir="register.html">Creá tu cuenta gratis para jugar</button><button type="button" class="act-link" data-ir="login.html">Ya tengo cuenta</button>'}`;
        }
        if (c.estado === 'ACTIVA') {
            if (!yo) {
                return `
                    <button type="button" class="act-btn act-btn-grande" data-ir="login.html"><i class="fas fa-play"></i> Ingresá para jugar</button>
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
            return '<p class="act-accion-titulo">El ranking ya cerró</p><p class="act-tenue">Estamos revisando los resultados. Muy pronto publicamos al ganador o ganadora.</p>';
        }
        return `<p class="act-accion-titulo">¡Gracias por jugar!</p><p class="act-tenue">Mirá quién se llevó el premio.</p>${misDatos(yo)}`;
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
            html = '<div><strong>Ya reclamaste tu premio</strong><p>Te escribimos al mail de tu cuenta para coordinar la entrega.</p></div>';
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
                                <small>${g.rol === 'GANADOR' ? 'Primer puesto' : `Suplente · puesto ${g.puesto}`}${g.tienePremio ? ' · se lleva el premio' : ''}</small></div>
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
            const partida = await pedir(`/juegos/${encodeURIComponent(slug)}/iniciar`, { method: 'POST' });
            mostrarPartida(partida);
        } catch (e) {
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
            r = await pedir(`/juegos/${encodeURIComponent(slug)}/responder`, {
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
                    : '<p class="act-accion-titulo">Era el último día de la campaña</p><p class="act-tenue">Cuando cierre el ranking, publicamos al ganador o ganadora.</p>'}
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
            await pedir(`/juegos/${encodeURIComponent(slug)}/reclamar`, { method: 'POST' });
            aviso('¡Listo! Te escribimos al mail de tu cuenta para coordinar la entrega.');
            cargar();
        } catch (e) {
            aviso(e.message);
            boton.disabled = false;
        }
    }

    // ------------------------------------------
    // Eventos (delegados)
    // ------------------------------------------
    document.addEventListener('click', ev => {
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
            case 'cerrar-modal': cerrarModal(); break;
        }
    });

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

    // "Gana quien termine 1°..." según los suplentes y el plazo de la campaña.
    function reglaPremio(c) {
        const suplentes = c.cantidadSuplentes > 0
            ? ` Hay ${c.cantidadSuplentes} ${c.cantidadSuplentes === 1 ? 'suplente' : 'suplentes'} por si no se reclama.` : '';
        return `Gana quien termine 1° en el ranking.${suplentes}`;
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

    document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && $('actModal') && !$('actModal').hidden) { cerrarModal(); return; }
        if ($('actJuego').hidden || !estado.partida || !estado.partida.pregunta) return;
        const n = Number(ev.key);
        const botones = document.querySelectorAll('.act-opcion');
        if (n >= 1 && n <= botones.length && !botones[n - 1].disabled) botones[n - 1].click();
    });

    cargar();
})();