// ==============================================
// feed-series.js — Feed de Series (filas por género)
// Calcado del motor de feed-films.js, endpoints propios de /api/series
// ==============================================

window._filasSeries = [];
window._filasSeriesCargadas = false;

window.cargarFilasSeries = async function() {
    const cont = document.getElementById('filasSeriesContainer');
    if (!cont) return;

    if (window._filasSeriesCargadas) {
        renderPillsFilasSerie();
        renderFilasSeries();
        return;
    }

    const fijas = [
        { key: 'fecha', label: '🔥 Más populares', tipo: 'fijo' },
        { key: 'proximamente', label: '📅 Al aire hoy', tipo: 'fijo' },
        { key: 'votos', label: '👍 Más votadas', tipo: 'fijo' }
    ];

    let generos = [];
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/genres`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const iconosPorGenero = {
                            'Acción y Aventura': '💥', 'Animación': '🎨', 'Comedia': '😂',
                            'Crimen': '🔪', 'Documental': '🎥', 'Drama': '🎭', 'Familia': '👨‍👩‍👧',
                            'Kids': '🧒', 'Misterio': '🔎', 'Noticias': '📰', 'Reality': '🎪',
                            'Ciencia ficción y Fantasía': '🚀', 'Soap': '💔', 'Talk': '🎤',
                            'Guerra y Política': '⚔️', 'Western': '🤠',
                            'Action & Adventure': '💥', 'Sci-Fi & Fantasy': '🚀', 'War & Politics': '⚔️'
                        };
                        const traduccionesGeneroSerie = {
                            'Kids': 'Infantil',
                            'Action & Adventure': 'Acción y Aventura',
                            'Sci-Fi & Fantasy': 'Ciencia Ficción',
                            'Soap': 'Telenovela',
                            'Talk': 'Programas',
                            'War & Politics': 'Bélico'
                        };
                        generos = (data.genres || [])
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                            .map(g => ({
                                key: `genero-${g.id}`,
                                label: `${iconosPorGenero[g.name] || '🎞️'} ${traduccionesGeneroSerie[g.name] || g.name}`,
                                tipo: 'genero',
                                generoId: g.id
                            }));
        }
    } catch (e) {}

    window._filasSeries = [...fijas, ...generos].map(f => ({ ...f, series: [], cargado: false, pagina: 1, finDelCatalogo: false, cargandoMas: false }));
        window._filasSeriesCargadas = true;

        renderPillsFilasSerie();
        renderFilasSeries();
    };

    function renderPillsFilasSerie() {
            const pillsCont = document.getElementById('ordenarPillsSerie');
            if (!pillsCont) return;
            pillsCont.innerHTML = window._filasSeries.map((f, i) =>
                `<button class="pill-orden${i === 0 ? ' active' : ''}" data-key="${f.key}" onclick="window.priorizarFilaGeneroSerie('${f.key}', this)">${f.label}</button>`
            ).join('');
            pillsCont.style.display = '';
            if (typeof activarDragScrollPills === 'function') activarDragScrollPills(pillsCont);
        }

    window.priorizarFilaGeneroSerie = function(key, btn) {
        document.querySelectorAll('#ordenarPillsSerie .pill-orden').forEach(p => p.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const idx = window._filasSeries.findIndex(f => f.key === key);
        if (idx > 0) {
            const [fila] = window._filasSeries.splice(idx, 1);
            window._filasSeries.unshift(fila);
        }
        renderFilasSeries();

        const cont = document.getElementById('filasSeriesContainer');
        if (cont) {
            const header = document.querySelector('header');
            const offset = (header ? header.offsetHeight : 70) + 16;
            const top = cont.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'auto' });
        }
    };

function renderFilasSeries() {
    const cont = document.getElementById('filasSeriesContainer');
    if (!cont) return;

    window._filasSeries.forEach(f => {
        let el = document.getElementById(`fila-serie-${f.key}`);
        if (!el) {
            el = document.createElement('div');
            el.className = 'fila-genero fila-serie';
            el.id = `fila-serie-${f.key}`;
            el.dataset.key = f.key;
            el.innerHTML = `
                <p class="fila-genero-titulo">${f.label}</p>
                <div class="fila-genero-viewport">
                    <button class="fila-genero-nav fila-genero-nav-prev" onclick="window.moverFilaSerie('${f.key}', -1)" aria-label="Anterior"><i class="fas fa-chevron-left"></i></button>
                    <div class="fila-genero-track" id="filaSerieTrack-${f.key}">
                        <div class="fila-genero-loading"><i class="fas fa-spinner fa-spin"></i></div>
                    </div>
                    <button class="fila-genero-nav fila-genero-nav-next" onclick="window.moverFilaSerie('${f.key}', 1)" aria-label="Siguiente"><i class="fas fa-chevron-right"></i></button>
                </div>`;
            const trackNuevo = el.querySelector('.fila-genero-track');
            activarSwipeManualSerie(trackNuevo);
            configurarScrollFilaSerie(f, trackNuevo);
            trackNuevo.addEventListener('click', () => fijarPosicionActualSerie(trackNuevo), true);
        }
        cont.appendChild(el);
    });

    configurarLazyLoadFilasSeries();

    if (window._filasSeries[0] && !window._filasSeries[0].cargado) {
        cargarSeriesFila(window._filasSeries[0]);
    }
}

let _observerFilasSeries = null;
function configurarLazyLoadFilasSeries() {
    if (_observerFilasSeries) _observerFilasSeries.disconnect();
    _observerFilasSeries = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const fila = window._filasSeries.find(f => f.key === entry.target.dataset.key);
            if (!fila) return;

            if (entry.isIntersecting) {
                if (!fila.cargado) cargarSeriesFila(fila);
                const track = document.getElementById(`filaSerieTrack-${fila.key}`);
                if (track) iniciarGuinoIntermitenteSerie(fila, track);
            } else {
                detenerGuinoIntermitenteSerie(fila);
            }
        });
    }, { rootMargin: '200px' });

    document.querySelectorAll('.fila-serie').forEach(el => _observerFilasSeries.observe(el));
}

function activarSwipeManualSerie(track) {
    track.addEventListener('touchstart', () => {
        track.dataset.dragging = '1';
        track._scrollToken = (track._scrollToken || 0) + 1;
        if (track._guinoTimeouts) {
            track._guinoTimeouts.forEach(id => clearTimeout(id));
            track._guinoTimeouts = [];
        }
        track.style.scrollSnapType = 'x mandatory';
    }, { passive: true });

    track.addEventListener('touchend', () => {
        track.dataset.dragging = '0';
    }, { passive: true });
}

window.moverFilaSerie = function(key, direccion) {
    const track = document.getElementById(`filaSerieTrack-${key}`);
    if (!track) return;
    track.scrollBy({ left: direccion * track.clientWidth * 0.9, behavior: 'smooth' });
};

function esValidaSerie(s, esProximamente, anioActual) {
    if (!s.poster_path || !s.overview || s.overview.trim() === '') return false;
    const anio = s.first_air_date ? new Date(s.first_air_date).getFullYear() : null;
    return esProximamente ? true : (!anio || anio <= anioActual);
}

async function cargarSeriesFila(fila) {
    fila.cargado = true;
    const token = localStorage.getItem('token');
    const anioActual = new Date().getFullYear();

    try {
        let resultados = [];

        if (fila.key === 'fecha') {
            const res = await fetch(`${CONFIG.API_URL}/series/popular?page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            resultados = (data.results || []).filter(s => esValidaSerie(s, false, anioActual));

        } else if (fila.key === 'proximamente') {
            const res = await fetch(`${CONFIG.API_URL}/series/airing-today?page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            resultados = (data.results || []).filter(s => esValidaSerie(s, true, anioActual));

        } else if (fila.key === 'votos') {
            const res = await fetch(`${CONFIG.API_URL}/series/popular?page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const pool = (data.results || []).filter(s => esValidaSerie(s, false, anioActual)).slice(0, 15);

            const conVotos = await Promise.all(pool.map(async s => {
                try {
                    const r = await fetch(`${CONFIG.API_URL}/public/series/${s.id}/stats`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const stats = r.ok ? await r.json() : { likes: 0, dislikes: 0 };
                    return { ...s, _totalVotos: (stats.likes || 0) + (stats.dislikes || 0) };
                } catch (e) {
                    return { ...s, _totalVotos: 0 };
                }
            }));
            resultados = conVotos.sort((a, b) => b._totalVotos - a._totalVotos);

        } else if (fila.tipo === 'genero') {
            const res = await fetch(`${CONFIG.API_URL}/series/search?withGenres=${fila.generoId}&page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            resultados = (data.results || []).filter(s => esValidaSerie(s, false, anioActual));
        }

        // Evitar que el primer poster de esta fila ya haya sido "primero"
                // en otra fila — sensación de contenido siempre nuevo, sobre todo
                // en mobile donde solo se ve una card a la vez por fila.
                window._primerosSeriesUsados = window._primerosSeriesUsados || new Set();
                if (resultados.length > 1 && window._primerosSeriesUsados.has(resultados[0].id)) {
                    const idxAlternativo = resultados.findIndex(s => !window._primerosSeriesUsados.has(s.id));
                    if (idxAlternativo > 0) {
                        const [elegida] = resultados.splice(idxAlternativo, 1);
                        resultados.unshift(elegida);
                    }
                }
                if (resultados.length > 0) {
                    window._primerosSeriesUsados.add(resultados[0].id);
                }

                fila.series = resultados.slice(0, 15);
                await renderCardsFilaSerie(fila);

    } catch (e) {
        const track = document.getElementById(`filaSerieTrack-${fila.key}`);
        if (track) track.innerHTML = '<div class="fila-genero-vacia">No pudimos cargar esta sección.</div>';
    }
}

function generarTarjetaSerieHTML(serie) {
    const posterUrl = serie.poster_path
        ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
        : 'https://via.placeholder.com/300x450?text=Sin+imagen';
    const year = serie.first_air_date
        ? new Date(serie.first_air_date).getFullYear()
        : 'Próximamente';
    const overview = serie.overview
        ? serie.overview.substring(0, 110) + '...'
        : 'Sinopsis no disponible';
    const tituloEscapado = (serie.name || '').replace(/'/g, "\\'");

    return `
        <div class="serie-card" data-id="${serie.id}" onclick="window.abrirDetalleSerie(${serie.id})" style="cursor:pointer;">
            <div class="serie-poster">
                <img src="${posterUrl}" alt="${serie.name || ''}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=Error+imagen'">
                <div class="serie-overlay">
                    <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;">
                        <span class="total-votos" id="totalVotosSerie-${serie.id}">0%</span>
                        <button class="btn-donde-verla-overlay" onclick="event.stopPropagation(); window.abrirDondeVerlaSerie(${serie.id}, event)" title="Dónde verla">
                            <i class="fas fa-tv"></i>
                        </button>
                        <button class="btn-donde-verla-overlay" onclick="event.stopPropagation(); window.abrirElencoCardSerie(${serie.id}, event)" title="Elenco y dirección">
                            <i class="fas fa-users"></i>
                        </button>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        <span class="año">${year}</span>
                        <button class="btn-watchlist-serie" data-serie-id="${serie.id}" onclick="event.stopPropagation(); window.toggleWatchlistSerie(${serie.id}, event)" title="Guardar en mi lista" style="background:rgba(0,0,0,0.5);border:none;color:white;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px);transition:background 0.2s;">
                            <i class="fas fa-bookmark" style="font-size:0.85rem;"></i>
                        </button>
                        <button onclick="event.stopPropagation(); window.compartirSerie(${serie.id}, '${tituloEscapado}')" title="Compartir" style="background:rgba(0,0,0,0.5);border:none;color:white;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px);">
                                <i class="fas fa-share-alt" style="font-size:0.85rem;"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.abrirPanelRecomendarSerie(${serie.id}, event)" title="Recomendar" style="background:rgba(0,0,0,0.5);border:none;color:white;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px);">
                                                        <i class="fas fa-envelope" style="font-size:0.85rem;"></i>
                                                    </button>
                        </div>
                    </div>
                </div>
                <div class="serie-info">
                    <h3 class="serie-titulo">${serie.name || ''}</h3>
                    <p class="serie-descripcion">${overview} <span class="ver-mas" onclick="event.stopPropagation(); window.abrirDetalleSerie(${serie.id})">Ver más</span></p>
                    <div class="votacion-container" id="votacion-serie-${serie.id}">
                        <div class="votacion-buttons">
                            <button class="btn-like" onclick="event.stopPropagation(); window.votarSerie(${serie.id}, 'like', event)"><i class="fas fa-thumbs-up"></i> 0</button>
                            <button class="btn-dislike" onclick="event.stopPropagation(); window.votarSerie(${serie.id}, 'dislike', event)"><i class="fas fa-thumbs-down"></i> 0</button>
                            <button class="btn-comentarios-card" onclick="event.stopPropagation(); window.abrirDetalleSerie(${serie.id})" title="Comentarios">
                                <i class="fas fa-comment"></i> <span id="comentarios-card-serie-${serie.id}" class="comentarios-count">0</span>
                            </button>
                        </div>
                    </div>
            </div>
        </div>`;
}

async function renderCardsFilaSerie(fila) {
    const track = document.getElementById(`filaSerieTrack-${fila.key}`);
    if (!track) return;

    if (fila.series.length === 0) {
        track.innerHTML = '<div class="fila-genero-vacia">No encontramos series acá todavía.</div>';
        return;
    }

    track.innerHTML = '';
    fila.series.forEach(serie => {
        const slide = document.createElement('div');
        slide.className = 'fila-genero-slide';
        slide.innerHTML = generarTarjetaSerieHTML(serie);
        track.appendChild(slide);
    });

    renderDotsFilaSerie(fila);
    window.cargarEstadisticasVotacionSeries();
}

function reiniciarGuinoTimerSerie(fila, track) {
    if (fila.guinoTimeout) clearTimeout(fila.guinoTimeout);
    fila.guinoTimeout = setTimeout(() => {
        dispararGuinoSerie(track);
        reiniciarGuinoTimerSerie(fila, track);
    }, 5000);
}

function iniciarGuinoIntermitenteSerie(fila, track) {
    if (fila.guinoTimeout) return;
    reiniciarGuinoTimerSerie(fila, track);
}

function detenerGuinoIntermitenteSerie(fila) {
    if (fila.guinoTimeout) {
        clearTimeout(fila.guinoTimeout);
        fila.guinoTimeout = null;
    }
}

function animarScrollTrackSerie(track, destino, duracion) {
    track._scrollToken = (track._scrollToken || 0) + 1;
    const miToken = track._scrollToken;
    const inicio = track.scrollLeft;
    const delta = destino - inicio;
    const t0 = performance.now();
    function paso(t) {
        if (track._scrollToken !== miToken) return;
        const p = Math.min((t - t0) / duracion, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        track.scrollLeft = inicio + delta * ease;
        if (p < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
}

function dispararGuinoSerie(track) {
    if (track.dataset.dragging === '1') return;
    if (track.scrollWidth <= track.clientWidth + 2) return;

    const base = track.scrollLeft;
    const distancia = 46;
    track.style.scrollSnapType = 'none';

    animarScrollTrackSerie(track, base + distancia, 500);

    const t1 = setTimeout(() => {
        animarScrollTrackSerie(track, base, 500);
        const t2 = setTimeout(() => {
            if (track.dataset.dragging !== '1') track.style.scrollSnapType = 'x mandatory';
        }, 550);
        track._guinoTimeouts.push(t2);
    }, 1100);

    track._guinoTimeouts = track._guinoTimeouts || [];
    track._guinoTimeouts.push(t1);
}

function fijarPosicionActualSerie(track) {
    track._scrollToken = (track._scrollToken || 0) + 1;
    if (track._guinoTimeouts) {
        track._guinoTimeouts.forEach(id => clearTimeout(id));
        track._guinoTimeouts = [];
    }
    const ancho = track.clientWidth || 1;
    const indiceCercano = Math.round(track.scrollLeft / ancho);
    track.style.scrollSnapType = 'x mandatory';
    track.scrollLeft = indiceCercano * ancho;
}

function renderDotsFilaSerie(fila) {
    const el = document.getElementById(`fila-serie-${fila.key}`);
    if (!el) return;
    let dotsEl = el.querySelector('.fila-genero-dots');
    if (!dotsEl) {
        dotsEl = document.createElement('div');
        dotsEl.className = 'fila-genero-dots';
        el.appendChild(dotsEl);
    }
    const total = Math.min(fila.series.length, 8);
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
        `<span class="fila-genero-dot${i === 0 ? ' activo' : ''}"></span>`
    ).join('');
}

function configurarScrollFilaSerie(fila, track) {
    let ultimoIndice = -1;
    track.addEventListener('scroll', () => {
        const anchoCard = track.children[0]?.offsetWidth || track.clientWidth || 1;
        const indice = Math.round(track.scrollLeft / anchoCard);
        if (indice === ultimoIndice) return;
        ultimoIndice = indice;
        track._indiceActual = indice;

        if (fila.guinoTimeout) reiniciarGuinoTimerSerie(fila, track);
        actualizarDotActivoSerie(fila, indice);

        if (!fila.cargandoMas && !fila.finDelCatalogo && indice >= track.children.length - 3) {
            cargarMasSeriesFila(fila, track);
        }
    });
}

function actualizarDotActivoSerie(fila, indice) {
    const el = document.getElementById(`fila-serie-${fila.key}`);
    if (!el) return;
    const dots = el.querySelectorAll('.fila-genero-dot');
    if (dots.length === 0) return;
    const tope = dots.length - 1;
    const activo = Math.min(indice, tope);
    dots.forEach((d, i) => d.classList.toggle('activo', i === activo));
}

async function cargarMasSeriesFila(fila, track) {
    fila.cargandoMas = true;
    fila.pagina = (fila.pagina || 1) + 1;
    const token = localStorage.getItem('token');
    const anioActual = new Date().getFullYear();

    try {
        let nuevos = [];
        let totalPaginas = 1;

        if (fila.key === 'fecha') {
            const res = await fetch(`${CONFIG.API_URL}/series/popular?page=${fila.pagina}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            nuevos = (data.results || []).filter(s => esValidaSerie(s, false, anioActual));
            totalPaginas = data.total_pages || 1;

        } else if (fila.key === 'proximamente') {
            const res = await fetch(`${CONFIG.API_URL}/series/airing-today?page=${fila.pagina}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            nuevos = (data.results || []).filter(s => esValidaSerie(s, true, anioActual));
            totalPaginas = data.total_pages || 1;

        } else if (fila.key === 'votos') {
            const res = await fetch(`${CONFIG.API_URL}/series/popular?page=${fila.pagina}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            const pool = (data.results || []).filter(s => esValidaSerie(s, false, anioActual));
            nuevos = await Promise.all(pool.map(async s => {
                try {
                    const r = await fetch(`${CONFIG.API_URL}/public/series/${s.id}/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const stats = r.ok ? await r.json() : { likes: 0, dislikes: 0 };
                    return { ...s, _totalVotos: (stats.likes || 0) + (stats.dislikes || 0) };
                } catch (e) { return { ...s, _totalVotos: 0 }; }
            }));
            totalPaginas = data.total_pages || 1;

        } else if (fila.tipo === 'genero') {
            const res = await fetch(`${CONFIG.API_URL}/series/search?withGenres=${fila.generoId}&page=${fila.pagina}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            nuevos = (data.results || []).filter(s => esValidaSerie(s, false, anioActual));
            totalPaginas = data.total_pages || 1;
        }

        if (fila.pagina >= totalPaginas) fila.finDelCatalogo = true;

        const idsExistentes = new Set(fila.series.map(s => s.id));
        nuevos = nuevos.filter(s => !idsExistentes.has(s.id));

        if (nuevos.length > 0) {
            fila.series = [...fila.series, ...nuevos];
            await agregarCardsAFilaSerie(track, nuevos);
        }
    } catch (e) {
    } finally {
        fila.cargandoMas = false;
    }
}

async function agregarCardsAFilaSerie(track, nuevasSeries) {
    nuevasSeries.forEach(serie => {
        const slide = document.createElement('div');
        slide.className = 'fila-genero-slide';
        slide.innerHTML = generarTarjetaSerieHTML(serie);
        track.appendChild(slide);
    });
    window.cargarEstadisticasVotacionSeries();
}

// ==============================================
// VOTACIÓN
// ==============================================
window.votarSerie = async function(seriesId, tipo, event) {
    if (event) event.stopPropagation();
    if (!seriesId) return;

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Debés iniciar sesión para votar');
        return;
    }

    const voteType = tipo.toUpperCase();

    try {
        const response = await fetch(`${CONFIG.API_URL}/reviews/series/${seriesId}`, {
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
        if (typeof mostrarPuntosGanados === 'function') mostrarPuntosGanados(stats.pointsAwarded);
        if (typeof window.loadHeaderUserInfo === 'function') window.loadHeaderUserInfo();

        const totalVotos = (stats.likes || 0) + (stats.dislikes || 0);
        const porcentaje = totalVotos > 0 ? Math.round((stats.likes / totalVotos) * 100) : 0;

        if (event && event.target) {
                    const card = event.target.closest('.serie-card');
                    if (card) {
                        const btnLike    = card.querySelector('.btn-like');
                        const btnDislike = card.querySelector('.btn-dislike');
                        if (btnLike)    btnLike.innerHTML    = `<i class="fas fa-thumbs-up"></i> ${stats.likes}`;
                        if (btnDislike) btnDislike.innerHTML = `<i class="fas fa-thumbs-down"></i> ${stats.dislikes}`;
                        btnLike?.classList.toggle('votado', stats.userVoteType === 'LIKE');
                        btnDislike?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');

                        const porcentajeEl = card.querySelector(`#totalVotosSerie-${seriesId}`);
                        if (porcentajeEl) {
                            porcentajeEl.textContent = totalVotos === 0 ? '0%' : `${porcentaje}%`;
                        }
                    }

                    // Si el voto vino desde adentro del modal (los botones ahí no
                    // están dentro de una .serie-card), actualizar sus elementos.
                    const dentroDelModal = event.target.closest('#modalSerie');
                    if (dentroDelModal) {
                        const modalLikes    = document.getElementById('modalLikesSerie');
                        const modalDislikes = document.getElementById('modalDislikesSerie');
                        if (modalLikes)    modalLikes.textContent    = stats.likes || 0;
                        if (modalDislikes) modalDislikes.textContent = stats.dislikes || 0;

                        const btnLikeModal    = document.querySelector('#modalSerie .btn-like');
                        const btnDislikeModal = document.querySelector('#modalSerie .btn-dislike');
                        btnLikeModal?.classList.toggle('votado', stats.userVoteType === 'LIKE');
                        btnDislikeModal?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');

                        const leyendaEl = document.getElementById('modalLeyendaPorcentajeSerie');
                        if (leyendaEl) {
                            leyendaEl.textContent = porcentaje > 0
                                ? `Al ${porcentaje}% de los usuarios les gustó esta serie`
                                : '';
                        }
                    }
                }
            } catch (error) {
                alert('Error al registrar el voto. Intentá de nuevo.');
            }
        };

// NOTA: reviews/series/{id} — este endpoint todavía no existe en el
// backend (solo armamos /public/series/{id}/stats, de solo lectura).
// Falta un ReviewController (o su equivalente) para series con el
// método POST que otorgue el voto y los puntos — pendiente antes de
// probar esto en producción.
window.cargarEstadisticasVotacionSeries = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const cards = document.querySelectorAll('.serie-card[data-id]');
    if (!cards.length) return;

    const promesas = Array.from(cards).map(async card => {
        const seriesId = card.dataset.id;
        try {
            const response = await fetch(`${CONFIG.API_URL}/reviews/series/${seriesId}/stats`, {
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
            const porcentajeEl = card.querySelector(`#totalVotosSerie-${seriesId}`);
            if (porcentajeEl) {
                porcentajeEl.textContent = totalVotos === 0 ? '0%' : `${Math.round((stats.likes / totalVotos) * 100)}%`;
            }

            try {
                const commResponse = await fetch(`${CONFIG.API_URL}/series-comments/series/${seriesId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (commResponse.ok) {
                                    const comentarios = await commResponse.json();
                                    const contadorEl = card.querySelector(`#comentarios-card-serie-${seriesId}`);
                                    window._pintarContadorComentarios(contadorEl, comentarios.length);
                                }
            } catch (ce) {}
        } catch (e) {}
    });

    await Promise.all(promesas);
};

window.cargarComentariosSerie = async function(id) {
    window.cargarSpoilerCountSerie(id);

    let lista = document.getElementById('comentariosListaSerie');
    let intentos = 0;

    while (!lista && intentos < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        lista = document.getElementById('comentariosListaSerie');
        intentos++;
    }

    if (!lista) return;

    lista.innerHTML = '<div class="sin-comentarios">Cargando comentarios...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/series-comments/series/${id}?spoiler=${window.modoSpoilerActivoSerie}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar comentarios');
        const comentarios = await response.json();

        const modalComentariosCount = document.getElementById('modalComentariosCountSerie');
        if (modalComentariosCount) modalComentariosCount.innerHTML = `💬 <span class="modal-rating-num">${comentarios.length}</span><span class="modal-rating-label"> comentarios</span>`;

        const verMasCount = document.getElementById('verMasCountSerie');
        if (verMasCount) verMasCount.textContent = comentarios.length;

        const sheetCount = document.getElementById('comentariosSheetCountSerie');
        if (sheetCount) sheetCount.textContent = comentarios.length;

        const verMas = document.getElementById('verMasComentariosSerie');
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
                lista.appendChild(window._renderComentarioItemSerie(c));
            });
        }
    } catch (e) {
        lista.innerHTML = '<div class="sin-comentarios">Error al cargar comentarios.</div>';
    }
};

window._renderComentarioItemSerie = function(c) {
    const mostrarBoton = !c.ownComment;

    const btnReporte = mostrarBoton ? `
        <button
            onclick="${c.reportedByMe ? '' : `window.abrirModalReporteSerie(${c.id})`}"
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

    const esMioOcultar = c.ownComment;
    const btnOcultar = esMioOcultar ? `
        <button
            onclick="window.abrirModalOcultarSerie(${c.id})"
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
    item.id = `comment-serie-${c.id}`;
    item.style.cssText = 'display:flex; gap:0.75rem; padding:0.75rem 0; border-bottom:1px solid #f0f0f0; align-items:flex-start;';
    item.innerHTML = `
        <div class="comentario-avatar" style="flex-shrink:0;">
            ${c.avatarUrl
                ? `<img src="${c.avatarUrl}" alt="${c.userName}" style="width:36px;height:36px;object-fit:cover;border-radius:50%;cursor:pointer;" onclick="event.stopPropagation(); window.cerrarModalSerie(); window.abrirPerfilUsuario(${c.userId})">`
                : `<div style="width:36px;height:36px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:0.85rem;cursor:pointer;" onclick="event.stopPropagation(); window.cerrarModalSerie(); window.abrirPerfilUsuario(${c.userId})">${c.userName?.charAt(0) || 'U'}</div>`
            }
        </div>
        <div class="comentario-contenido" style="flex:1;min-width:0;width:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                <span class="comentario-autor" style="font-weight:600;font-size:0.85rem;color:#333;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;"
                      onclick="event.stopPropagation(); window.cerrarModalSerie(); window.abrirPerfilUsuario(${c.userId})">${c.userName || 'Usuario'}</span>
                <div style="display:flex;align-items:center;gap:0.2rem;flex-shrink:0;">
                    ${btnReporte}
                    ${btnOcultar}
                </div>
            </div>
            <div class="comentario-texto" id="comentario-texto-serie-${c.id}" style="font-size:0.9rem;color:#444;margin:0.25rem 0;word-break:break-word;">${c.content}</div>
            ${c.hasGif && c.gifUrl ? `<img id="comentario-gif-serie-${c.id}" src="${c.gifUrl}" alt="GIF" style="max-width:100%;max-height:200px;border-radius:8px;margin-top:0.4rem;display:block;">` : ''}
            ${c.ownComment ? `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.4rem;flex-wrap:wrap;gap:0.4rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <button onclick="window.toggleBancoSerie(${c.id}, this)"
                        data-active="${c.bancadoByMe}"
                        style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:${c.bancadoByMe ? '#1a3a6b' : '#999'};padding:0;transition:color 0.2s;"
                        title="Te banco">
                        <i class="fas fa-thumbs-up"></i>
                        <span class="banco-count-serie-${c.id}">${c.bancoCount || 0}</span>
                        <span style="font-size:0.75rem;">Te banco</span>
                    </button>
                    <button onclick="window.toggleRespuestasSerie(${c.id}, this, true)"
                        style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#999;padding:0;transition:color 0.2s;"
                        title="Responder">
                        <i class="fas fa-reply"></i>
                        <span class="btn-responder-label" style="font-size:0.75rem;">Responder</span>
                    </button>
                    ${(c.replyCount || 0) > 0 ? `
                    <button onclick="window.toggleRespuestasSerie(${c.id}, this, false)"
                        style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#1a3a6b;padding:0;transition:color 0.2s;"
                        title="Ver respuestas">
                        <span style="font-size:0.75rem;">— Ver respuestas (<span class="reply-count-btn-serie-${c.id}">${c.replyCount}</span>)</span>
                    </button>` : `<span class="reply-count-serie-${c.id}" style="display:none;">${c.replyCount || 0}</span>`}
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                        <div class="comentario-fecha" style="font-size:0.75rem;color:#999;">${new Date(c.createdAt).toLocaleString('es-ES', {
                                                                                              day: '2-digit', month: '2-digit', year: 'numeric',
                                                                                              hour: '2-digit', minute: '2-digit',
                                                                                              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                                                                          })}${c.editedAt ? ' <span style="font-size:0.7rem;color:#bbb;">(editado)</span>' : ''}</div>
                    ${c.canEdit ? `
                    <button onclick="window.editarComentarioSerie(${c.id}, this)"
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
                <button onclick="window.toggleBancoSerie(${c.id}, this)"
                    data-active="${c.bancadoByMe}"
                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:${c.bancadoByMe ? '#1a3a6b' : '#999'};padding:0;transition:color 0.2s;"
                    title="Te banco">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="banco-count-serie-${c.id}">${c.bancoCount || 0}</span>
                    <span style="font-size:0.75rem;">Te banco</span>
                </button>
                <button onclick="window.toggleMerecePuntoSerie(${c.id}, this, '${c.userName}')"
                    data-active="${c.merecePuntoByMe}"
                    data-locked="${c.merecePuntoLocked}"
                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:${c.merecePuntoByMe ? '#e8a800' : '#999'};padding:0;transition:color 0.2s;"
                    title="¡Merecés un punto!">
                    <i class="fas fa-star"></i>
                    <span class="merece-count-serie-${c.id}">${c.merecePuntoCount || 0}</span>
                    <span style="font-size:0.75rem;">¡Merecés un punto!</span>
                </button>
                <button onclick="window.toggleRespuestasSerie(${c.id}, this, true)"
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
                <button onclick="window.toggleRespuestasSerie(${c.id}, this, false)"
                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.8rem;color:#1a3a6b;padding:0;transition:color 0.2s;"
                    title="Ver respuestas">
                    <span style="font-size:0.75rem;">— Ver respuestas (<span class="reply-count-btn-serie-${c.id}">${c.replyCount}</span>)</span>
                </button>` : `<span class="reply-count-serie-${c.id}" style="display:none;">${c.replyCount || 0}</span>`}
            </div>
        </div>
        `}
                                <div class="replies-container-serie-${c.id}" style="display:none;margin-top:0.75rem;padding-left:1rem;border-left:2px solid #f0f0f0;"></div>
    </div>
    `;
    return item;
};

window.cargarSpoilerCountSerie = async function(id) {
    const badge = document.getElementById('spoilerCountBadgeSerie');
    if (!badge) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series-comments/series/${id}/spoiler-count`, {
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
// REACCIONES SERIE: TE BANCO
// ==============================================
window.toggleBancoSerie = async function(commentId, btn) {
    const token = localStorage.getItem('token');
    const counter = document.querySelector(`.banco-count-serie-${commentId}`);

    const estabaActivo = btn.dataset.active === 'true';
    const countPrevio = counter ? (parseInt(counter.textContent, 10) || 0) : 0;

    const nuevoActivo = !estabaActivo;
    btn.dataset.active = nuevoActivo;
    btn.style.color = nuevoActivo ? '#1a3a6b' : '#999';
    if (counter) counter.textContent = countPrevio + (nuevoActivo ? 1 : -1);

    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}/banco`, {
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

// ==============================================
// REACCIONES SERIE: ¡MERECÉS UN PUNTO!
// Reutiliza el modal #modalMerecePunto (compartido con Película) —
// reasigna el onclick del botón de confirmación al abrir, y lo
// restaura a la versión de Película al cerrar/terminar, para no
// tocar ni una línea de feed-films.js.
// ==============================================
window._merecePuntoSerieCommentId = null;
window._merecePuntoSerieBtn = null;
window._merecePuntoSerieAuthorName = null;

window.cerrarModalMerecePuntoGenerico = function() {
    const modal = document.getElementById('modalMerecePunto');
    if (modal) modal.style.display = 'none';

    // Limpia ambos flujos (Película y Serie) sin importar por cuál se entró
    window._merecePuntoCommentId = null;
    window._merecePuntoBtn = null;
    window._merecePuntoAuthorName = null;
    window._merecePuntoSerieCommentId = null;
    window._merecePuntoSerieBtn = null;
    window._merecePuntoSerieAuthorName = null;

    // Vuelve el botón al handler por defecto (Película)
    const btnConfirmar = document.getElementById('btnConfirmarMerecePunto');
    if (btnConfirmar) btnConfirmar.onclick = window.confirmarMerecePunto;
};

window.cerrarModalMerecePuntoSerie = window.cerrarModalMerecePuntoGenerico;

window.confirmarMerecePuntoSerie = async function() {
    const commentId = window._merecePuntoSerieCommentId;
    const btn = window._merecePuntoSerieBtn;
    const authorName = window._merecePuntoSerieAuthorName;
    if (!commentId) return;

    const btnConfirmar = document.getElementById('btnConfirmarMerecePunto');
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = 'Enviando...'; }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}/merece-punto`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        window.cerrarModalMerecePuntoSerie();

        if (res.status === 409 && data.alreadyGiven) {
            window.mostrarToast('Ya le diste un punto a este comentario.', 'info');
            if (btn) { btn.dataset.active = 'true'; btn.style.color = '#e8a800'; }
            return;
        }
        if (!res.ok) return;

        if (btn) { btn.dataset.active = 'true'; btn.style.color = '#e8a800'; }
        const counter = document.querySelector(`.merece-count-serie-${commentId}`);
        if (counter) counter.textContent = data.count;
        window.mostrarToast(`Le avisamos a ${authorName} que su comentario vale un punto extra este mes.`, 'success');

    } catch(e) {
        window.cerrarModalMerecePuntoSerie();
        console.error(e);
    } finally {
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Sí, dar punto'; }
    }
};

window.toggleMerecePuntoSerie = async function(commentId, btn, authorName) {
    if (btn.dataset.active === 'true') {
        window.mostrarToast('Ya le diste un punto a este comentario. Esta acción es irreversible.', 'info');
        return;
    }
    window._merecePuntoSerieCommentId = commentId;
    window._merecePuntoSerieBtn = btn;
    window._merecePuntoSerieAuthorName = authorName;
    const nombreEl = document.getElementById('merecePuntoAutorNombre');
    if (nombreEl) nombreEl.textContent = authorName;
    const btnConfirmar = document.getElementById('btnConfirmarMerecePunto');
    if (btnConfirmar) btnConfirmar.onclick = window.confirmarMerecePuntoSerie;
    const modal = document.getElementById('modalMerecePunto');
    if (modal) modal.style.display = 'flex';
};

// ==============================================
// RESPUESTAS SERIE: TOGGLE + CARGA + ENVÍO
// ==============================================
window.toggleRespuestasSerie = async function(commentId, btn, focusInput = false) {
    const container = document.querySelector(`.replies-container-serie-${commentId}`);
    if (!container) return;

    if (container.style.display !== 'none' && !focusInput) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    const soloLoader = container.innerHTML.trim() === '' ||
                       container.innerHTML.includes('Cargando...');
    if (soloLoader) {
        container.innerHTML = '<div style="font-size:0.8rem;color:#999;">Cargando...</div>';
        await window.cargarRespuestasSerie(commentId, 0);
    }

    if (focusInput) {
        setTimeout(() => window.abrirFormRespuestaSerie(commentId, null), 150);
    }
};

window.cargarRespuestasSerie = async function(commentId, offset) {
    const container = document.querySelector(`.replies-container-serie-${commentId}`);
    if (!container) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}/replies?offset=${offset}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const replies = await res.json();
        const hasMore = res.headers.get('X-Has-More') === 'true';
        const total = res.headers.get('X-Total-Replies') || '0';

        document.querySelectorAll(`.reply-count-serie-${commentId}, .reply-count-btn-serie-${commentId}`)
                    .forEach(el => el.textContent = total);

        if (offset === 0) container.innerHTML = '';

        if (replies.length === 0 && offset === 0) {
            container.innerHTML = '<div style="font-size:0.8rem;color:#999;">Sin respuestas aún.</div>';
        }

        replies.forEach(r => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid #f8f8f8;align-items:flex-start;';

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
                        <span style="font-weight:600;font-size:0.8rem;color:#333;cursor:pointer;" onclick="event.stopPropagation(); window.cerrarModalSerie(); window.abrirPerfilUsuario(${r.userId})">${r.userName}</span>
                        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                            ${!r.ownReply ? `
                            <button onclick="window.abrirModalReporteReplySerie(${r.id})"
                                style="background:none;border:none;cursor:pointer;font-size:0.75rem;
                                       color:#ccc;padding:2px 4px;transition:color 0.2s;"
                                onmouseover="this.style.color='#e50914'"
                                onmouseout="this.style.color='#ccc'"
                                title="Reportar respuesta">
                                <i class="fas fa-flag"></i>
                            </button>` : `
                            <button onclick="window.abrirModalOcultarReplySerie(${r.id})"
                                style="background:none;border:none;cursor:pointer;font-size:0.75rem;
                                       color:#ccc;padding:2px 4px;transition:color 0.2s;"
                                onmouseover="this.style.color='#e50914'"
                                onmouseout="this.style.color='#ccc'"
                                title="Ocultar mi respuesta">
                                <i class="fas fa-ban"></i>
                            </button>`}
                        </div>
                    </div>
                    <div class="respuesta-texto" id="respuesta-texto-serie-${r.id}" style="font-size:0.85rem;color:#444;margin:0.2rem 0;word-break:break-word;">${r.content}</div>
                            ${r.hasGif && r.gifUrl ? `<img id="respuesta-gif-serie-${r.id}" src="${r.gifUrl}" alt="GIF" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:0.3rem;display:block;">` : ''}
                            <div style="display:flex;align-items:center;gap:0.75rem;margin-top:0.3rem;">
                                <button onclick="window.toggleReplyBancoSerie(${r.id}, this)"
                                    data-active="${r.bancadoByMe}"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;
                                           font-size:0.75rem;color:${r.bancadoByMe ? '#1a3a6b' : '#999'};padding:0;">
                                    <i class="fas fa-thumbs-up"></i>
                                    <span class="reply-banco-count-serie-${r.id}">${r.bancoCount || 0}</span>
                                    <span>Te banco</span>
                                </button>
                                <button onclick="window.abrirFormRespuestaSerie(${commentId}, this, ${r.id})"
                                    style="background:none;border:none;cursor:pointer;font-size:0.75rem;color:#999;padding:0;">
                                    <i class="fas fa-reply"></i> Responder
                                </button>
                            </div>
                            <div style="display:flex;align-items:center;gap:0.5rem;margin-top:5px;">
                                <div class="respuesta-fecha" id="respuesta-fecha-serie-${r.id}" style="font-size:0.7rem;color:#bbb;">${new Date(r.createdAt).toLocaleString('es-ES', {
                                                                                 day: '2-digit', month: '2-digit', year: 'numeric',
                                                                                 hour: '2-digit', minute: '2-digit',
                                                                                 timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                                                             })}${r.editedAt ? ' <span class="editado-label" style="color:#bbb;">(editado)</span>' : ''}</div>
                                ${r.canEdit ? `
                                <button onclick="window.editarRespuestaSerie(${r.id}, this)"
                                    style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.7rem;color:#aaa;padding:0;">
                                    <i class="fas fa-pencil-alt"></i>
                                    <span>Editar</span>
                                </button>` : ''}
                            </div>
                        </div>
                    `;
            container.appendChild(div);
        });

        const existingVerMas = container.querySelector('.ver-mas-btn');
        if (existingVerMas) existingVerMas.remove();

        if (hasMore) {
            const verMas = document.createElement('button');
            verMas.className = 'ver-mas-btn';
            verMas.style.cssText = 'background:none;border:none;color:#1a3a6b;font-size:0.8rem;cursor:pointer;padding:0.4rem 0;width:100%;text-align:left;';
            verMas.textContent = 'Ver más respuestas...';
            verMas.onclick = () => window.cargarRespuestasSerie(commentId, offset + 5);
            container.appendChild(verMas);
        }

    } catch (e) {
        container.innerHTML = '<div style="font-size:0.8rem;color:#999;">Error al cargar respuestas.</div>';
    }
};

window.enviarRespuestaSerie = async function(commentId) {
    const input = document.getElementById(`reply-input-${commentId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content && !window._gifSeleccionadoReply) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}/replies`, {
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
        await window.cargarRespuestasSerie(commentId, 0);
    } catch (e) {
        window.mostrarToast('Error de conexión.', 'error');
    }
};

window.toggleReplyBancoSerie = async function(replyId, btn) {
    const token = localStorage.getItem('token');
    const counter = document.querySelector(`.reply-banco-count-serie-${replyId}`);

    const estabaActivo = btn.dataset.active === 'true';
    const countPrevio = counter ? (parseInt(counter.textContent, 10) || 0) : 0;

    const nuevoActivo = !estabaActivo;
    btn.dataset.active = nuevoActivo;
    btn.style.color = nuevoActivo ? '#1a3a6b' : '#999';
    if (counter) counter.textContent = countPrevio + (nuevoActivo ? 1 : -1);

    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/replies/${replyId}/banco`, {
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

window.abrirFormRespuestaSerie = function(commentId, btn, replyId = null) {
    window._replyingToReplyId = replyId;

    // Depende de window.cancelarComentarioSerie(), que llega en el
    // próximo bloque (envío de comentario / modo spoiler).
    if (typeof window.cancelarComentarioSerie === 'function') window.cancelarComentarioSerie();

    document.querySelectorAll('#modalSerie [data-texto-original]').forEach(el => {
        el.textContent = el.dataset.textoOriginal;
        delete el.dataset.textoOriginal;
    });

    const container = document.querySelector(`.replies-container-serie-${commentId}`);
    if (!container) return;

    const existing = container.querySelector('.reply-form');
    if (existing) {
        existing.remove();
        return;
    }

    document.querySelectorAll('#modalSerie .reply-form').forEach(f => f.remove());

    const form = document.createElement('div');
    form.className = 'reply-form';
    form.style.cssText = 'margin-top:0.5rem;display:flex;gap:0.5rem;';
        form.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:0.3rem;flex:1;">
                <textarea placeholder="Escribí tu respuesta..."
                style="flex:1;border:1px solid #e0e0e0;border-radius:12px;padding:0.4rem 0.75rem;font-size:0.85rem;outline:none;width:100%;box-sizing:border-box;resize:none;min-height:60px;font-family:inherit;"
                id="reply-input-${commentId}"
                maxlength="2000"
                onkeydown="if(event.key==='Enter' && window.innerWidth > 768 && !event.shiftKey) { event.preventDefault(); const val=this.value; const start=this.selectionStart; const end=this.selectionEnd; this.value=val.substring(0,start)+'\n'+val.substring(end); this.selectionStart=this.selectionEnd=start+1; } else if(event.key==='Enter' && window.innerWidth <= 768) { event.preventDefault(); window.enviarRespuestaSerie(${commentId}); }"></textarea>
                <div style="display:flex;gap:0.4rem;align-items:center;justify-content:flex-end;">
                    <button type="button" id="emoji-trigger-reply-${commentId}"
                        class="cep-trigger-btn" title="Insertar emoji">😊</button>
                    <button type="button" id="gif-trigger-reply-${commentId}"
                        class="cep-trigger-btn gif-trigger-btn"
                        style="font-size:0.7rem;font-weight:700;color:#888;letter-spacing:-0.5px;"
                        title="Insertar GIF">GIF</button>
                    <button onclick="window.cerrarCajaRespuesta(${commentId})" style="background:none;border:1px solid #ddd;border-radius:20px;padding:0.4rem 0.9rem;font-size:0.8rem;cursor:pointer;color:#888;display:flex;align-items:center;gap:0.4rem;" title="Cancelar"><span class="reply-cancelar-label">Cancelar</span><span class="reply-cancelar-x">✕</span></button>
                    <button onclick="window.enviarRespuestaSerie(${commentId})" style="background:#1a3a6b;color:white;border:none;border-radius:20px;padding:0.4rem 0.9rem;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem;" title="Enviar"><i class="fas fa-paper-plane"></i> <span class="reply-enviar-label">Enviar</span></button>
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

// ==============================================
// MODAL REPORTAR — SERIE (comentario y respuesta)
// Redefine window.cerrarModalReporte para limpiar AMBOS flujos
// (Película y Serie) y restaurar el handler del botón enviar.
// Requiere que feed-series.js cargue DESPUÉS de feed-films.js.
// ==============================================
window._comentarioReportandoSerieId = null;
window._replyReportandoSerieId = null;

window.cerrarModalReporte = function() {
    const modal = document.getElementById('modalReportarComentario');
    if (modal) modal.style.display = 'none';

    window._comentarioReportandoId = null;
    window._replyReportandoId = null;
    window._comentarioReportandoSerieId = null;
    window._replyReportandoSerieId = null;

    const btn = document.getElementById('btnEnviarReporte');
    if (btn) btn.onclick = window.enviarReporte;
};

window.abrirModalReporteSerie = function(commentId) {
    window._comentarioReportandoSerieId = commentId;
    window._replyReportandoSerieId = null;

    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
    const desc = document.getElementById('reportDescription');
    if (desc) desc.value = '';

    const btn = document.getElementById('btnEnviarReporte');
    if (btn) btn.onclick = window.enviarReporteSerie;

    const modal = document.getElementById('modalReportarComentario');
    if (modal) modal.style.display = 'flex';
};

window.abrirModalReporteReplySerie = function(replyId) {
    window._replyReportandoSerieId = replyId;
    window._comentarioReportandoSerieId = null;

    document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
    const desc = document.getElementById('reportDescription');
    if (desc) desc.value = '';

    const btn = document.getElementById('btnEnviarReporte');
    if (btn) btn.onclick = window.enviarReporteSerie;

    const modal = document.getElementById('modalReportarComentario');
    if (modal) modal.style.display = 'flex';
};

window.enviarReporteSerie = async function() {
    const commentId = window._comentarioReportandoSerieId;
    const replyId = window._replyReportandoSerieId;
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
                    ? `${CONFIG.API_URL}/series-comments/replies/${replyId}/report`
                    : `${CONFIG.API_URL}/series-comments/${commentId}/report`;
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
// MODAL OCULTAR COMENTARIO — SERIE
// Mismo patrón: redefine window.cerrarModalOcultar.
// ==============================================
window._comentarioOcultandoSerieId = null;

window.cerrarModalOcultar = function() {
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) modal.style.display = 'none';
    window._comentarioOcultandoId = null;
    window._comentarioOcultandoSerieId = null;
    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) btn.onclick = window.confirmarOcultar;
};

window.abrirModalOcultarSerie = function(commentId) {
    window._comentarioOcultandoSerieId = commentId;
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) {
        const titulo = modal.querySelector('h3');
        const texto  = modal.querySelector('p');
        if (titulo) titulo.textContent = 'Ocultar comentario';
        if (texto)  texto.innerHTML = 'Tu comentario dejará de ser visible para otros usuarios. Esta acción es <strong>irreversible</strong>. Si el comentario tiene puntos ganados, reacciones o respuestas tuyas, todo se perderá al ocultarlo.';
        modal.style.display = 'flex';
    }
    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) btn.onclick = window.confirmarOcultarSerie;
};

window.confirmarOcultarSerie = async function() {
    const commentId = window._comentarioOcultandoSerieId;
    if (!commentId) return;

    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) { btn.disabled = true; btn.textContent = 'Ocultando...'; }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 422) {
            window.cerrarModalOcultar();
            window.mostrarToast(data.error || 'Alcanzaste el límite de ocultamientos para esta serie.', 'error');
            return;
        }

        if (!response.ok) {
            window.cerrarModalOcultar();
            window.mostrarToast(data.error || 'Error al ocultar el comentario.', 'error');
            return;
        }

        window.cerrarModalOcultar();
        window.mostrarToast('Tu comentario fue ocultado correctamente.', 'success');

        const seriesId = window.serieActualId;
        if (seriesId) await window.cargarComentariosSerie(seriesId);

    } catch (error) {
        window.cerrarModalOcultar();
        window.mostrarToast('Error al ocultar el comentario. Intentá de nuevo.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sí, ocultar'; }
    }
};

        // ==============================================
        // DÓNDE VERLA (series) — reusa el mismo modal que películas
        // ==============================================
