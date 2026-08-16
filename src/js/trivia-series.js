// ==============================================
// trivia-series.js — Trivia de Series
// Calcado de trivia.js, endpoints propios de /api/trivia-series
// ==============================================

window._triviaSeriesTimerInterval = null;

function triviaSeriesFechaHoy() {
    return new Date().toISOString().slice(0, 10);
}
function triviaSeriesYaAdvertido() {
    return localStorage.getItem('triviaSeriesAdvertenciaFecha') === triviaSeriesFechaHoy();
}

function triviaSeriesGuestToken() {
    let token = localStorage.getItem('triviaSeriesGuestToken');
    if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem('triviaSeriesGuestToken', token);
    }
    return token;
}

function triviaSeriesQueryParam() {
    const token = localStorage.getItem('token');
    if (token) return '';
    return '?guestToken=' + encodeURIComponent(triviaSeriesGuestToken());
}

function triviaSeriesAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

window.cargarTriviaSeriesBadge = async function() {
    const contenedor = document.getElementById('triviaSeriesBadgeContainer');
    if (!contenedor) return;

    // Token de esta llamada puntual — si otra llamada más nueva arranca
    // antes de que esta termine, esta queda invalidada y no debe pisar
    // el resultado de la más reciente al resolver tarde.
    const miToken = (window._triviaSeriesBadgeToken = (window._triviaSeriesBadgeToken || 0) + 1);

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia-series/estado${triviaSeriesQueryParam()}`, {
            headers: triviaSeriesAuthHeaders()
        });
        if (miToken !== window._triviaSeriesBadgeToken) return; // ya quedó obsoleta

        if (!res.ok) { contenedor.style.display = 'none'; return; }

        const estado = await res.json();
        if (miToken !== window._triviaSeriesBadgeToken) return; // ya quedó obsoleta

        window._triviaSeriesEstadoCargado = true;
        if (window._tabActivo === 'series') {
            contenedor.style.display = 'block';
        }
        actualizarBadgeSubSeries(estado);
    } catch (e) {
        if (miToken === window._triviaSeriesBadgeToken) contenedor.style.display = 'none';
    }
};

function actualizarBadgeSubSeries(estado) {
    const sub = document.getElementById('triviaSeriesBadgeSub');
    if (!sub) return;
    if (estado.estado === 'GANADA') {
        sub.textContent = '¡Ganaste hoy! Volvé mañana';
    } else if (estado.estado === 'PERDIDA') {
        sub.textContent = `Hoy: ${estado.aciertos} de ${estado.totalPreguntas} — Volvé mañana`;
    } else {
        sub.textContent = `Pregunta ${estado.preguntaActual} de ${estado.totalPreguntas}`;
    }
}

window.abrirTriviaSeries = async function() {
    const modal = document.getElementById('triviaSeriesModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia-series/estado${triviaSeriesQueryParam()}`, {
            headers: triviaSeriesAuthHeaders()
        });
        const estado = await res.json();

        const esPrimeraPregunta = estado.estado === 'EN_CURSO' && estado.preguntaActual === 1;
        if (esPrimeraPregunta && !triviaSeriesYaAdvertido()) {
            renderTriviaSeriesAdvertencia(estado);
        } else {
            renderTriviaSeriesEstado(estado);
        }
    } catch (e) {
        document.getElementById('triviaSeriesModalContenido').innerHTML =
            '<div class="trivia-resultado"><p>No pudimos cargar la trivia. Probá de nuevo.</p></div>';
    }
};

function renderTriviaSeriesAdvertencia(estado) {
    document.getElementById('triviaSeriesModalContenido').innerHTML = `
        <div class="trivia-advertencia">
            <i class="fas fa-question-circle"></i>
            <h3>Trivia de Series</h3>
            <p>Son 10 preguntas, un tiro por pregunta — 10 segundos cada una.</p>
            <p>Tenés <strong>un solo intento por día</strong>. Respondé las 10 preguntas — te equivoques o no, seguís hasta el final, y ahí vemos cuántas acertaste.</p>
            <div class="trivia-advertencia-botones">
                <button class="trivia-btn-primario" onclick="window.triviaSeriesConfirmarInicio()">Estoy listo, ¡a jugar!</button>
                <button class="trivia-btn-secundario" onclick="window.cerrarTriviaSeries()">Ahora no</button>
            </div>
        </div>
    `;
    window._triviaSeriesEstadoPendiente = estado;
}

