// ==============================================
// feed-films.js - Módulo de películas
// ==============================================

// ==============================================
// LIMPIAR MODALES DUPLICADOS
// ==============================================
function limpiarModalesDuplicados() {
    const modales = document.querySelectorAll('#modalPelicula');
    if (modales.length > 1) {
        for (let i = 1; i < modales.length; i++) {
            modales[i].remove();
        }
    }
}

// ==============================================
// VARIABLES GLOBALES
// ==============================================
window.estadoPaginacion = {
    paginaActual: 1,
    totalPaginas: 1,
    totalResultados: 0,
    cargando: false
};

window.modalActualId = null;
window.peliculaActualId = null;
window._comentarioReportandoId = null;
window._replyReportandoId = null;
window._comentarioOcultandoId = null;
window._replyOcultandoId = null;
window._gifSeleccionado = null;

// ==============================================
// FUNCIÓN PARA CARGAR COMPONENTES HTML
// ==============================================
async function cargarComponente(url, contenedorId) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        document.getElementById(contenedorId).innerHTML = html;
    } catch (error) {
    }
}

// ==============================================
// FUNCIÓN PARA GENERAR TARJETAS
// ==============================================

window._pintarContadorComentarios = function(el, count) {
    if (!el) return;
    el.textContent = count;
    el.closest('.btn-comentarios-card')?.classList.toggle('tiene-comentarios', count > 0);
};

// ==============================================
// "NO ME INTERESA" — solo afecta qué se muestra en
// el feed hacia adelante; no toca votos, comentarios,
// puntos ni notificaciones (decisión tomada explícitamente,
// separado de "ocultar comentario" a propósito).
// ==============================================
window.marcarNoInteresaPelicula = function(movieId, event) {
    if (event) event.stopPropagation();
    const card = document.querySelector(`.pelicula-card[data-id="${movieId}"]`);
    const titulo = card?.querySelector('.pelicula-titulo')?.textContent?.trim()
        || document.getElementById('modalTitulo')?.textContent?.trim()
        || 'esta película';

    _abrirModalNoInteresa(titulo, async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}/no-me-interesa`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
        } catch (e) {
            alert('No se pudo guardar tu preferencia. Intentá de nuevo.');
            return;
        }

                        // Ocultado inmediato de todas las tarjetas de esta película
                        // que estén en pantalla (puede repetirse en más de un carrusel).
                        // Se borra el .fila-genero-slide entero (el que da el ancho fijo
                        // para el scroll-snap), no solo la .pelicula-card de adentro —
                        // si no, queda el "cascarón" vacío del slide ocupando su lugar.
                        document.querySelectorAll(`.pelicula-card[data-id="${movieId}"]`).forEach(el => {
                            const slide = el.closest('.fila-genero-slide') || el;
                            const track = slide.closest('.fila-genero-track');
                            const indiceEliminado = track ? Array.from(track.children).indexOf(slide) : -1;

                            slide.style.transition = 'opacity 0.25s ease';
                            slide.style.opacity = '0';
                            setTimeout(() => {
                                slide.remove();
                                // Avanza automáticamente: al sacar el slide, todo lo que
                                // venía después se corre un lugar — la que antes era "la
                                // siguiente" ahora ocupa exactamente esta misma posición.
                                if (track && indiceEliminado >= 0) {
                                    const anchoCard = track.children[0]?.offsetWidth || track.clientWidth || 1;
                                    track.scrollLeft = indiceEliminado * anchoCard;
                                }
                            }, 250);
                        });

                        // Si la acción se disparó desde ADENTRO del modal de detalle
                        // (estás viendo justo esta película), no tiene sentido dejarlo
                        // abierto mostrando algo que acabás de decir que no te interesa
                        // — se cierra, y al volver al carrusel de atrás, la tarjeta ya
                        // desapareció con la animación de arriba.
                        if (String(window.peliculaActualId) === String(movieId) && typeof window.cerrarModal === 'function') {
                            window.cerrarModal();
                        }
                    });
                };

function _abrirModalNoInteresa(titulo, onConfirmar) {
    let modal = document.getElementById('modalNoInteresaPelicula');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="modalNoInteresaPelicula" onclick="window._cerrarModalNoInteresaPelicula()" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999999; align-items:center; justify-content:center; padding:1rem;">
                <div style="background:white; border-radius:16px; padding:2rem; max-width:400px; width:100%;" onclick="event.stopPropagation()">
                    <h3 style="margin:0 0 0.75rem; font-size:1.05rem; color:#333; display:flex; align-items:center; gap:0.5rem;">
                                                <i class="fas fa-minus-circle" style="color:#e50914;"></i> No me interesa
                    </h3>
                    <p id="modalNoInteresaPeliculaTexto" style="margin:0 0 1.5rem; font-size:0.9rem; color:#666; line-height:1.5;"></p>
                    <div style="display:flex; gap:0.75rem;">
                        <button onclick="window._cerrarModalNoInteresaPelicula()" style="flex:1; padding:0.7rem; border:1.5px solid #ddd; background:none; border-radius:8px; color:#666; cursor:pointer; font-size:0.9rem;">Cancelar</button>
                        <button id="btnConfirmarNoInteresaPelicula" style="flex:2; padding:0.7rem; background:#e50914; border:none; border-radius:8px; color:white; font-weight:600; cursor:pointer; font-size:0.9rem;">Sí, no me interesa</button>
                    </div>
                </div>
            </div>`);
        modal = document.getElementById('modalNoInteresaPelicula');
    }

        document.body.style.overflow = 'hidden';

        document.getElementById('modalNoInteresaPeliculaTexto').textContent =
            `No vas a volver a ver "${titulo}" en tu feed. Esta acción no se puede deshacer.`;

        // Reemplaza el botón para limpiar el listener de una tarjeta anterior
        // (si se abrió este modal antes para otra película), Y lo resetea a
        // su estado normal — si la vez anterior quedó en "Guardando..."
        // (disabled), el cloneNode de acá abajo copiaría ese mismo estado
        // roto si no se lo reseteamos primero.
        const btnViejo = document.getElementById('btnConfirmarNoInteresaPelicula');
        btnViejo.disabled = false;
        btnViejo.textContent = 'Sí, no me interesa';
        const btnNuevo = btnViejo.cloneNode(true);
        btnViejo.replaceWith(btnNuevo);
        btnNuevo.onclick = async () => {
            btnNuevo.disabled = true;
            btnNuevo.textContent = 'Guardando...';
            await onConfirmar();
            window._cerrarModalNoInteresaPelicula();
        };

    modal.style.display = 'flex';
}

window._cerrarModalNoInteresaPelicula = function() {
    const modal = document.getElementById('modalNoInteresaPelicula');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

// Se carga una sola vez (no por cada fila/carrusel) y se cachea en
// memoria — cada llamada a generarTarjetasHTML la reusa.
window._peliculasNoInteresaIds = null;
async function _cargarPeliculasNoInteresaIds() {
    if (window._peliculasNoInteresaIds !== null) return window._peliculasNoInteresaIds;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/movies/no-me-interesa/ids`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        window._peliculasNoInteresaIds = res.ok ? await res.json() : [];
    } catch (e) {
        window._peliculasNoInteresaIds = [];
    }
    return window._peliculasNoInteresaIds;
}

window.generarTarjetasHTML = async function(peliculas) {
    try {
         const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;
         const anioActual = new Date().getFullYear();
         const criterio = window._criterioOrden || 'fecha';
         const excluidas = await _cargarPeliculasNoInteresaIds();

          const peliculasFiltradas = peliculas.filter(p => {
              if (excluidas.includes(p.id)) return false;
              if (!p.poster_path) return false;
              if (!p.overview || p.overview.trim() === '') return false;
              if (!p.title || !soloLatinos.test(p.title.trim())) return false;

              // "Lo que se viene": fecha de estreno posterior a HOY —
              // sin importar si es este año o el que viene. Antes solo
              // contaba "año que viene", dejando afuera estrenos
              // legítimos de acá a fin de este año.
              if (criterio === 'proximamente') {
                  return !!p.release_date && new Date(p.release_date) > new Date();
              }

              // Feed normal: excluir películas de años futuros
              const anio = p.release_date ? new Date(p.release_date).getFullYear() : null;
              return !anio || anio <= anioActual;
          });

        const response = await fetch('modules/feed-tarjeta.html');
        let plantilla = await response.text();

        return peliculasFiltradas.map(pelicula => {
            const posterUrl = pelicula.poster_path
                ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
                : 'https://via.placeholder.com/300x450?text=Sin+imagen';

            const year = pelicula.release_date
                ? new Date(pelicula.release_date).getFullYear()
                : 'Próximamente';

                        const overview = pelicula.overview
                            ? pelicula.overview.substring(0, 110) + '...'
                            : 'Sinopsis no disponible';

                        // Fase "Lo que se viene" — si el estreno todavía no pasó,
                        // el bloque de acciones es expectativa (estrellas), no
                        // voto/comentario (mismo criterio que ya usa el modal).
                        const esProximoEstreno = !!pelicula.release_date && new Date(pelicula.release_date) > new Date();

                        const accionesVotacion = esProximoEstreno ? `
                            <div class="card-expectativa" id="expectativa-${pelicula.id}">
                                <p class="card-expectativa-titulo">¿La estás esperando?</p>
                                <div class="card-expectativa-estrellas">
                                    <i class="fas fa-star" data-valor="1" onclick="event.stopPropagation(); window.calificarExpectativaCard(${pelicula.id}, 1)"></i>
                                    <i class="fas fa-star" data-valor="2" onclick="event.stopPropagation(); window.calificarExpectativaCard(${pelicula.id}, 2)"></i>
                                    <i class="fas fa-star" data-valor="3" onclick="event.stopPropagation(); window.calificarExpectativaCard(${pelicula.id}, 3)"></i>
                                    <i class="fas fa-star" data-valor="4" onclick="event.stopPropagation(); window.calificarExpectativaCard(${pelicula.id}, 4)"></i>
                                    <i class="fas fa-star" data-valor="5" onclick="event.stopPropagation(); window.calificarExpectativaCard(${pelicula.id}, 5)"></i>
                                </div>
                                <p class="card-expectativa-resumen" id="expectativa-resumen-${pelicula.id}"></p>
                            </div>` : `
                            <div class="votacion-buttons">
                                <button class="btn-like" onclick="event.stopPropagation(); window.votarPelicula(${pelicula.id}, 'like', event)" title="Me gusta">
                                    <i class="fas fa-thumbs-up"></i> <span id="likes-${pelicula.id}">0</span>
                                </button>
                                <button class="btn-dislike" onclick="event.stopPropagation(); window.votarPelicula(${pelicula.id}, 'dislike', event)" title="No me gusta">
                                    <i class="fas fa-thumbs-down"></i> <span id="dislikes-${pelicula.id}">0</span>
                                </button>
                                <button class="btn-comentarios-card" onclick="event.stopPropagation(); window.abrirDetallePelicula(${pelicula.id})" title="Comentarios">
                                    <i class="fas fa-comment"></i> <span id="comentarios-card-${pelicula.id}" class="comentarios-count">0</span>
                                </button>
                            </div>`;

                        return plantilla
                            .replace(/{id}/g, pelicula.id)
                            .replace(/{posterUrl}/g, posterUrl)
                            .replace(/{title}/g, pelicula.title)
                            .replace(/{vote_average}/g, pelicula.vote_average.toFixed(1))
                            .replace(/{year}/g, year)
                            .replace(/{overview}/g, overview)
                            .replace(/{popularity}/g, Math.round(pelicula.popularity))
                            .replace(/{vote_count}/g, pelicula.vote_count)
                            .replace(/{accionesVotacion}/g, accionesVotacion);
                    }).join('');

    } catch (error) {
        return generarTarjetasFallback(peliculas);
    }
};

function generarTarjetasFallback(peliculas) {
    const peliculasFiltradas = peliculas.filter(p =>
        p.poster_path && p.overview && p.overview.trim() !== ''
    );

    return peliculasFiltradas.map(pelicula => {
        const posterUrl = `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`;

        const year = pelicula.release_date
            ? new Date(pelicula.release_date).getFullYear()
            : 'Próximamente';

        return `
            <div class="pelicula-card" data-id="${pelicula.id}" onclick="window.abrirDetallePelicula(${pelicula.id})" style="cursor: pointer;">
                <div class="pelicula-poster">
                    <img src="${posterUrl}" alt="${pelicula.title}" onerror="this.src='https://via.placeholder.com/300x450?text=Error+imagen'">
                    <div class="pelicula-overlay">
                        <span class="rating">⭐ ${pelicula.vote_average.toFixed(1)}</span>
                        <span class="año">${year}</span>
                    </div>
                </div>
                <div class="pelicula-info">
                    <h3 class="pelicula-titulo">${pelicula.title}</h3>
                    <p class="pelicula-descripcion">${pelicula.overview.substring(0, 120)}...</p>
                    <div class="pelicula-metadata">
                        <span><i class="fas fa-clock"></i> Popularidad: ${Math.round(pelicula.popularity)}</span>
                    </div>
                    <div class="votacion-container">
                            <button class="btn-donde-verla" onclick="event.stopPropagation(); window.abrirDondeVerla(${pelicula.id}, event)" title="Dónde verla">
                                <i class="fas fa-tv"></i> Dónde verla
                            </button>
                            <div class="votacion-buttons">
                            <button class="btn-like" onclick="window.votarPelicula(${pelicula.id}, 'like')">
                                <i class="fas fa-thumbs-up"></i> ${pelicula.vote_count}
                            </button>
                            <button class="btn-dislike" onclick="window.votarPelicula(${pelicula.id}, 'dislike')">
                                <i class="fas fa-thumbs-down"></i> 0
                            </button>
                            <button class="btn-recomendar" onclick="event.stopPropagation(); window.abrirPanelRecomendar(${pelicula.id}, event)">
                                <i class="fas fa-share"></i> Recomendar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==============================================
// FUNCIÓN PRINCIPAL PARA CARGAR PELÍCULAS
// ==============================================
window.cargarPeliculasPopulares = async function(pagina = 1) {
    const grid = document.getElementById('peliculasGrid');
    if (!grid) return;
    if (window.estadoPaginacion.cargando) return;

    // Se recarga cada vez que se entra al módulo (el HTML del feed se
        // reinyecta de cero al navegar entre secciones, así que el carrusel
        // también tiene que reconstruirse — no alcanza con cargarlo una sola
        // vez por sesión).
        window.cargarPeliculaDestacada();
                window.cargarVotoRelampago();
                window.cargarTriviaBadge();

                window.estadoPaginacion.cargando = true;
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando películas...</div>';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            grid.innerHTML = '<div class="error">Error de autenticación</div>';
            return;
        }

        const criterioOrden = window._criterioOrden || 'fecha';
                let sortParam = '';
                if (criterioOrden === 'fecha') sortParam = '&sortBy=primary_release_date.desc';
                                if (criterioOrden === 'proximamente') sortParam = '&sortBy=primary_release_date.asc&releaseDateGteExact=' + new Date().toISOString().split('T')[0];
                const response = await fetch(`${CONFIG.API_URL}/movies/popular?page=${pagina}${sortParam}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        // Para proximamente: usar página lógica propia, no la de TMDB
        if (criterioOrden !== 'proximamente') {
            window.estadoPaginacion.paginaActual = data.page;
            window.estadoPaginacion.totalPaginas = data.total_pages;
        }
        // Para proximamente el paginaActual lo manejamos manualmente abajo
        window.estadoPaginacion.totalResultados = data.total_results;

        // Acumular páginas hasta tener 20 válidos
                const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;
                const anioActual = new Date().getFullYear();
                const criterio = window._criterioOrden || 'fecha';

                const esValida = (p) => {
                    if (!p.poster_path) return false;
                    if (!p.overview || p.overview.trim() === '') return false;
                    if (!p.title || !soloLatinos.test(p.title.trim())) return false;
                    if (criterio === 'proximamente') {
                        return !!p.release_date && new Date(p.release_date) > new Date();
                    }
                    const anio = p.release_date ? new Date(p.release_date).getFullYear() : null;
                    return !anio || anio <= anioActual;
                };

                let acumulados = [...data.results];
                                let paginaExtra = pagina;
                                window.estadoPaginacion._ultimaPaginaTmdb = pagina;

                                while (acumulados.filter(esValida).length < 18 && paginaExtra < data.total_pages) {
                                    paginaExtra++;
                                    try {
                                        const token2 = localStorage.getItem('token');
                                        const criterioOrden2 = window._criterioOrden || 'fecha';
                                        let sortParam2 = '';
                                        if (criterioOrden2 === 'fecha') sortParam2 = '&sortBy=primary_release_date.desc';
                                                                                if (criterioOrden2 === 'proximamente') sortParam2 = '&sortBy=primary_release_date.asc&releaseDateGteExact=' + new Date().toISOString().split('T')[0];
                                        const resExtra = await fetch(`${CONFIG.API_URL}/movies/popular?page=${paginaExtra}${sortParam2}`, {
                                            headers: { 'Authorization': `Bearer ${token2}` }
                                        });
                                        if (!resExtra.ok) break;
                                        const dataExtra = await resExtra.json();
                                        acumulados = [...acumulados, ...dataExtra.results];
                                        window.estadoPaginacion.totalPaginas = dataExtra.total_pages;
                                        window.estadoPaginacion._ultimaPaginaTmdb = paginaExtra;
                                    } catch(e) { break; }
                                }

                                const validos = acumulados.filter(esValida).slice(0, 18);

                                if (criterio === 'proximamente') {
                                    // paginaActual lógica — se incrementa desde cambiarPagina
                                    // totalPaginas estimado: si acumulamos hasta paginaExtra y aún hay más,
                                    // no sabemos cuántas páginas lógicas quedan, así que ponemos un valor
                                    // que permita seguir navegando y se actualiza dinámicamente
                                    const hayMasEnTmdb = paginaExtra < data.total_pages;
                                    window.estadoPaginacion.totalPaginas = hayMasEnTmdb
                                        ? window.estadoPaginacion.paginaActual + 1  // al menos una más
                                        : window.estadoPaginacion.paginaActual;      // esta es la última
                                }

                grid.innerHTML = await window.generarTarjetasHTML(validos);

                const peliculasMostradas = grid.querySelectorAll('.pelicula-card').length;
                const countEl = document.getElementById('resultadosCount');
                if (countEl) countEl.textContent = peliculasMostradas;

                if (peliculasMostradas === 0 && data.page < data.total_pages) {
                    window.estadoPaginacion.cargando = false;
                    await window.cargarPeliculasPopulares(data.page + 1);
                    return;
                }

                limpiarModalesDuplicados();

                if (typeof window.cargarEstadisticasVotacion === 'function') {
                    window.cargarEstadisticasVotacion();
                }
                window.actualizarBotonesPaginacion();

    } catch (error) {
        grid.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        window.estadoPaginacion.cargando = false;
    }
};

// ==============================================
// CARRUSEL DESTACADO (película + premios, configurado por el admin
// desde Gestión Feed). Funciona igual en mobile y desktop.
// ==============================================
window._carruselDestacado = { items: [], actual: 0, timer: null };

// ==============================================
// FILAS POR GÉNERO (mobile) — un carrusel por pill/género
// ==============================================
window._filasGenero = [];
window._filasGeneroCargadas = false;

function esMobileFilas() {
    return window.innerWidth <= 768;
}

window.cargarFilasGenero = async function() {
    window.cargarPeliculaDestacada();
    window.cargarVotoRelampago();
    window.cargarTriviaBadge();

    const grid = document.getElementById('peliculasGrid');
    const filasCont = document.getElementById('filasGeneroContainer');
    // Solo se muestra si el tab activo es Películas (o todavía no se
    // definió ninguno, caso de la carga inicial) — así se puede precargar
    // en segundo plano estando en otro tab sin que se vea nada.
    if (window._tabActivo === 'peliculas' || !window._tabActivo) {
        if (grid) grid.style.display = 'none';
        if (filasCont) filasCont.style.display = 'block';
    }

        if (window._filasGeneroCargadas) {
            // Los datos (window._filasGenero) sobreviven en memoria entre
            // navegaciones dentro de la SPA, pero el DOM del feed se
            // recarga de cero cada vez — con los 4 pills viejos
            // hardcodeados en el HTML. Sin este renderPillsFilas(), esa
            // fila nunca se actualizaba al volver al feed, aunque los
            // carruseles de abajo sí lo hacían (por eso el bug era
            // intermitente y "silencioso": todo lo demás funcionaba bien).
            renderPillsFilas();
            renderFilasGenero();
            return;
        }

    const fijas = [
        { key: 'fecha', label: '🔥 Más populares', tipo: 'fijo' },
        { key: 'proximamente', label: '🎬 Lo que se viene', tipo: 'fijo' },
        { key: 'votos', label: '👍 Más votadas', tipo: 'fijo' }
    ];

    let generos = [];
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/movies/genres`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const iconosPorGenero = {
                            'Acción': '💥', 'Aventura': '🗺️', 'Animación': '🎨', 'Comedia': '😂',
                            'Crimen': '🔪', 'Documental': '🎥', 'Drama': '🎭', 'Familia': '👨‍👩‍👧',
                            'Fantasía': '🧙', 'Historia': '📜', 'Terror': '👻', 'Música': '🎵',
                            'Misterio': '🔎', 'Romance': '💕', 'Ciencia ficción': '🚀',
                            'Película de TV': '📺', 'Suspense': '😰', 'Bélica': '⚔️', 'Western': '🤠'
                        };

                        generos = (data.genres || [])
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                            .map(g => ({
                                key: `genero-${g.id}`,
                                label: `${iconosPorGenero[g.name] || '🎞️'} ${g.name}`,
                                tipo: 'genero',
                                generoId: g.id
                            }));
        }
    } catch (e) {}

    window._filasGenero = [...fijas, ...generos].map(f => ({ ...f, peliculas: [], cargado: false, pagina: 1, finDelCatalogo: false, cargandoMas: false }));
    window._filasGeneroCargadas = true;

    renderPillsFilas();
    renderFilasGenero();
};

function renderPillsFilas() {
    const pillsCont = document.getElementById('ordenarPills');
    if (!pillsCont) return;
    pillsCont.innerHTML = window._filasGenero.map((f, i) =>
        `<button class="pill-orden${i === 0 ? ' active' : ''}" data-key="${f.key}" onclick="window.priorizarFilaGenero('${f.key}', this)">${f.label}</button>`
    ).join('');
    activarDragScrollPills(pillsCont);
}

// Drag horizontal con mouse — solo aplica en desktop (mousedown/mousemove
// nunca compiten con el swipe táctil de mobile, que usa eventos touch*
// aparte). Reutilizable para cualquier fila de pills.
function activarDragScrollPills(cont) {
    if (!cont || cont._dragInit) return;
    cont._dragInit = true;

    let arrastrando = false;
    let startX = 0;
    let scrollInicial = 0;
    let huboDrag = false;

    cont.addEventListener('mousedown', (e) => {
        arrastrando = true;
        huboDrag = false;
        cont.classList.add('arrastrando');
        startX = e.pageX;
        scrollInicial = cont.scrollLeft;
    });

    window.addEventListener('mousemove', (e) => {
        if (!arrastrando) return;
        const delta = e.pageX - startX;
        if (Math.abs(delta) > 4) huboDrag = true;
        cont.scrollLeft = scrollInicial - delta;
    });

    window.addEventListener('mouseup', () => {
        if (!arrastrando) return;
        arrastrando = false;
        cont.classList.remove('arrastrando');
    });

    // Si hubo drag real, cancelamos el click del botón que quedó debajo
    // del mouse al soltar — si no, un simple click dispararía también
    // priorizarFilaGenero sin que el usuario lo haya elegido a propósito.
    cont.addEventListener('click', (e) => {
        if (huboDrag) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
}

window.priorizarFilaGenero = function(key, btn) {
    document.querySelectorAll('#ordenarPills .pill-orden').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const idx = window._filasGenero.findIndex(f => f.key === key);
    if (idx > 0) {
        const [fila] = window._filasGenero.splice(idx, 1);
        window._filasGenero.unshift(fila);
    }
    renderFilasGenero();

        const cont = document.getElementById('filasGeneroContainer');
            if (cont) {
                // En mobile el header se auto-oculta al bajar (ver main.js,
                // "navbar-hidden") — el offset fijo de desktop dejaba
                // demasiado aire arriba, frenando en los pills en vez del
                // título de la fila.
                const esMobile = window.innerWidth <= 768;
                let offset;
                if (esMobile) {
                    offset = 12;
                } else {
                    const header = document.querySelector('header');
                    offset = (header ? header.offsetHeight : 70) + 16;
                }
                const top = cont.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
};

// ==============================================
// COLA DE CARGA DE FILAS — máximo 2 filas pidiendo datos a la vez.
// Compartida entre Películas y Series (misma variable global) para que
// el límite sea real independientemente de qué tab dispare más filas.
// Sin esto, un scroll rápido mete 4-5 filas en rango del observer casi
// juntas y todas compiten por banda al mismo tiempo — sobre todo notorio
// en mobile con conexión limitada.
// ==============================================
window._filaCargaEnCurso = window._filaCargaEnCurso || 0;
window._filaCargaCola = window._filaCargaCola || [];
const FILA_CARGA_MAX_CONCURRENTE = 2;

function procesarColaFilas() {
    while (window._filaCargaEnCurso < FILA_CARGA_MAX_CONCURRENTE && window._filaCargaCola.length > 0) {
        const fn = window._filaCargaCola.shift();
        window._filaCargaEnCurso++;
        Promise.resolve(fn()).finally(() => {
            window._filaCargaEnCurso--;
            procesarColaFilas();
        });
    }
}

// fila.cargado se marca ACÁ, al encolar — no cuando arranca a ejecutarse
// de verdad — así el observer no vuelve a encolar la misma fila mientras
// espera su turno en la cola.
function cargarFilaConCola(fila, fnCargar) {
    if (fila.cargado) return;
    fila.cargado = true;
    window._filaCargaCola.push(fnCargar);
    procesarColaFilas();
}

function skeletonFilaHTML() {
    // 3 cards fantasma — suficiente para llenar el ancho visible en
    // desktop y dar sensación de fila real, sin exagerar el DOM temporal.
    return Array(3).fill(0).map(() => `
        <div class="fila-genero-skeleton">
            <div class="sk-poster"></div>
            <div class="sk-linea"></div>
            <div class="sk-linea corta"></div>
        </div>
    `).join('');
}

function renderFilasGenero() {
    const cont = document.getElementById('filasGeneroContainer');
    if (!cont) return;

    // Solo crea el HTML la primera vez que aparece cada fila — si ya
    // existía, reutiliza el nodo (con sus películas ya cargadas) y
    // simplemente lo reordena en el DOM.
    window._filasGenero.forEach(f => {
        let el = document.getElementById(`fila-${f.key}`);
        if (!el) {
                    el = document.createElement('div');
                    el.className = 'fila-genero';
                    el.id = `fila-${f.key}`;
                    el.dataset.key = f.key;
                    el.innerHTML = `
                                    <p class="fila-genero-titulo">${f.label}</p>
                                    <div class="fila-genero-viewport">
                                        <button class="fila-genero-nav fila-genero-nav-prev" onclick="window.moverFilaGenero('${f.key}', -1)" aria-label="Anterior"><i class="fas fa-chevron-left"></i></button>
                                        <div class="fila-genero-track" id="filaTrack-${f.key}">
                                            ${skeletonFilaHTML()}
                                        </div>
                                        <button class="fila-genero-nav fila-genero-nav-next" onclick="window.moverFilaGenero('${f.key}', 1)" aria-label="Siguiente"><i class="fas fa-chevron-right"></i></button>
                                    </div>`;
                    const trackNuevo = el.querySelector('.fila-genero-track');
                                activarSwipeManual(trackNuevo);
                                configurarScrollFila(f, trackNuevo);
                                trackNuevo.addEventListener('click', () => fijarPosicionActual(trackNuevo), true); // true = fase de captura, no la frena el stopPropagation del botón
                            }
        cont.appendChild(el); // appendChild sobre un nodo existente lo MUEVE, no lo duplica
    });

    configurarLazyLoadFilas();

        if (window._filasGenero[0] && !window._filasGenero[0].cargado) {
            cargarFilaConCola(window._filasGenero[0], () => cargarPeliculasFila(window._filasGenero[0]));
        }
}

let _observerFilas = null;
function configurarLazyLoadFilas() {
    if (_observerFilas) _observerFilas.disconnect();
    _observerFilas = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const fila = window._filasGenero.find(f => f.key === entry.target.dataset.key);
                if (!fila) return;

                if (entry.isIntersecting) {
                    if (!fila.cargado) cargarFilaConCola(fila, () => cargarPeliculasFila(fila));
                    const track = document.getElementById(`filaTrack-${fila.key}`);
                    if (track) iniciarGuinoIntermitente(fila, track);
                } else {
                    detenerGuinoIntermitente(fila);
                }
            });
        }, { rootMargin: '200px' });

    document.querySelectorAll('.fila-genero').forEach(el => _observerFilas.observe(el));
}

function activarSwipeManual(track) {
    // El navegador maneja el gesto entero de forma nativa:
    // - scroll-snap-stop:always impide saltear más de una card por gesto,
    //   sin importar qué tan fuerte sea el drag.
    // - touch-action:pan-y le deja el scroll vertical a la página, así que
    //   nunca hace falta calcular a mano si el gesto es horizontal o no.
    // Acá solo cancelamos el guiño si el usuario toca de verdad.
    track.addEventListener('touchstart', () => {
            track.dataset.dragging = '1';
            track._scrollToken = (track._scrollToken || 0) + 1;
            if (track._guinoTimeouts) {
                track._guinoTimeouts.forEach(id => clearTimeout(id));
                track._guinoTimeouts = [];
            }
            // El guiño puede haber dejado esto en 'none' para poder animar
            // libremente — si el usuario empieza a draguear justo en ese
            // instante, el timeout que lo iba a restaurar queda cancelado
            // arriba, así que lo restauramos acá mismo, al toque.
            track.style.scrollSnapType = 'x mandatory';
        }, { passive: true });

    track.addEventListener('touchend', () => {
        track.dataset.dragging = '0';
    }, { passive: true });
}

window.moverFilaGenero = function(key, direccion) {
    const track = document.getElementById(`filaTrack-${key}`);
    if (!track) return;
    track.scrollBy({ left: direccion * track.clientWidth * 0.9, behavior: 'smooth' });
};

