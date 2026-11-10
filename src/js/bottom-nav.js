// ==============================================
// bottom-nav.js — Barra de navegación inferior (solo mobile)
// No reemplaza el menú hamburguesa — queda intacto, sin tocar.
// Solo agrega los 5 accesos directos de la barra nueva.
// ==============================================

function actualizarBottomNavActivo() {
    const moduleName = (typeof getModuleFromHash === 'function') ? getModuleFromHash() : '';
    document.querySelectorAll('.bottom-nav-link[data-module]').forEach(link => {
        link.classList.toggle('active', link.dataset.module === moduleName);
    });
}

window.addEventListener('hashchange', actualizarBottomNavActivo);
document.addEventListener('DOMContentLoaded', actualizarBottomNavActivo);

// Abre el Buscador y, si se pasa un criterio, salta directo a ese
// paso interno (usa el router _buscadorCriterioSeleccionado que ya
// existe en feed-films.js) — sin criterio, abre en Nivel 1 como
// siempre. Reusable desde cualquier módulo: Cartelera y los accesos
// rápidos de Inicio la comparten.
// Criterios cuyo resultado se arma ENTERO adentro del modal del
// Buscador (Cartelera, "Sobre mi actividad cinéfila") — no dependen
// de que el HTML de Inicio esté en pantalla, así que pueden abrirse
// desde cualquier módulo sin navegar a ningún lado.
window._CRITERIOS_AUTOCONTENIDOS = [
    'cartelera_ya_se_que_ver', 'cartelera_que_hay', 'cartelera_cadena', 'cartelera_recomendacion',
    'cartelera_modo_ahorro', 'cartelera_argentino', 'cartelera_sorteos', 'cartelera_promos',
    'actividad_proximo_premio', 'actividad_aprovechar', 'actividad_reforzar_premium',
    'actividad_vale_premium', 'actividad_insignias',
];

window._abrirBuscadorEnCriterio = function(criterio) {
    const abrirYSeleccionar = () => {
        window.abrirBuscadorAsistido();

        // true solo cuando se entra por un atajo (hay criterio) — el
        // Buscador general (barra inferior / "pedile al asistente")
        // llama a esta misma función con criterio null.
        window._buscadorEntroPorAtajo = !!criterio;

        // Envuelve _buscadorVolverANivel2DondeVer una sola vez (mismo
        // criterio que ya usamos con seleccionarTabFeed): SOLO cuando
        // se entró por un atajo, el Volver de "Elegí una plataforma"
        // lleva primero a la pregunta Película/Serie en vez de
        // saltarla — en el Buscador general, la función original
        // corre sin ningún cambio, intacta.
        if (typeof window._buscadorVolverANivel2DondeVer === 'function' && !window._buscadorVolverANivel2DondeVer._envuelta) {
            const original = window._buscadorVolverANivel2DondeVer;
            const envuelta = function() {
                if (window._buscadorEntroPorAtajo && typeof window._buscadorAbrirDondeVerTipo === 'function') {
                    window._buscadorAbrirDondeVerTipo('donde_ver_plataforma');
                } else {
                    original();
                }
            };
            envuelta._envuelta = true;
            window._buscadorVolverANivel2DondeVer = envuelta;
        }

        // Arranca siempre desde un estado limpio — por si una entrada
        // directa anterior dejó algún "Volver" oculto en una pantalla
        // a la que ahora se llega por el camino normal del menú.
        document.querySelectorAll('.buscador-volver').forEach(btn => { btn.style.display = ''; });

        if (criterio) {
            const nivel1 = document.getElementById('buscadorNivel1');
            if (nivel1) nivel1.style.display = 'none';
            if (typeof window._buscadorCriterioSeleccionado === 'function') {
                window._buscadorCriterioSeleccionado(criterio);
            }
            // Esta es la pantalla de entrada del atajo — es el punto de
            // partida del flujo, no tiene a dónde volver. Si el usuario
            // avanza más adentro desde acá, los "Volver" de esas
            // pantallas siguientes no se tocan, siguen funcionando normal.
            // Revisa cada botón "Volver" directo (sin depender de cómo
            // se llame el contenedor que lo rodea — no todas las
            // pantallas siguen la misma convención de nombres) y oculta
            // el que esté realmente visible en este momento.
            document.querySelectorAll('.buscador-volver').forEach(btn => {
                if (btn.offsetParent !== null) {
                    btn.style.display = 'none';
                }
            });
        }
    };

    const esAutocontenido = criterio && window._CRITERIOS_AUTOCONTENIDOS.includes(criterio);
    if (esAutocontenido) {
        abrirYSeleccionar();
        return;
    }

    // Todo lo demás (el botón general de la barra, género, década,
    // plataforma, por título, etc.) termina mostrando su resultado en
    // una fila oculta que vive en el HTML de Inicio — sin eso en
    // pantalla, el resultado no tiene dónde aparecer. Si ya estamos
    // ahí, se abre directo; si no, navegamos primero.
    const hashActual = window.location.hash.replace('#', '') || 'feed-films';
    if (hashActual === 'feed-films') {
        abrirYSeleccionar();
        return;
    }

    window.location.hash = '#feed-films';
    const intentar = setInterval(() => {
        const hashAhora = window.location.hash.replace('#', '') || 'feed-films';
        if (hashAhora === 'feed-films') {
            clearInterval(intentar);
            abrirYSeleccionar();
        }
    }, 100);
    setTimeout(() => clearInterval(intentar), 5000);
};

