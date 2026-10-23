// ==============================================
// PUBLICACIÓN PÚBLICA — bloques de Creator Tools para visitantes
// ==============================================
// La página pública reutiliza las MISMAS herramientas del feed (js/creator-tools/*.js): así,
// cualquier herramienta nueva funciona también en público sin código extra. Como esas
// herramientas están hechas para alguien logueado, acá se las adapta:
//   1. Los pedidos de datos se redirigen a los endpoints públicos y se les saca la sesión.
//   2. Votar y responder no llaman al backend: invitan a crear la cuenta
//      (sin cuenta se mira, no se interactúa).
//   3. Si el endpoint público de un bloque todavía no existe, se muestra un aviso
//      en vez de un error.
(function () {
    const ESTADOS = {};   // estado HTTP del último pedido público de datos de cada publicación
    const ETIQUETAS = { VOTACION: 'una votación', TRIVIA: 'una trivia', RANKING: 'un ranking' };

    // ---------- 1) Adaptador de pedidos ----------
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = function (input, init) {
        const base = window._comunidadApiUrl;
        if (typeof input === 'string' && base && input.indexOf(base + '/') === 0) {
            const resto = input.slice(base.length);
            const q = resto.indexOf('?');
            const ruta = q === -1 ? resto : resto.slice(0, q);
            const query = q === -1 ? '' : resto.slice(q);
            const publica = ruta
                .replace(/^\/movies\/person\/(\d+)$/, '/public/movies/person/$1')
                .replace(/^\/movies\/(\d+)$/, '/public/movies/$1')
                .replace(/^\/publications\/(\d+)\/(votacion|trivia|ranking)$/, '/publications/public/$1/$2');
            if (publica !== ruta) {
                const headers = Object.assign({}, init && init.headers);
                delete headers['Authorization'];   // visitante: nunca se manda la sesión a estos pedidos
                return fetchOriginal(base + publica + query, Object.assign({}, init, { headers: headers })).then(function (res) {
                    const m = publica.match(/^\/publications\/public\/(\d+)\/(votacion|trivia|ranking)$/);
                    if (m) ESTADOS[m[1]] = res.status;
                    return res;
                });
            }
        }
        return fetchOriginal(input, init);
    };

    // ---------- 2) Sin cuenta no se vota ni se responde ----------
    function cerrarAviso() {
        const el = document.getElementById('pubAvisoCuenta');
        if (el) el.remove();
    }

    function pedirCuenta(accion) {
        cerrarAviso();
        const textos = accion === 'responder'
            ? { titulo: 'Creá tu cuenta para responder', cuerpo: 'Es gratis y tarda un minuto. Respondé y mirá cuánta gente acertó.' }
            : { titulo: 'Creá tu cuenta para votar', cuerpo: 'Es gratis y tarda un minuto. Tu voto se suma al de toda la comunidad.' };
        const overlay = document.createElement('div');
        overlay.id = 'pubAvisoCuenta';
        overlay.className = 'pub-aviso-overlay';
        overlay.innerHTML = `
            <div class="pub-aviso-caja" role="dialog" aria-modal="true">
                <button type="button" class="pub-aviso-cerrar" aria-label="Cerrar">✕</button>
                <h3>${textos.titulo}</h3>
                <p>${textos.cuerpo}</p>
                <div class="pub-aviso-btns">
                    <a href="/register.html" class="pub-cta-btn-primary">Registrarme gratis</a>
                    <a href="/login.html" class="pub-cta-btn-secondary">Ya tengo cuenta</a>
                </div>
            </div>`;
        overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrarAviso(); });
        overlay.querySelector('.pub-aviso-cerrar').addEventListener('click', cerrarAviso);
        document.body.appendChild(overlay);
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarAviso(); });

    window.votarOpcionVotacion = function () { pedirCuenta('votar'); };
    window.responderTriviaOpcion = function () { pedirCuenta('responder'); };
    window._abrirPeliculaDesdeModalPublicacion = function (movieId) {
        window.location.href = '/pelicula?id=' + encodeURIComponent(movieId);
    };
    if (!window.mostrarToast) window.mostrarToast = function () {};

    // ---------- 3) Dibujo del bloque y del video ----------
    function avisoNoDisponible(key) {
        const que = ETIQUETAS[key] || 'un bloque interactivo';
        return `<div class="pub-bloque-aviso">
            <i class="fas fa-lock"></i>
            <p>Esta publicación incluye ${que}.</p>
            <span>Creá tu cuenta gratis para verla y participar.</span>
            <a href="/register.html" class="pub-cta-btn-primary">Registrarme gratis</a>
        </div>`;
    }

    window.pubRenderBloque = async function (pub, herramienta, contenedor) {
        if (!herramienta || !contenedor || typeof herramienta.renderEnCard !== 'function') return;
        contenedor.innerHTML = herramienta.renderEnCard(pub);
        if (!contenedor.innerHTML.trim()) return;
        contenedor.style.display = 'block';
        if (typeof herramienta.resolverEnCard === 'function') {
            try { await herramienta.resolverEnCard(pub); } catch (e) {}
        }
        const estado = ESTADOS[String(pub.id)];
        if (estado !== undefined && estado !== 200) contenedor.innerHTML = avisoNoDisponible(herramienta.key);
    };

    // Mismo reproductor que el feed (Cloudflare Stream). videoUrl solo existe cuando el video está aprobado.
    window.pubRenderVideo = function (pub, contenedor) {
        if (!contenedor || !pub.videoUrl || !/^[A-Za-z0-9]{20,40}$/.test(pub.videoUid || '')) return;
        contenedor.innerHTML = `<div class="pub-video">
            <iframe src="https://iframe.videodelivery.net/${pub.videoUid}"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowfullscreen="true"></iframe>
        </div>`;
    };
})();