window.triviaSeriesConfirmarInicio = function() {
    localStorage.setItem('triviaSeriesAdvertenciaFecha', triviaSeriesFechaHoy());
    if (window._triviaSeriesEstadoPendiente) {
        renderTriviaSeriesEstado(window._triviaSeriesEstadoPendiente);
        window._triviaSeriesEstadoPendiente = null;
    }
};

window.cerrarTriviaSeries = function() {
    document.getElementById('triviaSeriesModal').style.display = 'none';
    document.body.style.overflow = '';
    if (window._triviaSeriesTimerInterval) clearInterval(window._triviaSeriesTimerInterval);
};

function renderTriviaSeriesEstado(estado) {
    if (estado.estado === 'GANADA') {
        renderTriviaSeriesGanada(estado.puntosGanados);
    } else if (estado.estado === 'PERDIDA') {
        renderTriviaSeriesPerdida(estado.puntosGanados, estado.aciertos, estado.totalPreguntas);
    } else {
        renderTriviaSeriesPregunta(estado.pregunta, estado.preguntaActual, estado.totalPreguntas);
    }
}

const ETIQUETAS_TIPO_SERIE = {
    QUIEN_ES: '¿Quién es?',
    SERIE: 'Adivina la serie',
    QUIEN_ES_TEMPORADA: '¿Quién es? (por temporada)',
    TEMPORADA_STILL: '¿De qué temporada es?'
};

function renderTriviaSeriesPregunta(pregunta, numero, total) {
    window._triviaSeriesTotalPreguntas = total;
    const cont = document.getElementById('triviaSeriesModalContenido');

    let mediaHtml;
    if (pregunta.mostrarPoster) {
        mediaHtml = `<img class="trivia-imagen" src="${pregunta.imagenUrl}" alt="">`;
    } else {
        mediaHtml = `<div class="trivia-sinopsis">${pregunta.sinopsis || ''}</div>`;
    }

    // QUIEN_ES_TEMPORADA menciona la temporada como parte del enunciado
        // (forma parte de la pregunta) — TEMPORADA_STILL no, porque ahí la
        // temporada ES la respuesta que hay que adivinar. Ambas suman el
        // nombre de la serie — sin eso, "Temporada 3" no dice nada por sí solo.
        let etiqueta = ETIQUETAS_TIPO_SERIE[pregunta.tipo] || '';
        if (pregunta.tipo === 'QUIEN_ES_TEMPORADA' && pregunta.temporadaNumero) {
            etiqueta = `¿Quién es? — ${pregunta.serieNombre || 'la serie'}, Temporada ${pregunta.temporadaNumero}`;
        } else if (pregunta.tipo === 'TEMPORADA_STILL' && pregunta.serieNombre) {
            etiqueta = `¿De qué temporada de ${pregunta.serieNombre} es esta escena?`;
        }

    cont.innerHTML = `
            <div class="trivia-header">
                <span class="trivia-progreso">Pregunta ${numero} de ${total}</span>
                <div class="trivia-timer"><i class="fas fa-clock"></i> <span id="triviaSeriesTimerNum">10s</span></div>
            </div>
            <div class="trivia-barra-tiempo"><div class="trivia-barra-tiempo-fill" id="triviaSeriesBarraFill" style="width:100%;"></div></div>
            <p class="trivia-tipo-label">${etiqueta}</p>
            ${mediaHtml}
            <div class="trivia-opciones" id="triviaSeriesOpciones">
                ${pregunta.opciones.map((op, i) =>
                    `<button class="trivia-opcion" onclick="window.triviaSeriesResponder(${i})">${op}</button>`
                ).join('')}
            </div>
        `;

        window._triviaSeriesInicioPregunta = Date.now();
        iniciarTimerSeries();
}

function iniciarTimerSeries() {
    let restante = 10;
    const fill = document.getElementById('triviaSeriesBarraFill');
    const num = document.getElementById('triviaSeriesTimerNum');

    if (window._triviaSeriesTimerInterval) clearInterval(window._triviaSeriesTimerInterval);

    window._triviaSeriesTimerInterval = setInterval(() => {
        restante -= 0.2;
        if (fill) fill.style.width = Math.max(0, (restante / 10) * 100) + '%';
        if (num) num.textContent = Math.max(0, Math.ceil(restante)) + 's';

        if (restante <= 0) {
            clearInterval(window._triviaSeriesTimerInterval);
            window.triviaSeriesResponder(-1);
        }
    }, 200);
}