window.abrirDondeVerlaSerie = async function(seriesId, event) {
    if (event) event.stopPropagation();

    const overlay = document.getElementById('dondeVerlaOverlay');
    const panel   = document.getElementById('dondeVerlaPanel');
    const contenido = document.getElementById('dondeVerlaContenido');

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    const esMobile = window.innerWidth <= 768;
    if (event && !esMobile) {
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
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}/watch-providers`, {
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

        contenido.innerHTML = html || '<p style="text-align:center;color:#999;font-size:0.88rem;padding:0.5rem 0;">No hay información de disponibilidad para Argentina.</p>';

    } catch(e) {
        contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:0.5rem 0;">No se pudo cargar la información.</p>';
    }
};

// ==============================================
// ELENCO (series) — reusa el mismo modal actorOverlay/actorPanel
// ==============================================
window._elencoDataSerie = { cast: [], crew: [] };
window._elencoCardSeriesId = null;

window.abrirElencoCardSerie = async function(seriesId, event) {
    if (event) event.stopPropagation();
    window._elencoCardSeriesId = seriesId;

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
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}/credits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const cast = (data.cast || []).slice(0, 12);
        const crew = (data.crew || [])
            .filter(p => ['Director','Producer','Screenplay','Writer','Director of Photography','Original Music Composer'].includes(p.job))
            .slice(0, 12);

        window._elencoDataSerie = { cast, crew };
        contenido.innerHTML = `
            <div style="margin-bottom:0.75rem;">
                <div style="display:flex;gap:0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:0.75rem;">
                    <button id="elencoCardTabCastSerie" onclick="window.renderElencoCardTabSerie('cast')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:#324C89;color:white;cursor:pointer;">Elenco</button>
                    <button id="elencoCardTabCrewSerie" onclick="window.renderElencoCardTabSerie('crew')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:white;color:#888;cursor:pointer;">Dirección</button>
                </div>
                <div id="elencoCardTrackSerie" style="display:flex;flex-wrap:wrap;gap:12px;"></div>
            </div>`;

        window.renderElencoCardTabSerie('cast');

    } catch(e) {
        contenido.innerHTML = '<p style="text-align:center;color:#999;font-size:0.88rem;padding:1rem;">No se pudo cargar el elenco.</p>';
    }
};

window.renderElencoCardTabSerie = function(tab) {
    window._elencoTabSerie = tab;
    document.getElementById('elencoCardTabCastSerie').style.background = tab === 'cast' ? '#324C89' : 'white';
    document.getElementById('elencoCardTabCastSerie').style.color = tab === 'cast' ? 'white' : '#888';
    document.getElementById('elencoCardTabCrewSerie').style.background = tab === 'crew' ? '#324C89' : 'white';
    document.getElementById('elencoCardTabCrewSerie').style.color = tab === 'crew' ? 'white' : '#888';

    const personas = window._elencoDataSerie[tab] || [];
    const track = document.getElementById('elencoCardTrackSerie');
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
            const sid = window._elencoCardSeriesId || 0;
            return `
                <div onclick="window.abrirActorModalSerie(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', ${sid})" style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;cursor:pointer;">
                    <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;border:2px solid #e0e0e0;background:#324C89;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:white;">
                        ${foto || inicial}
                    </div>
                    <p style="margin:0;font-size:0.68rem;font-weight:600;color:#333;text-align:center;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;width:64px;">${p.name||''}</p>
                    <p style="margin:0;font-size:0.62rem;color:#999;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:64px;">${subtitulo}</p>
                </div>`;
        }).join('');
};

// ==============================================
// COMPARTIR (series)
// ==============================================
window.compartirSerie = async function(seriesId, titulo) {
    const urlOg  = `https://cinemarketer-backend-production.up.railway.app/api/series/og/${seriesId}`;
    const urlFront = `https://cinemarketer.com.ar/serie?id=${seriesId}`;
    const texto = `Mirá lo que opina la comunidad sobre "${titulo}" 📺`;

    if (navigator.share) {
        try {
            await navigator.share({ title: titulo, text: texto, url: urlOg });
        } catch (e) {}
    } else {
        try {
            await navigator.clipboard.writeText(urlFront);
            if (typeof showToast === 'function') showToast('success', '¡Link copiado al portapapeles!');
        } catch (e) {
            prompt('Copiá este link:', urlFront);
        }
    }
};