async function cargarPeliculasFila(fila) {
    fila.cargado = true; // redundante si vino de cargarFilaConCola (ya lo marcó al encolar), pero se deja por si se llama directo
    const token = localStorage.getItem('token');
    const anioActual = new Date().getFullYear();
    const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;

            const esValida = (p, esProximamente) => {
                if (!p.poster_path || !p.overview || p.overview.trim() === '') return false;
                if (!p.title || !soloLatinos.test(p.title.trim())) return false;
                if (esProximamente) {
                    return !!p.release_date && new Date(p.release_date) > new Date();
                }
                const anio = p.release_date ? new Date(p.release_date).getFullYear() : null;
                return !anio || anio <= anioActual;
            };

            try {
                let resultados = [];

                if (fila.key === 'fecha') {
                    const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=1&sortBy=primary_release_date.desc`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    resultados = (data.results || []).filter(p => esValida(p, false));

                } else if (fila.key === 'proximamente') {
                    // A diferencia de las otras filas, acá suele hacer falta más
                    // de 1 página para juntar suficientes tarjetas — las películas
                    // de próximo estreno suelen tener menos datos completos en
                    // TMDb todavía (sinopsis/poster vacíos hasta acercarse la
                    // fecha), así que el filtro descarta más de lo normal.
                    const hoy = new Date().toISOString().split('T')[0];
                    let pagina = 1;
                    const maxPaginas = 5; // resguardo — no pedir de más si genuinamente hay poco contenido
                    let totalPaginasTmdb = 1;
                    while (resultados.length < 15 && pagina <= maxPaginas && pagina <= totalPaginasTmdb) {
                        const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=${pagina}&sortBy=primary_release_date.asc&releaseDateGteExact=${hoy}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        totalPaginasTmdb = data.total_pages || 1;
                        const nuevos = (data.results || []).filter(p => esValida(p, true) && !resultados.some(r => r.id === p.id));
                        resultados = resultados.concat(nuevos);
                        pagina++;
                    }
                    fila.pagina = pagina - 1; // así la paginación por scroll sigue desde acá, sin repetir páginas ya consumidas

                        } else if (fila.key === 'votos') {
                    const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=1`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    // Se muestra de una con el orden que ya trae TMDb (populares),
                    // sin esperar los 15 fetches de votos — evita que esta fila en
                    // particular tarde mucho más que las demás. El orden real "por
                    // más votadas" se corrige solo, en segundo plano, apenas esos
                    // datos llegan (ver reordenarFilaPorVotos más abajo).
                    resultados = (data.results || []).filter(p => esValida(p, false)).slice(0, 15);
                    fila._votosPendientes = true;

                } else if (fila.tipo === 'genero') {
            const res = await fetch(`${CONFIG.API_URL}/movies/search?withGenres=${fila.generoId}&page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            resultados = (data.results || []).filter(p => esValida(p, false));
        }

        // Evitar que el primer poster de esta fila ya haya sido "primero"
                // en otra fila — sensación de contenido siempre nuevo, sobre todo
                // en mobile donde solo se ve una card a la vez por fila.
                window._primerosPeliculasUsados = window._primerosPeliculasUsados || new Set();
                if (resultados.length > 1 && window._primerosPeliculasUsados.has(resultados[0].id)) {
                    const idxAlternativo = resultados.findIndex(p => !window._primerosPeliculasUsados.has(p.id));
                    if (idxAlternativo > 0) {
                        const [elegido] = resultados.splice(idxAlternativo, 1);
                        resultados.unshift(elegido);
                    }
                }
                if (resultados.length > 0) {
                    window._primerosPeliculasUsados.add(resultados[0].id);
                }

                                fila.peliculas = resultados.slice(0, 15);
                                await renderCardsFila(fila);

                                if (fila._votosPendientes) {
                                    fila._votosPendientes = false;
                                    reordenarFilaPorVotos(fila, token); // no se espera — corrige el orden en segundo plano
                                }

                    } catch (e) {
                        const track = document.getElementById(`filaTrack-${fila.key}`);
                        if (track) track.innerHTML = '<div class="fila-genero-vacia">No pudimos cargar esta sección.</div>';
                    }
                }

                async function reordenarFilaPorVotos(fila, token) {
                    try {
                        const conVotos = await Promise.all(fila.peliculas.map(async p => {
                            try {
                                const r = await fetch(`${CONFIG.API_URL}/reviews/movies/${p.id}/stats`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const stats = r.ok ? await r.json() : { likes: 0, dislikes: 0 };
                                return { ...p, _totalVotos: (stats.likes || 0) + (stats.dislikes || 0) };
                            } catch (e) {
                                return { ...p, _totalVotos: 0 };
                            }
                        }));
                        fila.peliculas = conVotos.sort((a, b) => b._totalVotos - a._totalVotos);
                        await renderCardsFila(fila);
                    } catch (e) {}
                }

async function renderCardsFila(fila) {
    const track = document.getElementById(`filaTrack-${fila.key}`);
    if (!track) return;

    if (fila.peliculas.length === 0) {
        track.innerHTML = '<div class="fila-genero-vacia">No encontramos películas acá todavía.</div>';
        return;
    }

    // generarTarjetasHTML vuelve a filtrar internamente según
    // window._criterioOrden (variable del sistema viejo de desktop) — se la
    // seteamos acá para que ese segundo filtro coincida con lo que esta
    // fila ya filtró, en vez de descartarle las películas futuras.
    const criterioPrevio = window._criterioOrden;
    window._criterioOrden = fila.key === 'proximamente' ? 'proximamente' : 'fecha';
    const html = await window.generarTarjetasHTML(fila.peliculas);
    window._criterioOrden = criterioPrevio;
    const temp = document.createElement('div');
    temp.innerHTML = html;

    track.innerHTML = '';
        temp.querySelectorAll('.pelicula-card').forEach(card => {
            const slide = document.createElement('div');
            slide.className = 'fila-genero-slide';
            slide.appendChild(card);

            track.appendChild(slide);
        });

                                renderDotsFila(fila);

                                    if (typeof window.cargarEstadisticasVotacion === 'function') {
                                        window.cargarEstadisticasVotacion();
                                    }
                                    if (typeof window.cargarEstadisticasExpectativa === 'function') {
                                        window.cargarEstadisticasExpectativa();
                                    }
                }

window.calificarExpectativaCard = async function(id, valor) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/movies/${id}/expectation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: valor })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        window._pintarExpectativaCard(id, data);
    } catch (e) {}
};

window._pintarExpectativaCard = function(id, data) {
    const cont = document.getElementById(`expectativa-${id}`);
    if (!cont) return;
    cont.querySelectorAll('.card-expectativa-estrellas i').forEach(star => {
        const v = parseInt(star.dataset.valor, 10);
        star.classList.toggle('activa', v <= (data.userRating || 0));
    });

    const resumen = document.getElementById(`expectativa-resumen-${id}`);
    if (!resumen) return;
    resumen.textContent = data.count > 0
        ? `${data.average.toFixed(1)} — ${data.count.toLocaleString('es-AR')} persona${data.count === 1 ? '' : 's'} la ${data.count === 1 ? 'está' : 'están'} esperando`
        : '';
};

window.cargarEstadisticasExpectativa = async function() {
    const token = localStorage.getItem('token');
    const cards = document.querySelectorAll('.card-expectativa[id^="expectativa-"]');
    for (const card of cards) {
        const id = card.id.replace('expectativa-', '');
        try {
            const res = await fetch(`${CONFIG.API_URL}/movies/${id}/expectation`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) continue;
            window._pintarExpectativaCard(id, await res.json());
        } catch (e) {}
    }
};

function reiniciarGuinoTimer(fila, track) {
    if (fila.guinoTimeout) clearTimeout(fila.guinoTimeout);
    fila.guinoTimeout = setTimeout(() => {
        dispararGuino(track);
        reiniciarGuinoTimer(fila, track); // sigue repitiendo cada 4s mientras te quedes en esta misma película
    }, 5000);
}

function iniciarGuinoIntermitente(fila, track) {
    if (fila.guinoTimeout) return; // ya está corriendo, no duplicar
    reiniciarGuinoTimer(fila, track);
}

function detenerGuinoIntermitente(fila) {
    if (fila.guinoTimeout) {
        clearTimeout(fila.guinoTimeout);
        fila.guinoTimeout = null;
    }
}

function animarScrollTrack(track, destino, duracion) {
    track._scrollToken = (track._scrollToken || 0) + 1;
    const miToken = track._scrollToken;
    const inicio = track.scrollLeft;
    const delta = destino - inicio;
    const t0 = performance.now();
    function paso(t) {
        if (track._scrollToken !== miToken) return; // se canceló — arrancó un drag real
        const p = Math.min((t - t0) / duracion, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        track.scrollLeft = inicio + delta * ease;
        if (p < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
}

function dispararGuino(track) {
    if (track.dataset.dragging === '1') return;
    if (track.scrollWidth <= track.clientWidth + 2) return;

    const base = track.scrollLeft;
    const distancia = 46;
    track.style.scrollSnapType = 'none';

    animarScrollTrack(track, base + distancia, 500);

    const t1 = setTimeout(() => {
        animarScrollTrack(track, base, 500);
        const t2 = setTimeout(() => {
            if (track.dataset.dragging !== '1') track.style.scrollSnapType = 'x mandatory';
        }, 550);
        track._guinoTimeouts.push(t2);
    }, 1100);

    track._guinoTimeouts = track._guinoTimeouts || [];
    track._guinoTimeouts.push(t1);
}

function fijarPosicionActual(track) {
    track._scrollToken = (track._scrollToken || 0) + 1; // corta cualquier animación de guiño en curso
    if (track._guinoTimeouts) {
        track._guinoTimeouts.forEach(id => clearTimeout(id));
        track._guinoTimeouts = [];
    }
    const ancho = track.clientWidth || 1;
    const indiceCercano = Math.round(track.scrollLeft / ancho);
    track.style.scrollSnapType = 'x mandatory';
    track.scrollLeft = indiceCercano * ancho; // corte abrupto, sin animación — vuelve a la que estabas viendo
}

function renderDotsFila(fila) {
    const el = document.getElementById(`fila-${fila.key}`);
    if (!el) return;
    let dotsEl = el.querySelector('.fila-genero-dots');
    if (!dotsEl) {
        dotsEl = document.createElement('div');
        dotsEl.className = 'fila-genero-dots';
        el.appendChild(dotsEl);
    }
    const total = Math.min(fila.peliculas.length, 8); // tope visual, no tiene sentido pintar 15 puntitos
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
        `<span class="fila-genero-dot${i === 0 ? ' activo' : ''}"></span>`
    ).join('');
}

function configurarScrollFila(fila, track) {
    let ultimoIndice = -1;
    track.addEventListener('scroll', () => {
        // El ancho de UNA card, no el de toda la ventana visible — en mobile
        // coinciden (una card = una pantalla), pero en desktop se ven varias
        // cards a la vez, así que había que medir la card real para saber
        // cuántas se recorrieron, no cuántas "pantallas" se scrollearon.
        const anchoCard = track.children[0]?.offsetWidth || track.clientWidth || 1;
        const indice = Math.round(track.scrollLeft / anchoCard);
        if (indice === ultimoIndice) return;
        ultimoIndice = indice;
        track._indiceActual = indice;

        if (fila.guinoTimeout) reiniciarGuinoTimer(fila, track);
        actualizarDotActivo(fila, indice);

        if (!fila.cargandoMas && !fila.finDelCatalogo && indice >= track.children.length - 3) {
            cargarMasPeliculasFila(fila, track);
        }
    });
}

function actualizarDotActivo(fila, indice) {
    const el = document.getElementById(`fila-${fila.key}`);
    if (!el) return;
    const dots = el.querySelectorAll('.fila-genero-dot');
    if (dots.length === 0) return;
    const tope = dots.length - 1;
    const activo = Math.min(indice, tope);
    dots.forEach((d, i) => d.classList.toggle('activo', i === activo));
}

async function cargarMasPeliculasFila(fila, track) {
    fila.cargandoMas = true;
    fila.pagina = (fila.pagina || 1) + 1;
    const token = localStorage.getItem('token');
    const anioActual = new Date().getFullYear();
    const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;
    const esValida = (p, esProximamente) => {
        if (!p.poster_path || !p.overview || p.overview.trim() === '') return false;
        if (!p.title || !soloLatinos.test(p.title.trim())) return false;
        const anio = p.release_date ? new Date(p.release_date).getFullYear() : null;
        return esProximamente ? anio > anioActual : (!anio || anio <= anioActual);
    };

    try {
        let nuevos = [];
        let totalPaginas = 1;

        if (fila.key === 'fecha') {
            const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=${fila.pagina}&sortBy=primary_release_date.desc`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            nuevos = (data.results || []).filter(p => esValida(p, false));
            totalPaginas = data.total_pages || 1;

        } else if (fila.key === 'proximamente') {
                        const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=${fila.pagina}&sortBy=primary_release_date.asc&releaseDateGteExact=${new Date().toISOString().split('T')[0]}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            nuevos = (data.results || []).filter(p => esValida(p, true));
            totalPaginas = data.total_pages || 1;

        } else if (fila.key === 'votos') {
            const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=${fila.pagina}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            const pool = (data.results || []).filter(p => esValida(p, false));
            nuevos = await Promise.all(pool.map(async p => {
                try {
                    const r = await fetch(`${CONFIG.API_URL}/reviews/movies/${p.id}/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const stats = r.ok ? await r.json() : { likes: 0, dislikes: 0 };
                    return { ...p, _totalVotos: (stats.likes || 0) + (stats.dislikes || 0) };
                } catch (e) { return { ...p, _totalVotos: 0 }; }
            }));
            totalPaginas = data.total_pages || 1;

        } else if (fila.tipo === 'genero') {
            const res = await fetch(`${CONFIG.API_URL}/movies/search?withGenres=${fila.generoId}&page=${fila.pagina}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            nuevos = (data.results || []).filter(p => esValida(p, false));
            totalPaginas = data.total_pages || 1;
        }

        if (fila.pagina >= totalPaginas) fila.finDelCatalogo = true;

        const idsExistentes = new Set(fila.peliculas.map(p => p.id));
        nuevos = nuevos.filter(p => !idsExistentes.has(p.id));

        if (nuevos.length > 0) {
            fila.peliculas = [...fila.peliculas, ...nuevos];
            await agregarCardsAFila(fila, track, nuevos);
        }
    } catch (e) {
    } finally {
        fila.cargandoMas = false;
    }
}

async function agregarCardsAFila(fila, track, nuevasPeliculas) {
    const criterioPrevio = window._criterioOrden;
    window._criterioOrden = fila.key === 'proximamente' ? 'proximamente' : 'fecha';
    const html = await window.generarTarjetasHTML(nuevasPeliculas);
    window._criterioOrden = criterioPrevio;

    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('.pelicula-card').forEach(card => {
            const slide = document.createElement('div');
            slide.className = 'fila-genero-slide';
            slide.appendChild(card);
            track.appendChild(slide);
        });

        if (typeof window.cargarEstadisticasVotacion === 'function') {
            window.cargarEstadisticasVotacion();
        }
    }

window.cargarPeliculaDestacada = async function() {
    const contenedor = document.getElementById('destacadaContainer');
    if (!contenedor) return;

    // Pintar instantáneo desde caché de sesión (si hay), mientras se
    // revalida contra el servidor en paralelo más abajo — evita la
    // demora visible al volver de otro módulo del dashboard.
    try {
        const cache = sessionStorage.getItem('cm_destacada_cache');
        if (cache && window._tabActivo === 'peliculas') {
            const items = JSON.parse(cache);
            if (items && items.length > 0) {
                window._carruselDestacado.items = items;
                window._carruselDestacado.actual = 0;
                contenedor.style.display = 'block';
                renderSlideDestacado(0);
                iniciarRotacionDestacado();
                iniciarSwipeDestacado();
            }
        }
    } catch (e) {}

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/feed/carrusel`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error();

        let items = await response.json();

        // Si el carrusel está vacío, caemos al fallback: la Película
        // destacada fija (si el admin configuró una desde el módulo
        // superior), igual que se comportaba antes de que existiera el
        // carrusel. Solo si tampoco hay destacada fija, se oculta todo.
        if (!items || items.length === 0) {
            const resDestacada = await fetch(`${CONFIG.API_URL}/feed/destacada`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resDestacada.status === 204 || !resDestacada.ok) {
                contenedor.style.display = 'none';
                return;
            }
            const { movieId } = await resDestacada.json();
            items = [{ tipo: 'PELICULA_DESTACADA', movieId }];
        }

        // Resolvemos cada ítem en paralelo (película o premio según tipo)
        const resueltos = await Promise.all(items.map(async (item) => {
                            try {
                                if (item.tipo === 'PELICULA_DESTACADA' || item.tipo === 'PELICULA_CARRUSEL') {
                                    const res = await fetch(`${CONFIG.API_URL}/movies/${item.movieId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) return null;
                            return { tipo: 'PELICULA', data: await res.json() };
                        } else if (item.tipo === 'RANKING_TRIVIA') {
                            // No resuelve nada externo — el modal pide el ranking
                            // real recién cuando se abre, no hace falta acá.
                            return { tipo: 'RANKING_TRIVIA', data: null };
                        } else {
                            const urlBase = item.tipo === 'PREMIO_COMUN' ? '/rewards/' : '/premium/rewards/';
                            const res = await fetch(`${CONFIG.API_URL}${urlBase}${item.rewardId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) return null;
                            return { tipo: item.tipo, data: await res.json() };
                        }
                    } catch {
                        return null;
                    }
                }));

        const validos = resueltos.filter(Boolean);
        if (validos.length === 0) {
            contenedor.style.display = 'none';
            return;
        }

        // Guardar en caché de sesión para que la próxima vez (incluso
                // volviendo de otro módulo del dashboard) pinte instantáneo.
                try { sessionStorage.setItem('cm_destacada_cache', JSON.stringify(validos)); } catch (e) {}

                // Si para cuando este fetch (async) termina el usuario ya cambió
                // a otra tab, no mostramos nada — evita que el carrusel de
                // Película "aparezca de la nada" encima de Series por una
                // respuesta tardía de red.
                if (window._tabActivo !== 'peliculas') {
                    return;
                }

                window._carruselDestacado.items = validos;
                window._carruselDestacado.actual = 0;
                contenedor.style.display = 'block';

                renderSlideDestacado(0);
                iniciarRotacionDestacado();
                iniciarSwipeDestacado();
            } catch (error) {
                contenedor.style.display = 'none';
            }
        };

        // Swipe táctil sobre la card destacada — mobile únicamente (los eventos
        // touch* simplemente no disparan en desktop con mouse). No reemplaza la
        // rotación automática, conviven: swipear reinicia el timer de 3s vía
        // irASlideDestacado, igual que ya hace el click en los dots.
        function iniciarSwipeDestacado() {
            const card = document.getElementById('destacadaCard');
            if (!card || card._swipeInit) return;
            card._swipeInit = true;

            let startX = 0;
            let startY = 0;
            let dragueando = false;

            card.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                dragueando = true;
            }, { passive: true });

            card.addEventListener('touchend', (e) => {
                if (!dragueando) return;
                dragueando = false;

                const diffX = startX - e.changedTouches[0].clientX;
                const diffY = Math.abs(startY - e.changedTouches[0].clientY);

                // Solo swipe horizontal — si el movimiento vertical predomina,
                // era scroll de página, no un swipe del carrusel.
                if (Math.abs(diffX) < 40 || diffY > Math.abs(diffX)) return;

                const state = window._carruselDestacado;
                if (!state.items || state.items.length < 2) return;

                const siguiente = diffX > 0
                    ? (state.actual + 1) % state.items.length
                    : (state.actual - 1 + state.items.length) % state.items.length;

                window.irASlideDestacado(siguiente);
            }, { passive: true });
        }

function iniciarRotacionDestacado() {
    const state = window._carruselDestacado;
    if (state.timer) clearInterval(state.timer);

    const dotsEl = document.getElementById('destacadaDots');
    if (state.items.length < 2) {
        dotsEl.style.display = 'none';
        return;
    }

    dotsEl.style.display = 'flex';
    dotsEl.innerHTML = state.items.map((_, i) =>
        `<span class="destacada-dot${i === 0 ? ' activo' : ''}" onclick="irASlideDestacado(${i})"></span>`
    ).join('');

    state.timer = setInterval(() => {
            const siguiente = (state.actual + 1) % state.items.length;
            renderSlideDestacado(siguiente);
        }, 3000);
}

window.irASlideDestacado = function(idx) {
    renderSlideDestacado(idx);
    iniciarRotacionDestacado(); // reinicia el conteo de 6s al navegar a mano
};

function renderSlideDestacado(idx) {
    const state = window._carruselDestacado;
    const card = document.getElementById('destacadaCard');
    const label = document.getElementById('destacadaLabel');

    // El módulo se pudo haber desmontado (navegaste a otra sección) sin que
    // el setInterval de rotación llegara a limpiarse — si el DOM ya no está,
    // cortamos el timer acá en vez de romper contra elementos null.
    if (!card || !label) {
        if (state.timer) clearInterval(state.timer);
        return;
    }

    state.actual = idx;
    const item = state.items[idx];

    document.querySelectorAll('.destacada-dot').forEach((d, i) => d.classList.toggle('activo', i === idx));

    if (item.tipo === 'RANKING_TRIVIA') {
            label.textContent = '🏆 Ranking de cinéfilos';
            card.onclick = () => window.abrirRankingTrivia();
            card.innerHTML = `
                            <div class="destacada-img-real" style="position:relative; overflow:hidden; display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#a4070f,#e50914);">
                                <i class="fas fa-clapperboard ranking-bg-icon" style="top:8%; left:6%; font-size:44px; transform:rotate(-18deg);"></i>
                                <i class="fas fa-film ranking-bg-icon" style="bottom:10%; left:14%; font-size:34px; transform:rotate(14deg);"></i>
                                <i class="fas fa-star ranking-bg-icon" style="top:14%; right:20%; font-size:24px; transform:rotate(-10deg);"></i>
                                <i class="fas fa-video ranking-bg-icon" style="bottom:12%; right:8%; font-size:38px; transform:rotate(16deg);"></i>
                                <i class="fas fa-ticket-alt ranking-bg-icon" style="top:36%; right:6%; font-size:26px; transform:rotate(-12deg);"></i>
                                <i class="fas fa-star ranking-bg-icon" style="bottom:34%; left:8%; font-size:20px; transform:rotate(8deg);"></i>
                                <i class="fas fa-popcorn ranking-bg-icon" style="top:44%; left:42%; font-size:30px; transform:rotate(-6deg);"></i>
                                <i class="fas fa-film ranking-bg-icon" style="top:4%; right:38%; font-size:22px; transform:rotate(20deg);"></i>
                                <i class="fas fa-clapperboard ranking-bg-icon" style="bottom:6%; right:32%; font-size:26px; transform:rotate(10deg);"></i>
                                <i class="fas fa-star ranking-bg-icon" style="top:60%; left:22%; font-size:16px; transform:rotate(-15deg);"></i>
                                <i class="fas fa-video ranking-bg-icon" style="top:64%; right:16%; font-size:20px; transform:rotate(8deg);"></i>
                                <i class="fas fa-ticket-alt ranking-bg-icon" style="bottom:38%; left:36%; font-size:18px; transform:rotate(-20deg);"></i>
                                <i class="fas fa-trophy" style="font-size:56px;color:#f5a623;position:relative;z-index:1;"></i>
                            </div>
                <div class="destacada-overlay">
                    <div class="destacada-titulo">Los que más aciertan</div>
                    <div class="destacada-meta">Tocá para ver el ranking completo</div>
                </div>`;
            return;
        }

        if (item.tipo === 'PELICULA') {
        const p = item.data;
        window._destacadaMovieId = p.id;
        label.textContent = '⭐ Película destacada';

        const backdrop = p.backdrop_path
            ? `https://image.tmdb.org/t/p/original${p.backdrop_path}`
            : (p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : '');
        const anio = p.release_date ? new Date(p.release_date).getFullYear() : '—';
        const generos = (p.genres || []).map(g => g.name).slice(0, 2).join(', ');
        const duracion = p.runtime ? `${p.runtime} min` : '';
        const meta = [anio, generos, duracion].filter(Boolean).join(' · ');
        const score = p.vote_average ? `${Math.round(p.vote_average * 10)}%` : '—';

        card.onclick = () => window.abrirDetallePelicula(p.id);
        card.innerHTML = `
            <img class="destacada-img-real" src="${backdrop}" alt="${p.title || ''}">
            <div class="destacada-badge">🔥 Tendencia</div>
            <div class="destacada-overlay">
                <div class="destacada-titulo">${p.title || ''}</div>
                <div class="destacada-meta">${meta}</div>
                <div class="destacada-acciones">
                    <button class="btn-dest-votar" onclick="event.stopPropagation(); window.votarPelicula(${p.id}, 'like')">👍 Votar</button>
                    <button class="btn-dest-comentar" onclick="event.stopPropagation(); window.abrirDetallePelicula(${p.id})">💬 Comentar</button>
                    <span class="destacada-score">${score}</span>
                </div>
            </div>`;
    } else {
        const esEspecial = item.tipo === 'PREMIO_ESPECIAL';
        const r = item.data;
        label.textContent = esEspecial ? '⭐ Premio especial' : '🎁 Premio';

        const imagen = r.imageUrl
            ? `https://images.weserv.nl/?url=${encodeURIComponent(r.imageUrl.replace(/^https?:\/\//, ''))}` // fallback simple si la imagen no es absoluta ya servible
            : '';
        const img = r.imageUrl || ''; // usamos la url directa, ya viene absoluta desde el backend

        const puntosHtml = r.pointsRequired
            ? `<span class="destacada-puntos"><span class="destacada-puntos-numero">${r.pointsRequired}</span><span class="destacada-puntos-label">Puntos</span></span>`
            : '';

        // Común siempre es canje directo. Especial puede ser sorteo (inscripción)
        // o canje directo — mismo criterio que ya usa el modal de mis-premios.js.
        const textoBoton = !esEspecial
            ? 'Canjearlo'
            : (r.type === 'SORTEO' ? 'Inscribirme' : 'Canjearlo');

        card.onclick = () => abrirPremioDesdeCarrusel(r.id, item.tipo);
        card.innerHTML = `
            <img class="destacada-img-real" src="${img}" alt="${r.name || ''}" style="object-fit:contain;background:#111;">
            <div class="destacada-premio-badge${esEspecial ? ' especial' : ''}">${esEspecial ? '⭐ Exclusivo Premium' : '🎁 Premio'}</div>
            <div class="destacada-overlay">
                <div class="destacada-titulo">${r.name || ''}</div>
                <div class="destacada-acciones">
                    <button class="btn-dest-ver" onclick="event.stopPropagation(); abrirPremioDesdeCarrusel(${r.id}, '${item.tipo}')">${textoBoton}</button>
                    ${puntosHtml}
                </div>
            </div>`;
    }
}

    // ==============================================
    // VOTO RELÁMPAGO (like/dislike rápido encadenado por similitud)
    // ==============================================
    window._votoRelampago = { movieId: null, chainFromId: null, streak: 0, vistas: [] };
        window._votoRelampagoVotadas = null; // Set<Long> en memoria, se recarga por sesión de módulo (no se persiste)
        window._votoRelampagoOmitidas = null; // Set<Long> — películas "No la vi" todavía en cooldown de 20 días

    async function vrObtenerVotadas() {
            if (window._votoRelampagoVotadas) return window._votoRelampagoVotadas;
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/reviews/movies/voted-ids`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const ids = res.ok ? await res.json() : [];
                window._votoRelampagoVotadas = new Set(ids);
            } catch (e) {
                window._votoRelampagoVotadas = new Set();
            }
            return window._votoRelampagoVotadas;
        }

        async function vrObtenerOmitidas() {
            if (window._votoRelampagoOmitidas) return window._votoRelampagoOmitidas;
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${CONFIG.API_URL}/reviews/movies/omitidas-activas`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const ids = res.ok ? await res.json() : [];
                window._votoRelampagoOmitidas = new Set(ids);
            } catch (e) {
                window._votoRelampagoOmitidas = new Set();
            }
            return window._votoRelampagoOmitidas;
        }

    function vrStorageKey() {
        const token = localStorage.getItem('token') || '';
        return 'vrEstado_' + token;
    }

    window.cargarVotoRelampago = async function() {
        const contenedor = document.getElementById('votoRelampagoContainer');
        if (!contenedor) return;

        const token = localStorage.getItem('token');
        if (!token) { contenedor.style.display = 'none'; return; }

        try {
            const guardado = JSON.parse(localStorage.getItem(vrStorageKey()) || 'null');
            if (guardado && guardado.movieId) {
                window._votoRelampago = guardado;
                const res = await fetch(`${CONFIG.API_URL}/movies/${guardado.movieId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            if (res.ok) {
                // Solo se muestra si el tab activo es Películas — evita que
                // una carga lenta termine mostrándose encima de Series.
                if (window._tabActivo === 'peliculas' || !window._tabActivo) {
                    contenedor.style.display = 'block';
                }
                renderVotoRelampago(await res.json());
                return;
            }
            }
        } catch (e) {}

        await window.vrCargarSiguiente();
    };

    window.vrCargarSiguiente = async function() {
        const contenedor = document.getElementById('votoRelampagoContainer');
        if (!contenedor) return;
        const token = localStorage.getItem('token');
        if (!token) { contenedor.style.display = 'none'; return; }

        const state = window._votoRelampago;
        const romperCadena = !state.chainFromId || state.streak >= 4 || Math.random() < 0.25;

        try {
            let candidatos = [];
            if (!romperCadena && state.chainFromId) {
                const res = await fetch(`${CONFIG.API_URL}/movies/${state.chainFromId}/similar`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) candidatos = await res.json();
            }
            if (!candidatos || !candidatos.length) {
                state.chainFromId = null;
                state.streak = 0;
                const pagina = Math.floor(Math.random() * 10) + 1;
                const res = await fetch(`${CONFIG.API_URL}/movies/popular?page=${pagina}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) candidatos = await res.json();
            }

            const votadas = await vrObtenerVotadas();
                        const omitidas = await vrObtenerOmitidas();

                                candidatos = (candidatos.results || candidatos || []).filter(p =>
                                    p.poster_path && p.overview && !state.vistas.includes(p.id) && !votadas.has(p.id) && !omitidas.has(p.id)
                                );

                    if (!candidatos.length) {
                        contenedor.style.display = 'none'; // no encontramos candidatos sin votar por ahora
                        return;
                    }

                    const elegido = candidatos[0];
                    const detalleRes = await fetch(`${CONFIG.API_URL}/movies/${elegido.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!detalleRes.ok) { contenedor.style.display = 'none'; return; }
                    const pelicula = await detalleRes.json();

                    state.movieId = pelicula.id;
                    state.vistas = [...state.vistas.slice(-19), pelicula.id];
                    localStorage.setItem(vrStorageKey(), JSON.stringify(state));

                    if (window._tabActivo === 'peliculas' || !window._tabActivo) {
                        contenedor.style.display = 'block';
                    }
                    renderVotoRelampago(pelicula);
        } catch (e) {
            contenedor.style.display = 'none';
        }
    };

    function renderVotoRelampago(p) {
        const card = document.getElementById('vrCard');
        if (!card) return;

        const backdrop = p.backdrop_path
            ? `https://image.tmdb.org/t/p/original${p.backdrop_path}`
            : (p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : '');
        const anio = p.release_date ? new Date(p.release_date).getFullYear() : '—';
        const generos = (p.genres || []).map(g => g.name).slice(0, 2).join(', ');
        const duracion = p.runtime ? `${p.runtime} min` : '';
        const meta = [anio, generos, duracion].filter(Boolean).join(' · ');
        const score = p.vote_average ? `${Math.round(p.vote_average * 10)}%` : '—';

        card.onclick = () => window.abrirDetallePelicula(p.id);
        card.innerHTML = `
            <img class="vr-img-real" src="${backdrop}" alt="${p.title || ''}">
            <div class="vr-overlay">
                <div class="vr-score">${score}</div>
                <div class="vr-titulo">${p.title || ''}</div>
                <div class="vr-meta">${meta}</div>
            </div>`;
    }

    window.votoRelampagoVotar = async function(tipo) {
                if (window._votoRelampagoProcesando) return; // ignora clicks mientras hay un voto en curso
                window._votoRelampagoProcesando = true;

                const state = window._votoRelampago;
                const movieId = state.movieId;
                if (!movieId) { window._votoRelampagoProcesando = false; return; }

                vrDispararRayo();

                if (tipo === 'like' || tipo === 'dislike') {
                    const token = localStorage.getItem('token');
                    try {
                        const res = await fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ voteType: tipo.toUpperCase() })
                        });
                        if (res.ok) {
                            const stats = await res.json();
                            mostrarPuntosGanados(stats.pointsAwarded);
                        }
                    } catch (e) {}

                    if (window._votoRelampagoVotadas) window._votoRelampagoVotadas.add(movieId);

                                    if (tipo === 'like') {
                                        state.chainFromId = movieId;
                                        state.streak = (state.streak || 0) + 1;
                                    } else {
                                        state.chainFromId = null;
                                        state.streak = 0;
                                    }
                                } else if (tipo === 'skip') {
                                    // "No la vi" — no toca la cadena, pero sí queda
                                    // registrado en el backend (cooldown de 20 días).
                                    const token = localStorage.getItem('token');
                                    try {
                                        await fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}/omitir`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                    } catch (e) {}
                                    if (window._votoRelampagoOmitidas) window._votoRelampagoOmitidas.add(movieId);
                                }

                        setTimeout(async () => {
                            await window.vrCargarSiguiente();
                            window._votoRelampagoProcesando = false;
                        }, 320);
                    };

    function mostrarPuntosGanados(puntos) {
        if (!puntos) return; // null, 0 o undefined: no corresponde animar

        const el = document.createElement('div');
        el.className = 'puntos-flotantes' + (puntos < 0 ? ' puntos-flotantes-neg' : '');
        el.textContent = (puntos > 0 ? 'Sumaste +' : 'Perdiste ') + Math.abs(puntos) + ' puntos';
        document.body.appendChild(el);

        setTimeout(() => el.remove(), 1700);
    }

    function vrDispararRayo() {
        const flash = document.getElementById('vrFlash');
        const bolt = document.getElementById('vrBolt');
        if (!flash || !bolt) return;
        flash.style.transition = 'none';
        bolt.style.transition = 'none';
        flash.style.opacity = '0.55';
        bolt.style.opacity = '1';
        bolt.style.transform = 'translate(-50%,-50%) scale(1.1) rotate(0deg)';
        requestAnimationFrame(() => {
            flash.style.transition = 'opacity .5s ease';
            bolt.style.transition = 'opacity .5s ease, transform .5s ease';
            flash.style.opacity = '0';
            bolt.style.opacity = '0';
            bolt.style.transform = 'translate(-50%,-50%) scale(1.6) rotate(6deg)';
        });
    }

// "mis-premios" (módulo viejo) fue reemplazado por "club-beneficios".
// Navega ahí y abre el modal del premio puntual apenas el módulo
// termina de cargar (polling corto, sin tocar el router).
function abrirPremioDesdeCarrusel(rewardId, tipo) {
    window.location.hash = 'club-beneficios';
    const esPremium = tipo === 'PREMIO_ESPECIAL';

    let tabPremiumForzada = false;
    let intentos = 0;
    const esperar = setInterval(() => {
        intentos++;

        // El catálogo Premium carga lazy recién al activar esa pestaña
        // (window.cambiarTabClubBeneficios) — a diferencia de Free, que
        // ya carga solo con entrar al módulo. Si el premio es Premium,
        // forzamos el cambio de tab una sola vez.
        if (esPremium && !tabPremiumForzada && typeof window.cambiarTabClubBeneficios === 'function') {
            const btnPremium = document.getElementById('clubTabPremium');
            if (btnPremium) {
                tabPremiumForzada = true;
                window.cambiarTabClubBeneficios('premium', btnPremium);
            }
        }

        const cache = esPremium ? window._clubPremiumCache : window._clubFreeCache;
        const listo = typeof window._abrirModalPremioClub === 'function' && Array.isArray(cache) && cache.length > 0;

        if (listo) {
            clearInterval(esperar);
            const p = cache.find(x => x.id === rewardId);
            if (p) window._abrirModalPremioClub(rewardId, esPremium ? 'premium' : 'free');
        } else if (intentos > 25) { // ~5s de margen, después desistimos en silencio
            clearInterval(esperar);
        }
    }, 200);
}

// ==============================================
// FUNCIONES DE PAGINACIÓN
// ==============================================
window.actualizarBotonesPaginacion = function() {
    const esMobile = window.innerWidth <= 768;

    const btnAnterior    = document.getElementById('btnAnterior');
    const btnSiguiente   = document.getElementById('btnSiguiente');
    const infoPagina     = document.getElementById('infoPagina');
    const paginacionDesk = document.querySelector('.paginacion-container');
    const cargarMasCont  = document.getElementById('cargarMasContainer');

    if (esMobile) {
        // Mobile: ocultar paginación desktop, mostrar "Cargar más"
        if (paginacionDesk) paginacionDesk.style.display = 'none';
        if (cargarMasCont) {
            const hayMas = window.estadoPaginacion.paginaActual < window.estadoPaginacion.totalPaginas;
            cargarMasCont.style.display = hayMas ? 'block' : 'none';
        }
    } else {
        // Desktop: paginación normal
        if (paginacionDesk) paginacionDesk.style.display = '';
        if (cargarMasCont) cargarMasCont.style.display = 'none';

        if (btnAnterior) btnAnterior.disabled = window.estadoPaginacion.paginaActual <= 1;
        if (btnSiguiente) btnSiguiente.disabled = window.estadoPaginacion.paginaActual >= window.estadoPaginacion.totalPaginas;
        if (infoPagina) infoPagina.textContent = `Página ${window.estadoPaginacion.paginaActual} de ${window.estadoPaginacion.totalPaginas}`;
    }
};

window.cargarMas = async function() {
    if (window.estadoPaginacion.cargando) return;
    if (window.estadoPaginacion.paginaActual >= window.estadoPaginacion.totalPaginas) return;

    const btn = document.getElementById('btnCargarMas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...'; }

    const siguientePagina = window.estadoPaginacion.paginaActual + 1;
    const grid = document.getElementById('peliculasGrid');

    try {
            const token = localStorage.getItem('token');
            const busqueda    = document.getElementById('busquedaInput')?.value.trim() || '';
            const genero      = document.getElementById('filtroGenero')?.value || 'todos';
            const anio        = document.getElementById('filtroAnio')?.value || 'todos';
            const idioma      = document.getElementById('filtroIdioma')?.value || 'todos';
            const popularidad = document.getElementById('filtroPopularidad')?.value || 'todas';
            const duracion    = document.getElementById('filtroDuracion')?.value || 'todos';
            const director    = window._directorSeleccionadoId || '';

            const hayFiltros = busqueda || genero !== 'todos' || anio !== 'todos' ||
                               idioma !== 'todos' || popularidad !== 'todas' ||
                               duracion !== 'todos' || director;

            let data;
            if (hayFiltros) {
                const params = new URLSearchParams();
                params.append('page', siguientePagina);
                if (busqueda)           params.append('query', busqueda);
                if (genero !== 'todos') params.append('withGenres', genero);
                if (anio !== 'todos')   params.append('year', anio);
                if (idioma !== 'todos') params.append('language', idioma);
                if (director)           params.append('withCrew', director);
                if (popularidad === 'alta')  { params.append('voteAverageGte', '7.5'); }
                if (popularidad === 'media') { params.append('voteAverageGte', '5'); params.append('voteAverageLte', '7.4'); }
                if (popularidad === 'baja')  { params.append('voteAverageLte', '4.9'); }
                if (duracion === 'corta')  params.append('withRuntimeLte', '89');
                if (duracion === 'media')  { params.append('withRuntimeGte', '90'); params.append('withRuntimeLte', '120'); }
                if (duracion === 'larga')  params.append('withRuntimeGte', '121');

                const response = await fetch(`${CONFIG.API_URL}/movies/search?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(`Error ${response.status}`);
                data = await response.json();

                window.estadoPaginacion.paginaActual = data.page;
                window.estadoPaginacion.totalPaginas = data.total_pages;
                window.estadoPaginacion.totalResultados = data.total_results;

                const nuevoHTML = await window.generarTarjetasHTML(data.results);
                grid.insertAdjacentHTML('beforeend', nuevoHTML);

            } else {
                const criterioOrden = window._criterioOrden || 'fecha';
                let sortParam = '';
                if (criterioOrden === 'fecha') sortParam = '&sortBy=primary_release_date.desc';
                                if (criterioOrden === 'proximamente') sortParam = '&sortBy=primary_release_date.asc&releaseDateGteExact=' + new Date().toISOString().split('T')[0];

                const cursorTmdb = criterioOrden === 'proximamente'
                    ? (window.estadoPaginacion._ultimaPaginaTmdb || 1) + 1
                    : siguientePagina;

                const response = await fetch(`${CONFIG.API_URL}/movies/popular?page=${cursorTmdb}${sortParam}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(`Error ${response.status}`);
                data = await response.json();

                if (criterioOrden === 'proximamente') {
                    const anioActual = new Date().getFullYear();
                    const esValida = (p) => {
                        if (!p.poster_path) return false;
                        if (!p.overview || p.overview.trim() === '') return false;
                        const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;
                        if (!p.title || !soloLatinos.test(p.title.trim())) return false;
                        return !!p.release_date && new Date(p.release_date) > new Date();
                    };

                    let acumulados = [...data.results];
                    let paginaExtra = cursorTmdb;

                    while (acumulados.filter(esValida).length < 6 && paginaExtra < data.total_pages) {
                        paginaExtra++;
                        try {
                            const token2 = localStorage.getItem('token');
                            const resExtra = await fetch(`${CONFIG.API_URL}/movies/popular?page=${paginaExtra}${sortParam}`, {
                                headers: { 'Authorization': `Bearer ${token2}` }
                            });
                            if (!resExtra.ok) break;
                            const dataExtra = await resExtra.json();
                            acumulados = [...acumulados, ...dataExtra.results];
                        } catch(e) { break; }
                    }

                    window.estadoPaginacion._ultimaPaginaTmdb = paginaExtra;
                    window.estadoPaginacion.paginaActual = window.estadoPaginacion.paginaActual + 1;
                    window.estadoPaginacion.totalPaginas = paginaExtra < data.total_pages
                        ? window.estadoPaginacion.paginaActual + 1
                        : window.estadoPaginacion.paginaActual;
                    window.estadoPaginacion.totalResultados = data.total_results;

                    const nuevoHTML = await window.generarTarjetasHTML(acumulados);
                    grid.insertAdjacentHTML('beforeend', nuevoHTML);

                } else {
                    window.estadoPaginacion.paginaActual = data.page;
                    window.estadoPaginacion.totalPaginas = data.total_pages;
                    window.estadoPaginacion.totalResultados = data.total_results;

                    const nuevoHTML = await window.generarTarjetasHTML(data.results);
                    grid.insertAdjacentHTML('beforeend', nuevoHTML);
                }
            }

            if (typeof window.cargarEstadisticasVotacion === 'function') {
                window.cargarEstadisticasVotacion();
            }

            window.actualizarBotonesPaginacion();

        } catch (error) {
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Cargar más'; }
        }
    };

window.cambiarPagina = async function(direccion) {
    if (window.estadoPaginacion.cargando) return;
    let nuevaPagina = direccion === 'siguiente' ? window.estadoPaginacion.paginaActual + 1 : window.estadoPaginacion.paginaActual - 1;
    if (nuevaPagina < 1 || nuevaPagina > window.estadoPaginacion.totalPaginas) return;

    const busqueda    = document.getElementById('busquedaInput')?.value.trim() || '';
    const genero      = document.getElementById('filtroGenero')?.value || 'todos';
    const anio        = document.getElementById('filtroAnio')?.value || 'todos';
    const idioma      = document.getElementById('filtroIdioma')?.value || 'todos';
    const popularidad = document.getElementById('filtroPopularidad')?.value || 'todas';
    const duracion    = document.getElementById('filtroDuracion')?.value || 'todos';
    const director    = window._directorSeleccionadoId || '';

    const hayFiltros = busqueda || genero !== 'todos' || anio !== 'todos' ||
                       idioma !== 'todos' || popularidad !== 'todas' ||
                       duracion !== 'todos' || director;

    if (hayFiltros) {
            await window.aplicarFiltros(nuevaPagina);
        } else {
                const criterioOrden = window._criterioOrden || 'fecha';
                if (criterioOrden === 'proximamente') {
                    const paginaLogicaAnterior = window.estadoPaginacion.paginaActual;
                    const cursorTmdb = direccion === 'siguiente'
                        ? (window.estadoPaginacion._ultimaPaginaTmdb || 1) + 1
                        : Math.max(1, (window.estadoPaginacion._ultimaPaginaTmdb || 1) - 1);

                    // Setear página lógica ANTES de cargar
                    window.estadoPaginacion.paginaActual = direccion === 'siguiente'
                        ? paginaLogicaAnterior + 1
                        : Math.max(1, paginaLogicaAnterior - 1);

                    await window.cargarPeliculasPopulares(cursorTmdb);

                } else if (criterioOrden === 'fecha') {
                    const ultimaTmdb = window.estadoPaginacion._ultimaPaginaTmdb || window.estadoPaginacion.paginaActual;
                    const cursorPagina = direccion === 'siguiente' ? ultimaTmdb + 1 : Math.max(1, ultimaTmdb - 1);
                    await window.cargarPeliculasPopulares(cursorPagina);
                } else {
                    await window.cargarPeliculasPopulares(nuevaPagina);
                }
            }
    if (window.innerWidth > 768) {
            document.getElementById('ordenarPills')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
};

// ==============================================
// ORDENAR PELÍCULAS
// ==============================================
window._criterioOrden = 'fecha';

window.seleccionarOrden = async function(criterio, btn) {
    document.querySelectorAll('.pill-orden').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window._criterioOrden = criterio;

    // Resetear estado de paginación al cambiar criterio
    window.estadoPaginacion.paginaActual = 1;
    window.estadoPaginacion.totalPaginas = 1;
    window.estadoPaginacion._ultimaPaginaTmdb = 1;

    if (criterio === 'fecha' || criterio === 'proximamente') {
        await window.cargarPeliculasPopulares(1);
    } else {
        // Asegurar que las estadísticas estén cargadas antes de ordenar
        if (typeof window.cargarEstadisticasVotacion === 'function') {
            await window.cargarEstadisticasVotacion();
        }
        await window.ordenarPeliculas();
    }
};

window.ordenarPeliculas = async function() {
    const criterio = window._criterioOrden || 'fecha';
    const grid = document.getElementById('peliculasGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.pelicula-card'));
    if (cards.length === 0) return;

    const token = localStorage.getItem('token');
    const statsMap = {};

    await Promise.all(cards.map(async card => {
        const movieId = card.dataset.id;
        if (!movieId) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                statsMap[movieId] = { likes: 0, dislikes: 0, totalVotos: 0, porcentaje: 0, comentarios: 0 };
                return;
            }

            const stats = await response.json();
            const totalVotos = (stats.likes || 0) + (stats.dislikes || 0);
            const porcentaje = totalVotos > 0 ? Math.round((stats.likes / totalVotos) * 100) : 0;

            let comentarios = 0;
            try {
                const commResponse = await fetch(`${CONFIG.API_URL}/comments/movies/${movieId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (commResponse.ok) {
                    const comentariosData = await commResponse.json();
                    comentarios = comentariosData.length || 0;
                }
            } catch (ce) {}

            statsMap[movieId] = { likes: stats.likes || 0, dislikes: stats.dislikes || 0, totalVotos, porcentaje, comentarios };

        } catch (e) {
            statsMap[movieId] = { likes: 0, dislikes: 0, totalVotos: 0, porcentaje: 0, comentarios: 0 };
        }
    }));

    cards.sort((a, b) => {
        const idA = a.dataset.id;
        const idB = b.dataset.id;
        const statsA = statsMap[idA] || { totalVotos: 0, porcentaje: 0, comentarios: 0 };
        const statsB = statsMap[idB] || { totalVotos: 0, porcentaje: 0, comentarios: 0 };

        switch(criterio) {
            case 'fecha':
                const yearA = parseInt(a.querySelector('.año')?.textContent || '0');
                const yearB = parseInt(b.querySelector('.año')?.textContent || '0');
                return yearB - yearA;
            case 'titulo':
                const tA = (a.querySelector('.pelicula-titulo')?.textContent || '').trim().toLowerCase();
                const tB = (b.querySelector('.pelicula-titulo')?.textContent || '').trim().toLowerCase();
                return tA.localeCompare(tB, 'es');
            case 'votos':
                return statsB.totalVotos - statsA.totalVotos;
            default:
                return 0;
        }
    });

    cards.forEach(card => grid.appendChild(card));

    cards.forEach(card => {
            const movieId = card.dataset.id;
            const stats = statsMap[movieId];
            if (stats) {
            const btnLike = card.querySelector('.btn-like');
            const btnDislike = card.querySelector('.btn-dislike');
            if (btnLike) btnLike.innerHTML = `<i class="fas fa-thumbs-up"></i> ${stats.likes}`;
            if (btnDislike) btnDislike.innerHTML = `<i class="fas fa-thumbs-down"></i> ${stats.dislikes}`;

            const porcentajeEl = card.querySelector(`#totalVotos-${movieId}`);
            if (porcentajeEl) {
                porcentajeEl.textContent = stats.totalVotos === 0 ? '0%' : `${stats.porcentaje}%`;
            }

            const comentariosEl = card.querySelector(`#comentarios-card-${movieId}`);
                      window._pintarContadorComentarios(comentariosEl, stats.comentarios);
                    }
                });

                // Marcar estado watchlist en todas las cards recién insertadas
                if (typeof window.marcarWatchlistEnFeed === 'function') {
                    window.marcarWatchlistEnFeed();
                }
            };

// ==============================================
// VOTAR PELÍCULA
// ==============================================
window.votarPelicula = async function(movieId, tipo, event) {
    if (event) event.stopPropagation();

    if (!movieId) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Debés iniciar sesión para votar');
        return;
    }

    const voteType = tipo.toUpperCase();

    try {
        const response = await fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ voteType })
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Sesión expirada. Por favor iniciá sesión nuevamente.');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Error ${response.status}`);
        }

        const stats = await response.json();
                mostrarPuntosGanados(stats.pointsAwarded);

                if (typeof window.loadHeaderUserInfo === 'function') {
                    window.loadHeaderUserInfo();
                }

        const totalVotos = (stats.likes || 0) + (stats.dislikes || 0);
        const porcentaje = totalVotos > 0 ? Math.round((stats.likes / totalVotos) * 100) : 0;

        if (event && event.target) {
            const card = event.target.closest('.pelicula-card');
            if (card) {
                const btnLike    = card.querySelector('.btn-like');
                const btnDislike = card.querySelector('.btn-dislike');
                if (btnLike)    btnLike.innerHTML    = `<i class="fas fa-thumbs-up"></i> ${stats.likes}`;
                if (btnDislike) btnDislike.innerHTML = `<i class="fas fa-thumbs-down"></i> ${stats.dislikes}`;
                btnLike?.classList.toggle('votado', stats.userVoteType === 'LIKE');
                btnDislike?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');

                const porcentajeEl = card.querySelector(`#totalVotos-${movieId}`);
                if (porcentajeEl) {
                    porcentajeEl.textContent = totalVotos === 0 ? '0%' : `${porcentaje}%`;
                }
            }
        }

        if (window.peliculaActualId == movieId) {
            const modalLikes    = document.getElementById('modalLikes');
            const modalDislikes = document.getElementById('modalDislikes');
            const modalRating   = document.getElementById('modalRating');
            if (modalLikes)    modalLikes.textContent    = stats.likes;
            if (modalDislikes) modalDislikes.textContent = stats.dislikes;
          const totalVotosModal = (stats.likes || 0) + (stats.dislikes || 0);
          const porcentajeModal = totalVotosModal === 0 ? 0 : Math.round((stats.likes / totalVotosModal) * 100);
          if (modalRating)   modalRating.innerHTML   = `👍 <span class="modal-rating-num">${porcentajeModal}%</span><span class="modal-rating-label"></span>`;

            const btnLike    = document.querySelector('#modalPelicula .btn-like');
            const btnDislike = document.querySelector('#modalPelicula .btn-dislike');
            btnLike?.classList.toggle('votado', stats.userVoteType === 'LIKE');
            btnDislike?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');
        }

    } catch (error) {
        alert('Error al registrar el voto. Intentá de nuevo.');
    }
};

