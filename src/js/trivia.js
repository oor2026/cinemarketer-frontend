// ==============================================
// trivia.js — Adivina Adivinador
// ==============================================

window._triviaTimerInterval = null;

function triviaFechaHoy() {
    return new Date().toISOString().slice(0, 10);
}
// La clave se aísla por usuario (o por guest token si no hay sesión) —
// si no, en un navegador compartido entre 2 cuentas, la advertencia que
// vio la Cuenta A "tapaba" la que le correspondía ver a la Cuenta B ese
// mismo día, aunque fuera su primera vez.
function triviaAdvertenciaKey() {
    const token = localStorage.getItem('token');
    const identificador = token ? localStorage.getItem('userId') : triviaGuestToken();
    return `triviaAdvertenciaFecha_${identificador}`;
}
function triviaYaAdvertido() {
    return localStorage.getItem(triviaAdvertenciaKey()) === triviaFechaHoy();
}

function triviaGuestToken() {
    let token = localStorage.getItem('triviaGuestToken');
    if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem('triviaGuestToken', token);
    }
    return token;
}

function triviaQueryParam() {
    const token = localStorage.getItem('token');
    if (token) return '';
    return '?guestToken=' + encodeURIComponent(triviaGuestToken());
}

function triviaAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

window.cargarTriviaBadge = async function() {
    const contenedor = document.getElementById('triviaBadgeContainer');
    if (!contenedor) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/estado${triviaQueryParam()}`, {
            headers: triviaAuthHeaders()
        });
        if (!res.ok) { contenedor.style.display = 'none'; return; }

        const estado = await res.json();
                window._triviaEstadoCargado = true;
                // Solo se muestra si el tab activo es Películas — evita que un
                // llamado disparado en segundo plano (prefetch) pise la visibilidad
                // que seleccionarTabFeed ya dejó en 'none' al estar en otro tab.
                if (window._tabActivo === 'peliculas' || !window._tabActivo) {
                    contenedor.style.display = 'block';
                }
                                actualizarBadgeSub(estado);

                                // Viñeta que aparece sola, solo mobile — se actualiza el
                                // estado siempre, pero el intervalo de 60s arranca una
                                // sola vez (cargarTriviaBadge se llama varias veces por
                                // sesión: al cambiar de tab, prefetch, etc.)
                                window._triviaEstadoParaVineta = estado;
                                if (!window._triviaVinetaInterval) {
                                    triviaIniciarVinetaPeriodica();
                                }
                    } catch (e) {
                        contenedor.style.display = 'none';
                    }
                };

                function triviaMensajeVineta(estado) {
                    if (estado.estado === 'GANADA' || estado.estado === 'PERDIDA') {
                        return '¡Te espero mañana!';
                    }
                    if (estado.nuncaJugo) {
                        return '¡Qué aburrimiento!... ¿Jugamos?';
                    }
                    if (estado.jugoAyer) {
                        return '¿Echamos otra ronda como ayer?';
                    }
                    // Caso no cubierto explícitamente (jugó antes, pero ni ayer ni hoy) —
                    // agregado por consistencia, no era uno de los 3 pedidos.
                    return '¿Volvemos a jugar?';
                }

                function triviaMostrarVineta() {
                    if (window.innerWidth > 768) return;
                    // No molestar si ya está jugando en este momento.
                    const modal = document.getElementById('triviaModal');
                    if (modal && modal.style.display === 'flex') return;

                    const cont = document.getElementById('triviaBadgeContainer');
                    const vineta = document.getElementById('triviaVinetaMobile');
                    if (!cont || !vineta || cont.style.display === 'none') return;
                    if (!window._triviaEstadoParaVineta) return;

                        document.getElementById('triviaVinetaTexto').textContent = triviaMensajeVineta(window._triviaEstadoParaVineta);
                        vineta.classList.add('visible');
                        setTimeout(() => vineta.classList.remove('visible'), 3000);
                    }

                    function triviaIniciarVinetaPeriodica() {
                        triviaMostrarVineta(); // primera aparición, sin esperar
                        window._triviaVinetaInterval = setInterval(triviaMostrarVineta, 5000);
                    }

function actualizarBadgeSub(estado) {
    const sub = document.getElementById('triviaBadgeSub');
    if (!sub) return;
    if (estado.estado === 'GANADA') {
        sub.textContent = '¡Ganaste hoy! Volvé mañana';
    } else if (estado.estado === 'PERDIDA') {
        sub.textContent = `Hoy: ${estado.aciertos} de ${estado.totalPreguntas} — Volvé mañana`;
    } else {
        sub.textContent = `Pregunta ${estado.preguntaActual} de ${estado.totalPreguntas}`;
    }
}

window.abrirTrivia = async function() {
    const modal = document.getElementById('triviaModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/estado${triviaQueryParam()}`, {
            headers: triviaAuthHeaders()
        });
        const estado = await res.json();

        // Advertencia solo antes de la primera pregunta del día, una vez por día
        const esPrimeraPregunta = estado.estado === 'EN_CURSO' && estado.preguntaActual === 1;
        if (esPrimeraPregunta && !triviaYaAdvertido()) {
            renderTriviaAdvertencia(estado);
        } else {
            renderTriviaEstado(estado);
        }
    } catch (e) {
        document.getElementById('triviaModalContenido').innerHTML =
            '<div class="trivia-resultado"><p>No pudimos cargar la trivia. Probá de nuevo.</p></div>';
    }
};

