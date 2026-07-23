// ==============================================
// admin-publicaciones.js
// ==============================================
const adminPublicaciones = (function() {

    function getAPI() { return (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:8080/api'; }
    let _pestana = 'reportadas';
    let _page = 0;
    let _filtroTerritorio = '';
    let _filtroUsuario = '';

    function token() { return localStorage.getItem('token'); }

    function headers() {
        return { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' };
    }

    // ==============================================
    // INIT
    // ==============================================
    async function init() {
        await cargarStats();
        await cargarPublicaciones();
    }

    // ==============================================
    // STATS
    // ==============================================
    async function cargarStats() {
        try {
            const res = await fetch(`${getAPI()}/admin/publications/stats`, { headers: headers() });
            if (!res.ok) return;
            const data = await res.json();
            document.getElementById('statPubReportadas').textContent = data.reportadas || 0;
            document.getElementById('statPubActivas').textContent    = data.activas    || 0;
            document.getElementById('statPubOcultas').textContent    = data.ocultas    || 0;
            document.getElementById('statPubHoy').textContent        = data.hoy        || 0;
            document.getElementById('statPubPendientes').textContent = data.pendientesRevision || 0;

            const badgePend = document.getElementById('adminPendientesBadge');
            if (badgePend) {
                if (data.pendientesRevision > 0) {
                    badgePend.textContent = data.pendientesRevision;
                    badgePend.style.display = 'inline-block';
                } else {
                    badgePend.style.display = 'none';
                }
            }

            const badge = document.getElementById('adminPublicacionesBadge');
            if (badge && data.reportadas > 0) {
                badge.textContent = data.reportadas;
                badge.style.display = 'inline-block';
            } else if (badge) {
                badge.style.display = 'none';
            }
        } catch(e) {}
    }

    // ==============================================
    // CARGAR PUBLICACIONES
    // ==============================================
    async function cargarPublicaciones(page = 0) {
        _page = page;
        const tbody = document.getElementById('tablaPublicacionesBody');
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        try {
            const params = new URLSearchParams({ page, size: 20 });
            if (_filtroTerritorio) params.append('territoryGroup', _filtroTerritorio);
            if (_filtroUsuario)    params.append('usuario', _filtroUsuario);

            let endpoint = `${getAPI()}/admin/publications`;
            if (_pestana === 'reportadas')  endpoint = `${getAPI()}/admin/publications/reported`;
            if (_pestana === 'activas')     endpoint = `${getAPI()}/admin/publications/active`;
            if (_pestana === 'ocultas')     endpoint = `${getAPI()}/admin/publications/hidden`;
            if (_pestana === 'pendientes')  endpoint = `${getAPI()}/admin/publications/pending-review`;

            const res = await fetch(`${endpoint}?${params}`, { headers: headers() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const pubs = data.content || [];

            if (pubs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#ccc;">No hay publicaciones en esta categoría.</td></tr>';
                renderPaginacion(data);
                return;
            }

            tbody.innerHTML = pubs.map(pub => {
                const fecha = new Date(pub.createdAt).toLocaleDateString('es-AR', {
                    day:'2-digit', month:'2-digit', year:'numeric'
                });
                const fragmento = (pub.content || '').substring(0, 80) + ((pub.content || '').length > 80 ? '...' : '');
                const reporteBadge = pub.reportCount > 0
                    ? `<span style="background:#fff0f0;color:#e50914;padding:2px 8px;border-radius:99px;font-size:0.78rem;font-weight:600;">🚩 ${pub.reportCount}</span>`
                    : '<span style="color:#ccc;">—</span>';

                const riesgoColors = { ALTO: '#e50914', MEDIO: '#ff9800', BAJO: '#28a745' };
                                const riesgoBadge = pub.nivelRiesgo
                                    ? `<span style="background:${riesgoColors[pub.nivelRiesgo] || '#ccc'}20;color:${riesgoColors[pub.nivelRiesgo] || '#666'};padding:2px 8px;border-radius:99px;font-size:0.78rem;font-weight:600;">${pub.nivelRiesgo}</span>`
                                    : '<span style="color:#ccc;">—</span>';
                                const cuentaNuevaBadge = pub.pendingReviewReason === 'CUENTA_NUEVA'
                                    ? `<span title="Cuenta dentro de sus primeras 3 publicaciones con imagen/video — revisión obligatoria sin importar el riesgo detectado" style="background:#e8f0ff;color:#324C89;padding:2px 8px;border-radius:99px;font-size:0.78rem;font-weight:600;margin-left:4px;">🆕 Cuenta nueva</span>`
                                    : '';

                // Acciones según pestaña
                const verOnclick = (_pestana === 'pendientes' || _pestana === 'reportadas')
                ? `adminPublicaciones.verDetallePendiente(${pub.id})`
                : `adminPublicaciones.verDetalle(${pub.id})`;

                let accionesHtml = `
                    <button onclick="${verOnclick}"
                            style="padding:4px 10px;background:#324C89;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                        Ver
                    </button>`;

                if (_pestana !== 'activas') {
                        if (!pub.hidden) {
                            if (_pestana === 'pendientes') {
                                if (pub.pendienteTexto) {
                                    accionesHtml += `
                                        <button onclick="adminPublicaciones.aprobarPendiente(${pub.id})"
                                                style="padding:4px 10px;background:#28a745;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                            Aprobar publicación
                                        </button>`;
                                }
                                if (pub.pendienteVideo) {
                                    accionesHtml += `
                                        <button onclick="adminPublicaciones.aprobarVideo(${pub.id})"
                                                style="padding:4px 10px;background:#28a745;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                            Aprobar video
                                        </button>
                                        <button onclick="adminPublicaciones.rechazarVideo(${pub.id})"
                                                style="padding:4px 10px;background:#e50914;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                            Rechazar video
                                        </button>`;
                                }
                            }
                            accionesHtml += `
                                <button onclick="adminPublicaciones.ocultarPublicacion(${pub.id})"
                                        style="padding:4px 10px;background:#e50914;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                    Ocultar
                                </button>
                                <button onclick="adminPublicaciones.sancionarUsuario(${pub.id}, ${pub.user?.id})"
                                        style="padding:4px 10px;background:#ff9800;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                    Sancionar
                                </button>`;
                            if (_pestana === 'reportadas') {
                                accionesHtml += `
                                    <button onclick="adminPublicaciones.desestimarPublicacion(${pub.id})"
                                            style="padding:4px 10px;background:#6c757d;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                        Desestimar
                                    </button>`;
                            }
                        } else {
                        accionesHtml += `
                            <button onclick="adminPublicaciones.restaurarPublicacion(${pub.id})"
                                    style="padding:4px 10px;background:#28a745;color:white;border:none;border-radius:6px;font-size:0.78rem;cursor:pointer;">
                                Restaurar
                            </button>`;
                    }
                }

                return `<tr>
                    <td>#${pub.id}</td>
                    <td>${pub.user?.name || '—'}</td>
                    <td style="font-size:0.8rem;">${formatTerritorio(pub.territoryGroup)}</td>
                    <td style="font-size:0.8rem;">${pub.tone || '—'}</td>
                    <td style="max-width:200px;font-size:0.82rem;color:#444;">${fragmento}</td>
                    <td style="font-size:0.8rem;">${pub.movieId ? `🎬 #${pub.movieId}` : '—'}</td>
                    <td>${reporteBadge}</td>
                    <td>${riesgoBadge}${cuentaNuevaBadge}</td>
                    <td style="font-size:0.8rem;">${fecha}</td>
                    <td><div style="display:flex;gap:4px;flex-wrap:wrap;">${accionesHtml}</div></td>
                </tr>`;
            }).join('');

            renderPaginacion(data);

        } catch(e) {
                    console.error('Error cargando publicaciones:', e);
                    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#ccc;">Error al cargar publicaciones.</td></tr>';
                }
            }

    // ==============================================
    // ACCIONES
    // ==============================================
    function abrirModalMotivo(pubId, accion) {
        const overlay = document.createElement('div');
        overlay.id = 'modalMotivoOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        const titulos = { hide: 'Ocultar publicación', sanction: 'Sancionar usuario', 'reject-video': 'Rechazar video' };
                const labels  = { hide: 'Ocultar', sanction: 'Sancionar', 'reject-video': 'Rechazar video' };
                const colores = { hide: '#e50914', sanction: '#ff9800', 'reject-video': '#e50914' };
                const titulo   = titulos[accion];
                const btnLabel = labels[accion];
                const btnColor = colores[accion];

        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:1.5rem;max-width:420px;width:100%;" onclick="event.stopPropagation()">
                <h3 style="margin:0 0 0.5rem;font-size:1rem;color:#333;">${titulo}</h3>
                <p style="color:#888;font-size:0.85rem;margin-bottom:1rem;">El motivo será comunicado al autor de la publicación.</p>
                <textarea id="motivoPubInput" placeholder="Motivo de la moderación (obligatorio)..." maxlength="500"
                          style="width:100%;padding:0.75rem;border:1.5px solid #e0e0e0;border-radius:8px;font-size:0.85rem;resize:none;height:90px;box-sizing:border-box;font-family:inherit;margin-bottom:1rem;"></textarea>
                <div style="display:flex;gap:0.75rem;">
                    <button onclick="document.getElementById('modalMotivoOverlay').remove()"
                            style="flex:1;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                        Cancelar
                    </button>
                    <button id="btnConfirmarMotivo"
                            style="flex:2;padding:0.7rem;background:${btnColor};border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9rem;">
                        ${btnLabel}
                    </button>
                </div>
            </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('btnConfirmarMotivo').addEventListener('click', async () => {
            const motivo = document.getElementById('motivoPubInput').value.trim();
            if (!motivo) { alert('El motivo es obligatorio.'); return; }

            const btn = document.getElementById('btnConfirmarMotivo');
            btn.disabled = true;
            btn.textContent = 'Procesando...';

            const endpoints = {
                    hide: `${getAPI()}/admin/publications/${pubId}/hide`,
                    sanction: `${getAPI()}/admin/publications/${pubId}/sanction`,
                    'reject-video': `${getAPI()}/admin/publications/${pubId}/reject-video`
                };
                const endpoint = endpoints[accion];

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify({ reason: motivo })
                });
                overlay.remove();
                if (res.ok) {
                    const mensajes = {
                        hide: 'Publicación ocultada y autor notificado.',
                        sanction: 'Usuario sancionado y publicación ocultada.',
                        'reject-video': 'Video rechazado. La publicación sigue visible sin él.'
                    };
                    mostrarToast(mensajes[accion], 'success');
                    await cargarPublicaciones(_page);
                    await cargarStats();
                } else {
                    mostrarToast('Error al procesar la acción.', 'error');
                }
            } catch(e) {
                mostrarToast('Error de conexión.', 'error');
            }
        });
    }

    async function ocultarPublicacion(pubId) {
        abrirModalMotivo(pubId, 'hide');
    }

    async function restaurarPublicacion(pubId) {
        if (!confirm('¿Querés restaurar esta publicación al feed?')) return;
        try {
            const res = await fetch(`${getAPI()}/admin/publications/${pubId}/restore`, {
                method: 'POST', headers: headers()
            });
            if (res.ok) {
                mostrarToast('Publicación restaurada.', 'success');
                await cargarPublicaciones(_page);
                await cargarStats();
            } else {
                mostrarToast('Error al restaurar.', 'error');
            }
        } catch(e) { mostrarToast('Error de conexión.', 'error'); }
    }

    async function sancionarUsuario(pubId, userId) {
        abrirModalMotivo(pubId, 'sanction');
    }

    async function desestimarPublicacion(pubId) {
        if (!confirm('¿Desestimar los reportes de esta publicación? Dejará de figurar como reportada y se notificará a quienes la reportaron.')) return;
        try {
            const res = await fetch(`${getAPI()}/admin/publications/${pubId}/dismiss`, {
                method: 'POST', headers: headers()
            });
            if (res.ok) {
                mostrarToast('Reportes desestimados. Se notificó a los usuarios que reportaron.', 'success');
                await cargarPublicaciones(_page);
                await cargarStats();
            } else {
                mostrarToast('Error al desestimar.', 'error');
            }
        } catch(e) { mostrarToast('Error de conexión.', 'error'); }
    }

    async function aprobarVideo(pubId) {
            if (!confirm('¿Aprobar este video? Se mostrará en la publicación de inmediato.')) return;
            try {
                const res = await fetch(`${getAPI()}/admin/publications/${pubId}/approve-video`, {
                    method: 'POST', headers: headers()
                });
                if (res.ok) {
                    mostrarToast('Video aprobado y visible en la publicación.', 'success');
                    await cargarPublicaciones(_page);
                    await cargarStats();
                } else {
                    mostrarToast('Error al aprobar el video.', 'error');
                }
            } catch(e) { mostrarToast('Error de conexión.', 'error'); }
        }

        function rechazarVideo(pubId) {
            abrirModalMotivo(pubId, 'reject-video');
        }

        async function aprobarPendiente(pubId) {
            if (!confirm('¿Aprobar esta publicación? Volverá a ser visible en el feed de Comunidad.')) return;
            try {
                const res = await fetch(`${getAPI()}/admin/publications/${pubId}/approve-pending`, {
                    method: 'POST', headers: headers()
                });
                if (res.ok) {
                    mostrarToast('Publicación aprobada y visible nuevamente.', 'success');
                    await cargarPublicaciones(_page);
                    await cargarStats();
                } else {
                    mostrarToast('Error al aprobar.', 'error');
                }
            } catch(e) { mostrarToast('Error de conexión.', 'error'); }
        }

    function verDetalle(pubId) {
            const base = window.location.hostname === 'localhost'
                ? `${window.location.pathname.split('/src/')[0]}/src/publicacion.html`
                : '/publicacion';
            window.open(`${base}?id=${pubId}`, '_blank');
        }

        async function verDetallePendiente(pubId) {
            const overlay = document.createElement('div');
                     overlay.id = 'modalDetalleOverlay';
                     overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;';
                     overlay.innerHTML = `
                         <div style="background:white;border-radius:16px;padding:1.5rem;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;" onclick="event.stopPropagation()">
                             <p style="text-align:center;color:#888;padding:2rem 0;"><i class="fas fa-spinner fa-spin"></i> Cargando publicación...</p>
                         </div>`;
                     document.body.appendChild(overlay);
                     overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

                     try {
                         const res = await fetch(`${getAPI()}/admin/publications/${pubId}/detalle`, { headers: headers() });
                         if (!res.ok) throw new Error();
                         const pub = await res.json();

                         const riesgoColors = { ALTO: '#e50914', MEDIO: '#ff9800', BAJO: '#28a745' };
                         const riesgoColor = riesgoColors[pub.nivelRiesgo] || '#ccc';
                         const fecha = new Date(pub.createdAt).toLocaleString('es-AR');

                         const coloresRiesgo = { ALTO: '#e50914', GRIS: '#ff9800', BAJO: '#28a745' };
                          const imagenHtml = (pub.imageUrls && pub.imageUrls.length > 0)
                              ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;margin-bottom:1rem;">
                                     ${pub.imageUrls.map(url => {
                                         const riesgo = pub.imageRiesgos ? pub.imageRiesgos[url] : null;
                                         const conflictiva = riesgo === 'ALTO' || riesgo === 'GRIS';
                                         const borde = conflictiva ? `3px solid ${coloresRiesgo[riesgo]}` : '3px solid transparent';
                                         const badge = conflictiva
                                             ? `<span style="position:absolute;top:2px;right:2px;background:${coloresRiesgo[riesgo]};color:white;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:99px;">${riesgo}</span>`
                                             : '';
                                         return `<div style="position:relative;">
                                                     <img src="${url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;border:${borde};box-sizing:border-box;"
                                                          onclick="window.open('${url}', '_blank')">
                                                     ${badge}
                                                 </div>`;
                                     }).join('')}
                                 </div>`
                              : '';

                          // Usamos videoUid (no videoUrl) para que el admin pueda ver el
                          // video incluso mientras está pendiente de revisión — videoUrl
                          // solo existe una vez aprobado.
                          const videoHtml = pub.videoUid
                              ? `<iframe src="https://iframe.videodelivery.net/${pub.videoUid}"
                                         style="width:100%;aspect-ratio:16/9;border:none;border-radius:10px;margin-bottom:1rem;display:block;"
                                         allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                         allowfullscreen="true"></iframe>`
                              : '';

                         const cuentaNuevaAlerta = pub.pendingReviewReason === 'CUENTA_NUEVA' ? `
                               <div style="background:#e8f0ff;border:1px solid #324C89;border-radius:10px;padding:0.75rem 0.85rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
                                   <span style="font-size:1.1rem;">🆕</span>
                                   <div style="font-size:0.8rem;color:#324C89;">
                                       <strong>Cuenta nueva.</strong> Esta es una de las primeras 3 publicaciones con imagen/video del usuario — quedó en revisión obligatoria sin importar el nivel de riesgo detectado.
                                   </div>
                               </div>` : '';

                            const scoresHtml = pub.nivelRiesgo ? `
                                <div style="background:#faf9f9;border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                                        <strong style="font-size:0.85rem;color:#333;">Nivel de riesgo</strong>
                                        <span style="background:${riesgoColor}20;color:${riesgoColor};padding:2px 10px;border-radius:99px;font-size:0.78rem;font-weight:700;">${pub.nivelRiesgo}</span>
                                    </div>
                                    <div style="font-size:0.75rem;color:#888;">
                                        Porn: ${(pub.scorePorn*100).toFixed(1)}% · Sexy: ${(pub.scoreSexy*100).toFixed(1)}% · Hentai: ${(pub.scoreHentai*100).toFixed(1)}%
                                    </div>
                                </div>` : '';

                         const filasReportes = (pub.reportes || []).map(r => `
                             <tr>
                                 <td style="padding:8px 6px;font-size:0.8rem;">
                                     <div style="font-weight:600;color:#333;">${r.usuario}</div>
                                     <div style="color:#999;font-size:0.72rem;">${r.email}</div>
                                 </td>
                                 <td style="padding:8px 6px;font-size:0.8rem;color:#444;">${r.motivo || '—'}</td>
                                 <td style="padding:8px 6px;font-size:0.8rem;color:#888;">${r.descripcion || '—'}</td>
                                 <td style="padding:8px 6px;font-size:0.78rem;color:#888;white-space:nowrap;">${new Date(r.fecha).toLocaleDateString('es-AR')}</td>
                             </tr>`).join('');

                         const reportesHtml = (pub.reportes && pub.reportes.length > 0) ? `
                             <strong style="font-size:0.9rem;color:#333;display:block;margin-bottom:0.5rem;">Reportes recibidos (${pub.reportes.length}):</strong>
                             <table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">
                                 <thead>
                                     <tr style="background:#faf9f9;">
                                         <th style="text-align:left;padding:6px;font-size:0.72rem;color:#999;text-transform:uppercase;">Usuario</th>
                                         <th style="text-align:left;padding:6px;font-size:0.72rem;color:#999;text-transform:uppercase;">Motivo</th>
                                         <th style="text-align:left;padding:6px;font-size:0.72rem;color:#999;text-transform:uppercase;">Descripción</th>
                                         <th style="text-align:left;padding:6px;font-size:0.72rem;color:#999;text-transform:uppercase;">Fecha</th>
                                     </tr>
                                 </thead>
                                 <tbody>${filasReportes}</tbody>
                             </table>` : '';

                         document.getElementById('modalDetalleOverlay').querySelector('div').innerHTML = `
                             <h3 style="margin:0 0 1rem;font-size:1.05rem;color:#333;">Publicación #${pub.id}</h3>
                             ${imagenHtml}
                               ${videoHtml}
                               ${reportesHtml}
                               ${cuentaNuevaAlerta}
                               ${scoresHtml}
                             <p style="font-size:0.8rem;color:#888;margin-bottom:0.25rem;"><strong>${pub.user?.name || '—'}</strong> · ${fecha}</p>
                             <p style="font-size:0.9rem;color:#333;line-height:1.5;margin-bottom:1rem;white-space:pre-wrap;">${pub.content || ''}</p>
                             <button onclick="document.getElementById('modalDetalleOverlay').remove()"
                                     style="width:100%;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;font-size:0.9rem;">
                                 Cerrar
                             </button>`;
                     } catch(e) {
                         document.getElementById('modalDetalleOverlay').querySelector('div').innerHTML =
                             `<p style="text-align:center;color:#e50914;padding:1rem 0;">Error al cargar la publicación.</p>
                              <button onclick="document.getElementById('modalDetalleOverlay').remove()"
                                      style="width:100%;padding:0.7rem;border:1.5px solid #ddd;background:none;border-radius:8px;color:#666;cursor:pointer;">Cerrar</button>`;
                     }
                 }

    // ==============================================
    // TABS Y FILTROS
    // ==============================================
    function cambiarPestana(pestana, btn) {
        _pestana = pestana;
        _page = 0;
        document.querySelectorAll('.pub-admin-tab').forEach(b => {
            b.style.background = 'white';
            b.style.color = '#555';
            b.style.borderColor = '#ddd';
            b.style.fontWeight = 'normal';
        });
        btn.style.background = '#fff0f0';
        btn.style.color = '#e50914';
        btn.style.borderColor = '#e50914';
        btn.style.fontWeight = '600';
        cargarPublicaciones(0);
    }

    function aplicarFiltros() {
        _filtroTerritorio = document.getElementById('pubFiltroTerritorio')?.value || '';
        _filtroUsuario    = document.getElementById('pubFiltroUsuario')?.value || '';
        cargarPublicaciones(0);
    }

    function limpiarFiltros() {
        _filtroTerritorio = '';
        _filtroUsuario = '';
        if (document.getElementById('pubFiltroTerritorio')) document.getElementById('pubFiltroTerritorio').value = '';
        if (document.getElementById('pubFiltroUsuario'))    document.getElementById('pubFiltroUsuario').value = '';
        cargarPublicaciones(0);
    }

    // ==============================================
    // PAGINACIÓN
    // ==============================================
    function renderPaginacion(data) {
        const cont = document.getElementById('pubPaginacion');
        if (!cont) return;
        cont.innerHTML = '';
        if (data.totalPages <= 1) return;

        for (let i = 0; i < data.totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i + 1;
            btn.style.cssText = `padding:6px 12px;border-radius:6px;border:1px solid ${i === _page ? '#e50914' : '#ddd'};
                background:${i === _page ? '#e50914' : 'white'};color:${i === _page ? 'white' : '#555'};cursor:pointer;font-size:0.85rem;`;
            btn.onclick = () => cargarPublicaciones(i);
            cont.appendChild(btn);
        }
    }

    // ==============================================
    // HELPERS
    // ==============================================
    function formatTerritorio(key) {
        const map = {
            PELICULAS_SERIES:'🎬 Películas', LO_QUE_VIENE:'📅 Estrenos',
            GENTE_CINE:'🎭 Gente de cine', PREMIOS:'🏆 Premios',
            INDUSTRIA:'💰 Industria', EXPERIENCIA:'🍿 Experiencia',
            ARTE_CULTURA:'🎓 Arte y cultura', EVENTOS:'🎪 Eventos'
        };
        return map[key] || key || '—';
    }

    function mostrarToast(msg, tipo) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(msg, tipo);
        } else {
            alert(msg);
        }
    }

    return { init, cambiarPestana, aplicarFiltros, limpiarFiltros,
             ocultarPublicacion, restaurarPublicacion, sancionarUsuario, desestimarPublicacion, aprobarPendiente,
             verDetalle, verDetallePendiente, aprobarVideo, rechazarVideo };

})();

window.initAdminPublicaciones = function() {
    adminPublicaciones.init();
};