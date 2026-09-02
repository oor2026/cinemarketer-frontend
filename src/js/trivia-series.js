// ==============================================
// trivia-series.js — Trivia de Series
// Calcado de trivia.js, endpoints propios de /api/trivia-series
// ==============================================

window._triviaSeriesTimerInterval = null;

function triviaSeriesFechaHoy() {
    return new Date().toISOString().slice(0, 10);
}
// Mismo fix que en trivia.js — aislar por usuario/guest token, si no
// una cuenta "tapa" la advertencia que le correspondía a otra en el
// mismo navegador.
function triviaSeriesAdvertenciaKey() {
    const token = localStorage.getItem('token');
    const identificador = token ? localStorage.getItem('userId') : triviaSeriesGuestToken();
    return `triviaSeriesAdvertenciaFecha_${identificador}`;
}
function triviaSeriesYaAdvertido() {
    return localStorage.getItem(triviaSeriesAdvertenciaKey()) === triviaSeriesFechaHoy();
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

                // Viñeta que aparece sola, solo mobile — mismo criterio que
                // película (ver trivia.js), con sus propios ids.
                window._triviaSeriesEstadoParaVineta = estado;
                if (!window._triviaSeriesVinetaInterval) {
                    triviaSeriesIniciarVinetaPeriodica();
                }
            } catch (e) {
                if (miToken === window._triviaSeriesBadgeToken) contenedor.style.display = 'none';
            }
        };

        function triviaSeriesMensajeVineta(estado) {
            if (estado.estado === 'GANADA' || estado.estado === 'PERDIDA') {
                return '¡Te espero mañana!';
            }
            if (estado.nuncaJugo) {
                return '¡Qué aburrimiento!... ¿Jugamos?';
            }
            if (estado.jugoAyer) {
                return '¿Echamos otra ronda como ayer?';
            }
            return '¿Volvemos a jugar?';
        }

        function triviaSeriesMostrarVineta() {
            if (window.innerWidth > 768) return;
            const modal = document.getElementById('triviaSeriesModal');
            if (modal && modal.style.display === 'flex') return;

            const cont = document.getElementById('triviaSeriesBadgeContainer');
            const vineta = document.getElementById('triviaVinetaSeriesMobile');
            if (!cont || !vineta || cont.style.display === 'none') return;
            if (!window._triviaSeriesEstadoParaVineta) return;

                document.getElementById('triviaVinetaSeriesTexto').textContent = triviaSeriesMensajeVineta(window._triviaSeriesEstadoParaVineta);
                vineta.classList.add('visible');
                setTimeout(() => vineta.classList.remove('visible'), 3000);
            }

            function triviaSeriesIniciarVinetaPeriodica() {
                triviaSeriesMostrarVineta();
                window._triviaSeriesVinetaInterval = setInterval(triviaSeriesMostrarVineta, 5000);
            }

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
    window._triviaSeriesEnCurso = false;
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
        localStorage.setItem(triviaSeriesAdvertenciaKey(), triviaSeriesFechaHoy());
    if (window._triviaSeriesEstadoPendiente) {
        renderTriviaSeriesEstado(window._triviaSeriesEstadoPendiente);
        window._triviaSeriesEstadoPendiente = null;
    }
};

window.cerrarTriviaSeries = function() {
    if (window._triviaSeriesEnCurso) {
        window._triviaSeriesRestanteAlPausar = window._triviaSeriesRestanteActual ?? 10;
        if (window._triviaSeriesTimerInterval) clearInterval(window._triviaSeriesTimerInterval);
        renderTriviaSeriesConfirmarSalida();
        return;
    }
    document.getElementById('triviaSeriesModal').style.display = 'none';
    document.body.style.overflow = '';
    if (window._triviaSeriesTimerInterval) clearInterval(window._triviaSeriesTimerInterval);
};

function renderTriviaSeriesConfirmarSalida() {
    document.getElementById('triviaSeriesModalContenido').innerHTML = `
        <div class="trivia-advertencia">
            <i class="fas fa-exclamation-triangle" style="color:#e5a723;"></i>
            <h3>¿Salir de la trivia?</h3>
            <p>Si salís ahora, tu intento de hoy termina acá. Sumás los puntos de lo que ya acertaste, pero no vas a poder seguir jugando hasta mañana.</p>
            <div class="trivia-advertencia-botones">
                <button class="trivia-btn-primario" onclick="window.triviaSeriesSeguirJugando()">Seguir jugando</button>
                <button class="trivia-btn-secundario" onclick="window.triviaSeriesConfirmarSalida()">Salir de todos modos</button>
            </div>
        </div>
    `;
}

window.triviaSeriesSeguirJugando = function() {
    const d = window._triviaSeriesPreguntaEnCursoData;
    const restante = Math.max(1, Math.round(window._triviaSeriesRestanteAlPausar ?? 10));
    if (d) {
        renderTriviaSeriesPregunta(d.pregunta, d.numero, d.total, restante);
    } else {
        window.abrirTriviaSeries();
    }
};

