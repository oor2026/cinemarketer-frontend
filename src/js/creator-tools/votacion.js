(function() {
    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    const MAX_DURACION_MINUTOS = 3 * 30 * 24 * 60; // 3 meses (30 días cada uno)
    const MINUTOS_POR_UNIDAD = { MINUTOS: 1, HORAS: 60, DIAS: 1440, SEMANAS: 10080, MESES: 43200 };

    // ============== MENÚ DEL WORKFLOW (Paso 4) ==============

    function renderFila(op, idx) {
        const tieneMovie = !!op.movieId;
        const bloqueada = !!op.bloqueada;

        const poster = op.posterUrl
            ? `<img ${bloqueada ? '' : `onclick="window.wfVotacionQuitarPelicula(${idx})" title="Quitar película vinculada"`} src="${op.posterUrl}" style="width:34px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0;${bloqueada ? '' : 'cursor:pointer;'}">`
            : tieneMovie
            ? `<div style="width:34px;height:50px;background:#f0f0f0;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-spinner fa-spin" style="font-size:0.7rem;color:#ccc;"></i></div>`
            : `<div style="width:34px;height:50px;background:#f8f6ff;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-film" style="font-size:0.75rem;color:#d8cff5;"></i></div>`;

        return `<div>
            <div style="display:flex;align-items:center;gap:8px;">
                <div id="wfVotacionPoster-${idx}">${poster}</div>
                <input type="text" value="${(op.texto || '').replace(/"/g,'&quot;')}"
                       placeholder="${tieneMovie ? `Opción ${idx + 1}...` : `Opción ${idx + 1}... (podés buscar una película)`}" maxlength="80"
                       ${bloqueada ? 'readonly' : `oninput="window.wfVotacionInputCambio(${idx}, this.value)"`}
                       style="flex:1;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;
                              ${bloqueada ? 'background:#f5f5f5;color:#888;' : ''}">
                <span onclick="window.wfVotacionQuitarOpcion(${idx})" style="cursor:pointer;color:#ccc;font-size:1rem;padding:0 4px;">×</span>
            </div>
            ${bloqueada ? '' : `<div id="wfVotacionResultados-${idx}" style="margin:4px 0 0 42px;"></div>`}
        </div>`;
    }

    function renderExtra() {
            const wf = window.getWfState();
            if (!wf.votacionOpciones || wf.votacionOpciones.length === 0) {
                    wf.votacionOpciones = wf.movieId
                        ? [{ texto: wf.movieTitulo || '', movieId: wf.movieId, posterUrl: null, bloqueada: false },
                           { texto: '', movieId: null, posterUrl: null, bloqueada: false }]
                        : [{ texto: '', movieId: null, posterUrl: null, bloqueada: false },
                           { texto: '', movieId: null, posterUrl: null, bloqueada: false }];
                }
                if (!wf.votacionDuracionValor) wf.votacionDuracionValor = 3;
                if (!wf.votacionDuracionUnidad) wf.votacionDuracionUnidad = 'DIAS';
                window.wfVotacionRecalcularMinutos();

                const filas = wf.votacionOpciones.map((op, idx) => renderFila(op, idx)).join('');
                const puedeAgregar = wf.votacionOpciones.length < 5;

                const unidades = [
                    { key: 'MINUTOS', label: 'Minutos' },
                    { key: 'HORAS', label: 'Horas' },
                    { key: 'DIAS', label: 'Días' },
                    { key: 'SEMANAS', label: 'Semanas' },
                    { key: 'MESES', label: 'Meses' }
                ];

                const excedeTope = wf.votacionDuracionMinutos > MAX_DURACION_MINUTOS;

                return `<div style="margin-top:0.75rem;">
                    <p style="font-size:0.75rem;color:#888;margin:0 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Opciones de la votación (2 Mín. a 5 Máx):</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">${filas}</div>
                    ${puedeAgregar ? `<button type="button" onclick="window.wfVotacionAgregarOpcion()" style="margin-top:0.6rem;width:100%;padding:0.55rem;border:1.5px dashed #ccc;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.82rem;">+ Agregar opción</button>` : ''}
                    <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">¿Cuánto dura abierta? (máximo 3 meses)</p>
                    <div style="display:flex;gap:6px;">
                        <input type="number" min="1" step="1" value="${wf.votacionDuracionValor}"
                               oninput="window.wfVotacionCambiarDuracionValor(this.value)"
                               style="width:80px;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                        <select onchange="window.wfVotacionCambiarDuracionUnidad(this.value)"
                                style="flex:1;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                            ${unidades.map(u => `<option value="${u.key}" ${wf.votacionDuracionUnidad === u.key ? 'selected' : ''}>${u.label}</option>`).join('')}
                        </select>
                    </div>
                    ${excedeTope ? `<p style="font-size:0.75rem;color:#e50914;margin:0.5rem 0 0;">Superaste el máximo permitido de 3 meses.</p>` : ''}
                </div>`;
            }

            window.wfVotacionRecalcularMinutos = function() {
                const wf = window.getWfState();
                const valor = parseInt(wf.votacionDuracionValor, 10) || 0;
                const factor = MINUTOS_POR_UNIDAD[wf.votacionDuracionUnidad] || 1;
                wf.votacionDuracionMinutos = valor * factor;
            };

            window.wfVotacionCambiarDuracionValor = function(valor) {
                const wf = window.getWfState();
                wf.votacionDuracionValor = valor;
                window.wfVotacionRecalcularMinutos();
                window.wfRerenderWorkflow();
            };

            window.wfVotacionCambiarDuracionUnidad = function(unidad) {
                const wf = window.getWfState();
                wf.votacionDuracionUnidad = unidad;
                window.wfVotacionRecalcularMinutos();
                window.wfRerenderWorkflow();
            };

    async function resolverExtra() {
        const wf = window.getWfState();
        if (!wf.votacionOpciones) return;
        const token = localStorage.getItem('token');
        for (let idx = 0; idx < wf.votacionOpciones.length; idx++) {
            const op = wf.votacionOpciones[idx];
            if (op.movieId && !op.posterUrl) {
                try {
                    const res = await fetch(`${window._comunidadApiUrl}/movies/${op.movieId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const m = await res.json();
                        if (m.poster_path) {
                            op.posterUrl = `https://image.tmdb.org/t/p/w92${m.poster_path}`;
                            const el = document.getElementById(`wfVotacionPoster-${idx}`);
                            if (el) el.innerHTML = `<img src="${op.posterUrl}" style="width:34px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0;">`;
                        }
                        // Sumar el año — solo si el texto sigue siendo el título
                        // "pelado" (nadie lo editó a mano todavía).
                        const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                        if (anio && op.texto === m.title) {
                            op.texto = `${m.title} (${anio})`;
                            const inputEl = document.getElementById(`wfVotacionPoster-${idx}`)?.closest('div')?.parentElement?.querySelector('input');
                            if (inputEl) inputEl.value = op.texto;
                        }
                    }
                } catch (e) {}
            }
        }
    }

    window.wfVotacionInputCambio = function(idx, valor) {
        const wf = window.getWfState();
        if (!wf.votacionOpciones || !wf.votacionOpciones[idx] || wf.votacionOpciones[idx].bloqueada) return;
        wf.votacionOpciones[idx].texto = valor;

        // Si ya tiene una película vinculada, este campo pasó a ser solo el
        // texto de la opción — no vuelve a buscar hasta que se desvincule.
        if (wf.votacionOpciones[idx].movieId) return;
        window.wfVotacionBuscarPelicula(idx, valor);
    };

        window.wfVotacionQuitarPelicula = function(idx) {
            const wf = window.getWfState();
            if (wf.votacionOpciones && wf.votacionOpciones[idx]) {
                wf.votacionOpciones[idx].movieId = null;
                wf.votacionOpciones[idx].posterUrl = null;
            }
            window.wfRerenderWorkflow();
        };

    window.wfVotacionAgregarOpcion = function() {
            const wf = window.getWfState();
            if (!wf.votacionOpciones) wf.votacionOpciones = [];
            if (wf.votacionOpciones.length < 5) {
                wf.votacionOpciones.push({ texto: '', movieId: null, posterUrl: null, bloqueada: false });
            }
            window.wfRerenderWorkflow();
        };

    window.wfVotacionQuitarOpcion = function(idx) {
        const wf = window.getWfState();
        if (wf.votacionOpciones && wf.votacionOpciones.length > 2) {
            wf.votacionOpciones.splice(idx, 1);
            window.wfRerenderWorkflow();
        }
    };

    window.wfVotacionBuscarPelicula = async function(idx, query) {
        const res = document.getElementById(`wfVotacionResultados-${idx}`);
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
                return `<div onclick="window.wfVotacionElegirPelicula(${idx}, ${p.id}, '${(p.title||'').replace(/'/g,"\\'")}', '${poster}', '${anio}')"
                    style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:6px;"
                    onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">
                    ${poster ? `<img src="${poster}" style="width:24px;height:35px;object-fit:cover;border-radius:3px;">` : ''}
                    <span style="font-size:0.8rem;">${escapeHtml(p.title)}${anio ? ` <span style="color:#bbb;">(${anio})</span>` : ''}</span>
                </div>`;
            }).join('');
        } catch (e) {}
    };

    window.wfVotacionElegirPelicula = function(idx, movieId, titulo, posterUrl, anio) {
            const wf = window.getWfState();
            if (wf.votacionOpciones && wf.votacionOpciones[idx]) {
                wf.votacionOpciones[idx].movieId = movieId;
                wf.votacionOpciones[idx].posterUrl = posterUrl;
                // Al elegir la película, el campo pasa a mostrar su título —
                // pisa lo que se haya tipeado para buscarla.
                wf.votacionOpciones[idx].texto = anio ? `${titulo} (${anio})` : titulo;
                // Se congela al toque — el único cambio posible desde acá es
                // sacarla con la × y volver a cargarla desde cero.
                wf.votacionOpciones[idx].bloqueada = true;
            }
            window.wfRerenderWorkflow();
        };

    // ============== RENDER EN EL FEED ==============

    function renderEnCard(pub) {
        return `<div class="com-card-votacion" id="votacion-${pub.id}" style="margin:0 1rem 10px;border:1px solid #eee;border-radius:10px;padding:12px;">
            <p style="font-size:0.8rem;color:#999;text-align:center;margin:0;"><i class="fas fa-spinner fa-spin"></i> Cargando votación...</p>
        </div>`;
    }

    function formatearRestante(cierreEnStr) {
            if (!cierreEnStr) return null;
            const diff = new Date(cierreEnStr).getTime() - Date.now();
            if (diff <= 0) return null;
            const dias = Math.floor(diff / 86400000);
            const horas = Math.floor((diff % 86400000) / 3600000);
            if (dias > 0) return `Cierra en ${dias}d ${horas}h`;
            const min = Math.floor((diff % 3600000) / 60000);
            return `Cierra en ${horas}h ${min}m`;
        }

        function iniciarHourglass(elId) {
            const el = document.getElementById(elId);
            if (!el) return;
            const estados = ['fa-hourglass-start', 'fa-hourglass-half', 'fa-hourglass-end'];
            let i = 0;
            if (el._hgInterval) clearInterval(el._hgInterval);
            el._hgInterval = setInterval(() => {
                i = (i + 1) % estados.length;
                el.className = `fas ${estados[i]}`;
            }, 700);
        }

        function pintarVotacion(pubId, data) {
            const wrap = document.getElementById(`votacion-${pubId}`);
            if (!wrap) return;
            // Cerrada, o ya votó: en ambos casos se ven los resultados sin
            // poder tocar nada — la única diferencia es el texto de abajo.
            const mostrarResultados = data.yaVoto || data.cerrada;

            const filas = data.opciones.map(op => {
                const poster = op.movieId
                    ? `<div style="width:38px;height:54px;background:#f0f0f0;border-radius:4px;flex-shrink:0;overflow:hidden;" id="votacionPoster-${pubId}-${op.id}"></div>`
                    : '';
                if (mostrarResultados) {
                    const elegida = op.id === data.opcionElegidaId;
                    return `<div style="position:relative;border-radius:8px;overflow:hidden;background:#f5f5f5;margin-bottom:6px;">
                        <div style="position:absolute;inset:0;width:${op.porcentaje}%;background:#f8d7d7;"></div>
                        <div style="position:relative;display:flex;align-items:center;gap:10px;padding:8px 10px;">
                            ${poster}
                            <span style="flex:1;font-size:0.95rem;font-weight:700;color:#1a1a1a;">${escapeHtml(op.texto)}${elegida ? ' ✓' : ''}</span>
                            <span style="font-size:0.95rem;color:#1a1a1a;font-weight:700;">${op.porcentaje}%</span>
                        </div>
                    </div>`;
                }
                return `<div onclick="window.votarOpcionVotacion(${pubId}, ${op.id})"
                             style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;margin-bottom:6px;">
                    ${poster}
                    <span style="flex:1;font-size:0.95rem;font-weight:700;color:#1a1a1a;">${escapeHtml(op.texto)}</span>
                </div>`;
            }).join('');

            let pie;
            if (data.cerrada) {
                pie = `<p style="font-size:0.72rem;color:#bbb;margin:4px 0 0;">${data.totalVotos} voto${data.totalVotos === 1 ? '' : 's'} · Votación cerrada</p>`;
            } else if (data.yaVoto) {
                const restante = formatearRestante(data.cierreEn);
                pie = `<p style="font-size:0.72rem;color:#bbb;margin:6px 0 0;display:flex;align-items:center;gap:6px;">
                    ${data.totalVotos} voto${data.totalVotos === 1 ? '' : 's'} · Ya votaste
                    ${restante ? `<span id="votacionHourglass-${pubId}" style="display:inline-flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:600;color:#888;">· <i class="fas fa-hourglass-start" style="font-size:1rem;"></i> ${restante}</span>` : ''}
                </p>`;
            } else {
                const restante = formatearRestante(data.cierreEn);
                pie = restante ? `<p style="font-size:0.72rem;color:#bbb;margin:6px 0 0;display:flex;align-items:center;gap:6px;">
                    <span id="votacionHourglass-${pubId}" style="display:inline-flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:600;color:#888;"><i class="fas fa-hourglass-start" style="font-size:1rem;"></i> ${restante}</span>
                </p>` : '';
            }

            wrap.innerHTML = `<div>${filas}</div>${pie}`;

            if (!data.cerrada) {
                const hgIcon = document.querySelector(`#votacionHourglass-${pubId} .fas`);
                if (hgIcon) iniciarHourglass(hgIcon.id || (hgIcon.id = `votacionHgIcon-${pubId}`));
            }

            data.opciones.forEach(op => {
                if (op.movieId) resolverPosterOpcion(pubId, op.id, op.movieId);
            });
        }

    async function resolverPosterOpcion(pubId, opcionId, movieId) {
        const el = document.getElementById(`votacionPoster-${pubId}-${opcionId}`);
        if (!el) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/movies/${movieId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const m = await res.json();
                if (m.poster_path) el.innerHTML = `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:100%;height:100%;object-fit:cover;">`;
            }
        } catch (e) {}
    }

    async function resolverEnCard(pub) {
        const wrap = document.getElementById(`votacion-${pub.id}`);
        if (!wrap) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/publications/${pub.id}/votacion`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            pintarVotacion(pub.id, data);
        } catch (e) {
            wrap.innerHTML = `<p style="font-size:0.8rem;color:#bbb;text-align:center;margin:0;">No se pudo cargar la votación</p>`;
        }
    }

    window.votarOpcionVotacion = async function(pubId, opcionId) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/votar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ opcionId })
            });
            const data = await res.json();
            if (!res.ok) {
                if (window.mostrarToast) window.mostrarToast(data.error || 'No se pudo votar.', 'error');
                return;
            }
            pintarVotacion(pubId, data);
        } catch (e) {
            if (window.mostrarToast) window.mostrarToast('Error al votar.', 'error');
        }
    };

    window.CreatorTools = window.CreatorTools || [];
    window.CreatorTools.push({
        key: 'VOTACION',
        emoji: '🗳️',
        label: 'Votación',
        desc: 'Encuesta con hasta 5 opciones',
        disponible: true,
        bloqueaImagenVideo: true,
        activoPara: (pub) => !!(pub.movieId && pub.votacionEnabled),
        onSeleccionar: (_wf, activo) => {
            _wf.votacionEnabled = activo;
            if (activo) {
                if (!_wf.votacionOpciones || _wf.votacionOpciones.length === 0) {
                        _wf.votacionOpciones = _wf.movieId
                            ? [{ texto: _wf.movieTitulo || '', movieId: _wf.movieId, posterUrl: null, bloqueada: false },
                               { texto: '', movieId: null, posterUrl: null, bloqueada: false }]
                            : [{ texto: '', movieId: null, posterUrl: null, bloqueada: false },
                               { texto: '', movieId: null, posterUrl: null, bloqueada: false }];
                    }
                if (!_wf.votacionDuracionValor) _wf.votacionDuracionValor = 3;
                        if (!_wf.votacionDuracionUnidad) _wf.votacionDuracionUnidad = 'DIAS';
                        _wf.votacionDuracionMinutos = (parseInt(_wf.votacionDuracionValor, 10) || 0) * (MINUTOS_POR_UNIDAD[_wf.votacionDuracionUnidad] || 1);
                    } else {
                        _wf.votacionOpciones = null;
                        _wf.votacionDuracionValor = null;
                        _wf.votacionDuracionUnidad = null;
                        _wf.votacionDuracionMinutos = null;
                    }
                },
                puedeAvanzar: (_wf) => {
                    const validas = (_wf.votacionOpciones || []).filter(o => o.texto && o.texto.trim().length > 0);
                    const opcionesOk = validas.length >= 2 && validas.length <= 5;
                    const duracionOk = _wf.votacionDuracionMinutos > 0 && _wf.votacionDuracionMinutos <= MAX_DURACION_MINUTOS;
                    return opcionesOk && duracionOk;
                },
        renderEnCard: renderEnCard,
        resolverEnCard: (pub) => resolverEnCard(pub),
        renderExtra: renderExtra,
        resolverExtra: resolverExtra
    });
})();