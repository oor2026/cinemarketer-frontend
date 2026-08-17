// ==============================================
// admin-estadisticas.js - Módulo de estadísticas
// ==============================================

const adminEstadisticas = {
    periodoActual: 'mes',
    fechaInicio: null,
    fechaFin: null,
    datos: null,

    // Inicializar
    init: function() {
        this.cargarEstadisticas();
    },

    // Cambiar período
    cambiarPeriodo: function(periodo) {
            this.periodoActual = periodo;

            const hoy = new Date();
            let inicio, fin;

            fin = hoy.toISOString().split('T')[0];

            switch (periodo) {
                case 'semana':
                    inicio = new Date(hoy);
                    inicio.setDate(hoy.getDate() - 7);
                    inicio = inicio.toISOString().split('T')[0];
                    break;
                case 'mes':
                    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
                        .toISOString().split('T')[0];
                    break;
                case 'trimestre':
                    inicio = new Date(hoy);
                    inicio.setMonth(hoy.getMonth() - 3);
                    inicio = inicio.toISOString().split('T')[0];
                    break;
                case 'anio':
                    inicio = new Date(hoy.getFullYear(), 0, 1)
                        .toISOString().split('T')[0];
                    break;
                case 'todo':
                    inicio = '2000-01-01';
                    break;
                default:
                    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
                        .toISOString().split('T')[0];
            }

            this.fechaInicio = inicio;
            this.fechaFin = fin;
            this.cargarEstadisticas();
        },

    // Cambiar pestaña
        cambiarPestana: function(pestana, element) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            element.classList.add('active');

            document.querySelectorAll('.stats-panel').forEach(panel => panel.classList.remove('active'));
            document.getElementById(`stats-${pestana}`).classList.add('active');
        },

        // Desplaza la fila de tabs con las flechas del carrusel
        scrollTabs: function(direccion) {
            const contenedor = document.getElementById('statsTabs');
            if (!contenedor) return;
            contenedor.scrollBy({ left: direccion * 220, behavior: 'smooth' });
        },

        // Cargar estadísticas desde el backend
    cargarEstadisticas: async function() {
        try {
            // Mostrar loading
            this.mostrarLoading();

            const params = new URLSearchParams();
            if (this.fechaInicio) params.append('startDate', this.fechaInicio);
            if (this.fechaFin) params.append('endDate', this.fechaFin);

            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_URL}/admin/stats?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar estadísticas');

            this.datos = await response.json();

            // Renderizar todo
            this.renderizarResumen();
            this.renderizarUsuarios();
            this.renderizarVotos();
            this.renderizarComentarios();
            this.renderizarRecomendaciones();
            this.renderizarPublicaciones();
            this.renderizarPremios();
            this.renderizarPuntos();
            this.renderizarSoporte();
            this.renderizarCrecimiento();
            this.renderizarPremiumSorteos();
            this.renderizarSuscripciones();
            this.renderizarGuardadas();
            this.renderizarGanancias();

        } catch (error) {
            toast('Error al cargar estadísticas', 'error');
        }
    },

    // Mostrar loading
    mostrarLoading: function() {
        const resumen = document.getElementById('statsResumen');
        resumen.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando estadísticas...</div>';
    },

    // Renderizar tarjetas de resumen
    renderizarResumen: function() {
            const s = this.datos.summary;
            const html = `
                <div class="admin-stat-box">
                    <span class="stat-num">${this.formatearNumero(s.totalUsers)}</span>
                    <span class="stat-label">Usuarios totales</span>
                    <div class="stat-trend ${s.userGrowth >= 0 ? 'positive' : 'negative'}">
                        ${s.userGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.userGrowth).toFixed(1)}%
                    </div>
                </div>
                <div class="admin-stat-box">
                    <span class="stat-num">${s.approvalRate.toFixed(1)}%</span>
                    <span class="stat-label">Aprobación</span>
                    <div class="stat-trend ${s.approvalGrowth >= 0 ? 'positive' : 'negative'}">
                        ${s.approvalGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.approvalGrowth).toFixed(1)}%
                    </div>
                </div>
                <div class="admin-stat-box">
                    <span class="stat-num">${this.formatearNumero(s.totalRedemptions)}</span>
                    <span class="stat-label">Canjes</span>
                    <div class="stat-trend ${s.redemptionGrowth >= 0 ? 'positive' : 'negative'}">
                        ${s.redemptionGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.redemptionGrowth).toFixed(1)}%
                    </div>
                </div>
                <div class="admin-stat-box">
                    <span class="stat-num">${s.openTicketsCount}</span>
                    <span class="stat-label">Tickets abiertos</span>
                </div>
            `;
            document.getElementById('statsResumen').innerHTML = html;
        },

    // Renderizar tabla de usuarios
    renderizarUsuarios: function() {
        const u = this.datos.users;
        const html = `
            <tr>
                <td><strong>Total de usuarios</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.totalUsers)}</td>
                <td class="stat-comparacion ${u.growth >= 0 ? 'positive' : 'negative'}">
                    ${u.growth >= 0 ? '▲' : '▼'} ${Math.abs(u.growth).toFixed(1)}%
                </td>
                <td>${this.getTendenciaIcon(u.growth)}</td>
            </tr>
            <tr>
                <td><strong>Usuarios activos</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.activeUsers)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td><strong>Usuarios suspendidos</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.suspendedUsers)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td><strong>Usuarios verificados</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.verifiedUsers)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td><strong>Usuarios nuevos (período)</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.newUsers)}</td>
                <td class="stat-comparacion ${u.newUsers >= u.newUsersPrevPeriod ? 'positive' : 'negative'}">
                    ${u.newUsers >= u.newUsersPrevPeriod ? '▲' : '▼'} ${Math.abs(((u.newUsers - u.newUsersPrevPeriod) / (u.newUsersPrevPeriod || 1)) * 100).toFixed(1)}%
                </td>
                <td>${this.getTendenciaIcon(u.newUsers - u.newUsersPrevPeriod)}</td>
            </tr>
            <tr>
                <td><strong>Usuarios con puntos</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.usersWithPoints)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td><strong>Usuarios sin actividad</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.inactiveUsers)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td><strong>Usuarios bloqueados</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.blockedUsers)}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td><strong>Usuarios reportados</strong></td>
                <td class="stat-valor">${this.formatearNumero(u.reportedUsers)}</td>
                <td colspan="2"></td>
            </tr>
        `;
        document.getElementById('stats-usuarios-body').innerHTML = html;
    },

    // Renderizar tarjeta de votaciones (tabs Total / Películas / Series)
        renderizarVotos: function() {
            const v = this.datos.votes;
            this.datos._votosPorTab = { total: v.total, peliculas: v.peliculas, series: v.series };

            document.getElementById('stats-votos-body').innerHTML = `
                <div class="stats-subtabs">
                    <button class="stats-subtab-btn active" data-subtab="total" onclick="adminEstadisticas.cambiarSubtabVotos('total', this)">Total</button>
                    <button class="stats-subtab-btn" data-subtab="peliculas" onclick="adminEstadisticas.cambiarSubtabVotos('peliculas', this)">Películas</button>
                    <button class="stats-subtab-btn" data-subtab="series" onclick="adminEstadisticas.cambiarSubtabVotos('series', this)">Series</button>
                </div>
                <div id="stats-votos-subtab-total" class="stats-subtab-panel active">
                    ${this.renderVotosTotal(v)}
                </div>
                <div id="stats-votos-subtab-peliculas" class="stats-subtab-panel">
                    ${this.renderVotosSeccion(v.peliculas, '🎬 Top 5 películas', 'peliculas')}
                </div>
                <div id="stats-votos-subtab-series" class="stats-subtab-panel">
                    ${this.renderVotosSeccion(v.series, '📺 Top 5 series', 'series')}
                </div>
            `;
        },

        cambiarSubtabVotos: function(tab, btn) {
            document.querySelectorAll('#stats-votos-body .stats-subtab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('#stats-votos-body .stats-subtab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('stats-votos-subtab-' + tab).classList.add('active');
        },

        renderVotosTotal: function(v) {
            const t = v.total;
            return `
                <div class="stats-hero-numero">${this.formatearNumero(t.totalVotes)}</div>
                <div class="stats-hero-label">votos totales este período</div>

                <div class="stats-split-bar">
                    <div class="fill-peliculas" style="width:${v.pctPeliculas}%;"></div>
                    <div class="fill-series" style="width:${v.pctSeries}%;"></div>
                </div>
                <div class="stats-split-legend">
                    <span><span class="dot" style="background:#e50914;"></span>Películas · ${v.pctPeliculas.toFixed(0)}%</span>
                    <span><span class="dot" style="background:#324c89;"></span>Series · ${v.pctSeries.toFixed(0)}%</span>
                </div>

                <div class="stats-kpi-row">
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(t.totalLikes)}</div><div class="kpi-label">Likes</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(t.totalDislikes)}</div><div class="kpi-label">Dislikes</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${t.approvalRate.toFixed(1)}%</div><div class="kpi-label">Aprobación</div></div>
                </div>
            `;
        },

            renderVotosSeccion: function(s, tituloTop, color) {
                const acento = color === 'series' ? '#324c89' : '#e50914';

                const topContent = s.topContent?.map(m =>
                    `<li><strong>${m.title}</strong>: ${m.votes} votos (${m.likes} 👍 | ${m.dislikes} 👎)</li>`
                ).join('') || '<li>Sin datos</li>';

                const topUsers = s.topUsers?.map(u =>
                    `<li><strong>${u.name}</strong>: ${u.votes} votos</li>`
                ).join('') || '<li>Sin datos</li>';

                const tendencia = Object.entries(s.dailyTrend || {}).map(([fecha, cantidad]) =>
                    `<li>${this.formatearFechaCorta(fecha)}: <strong>${cantidad} votos</strong></li>`
                ).join('') || '<li>Sin datos</li>';

                return `
                    <div class="stats-hero-numero" style="color:${acento};">${this.formatearNumero(s.totalVotes)}</div>
                    <div class="stats-hero-label">votos en este contenido</div>

                    <div class="stats-kpi-row">
                        <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(s.totalLikes)}</div><div class="kpi-label">Likes</div></div>
                        <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(s.totalDislikes)}</div><div class="kpi-label">Dislikes</div></div>
                        <div class="stats-kpi-card"><div class="kpi-valor">${s.approvalRate.toFixed(1)}%</div><div class="kpi-label">Aprobación</div></div>
                    </div>

                    <div class="stats-votos-cols">
                        <div class="stats-votos-col-izq">
                            <div class="stats-top" style="border-top-color:${acento};">
                                <h4>${tituloTop}</h4>
                                <ul>${topContent}</ul>
                            </div>
                        </div>
                        <div class="stats-votos-col-der">
                            <div class="stats-top" style="border-top-color:${acento};">
                                <h4>👤 Top 5 usuarios</h4>
                                <ul>${topUsers}</ul>
                            </div>
                            <div class="stats-top" style="border-top-color:${acento};">
                                <h4>📅 Tendencia diaria</h4>
                                <ul>${tendencia}</ul>
                            </div>
                        </div>
                    </div>
                `;
            },

        formatearFechaCorta: function(fechaIso) {
            const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
            const partes = fechaIso.split('-');
            if (partes.length !== 3) return fechaIso;
            return `${parseInt(partes[2])} ${meses[parseInt(partes[1]) - 1]}`;
        },

    // Renderizar tabla de comentarios
        renderizarComentarios: function() {
            const c = this.datos.comments;

            document.getElementById('stats-comentarios-body').innerHTML = `
                <div class="stats-subtabs">
                    <button class="stats-subtab-btn active" data-subtab="total" onclick="adminEstadisticas.cambiarSubtabComentarios('total', this)">Total</button>
                    <button class="stats-subtab-btn" data-subtab="peliculas" onclick="adminEstadisticas.cambiarSubtabComentarios('peliculas', this)">Películas</button>
                    <button class="stats-subtab-btn" data-subtab="series" onclick="adminEstadisticas.cambiarSubtabComentarios('series', this)">Series</button>
                </div>
                <div id="stats-comentarios-subtab-total" class="stats-subtab-panel active">
                    ${this.renderComentariosTotal(c)}
                </div>
                <div id="stats-comentarios-subtab-peliculas" class="stats-subtab-panel">
                    ${this.renderComentariosSeccion(c.peliculas, '🎬 Top 5 películas', 'peliculas')}
                </div>
                <div id="stats-comentarios-subtab-series" class="stats-subtab-panel">
                    ${this.renderComentariosSeccion(c.series, '📺 Top 5 series', 'series')}
                </div>
            `;
        },

        cambiarSubtabComentarios: function(tab, btn) {
            document.querySelectorAll('#stats-comentarios-body .stats-subtab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('#stats-comentarios-body .stats-subtab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('stats-comentarios-subtab-' + tab).classList.add('active');
        },

        renderComentariosTotal: function(c) {
            const t = c.total;
            return `
                <div class="stats-hero-numero">${this.formatearNumero(t.totalComments)}</div>
                <div class="stats-hero-label">comentarios totales este período</div>

                <div class="stats-split-bar">
                    <div class="fill-peliculas" style="width:${c.pctPeliculas}%;"></div>
                    <div class="fill-series" style="width:${c.pctSeries}%;"></div>
                </div>
                <div class="stats-split-legend">
                    <span><span class="dot" style="background:#e50914;"></span>Películas · ${c.pctPeliculas.toFixed(0)}%</span>
                    <span><span class="dot" style="background:#324c89;"></span>Series · ${c.pctSeries.toFixed(0)}%</span>
                </div>

                <div class="stats-kpi-row">
                    <div class="stats-kpi-card"><div class="kpi-valor">${t.commentsPerDay.toFixed(1)}</div><div class="kpi-label">Por día</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(c.totalReplies)}</div><div class="kpi-label">Respuestas</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(c.gifsEnComentarios)}</div><div class="kpi-label">GIFs en comentarios</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${(c.tasaGifComentarios || 0).toFixed(1)}%</div><div class="kpi-label">Tasa GIF comentarios</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(c.gifsEnRespuestas)}</div><div class="kpi-label">GIFs en respuestas</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${(c.tasaGifRespuestas || 0).toFixed(1)}%</div><div class="kpi-label">Tasa GIF respuestas</div></div>
                </div>
                <p style="font-size:0.72rem;color:#999;margin-top:-0.3rem;">Respuestas y GIFs son globales — no se dividen por Películas/Series.</p>
            `;
        },

        renderComentariosSeccion: function(s, tituloTop, color) {
            const acento = color === 'series' ? '#324c89' : '#e50914';

            const topContent = s.topContent?.map(m =>
                `<li><strong>${m.title}</strong>: ${m.comments} comentarios</li>`
            ).join('') || '<li>Sin datos</li>';

            const topUsers = s.topUsers?.map(u =>
                `<li><strong>${u.name}</strong>: ${u.comments} comentarios</li>`
            ).join('') || '<li>Sin datos</li>';

            return `
                <div class="stats-hero-numero" style="color:${acento};">${this.formatearNumero(s.totalComments)}</div>
                <div class="stats-hero-label">comentarios en este contenido</div>

                <div class="stats-kpi-row">
                    <div class="stats-kpi-card"><div class="kpi-valor">${s.commentsPerDay.toFixed(1)}</div><div class="kpi-label">Por día</div></div>
                </div>

                <div class="stats-votos-cols">
                    <div class="stats-votos-col-izq">
                        <div class="stats-top" style="border-top-color:${acento};">
                            <h4>${tituloTop}</h4>
                            <ul>${topContent}</ul>
                        </div>
                    </div>
                    <div class="stats-votos-col-der">
                        <div class="stats-top" style="border-top-color:${acento};">
                            <h4>👤 Top 5 usuarios</h4>
                            <ul>${topUsers}</ul>
                        </div>
                    </div>
                </div>
            `;
        },

        renderizarRecomendaciones: function() {
            const r = this.datos.recommendations;
            if (!r) return;

            document.getElementById('stats-recomendaciones-body').innerHTML = `
                <div class="stats-subtabs">
                    <button class="stats-subtab-btn active" data-subtab="total" onclick="adminEstadisticas.cambiarSubtabRecomendaciones('total', this)">Total</button>
                    <button class="stats-subtab-btn" data-subtab="peliculas" onclick="adminEstadisticas.cambiarSubtabRecomendaciones('peliculas', this)">Películas</button>
                    <button class="stats-subtab-btn" data-subtab="series" onclick="adminEstadisticas.cambiarSubtabRecomendaciones('series', this)">Series</button>
                </div>
                <div id="stats-recomendaciones-subtab-total" class="stats-subtab-panel active">
                    ${this.renderRecomendacionesTotal(r)}
                </div>
                <div id="stats-recomendaciones-subtab-peliculas" class="stats-subtab-panel">
                    ${this.renderRecomendacionesSeccion(r.peliculas, '🎬 Top 5 películas más recomendadas', 'peliculas')}
                </div>
                <div id="stats-recomendaciones-subtab-series" class="stats-subtab-panel">
                    ${this.renderRecomendacionesSeccion(r.series, '📺 Top 5 series más recomendadas', 'series')}
                </div>
            `;
        },

        cambiarSubtabRecomendaciones: function(tab, btn) {
            document.querySelectorAll('#stats-recomendaciones-body .stats-subtab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('#stats-recomendaciones-body .stats-subtab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('stats-recomendaciones-subtab-' + tab).classList.add('active');
        },

        renderRecomendacionesTotal: function(r) {
            const t = r.total;
            return `
                <div class="stats-hero-numero">${this.formatearNumero(t.totalEnviadas)}</div>
                <div class="stats-hero-label">recomendaciones enviadas (histórico)</div>

                <div class="stats-split-bar">
                    <div class="fill-peliculas" style="width:${r.pctPeliculas}%;"></div>
                    <div class="fill-series" style="width:${r.pctSeries}%;"></div>
                </div>
                <div class="stats-split-legend">
                    <span><span class="dot" style="background:#e50914;"></span>Películas · ${r.pctPeliculas.toFixed(0)}%</span>
                    <span><span class="dot" style="background:#324c89;"></span>Series · ${r.pctSeries.toFixed(0)}%</span>
                </div>

                <div class="stats-kpi-row">
                    <div class="stats-kpi-card"><div class="kpi-valor">${t.tasaVisualizacion.toFixed(1)}%</div><div class="kpi-label">Tasa visualización</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${t.tasaCalificacion.toFixed(1)}%</div><div class="kpi-label">Tasa calificación</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${t.tasaContexto.toFixed(1)}%</div><div class="kpi-label">Tasa contexto</div></div>
                </div>
                <p style="font-size:0.72rem;color:#999;margin-top:-0.3rem;">Estos totales son históricos — no se filtran por el selector de fecha.</p>
            `;
        },

        renderRecomendacionesSeccion: function(s, tituloTop, color) {
            const acento = color === 'series' ? '#324c89' : '#e50914';

            const topContent = (s.topContent || [])
                .map((p, i) => `<li><strong>${i + 1}. ${p.titulo}</strong>: ${p.total}</li>`)
                .join('') || '<li>Sin datos</li>';

            const topContextos = (s.topContextos || [])
                .map((c, i) => `<li><strong>${i + 1}. ${c.contexto}</strong>: ${c.total}</li>`)
                .join('') || '<li>Sin datos</li>';

            return `
                <div class="stats-hero-numero" style="color:${acento};">${this.formatearNumero(s.totalEnviadas)}</div>
                <div class="stats-hero-label">recomendaciones enviadas</div>

                <div class="stats-kpi-row">
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(s.totalVistas)}</div><div class="kpi-label">Vistas</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(s.totalCalificadas)}</div><div class="kpi-label">Calificadas</div></div>
                    <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(s.totalConContexto)}</div><div class="kpi-label">Con contexto</div></div>
                </div>

                <div class="stats-votos-cols">
                    <div class="stats-votos-col-izq">
                        <div class="stats-top" style="border-top-color:${acento};">
                            <h4>${tituloTop}</h4>
                            <ul>${topContent}</ul>
                        </div>
                    </div>
                    <div class="stats-votos-col-der">
                        <div class="stats-top" style="border-top-color:${acento};">
                            <h4>🏷️ Top 5 contextos</h4>
                            <ul>${topContextos}</ul>
                        </div>
                    </div>
                </div>
            `;
        },

    renderizarPublicaciones: function() {
            const p = this.datos.publications;
            if (!p) return;

            const topUsuarios = (p.topUsuarios || [])
                .map((u, i) => `${i + 1}. ${u.nombre} (${u.total})`)
                .join(' | ') || '—';

            const topCategorias = (p.topCategorias || [])
                .map((c, i) => `${i + 1}. ${this.formatearCategoria(c.categoria)} (${c.total})`)
                .join(' | ') || '—';

            const html = `
                <tr>
                    <td><strong>Total de publicaciones</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.totalPublicaciones)}</td>
                    <td class="${p.growth >= 0 ? 'positive' : 'negative'}">
                        ${p.growth >= 0 ? '▲' : '▼'} ${Math.abs(p.growth).toFixed(1)}%
                    </td>
                </tr>
                <tr>
                    <td><strong>Promedio por día</strong></td>
                    <td class="stat-valor">${p.promedioPorDia}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones de texto</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesTexto)}</td>
                    <td>${p.porcentajeTexto?.toFixed(1)}%</td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con imagen</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesImagen)}</td>
                    <td>${p.porcentajeImagen?.toFixed(1)}%</td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con video</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesVideo)}</td>
                    <td>${p.porcentajeVideo?.toFixed(1)}%</td>
                </tr>

                <tr>
                    <td><strong>Publicaciones con ficha técnica</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesFichaTecnica)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con countdown</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesCountdown)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con votación</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesVotacion)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con ranking</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesRanking)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con trivia</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesTrivia)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones con tráiler</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesTrailer)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Tasa de aprobación automática</strong></td>
                    <td class="stat-valor">${p.tasaAprobacionAutomatica?.toFixed(1)}%</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Publicaciones que pasaron por revisión</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesEnRevision)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Ocultas/sancionadas</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.publicacionesOcultasSancionadas)}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Total "Te banco"</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.totalBanco)}</td>
                    <td>Prom: ${p.promedioBancoPorPublicacion}</td>
                </tr>
                <tr>
                    <td><strong>Total "Merecés un punto"</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.totalPuntos)}</td>
                    <td>Prom: ${p.promedioPuntosPorPublicacion}</td>
                </tr>
                <tr>
                    <td><strong>Total comentarios</strong></td>
                    <td class="stat-valor">${this.formatearNumero(p.totalComentarios)}</td>
                    <td>Prom: ${p.promedioComentariosPorPublicacion}</td>
                </tr>
                <tr>
                    <td><strong>Top 5 usuarios</strong></td>
                    <td colspan="2" style="font-size:0.82rem;">${topUsuarios}</td>
                </tr>
                <tr>
                    <td><strong>Top 5 categorías</strong></td>
                    <td colspan="2" style="font-size:0.82rem;">${topCategorias}</td>
                </tr>
            `;
            document.getElementById('stats-publicaciones-body').innerHTML = html;
        },

    // Renderizar tabla de premios y canjes
    renderizarPremios: function() {
        const r = this.datos.redemptions;
        const topPremios = r.topRewards?.map(pr =>
            `<li><strong>${pr.name}</strong>: ${pr.count} canjes</li>`
        ).join('') || '<li>Sin datos</li>';

        const html = `
            <tr>
                <td><strong>Total de premios</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.totalRewards)}</td>
                <td class="stat-comparacion"></td>
            </tr>
            <tr>
                <td><strong>Premios activos</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.activeRewards)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Premios agotados</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.exhaustedRewards)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Total de canjes</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.totalRedemptions)}</td>
                <td class="stat-comparacion ${r.growth >= 0 ? 'positive' : 'negative'}">
                    ${r.growth >= 0 ? '▲' : '▼'} ${Math.abs(r.growth).toFixed(1)}%
                </td>
            </tr>
            <tr>
                <td><strong>Canjes pendientes</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.pendingRedemptions)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Canjes completados</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.completedRedemptions)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Puntos totales canjeados</strong></td>
                <td class="stat-valor">${this.formatearNumero(r.totalPointsSpent)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Tasa de canje</strong></td>
                <td class="stat-valor">${r.redemptionRate.toFixed(1)}%</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Top premios</strong></td>
                <td colspan="2">
                    <div class="stats-top">
                        <ul>${topPremios}</ul>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('stats-premios-body').innerHTML = html;
    },

    // Renderizar tabla de puntos
    renderizarPuntos: function() {
        const p = this.datos.points;
        const topAcciones = p.topActions?.map(a =>
            `<li><strong>${a.action}</strong>: ${this.formatearNumero(a.count)} veces</li>`
        ).join('') || '<li>Sin datos</li>';

        const html = `
            <tr>
                <td><strong>Puntos totales generados</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.totalEarned)}</td>
            </tr>
            <tr>
                <td><strong>Puntos totales gastados</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.totalSpent)}</td>
            </tr>
            <tr>
                <td><strong>Promedio de puntos por usuario</strong></td>
                <td class="stat-valor">${p.averagePerUser.toFixed(1)}</td>
            </tr>
            <tr>
                <td><strong>Acciones más puntuadas</strong></td>
                <td>
                    <div class="stats-top">
                        <ul>${topAcciones}</ul>
                    </div>
                </td>
            </tr>
            <tr>
                <td><strong>Distribución de puntos por acción</strong></td>
                <td colspan="2">
                    <div class="stats-top">
                        <ul>${(p.distribucionPorAccion || []).map(a =>
                            `<li><strong>${a.action}</strong>: ${a.totalPoints} pts (${a.count} veces)</li>`
                        ).join('') || '<li>Sin datos</li>'}</ul>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('stats-puntos-body').innerHTML = html;
    },

    // Renderizar tabla de soporte
    renderizarSoporte: function() {
        const s = this.datos.support;
        const topUsers = s.topUsers?.map(u =>
            `<li><strong>${u.userName}</strong>: ${u.ticketCount} tickets</li>`
        ).join('') || '<li>Sin datos</li>';

        const html = `
            <tr>
                <td><strong>Tickets abiertos</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.openTickets)}</td>
            </tr>
            <tr>
                <td><strong>Tickets cerrados</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.closedTickets)}</td>
            </tr>
            <tr>
                <td><strong>Tiempo promedio respuesta</strong></td>
                <td class="stat-valor">${s.avgResponseTimeHours.toFixed(1)} hs</td>
            </tr>
            <tr>
                <td><strong>Usuarios con más tickets</strong></td>
                <td>
                    <div class="stats-top">
                        <ul>${topUsers}</ul>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('stats-soporte-body').innerHTML = html;
    },

    // Renderizar tabla de crecimiento
    renderizarCrecimiento: function() {
        const g = this.datos.growth;
        const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const weekdayHtml = Object.entries(g.weekdayDistribution || {})
            .map(([day, count]) => `<li><strong>${day}</strong>: ${count} votos</li>`)
            .join('');

        const hours = Object.entries(g.hourDistribution || {})
            .map(([hour, count]) => {
                const utcHour = parseInt(hour);
                const localHour = ((utcHour - 3) + 24) % 24;
                return `<li><strong>${localHour}:00 hs</strong>: ${count} votos</li>`;
            })
            .join('');

        const html = `
            <tr>
                <td><strong>Crecimiento de usuarios</strong></td>
                <td class="stat-valor">${g.userGrowth.toFixed(1)}%</td>
                <td class="stat-porcentaje ${g.userGrowth >= 0 ? 'positive' : 'negative'}">
                    ${g.userGrowth >= 0 ? '▲' : '▼'}
                </td>
            </tr>
            <tr>
                <td><strong>Crecimiento de votos</strong></td>
                <td class="stat-valor">${g.voteGrowth.toFixed(1)}%</td>
                <td class="stat-porcentaje ${g.voteGrowth >= 0 ? 'positive' : 'negative'}">
                    ${g.voteGrowth >= 0 ? '▲' : '▼'}
                </td>
            </tr>
            <tr>
                <td><strong>Crecimiento de canjes</strong></td>
                <td class="stat-valor">${g.redemptionGrowth.toFixed(1)}%</td>
                <td class="stat-porcentaje ${g.redemptionGrowth >= 0 ? 'positive' : 'negative'}">
                    ${g.redemptionGrowth >= 0 ? '▲' : '▼'}
                </td>
            </tr>
            <tr>
                <td><strong>Tasa de abandono (churn)</strong></td>
                <td class="stat-valor">${g.churnRate.toFixed(1)}%</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Registro → Voto</strong></td>
                <td class="stat-valor">${g.registrationToVoteRate.toFixed(1)}%</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Voto → Comentario</strong></td>
                <td class="stat-valor">${g.voteToCommentRate.toFixed(1)}%</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Voto → Canje</strong></td>
                <td class="stat-valor">${g.voteToRedemptionRate.toFixed(1)}%</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Canje → Segundo canje</strong></td>
                <td class="stat-valor">${g.redemptionToSecondRate.toFixed(1)}%</td>
                <td></td>
            </tr>
            <tr>
                <td colspan="3">
                    <div class="stats-grid">
                        <div class="stats-col">
                            <h4>📅 Días con más votos</h4>
                            <ul>${weekdayHtml || '<li>Sin datos</li>'}</ul>
                        </div>
                        <div class="stats-col">
                            <h4>🕐 Horas con más votos</h4>
                            <ul>${hours || '<li>Sin datos</li>'}</ul>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('stats-crecimiento-body').innerHTML = html;
    },

    // Renderizar tabla de premium y sorteos
    renderizarPremiumSorteos: function() {
        const p = this.datos.premium;
        if (!p) return;
        const html = `
            <tr>
                <td><strong>Total premios premium</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.totalPremiumRewards)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Premios premium activos</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.activePremiumRewards)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Total sorteos</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.totalSorteos)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Sorteos ejecutados</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.sorteosEjecutados)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Sorteos pendientes</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.sorteosPendientes)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Total canjeables premium</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.totalCanjeables)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Canjeables activos</strong></td>
                <td class="stat-valor">${this.formatearNumero(p.canjeablesActivos)}</td>
                <td></td>
            </tr>
        `;
        document.getElementById('stats-premium-body').innerHTML = html;
    },

    // Renderizar tabla de suscripciones
    renderizarSuscripciones: function() {
        const s = this.datos.subscriptions;
        if (!s) return;
        const html = `
            <tr>
                <td><strong>Total suscripciones</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.totalSuscripciones)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Suscripciones activas</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.suscripcionesActivas)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Suscripciones canceladas</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.suscripcionesCanceladas)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Suscripciones pendientes</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.suscripcionesPendientes)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Nuevas este período</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.nuevasSuscripciones)}</td>
                <td></td>
            </tr>
            <tr>
                <td><strong>Usuarios suscriptos activos</strong></td>
                <td class="stat-valor">${this.formatearNumero(s.usuariosSuscriptos)}</td>
                <td></td>
            </tr>
        `;
        document.getElementById('stats-suscripciones-body').innerHTML = html;
    },

    // Renderizar tabla de ganancias
        renderizarGanancias: function() {
            const r = this.datos.revenue;
            if (!r) return;

            const tendenciaHtml = (r.tendenciaMensual || []).length > 0
                ? r.tendenciaMensual.map(m => `
                    <tr>
                        <td>${m.mes}</td>
                        <td class="stat-valor">$${Number(m.total).toLocaleString('es-AR')}</td>
                    </tr>`).join('')
                : '<tr><td colspan="2" style="color:#999;">Sin datos aún</td></tr>';

            const html = `
                <tr>
                    <td><strong>Ingreso total histórico</strong></td>
                    <td class="stat-valor">$${Number(r.ingresoTotalHistorico).toLocaleString('es-AR')}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>Ingreso del período</strong></td>
                    <td class="stat-valor">$${Number(r.ingresoPeriodo).toLocaleString('es-AR')}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>MRR (ingreso mensual recurrente)</strong></td>
                    <td class="stat-valor">$${Number(r.mrr).toLocaleString('es-AR')}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>Pagos aprobados (período)</strong></td>
                    <td class="stat-valor">${r.pagosAprobadosPeriodo}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>Pagos rechazados (período)</strong></td>
                    <td class="stat-valor">${r.pagosRechazadosPeriodo}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>Pagos pendientes (período)</strong></td>
                    <td class="stat-valor">${r.pagosPendientesPeriodo}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>Tasa de aprobación</strong></td>
                    <td class="stat-valor">${r.tasaAprobacion.toFixed(1)}%</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td><strong>Pagos aprobados histórico</strong></td>
                    <td class="stat-valor">${r.pagosAprobadosTotal}</td>
                    <td colspan="2"></td>
                </tr>
                <tr>
                    <td colspan="4">
                        <div class="stats-grid">
                            <div class="stats-col">
                                <h4>📅 Tendencia mensual (últimos 12 meses)</h4>
                                <table class="admin-table" style="margin-top:0.5rem;">
                                    <thead><tr><th>Mes</th><th>Recaudado</th></tr></thead>
                                    <tbody>${tendenciaHtml}</tbody>
                                </table>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('stats-ganancias-body').innerHTML = html;
        },

        // Renderizar tabla de guardadas
                renderizarGuardadas: function() {
                    const w = this.datos.watchlist;
                    if (!w) return;

                    document.getElementById('stats-guardadas-body').innerHTML = `
                        <div class="stats-subtabs">
                            <button class="stats-subtab-btn active" data-subtab="total" onclick="adminEstadisticas.cambiarSubtabGuardadas('total', this)">Total</button>
                            <button class="stats-subtab-btn" data-subtab="peliculas" onclick="adminEstadisticas.cambiarSubtabGuardadas('peliculas', this)">Películas</button>
                            <button class="stats-subtab-btn" data-subtab="series" onclick="adminEstadisticas.cambiarSubtabGuardadas('series', this)">Series</button>
                        </div>
                        <div id="stats-guardadas-subtab-total" class="stats-subtab-panel active">
                            ${this.renderGuardadasTotal(w)}
                        </div>
                        <div id="stats-guardadas-subtab-peliculas" class="stats-subtab-panel">
                            ${this.renderGuardadasSeccion(w.peliculas, '🎬 Top 10 películas más guardadas', 'peliculas')}
                        </div>
                        <div id="stats-guardadas-subtab-series" class="stats-subtab-panel">
                            ${this.renderGuardadasSeccion(w.series, '📺 Top 10 series más guardadas', 'series')}
                        </div>
                    `;
                },

                cambiarSubtabGuardadas: function(tab, btn) {
                    document.querySelectorAll('#stats-guardadas-body .stats-subtab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.querySelectorAll('#stats-guardadas-body .stats-subtab-panel').forEach(p => p.classList.remove('active'));
                    document.getElementById('stats-guardadas-subtab-' + tab).classList.add('active');
                },

                renderGuardadasTotal: function(w) {
                    const t = w.total;
                    return `
                        <div class="stats-hero-numero">${this.formatearNumero(t.totalGuardadas)}</div>
                        <div class="stats-hero-label">items guardados (histórico)</div>

                        <div class="stats-split-bar">
                            <div class="fill-peliculas" style="width:${w.pctPeliculas}%;"></div>
                            <div class="fill-series" style="width:${w.pctSeries}%;"></div>
                        </div>
                        <div class="stats-split-legend">
                            <span><span class="dot" style="background:#e50914;"></span>Películas · ${w.pctPeliculas.toFixed(0)}%</span>
                            <span><span class="dot" style="background:#324c89;"></span>Series · ${w.pctSeries.toFixed(0)}%</span>
                        </div>

                        <div class="stats-kpi-row">
                            <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(t.usuariosConLista)}</div><div class="kpi-label">Usuarios con lista</div></div>
                            <div class="stats-kpi-card"><div class="kpi-valor">${t.promedioPorUsuario}</div><div class="kpi-label">Promedio por usuario</div></div>
                        </div>
                        <p style="font-size:0.72rem;color:#999;margin-top:-0.3rem;">Totales históricos — no se filtran por el selector de fecha. "Usuarios con lista" puede contar dos veces a quien guardó de ambos tipos.</p>
                    `;
                },

                renderGuardadasSeccion: function(s, tituloTop, color) {
                    const acento = color === 'series' ? '#324c89' : '#e50914';

                    const topContent = (s.topContent || []).map((p, i) =>
                        `<li><strong>${i + 1}. ${p.titulo}</strong>: ${p.total} usuarios</li>`
                    ).join('') || '<li>Sin datos</li>';

                    const generos = (s.generos || []).map(g =>
                        `<li><strong>${g.genero}</strong>: ${g.total} (${g.porcentaje}%)</li>`
                    ).join('') || '<li>Sin datos</li>';

                    return `
                        <div class="stats-hero-numero" style="color:${acento};">${this.formatearNumero(s.totalGuardadas)}</div>
                        <div class="stats-hero-label">items guardados</div>

                        <div class="stats-kpi-row">
                            <div class="stats-kpi-card"><div class="kpi-valor">${this.formatearNumero(s.usuariosConLista)}</div><div class="kpi-label">Usuarios con lista</div></div>
                            <div class="stats-kpi-card"><div class="kpi-valor">${s.promedioPorUsuario}</div><div class="kpi-label">Promedio por usuario</div></div>
                        </div>

                        <div class="stats-votos-cols">
                            <div class="stats-votos-col-izq">
                                <div class="stats-top" style="border-top-color:${acento};">
                                    <h4>${tituloTop}</h4>
                                    <ul>${topContent}</ul>
                                </div>
                            </div>
                            <div class="stats-votos-col-der">
                                <div class="stats-top" style="border-top-color:${acento};">
                                    <h4>🎭 Géneros más guardados</h4>
                                    <ul>${generos}</ul>
                                </div>
                            </div>
                        </div>
                    `;
                },

        // Formatear números grandes (ej: 1234 → 1.2K)
        formatearNumero: function(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toLocaleString() || '0';
    },

    formatearCategoria: function(key) {
            const map = {
                PELICULAS_SERIES: 'Películas',
                LO_QUE_VIENE: 'Estrenos',
                GENTE_CINE: 'Gente de cine',
                PREMIOS: 'Premios',
                INDUSTRIA: 'Industria',
                EXPERIENCIA: 'Experiencia',
                ARTE_CULTURA: 'Arte y cultura',
                EVENTOS: 'Eventos'
            };
            return map[key] || key;
        },

    // Obtener icono de tendencia
    getTendenciaIcon: function(valor) {
        if (valor > 0) return '<span class="trend-up">📈</span>';
        if (valor < 0) return '<span class="trend-down">📉</span>';
        return '<span class="trend-flat">➡️</span>';
    }
};

// Inicializar cuando se cambie a la sección
document.addEventListener('DOMContentLoaded', function() {
    if (typeof adminEstadisticas !== 'undefined') {
        adminEstadisticas.init();
    }
});