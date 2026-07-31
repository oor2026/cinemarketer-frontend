// ==============================================
// trivia.js — Adivina Adivinador
// ==============================================

window._triviaTimerInterval = null;

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
        contenedor.style.display = 'block';
        actualizarBadgeSub(estado);
    } catch (e) {
        contenedor.style.display = 'none';
    }
};

function actualizarBadgeSub(estado) {
    const sub = document.getElementById('triviaBadgeSub');
    if (!sub) return;
    if (estado.estado === 'GANADA') {
        sub.textContent = '¡Ganaste hoy! Volvé mañana';
    } else if (estado.estado === 'PERDIDA') {
        sub.textContent = 'Volvé mañana a las 00hs';
    } else {
        sub.textContent = `Pregunta ${estado.preguntaActual} de ${estado.totalPreguntas}`;
    }
}

window.abrirTrivia = async function() {
    const modal = document.getElementById('triviaModal');
    modal.style.display = 'flex';

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/estado${triviaQueryParam()}`, {
            headers: triviaAuthHeaders()
        });
        const estado = await res.json();
        renderTriviaEstado(estado);
    } catch (e) {
        document.getElementById('triviaModalContenido').innerHTML =
            '<div class="trivia-resultado"><p>No pudimos cargar la trivia. Probá de nuevo.</p></div>';
    }
};

window.cerrarTrivia = function() {
    document.getElementById('triviaModal').style.display = 'none';
    if (window._triviaTimerInterval) clearInterval(window._triviaTimerInterval);
};

function renderTriviaEstado(estado) {
    if (estado.estado === 'GANADA') {
        renderTriviaGanada();
    } else if (estado.estado === 'PERDIDA') {
        renderTriviaPerdida();
    } else {
        renderTriviaPregunta(estado.pregunta, estado.preguntaActual, estado.totalPreguntas);
    }
}

function renderTriviaPregunta(pregunta, numero, total) {
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

    iniciarTimer();
}

function iniciarTimer() {
    let restante = 10;
    const fill = document.getElementById('triviaBarraFill');
    const num = document.getElementById('triviaTimerNum');

    if (window._triviaTimerInterval) clearInterval(window._triviaTimerInterval);

    window._triviaTimerInterval = setInterval(() => {
        restante -= 0.2;
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

    try {
        const res = await fetch(`${CONFIG.API_URL}/trivia/responder${triviaQueryParam()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...triviaAuthHeaders() },
            body: JSON.stringify({ opcionElegida })
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
                        renderTriviaPregunta(data.siguientePregunta, data.preguntaActual, undefined);
                    } else if (data.estado === 'GANADA') {
                        renderTriviaGanada();
                    } else {
                        renderTriviaPerdida();
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

function renderTriviaGanada() {
    document.getElementById('triviaModalContenido').innerHTML = `
        <div class="trivia-resultado">
            <i class="fas fa-trophy" style="color:#f5a623;"></i>
            <h3>¡Sos un cinéfilo de primera!</h3>
            <p>Acertaste las 10 preguntas de hoy. Volvé mañana para mantener tu racha en el ranking de cinéfilos.</p>
        </div>
    `;
}

function renderTriviaPerdida() {
    document.getElementById('triviaModalContenido').innerHTML = `
        <div class="trivia-resultado">
            <i class="fas fa-hourglass-half" style="color:#999;"></i>
            <h3>¡Casi!</h3>
            <p>Volvé mañana a las 00hs para tu próxima trivia.</p>
        </div>
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