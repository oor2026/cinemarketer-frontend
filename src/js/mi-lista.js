window['init_mi-lista'] = function() {
    window._tipoMiListaActual = 'peliculas';
    window.cambiarTipoMiLista('peliculas');
};

window.cambiarTipoMiLista = async function(tipo) {
    window._tipoMiListaActual = tipo;
    document.getElementById('miListaBtnPeliculas').classList.toggle('active', tipo === 'peliculas');
    document.getElementById('miListaBtnSeries').classList.toggle('active', tipo === 'series');

    const inputBuscar = document.getElementById('miListaBuscarInput');
    if (inputBuscar) inputBuscar.value = '';
    document.getElementById('miListaBuscarResultados').innerHTML = '';

    const carrusel = document.getElementById('miListaCarrusel');
    carrusel.classList.remove('mazo-mobile');
    carrusel.innerHTML = '<div style="padding:1rem;"><i class="fas fa-spinner fa-spin"></i></div>';

    const url = tipo === 'series'
        ? `${CONFIG.API_URL}/series-watchlist`
        : `${CONFIG.API_URL}/watchlist`;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const items = await res.json();

        // Se guarda en memoria para que la búsqueda filtre acá mismo,
        // sin volver a pedirle nada al servidor por cada letra tipeada.
        window._itemsMiListaActual = items;

        if (items.length === 0) {
            carrusel.innerHTML = '<p class="mi-lista-vacio">Todavía no guardaste nada acá.</p>';
            return;
        }

        if (window.matchMedia('(max-width: 768px)').matches) {
            window._pintarMazoMiLista(items, tipo, carrusel);
        } else {
            window._pintarCarruselPlanoMiLista(items, tipo, carrusel);
        }
    } catch (e) {
        carrusel.innerHTML = '<p class="mi-lista-vacio">No se pudo cargar. Probá de nuevo.</p>';
    }
};

window._pintarCarruselPlanoMiLista = function(items, tipo, carrusel) {
    carrusel.innerHTML = items.map((item, i) => {
        const titulo = tipo === 'series' ? item.seriesTitle : item.movieTitle;
        const poster = tipo === 'series' ? item.seriesPosterPath : item.moviePosterPath;
        const posterHtml = poster
            ? `<img src="https://image.tmdb.org/t/p/w300${poster}" alt="${titulo || ''}">`
            : '';
        return `<div class="mi-lista-card" data-idx="${i}">
            <div class="mi-lista-card-poster">${posterHtml}</div>
            <p class="mi-lista-card-titulo">${titulo || ''}</p>
        </div>`;
    }).join('');
};

