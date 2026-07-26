(function() {
    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    const IDIOMAS_A_BUSCAR = [
        { code: 'es-MX', label: 'Español' },
        { code: 'en-US', label: 'Inglés' }
    ];

    // ============== BÚSQUEDA DEL TRÁILER ==============

    async function obtenerTrailers(movieId, language) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/movies/${movieId}/videos?language=${language}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return [];
            const data = await res.json();
            return (data.results || []).filter(v => v.site === 'YouTube' && v.type === 'Trailer');
        } catch (e) {
            return [];
        }
    }

    async function buscarTrailer(wf) {
        wf.trailerBuscando = true;
        wf.trailerNoEncontrado = false;
        window.wfRerenderWorkflow();

        const encontrados = [];
        for (const idioma of IDIOMAS_A_BUSCAR) {
            const resultados = await obtenerTrailers(wf.movieId, idioma.code);
            for (const v of resultados) {
                if (encontrados.some(e => e.key === v.key)) continue; // mismo video ya sumado en otro idioma
                encontrados.push({ key: v.key, name: v.name, idiomaLabel: idioma.label, official: v.official === true });
            }
        }

        wf.trailerBuscando = false;
        if (encontrados.length === 0) {
            wf.trailerYoutubeKey = null;
            wf.trailerVideoNombre = null;
            wf.trailerOpciones = null;
            wf.trailerNoEncontrado = true;
        } else {
            wf.trailerOpciones = encontrados;
            const elegido = encontrados.find(e => e.official) || encontrados[0];
            wf.trailerYoutubeKey = elegido.key;
            wf.trailerVideoNombre = elegido.name;
        }
        window.wfRerenderWorkflow();
    }

    window.wfTrailerElegirOpcion = function(youtubeKey) {
        const wf = window.getWfState();
        const opcion = (wf.trailerOpciones || []).find(o => o.key === youtubeKey);
        if (!opcion) return;
        wf.trailerYoutubeKey = opcion.key;
        wf.trailerVideoNombre = opcion.name;
        window.wfRerenderWorkflow();
    };

    // ============== MENÚ DEL WORKFLOW (Paso 4) ==============

    function renderExtra() {
        const wf = window.getWfState();

        if (wf.trailerBuscando) {
            return `<div style="margin-top:0.75rem;text-align:center;padding:1rem;">
                <i class="fas fa-spinner fa-spin" style="color:#ccc;"></i>
                <p style="font-size:0.8rem;color:#888;margin:0.5rem 0 0;">Buscando tráiler oficial...</p>
            </div>`;
        }

        if (wf.trailerNoEncontrado) {
            return `<div style="margin-top:0.75rem;padding:0.85rem;background:#fbe4e4;border:1px solid #eeb3b3;border-radius:8px;">
                <p style="font-size:0.82rem;color:#c0392b;margin:0;">No encontramos un tráiler para esta película.</p>
            </div>`;
        }

        if (!wf.trailerYoutubeKey) return '';

        const hayVarias = wf.trailerOpciones && wf.trailerOpciones.length > 1;
        const selectorHtml = hayVarias ? `
            <div style="margin-top:0.75rem;">
                <p style="font-size:0.75rem;color:#888;margin:0 0 0.4rem;text-transform:uppercase;letter-spacing:0.5px;">Versión del tráiler:</p>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${wf.trailerOpciones.map(o => `
                        <div onclick="window.wfTrailerElegirOpcion('${o.key}')"
                             style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;
                                    border:1.5px solid ${o.key === wf.trailerYoutubeKey ? '#7c5cff' : '#e0e0e0'};
                                    background:${o.key === wf.trailerYoutubeKey ? '#f8f6ff' : '#fff'};">
                            <div style="width:16px;height:16px;border-radius:50%;border:2px solid ${o.key === wf.trailerYoutubeKey ? '#7c5cff' : '#ccc'};
                                        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                ${o.key === wf.trailerYoutubeKey ? '<div style="width:8px;height:8px;border-radius:50%;background:#7c5cff;"></div>' : ''}
                            </div>
                            <span style="font-size:0.82rem;color:#1a1a1a;">${o.idiomaLabel}${o.official ? ' · Oficial' : ''} — ${escapeHtml(o.name)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : '';

            return `<div style="margin-top:0.75rem;">
                <div id="trailerPreviewWf" style="position:relative;border-radius:8px;overflow:hidden;cursor:pointer;" onclick="window.wfTrailerReproducirPreview()">
                    <img src="https://img.youtube.com/vi/${wf.trailerYoutubeKey}/hqdefault.jpg" style="width:100%;display:block;">
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);">
                        <i class="fas fa-play-circle" style="font-size:2.2rem;color:#fff;"></i>
                    </div>
                </div>
                <p style="font-size:0.78rem;color:#2e9e5b;font-weight:600;margin:0.5rem 0 0;"><i class="fas fa-check"></i> Tráiler encontrado${wf.trailerVideoNombre ? `: ${escapeHtml(wf.trailerVideoNombre)}` : ''}</p>
                ${selectorHtml}
            </div>`;
        }

        window.wfTrailerReproducirPreview = function() {
            const wf = window.getWfState();
            const wrap = document.getElementById('trailerPreviewWf');
            if (!wrap || !wf.trailerYoutubeKey) return;
            wrap.outerHTML = `<div id="trailerPreviewWf" style="border-radius:8px;overflow:hidden;position:relative;padding-top:56.25%;">
                <iframe src="https://www.youtube.com/embed/${wf.trailerYoutubeKey}?autoplay=1"
                        style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                        allow="autoplay; encrypted-media" allowfullscreen></iframe>
            </div>`;
        };

    // ============== RENDER EN EL FEED ==============

    function renderEnCard(pub) {
        if (!pub.trailerYoutubeKey) return '';
        return `<div class="com-card-trailer" id="trailer-${pub.id}"
                     style="margin:0 1rem 10px;border-radius:10px;overflow:hidden;position:relative;cursor:pointer;"
                     onclick="window.wfTrailerReproducir(${pub.id}, '${pub.trailerYoutubeKey}')">
            <img src="https://img.youtube.com/vi/${pub.trailerYoutubeKey}/hqdefault.jpg" style="width:100%;display:block;">
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);">
                <i class="fas fa-play-circle" style="font-size:3rem;color:#fff;"></i>
            </div>
        </div>`;
    }

    window.wfTrailerReproducir = function(pubId, youtubeKey) {
        const wrap = document.getElementById(`trailer-${pubId}`);
        if (!wrap) return;
        wrap.outerHTML = `<div style="margin:0 1rem 10px;border-radius:10px;overflow:hidden;position:relative;padding-top:56.25%;">
            <iframe src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                    allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>`;
    };

    // ============== REGISTRO DEL PLUGIN ==============

    window.CreatorTools = window.CreatorTools || [];
    window.CreatorTools.push({
        key: 'TRAILER',
        emoji: '🎬',
        label: 'Tráiler',
        desc: 'Tráiler oficial de la película',
        disponible: true,
        bloqueaImagenVideo: true,
        activoPara: (pub) => !!(pub.movieId && pub.trailerEnabled),
        onSeleccionar: (_wf, activo) => {
            _wf.trailerEnabled = activo;
            if (activo) {
                if (!_wf.trailerYoutubeKey && !_wf.trailerBuscando && !_wf.trailerNoEncontrado) {
                    buscarTrailer(_wf);
                }
            } else {
                _wf.trailerYoutubeKey = null;
                _wf.trailerVideoNombre = null;
                _wf.trailerOpciones = null;
                _wf.trailerBuscando = false;
                _wf.trailerNoEncontrado = false;
            }
        },

        puedeAvanzar: (_wf) => !!_wf.trailerYoutubeKey,
        renderEnCard: renderEnCard,
        renderExtra: renderExtra,
        muestraPeliculaVinculada: true
    });
})();