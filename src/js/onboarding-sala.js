// Onboarding de Mi Sala — parte del alta de cuenta. Se muestra una sola
// vez, en el primer login real (ver primerLogin en la respuesta de
// /auth/login y /auth/google), tanto para registro tradicional como
// Google. Cada pregunta es individualmente salteable — no se exige
// completar nada para poder entrar a la app.

(function () {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login.html');
        return;
    }

    // Las 4 preguntas de película, en orden — mismo endpoint/forma de
    // guardado que ya usa el backend ({ movieId }), confirmado contra
    // UserController.java.
    const PREGUNTAS = [
        {
            eyebrow: 'Pregunta 1 de 5',
            pregunta: '¿Cuál es tu película favorita?',
            sub: 'La que elegirías sin dudar un segundo.',
            endpoint: '/users/me/pelicula-favorita',
        },
        {
            eyebrow: 'Pregunta 2 de 5',
            pregunta: '¿Cuál fue la última que viste en el cine?',
            sub: 'La más reciente, aunque no te haya encantado.',
            endpoint: '/users/me/ultima-vista-cine',
        },
        {
            eyebrow: 'Pregunta 3 de 5',
            pregunta: 'Esa que no te cansás de ver',
            sub: 'La que volverías a poner ahora mismo, la hayas visto 5 o 50 veces.',
            endpoint: '/users/me/no-me-canso-de-ver',
        },
        {
            eyebrow: 'Pregunta 4 de 5',
            pregunta: 'La que todos aman y vos no bancás',
            sub: 'Esa que "todo el mundo" ama, pero a vos no te cierra.',
            endpoint: '/users/me/no-la-banco',
        },
    ];

    let pasoActual = 0; // 0-3: preguntas de película | 4: bio | 5: cierre
    let peliculaElegida = null; // { id, title, poster_path }
    const respuestas = []; // una entrada por pregunta: { id } o null si se salteó

    const $ = (id) => document.getElementById(id);

    // ===================================================================
    // Rollo de fotogramas (progreso)
    // ===================================================================
    function pintarRollo() {
        document.querySelectorAll('.onb-fotograma').forEach((el, i) => {
            el.classList.remove('actual', 'hecho', 'salteado');
            if (i < pasoActual) {
                el.classList.add(respuestas[i] ? 'hecho' : 'salteado');
            } else if (i === pasoActual) {
                el.classList.add('actual');
            }
        });
    }

    // ===================================================================
    // Predictor — mismo endpoint y forma de respuesta que el Buscador
    // (GET /movies/search?query=..., { results: [{id, title, release_date,
    // poster_path}] }), reusado tal cual para no duplicar comportamiento.
    // ===================================================================
    let timeoutPredictor = null;

    function inicializarPredictor() {
        const input = $('onbInputPelicula');
        const resultados = $('onbResultadosPelicula');

        input.addEventListener('input', function () {
            clearTimeout(timeoutPredictor);
            const query = this.value.trim();

            if (query.length < 2) {
                resultados.style.display = 'none';
                return;
            }

            timeoutPredictor = setTimeout(async () => {
                try {
                    const res = await fetch(`${CONFIG.API_URL}/movies/search?query=${encodeURIComponent(query)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) return;
                    const data = await res.json();
                    const items = (data.results || []).slice(0, 8);

                    if (items.length === 0) {
                        resultados.innerHTML = '<div class="onb-predictor-vacio">No encontramos nada con ese título</div>';
                        resultados.style.display = 'block';
                        return;
                    }

                    resultados.innerHTML = items.map(item => {
                        const titulo = item.title || 'Sin título';
                        const anio = item.release_date ? item.release_date.substring(0, 4) : '';
                        const poster = item.poster_path
                            ? `<img src="https://image.tmdb.org/t/p/w92${item.poster_path}" alt="${titulo}">`
                            : `<div class="onb-predictor-poster-vacio"><i class="fas fa-film"></i></div>`;
                        return `
                        <div class="onb-predictor-item" data-id="${item.id}" data-titulo="${titulo.replace(/"/g, '&quot;')}" data-poster="${item.poster_path || ''}">
                            ${poster}
                            <div><strong>${titulo}</strong>${anio ? `<span> ${anio}</span>` : ''}</div>
                        </div>`;
                    }).join('');

                    resultados.style.display = 'block';

                    resultados.querySelectorAll('.onb-predictor-item').forEach(el => {
                        el.addEventListener('click', function () {
                            elegirPelicula({
                                id: parseInt(this.dataset.id, 10),
                                title: this.dataset.titulo,
                                poster_path: this.dataset.poster || null,
                            });
                        });
                    });
                } catch (e) {
                    resultados.style.display = 'none';
                }
            }, 400);
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultados.contains(e.target)) {
                resultados.style.display = 'none';
            }
        });
    }

    function elegirPelicula(pelicula) {
        peliculaElegida = pelicula;
        $('onbResultadosPelicula').style.display = 'none';
        $('onbInputPelicula').value = '';
        $('onbInputPelicula').style.display = 'none';

        $('onbElegidaWrap').style.display = 'flex';
        $('onbElegidaTitulo').textContent = pelicula.title;
        $('onbElegidaPoster').src = pelicula.poster_path
            ? `https://image.tmdb.org/t/p/w154${pelicula.poster_path}`
            : 'assets/images/icon-512.png';

        $('onbBtnContinuar').disabled = false;
    }

    $('onbBtnQuitarEleccion').addEventListener('click', () => {
        peliculaElegida = null;
        $('onbElegidaWrap').style.display = 'none';
        $('onbInputPelicula').style.display = 'block';
        $('onbInputPelicula').focus();
        $('onbBtnContinuar').disabled = true;
    });

    // ===================================================================
    // Guardado — un PATCH por respuesta, en el momento en que se confirma
    // (no se espera al final, así nada se pierde si el usuario cierra la
    // pestaña a mitad de camino).
    // ===================================================================
    async function guardarPelicula(endpoint, movieId) {
        try {
            await fetch(`${CONFIG.API_URL}${endpoint}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ movieId })
            });
        } catch (e) { /* si falla, no se traba el onboarding — se puede completar después desde Mi Sala */ }
    }

    async function guardarBio(bioTitulo, bioTexto) {
        try {
            await fetch(`${CONFIG.API_URL}/users/me/bio`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bioTitulo, bioTexto })
            });
        } catch (e) { /* idem */ }
    }

    // ===================================================================
    // Tira de pósters acumulados
    // ===================================================================
    function agregarALaTira(pelicula) {
        if (!pelicula || !pelicula.poster_path) return;
        const img = document.createElement('img');
        img.className = 'onb-tira-poster';
        img.src = `https://image.tmdb.org/t/p/w154${pelicula.poster_path}`;
        img.alt = pelicula.title;
        $('onbTiraPosters').appendChild(img);
    }

    // ===================================================================
    // Render de cada paso de película (0-3)
    // ===================================================================
    function renderPasoPelicula() {
        const p = PREGUNTAS[pasoActual];
        $('onbPeliculaEyebrow').textContent = p.eyebrow;
        $('onbPeliculaPregunta').textContent = p.pregunta;
        $('onbPeliculaSub').textContent = p.sub;

        peliculaElegida = null;
        $('onbElegidaWrap').style.display = 'none';
        $('onbInputPelicula').style.display = 'block';
        $('onbInputPelicula').value = '';
        $('onbResultadosPelicula').style.display = 'none';
        $('onbBtnContinuar').disabled = true;

        pintarRollo();
    }

    $('onbBtnContinuar').addEventListener('click', async () => {
        if (!peliculaElegida) return;
        const p = PREGUNTAS[pasoActual];
        await guardarPelicula(p.endpoint, peliculaElegida.id);
        respuestas[pasoActual] = { id: peliculaElegida.id };
        agregarALaTira(peliculaElegida);
        avanzar();
    });

    $('onbBtnSaltear').addEventListener('click', () => {
        respuestas[pasoActual] = null;
        avanzar();
    });

    function avanzar() {
        pasoActual++;
        if (pasoActual < PREGUNTAS.length) {
            renderPasoPelicula();
        } else if (pasoActual === PREGUNTAS.length) {
            mostrarPasoBio();
        }
    }

    // ===================================================================
    // Paso 5: bio
    // ===================================================================
    function mostrarPasoBio() {
        $('onbPasoPelicula').style.display = 'none';
        $('onbPasoBio').style.display = 'block';
        $('onbTiraPosters').style.display = 'none';
        pintarRollo();
    }

    $('onbInputBioTitulo').addEventListener('input', function () {
        $('onbContadorTitulo').textContent = `${this.value.length}/50`;
    });
    $('onbInputBioTexto').addEventListener('input', function () {
        $('onbContadorTexto').textContent = `${this.value.length}/255`;
    });

    $('onbBtnFinalizar').addEventListener('click', async () => {
        const bioTitulo = $('onbInputBioTitulo').value.trim();
        const bioTexto = $('onbInputBioTexto').value.trim();
        if (bioTitulo || bioTexto) {
            await guardarBio(bioTitulo, bioTexto);
        }
        mostrarCierre();
    });

    $('onbBtnSaltearBio').addEventListener('click', () => {
        mostrarCierre();
    });

    // ===================================================================
    // Cierre
    // ===================================================================
    function mostrarCierre() {
        $('onbPasoBio').style.display = 'none';
        $('onbPasoCierre').style.display = 'block';

        const completadas = respuestas.filter(Boolean).length;
        $('onbCierreTexto').textContent = completadas > 0
            ? `Ya tenés ${completadas} de 4 en tu Sala. Podés completar el resto cuando quieras.`
            : 'Vas a poder completar esto cuando quieras, desde Mi Sala.';

        pasoActual = PREGUNTAS.length + 1;
        pintarRollo();
        document.querySelectorAll('.onb-fotograma').forEach(el => {
            el.classList.remove('actual');
            if (!el.classList.contains('hecho') && !el.classList.contains('salteado')) {
                el.classList.add('hecho');
            }
        });
    }

    function irADashboard() {
        window.location.replace('dashboard.html');
    }

    $('onbBtnEntrar').addEventListener('click', irADashboard);
    $('btnSalirTodo').addEventListener('click', irADashboard);

    // ===================================================================
    // Arranque
    // ===================================================================
    inicializarPredictor();
    renderPasoPelicula();
})();
