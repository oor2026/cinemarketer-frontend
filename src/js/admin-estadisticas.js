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
        this.cargarEstadisticas();
    },

    // Cambiar pestaña
    cambiarPestana: function(pestana, element) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');

        document.querySelectorAll('.stats-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`stats-${pestana}`).classList.add('active');
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
            this.renderizarPremios();
            this.renderizarPuntos();
            this.renderizarSoporte();
            this.renderizarCrecimiento();

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
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-content">
                    <span class="stat-value">${this.formatearNumero(s.totalUsers)}</span>
                    <span class="stat-label">Usuarios totales</span>
                </div>
                <div class="stat-trend ${s.userGrowth >= 0 ? 'positive' : 'negative'}">
                    ${s.userGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.userGrowth).toFixed(1)}%
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-thumbs-up"></i></div>
                <div class="stat-content">
                    <span class="stat-value">${s.approvalRate.toFixed(1)}%</span>
                    <span class="stat-label">Aprobación</span>
                </div>
                <div class="stat-trend ${s.approvalGrowth >= 0 ? 'positive' : 'negative'}">
                    ${s.approvalGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.approvalGrowth).toFixed(1)}%
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-gift"></i></div>
                <div class="stat-content">
                    <span class="stat-value">${this.formatearNumero(s.totalRedemptions)}</span>
                    <span class="stat-label">Canjes</span>
                </div>
                <div class="stat-trend ${s.redemptionGrowth >= 0 ? 'positive' : 'negative'}">
                    ${s.redemptionGrowth >= 0 ? '▲' : '▼'} ${Math.abs(s.redemptionGrowth).toFixed(1)}%
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-headset"></i></div>
                <div class="stat-content">
                    <span class="stat-value">${s.openTicketsCount}</span>
                    <span class="stat-label">Tickets abiertos</span>
                </div>
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
        `;
        document.getElementById('stats-usuarios-body').innerHTML = html;
    },

    // Renderizar tabla de votaciones
    renderizarVotos: function() {
        const v = this.datos.votes;
        const topPelis = v.topMovies?.map(m =>
            `<li><strong>${m.title}</strong>: ${m.votes} votos (${m.likes} 👍 | ${m.dislikes} 👎)</li>`
        ).join('') || '<li>Sin datos</li>';

        const topUsers = v.topUsers?.map(u =>
            `<li><strong>${u.name}</strong>: ${u.votes} votos</li>`
        ).join('') || '<li>Sin datos</li>';

        const html = `
            <tr>
                <td><strong>Total de votos</strong></td>
                <td class="stat-valor">${this.formatearNumero(v.totalVotes)}</td>
                <td rowspan="4">
                    <div class="stats-top">
                        <h4>🎬 Top 5 películas</h4>
                        <ul>${topPelis}</ul>
                    </div>
                </td>
            </tr>
            <tr>
                <td><strong>Total de likes</strong></td>
                <td class="stat-valor">${this.formatearNumero(v.totalLikes)}</td>
            </tr>
            <tr>
                <td><strong>Total de dislikes</strong></td>
                <td class="stat-valor">${this.formatearNumero(v.totalDislikes)}</td>
            </tr>
            <tr>
                <td><strong>Ratio de aprobación</strong></td>
                <td class="stat-valor">${v.approvalRate.toFixed(1)}%</td>
            </tr>
            <tr>
                <td><strong>Top 5 usuarios</strong></td>
                <td colspan="2">
                    <div class="stats-top">
                        <ul>${topUsers}</ul>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('stats-votos-body').innerHTML = html;
    },

    // Renderizar tabla de comentarios
    renderizarComentarios: function() {
        const c = this.datos.comments;
        const topPelis = c.topMovies?.map(m =>
            `<li><strong>${m.title}</strong>: ${m.comments} comentarios</li>`
        ).join('') || '<li>Sin datos</li>';

        const topUsers = c.topUsers?.map(u =>
            `<li><strong>${u.name}</strong>: ${u.comments} comentarios</li>`
        ).join('') || '<li>Sin datos</li>';

        const html = `
            <tr>
                <td><strong>Total de comentarios</strong></td>
                <td class="stat-valor">${this.formatearNumero(c.totalComments)}</td>
                <td rowspan="3">
                    <div class="stats-top">
                        <h4>🎬 Top 5 películas</h4>
                        <ul>${topPelis}</ul>
                    </div>
                </td>
            </tr>
            <tr>
                <td><strong>Comentarios por día</strong></td>
                <td class="stat-valor">${c.commentsPerDay.toFixed(1)}</td>
            </tr>
            <tr>
                <td><strong>Top usuarios</strong></td>
                <td colspan="2">
                    <div class="stats-top">
                        <ul>${topUsers}</ul>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('stats-comentarios-body').innerHTML = html;
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

    // Formatear números grandes (ej: 1234 → 1.2K)
    formatearNumero: function(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toLocaleString() || '0';
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