function renderTriviaAdvertencia(estado) {
    window._triviaEnCurso = false;
    document.getElementById('triviaModalContenido').innerHTML = `
        <div class="trivia-advertencia">
            <i class="fas fa-question-circle"></i>
            <h3>Trivia de Películas</h3>
            <p>Son 10 preguntas, un tiro por pregunta — 10 segundos cada una.</p>
            <p>Tenés <strong>un solo intento por día</strong>. Respondé las 10 preguntas — te equivoques o no, seguís hasta el final, y ahí vemos cuántas acertaste.</p>
            <div class="trivia-advertencia-botones">
                <button class="trivia-btn-primario" onclick="window.triviaConfirmarInicio()">Estoy listo, ¡a jugar!</button>
                <button class="trivia-btn-secundario" onclick="window.cerrarTrivia()">Ahora no</button>
            </div>
        </div>
    `;
    window._triviaEstadoPendiente = estado;
}

window.triviaConfirmarInicio = function() {
    localStorage.setItem(triviaAdvertenciaKey(), triviaFechaHoy());
    if (window._triviaEstadoPendiente) {
        renderTriviaEstado(window._triviaEstadoPendiente);
        window._triviaEstadoPendiente = null;
    }
};

window.cerrarTrivia = function() {
    // Si hay una pregunta activa en juego, cerrar cuenta como abandonar el
    // intento de hoy — se avisa antes, no se cierra directo.
    if (window._triviaEnCurso) {
        window._triviaRestanteAlPausar = window._triviaRestanteActual ?? 10;
        if (window._triviaTimerInterval) clearInterval(window._triviaTimerInterval);
        renderTriviaConfirmarSalida();
        return;
    }
    document.getElementById('triviaModal').style.display = 'none';
    document.body.style.overflow = '';
    if (window._triviaTimerInterval) clearInterval(window._triviaTimerInterval);
};

function renderTriviaConfirmarSalida() {
    document.getElementById('triviaModalContenido').innerHTML = `
        <div class="trivia-advertencia">
            <i class="fas fa-exclamation-triangle" style="color:#e5a723;"></i>
            <h3>¿Salir de la trivia?</h3>
            <p>Si salís ahora, tu intento de hoy termina acá. Sumás los puntos de lo que ya acertaste, pero no vas a poder seguir jugando hasta mañana.</p>
            <div class="trivia-advertencia-botones">
                <button class="trivia-btn-primario" onclick="window.triviaSeguirJugando()">Seguir jugando</button>
                <button class="trivia-btn-secundario" onclick="window.triviaConfirmarSalida()">Salir de todos modos</button>
            </div>
        </div>
    `;
}