window.triviaSeriesResponder = async function(opcionElegida) {
    if (window._triviaSeriesEnviando) return;
    window._triviaSeriesEnviando = true;

    if (window._triviaSeriesTimerInterval) clearInterval(window._triviaSeriesTimerInterval);

    document.querySelectorAll('#triviaSeriesOpciones .trivia-opcion').forEach(b => b.style.pointerEvents = 'none');

    const tiempoSegundos = window._triviaSeriesInicioPregunta
        ? Math.min(10, Math.round((Date.now() - window._triviaSeriesInicioPregunta) / 1000))
        : 10;

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia-series/responder${triviaSeriesQueryParam()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...triviaSeriesAuthHeaders() },
            body: JSON.stringify({ opcionElegida, tiempoSegundos })
        });

        if (res.status === 409) {
                    // Se detectó una doble respuesta — no confiamos en este resultado,
                    // volvemos a pedir el estado real desde el servidor.
                    window._triviaSeriesEnviando = false;
                    window.abrirTriviaSeries();
                    return;
                }

                if (!res.ok) {
                    // Error real del servidor (500, etc.) — no simulamos un resultado
                    // con datos inventados, mostramos que falló de verdad.
                    window._triviaSeriesEnviando = false;
                    document.getElementById('triviaSeriesModalContenido').innerHTML =
                        '<div class="trivia-resultado"><p>Hubo un error al responder. Cerrá e intentá de nuevo.</p></div>';
                    return;
                }

                const data = await res.json();

        const botones = document.querySelectorAll('#triviaSeriesOpciones .trivia-opcion');
        botones.forEach((b, i) => {
            if (i === data.respuestaCorrectaIndex) b.classList.add('correcta');
            else if (i === opcionElegida) b.classList.add('incorrecta');
        });

        if (data.puntosGanadosEstaRespuesta > 0 && typeof mostrarPuntosGanados === 'function') {
            mostrarPuntosGanados(data.puntosGanadosEstaRespuesta);
        }

        setTimeout(() => {
                            if (data.estado === 'EN_CURSO') {
                                                            renderTriviaSeriesPregunta(data.siguientePregunta, data.preguntaActual, window._triviaSeriesTotalPreguntas);
                                                        } else if (data.estado === 'GANADA') {
                                renderTriviaSeriesGanada(data.puntosGanadosTotal);
                            } else {
                                        renderTriviaSeriesPerdida(data.puntosGanadosTotal, data.aciertos, window._triviaSeriesTotalPreguntas);
                                    }
                    window.cargarTriviaSeriesBadge();
                    window._triviaSeriesEnviando = false;
                }, 1200);

            } catch (e) {
                window._triviaSeriesEnviando = false;
                document.getElementById('triviaSeriesModalContenido').innerHTML =
                    '<div class="trivia-resultado"><p>Hubo un error al responder. Cerrá e intentá de nuevo.</p></div>';
            }
        };

function esInvitadoSeries() {
    return !localStorage.getItem('token');
}

function ctaInvitadoHtmlSeries(puntos) {
    if (!esInvitadoSeries() || !puntos) return '';
    return `
        <div class="trivia-cta-invitado">
            <p>Jugaste como invitado — sumaste <strong>${puntos} puntos</strong> hoy. Iniciá sesión o creá tu cuenta para que no se pierdan y quedar en el ranking de cinéfilos.</p>
            <div class="trivia-advertencia-botones">
                <button class="trivia-btn-cta-invitado" onclick="window.location.href='login.html'">Iniciar sesión / crear cuenta</button>
            </div>
        </div>`;
}

function urlTriviaSeriesPublica() {
    return `${window.location.origin}/trivia-series-publica`;
}

window.compartirTriviaSeries = async function() {
    const url = urlTriviaSeriesPublica();
    const texto = '📺 Te desafío a la trivia de series de hoy en Cinemarketer — ¿cuántas preguntas acertás?';

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Trivia de Series', text: texto, url });
        } catch (e) {}
    } else {
        try {
            await navigator.clipboard.writeText(url);
            if (typeof showToast === 'function') showToast('success', 'Link copiado');
        } catch (e) {}
    }
};

