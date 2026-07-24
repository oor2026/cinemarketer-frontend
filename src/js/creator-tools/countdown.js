// ==============================================
// CREATOR TOOLS — Cuenta regresiva de estreno
// ==============================================
(function() {
    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZjFjNjgyZDZkNTMzNWIzMjQyNzc3MzQ2OWUxNmE1MSIsIm5iZiI6MTc3MTE3NzkxNy44ODEsInN1YiI6IjY5OTIwN2JkOTRjZDE0N2M5ZjFhZWY2OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.8GieGBESmuWLnoD_IyFrBbXBCX40qUKE8vY6VBMj_DM';
    const BASE_BACKDROP = 'https://image.tmdb.org/t/p/w780';

    function nombrePais(code) {
        try {
            return new Intl.DisplayNames(['es'], { type: 'region' }).of(code);
        } catch (e) {
            return code;
        }
    }

    function formatearFecha(fechaStr) {
        return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    }

    // ============== MENÚ DEL WORKFLOW (Paso 4) ==============

    function renderExtra() {
        return `<div id="wfCountdownPaises" style="margin-top:0.75rem;">
            <p style="font-size:0.78rem;color:#999;text-align:center;padding:0.5rem;">
                <i class="fas fa-spinner fa-spin"></i> Buscando fechas de estreno...
            </p>
        </div>`;
    }

    async function resolverExtra(movieId, countryCodeActual) {
        const wrap = document.getElementById('wfCountdownPaises');
        if (!wrap || !movieId) return;
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/release_dates`, {
                headers: { 'Authorization': `Bearer ${TMDB_TOKEN}`, 'accept': 'application/json' }
            });
            const data = await res.json();
            const ahora = new Date();
            const todasLasFechas = (data.results || [])
                .filter(r => r.release_dates && r.release_dates.length > 0)
                .map(r => ({ pais: r.iso_3166_1, fecha: r.release_dates[0].release_date.slice(0, 10) }));

            const resultados = todasLasFechas.filter(r => new Date(r.fecha + 'T23:59:59') > ahora);

            if (todasLasFechas.length === 0) {
                wrap.innerHTML = `<p style="font-size:0.8rem;color:#e50914;text-align:center;padding:0.5rem;">
                    Todavía no hay fecha de estreno oficial cargada para esta película. Probá con otra herramienta.
                </p>`;
                return;
            }

            if (resultados.length === 0) {
                wrap.innerHTML = `<p style="font-size:0.8rem;color:#e50914;text-align:center;padding:0.5rem;">
                    Esta película ya se estrenó en todos los países disponibles — la cuenta regresiva es solo para próximos estrenos. Probá con otra herramienta.
                </p>`;
                return;
            }

            wrap.innerHTML = `
                <p style="font-size:0.75rem;color:#888;margin:0 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Elegí el país del estreno:</p>
                <div style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;">
                    ${resultados.map(r => {
                        const sel = r.pais === countryCodeActual;
                        return `<div onclick="window.wfSetCreatorToolField('countdownCountryCode', '${r.pais}')"
                                     style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;
                                            border:${sel ? '1.5px solid #7c3aed' : '1px solid #e0e0e0'};
                                            background:${sel ? '#f8f6ff' : 'white'};border-radius:8px;cursor:pointer;font-size:0.82rem;">
                                    <span>${escapeHtml(nombrePais(r.pais))}</span>
                                    <span style="color:#999;">${formatearFecha(r.fecha)}</span>
                                </div>`;
                    }).join('')}
                </div>`;
        } catch (e) {
            wrap.innerHTML = `<p style="font-size:0.8rem;color:#e50914;text-align:center;padding:0.5rem;">Error al buscar fechas de estreno.</p>`;
        }
    }

    // ============== RENDER EN EL FEED ==============

    function renderEnCard(pub) {
        return `
            <div class="com-card-countdown" id="countdown-${pub.id}"
                 style="margin:0 1rem 10px;border:1px solid #eee;border-radius:10px;overflow:hidden;cursor:pointer;"
                 onclick="window._abrirPeliculaDesdeModalPublicacion(${pub.movieId})">
                <div style="aspect-ratio:16/9;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-spinner fa-spin" style="color:#ccc;"></i>
                </div>
            </div>`;
    }

    function iniciarTicker(pubId, targetDate) {
        const el = document.getElementById(`countdown-${pubId}-timer`);
        if (!el) return;
        if (el._tickerInterval) clearInterval(el._tickerInterval);

        function tick() {
            const diff = targetDate.getTime() - Date.now();
            if (diff <= 0) {
                el.innerHTML = `<div style="padding:12px;text-align:center;">
                    <p style="font-size:0.85rem;font-weight:600;margin:0;color:#1a1a1a;">
                        <i class="fas fa-clapperboard"></i> Ya está en cines
                    </p>
                </div>`;
                clearInterval(el._tickerInterval);
                return;
            }
            const dias = Math.floor(diff / 86400000);
            const horas = Math.floor((diff % 86400000) / 3600000);
            const min = Math.floor((diff % 3600000) / 60000);
            const seg = Math.floor((diff % 60000) / 1000);
            const celda = (num, label) => `
                <div style="flex:1;text-align:center;padding:12px 4px;background:#fff5f5;">
                    <p style="font-size:1.5rem;font-weight:700;margin:0;color:#e50914;line-height:1;">${String(num).padStart(2, '0')}</p>
                    <p style="font-size:0.68rem;color:#999;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
                </div>`;
            el.innerHTML = `<div style="display:flex;gap:2px;padding:2px;background:#eee;">
                ${celda(dias, 'días')}${celda(horas, 'horas')}${celda(min, 'min')}${celda(seg, 'seg')}
            </div>`;
        }
        tick();
        el._tickerInterval = setInterval(tick, 1000);
    }

    async function resolverEnCard(pub) {
        const wrap = document.getElementById(`countdown-${pub.id}`);
        if (!wrap) return;
        try {
            const token = localStorage.getItem('token');
            const [movieRes, datesRes] = await Promise.all([
                fetch(`${window._comunidadApiUrl}/movies/${pub.movieId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`https://api.themoviedb.org/3/movie/${pub.movieId}/release_dates`, {
                    headers: { 'Authorization': `Bearer ${TMDB_TOKEN}`, 'accept': 'application/json' }
                })
            ]);
            if (!movieRes.ok) throw new Error('not found');
            const m = await movieRes.json();
            const datesData = await datesRes.json();

            const resultado = (datesData.results || []).find(r => r.iso_3166_1 === pub.countdownCountryCode);
            const fechaStr = resultado?.release_dates?.[0]?.release_date?.slice(0, 10);
            if (!fechaStr) throw new Error('no date');

            const backdropUrl = m.backdrop_path ? `${BASE_BACKDROP}${m.backdrop_path}` : '';
            const paisLabel = nombrePais(pub.countdownCountryCode);
            const fechaLabel = formatearFecha(fechaStr);

            wrap.innerHTML = `
                <div style="aspect-ratio:16/9;background:#f5f5f5;">
                    <img src="${backdropUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';">
                </div>
                <div style="padding:16px 14px;border-bottom:0.5px solid #eee;text-align:center;">
                    <p style="font-size:1.4rem;font-weight:700;color:#1a1a1a;margin:0 0 5px;">${escapeHtml(m.title || '')}</p>
                    <p style="font-size:1.05rem;color:#e50914;font-weight:600;margin:0;">Estreno en ${escapeHtml(paisLabel)} · ${fechaLabel}</p>
                </div>
                <div id="countdown-${pub.id}-timer"></div>`;

            iniciarTicker(pub.id, new Date(fechaStr + 'T00:00:00'));
        } catch (e) {
            wrap.innerHTML = `<div style="padding:12px;text-align:center;">
                <span style="font-size:0.8rem;color:#bbb;">Fecha de estreno no disponible</span>
            </div>`;
            wrap.style.cursor = 'default';
            wrap.onclick = null;
        }
    }

    window.CreatorTools = window.CreatorTools || [];
    window.CreatorTools.push({
        key: 'COUNTDOWN',
        emoji: '⏳',
        label: 'Cuenta regresiva de estreno',
        desc: 'Días, horas y minutos para el estreno',
        disponible: true,
        bloqueaImagenVideo: true,
        activoPara: (pub) => !!(pub.movieId && pub.countdownEnabled),
        onSeleccionar: (_wf, activo) => {
            _wf.countdownEnabled = activo;
            if (!activo) _wf.countdownCountryCode = null;
        },
        puedeAvanzar: (_wf) => !!_wf.countdownCountryCode,
        renderEnCard: renderEnCard,
        resolverEnCard: (pub) => resolverEnCard(pub),
        renderExtra: renderExtra,
        resolverExtra: (movieId, countryCodeActual) => resolverExtra(movieId, countryCodeActual)
    });
})();