window.triviaSeguirJugando = function() {
    // Reanuda sin re-fetchear al servidor — misma pregunta, con el tiempo
    // restante exacto que tenía al momento de pausar (mínimo 1s para que
    // no se mande una respuesta -1 al instante).
    const d = window._triviaPreguntaEnCursoData;
    const restante = Math.max(1, Math.round(window._triviaRestanteAlPausar ?? 10));
    if (d) {
        renderTriviaPregunta(d.pregunta, d.numero, d.total, restante);
    } else {
        window.abrirTrivia(); // fallback por las dudas, no debería pasar
    }
};

window.triviaConfirmarSalida = async function() {
    try {
        await fetch(`${CONFIG.API_URL}/trivia/abandonar${triviaQueryParam()}`, {
            method: 'POST',
            headers: triviaAuthHeaders()
        });
    } catch (e) {}
    window._triviaEnCurso = false;
    document.getElementById('triviaModal').style.display = 'none';
    document.body.style.overflow = '';
    window.cargarTriviaBadge();
};

function renderTriviaEstado(estado) {
    if (estado.estado === 'GANADA') {
        renderTriviaGanada(estado.puntosGanados);
    } else if (estado.estado === 'PERDIDA') {
        renderTriviaPerdida(estado.puntosGanados, estado.aciertos, estado.totalPreguntas);
    } else {
        renderTriviaPregunta(estado.pregunta, estado.preguntaActual, estado.totalPreguntas);
    }
}

function renderTriviaPregunta(pregunta, numero, total, segundosIniciales = 10) {
    window._triviaEnCurso = true;
    window._triviaTotalPreguntas = total;// se guarda para reusarlo al avanzar de pregunta
    window._triviaPreguntaEnCursoData = { pregunta, numero, total }; // para reanudar sin re-fetch
    const cont = document.getElementById('triviaModalContenido');

    let mediaHtml;
    if (pregunta.tipo === 'QUIEN_ES' || pregunta.mostrarPoster) {
        mediaHtml = `<img class="trivia-imagen" src="${pregunta.imagenUrl}" alt="">`;
    } else {
        mediaHtml = `<div class="trivia-sinopsis">${pregunta.sinopsis || ''}</div>`;
    }

    const etiqueta = pregunta.tipo === 'QUIEN_ES' ? '¿Quién es?' : 'Adivina la película';

    cont.innerHTML = `
            <div class="trivia-header">
                <span class="trivia-progreso">Pregunta ${numero} de ${total}</span>
                <div class="trivia-timer"><i class="fas fa-clock"></i> <span id="triviaTimerNum">10s</span></div>
            </div>
            <div class="trivia-barra-tiempo"><div class="trivia-barra-tiempo-fill" id="triviaBarraFill" style="width:100%;"></div></div>
            <p class="trivia-tipo-label">${etiqueta}</p>
            ${mediaHtml}
            <div class="trivia-opciones" id="triviaOpciones">
                ${pregunta.opciones.map((op, i) =>
                    `<button class="trivia-opcion" onclick="window.triviaResponder(${i})">${op}</button>`
                ).join('')}
            </div>
        `;

        // Si se está reanudando tras una pausa, el "inicio" se corre hacia
                // atrás por lo ya consumido — así el tiempo de respuesta final sigue
                // siendo el real acumulado, no arranca de cero por haber pausado.
                const segundosYaConsumidos = 10 - segundosIniciales;
                window._triviaInicioPregunta = Date.now() - (segundosYaConsumidos * 1000);
                iniciarTimer(segundosIniciales);
        }

        function iniciarTimer(segundosIniciales = 10) {
            let restante = segundosIniciales;
            const fill = document.getElementById('triviaBarraFill');
            const num = document.getElementById('triviaTimerNum');

            if (window._triviaTimerInterval) clearInterval(window._triviaTimerInterval);

            window._triviaTimerInterval = setInterval(() => {
                restante -= 0.2;
                window._triviaRestanteActual = restante; // último valor conocido, por si se pausa acá
                if (fill) fill.style.width = Math.max(0, (restante / 10) * 100) + '%';
                if (num) num.textContent = Math.max(0, Math.ceil(restante)) + 's';

                if (restante <= 0) {
                    clearInterval(window._triviaTimerInterval);
                    window.triviaResponder(-1); // se acabó el tiempo — se manda una opción inválida
                }
            }, 200);
        }

