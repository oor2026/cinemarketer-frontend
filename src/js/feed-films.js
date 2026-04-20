// ==============================================
// feed-films.js - Módulo de películas
// ==============================================

console.log('🎬 Feed-films módulo JS cargado');

// ==============================================
// LIMPIAR MODALES DUPLICADOS
// ==============================================
function limpiarModalesDuplicados() {
    const modales = document.querySelectorAll('#modalPelicula');
    if (modales.length > 1) {
        console.log(`🧹 Eliminando ${modales.length - 1} modales duplicados`);
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
window._comentarioOcultandoId = null;

// ==============================================
// FUNCIÓN PARA CARGAR COMPONENTES HTML
// ==============================================
async function cargarComponente(url, contenedorId) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        document.getElementById(contenedorId).innerHTML = html;
    } catch (error) {
        console.error(`Error cargando componente ${url}:`, error);
    }
}

// ==============================================
// FUNCIÓN PARA GENERAR TARJETAS
// ==============================================
window.generarTarjetasHTML = async function(peliculas) {
    try {
        const response = await fetch('modules/feed-tarjeta.html');
        let plantilla = await response.text();

        return peliculas.map(pelicula => {
            const posterUrl = pelicula.poster_path
                ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
                : 'https://via.placeholder.com/300x450?text=Sin+imagen';

            const year = pelicula.release_date
                ? new Date(pelicula.release_date).getFullYear()
                : 'Próximamente';

            const overview = pelicula.overview
                ? pelicula.overview.substring(0, 120) + '...'
                : 'Sinopsis no disponible';

            return plantilla
                .replace(/{id}/g, pelicula.id)
                .replace(/{posterUrl}/g, posterUrl)
                .replace(/{title}/g, pelicula.title)
                .replace(/{vote_average}/g, pelicula.vote_average.toFixed(1))
                .replace(/{year}/g, year)
                .replace(/{overview}/g, overview)
                .replace(/{popularity}/g, Math.round(pelicula.popularity))
                .replace(/{vote_count}/g, pelicula.vote_count);
        }).join('');

    } catch (error) {
        console.error('❌ Error cargando plantilla:', error);
        return generarTarjetasFallback(peliculas);
    }
};

function generarTarjetasFallback(peliculas) {
    return peliculas.map(pelicula => {
        const posterUrl = pelicula.poster_path
            ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
            : 'https://via.placeholder.com/300x450?text=Sin+imagen';

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
                    <p class="pelicula-descripcion">${pelicula.overview?.substring(0, 120)}...</p>
                    <div class="pelicula-metadata">
                        <span><i class="fas fa-clock"></i> Popularidad: ${Math.round(pelicula.popularity)}</span>
                    </div>
                    <div class="votacion-container">
                        <div class="votacion-buttons">
                            <button class="btn-like" onclick="window.votarPelicula(${pelicula.id}, 'like')">
                                <i class="fas fa-thumbs-up"></i> ${pelicula.vote_count}
                            </button>
                            <button class="btn-dislike" onclick="window.votarPelicula(${pelicula.id}, 'dislike')">
                                <i class="fas fa-thumbs-down"></i> 0
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

    window.estadoPaginacion.cargando = true;
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando películas...</div>';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            grid.innerHTML = '<div class="error">Error de autenticación</div>';
            return;
        }

        const response = await fetch(`${CONFIG.API_URL}/movies/popular?page=${pagina}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        window.estadoPaginacion.paginaActual = data.page;
        window.estadoPaginacion.totalPaginas = data.total_pages;
        window.estadoPaginacion.totalResultados = data.total_results;

        document.getElementById('resultadosCount').textContent = data.results.length;
        grid.innerHTML = await window.generarTarjetasHTML(data.results);

        limpiarModalesDuplicados();

        if (typeof window.cargarEstadisticasVotacion === 'function') {
            window.cargarEstadisticasVotacion();
        }
        window.actualizarBotonesPaginacion();

    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        window.estadoPaginacion.cargando = false;
    }
};

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
        } else {
            const response = await fetch(`${CONFIG.API_URL}/movies/popular?page=${siguientePagina}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            data = await response.json();
        }

        window.estadoPaginacion.paginaActual    = data.page;
        window.estadoPaginacion.totalPaginas    = data.total_pages;
        window.estadoPaginacion.totalResultados = data.total_results;

        // Acumular — agregar al grid sin reemplazar
        const nuevoHTML = await window.generarTarjetasHTML(data.results);
        grid.insertAdjacentHTML('beforeend', nuevoHTML);

        if (typeof window.cargarEstadisticasVotacion === 'function') {
            window.cargarEstadisticasVotacion();
        }

        window.actualizarBotonesPaginacion();

    } catch (error) {
        console.error('Error al cargar más:', error);
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
        await window.cargarPeliculasPopulares(nuevaPagina);
    }
    document.querySelector('.resultados-header')?.scrollIntoView({ behavior: 'smooth' });
};