// ==============================================
// RECOMENDAR (series) — reusa el mismo panel #panelRecomendar
// y las funciones genéricas de recomendaciones.js (toggleUsuarioRec,
// filtrarUsuariosRec, _renderizarUsuarios, los toasts, etc.)
// ==============================================
window._recSeriesId = null;
window._recSeriesTitulo = null;

window.abrirPanelRecomendarSerie = async function(seriesId, event) {
    if (event) event.stopPropagation();

    window._recSeriesId = seriesId;
    window._recMovieId = null;
    window._recSeleccionados = new Set();
    window._recContextoSeleccionado = null;

    document.getElementById('recBuscadorUsuario').value = '';
    document.getElementById('recSeleccionadosRow').style.display = 'none';
    document.getElementById('recSeleccionadosTags').innerHTML = '';
    document.querySelectorAll('.rec-ctx-chip.selected').forEach(c => c.classList.remove('selected'));
    document.getElementById('btnEnviarRecomendacion').style.opacity = '0.5';
    document.getElementById('btnEnviarRecomendacion').style.cursor = 'not-allowed';

    const panel = document.getElementById('panelRecomendar');
    panel.style.display = 'flex';
    document.body.classList.add('modal-open');

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            window._recSeriesTitulo = data.name || 'Serie';
            document.getElementById('recTituloFilm').textContent = window._recSeriesTitulo;
            const img = document.getElementById('recPosterImg');
            if (data.poster_path) {
                img.src = `https://image.tmdb.org/t/p/w92${data.poster_path}`;
                img.style.display = 'block';
            }
        }
    } catch(e) {}

    await _cargarUsuariosSerie(seriesId);
};