// Mazo apilado (mobile) — misma mecánica que ya usamos en "Mi
// actividad" y en el modal de género de Mi Sala: una carta activa
// centrada y grande, las de atrás asomando en abanico, swipe para
// pasar a la siguiente. Autocontenido, no depende de perfil.js.
// window._irAIndiceMiListaMazo queda expuesta para que la búsqueda
// pueda saltar directo a un índice sin duplicar la lógica de pintar.
window._pintarMazoMiLista = function(items, tipo, carrusel) {
    carrusel.classList.add('mazo-mobile');
    let indice = 0;
    const N = items.length;

    let tituloMazo = document.getElementById('miListaMazoTitulo');
    if (tituloMazo) tituloMazo.remove();
    tituloMazo = document.createElement('p');
    tituloMazo.id = 'miListaMazoTitulo';
    tituloMazo.className = 'mi-lista-mazo-titulo';
    carrusel.after(tituloMazo);

    carrusel.innerHTML = items.map(item => {
        const titulo = tipo === 'series' ? item.seriesTitle : item.movieTitle;
        const poster = tipo === 'series' ? item.seriesPosterPath : item.moviePosterPath;
        const posterHtml = poster
            ? `<img src="https://image.tmdb.org/t/p/w300${poster}" alt="${titulo || ''}">`
            : '';
        return `<div class="mi-lista-card-mazo">${posterHtml}</div>`;
    }).join('');

    const cards = carrusel.querySelectorAll('.mi-lista-card-mazo');

    const pintar = () => {
        cards.forEach((card, i) => {
            let diff = i - indice;
            if (diff > N / 2) diff -= N;
            if (diff < -N / 2) diff += N;
            const offset = (diff >= 0 && diff <= 2) ? diff : -1;

            if (offset === 0) {
                card.style.transform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
                card.style.opacity = 1; card.style.zIndex = 10;
            } else if (offset === 1) {
                card.style.transform = 'translateX(-20px) translateY(12px) scale(0.94) rotate(-3deg)';
                card.style.opacity = 0.6; card.style.zIndex = 8;
            } else if (offset === 2) {
                card.style.transform = 'translateX(-40px) translateY(24px) scale(0.88) rotate(-6deg)';
                card.style.opacity = 0.3; card.style.zIndex = 7;
            } else {
                card.style.transform = 'translateX(280px) translateY(-10px) scale(0.8) rotate(16deg)';
                card.style.opacity = 0; card.style.zIndex = 5;
            }
        });
        tituloMazo.textContent = items[indice] ? (tipo === 'series' ? items[indice].seriesTitle : items[indice].movieTitle) : '';
    };

    pintar();

    window._irAIndiceMiListaMazo = function(idx) {
        indice = idx;
        pintar();
    };

    let startX = 0;
    carrusel.ontouchstart = (e) => { startX = e.touches[0].clientX; };
    carrusel.ontouchend = (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) < 40) return;
        indice = dx < 0 ? (indice - 1 + N) % N : (indice + 1) % N;
        pintar();
    };
};

// Buscador — filtra sobre lo ya cargado (window._itemsMiListaActual),
// salta directo a la primera coincidencia (mazo en mobile, scroll en
// desktop), y deja debajo una lista de solo texto con el resto de
// las coincidencias por si la primera no era la que buscabas.
window._buscarEnMiLista = function(query) {
    const items = window._itemsMiListaActual || [];
    const tipo = window._tipoMiListaActual;
    const resultadosEl = document.getElementById('miListaBuscarResultados');
    const btnClear = document.getElementById('miListaBuscarClear');
    const q = query.trim().toLowerCase();

    btnClear.classList.toggle('mostrar', q.length > 0);

    if (!q) {
        resultadosEl.innerHTML = '';
        return;
    }

    const coincidencias = [];
    items.forEach((item, i) => {
        const titulo = tipo === 'series' ? item.seriesTitle : item.movieTitle;
        if (titulo && titulo.toLowerCase().includes(q)) {
            coincidencias.push({ idx: i, titulo });
        }
    });

    if (coincidencias.length === 0) {
        resultadosEl.innerHTML = '<div style="color:#999; cursor:default;">Sin resultados</div>';
        return;
    }

    // Salto automático a la primera coincidencia, en vivo mientras se escribe.
    window._irAResultadoMiLista(coincidencias[0].idx);

    resultadosEl.innerHTML = coincidencias.map(c =>
        `<div onclick="window._irAResultadoMiLista(${c.idx})">${c.titulo}</div>`
    ).join('');
};

window._limpiarBusquedaMiLista = function() {
    const input = document.getElementById('miListaBuscarInput');
    input.value = '';
    document.getElementById('miListaBuscarResultados').innerHTML = '';
    document.getElementById('miListaBuscarClear').classList.remove('mostrar');
    // El carrusel/mazo se queda tal cual quedó (en la última película
    // encontrada) — lo que se buscó no se deshace, como pediste.
};

window._irAResultadoMiLista = function(idx) {
    if (window.matchMedia('(max-width: 768px)').matches) {
        if (typeof window._irAIndiceMiListaMazo === 'function') window._irAIndiceMiListaMazo(idx);
    } else {
        const card = document.querySelector(`.mi-lista-card[data-idx="${idx}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
};