// ==============================================
// ORDENAR PELÍCULAS
// ==============================================
window.ordenarPeliculas = async function() {
    const criterio = document.getElementById('ordenarPor')?.value || 'popularidad';
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
            case 'popularidad':
                if (statsA.totalVotos === 0 && statsB.totalVotos === 0) {
                    const yearA = parseInt(a.querySelector('.año')?.textContent || '0');
                    const yearB = parseInt(b.querySelector('.año')?.textContent || '0');
                    return yearB - yearA;
                }
                if (statsA.totalVotos === 0) return 1;
                if (statsB.totalVotos === 0) return -1;
                return statsB.porcentaje - statsA.porcentaje;
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

            const comentariosEl = card.querySelector(`#comentarios-${movieId}`);
            if (comentariosEl) comentariosEl.textContent = stats.comentarios;
        }
    });
};

// ==============================================
// VOTAR PELÍCULA
// ==============================================
window.votarPelicula = async function(movieId, tipo, event) {
    if (event) event.stopPropagation();

    if (!movieId) {
        console.error('❌ votarPelicula: movieId no definido');
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
            if (modalRating)   modalRating.textContent   = `⭐ ${stats.totalVotes} votos`;

            const btnLike    = document.querySelector('#modalPelicula .btn-like');
            const btnDislike = document.querySelector('#modalPelicula .btn-dislike');
            btnLike?.classList.toggle('votado', stats.userVoteType === 'LIKE');
            btnDislike?.classList.toggle('votado', stats.userVoteType === 'DISLIKE');
        }

    } catch (error) {
        console.error('❌ Error al votar:', error);
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
                    const contadorEl = card.querySelector(`#comentarios-${movieId}`);
                    if (contadorEl) contadorEl.textContent = comentarios.length;
                }
            } catch (ce) {}
        } catch (e) {
            console.warn(`⚠️ No se pudieron cargar stats para película ${movieId}`);
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

window.aplicarFiltros = async function(pagina = 1) {
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

    if (!hayFiltros) {
        alert('Por favor completá al menos un criterio de búsqueda antes de aplicar filtros.');
        return;
    }

    const grid = document.getElementById('peliculasGrid');
    if (!grid) return;
    if (window.estadoPaginacion.cargando) return;

    window.estadoPaginacion.cargando = true;
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Buscando películas...</div>';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            grid.innerHTML = '<div class="error">Error de autenticación</div>';
            return;
        }

        const params = new URLSearchParams();
        params.append('page', pagina);

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
        const data = await response.json();

        window.estadoPaginacion.paginaActual = data.page;
        window.estadoPaginacion.totalPaginas = data.total_pages;
        window.estadoPaginacion.totalResultados = data.total_results;

        const countEl = document.getElementById('resultadosCount');
        if (countEl) countEl.textContent = data.results?.length || 0;

        if (!data.results || data.results.length === 0) {
            grid.innerHTML = '<div class="sin-resultados"><i class="fas fa-film"></i><p>No se encontraron películas con esos filtros.</p></div>';
        } else {
            grid.innerHTML = await window.generarTarjetasHTML(data.results);
            limpiarModalesDuplicados();
            if (typeof window.cargarEstadisticasVotacion === 'function') {
                window.cargarEstadisticasVotacion();
            }
        }
        window.actualizarBotonesPaginacion();

    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        window.estadoPaginacion.cargando = false;
    }
};

