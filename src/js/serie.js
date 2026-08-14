// ==============================================
// serie.js — Landing pública de serie
// ==============================================

const API_URL = 'https://cinemarketer-backend-production.up.railway.app';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

let _serieId = null;

// ==============================================
// INIT
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    _serieId = params.get('id');

    if (!_serieId) {
        mostrarError();
        return;
    }

    cargarSerie(_serieId);
});

// ==============================================
// CARGAR DATOS
// ==============================================
async function cargarSerie(seriesId) {
    try {
        const [serieRes, votosRes, comentariosRes, trailerRes] = await Promise.allSettled([
            fetch(`${API_URL}/api/public/series/${seriesId}`),
            fetch(`${API_URL}/api/public/series/${seriesId}/stats`),
            fetch(`${API_URL}/api/public/series/${seriesId}/comments?page=0&size=10`),
            fetch(`${API_URL}/api/public/series/${seriesId}/trailer`)
        ]);

        // Datos de la serie (obligatorio)
        if (serieRes.status === 'rejected' || !serieRes.value.ok) {
            mostrarError();
            return;
        }
        const serie = await serieRes.value.json();
        renderSerie(serie);

        // Votos (opcional)
        if (votosRes.status === 'fulfilled' && votosRes.value.ok) {
            const votos = await votosRes.value.json();
            renderVotos(votos);
        } else {
            renderVotos({ likes: 0, dislikes: 0 });
        }

        // Comentarios (opcional)
        if (comentariosRes.status === 'fulfilled' && comentariosRes.value.ok) {
            const data = await comentariosRes.value.json();
            renderComentarios(data.content || data.comentarios || []);
        } else {
            renderComentarios([]);
        }

        // Trailer (opcional)
        if (trailerRes.status === 'fulfilled' && trailerRes.value.ok) {
            const trailerData = await trailerRes.value.json();
            renderTrailer(trailerData.youtubeKey || trailerData.key || null);
        } else {
            renderTrailer(null);
        }

        document.getElementById('pubLoading').style.display = 'none';
        document.getElementById('pubContenido').style.display = 'block';

    } catch (err) {
        console.error('[serie.js] Error:', err);
        mostrarError();
    }
}

// ==============================================
// RENDER SERIE
// ==============================================
function renderSerie(serie) {
    document.getElementById('pubTitulo').textContent = serie.name || serie.title || serie.titulo || '—';
    document.title = `${serie.name || serie.title || serie.titulo} — Cinemarketer`;

    const posterWrap = document.getElementById('pubPosterWrap');
    const posterPath = serie.posterPath || serie.poster_path;
    if (posterPath) {
        posterWrap.innerHTML = `<img src="${TMDB_IMG}${posterPath}" alt="${serie.name || ''}" loading="lazy">`;
    }

    const generosEl = document.getElementById('pubGeneros');
    const generos = serie.genres || serie.generos || [];
    if (generos.length > 0) {
        generosEl.innerHTML = generos.map(g =>
            `<span class="pub-genero-tag">${g.name || g.nombre || g}</span>`
        ).join('');
    }

    const metaEl = document.getElementById('pubMeta');
    const items = [];
    if (serie.firstAirDate || serie.first_air_date) {
        const fecha = formatearFecha(serie.firstAirDate || serie.first_air_date);
        if (fecha) items.push(`<span><strong>Estreno:</strong> ${fecha}</span>`);
    }
    const temporadas = serie.numberOfSeasons || serie.number_of_seasons;
    if (temporadas) {
        items.push(`<span><strong>Temporadas:</strong> ${temporadas}</span>`);
    }
    if (serie.originalLanguage || serie.idiomaOriginal || serie.original_language) {
        items.push(`<span><strong>Idioma original:</strong> ${(serie.originalLanguage || serie.idiomaOriginal || serie.original_language).toUpperCase()}</span>`);
    }
    metaEl.innerHTML = items.join('');

    const sinopsis = serie.overview || serie.sinopsis || '';
    document.getElementById('pubSinopsisTexto').textContent = sinopsis || 'Sin sinopsis disponible.';
}

