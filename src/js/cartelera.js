// Mismo catálogo y misma lógica de conversión que usa
// _buscadorCarteleraBuscarCoincidencia en feed-films.js — el perfil
// guarda el nombre completo ("Mendoza"), pero el backend compara la
// provincia con igualdad exacta de texto contra el slug interno
// ("mendoza"). No reusamos la función de feed-films.js directo
// porque Cartelera es un módulo aparte y ese archivo puede no estar
// cargado en este momento.
var CARTELERA_PROVINCIAS_SLUG = [
    ['caba', 'Ciudad Autónoma de Buenos Aires'], ['buenos-aires', 'Buenos Aires'],
    ['catamarca', 'Catamarca'], ['chaco', 'Chaco'], ['chubut', 'Chubut'],
    ['cordoba', 'Córdoba'], ['corrientes', 'Corrientes'], ['entre-rios', 'Entre Ríos'],
    ['formosa', 'Formosa'], ['jujuy', 'Jujuy'], ['la-pampa', 'La Pampa'],
    ['la-rioja', 'La Rioja'], ['mendoza', 'Mendoza'], ['misiones', 'Misiones'],
    ['neuquen', 'Neuquén'], ['rio-negro', 'Río Negro'], ['salta', 'Salta'],
    ['san-juan', 'San Juan'], ['san-luis', 'San Luis'], ['santa-cruz', 'Santa Cruz'],
    ['santa-fe', 'Santa Fe'], ['santiago-del-estero', 'Santiago del Estero'],
    ['tierra-del-fuego', 'Tierra del Fuego'], ['tucuman', 'Tucumán'],
];

function carteleraSlugProvincia(texto) {
    const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const query = normalizar(texto);
    const match = CARTELERA_PROVINCIAS_SLUG.find(([slug, nombre]) => normalizar(nombre) === query || normalizar(slug) === query);
    return match ? match[0] : null;
}

