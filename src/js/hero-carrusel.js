// ========== HERO CARRUSEL — TMDB BACKDROPS ==========
(function() {
    const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZjFjNjgyZDZkNTMzNWIzMjQyNzc3MzQ2OWUxNmE1MSIsIm5iZiI6MTc3MTE3NzkxNy44ODEsInN1YiI6IjY5OTIwN2JkOTRjZDE0N2M5ZjFhZWY2OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.8GieGBESmuWLnoD_IyFrBbXBCX40qUKE8vY6VBMj_DM';
    const BASE_IMG   = 'https://image.tmdb.org/t/p/w1280';
    const INTERVAL   = 4500;
    const TOTAL      = 8;

    let slides  = [];
    let current = 0;
    let timer   = null;

    const track  = document.getElementById('heroCarruselTrack');
    const dotsEl = document.getElementById('heroCarruselDots');
    const box    = document.getElementById('heroCarrusel');

    const loading = document.createElement('div');
    loading.className = 'hero-carrusel-loading';
    loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando películas...';
    box.appendChild(loading);

    async function fetchBackdrops() {
        try {
            const res = await fetch(
                'https://api.themoviedb.org/3/movie/now_playing?language=es-AR&region=AR&page=1',
                {
                    headers: {
                        'Authorization': `Bearer ${TMDB_TOKEN}`,
                        'accept': 'application/json'
                    }
                }
            );
            const data = await res.json();

            slides = data.results
                .filter(m => m.backdrop_path)
                .slice(0, TOTAL);

            // Fallback a popular si now_playing no da suficientes resultados
            if (slides.length < 3) {
                const res2 = await fetch(
                    'https://api.themoviedb.org/3/movie/popular?language=es-AR&region=AR&page=1',
                    {
                        headers: {
                            'Authorization': `Bearer ${TMDB_TOKEN}`,
                            'accept': 'application/json'
                        }
                    }
                );
                const data2 = await res2.json();
                const extra = data2.results
                    .filter(m => m.backdrop_path && !slides.find(s => s.id === m.id))
                    .slice(0, TOTAL - slides.length);
                slides = [...slides, ...extra];
            }

            if (slides.length === 0) {
                if (box.contains(loading)) box.removeChild(loading);
                box.style.display = 'none';
                return;
            }

            renderSlides();
            if (box.contains(loading)) box.removeChild(loading);
            startAutoplay();

        } catch(e) {
            if (box.contains(loading)) box.removeChild(loading);
            box.style.display = 'none';
        }
    }

    function renderSlides() {
        track.innerHTML = '';
        dotsEl.innerHTML = '';

        slides.forEach((movie, i) => {
            const slide = document.createElement('div');
            slide.className = 'hero-carrusel-slide';
            slide.style.backgroundImage = `url(${BASE_IMG}${movie.backdrop_path})`;
            slide.title = movie.title || '';
            track.appendChild(slide);

            const dot = document.createElement('span');
            dot.className = 'hero-carrusel-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => {
                clearInterval(timer);
                goTo(i);
                startAutoplay();
            });
            dotsEl.appendChild(dot);
        });

        goTo(0);
    }

    function goTo(index) {
        current = index;
        track.style.transform = `translateX(-${index * 100}%)`;
        document.querySelectorAll('.hero-carrusel-dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
        });
    }

    function startAutoplay() {
        clearInterval(timer);
        timer = setInterval(() => {
            goTo((current + 1) % slides.length);
        }, INTERVAL);
    }

    box.addEventListener('mouseenter', () => clearInterval(timer));
    box.addEventListener('mouseleave', startAutoplay);

    fetchBackdrops();
})();