// ==============================================
// RENDER VOTOS
// ==============================================
function renderVotos(votos) {
    const likes = votos.likes || votos.likesCount || 0;
    const dislikes = votos.dislikes || votos.dislikesCount || 0;
    const total = likes + dislikes;

    const pctLike = total > 0 ? Math.round((likes / total) * 100) : 0;
    const pctDislike = total > 0 ? 100 - pctLike : 0;

    document.getElementById('pubLikes').textContent = likes;
    document.getElementById('pubDislikes').textContent = dislikes;
    document.getElementById('pubPctLike').textContent = `${pctLike}%`;
    document.getElementById('pubPctDislike').textContent = `${pctDislike}%`;
    document.getElementById('pubBarraFill').style.width = `${pctLike}%`;
}

// ==============================================
// RENDER TRAILER
// ==============================================
function renderTrailer(youtubeKey) {
    const wrap = document.getElementById('pubTrailerWrap');
    if (youtubeKey) {
        wrap.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${youtubeKey}?rel=0&modestbranding=1"
                title="Tráiler"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>`;
    }
}

// ==============================================
// RENDER COMENTARIOS
// ==============================================
function renderComentarios(comentarios) {
    const lista = document.getElementById('pubComentariosList');

    const publicos = comentarios.filter(c => !c.spoiler && !c.esSpoiler);

    if (publicos.length === 0) {
        lista.innerHTML = `<div class="pub-sin-comentarios">
            <i class="fas fa-comment-slash" style="font-size:1.5rem;color:#ccc;display:block;margin-bottom:0.5rem;"></i>
            Todavía no hay comentarios públicos para esta serie.
        </div>`;
        return;
    }

    lista.innerHTML = publicos.map(c => {
        const inicial = (c.userName || c.usuario || 'U').charAt(0).toUpperCase();
        const avatarHtml = c.userAvatar
            ? `<img src="${c.userAvatar}" alt="${inicial}">`
            : inicial;

        const banco = c.bancoCount || c.tesBanco || 0;
        const merece = c.merecePuntoCount || c.merecesPunto || 0;
        const respuestas = c.replyCount || c.respuestas || 0;

        return `
        <div class="pub-comentario-item">
            <div class="pub-comentario-header">
                <div class="pub-avatar">${avatarHtml}</div>
                <span class="pub-comentario-autor">${c.userName || c.usuario || 'Usuario'}</span>
                <span class="pub-comentario-fecha">${c.fechaRelativa || formatearFechaRelativa(c.createdAt || c.fechaCreacion) || ''}</span>
            </div>
            <div class="pub-comentario-texto">${escapeHtml(c.contenido || c.texto || '')}</div>
            <div class="pub-comentario-reacciones">
                <span class="pub-reaccion"><i class="fas fa-thumbs-up"></i> ${banco}</span>
                <span class="pub-reaccion"><i class="fas fa-star"></i> ${merece}</span>
                <span class="pub-reaccion"><i class="fas fa-reply"></i> ${respuestas}</span>
            </div>
        </div>`;
    }).join('');
}

// ==============================================
// MODAL CTA
// ==============================================
function abrirModalCTA() {
    document.getElementById('modalCTA').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModalCTA() {
    document.getElementById('modalCTA').classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('modalCTA').addEventListener('click', function(e) {
    if (e.target === this) cerrarModalCTA();
});

document.addEventListener('click', function(e) {
    const esInteraccion = e.target.closest(
        '.pub-comentario-reacciones, .btn-like, .btn-dislike, .btn-recomendar, .btn-comentar'
    );
    if (esInteraccion) {
        e.preventDefault();
        e.stopPropagation();
        abrirModalCTA();
    }
});

// ==============================================
// HELPERS
// ==============================================
function mostrarError() {
    document.getElementById('pubLoading').style.display = 'none';
    document.getElementById('pubError').style.display = 'flex';
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatearFecha(fecha) {
    if (!fecha) return null;
    try {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return fecha; }
}

function formatearFechaRelativa(fecha) {
    if (!fecha) return '';
    try {
        const d = new Date(fecha);
        const diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
        if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
        return d.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
    } catch { return ''; }
}