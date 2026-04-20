// ==============================================
// mis-puntos.js - Módulo de historial de puntos
// ==============================================

// ==============================================
// ESTADO DEL MÓDULO
// ==============================================
const puntosState = {
    currentPage:      1,
    totalPages:       1,
    currentFilter:    'all',
    currentDateFilter: 'all'
};

// ==============================================
// FUNCIÓN PRINCIPAL - CARGAR HISTORIAL
// ==============================================
window.loadTransactions = async function(page = 1, filter = 'all') {
    const token = localStorage.getItem('token');
    if (!token) return;

    const lista       = document.getElementById('transactionsList');
    const noTx        = document.getElementById('noTransactions');
    const pagination  = document.getElementById('pagination');

    if (!lista) return;

    lista.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando historial...</p>
        </div>`;

    try {
        const params = new URLSearchParams({ filter, page, size: 10 });
        const response = await fetch(`${CONFIG.API_URL}/users/me/points/history?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        // Guardar estado de paginación
        puntosState.currentPage  = data.currentPage;
        puntosState.totalPages   = data.totalPages;
        puntosState.currentFilter = filter;

        // Actualizar resumen
        document.getElementById('totalPoints').textContent     = data.totalPoints    ?? 0;
        document.getElementById('pointsEarned').textContent    = data.totalEarned    ?? 0;
        document.getElementById('pointsSpent').textContent     = data.totalSpent     ?? 0;
        document.getElementById('thisMonthPoints').textContent = data.earnedThisMonth ?? 0;

        // Actualizar paginación
        document.getElementById('pageInfo').textContent = `Página ${data.currentPage} de ${data.totalPages || 1}`;
        document.querySelector('.page-btn:first-child').disabled = data.currentPage <= 1;
        document.querySelector('.page-btn:last-child').disabled  = data.currentPage >= data.totalPages;

        // Sin transacciones
        if (!data.transactions || data.transactions.length === 0) {
            lista.style.display      = 'none';
            noTx.style.display       = 'block';
            pagination.style.display = 'none';
            return;
        }

        lista.style.display      = 'block';
        noTx.style.display       = 'none';
        pagination.style.display = 'flex';

        // Renderizar transacciones — aplicar filtro de fecha si corresponde
        const ahora  = new Date();
        const hoy    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

        const limites = {
            'today': hoy,
            'week':  new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000),
            'month': new Date(ahora.getFullYear(), ahora.getMonth(), 1),
            'year':  new Date(ahora.getFullYear(), 0, 1)
        };

        const dateFilter = puntosState.currentDateFilter || 'all';
        const desde = limites[dateFilter] || null;

        const transacciones = desde
            ? data.transactions.filter(t => new Date(t.createdAt) >= desde)
            : data.transactions;

        if (transacciones.length === 0) {
            lista.style.display      = 'none';
            noTx.style.display       = 'block';
            pagination.style.display = 'none';
            return;
        }

        lista.innerHTML = transacciones.map(t => {
            const esGanado  = t.type === 'EARNED';
            const icono     = getIconForAction(t.action);
            const fecha     = new Date(t.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="transaction-item">
                    <div class="transaction-icon ${esGanado ? 'earned' : 'spent'}">
                        <i class="fas ${icono}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-concept">${getLabelForAction(t.action)}</div>
                        <div class="transaction-date">
                            <i class="fas fa-calendar-alt"></i> ${fecha}
                        </div>
                        <small>${t.referenceTitle || ''}</small>
                    </div>
                    <div class="transaction-amount ${esGanado ? 'earned' : 'spent'}">
                        ${esGanado ? '+' : '-'}${t.points}
                        <i class="fas fa-coins"></i>
                    </div>
                </div>`;
        }).join('');

    } catch (error) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #e50914;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem;"></i>
                <p>Error al cargar el historial</p>
            </div>`;
    }
};

// ==============================================
// HELPERS - ICONO Y ETIQUETA POR ACCIÓN
// ==============================================
function getIconForAction(action) {
    const icons = {
        VOTE_MOVIE:        'fa-thumbs-up',
        VOTE_CINEMA:       'fa-building',
        COMMENT_MOVIE:     'fa-comment',
        REWARD_REDEMPTION: 'fa-ticket-alt'
    };
    return icons[action] || 'fa-coins';
}

function getLabelForAction(action) {
    const labels = {
        VOTE_MOVIE:        'Voto en película',
        VOTE_CINEMA:       'Voto en cine',
        COMMENT_MOVIE:     'Comentario en película',
        REWARD_REDEMPTION: 'Canje de premio'
    };
    return labels[action] || action;
}

// ==============================================
// FILTROS
// ==============================================
window.filterPoints = function(filter) {
    puntosState.currentFilter = filter;
    puntosState.currentPage   = 1;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    window.loadTransactions(1, filter);
};

window.filterByDate = function(dateFilter) {
    puntosState.currentDateFilter = dateFilter;
    puntosState.currentPage = 1;
    window.loadTransactions(1, puntosState.currentFilter);
};

// ==============================================
// PAGINACIÓN
// ==============================================
window.changePage = function(direction) {
    let newPage = puntosState.currentPage;
    if (direction === 'prev' && newPage > 1)                        newPage--;
    if (direction === 'next' && newPage < puntosState.totalPages)   newPage++;
    if (newPage === puntosState.currentPage) return;

    puntosState.currentPage = newPage;
    window.loadTransactions(newPage, puntosState.currentFilter);
    document.querySelector('.points-container')?.scrollIntoView({ behavior: 'smooth' });
};

// ==============================================
// INICIALIZACIÓN
// ==============================================
window['init_mis-puntos'] = function() {
    window.loadTransactions(1, 'all');
};