window.triviaSeriesConfirmarSalida = async function() {
    try {
        await fetch(`${CONFIG.API_URL}/trivia-series/abandonar${triviaSeriesQueryParam()}`, {
            method: 'POST',
            headers: triviaSeriesAuthHeaders()
        });
    } catch (e) {}
    window._triviaSeriesEnCurso = false;
    document.getElementById('triviaSeriesModal').style.display = 'none';
    document.body.style.overflow = '';
    window.cargarTriviaSeriesBadge();
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

function renderTriviaSeriesPregunta(pregunta, numero, total, segundosIniciales = 10) {
    window._triviaSeriesEnCurso = true;
    window._triviaSeriesTotalPreguntas = total;
    window._triviaSeriesPreguntaEnCursoData = { pregunta, numero, total }; // para reanudar sin re-fetch
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

        const segundosYaConsumidos = 10 - segundosIniciales;
                window._triviaSeriesInicioPregunta = Date.now() - (segundosYaConsumidos * 1000);
                iniciarTimerSeries(segundosIniciales);
        }

        function iniciarTimerSeries(segundosIniciales = 10) {
            let restante = segundosIniciales;
            const fill = document.getElementById('triviaSeriesBarraFill');
            const num = document.getElementById('triviaSeriesTimerNum');

            if (window._triviaSeriesTimerInterval) clearInterval(window._triviaSeriesTimerInterval);

            window._triviaSeriesTimerInterval = setInterval(() => {
                restante -= 0.2;
                window._triviaSeriesRestanteActual = restante;
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
    window._triviaSeriesEnCurso = false;
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
    window._triviaSeriesEnCurso = false;
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

window.abrirRankingTriviaSeries = async function(otroUsuarioId, otroNombre) {
    const modal = document.getElementById('rankingTriviaSeriesModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('rankingTriviaSeriesContenido').innerHTML =
        '<div class="trivia-resultado"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia-series/ranking`, { headers: triviaSeriesAuthHeaders() });
        const ranking = await res.json();

        const miId = localStorage.getItem('userId');
        const esOtroPerfil = otroUsuarioId && String(otroUsuarioId) !== String(miId);

        if (esOtroPerfil) {
            renderComparacionRankingTriviaSeries(ranking, otroUsuarioId, otroNombre);
        } else {
            renderRankingTriviaSeries(ranking);
        }
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
                        <span style="cursor:pointer;" onclick="event.stopPropagation(); window.cerrarRankingTriviaSeries(); window.abrirPerfilUsuario(${r.userId})">${r.nombre}${r.esUsuarioActual ? ' (vos)' : ''}</span>
                        <span class="ranking-aciertos">${r.aciertos}</span>
                        <span class="ranking-tiempo">${formatTiempo(r.tiempoTotalSegundos)}</span>
                    </div>
                `).join('')}
            </div>
        `;
}

function renderComparacionRankingTriviaSeries(ranking, otroUsuarioId, otroNombre) {
    const cont = document.getElementById('rankingTriviaSeriesContenido');
    const yo = ranking.find(r => r.esUsuarioActual);
    const otro = ranking.find(r => String(r.userId) === String(otroUsuarioId));
    const nombre = otroNombre || 'esta persona';

    const formatTiempo = (seg) => {
        const m = Math.floor(seg / 60);
        const s = seg % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    let leyenda;
    if (!yo && !otro) {
        leyenda = `Ninguno de los dos jugó trivia todavía.`;
    } else if (!yo) {
        leyenda = `Todavía no jugaste trivia — animate a ver cómo te va contra ${nombre}.`;
    } else if (!otro) {
        leyenda = `${nombre} todavía no jugó trivia — habrá que esperar.`;
    } else if (yo.posicion < otro.posicion) {
        leyenda = `¡Le sacás ventaja a ${nombre}!`;
    } else if (yo.posicion > otro.posicion) {
        leyenda = `${nombre} te saca ventaja. Todavía podés alcanzarla.`;
    } else {
        leyenda = `¡Están empatados!`;
    }

    const columna = (r, etiqueta) => {
        if (!r) {
            return `<div style="flex:1; text-align:center;">
                <p style="font-weight:700; font-size:0.95rem; margin:0 0 0.5rem;">${etiqueta}</p>
                <p style="color:#999; font-size:0.82rem;">Sin jugar aún</p>
            </div>`;
        }
        return `<div style="flex:1; text-align:center;">
            <p style="font-weight:700; font-size:0.95rem; margin:0 0 0.5rem;">${etiqueta}</p>
            <p style="font-size:1.6rem; font-weight:800; margin:0; color:${r.posicion <= 3 ? '#e8a800' : '#333'};">#${r.posicion}</p>
            <p style="font-size:0.85rem; color:#666; margin:0.3rem 0 0;">${r.aciertos} aciertos</p>
            <p style="font-size:0.78rem; color:#999; margin:0.1rem 0 0;">${formatTiempo(r.tiempoTotalSegundos)}</p>
        </div>`;
    };

    cont.innerHTML = `
        <h3 class="ranking-titulo">🏆 Comparación de ranking</h3>
        <div style="display:flex; align-items:center; gap:1rem; padding:1.2rem 0;">
            ${columna(yo, '🏆 Vos')}
            <div style="font-weight:700; color:#ccc; font-size:0.85rem;">VS</div>
            ${columna(otro, '👤 ' + nombre)}
        </div>
        <p style="text-align:center; font-size:0.88rem; color:#555; padding:0 1rem; margin:0;">${leyenda}</p>
    `;
}