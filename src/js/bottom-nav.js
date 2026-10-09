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
    if (typeof window.seleccionarTabFeed === 'function') {
        window.seleccionarTabFeed('peliculas', document.getElementById('inicioSwitchPeliculas'));
    } else {
        sincronizar('peliculas');
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