// ==============================================
// CARGAR ESTADÍSTICAS DE VOTACIÓN
// ==============================================
window.cargarEstadisticasVotacion = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const cards = document.querySelectorAll('.pelicula-card[data-id]');
    if (!cards.length) return;

    const promesas = Array.from(cards).map(async card => {
        const movieId = card.dataset.id;
        try {
            const response = await fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;

            const stats = await response.json();
            const btnLike    = card.querySelector('.btn-like');
            const btnDislike = card.querySelector('.btn-dislike');
            if (btnLike)    btnLike.innerHTML    = `<i class="fas fa-thumbs-up"></i> ${stats.likes}`;
            if (btnDislike) btnDislike.innerHTML = `<i class="fas fa-thumbs-down"></i> ${stats.dislikes}`;
            btnLike?.classList.toggle('votado', stats.userVoteType === 'LIKE');
            btnDislike?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');

            const totalVotos = (stats.likes || 0) + (stats.dislikes || 0);
            const porcentajeEl = card.querySelector(`#totalVotos-${movieId}`);
            if (porcentajeEl) {
                if (totalVotos === 0) {
                    porcentajeEl.textContent = '0%';
                } else {
                    const porcentaje = Math.round((stats.likes / totalVotos) * 100);
                    porcentajeEl.textContent = `${porcentaje}%`;
                }
            }

            try {
                const commResponse = await fetch(`${CONFIG.API_URL}/comments/movies/${movieId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (commResponse.ok) {
                                    const comentarios = await commResponse.json();
                                    const contadorEl = card.querySelector(`#comentarios-card-${movieId}`);
                                    window._pintarContadorComentarios(contadorEl, comentarios.length);
                                }
            } catch (ce) {}
        } catch (e) {
        }
    });

    await Promise.all(promesas);
};

// ==============================================
// FUNCIONES DE FILTROS
// ==============================================
window.toggleFiltros = function() {
    const content = document.getElementById('filtrosContent');
    const toggle  = document.getElementById('filtrosToggle');
    if (!content) return;

    const estaVisible = content.style.display !== 'none';
    content.style.display = estaVisible ? 'none' : 'block';

    if (toggle) {
        toggle.style.transform = estaVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    }
};

function construirTextoCriterio() {
    const partes = [];
    const busqueda = document.getElementById('busquedaInput')?.value.trim();
    if (busqueda) partes.push(`"${busqueda}"`);

    const anioSel = document.getElementById('filtroAnio');
    if (anioSel && anioSel.value !== 'todos') partes.push(anioSel.value);

    const duracionSel = document.getElementById('filtroDuracion');
    if (duracionSel && duracionSel.value !== 'todos') partes.push(duracionSel.options[duracionSel.selectedIndex].text);

    const directorNombre = document.getElementById('busquedaDirector')?.value.trim();
    if (directorNombre) partes.push(directorNombre);

    return partes.length > 0 ? partes.join(' · ') : 'Resultados de búsqueda';
}

window.mostrarVistaResultados = function() {
    const filaBusqueda = document.getElementById('fila-busqueda');
    const resultadosHeader = document.getElementById('resultadosHeader');
    const criterioTexto = document.getElementById('criterioBusquedaTexto');

    const filasCont = document.getElementById('filasGeneroContainer');
    const ordenarPills = document.getElementById('ordenarPills');
    const destacada = document.getElementById('destacadaContainer');
    const votoRelampago = document.getElementById('votoRelampagoContainer');
    const triviaBadge = document.getElementById('triviaBadgeContainer');
    const grid = document.getElementById('peliculasGrid');
    const paginacion = document.getElementById('paginacion-container');

    if (filasCont) filasCont.style.display = 'none';
    if (ordenarPills) ordenarPills.style.display = 'none';
    if (destacada) destacada.style.display = 'none';
    if (votoRelampago) votoRelampago.style.display = 'none';
    if (triviaBadge) triviaBadge.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (paginacion) paginacion.style.display = 'none';

    // Excluyente con la vista de resultados de Serie — si estaba
    // mostrándose, se apaga para que no queden las dos apiladas.
    const filaBusquedaSerie = document.getElementById('fila-busqueda-serie');
    const resultadosHeaderSerie = document.getElementById('resultadosHeaderSerie');
    if (filaBusquedaSerie) filaBusquedaSerie.style.display = 'none';
    if (resultadosHeaderSerie) resultadosHeaderSerie.style.display = 'none';

    if (filaBusqueda) filaBusqueda.style.display = 'block';
    if (resultadosHeader) resultadosHeader.style.display = 'flex';
    if (criterioTexto) criterioTexto.textContent = construirTextoCriterio();

    inicializarFilaBusqueda();
};

window.ocultarVistaResultados = function() {
    const filaBusqueda = document.getElementById('fila-busqueda');
    const resultadosHeader = document.getElementById('resultadosHeader');

    const filasCont = document.getElementById('filasGeneroContainer');
    const ordenarPills = document.getElementById('ordenarPills');
    const destacada = document.getElementById('destacadaContainer');
    const votoRelampago = document.getElementById('votoRelampagoContainer');
    const triviaBadge = document.getElementById('triviaBadgeContainer');

    if (filaBusqueda) filaBusqueda.style.display = 'none';
    if (resultadosHeader) resultadosHeader.style.display = 'none';

    if (filasCont) filasCont.style.display = 'block';
    if (ordenarPills) ordenarPills.style.display = '';
    if (destacada && window._destacadaMovieId) destacada.style.display = 'block';
    if (votoRelampago && window._votoRelampago && window._votoRelampago.movieId) votoRelampago.style.display = 'block';
    if (triviaBadge && window._triviaEstadoCargado) triviaBadge.style.display = 'block';

    if (window._filasGeneroCargadas) renderPillsFilas();
};

window.mostrarVistaResultadosSerie = function() {
    const filaBusquedaSerie = document.getElementById('fila-busqueda-serie');
    const resultadosHeaderSerie = document.getElementById('resultadosHeaderSerie');
    const criterioTexto = document.getElementById('criterioBusquedaTextoSerie');

    const filasCont = document.getElementById('filasSeriesContainer');
    const ordenarPills = document.getElementById('ordenarPillsSerie');
    const destacadaSerie = document.getElementById('destacadaContainerSerie');

    if (filasCont) filasCont.style.display = 'none';
    if (ordenarPills) ordenarPills.style.display = 'none';
    if (destacadaSerie) destacadaSerie.style.display = 'none';

    // Excluyente con la vista de resultados de Película — mismo criterio
    // a la inversa.
    const filaBusqueda = document.getElementById('fila-busqueda');
    const resultadosHeader = document.getElementById('resultadosHeader');
    if (filaBusqueda) filaBusqueda.style.display = 'none';
    if (resultadosHeader) resultadosHeader.style.display = 'none';

    if (filaBusquedaSerie) filaBusquedaSerie.style.display = 'block';
    if (resultadosHeaderSerie) resultadosHeaderSerie.style.display = 'flex';
    if (criterioTexto) criterioTexto.textContent = construirTextoCriterioSerie();

    inicializarFilaBusquedaSerie();
};

window.ocultarVistaResultadosSerie = function() {
    const filaBusquedaSerie = document.getElementById('fila-busqueda-serie');
    const resultadosHeaderSerie = document.getElementById('resultadosHeaderSerie');

    const filasCont = document.getElementById('filasSeriesContainer');
    const ordenarPills = document.getElementById('ordenarPillsSerie');
    const destacadaSerie = document.getElementById('destacadaContainerSerie');

    if (filaBusquedaSerie) filaBusquedaSerie.style.display = 'none';
    if (resultadosHeaderSerie) resultadosHeaderSerie.style.display = 'none';

    if (filasCont) filasCont.style.display = 'block';
    if (ordenarPills && window._filasSeriesCargadas) ordenarPills.style.display = '';
    // Mismo criterio que Película: solo mostrar si efectivamente hay una
    // serie destacada cargada — si nunca hubo (204) o falló, seguir oculto.
    if (destacadaSerie && window._destacadaSeriesId) destacadaSerie.style.display = 'block';
};

function construirTextoCriterioSerie() {
    const partes = [];
    const busqueda = document.getElementById('busquedaInput')?.value.trim();
    if (busqueda) partes.push(`"${busqueda}"`);

    const anioSel = document.getElementById('filtroAnio');
    if (anioSel && anioSel.value !== 'todos') partes.push(anioSel.value);

    const temporadasSel = document.getElementById('filtroTemporadas');
    if (temporadasSel && temporadasSel.value !== 'todos') partes.push(temporadasSel.options[temporadasSel.selectedIndex].text);

    const directorNombre = document.getElementById('busquedaDirector')?.value.trim();
    if (directorNombre) partes.push(directorNombre);

    return partes.length > 0 ? partes.join(' · ') : 'Resultados de búsqueda';
}

window._filaBusqueda = { key: 'busqueda', peliculas: [] };
window._filaBusquedaInit = false;

window._filaBusquedaSerie = { key: 'busqueda-serie', series: [] };
window._filaBusquedaSerieInit = false;
window.estadoPaginacionSerie = { cargando: false, paginaActual: 1, totalPaginas: 1, totalResultados: 0 };

function inicializarFilaBusquedaSerie() {
    if (window._filaBusquedaSerieInit) return;
    window._filaBusquedaSerieInit = true;

    const track = document.getElementById('filaSerieTrack-busqueda-serie');
    if (!track) return;

    activarSwipeManualSerie(track);
    configurarScrollFilaSerie(window._filaBusquedaSerie, track);
    track.addEventListener('click', () => fijarPosicionActualSerie(track), true);

        track.addEventListener('scroll', () => {
            if (window.estadoPaginacionSerie.cargando) return;
            const hayMas = window.estadoPaginacionSerie.paginaActual < window.estadoPaginacionSerie.totalPaginas;
            if (!hayMas) return;
            const restante = track.scrollWidth - (track.scrollLeft + track.clientWidth);
            if (restante < track.clientWidth * 2) {
                const siguiente = window.estadoPaginacionSerie.paginaActual + 1;
                if (typeof window._buscadorPaginaSiguienteFn === 'function') {
                    window._buscadorPaginaSiguienteFn(siguiente);
                } else {
                    window.aplicarFiltros(siguiente, true);
                }
            }
        });
    }

async function appendCardsFilaSerie(fila, nuevasSeries) {
    const track = document.getElementById(`filaSerieTrack-${fila.key}`);
    if (!track || nuevasSeries.length === 0) return;

    nuevasSeries.forEach(serie => {
        const slide = document.createElement('div');
        slide.className = 'fila-genero-slide';
        slide.innerHTML = generarTarjetaSerieHTML(serie);
        track.appendChild(slide);
    });

    renderDotsFilaSerie(fila);
    if (typeof window.cargarEstadisticasVotacionSeries === 'function') {
        window.cargarEstadisticasVotacionSeries();
    }
}

function inicializarFilaBusqueda() {
    if (window._filaBusquedaInit) return;
    window._filaBusquedaInit = true;

    const track = document.getElementById('filaTrack-busqueda');
    if (!track) return;

    activarSwipeManual(track);
    configurarScrollFila(window._filaBusqueda, track);
    track.addEventListener('click', () => fijarPosicionActual(track), true);

    // Scroll infinito: al acercarse al final del carrusel, si hay más
    // páginas de resultados, las va pidiendo solas — así el carrusel
    // se comporta igual que cualquier otro, sin botón de "cargar más".
        track.addEventListener('scroll', () => {
            if (window.estadoPaginacion.cargando) return;
            const hayMas = window.estadoPaginacion.paginaActual < window.estadoPaginacion.totalPaginas;
            if (!hayMas) return;
            const restante = track.scrollWidth - (track.scrollLeft + track.clientWidth);
            if (restante < track.clientWidth * 2) {
                const siguiente = window.estadoPaginacion.paginaActual + 1;
                // Si el buscador asistido dejó registrada su propia función de
                // "página siguiente" (año, característica), se usa esa — si no,
                // cae al comportamiento viejo (filtro tradicional).
                if (typeof window._buscadorPaginaSiguienteFn === 'function') {
                    window._buscadorPaginaSiguienteFn(siguiente);
                } else {
                    window.aplicarFiltros(siguiente, true);
                }
            }
        });
    }

    async function appendCardsFila(fila, nuevasPeliculas) {
    const track = document.getElementById(`filaTrack-${fila.key}`);
    if (!track || nuevasPeliculas.length === 0) return;

    const criterioPrevio = window._criterioOrden;
    window._criterioOrden = 'fecha';
    const html = await window.generarTarjetasHTML(nuevasPeliculas);
    window._criterioOrden = criterioPrevio;

    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('.pelicula-card').forEach(card => {
        const slide = document.createElement('div');
        slide.className = 'fila-genero-slide';
        slide.appendChild(card);
        track.appendChild(slide);
    });

    renderDotsFila(fila);
    if (typeof window.cargarEstadisticasVotacion === 'function') {
        window.cargarEstadisticasVotacion();
    }
}

window.aplicarFiltros = async function(pagina = 1, append = false) {
    if (window._filtroTipoActivo === 'serie') {
        return window.aplicarFiltrosSerie(pagina, append);
    }

    // Leer los campos ANTES de tocar la tab — mismo motivo que en
    // aplicarFiltrosSerie: cambiar de tab puede disparar
    // window.limpiarFiltros() como efecto secundario.
    const busqueda    = document.getElementById('busquedaInput')?.value.trim() || '';
        const anio        = document.getElementById('filtroAnio')?.value || 'todos';
        const duracion    = document.getElementById('filtroDuracion')?.value || 'todos';
        const director    = window._directorSeleccionadoId || '';

        // Si el filtro se aplica en modo Película pero la tab activa es otra
        // (por ejemplo, estabas en Series), nos movemos a Películas primero —
        // como si hubieras hecho click en esa tab vos mismo. Mismo cierre
        // defensivo del modal que en aplicarFiltrosSerie.
        if (!append && window._tabActivo !== 'peliculas') {
            if (typeof cerrarFiltrosModal === 'function') cerrarFiltrosModal();
            window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
        }

    const hayFiltros = busqueda || anio !== 'todos' || duracion !== 'todos' || director;

        if (!hayFiltros) {
            alert('Por favor completá al menos un criterio de búsqueda antes de aplicar filtros.');
            return;
        }

        if (window.estadoPaginacion.cargando) return;
    window.estadoPaginacion.cargando = true;

    if (!append) {
        window.mostrarVistaResultados();
        window._filaBusqueda.peliculas = [];
        const track = document.getElementById('filaTrack-busqueda');
        if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            const track = document.getElementById('filaTrack-busqueda');
            if (track) track.innerHTML = '<div class="fila-genero-vacia">Error de autenticación</div>';
            return;
        }

        const params = new URLSearchParams();
        params.append('page', pagina);

        if (busqueda)           params.append('query', busqueda);
                if (anio !== 'todos')   params.append('year', anio);
                if (director)           params.append('withCrew', director);

                if (duracion === 'corta')  params.append('withRuntimeLte', '89');
        if (duracion === 'media')  { params.append('withRuntimeGte', '90'); params.append('withRuntimeLte', '120'); }
        if (duracion === 'larga')  params.append('withRuntimeGte', '121');

        const response = await fetch(`${CONFIG.API_URL}/movies/search?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        window.estadoPaginacion.paginaActual = pagina;
        window.estadoPaginacion.totalPaginas = data.total_pages;
        window.estadoPaginacion.totalResultados = data.total_results;

        const countEl = document.getElementById('resultadosCount');
        if (countEl) countEl.textContent = data.total_results || 0;

        if (!data.results || data.results.length === 0) {
            if (!append) {
                const track = document.getElementById('filaTrack-busqueda');
                if (track) track.innerHTML = '<div class="fila-genero-vacia">No se encontraron películas con esos filtros.</div>';
            }
        } else {
            window._filaBusqueda.peliculas = append
                ? window._filaBusqueda.peliculas.concat(data.results)
                : data.results;

            if (append) {
                await appendCardsFila(window._filaBusqueda, data.results);
            } else {
                await renderCardsFila(window._filaBusqueda);
            }

            limpiarModalesDuplicados();
            if (typeof window.cargarEstadisticasVotacion === 'function') {
                window.cargarEstadisticasVotacion();
            }
        }

    } catch (error) {
        if (!append) {
            const track = document.getElementById('filaTrack-busqueda');
            if (track) track.innerHTML = `<div class="fila-genero-vacia">Error: ${error.message}</div>`;
        }
    } finally {
            window.estadoPaginacion.cargando = false;
        }
    };

    window.aplicarFiltrosSerie = async function(pagina = 1, append = false) {
        // Leer los campos ANTES de tocar la tab — cambiar de tab puede
        // disparar window.limpiarFiltros() como efecto secundario (si el
        // header de resultados de Película seguía visible), y eso borraría
        // estos valores si los leyéramos después.
        const busqueda    = document.getElementById('busquedaInput')?.value.trim() || '';
            const anio        = document.getElementById('filtroAnio')?.value || 'todos';
            const temporadas  = document.getElementById('filtroTemporadas')?.value || 'todos';
            const director    = window._directorSeleccionadoId || '';

            // Mismo criterio a la inversa
            // pero la tab activa es Películas, nos movemos a Series primero.
            // Cerramos el modal de filtros ANTES, de forma defensiva — si quedó
            // abierto (con sus clases active/force-show pegadas) justo cuando
            // #filtros-container se oculta por el cambio de tab, se queda
            // atrapado invisible con el scroll del body bloqueado para siempre.
            if (!append && window._tabActivo !== 'series') {
                if (typeof cerrarFiltrosModal === 'function') cerrarFiltrosModal();
                window.seleccionarTabFeed('series', document.getElementById('tabSeries'));
            }

        const hayFiltros = busqueda || anio !== 'todos' || temporadas !== 'todos' || director;

            if (!hayFiltros) {
                alert('Por favor completá al menos un criterio de búsqueda antes de aplicar filtros.');
                return;
            }

            if (window.estadoPaginacionSerie.cargando) return;
        window.estadoPaginacionSerie.cargando = true;

        if (!append) {
            window.mostrarVistaResultadosSerie();
            window._filaBusquedaSerie.series = [];
            const track = document.getElementById('filaSerieTrack-busqueda-serie');
            if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                const track = document.getElementById('filaSerieTrack-busqueda-serie');
                if (track) track.innerHTML = '<div class="fila-genero-vacia">Error de autenticación</div>';
                return;
            }

            const params = new URLSearchParams();
            params.append('page', pagina);

            if (busqueda)           params.append('query', busqueda);
                    if (anio !== 'todos')   params.append('year', anio);
                    if (director)           params.append('withCrew', director);
                    if (temporadas !== 'todos') params.append('temporadas', temporadas);

                    const response = await fetch(`${CONFIG.API_URL}/series/search?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            const data = await response.json();

            window.estadoPaginacionSerie.paginaActual = pagina;
            window.estadoPaginacionSerie.totalPaginas = data.total_pages;
            window.estadoPaginacionSerie.totalResultados = data.total_results;

            const countEl = document.getElementById('resultadosCountSerie');
            if (countEl) countEl.textContent = data.total_results || 0;

            if (!data.results || data.results.length === 0) {
                if (!append) {
                    const track = document.getElementById('filaSerieTrack-busqueda-serie');
                    if (track) track.innerHTML = '<div class="fila-genero-vacia">No se encontraron series con esos filtros.</div>';
                }
            } else {
                window._filaBusquedaSerie.series = append
                    ? window._filaBusquedaSerie.series.concat(data.results)
                    : data.results;

                if (append) {
                    await appendCardsFilaSerie(window._filaBusquedaSerie, data.results);
                } else {
                    await renderCardsFilaSerie(window._filaBusquedaSerie);
                }

                if (typeof window.cargarEstadisticasVotacionSeries === 'function') {
                    window.cargarEstadisticasVotacionSeries();
                }
            }

        } catch (error) {
            if (!append) {
                const track = document.getElementById('filaSerieTrack-busqueda-serie');
                if (track) track.innerHTML = `<div class="fila-genero-vacia">Error: ${error.message}</div>`;
            }
        } finally {
            window.estadoPaginacionSerie.cargando = false;
        }
    };

    window.limpiarFiltros = function() {
        ['busquedaInput', 'busquedaDirector'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        ['filtroAnio', 'filtroDuracion', 'filtroTemporadas'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.selectedIndex = 0;
            });

        ['busquedaResultados', 'directorResultados'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        window._directorSeleccionadoId = '';

        if (window._filtroTipoActivo === 'serie') {
            window.ocultarVistaResultadosSerie();
        } else {
            window.ocultarVistaResultados();
        }
    };

// ==============================================
// FUNCIONES DEL MODAL
// ==============================================
window.abrirDetallePelicula = function(id) {
    window.peliculaActualId = id;
    window.modalActualId = id;

    limpiarModalesDuplicados();

    const modal = document.getElementById('modalPelicula');
    if (!modal) {
        return;
    }

    setTimeout(() => {
            window.cargarDatosPelicula(id);
            window.cargarComentariosPelicula(id);
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            inicializarContadorCaracteres();
            inicializarCarrusel();
            irASlide(0);

            // Al navegar de película en película dentro del mismo modal,
            // siempre arrancar viendo el detalle desde arriba.
            // El scroll real vive en .modal-body, no en #modalPelicula.
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody && typeof modalBody.scrollTo === 'function') {
                modalBody.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (modalBody) {
                modalBody.scrollTop = 0;
            }
        }, 200);
};

function igualarAlturaSlides() {
    if (window.innerWidth > 768) return;

    const slidePoster = document.querySelector('#modalPelicula .carrusel-slide:first-child');
    const slideDatos = document.querySelector('#modalPelicula .carrusel-slide:last-child');

    if (!slidePoster || !slideDatos) return;

    const img = slidePoster.querySelector('.modal-poster img');

    const aplicarAltura = () => {
        slidePoster.style.height = 'auto';
        slideDatos.style.height = 'auto';
        if (img) img.style.height = 'auto';

        setTimeout(() => {
            const alturaDatos = slideDatos.scrollHeight;
            const alturaPoster = slidePoster.scrollHeight;
            const alturaMaxima = Math.max(alturaDatos, alturaPoster);

            slidePoster.style.height = alturaMaxima + 'px';
            slideDatos.style.height = alturaMaxima + 'px';

            const posterContainer = slidePoster.querySelector('.modal-poster');
            if (posterContainer) {
                posterContainer.style.width = '100%';
                posterContainer.style.height = alturaMaxima + 'px';
                posterContainer.style.maxWidth = '100%';
                posterContainer.style.margin = '0';
                posterContainer.style.borderRadius = '10px';
                posterContainer.style.overflow = 'hidden';
            }

            if (img) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.display = 'block';
            }
        }, 50);
    };

    if (img && !img.complete) {
        img.addEventListener('load', aplicarAltura, { once: true });
    } else {
        aplicarAltura();
    }
}

window.cerrarModal = function() {
    const modal = document.getElementById('modalPelicula');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');

        // Reset modo spoiler
        activarModoSpoiler(false);

        const iframe = modal.querySelector('iframe');
        if (iframe) iframe.src = iframe.src;
        const movieId = window.peliculaActualId;
        if (movieId) {
            const card = document.querySelector(`.pelicula-card[data-id="${movieId}"]`);
            if (card) {
                const token = localStorage.getItem('token');
                fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.ok ? r.json() : null)
                .then(stats => {
                    if (!stats) return;
                    const btnLike    = card.querySelector('.btn-like');
                    const btnDislike = card.querySelector('.btn-dislike');
                    if (btnLike)    btnLike.innerHTML    = `<i class="fas fa-thumbs-up"></i> ${stats.likes}`;
                    if (btnDislike) btnDislike.innerHTML = `<i class="fas fa-thumbs-down"></i> ${stats.dislikes}`;
                    btnLike?.classList.toggle('votado', stats.userVoteType === 'LIKE');
                    btnDislike?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');

                    const totalVotos = (stats.likes || 0) + (stats.dislikes || 0);
                    const porcentajeEl = card.querySelector(`#totalVotos-${movieId}`);
                    if (porcentajeEl) {
                        porcentajeEl.textContent = totalVotos === 0 ? '0%'
                            : `${Math.round((stats.likes / totalVotos) * 100)}%`;
                    }
                })
                .catch(() => {});
            }
        }

        // Sincronización con Voto Relámpago: si el usuario votó desde el
                // modal (en vez de los botones del segmento), avanzamos solo,
                // sin volver a pedirle el voto que ya emitió.
                if (window._votoRelampago && window._votoRelampago.movieId == movieId) {
                    fetch(`${CONFIG.API_URL}/reviews/movies/${movieId}/stats`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    })
                    .then(r => r.ok ? r.json() : null)
                    .then(stats => {
                        if (!stats || !stats.userVoteType) return; // no votó, no tocamos nada
                        if (stats.userVoteType === 'LIKE') {
                            window._votoRelampago.chainFromId = movieId;
                            window._votoRelampago.streak = (window._votoRelampago.streak || 0) + 1;
                        } else {
                            window._votoRelampago.chainFromId = null;
                            window._votoRelampago.streak = 0;
                        }
                        setTimeout(() => window.vrCargarSiguiente(), 200);
                    })
                    .catch(() => {});
                }

                window.peliculaActualId = null;
                window.modalActualId = null;
                window.cancelarComentario();
            }
        };

window.abrirWorkflowDesdeModal = function() {
    const movieId = window.peliculaActualId;
    const titulo = document.getElementById('modalTitulo')?.textContent || '';

    // Cargar comunidad.js si no está cargado aún
    if (typeof window.abrirWorkflowPublicacion !== 'function') {
        window.cargarModuloComunidad();
        // Esperar a que cargue y luego abrir
        const intervalo = setInterval(() => {
            if (typeof window.abrirWorkflowPublicacion === 'function') {
                clearInterval(intervalo);
                window.abrirWorkflowPublicacion(movieId, titulo);
            }
        }, 100);
    } else {
        window.abrirWorkflowPublicacion(movieId, titulo);
    }
};

window.cargarExpectativaPelicula = async function(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/movies/${id}/expectation`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        window._pintarExpectativa(data);
    } catch (e) {}
};

window._pintarExpectativa = function(data) {
    const estrellas = document.querySelectorAll('#modalExpectativaEstrellas i');
    const valorActual = data.userRating || 0;
    estrellas.forEach(star => {
        const v = parseInt(star.dataset.valor, 10);
        star.classList.toggle('activa', v <= valorActual);
    });

    const resumen = document.getElementById('modalExpectativaResumen');
    if (!resumen) return;
    if (data.count > 0) {
        resumen.textContent = `Nivel de expectativa: ${data.average.toFixed(1)} — ${data.count.toLocaleString('es-AR')} persona${data.count === 1 ? '' : 's'} la ${data.count === 1 ? 'está' : 'están'} esperando`;
    } else {
        resumen.textContent = '';
    }
};

window.calificarExpectativa = async function(id, valor) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/movies/${id}/expectation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: valor })
        });
                if (!res.ok) throw new Error();
                const data = await res.json();
                window._pintarExpectativa(data);
                // Sincroniza también la tarjeta del carrusel de atrás — si no,
                // se ve como si nunca hubieras calificado hasta refrescar.
                if (typeof window._pintarExpectativaCard === 'function') {
                    window._pintarExpectativaCard(id, data);
                }
            } catch (e) {}
        };

        window.cargarDatosPelicula = async function(id) {
    const token = localStorage.getItem('token');

    document.getElementById('modalTitulo').textContent = 'Cargando...';
    document.getElementById('modalSinopsis').textContent = 'Cargando información...';

    try {
        const response = await fetch(`${CONFIG.API_URL}/movies/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar película');
        const pelicula = await response.json();

        document.getElementById('modalTitulo').textContent = pelicula.title || 'Título no disponible';
        const tituloComentarios = document.getElementById('comentariosTitulo');
                if (tituloComentarios) tituloComentarios.textContent = `💬 Comentarios`;
        const posterEl = document.getElementById('modalPoster');
        const posterSrc = pelicula.poster_path
            ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
            : 'https://via.placeholder.com/300x450?text=Sin+imagen';
        posterEl.src = posterSrc;
        posterEl.onload = () => igualarAlturaSlides();
        posterEl.onerror = () => igualarAlturaSlides();
        document.getElementById('modalSinopsis').textContent = pelicula.overview || 'Sinopsis no disponible';

        const fecha       = document.getElementById('modalFecha');
        const duracion    = document.getElementById('modalDuracion');
        const idioma      = document.getElementById('modalIdioma');
        const popularidad = document.getElementById('modalPopularidad');
        const votos       = document.getElementById('modalVotos');
        const generos     = document.getElementById('modalGeneros');

                if (fecha)       fecha.textContent       = pelicula.release_date ? new Date(pelicula.release_date).toLocaleDateString('es-ES') : 'N/A';
                if (duracion)    duracion.textContent    = pelicula.runtime || 'N/A';

                // Fase "Lo que se viene" — si el estreno todavía no pasó, se
                // reemplaza Te banco/No te banco + comentarios por el widget
                // de expectativa. Recomendar se mantiene en ambos casos.
                const esProximoEstreno = !!pelicula.release_date && new Date(pelicula.release_date) > new Date();
                const elExpectativa  = document.getElementById('modalExpectativa');
                const elBtnLike      = document.querySelector('#modalPelicula .btn-like');
                const elBtnDislike   = document.querySelector('#modalPelicula .btn-dislike');
                const elComentarios  = document.querySelector('#modalPelicula .modal-fila-comentarios');

                if (elExpectativa) elExpectativa.style.display = esProximoEstreno ? 'block' : 'none';
                                // .btn-like/.btn-dislike tienen "display: flex !important"
                                // en el CSS — un !important de hoja de estilos le gana a un
                                // estilo inline normal, así que hay que setearlo también
                                // como !important desde acá (setProperty es la única forma).
                                if (elBtnLike) {
                                    if (esProximoEstreno) elBtnLike.style.setProperty('display', 'none', 'important');
                                    else elBtnLike.style.removeProperty('display');
                                }
                                if (elBtnDislike) {
                                    if (esProximoEstreno) elBtnDislike.style.setProperty('display', 'none', 'important');
                                    else elBtnDislike.style.removeProperty('display');
                                }
                if (elComentarios) elComentarios.style.display = esProximoEstreno ? 'none'  : '';

                if (esProximoEstreno) {
                    window.cargarExpectativaPelicula(id);
                }
        const TMDB_IDIOMAS = {
            'af': 'Afrikáans', 'ar': 'Árabe', 'bg': 'Búlgaro', 'bn': 'Bengalí',
            'ca': 'Catalán', 'cs': 'Checo', 'da': 'Danés', 'de': 'Alemán',
            'el': 'Griego', 'en': 'Inglés', 'es': 'Español', 'et': 'Estonio',
            'fa': 'Persa', 'fi': 'Finlandés', 'fr': 'Francés', 'gu': 'Gujarati',
            'he': 'Hebreo', 'hi': 'Hindi', 'hr': 'Croata', 'hu': 'Húngaro',
            'id': 'Indonesio', 'it': 'Italiano', 'ja': 'Japonés', 'kn': 'Canarés',
            'ko': 'Coreano', 'lt': 'Lituano', 'lv': 'Letón', 'ml': 'Malabar',
            'mr': 'Maratí', 'ms': 'Malayo', 'nb': 'Noruego', 'nl': 'Neerlandés',
            'pa': 'Punjabi', 'pl': 'Polaco', 'pt': 'Portugués', 'ro': 'Rumano',
            'ru': 'Ruso', 'sk': 'Eslovaco', 'sl': 'Esloveno', 'sr': 'Serbio',
            'sv': 'Sueco', 'sw': 'Suajili', 'ta': 'Tamil', 'te': 'Telugu',
            'th': 'Tailandés', 'tl': 'Filipino', 'tr': 'Turco', 'uk': 'Ucraniano',
            'ur': 'Urdu', 'vi': 'Vietnamita', 'zh': 'Chino', 'zu': 'Zulú'
        };
        if (idioma) idioma.textContent = TMDB_IDIOMAS[pelicula.original_language] || (pelicula.original_language || 'N/A').toUpperCase();
        if (popularidad) popularidad.textContent = Math.round(pelicula.popularity || 0);
        if (votos)       votos.textContent       = pelicula.vote_count || 0;
        const TMDB_GENEROS = {
            28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
            80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
            14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
            9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia Ficción',
            10770: 'Película de TV', 53: 'Suspenso', 10752: 'Bélica', 37: 'Western'
        };

        if (generos) {
                    const ids = pelicula.genre_ids || (pelicula.genres?.map(g => g.id)) || [];
                    generos.innerHTML = ids.length > 0
                        ? ids.map(id => `<span class="genero-chip">${TMDB_GENEROS[id] || id}</span>`).join('')
                        : '<span class="genero-chip">No especificado</span>';
                }

        // Verificar estado watchlist
                window.verificarEstadoWatchlist(id);

                const statsResponse = await fetch(`${CONFIG.API_URL}/reviews/movies/${id}/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            const totalVotosModal = (stats.likes || 0) + (stats.dislikes || 0);
            const porcentajeModal = totalVotosModal > 0 ? Math.round((stats.likes / totalVotosModal) * 100) : 0;
            document.getElementById('modalRating').innerHTML    = `👍 <span class="modal-rating-num">${porcentajeModal}%</span><span class="modal-rating-label"></span>`;
            document.getElementById('modalLikes').textContent    = stats.likes || 0;
            document.getElementById('modalDislikes').textContent = stats.dislikes || 0;
            const leyendaEl = document.getElementById('modalLeyendaPorcentaje');
            if (leyendaEl) {
                leyendaEl.textContent = porcentajeModal > 0
                    ? `Al ${porcentajeModal}% de los usuarios les gustó esta película`
                    : '';
            }

            const btnLike    = document.querySelector('#modalPelicula .btn-like');
            const btnDislike = document.querySelector('#modalPelicula .btn-dislike');
            btnLike?.classList.remove('votado');
            btnDislike?.classList.remove('votado');

            if (stats.userVoted) {
                if (stats.userVoteType === 'LIKE')    btnLike?.classList.add('votado');
                if (stats.userVoteType === 'DISLIKE') btnDislike?.classList.add('votado');
            }
        }
                if (typeof window.cargarTrailerPelicula === 'function') {
                                    window.cargarTrailerPelicula(id, pelicula.backdrop_path);
                                }
                window.cargarPeliculasSimilares(id);
                    window.cargarElenco(id);
                } catch (error) {
                    document.getElementById('modalTitulo').textContent = 'Error al cargar';
                }
        };

        // ==============================================
        // PELÍCULAS SIMILARES
        // ==============================================
        window.cargarPeliculasSimilares = async function(movieId) {
            const contenedor = document.getElementById('similares-container');
            if (!contenedor) return;

            contenedor.innerHTML = '<div class="similares-loading"><i class="fas fa-spinner fa-spin"></i></div>';

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${CONFIG.API_URL}/movies/${movieId}/similar`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error();

                const data = await response.json();
                const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;

                const peliculas = (data.results || [])
                        .filter(p => p.poster_path && p.title && soloLatinos.test(p.title.trim()))
                        .slice(0, 30);

                if (peliculas.length === 0) {
                    contenedor.closest('.similares-seccion').style.display = 'none';
                    return;
                }

                contenedor.closest('.similares-seccion').style.display = 'block';
                contenedor.innerHTML = peliculas.map(p => {
                    const poster = `https://image.tmdb.org/t/p/w185${p.poster_path}`;
                    const anio = p.release_date ? new Date(p.release_date).getFullYear() : '';
                    return `
                        <div class="similar-card" onclick="window.abrirDetallePelicula(${p.id}); setTimeout(() => { const mb = document.querySelector('#modalPelicula .modal-body'); if(mb) mb.scrollTo({ top: 0, behavior: 'smooth' }); }, 250);" title="${p.title}">
                            <img src="${poster}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/100x150?text=Sin+imagen'">
                            <div class="similar-card-info">
                                <span class="similar-titulo">${p.title}</span>
                                ${anio ? `<span class="similar-anio">${anio}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

            } catch (e) {
                    const seccion = contenedor.closest('.similares-seccion');
                    if (seccion) seccion.style.display = 'none';
                }
            };

            window.scrollSimilares = function(direccion) {
                const track = document.getElementById('similares-container');
                if (!track) return;
                const card = track.querySelector('.similar-card');
                const cardWidth = card ? card.offsetWidth + 14 : 130; // ancho + gap
                track.scrollBy({ left: direccion * cardWidth * 3, behavior: 'smooth' });
            };

// ==============================================
// CARGAR TRÁILER DE LA PELÍCULA
// ==============================================
window.cargarTrailerPelicula = async function(movieId, backdropPath) {
    const container = document.getElementById('modalTrailerContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="trailer-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando tráiler...</span>
        </div>
    `;

    const token = localStorage.getItem('token');
    const idiomas = ['es-MX', 'es-ES', 'en-US'];
    let videoToUse = null;

    for (const lang of idiomas) {
        try {
            const response = await fetch(
                `${CONFIG.API_URL}/movies/${movieId}/videos?language=${lang}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) continue;

            const data = await response.json();

            videoToUse = data.results?.find(v =>
                v.site === 'YouTube' && v.type === 'Trailer' && v.official === true
            ) || data.results?.find(v =>
                v.site === 'YouTube' && v.type === 'Trailer'
            );

            if (videoToUse) break;
        } catch (e) {
            continue;
        }
    }

        if (videoToUse?.key) {
            container.innerHTML = `
                <div class="trailer-embed">
                    <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/${videoToUse.key}"
                        title="Tráiler"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="sin-trailer">
                    <i class="fas fa-video-slash"></i>
                    <p>Tráiler no disponible</p>
                </div>
            `;
        }

        // Hero de fondo detrás de la ficha de datos — solo desktop. Reusa
        // el mismo video que ya se buscó acá arriba, sin pedirlo dos veces.
        if (window.innerWidth > 768 && typeof window._aplicarHeroModalPelicula === 'function') {
            window._aplicarHeroModalPelicula(videoToUse?.key || null, backdropPath);
        }
    };

    window._aplicarHeroModalPelicula = function(videoKey, backdropPath) {
        const hero = document.getElementById('modalHeroFondo');
        if (!hero) return;

        // Saca el video/imagen/overlay de una película anterior antes de
        // poner el nuevo — si no, se queda pegado el de la vez pasada.
        hero.querySelectorAll('.modal-hero-media, .modal-hero-video-wrap, .modal-hero-overlay').forEach(el => el.remove());

        const frag = document.createDocumentFragment();

        if (backdropPath) {
            const img = document.createElement('img');
            img.className = 'modal-hero-media';
            img.src = `https://image.tmdb.org/t/p/original${backdropPath}`;
            img.alt = '';
            frag.appendChild(img);
        } else if (videoKey) {
            const wrap = document.createElement('div');
            wrap.className = 'modal-hero-video-wrap';
            wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&loop=1&playlist=${videoKey}&controls=0&modestbranding=1&showinfo=0&rel=0&playsinline=1" allow="autoplay; encrypted-media" frameborder="0"></iframe>`;
            frag.appendChild(wrap);
        }
        // Si no hay ninguno de los dos, el fondo oscuro liso del CSS
        // (#14161f) ya cubre ese caso — no hace falta agregar nada más.

        const overlay = document.createElement('div');
        overlay.className = 'modal-hero-overlay';
        frag.appendChild(overlay);

        hero.insertBefore(frag, hero.firstChild);
    };