window.limpiarFiltros = function() {
    ['busquedaInput', 'busquedaDirector'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    ['filtroGenero', 'filtroAnio', 'filtroIdioma', 'filtroPopularidad', 'filtroDuracion'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.selectedIndex = 0;
    });

    ['busquedaResultados', 'directorResultados'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    window._directorSeleccionadoId = '';
    window.cargarPeliculasPopulares(1);
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
        console.error('❌ MODAL NO ENCONTRADO');
        return;
    }

    setTimeout(() => {
        window.cargarDatosPelicula(id);
        window.cargarComentariosPelicula(id);
        modal.style.display = 'flex';
        inicializarContadorCaracteres();
        inicializarCarrusel();
        irASlide(0);
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

        window.peliculaActualId = null;
        window.modalActualId = null;
        window.cancelarComentario();
    }
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
        if (idioma)      idioma.textContent      = (pelicula.original_language || 'N/A').toUpperCase();
        if (popularidad) popularidad.textContent = Math.round(pelicula.popularity || 0);
        if (votos)       votos.textContent       = pelicula.vote_count || 0;
        if (generos)     generos.textContent     = pelicula.genres?.map(g => g.name).join(', ') || 'No especificado';

        const statsResponse = await fetch(`${CONFIG.API_URL}/reviews/movies/${id}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('modalRating').textContent    = `⭐ ${stats.totalVotes} votos`;
            document.getElementById('modalLikes').textContent    = stats.likes || 0;
            document.getElementById('modalDislikes').textContent = stats.dislikes || 0;

            const btnLike    = document.querySelector('#modalPelicula .btn-like');
            const btnDislike = document.querySelector('#modalPelicula .btn-dislike');
            btnLike?.classList.remove('votado');
            btnDislike?.classList.remove('votado');

            if (stats.userVoted) {
                if (stats.userVoteType === 'LIKE')    btnLike?.classList.add('votado');
                if (stats.userVoteType === 'DISLIKE') btnDislike?.classList.add('votado');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('modalTitulo').textContent = 'Error al cargar';
    }
};

// ==============================================
// CARGAR COMENTARIOS — con botón reportar
// ==============================================
window.cargarComentariosPelicula = async function(id) {
    let lista = document.getElementById('comentariosLista');
    let intentos = 0;

    while (!lista && intentos < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        lista = document.getElementById('comentariosLista');
        intentos++;
    }

    if (!lista) {
        console.warn('⚠️ Elemento comentariosLista no encontrado después de 1 segundo');
        return;
    }

    lista.innerHTML = '<div class="sin-comentarios">Cargando comentarios...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/comments/movies/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar comentarios');
        const comentarios = await response.json();

        const modalComentariosCount = document.getElementById('modalComentariosCount');
        if (modalComentariosCount) modalComentariosCount.textContent = `💬 ${comentarios.length} comentarios`;

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
                item.style.cssText = 'display:flex; gap:0.75rem; padding:0.75rem 0; border-bottom:1px solid #f0f0f0; align-items:flex-start;';
                item.innerHTML = `
                    <div class="comentario-avatar" style="flex-shrink:0;">
                        ${c.avatarUrl
                            ? `<img src="${c.avatarUrl}" alt="${c.userName}" style="width:36px;height:36px;object-fit:cover;border-radius:50%;">`
                            : `<div style="width:36px;height:36px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:0.85rem;">${c.userName?.charAt(0) || 'U'}</div>`
                        }
                    </div>
                    <div class="comentario-contenido" style="flex:1;min-width:0;width:100%;">
                        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                            <span class="comentario-autor" style="font-weight:600;font-size:0.85rem;color:#333;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.userName || 'Usuario'}</span>
                            <div style="display:flex;align-items:center;gap:0.2rem;flex-shrink:0;">
                                ${btnReporte}
                                ${btnOcultar}
                            </div>
                        </div>
                        <div class="comentario-texto" style="font-size:0.9rem;color:#444;margin:0.25rem 0;word-break:break-word;">${c.content}</div>
                        <div class="comentario-fecha" style="font-size:0.75rem;color:#999;">${new Date(c.createdAt).toLocaleDateString('es-ES')}</div>
                    </div>
                `;
                lista.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        if (lista) lista.innerHTML = '<div class="sin-comentarios">Error al cargar comentarios</div>';
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
    if (!commentId) return;

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
        const response = await fetch(`${CONFIG.API_URL}/comments/${commentId}/report`, {
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
        console.error('❌ Error enviando reporte:', error);
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
    if (modal) modal.style.display = 'flex';
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
        console.error('❌ Error ocultando comentario:', error);
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
// FUNCIONES DE COMENTARIOS EN MODAL
// ==============================================
window.mostrarAreaComentario = function() {
    const area = document.getElementById('areaEscritura');
    if (area) {
        area.style.display = 'block';
        const textarea = document.getElementById('nuevoComentario');
        if (textarea) {
            textarea.focus();
            const restantes = document.getElementById('caracteresRestantes');
            if (restantes) restantes.textContent = `${textarea.value.length}/2000`;
        }
    }
};

window.cancelarComentario = function() {
    const area = document.getElementById('areaEscritura');
    if (area) area.style.display = 'none';

    const input = document.getElementById('nuevoComentario');
    if (input) input.value = '';

    const restantes = document.getElementById('caracteresRestantes');
    if (restantes) restantes.textContent = '0/2000';
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
    if (!texto)   { alert('Por favor escribe un comentario'); input.focus(); return; }

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
            body: JSON.stringify({ content: texto })
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
                alert(data.error || 'Tu comentario no pudo publicarse por no cumplir con nuestras politicas de convivencia.');
                return;
            }

            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const comentario = await response.json();

        input.value = '';
        window.cancelarComentario();

        const contadorCard = document.getElementById(`comentarios-${movieId}`);
        if (contadorCard) {
            contadorCard.textContent = parseInt(contadorCard.textContent || '0') + 1;
        }

        await window.cargarComentariosPelicula(movieId);
        showToast('success', '¡Comentario enviado con éxito!');

    } catch (error) {
        console.error('❌ Error al enviar comentario:', error);
        alert('Error al enviar comentario. Por favor intenta de nuevo.');
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
// AUTOCOMPLETADO DE DIRECTOR
// ==============================================
window._directorSeleccionadoId = '';

function inicializarAutocompletadoDirector() {
    const input     = document.getElementById('busquedaDirector');
    const resultados = document.getElementById('directorResultados');
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
                const response = await fetch(
                    `${CONFIG.API_URL}/movies/people/search?query=${encodeURIComponent(query)}`,
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
                console.warn('⚠️ Error en autocompletado director:', e);
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

    await cargarComponente('modules/feed-filtros.html', 'filtros-container');
    await cargarComponente('modules/feed-paginacion.html', 'paginacion-container');

    setTimeout(() => {
        const content = document.getElementById('filtrosContent');
        if (content) content.style.display = 'none';
        poblarFiltroAnio();
        inicializarAutocompletadoDirector();
    }, 200);

    window.cargarPeliculasPopulares(1);
    inicializarContadorCaracteres();
    window.addEventListener('resize', window.actualizarBotonesPaginacion);
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

    document.getElementById('filtrosModalOverlay').classList.add('active');
    document.getElementById('filtrosModalSheet').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cerrarFiltrosModal() {
    document.getElementById('filtrosModalOverlay').classList.remove('active');
    document.getElementById('filtrosModalSheet').classList.remove('active');
    document.body.style.overflow = '';
}

function aplicarFiltrosMobile() {
    document.getElementById('busquedaInput').value    = document.getElementById('busquedaInputMobile').value;
    document.getElementById('filtroGenero').value     = document.getElementById('filtroGeneroMobile').value;
    document.getElementById('filtroAnio').value       = document.getElementById('filtroAnioMobile').value;
    document.getElementById('filtroIdioma').value     = document.getElementById('filtroIdiomaMobile').value;
    document.getElementById('filtroPopularidad').value = document.getElementById('filtroPopularidadMobile').value;
    document.getElementById('filtroDuracion').value   = document.getElementById('filtroDuracionMobile').value;

    cerrarFiltrosModal();
    window.aplicarFiltros();
}

function limpiarFiltrosMobile() {
    document.getElementById('busquedaInputMobile').value      = '';
    document.getElementById('filtroGeneroMobile').value       = 'todos';
    document.getElementById('filtroAnioMobile').value         = 'todos';
    document.getElementById('filtroIdiomaMobile').value       = 'todos';
    document.getElementById('filtroPopularidadMobile').value  = 'todas';
    document.getElementById('filtroDuracionMobile').value     = 'todos';
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