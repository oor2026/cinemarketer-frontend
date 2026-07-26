(function() {
    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    const MAX_DURACION_MINUTOS = 3 * 30 * 24 * 60; // 3 meses
    const MINUTOS_POR_UNIDAD = { MINUTOS: 1, HORAS: 60, DIAS: 1440, SEMANAS: 10080, MESES: 43200 };

    // ============== MENÚ DEL WORKFLOW (Paso 4) ==============

    function renderExtra() {
        const wf = window.getWfState();
        if (!wf.triviaOpciones || wf.triviaOpciones.length === 0) {
            wf.triviaOpciones = [{ texto: '', esCorrecta: false }, { texto: '', esCorrecta: false }];
        }
        if (!wf.triviaTipo) wf.triviaTipo = 'LIBRE';
        if (!wf.triviaDuracionValor) wf.triviaDuracionValor = 3;
        if (!wf.triviaDuracionUnidad) wf.triviaDuracionUnidad = 'DIAS';
        window.wfTriviaRecalcularMinutos();

        const tipoBotones = ['LIBRE', 'REFERENCIA'].map(t => {
            const sel = wf.triviaTipo === t;
            const label = t === 'LIBRE' ? 'Libre' : 'Con referencia';
            return `<button type="button" onclick="window.wfTriviaSetTipo('${t}')"
                        style="flex:1;padding:0.55rem;border-radius:8px;font-size:0.82rem;cursor:pointer;
                               border:${sel ? '1.5px solid #7c3aed' : '1px solid #e0e0e0'};
                               background:${sel ? '#f8f6ff' : 'white'};color:${sel ? '#5a3fa0' : '#666'};
                               font-weight:${sel ? '700' : '400'};">${label}</button>`;
        }).join('');

        let referenciaHtml = '';
        if (wf.triviaTipo === 'REFERENCIA') {
            const tipos = [{ key: 'PELICULA', label: 'Película' }, { key: 'PERSONA', label: 'Actor/Director' }];
            const tipoRefBotones = tipos.map(t => {
                const sel = wf.triviaReferenciaTipo === t.key;
                return `<button type="button" onclick="window.wfTriviaSetReferenciaTipo('${t.key}')"
                            style="flex:1;padding:0.5rem;border-radius:8px;font-size:0.8rem;cursor:pointer;
                                   border:${sel ? '1.5px solid #7c3aed' : '1px solid #e0e0e0'};
                                   background:${sel ? '#f8f6ff' : 'white'};color:${sel ? '#5a3fa0' : '#666'};
                                   font-weight:${sel ? '700' : '400'};">${t.label}</button>`;
            }).join('');

            const referenciaSeleccionada = wf.triviaReferenciaId ? `
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 10px;background:#f8f6ff;border-radius:8px;">
                    ${wf.triviaReferenciaImagen ? `<img src="${wf.triviaReferenciaImagen}" style="width:28px;height:${wf.triviaReferenciaTipo === 'PELICULA' ? '40' : '28'}px;object-fit:cover;border-radius:${wf.triviaReferenciaTipo === 'PELICULA' ? '4' : '50'}px;">` : ''}
                    <span style="flex:1;font-size:0.82rem;color:#333;">${escapeHtml(wf.triviaReferenciaLabel || '')}</span>
                    <span onclick="window.wfTriviaQuitarReferencia()" style="cursor:pointer;color:#ccc;">×</span>
                </div>` : (wf.triviaReferenciaTipo ? `
                <input type="text" placeholder="Buscar ${wf.triviaReferenciaTipo === 'PERSONA' ? 'actor, actriz o director...' : 'película...'}"
                       oninput="window.wfTriviaBuscarReferencia(this.value)"
                       style="width:100%;box-sizing:border-box;margin-top:8px;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                <div id="wfTriviaResultadosReferencia" style="margin-top:4px;"></div>` : '');

            referenciaHtml = `
                <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">¿Sobre qué es la referencia?</p>
                <div style="display:flex;gap:6px;">${tipoRefBotones}</div>
                ${referenciaSeleccionada}`;
        }

        const opcionesHtml = wf.triviaOpciones.map((op, idx) => `
            <div style="display:flex;align-items:center;gap:8px;">
                <span onclick="window.wfTriviaMarcarCorrecta(${idx})" title="Marcar como correcta"
                      style="cursor:pointer;width:20px;height:20px;border-radius:50%;flex-shrink:0;
                             border:2px solid ${op.esCorrecta ? '#2e9e5b' : '#ccc'};background:${op.esCorrecta ? '#2e9e5b' : 'white'};
                             display:flex;align-items:center;justify-content:center;">
                    ${op.esCorrecta ? '<i class="fas fa-check" style="color:white;font-size:0.6rem;"></i>' : ''}
                </span>
                <input type="text" value="${(op.texto || '').replace(/"/g,'&quot;')}" placeholder="Opción ${idx + 1}..." maxlength="150"
                       oninput="window.wfTriviaCambiarTexto(${idx}, this.value)"
                       style="flex:1;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                <span onclick="window.wfTriviaQuitarOpcion(${idx})" style="cursor:pointer;color:#ccc;font-size:1rem;padding:0 4px;">×</span>
            </div>`).join('');
        const puedeAgregar = wf.triviaOpciones.length < 5;

        const duraciones = [
            { key: 'MINUTOS', label: 'Minutos' }, { key: 'HORAS', label: 'Horas' },
            { key: 'DIAS', label: 'Días' }, { key: 'SEMANAS', label: 'Semanas' }, { key: 'MESES', label: 'Meses' }
        ];
        const excedeTope = wf.triviaDuracionMinutos > MAX_DURACION_MINUTOS;

        return `<div style="margin-top:0.75rem;">
                    <p style="font-size:0.75rem;color:#888;margin:0 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Pregunta:</p>
                    <input type="text" value="${(wf.title || '').replace(/"/g,'&quot;')}" placeholder="Insertá la pregunta libre aquí..." maxlength="150"
                           oninput="window.wfTriviaCambiarPregunta(this.value)"
                           style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                    <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Tipo de trivia:</p>
                    <div style="display:flex;gap:6px;">${tipoBotones}</div>
                    ${referenciaHtml}
                    <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">Opciones (2 mín. a 5 máx) — tocá el círculo para marcar la correcta:</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">${opcionesHtml}</div>
                    ${puedeAgregar ? `<button type="button" onclick="window.wfTriviaAgregarOpcion()" style="margin-top:0.6rem;width:100%;padding:0.55rem;border:1.5px dashed #ccc;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.82rem;">+ Agregar opción</button>` : ''}
                    <p style="font-size:0.75rem;color:#888;margin:1rem 0 0.5rem;text-transform:uppercase;letter-spacing:0.5px;">¿Cuánto dura abierta? (máximo 3 meses)</p>
            <div style="display:flex;gap:6px;">
                <input type="number" min="1" step="1" value="${wf.triviaDuracionValor}"
                       oninput="window.wfTriviaCambiarDuracionValor(this.value)"
                       style="width:80px;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                <select onchange="window.wfTriviaCambiarDuracionUnidad(this.value)"
                        style="flex:1;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;font-family:inherit;">
                    ${duraciones.map(u => `<option value="${u.key}" ${wf.triviaDuracionUnidad === u.key ? 'selected' : ''}>${u.label}</option>`).join('')}
                </select>
            </div>
            <p id="wfTriviaExcedeTope" style="font-size:0.75rem;color:#e50914;margin:0.5rem 0 0;display:${excedeTope ? 'block' : 'none'};">Superaste el máximo permitido de 3 meses.</p>
        </div>`;
    }

    window.wfTriviaRecalcularMinutos = function() {
        const wf = window.getWfState();
        const valor = parseInt(wf.triviaDuracionValor, 10) || 0;
        const factor = MINUTOS_POR_UNIDAD[wf.triviaDuracionUnidad] || 1;
        wf.triviaDuracionMinutos = valor * factor;
    };

    window.wfTriviaCambiarPregunta = function(valor) {
            const wf = window.getWfState();
            wf.title = valor;
            if (window.wfActualizarBotonContinuar) window.wfActualizarBotonContinuar();
        };

        window.wfTriviaCambiarDuracionValor = function(valor) {
        const wf = window.getWfState();
        wf.triviaDuracionValor = valor;
        window.wfTriviaRecalcularMinutos();
        const aviso = document.getElementById('wfTriviaExcedeTope');
        if (aviso) aviso.style.display = (wf.triviaDuracionMinutos > MAX_DURACION_MINUTOS) ? 'block' : 'none';
        if (window.wfActualizarBotonContinuar) window.wfActualizarBotonContinuar();
    };

    window.wfTriviaCambiarDuracionUnidad = function(unidad) {
        const wf = window.getWfState();
        wf.triviaDuracionUnidad = unidad;
        window.wfTriviaRecalcularMinutos();
        window.wfRerenderWorkflow();
    };

    window.wfTriviaSetTipo = function(tipo) {
        const wf = window.getWfState();
        wf.triviaTipo = tipo;
        if (tipo === 'LIBRE') {
            wf.triviaReferenciaTipo = null;
            wf.triviaReferenciaId = null;
            wf.triviaReferenciaLabel = null;
            wf.triviaReferenciaImagen = null;
        }
        window.wfRerenderWorkflow();
    };

    window.wfTriviaSetReferenciaTipo = function(tipo) {
        const wf = window.getWfState();
        wf.triviaReferenciaTipo = tipo;
        wf.triviaReferenciaId = null;
        wf.triviaReferenciaLabel = null;
        wf.triviaReferenciaImagen = null;
        window.wfRerenderWorkflow();
    };

    window.wfTriviaQuitarReferencia = function() {
        const wf = window.getWfState();
        wf.triviaReferenciaId = null;
        wf.triviaReferenciaLabel = null;
        wf.triviaReferenciaImagen = null;
        window.wfRerenderWorkflow();
    };

    window.wfTriviaBuscarReferencia = async function(query) {
        const res = document.getElementById('wfTriviaResultadosReferencia');
        if (!res) return;
        if (!query || query.length < 2) { res.innerHTML = ''; return; }
        const wf = window.getWfState();
        try {
            const token = localStorage.getItem('token');
            if (wf.triviaReferenciaTipo === 'PERSONA') {
                const r = await fetch(`${window._comunidadApiUrl}/movies/people/search?query=${encodeURIComponent(query)}&page=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await r.json();
                const personas = (data.results || []).slice(0, 5);
                res.innerHTML = personas.map(p => {
                    const foto = p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : '';
                    const nombre = p.name || '';
                    return `<div onclick="window.wfTriviaElegirReferencia(${p.id}, '${nombre.replace(/'/g,"\\'")}', '${foto}')"
                        style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:6px;"
                        onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">
                        ${foto ? `<img src="${foto}" style="width:26px;height:26px;object-fit:cover;border-radius:50%;">` : `<div style="width:26px;height:26px;border-radius:50%;background:#eee;"></div>`}
                        <span style="font-size:0.8rem;">${escapeHtml(nombre)}${p.known_for_department ? ` <span style="color:#bbb;">(${escapeHtml(p.known_for_department)})</span>` : ''}</span>
                    </div>`;
                }).join('');
            } else {
                const r = await fetch(`${window._comunidadApiUrl}/movies/search?query=${encodeURIComponent(query)}&page=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await r.json();
                const pelis = (data.results || []).slice(0, 5);
                res.innerHTML = pelis.map(p => {
                    const poster = p.poster_path ? `https://image.tmdb.org/t/p/w92${p.poster_path}` : '';
                    const anio = p.release_date ? p.release_date.slice(0, 4) : '';
                    const labelCompleto = anio ? `${p.title} (${anio})` : (p.title || '');
                    return `<div onclick="window.wfTriviaElegirReferencia(${p.id}, '${labelCompleto.replace(/'/g,"\\'")}', '${poster}')"
                        style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;border-radius:6px;"
                        onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">
                        ${poster ? `<img src="${poster}" style="width:24px;height:35px;object-fit:cover;border-radius:3px;">` : ''}
                        <span style="font-size:0.8rem;">${escapeHtml(labelCompleto)}</span>
                    </div>`;
                }).join('');
            }
        } catch (e) {}
    };

    window.wfTriviaElegirReferencia = function(id, label, imagen) {
        const wf = window.getWfState();
        wf.triviaReferenciaId = id;
        wf.triviaReferenciaLabel = label;
        wf.triviaReferenciaImagen = imagen;
        window.wfRerenderWorkflow();
    };

    window.wfTriviaCambiarTexto = function(idx, valor) {
        const wf = window.getWfState();
        if (wf.triviaOpciones && wf.triviaOpciones[idx]) wf.triviaOpciones[idx].texto = valor;
        if (window.wfActualizarBotonContinuar) window.wfActualizarBotonContinuar();
    };

    window.wfTriviaMarcarCorrecta = function(idx) {
        const wf = window.getWfState();
        if (!wf.triviaOpciones) return;
        wf.triviaOpciones.forEach((o, i) => { o.esCorrecta = (i === idx); });
        window.wfRerenderWorkflow();
    };

    window.wfTriviaAgregarOpcion = function() {
        const wf = window.getWfState();
        if (!wf.triviaOpciones) wf.triviaOpciones = [];
        if (wf.triviaOpciones.length < 5) wf.triviaOpciones.push({ texto: '', esCorrecta: false });
        window.wfRerenderWorkflow();
    };

    window.wfTriviaQuitarOpcion = function(idx) {
        const wf = window.getWfState();
        if (wf.triviaOpciones && wf.triviaOpciones.length > 2) {
            wf.triviaOpciones.splice(idx, 1);
            window.wfRerenderWorkflow();
        }
    };

    // ============== RENDER EN EL FEED ==============

    function renderEnCard(pub) {
        return `<div class="com-card-trivia" id="trivia-${pub.id}" style="margin:0 1rem 10px;border:1px solid #eee;border-radius:10px;padding:12px;">
            <p style="font-size:0.8rem;color:#999;text-align:center;margin:0;"><i class="fas fa-spinner fa-spin"></i> Cargando trivia...</p>
        </div>`;
    }

    async function resolverReferenciaCard(pub) {
        if (pub.triviaTipo !== 'REFERENCIA' || !pub.triviaReferenciaId) return null;
        const token = localStorage.getItem('token');
        try {
            if (pub.triviaReferenciaTipo === 'PERSONA') {
                const r = await fetch(`${window._comunidadApiUrl}/movies/person/${pub.triviaReferenciaId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!r.ok) return null;
                const p = await r.json();
                const foto = p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : '';
                return { imagen: foto, label: p.name || '', redondo: true };

                } else {
                    const r = await fetch(`${window._comunidadApiUrl}/movies/${pub.triviaReferenciaId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!r.ok) return null;
                    const m = await r.json();
                    const poster = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : '';
                    const anio = m.release_date ? m.release_date.slice(0, 4) : '';
                    const labelConAnio = anio ? `${m.title || ''} (${anio})` : (m.title || '');
                    return { imagen: poster, label: labelConAnio, redondo: false };
                }
        } catch (e) { return null; }
    }

        function pintarTrivia(pubId, data, referencia) {
            const wrap = document.getElementById(`trivia-${pubId}`);
            if (!wrap) return;
            const revelar = data.yaRespondio || data.cerrada;
            const esDesktopTrivia = window.matchMedia('(min-width: 769px)').matches;
            const layoutDosColumnas = !!(referencia && esDesktopTrivia);

            const filaEstilo = layoutDosColumnas ? 'flex:1;display:flex;align-items:center;' : 'margin-bottom:6px;';

            const filas = data.opciones.map(op => {
                if (revelar) {
                    const esElegida = op.id === data.opcionElegidaId;
                    const esLaCorrecta = op.esCorrecta === true;
                    let bg = '#f5f5f5', border = '#eee', icono = '';
                    if (esLaCorrecta) { bg = '#e3f5e9'; border = '#a8dfc0'; icono = '<i class="fas fa-check" style="color:#2e9e5b;"></i>'; }
                    else if (esElegida) { bg = '#fbe4e4'; border = '#eeb3b3'; icono = '<i class="fas fa-times" style="color:#c0392b;"></i>'; }
                    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:8px;background:${bg};border:1px solid ${border};${filaEstilo}">
                        <span style="font-size:0.85rem;color:#1a1a1a;font-weight:${esLaCorrecta || esElegida ? '600' : '400'};">${escapeHtml(op.texto)}</span>
                        ${icono}
                    </div>`;
                }
                return `<div onclick="window.responderTriviaOpcion(${pubId}, ${op.id})"
                             style="padding:9px 12px;border-radius:8px;background:#f5f5f5;cursor:pointer;${filaEstilo}">
                    <span style="font-size:0.85rem;color:#1a1a1a;">${escapeHtml(op.texto)}</span>
                </div>`;
            }).join('');

            let pie = '';
            if (data.cerrada) {
                pie = `<p style="font-size:0.72rem;color:#bbb;margin:4px 0 0;">Trivia cerrada${data.porcentajeAcierto !== undefined ? ` · ${data.porcentajeAcierto}% acertó` : ''}</p>`;
            } else if (data.yaRespondio) {
                pie = `<p style="font-size:0.72rem;color:${data.acerto ? '#2e9e5b' : '#c0392b'};margin:4px 0 0;font-weight:600;">
                    Respondiste ${data.acerto ? 'correcto' : 'incorrecto'} · ${data.porcentajeAcierto}% acertó
                </p>`;
            }

            if (layoutDosColumnas) {
                wrap.innerHTML = `
                    <div style="display:flex;gap:16px;align-items:stretch;">
                        <div style="flex-shrink:0;width:140px;">
                            ${referencia.imagen ? `<img src="${referencia.imagen}" style="width:100%;height:100%;min-height:180px;object-fit:cover;border-radius:${referencia.redondo ? '50%' : '8px'};display:block;">` : ''}
                        </div>
                        <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
                            <p style="font-size:1.05rem;font-weight:700;color:#1a1a1a;text-align:center;margin:0 0 10px;">${escapeHtml(referencia.label)}</p>
                            <div style="flex:1;display:flex;flex-direction:column;gap:6px;">${filas}</div>
                            ${pie}
                        </div>
                    </div>`;
                return;
            }

            const referenciaHtml = referencia ? `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    ${referencia.imagen ? `<img src="${referencia.imagen}" style="width:${referencia.redondo ? '36' : '30'}px;height:${referencia.redondo ? '36' : '44'}px;object-fit:cover;border-radius:${referencia.redondo ? '50%' : '4px'};">` : ''}
                    <span style="font-size:0.85rem;font-weight:600;color:#1a1a1a;">${escapeHtml(referencia.label)}</span>
                </div>` : '';

            wrap.innerHTML = `${referenciaHtml}<div>${filas}</div>${pie}`;
        }

    async function resolverEnCard(pub) {
        const wrap = document.getElementById(`trivia-${pub.id}`);
        if (!wrap) return;
        try {
            const token = localStorage.getItem('token');
            const [res, referencia] = await Promise.all([
                fetch(`${window._comunidadApiUrl}/publications/${pub.id}/trivia`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                resolverReferenciaCard(pub)
            ]);
            if (!res.ok) throw new Error();
            const data = await res.json();
            wrap._referenciaCache = referencia;
            pintarTrivia(pub.id, data, referencia);
        } catch (e) {
            wrap.innerHTML = `<p style="font-size:0.8rem;color:#bbb;text-align:center;margin:0;">No se pudo cargar la trivia</p>`;
        }
    }

    window.responderTriviaOpcion = async function(pubId, opcionId) {
        const wrap = document.getElementById(`trivia-${pubId}`);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${window._comunidadApiUrl}/publications/${pubId}/responder-trivia`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ opcionId })
            });
            const data = await res.json();
            if (!res.ok) {
                if (window.mostrarToast) window.mostrarToast(data.error || 'No se pudo responder.', 'error');
                return;
            }
            pintarTrivia(pubId, data, wrap ? wrap._referenciaCache : null);
        } catch (e) {
            if (window.mostrarToast) window.mostrarToast('Error al responder.', 'error');
        }
    };

    window.CreatorTools = window.CreatorTools || [];
    window.CreatorTools.push({
        key: 'TRIVIA',
        emoji: '❓',
        label: 'Trivia',
        desc: 'Pregunta con 2 a 5 opciones',
        disponible: true,
        bloqueaImagenVideo: true,
        activoPara: (pub) => !!(pub.movieId && pub.triviaEnabled),
        onSeleccionar: (_wf, activo) => {
            _wf.triviaEnabled = activo;
            if (activo) {
                if (!_wf.triviaOpciones || _wf.triviaOpciones.length === 0) {
                    _wf.triviaOpciones = [{ texto: '', esCorrecta: false }, { texto: '', esCorrecta: false }];
                }
                if (!_wf.triviaTipo) _wf.triviaTipo = 'LIBRE';
                if (!_wf.triviaDuracionValor) _wf.triviaDuracionValor = 3;
                if (!_wf.triviaDuracionUnidad) _wf.triviaDuracionUnidad = 'DIAS';
                _wf.triviaDuracionMinutos = (parseInt(_wf.triviaDuracionValor, 10) || 0) * (MINUTOS_POR_UNIDAD[_wf.triviaDuracionUnidad] || 1);
            } else {
                _wf.triviaOpciones = null;
                _wf.triviaTipo = null;
                _wf.triviaReferenciaTipo = null;
                _wf.triviaReferenciaId = null;
                _wf.triviaReferenciaLabel = null;
                _wf.triviaReferenciaImagen = null;
                _wf.triviaDuracionValor = null;
                _wf.triviaDuracionUnidad = null;
                _wf.triviaDuracionMinutos = null;
            }
        },
        puedeAvanzar: (_wf) => {
            if (!_wf.title || _wf.title.trim().length < 3) return false;
            const validas = (_wf.triviaOpciones || []).filter(o => o.texto && o.texto.trim().length > 0);
            if (validas.length < 2 || validas.length > 5) return false;
            const correctas = (_wf.triviaOpciones || []).filter(o => o.esCorrecta && o.texto && o.texto.trim().length > 0);
            if (correctas.length !== 1) return false;
            if (_wf.triviaTipo === 'REFERENCIA' && !_wf.triviaReferenciaId) return false;
            if (!_wf.triviaDuracionMinutos || _wf.triviaDuracionMinutos <= 0 || _wf.triviaDuracionMinutos > MAX_DURACION_MINUTOS) return false;
            return true;
        },
        renderEnCard: renderEnCard,
        resolverEnCard: (pub) => resolverEnCard(pub),
        renderExtra: renderExtra,
        ocultaTituloGeneral: () => true
    });
})();