async function _cargarUsuariosSerie(seriesId) {
    const lista = document.getElementById('recListaUsuarios');
    lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">Cargando usuarios...</div>';

    try {
        const token = localStorage.getItem('token');
        const resSeguidos = await fetch(`${CONFIG.API_URL}/follows/following`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let usuarios = [];
        if (resSeguidos.ok) {
            const seguidos = await resSeguidos.json();
            if (seguidos && seguidos.length > 0) usuarios = seguidos.map(u => ({ ...u, fuente: 'seguido' }));
        }

        if (usuarios.length === 0) {
            const resSin = await fetch(`${CONFIG.API_URL}/series-recommendations/series/${seriesId}/suggested-users?limit=8`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resSin.ok) {
                const sinInteraccion = await resSin.json();
                usuarios = (sinInteraccion || []).map(u => ({ ...u, fuente: 'sugerido' }));
            }
        }

        window._recTodosUsuarios = usuarios;
        // _renderizarUsuarios es una función local (no window.) de
        // recomendaciones.js — accesible igual porque ambos scripts
        // comparten el mismo scope global de la página.
        _renderizarUsuarios(usuarios);

    } catch(e) {
        lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">No se pudieron cargar usuarios.</div>';
    }
}

window.enviarRecomendacionSerie = async function() {
    if (window._recSeleccionados.size === 0) return;

    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnEnviarRecomendacion');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const responses = await Promise.all(
            Array.from(window._recSeleccionados).map(receiverId =>
                fetch(`${CONFIG.API_URL}/series-recommendations`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    // El campo se llama movieId porque reusamos el mismo
                    // DTO de transporte que Películas (RecommendationRequest)
                    // — el backend lo toma como el id de la serie.
                    body: JSON.stringify({
                        movieId: window._recSeriesId,
                        receiverId: receiverId,
                        contextType: window._recContextoSeleccionado || null
                    })
                }).then(async r => ({ ok: r.ok, data: await r.json(), receiverId }))
            )
        );

        const exitosas  = responses.filter(r => r.ok);
        const duplicadas = responses.filter(r => !r.ok && r.data?.error?.includes('Ya le recomendaste'));
        const sinPuntos  = exitosas.some(r => r.data?.sinPuntos === true);
        const puntosTotal = exitosas.reduce((acc, r) => acc + (r.data?.pointsAwarded || 0), 0);
        if (typeof mostrarPuntosGanados === 'function') mostrarPuntosGanados(puntosTotal);

        window.cerrarPanelRecomendar();

        if (duplicadas.length > 0 && exitosas.length === 0) {
            const nombres = Array.from(document.querySelectorAll('.rec-usuario-chip.selected'))
                .map(c => c.dataset.nombre).join(', ');
            _mostrarToast(`Ya le recomendaste esta serie a ${nombres}.`, true);
        } else if (sinPuntos) {
            _mostrarModalLimiteRecomendacion();
        } else if (exitosas.length > 0) {
            _mostrarToast(exitosas.length === 1
                ? 'Recomendación enviada'
                : `${exitosas.length} recomendaciones enviadas`
            );
        }

    } catch(e) {
        _mostrarToast('Error al enviar. Intentá de nuevo.', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-envelope"></i> Recomendar';
        if (typeof _actualizarBotonEnviar === 'function') _actualizarBotonEnviar();
    }
};