// ==============================================
// CARGAR COMENTARIOS — con botón reportar
// ==============================================
window.cargarComentariosPelicula = async function(id) {
    window.cargarSpoilerCount(id);

    let lista = document.getElementById('comentariosLista');
    let intentos = 0;

    while (!lista && intentos < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        lista = document.getElementById('comentariosLista');
        intentos++;
    }

    if (!lista) {
        return;
    }

    lista.innerHTML = '<div class="sin-comentarios">Cargando comentarios...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/comments/movies/${id}?spoiler=${modoSpoilerActivo}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

        if (!response.ok) throw new Error('Error al cargar comentarios');
        const comentarios = await response.json();

        const modalComentariosCount = document.getElementById('modalComentariosCount');
                if (modalComentariosCount) modalComentariosCount.innerHTML = `💬 <span class="modal-rating-num">${comentarios.length}</span><span class="modal-rating-label"></span>`;

                const btnComentarios = document.getElementById('modalComentariosBtn');
                if (btnComentarios) btnComentarios.textContent = comentarios.length;

                const verMasCount = document.getElementById('verMasCount');
                if (verMasCount) verMasCount.textContent = comentarios.length;

                const sheetCount = document.getElementById('comentariosSheetCount');
                if (sheetCount) sheetCount.textContent = comentarios.length;

                const verMas = document.getElementById('verMasComentarios');
                                if (verMas) {
                                    if (comentarios.length === 0) {
                                        verMas.style.setProperty('display', 'none', 'important');
                                    } else {
                                        verMas.style.removeProperty('display');
                                    }
                                }

        lista.innerHTML = '';
        if (comentarios.length === 0) {
            lista.innerHTML = '<div class="sin-comentarios">No hay comentarios aún. ¡Sé el primero en comentar!</div>';
        } else {
            comentarios.forEach(c => {
                // ownComment: true → es un comentario propio → mostrar botón ocultar
                // ownComment: false → comentario ajeno → mostrar botón reportar
                const mostrarBoton = !c.ownComment;

                const btnReporte = mostrarBoton ? `
                    <button
                        onclick="${c.reportedByMe ? '' : `window.abrirModalReporte(${c.id})`}"
                        style="background:none;border:none;cursor:${c.reportedByMe ? 'default' : 'pointer'};
                               color:${c.reportedByMe ? '#e50914' : '#ccc'};
                               font-size:0.75rem;padding:0.2rem 0.4rem;border-radius:4px;
                               display:flex;align-items:center;gap:0.3rem;flex-shrink:0;
                               transition:color 0.2s;"
                        ${c.reportedByMe ? 'disabled title="Ya reportaste este comentario"' : `
                            onmouseover="this.style.color='#e50914'"
                            onmouseout="this.style.color='#ccc'"
                            title="Reportar comentario"`}>
                        <i class="fas fa-flag"></i>
                    </button>` : '';

                // Botón ocultar — solo para comentarios propios
                const esMioOcultar = c.ownComment;
                const btnOcultar = esMioOcultar ? `
                    <button
                        onclick="window.abrirModalOcultar(${c.id})"
                        style="background:none;border:none;cursor:pointer;color:#ccc;
                               font-size:0.75rem;padding:0.2rem 0.4rem;border-radius:4px;
                               display:flex;align-items:center;gap:0.3rem;flex-shrink:0;
                               transition:color 0.2s;"
                        onmouseover="this.style.color='#e50914'"
                        onmouseout="this.style.color='#ccc'"
                        title="Ocultar mi comentario">
                        <i class="fas fa-ban"></i>
                    </button>` : '';

                const item = document.createElement('div');
                item.className = 'comentario-item';
                item.id = `comment-${c.id}`;
                item.style.cssText = 'display:flex; gap:0.75rem; padding:0.75rem 0; border-bottom:1px solid #f0f0f0; align-items:flex-start;';
                item.innerHTML = `
                    <div class="comentario-avatar" style="flex-shrink:0;">
                        ${c.avatarUrl
                            ? `<img src="${c.avatarUrl}" alt="${c.userName}" style="width:36px;height:36px;object-fit:cover;border-radius:50%;cursor:pointer;" onclick="event.stopPropagation(); window.cerrarModal(); window.abrirPerfilUsuario(${c.userId})">`
                            : `<div style="width:36px;height:36px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:0.85rem;cursor:pointer;" onclick="event.stopPropagation(); window.cerrarModal(); window.abrirPerfilUsuario(${c.userId})">${c.userName?.charAt(0) || 'U'}</div>`
                        }
                    </div>
                    <div class="comentario-contenido" style="flex:1;min-width:0;width:100%;">
                        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                            <span class="comentario-autor" style="font-weight:600;font-size:0.85rem;color:#333;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;"
                                  onclick="event.stopPropagation(); window.cerrarModal(); window.abrirPerfilUsuario(${c.userId})">${c.userName || 'Usuario'}</span>
                            <div style="display:flex;align-items:center;gap:0.2rem;flex-shrink:0;">
                                ${btnReporte}
                                ${btnOcultar}
                            </div>
                        </div>
                        <div class="comentario-texto" id="comentario-texto-${c.id}" style="font-size:0.9rem;color:#444;margin:0.25rem 0;word-break:break-word;">${c.content}</div>
                        ${c.hasGif && c.gifUrl ? `<img id="comentario-gif-${c.id}" src="${c.gifUrl}" alt="GIF" style="max-width:100%;max-height:200px;border-radius:8px;margin-top:0.4rem;display:block;">` : ''}
                        ${c.ownComment ? `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.4rem;flex-wrap:wrap;gap:0.4rem;">
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                                <button onclick="window.toggleBanco(${c.id}, this)"
                                    data-active="${c.bancadoByMe}"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:${c.bancadoByMe ? '#1a3a6b' : '#999'};padding:0;transition:color 0.2s;"
                                    title="Te banco">
                                    <i class="fas fa-thumbs-up"></i>
                                    <span class="banco-count-${c.id}">${c.bancoCount || 0}</span>
                                    <span style="font-size:0.75rem;">Te banco</span>
                                </button>
                                <button onclick="window.toggleRespuestas(${c.id}, this, true)"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#999;padding:0;transition:color 0.2s;"
                                    title="Responder">
                                    <i class="fas fa-reply"></i>
                                    <span class="btn-responder-label" style="font-size:0.75rem;">Responder</span>
                                </button>
                                ${(c.replyCount || 0) > 0 ? `
                                <button onclick="window.toggleRespuestas(${c.id}, this, false)"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#1a3a6b;padding:0;transition:color 0.2s;"
                                    title="Ver respuestas">
                                    <span style="font-size:0.75rem;">— Ver respuestas (<span class="reply-count-btn-${c.id}">${c.replyCount}</span>)</span>
                                </button>` : `<span class="reply-count-${c.id}" style="display:none;">${c.replyCount || 0}</span>`}
                            </div>
                            <div style="display:flex;align-items:center;gap:0.5rem;">
                                    <div class=\"comentario-fecha\" style=\"font-size:0.75rem;color:#999;\">${new Date(c.createdAt).toLocaleString('es-ES', {
                                                                                                          day: '2-digit', month: '2-digit', year: 'numeric',
                                                                                                          hour: '2-digit', minute: '2-digit',
                                                                                                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                                                                                      })}${c.editedAt ? ' <span style="font-size:0.7rem;color:#bbb;">(editado)</span>' : ''}</div>
                                    ${c.canEdit ? `
                                    <button onclick="window.editarComentario(${c.id}, this)"
                                        style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.75rem;color:#aaa;padding:0;transition:color 0.2s;"
                                        title="Editar comentario">
                                        <i class="fas fa-pencil-alt"></i>
                                        <span class="editar-label">Editar</span>
                                    </button>` : ''}
                                </div>
                            </div>
                            ` : `
                        <div style="margin-top:0.4rem;">
                            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.35rem;">
                                <button onclick="window.toggleBanco(${c.id}, this)"
                                    data-active="${c.bancadoByMe}"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:${c.bancadoByMe ? '#1a3a6b' : '#999'};padding:0;transition:color 0.2s;"
                                    title="Te banco">
                                    <i class="fas fa-thumbs-up"></i>
                                    <span class="banco-count-${c.id}">${c.bancoCount || 0}</span>
                                    <span style="font-size:0.75rem;">Te banco</span>
                                </button>
                                <button onclick="window.toggleMerecePunto(${c.id}, this, '${c.userName}')"
                                    data-active="${c.merecePuntoByMe}"
                                    data-locked="${c.merecePuntoLocked}"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:${c.merecePuntoByMe ? '#e8a800' : '#999'};padding:0;transition:color 0.2s;"
                                    title="¡Merecés un punto!">
                                    <i class="fas fa-star"></i>
                                    <span class="merece-count-${c.id}">${c.merecePuntoCount || 0}</span>
                                    <span style="font-size:0.75rem;">¡Merecés un punto!</span>
                                </button>
                                <button onclick="window.toggleRespuestas(${c.id}, this, true)"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#999;padding:0;transition:color 0.2s;"
                                    title="Responder">
                                    <i class="fas fa-reply"></i>
                                        <span class="btn-responder-label" style="font-size:0.75rem;">Responder</span>
                                    </button>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;">
                                <div class="comentario-fecha" style="font-size:0.75rem;color:#999;">${new Date(c.createdAt).toLocaleString('es-ES', {
                                                                                                          day: '2-digit', month: '2-digit', year: 'numeric',
                                                                                                          hour: '2-digit', minute: '2-digit',
                                                                                                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                                                                                      })}</div>
                                ${(c.replyCount || 0) > 0 ? `
                                <button onclick="window.toggleRespuestas(${c.id}, this, false)"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#1a3a6b;padding:0;transition:color 0.2s;"
                                    title="Ver respuestas">
                                    <span style="font-size:0.75rem;">— Ver respuestas (<span class="reply-count-btn-${c.id}">${c.replyCount}</span>)</span>
                                </button>` : `<span class="reply-count-${c.id}" style="display:none;">${c.replyCount || 0}</span>`}
                            </div>
                        </div>
                        `}
                                                <div class="replies-container-${c.id}" style="display:none;margin-top:0.75rem;padding-left:1rem;border-left:2px solid #f0f0f0;"></div>
                    </div>
                `;
                lista.appendChild(item);
                });

                // Aplicar color de borde según modo spoiler activo
                if (modoSpoilerActivo) {
                    const items = document.querySelectorAll('#modalPelicula .comentario-item');
                    items.forEach(i => { i.style.borderLeftColor = '#6c63ff'; });
                }
            }
        } catch (error) {
            if (lista) lista.innerHTML = '<div class="sin-comentarios">Error al cargar comentarios</div>';
        }
    };

    window.cargarSpoilerCount = async function(id) {
        const badge = document.getElementById('spoilerCountBadge');
        if (!badge) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/comments/movies/${id}/spoiler-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { badge.textContent = ''; return; }
            const data = await res.json();
            badge.textContent = data.count > 0 ? `(${data.count}) ` : '';
        } catch (e) {
            badge.textContent = '';
        }
    };

// ==============================================
// MODAL REPORTAR COMENTARIO
// ==============================================
window.abrirModalReporte = function(commentId) {
    window._comentarioReportandoId = commentId;

    // Reset
    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
    const desc = document.getElementById('reportDescription');
    if (desc) desc.value = '';

    const modal = document.getElementById('modalReportarComentario');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalReporte = function() {
    const modal = document.getElementById('modalReportarComentario');
    if (modal) modal.style.display = 'none';
    window._comentarioReportandoId = null;
};

window.enviarReporte = async function() {
    const commentId = window._comentarioReportandoId;
        const replyId = window._replyReportandoId;
        if (!commentId && !replyId) return;

    const reasonEl = document.querySelector('input[name="reportReason"]:checked');
    if (!reasonEl) {
        alert('Por favor seleccioná un motivo para el reporte.');
        return;
    }

    const description = document.getElementById('reportDescription')?.value.trim() || '';

    const btn = document.getElementById('btnEnviarReporte');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
        const token = localStorage.getItem('token');
        const endpoint = replyId
                    ? `${CONFIG.API_URL}/comments/replies/${replyId}/report`
                    : `${CONFIG.API_URL}/comments/${commentId}/report`;
                const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reason: reasonEl.value,
                description: description || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Error al enviar el reporte.');
            return;
        }

        window.cerrarModalReporte();
        alert('Reporte enviado. Nuestro equipo lo revisara a la brevedad.');

    } catch (error) {
        alert('Error al enviar el reporte. Intentá de nuevo.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar reporte'; }
    }
};

// ==============================================
// MODAL OCULTAR COMENTARIO PROPIO
// ==============================================
window.abrirModalOcultar = function(commentId) {
    window._comentarioOcultandoId = commentId;
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) {
        const titulo = modal.querySelector('h3');
        const texto  = modal.querySelector('p');
        if (titulo) titulo.textContent = 'Ocultar comentario';
        if (texto)  texto.innerHTML = 'Tu comentario dejará de ser visible para otros usuarios. Esta acción es <strong>irreversible</strong>. Si el comentario tiene puntos ganados, reacciones o respuestas tuyas, todo se perderá al ocultarlo.';
        modal.style.display = 'flex';
    }
};

window.cerrarModalOcultar = function() {
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) modal.style.display = 'none';
    window._comentarioOcultandoId = null;
};

window.confirmarOcultar = async function() {
    const commentId = window._comentarioOcultandoId;
    if (!commentId) return;

    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) { btn.disabled = true; btn.textContent = 'Ocultando...'; }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/comments/${commentId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 422) {
            window.cerrarModalOcultar();
            window.mostrarToast(data.error || 'Alcanzaste el límite de 3 ocultamientos para esta película.', 'error');
            return;
        }

        if (!response.ok) {
            window.cerrarModalOcultar();
            window.mostrarToast(data.error || 'Error al ocultar el comentario.', 'error');
            return;
        }

        window.cerrarModalOcultar();
        window.mostrarToast('Tu comentario fue ocultado correctamente.', 'success');

        // Recargar comentarios para reflejar el cambio
        const movieId = window.peliculaActualId;
        if (movieId) await window.cargarComentariosPelicula(movieId);

    } catch (error) {
        window.cerrarModalOcultar();
        window.mostrarToast('Error al ocultar el comentario. Intentá de nuevo.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sí, ocultar'; }
    }
};

window.mostrarToast = function(mensaje, tipo = 'success') {
    // Toast propio para el feed
    const existente = document.getElementById('feedToast');
    if (existente) existente.remove();

    const t = document.createElement('div');
    t.id = 'feedToast';
    t.textContent = mensaje;
    t.style.cssText = `
        position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
        background:${tipo === 'error' ? '#e50914' : '#2e7d32'};
        color:white; padding:0.75rem 1.5rem; border-radius:24px;
        font-size:0.9rem; font-weight:600; z-index:9999999;
        box-shadow:0 4px 16px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 3500);
};

// ==============================================
// REACCIONES: TE BANCO
// ==============================================
window.toggleBanco = async function(commentId, btn) {
    const token = localStorage.getItem('token');
    const counter = document.querySelector(`.banco-count-${commentId}`);

    // Estado previo (para revertir si el request falla)
    const estabaActivo = btn.dataset.active === 'true';
    const countPrevio = counter ? (parseInt(counter.textContent, 10) || 0) : 0;

    // --- Actualización optimista: se ve al instante del clic ---
    const nuevoActivo = !estabaActivo;
    btn.dataset.active = nuevoActivo;
    btn.style.color = nuevoActivo ? '#1a3a6b' : '#999';
    if (counter) counter.textContent = countPrevio + (nuevoActivo ? 1 : -1);

    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}/banco`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Respuesta no OK');
        const data = await res.json();

        // Confirmar con el valor real del servidor
        btn.dataset.active = data.active;
        btn.style.color = data.active ? '#1a3a6b' : '#999';
        if (counter) counter.textContent = data.count;
    } catch (e) {
        // Revertir el cambio optimista si falló
        btn.dataset.active = estabaActivo;
        btn.style.color = estabaActivo ? '#1a3a6b' : '#999';
        if (counter) counter.textContent = countPrevio;
        console.error(e);
    }
};

// ==============================================
// REACCIONES: ¡MERECÉS UN PUNTO!
// ==============================================
window._merecePuntoCommentId = null;
window._merecePuntoBtn = null;
window._merecePuntoAuthorName = null;

window.cerrarModalMerecePunto = function() {
    const modal = document.getElementById('modalMerecePunto');
    if (modal) modal.style.display = 'none';
    window._merecePuntoCommentId = null;
    window._merecePuntoBtn = null;
    window._merecePuntoAuthorName = null;
};

window.confirmarMerecePunto = async function() {
    const commentId = window._merecePuntoCommentId;
    const btn = window._merecePuntoBtn;
    const authorName = window._merecePuntoAuthorName;
    if (!commentId) return;

    const btnConfirmar = document.getElementById('btnConfirmarMerecePunto');
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = 'Enviando...'; }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}/merece-punto`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        window.cerrarModalMerecePunto();

        if (res.status === 409 && data.alreadyGiven) {
            window.mostrarToast('Ya le diste un punto a este comentario.', 'info');
            if (btn) { btn.dataset.active = 'true'; btn.style.color = '#e8a800'; }
            return;
        }
        if (!res.ok) return;

        if (btn) { btn.dataset.active = 'true'; btn.style.color = '#e8a800'; }
        const counter = document.querySelector(`.merece-count-${commentId}`);
        if (counter) counter.textContent = data.count;
        window.mostrarToast(`Le avisamos a ${authorName} que su comentario vale un punto extra este mes.`, 'success');

    } catch(e) {
        window.cerrarModalMerecePunto();
        console.error(e);
    } finally {
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Sí, dar punto'; }
    }
};

window._merecePuntoCommentId = null;
window._merecePuntoBtn = null;
window._merecePuntoAuthorName = null;

window.cerrarModalMerecePunto = function() {
    const modal = document.getElementById('modalMerecePunto');
    if (modal) modal.style.display = 'none';
    window._merecePuntoCommentId = null;
    window._merecePuntoBtn = null;
    window._merecePuntoAuthorName = null;
};

window.confirmarMerecePunto = async function() {
    const commentId = window._merecePuntoCommentId;
    const btn = window._merecePuntoBtn;
    const authorName = window._merecePuntoAuthorName;
    if (!commentId) return;

    const btnConfirmar = document.getElementById('btnConfirmarMerecePunto');
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = 'Enviando...'; }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}/merece-punto`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        window.cerrarModalMerecePunto();

        if (res.status === 409 && data.alreadyGiven) {
            window.mostrarToast('Ya le diste un punto a este comentario.', 'info');
            if (btn) { btn.dataset.active = 'true'; btn.style.color = '#e8a800'; }
            return;
        }
        if (!res.ok) return;

        if (btn) { btn.dataset.active = 'true'; btn.style.color = '#e8a800'; }
        const counter = document.querySelector(`.merece-count-${commentId}`);
        if (counter) counter.textContent = data.count;
        window.mostrarToast(`Le avisamos a ${authorName} que su comentario vale un punto extra este mes.`, 'success');

    } catch(e) { console.error(e); } finally {
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Sí, dar punto'; }
    }
};

window.toggleMerecePunto = async function(commentId, btn, authorName) {
    if (btn.dataset.active === 'true') {
        window.mostrarToast('Ya le diste un punto a este comentario. Esta acción es irreversible.', 'info');
        return;
    }
    window._merecePuntoCommentId = commentId;
    window._merecePuntoBtn = btn;
    window._merecePuntoAuthorName = authorName;
    const nombreEl = document.getElementById('merecePuntoAutorNombre');
    if (nombreEl) nombreEl.textContent = authorName;
    const modal = document.getElementById('modalMerecePunto');
    if (modal) modal.style.display = 'flex';
};

// ==============================================
// RESPUESTAS: TOGGLE + CARGA + ENVÍO
// ==============================================
window.toggleRespuestas = async function(commentId, btn, focusInput = false) {
    const container = document.querySelector(`.replies-container-${commentId}`);
    if (!container) return;

    if (container.style.display !== 'none' && !focusInput) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        // Solo recargar si el container está vacío o solo tiene el loader
        const soloLoader = container.innerHTML.trim() === '' ||
                           container.innerHTML.includes('Cargando...');
        if (soloLoader) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#999;">Cargando...</div>';
            await window.cargarRespuestas(commentId, 0);
        }

    if (focusInput) {
            setTimeout(() => window.abrirFormRespuesta(commentId, null), 150);
        }
};

window.cargarRespuestas = async function(commentId, offset) {
    const container = document.querySelector(`.replies-container-${commentId}`);
    if (!container) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}/replies?offset=${offset}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const replies = await res.json();
        const hasMore = res.headers.get('X-Has-More') === 'true';
        const total = res.headers.get('X-Total-Replies') || '0';

        // Actualizar contador
        document.querySelectorAll(`.reply-count-${commentId}, .reply-count-btn-${commentId}`)
                    .forEach(el => el.textContent = total);

        if (offset === 0) container.innerHTML = '';

        if (replies.length === 0 && offset === 0) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#999;">Sin respuestas aún.</div>';
        }

        replies.forEach(r => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid #f8f8f8;align-items:flex-start;';

                    // Respuesta ocultada por el propio usuario
                                        if (r.moderationStatus === 'HIDDEN_BY_USER') {
                                            div.innerHTML = `
                                                <div style="flex:1;padding:0.3rem 0.5rem;border-left:2px solid #e0e0e0;">
                                                    <em style="font-size:0.8rem;color:#bbb;">
                                                        Esta respuesta fue ocultada por ${r.userName}.
                                                    </em>
                                                </div>`;
                                            container.appendChild(div);
                                            return;
                                        }

                                        // Respuesta eliminada por moderación
                                        if (r.moderationStatus === 'REMOVED') {
                        div.innerHTML = `
                            <div style="flex:1;padding:0.3rem 0.5rem;border-left:2px solid #e0e0e0;">
                                <em style="font-size:0.8rem;color:#bbb;">
                                    Cinemarketer eliminó esta respuesta por infringir nuestras normas de convivencia.
                                </em>
                            </div>`;
                        container.appendChild(div);
                        return;
                    }

                    div.innerHTML = `
                        <div style="flex-shrink:0;">
                            ${r.avatarUrl
                                ? `<img src="${r.avatarUrl}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;">`
                                : `<div style="width:28px;height:28px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:0.75rem;">${r.userName?.charAt(0)||'U'}</div>`
                            }
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                                <span style="font-weight:600;font-size:0.8rem;color:#333;cursor:pointer;" onclick="event.stopPropagation(); window.cerrarModal(); window.abrirPerfilUsuario(${r.userId})">${r.userName}</span>
                                <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                    ${!r.ownReply ? `
                                    <button onclick="window.abrirModalReporteReply(${r.id})"
                                        style="background:none;border:none;cursor:pointer;font-size:0.75rem;
                                               color:#ccc;padding:2px 4px;transition:color 0.2s;"
                                        onmouseover="this.style.color='#e50914'"
                                        onmouseout="this.style.color='#ccc'"
                                        title="Reportar respuesta">
                                        <i class="fas fa-flag"></i>
                                    </button>` : `
                                    <button onclick="window.abrirModalOcultarReply(${r.id})"
                                        style="background:none;border:none;cursor:pointer;font-size:0.75rem;
                                               color:#ccc;padding:2px 4px;transition:color 0.2s;"
                                        onmouseover="this.style.color='#e50914'"
                                        onmouseout="this.style.color='#ccc'"
                                        title="Ocultar mi respuesta">
                                        <i class="fas fa-ban"></i>
                                    </button>`}
                                </div>
                            </div>
                            <div class="respuesta-texto" id="respuesta-texto-${r.id}" style="font-size:0.85rem;color:#444;margin:0.2rem 0;word-break:break-word;">${r.content}</div>
                                    ${r.hasGif && r.gifUrl ? `<img id="respuesta-gif-${r.id}" src="${r.gifUrl}" alt="GIF" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:0.3rem;display:block;">` : ''}
                                    <div style="display:flex;align-items:center;gap:0.75rem;margin-top:0.3rem;">
                                        <button onclick="window.toggleReplyBanco(${r.id}, this)"
                                            data-active="${r.bancadoByMe}"
                                            style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;
                                                   font-size:0.75rem;color:${r.bancadoByMe ? '#1a3a6b' : '#999'};padding:0;">
                                            <i class="fas fa-thumbs-up"></i>
                                            <span class="reply-banco-count-${r.id}">${r.bancoCount || 0}</span>
                                            <span>Te banco</span>
                                        </button>
                                        <button onclick="window.abrirFormRespuesta(${commentId}, this, ${r.id})"
                                            style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:#999;padding:0;">
                                            <i class="fas fa-reply"></i> Responder
                                        </button>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:5px;">
                                        <div class="respuesta-fecha" id="respuesta-fecha-${r.id}" style="font-size:0.7rem;color:#bbb;">${new Date(r.createdAt).toLocaleString('es-ES', {
                                                                                         day: '2-digit', month: '2-digit', year: 'numeric',
                                                                                         hour: '2-digit', minute: '2-digit',
                                                                                         timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                                                                     })}${r.editedAt ? ' <span class="editado-label" style="color:#bbb;">(editado)</span>' : ''}</div>
                                        ${r.canEdit ? `
                                        <button onclick="window.editarRespuesta(${r.id}, this)"
                                            style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.7rem;color:#aaa;padding:0;">
                                            <i class="fas fa-pencil-alt"></i>
                                            <span>Editar</span>
                                        </button>` : ''}
                                    </div>
                                </div>
                            `;
                    container.appendChild(div);
                });

        // Botón "Ver más"
        const existingVerMas = container.querySelector('.ver-mas-btn');
        if (existingVerMas) existingVerMas.remove();

        if (hasMore) {
            const verMas = document.createElement('button');
            verMas.className = 'ver-mas-btn';
            verMas.style.cssText = 'background:none;border:none;color:#1a3a6b;font-size:0.8rem;cursor:pointer;padding:0.4rem 0;width:100%;text-align:left;';
            verMas.textContent = 'Ver más respuestas...';
            verMas.onclick = () => window.cargarRespuestas(commentId, offset + 5);
            container.appendChild(verMas);
        }

    } catch (e) {
        container.innerHTML = '<div style="font-size:0.8rem;color:#999;">Error al cargar respuestas.</div>';
    }
};

window.enviarRespuesta = async function(commentId) {
    const input = document.getElementById(`reply-input-${commentId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content && !window._gifSeleccionadoReply) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}/replies`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                            content,
                            parentReplyId: window._replyingToReplyId || null,
                            gifUrl: window._gifSeleccionadoReply || null
                        })
        });
        const data = await res.json();
        if (res.status === 422 && data.rejected) {
            window.mostrarToast('Tu respuesta no cumple con nuestras políticas de convivencia.', 'error');
            return;
        }
        if (!res.ok) {
            window.mostrarToast(data.message || 'Error al enviar la respuesta.', 'error');
            return;
        }
        input.value = '';
        window._gifSeleccionadoReply = null;
        await window.cargarRespuestas(commentId, 0);
    } catch (e) {
        window.mostrarToast('Error de conexión.', 'error');
    }
};

window.toggleReplyBanco = async function(replyId, btn) {
    const token = localStorage.getItem('token');
    const counter = document.querySelector(`.reply-banco-count-${replyId}`);

    const estabaActivo = btn.dataset.active === 'true';
    const countPrevio = counter ? (parseInt(counter.textContent, 10) || 0) : 0;

    // --- Actualización optimista ---
    const nuevoActivo = !estabaActivo;
    btn.dataset.active = nuevoActivo;
    btn.style.color = nuevoActivo ? '#1a3a6b' : '#999';
    if (counter) counter.textContent = countPrevio + (nuevoActivo ? 1 : -1);

    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/replies/${replyId}/banco`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Respuesta no OK');
        const data = await res.json();

        btn.dataset.active = data.active;
        btn.style.color = data.active ? '#1a3a6b' : '#999';
        if (counter) counter.textContent = data.count;
    } catch (e) {
        btn.dataset.active = estabaActivo;
        btn.style.color = estabaActivo ? '#1a3a6b' : '#999';
        if (counter) counter.textContent = countPrevio;
        console.error(e);
    }
};

window.abrirModalReporteReply = function(replyId) {
    window._replyReportandoId = replyId;
    window._comentarioReportandoId = null; // asegura que no use el de comentario

    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
    const desc = document.getElementById('reportDescription');
    if (desc) desc.value = '';

    const modal = document.getElementById('modalReportarComentario');
    if (modal) modal.style.display = 'flex';
};

window.abrirFormRespuesta = function(commentId, btn, replyId = null) {
    window._replyingToReplyId = replyId;

    // Cerrar área de comentario principal si está abierta
    window.cancelarComentario();

    // Cerrar cualquier edición abierta (de comentario o de respuesta)
    document.querySelectorAll('#modalPelicula [data-texto-original]').forEach(el => {
        el.textContent = el.dataset.textoOriginal;
        delete el.dataset.textoOriginal;
    });

    const container = document.querySelector(`.replies-container-${commentId}`);
    if (!container) return;

    // Si ya hay un form abierto EN ESTE MISMO comentario, actúa como
    // toggle: lo cerramos y listo (no se vuelve a abrir).
    const existing = container.querySelector('.reply-form');
    if (existing) {
        existing.remove();
        return;
    }

    // Si había un form de respuesta abierto en OTRO comentario distinto,
    // lo cerramos — solo puede haber uno abierto a la vez en todo el modal.
    document.querySelectorAll('#modalPelicula .reply-form').forEach(f => f.remove());

    const form = document.createElement('div');
    form.className = 'reply-form';
    form.style.cssText = 'margin-top:0.5rem;display:flex;gap:0.5rem;';
        form.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:0.3rem;flex:1;">
                <textarea placeholder="Escribí tu respuesta..."
                style="flex:1;border:1px solid #e0e0e0;border-radius:12px;padding:0.4rem 0.75rem;font-size:0.85rem;outline:none;width:100%;box-sizing:border-box;resize:none;min-height:60px;font-family:inherit;"
                id="reply-input-${commentId}"
                maxlength="2000"
                onkeydown="if(event.key==='Enter' && window.innerWidth > 768 && !event.shiftKey) { event.preventDefault(); const val=this.value; const start=this.selectionStart; const end=this.selectionEnd; this.value=val.substring(0,start)+'\n'+val.substring(end); this.selectionStart=this.selectionEnd=start+1; } else if(event.key==='Enter' && window.innerWidth <= 768) { event.preventDefault(); window.enviarRespuesta(${commentId}); }"></textarea>
                <div style="display:flex;gap:0.4rem;align-items:center;justify-content:flex-end;">
                    <button type="button" id="emoji-trigger-reply-${commentId}"
                        class="cep-trigger-btn" title="Insertar emoji">😊</button>
                    <button type="button" id="gif-trigger-reply-${commentId}"
                        class="cep-trigger-btn gif-trigger-btn"
                        style="font-size:0.7rem;font-weight:700;color:#888;letter-spacing:-0.5px;"
                        title="Insertar GIF">GIF</button>
                    <button onclick="window.cerrarCajaRespuesta(${commentId})" style="background:none;border:1px solid #ddd;border-radius:20px;padding:0.4rem 0.9rem;font-size:0.8rem;cursor:pointer;color:#888;display:flex;align-items:center;gap:0.4rem;" title="Cancelar"><span class="reply-cancelar-label">Cancelar</span><span class="reply-cancelar-x">✕</span></button>
                    <button onclick="window.enviarRespuesta(${commentId})" style="background:#1a3a6b;color:white;border:none;border-radius:20px;padding:0.4rem 0.9rem;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;" title="Enviar"><i class="fas fa-paper-plane"></i> <span class="reply-enviar-label">Enviar</span></button>
                </div>
                <div id="gifPreviewReply-${commentId}" style="display:none;position:relative;padding:0.2rem 0;">
                    <img id="gifPreviewImgReply-${commentId}" src="" alt="GIF"
                         style="max-height:100px;border-radius:6px;display:block;">
                    <button onclick="window.quitarGifReply(${commentId})"
                        style="position:absolute;top:0;right:0;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:0.7rem;cursor:pointer;line-height:1;padding:0;">✕</button>
                </div>
            </div>
        `;
        container.appendChild(form);
        setTimeout(() => {
        const replyInput = document.getElementById(`reply-input-${commentId}`);
        const emojiBtn   = document.getElementById(`emoji-trigger-reply-${commentId}`);
        const gifBtn     = document.getElementById(`gif-trigger-reply-${commentId}`);
        if (replyInput) replyInput.focus();
        if (replyInput && emojiBtn && typeof window.initEmojiPicker === 'function') {
            window.initEmojiPicker(replyInput, emojiBtn);
        }
        if (gifBtn && typeof window.initGifPicker === 'function') {
            window.initGifPicker(gifBtn, 'reply', commentId);
        }
    }, 50);
};

// ── Modo Spoiler ──────────────────────────────────────────────
let modoSpoilerActivo = false;

async function spoilerYaAceptado(movieId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;
        const res = await fetch(`${CONFIG.API_URL}/comments/spoiler-accepted/${movieId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.accepted === true;
    } catch { return false; }
}