function botonCompartirHtmlSeries() {
    return `
        <button class="trivia-btn-compartir" onclick="window.compartirTriviaSeries()">
            <i class="fas fa-bolt"></i> Desafiá a tus amigos
        </button>`;
}

function renderTriviaSeriesGanada(puntos) {
    document.getElementById('triviaSeriesModalContenido').innerHTML = `
        <div class="trivia-resultado">
            <i class="fas fa-trophy" style="color:#f5a623;"></i>
            <h3>¡Sos un experto en series!</h3>
            <p>Acertaste las 10 preguntas de hoy. Volvé mañana para mantener tu racha en el ranking de cinéfilos.</p>
            ${botonCompartirHtmlSeries()}
        </div>
        ${ctaInvitadoHtmlSeries(puntos)}
    `;
}

function renderTriviaSeriesPerdida(puntos, aciertos, total) {
    document.getElementById('triviaSeriesModalContenido').innerHTML = `
        <div class="trivia-resultado">
            <i class="fas fa-hourglass-half" style="color:#999;"></i>
            <h3>¡Completaste la trivia de series de hoy!</h3>
            <p>Acertaste <strong>${aciertos} de ${total}</strong> preguntas y sumaste <strong>${puntos} puntos</strong>. Volvé mañana para tu próximo intento.</p>
            ${botonCompartirHtmlSeries()}
        </div>
        ${ctaInvitadoHtmlSeries(puntos)}
    `;
}

window.triviaSeriesIntentarReclamar = async function() {
    const guestToken = localStorage.getItem('triviaSeriesGuestToken');
    const token = localStorage.getItem('token');
    if (!guestToken || !token) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia-series/reclamar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ guestToken })
        });
        if (res.ok) {
            localStorage.removeItem('triviaSeriesGuestToken');
            window.cargarTriviaSeriesBadge();
        }
    } catch (e) {}
};

window.abrirRankingTriviaSeries = async function() {
    const modal = document.getElementById('rankingTriviaSeriesModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('rankingTriviaSeriesContenido').innerHTML =
        '<div class="trivia-resultado"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia-series/ranking`, { headers: triviaSeriesAuthHeaders() });
        const ranking = await res.json();
        renderRankingTriviaSeries(ranking);
    } catch (e) {
        document.getElementById('rankingTriviaSeriesContenido').innerHTML =
            '<div class="trivia-resultado"><p>No pudimos cargar el ranking.</p></div>';
    }
};

window.cerrarRankingTriviaSeries = function() {
    document.getElementById('rankingTriviaSeriesModal').style.display = 'none';
    document.body.style.overflow = '';
};

function renderRankingTriviaSeries(ranking) {
    const cont = document.getElementById('rankingTriviaSeriesContenido');

    if (!ranking || ranking.length === 0) {
        cont.innerHTML = '<div class="trivia-resultado"><p>Todavía no hay suficientes aciertos para armar el ranking.</p></div>';
        return;
    }

    const formatTiempo = (seg) => {
        const m = Math.floor(seg / 60);
        const s = seg % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    cont.innerHTML = `
            <h3 class="ranking-titulo">📺 Ranking de series</h3>
            <p class="ranking-sub">Por cantidad de aciertos en Trivia de Series</p>
            <div class="ranking-tabla">
                <div class="ranking-fila ranking-header">
                    <span>Puesto</span>
                    <span>Usuario</span>
                    <span class="ranking-aciertos">Aciertos</span>
                    <span class="ranking-tiempo">Tiempo</span>
                </div>
                ${ranking.map(r => `
                    <div class="ranking-fila${r.esUsuarioActual ? ' yo' : ''}">
                        <span class="ranking-pos${r.posicion <= 3 ? ' top3' : ''}">#${r.posicion}</span>
                        <span>${r.nombre}${r.esUsuarioActual ? ' (vos)' : ''}</span>
                        <span class="ranking-aciertos">${r.aciertos}</span>
                        <span class="ranking-tiempo">${formatTiempo(r.tiempoTotalSegundos)}</span>
                    </div>
                `).join('')}
            </div>
        `;
}