window.triviaResponder = async function(opcionElegida) {
    if (window._triviaEnviando) return; // ya hay una respuesta en curso — ignorar
    window._triviaEnviando = true;

    if (window._triviaTimerInterval) clearInterval(window._triviaTimerInterval);

    document.querySelectorAll('#triviaOpciones .trivia-opcion').forEach(b => b.style.pointerEvents = 'none');

    const tiempoSegundos = window._triviaInicioPregunta
        ? Math.min(10, Math.round((Date.now() - window._triviaInicioPregunta) / 1000))
        : 10;

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/responder${triviaQueryParam()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...triviaAuthHeaders() },
            body: JSON.stringify({ opcionElegida, tiempoSegundos })
        });

        if (res.status === 409) {
            // Se detectó una doble respuesta — no confiamos en este resultado,
            // volvemos a pedir el estado real desde el servidor.
            window._triviaEnviando = false;
            window.abrirTrivia();
            return;
        }

        const data = await res.json();

        const botones = document.querySelectorAll('#triviaOpciones .trivia-opcion');
        botones.forEach((b, i) => {
            if (i === data.respuestaCorrectaIndex) b.classList.add('correcta');
            else if (i === opcionElegida) b.classList.add('incorrecta');
        });

        if (data.puntosGanadosEstaRespuesta > 0 && typeof mostrarPuntosGanados === 'function') {
            mostrarPuntosGanados(data.puntosGanadosEstaRespuesta);
        }

        setTimeout(() => {
                            if (data.estado === 'EN_CURSO') {
                                                            renderTriviaPregunta(data.siguientePregunta, data.preguntaActual, window._triviaTotalPreguntas);
                                                        } else if (data.estado === 'GANADA') {
                                renderTriviaGanada(data.puntosGanadosTotal);
                            } else {
                                        renderTriviaPerdida(data.puntosGanadosTotal, data.aciertos, window._triviaTotalPreguntas);
                                    }
                    window.cargarTriviaBadge(); // refresca el badge del feed con el nuevo estado
                    window._triviaEnviando = false;
                }, 1200);

            } catch (e) {
                window._triviaEnviando = false;
                document.getElementById('triviaModalContenido').innerHTML =
                    '<div class="trivia-resultado"><p>Hubo un error al responder. Cerrá e intentá de nuevo.</p></div>';
            }
        };

function esInvitado() {
    return !localStorage.getItem('token');
}

function ctaInvitadoHtml(puntos) {
    if (!esInvitado() || !puntos) return '';
    return `
        <div class="trivia-cta-invitado">
            <p>Jugaste como invitado — sumaste <strong>${puntos} puntos</strong> hoy. Iniciá sesión o creá tu cuenta para que no se pierdan y quedar en el ranking de cinéfilos.</p>
            <div class="trivia-advertencia-botones">
                <button class="trivia-btn-cta-invitado" onclick="window.location.href='login.html'">Iniciar sesión / crear cuenta</button>
            </div>
        </div>`;
}

function urlTriviaPublica() {
    return `${window.location.origin}/trivia-publica`;
}

window.compartirTrivia = async function() {
    const url = urlTriviaPublica();
    const texto = '🎬 Te desafío a la trivia de hoy en Cinemarketer — ¿cuántas preguntas acertás?';

    if (navigator.share) {
        try {
            await navigator.share({ title: 'Adivina Adivinador', text: texto, url });
        } catch (e) {} // usuario canceló el share nativo, no hacemos nada
    } else {
        try {
            await navigator.clipboard.writeText(url);
            if (typeof showToast === 'function') showToast('success', 'Link copiado');
        } catch (e) {}
    }
};

function botonCompartirHtml() {
    return `
        <button class="trivia-btn-compartir" onclick="window.compartirTrivia()">
            <i class="fas fa-bolt"></i> Desafiá a tus amigos
        </button>`;
}