// PENDIENTE: window.abrirDetalleSerie — el modal de detalle completo
// (poster, sinopsis, tráiler, similares, comentarios) es su propio
// bloque de trabajo grande, calcado del modal de película. Por ahora
// dejamos un placeholder para que el click en una card no rompa nada.
window.abrirDetalleSerie = function(id) {
    console.log('Modal de detalle de serie pendiente de implementar — id:', id);
};

// ==============================================
// MI LISTA — SERIES
// ==============================================
window._watchlistSeriesCache = [];

window.cargarMiListaSeries = async function(pedidoId) {
    const token = localStorage.getItem('token');
    const lista = document.getElementById('panelMiLista');
    if (!lista) return;
    lista.innerHTML = '<div class="mi-red-vacio">Cargando...</div>';
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-watchlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pedidoId && pedidoId !== window._prefRequestId) return;
        window._watchlistSeriesCache = res.ok ? await res.json() : [];
        const countEl = document.getElementById('countMiLista');
        if (countEl) countEl.textContent = window._watchlistSeriesCache.length;
        window.renderMiListaSeries();
    } catch (e) {
        if (!pedidoId || pedidoId === window._prefRequestId) {
            lista.innerHTML = '<div class="mi-red-vacio">Error al cargar tu lista</div>';
        }
    }
};

window.renderMiListaSeries = function() {
    const lista = document.getElementById('panelMiLista');
    if (!lista) return;

    if (window._watchlistSeriesCache.length === 0) {
        lista.innerHTML = '<div class="mi-red-vacio">Guardá series para verlas después</div>';
        return;
    }

    lista.innerHTML = window._watchlistSeriesCache.map(w => {
        const posterUrl = w.seriesPosterPath
            ? `https://image.tmdb.org/t/p/w185${w.seriesPosterPath}`
            : null;

        const yaVista = !!w.seenAt;
        const yaCalificada = !!w.rating;

        const estrellasActivas = [1,2,3,4,5].map(i => `
            <span onclick="window.seleccionarEstrellaWatchlistSerie(${w.id}, ${i})"
                  style="cursor:pointer;font-size:1.3rem;color:${yaCalificada && w.rating >= i ? '#E8A800' : '#ddd'};">★</span>
        `).join('');

        const estrellasDeshabilitadas = `
            <span style="font-size:1.3rem;color:#ddd;">★</span><span style="font-size:1.3rem;color:#ddd;">★</span>
            <span style="font-size:1.3rem;color:#ddd;">★</span><span style="font-size:1.3rem;color:#ddd;">★</span>
            <span style="font-size:1.3rem;color:#ddd;">★</span>
            <span style="font-size:0.72rem;color:#aaa;margin-left:4px;">Marcá como vista para calificar</span>
        `;

        const sinopsis = w.seriesOverview
            ? `<p style="font-size:0.78rem;color:#666;margin:4px 0 6px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${w.seriesOverview}</p>`
            : '';

        return `
            <div style="display:flex;align-items:flex-start;gap:0.85rem;padding:0.9rem 0;border-bottom:1px solid #f5f5f5;position:relative;">
                <button onclick="window.eliminarDeWatchlistSerie(${w.id})" title="Quitar de mi lista"
                        style="position:absolute;top:8px;right:0;background:none;border:none;cursor:pointer;color:#ccc;font-size:1rem;padding:4px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ${posterUrl
                    ? `<img src="${posterUrl}" alt="${w.seriesTitle || 'Serie'}" onclick="window.abrirDetalleSerieDesdeWatchlist(${w.seriesId})" style="width:85px;height:128px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer;">`
                    : `<div onclick="window.abrirDetalleSerieDesdeWatchlist(${w.seriesId})" style="width:85px;height:128px;background:#1a3a6b;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;cursor:pointer;">📺</div>`
                }
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.92rem;font-weight:600;color:#333;margin-bottom:4px;padding-right:1.5rem;">${w.seriesTitle || '—'}</div>
                    ${sinopsis}
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        ${!yaVista
                            ? `<button onclick="window.abrirModalYaLaViWatchlistSerie(${w.id})" style="font-size:0.8rem;padding:4px 12px;border-radius:8px;background:#1a3a6b;color:white;border:none;cursor:pointer;font-weight:500;">✓ Ya la vi</button>`
                            : `<span style="font-size:0.75rem;color:#1d9e75;font-weight:500;">✓ Vista</span>`
                        }
                    </div>
                    <div style="display:flex;align-items:center;gap:2px;margin-top:6px;flex-wrap:wrap;">
                        ${yaVista ? estrellasActivas : estrellasDeshabilitadas}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.abrirModalYaLaViWatchlistSerie = function(wlId) {
    window._recModalId = wlId;
    window._yaLaViModo = 'serie-watchlist';
    const modal = document.getElementById('modalYaLaVi');
    if (modal) modal.style.display = 'flex';
};

window.seleccionarEstrellaWatchlistSerie = async function(wlId, rating) {
    const w = window._watchlistSeriesCache.find(x => x.id === wlId);
    if (!w || !w.seenAt || w.rating) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-watchlist/${wlId}/rate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
        if (res.ok) {
            w.rating = rating;
            window.renderMiListaSeries();
        }
    } catch (e) {}
};

window.toggleWatchlistSerie = async function(seriesId, event) {
    if (event) event.stopPropagation();

    const btns = document.querySelectorAll(`.btn-watchlist-serie[data-serie-id="${seriesId}"]`);
    const btnModal = document.getElementById('btnWatchlistModalSerie');
    const yaGuardado = btns[0]?.classList.contains('guardado') ||
                       btnModal?.classList.contains('guardado');
    btns.forEach(btn => _actualizarBtnWatchlist(btn, !yaGuardado));
    if (btnModal) _actualizarBtnWatchlist(btnModal, !yaGuardado);

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-watchlist/${seriesId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const saved = data.saved;

        document.querySelectorAll(`.btn-watchlist-serie[data-serie-id="${seriesId}"]`).forEach(btn => {
            _actualizarBtnWatchlist(btn, saved);
        });
        const btnModalActualizado = document.getElementById('btnWatchlistModalSerie');
        if (btnModalActualizado) _actualizarBtnWatchlist(btnModalActualizado, saved);

        _mostrarToastWatchlist(saved ? 'Guardada en tu lista' : 'Quitada de tu lista');

    } catch (e) {
        btns.forEach(btn => _actualizarBtnWatchlist(btn, yaGuardado));
        if (btnModal) _actualizarBtnWatchlist(btnModal, yaGuardado);
    }
};

window.verificarEstadoWatchlistSerie = async function(seriesId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-watchlist/${seriesId}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        document.querySelectorAll(`.btn-watchlist-serie[data-serie-id="${seriesId}"]`).forEach(btn => {
            _actualizarBtnWatchlist(btn, data.saved);
        });
        const btnModal = document.getElementById('btnWatchlistModalSerie');
        if (btnModal) _actualizarBtnWatchlist(btnModal, data.saved);
    } catch (e) {}
};

window.eliminarDeWatchlistSerie = async function(wlId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-watchlist/${wlId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window._watchlistSeriesCache = window._watchlistSeriesCache.filter(x => x.id !== wlId);
            window.renderMiListaSeries();
        }
    } catch (e) {}
};

window.abrirDetalleSerieDesdeWatchlist = function(seriesId) {
    if (typeof window.abrirDetalleSerie === 'function') window.abrirDetalleSerie(seriesId);
};

// ==============================================
// RECOMENDACIONES RECIBIDAS — SERIES
// ==============================================
window._recomendacionesSeriesCache = [];

window.cargarMeRecomendaronSeries = async function(pedidoId) {
    const token = localStorage.getItem('token');
    const lista = document.getElementById('meRecomendaronLista');
    if (!lista) return;
    lista.innerHTML = '<div class="mi-red-vacio">Cargando...</div>';
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-recommendations/received`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pedidoId && pedidoId !== window._prefRequestId) return;
        window._recomendacionesSeriesCache = res.ok ? await res.json() : [];
        const countEl = document.getElementById('countRecomendaciones');
        if (countEl) countEl.textContent = window._recomendacionesSeriesCache.length;
        window.renderMeRecomendadoSeries();
    } catch (e) {
        if (!pedidoId || pedidoId === window._prefRequestId) {
            lista.innerHTML = '<div class="mi-red-vacio">Error al cargar recomendaciones</div>';
        }
    }
};