window.init_cartelera = async function() {
    const cont = document.getElementById('carteleraCercaResultado');
    if (!cont) return;

    // Pide el perfil fresco en vez de confiar en window._perfilData —
    // esa foto se toma una sola vez al cargar dashboard.html y nunca
    // se actualiza después, ni siquiera al guardar cambios en
    // Configuración. Acá necesitamos la zona real de ahora mismo.
    let provincia, localidad;
    try {
        const perfil = await API.getProfile();
        console.log('[cartelera-debug] perfil fresco:', perfil);
        provincia = perfil.provincia;
        localidad = perfil.localidad;
    } catch (e) {
        console.log('[cartelera-debug] API.getProfile() falló:', e);
        provincia = window._perfilData && window._perfilData.provincia;
        localidad = window._perfilData && window._perfilData.localidad;
    }
    if (!provincia) {
        cont.innerHTML = '<div class="cartelera-cerca-vacio">Cargá tu provincia/localidad en <a href="#mi-cuenta" style="color:#c4321f;font-weight:700;">Configuración</a> para que podamos ofrecerte la mejor cartelera.</div>';
        return;
    }

    // El backend compara la provincia con igualdad exacta contra su
    // slug interno ("mendoza", no "Mendoza") — localidad no necesita
    // esta conversión porque el backend la matchea con texto libre
    // normalizado (ver CarteleraLiveScraperService.organizarSalida).
    const provinciaSlug = carteleraSlugProvincia(provincia);
    if (!provinciaSlug) {
        cont.innerHTML = '<div class="cartelera-cerca-vacio">No encontramos tu provincia en las zonas que cubrimos todavía.</div>';
        return;
    }

    try {
        const hoy = carteleraFechaHoy();
        const params = new URLSearchParams({ provincia: provinciaSlug, fecha: hoy });
        if (localidad) params.set('localidad', localidad);

        const token = localStorage.getItem('token');
        console.log('[cartelera-debug] pidiendo:', `${CONFIG.API_URL}/cartelera/organizar-salida?${params}`);
        const res = await fetch(`${CONFIG.API_URL}/cartelera/organizar-salida?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('status ' + res.status);
        const funciones = await res.json();
        console.log('[cartelera-debug] funciones recibidas:', funciones);

        if (!funciones.length) {
            cont.innerHTML = '<div class="cartelera-cerca-vacio">No encontramos funciones para hoy en tu zona.</div>';
            return;
        }

        // Una tarjeta por película Y por cine, así aparecen las funciones de TODOS los cines de la
        // zona. (Antes había una tarjeta por película y se mostraba un solo cine, el de la primera
        // función: si la película estaba en dos cines de la zona, el otro quedaba oculto.)
        // El orden es el que manda el backend: arriba, lo que empieza antes.
        const grupos = new Map();
        funciones.forEach(f => {
            const clave = `${f.peliculaTitulo}\u0000${f.cineNombre}`;
            if (!grupos.has(clave)) grupos.set(clave, []);
            grupos.get(clave).push(f);
        });

        // Datos de cada tarjeta, para el modal que se abre al tocarla (js/cartelera-modal.js).
        // Si esa pieza no está cargada, las tarjetas quedan como antes: sin tocar.
        const tarjetas = [];
        const conModal = !!window.CarteleraModal;

        const htmlTarjetas = [...grupos.values()].map((delCine, idx) => {
            const pelicula = delCine[0].peliculaTitulo;
            const poster = delCine[0].poster || '';

            // Cada tarjeta es de UN cine: los horarios y el precio salen solo de las funciones
            // de ese cine, así que nunca se mezclan con los de otro.
            const cine = delCine[0].cineNombre;
            const funcs = delCine.slice().sort((a, b) => String(a.horario).localeCompare(String(b.horario)));

            // Hasta 4 horarios. Si quedan más, un pill "+N" con las que no entran;
            // con una sola oculta se muestra directo, porque un "+1" no ahorra lugar.
            const MAX_HORARIOS = 4;
            const visibles = funcs.length <= MAX_HORARIOS + 1 ? funcs : funcs.slice(0, MAX_HORARIOS);
            const ocultas = funcs.length - visibles.length;
            const horarios = visibles.map(f => `<span class="cartelera-cerca-horario">${carteleraHora(f.horario)}</span>`).join('')
                + (ocultas > 0 ? `<span class="cartelera-cerca-horario cartelera-cerca-mas">+${ocultas}</span>` : '');

            // Precio de la película en ese cine: el más bajo entre sus funciones de
            // hoy, con lo que haya (ver js/cartelera-precio.js). Si esa pieza no
            // está cargada, la tarjeta queda como antes.
            const precio = window.CarteleraPrecio ? window.CarteleraPrecio.resumen(funcs) : '';

            // El modal recibe TODAS las funciones de ese cine: la tarjeta muestra hasta 4
            // horarios, el modal los muestra todos con su precio.
            tarjetas[idx] = { pelicula, poster, cine, funciones: funcs, cargarSinopsis: () => carteleraSinopsis(pelicula) };
            return `
                <div class="cartelera-cerca-card"${conModal ? ` role="button" tabindex="0" data-idx="${idx}"` : ''}>
                    ${poster ? `<img src="${poster}" alt="${pelicula}" class="cartelera-cerca-poster" loading="lazy">` : ''}
                    <div class="cartelera-cerca-info">
                        <div class="cartelera-cerca-pelicula">${pelicula}</div>
                        <div class="cartelera-cerca-cine">${cine}</div>
                        <div class="cartelera-cerca-horarios">${horarios}</div>
                        ${precio}
                    </div>
                    ${conModal ? '<i class="fas fa-chevron-right cm-flecha"></i>' : ''}
                </div>`;
        });

        // Hasta 5 tarjetas a la vista; si hay más, un carrusel para pasar a las siguientes.
        carteleraMontarCarrusel(cont, htmlTarjetas, TARJETAS_POR_PAGINA);
        // Tocar una tarjeta (o Enter / Espacio con el foco en ella) abre el modal de la película.
        // Se asigna con onclick / onkeydown, no con addEventListener, para que volver a entrar
        // a Cartelera no deje el evento duplicado.
        const abrirTarjeta = (card) => {
            const datos = card && tarjetas[Number(card.dataset.idx)];
            if (datos && window.CarteleraModal) window.CarteleraModal.abrir(datos, card);
        };
        cont.onclick = (e) => abrirTarjeta(e.target.closest('.cartelera-cerca-card[data-idx]'));
        cont.onkeydown = (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target.closest('.cartelera-cerca-card[data-idx]');
            if (!card) return;
            e.preventDefault();
            abrirTarjeta(card);
        };

    } catch (e) {
        cont.innerHTML = '<div class="cartelera-cerca-vacio">No pudimos cargar las funciones. Intentá de nuevo.</div>';
    }
};

// "13:20:00" → "13:20" (el backend manda la hora con segundos).
function carteleraHora(h) {
    return h ? String(h).slice(0, 5) : '';
}

// La fecha de HOY en Argentina, como "2026-10-07". No sirve new Date().toISOString(): da la fecha UTC,
// y entre las 21:00 y las 23:59 hs de Argentina ya es "mañana" para UTC (se mostrarían las funciones de
// mañana bajo el título "Hoy"). Tampoco depende de la zona horaria del teléfono.
function carteleraFechaHoy() {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valor = (tipo) => partes.find(p => p.type === tipo).value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

// Cuántas tarjetas se ven a la vez en "Hoy cerca tuyo"; si hay más, se pasan con el carrusel.
// (var y no const: este archivo se vuelve a ejecutar entero en cada visita a Cartelera.)
var TARJETAS_POR_PAGINA = 5;

// Estilos del carrusel. Se inyectan una sola vez; los de las tarjetas siguen en cartelera.html.
function carteleraInyectarEstilos() {
    if (document.getElementById('cc-estilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'cc-estilos';
    estilo.textContent = [
        // La pista recorta lo que se sale, así que se le da margen a los costados y abajo para que las
        // sombras de las tarjetas no queden cortadas.
        '.cc-pista { display: flex; align-items: flex-start; margin: 0 -14px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; transition: height .25s ease; }',
        '.cc-pista::-webkit-scrollbar { display: none; }',
        '.cc-pagina { flex: 0 0 100%; width: 100%; box-sizing: border-box; padding: 4px 14px 22px; scroll-snap-align: start; scroll-snap-stop: always; }',
        '.cc-pie { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: -6px; }',
        '.cc-flecha { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; font-size: .8rem; color: #16264d; background: #fff; box-shadow: 0 6px 14px -6px rgba(22,38,77,.35); }',
        '.cc-flecha:disabled { opacity: .35; cursor: default; box-shadow: none; }',
        '.cc-flecha:focus-visible { outline: 2px solid #c4321f; outline-offset: 2px; }',
        '.cc-contador { min-width: 84px; text-align: center; font-size: .75rem; font-weight: 700; color: #8a8478; }',
        '@media (prefers-reduced-motion: reduce) { .cc-pista { transition: none; } }'
    ].join('\n');
    document.head.appendChild(estilo);
}

// Pone las tarjetas en `cont`. Hasta `porPagina` van sueltas, como siempre. Si hay más, se arma un
// carrusel con páginas de `porPagina` tarjetas, que se pasa deslizando o con las flechas, y un
// contador ("6–10 de 23") que dice cuántas hay en total.
function carteleraMontarCarrusel(cont, htmls, porPagina) {
    if (htmls.length <= porPagina) {
        cont.innerHTML = htmls.join('');
        return;
    }
    carteleraInyectarEstilos();

    const paginas = [];
    for (let i = 0; i < htmls.length; i += porPagina) paginas.push(htmls.slice(i, i + porPagina));

    cont.innerHTML = `
        <div class="cc-carrusel">
            <div class="cc-pista">
                ${paginas.map(p => `<div class="cc-pagina">${p.join('')}</div>`).join('')}
            </div>
            <div class="cc-pie">
                <button type="button" class="cc-flecha" data-paso="-1" aria-label="Ver las anteriores"><i class="fas fa-chevron-left"></i></button>
                <span class="cc-contador" aria-live="polite"></span>
                <button type="button" class="cc-flecha" data-paso="1" aria-label="Ver las siguientes"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>`;

    const pista = cont.querySelector('.cc-pista');
    const hojas = [...cont.querySelectorAll('.cc-pagina')];
    const contador = cont.querySelector('.cc-contador');
    const [anterior, siguiente] = cont.querySelectorAll('.cc-flecha');
    let actual = -1;

    // El alto de la pista es el de la página que se ve: las otras pueden ser más cortas o más largas.
    const ajustarAlto = () => {
        const alto = hojas[actual] ? hojas[actual].offsetHeight : 0;
        if (alto) pista.style.height = alto + 'px';
    };

    // Solo actualiza lo que se ve: contador, flechas y qué página puede recibir el foco.
    const mostrar = (n) => {
        n = Math.max(0, Math.min(hojas.length - 1, n));
        if (n === actual) return;
        actual = n;
        const desde = actual * porPagina + 1;
        const hasta = Math.min(htmls.length, (actual + 1) * porPagina);
        contador.textContent = `${desde}–${hasta} de ${htmls.length}`;
        anterior.disabled = actual === 0;
        siguiente.disabled = actual === hojas.length - 1;
        // Las páginas que no se ven no reciben el foco del teclado ni las leen los lectores de pantalla.
        hojas.forEach((h, i) => h.toggleAttribute('inert', i !== actual));
        ajustarAlto();
    };

    const irA = (n) => {
        mostrar(n);
        const x = actual * pista.clientWidth;
        if (typeof pista.scrollTo === 'function') pista.scrollTo({ left: x, behavior: 'smooth' });
        else pista.scrollLeft = x;
    };

    // Al deslizar con el dedo, el contador sigue a la página que quedó a la vista.
    pista.addEventListener('scroll', () => {
        if (pista.clientWidth) mostrar(Math.round(pista.scrollLeft / pista.clientWidth));
    });
    cont.querySelector('.cc-pie').addEventListener('click', (e) => {
        const boton = e.target.closest('[data-paso]');
        if (boton && !boton.disabled) irA(actual + Number(boton.dataset.paso));
    });
    if (typeof ResizeObserver === 'function') {
        const vigia = new ResizeObserver(ajustarAlto);
        hojas.forEach(h => vigia.observe(h));
    }
    mostrar(0);
}

// Sinopsis de una película (la trae el backend, desde agendadecine). Devuelve el texto, o '' si no
// hay o si el pedido falla; el modal se ocupa de no mostrar nada en ese caso.
async function carteleraSinopsis(titulo) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${CONFIG.API_URL}/cartelera/pelicula-info?titulo=${encodeURIComponent(titulo)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return '';
    const info = await res.json();
    return (info && info.sinopsis) || '';
}

window.accesoRapidoCartelera = function(id) {
    const mapa = {
        'ya-se-que-ver': 'cartelera_ya_se_que_ver',
        'recomendacion-cines': 'cartelera_recomendacion',
        'organizar-salida': 'cartelera_que_hay',
        'por-cadena': 'cartelera_cadena',
    };
    const criterio = mapa[id];
    if (criterio && typeof window._abrirBuscadorEnCriterio === 'function') {
        window._abrirBuscadorEnCriterio(criterio);
    }
};