function renderTriviaGanada(puntos) {
    window._triviaEnCurso = false;
    document.getElementById('triviaModalContenido').innerHTML = `
        <div class="trivia-resultado">
            <i class="fas fa-trophy" style="color:#f5a623;"></i>
            <h3>¡Sos un cinéfilo de primera!</h3>
            <p>Acertaste las 10 preguntas de hoy. Volvé mañana para mantener tu racha en el ranking de cinéfilos.</p>
            ${botonCompartirHtml()}
        </div>
        ${ctaInvitadoHtml(puntos)}
    `;
}

function renderTriviaPerdida(puntos, aciertos, total) {
    window._triviaEnCurso = false;
    document.getElementById('triviaModalContenido').innerHTML = `
        <div class="trivia-resultado">
            <i class="fas fa-hourglass-half" style="color:#999;"></i>
            <h3>¡Completaste la trivia de hoy!</h3>
            <p>Acertaste <strong>${aciertos} de ${total}</strong> preguntas y sumaste <strong>${puntos} puntos</strong>. Volvé mañana para tu próximo intento.</p>
            ${botonCompartirHtml()}
        </div>
        ${ctaInvitadoHtml(puntos)}
    `;
}

/**
 * Se llama apenas el usuario se registra/loguea, si jugó como invitado hoy —
 * le atribuye el intento anónimo. Falta enganchar esta llamada en el flujo
 * real de login/registro (no tengo esos archivos todavía).
 */
window.triviaIntentarReclamar = async function() {
    const guestToken = localStorage.getItem('triviaGuestToken');
    const token = localStorage.getItem('token');
    if (!guestToken || !token) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/reclamar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ guestToken })
        });
        if (res.ok) {
            localStorage.removeItem('triviaGuestToken');
            window.cargarTriviaBadge();
        }
    } catch (e) {}
};

window.abrirRankingTrivia = async function(otroUsuarioId, otroNombre) {
    const modal = document.getElementById('rankingTriviaModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('rankingTriviaContenido').innerHTML =
        '<div class="trivia-resultado"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/ranking`, { headers: triviaAuthHeaders() });
        const ranking = await res.json();

        // Si vino con un otroUsuarioId Y no es el mío propio, estoy
        // viendo el ranking desde la Sala de otra persona — ahí se
        // muestra la comparación cara a cara, no la lista completa.
        const miId = localStorage.getItem('userId');
        const esOtroPerfil = otroUsuarioId && String(otroUsuarioId) !== String(miId);

        if (esOtroPerfil) {
            renderComparacionRankingTrivia(ranking, otroUsuarioId, otroNombre);
        } else {
            renderRankingTrivia(ranking);
        }
    } catch (e) {
        document.getElementById('rankingTriviaContenido').innerHTML =
            '<div class="trivia-resultado"><p>No pudimos cargar el ranking.</p></div>';
    }
};

window.cerrarRankingTrivia = function() {
    document.getElementById('rankingTriviaModal').style.display = 'none';
    document.body.style.overflow = '';
};

function renderRankingTrivia(ranking) {
    const cont = document.getElementById('rankingTriviaContenido');

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
            <h3 class="ranking-titulo">🏆 Ranking de cinéfilos</h3>
            <p class="ranking-sub">Por cantidad de aciertos en Adivina Adivinador</p>
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
                            <span style="cursor:pointer;" onclick="event.stopPropagation(); window.cerrarRankingTrivia(); window.abrirPerfilUsuario(${r.userId})">${r.nombre}${r.esUsuarioActual ? ' (vos)' : ''}</span>
                            <span class="ranking-aciertos">${r.aciertos}</span>
                            <span class="ranking-tiempo">${formatTiempo(r.tiempoTotalSegundos)}</span>
                        </div>
                    `).join('')}
            </div>
        `;
}

function renderComparacionRankingTrivia(ranking, otroUsuarioId, otroNombre) {
    const cont = document.getElementById('rankingTriviaContenido');
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