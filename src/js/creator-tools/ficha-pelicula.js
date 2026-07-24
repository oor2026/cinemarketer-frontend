// ==============================================
// CREATOR TOOLS — Ficha técnica de película
// ==============================================
// Se registra en window.CreatorTools para que comunidad.js la use de forma
// genérica (menú del workflow, render en el feed, resolución async del
// poster) sin conocer nada específico de esta herramienta.

(function() {
    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    const TMDB_GENEROS_FICHA = {
        28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
        80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
        14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
        9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia Ficción',
        10770: 'Película de TV', 53: 'Suspenso', 10752: 'Bélica', 37: 'Western'
    };

    // Placeholder que se inserta en la card mientras se resuelve el fetch
    function renderEnCard(pub) {
        return `
            <div class="com-card-ficha-pelicula" id="fichaPelicula-${pub.id}" data-movie-id="${pub.movieId}"
                 style="margin:0 1rem 10px;border:1px solid #eee;border-radius:10px;display:flex;overflow:hidden;min-height:90px;cursor:pointer;"
                 onclick="window._abrirPeliculaDesdeModalPublicacion(${pub.movieId})">
                <div style="width:70px;flex-shrink:0;aspect-ratio:2/3;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-spinner fa-spin" style="color:#ccc;"></i>
                </div>
                <div style="flex:1;min-width:0;padding:10px 12px;display:flex;align-items:center;">
                    <span style="font-size:0.8rem;color:#999;">Cargando ficha...</span>
                </div>
            </div>`;
    }

    // Se llama después de insertar el HTML de arriba en el DOM — resuelve
    // el fetch a GET /movies/{id} y reemplaza el placeholder por los datos
    // reales (o por "Película no disponible" si ya no existe). Se mantiene
    // el nombre y la firma (pubId, movieId) porque novedades.js ya la llama
    // así directamente — así no hace falta tocar ese archivo.
    window.resolverFichaPelicula = async function(pubId, movieId) {
        const wrap = document.getElementById(`fichaPelicula-${pubId}`);
        if (!wrap) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/movies/${movieId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('not found');
            const m = await res.json();

            const posterUrl = m.poster_path
                ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
                : '';
            const anio = m.release_date ? m.release_date.slice(0, 4) : '';
            const generoIds = m.genre_ids || (m.genres?.map(g => g.id)) || [];
            const genero = generoIds.length > 0 ? (TMDB_GENEROS_FICHA[generoIds[0]] || '') : '';

            wrap.innerHTML = `
                <div style="width:70px;flex-shrink:0;aspect-ratio:2/3;background:#f5f5f5;">
                    <img src="${posterUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';">
                </div>
                <div style="flex:1;min-width:0;padding:10px 12px;display:flex;flex-direction:column;gap:3px;">
                    <span style="font-weight:600;font-size:0.85rem;color:#1a1a1a;">${escapeHtml(m.title || '')}</span>
                    <span style="font-size:0.72rem;color:#999;">${[anio, genero].filter(Boolean).join(' · ')}</span>
                    <span style="font-size:0.72rem;color:#999;"><i class="fas fa-star" style="color:#f5a623;"></i> ${m.vote_average ? m.vote_average.toFixed(1) : '—'}</span>
                    <span style="font-size:0.72rem;color:#bbb;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(m.overview || '')}</span>
                </div>`;
        } catch (e) {
            wrap.innerHTML = `
                <div style="width:70px;flex-shrink:0;aspect-ratio:2/3;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-film" style="color:#ccc;"></i>
                </div>
                <div style="flex:1;min-width:0;padding:10px 12px;display:flex;align-items:center;">
                    <span style="font-size:0.8rem;color:#bbb;">Película no disponible</span>
                </div>`;
            wrap.style.cursor = 'default';
            wrap.onclick = null;
        }
    };

    window.CreatorTools = window.CreatorTools || [];
    window.CreatorTools.push({
        key: 'FICHA',
        emoji: '🎬',
        label: 'Ficha técnica',
        desc: 'Poster, año, rating y sinopsis de la película',
        disponible: true,
        bloqueaImagenVideo: true,
        activoPara: (pub) => !!(pub.movieId && pub.movieFichaEnabled),
        onSeleccionar: (_wf, activo) => { _wf.movieFichaEnabled = activo; },
        renderEnCard: renderEnCard,
        resolverEnCard: (pub) => window.resolverFichaPelicula(pub.id, pub.movieId)
    });
})();