window.renderMeRecomendadoSeries = function() {
    const lista = document.getElementById('meRecomendaronLista');
    if (!lista) return;

    if (window._recomendacionesSeriesCache.length === 0) {
        lista.innerHTML = '<div class="mi-red-vacio">Todavía no te recomendaron ninguna serie</div>';
        return;
    }

    lista.innerHTML = window._recomendacionesSeriesCache.map(r => {
        const posterUrl = r.seriesPosterPath ? `https://image.tmdb.org/t/p/w185${r.seriesPosterPath}` : null;
        const senderInicial = r.senderName?.charAt(0)?.toUpperCase() || '?';
        const avatarHtml = r.senderAvatarUrl
            ? `<img src="${r.senderAvatarUrl}" alt="${r.senderName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : senderInicial;

        const yaVista = !!r.seenAt;
        const yaCalificada = !!r.rating;

        const estrellasActivas = [1,2,3,4,5].map(i => `
            <span onclick="window.seleccionarEstrellaRecSerie(${r.id}, ${i})"
                  style="cursor:pointer;font-size:1.3rem;color:${yaCalificada && r.rating >= i ? '#E8A800' : '#ddd'};">★</span>
        `).join('');

        const estrellasDeshabilitadas = `
            <span style="font-size:1.3rem;color:#ddd;">★</span><span style="font-size:1.3rem;color:#ddd;">★</span>
            <span style="font-size:1.3rem;color:#ddd;">★</span><span style="font-size:1.3rem;color:#ddd;">★</span>
            <span style="font-size:1.3rem;color:#ddd;">★</span>
            <span style="font-size:0.72rem;color:#aaa;margin-left:4px;">Marcá como vista para calificar</span>
        `;

        return `
            <div style="display:flex;align-items:flex-start;gap:0.85rem;padding:0.9rem 0;border-bottom:1px solid #f5f5f5;position:relative;">
                <button onclick="window.abrirModalEliminarRecSerie(${r.id})" title="Eliminar recomendación"
                        style="position:absolute;top:8px;right:0;background:none;border:none;cursor:pointer;color:#ccc;font-size:1rem;padding:4px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ${posterUrl
                    ? `<img src="${posterUrl}" alt="${r.seriesTitle || 'Serie'}" onclick="window.abrirDetalleSerieDesdeWatchlist(${r.seriesId})" style="width:85px;height:128px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer;">`
                    : `<div onclick="window.abrirDetalleSerieDesdeWatchlist(${r.seriesId})" style="width:85px;height:128px;background:#1a3a6b;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;cursor:pointer;">📺</div>`
                }
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.92rem;font-weight:600;color:#333;margin-bottom:4px;">Serie: ${r.seriesTitle || '—'}</div>
                    ${r.seriesOverview ? `<p style="font-size:0.78rem;color:#666;margin:4px 0 6px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${r.seriesOverview}</p>` : ''}
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
                        <div style="width:22px;height:22px;border-radius:50%;background:#1a3a6b;color:white;font-size:0.7rem;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">${avatarHtml}</div>
                        <span style="font-size:0.8rem;color:#666;">Por <strong><a href="#" onclick="event.preventDefault(); window.abrirPerfilUsuario(${r.senderId})" style="color:#e50914;text-decoration:none;cursor:pointer;">${r.senderName}</a></strong></span>
                        ${r.contextType ? `<span style="font-size:0.75rem;padding:2px 8px;border-radius:99px;background:#f0f0f0;color:#666;">${r.contextType}</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        ${!yaVista
                            ? `<button onclick="window.abrirModalYaLaViSerie(${r.id})" style="font-size:0.8rem;padding:4px 12px;border-radius:8px;background:#1a3a6b;color:white;border:none;cursor:pointer;font-weight:500;">✓ Ya la vi</button>`
                            : `<span style="font-size:0.75rem;color:#1d9e75;font-weight:500;">✓ Vista</span>`
                        }
                    </div>
                    <div style="display:flex;align-items:center;gap:2px;margin-top:6px;flex-wrap:wrap;">
                        ${yaVista ? estrellasActivas : estrellasDeshabilitadas}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.abrirModalYaLaViSerie = function(recId) {
    window._recModalId = recId;
    window._yaLaViModo = 'serie-rec';
    const modal = document.getElementById('modalYaLaVi');
    if (modal) modal.style.display = 'flex';
};

window.seleccionarEstrellaRecSerie = async function(recId, rating) {
    const rec = window._recomendacionesSeriesCache.find(r => r.id === recId);
    if (!rec || !rec.seenAt || rec.rating) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-recommendations/${recId}/rate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
        if (res.ok) {
            rec.rating = rating;
            window.renderMeRecomendadoSeries();
        }
    } catch (e) {}
};

window.abrirModalEliminarRecSerie = function(recId) {
    window._eliminarRecId = recId;
    window._eliminarModo = 'serie-rec';
    const modal = document.getElementById('modalEliminarRec');
    if (modal) modal.style.display = 'flex';
};

// ==============================================
// "MI SALA" — CARRUSEL DE VOTACIONES DE SERIES
// ==============================================
let _votacionesSeriesPage = 0;
let _votacionesSeriesHayMas = false;
let _votacionesSeriesCargando = false;

window.renderVotacionesSeries = function(votaciones) {
    const wrapper = document.getElementById('perfilVotacionesSeriesWrapper');
    if (!wrapper) return;

    if (!votaciones || votaciones.length === 0) {
        wrapper.innerHTML = '<div class="perfil-vacio">Sin votaciones aún</div>';
        return;
    }

    _votacionesSeriesPage   = 0;
    _votacionesSeriesHayMas = votaciones.length === 8;

    wrapper.innerHTML = `
        <div class="perfil-carrusel-outer">
            <button class="perfil-carrusel-arrow left" onclick="window.scrollCarruselSeries(-1)">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="perfil-carrusel-track" id="perfilCarruselSeriesTrack">
                ${votaciones.map(v => buildVotoItemSerie(v)).join('')}
            </div>
            <button class="perfil-carrusel-arrow right" onclick="window.scrollCarruselSeries(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
};

function buildVotoItemSerie(v) {
    const poster = v.posterPath
        ? `<img src="https://image.tmdb.org/t/p/w185${v.posterPath}" alt="${v.seriesTitle || ''}">`
        : `<i class="fas fa-tv"></i>`;
    const badgeClass = v.voto === 'LIKE' ? 'like' : 'dislike';
    const badgeIcon  = v.voto === 'LIKE' ? 'fa-thumbs-up' : 'fa-thumbs-down';
    return `
    <div class="perfil-voto-item" title="${v.seriesTitle || ''}"
         onclick="window._abrirSerieDesdePerfil(${v.seriesId})"
         style="cursor:pointer;">
        <div class="perfil-voto-poster">
            ${poster}
            <div class="perfil-voto-badge ${badgeClass}">
                <i class="fas ${badgeIcon}" style="font-size:0.55rem;color:white;"></i>
            </div>
        </div>
        <span class="perfil-voto-titulo">${v.seriesTitle || '—'}</span>
    </div>`;
}

window.scrollCarruselSeries = async function(dir) {
    const track = document.getElementById('perfilCarruselSeriesTrack');
    if (!track) return;

    const itemWidth = track.querySelector('.perfil-voto-item')?.offsetWidth || 104;
    const visibles  = Math.floor(track.clientWidth / itemWidth);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const alFinal   = track.scrollLeft >= maxScroll - 10;

    if (dir === 1 && alFinal) {
        if (_votacionesSeriesHayMas && !_votacionesSeriesCargando) {
            await cargarSiguienteLoteVotacionesSeries(track, itemWidth, visibles);
        } else if (!_votacionesSeriesHayMas) {
            if (typeof mostrarFinVotaciones === 'function') mostrarFinVotaciones(track);
        }
    } else {
        track.scrollBy({ left: dir * itemWidth * visibles, behavior: 'smooth' });
    }
};

async function cargarSiguienteLoteVotacionesSeries(track, itemWidth, visibles) {
    _votacionesSeriesCargando = true;
    _votacionesSeriesPage++;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(
            `${CONFIG.API_URL}/users/${window.perfilUsuarioId || sessionStorage.getItem('perfilUsuarioId')}/votaciones-series?page=${_votacionesSeriesPage}&size=8`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();

        _votacionesSeriesHayMas = data.hayMas;

        data.votaciones.forEach(v => {
            track.insertAdjacentHTML('beforeend', buildVotoItemSerie(v));
        });

        track.scrollBy({ left: itemWidth * visibles, behavior: 'smooth' });
    } catch (e) {
    } finally {
        _votacionesSeriesCargando = false;
    }
}

window._abrirSerieDesdePerfil = async function(seriesId) {
    if (!seriesId) return;

    if (typeof window._asegurarModalPeliculaEnDOM === 'function') {
        await window._asegurarModalPeliculaEnDOM();
    }
    if (typeof window.abrirDetalleSerie === 'function') {
        window.abrirDetalleSerie(seriesId);
    }
};

// ==============================================
// MODAL DE DETALLE — SERIES
// ==============================================
window.serieActualId = null;

window.abrirDetalleSerie = function(id) {
    window.serieActualId = id;

    const modal = document.getElementById('modalSerie');
    if (!modal) return;

    setTimeout(() => {
        window.cargarDatosSerie(id);
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        window.inicializarCarruselSerie();
        window.irASlideSerie(0);

        const modalBody = modal.querySelector('.modal-body');
        if (modalBody && typeof modalBody.scrollTo === 'function') {
            modalBody.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (modalBody) {
            modalBody.scrollTop = 0;
        }
    }, 200);
};

window.cerrarModalSerie = function() {
    const modal = document.getElementById('modalSerie');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');

    const iframe = modal.querySelector('iframe');
    if (iframe) iframe.src = iframe.src;

    // Refrescar la tarjeta de la fila, igual que hace Películas al cerrar
    const seriesId = window.serieActualId;
    if (seriesId) {
        const card = document.querySelector(`.serie-card[data-id="${seriesId}"]`);
        if (card) {
            const token = localStorage.getItem('token');
            fetch(`${CONFIG.API_URL}/reviews/series/${seriesId}/stats`, {
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
                const porcentajeEl = card.querySelector(`#totalVotosSerie-${seriesId}`);
                if (porcentajeEl) {
                    porcentajeEl.textContent = totalVotos === 0 ? '0%'
                        : `${Math.round((stats.likes / totalVotos) * 100)}%`;
                }
            })
            .catch(() => {});
        }
    }
};

const TMDB_GENEROS_TV = {
    10759: 'Acción y Aventura', 16: 'Animación', 35: 'Comedia', 80: 'Crimen',
    99: 'Documental', 18: 'Drama', 10751: 'Familia', 10762: 'Infantil',
    9648: 'Misterio', 10763: 'Noticias', 10764: 'Reality',
    10765: 'Ciencia Ficción y Fantasía', 10766: 'Telenovela', 10767: 'Talk',
    10768: 'Guerra y Política', 37: 'Western'
};

const TMDB_IDIOMAS_SERIE = {
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

window.cargarDatosSerie = async function(id) {
    const token = localStorage.getItem('token');

    document.getElementById('modalTituloSerie').textContent = 'Cargando...';
    document.getElementById('modalSinopsisSerie').textContent = 'Cargando información...';

    try {
        const response = await fetch(`${CONFIG.API_URL}/series/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al cargar serie');
        const serie = await response.json();

        document.getElementById('modalTituloSerie').textContent = serie.name || 'Título no disponible';

        const posterEl = document.getElementById('modalPosterSerie');
        posterEl.src = serie.poster_path
            ? `https://image.tmdb.org/t/p/w500${serie.poster_path}`
            : 'https://via.placeholder.com/300x450?text=Sin+imagen';

        document.getElementById('modalSinopsisSerie').textContent = serie.overview || 'Sinopsis no disponible';

        const fecha       = document.getElementById('modalFechaSerie');
        const temporadas  = document.getElementById('modalTemporadasSerie');
        const idioma      = document.getElementById('modalIdiomaSerie');
        const popularidad = document.getElementById('modalPopularidadSerie');
        const votos       = document.getElementById('modalVotosSerie');
        const generos     = document.getElementById('modalGenerosSerie');

        if (fecha) fecha.textContent = serie.first_air_date ? new Date(serie.first_air_date).toLocaleDateString('es-ES') : 'N/A';
        if (temporadas) temporadas.textContent = serie.number_of_seasons ? `${serie.number_of_seasons}` : 'N/A';
        if (idioma) idioma.textContent = TMDB_IDIOMAS_SERIE[serie.original_language] || (serie.original_language || 'N/A').toUpperCase();
        if (popularidad) popularidad.textContent = Math.round(serie.popularity || 0);
        if (votos) votos.textContent = serie.vote_count || 0;

        if (generos) {
            const ids = serie.genre_ids || (serie.genres?.map(g => g.id)) || [];
            generos.innerHTML = ids.length > 0
                ? ids.map(gid => `<span class="genero-chip">${TMDB_GENEROS_TV[gid] || gid}</span>`).join('')
                : '<span class="genero-chip">No especificado</span>';
        }

        if (typeof window.verificarEstadoWatchlistSerie === 'function') {
            window.verificarEstadoWatchlistSerie(id);
        }

        const statsResponse = await fetch(`${CONFIG.API_URL}/reviews/series/${id}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('modalRatingSerie').innerHTML = `⭐ <span class="modal-rating-num">${stats.totalVotes}</span><span class="modal-rating-label"> votos</span>`;
            document.getElementById('modalLikesSerie').textContent = stats.likes || 0;
            document.getElementById('modalDislikesSerie').textContent = stats.dislikes || 0;

            const totalVotosModal = (stats.likes || 0) + (stats.dislikes || 0);
            const porcentajeModal = totalVotosModal > 0 ? Math.round((stats.likes / totalVotosModal) * 100) : 0;
            const leyendaEl = document.getElementById('modalLeyendaPorcentajeSerie');
            if (leyendaEl) {
                leyendaEl.textContent = porcentajeModal > 0
                    ? `Al ${porcentajeModal}% de los usuarios les gustó esta serie`
                    : '';
            }

            const btnLike    = document.querySelector('#modalSerie .btn-like');
            const btnDislike = document.querySelector('#modalSerie .btn-dislike');
            btnLike?.classList.remove('votado');
            btnDislike?.classList.remove('votado');

            if (stats.userVoted) {
                if (stats.userVoteType === 'LIKE')    btnLike?.classList.add('votado');
                if (stats.userVoteType === 'DISLIKE') btnDislike?.classList.add('votado');
            }
        }

        window.cargarTrailerSerie(id);
        window.cargarSeriesSimilares(id);
        window.cargarElencoSerieModal(id);
        window.cargarComentariosSerie(id);
        window._renderTemporadasSerie(id, serie.name, serie.seasons);

            } catch (error) {
                document.getElementById('modalTituloSerie').textContent = 'Error al cargar';
            }
        };

// ==============================================
// SERIES SIMILARES
// ==============================================
window.cargarSeriesSimilares = async function(seriesId) {
    const contenedor = document.getElementById('similares-container-serie');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="similares-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/series/${seriesId}/similar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error();

        const data = await response.json();
        const soloLatinos = /^[a-zA-ZÀ-ÿ0-9\s\-:,.!?'"()\u00C0-\u024F\u1E00-\u1EFF]+$/;

        const series = (data.results || [])
            .filter(s => s.poster_path && s.name && soloLatinos.test(s.name.trim()))
            .slice(0, 10);

        if (series.length === 0) {
            contenedor.closest('.similares-seccion').style.display = 'none';
            return;
        }

        contenedor.closest('.similares-seccion').style.display = 'block';
        contenedor.innerHTML = series.map(s => {
            const poster = `https://image.tmdb.org/t/p/w185${s.poster_path}`;
            const anio = s.first_air_date ? new Date(s.first_air_date).getFullYear() : '';
            return `
                <div class="similar-card" onclick="window.abrirDetalleSerie(${s.id}); setTimeout(() => { const mb = document.querySelector('#modalSerie .modal-body'); if(mb) mb.scrollTo({ top: 0, behavior: 'smooth' }); }, 250);" title="${s.name}">
                    <img src="${poster}" alt="${s.name}" onerror="this.src='https://via.placeholder.com/100x150?text=Sin+imagen'">
                    <div class="similar-card-info">
                        <span class="similar-titulo">${s.name}</span>
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

window.scrollSimilaresSerie = function(direccion) {
    const track = document.getElementById('similares-container-serie');
    if (!track) return;
    const card = track.querySelector('.similar-card');
    const cardWidth = card ? card.offsetWidth + 14 : 130;
    track.scrollBy({ left: direccion * cardWidth * 3, behavior: 'smooth' });
};

// ==============================================
// TRÁILER
// ==============================================
window.cargarTrailerSerie = async function(seriesId) {
    const container = document.getElementById('modalTrailerContainerSerie');
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
                `${CONFIG.API_URL}/series/${seriesId}/videos?language=${lang}`,
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
};

// ==============================================
// ELENCO — dentro del modal (distinto del popup de la tarjeta)
// ==============================================
window._elencoDataSerieModal = { cast: [], crew: [] };
window._elencoTabSerieModal = 'cast';

window.cargarElencoSerieModal = async function(seriesId) {
    const seccion = document.getElementById('elencoSeccionSerie');
    const track = document.getElementById('elencoTrackSerie');
    if (!seccion || !track) return;

    track.innerHTML = '<div style="padding:1rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></div>';
    seccion.style.display = 'block';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}/credits`, {
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

        window._elencoDataSerieModal = { cast, crew };
        window._elencoTabSerieModal = 'cast';
        window.renderElencoTabSerie('cast');

    } catch (e) {
        seccion.style.display = 'none';
    }
};

window.switchElencoTabSerie = function(tab) {
    window._elencoTabSerieModal = tab;
    document.getElementById('tabElencoSerie').classList.toggle('active', tab === 'cast');
    document.getElementById('tabDireccionSerie').classList.toggle('active', tab === 'crew');
    window.renderElencoTabSerie(tab);
};

window.renderElencoTabSerie = function(tab) {
    const track = document.getElementById('elencoTrackSerie');
    if (!track) return;

    const personas = window._elencoDataSerieModal[tab] || [];
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
        const sid = window.serieActualId || 0;
        return `
            <div class="elenco-item" onclick="window.abrirActorModalSerie(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', ${sid})">
            <div class="elenco-foto">${avatarHtml}</div>
            <p class="elenco-nombre">${p.name || ''}</p>
            <p class="elenco-rol">${subtitulo}</p>
        </div>`;
    }).join('');
};

window.scrollElencoSerie = function(direccion) {
    const track = document.getElementById('elencoTrackSerie');
    if (!track) return;
    const card = track.querySelector('.elenco-persona');
    const cardWidth = card ? card.offsetWidth + 14 : 80;
    track.scrollBy({ left: direccion * cardWidth * 3, behavior: 'smooth' });
};

window.abrirActorModalSerie = async function(personId, nombre, seriesId) {
    const overlay  = document.getElementById('actorOverlay');
    const panel    = document.getElementById('actorPanel');
    const nombreEl = document.getElementById('actorPanelNombre');
    const contenido = document.getElementById('actorPanelContenido');

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    const desdeModal = !!window.serieActualId;
    const volverBtn = (seriesId && !desdeModal)
        ? `<button onclick="window.volverAlElencoSerie(${seriesId})" style="background:none;border:none;color:rgba(255,255,255,0.8);font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;"><i class="fas fa-arrow-left"></i> Volver</button>`
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
            fetch(`${CONFIG.API_URL}/series/person/${personId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CONFIG.API_URL}/series/person/${personId}/credits`, { headers: { 'Authorization': `Bearer ${token}` } })
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

        // Créditos de TV: cada ítem trae "name", no "title" — a diferencia
        // de los créditos de película que usa la función original.
        const series = (cred.cast || [])
            .filter(s => s.poster_path)
            .sort((a,b) => (b.popularity||0) - (a.popularity||0))
            .slice(0, 8);

        const filmografiaHtml = series.length > 0
            ? `<div style="margin-top:1rem;">
                <p style="font-size:0.75rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 0.5rem;">Series destacadas</p>
                <div style="display:flex;align-items:center;gap:6px;">
                    <button class="elenco-arrow" id="filmografiaArrowLeft" onclick="window.scrollFilmografia(-1)" style="display:none;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div id="filmografiaTrack" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none;flex:1;">
                        ${series.map(s => `
                            <div style="flex-shrink:0;width:56px;cursor:pointer;" onclick="window.cerrarActorModal();setTimeout(()=>window.abrirDetalleSerie(${s.id}),200)">
                                <img src="https://image.tmdb.org/t/p/w92${s.poster_path}" style="width:56px;height:82px;object-fit:cover;border-radius:6px;display:block;">
                                <p style="margin:4px 0 0;font-size:0.65rem;color:#555;text-align:center;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${s.name||''}</p>
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

window.volverAlElencoSerie = async function(seriesId) {
    if (window._elencoCardSeriesId === seriesId) {
        await window.abrirElencoCardSerie(seriesId, null);
    } else {
        const nombreEl = document.getElementById('actorPanelNombre');
        const contenido = document.getElementById('actorPanelContenido');
        nombreEl.innerHTML = '👥 Elenco y dirección';
        contenido.innerHTML = `
            <div style="margin-bottom:0.75rem;">
                <div style="display:flex;gap:0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:0.75rem;">
                    <button id="elencoCardTabCastSerie" onclick="window.renderElencoCardTabSerie('cast')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:#324C89;color:white;cursor:pointer;">Elenco</button>
                    <button id="elencoCardTabCrewSerie" onclick="window.renderElencoCardTabSerie('crew')" style="padding:4px 14px;font-size:0.78rem;font-weight:600;border:none;background:white;color:#888;cursor:pointer;">Dirección</button>
                </div>
                <div id="elencoCardTrackSerie" style="display:flex;flex-wrap:wrap;gap:12px;"></div>
            </div>`;
        window.renderElencoCardTabSerie(window._elencoTabSerie || 'cast');
    }
};

// ==============================================
// CARRUSEL DEL MODAL (poster/datos)
// ==============================================
window.irASlideSerie = function(index) {
    const carrusel = document.getElementById('modalCarruselSerie');
    if (!carrusel) return;
    carrusel.scrollTo({ left: index * carrusel.offsetWidth, behavior: 'smooth' });
    window._actualizarDotsSerie(index);
};

window._actualizarDotsSerie = function(index) {
    document.querySelectorAll('.carrusel-dot-serie').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
};

window.inicializarCarruselSerie = function() {
    const carrusel = document.getElementById('modalCarruselSerie');
    if (!carrusel || carrusel.dataset.inicializado) return;
    carrusel.dataset.inicializado = '1';

    carrusel.addEventListener('scroll', function() {
        const index = Math.round(carrusel.scrollLeft / carrusel.offsetWidth);
        window._actualizarDotsSerie(index);
    });
};

// ==============================================
// MODO SPOILER — SERIE
// ==============================================
window.modoSpoilerActivoSerie = false;

window.spoilerYaAceptadoSerie = async function(seriesId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;
        const res = await fetch(`${CONFIG.API_URL}/series-comments/spoiler-accepted/${seriesId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.accepted === true;
    } catch { return false; }
};

window.guardarSpoilerAceptadoSerie = async function(seriesId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await fetch(`${CONFIG.API_URL}/series-comments/spoiler-accepted/${seriesId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch {}
};

window.toggleModoSpoilerSerie = async function() {
    if (!window.modoSpoilerActivoSerie) {
        const yaAceptado = await window.spoilerYaAceptadoSerie(window.serieActualId);
        if (yaAceptado) {
            window.activarModoSpoilerSerie(true);
            return;
        }
        const checkbox = document.getElementById('spoilerNoAdvertir');
        if (checkbox) checkbox.checked = false;

        // Apunta los botones del modal compartido a las versiones de Serie
        const btnCancelar  = document.getElementById('btnCancelarSpoilerWarning');
        const btnConfirmar = document.getElementById('btnConfirmarSpoilerWarning');
        if (btnCancelar)  btnCancelar.onclick  = window.cancelarSpoilerWarningSerie;
        if (btnConfirmar) btnConfirmar.onclick = window.confirmarSpoilerWarningSerie;

        const modal = document.getElementById('modalSpoilerWarning');
        if (modal) modal.style.display = 'flex';
        return;
    }
    window.activarModoSpoilerSerie(false);
};

window.confirmarSpoilerWarningSerie = async function() {
    const modal    = document.getElementById('modalSpoilerWarning');
    const checkbox = document.getElementById('spoilerNoAdvertir');
    if (modal) modal.style.display = 'none';
    if (checkbox?.checked && window.serieActualId) {
        await window.guardarSpoilerAceptadoSerie(window.serieActualId);
    }
    window._restaurarBotonesSpoilerWarning();
    window.activarModoSpoilerSerie(true);
};

window.cancelarSpoilerWarningSerie = function() {
    const modal = document.getElementById('modalSpoilerWarning');
    if (modal) modal.style.display = 'none';
    window._restaurarBotonesSpoilerWarning();
};

// Devuelve los botones del modal compartido a los handlers por defecto (Película)
window._restaurarBotonesSpoilerWarning = function() {
    const btnCancelar  = document.getElementById('btnCancelarSpoilerWarning');
    const btnConfirmar = document.getElementById('btnConfirmarSpoilerWarning');
    if (btnCancelar)  btnCancelar.onclick  = window.cancelarSpoilerWarning;
    if (btnConfirmar) btnConfirmar.onclick = window.confirmarSpoilerWarning;
};

window.activarModoSpoilerSerie = function(activar) {
    window.modoSpoilerActivoSerie = activar;

    const toggle   = document.getElementById('spoilerToggleSerie');
    const label    = document.getElementById('spoilerSwitchLabelSerie');
    const textarea = document.getElementById('nuevoComentarioSerie');
    const aviso    = document.getElementById('spoilerAvisoSerie');
    const btnCom   = document.querySelector('#modalSerie .comentario-teaser');
    const header   = document.querySelector('#modalSerie .modal-header');

    toggle?.classList.toggle('activo', window.modoSpoilerActivoSerie);
    label?.classList.toggle('activo', window.modoSpoilerActivoSerie);
    textarea?.classList.toggle('spoiler-mode', window.modoSpoilerActivoSerie);
    if (aviso) aviso.style.display = window.modoSpoilerActivoSerie ? 'block' : 'none';
    if (btnCom) btnCom.classList.toggle('spoiler-mode', window.modoSpoilerActivoSerie);
    header?.classList.toggle('spoiler-mode', window.modoSpoilerActivoSerie);

    const items = document.querySelectorAll('#modalSerie .comentario-item');
    items.forEach(item => {
        item.style.borderLeftColor = window.modoSpoilerActivoSerie ? '#6c63ff' : '#e50914';
    });

    const filaComentarios = document.querySelector('#modalSerie .modal-fila-comentarios');
    const filaBoton = document.querySelector('#modalSerie .modal-fila-boton');
    if (filaComentarios) filaComentarios.classList.toggle('spoiler-mode', window.modoSpoilerActivoSerie);
    if (filaBoton) filaBoton.classList.toggle('spoiler-mode', window.modoSpoilerActivoSerie);

    if (textarea) {
        textarea.placeholder = window.modoSpoilerActivoSerie
            ? 'Escribí tu spoiler... (máx 2000 caracteres)'
            : 'Escribe tu comentario... (máx 2000 caracteres)';
    }

    if (window.serieActualId) {
        window.cargarComentariosSerie(window.serieActualId);
    }
};

// ==============================================
// ENVÍO DE COMENTARIO — SERIE
// ==============================================
window._gifSeleccionadoSerie = null;

window.mostrarAreaComentarioSerie = function() {
    document.querySelectorAll('#modalSerie .reply-form').forEach(f => f.remove());

    document.querySelectorAll('#modalSerie [data-texto-original]').forEach(el => {
        el.textContent = el.dataset.textoOriginal;
        delete el.dataset.textoOriginal;
    });

    const teaser = document.getElementById('comentarioTeaserSerie');
    if (teaser) teaser.style.setProperty('display', 'none', 'important');

    const area = document.getElementById('areaEscrituraSerie');
    if (area) {
        area.style.display = 'block';
        const textarea = document.getElementById('nuevoComentarioSerie');
        if (textarea) {
            textarea.focus();
            const restantes = document.getElementById('caracteresRestantesSerie');
            if (restantes) restantes.textContent = `${textarea.value.length}/2000`;

            // Auto-init del contador de caracteres (una sola vez, primera apertura)
            if (!textarea._contadorInit) {
                textarea._contadorInit = true;
                textarea.addEventListener('input', function() {
                    const longitud = this.value.length;
                    if (restantes) {
                        restantes.textContent = `${longitud}/2000`;
                        restantes.style.color = longitud > 1800 ? '#e50914' : '#666';
                        restantes.style.fontWeight = longitud > 1800 ? 'bold' : 'normal';
                    }
                });
            }

            // Inicializar emoji/gif picker si no está ya
            if (!textarea._emojiPickerInit) {
                textarea._emojiPickerInit = true;
                const triggerBtn = document.getElementById('emojiTriggerMainSerie');
                if (triggerBtn && typeof window.initEmojiPicker === 'function') {
                    window.initEmojiPicker(textarea, triggerBtn);
                }
                if (typeof window.initGifPickerMainSerie === 'function') {
                                    window.initGifPickerMainSerie();
                                }
            }
        }
    }
};

window.abrirComentariosSheetSerie = function(enfocarEscritura) {
    const fila = document.querySelector('#modalSerie .modal-fila-comentarios');
    if (!fila) return;

    fila.classList.add('comentarios-sheet-fixed');
    fila.offsetHeight;
    fila.classList.add('comentarios-sheet-open');

    if (enfocarEscritura) {
        window.mostrarAreaComentarioSerie();
    }
};

window.cerrarComentariosSheetSerie = function() {
    const fila = document.querySelector('#modalSerie .modal-fila-comentarios');
    if (!fila) return;

    fila.classList.remove('comentarios-sheet-open');
    setTimeout(() => {
        fila.classList.remove('comentarios-sheet-fixed');
    }, 300);
};

window.cancelarComentarioSerie = function() {
    const teaser = document.getElementById('comentarioTeaserSerie');
    if (teaser) teaser.style.removeProperty('display');

    const area = document.getElementById('areaEscrituraSerie');
    if (area) area.style.display = 'none';

    const input = document.getElementById('nuevoComentarioSerie');
    if (input) input.value = '';

    const restantes = document.getElementById('caracteresRestantesSerie');
    if (restantes) restantes.textContent = '0/2000';

    window._gifSeleccionadoSerie = null;
    const preview = document.getElementById('gifPreviewMainSerie');
    const img     = document.getElementById('gifPreviewImgMainSerie');
    if (preview) preview.style.display = 'none';
    if (img)     img.src = '';

    if (typeof window.cerrarEmojiPicker === 'function') window.cerrarEmojiPicker();
    if (typeof window.cerrarGifPicker   === 'function') window.cerrarGifPicker();
};

window.enviarComentarioSerie = async function() {
    const input = document.getElementById('nuevoComentarioSerie');
    if (!input) {
        alert('Error: No se pudo encontrar el campo de comentario');
        return;
    }

    const texto = input.value.trim();
    const seriesId = window.serieActualId;

    if (!seriesId) { alert('Error: No hay serie seleccionada'); return; }
    if (!texto && !window._gifSeleccionadoSerie) { alert('Por favor escribe un comentario o seleccioná un GIF'); input.focus(); return; }

    if (texto.length > 2000) {
        alert(`El comentario excede el límite de 2000 caracteres.`);
        input.focus();
        return;
    }

    const btnEnviar = document.querySelector('#modalSerie .btn-enviar');
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

        const response = await fetch(`${CONFIG.API_URL}/series-comments/series/${seriesId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                    content: texto,
                    gifUrl: window._gifSeleccionadoSerie || null,
                    spoiler: window.modoSpoilerActivoSerie
                })
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Sesión expirada. Por favor inicia sesión nuevamente.');
                window.location.href = 'login.html';
                return;
            }

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
        window._gifSeleccionadoSerie = null;
        window.cancelarComentarioSerie();

        const contadorCard = document.getElementById(`comentarios-card-serie-${seriesId}`);
                if (contadorCard) {
                    window._pintarContadorComentarios(contadorCard, parseInt(contadorCard.textContent || '0') + 1);
                }

        await window.cargarComentariosSerie(seriesId);

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

// ==============================================
// OCULTAR RESPUESTA PROPIA — SERIE
// Reutiliza el modal #modalOcultarComentario, mismo patrón de
// reasignación de onclick que ya usamos en Reportar/Ocultar comentario.
// ==============================================
window._replyOcultandoSerieId = null;

window.abrirModalOcultarReplySerie = function(replyId) {
    window._replyOcultandoSerieId = replyId;
    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) btn.onclick = window.confirmarOcultarReplySerie;
    const modal = document.getElementById('modalOcultarComentario');
    if (modal) {
        const titulo = modal.querySelector('h3');
        const texto  = modal.querySelector('p');
        if (titulo) titulo.textContent = 'Ocultar respuesta';
        if (texto)  texto.innerHTML = 'Tu respuesta dejará de ser visible para otros usuarios. Esta acción es <strong>irreversible</strong>. Si la respuesta tiene puntos ganados o reacciones, todo se perderá al ocultarla.';
        modal.style.display = 'flex';
    }
};

window.cerrarModalOcultarReplySerie = function() {
    window._replyOcultandoSerieId = null;
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

window.confirmarOcultarReplySerie = async function() {
    const replyId = window._replyOcultandoSerieId;
    if (!replyId) return;

    const btn = document.getElementById('btnConfirmarOcultar');
    if (btn) { btn.disabled = true; btn.textContent = 'Ocultando...'; }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/series-comments/replies/${replyId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            window.cerrarModalOcultarReplySerie();
            window.mostrarToast(data.error || 'Error al ocultar la respuesta.', 'error');
            return;
        }

        window.cerrarModalOcultarReplySerie();
        window.mostrarToast('Tu respuesta fue ocultada correctamente.', 'success');

        // Recargar el hilo del comentario padre que está abierto (solo contenedores de Serie)
        const containers = document.querySelectorAll('[class*="replies-container-serie-"]');
        for (const c of containers) {
            if (c.style.display !== 'none') {
                const match = c.className.match(/replies-container-serie-(\d+)/);
                if (match) await window.cargarRespuestasSerie(match[1], 0);
                break;
            }
        }

    } catch (error) {
        window.cerrarModalOcultarReplySerie();
        window.mostrarToast('Error al ocultar la respuesta. Intentá de nuevo.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sí, ocultar'; btn.onclick = window.confirmarOcultar; }
    }
};

// ==============================================
// EDITAR COMENTARIO — SERIE
// ==============================================
window.editarComentarioSerie = function(commentId, btn) {
    const contenedorTexto = document.getElementById(`comentario-texto-serie-${commentId}`);
    if (!contenedorTexto) return;

    const area = document.getElementById('areaEscrituraSerie');
    if (area && area.style.display !== 'none' && typeof window.cancelarComentarioSerie === 'function') {
        window.cancelarComentarioSerie();
    }

    document.querySelectorAll('#modalSerie .reply-form').forEach(f => f.remove());

    document.querySelectorAll('#modalSerie [data-texto-original]').forEach(el => {
        if (el !== contenedorTexto) {
            el.textContent = el.dataset.textoOriginal;
            delete el.dataset.textoOriginal;
        }
    });

    const textoActual = contenedorTexto.textContent.trim();
    contenedorTexto.dataset.textoOriginal = textoActual;

    const gifImg = document.getElementById(`comentario-gif-serie-${commentId}`);
    window[`_quitarGifComentarioSerie_${commentId}`] = false;

    contenedorTexto.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.4rem;width:100%;">
            <textarea id="editTextarea-serie-${commentId}"
                style="width:100%;box-sizing:border-box;padding:0.5rem;border:1.5px solid #324C89;border-radius:8px;font-size:0.88rem;font-family:inherit;resize:none;min-height:60px;"
                maxlength="2000">${textoActual}</textarea>
            ${gifImg ? `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-size:0.78rem;color:#888;">GIF adjunto —</span>
                <button onclick="window.marcarQuitarGifComentarioSerie(${commentId}, this)"
                    style="background:none;border:1px solid #ddd;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.75rem;cursor:pointer;color:#c0392b;">
                    Quitar GIF
                </button>
            </div>` : ''}
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
                <button onclick="window.cancelarEdicionComentarioSerie(${commentId})"
                    style="padding:0.3rem 0.75rem;border:1px solid #ddd;background:none;border-radius:6px;font-size:0.78rem;cursor:pointer;color:#666;">
                    Cancelar
                </button>
                <button onclick="window.guardarEdicionComentarioSerie(${commentId})"
                    style="padding:0.3rem 0.75rem;background:#324C89;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;color:white;font-weight:600;">
                    Guardar
                </button>
            </div>
        </div>
    `;
    document.getElementById(`editTextarea-serie-${commentId}`)?.focus();
};

window.marcarQuitarGifComentarioSerie = function(commentId, btn) {
    window[`_quitarGifComentarioSerie_${commentId}`] = true;
    const gifImg = document.getElementById(`comentario-gif-serie-${commentId}`);
    if (gifImg) gifImg.style.display = 'none';
    btn.textContent = 'Se va a quitar al guardar';
    btn.disabled = true;
    btn.style.opacity = '0.6';
};

window.cancelarEdicionComentarioSerie = function(commentId, textoOriginal) {
    const textarea = document.getElementById(`editTextarea-serie-${commentId}`);
    if (!textarea) return;
    const contenedor = textarea.closest('[style*="flex-direction:column"]').parentElement;
    contenedor.innerHTML = `<span>${textoOriginal}</span>`;
};

window.guardarEdicionComentarioSerie = async function(commentId) {
    const textarea = document.getElementById(`editTextarea-serie-${commentId}`);
    if (!textarea) return;
    const nuevoContenido = textarea.value.trim();
    if (!nuevoContenido) return;

    const quitarGif = window[`_quitarGifComentarioSerie_${commentId}`] === true;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}/edit`, {
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

        const contenedorTexto = document.getElementById(`comentario-texto-serie-${commentId}`);
        if (contenedorTexto) contenedorTexto.textContent = data.content;

        if (quitarGif) {
            const gifImg = document.getElementById(`comentario-gif-serie-${commentId}`);
            if (gifImg) gifImg.remove();
        }

        const fechaEl = contenedorTexto?.closest('.comentario-item')?.querySelector('.comentario-fecha');
        if (fechaEl && !fechaEl.querySelector('.editado-label')) {
            fechaEl.insertAdjacentHTML('beforeend',
                ' <span class="editado-label" style="font-size:0.7rem;color:#bbb;">(editado)</span>');
        }

        const btnEditar = contenedorTexto?.closest('.comentario-item')?.querySelector('button[title="Editar comentario"]');
        if (btnEditar) btnEditar.remove();

    } catch (e) {
        alert('Error al guardar la edición');
    }
};

// ==============================================
// EDITAR RESPUESTA — SERIE
// ==============================================
window.editarRespuestaSerie = function(replyId, btn) {
    const contenedorTexto = document.getElementById(`respuesta-texto-serie-${replyId}`);
    if (!contenedorTexto) return;

    const area = document.getElementById('areaEscrituraSerie');
    if (area && area.style.display !== 'none' && typeof window.cancelarComentarioSerie === 'function') {
        window.cancelarComentarioSerie();
    }

    document.querySelectorAll('#modalSerie .reply-form').forEach(f => f.remove());

    document.querySelectorAll('#modalSerie [data-texto-original]').forEach(el => {
        if (el !== contenedorTexto) {
            el.textContent = el.dataset.textoOriginal;
            delete el.dataset.textoOriginal;
        }
    });

    const textoActual = contenedorTexto.textContent.trim();
    contenedorTexto.dataset.textoOriginal = textoActual;

    const gifImg = document.getElementById(`respuesta-gif-serie-${replyId}`);
    window[`_quitarGifRespuestaSerie_${replyId}`] = false;

    contenedorTexto.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.4rem;width:100%;">
            <textarea id="editReplyTextarea-serie-${replyId}"
                style="width:100%;box-sizing:border-box;padding:0.5rem;border:1.5px solid #324C89;border-radius:8px;font-size:0.85rem;font-family:inherit;resize:none;min-height:50px;"
                maxlength="2000">${textoActual}</textarea>
            ${gifImg ? `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-size:0.75rem;color:#888;">GIF adjunto —</span>
                <button onclick="window.marcarQuitarGifRespuestaSerie(${replyId}, this)"
                    style="background:none;border:1px solid #ddd;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.72rem;cursor:pointer;color:#c0392b;">
                    Quitar GIF
                </button>
            </div>` : ''}
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
                <button onclick="window.cancelarEdicionRespuestaSerie(${replyId})"
                    style="padding:0.25rem 0.65rem;border:1px solid #ddd;background:none;border-radius:6px;font-size:0.72rem;cursor:pointer;color:#666;">
                    Cancelar
                </button>
                <button onclick="window.guardarEdicionRespuestaSerie(${replyId})"
                    style="padding:0.25rem 0.65rem;background:#324C89;border:none;border-radius:6px;font-size:0.72rem;cursor:pointer;color:white;font-weight:600;">
                    Guardar
                </button>
            </div>
        </div>
    `;
    document.getElementById(`editReplyTextarea-serie-${replyId}`)?.focus();
};

window.marcarQuitarGifRespuestaSerie = function(replyId, btn) {
    window[`_quitarGifRespuestaSerie_${replyId}`] = true;
    const gifImg = document.getElementById(`respuesta-gif-serie-${replyId}`);
    if (gifImg) gifImg.style.display = 'none';
    btn.textContent = 'Se va a quitar al guardar';
    btn.disabled = true;
    btn.style.opacity = '0.6';
};

window.cancelarEdicionRespuestaSerie = function(replyId) {
    const contenedorTexto = document.getElementById(`respuesta-texto-serie-${replyId}`);
    if (!contenedorTexto) return;
    contenedorTexto.textContent = contenedorTexto.dataset.textoOriginal || '';
};

window.guardarEdicionRespuestaSerie = async function(replyId) {
    const textarea = document.getElementById(`editReplyTextarea-serie-${replyId}`);
    if (!textarea) return;
    const nuevoContenido = textarea.value.trim();
    if (!nuevoContenido) return;

    const quitarGif = window[`_quitarGifRespuestaSerie_${replyId}`] === true;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/series-comments/replies/${replyId}/edit`, {
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

        const contenedorTexto = document.getElementById(`respuesta-texto-serie-${replyId}`);
        if (contenedorTexto) contenedorTexto.textContent = data.content;

        if (quitarGif) {
            const gifImg = document.getElementById(`respuesta-gif-serie-${replyId}`);
            if (gifImg) gifImg.remove();
        }

        const fechaEl = document.getElementById(`respuesta-fecha-serie-${replyId}`);
        if (fechaEl && !fechaEl.querySelector('.editado-label')) {
            fechaEl.insertAdjacentHTML('beforeend',
                ' <span class="editado-label" style="color:#bbb;">(editado)</span>');
        }

        const btnEditar = document.querySelector(`[onclick="window.editarRespuestaSerie(${replyId}, this)"]`);
        if (btnEditar) btnEditar.remove();
    } catch (e) {
        alert('Error de conexión al guardar la edición');
    }
};

// ==============================================
// TEMPORADAS — carrusel en el modal + modal hijo
// ==============================================
window._renderTemporadasSerie = function(seriesId, seriesName, seasons) {
    const seccion = document.getElementById('temporadasSeccionSerie');
    const track   = document.getElementById('temporadasTrackSerie');
    const resumen = document.getElementById('temporadasResumenSerie');
    if (!seccion || !track) return;

    const temporadasReales = (seasons || []).filter(s => s.season_number > 0);

    if (temporadasReales.length === 0) {
        seccion.style.display = 'none';
        return;
    }

    seccion.style.display = 'block';

    const totalEpisodios = temporadasReales.reduce((acc, s) => acc + (s.episode_count || 0), 0);
    if (resumen) resumen.textContent = `${temporadasReales.length} temporadas · ${totalEpisodios} episodios`;

    track.innerHTML = temporadasReales.map(s => `
        <div class="temporada-card" onclick="window.abrirModalTemporada(${seriesId}, ${s.season_number}, '${seriesName.replace(/'/g, "\\'")}')">
            <div class="temporada-card-poster">
                ${s.poster_path
                    ? `<img src="https://image.tmdb.org/t/p/w300${s.poster_path}" alt="${s.name}">`
                    : `<i class="fas fa-image"></i>`
                }
            </div>
            <p class="temporada-card-nombre">${s.name}</p>
            <p class="temporada-card-episodios">${s.episode_count || 0} ep.</p>
        </div>
    `).join('');
};

window.abrirModalTemporada = async function(seriesId, seasonNumber, seriesName) {
    const modal = document.getElementById('modalTemporada');
    const body  = document.getElementById('modalTemporadaBody');
    const nombreSerie = document.getElementById('modalTemporadaSerieNombre');
    const numero = document.getElementById('modalTemporadaNumero');
    if (!modal || !body) return;

    nombreSerie.textContent = seriesName;
    numero.textContent = `Temporada ${seasonNumber}`;
    body.innerHTML = '<div class="modal-temporada-loading">Cargando temporada...</div>';
    modal.style.display = 'flex';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/series/${seriesId}/season/${seasonNumber}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const temporada = await res.json();

        const episodios = temporada.episodes || [];

        body.innerHTML = `
            <div class="modal-temporada-datos">
                <div class="modal-temporada-poster">
                    ${temporada.poster_path
                        ? `<img src="https://image.tmdb.org/t/p/w300${temporada.poster_path}" alt="${temporada.name}">`
                        : ''}
                </div>
                <div class="modal-temporada-chips">
                    <div class="modal-temporada-chip">
                        <p class="modal-temporada-chip-label"><i class="fas fa-calendar"></i> Estreno</p>
                        <p class="modal-temporada-chip-valor">${temporada.air_date ? new Date(temporada.air_date).toLocaleDateString('es-ES') : 'N/A'}</p>
                    </div>
                    <div class="modal-temporada-chip">
                        <p class="modal-temporada-chip-label"><i class="fas fa-list-ol"></i> Episodios</p>
                        <p class="modal-temporada-chip-valor">${episodios.length}</p>
                    </div>
                </div>
            </div>

            ${temporada.overview ? `
            <div class="modal-temporada-sinopsis">
                <p class="modal-temporada-sinopsis-titulo"><i class="fas fa-align-left"></i> Sinopsis de la temporada</p>
                <p>${temporada.overview}</p>
            </div>` : ''}

            <p class="modal-temporada-episodios-titulo">Episodios</p>
            <div>
                ${episodios.map(e => `
                    <div class="episodio-item">
                        <span class="episodio-numero">${e.episode_number}</span>
                        <div class="episodio-info">
                            <p class="episodio-nombre">${e.name || 'Sin título'}</p>
                            <p class="episodio-fecha">${e.air_date ? new Date(e.air_date).toLocaleDateString('es-ES') : ''}${e.runtime ? ` · ${e.runtime} min` : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        body.innerHTML = '<div class="modal-temporada-loading">Error al cargar la temporada.</div>';
    }
};

// Vuelve a la serie (el modal de serie sigue abierto detrás, nunca se cerró)
window.cerrarModalTemporada = function() {
    const modal = document.getElementById('modalTemporada');
    if (modal) modal.style.display = 'none';
};

// Cierra todo (temporada + serie) — para el botón "×"
window.cerrarModalTemporadaDelTodo = function() {
    window.cerrarModalTemporada();
    if (typeof window.cerrarModalSerie === 'function') window.cerrarModalSerie();
};