async function guardarSpoilerAceptado(movieId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await fetch(`${CONFIG.API_URL}/comments/spoiler-accepted/${movieId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch {}
}

window.toggleModoSpoiler = async function() {
    if (!modoSpoilerActivo) {
        const yaAceptado = await spoilerYaAceptado(window.peliculaActualId);
        if (yaAceptado) {
            activarModoSpoiler(true);
            return;
        }
        const checkbox = document.getElementById('spoilerNoAdvertir');
        if (checkbox) checkbox.checked = false;
        const modal = document.getElementById('modalSpoilerWarning');
        if (modal) modal.style.display = 'flex';
        return;
    }
    activarModoSpoiler(false);
};

window.confirmarSpoilerWarning = async function() {
    const modal    = document.getElementById('modalSpoilerWarning');
    const checkbox = document.getElementById('spoilerNoAdvertir');
    if (modal) modal.style.display = 'none';
    if (checkbox?.checked && window.peliculaActualId) {
        await guardarSpoilerAceptado(window.peliculaActualId);
    }
    activarModoSpoiler(true);
};

window.cancelarSpoilerWarning = function() {
    const modal = document.getElementById('modalSpoilerWarning');
    if (modal) modal.style.display = 'none';
};

window.activarModoSpoiler = function activarModoSpoiler(activar) {
    modoSpoilerActivo = activar;

    const toggle   = document.getElementById('spoilerToggle');
    const label    = document.getElementById('spoilerSwitchLabel');
    const textarea = document.getElementById('nuevoComentario');
    const aviso    = document.getElementById('spoilerAviso');
    const btnCom   = document.querySelector('.comentario-teaser');
    const header   = document.querySelector('#modalPelicula .modal-header');

    toggle?.classList.toggle('activo', modoSpoilerActivo);
    label?.classList.toggle('activo', modoSpoilerActivo);
    textarea?.classList.toggle('spoiler-mode', modoSpoilerActivo);
    if (aviso) aviso.style.display = modoSpoilerActivo ? 'block' : 'none';
    if (btnCom) btnCom.classList.toggle('spoiler-mode', modoSpoilerActivo);
    header?.classList.toggle('spoiler-mode', modoSpoilerActivo);

    // Cambiar color de bordes de comentarios según modo spoiler
        const items = document.querySelectorAll('#modalPelicula .comentario-item');
        items.forEach(item => {
            item.style.borderLeftColor = modoSpoilerActivo ? '#6c63ff' : '#e50914';
        });

    // Cambiar fondo sección comentarios y botón según modo spoiler
        const filaComentarios = document.querySelector('#modalPelicula .modal-fila-comentarios');
        const filaBoton = document.querySelector('#modalPelicula .modal-fila-boton');
        if (filaComentarios) filaComentarios.classList.toggle('spoiler-mode', modoSpoilerActivo);
        if (filaBoton) filaBoton.classList.toggle('spoiler-mode', modoSpoilerActivo);

    if (textarea) {
        textarea.placeholder = modoSpoilerActivo
            ? 'Escribí tu spoiler... (máx 2000 caracteres)'
            : 'Escribe tu comentario... (máx 2000 caracteres)';
    }

    if (window.peliculaActualId) {
        window.cargarComentariosPelicula(window.peliculaActualId);
    }
}

// ==============================================
// FUNCIONES DE COMENTARIOS EN MODAL
// ==============================================
window.mostrarAreaComentario = function() {
    // Cerrar cualquier form de respuesta abierto
    document.querySelectorAll('.reply-form').forEach(f => f.remove());

    // Cerrar cualquier edición abierta (de comentario o de respuesta —
    // ambas usan el mismo atributo data-texto-original), restaurando el
    // texto original sin guardar nada.
    document.querySelectorAll('#modalPelicula [data-texto-original]').forEach(el => {
        el.textContent = el.dataset.textoOriginal;
        delete el.dataset.textoOriginal;
    });

    const teaser = document.getElementById('comentarioTeaser');
        if (teaser) teaser.style.setProperty('display', 'none', 'important');

        const area = document.getElementById('areaEscritura');
        if (area) {
            area.style.display = 'block';
        const textarea = document.getElementById('nuevoComentario');
        if (textarea) {
            textarea.focus();
            const restantes = document.getElementById('caracteresRestantes');
            if (restantes) restantes.textContent = `${textarea.value.length}/2000`;

            // Inicializar emoji picker si no está ya
            if (!textarea._emojiPickerInit) {
                textarea._emojiPickerInit = true;
                const triggerBtn = document.getElementById('emojiTriggerMain');
                if (triggerBtn && typeof window.initEmojiPicker === 'function') {
                    window.initEmojiPicker(textarea, triggerBtn);
                }
                if (typeof window.initGifPickerMain === 'function') {
                    window.initGifPickerMain();
                }
            }
        }
    }
};

window.abrirComentariosSheet = function(enfocarEscritura) {
    const fila = document.querySelector('#modalPelicula .modal-fila-comentarios');
    if (!fila) return;

    fila.classList.add('comentarios-sheet-fixed');
    fila.offsetHeight;
    fila.classList.add('comentarios-sheet-open');

    if (enfocarEscritura) {
        window.mostrarAreaComentario();
    }
};

window.cerrarComentariosSheet = function() {
    const fila = document.querySelector('#modalPelicula .modal-fila-comentarios');
    if (!fila) return;

    fila.classList.remove('comentarios-sheet-open');
    setTimeout(() => {
        fila.classList.remove('comentarios-sheet-fixed');
    }, 300);
};

window.cancelarComentario = function() {
    const teaser = document.getElementById('comentarioTeaser');
        if (teaser) teaser.style.removeProperty('display');

        const area = document.getElementById('areaEscritura');
        if (area) area.style.display = 'none';

    const input = document.getElementById('nuevoComentario');
    if (input) input.value = '';

    const restantes = document.getElementById('caracteresRestantes');
    if (restantes) restantes.textContent = '0/2000';

    // Limpiar GIF
    window._gifSeleccionado = null;
    const preview = document.getElementById('gifPreviewMain');
    const img     = document.getElementById('gifPreviewImgMain');
    if (preview) preview.style.display = 'none';
    if (img)     img.src = '';

    // Cerrar pickers si están abiertos
    if (typeof window.cerrarEmojiPicker === 'function') window.cerrarEmojiPicker();
    if (typeof window.cerrarGifPicker   === 'function') window.cerrarGifPicker();
};

window.enviarComentario = async function() {
    const input = document.getElementById('nuevoComentario');
    if (!input) {
        alert('Error: No se pudo encontrar el campo de comentario');
        return;
    }

    const texto   = input.value.trim();
    const movieId = window.peliculaActualId;

    if (!movieId) { alert('Error: No hay película seleccionada'); return; }
    if (!texto && !window._gifSeleccionado) { alert('Por favor escribe un comentario o seleccioná un GIF'); input.focus(); return; }

    if (texto.length > 2000) {
        alert(`El comentario excede el límite de 2000 caracteres.`);
        input.focus();
        return;
    }

    const btnEnviar = document.querySelector('.btn-enviar');
    const originalText = btnEnviar.textContent;
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Debes iniciar sesión para comentar');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${CONFIG.API_URL}/comments/movies/${movieId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                    content: texto,
                    gifUrl: window._gifSeleccionado || null,
                    spoiler: modoSpoilerActivo
                })
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Sesión expirada. Por favor inicia sesión nuevamente.');
                window.location.href = 'login.html';
                return;
            }

            // Comentario rechazado por moderación
            if (response.status === 422) {
                const data = await response.json();
                showToast('error', data.error || 'Tu comentario no pudo publicarse por no cumplir con nuestras políticas de convivencia.');
                return;
            }

            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
                const comentarioCreado = data.comment || data;
                mostrarPuntosGanados(comentarioCreado.pointsAwarded);

                input.value = '';
                window._gifSeleccionado = null;
                window.cancelarComentario();

        const contadorCard = document.getElementById(`comentarios-card-${movieId}`);
                if (contadorCard) {
                    window._pintarContadorComentarios(contadorCard, parseInt(contadorCard.textContent || '0') + 1);
                }

        await window.cargarComentariosPelicula(movieId);

        if (data.comentarioDuplicado) {
            showToast('info', 'Los comentarios repetidos no suman puntos.');
        } else if (data.limiteDiarioAlcanzado) {
            mostrarMensajeLimiteDiario();
        } else {
            showToast('success', '¡Comentario enviado con éxito!');
        }

    } catch (error) {
        showToast('error', 'No se pudo enviar el comentario. Intentá de nuevo.');
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = originalText;
    }
};

function inicializarContadorCaracteres() {
    const textarea  = document.getElementById('nuevoComentario');
    const restantes = document.getElementById('caracteresRestantes');

    if (textarea && restantes) {
        const nuevoTextarea = textarea.cloneNode(true);
        textarea.parentNode.replaceChild(nuevoTextarea, textarea);

        nuevoTextarea.addEventListener('input', function() {
            const longitud = this.value.length;
            restantes.textContent = `${longitud}/2000`;
            if (longitud > 1800) {
                restantes.style.color = '#e50914';
                restantes.style.fontWeight = 'bold';
            } else {
                restantes.style.color = '#666';
                restantes.style.fontWeight = 'normal';
            }
        });

        restantes.textContent = '0/2000';
    }
}

// ==============================================
// SWITCH TIPO DE CONTENIDO (Película / Serie) — Filtros avanzados
// ==============================================
window._filtroTipoActivo = 'pelicula';

window.toggleFiltroTipo = function(tipo) {
    window._filtroTipoActivo = tipo;
    const esSerie = tipo === 'serie';

    ['filtroSwitchPelicula', 'filtroSwitchPeliculaMobile'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('activo', !esSerie);
    });
    ['filtroSwitchSerie', 'filtroSwitchSerieMobile'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('activo', esSerie);
    });

    const mostrarOcultar = (id, mostrar) => {
        const el = document.getElementById(id);
        if (el) el.style.display = mostrar ? '' : 'none';
    };

    mostrarOcultar('filtroDuracionPeliculaGrupo', !esSerie);
    mostrarOcultar('filtroDuracionPeliculaGrupoMobile', !esSerie);
    mostrarOcultar('filtroTemporadasSerieGrupo', esSerie);
    mostrarOcultar('filtroTemporadasSerieGrupoMobile', esSerie);

    ['filtroBusquedaLabel', 'filtroBusquedaLabelMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = esSerie ? 'Buscar serie' : 'Buscar película';
    });

    // Limpiar los campos específicos del tipo que se deja de usar, para
        // que no queden filtros "fantasma" aplicándose sin que el usuario
        // los vea.
        if (esSerie) {
            ['filtroDuracion', 'filtroDuracionMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
        } else {
            ['filtroTemporadas', 'filtroTemporadasMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
        }
    };

// ==============================================
// AUTOCOMPLETADO DE PERSONALIDAD (director/actor/creador)
// Compartido entre Película y Serie — el endpoint que consulta depende
// de window._filtroTipoActivo en el momento exacto de la búsqueda.
// ==============================================
window._directorSeleccionadoId = '';

function inicializarAutocompletadoDirector() {
    configurarAutocompletado(
        document.getElementById('busquedaDirector'),
        document.getElementById('directorResultados')
    );
    configurarAutocompletado(
        document.getElementById('busquedaDirectorMobile'),
        document.getElementById('directorResultadosMobile')
    );
}

function configurarAutocompletado(input, resultados) {
    if (!input || !resultados) return;

    let timeoutDirector = null;

    input.addEventListener('input', function() {
        clearTimeout(timeoutDirector);
        const query = this.value.trim();

        if (query.length < 2) {
            resultados.style.display = 'none';
            window._directorSeleccionadoId = '';
            return;
        }

        timeoutDirector = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const base = window._filtroTipoActivo === 'serie' ? 'series' : 'movies';
                const response = await fetch(
                    `${CONFIG.API_URL}/${base}/people/search?query=${encodeURIComponent(query)}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (!response.ok) return;
                const data = await response.json();
                const personas = data.results?.slice(0, 5) || [];

                if (personas.length === 0) {
                    resultados.style.display = 'none';
                    return;
                }

                resultados.innerHTML = personas.map(p => `
                    <div class="autocomplete-item" data-id="${p.id}" data-name="${p.name}">
                        <i class="fas fa-user"></i> ${p.name}
                        ${p.known_for_department ? `<small>(${p.known_for_department})</small>` : ''}
                    </div>
                `).join('');

                resultados.style.display = 'block';

                resultados.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', function() {
                        input.value = this.dataset.name;
                        window._directorSeleccionadoId = this.dataset.id;
                        resultados.style.display = 'none';
                    });
                });

            } catch (e) {
            }
        }, 400);
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !resultados.contains(e.target)) {
            resultados.style.display = 'none';
        }
    });
}

function poblarFiltroAnio() {
    const select = document.getElementById('filtroAnio');
    if (!select) return;

    const anioActual = new Date().getFullYear();
    const anioMinimo = 1874;

    let options = '<option value="todos">Todos los años</option>';
    for (let anio = anioActual; anio >= anioMinimo; anio--) {
        options += `<option value="${anio}">${anio}</option>`;
    }
    select.innerHTML = options;
}

// ==============================================
// INICIALIZACIÓN
// ==============================================
window['init_feed-films'] = async function() {
    limpiarModalesDuplicados();

    // El módulo siempre arranca renderizando Películas por defecto (grid,
        // filtros, etc. se cargan igual más abajo) — pero si el usuario tenía
        // otra tab elegida antes del refresh, la restauramos al final de este
        // init (ver el bloque de restauración cerca del cierre de esta función).
        window._tabActivo = 'peliculas';

    await cargarComponente('modules/feed-filtros.html', 'filtros-container');
    await cargarComponente('modules/feed-paginacion.html', 'paginacion-container');

    setTimeout(() => {
            const content = document.getElementById('filtrosContent');
            if (content) content.style.display = 'none';
            poblarFiltroAnio();
            inicializarAutocompletadoDirector();

            // Enter en cualquier input de filtros desktop dispara aplicar
            const filtrosDesktop = document.querySelector('.filtros-desktop');
            if (filtrosDesktop) {
                filtrosDesktop.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        window.aplicarFiltros();
                    }
                });
            }
        }, 200);

        // Se lee ANTES de decidir qué se muestra — así se evita el flash de
        // Películas que aparecía brevemente antes de pasar a Series/Comunidad,
        // y las dos cargas (Películas/Series) arrancan en paralelo desde el
        // arranque en vez de una atrás de la otra.
        const tabGuardada = localStorage.getItem('feedTabActivo');

        if (tabGuardada && tabGuardada !== 'peliculas') {
            const idsPorTab = { series: 'tabSeries', comunidad: 'tabComunidad' };
            const btnGuardado = document.getElementById(idsPorTab[tabGuardada]);
            if (btnGuardado) {
                // Fija window._tabActivo antes de que cargarFilasGenero corra,
                // así el guard de arriba ya sabe que no debe mostrarse.
                window.seleccionarTabFeed(tabGuardada, btnGuardado);
            }
        }

        window.cargarFilasGenero();
                    inicializarContadorCaracteres();
                window.addEventListener('resize', window.actualizarBotonesPaginacion);

                // Precarga silenciosa de Series en segundo plano cuando Películas
                // es la tab activa — para que ya esté lista si el usuario cambia
                // de tab más tarde. Si la tab guardada YA era Series, no hace
                // falta: seleccionarTabFeed ya la disparó arriba.
                if ((!tabGuardada || tabGuardada === 'peliculas') && typeof window.cargarFilasSeries === 'function') {
                    window.cargarFilasSeries();
                }
            };

// ==============================================
// MODAL OCULTAR RESPUESTA PROPIA
// ==============================================
window.abrirModalOcultarReply = function(replyId) {
    window._replyOcultandoId = replyId;
    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) btn.onclick = window.confirmarOcultarReply;
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) {
        const titulo = modal.querySelector('h3');
        const texto  = modal.querySelector('p');
        if (titulo) titulo.textContent = 'Ocultar respuesta';
        if (texto)  texto.innerHTML = 'Tu respuesta dejará de ser visible para otros usuarios. Esta acción es <strong>irreversible</strong>. Si la respuesta tiene puntos ganados o reacciones, todo se perderá al ocultarla.';
        modal.style.display = 'flex';
    }
};

window.cerrarModalOcultarReply = function() {
    window._replyOcultandoId = null;
    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) btn.onclick = window.confirmarOcultar;
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) {
        const titulo = modal.querySelector('h3');
        const texto  = modal.querySelector('p');
        if (titulo) titulo.textContent = 'Ocultar comentario';
        if (texto)  texto.innerHTML = 'Tu comentario dejará de ser visible para otros usuarios. Esta acción es <strong>irreversible</strong>. Si el comentario tiene puntos ganados, reacciones o respuestas tuyas, todo se perderá al ocultarlo.';
        modal.style.display = 'none';
    }
};

window.confirmarOcultarReply = async function() {
    const replyId = window._replyOcultandoId;
    if (!replyId) return;

    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) { btn.disabled = true; btn.textContent = 'Ocultando...'; }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/comments/replies/${replyId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            window.cerrarModalOcultarReply();
            window.mostrarToast(data.error || 'Error al ocultar la respuesta.', 'error');
            return;
        }

        window.cerrarModalOcultarReply();
        window.mostrarToast('Tu respuesta fue ocultada correctamente.', 'success');

        // Recargar el hilo del comentario padre que está abierto
        const containers = document.querySelectorAll('[class*="replies-container-"]');
        for (const c of containers) {
            if (c.style.display !== 'none') {
                const match = c.className.match(/replies-container-(\d+)/);
                if (match) await window.cargarRespuestas(match[1], 0);
                break;
            }
        }

    } catch (error) {
        window.cerrarModalOcultarReply();
        window.mostrarToast('Error al ocultar la respuesta. Intentá de nuevo.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sí, ocultar'; btn.onclick = window.confirmarOcultar; }
    }
};

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.cerrarModal();
        window.cerrarModalReporte();
        window.cerrarModalOcultar();
    }
});

// ========== FILTROS MODAL MÓVIL ==========
function abrirFiltrosModal() {
    const anioMobile  = document.getElementById('filtroAnioMobile');
    const anioDesktop = document.getElementById('filtroAnio');
    if (anioMobile && anioDesktop && anioMobile.options.length === 0) {
        anioMobile.innerHTML = anioDesktop.innerHTML;
    }

    // El switch del panel se sincroniza con la tab en la que estás parado
    // al momento de abrirlo — si estás en Series, arranca en Series.
    const tipoSegunTab = window._tabActivo === 'series' ? 'serie' : 'pelicula';
    if (window._filtroTipoActivo !== tipoSegunTab && typeof window.toggleFiltroTipo === 'function') {
        window.toggleFiltroTipo(tipoSegunTab);
    }

    const overlay = document.getElementById('filtrosModalOverlay');
    const sheet = document.getElementById('filtrosModalSheet');
    if (overlay) {
        overlay.classList.add('active', 'force-show');
    }
    if (sheet) {
        sheet.classList.add('active', 'force-show');
    }
    document.body.style.overflow = 'hidden';
}

function cerrarFiltrosModal() {
    const overlay = document.getElementById('filtrosModalOverlay');
    const sheet = document.getElementById('filtrosModalSheet');
    if (overlay) {
        overlay.classList.remove('active', 'force-show');
        overlay.style.display = 'none';
    }
    if (sheet) {
        sheet.classList.remove('active', 'force-show');
        sheet.style.display = 'none';
    }
    document.body.style.overflow = '';
}

function aplicarFiltrosMobile() {
    // Todo el bloque de sincronización va en un try/catch — si CUALQUIER
    // getElementById de acá adentro devuelve null y tira error, antes
    // cortaba la función entera y nunca se llegaba a cerrarFiltrosModal(),
    // dejando document.body.style.overflow='hidden' pegado para siempre
    // (pantalla congelada, pase lo que pase con la búsqueda después).
    try {
        const busquedaInput = document.getElementById('busquedaInput');
        const busquedaInputMobile = document.getElementById('busquedaInputMobile');
        if (busquedaInput && busquedaInputMobile) busquedaInput.value = busquedaInputMobile.value;

        const filtroAnio = document.getElementById('filtroAnio');
        const filtroAnioMobile = document.getElementById('filtroAnioMobile');
        if (filtroAnio && filtroAnioMobile) filtroAnio.value = filtroAnioMobile.value;

        const filtroDuracion = document.getElementById('filtroDuracion');
        const filtroDuracionMobile = document.getElementById('filtroDuracionMobile');
        if (filtroDuracion && filtroDuracionMobile) filtroDuracion.value = filtroDuracionMobile.value;

        const temporadasMobile = document.getElementById('filtroTemporadasMobile');
        const temporadasDesktop = document.getElementById('filtroTemporadas');
        if (temporadasMobile && temporadasDesktop) temporadasDesktop.value = temporadasMobile.value;

        // Sincronizar director mobile → desktop
        const directorMobile = document.getElementById('busquedaDirectorMobile');
        const directorDesktop = document.getElementById('busquedaDirector');
        if (directorMobile && directorDesktop) {
            directorDesktop.value = directorMobile.value;
        }
    } catch (e) {
        console.error('Error sincronizando filtros mobile→desktop:', e);
    }

    // Fuera del try — se ejecuta SIEMPRE, haya pasado lo que haya pasado
    // arriba. Es la garantía real de que la pantalla nunca queda trabada.
    cerrarFiltrosModal();
    window.aplicarFiltros();
}

function limpiarFiltrosMobile() {
    document.getElementById('busquedaInputMobile').value      = '';
    document.getElementById('filtroAnioMobile').value         = 'todos';
    document.getElementById('filtroDuracionMobile').value     = 'todos';
    const temporadasMobile = document.getElementById('filtroTemporadasMobile');
    if (temporadasMobile) temporadasMobile.selectedIndex = 0;
    const dirMobile = document.getElementById('busquedaDirectorMobile');
    if (dirMobile) dirMobile.value = '';
    window._directorSeleccionadoId = '';
}

window.abrirFiltrosModal   = abrirFiltrosModal;
window.cerrarFiltrosModal  = cerrarFiltrosModal;
window.aplicarFiltrosMobile = aplicarFiltrosMobile;
window.limpiarFiltrosMobile = limpiarFiltrosMobile;

// ========== CARRUSEL MODAL MÓVIL ==========
function irASlide(index) {
    const carrusel = document.getElementById('modalCarrusel');
    if (!carrusel) return;
    carrusel.scrollTo({ left: index * carrusel.offsetWidth, behavior: 'smooth' });
    actualizarDots(index);
}