window.abrirAsistenteBottomNav = function() {
    window._abrirBuscadorEnCriterio(null);
};
// Puebla el saludo personalizado de Inicio (mobile). Vive acá y no en
// feed-films.js porque el HTML de los módulos se inyecta por
// innerHTML — los <script> que traiga ese HTML nunca se ejecutan,
// así que esto necesita dispararse desde afuera, después de que el
// contenido ya esté insertado en el DOM.
window.actualizarSaludoInicioMobile = function() {
    const el = document.getElementById('inicioSaludoNombre');
    if (!el) return;
    const nombre = (window._perfilData && window._perfilData.name) || localStorage.getItem('userName') || '';
    el.textContent = nombre ? `Hola, ${nombre}` : 'Hola';
};

window.inicializarCarruselAccesosInicio = function() {
    const track = document.getElementById('inicioAccesosTrack');
    const dots = document.querySelectorAll('#inicioAccesosDots span');
    if (!track || dots.length === 0) return;
    track.addEventListener('scroll', () => {
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach((d, i) => d.classList.toggle('activo', i === idx));
    });
};

window.accesoRapidoInicio = async function(id) {
    const mapa = {
        'buscar-titulo': 'titulo_con_tipo', // primero pregunta si es película o serie
        'donde-verla': 'donde_ver_plataforma',
        'sagas': 'caracteristica_saga',      // solo películas: abre directo la grilla de sagas
        'remake': 'caracteristica_remake',   // solo películas: busca directo los remakes
        'actor-director': 'persona_nombre',
        'trabajaron-juntos': 'persona_cruce',
        'por-genero': 'genero_con_tipo',     // primero pregunta si es película o serie
        'anio-decada': 'epoca_con_tipo',     // primero pregunta si es película o serie
        'como-vengo': 'actividad_aprovechar',
        'que-aprovechar': 'actividad_proximo_premio',
        'mis-insignias': 'actividad_insignias',
    };

    if (id === 'mi-premium') {
        // Dinámico según el plan — mismo criterio que ya usa el propio
        // Buscador en _buscadorConfigurarBotonPremium.
        let esPremium = false;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/users/me/points/resumen`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const resumen = await res.json();
                esPremium = !!resumen.premium;
            }
        } catch (e) {}
        window._abrirBuscadorEnCriterio(esPremium ? 'actividad_reforzar_premium' : 'actividad_vale_premium');
        return;
    }

    const criterio = mapa[id];
    if (criterio && typeof window._abrirBuscadorEnCriterio === 'function') {
        window._abrirBuscadorEnCriterio(criterio);
    }
};

window.cambiarSwitchTipoInicio = function(tipo, el) {
    if (typeof window.seleccionarTabFeed === 'function') {
        window.seleccionarTabFeed(tipo, el);
    }
};

window.inicializarSwitchTipoInicio = function() {
    const sincronizar = (tab) => {
        document.querySelectorAll('.inicio-switch-btn').forEach(b => b.classList.remove('active'));
        const btn = tab === 'series' ? document.getElementById('inicioSwitchSeries') : document.getElementById('inicioSwitchPeliculas');
        if (btn) btn.classList.add('active');

        const header = document.querySelector('.inicio-catalogo-header');
        if (header) header.classList.toggle('tono-series', tab === 'series');

        // El degradé de los filtros (selector + íconos) es rojo en Películas y azul en Series.
        const catalogo = document.querySelector('.inicio-catalogo-mobile');
        if (catalogo) catalogo.classList.toggle('tono-series', tab === 'series');
    };

    // Se envuelve una sola vez por carga del módulo (el flag evita
    // envolver la envoltura si esta función corre de nuevo). Cualquier
    // llamado a seleccionarTabFeed desde CUALQUIER parte del sitio —
    // no solo desde nuestro switch — termina sincronizando acá.
    if (typeof window.seleccionarTabFeed === 'function' && !window.seleccionarTabFeed._envueltaSwitchInicio) {
        const original = window.seleccionarTabFeed;
        const envuelta = function(tab, el) {
            original(tab, el);
            sincronizar(tab);
        };
        envuelta._envueltaSwitchInicio = true;
        window.seleccionarTabFeed = envuelta;
    }

    // Por pedido explícito: Inicio siempre arranca en Películas, sin
    // importar qué tab haya quedado guardada de una visita anterior
    // (a diferencia del comportamiento normal del feed, que sí la
    // restaura). Fuerza tanto el contenido como el estado del switch.
    // Salvo que se haya llegado desde una pastilla del header (por ejemplo "Series" estando en Comunidad): en ese caso arranca
    // en la pestaña pedida, una sola vez.
    const tabInicial = window._tabInicioPendiente === 'series' ? 'series' : 'peliculas';
    window._tabInicioPendiente = null;
    if (typeof window.seleccionarTabFeed === 'function') {
        window.seleccionarTabFeed(tabInicial, document.getElementById(tabInicial === 'series' ? 'inicioSwitchSeries' : 'inicioSwitchPeliculas'));
    } else {
        sincronizar(tabInicial);
    }
};

window.abrirVotoRelampagoModal = function() {
    const overlay = document.getElementById('votoRelampagoModalOverlay');
    const sheet = document.getElementById('votoRelampagoModalSheet');
    if (!overlay || !sheet) return;
    overlay.classList.add('active');
    sheet.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Siempre arranca desde la intro, sin importar cómo se haya
    // cerrado la vez anterior.
    document.getElementById('vrModalPasoIntro').style.display = 'block';
    document.getElementById('vrModalPasoElegir').style.display = 'none';
    document.getElementById('votoRelampagoContainer').style.display = 'none';
    document.getElementById('votoRelampagoSeriesContainer').style.display = 'none';
};

window.cerrarVotoRelampagoModal = function() {
    const overlay = document.getElementById('votoRelampagoModalOverlay');
    const sheet = document.getElementById('votoRelampagoModalSheet');
    if (overlay) overlay.classList.remove('active');
    if (sheet) sheet.classList.remove('active');
    document.body.style.overflow = '';
};

window._votoRelampagoModalIrAElegir = function() {
    document.getElementById('vrModalPasoIntro').style.display = 'none';
    document.getElementById('vrModalPasoElegir').style.display = 'block';
};

window._votoRelampagoModalElegirTipo = function(tipo) {
    document.getElementById('vrModalPasoElegir').style.display = 'none';

    if (tipo === 'peliculas') {
        const cont = document.getElementById('votoRelampagoContainer');
        // Fuerza visible — le gana a cualquier show/hide viejo del feed
        // atado al switch Películas/Series, que podría haber corrido
        // antes de que abriéramos el modal.
        cont.style.display = 'block';
        if (typeof window.cargarVotoRelampago === 'function') {
            window.cargarVotoRelampago();
        }
    } else {
        const cont = document.getElementById('votoRelampagoSeriesContainer');
        cont.style.display = 'block';
        if (typeof window.cargarVotoRelampagoSerie === 'function') {
            window.cargarVotoRelampagoSerie();
        }
    }
};

window.abrirTriviaEleccionModal = function() {
    const overlay = document.getElementById('triviaEleccionModalOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.cerrarTriviaEleccionModal = function() {
    const overlay = document.getElementById('triviaEleccionModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
};

window._triviaEleccionElegirTipo = function(tipo) {
    window.cerrarTriviaEleccionModal();
    if (tipo === 'peliculas') {
        if (typeof window.abrirTrivia === 'function') window.abrirTrivia();
    } else {
        if (typeof window.abrirTriviaSeries === 'function') window.abrirTriviaSeries();
    }
};

// ==============================================
// TARJETA HORIZONTAL DE PELÍCULA / SERIE (solo mobile)
// 1) Resumen "33% · 3 votos · 1 comentario". Los contadores los escriben varias funciones de feed-films.js y
//    feed-series.js (la carga de estadísticas, el voto, el comentario...), cada una a su manera. En vez de tocarlas a
//    todas, un observador mira los cambios dentro de cada tarjeta y vuelve a armar el resumen leyendo lo que ya está
//    en pantalla (el texto de los botones de like y dislike, y el contador de comentarios).
// 2) Puntos que da cada acción: se muestran en los botones recién cuando se cargan acá abajo (no hay otra fuente en el
//    código: solo el servidor los devuelve después de votar). Mientras estén en null, el botón muestra solo el ícono.
// ==============================================
window._PUNTOS_ACCION = { like: null, dislike: null, comentario: null };
window._aplicarPuntosAccion = function() {
    const estilo = document.documentElement.style;
    ['like', 'dislike', 'comentario'].forEach(clave => {
        const valor = window._PUNTOS_ACCION[clave];
        estilo.setProperty('--pts-' + clave, valor ? `"+${valor}"` : 'none');
    });
};

window._resumenTarjetaMobile = function(tarjeta) {
    const destino = tarjeta.querySelector('.card-m-resumen');
    if (!destino) return;
    const numero = (el) => { const n = parseInt(((el && el.textContent) || '').replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };
    const likes = numero(tarjeta.querySelector('.btn-like'));
    const dislikes = numero(tarjeta.querySelector('.btn-dislike'));
    const comentarios = numero(tarjeta.querySelector('.comentarios-count'));
    const votos = likes + dislikes;
    const plural = (n, singular, plural_) => `${n.toLocaleString('es-AR')} ${n === 1 ? singular : plural_}`;
    const html = (votos > 0 ? `<b>${Math.round(likes / votos * 100)}%</b> · ${plural(votos, 'voto', 'votos')}` : 'Sin votos todavía')
        + ` · ${plural(comentarios, 'comentario', 'comentarios')}`;
    if (destino.innerHTML !== html) destino.innerHTML = html;
};

window._iniciarResumenTarjetasMobile = function() {
    if (window._obsResumenTarjetas || typeof MutationObserver === 'undefined') return;
    const SELECTOR = '.pelicula-card, .serie-card';
    const pendientes = new Set();
    let programado = false;
    const esMobile = () => !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    const procesar = () => {
        programado = false;
        if (esMobile()) pendientes.forEach(t => { if (t.isConnected) window._resumenTarjetaMobile(t); });
        pendientes.clear();
    };
    window._obsResumenTarjetas = new MutationObserver(registros => {
        for (const r of registros) {
            const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
            if (el && el.closest && !el.closest('.card-m-resumen')) {   // ignorar lo que escribimos nosotros
                const tarjeta = el.closest(SELECTOR);
                if (tarjeta) pendientes.add(tarjeta);
            }
            r.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.matches && n.matches(SELECTOR)) pendientes.add(n);
                else if (n.querySelectorAll) n.querySelectorAll(SELECTOR).forEach(t => pendientes.add(t));
            });
        }
        if (pendientes.size && !programado) { programado = true; requestAnimationFrame(procesar); }
    });
    window._obsResumenTarjetas.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    // Si la pantalla pasa de escritorio a mobile (por ejemplo al girar el teléfono), las tarjetas ya dibujadas se actualizan.
    if (window.matchMedia) window.matchMedia('(max-width: 768px)').addEventListener('change', e => {
        if (e.matches) document.querySelectorAll(SELECTOR).forEach(t => window._resumenTarjetaMobile(t));
    });
};
window._aplicarPuntosAccion();
window._iniciarResumenTarjetasMobile();

// ==============================================
// ÍCONOS 3D de los pills de orden y de género (feed de Películas y de Series; solo se ven en mobile)
// Cambian el emoji de cada pill por un ícono 3D (Fluent Emoji 3D de Microsoft, licencia MIT; el texto de la
// licencia está en assets/images/iconos3d/LICENSE.txt). El emoji queda en el HTML como respaldo: si la imagen no
// carga, se muestra él. Un género que no esté en la lista usa el ícono de la tira de fotogramas.
// ==============================================
window._ICONOS_3D_PILLS = {
    '🔥': 'fire', '🎬': 'clapper_board', '📽': 'film_projector', '👍': 'thumbs_up', '📅': 'calendar',
    '💥': 'collision', '🗺': 'world_map', '🎨': 'artist_palette', '😂': 'face_with_tears_of_joy', '🔪': 'kitchen_knife',
    '🎥': 'movie_camera', '🎭': 'performing_arts', '📜': 'scroll', '👻': 'ghost', '🎵': 'musical_note',
    '🔎': 'magnifying_glass_tilted_right', '💕': 'two_hearts', '🚀': 'rocket', '📺': 'television', '😰': 'anxious_face_with_sweat',
    '⚔': 'crossed_swords', '🤠': 'cowboy_hat_face', '🎞': 'film_frames', '🧒': 'child', '📰': 'newspaper',
    '🎪': 'circus_tent', '💔': 'broken_heart', '🎤': 'microphone', '🧙': 'person_mage', '👨': 'house_with_garden'
};
window.iconoPill3D = function(emoji) {
    // Se compara por el primer carácter: así "📽️" (con variante) y "👨‍👩‍👧" (compuesto) también coinciden.
    const clave = emoji ? String.fromCodePoint(emoji.codePointAt(0)) : '';
    const archivo = window._ICONOS_3D_PILLS[clave] || window._ICONOS_3D_PILLS['🎞'];
    return `<span class="pill-orden-emoji">${emoji}</span>` +
        `<img class="pill-orden-img" src="assets/images/iconos3d/${archivo}.webp" alt="" width="38" height="38" loading="lazy" decoding="async" draggable="false" ` +
        `onerror="this.style.display='none'; this.previousElementSibling.style.display='block';">`;
};

// ==============================================
// TARJETA "TUS PUNTOS" — primera diapositiva del carrusel destacado de Inicio (solo mobile)
// Muestra la propuesta de valor (votá, comentá, sumá) con los puntos del mes. La comparten el carrusel de
// Películas y el de Series, y por eso vive acá: bottom-nav.js se carga siempre. Cada carrusel solo la agrega
// a su lista y le pide a esta función que la dibuje.
// ==============================================
window._esMobileInicio = function() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
};

window._misPuntosInicio = { listo: false, cargando: false, ts: 0, datos: null };

window._escHtmlInicio = function(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// Los números salen de los mismos datos y con las mismas reglas que "¿Cómo vengo este mes?" y "Qué puedo
// aprovechar" del asistente, para que la tarjeta y el asistente nunca se contradigan.
window._cargarMisPuntosInicio = async function() {
    const est = window._misPuntosInicio;
    est.cargando = true;
    try {
        const token = localStorage.getItem('token');
        const cab = { headers: { 'Authorization': `Bearer ${token}` } };
        const [resResumen, resFree] = await Promise.all([
            fetch(`${CONFIG.API_URL}/users/me/points/resumen`, cab),
            fetch(`${CONFIG.API_URL}/rewards/all`, cab)
        ]);
        if (!resResumen.ok) throw new Error();
        const resumen = await resResumen.json();
        let premios = resFree.ok ? await resFree.json() : [];
        if (resumen.premium) {
            const resPremium = await fetch(`${CONFIG.API_URL}/premium/rewards`, cab);
            if (resPremium.ok) premios = premios.concat(await resPremium.json());
        }

        // Lo que realmente se deposita el 1°: lo acumulado en el mes, con el tope mensual de los usuarios free.
        const acumulados = resumen.accumulatedPoints || 0;
        const superoTope = resumen.monthlyCap != null && acumulados > resumen.monthlyCap;
        const aLiberar = superoTope ? resumen.monthlyCap : acumulados;

        // Premio más cercano: el vigente que todavía no alcanzás, el de menor costo (igual que el asistente).
        const vigentes = premios.filter(p => p.hasStock && !p.isExpired && (p.type !== 'SORTEO' || p.drawExecuted !== true));
        const pendientes = vigentes.filter(p => !p.canRedeem).sort((a, b) => a.pointsRequired - b.pointsRequired);

        est.datos = {
            premium: !!resumen.premium,
            disponibles: resumen.availablePoints || 0,
            aLiberar,
            superoTope,
            premioCercano: pendientes[0] ? { nombre: pendientes[0].name || 'un premio', puntos: pendientes[0].pointsRequired } : null,
            yaPodesCanjear: pendientes.length === 0 && vigentes.some(p => p.canRedeem)
        };
    } catch (e) {
        // Se conservan los datos anteriores, si había.
    }
    est.listo = true;
    est.cargando = false;
    est.ts = Date.now();
    try { sessionStorage.setItem('cm_mis_puntos', JSON.stringify({ datos: est.datos, ts: est.ts })); } catch (e) {}
};

// Hacerse Premium: el plan se contrata en Mi cuenta.
window.irAPremiumDesdeInicio = function() {
    window.location.hash = '#mi-cuenta';
};

// Dibuja la tarjeta dentro de la card del carrusel. "repintar" se llama cuando terminan de llegar los datos,
// para que el carrusel la vuelva a dibujar si sigue siendo la diapositiva que se está viendo.
window._renderTarjetaMisPuntos = function(card, label, repintar) {
    const est = window._misPuntosInicio;

    // Primer pintado con lo último que se sepa (caché de la sesión) mientras se revalida en segundo plano.
    if (!est.listo) {
        try {
            const cache = JSON.parse(sessionStorage.getItem('cm_mis_puntos') || 'null');
            if (cache && cache.datos) { est.datos = cache.datos; est.listo = true; est.ts = cache.ts || 0; }
        } catch (e) {}
    }
    // Los puntos cambian al votar o comentar: si pasó más de un minuto, se vuelven a pedir.
    const vencido = !est.ts || (Date.now() - est.ts) > 60000;
    if (!est.cargando && vencido) {
        window._cargarMisPuntosInicio().then(() => { if (typeof repintar === 'function') repintar(); });
    }

    label.textContent = '🪙 Tus puntos';
    card.onclick = () => { window.location.hash = '#club-beneficios'; };

    const d = est.datos;
    const esc = window._escHtmlInicio;
    const nombreCompleto = (window._perfilData && window._perfilData.name) || localStorage.getItem('userName') || '';
    const primerNombre = nombreCompleto.trim().split(/\s+/)[0];
    const saludo = primerNombre ? `Hola, ${esc(primerNombre)}` : 'Hola';

    // Premium: informativo si ya lo es; botón para hacerse Premium si no.
    let premiumHtml = '';
    if (d) {
        premiumHtml = d.premium
            ? '<span class="mis-puntos-premium">×2 con Premium</span>'
            : '<button type="button" class="mis-puntos-premium mis-puntos-premium-btn" onclick="event.stopPropagation(); window.irAPremiumDesdeInicio()">Hacete Premium ×2</button>';
    }

    const numero = d ? d.aLiberar.toLocaleString('es-AR') : '—';
    const rotulo = d && d.superoTope ? 'puntos · tope del mes' : 'puntos este mes';
    const primero = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    const fecha = `Se depositan<br>el 1° de ${primero.toLocaleDateString('es-AR', { month: 'long' })}`;

    // Barra hacia el premio más cercano: lo disponible hoy (sólido) y, a continuación, lo que se suma el 1° (suave).
    let premioHtml = '';
    if (d && d.premioCercano && d.premioCercano.puntos > 0) {
        const req = d.premioCercano.puntos;
        const pctDisp = Math.min(100, (d.disponibles / req) * 100);
        const pctMes = Math.max(0, Math.min(100 - pctDisp, (d.aLiberar / req) * 100));
        const nombrePremio = esc(d.premioCercano.nombre);
        premioHtml = `
            <div class="mis-puntos-barra" role="img" aria-label="Tenés ${d.disponibles} de ${req} puntos para ${nombrePremio}">
                <div class="mis-puntos-barra-disp" style="width:${pctDisp}%"></div>
                <div class="mis-puntos-barra-mes" style="width:${pctMes}%"></div>
            </div>
            <div class="mis-puntos-premio"><span>Premio más cercano: ${nombrePremio}</span><span>${d.disponibles.toLocaleString('es-AR')} / ${req.toLocaleString('es-AR')}</span></div>`;
    } else if (d && d.yaPodesCanjear) {
        premioHtml = '<div class="mis-puntos-premio mis-puntos-premio-ok"><span>Ya podés canjear un premio</span></div>';
    }

    card.innerHTML = `
        <div class="destacada-img-real mis-puntos-card">
            <div class="mis-puntos-top">
                <span class="mis-puntos-saludo">${saludo}</span>
                ${premiumHtml}
            </div>
            <div class="mis-puntos-titulo">Lo mejor del cine está en vos</div>
            <div class="mis-puntos-fila">
                <div class="mis-puntos-total"><span class="mis-puntos-num">${numero}</span><span class="mis-puntos-lbl">${rotulo}</span></div>
                <span class="mis-puntos-fecha">${fecha}</span>
            </div>
            ${premioHtml}
        </div>`;
};