// ==============================================
// CREDENCIAL DIGITAL CINÉFILA
// ==============================================
// Modal global (se abre desde el header y desde Mi Sala). Pide la
// credencial a GET /api/credencial y la dibuja. Todo lo que hace que la
// credencial "valga" sale del servidor: la fecha/hora de generación, el
// vencimiento y la URL firmada del QR. El reloj en vivo usa la hora del
// servidor (corrigiendo la diferencia con el reloj del teléfono), no la del
// teléfono.
//
// Depende de: CONFIG.API_URL (config.js), el token en localStorage y la
// librería qrcode-generator (js/vendor/qrcode.js, global `qrcode`).
// El modal se arma por JS la primera vez que se abre: no hace falta markup
// en dashboard.html.

(function () {
    const ZONA_AR = 'America/Argentina/Buenos_Aires';

    let intervaloReloj = null;
    let credencialActual = null;   // respuesta del back
    let desfaseServidorMs = 0;     // hora del servidor - hora del teléfono

    // ---------- utilidades ----------

    function escapar(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function ahoraServidor() {
        return Date.now() + desfaseServidorMs;
    }

    function hora(ms, conSegundos) {
        const op = { timeZone: ZONA_AR, hour: '2-digit', minute: '2-digit', hour12: false };
        if (conSegundos) op.second = '2-digit';
        return new Date(ms).toLocaleTimeString('es-AR', op);
    }

    function fecha(ms) {
        return new Date(ms).toLocaleDateString('es-AR', { timeZone: ZONA_AR, day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function inicial(nombre) {
        const limpio = String(nombre || '').trim();
        return limpio ? limpio.charAt(0).toUpperCase() : '?';
    }

    function irAModulo(modulo) {
        window.cerrarCredencial();
        if (typeof loadModule === 'function') loadModule(modulo);
        else window.location.hash = '#' + modulo;
    }

    // ---------- estructura del modal ----------

    function asegurarModal() {
        let overlay = document.getElementById('credencialOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'credencialOverlay';
        overlay.className = 'cred-overlay';
        overlay.innerHTML = `
            <div class="cred-barra">
                <span class="cred-barra-titulo">Mi credencial</span>
                <button type="button" class="cred-cerrar" aria-label="Cerrar" onclick="window.cerrarCredencial()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="cred-contenido" id="credencialContenido"></div>
        `;
        // Click en el fondo (no en la tarjeta) cierra
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) window.cerrarCredencial();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function cerrarConEscape(e) {
        if (e.key === 'Escape') window.cerrarCredencial();
    }

    // ---------- abrir / cerrar ----------

    window.abrirCredencial = async function () {
        const overlay = asegurarModal();
        overlay.classList.add('cred-overlay--abierto');
        document.body.classList.add('cred-sin-scroll');
        document.addEventListener('keydown', cerrarConEscape);
        await cargarCredencial();
    };

    window.cerrarCredencial = function () {
        const overlay = document.getElementById('credencialOverlay');
        if (overlay) overlay.classList.remove('cred-overlay--abierto');
        document.body.classList.remove('cred-sin-scroll');
        document.removeEventListener('keydown', cerrarConEscape);
        detenerReloj();
        credencialActual = null;
    };

    window.regenerarCredencial = function () {
        cargarCredencial();
    };

    // ---------- pedido al back ----------

    async function cargarCredencial() {
        const contenido = document.getElementById('credencialContenido');
        detenerReloj();
        contenido.innerHTML = `
            <div class="cred-cargando">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generando tu credencial…</span>
            </div>`;

        let res;
        try {
            const token = localStorage.getItem('token');
            res = await fetch(`${CONFIG.API_URL}/credencial`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
        } catch (e) {
            mostrarMensaje('No pudimos conectarnos', 'Revisá tu conexión e intentá de nuevo.', true);
            return;
        }

        let cuerpo = null;
        try { cuerpo = await res.json(); } catch (e) { /* cuerpo vacío */ }

        if (res.ok && cuerpo) {
            credencialActual = cuerpo;
            desfaseServidorMs = cuerpo.servidorAhoraEpochMs - Date.now();
            renderCredencial(cuerpo);
            iniciarReloj();
        } else if (res.status === 409 && cuerpo && Array.isArray(cuerpo.faltantes)) {
            renderFaltantes(cuerpo.faltantes);
        } else if (res.status === 401) {
            mostrarMensaje('Tu sesión venció', 'Volvé a iniciar sesión para ver tu credencial.', false);
        } else if (cuerpo && cuerpo.message) {
            mostrarMensaje('No podemos generar tu credencial', cuerpo.message, false);
        } else {
            mostrarMensaje('Algo salió mal', 'No pudimos generar tu credencial. Intentá de nuevo en un rato.', true);
        }
    }

    // ---------- credencial ----------

    function renderCredencial(c) {
        const contenido = document.getElementById('credencialContenido');

        const foto = c.fotoUrl
            ? `<img class="cred-foto" src="${escapar(c.fotoUrl)}" alt="Foto de ${escapar(c.nombre)}">`
            : `<div class="cred-foto cred-foto--inicial" aria-hidden="true">${escapar(inicial(c.nombre))}</div>`;

        contenido.innerHTML = `
            <div class="cred-tarjeta" id="credencialTarjeta">
                <div class="cred-holo" aria-hidden="true"></div>

                <div class="cred-cabecera">
                    <div class="cred-cabecera-titulo">
                        <span class="cred-eyebrow">CREDENCIAL DIGITAL</span>
                        <span class="cred-titulo">Cinéfila</span>
                    </div>
                    <span class="cred-marca">CINEMARKETER</span>
                </div>

                <div class="cred-identidad">
                    ${foto}
                    <div class="cred-identidad-datos">
                        <span class="cred-etiqueta">NOMBRE COMPLETO</span>
                        <span class="cred-nombre">${escapar(c.nombre)}</span>
                        <span class="cred-insignia">${escapar(c.insigniaEmoji)} ${escapar(c.insigniaNombre)}</span>
                    </div>
                </div>

                <div class="cred-datos">
                    <div class="cred-dato">
                        <span class="cred-etiqueta">TÓTEM CINÉFILO</span>
                        <div class="cred-totem">
                            <span class="cred-totem-emoji">${escapar(c.totemEmoji)}</span>
                            <span class="cred-totem-nombre">${escapar(c.totemNombre)}</span>
                        </div>
                    </div>
                    <div class="cred-dato">
                        <span class="cred-etiqueta">N° CREDENCIAL · DNI</span>
                        <span class="cred-numero">${escapar(c.numeroCredencial)}</span>
                    </div>
                </div>

                <div class="cred-qr-fila">
                    <div class="cred-qr" id="credencialQr"></div>
                    <div class="cred-qr-texto">
                        <span class="cred-qr-titulo">El comercio escanea este código para validarla</span>
                        <span class="cred-qr-sub">Presentala junto con tu DNI físico.</span>
                    </div>
                </div>

                <div class="cred-pie">
                    <div class="cred-pie-fila">
                        <span class="cred-estado" id="credencialEstado">
                            <span class="cred-estado-punto"></span>
                            <span class="cred-estado-texto">EN VIVO</span>
                        </span>
                        <span class="cred-reloj" id="credencialReloj">--:--:--</span>
                    </div>
                    <div class="cred-pie-fila cred-pie-fila--chica">
                        <span>Generada ${fecha(c.emitidaEnEpochMs)} · ${hora(c.emitidaEnEpochMs, true)} hs</span>
                        <span id="credencialVence"></span>
                    </div>
                </div>
            </div>

            <div class="cred-acciones" id="credencialAcciones">
                <span class="cred-aviso">Los datos son válidos a la fecha y hora de generación. La credencial se vence sola a los ${escapar(c.vigenciaMinutos)} minutos.</span>
            </div>
        `;

        dibujarQr(c.urlVerificacion);
    }

    function dibujarQr(url) {
        const cont = document.getElementById('credencialQr');
        if (!cont) return;
        if (typeof qrcode !== 'function') {
            cont.innerHTML = '<span class="cred-qr-error">No se pudo dibujar el QR</span>';
            return;
        }
        try {
            const qr = qrcode(0, 'M');
            qr.addData(url);
            qr.make();
            cont.innerHTML = qr.createSvgTag(4, 0);
        } catch (e) {
            cont.innerHTML = '<span class="cred-qr-error">No se pudo dibujar el QR</span>';
        }
    }

    // ---------- reloj en vivo y vencimiento ----------

    function iniciarReloj() {
        detenerReloj();
        actualizarReloj();
        intervaloReloj = setInterval(actualizarReloj, 1000);
    }

    function detenerReloj() {
        if (intervaloReloj) clearInterval(intervaloReloj);
        intervaloReloj = null;
    }

    function actualizarReloj() {
        if (!credencialActual) return;
        const ahora = ahoraServidor();
        const reloj = document.getElementById('credencialReloj');
        const vence = document.getElementById('credencialVence');
        if (reloj) reloj.textContent = hora(ahora, true);

        const restante = credencialActual.venceEnEpochMs - ahora;
        if (restante <= 0) {
            marcarVencida();
            return;
        }
        const mm = String(Math.floor(restante / 60000)).padStart(2, '0');
        const ss = String(Math.floor((restante % 60000) / 1000)).padStart(2, '0');
        if (vence) vence.textContent = `Vence en ${mm}:${ss}`;
    }

    function marcarVencida() {
        detenerReloj();
        const tarjeta = document.getElementById('credencialTarjeta');
        const estado = document.getElementById('credencialEstado');
        const vence = document.getElementById('credencialVence');
        const qr = document.getElementById('credencialQr');
        const acciones = document.getElementById('credencialAcciones');

        if (tarjeta) tarjeta.classList.add('cred-tarjeta--vencida');
        if (estado) estado.querySelector('.cred-estado-texto').textContent = 'VENCIDA';
        if (vence) vence.textContent = `Venció a las ${hora(credencialActual.venceEnEpochMs, false)}`;
        if (qr && !qr.querySelector('.cred-qr-tapa')) {
            qr.insertAdjacentHTML('beforeend', '<div class="cred-qr-tapa">QR vencido</div>');
        }
        if (acciones) {
            acciones.innerHTML = `
                <button type="button" class="cred-boton" onclick="window.regenerarCredencial()">Generar de nuevo</button>`;
        }
    }

    // ---------- faltan datos ----------

    const ACCION_POR_CODIGO = {
        NOMBRE: { texto: 'Completar', modulo: 'mi-cuenta' },
        DNI: { texto: 'Completar', modulo: 'mi-cuenta' },
        TOTEM: { texto: 'Ir a votar', modulo: 'feed-films' }
    };

    const ETIQUETA_POR_CODIGO = {
        NOMBRE: 'Nombre completo',
        DNI: 'DNI',
        INSIGNIA: 'Insignia',
        TOTEM: 'Tótem cinéfilo'
    };

    function renderFaltantes(faltantes) {
        const contenido = document.getElementById('credencialContenido');

        const filas = faltantes.map(f => {
            const accion = ACCION_POR_CODIGO[f.codigo];
            const boton = accion
                ? `<button type="button" class="cred-faltante-accion" onclick="window._credencialIrA('${accion.modulo}')">${accion.texto}</button>`
                : '';
            return `
                <div class="cred-faltante">
                    <span class="cred-faltante-icono"><i class="fas fa-exclamation"></i></span>
                    <div class="cred-faltante-texto">
                        <span class="cred-faltante-titulo">${escapar(ETIQUETA_POR_CODIGO[f.codigo] || f.codigo)}</span>
                        <span class="cred-faltante-detalle">${escapar(f.mensaje)}</span>
                    </div>
                    ${boton}
                </div>`;
        }).join('');

        const primerModulo = (faltantes.map(f => ACCION_POR_CODIGO[f.codigo]).find(a => a) || {}).modulo;

        contenido.innerHTML = `
            <div class="cred-panel">
                <div class="cred-panel-cabecera">
                    <span class="cred-panel-icono"><i class="fas fa-id-card"></i></span>
                    <span class="cred-panel-titulo">Tu credencial todavía no está lista</span>
                    <span class="cred-panel-sub">Para generarla necesitamos que completes estos datos. Es un requisito para que los comercios puedan validarla.</span>
                </div>
                <div class="cred-faltantes">${filas}</div>
                <div class="cred-panel-pie">
                    <span class="cred-panel-nota">La foto no es obligatoria: si no tenés una cargada, la credencial muestra la inicial de tu nombre.</span>
                    ${primerModulo ? `<button type="button" class="cred-boton" onclick="window._credencialIrA('${primerModulo}')">Completar mis datos</button>` : ''}
                </div>
            </div>`;
    }

    window._credencialIrA = function (modulo) {
        irAModulo(modulo);
    };

    // ---------- mensajes (403, 503, errores) ----------

    function mostrarMensaje(titulo, detalle, conReintento) {
        const contenido = document.getElementById('credencialContenido');
        contenido.innerHTML = `
            <div class="cred-panel">
                <div class="cred-panel-cabecera">
                    <span class="cred-panel-icono"><i class="fas fa-id-card"></i></span>
                    <span class="cred-panel-titulo">${escapar(titulo)}</span>
                    <span class="cred-panel-sub">${escapar(detalle)}</span>
                </div>
                ${conReintento ? `
                <div class="cred-panel-pie">
                    <button type="button" class="cred-boton" onclick="window.regenerarCredencial()">Intentar de nuevo</button>
                </div>` : ''}
            </div>`;
    }
})();