function actualizarDots(index) {
    document.querySelectorAll('.carrusel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function inicializarCarrusel() {
    const carrusel = document.getElementById('modalCarrusel');
    if (!carrusel) return;

    carrusel.addEventListener('scroll', function() {
        const index = Math.round(carrusel.scrollLeft / carrusel.offsetWidth);
        actualizarDots(index);
    });
}

window.irASlide          = irASlide;
window.inicializarCarrusel = inicializarCarrusel;

window._tabActivo = 'peliculas';

window.seleccionarTabFeed = function(tab, el) {
    // Cualquier búsqueda del buscador asistido (o del filtro viejo) se
    // limpia siempre al cambiar de tab, sin excepción — nunca debe
    // persistir de un tab a otro.
    if (typeof window.ocultarVistaResultados === 'function') window.ocultarVistaResultados();
    if (typeof window.ocultarVistaResultadosSerie === 'function') window.ocultarVistaResultadosSerie();
    const mismoTab = window._tabActivo === tab;
    window._tabActivo = tab;
    localStorage.setItem('feedTabActivo', tab);

    // Cualquier búsqueda activa (Película o Serie) se descarta apenas te
    // movés a otra tab — sin importar a cuál vayas, incluida la misma
    // categoría de contenido. Chequeamos los dos headers, no solo el de
    // Película como antes.
    if (!mismoTab) {
        const resultadosHeaderActivo = document.getElementById('resultadosHeader')?.style.display === 'flex';
        const resultadosHeaderSerieActivo = document.getElementById('resultadosHeaderSerie')?.style.display === 'flex';
        if (resultadosHeaderActivo || resultadosHeaderSerieActivo) {
            window.limpiarFiltros();
        }
    }

        // Reinicializar igual aunque ya estuvieras en este tab — no solo
        // para Comunidad. window._tabActivo puede sobrevivir a una
        // navegación entre menús (variable JS) mientras el DOM se
        // reconstruye vacío; sin este exit temprano quitado, volver al
        // feed con Series como tab "recordado" podía saltearse por
        // completo la llamada a cargarSerieDestacada() (y sus pares) y
        // dejar el carrusel colgado hasta un refresh completo. Cada
        // rama de abajo ya es idempotente por su cuenta (cachean en
        // sessionStorage / window._destacadaMovieId), así que reintentar
        // no duplica trabajo real, solo revalida el estado visual.

    // Actualizar estado visual de los tabs
    document.querySelectorAll('.feed-tab').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    const gridPeliculas = document.getElementById('peliculasGrid');
        const paginacion = document.getElementById('paginacion-container');
        const pills = document.getElementById('ordenarPills');
        const filtros = document.getElementById('filtros-container');
        const btnFiltrosAvanzados = document.querySelector('.feed-tab-filtro');
        let comunidadContainer = document.getElementById('comunidad-container');

                const destacada = document.getElementById('destacadaContainer');
                                        const votoRelampago = document.getElementById('votoRelampagoContainer');
                                        const votoRelampagoSerie = document.getElementById('votoRelampagoSeriesContainer');
                                        const triviaBadge = document.getElementById('triviaBadgeContainer');
                                        const triviaSeriesBadge = document.getElementById('triviaSeriesBadgeContainer');
                                        const filasGenero = document.getElementById('filasGeneroContainer');
                                        const filasSeries = document.getElementById('filasSeriesContainer');
                                        const pillsSerie = document.getElementById('ordenarPillsSerie');

                                    if (tab === 'peliculas') {
                                        if (gridPeliculas) gridPeliculas.style.display = '';
                                        // Resabio del paginado viejo (pre-carruseles) — ya no hace nada
                                        // útil, el grid al que apunta queda siempre vacío y oculto por
                                        // cargarFilasGenero(). Se deja explícitamente oculto acá para
                                        // que no persista si venías de otro tab donde se mostró.
                                        if (paginacion) paginacion.style.display = 'none';
                                    if (pills) pills.style.display = '';
                                    if (filtros) filtros.style.display = '';
                                    if (btnFiltrosAvanzados) btnFiltrosAvanzados.style.visibility = 'visible';
                                    if (comunidadContainer) comunidadContainer.style.display = 'none';
                                    if (filasSeries) filasSeries.style.display = 'none';
                                    if (pillsSerie) pillsSerie.style.display = 'none';
                                    if (triviaSeriesBadge) triviaSeriesBadge.style.display = 'none';
                                    if (votoRelampagoSerie) votoRelampagoSerie.style.display = 'none';
                                    const destacadaSerieOculta = document.getElementById('destacadaContainerSerie');
                                    if (destacadaSerieOculta) destacadaSerieOculta.style.display = 'none';
                                    // Si ya se cargó antes, mostrarla directo. Si todavía no (por
                                    // ejemplo, el primer intento se frenó porque en ese momento la
                                    // tab activa era otra), reintentar ahora en vez de quedar roto
                                    // hasta el próximo refresh completo.
                                    if (window._destacadaMovieId) {
                                        if (destacada) destacada.style.display = 'block';
                                    } else if (typeof window.cargarPeliculaDestacada === 'function') {
                                        window.cargarPeliculaDestacada();
                                    }
                                    // Mismo criterio para Voto Relámpago: solo si hay película cargada.
                                    if (votoRelampago && window._votoRelampago && window._votoRelampago.movieId) votoRelampago.style.display = 'block';
                                                        if (triviaBadge && window._triviaEstadoCargado) triviaBadge.style.display = 'block';
                                                        // Mismo criterio: solo si ya se llegaron a armar las filas.
                                                        if (filasGenero && window._filasGeneroCargadas) filasGenero.style.display = 'block';

                                                    } else if (tab === 'comunidad') {
                                                        // Si había una búsqueda con filtros activa, se descarta al salir de Películas
                                                        if (document.getElementById('resultadosHeader')?.style.display === 'flex') {
                                                            window.limpiarFiltros();
                                                        }
                                                        if (gridPeliculas) gridPeliculas.style.display = 'none';
                                    if (paginacion) paginacion.style.display = 'none';
                                    if (pills) pills.style.display = 'none';
                                    if (filtros) filtros.style.display = 'none';
                                    if (btnFiltrosAvanzados) btnFiltrosAvanzados.style.visibility = 'hidden';
                                    if (destacada) destacada.style.display = 'none';
                                    const destacadaSerieOcultaComunidad = document.getElementById('destacadaContainerSerie');
                                    if (destacadaSerieOcultaComunidad) destacadaSerieOcultaComunidad.style.display = 'none';
                                    if (votoRelampago) votoRelampago.style.display = 'none';
                                    if (votoRelampagoSerie) votoRelampagoSerie.style.display = 'none';
                                    if (triviaBadge) triviaBadge.style.display = 'none';
                                    if (triviaSeriesBadge) triviaSeriesBadge.style.display = 'none';
                                    if (filasGenero) filasGenero.style.display = 'none';
                                    if (filasSeries) filasSeries.style.display = 'none';
                                    if (pillsSerie) pillsSerie.style.display = 'none';

                                            // Crear contenedor si no existe
        if (!comunidadContainer) {
            comunidadContainer = document.createElement('div');
            comunidadContainer.id = 'comunidad-container';
            gridPeliculas.parentNode.insertBefore(comunidadContainer, gridPeliculas.nextSibling);
        }
        comunidadContainer.style.display = '';

        // Cargar JS y CSS de comunidad si no están cargados aún
        window.cargarModuloComunidad();

    } else if (tab === 'series') {
            if (document.getElementById('resultadosHeader')?.style.display === 'flex') {
                window.limpiarFiltros();
            }
            if (gridPeliculas) gridPeliculas.style.display = 'none';
                    if (paginacion) paginacion.style.display = 'none';
                    if (pills) pills.style.display = 'none';
                    // El panel de filtros ahora es compartido (switch Película/Serie
                    // adentro), no exclusivo de Película — ya no se oculta acá.
                    if (btnFiltrosAvanzados) btnFiltrosAvanzados.style.visibility = 'visible';
                if (destacada) destacada.style.display = 'none';
                        const destacadaSerie = document.getElementById('destacadaContainerSerie');
                        if (destacadaSerie) destacadaSerie.style.display = 'block';
                        if (typeof window.cargarSerieDestacada === 'function') {
                            window.cargarSerieDestacada();
                        }
                        if (votoRelampago) votoRelampago.style.display = 'none';
                        if (triviaBadge) triviaBadge.style.display = 'none';
                        // Mismo criterio que Voto Relámpago de Películas: solo si ya
                        // hay una serie cargada. Se dispara directo acá también, no
                        // solo desde cargarFilasSeries, mismo motivo que Trivia.
                        if (votoRelampagoSerie && window._votoRelampagoSerie && window._votoRelampagoSerie.seriesId) votoRelampagoSerie.style.display = 'block';
                        if (typeof window.cargarVotoRelampagoSerie === 'function') window.cargarVotoRelampagoSerie();
                        // Se dispara acá directamente (no solo confiando en la cadena
                        // interna de cargarFilasSeries) — así cada entrada al tab
                        // Series siempre reintenta cargar el badge, sin depender de
                        // en qué estado de caché haya quedado feed-series.js.
                if (triviaSeriesBadge && window._triviaSeriesEstadoCargado) triviaSeriesBadge.style.display = 'block';
                if (typeof window.cargarTriviaSeriesBadge === 'function') window.cargarTriviaSeriesBadge();
                if (filasGenero) filasGenero.style.display = 'none';
                if (comunidadContainer) comunidadContainer.style.display = 'none';

                                if (filasSeries) filasSeries.style.display = 'block';
                                // Se muestran siempre al entrar a Series, sin depender de si los
                                // datos ya estaban cacheados en ese instante exacto — antes, si
                                // no estaban cacheados todavía, esta línea no hacía nada y
                                // quedaba en manos de renderPillsFilasSerie() (adentro de la
                                // carga async) volver a mostrarlos por su cuenta más tarde; si
                                // esa segunda verificación fallaba por cualquier timing, los
                                // pills quedaban ocultos hasta recargar la página.
                                if (pillsSerie) pillsSerie.style.display = '';
                                if (typeof window.cargarFilasSeries === 'function') {
                                    window.cargarFilasSeries();
                                }
            }
        };

window.cargarModuloComunidad = function() {
    // CSS
    if (!document.getElementById('css-comunidad')) {
        const link = document.createElement('link');
        link.id = 'css-comunidad';
        link.rel = 'stylesheet';
        link.href = `css/comunidad.css?v=${Date.now()}`;
        document.head.appendChild(link);
    }

    // JS
    if (!document.getElementById('js-comunidad')) {
        const script = document.createElement('script');
        script.id = 'js-comunidad';
        script.src = `js/comunidad.js?v=${Date.now()}`;
        script.onload = () => {
            if (typeof window.initComunidad === 'function') {
                window.initComunidad();
            }
        };
        document.head.appendChild(script);
    } else {
        // Ya cargado, solo reinicializar
        if (typeof window.initComunidad === 'function') {
            window.initComunidad();
        }
    }
};

window.abrirFiltrosMobile = function() {
    window.abrirBuscadorAsistido();
};

window._buscadorNombreUsuario = null;

window._buscadorSetBurbuja = function(texto) {
    const bubble = document.getElementById('buscadorBubbleTexto');
    if (bubble) bubble.textContent = texto;
};

// Primer nombre nomás (no el apellido completo) — más natural en una
// frase corta tipo "¡Hola, Ana!" que el nombre completo.
function _buscadorPrimerNombre() {
    if (!window._buscadorNombreUsuario) return '';
    return window._buscadorNombreUsuario.split(' ')[0];
}

// Titileo al tocar cualquier opción del buscador, solo en mobile —
// listener único y delegado, no hace falta tocar cada onclick del
// HTML uno por uno. Intercepta el click, hace titilar, y recién
// después ejecuta el onclick real que cada botón ya tenía puesto.
document.addEventListener('click', function(event) {
    if (window.innerWidth > 768) return;

    const el = event.target.closest('.buscador-opcion, .buscador-criterio, .buscador-pastilla-grande, .buscador-genero-chip, .buscador-plataforma-btn');
    if (!el) return;
    if (!el.closest('#buscadorModalSheet')) return;
    if (el.classList.contains('buscador-titilando')) return;
    if (typeof el.onclick !== 'function') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    el.classList.add('buscador-titilando');
    setTimeout(() => {
        el.classList.remove('buscador-titilando');
        el.onclick.call(el, event);
    }, 500);
}, true);

window.abrirBuscadorAsistido = async function() {
    const overlay = document.getElementById('buscadorModalOverlay');
    const sheet = document.getElementById('buscadorModalSheet');
    if (overlay) overlay.classList.add('active');
    if (sheet) sheet.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Frase neutra mientras carga el nombre (por si tarda), no bloquea
    // la apertura del modal.
    window._buscadorSetBurbuja('¿Qué querés buscar hoy?');

    if (window._buscadorNombreUsuario === null) {
        try {
            const profile = await API.getProfile();
            window._buscadorNombreUsuario = profile.name || '';
        } catch (e) {
            window._buscadorNombreUsuario = '';
        }
    }

    const nombre = _buscadorPrimerNombre();
    window._buscadorSetBurbuja(nombre ? `¡Hola, ${nombre}! ¿Qué buscamos hoy?` : '¿Qué buscamos hoy?');
};

window.cerrarBuscadorAsistido = function() {
    const overlay = document.getElementById('buscadorModalOverlay');
    const sheet = document.getElementById('buscadorModalSheet');
    if (overlay) overlay.classList.remove('active');
    if (sheet) sheet.classList.remove('active');
    document.body.style.overflow = '';
    window._buscadorResetear();
};

// Vuelve todo a cero: Nivel 1 visible, cualquier paso interno oculto,
// campo de título y resultados vacíos. Se llama siempre que se
// cierra el buscador (elegiste algo, tocaste la X, o el overlay) —
// así la próxima vez que se abra arranca desde el principio, nunca
// donde quedó la vez anterior.
const BUSCADOR_PROXIMAMENTE = {
    persona_premios: {
        titulo: 'Próximamente Premios y nominaciones',
        texto: '',
        volverA: 'buscadorNivel2Persona',
    },
    donde_ver_cartelera: {
        titulo: 'Próximamente Cartelera y funciones',
        texto: '',
        volverA: 'buscadorNivel2DondeVer',
    },
};

window._buscadorAbrirProximamente = function(criterio) {
    const info = BUSCADOR_PROXIMAMENTE[criterio];
    if (!info) return;

    // Oculta cualquier pantalla de Nivel 2 que esté abierta (puede venir
    // de más de una rama distinta) antes de mostrar esta.
    document.querySelectorAll('.buscador-nivel2').forEach(el => { el.style.display = 'none'; });
    document.getElementById('buscadorNivel3Proximamente').style.display = 'block';

    document.getElementById('buscadorProximamenteTitulo').textContent = info.titulo;
    const textoEl = document.getElementById('buscadorProximamenteTexto');
    textoEl.textContent = info.texto;
    textoEl.style.display = info.texto ? 'block' : 'none';

    const volverBtn = document.getElementById('buscadorProximamenteVolverBtn');
    volverBtn.onclick = () => {
        document.getElementById('buscadorNivel3Proximamente').style.display = 'none';
        document.getElementById(info.volverA).style.display = 'block';
    };
};

window._buscadorResetear = function() {
    window._buscadorVolverNivel1(); // ya resetea la burbuja a la frase de bienvenida
    document.getElementById('buscadorModalSheet').classList.remove('buscador-sheet-ancho');

    const input = document.getElementById('buscadorInputTitulo');
    if (input) input.value = '';
    const resultados = document.getElementById('buscadorResultadosTitulo');
    if (resultados) {
        resultados.innerHTML = '';
        resultados.style.display = 'none';
    }

    const inputPersona = document.getElementById('buscadorInputPersona');
    if (inputPersona) inputPersona.value = '';
    const resultadosPersona = document.getElementById('buscadorResultadosPersona');
    if (resultadosPersona) {
        resultadosPersona.innerHTML = '';
        resultadosPersona.style.display = 'none';
    }
};

window._buscadorTipoContenido = 'pelicula'; // default al abrir cada Nivel 2

const BUSCADOR_NIVEL2_IDS = {
    pelicula_serie: 'buscadorTipoEleccion', // acá entra primero por el paso de elegir tipo
    persona:        'buscadorNivel2Persona',
    donde_ver:      'buscadorNivel2DondeVer',
    mi_actividad:   'buscadorNivel2MiActividad',
    plataforma:     'buscadorNivel2Plataforma',
};

// Todas las pantallas que puede haber "adentro" de una rama — se usa
// para ocultar todo de un saque al volver al menú principal, sin
// importar en qué paso interno estabas parado.
const BUSCADOR_TODAS_LAS_PANTALLAS = [
    ...Object.values(BUSCADOR_NIVEL2_IDS),
    'buscadorNivel2PeliculaSerie', // paso 2 de esta rama, no está en el mapa de arriba
    'buscadorNivel3Titulo',        // Nivel 3 de "Por título"
    'buscadorNivel3Genero',        // Nivel 3 de "Por género"
    'buscadorNivel3EpocaTipo',       // Nivel 3 de "Por año o década" — bifurcación
    'buscadorNivel3AnioEspecifico',  // Nivel 3 de "Por año o década" — año específico
    'buscadorNivel3Decada',          // Nivel 3 de "Por año o década" — década
    'buscadorNivel3Caracteristica', // Nivel 3 de "Por característica"
    'buscadorNivel3Persona',       // Nivel 3 de "Actor/actriz/director" — buscar por nombre
    'buscadorNivel3Cruce1',        // Nivel 3 de "Trabajaron juntos" — paso 1
    'buscadorNivel3Cruce2',        // Nivel 3 de "Trabajaron juntos" — paso 2
    'buscadorDondeVerTipo',        // Dónde ver — paso de elegir tipo
    'buscadorDondeVerTitulo',      // Dónde ver — opción A
    'buscadorDondeVerPlataforma',  // Dónde ver — opción B
    'buscadorNivel3Aprovechar',    // Mi actividad — ¿Qué puedo aprovechar este mes?
    'buscadorNivel3ProximoPremio', // Mi actividad — ¿Cuánto me falta para el próximo premio?
    'buscadorNivel3ReforzarPremium', // Mi actividad — ¿Cuánto estoy ganando por ser Premium? (solo Premium)
    'buscadorNivel3ValePremium',     // Mi actividad — ¿Vale la pena pasarme a Premium? (solo FREE)
    'buscadorNivel3Insignias',       // Mi actividad — ¿Qué son las insignias? ¿Cuál es la mía?
    'buscadorNivel3Plataforma',      // Sobre la plataforma — pantalla compartida de texto fijo
    'buscadorNivel3Proximamente',    // Pantalla compartida para criterios todavía no desarrollados
];
const BUSCADOR_FRASES_NIVEL2 = {
    pelicula_serie: (n) => n ? `¿Buscás algo para ver, ${n}? Contame si es película o serie y seguimos.` : '¿Es película o serie? Seguimos por ahí.',
    persona:        (n) => n ? `¿A quién buscamos, ${n}? Un actor, una actriz, un director...` : '¿A quién buscamos? Un actor, una actriz, un director...',
    donde_ver:      (n) => n ? `Decime qué querés ver, ${n}, y te digo dónde encontrarlo.` : 'Decime qué querés ver y te digo dónde encontrarlo.',
    mi_actividad:   (n) => n ? `Vamos a ver cómo venís este mes, ${n} — tus puntos, tus premios, todo.` : 'Vamos a ver cómo venís este mes — tus puntos, tus premios, todo.',
    plataforma:     (n) => n ? `¿Querés saber más de cómo funciona todo esto, ${n}? Te cuento.` : '¿Querés saber más de cómo funciona todo esto? Te cuento.',
};

window._buscadorIrANivel2 = function(rama) {
    const idNivel2 = BUSCADOR_NIVEL2_IDS[rama];
    if (!idNivel2) return;
    document.getElementById('buscadorNivel1').style.display = 'none';
    document.getElementById(idNivel2).style.display = 'block';

    const generarFrase = BUSCADOR_FRASES_NIVEL2[rama];
    if (generarFrase) window._buscadorSetBurbuja(generarFrase(_buscadorPrimerNombre()));

    if (rama === 'mi_actividad') {
        window._buscadorConfigurarBotonPremium();
    }
    if (rama === 'plataforma') {
        document.getElementById('buscadorModalSheet').classList.add('buscador-sheet-alto');
    }
};

// El botón "¿Vale la pena pasarme a Premium?" solo tiene sentido para
// usuarios FREE — si ya sos Premium, se reemplaza por una pregunta que
// refuerza el valor de la suscripción en vez de venderte algo que ya
// tenés. Se consulta fresco cada vez (no se cachea) para reflejar
// cambios de plan sin recargar la página.
window._buscadorConfigurarBotonPremium = async function() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/users/me/points/resumen`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const resumen = await res.json();

        const btn = document.getElementById('buscadorBtnPremiumDinamico');
        const icono = document.getElementById('buscadorBtnPremiumIcono');
        const titulo = document.getElementById('buscadorBtnPremiumTitulo');
        const subtitulo = document.getElementById('buscadorBtnPremiumSubtitulo');
        if (!btn) return;

        if (resumen.premium) {
            icono.className = 'fas fa-crown';
            titulo.textContent = '¿Cuánto estoy ganando por ser Premium?';
            subtitulo.textContent = 'Lo que tu suscripción te dio este mes';
            btn.onclick = () => window._buscadorCriterioSeleccionado('actividad_reforzar_premium');
        } else {
            icono.className = 'fas fa-star';
            titulo.textContent = '¿Vale la pena pasarme a Premium?';
            subtitulo.textContent = 'Según cómo usaste la plataforma este mes';
            btn.onclick = () => window._buscadorCriterioSeleccionado('actividad_vale_premium');
        }
    } catch (e) {}
};

window._buscadorVolverNivel1 = function() {
    BUSCADOR_TODAS_LAS_PANTALLAS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // Sin valor fijo acá — se limpia el inline style para que decida
    // el CSS solo (grid en desktop, flex en mobile, cada uno con su
    // propia regla). Fijar 'grid' a mano rompía el layout de boleto
    // en mobile cada vez que volvías a Nivel 1.
    document.getElementById('buscadorNivel1').style.display = '';
    document.getElementById('buscadorModalSheet').classList.remove('buscador-sheet-alto');

    const nombre = _buscadorPrimerNombre();
    window._buscadorSetBurbuja(nombre ? `¡Hola, ${nombre}! ¿Qué buscamos hoy?` : '¿Qué buscamos hoy?');
};

// Paso 1 → paso 2 de "Película o serie": guarda el tipo elegido y
// avanza directo a la lista de criterios (son los mismos 4 para
// ambos casos, solo cambia el texto del subtítulo).
window._buscadorSetTipoYAvanzar = function(tipo) {
    window._buscadorTipoContenido = tipo;
    document.getElementById('buscadorTipoEleccion').style.display = 'none';
    document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'block';
    document.getElementById('buscadorNivel2PeliculaSerieTitulo').textContent =
        tipo === 'pelicula' ? 'Buscando una película' : 'Buscando una serie';
};

// Volver desde la lista de criterios va un paso atrás (a elegir
// tipo de nuevo), no directo al menú principal.
window._buscadorVolverATipoEleccion = function() {
    document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'none';
    document.getElementById('buscadorTipoEleccion').style.display = 'block';
};

window._buscadorSetTipo = function(tipo, btn) {
    window._buscadorTipoContenido = tipo;
    document.querySelectorAll('#buscadorNivel2PeliculaSerie .filtro-switch-btn').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
};

// Nivel 3 del resto de los criterios (género/época/característica y
// las demás ramas) se arma en los próximos pasos — placeholder.
window._buscadorCriterioSeleccionado = function(criterio) {
    if (criterio === 'titulo') {
        window._buscadorAbrirNivel3Titulo();
        return;
    }
        if (criterio === 'genero') {
            window._buscadorAbrirNivel3Genero();
            return;
        }
            if (criterio === 'epoca') {
                window._buscadorAbrirNivel3EpocaTipo();
                return;
            }
                if (criterio === 'caracteristica') {
                    window._buscadorAbrirNivel3Caracteristica();
                    return;
                }
                    if (criterio === 'persona_nombre') {
                        window._buscadorAbrirNivel3Persona();
                        return;
                    }
                        if (criterio === 'persona_cruce') {
                            window._buscadorAbrirNivel3Cruce1();
                            return;
                        }
                        if (criterio === 'donde_ver_titulo' || criterio === 'donde_ver_plataforma') {
                            window._buscadorAbrirDondeVerTipo(criterio);
                            return;
                        }
                            if (criterio === 'donde_ver_estrenos') {
                                window._buscadorProximosEstrenos();
                                return;
                            }
                                if (criterio === 'actividad_aprovechar') {
                                    window._buscadorAbrirAprovechar();
                                    return;
                                }
                                    if (criterio === 'actividad_proximo_premio') {
                                        window._buscadorAbrirProximoPremio();
                                        return;
                                    }
                                        if (criterio === 'actividad_reforzar_premium') {
                                            window._buscadorAbrirReforzarPremium();
                                            return;
                                        }
                                            if (criterio === 'actividad_vale_premium') {
                                                window._buscadorAbrirValePremium();
                                                return;
                                            }
                                            if (criterio === 'actividad_insignias') {
                                                window._buscadorAbrirInsignias();
                                                return;
                                            }
                                            if (BUSCADOR_TEXTOS_PLATAFORMA[criterio]) {
                                                window._buscadorAbrirTextoPlataforma(criterio);
                                                return;
                                            }
                                            if (BUSCADOR_PROXIMAMENTE[criterio]) {
                                                window._buscadorAbrirProximamente(criterio);
                                                return;
                                            }
                                            alert('Nivel 3 de "' + criterio + '" (' + window._buscadorTipoContenido + ') — próximo paso.');
                                            };

                                            // ==============================================
                                            // NIVEL 3 — Sobre la plataforma Cinemarketer.
                                            // Texto fijo, sin personalización — una sola pantalla compartida,
                                            // el contenido cambia según qué criterio se haya tocado.
                                            // ==============================================
                                            const BUSCADOR_TEXTOS_PLATAFORMA = {
                                                plataforma_que_es: {
                                                    titulo: '¿Qué es Cinemarketer?',
                                                    texto: 'Cinemarketer es la primera y única red social de cine dedicada por completo a construir tu identidad cinéfila — tu tótem, el símbolo que te representa como cinéfilo, armado a partir de lo que votás, comentás y recomendás. No es una lista de películas vistas: es un perfil vivo que refleja quién sos como amante del cine. Y por el simple hecho de ir construyendo ese perfil, también sos parte del Club de Beneficios: cada interacción tuya suma puntos que después canjeás por premios reales.'
                                                },
                                                plataforma_como_funciona: {
                                                    titulo: '¿Cómo funciona?',
                                                    texto: 'A medida que vayas construyendo tu perfil cinéfilo (votando, comentando, recomendando, publicando) y que podés visualizar en Mi Sala, automáticamente vas sumando puntos en el Club de Beneficios. Esos puntos se acumulan durante el mes y el 1° de cada mes se liberan como disponibles, listos para canjear por premios reales. Todo lo que hacés como cinéfilo tiene su recompensa: ya sos parte de él por elegirnos.'
                                                },
                                                plataforma_comunidad: {
                                                    titulo: '¿Cómo se cuida la comunidad?',
                                                    texto: 'Cinemarketer es un espacio de respeto entre gente que ama el cine — la diversidad de opiniones suma, la agresión y la discriminación no tienen lugar. Hay moderación automática que actúa en tiempo real, y un equipo humano atento a lo que se reporta. Si algo te molesta, podés bloquear o reportar a un usuario, o un comentario puntual, en dos clics.'
                                                },
                                                plataforma_eliminar_cuenta: {
                                                    titulo: '¿Qué pasa si elimino mi cuenta?',
                                                    texto: 'Podés hacerlo cuando quieras desde Configuración, pero es importante que lo sepas antes: perdés todos tus puntos (acumulados y disponibles), los códigos de canje sin usar quedan sin efecto, tus publicaciones en Comunidad se eliminan, y si tenés Premium y/o Creador activos, se cancelan al instante sin reembolso. Es una acción irreversible — no hay vuelta atrás.'
                                                },
                                                    plataforma_premium_vs_creador: {
                                                        titulo: 'Premium vs Creador, ¿en qué se diferencian?',
                                                        texto: 'Son dos suscripciones totalmente independientes, y podés tener las dos, una sola, o ninguna. Premium es sobre puntos: te los duplica, sin tope mensual, nunca vencen, sin límite diario, y te da acceso a premios y sorteos exclusivos. Creador es sobre herramientas de publicación: hasta 10 imágenes o video en tus publicaciones de Comunidad, más bloques interactivos (votaciones, trivias, countdowns). Uno no reemplaza al otro — se complementan.'
                                                    },
                                                };

                                                window._buscadorAbrirTextoPlataforma = function(criterio) {
                                                    document.getElementById('buscadorNivel2Plataforma').style.display = 'none';
                                                    document.getElementById('buscadorNivel3Plataforma').style.display = 'block';
                                                    document.getElementById('buscadorModalSheet').classList.add('buscador-sheet-alto');

                                                    const info = BUSCADOR_TEXTOS_PLATAFORMA[criterio];
                                                    document.getElementById('buscadorPlataformaContenido').innerHTML = `
                                                        <p class="buscador-subtitulo">${info.titulo}</p>
                                                        <div class="buscador-resumen-card"><p style="display:block;">${info.texto}</p></div>
                                                    `;
                                                };

                                                window._buscadorVolverNivel2Plataforma = function() {
                                                    document.getElementById('buscadorNivel3Plataforma').style.display = 'none';
                                                    document.getElementById('buscadorNivel2Plataforma').style.display = 'block';
                                                    // Sin sacar la clase acá — la lista de 6 preguntas (a la que
                                                    // volvés) también la necesita. Solo se saca al volver del
                                                    // todo a Nivel 1 (ver _buscadorVolverNivel1).
                                                };

                                        // ==============================================
                                        // NIVEL 3 — ¿Qué son las insignias? ¿Cuál es la mía?
                                        // Reusa la base real de mi-cuenta.js (mismos criterios/umbrales por
                                        // nivel que ya usa "Ver progreso" en Configuración), pero en vez de
                                        // la lista cruda de checks, la sintetiza: cuántos te faltan en total
                                        // y cuál es el más cerca de cumplirse.
                                        // ==============================================
                                        const BUSCADOR_NIVELES_INFO = {
                                            AMATEUR:         { nombre: 'Amateur',         emoji: '🟢', siguiente: 'COLABORADOR' },
                                            COLABORADOR:     { nombre: 'Colaborador',     emoji: '🔵', siguiente: 'CRITICO' },
                                            CRITICO:         { nombre: 'Crítico',         emoji: '🟣', siguiente: 'JURADO_EXPERTO' },
                                            JURADO_EXPERTO:  { nombre: 'Jurado Experto',  emoji: '🏆', siguiente: null },
                                        };

                                        // Mismos criterios/umbrales exactos que _renderProgresoBody en
                                        // mi-cuenta.js — cada uno devuelve { cumple, texto, actual, meta }.
                                        function _buscadorCriteriosProximoNivel(nivel, p) {
                                            if (nivel === 'AMATEUR') {
                                                return [
                                                    { cumple: p.emailVerified || !!p.googleId, texto: 'Email verificado' },
                                                    { cumple: !!(p.name && p.dni && p.phone && p.avatarUrl && p.provincia && p.localidad), texto: 'Perfil completo al 100%' },
                                                    { cumple: (p.reviewsCount || 0) >= 100, texto: '100 películas únicas votadas', actual: p.reviewsCount || 0, meta: 100 },
                                                    { cumple: (p.commentsUniqueMoviesCount || 0) >= 50, texto: '50 comentarios en películas distintas', actual: p.commentsUniqueMoviesCount || 0, meta: 50 },
                                                    { cumple: !!(p.bioTitulo && p.bioTexto), texto: 'Bio completada en Mi Sala' },
                                                ];
                                            }
                                            if (nivel === 'COLABORADOR') {
                                                return [
                                                    { cumple: (p.reviewsCount || 0) >= 200, texto: '200 películas únicas votadas', actual: p.reviewsCount || 0, meta: 200 },
                                                    { cumple: (p.commentsUniqueMoviesCount || 0) >= 100, texto: '100 comentarios en películas distintas', actual: p.commentsUniqueMoviesCount || 0, meta: 100 },
                                                    { cumple: (p.publicationsCount || 0) >= 50, texto: '50 publicaciones en Comunidad', actual: p.publicationsCount || 0, meta: 50 },
                                                    { cumple: (p.usuariosSeguidosCount || 0) >= 25, texto: '25 usuarios seguidos', actual: p.usuariosSeguidosCount || 0, meta: 25 },
                                                    { cumple: (p.diasActivos || 0) >= 60, texto: '60 días activos en la plataforma', actual: p.diasActivos || 0, meta: 60 },
                                                    { cumple: (p.recommendationsCount || 0) >= 30, texto: '30 recomendaciones enviadas', actual: p.recommendationsCount || 0, meta: 30 },
                                                    { cumple: (p.teBancoRecibidosCount || 0) >= 20, texto: '20 "Te banco" de usuarios distintos', actual: p.teBancoRecibidosCount || 0, meta: 20 },
                                                    { cumple: (p.totalRedeemedPoints || 0) >= 4000, texto: '4.000 puntos canjeados', actual: p.totalRedeemedPoints || 0, meta: 4000 },
                                                ];
                                            }
                                            if (nivel === 'CRITICO') {
                                                return [
                                                    { cumple: !!p.isPremium, texto: 'Suscripción Premium activa' },
                                                    { cumple: (p.reviewsCount || 0) >= 500, texto: '500 películas únicas votadas', actual: p.reviewsCount || 0, meta: 500 },
                                                    { cumple: (p.commentsUniqueMoviesCount || 0) >= 300, texto: '300 comentarios en películas distintas', actual: p.commentsUniqueMoviesCount || 0, meta: 300 },
                                                    { cumple: (p.publicationsCount || 0) >= 200, texto: '200 publicaciones en Comunidad', actual: p.publicationsCount || 0, meta: 200 },
                                                    { cumple: (p.usuariosSeguidosCount || 0) >= 100, texto: '100 usuarios seguidos', actual: p.usuariosSeguidosCount || 0, meta: 100 },
                                                    { cumple: (p.diasActivos || 0) >= 120, texto: '120 días activos en la plataforma', actual: p.diasActivos || 0, meta: 120 },
                                                    { cumple: (p.recommendationsCount || 0) >= 200, texto: '200 recomendaciones enviadas', actual: p.recommendationsCount || 0, meta: 200 },
                                                    { cumple: (p.teBancoRecibidosCount || 0) >= 100, texto: '100 "Te banco" de usuarios distintos', actual: p.teBancoRecibidosCount || 0, meta: 100 },
                                                    { cumple: (p.merecePuntosCount || 0) >= 100, texto: '100 "Merecés un punto" recibidos', actual: p.merecePuntosCount || 0, meta: 100 },
                                                    { cumple: (p.seguidoresGanadosCount || 0) >= 100, texto: '100 seguidores ganados', actual: p.seguidoresGanadosCount || 0, meta: 100 },
                                                    { cumple: (p.totalRedeemedPoints || 0) >= 20000, texto: '20.000 puntos canjeados', actual: p.totalRedeemedPoints || 0, meta: 20000 },
                                                ];
                                            }
                                            return [];
                                        }

                                        window._buscadorAbrirInsignias = async function() {
                                            window._buscadorOcultarNivel3MiActividad();
                                            document.getElementById('buscadorNivel2MiActividad').style.display = 'none';
                                            document.getElementById('buscadorNivel3Insignias').style.display = 'block';

                                            const cont = document.getElementById('buscadorInsigniasContenido');
                                            cont.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

                                                try {
                                                    const profile = await API.getProfile();
                                                    const nivelActual = profile.level || 'AMATEUR';
                                                    const info = BUSCADOR_NIVELES_INFO[nivelActual] || BUSCADOR_NIVELES_INFO.AMATEUR;

                                                    let html = '';

                                                    if (!info.siguiente) {
                                                        html = `
                                                            <div class="buscador-stat-hero">
                                                                <div class="num">${info.emoji}</div>
                                                                <div class="lbl">Sos ${info.nombre} — nivel máximo</div>
                                                            </div>
                                                            <div class="buscador-tarjetas">
                                                                <div class="buscador-tarjeta"><div class="buscador-tarjeta-icono oro"><i class="fas fa-trophy"></i></div><p>Llegaste al nivel más alto — no hay más para subir, ¡disfrutalo!</p></div>
                                                            </div>`;
                                                    } else {
                                                        const criterios = _buscadorCriteriosProximoNivel(nivelActual, profile);
                                                        const faltantes = criterios.filter(c => !c.cumple);
                                                        const siguienteInfo = BUSCADOR_NIVELES_INFO[info.siguiente];

                                                        if (faltantes.length === 0) {
                                                            html = `
                                                                <div class="buscador-stat-hero">
                                                                    <div class="num verde">¡Listo!</div>
                                                                    <div class="lbl">Cumplís todo para ${siguienteInfo.nombre} ${siguienteInfo.emoji}</div>
                                                                </div>
                                                                <div class="buscador-tarjetas">
                                                                    <div class="buscador-tarjeta"><div class="buscador-tarjeta-icono verde"><i class="fas fa-check"></i></div><p>Se actualiza automáticamente en la próxima verificación nocturna.</p></div>
                                                                </div>`;
                                                        } else {
                                                            const listaFaltantes = faltantes
                                                                .map(c => `<li>${c.texto}${c.meta != null ? ` (vos llevás ${c.actual})` : ''}</li>`)
                                                                .join('');

                                                            html = `
                                                                <div class="buscador-stat-hero">
                                                                    <div class="num rojo">${faltantes.length}</div>
                                                                    <div class="lbl">Requisitos te faltan para ${siguienteInfo.nombre} ${siguienteInfo.emoji}</div>
                                                                </div>
                                                                <div class="buscador-tarjetas">
                                                                    <div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-id-badge"></i></div><p>Hoy sos ${info.emoji} <strong>${info.nombre}</strong>.</p></div>
                                                                </div>
                                                                <details style="font-size:0.85rem;color:#666;margin-top:0.8rem;"><summary style="cursor:pointer;font-weight:600;color:#333;">Ver los ${faltantes.length} requisitos faltantes</summary><ul style="margin:0.5rem 0 0 1.2rem;">${listaFaltantes}</ul></details>`;
                                                        }
                                                    }

                                                    cont.innerHTML = html;
                                            } catch (e) {
                                                cont.innerHTML = '<div class="buscador-predictor-vacio">No pudimos calcular esto. Intentá de nuevo.</div>';
                                            }
                                        };

                                    // ==============================================
                                    // NIVEL 3 — ¿Vale la pena pasarme a Premium? (solo FREE)
                                    // Comparación con datos reales del usuario, no un genérico de venta.
                                    // ==============================================
                                    window._buscadorAbrirValePremium = async function() {
                                        window._buscadorOcultarNivel3MiActividad();
                                        document.getElementById('buscadorNivel2MiActividad').style.display = 'none';
                                        document.getElementById('buscadorNivel3ValePremium').style.display = 'block';
                                        document.getElementById('buscadorModalSheet').classList.add('buscador-sheet-alto');

                                        const cont = document.getElementById('buscadorValePremioContenido');
                                        cont.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

                                        try {
                                            const token = localStorage.getItem('token');
                                            const res = await fetch(`${CONFIG.API_URL}/users/me/points/resumen`, {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            });
                                            if (!res.ok) throw new Error();
                                            const resumen = await res.json();

                                            const comoPremiumHubieraSido = resumen.earnedThisMonth * 2;
                                            const diferencia = comoPremiumHubieraSido - resumen.earnedThisMonth;

                                            const tocóTopeComentarios = resumen.dailyCommentsUsed >= resumen.dailyCommentsLimit;
                                            const tocóTopeRecomendaciones = resumen.dailyRecommendationsUsed >= resumen.dailyRecommendationsLimit;

                                            let html = `
                                                <div class="buscador-stat-hero">
                                                    <div class="num rojo">+${diferencia}</div>
                                                    <div class="lbl">Pts que te perdiste este mes por no ser Premium</div>
                                                </div>
                                                <div class="buscador-tarjetas">
                                                    <div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-chart-line"></i></div><p>Generaste <strong>${resumen.earnedThisMonth} pts</strong> — como Premium hubieran sido <strong>${comoPremiumHubieraSido} pts</strong>.</p></div>`;

                                            if (resumen.accumulatedPoints > (resumen.monthlyCap || 5000)) {
                                                html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-exclamation-triangle"></i></div><p>Ya superaste el tope mensual de <strong>${resumen.monthlyCap || 5000} pts</strong> — el excedente recién se libera el próximo ciclo. Premium no tiene tope.</p></div>`;
                                            }

                                            if (tocóTopeComentarios || tocóTopeRecomendaciones) {
                                                html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-comment-slash"></i></div><p>Hoy ya llegaste al límite diario de ${tocóTopeComentarios ? 'comentarios' : ''}${tocóTopeComentarios && tocóTopeRecomendaciones ? ' y ' : ''}${tocóTopeRecomendaciones ? 'recomendaciones' : ''} con puntos — Premium no tiene ese límite.</p></div>`;
                                            }

                                            html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono azul"><i class="fas fa-infinity"></i></div><p>Tus puntos hoy vencen a los 6 meses — con <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window.cerrarBuscadorAsistido(); window.location.hash='mi-cuenta'; setTimeout(() => { if (typeof window.abrirDetallePlan === 'function') window.abrirDetallePlan(); }, 400);">Premium</a>, <strong>nunca vencen</strong>.</p></div>
                                            </div>`;

                                                                                        cont.innerHTML = html;
                                        } catch (e) {
                                            cont.innerHTML = '<div class="buscador-predictor-vacio">No pudimos calcular esto. Intentá de nuevo.</div>';
                                        }
                                    };

                                // ==============================================
                                // NIVEL 3 — ¿Cuánto estoy ganando por ser Premium? (solo Premium)
                                // Refuerzo con números reales del mes: el x2 de puntos, comparado
                                // contra lo que hubiera sido como FREE.
                                // ==============================================
                                window._buscadorAbrirReforzarPremium = async function() {
                                    window._buscadorOcultarNivel3MiActividad();
                                    document.getElementById('buscadorNivel2MiActividad').style.display = 'none';
                                    document.getElementById('buscadorNivel3ReforzarPremium').style.display = 'block';

                                    const cont = document.getElementById('buscadorReforzarPremioContenido');
                                    cont.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

                                    try {
                                        const token = localStorage.getItem('token');
                                        const [resResumen, resPremium] = await Promise.all([
                                            fetch(`${CONFIG.API_URL}/users/me/points/resumen`, { headers: { 'Authorization': `Bearer ${token}` } }),
                                            fetch(`${CONFIG.API_URL}/premium/rewards`, { headers: { 'Authorization': `Bearer ${token}` } })
                                        ]);
                                        if (!resResumen.ok) throw new Error();
                                        const resumen = await resResumen.json();
                                        const premiosPremium = resPremium.ok ? await resPremium.json() : [];

                                        // El x2 ya está adentro de earnedThisMonth (Premium gana el
                                        // doble por cada acción) — la mitad es lo que hubieras generado
                                        // como FREE con las mismas acciones.
                                        const comoFreeHubieraSido = Math.round(resumen.earnedThisMonth / 2);
                                        const diferencia = resumen.earnedThisMonth - comoFreeHubieraSido;

                                                const sorteosActivos = premiosPremium.filter(p => p.type === 'SORTEO' && p.drawExecuted !== true);

                                                let html = `
                                                    <div class="buscador-stat-hero">
                                                        <div class="num">+${diferencia}</div>
                                                        <div class="lbl">Pts de más este mes, por ser Premium</div>
                                                    </div>
                                                    <div class="buscador-tarjetas">
                                                        <div class="buscador-tarjeta"><div class="buscador-tarjeta-icono azul"><i class="fas fa-infinity"></i></div><p>Tus puntos <strong>nunca vencen</strong> y no tenés límite diario de comentarios ni recomendaciones.</p></div>`;

                                                if (sorteosActivos.length === 1) {
                                                    const s = sorteosActivos[0];
                                                    html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono rojo"><i class="fas fa-ticket-alt"></i></div><p>Tenés acceso a <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window._buscadorAbrirPremioDesdeResumen(${s.id}, 'premium');">${s.name || 'un sorteo exclusivo'}</a>, que un usuario FREE no puede acceder.</p></div>`;
                                                } else if (sorteosActivos.length > 1) {
                                                    const links = sorteosActivos
                                                        .map(s => `<a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window._buscadorAbrirPremioDesdeResumen(${s.id}, 'premium');">${s.name || 'un sorteo'}</a>`)
                                                        .join(', ');
                                                    html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono rojo"><i class="fas fa-ticket-alt"></i></div><p>Tenés acceso a ${sorteosActivos.length} sorteos exclusivos que un usuario FREE no puede ver: ${links}.</p></div>`;
                                                }

                                                html += `</div>`;
                                                cont.innerHTML = html;
                                    } catch (e) {
                                        cont.innerHTML = '<div class="buscador-predictor-vacio">No pudimos calcular esto. Intentá de nuevo.</div>';
                                    }
                                };

                            // ==============================================
                            // NIVEL 3 — ¿Cuánto me falta para el próximo premio?
                            // Lista completa (no solo el más barato) de todo lo que todavía no
                            // alcanzás, ordenado del más cerca al más lejos, cada uno linkeado
                            // a su modal real.
                            // ==============================================
                            window._buscadorAbrirProximoPremio = async function() {
                                window._buscadorOcultarNivel3MiActividad();
                                document.getElementById('buscadorNivel2MiActividad').style.display = 'none';
                                document.getElementById('buscadorNivel3ProximoPremio').style.display = 'block';
                                document.getElementById('buscadorModalSheet').classList.add('buscador-sheet-alto');

                                const cont = document.getElementById('buscadorProximoPremioContenido');
                                cont.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

                                try {
                                    const token = localStorage.getItem('token');
                                    const [resResumen, resFree] = await Promise.all([
                                        fetch(`${CONFIG.API_URL}/users/me/points/resumen`, { headers: { 'Authorization': `Bearer ${token}` } }),
                                        fetch(`${CONFIG.API_URL}/rewards/all`, { headers: { 'Authorization': `Bearer ${token}` } })
                                    ]);
                                    if (!resResumen.ok) throw new Error();
                                    const resumen = await resResumen.json();
                                    const premiosFree = (resFree.ok ? await resFree.json() : []).map(p => ({ ...p, _origen: 'free' }));

                                    let premiosPremium = [];
                                    if (resumen.premium) {
                                        const resPremium = await fetch(`${CONFIG.API_URL}/premium/rewards`, { headers: { 'Authorization': `Bearer ${token}` } });
                                        if (resPremium.ok) premiosPremium = (await resPremium.json()).map(p => ({ ...p, _origen: 'premium' }));
                                    }

                                    const todosLosPremios = [...premiosFree, ...premiosPremium];

                                    // Solo vigentes (con stock, sin vencer — y si es sorteo, todavía
                                    // no ejecutado) y que todavía NO alcanzás.
                                    const pendientes = todosLosPremios
                                        .filter(p => {
                                            const vigente = p.hasStock && !p.isExpired && (p.type !== 'SORTEO' || p.drawExecuted !== true);
                                            return vigente && !p.canRedeem;
                                        })
                                        .sort((a, b) => a.pointsRequired - b.pointsRequired);

                                    if (pendientes.length === 0) {
                                        cont.innerHTML = `<div class="buscador-resumen-card">
                                                                                        <p><i class="fas fa-party-horn" style="color:#2e7d32;"></i> ¡Ya te alcanzan los puntos para todos los premios vigentes! Andá a <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window.cerrarBuscadorAsistido(); window.location.hash='club-beneficios';">Club de Beneficios</a> y elegí el tuyo.</p>
                                        </div>`;
                                        return;
                                    }

                                   const nombrePremio = (p) => p.name || 'un premio';

                                   // El más cercano (el primero, ya viene ordenado ascendente) es el
                                   // stat protagonista (cuenta como el 1er ítem) — hasta 2 tarjetas
                                   // más debajo (2do y 3er ítem). Si sobran más, en vez de seguir
                                   // agregando tarjetas (y desbordar el modal en mobile), el lugar
                                   // del 4to ítem lo ocupa una leyenda invitando a Club de Beneficios.
                                   const [masCercano, ...resto] = pendientes;
                                   const faltanCercano = masCercano.pointsRequired - resumen.availablePoints;
                                   const restoVisible = resto.slice(0, 2);
                                   const hayMasPremios = resto.length > 2;

                                                                           let html = `
                                                                               <div class="buscador-stat-hero">
                                                                                   <div class="num rojo">${faltanCercano}</div>
                                                                                   <div class="lbl">Pts para <a href="#" class="buscador-premio-link" style="text-transform:none;font-size:0.85rem;font-weight:600;" onclick="event.preventDefault(); window._buscadorAbrirPremioDesdeResumen(${masCercano.id}, '${masCercano._origen}');">${nombrePremio(masCercano)}</a></div>
                                                                               </div>`;

                                                                           if (restoVisible.length > 0 || hayMasPremios) {
                                                                               html += `<div class="buscador-tarjetas">`;
                                                                               html += restoVisible.map(p => {
                                                                                   const faltan = p.pointsRequired - resumen.availablePoints;
                                                                                   return `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono rojo"><i class="fas fa-hourglass-half"></i></div><p>Te faltan <strong>${faltan} pts</strong> para <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window._buscadorAbrirPremioDesdeResumen(${p.id}, '${p._origen}');">${nombrePremio(p)}</a>.</p></div>`;
                                                                               }).join('');
                                                                               if (hayMasPremios) {
                                                                                   html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono rojo"><i class="fas fa-gift"></i></div><p>Mirá en <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window.cerrarBuscadorAsistido(); window.location.hash='club-beneficios';">Club de Beneficios</a> todo lo que te podés llevar.</p></div>`;
                                                                               }
                                                                               html += `</div>`;
                                                                           }

                                                                                if (!resumen.premium) {
                                                                                    html += `<div class="buscador-cta-premium">
                                                                                        <i class="fas fa-star"></i> Con Premium tus puntos valen el doble y no tenés límite diario.
                                                                                        <button class="buscador-cta-btn" onclick="window.cerrarBuscadorAsistido(); window.location.hash='club-beneficios';">Ver Club de Beneficios</button>
                                                                                    </div>`;
                                                                                }

                                                                                cont.innerHTML = html;
                                } catch (e) {
                                    cont.innerHTML = '<div class="buscador-predictor-vacio">No pudimos calcular esto. Intentá de nuevo.</div>';
                                }
                            };

                            window._buscadorVolverNivel2MiActividad = function() {
                                window._buscadorOcultarNivel3MiActividad();
                                document.getElementById('buscadorNivel2MiActividad').style.display = 'block';
                                document.getElementById('buscadorModalSheet').classList.remove('buscador-sheet-alto');
                            };

                        // Las 4 pantallas de Nivel 3 de "Mi actividad" no se ocultaban entre
                        // sí al abrir una nueva — solo escondían el menú de Nivel 2. Si
                        // navegabas de una a otra, quedaban todas visibles apiladas.
                        window._buscadorOcultarNivel3MiActividad = function() {
                            ['buscadorNivel3Aprovechar', 'buscadorNivel3ProximoPremio', 'buscadorNivel3ValePremium', 'buscadorNivel3ReforzarPremium', 'buscadorNivel3Insignias'].forEach(id => {
                                const el = document.getElementById(id);
                                if (el) el.style.display = 'none';
                            });
                        };

                        // ==============================================
                        // NIVEL 3 — ¿Qué puedo aprovechar este mes?
                        // Cruza el resumen de puntos (endpoint nuevo) con el catálogo de
                        // premios — no es un carrusel de resultados, es una respuesta
                        // textual que combina varios datos que hoy nadie arma junta.
                        // ==============================================
                        // Mismo mecanismo que abrirPremioDesdeCarrusel (novedades.js): el
                        // modal de premio depende de window._clubFreeCache/_clubPremiumCache,
                        // que solo existen una vez que el módulo Club de Beneficios cargó su
                        // catálogo real — acá se navega ahí primero y se espera.
                        window._buscadorAbrirPremioDesdeResumen = function(rewardId, origen) {
                            window.cerrarBuscadorAsistido();
                            window.location.hash = 'club-beneficios';
                            const esPremium = origen === 'premium';

                            let tabPremiumForzada = false;
                            let intentos = 0;
                            const esperar = setInterval(() => {
                                intentos++;

                                if (esPremium && !tabPremiumForzada && typeof window.cambiarTabClubBeneficios === 'function') {
                                    const btnPremium = document.getElementById('clubTabPremium');
                                    if (btnPremium) {
                                        tabPremiumForzada = true;
                                        window.cambiarTabClubBeneficios('premium', btnPremium);
                                    }
                                }

                                const cache = esPremium ? window._clubPremiumCache : window._clubFreeCache;
                                const listo = typeof window._abrirModalPremioClub === 'function' && Array.isArray(cache) && cache.length > 0;

                                if (listo) {
                                    clearInterval(esperar);
                                    const p = cache.find(x => x.id === rewardId);
                                    if (p) window._abrirModalPremioClub(rewardId, origen);
                                } else if (intentos > 25) {
                                    clearInterval(esperar);
                                }
                            }, 200);
                        };

                            window._buscadorAbrirAprovechar = async function() {
                                window._buscadorOcultarNivel3MiActividad();
                                document.getElementById('buscadorNivel2MiActividad').style.display = 'none';
                                document.getElementById('buscadorNivel3Aprovechar').style.display = 'block';

                            const cont = document.getElementById('buscadorAprovecharContenido');
                            cont.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

                            try {
                                const token = localStorage.getItem('token');
                                const [resResumen, resFree] = await Promise.all([
                                    fetch(`${CONFIG.API_URL}/users/me/points/resumen`, { headers: { 'Authorization': `Bearer ${token}` } }),
                                    fetch(`${CONFIG.API_URL}/rewards/all`, { headers: { 'Authorization': `Bearer ${token}` } })
                                ]);
                                if (!resResumen.ok) throw new Error();
                                const resumen = await resResumen.json();
                                const premiosFree = resFree.ok ? await resFree.json() : [];

                                let premiosPremium = [];
                                if (resumen.premium) {
                                    const resPremium = await fetch(`${CONFIG.API_URL}/premium/rewards`, { headers: { 'Authorization': `Bearer ${token}` } });
                                    if (resPremium.ok) premiosPremium = await resPremium.json();
                                }

                                        // Solo premios vigentes (con stock y sin vencer) — canRedeem ya
                                        // viene calculado por el backend (RewardDto), no hace falta
                                        // rearmar esa lógica acá.
                                        const disponibles = premiosFree.filter(p => p.hasStock && !p.isExpired);

                                        // El más caro que YA podés pagar — canRedeem ya contempla
                                        // disponibilidad + si te alcanzan los puntos.
                                        const alAlcance = disponibles
                                            .filter(p => p.canRedeem)
                                            .sort((a, b) => b.pointsRequired - a.pointsRequired)[0];

                                        // El más barato que todavía NO alcanza — "te falta poco para este".
                                        const masCercano = disponibles
                                            .filter(p => !p.canRedeem)
                                            .sort((a, b) => a.pointsRequired - b.pointsRequired)[0];

                                                // Mismo criterio que usa Club de Beneficios (_clubEstaResueltoEspecial):
                                                // un sorteo está resuelto cuando drawExecuted es true, no por stock.
                                                const sorteosActivos = premiosPremium.filter(p => p.type === 'SORTEO' && p.drawExecuted !== true).length;

                                        const nombrePremio = (p) => p.name || 'un premio';

                                        // Fecha del próximo 1° del mes, en formato dd/mm/aaaa.
                                        const hoy = new Date();
                                        const proximoPrimero = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
                                        const fechaLiberacion = proximoPrimero.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                                        let html = `
                                            <div class="buscador-stat-hero">
                                                <div class="num">${resumen.availablePoints}</div>
                                                <div class="lbl">Puntos disponibles hoy</div>
                                            </div>
                                            <div class="buscador-tarjetas">`;
                                        if (resumen.accumulatedPoints > 0) {
                                            // El tope mensual FREE limita cuánto se libera realmente —
                                            // mostrar accumulatedPoints "a secas" acá mentía cuando ya
                                            // superaste el tope (mismo dato que ya calcula bien la
                                            // pantalla de "¿Vale la pena Premium?").
                                            const superoTope = resumen.monthlyCap != null && resumen.accumulatedPoints > resumen.monthlyCap;
                                            const aLiberar = superoTope ? resumen.monthlyCap : resumen.accumulatedPoints;

                                            html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-calendar-check"></i></div><p>El <strong>${fechaLiberacion}</strong> vas a cobrar los <strong>${aLiberar} pts</strong> acumulados${superoTope ? ` (tocaste el tope mensual de ${resumen.monthlyCap})` : ''}.${superoTope ? ` Con <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window.cerrarBuscadorAsistido(); window.location.hash='mi-cuenta'; setTimeout(() => { if (typeof window.abrirDetallePlan === 'function') window.abrirDetallePlan(); }, 400);">Premium</a> hubieras cobrado los ${resumen.accumulatedPoints} pts completos.` : ''}</p></div>`;
                                        }

                                      if (alAlcance) {
                                          html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono verde"><i class="fas fa-check"></i></div><p>Ya podés canjear <a href="#" class="buscador-premio-link" onclick="event.preventDefault(); window._buscadorAbrirPremioDesdeResumen(${alAlcance.id}, 'free');">${nombrePremio(alAlcance)}</a> (${alAlcance.pointsRequired} pts).</p></div>`;
                                      }
                                       if (!alAlcance && !masCercano) {
                                           html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-info-circle"></i></div><p>No hay premios activos con costo en puntos ahora mismo.</p></div>`;
                                       }

                                if (!resumen.premium) {
                                    const comentariosRestantes = resumen.dailyCommentsLimit - resumen.dailyCommentsUsed;
                                    const recomendacionesRestantes = resumen.dailyRecommendationsLimit - resumen.dailyRecommendationsUsed;

                                    let mensajeCupo = null;
                                    if (resumen.dailyCommentsUsed === 0 && resumen.dailyRecommendationsUsed === 0) {
                                        // Sin actividad hoy — no se muestra ninguna tarjeta acá, para no
                                        // sobrecargar la pantalla con un aviso de "no hiciste nada".
                                    } else if (comentariosRestantes <= 0 && recomendacionesRestantes <= 0) {
                                        mensajeCupo = 'Ya usaste todos tus comentarios y recomendaciones con puntos de hoy — mañana se renueva el cupo.';
                                    } else {
                                        const partes = [];
                                        if (comentariosRestantes > 0) partes.push(`${comentariosRestantes} comentario${comentariosRestantes > 1 ? 's' : ''} con puntos`);
                                        if (recomendacionesRestantes > 0) partes.push(`${recomendacionesRestantes} recomendación${recomendacionesRestantes > 1 ? 'es' : ''} con puntos`);
                                        mensajeCupo = `Todavía te quedan ${partes.join(' y ')} para hoy — aprovechalos.`;
                                    }

                                    if (mensajeCupo) {
                                        html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono gris"><i class="fas fa-comment"></i></div><p>${mensajeCupo}</p></div>`;
                                    }
                                    }
                                    if (resumen.premium && sorteosActivos > 0) {
                                        html += `<div class="buscador-tarjeta"><div class="buscador-tarjeta-icono rojo"><i class="fas fa-ticket-alt"></i></div><p>Tenés <strong>${sorteosActivos} sorteo${sorteosActivos > 1 ? 's' : ''} exclusivo${sorteosActivos > 1 ? 's' : ''}</strong> activo${sorteosActivos > 1 ? 's' : ''} para vos.</p></div>`;
                                    }

                                                                       html += `</div>`;

                                                                   cont.innerHTML = html;
                            } catch (e) {
                                cont.innerHTML = '<div class="buscador-predictor-vacio">No pudimos calcular tu resumen. Intentá de nuevo.</div>';
                            }
                        };

                    // ==============================================
                    // NIVEL 3 — Dónde/cuándo verla
                    // ==============================================
                    // La lista fija de 4 plataformas se reemplazó por la dinámica
                    // completa (ver _buscadorMostrarPlataformas) — ya no hace falta
                    // mantener IDs a mano acá.

                    window._buscadorDondeVerCriterio = null; // 'donde_ver_titulo' | 'donde_ver_plataforma'
                    window._buscadorDondeVerPlataformaElegida = null; // { id, nombre }

                    window._buscadorAbrirDondeVerTipo = function(criterio) {
                        window._buscadorDondeVerCriterio = criterio;
                        document.getElementById('buscadorNivel2DondeVer').style.display = 'none';
                        document.getElementById('buscadorDondeVerPlataforma').style.display = 'none';
                        document.getElementById('buscadorDondeVerTitulo').style.display = 'none';
                        document.getElementById('buscadorDondeVerTipo').style.display = 'block';
                    };

                        window._buscadorVolverANivel2DondeVer = function() {
                            ['buscadorDondeVerTipo', 'buscadorDondeVerTitulo', 'buscadorDondeVerPlataforma'].forEach(id => {
                                document.getElementById(id).style.display = 'none';
                            });
                            document.getElementById('buscadorNivel2DondeVer').style.display = 'block';
                            document.getElementById('buscadorModalSheet').classList.remove('buscador-sheet-ancho');
                        };

                    window._buscadorDondeVerSetTipo = function(tipo) {
                        window._buscadorTipoContenido = tipo;
                        document.getElementById('buscadorDondeVerTipo').style.display = 'none';

                        if (window._buscadorDondeVerCriterio === 'donde_ver_titulo') {
                            document.getElementById('buscadorDondeVerTitulo').style.display = 'block';
                            document.getElementById('buscadorDondeVerTituloSubtitulo').textContent =
                                tipo === 'pelicula' ? 'Escribí el título de la película' : 'Escribí el título de la serie';
                            const input = document.getElementById('buscadorInputDondeVer');
                            input.value = '';
                            document.getElementById('buscadorResultadosDondeVer').style.display = 'none';
                            window._buscadorInicializarPredictorDondeVer();
                            input.focus();
                        } else {
                            window._buscadorMostrarPlataformas();
                        }
                    };

                    // Opción A: predictor de título → abre el panel de disponibilidad
                    // directo (abrirDondeVerla / abrirDondeVerlaSerie ya existen y ya
                    // contemplan abrirse sin evento de click — centran el panel solo).
                    window._buscadorInicializarPredictorDondeVer = function() {
                        const input = document.getElementById('buscadorInputDondeVer');
                        const resultados = document.getElementById('buscadorResultadosDondeVer');
                        if (!input || input.dataset.predictorInit) return;
                        input.dataset.predictorInit = '1';

                        let timeoutId = null;

                        input.addEventListener('input', function() {
                            clearTimeout(timeoutId);
                            const query = this.value.trim();

                            if (query.length < 2) {
                                resultados.style.display = 'none';
                                return;
                            }

                            timeoutId = setTimeout(async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const base = window._buscadorTipoContenido === 'serie' ? 'series' : 'movies';
                                    const res = await fetch(`${CONFIG.API_URL}/${base}/search?query=${encodeURIComponent(query)}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (!res.ok) return;
                                    const data = await res.json();
                                    const items = (data.results || []).slice(0, 6);

                                    if (items.length === 0) {
                                        resultados.innerHTML = '<div class="buscador-predictor-vacio">No encontramos nada con ese título</div>';
                                        resultados.style.display = 'block';
                                        return;
                                    }

                                    resultados.innerHTML = items.map(item => {
                                        const titulo = item.title || item.name || 'Sin título';
                                        const fecha = item.release_date || item.first_air_date || '';
                                        const anio = fecha ? fecha.substring(0, 4) : '';
                                        const poster = item.poster_path
                                            ? `<img src="https://image.tmdb.org/t/p/w92${item.poster_path}" alt="${titulo}">`
                                            : `<div class="buscador-predictor-poster-vacio"><i class="fas fa-film"></i></div>`;
                                        return `
                                        <div class="buscador-predictor-item" data-id="${item.id}">
                                            ${poster}
                                            <div>
                                                <strong>${titulo}</strong>
                                                ${anio ? `<span>${anio}</span>` : ''}
                                            </div>
                                        </div>`;
                                    }).join('');

                                    resultados.style.display = 'block';

                                    resultados.querySelectorAll('.buscador-predictor-item').forEach(el => {
                                        el.addEventListener('click', function() {
                                            const id = this.dataset.id;
                                            window.cerrarBuscadorAsistido();
                                            if (window._buscadorTipoContenido === 'serie') {
                                                window.abrirDondeVerlaSerie(id);
                                            } else {
                                                window.abrirDondeVerla(id);
                                            }
                                        });
                                    });

                                } catch (e) {}
                            }, 400);
                        });
                    };

                    // Opción B: elegir plataforma
                    // Lista dinámica completa — nada hardcodeado. Se pide la
                    // lista real de TMDb (películas o series, según lo que se
                    // esté buscando), se sacan los "canales" (Amazon Channel,
                    // Apple TV Channel — son add-ons, no plataformas en sí) y
                    // se ordena por display_priority (relevancia real de TMDb).
                    window._buscadorMostrarPlataformas = async function() {
                        document.getElementById('buscadorDondeVerPlataforma').style.display = 'block';
                        document.getElementById('buscadorModalSheet').classList.add('buscador-sheet-ancho');
                        const grid = document.getElementById('buscadorPlataformasGrid');
                        grid.className = 'buscador-plataformas-grid';
                        grid.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

                        try {
                            const token = localStorage.getItem('token');
                            const base = window._buscadorTipoContenido === 'serie' ? 'series' : 'movies';
                            const res = await fetch(`${CONFIG.API_URL}/${base}/watch-providers/list`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error();
                            const data = await res.json();

                            const plataformas = (data.results || [])
                                .filter(p => !/channel/i.test(p.provider_name || ''))
                                .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999));

                            if (plataformas.length === 0) {
                                grid.innerHTML = '<div class="buscador-predictor-vacio">No pudimos cargar las plataformas.</div>';
                                return;
                            }

                                                        grid.innerHTML = plataformas.map(p => `
                                                            <button class="buscador-plataforma-btn" onclick="window._buscadorBuscarPorPlataforma(${p.provider_id}, '${(p.provider_name || '').replace(/'/g, "\\'")}')" title="${p.provider_name}">
                                                                ${p.logo_path
                                                                    ? `<img src="https://image.tmdb.org/t/p/original${p.logo_path}" alt="${p.provider_name}">`
                                                                    : `<div class="buscador-plataforma-sinlogo"><i class="fas fa-tv"></i></div>`}
                                                            </button>
                                                        `).join('');

                                                        window._buscadorInicializarDotsPlataformas();
                                                    } catch (e) {
                                                        grid.innerHTML = '<div class="buscador-predictor-vacio">No pudimos cargar las plataformas. Intentá de nuevo.</div>';
                                                    }
                                                };

                                                // Dots del carrusel de plataformas — solo tienen sentido en
                                                // mobile (donde el grid pagina por tandas con scroll-snap);
                                                // en desktop el grid usa flex-wrap normal, sin páginas.
                                                window._buscadorInicializarDotsPlataformas = function() {
                                                    const dotsCont = document.getElementById('buscadorPlataformasDots');
                                                    const grid = document.getElementById('buscadorPlataformasGrid');
                                                    dotsCont.innerHTML = '';

                                                    if (window.innerWidth > 768) return;

                                                    requestAnimationFrame(() => {
                                                        const totalPaginas = Math.round(grid.scrollWidth / grid.clientWidth);
                                                        if (totalPaginas <= 1) return;

                                                        dotsCont.innerHTML = Array.from({ length: totalPaginas }, (_, i) =>
                                                            `<span class="buscador-dot${i === 0 ? ' activo' : ''}" data-pagina="${i}"></span>`
                                                        ).join('');

                                                        dotsCont.querySelectorAll('.buscador-dot').forEach(dot => {
                                                            dot.addEventListener('click', () => {
                                                                grid.scrollTo({ left: Number(dot.dataset.pagina) * grid.clientWidth, behavior: 'smooth' });
                                                            });
                                                        });

                                                        grid.addEventListener('scroll', () => {
                                                            const paginaActual = Math.round(grid.scrollLeft / grid.clientWidth);
                                                            dotsCont.querySelectorAll('.buscador-dot').forEach((dot, i) => {
                                                                dot.classList.toggle('activo', i === paginaActual);
                                                            });
                                                        }, { passive: true });
                                                    });
                                                };

                    window._buscadorBuscarPorPlataforma = function(plataformaId, nombre) {
                        window.cerrarBuscadorAsistido();
                        if (window._buscadorTipoContenido === 'serie') {
                            if (window._tabActivo !== 'series') {
                                window.seleccionarTabFeed('series', document.getElementById('tabSeries'));
                            }
                            window._buscadorEjecutarPlataformaSerie(plataformaId, nombre);
                        } else {
                            if (window._tabActivo !== 'peliculas') {
                                window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
                            }
                            window._buscadorEjecutarPlataformaPelicula(plataformaId, nombre);
                        }
                    };

                    window._buscadorEjecutarPlataformaPelicula = async function(plataformaId, nombre, pagina = 1, append = false) {
                        if (window.estadoPaginacion.cargando) return;
                        window.estadoPaginacion.cargando = true;
                        window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarPlataformaPelicula(plataformaId, nombre, p, true);

                        const track = document.getElementById('filaTrack-busqueda');
                        if (!append) {
                            window._buscadorMostrarFilaResultadosDebajo('fila-busqueda', `En ${nombre}`);
                            window._filaBusqueda.peliculas = [];
                            if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                        }

                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${CONFIG.API_URL}/movies/search?withWatchProviders=${plataformaId}&page=${pagina}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error(`Error ${res.status}`);
                            const data = await res.json();

                            window.estadoPaginacion.paginaActual = pagina;
                            window.estadoPaginacion.totalPaginas = data.total_pages;
                            window.estadoPaginacion.totalResultados = data.total_results;

                            if (!data.results || data.results.length === 0) {
                                if (!append) window._buscadorMostrarToast(`No encontramos películas en ${nombre}.`);
                            } else if (append) {
                                window._filaBusqueda.peliculas = window._filaBusqueda.peliculas.concat(data.results);
                                await appendCardsFila(window._filaBusqueda, data.results);
                                if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                            } else {
                                window._filaBusqueda.peliculas = data.results;
                                await renderCardsFila(window._filaBusqueda);
                                limpiarModalesDuplicados();
                                if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                            }
                            if (!append) window._buscadorScrollearAResultados('fila-busqueda');
                        } catch (error) {
                            if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                        } finally {
                            window.estadoPaginacion.cargando = false;
                        }
                    };

                    window._buscadorEjecutarPlataformaSerie = async function(plataformaId, nombre, pagina = 1, append = false) {
                        if (window.estadoPaginacionSerie.cargando) return;
                        window.estadoPaginacionSerie.cargando = true;
                        window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarPlataformaSerie(plataformaId, nombre, p, true);

                        const track = document.getElementById('filaSerieTrack-busqueda-serie');
                        if (!append) {
                            window._buscadorMostrarFilaResultadosDebajo('fila-busqueda-serie', `En ${nombre}`);
                            window._filaBusquedaSerie.series = [];
                            if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                        }

                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${CONFIG.API_URL}/series/search?withWatchProviders=${plataformaId}&page=${pagina}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error(`Error ${res.status}`);
                            const data = await res.json();

                            window.estadoPaginacionSerie.paginaActual = pagina;
                            window.estadoPaginacionSerie.totalPaginas = data.total_pages;
                            window.estadoPaginacionSerie.totalResultados = data.total_results;

                            if (!data.results || data.results.length === 0) {
                                if (!append) window._buscadorMostrarToast(`No encontramos series en ${nombre}.`);
                            } else if (append) {
                                window._filaBusquedaSerie.series = window._filaBusquedaSerie.series.concat(data.results);
                                await appendCardsFilaSerie(window._filaBusquedaSerie, data.results);
                                if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                            } else {
                                window._filaBusquedaSerie.series = data.results;
                                await renderCardsFilaSerie(window._filaBusquedaSerie);
                                if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                            }
                            if (!append) window._buscadorScrollearAResultados('fila-busqueda-serie');
                        } catch (error) {
                            if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                        } finally {
                            window.estadoPaginacionSerie.cargando = false;
                        }
                    };

                    // "Próximos estrenos" — ya existe como fila fija del feed, mismo
                    // mecanismo que género (no arma ningún fetch propio).
                    window._buscadorProximosEstrenos = function() {
                        window.cerrarBuscadorAsistido();
                        if (window._tabActivo !== 'peliculas') {
                            window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
                        }
                        const btn = document.querySelector(`#ordenarPills .pill-orden[data-key="proximamente"]`);
                        window.priorizarFilaGenero('proximamente', btn);
                    };

                // ==============================================
                // NIVEL 3 — Trabajaron juntos (cruce de dos filmografías).
                // No necesita ningún endpoint nuevo: reusa el mismo predictor de
                // personas y /movies/person/{id}/credits que ya usa abrirActorModal
                // — el cruce se hace en el frontend, comparando los dos listados de
                // películas por id.
                // ==============================================
                window._buscadorCrucePersona1 = null; // { id, nombre }

                window._buscadorAbrirNivel3Cruce1 = function() {
                    document.getElementById('buscadorNivel2Persona').style.display = 'none';
                    document.getElementById('buscadorNivel3Cruce1').style.display = 'block';
                    window._buscadorCrucePersona1 = null;

                    const input = document.getElementById('buscadorInputCruce1');
                    input.value = '';
                    document.getElementById('buscadorResultadosCruce1').style.display = 'none';
                    window._buscadorInicializarPredictorPersonaGenerico('buscadorInputCruce1', 'buscadorResultadosCruce1',
                        (id, nombre) => {
                            window._buscadorCrucePersona1 = { id, nombre };
                            window._buscadorAbrirNivel3Cruce2();
                        });
                    input.focus();
                };

                window._buscadorAbrirNivel3Cruce2 = function() {
                    document.getElementById('buscadorNivel3Cruce1').style.display = 'none';
                    document.getElementById('buscadorNivel3Cruce2').style.display = 'block';
                    document.getElementById('buscadorNivel3Cruce2Subtitulo').textContent =
                        `${window._buscadorCrucePersona1.nombre} trabajó con...`;

                    const input = document.getElementById('buscadorInputCruce2');
                    input.value = '';
                    document.getElementById('buscadorResultadosCruce2').style.display = 'none';
                    window._buscadorInicializarPredictorPersonaGenerico('buscadorInputCruce2', 'buscadorResultadosCruce2',
                        (id, nombre) => {
                            window._buscadorBuscarPeliculasEnComun(
                                window._buscadorCrucePersona1.id, window._buscadorCrucePersona1.nombre,
                                id, nombre
                            );
                        });
                    input.focus();
                };

                window._buscadorVolverACruce1 = function() {
                    document.getElementById('buscadorNivel3Cruce2').style.display = 'none';
                    document.getElementById('buscadorNivel3Cruce1').style.display = 'block';
                };

                // Predictor de personas genérico y reusable — recibe los IDs de los
                // elementos y un callback(id, nombre) al elegir, en vez de tener el
                // destino fijo como window._buscadorInicializarPredictorPersona (que
                // siempre abre abrirActorModal). Esta versión es la que debería haber
                // usado esa también, pero se deja aparte para no arriesgar romperla.
                window._buscadorInicializarPredictorPersonaGenerico = function(inputId, resultadosId, onSeleccionar) {
                    const input = document.getElementById(inputId);
                    const resultados = document.getElementById(resultadosId);
                    if (!input || input.dataset.predictorInit) return;
                    input.dataset.predictorInit = '1';

                    let timeoutId = null;

                    input.addEventListener('input', function() {
                        clearTimeout(timeoutId);
                        const query = this.value.trim();

                        if (query.length < 2) {
                            resultados.style.display = 'none';
                            return;
                        }

                        timeoutId = setTimeout(async () => {
                            try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`${CONFIG.API_URL}/movies/people/search?query=${encodeURIComponent(query)}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (!res.ok) return;
                                const data = await res.json();
                                const items = (data.results || []).slice(0, 6);

                                if (items.length === 0) {
                                    resultados.innerHTML = '<div class="buscador-predictor-vacio">No encontramos a nadie con ese nombre</div>';
                                    resultados.style.display = 'block';
                                    return;
                                }

                                resultados.innerHTML = items.map(item => {
                                    const foto = item.profile_path
                                        ? `<img src="https://image.tmdb.org/t/p/w92${item.profile_path}" alt="${item.name}">`
                                        : `<div class="buscador-predictor-poster-vacio"><i class="fas fa-user"></i></div>`;
                                    const conocidoPor = (item.known_for || [])
                                        .map(k => k.title || k.name)
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .join(', ');
                                    return `
                                    <div class="buscador-predictor-item" data-id="${item.id}" data-nombre="${item.name.replace(/"/g, '&quot;')}">
                                        ${foto}
                                        <div>
                                            <strong>${item.name}</strong>
                                            ${conocidoPor ? `<span>${conocidoPor}</span>` : ''}
                                        </div>
                                    </div>`;
                                }).join('');

                                resultados.style.display = 'block';

                                resultados.querySelectorAll('.buscador-predictor-item').forEach(el => {
                                    el.addEventListener('click', function() {
                                        onSeleccionar(this.dataset.id, this.dataset.nombre);
                                    });
                                });

                            } catch (e) {}
                        }, 400);
                    });
                };

                window._buscadorBuscarPeliculasEnComun = async function(id1, nombre1, id2, nombre2) {
                    window.cerrarBuscadorAsistido();
                    if (window._tabActivo !== 'peliculas') {
                        window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
                    }

                    try {
                        const token = localStorage.getItem('token');
                        const [res1, res2] = await Promise.all([
                            fetch(`${CONFIG.API_URL}/movies/person/${id1}/credits`, { headers: { 'Authorization': `Bearer ${token}` } }),
                            fetch(`${CONFIG.API_URL}/movies/person/${id2}/credits`, { headers: { 'Authorization': `Bearer ${token}` } })
                        ]);
                        const cred1 = res1.ok ? await res1.json() : {};
                        const cred2 = res2.ok ? await res2.json() : {};

                        const cast1 = cred1.cast || [];
                        const cast2 = cred2.cast || [];
                        const idsEnCast2 = new Set(cast2.map(p => p.id));

                        const enComun = cast1
                            .filter(p => idsEnCast2.has(p.id) && p.poster_path)
                            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

                                if (enComun.length === 0) {
                                    // Sin resultados: NO se activa mostrarVistaResultados() — el
                                    // feed normal (destacadas, trivia, filas de género) se queda
                                    // exactamente como estaba. Solo un aviso breve, sin tapar nada.
                                    // Si la fila estaba visible de una búsqueda anterior exitosa,
                                    // se oculta acá también — si no, queda colgado el título y
                                    // las tarjetas de esa búsqueda previa, dando la sensación de
                                    // que "algo se insertó" para esta búsqueda vacía.
                                    const filaPrevia = document.getElementById('fila-busqueda');
                                    if (filaPrevia) filaPrevia.style.display = 'none';

                                    window._buscadorMostrarToast(
                                        `<i class="fas fa-user-friends" style="margin-right:0.5rem;"></i>${nombre1} y ${nombre2} todavía no compartieron ninguna película.`
                                    );
                                    return;
                                }

                                // A diferencia de año/característica, acá NO se oculta nada del
                                // feed (destacadas, trivia, voto relámpago, filas de género
                                // siguen visibles) — mismo espíritu que género, que tampoco tapa
                                // nada. La fila de resultados se reposiciona como lo último de
                                // la página y se muestra ahí debajo, en vez de reemplazar todo.
                                // /movies/person/{id}/credits devuelve una versión liviana de
                                // cada película (sin "overview") — generarTarjetasHTML descarta
                                // en silencio cualquier película sin sinopsis, así que sin esto
                                // la fila queda vacía aunque enComun sí tenga coincidencias reales.
                                const enComunConSinopsis = enComun.map(p => ({
                                    ...p,
                                    overview: p.overview && p.overview.trim() !== '' ? p.overview : 'Sin sinopsis disponible.'
                                }));

                                window._buscadorMostrarFilaResultadosDebajo('fila-busqueda', `${nombre1} + ${nombre2}`);
                                window._filaBusqueda.peliculas = enComunConSinopsis;
                                const track = document.getElementById('filaTrack-busqueda');
                                if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                                await renderCardsFila(window._filaBusqueda);
                                limpiarModalesDuplicados();
                                if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                                window._buscadorScrollearAResultados('fila-busqueda');
                    } catch (error) {
                        window._buscadorMostrarToast('Error al buscar las películas en común. Intentá de nuevo.');
                    }
                };

                // Toast genérico y liviano para avisos breves del buscador — se
                // inyecta una sola vez y se reusa, no tapa ni reemplaza nada de la
                // pantalla (a diferencia de mostrarVistaResultados).
                window._buscadorMostrarToast = function(mensajeHtml) {
                    let toast = document.getElementById('buscadorToast');
                    if (!toast) {
                        document.body.insertAdjacentHTML('beforeend', `
                            <div id="buscadorToast" style="display:none; position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:#1a1a1a; color:white; padding:0.9rem 1.5rem; border-radius:30px; font-size:0.88rem; box-shadow:0 8px 24px rgba(0,0,0,0.25); z-index:999999; max-width:90vw; text-align:center;"></div>`);
                        toast = document.getElementById('buscadorToast');
                    }
                    toast.innerHTML = mensajeHtml;
                    toast.style.display = 'block';
                    toast.style.opacity = '0';
                    toast.style.transition = 'none';
                    requestAnimationFrame(() => {
                        toast.style.transition = 'opacity 0.3s ease';
                        toast.style.opacity = '1';
                    });
                    clearTimeout(window._buscadorToastTimeout);
                    window._buscadorToastTimeout = setTimeout(() => {
                        toast.style.opacity = '0';
                        setTimeout(() => { toast.style.display = 'none'; }, 300);
                    }, 3500);
                };

            // ==============================================
            // NIVEL 3 — Actor/actriz/director: buscar por nombre.
            // Reusa abrirActorModal (ya existe, y ya está pensada para funcionar
            // sin película de contexto — sin movieId no muestra "Volver").
            // ==============================================
            window._buscadorAbrirNivel3Persona = function() {
                document.getElementById('buscadorNivel2Persona').style.display = 'none';
                document.getElementById('buscadorNivel3Persona').style.display = 'block';

                const input = document.getElementById('buscadorInputPersona');
                input.value = '';
                document.getElementById('buscadorResultadosPersona').style.display = 'none';
                window._buscadorInicializarPredictorPersona();
                input.focus();
            };

                window._buscadorVolverANivel2Persona = function() {
                    ['buscadorNivel3Persona', 'buscadorNivel3Cruce1', 'buscadorNivel3Cruce2'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.style.display = 'none';
                    });
                    document.getElementById('buscadorNivel2Persona').style.display = 'block';
                };

            window._buscadorInicializarPredictorPersona = function() {
                const input = document.getElementById('buscadorInputPersona');
                const resultados = document.getElementById('buscadorResultadosPersona');
                if (!input || input.dataset.predictorInit) return;
                input.dataset.predictorInit = '1';

                let timeoutId = null;

                input.addEventListener('input', function() {
                    clearTimeout(timeoutId);
                    const query = this.value.trim();

                    if (query.length < 2) {
                        resultados.style.display = 'none';
                        return;
                    }

                    timeoutId = setTimeout(async () => {
                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${CONFIG.API_URL}/movies/people/search?query=${encodeURIComponent(query)}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) return;
                            const data = await res.json();
                            const items = (data.results || []).slice(0, 6);

                            if (items.length === 0) {
                                resultados.innerHTML = '<div class="buscador-predictor-vacio">No encontramos a nadie con ese nombre</div>';
                                resultados.style.display = 'block';
                                return;
                            }

                            resultados.innerHTML = items.map(item => {
                                const foto = item.profile_path
                                    ? `<img src="https://image.tmdb.org/t/p/w92${item.profile_path}" alt="${item.name}">`
                                    : `<div class="buscador-predictor-poster-vacio"><i class="fas fa-user"></i></div>`;
                                const conocidoPor = (item.known_for || [])
                                    .map(k => k.title || k.name)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .join(', ');
                                return `
                                <div class="buscador-predictor-item" data-id="${item.id}" data-nombre="${item.name.replace(/"/g, '&quot;')}">
                                    ${foto}
                                    <div>
                                        <strong>${item.name}</strong>
                                        ${conocidoPor ? `<span>${conocidoPor}</span>` : ''}
                                    </div>
                                </div>`;
                            }).join('');

                            resultados.style.display = 'block';

                            resultados.querySelectorAll('.buscador-predictor-item').forEach(el => {
                                el.addEventListener('click', function() {
                                    const id = this.dataset.id;
                                    const nombre = this.dataset.nombre;
                                    window.cerrarBuscadorAsistido();
                                    // Sin movieId — abrirActorModal ya contempla este caso
                                    // y no muestra el botón "Volver".
                                    window.abrirActorModal(id, nombre);
                                });
                            });

                        } catch (e) {}
                    }, 400);
                });
            };

        // ==============================================
        // NIVEL 3 — Por característica (keywords de TMDb).
        // IDs confirmados contra la documentación de TMDb — no se resuelven
        // por texto libre, son fijos: "basada en hechos reales" = 9672,
        // "remake" = 325286. Por ahora solo para película; serie y "saga"
        // (que se resuelve distinto, por colección, no por keyword) quedan
        // para una próxima pasada.
        // ==============================================
        const BUSCADOR_CARACTERISTICAS_PELICULA = [
            { id: 9672, nombre: 'Basada en hechos reales' },
            { id: 325286, nombre: 'Remake' },
        ];

        // "Reboot" en vez de "Remake" — esa keyword de películas (325286,
        // "film remake") no tiene equivalente confirmado del lado series.
        // "Reboot" (161184) sí tiene su propia página de TMDb específica
        // para TV, con series reales etiquetadas.
        const BUSCADOR_CARACTERISTICAS_SERIE = [
            { id: 9672, nombre: 'Basada en hechos reales' },
            { id: 161184, nombre: 'Reboot' },
        ];

        window._buscadorAbrirNivel3Caracteristica = function() {
            document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'none';
            document.getElementById('buscadorNivel3Caracteristica').style.display = 'block';

            const lista = window._buscadorTipoContenido === 'serie'
                ? BUSCADOR_CARACTERISTICAS_SERIE
                : BUSCADOR_CARACTERISTICAS_PELICULA;

            const grid = document.getElementById('buscadorCaracteristicasGrid');
            grid.innerHTML = lista.map(c =>
                `<button class="buscador-genero-chip" onclick="window._buscadorBuscarPorCaracteristica(${c.id}, '${c.nombre}')">${c.nombre}</button>`
            ).join('');
        };

        // Mismo pipeline que "Por año" (no hay fila pre-armada para esto en
        // el feed, a diferencia de género) — reusa mostrarVistaResultados/
        // _filaBusqueda/renderCardsFila, ahora con withKeywords en vez de year.
        window._buscadorBuscarPorCaracteristica = function(keywordId, nombre) {
            window.cerrarBuscadorAsistido();

            if (window._buscadorTipoContenido === 'serie') {
                if (window._tabActivo !== 'series') {
                    window.seleccionarTabFeed('series', document.getElementById('tabSeries'));
                }
                window._buscadorEjecutarCaracteristicaSerie(keywordId, nombre);
            } else {
                if (window._tabActivo !== 'peliculas') {
                    window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
                }
                window._buscadorEjecutarCaracteristicaPelicula(keywordId, nombre);
            }
        };

                window._buscadorEjecutarCaracteristicaPelicula = async function(keywordId, nombre, pagina = 1, append = false) {
                    if (window.estadoPaginacion.cargando) return;
                    window.estadoPaginacion.cargando = true;
                    window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarCaracteristicaPelicula(keywordId, nombre, p, true);

                    const track = document.getElementById('filaTrack-busqueda');
                    if (!append) {
                                        window._buscadorMostrarFilaResultadosDebajo('fila-busqueda', nombre);
                                        window._filaBusqueda.peliculas = [];
                                        if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                                    }

                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${CONFIG.API_URL}/movies/search?withKeywords=${keywordId}&page=${pagina}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!res.ok) throw new Error(`Error ${res.status}`);
                        const data = await res.json();

                        window.estadoPaginacion.paginaActual = pagina;
                        window.estadoPaginacion.totalPaginas = data.total_pages;
                        window.estadoPaginacion.totalResultados = data.total_results;

                        const countEl = document.getElementById('resultadosCount');
                        if (countEl) countEl.textContent = data.total_results || 0;

                        if (!data.results || data.results.length === 0) {
                            if (!append) window._buscadorMostrarToast(`No encontramos películas "${nombre}".`);
                        } else if (append) {
                            window._filaBusqueda.peliculas = window._filaBusqueda.peliculas.concat(data.results);
                            await appendCardsFila(window._filaBusqueda, data.results);
                            if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                        } else {
                            window._filaBusqueda.peliculas = data.results;
                            await renderCardsFila(window._filaBusqueda);
                            limpiarModalesDuplicados();
                            if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                        }
                        if (!append) window._buscadorScrollearAResultados('fila-busqueda');
                    } catch (error) {
                        if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                    } finally {
                        window.estadoPaginacion.cargando = false;
                    }
                };

                window._buscadorEjecutarCaracteristicaSerie = async function(keywordId, nombre, pagina = 1, append = false) {
                    if (window.estadoPaginacionSerie.cargando) return;
                    window.estadoPaginacionSerie.cargando = true;
                    window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarCaracteristicaSerie(keywordId, nombre, p, true);

                    const track = document.getElementById('filaSerieTrack-busqueda-serie');
                    if (!append) {
                        window._buscadorMostrarFilaResultadosDebajo('fila-busqueda-serie', nombre);
                        window._filaBusquedaSerie.series = [];
                        if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                    }

                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${CONFIG.API_URL}/series/search?withKeywords=${keywordId}&page=${pagina}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!res.ok) throw new Error(`Error ${res.status}`);
                        const data = await res.json();

                        window.estadoPaginacionSerie.paginaActual = pagina;
                        window.estadoPaginacionSerie.totalPaginas = data.total_pages;
                        window.estadoPaginacionSerie.totalResultados = data.total_results;

                        const countEl = document.getElementById('resultadosCountSerie');
                        if (countEl) countEl.textContent = data.total_results || 0;

                        if (!data.results || data.results.length === 0) {
                            if (!append) window._buscadorMostrarToast(`No encontramos series "${nombre}".`);
                        } else if (append) {
                            window._filaBusquedaSerie.series = window._filaBusquedaSerie.series.concat(data.results);
                            await appendCardsFilaSerie(window._filaBusquedaSerie, data.results);
                            if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                        } else {
                            window._filaBusquedaSerie.series = data.results;
                            await renderCardsFilaSerie(window._filaBusquedaSerie);
                            if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                        }
                        if (!append) window._buscadorScrollearAResultados('fila-busqueda-serie');
                    } catch (error) {
                        if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                    } finally {
                        window.estadoPaginacionSerie.cargando = false;
                    }
                };

        // ==============================================
        // NIVEL 3 — Por año o década: bifurcación real.
        // "Año específico" = select nativo, misma búsqueda de siempre.
        // "Década" = ahora es un RANGO real (primary_release_date.gte/lte
        // en una sola consulta a /discover), no un paso intermedio hacia
        // un año puntual como antes.
        // ==============================================
        window._buscadorAbrirNivel3EpocaTipo = function() {
            document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'none';
            document.getElementById('buscadorNivel3EpocaTipo').style.display = 'block';
        };

        window._buscadorVolverAEpocaTipo = function() {
            document.getElementById('buscadorNivel3AnioEspecifico').style.display = 'none';
            document.getElementById('buscadorNivel3Decada').style.display = 'none';
            document.getElementById('buscadorNivel3EpocaTipo').style.display = 'block';
        };

        window._buscadorAbrirAnioEspecifico = function() {
            document.getElementById('buscadorNivel3EpocaTipo').style.display = 'none';
            document.getElementById('buscadorNivel3AnioEspecifico').style.display = 'block';

            const select = document.getElementById('buscadorSelectAnio');
            if (select.dataset.poblado !== '1') {
                const anioActual = new Date().getFullYear();
                let opciones = '<option value="" selected disabled>Seleccioná un año...</option>';
                for (let anio = anioActual; anio >= 1920; anio--) {
                    opciones += `<option value="${anio}">${anio}</option>`;
                }
                select.innerHTML = opciones;
                select.dataset.poblado = '1';
            } else {
                select.value = '';
            }
        };

        window._buscadorAbrirDecadas = function() {
            document.getElementById('buscadorNivel3EpocaTipo').style.display = 'none';
            document.getElementById('buscadorNivel3Decada').style.display = 'block';

            const grid = document.getElementById('buscadorDecadasGrid');
            if (grid.dataset.poblado === '1') return;

            const anioActual = new Date().getFullYear();
            const decadaActual = Math.floor(anioActual / 10) * 10;

            let html = '';
            for (let decada = decadaActual; decada >= 1920; decada -= 10) {
                html += `<button class="buscador-genero-chip" onclick="window._buscadorBuscarPorDecada(${decada})">${decada}s</button>`;
            }
            grid.innerHTML = html;
            grid.dataset.poblado = '1';
        };

            // Rango real de la década, en una sola consulta — no arma un
            // año puntual como antes.
            window._buscadorBuscarPorDecada = function(decada) {
                const anioActual = new Date().getFullYear();
                const decadaFin = Math.min(decada + 9, anioActual);
                window._buscadorEjecutarRangoAnios(decada, decadaFin, `${decada}s`);
            };

            window._buscadorEjecutarRangoAnios = function(anioDesde, anioHasta, etiqueta) {
                window.cerrarBuscadorAsistido();

                if (window._buscadorTipoContenido === 'serie') {
                    if (window._tabActivo !== 'series') {
                        window.seleccionarTabFeed('series', document.getElementById('tabSeries'));
                    }
                    window._buscadorEjecutarRangoAniosSerie(anioDesde, anioHasta, etiqueta);
                } else {
                    if (window._tabActivo !== 'peliculas') {
                        window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
                    }
                    window._buscadorEjecutarRangoAniosPelicula(anioDesde, anioHasta, etiqueta);
                }
            };

            window._buscadorEjecutarRangoAniosPelicula = async function(anioDesde, anioHasta, etiqueta, pagina = 1, append = false) {
                if (window.estadoPaginacion.cargando) return;
                window.estadoPaginacion.cargando = true;
                window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarRangoAniosPelicula(anioDesde, anioHasta, etiqueta, p, true);

                const track = document.getElementById('filaTrack-busqueda');
                if (!append) {
                    window._buscadorMostrarFilaResultadosDebajo('fila-busqueda', `Películas de los ${etiqueta}`);
                    window._filaBusqueda.peliculas = [];
                    if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                }

                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${CONFIG.API_URL}/movies/search?releaseDateGte=${anioDesde}&releaseDateLte=${anioHasta}&page=${pagina}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    const data = await res.json();

                    window.estadoPaginacion.paginaActual = pagina;
                    window.estadoPaginacion.totalPaginas = data.total_pages;
                    window.estadoPaginacion.totalResultados = data.total_results;

                    if (!data.results || data.results.length === 0) {
                        if (!append) window._buscadorMostrarToast(`No encontramos películas de los ${etiqueta}.`);
                    } else if (append) {
                        window._filaBusqueda.peliculas = window._filaBusqueda.peliculas.concat(data.results);
                        await appendCardsFila(window._filaBusqueda, data.results);
                        if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                    } else {
                        window._filaBusqueda.peliculas = data.results;
                        await renderCardsFila(window._filaBusqueda);
                        limpiarModalesDuplicados();
                        if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                    }
                    if (!append) window._buscadorScrollearAResultados('fila-busqueda');
                } catch (error) {
                    if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                } finally {
                    window.estadoPaginacion.cargando = false;
                }
            };

            window._buscadorEjecutarRangoAniosSerie = async function(anioDesde, anioHasta, etiqueta, pagina = 1, append = false) {
                if (window.estadoPaginacionSerie.cargando) return;
                window.estadoPaginacionSerie.cargando = true;
                window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarRangoAniosSerie(anioDesde, anioHasta, etiqueta, p, true);

                const track = document.getElementById('filaSerieTrack-busqueda-serie');
                if (!append) {
                    window._buscadorMostrarFilaResultadosDebajo('fila-busqueda-serie', `Series de los ${etiqueta}`);
                    window._filaBusquedaSerie.series = [];
                    if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                }

                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${CONFIG.API_URL}/series/search?firstAirDateGte=${anioDesde}&firstAirDateLte=${anioHasta}&page=${pagina}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error(`Error ${res.status}`);
                    const data = await res.json();

                    window.estadoPaginacionSerie.paginaActual = pagina;
                    window.estadoPaginacionSerie.totalPaginas = data.total_pages;
                    window.estadoPaginacionSerie.totalResultados = data.total_results;

                    if (!data.results || data.results.length === 0) {
                        if (!append) window._buscadorMostrarToast(`No encontramos series de los ${etiqueta}.`);
                    } else if (append) {
                        window._filaBusquedaSerie.series = window._filaBusquedaSerie.series.concat(data.results);
                        await appendCardsFilaSerie(window._filaBusquedaSerie, data.results);
                        if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                    } else {
                        window._filaBusquedaSerie.series = data.results;
                        await renderCardsFilaSerie(window._filaBusquedaSerie);
                        if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                    }
                    if (!append) window._buscadorScrollearAResultados('fila-busqueda-serie');
                } catch (error) {
                    if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                } finally {
                    window.estadoPaginacionSerie.cargando = false;
                }
            };

    // No hay una fila pre-armada por año en el feed (a diferencia de
    // género) — acá sí reusamos el carrusel de "resultados de búsqueda"
    // que ya usaba el filtro viejo (mismo mostrarVistaResultados /
    // _filaBusqueda / renderCardsFila que aplicarFiltros).
                // Mismo criterio que priorizarFilaGenero: no oculta nada ni mueve
                // ningún nodo del DOM — solo muestra la fila donde ya vive en el
                // HTML. El scroll suave es lo que la lleva a la vista, nada más.
                window._buscadorMostrarFilaResultadosDebajo = function(idFila, tituloTexto) {
                    const fila = document.getElementById(idFila);
                    if (!fila) return;
                    fila.style.display = 'block';
                    if (tituloTexto) {
                        const idTitulo = idFila === 'fila-busqueda-serie' ? 'filaBusquedaSerieTitulo' : 'filaBusquedaTitulo';
                        const tituloEl = document.getElementById(idTitulo);
                        if (tituloEl) tituloEl.textContent = tituloTexto;
                    }
                    inicializarFilaBusqueda(); // ya tiene su propia guarda, no se duplica
                };

                window._buscadorScrollearAResultados = function(idFila) {
                // Mismo criterio de offset que priorizarFilaGenero/Serie — se llama
                // justo después de mostrarVistaResultados(os), así que el elemento
                // ya está visible cuando se mide su posición.
                setTimeout(() => {
                    const el = document.getElementById(idFila);
                    if (!el) return;

                    const esMobile = window.innerWidth <= 768;
                    let offset;
                    if (esMobile) {
                        // En mobile el header se auto-oculta al bajar (ver main.js,
                        // "navbar-hidden") — el offset fijo pensado para desktop
                        // (header siempre visible) dejaba demasiado aire arriba,
                        // mostrando los pills por encima del título del resultado
                        // en vez de aterrizar justo ahí.
                        offset = 12;
                    } else {
                        const header = document.querySelector('header');
                        offset = (header ? header.offsetHeight : 70) + 16;
                    }

                    const top = el.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: 'smooth' });
                }, 50);
            };

    window._buscadorBuscarPorAnio = function(anio) {
        window.cerrarBuscadorAsistido();

        if (window._buscadorTipoContenido === 'serie') {
            if (window._tabActivo !== 'series') {
                window.seleccionarTabFeed('series', document.getElementById('tabSeries'));
            }
            window._buscadorEjecutarBusquedaAnioSerie(anio);
        } else {
            if (window._tabActivo !== 'peliculas') {
                window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
            }
            window._buscadorEjecutarBusquedaAnioPelicula(anio);
        }
    };

        window._buscadorEjecutarBusquedaAnioPelicula = async function(anio, pagina = 1, append = false) {
            if (window.estadoPaginacion.cargando) return;
            window.estadoPaginacion.cargando = true;
            window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarBusquedaAnioPelicula(anio, p, true);

                        const track = document.getElementById('filaTrack-busqueda');
                                    if (!append) {
                                        window._buscadorMostrarFilaResultadosDebajo('fila-busqueda', `Películas de ${anio}`);
                                        window._filaBusqueda.peliculas = [];
                                        if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                                    }

                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${CONFIG.API_URL}/movies/search?year=${anio}&page=${pagina}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error(`Error ${res.status}`);
                            const data = await res.json();

                            window.estadoPaginacion.paginaActual = pagina;
                            window.estadoPaginacion.totalPaginas = data.total_pages;
                            window.estadoPaginacion.totalResultados = data.total_results;

                            const countEl = document.getElementById('resultadosCount');
                            if (countEl) countEl.textContent = data.total_results || 0;

                            if (!data.results || data.results.length === 0) {
                                if (!append) window._buscadorMostrarToast(`No encontramos películas de ${anio}.`);
                            } else if (append) {
                                window._filaBusqueda.peliculas = window._filaBusqueda.peliculas.concat(data.results);
                                await appendCardsFila(window._filaBusqueda, data.results);
                                if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                            } else {
                                window._filaBusqueda.peliculas = data.results;
                                await renderCardsFila(window._filaBusqueda);
                                limpiarModalesDuplicados();
                                if (typeof window.cargarEstadisticasVotacion === 'function') window.cargarEstadisticasVotacion();
                            }
                            if (!append) window._buscadorScrollearAResultados('fila-busqueda');
                        } catch (error) {
                            if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
                        } finally {
                            window.estadoPaginacion.cargando = false;
                        }
                    };

        window._buscadorEjecutarBusquedaAnioSerie = async function(anio, pagina = 1, append = false) {
            if (window.estadoPaginacionSerie.cargando) return;
            window.estadoPaginacionSerie.cargando = true;
            window._buscadorPaginaSiguienteFn = (p) => window._buscadorEjecutarBusquedaAnioSerie(anio, p, true);

            const track = document.getElementById('filaSerieTrack-busqueda-serie');
                    if (!append) {
                        window._buscadorMostrarFilaResultadosDebajo('fila-busqueda-serie', `Series de ${anio}`);
                        window._filaBusquedaSerie.series = [];
                        if (track) track.innerHTML = '<div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>';
                    }

                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${CONFIG.API_URL}/series/search?year=${anio}&page=${pagina}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(`Error ${res.status}`);
                const data = await res.json();

                window.estadoPaginacionSerie.paginaActual = pagina;
                window.estadoPaginacionSerie.totalPaginas = data.total_pages;
                window.estadoPaginacionSerie.totalResultados = data.total_results;

                const countEl = document.getElementById('resultadosCountSerie');
                if (countEl) countEl.textContent = data.total_results || 0;

                if (!data.results || data.results.length === 0) {
                    if (!append) window._buscadorMostrarToast(`No encontramos series de ${anio}.`);
                } else if (append) {
                    window._filaBusquedaSerie.series = window._filaBusquedaSerie.series.concat(data.results);
                    await appendCardsFilaSerie(window._filaBusquedaSerie, data.results);
                    if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                } else {
                    window._filaBusquedaSerie.series = data.results;
                    await renderCardsFilaSerie(window._filaBusquedaSerie);
                    if (typeof window.cargarEstadisticasVotacionSeries === 'function') window.cargarEstadisticasVotacionSeries();
                }
                if (!append) window._buscadorScrollearAResultados('fila-busqueda-serie');
            } catch (error) {
                if (!append) window._buscadorMostrarToast('Error al buscar. Intentá de nuevo.');
            } finally {
                window.estadoPaginacionSerie.cargando = false;
            }
        };

// ==============================================
// NIVEL 3 — Por género
// ==============================================
window._buscadorAbrirNivel3Genero = async function() {
    document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'none';
    document.getElementById('buscadorNivel3Genero').style.display = 'block';
    document.getElementById('buscadorNivel3GeneroSubtitulo').textContent =
        window._buscadorTipoContenido === 'pelicula' ? 'Elegí un género de película' : 'Elegí un género de serie';

    const grid = document.getElementById('buscadorGenerosGrid');
    grid.innerHTML = '<div class="buscador-predictor-vacio"><i class="fas fa-spinner fa-spin"></i> Cargando géneros...</div>';

    try {
        const token = localStorage.getItem('token');
        const base = window._buscadorTipoContenido === 'serie' ? 'series' : 'movies';
        const res = await fetch(`${CONFIG.API_URL}/${base}/genres`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const generos = data.genres || [];

        if (generos.length === 0) {
            grid.innerHTML = '<div class="buscador-predictor-vacio">No pudimos cargar los géneros.</div>';
            return;
        }

        grid.innerHTML = generos.map(g =>
            `<button class="buscador-genero-chip" onclick="window._buscadorBuscarPorGenero(${g.id}, '${g.name.replace(/'/g, "\\'")}')">${g.name}</button>`
        ).join('');

    } catch (e) {
        grid.innerHTML = '<div class="buscador-predictor-vacio">Error al cargar los géneros. Intentá de nuevo.</div>';
    }
};

// No arma ningún resultado propio — el feed YA tiene una fila por
// cada género (.fila-genero, con su pill correspondiente en
// #ordenarPills). Elegir un género acá simplemente prioriza esa fila
// existente al frente y scrollea hasta ella, vía la misma función que
// ya usa el pill cuando lo tocás a mano en el feed.
window._buscadorBuscarPorGenero = function(generoId, generoNombre) {
    window.cerrarBuscadorAsistido();
    const key = `genero-${generoId}`;

    if (window._buscadorTipoContenido === 'serie') {
        if (window._tabActivo !== 'series') {
            window.seleccionarTabFeed('series', document.getElementById('tabSeries'));
        }
        // Si quedó una vista de "resultados de búsqueda" abierta de una
        // búsqueda anterior por año/título, hay que cerrarla primero —
        // si no, se queda tapando todo mientras priorizarFilaGeneroSerie
        // reordena las filas normales, que están escondidas debajo.
        if (typeof window.ocultarVistaResultadosSerie === 'function') window.ocultarVistaResultadosSerie();
        const btn = document.querySelector(`#ordenarPillsSerie .pill-orden[data-key="${key}"]`);
        window.priorizarFilaGeneroSerie(key, btn);
    } else {
        if (window._tabActivo !== 'peliculas') {
            window.seleccionarTabFeed('peliculas', document.getElementById('tabPeliculas'));
        }
        if (typeof window.ocultarVistaResultados === 'function') window.ocultarVistaResultados();
        const btn = document.querySelector(`#ordenarPills .pill-orden[data-key="${key}"]`);
        window.priorizarFilaGenero(key, btn);
    }
};

// ==============================================
// NIVEL 3 — Por título (predictor en vivo)
// ==============================================
window._buscadorAbrirNivel3Titulo = function() {
    document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'none';
    document.getElementById('buscadorNivel3Titulo').style.display = 'block';
    document.getElementById('buscadorNivel3TituloSubtitulo').textContent =
        window._buscadorTipoContenido === 'pelicula' ? 'Escribí el título de la película' : 'Escribí el título de la serie';

    const input = document.getElementById('buscadorInputTitulo');
    input.value = '';
    document.getElementById('buscadorResultadosTitulo').style.display = 'none';
    window._buscadorInicializarPredictorTitulo();
    input.focus();
};

// Compartida por los 3 criterios de "Película o serie" que ya tienen
// Nivel 3 propio (título, género, año/década) — oculta cualquiera de
// los tres que esté visible, no solo el de título.
window._buscadorVolverACriteriosPeliculaSerie = function() {
    ['buscadorNivel3Titulo', 'buscadorNivel3Genero', 'buscadorNivel3EpocaTipo', 'buscadorNivel3AnioEspecifico', 'buscadorNivel3Decada', 'buscadorNivel3Caracteristica'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById('buscadorNivel2PeliculaSerie').style.display = 'block';
};

window._buscadorInicializarPredictorTitulo = function() {
    const input = document.getElementById('buscadorInputTitulo');
    const resultados = document.getElementById('buscadorResultadosTitulo');
    if (!input || input.dataset.predictorInit) return; // no duplicar el listener entre aperturas
    input.dataset.predictorInit = '1';

    let timeoutId = null;

    input.addEventListener('input', function() {
        clearTimeout(timeoutId);
        const query = this.value.trim();

        if (query.length < 2) {
            resultados.style.display = 'none';
            return;
        }

        timeoutId = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const base = window._buscadorTipoContenido === 'serie' ? 'series' : 'movies';
                const res = await fetch(`${CONFIG.API_URL}/${base}/search?query=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                const items = (data.results || []).slice(0, 6);

                if (items.length === 0) {
                    resultados.innerHTML = '<div class="buscador-predictor-vacio">No encontramos nada con ese título</div>';
                    resultados.style.display = 'block';
                    return;
                }

                resultados.innerHTML = items.map(item => {
                    const titulo = item.title || item.name || 'Sin título';
                    const fecha = item.release_date || item.first_air_date || '';
                    const anio = fecha ? fecha.substring(0, 4) : '';
                    const poster = item.poster_path
                        ? `<img src="https://image.tmdb.org/t/p/w92${item.poster_path}" alt="${titulo}">`
                        : `<div class="buscador-predictor-poster-vacio"><i class="fas fa-film"></i></div>`;
                    return `
                    <div class="buscador-predictor-item" data-id="${item.id}">
                        ${poster}
                        <div>
                            <strong>${titulo}</strong>
                            ${anio ? `<span>${anio}</span>` : ''}
                        </div>
                    </div>`;
                }).join('');

                resultados.style.display = 'block';

                resultados.querySelectorAll('.buscador-predictor-item').forEach(el => {
                    el.addEventListener('click', function() {
                        const id = this.dataset.id;
                        window.cerrarBuscadorAsistido();
                        if (window._buscadorTipoContenido === 'serie') {
                            window.abrirDetalleSerie(id);
                        } else {
                            window.abrirDetallePelicula(id);
                        }
                    });
                });

            } catch (e) {}
        }, 400);
    });
};

// ── Mensaje límite diario de comentarios ────────────────────────────────
function mostrarMensajeLimiteDiario() {
    const existing = document.getElementById('modalLimiteDiario');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modalLimiteDiario';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:2rem;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <div style="font-size:2.5rem;margin-bottom:0.75rem;">🎬</div>
            <h3 style="margin:0 0 0.75rem;color:#333;font-size:1.1rem;font-weight:700;">Ya generaste todos tus puntos de hoy</h3>
            <p style="color:#666;font-size:0.9rem;margin:0 0 1.5rem;line-height:1.6;text-align:left;">
                Podés seguir comentando lo que quieras, pero estos comentarios no sumarán puntos.
                <br>A las 00hs se renueva tu límite diario y volverás a ganar puntos con tus comentarios.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                <button onclick="document.getElementById('modalLimiteDiario').remove()"
                    style="padding:0.75rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                    Entendido
                </button>
                <p style="color:#888;font-size:0.85rem;margin:0 0 0.75rem;">
                    ¿Querés comentar sin límites y ganar puntos ilimitados?
                </p>
                <button onclick="document.getElementById('modalLimiteDiario').remove(); if(typeof cerrarModal==='function') cerrarModal(); if(typeof abrirDetallePlan==='function') abrirDetallePlan();"
                    style="padding:0.75rem;background:#e50914;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;width:100%;">
                    Quiero ser Premium
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ── Editar comentario ──────────────────────────────────────────
window.editarComentario = function(commentId, btn) {
    const contenedorTexto = document.getElementById(`comentario-texto-${commentId}`);
    if (!contenedorTexto) return;

    // Cerrar la caja de "escribir comentario nuevo" si estaba abierta
    const area = document.getElementById('areaEscritura');
    if (area && area.style.display !== 'none' && typeof window.cancelarComentario === 'function') {
        window.cancelarComentario();
    }

    // Cerrar cualquier form de respuesta abierto
    document.querySelectorAll('.reply-form').forEach(f => f.remove());

    // Cerrar cualquier OTRA edición abierta (solo una a la vez)
    document.querySelectorAll('#modalPelicula [data-texto-original]').forEach(el => {
        if (el !== contenedorTexto) {
            el.textContent = el.dataset.textoOriginal;
            delete el.dataset.textoOriginal;
        }
    });

    const textoActual = contenedorTexto.textContent.trim();
    contenedorTexto.dataset.textoOriginal = textoActual;

    const gifImg = document.getElementById(`comentario-gif-${commentId}`);
    window[`_quitarGifComentario_${commentId}`] = false;

    // Reemplazar texto por textarea inline
    contenedorTexto.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.4rem;width:100%;">
            <textarea id="editTextarea-${commentId}"
                style="width:100%;box-sizing:border-box;padding:0.5rem;border:1.5px solid #324C89;border-radius:8px;font-size:0.88rem;font-family:inherit;resize:none;min-height:60px;"
                maxlength="2000">${textoActual}</textarea>
            ${gifImg ? `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-size:0.78rem;color:#888;">GIF adjunto —</span>
                <button onclick="window.marcarQuitarGifComentario(${commentId}, this)"
                    style="background:none;border:1px solid #ddd;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.75rem;cursor:pointer;color:#c0392b;">
                    Quitar GIF
                </button>
            </div>` : ''}
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
                <button onclick="window.cancelarEdicionComentario(${commentId})"
                    style="padding:0.3rem 0.75rem;border:1px solid #ddd;background:none;border-radius:6px;font-size:0.78rem;cursor:pointer;color:#666;">
                    Cancelar
                </button>
                <button onclick="window.guardarEdicionComentario(${commentId})"
                    style="padding:0.3rem 0.75rem;background:#324C89;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;color:white;font-weight:600;">
                    Guardar
                </button>
            </div>
        </div>
    `;
    document.getElementById(`editTextarea-${commentId}`)?.focus();
};

window.marcarQuitarGifComentario = function(commentId, btn) {
    window[`_quitarGifComentario_${commentId}`] = true;
    const gifImg = document.getElementById(`comentario-gif-${commentId}`);
    if (gifImg) gifImg.style.display = 'none';
    btn.textContent = 'Se va a quitar al guardar';
    btn.disabled = true;
    btn.style.opacity = '0.6';
};

window.cancelarEdicionComentario = function(commentId, textoOriginal) {
    const textarea = document.getElementById(`editTextarea-${commentId}`);
    if (!textarea) return;
    const contenedor = textarea.closest('[style*="flex-direction:column"]').parentElement;
    contenedor.innerHTML = `<span>${textoOriginal}</span>`;
};

window.guardarEdicionComentario = async function(commentId) {
    const textarea = document.getElementById(`editTextarea-${commentId}`);
    if (!textarea) return;
    const nuevoContenido = textarea.value.trim();
    if (!nuevoContenido) return;

    const quitarGif = window[`_quitarGifComentario_${commentId}`] === true;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}/edit`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: nuevoContenido, removeGif: quitarGif ? 'true' : 'false' })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'No se pudo guardar la edición');
            return;
        }

        // Actualizar el texto en el DOM
        const contenedorTexto = document.getElementById(`comentario-texto-${commentId}`);
        if (contenedorTexto) contenedorTexto.textContent = data.content;

        // Si se pidió quitar el GIF, sacarlo definitivamente del DOM
        if (quitarGif) {
            const gifImg = document.getElementById(`comentario-gif-${commentId}`);
            if (gifImg) gifImg.remove();
        }

        // Mostrar etiqueta editado en la fecha
        const fechaEl = contenedorTexto?.closest('.comentario-item')?.querySelector('.comentario-fecha');
        if (fechaEl && !fechaEl.querySelector('.editado-label')) {
            fechaEl.insertAdjacentHTML('beforeend',
                ' <span class="editado-label" style="font-size:0.7rem;color:#bbb;">(editado)</span>');
        }

        // Ocultar botón editar (ya fue editado)
        const btnEditar = contenedorTexto?.closest('.comentario-item')?.querySelector('button[title="Editar comentario"]');
        if (btnEditar) btnEditar.remove();

    } catch (e) {
        alert('Error al guardar la edición');
    }
};

window.editarRespuesta = function(replyId, btn) {
    const contenedorTexto = document.getElementById(`respuesta-texto-${replyId}`);
    if (!contenedorTexto) return;

    // Cerrar la caja de "escribir comentario nuevo" si estaba abierta
    const area = document.getElementById('areaEscritura');
    if (area && area.style.display !== 'none' && typeof window.cancelarComentario === 'function') {
        window.cancelarComentario();
    }

    // Cerrar cualquier form de respuesta abierto
    document.querySelectorAll('.reply-form').forEach(f => f.remove());

    // Cerrar cualquier OTRA edición abierta (solo una a la vez)
    document.querySelectorAll('#modalPelicula [data-texto-original]').forEach(el => {
        if (el !== contenedorTexto) {
            el.textContent = el.dataset.textoOriginal;
            delete el.dataset.textoOriginal;
        }
    });

    const textoActual = contenedorTexto.textContent.trim();
    contenedorTexto.dataset.textoOriginal = textoActual;

    const gifImg = document.getElementById(`respuesta-gif-${replyId}`);
    window[`_quitarGifRespuesta_${replyId}`] = false;

    contenedorTexto.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.4rem;width:100%;">
            <textarea id="editReplyTextarea-${replyId}"
                style="width:100%;box-sizing:border-box;padding:0.5rem;border:1.5px solid #324C89;border-radius:8px;font-size:0.85rem;font-family:inherit;resize:none;min-height:50px;"
                maxlength="2000">${textoActual}</textarea>
            ${gifImg ? `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-size:0.75rem;color:#888;">GIF adjunto —</span>
                <button onclick="window.marcarQuitarGifRespuesta(${replyId}, this)"
                    style="background:none;border:1px solid #ddd;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.72rem;cursor:pointer;color:#c0392b;">
                    Quitar GIF
                </button>
            </div>` : ''}
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
                <button onclick="window.cancelarEdicionRespuesta(${replyId})"
                    style="padding:0.25rem 0.65rem;border:1px solid #ddd;background:none;border-radius:6px;font-size:0.72rem;cursor:pointer;color:#666;">
                    Cancelar
                </button>
                <button onclick="window.guardarEdicionRespuesta(${replyId})"
                    style="padding:0.25rem 0.65rem;background:#324C89;border:none;border-radius:6px;font-size:0.72rem;cursor:pointer;color:white;font-weight:600;">
                    Guardar
                </button>
            </div>
        </div>
    `;
    document.getElementById(`editReplyTextarea-${replyId}`)?.focus();
};

window.marcarQuitarGifRespuesta = function(replyId, btn) {
    window[`_quitarGifRespuesta_${replyId}`] = true;
    const gifImg = document.getElementById(`respuesta-gif-${replyId}`);
    if (gifImg) gifImg.style.display = 'none';
    btn.textContent = 'Se va a quitar al guardar';
    btn.disabled = true;
    btn.style.opacity = '0.6';
};

window.cancelarEdicionRespuesta = function(replyId) {
    const contenedorTexto = document.getElementById(`respuesta-texto-${replyId}`);
    if (!contenedorTexto) return;
    contenedorTexto.textContent = contenedorTexto.dataset.textoOriginal || '';
};

window.guardarEdicionRespuesta = async function(replyId) {
    const textarea = document.getElementById(`editReplyTextarea-${replyId}`);
    if (!textarea) return;
    const nuevoContenido = textarea.value.trim();
    if (!nuevoContenido) return;

    const quitarGif = window[`_quitarGifRespuesta_${replyId}`] === true;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/comments/replies/${replyId}/edit`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: nuevoContenido, removeGif: quitarGif ? 'true' : 'false' })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'No se pudo guardar la edición');
            return;
        }

        const contenedorTexto = document.getElementById(`respuesta-texto-${replyId}`);
                        if (contenedorTexto) contenedorTexto.textContent = data.content;

                        if (quitarGif) {
                            const gifImg = document.getElementById(`respuesta-gif-${replyId}`);
                            if (gifImg) gifImg.remove();
                        }

                        const fechaEl = document.getElementById(`respuesta-fecha-${replyId}`);
                if (fechaEl && !fechaEl.querySelector('.editado-label')) {
                    fechaEl.insertAdjacentHTML('beforeend',
                        ' <span class="editado-label" style="color:#bbb;">(editado)</span>');
                }

                const btnEditar = document.querySelector(`[onclick="window.editarRespuesta(${replyId}, this)"]`);
                if (btnEditar) btnEditar.remove();
            } catch (e) {
                alert('Error de conexión al guardar la edición');
            }
        };

window.compartirPelicula = async function(movieId, titulo) {
    const urlOg  = `https://cinemarketer-backend-production.up.railway.app/api/movies/og/${movieId}`;
    const urlFront = `https://cinemarketer.com.ar/pelicula?id=${movieId}`;
    const texto = `Mirá lo que opina la comunidad sobre "${titulo}" 🎬`;

    if (navigator.share) {
        try {
            await navigator.share({ title: titulo, text: texto, url: urlOg });
        } catch (e) {
            // usuario canceló, no hacer nada
        }
    } else {
        try {
            await navigator.clipboard.writeText(urlFront);
            if (typeof showToast === 'function') {
                showToast('success', '¡Link copiado al portapapeles!');
            }
        } catch (e) {
            prompt('Copiá este link:', urlFront);
        }
    }
};

window.cerrarCajaRespuesta = function(commentId) {
    const form = document.querySelector(`#replies-${commentId} .reply-form`) ||
                 document.querySelector(`.reply-form`);
    if (form) form.remove();
};

// ==============================================
// DÓNDE VERLA
// ==============================================
window.abrirDondeVerla = async function(movieId, event) {
    if (event) event.stopPropagation();

    const overlay = document.getElementById('dondeVerlaOverlay');
    const panel   = document.getElementById('dondeVerlaPanel');
    const contenido = document.getElementById('dondeVerlaContenido');

    // Mover al body para escapar del stacking context del modal principal
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Centrado siempre en mobile o desde el modal; cerca del click en desktop desde el feed
    const desdeModal = event && event.currentTarget && event.currentTarget.id === 'btnDondeVerlaModal';
    const esMobile = window.innerWidth <= 768;
    if (event && !desdeModal && !esMobile) {
        const rect = event.currentTarget.getBoundingClientRect();
        const panelW = 320;
        let left = rect.left;
        let top  = rect.bottom + 8;
        if (left + panelW > window.innerWidth - 16) left = window.innerWidth - panelW - 16;
        if (top + 300 > window.innerHeight) top = rect.top - 8 - 300;
        panel.style.left = left + 'px';
        panel.style.top  = top + 'px';
        panel.style.transform = 'none';
    } else {
        panel.style.left = '50%';
        panel.style.top  = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
    }

    overlay.style.display = 'block';
    panel.style.display   = 'block';
    document.body.style.overflow = 'hidden';
    contenido.innerHTML   = '<div style="text-align:center;padding:1rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}/watch-providers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const ar = data.results && data.results.AR;
        if (!ar) {
            contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:0.5rem 0;">No hay información de disponibilidad para Argentina.</p>';
            return;
        }

        const categorias = [
            { key: 'flatrate', label: 'Streaming' },
            { key: 'rent',     label: 'Alquiler'  },
            { key: 'buy',      label: 'Compra'    }
        ];

        let html = '';
        categorias.forEach(({ key, label }) => {
            if (!ar[key] || ar[key].length === 0) return;
            html += `<div style="margin-bottom:1rem;">
                <p style="font-size:0.75rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 0.5rem;">${label}</p>
                <div style="display:flex;flex-wrap:wrap;gap:0.6rem;">
                    ${ar[key].map(p => `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:60px;">
                            <img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="${p.provider_name}"
                                 style="width:44px;height:44px;border-radius:10px;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,0.15);"
                                 onerror="this.style.display='none'">
                            <span style="font-size:0.65rem;color:#555;text-align:center;line-height:1.2;">${p.provider_name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        });

        if (!html) {
            contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:0.5rem 0;">No hay información de disponibilidad para Argentina.</p>';
        } else {
            contenido.innerHTML = html;
        }

    } catch(e) {
        contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:0.5rem 0;">No se pudo cargar la información.</p>';
    }
};

window.cerrarDondeVerla = function() {
    document.getElementById('dondeVerlaOverlay').style.display = 'none';
    document.getElementById('dondeVerlaPanel').style.display   = 'none';
    document.body.style.overflow = '';
};

// ==============================================
// ELENCO & DIRECCIÓN
// ==============================================
window._elencoData = { cast: [], crew: [] };
window._elencoTab = 'cast';

window.cargarElenco = async function(movieId) {
    const seccion = document.getElementById('elencoSeccion');
    const track = document.getElementById('elencoTrack');
    if (!seccion || !track) return;

    track.innerHTML = '<div style="padding:1rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></div>';
    seccion.style.display = 'block';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}/credits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const cast = (data.cast || []).slice(0, 12);
        const crew = (data.crew || [])
            .filter(p => ['Director', 'Producer', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'].includes(p.job))
            .slice(0, 12);

        if (cast.length === 0 && crew.length === 0) {
            seccion.style.display = 'none';
            return;
        }

        window._elencoData = { cast, crew };
        window._elencoTab = 'cast';
        window.renderElencoTab('cast');

    } catch(e) {
        seccion.style.display = 'none';
    }
};

window.renderElencoTab = function(tab) {
    const track = document.getElementById('elencoTrack');
    if (!track) return;

    const personas = window._elencoData[tab] || [];
    if (personas.length === 0) {
        track.innerHTML = '<p style="font-size:0.82rem;color:#999;padding:0.5rem;">Sin información disponible.</p>';
        return;
    }

    track.innerHTML = personas.map(p => {
        const foto = p.profile_path
            ? `https://image.tmdb.org/t/p/w185${p.profile_path}`
            : null;
        const inicial = (p.name || '?').charAt(0).toUpperCase();
        const avatarHtml = foto
            ? `<img src="${foto}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="elenco-inicial" style="display:none;">${inicial}</div>`
            : `<div class="elenco-inicial">${inicial}</div>`;
        const subtitulo = tab === 'cast' ? (p.character || '') : (p.job || '');
                const mid = window.peliculaActualId || 0;
                return `
                <div class="elenco-item" onclick="window.abrirActorModal(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', ${mid})">
                <div class="elenco-foto">${avatarHtml}</div>
                <p class="elenco-nombre">${p.name || ''}</p>
                <p class="elenco-rol">${subtitulo}</p>
            </div>`;
    }).join('');
};

window.switchElencoTab = function(tab) {
    window._elencoTab = tab;
    document.getElementById('tabElenco').classList.toggle('active', tab === 'cast');
    document.getElementById('tabDireccion').classList.toggle('active', tab === 'crew');
    window.renderElencoTab(tab);
};

window.scrollElenco = function(dir) {
    const track = document.getElementById('elencoTrack');
    if (!track) return;
    const item = track.querySelector('.elenco-item');
    const w = item ? item.offsetWidth + 10 : 90;
    track.scrollBy({ left: dir * w * 3, behavior: 'smooth' });
};

// ==============================================
// MINI MODAL ACTOR
// ==============================================
window._elencoMovieId = null;

window.abrirActorModal = async function(personId, nombre, movieId) {
    const overlay  = document.getElementById('actorOverlay');
    const panel    = document.getElementById('actorPanel');
    const nombreEl = document.getElementById('actorPanelNombre');
    const contenido = document.getElementById('actorPanelContenido');

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    const desdeModal = !!window.peliculaActualId;
    const volverBtn = (movieId && !desdeModal)
        ? `<button onclick="window.volverAlElenco(${movieId})" style="background:none;border:none;color:rgba(255,255,255,0.8);font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;"><i class="fas fa-arrow-left"></i> Volver</button>`
        : '';

    nombreEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">${volverBtn}<span>${nombre}</span></div>`;
    overlay.style.display = 'block';
    panel.style.display   = 'block';
    panel.style.left = '50%';
    panel.style.top  = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    document.body.style.overflow = 'hidden';

    contenido.innerHTML = '<div style="text-align:center;padding:2rem;color:#ccc;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const [detRes, credRes] = await Promise.all([
            fetch(`${CONFIG.API_URL}/movies/person/${personId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CONFIG.API_URL}/movies/person/${personId}/credits`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const det  = detRes.ok  ? await detRes.json()  : {};
        const cred = credRes.ok ? await credRes.json() : {};

        const fotoSrc = det.profile_path ? `https://image.tmdb.org/t/p/w185${det.profile_path}` : null;
        const foto = fotoSrc
        ? `<img src="${fotoSrc}" style="width:80px;height:110px;object-fit:cover;border-radius:10px;cursor:zoom-in;" onclick="window.abrirFotoActor('https://image.tmdb.org/t/p/w342${det.profile_path}', '${(det.name||nombre).replace(/'/g,"\\'")}')" onerror="this.style.display='none'">`
        : `<div style="width:80px;height:110px;border-radius:10px;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#999;">${(det.name||nombre||'?').charAt(0)}</div>`;

        const bio = det.biography
            ? (det.biography.length > 300 ? det.biography.substring(0, 300) + '...' : det.biography)
            : 'Sin biografía disponible.';

        const peliculas = (cred.cast || [])
            .filter(p => p.poster_path)
            .sort((a,b) => (b.popularity||0) - (a.popularity||0))
            .slice(0, 8);

        const filmografiaHtml = peliculas.length > 0
            ? `<div style="margin-top:1rem;">
                <p style="font-size:0.75rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 0.5rem;">Filmografía destacada</p>
                <div style="display:flex;align-items:center;gap:6px;">
                    <button class="elenco-arrow" id="filmografiaArrowLeft" onclick="window.scrollFilmografia(-1)" style="display:none;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div id="filmografiaTrack" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;flex:1;">
                        ${peliculas.map(p => `
                            <div style="flex-shrink:0;width:56px;cursor:pointer;" onclick="window.cerrarActorModal();setTimeout(()=>window.abrirDetallePelicula(${p.id}),200)">
                                <img src="https://image.tmdb.org/t/p/w92${p.poster_path}" style="width:56px;height:82px;object-fit:cover;border-radius:6px;display:block;">
                                <p style="margin:4px 0 0;font-size:0.65rem;color:#555;text-align:center;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.title||''}</p>
                            </div>`).join('')}
                    </div>
                    <button class="elenco-arrow" id="filmografiaArrowRight" onclick="window.scrollFilmografia(1)" style="display:none;">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
               </div>`
            : '';

        const nacimiento = det.birthday
            ? `<p style="margin:2px 0;font-size:0.78rem;color:#888;"><i class="fas fa-birthday-cake" style="width:14px;color:#324C89;"></i> ${det.birthday}</p>`
            : '';
        const lugar = det.place_of_birth
            ? `<p style="margin:2px 0;font-size:0.78rem;color:#888;"><i class="fas fa-map-marker-alt" style="width:14px;color:#324C89;"></i> ${det.place_of_birth}</p>`
            : '';

        contenido.innerHTML = `
            <div style="display:flex;gap:12px;margin-bottom:0.75rem;">
                ${foto}
                <div style="flex:1;">
                    <p style="margin:0 0 6px;font-size:1rem;font-weight:700;color:#1a1a1a;">${det.name || nombre}</p>
                    ${nacimiento}${lugar}
                </div>
            </div>
            <div style="border-top:1px solid #f0f0f0;padding-top:0.75rem;">
                <p style="font-size:0.75rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 0.4rem;">Biografía</p>
                <p style="font-size:0.82rem;color:#555;line-height:1.6;margin:0;">${bio}</p>
            </div>
            ${filmografiaHtml}
        `;

    // Mostrar flechas solo en desktop
            if (window.innerWidth > 768) {
                const arrowL = document.getElementById('filmografiaArrowLeft');
                const arrowR = document.getElementById('filmografiaArrowRight');
                if (arrowL) arrowL.style.display = 'flex';
                if (arrowR) arrowR.style.display = 'flex';
            }

        } catch(e) {
            contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:1rem;">No se pudo cargar la información.</p>';
        }
    };

window.cerrarActorModal = function() {
    document.getElementById('actorOverlay').style.display = 'none';
    document.getElementById('actorPanel').style.display   = 'none';
    document.body.style.overflow = '';
};

window.abrirElencoCard = async function(movieId, event) {
    if (event) event.stopPropagation();
    window._elencoCardMovieId = movieId;

    const overlay  = document.getElementById('actorOverlay');
    const panel    = document.getElementById('actorPanel');
    const nombreEl = document.getElementById('actorPanelNombre');
    const contenido = document.getElementById('actorPanelContenido');

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    nombreEl.textContent = 'Elenco y dirección';
    overlay.style.display = 'block';
    panel.style.display   = 'block';
    panel.style.left = '50%';
    panel.style.top  = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    document.body.style.overflow = 'hidden';

    contenido.innerHTML = '<div style="text-align:center;padding:2rem;color:#ccc;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}/credits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const cast = (data.cast || []).slice(0, 12);
        const crew = (data.crew || [])
            .filter(p => ['Director','Producer','Screenplay','Writer','Director of Photography','Original Music Composer'].includes(p.job))
            .slice(0, 12);

        window._elencoData = { cast, crew };
        contenido.innerHTML = `
            <div style="margin-bottom:0.75rem;">
                <div style="display:flex;gap:0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:0.75rem;">
                    <button id="elencoCardTabCast" onclick="window.renderElencoCardTab('cast')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:#324C89;color:white;cursor:pointer;">Elenco</button>
                    <button id="elencoCardTabCrew" onclick="window.renderElencoCardTab('crew')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:white;color:#888;cursor:pointer;">Dirección</button>
                </div>
                <div id="elencoCardTrack" style="display:flex;flex-wrap:wrap;gap:12px;"></div>
            </div>`;

        window.renderElencoCardTab('cast');

    } catch(e) {
        contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:1rem;">No se pudo cargar el elenco.</p>';
    }
};

window.renderElencoCardTab = function(tab) {
    document.getElementById('elencoCardTabCast').style.background = tab === 'cast' ? '#324C89' : 'white';
    document.getElementById('elencoCardTabCast').style.color = tab === 'cast' ? 'white' : '#888';
    document.getElementById('elencoCardTabCrew').style.background = tab === 'crew' ? '#324C89' : 'white';
    document.getElementById('elencoCardTabCrew').style.color = tab === 'crew' ? 'white' : '#888';

    const personas = window._elencoData[tab] || [];
    const track = document.getElementById('elencoCardTrack');
    if (!track) return;

    if (personas.length === 0) {
        track.innerHTML = '<p style="font-size:0.82rem;color:#999;">Sin información disponible.</p>';
        return;
    }

    track.innerHTML = personas.map(p => {
        const foto = p.profile_path
            ? `<img src="https://image.tmdb.org/t/p/w185${p.profile_path}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
            : '';
        const inicial = (p.name || '?').charAt(0).toUpperCase();
        const subtitulo = tab === 'cast' ? (p.character || '') : (p.job || '');
        return `
            <div onclick="window.abrirActorModal(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', window._elencoCardMovieId)
" style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;cursor:pointer;">
                <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;border:2px solid #e0e0e0;background:#324C89;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:white;">
                    ${foto || inicial}
                </div>
                <p style="margin:0;font-size:0.68rem;font-weight:600;color:#333;text-align:center;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;width:64px;">${p.name||''}</p>
                <p style="margin:0;font-size:0.62rem;color:#999;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:64px;">${subtitulo}</p>
            </div>`;
    }).join('');
};

window.volverAlElenco = async function(movieId) {
    if (window._elencoCardMovieId === movieId) {
        await window.abrirElencoCard(movieId, null);
    } else {
        const panel    = document.getElementById('actorPanel');
        const nombreEl = document.getElementById('actorPanelNombre');
        const contenido = document.getElementById('actorPanelContenido');
        nombreEl.innerHTML = '👥 Elenco y dirección';
        contenido.innerHTML = `
            <div style="margin-bottom:0.75rem;">
                <div style="display:flex;gap:0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:0.75rem;">
                    <button id="elencoCardTabCast" onclick="window.renderElencoCardTab('cast')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:#324C89;color:white;cursor:pointer;">Elenco</button>
                    <button id="elencoCardTabCrew" onclick="window.renderElencoCardTab('crew')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:white;color:#888;cursor:pointer;">Dirección</button>
                </div>
                <div id="elencoCardTrack" style="display:flex;flex-wrap:wrap;gap:12px;"></div>
            </div>`;
        window.renderElencoCardTab(window._elencoTab || 'cast');
    }
};

window.scrollFilmografia = function(dir) {
    const track = document.getElementById('filmografiaTrack');
    if (!track) return;
    const item = track.querySelector('div');
    const w = item ? item.offsetWidth + 8 : 64;
    track.scrollBy({ left: dir * w * 3, behavior: 'smooth' });
};

window.abrirFotoActor = function(src, nombre) {
    const overlay = document.createElement('div');
    overlay.id = 'fotoActorOverlay';
    overlay.onclick = () => overlay.remove();
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:1rem;';

    overlay.innerHTML = `
        <div style="position:relative;max-width:320px;width:100%;">
            <button onclick="document.getElementById('fotoActorOverlay').remove()"
                    style="position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;background:white;border:none;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:1;">×</button>
            <img src="${src}" alt="${nombre}"
                 style="width:100%;border-radius:12px;display:block;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
            <p style="text-align:center;color:white;font-size:0.85rem;font-weight:600;margin:0.6rem 0 0;">${nombre}</p>
        </div>`;

    document.body.appendChild(overlay);
};

window.mostrarSeriesProximamente = function() {
    if (typeof showToast === 'function') {
        showToast('info', '¡Series está en camino! Próximamente 📺');
    } else {
        alert('Próximamente');
    }
};