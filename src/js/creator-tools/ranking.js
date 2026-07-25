(function() {
    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ============== MENÚ DEL WORKFLOW (Paso 4) ==============

    function renderFilaItem(item, idx, modoSegmentada) {
            const poster = item.posterUrl
                ? `<img src="${item.posterUrl}" style="width:34px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0;">`
                : item.movieId
                ? `<div style="width:34px;height:50px;background:#f0f0f0;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-spinner fa-spin" style="font-size:0.7rem;color:#ccc;"></i></div>`
                : `<div style="width:34px;height:50px;background:#f8f6ff;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-film" style="font-size:0.75rem;color:#d8cff5;"></i></div>`;

            const encabezado = `<div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:20px;text-align:center;font-size:0.85rem;font-weight:700;color:#7c3aed;">${idx + 1}</span>
                    <div id="wfRankingPoster-${idx}">${poster}</div>
                <input type="text" value="${(item.titulo || '').replace(/"/g,'&quot;')}"
                       placeholder="Buscar película para el puesto ${idx + 1}..." maxlength="120"
                       ${item.movieId ? 'readonly' : `oninput="window.wfRankingBuscar(${idx}, this.value)"`}
                       style="flex:1;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;
                              ${item.movieId ? 'background:#f5f5f5;color:#888;' : ''}">
                <span onclick="window.wfRankingQuitarItem(${idx})" style="cursor:pointer;color:#ccc;font-size:1rem;padding:0 4px;">×</span>
            </div>
            <div id="wfRankingResultados-${idx}" style="margin:4px 0 0 42px;"></div>`;

        const textoOpinion = (modoSegmentada && item.movieId) ? `
            <textarea placeholder="Tu opinión sobre esta película..." maxlength="500"
                      oninput="window.wfRankingCambiarTexto(${idx}, this.value)"
                      style="width:100%;box-sizing:border-box;margin:6px 0 0 42px;max-width:calc(100% - 42px);
                             min-height:60px;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;
                             font-size:0.82rem;font-family:inherit;resize:vertical;">${escapeHtml(item.texto || '')}</textarea>` : '';

        return `<div>${encabezado}${textoOpinion}</div>`;
    }

    function renderExtra() {
        const wf = window.getWfState();
        if (!wf.rankingItems || wf.rankingItems.length === 0) {
            wf.rankingItems = wf.movieId
                ? [{ movieId: wf.movieId, titulo: wf.movieTitulo || '', posterUrl: null, texto: '' }]
                : [{ movieId: null, titulo: '', posterUrl: null, texto: '' }];
        }
        if (!wf.rankingFormato) wf.rankingFormato = 'LISTA';
        if (!wf.rankingModoTexto) wf.rankingModoTexto = 'ESTANDAR';
        const modoSegmentada = wf.rankingModoTexto === 'SEGMENTADA';

        const filas = wf.rankingItems.map((it, idx) => renderFilaItem(it, idx, modoSegmentada)).join('');
        const puedeAgregar = wf.rankingItems.length < 10;

        const formatos = [
            { key: 'LISTA', label: 'Lista', icon: 'fa-list' },
            { key: 'CARRUSEL', label: 'Carrusel', icon: 'fa-images' }
        ];
        const botonesFormato = formatos.map(f => {
            const sel = wf.rankingFormato === f.key;
            return `<button type="button" onclick="window.wfRankingSetFormato('${f.key}')"
                        style="flex:1;padding:0.5rem;border-radius:8px;font-size:0.82rem;cursor:pointer;
                               border:${sel ? '1.5px solid #7c3aed' : '1px solid #e0e0e0'};
                               background:${sel ? '#f8f6ff' : 'white'};color:${sel ? '#5a3fa0' : '#666'};
                               font-weight:${sel ? '700' : '400'};">
                        <i class="fas ${f.icon}"></i> ${f.label}
                    </button>`;
        }).join('');

        const modos = [
            { key: 'ESTANDAR', label: 'Estándar', desc: 'Un solo texto para toda la publicación' },
            { key: 'SEGMENTADA', label: 'Segmentada', desc: 'Un párrafo de opinión por cada película' }
        ];
        const botonesModo = modos.map(m => {
            const sel = wf.rankingModoTexto === m.key;
            return `<div onclick="window.wfRankingSetModoTexto('${m.key}')"
                        style="flex:1;padding:0.6rem;border-radius:8px;cursor:pointer;text-align:center;
                               border:${sel ? '1.5px solid #7c3aed' : '1px solid #e0e0e0'};
                               background:${sel ? '#f8f6ff' : 'white'};">
                        <p style="margin:0;font-size:0.8rem;font-weight:700;color:${sel ? '#5a3fa0' : '#333'};">${m.label}</p>
                        <p style="margin:2px 0 0;font-size:0.68rem;color:#999;">${m.desc}</p>
                    </div>`;
        }).join('');

        return `<div style="margin-top:0.75rem;">
            <p style="font-size:0.75rem;color:#888;margin:0 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Películas del ranking (3 mín. a 10 máx):</p>
            <div style="display:flex;flex-direction:column;gap:10px;">${filas}</div>
            ${puedeAgregar ? `<button type="button" onclick="window.wfRankingAgregarItem()" style="margin-top:0.6rem;width:100%;padding:0.55rem;border:1.5px dashed #ccc;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.82rem;">+ Agregar película</button>` : ''}
            <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Formato de visualización:</p>
            <div style="display:flex;gap:6px;">${botonesFormato}</div>
            <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Modo de texto:</p>
            <div style="display:flex;gap:6px;">${botonesModo}</div>
        </div>`;
    }

    async function resolverExtra() {
        const wf = window.getWfState();
        if (!wf.rankingItems) return;
        const token = localStorage.getItem('token');
        for (let idx = 0; idx < wf.rankingItems.length; idx++) {
            const it = wf.rankingItems[idx];
            if (it.movieId && !it.posterUrl) {
                try {
                    const res = await fetch(`${window._comunidadApiUrl}/movies/${it.movieId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const m = await res.json();
                        if (m.poster_path) {
                            it.posterUrl = `https://image.tmdb.org/t/p/w92${m.poster_path}`;
                            const posterEl = document.getElementById(`wfRankingPoster-${idx}`);
                            if (posterEl) posterEl.innerHTML = `<img src="${it.posterUrl}" style="width:34px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0;">`;
                        }
                        if (!it.titulo) {
                            it.titulo = m.title;
                            const inputEl = document.querySelector(`#wfRankingPoster-${idx}`)?.parentElement?.querySelector('input');
                            if (inputEl) inputEl.value = it.titulo;
                        }
                    }
                } catch (e) {}
            }
        }
        // Sin re-render completo acá — eso era lo que causaba el loop infinito,
        // porque comunidad.js vuelve a llamar resolverExtra() después de cada
        // render. Los cambios de arriba ya patchean el DOM directamente.
    }

    window.wfRankingAgregarItem = function() {
        const wf = window.getWfState();
        if (!wf.rankingItems) wf.rankingItems = [];
        if (wf.rankingItems.length < 10) wf.rankingItems.push({ movieId: null, titulo: '', posterUrl: null, texto: '' });
        window.wfRerenderWorkflow();
    };

    window.wfRankingQuitarItem = function(idx) {
        const wf = window.getWfState();
        if (wf.rankingItems && wf.rankingItems.length > 3) {
            wf.rankingItems.splice(idx, 1);
            window.wfRerenderWorkflow();
        }
    };

    window.wfRankingCambiarTexto = function(idx, valor) {
            const wf = window.getWfState();
            if (wf.rankingItems && wf.rankingItems[idx]) wf.rankingItems[idx].texto = valor;
            window.wfActualizarBotonContinuar();
        };

    window.wfRankingSetFormato = function(formato) {
        const wf = window.getWfState();
        wf.rankingFormato = formato;
        window.wfRerenderWorkflow();
    };

    window.wfRankingSetModoTexto = function(modo) {
        const wf = window.getWfState();
        wf.rankingModoTexto = modo;
        window.wfRerenderWorkflow();
    };

    window.wfRankingBuscar = async function(idx, query) {
        const res = document.getElementById(`wfRankingResultados-${idx}`);
        if (!res) return;
        if (!query || query.length < 2) { res.innerHTML = ''; return; }
        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`${window._comunidadApiUrl}/movies/search?query=${encodeURIComponent(query)}&page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await r.json();
            const pelis = (data.results || []).slice(0, 5);
            res.innerHTML = pelis.map(p => {
                const poster = p.poster_path ? `https://image.tmdb.org/t/p/w92${p.poster_path}` : '';
                const anio = p.release_date ? p.release_date.slice(0, 4) : '';
                return `<div onclick="window.wfRankingElegir(${idx}, ${p.id}, '${(p.title||'').replace(/'/g,"\\'")}', '${poster}', '${anio}')"
                    style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:6px;"
                    onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">
                    ${poster ? `<img src="${poster}" style="width:24px;height:35px;object-fit:cover;border-radius:3px;">` : ''}
                    <span style="font-size:0.8rem;">${escapeHtml(p.title)}${anio ? ` <span style="color:#bbb;">(${anio})</span>` : ''}</span>
                </div>`;
            }).join('');
        } catch (e) {}
    };

    window.wfRankingElegir = function(idx, movieId, titulo, posterUrl, anio) {
        const wf = window.getWfState();
        if (wf.rankingItems && wf.rankingItems[idx]) {
            wf.rankingItems[idx].movieId = movieId;
            wf.rankingItems[idx].posterUrl = posterUrl;
            wf.rankingItems[idx].titulo = anio ? `${titulo} (${anio})` : titulo;
        }
        window.wfRerenderWorkflow();
    };

    // ============== RENDER EN EL FEED ==============

    function renderEnCard(pub) {
        return `<div class="com-card-ranking" id="ranking-${pub.id}" style="margin:0 1rem 10px;border:1px solid #eee;border-radius:10px;padding:12px;">
            <p style="font-size:0.8rem;color:#999;text-align:center;margin:0;"><i class="fas fa-spinner fa-spin"></i> Cargando ranking...</p>
        </div>`;
    }

    function renderLista(pubId, items, total, esSegmentada) {
                const filas = items.map(it => `
                                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                                        <span class="ranking-puesto-label" style="font-size:0.95rem;font-weight:700;color:${it.orden === 1 ? '#e50914' : '#999'};white-space:nowrap;">Puesto N°${it.orden}</span>
                                        ${!esSegmentada ? `<span class="ranking-puesto-label-mobile" style="font-size:0.82rem;font-weight:700;color:${it.orden === 1 ? '#e50914' : '#666'};white-space:nowrap;"><i class="fas fa-trophy"></i> N°${it.orden}</span>` : ''}
                                    <div id="rankingPoster-${pubId}-${it.orden}" class="${esSegmentada ? 'ranking-poster-segmentada' : ''}" style="width:${esSegmentada ? '' : '32px'};height:${esSegmentada ? '' : '46px'};background:#f0f0f0;border-radius:4px;flex-shrink:0;overflow:hidden;cursor:pointer;" onclick="window._abrirPeliculaDesdeModalPublicacion(${it.movieId})"></div>
                <div style="flex:1;min-width:0;">
                    ${esSegmentada ? `<span class="ranking-puesto-label-mobile-titulo" style="font-size:0.85rem;font-weight:700;color:${it.orden === 1 ? '#e50914' : '#666'};"><i class="fas fa-trophy"></i> N° - ${it.orden} </span>` : ''}
                    <span id="rankingTitulo-${pubId}-${it.orden}" style="font-size:0.85rem;font-weight:600;color:#1a1a1a;"></span>
                    ${it.texto ? `<p style="font-size:0.78rem;color:#666;margin:2px 0 0;line-height:1.4;">${escapeHtml(it.texto)}</p>` : ''}
                </div>
            </div>`).join('');
        return `<div>${filas}</div>`;
    }

    function renderCarrusel(pubId, items) {
        // Arranca en el último puesto y avanza hacia el #1, generando expectativa.
        const ordenDescendente = [...items].sort((a, b) => b.orden - a.orden);
        const slides = ordenDescendente.map((it, i) => `
            <div class="rankingSlide-${pubId}" data-slide-idx="${i}" style="display:${i === 0 ? 'block' : 'none'};text-align:center;">
                <div class="ranking-carrusel-visual">
                    <div class="ranking-carrusel-poster" id="rankingCarruselPoster-${pubId}-${it.orden}" style="aspect-ratio:2/3;max-width:180px;margin:0 auto;background:#f5f5f5;border-radius:10px;overflow:hidden;cursor:pointer;" onclick="window._abrirPeliculaDesdeModalPublicacion(${it.movieId})"></div>
                    <div class="ranking-carrusel-backdrop" id="rankingCarruselBackdrop-${pubId}-${it.orden}" onclick="window._abrirPeliculaDesdeModalPublicacion(${it.movieId})"></div>
                </div>
                <p style="font-size:0.95rem;font-weight:700;color:#e50914;margin:8px 0 0;">Puesto #${it.orden}</p>
                <p id="rankingCarruselTitulo-${pubId}-${it.orden}" style="font-size:0.85rem;font-weight:700;color:#1a1a1a;margin:2px 0 0;"></p>
                ${it.texto ? `<p style="font-size:0.78rem;color:#666;margin:6px 0 0;line-height:1.4;text-align:left;">${escapeHtml(it.texto)}</p>` : ''}
            </div>`).join('');

        const dots = ordenDescendente.map((_, i) => `<span data-dot-idx="${i}" style="width:${i === 0 ? '16px' : '6px'};height:6px;border-radius:3px;background:${i === 0 ? '#e50914' : '#ddd'};transition:all 0.2s;"></span>`).join('');

        return `<div class="ranking-carrusel-touch" id="rankingCarruselTouch-${pubId}">
                    ${slides}
                    <div class="ranking-carrusel-nav" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                        <span class="ranking-carrusel-flecha" onclick="window.rankingCarruselNav(${pubId}, -1)" style="cursor:pointer;color:#999;padding:4px 10px;"><i class="fas fa-chevron-left"></i></span>
                        <div style="display:flex;gap:5px;" id="rankingDots-${pubId}">${dots}</div>
                        <span class="ranking-carrusel-flecha" onclick="window.rankingCarruselNav(${pubId}, 1)" style="cursor:pointer;color:#999;padding:4px 10px;"><i class="fas fa-chevron-right"></i></span>
                    </div>
                </div>`;
            }

            function activarSwipeCarrusel(pubId) {
                const cont = document.getElementById(`rankingCarruselTouch-${pubId}`);
                if (!cont || cont._swipeActivado) return;
                cont._swipeActivado = true;
                let startX = 0;
                cont.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
                cont.addEventListener('touchend', (e) => {
                    const diff = e.changedTouches[0].clientX - startX;
                    if (Math.abs(diff) < 40) return; // umbral mínimo, evita disparar con toques chicos
                    window.rankingCarruselNav(pubId, diff < 0 ? 1 : -1);
                }, { passive: true });
            }

    window.rankingCarruselNav = function(pubId, dir) {
        const slides = document.querySelectorAll(`.rankingSlide-${pubId}`);
        const dots = document.querySelectorAll(`#rankingDots-${pubId} span`);
        if (!slides.length) return;
        let actual = 0;
        slides.forEach((s, i) => { if (s.style.display !== 'none') actual = i; });
        let nuevo = actual + dir;
        if (nuevo < 0) nuevo = slides.length - 1;
        if (nuevo >= slides.length) nuevo = 0;
        slides.forEach((s, i) => { s.style.display = (i === nuevo) ? 'block' : 'none'; });
        dots.forEach((d, i) => {
            d.style.width = (i === nuevo) ? '16px' : '6px';
            d.style.background = (i === nuevo) ? '#e50914' : '#ddd';
        });
    };

    async function resolverEnCard(pub) {
        const wrap = document.getElementById(`ranking-${pub.id}`);
        if (!wrap) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/publications/${pub.id}/ranking`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            const items = await res.json();
            if (!items.length) { wrap.innerHTML = ''; return; }

            wrap.innerHTML = pub.rankingFormato === 'CARRUSEL'
                            ? renderCarrusel(pub.id, items)
                            : renderLista(pub.id, items, items.length, pub.rankingModoTexto === 'SEGMENTADA');
                        if (pub.rankingFormato === 'CARRUSEL') activarSwipeCarrusel(pub.id);

                    for (const it of items) {
                try {
                    const r = await fetch(`${window._comunidadApiUrl}/movies/${it.movieId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!r.ok) continue;
                    const m = await r.json();
                    const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : '';
                    const posterListaEl = document.getElementById(`rankingPoster-${pub.id}-${it.orden}`);
                    if (posterListaEl && posterUrl) posterListaEl.innerHTML = `<img src="${posterUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                    const tituloListaEl = document.getElementById(`rankingTitulo-${pub.id}-${it.orden}`);
                    if (tituloListaEl) tituloListaEl.textContent = m.title || '';

                    // El poster del carrusel se ve mucho más grande en pantalla
                    // (hasta 180px) que el de la Lista (32px) — pedirle a TMDb
                    // la misma w92 lo estira y pixela. w342 alcanza de sobra.
                    const posterUrlGrande = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : '';
                    const posterCarruselEl = document.getElementById(`rankingCarruselPoster-${pub.id}-${it.orden}`);
                    if (posterCarruselEl && posterUrlGrande) posterCarruselEl.innerHTML = `<img src="${posterUrlGrande}" style="width:100%;height:100%;object-fit:cover;">`;

                    // Backdrop — solo se ve en desktop (CSS), rellena el espacio
                    // sobrante al lado del poster en vez de dejarlo vacío.
                    const backdropUrl = m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : '';
                    const backdropEl = document.getElementById(`rankingCarruselBackdrop-${pub.id}-${it.orden}`);
                    if (backdropEl && backdropUrl) backdropEl.innerHTML = `<img src="${backdropUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                    const tituloCarruselEl = document.getElementById(`rankingCarruselTitulo-${pub.id}-${it.orden}`);
                    if (tituloCarruselEl) {
                        const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                        tituloCarruselEl.textContent = anio ? `${m.title} (${anio})` : (m.title || '');
                    }
                } catch (e) {}
            }
        } catch (e) {
            wrap.innerHTML = `<p style="font-size:0.8rem;color:#bbb;text-align:center;margin:0;">No se pudo cargar el ranking</p>`;
        }
    }

    window.CreatorTools = window.CreatorTools || [];
    window.CreatorTools.push({
        key: 'RANKING',
        emoji: '🏆',
        label: 'Ranking',
        desc: 'Tu top 3 a 10 películas',
        disponible: true,
        bloqueaImagenVideo: true,
        activoPara: (pub) => !!(pub.movieId && pub.rankingEnabled),
        onSeleccionar: (_wf, activo) => {
            _wf.rankingEnabled = activo;
            if (activo) {
                if (!_wf.rankingItems || _wf.rankingItems.length === 0) {
                    _wf.rankingItems = _wf.movieId
                        ? [{ movieId: _wf.movieId, titulo: _wf.movieTitulo || '', posterUrl: null, texto: '' }]
                        : [{ movieId: null, titulo: '', posterUrl: null, texto: '' }];
                }
                if (!_wf.rankingFormato) _wf.rankingFormato = 'LISTA';
                if (!_wf.rankingModoTexto) _wf.rankingModoTexto = 'ESTANDAR';
            } else {
                _wf.rankingItems = null;
                _wf.rankingFormato = null;
                _wf.rankingModoTexto = null;
            }
        },
        puedeAvanzar: (_wf) => {
            const validos = (_wf.rankingItems || []).filter(i => i.movieId);
            if (validos.length < 3 || validos.length > 10) return false;
            if (_wf.rankingModoTexto === 'SEGMENTADA') {
                return validos.every(i => i.texto && i.texto.trim().length >= 10);
            }
            return true;
        },
        ocultaContenidoGeneral: (_wf) => _wf.rankingModoTexto === 'SEGMENTADA',
        renderEnCard: renderEnCard,
        resolverEnCard: (pub) => resolverEnCard(pub),
        renderExtra: renderExtra,
        resolverExtra: resolverExtra
    });
})();