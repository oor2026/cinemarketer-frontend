window['init_club-beneficios'] = async function() {
    // Se espera el saldo ANTES de armar el catálogo — si no, la primera
    // carga podía mostrar "Necesitás NaN pts más" (el catálogo terminaba
    // de cargar antes de que el saldo estuviera disponible).
    await window._cargarPuntosClubBeneficios();
    window._cargarFreeClubBeneficios();
    window._cargarCanjeadosClubBeneficios();
};

window._cargarPuntosClubBeneficios = async function() {
    try {
        const profile = await API.getProfile();
        const el = document.getElementById('clubPuntosDisponibles');
        if (el) el.textContent = profile.totalPoints || 0;
        window._clubPuntosActuales = profile.totalPoints || 0;
    } catch (e) {}
};

window._clubPremiumYaCargado = false;

window.cambiarTabClubBeneficios = function(tab, btn) {
    document.querySelectorAll('.club-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.club-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tab === 'premium' ? 'clubPanelPremium' : 'clubPanelFree').classList.add('active');

    document.getElementById('clubFiltrosFree').style.display = tab === 'free' ? 'flex' : 'none';
    document.getElementById('clubFiltrosPremium').style.display = tab === 'premium' ? 'flex' : 'none';

    if (tab === 'premium' && !window._clubPremiumYaCargado) {
        window._clubPremiumYaCargado = true;
        window._cargarPremiumClubBeneficios();
    }
};

window._clubFreeEstado = 'activos';
window._clubFreeTipo = 'todos';
window._clubFreeOrden = 'puntos-menor';

function _clubEstaResuelto(p) {
    return p.isExpired || !p.hasStock;
}

window._cargarFreeClubBeneficios = async function() {
    const grid = document.getElementById('clubGridFree');
    const token = localStorage.getItem('token');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/rewards/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        window._clubFreeOriginal = await res.json();
        window._pintarFreeClubFiltrado();
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center;color:#e50914;grid-column:1/-1;padding:2rem;">Error al cargar los premios.</p>';
    }
};

window._filtrarClubTipo = function(catalogo, valor) {
    if (catalogo === 'free') {
        window._clubFreeTipo = valor;
        window._pintarFreeClubFiltrado();
    } else {
        window._clubPremiumTipo = valor;
        window._pintarPremiumClubFiltrado();
    }
};

// "Agotados" viaja en el mismo select que el orden — al elegirlo,
// cambia el ESTADO (no es un criterio de orden real); al elegir
// cualquiera de los otros 3, vuelve a "activos" automáticamente.
window._ordenarClub = function(tipo, valor) {
    const esFree = tipo === 'free';
    if (valor === 'agotados') {
        if (esFree) { window._clubFreeEstado = 'agotados'; window._pintarFreeClubFiltrado(); }
        else { window._clubPremiumEstado = 'agotados'; window._pintarPremiumClubFiltrado(); }
    } else {
        if (esFree) {
            window._clubFreeEstado = 'activos';
            window._clubFreeOrden = valor;
            window._pintarFreeClubFiltrado();
        } else {
            window._clubPremiumEstado = 'activos';
            window._clubPremiumOrden = valor;
            window._pintarPremiumClubFiltrado();
        }
    }
};

function _clubAplicarFiltroYOrden(lista, estado, tipo, orden, esResueltoFn) {
    let resultado = lista.filter(p => estado === 'activos' ? !esResueltoFn(p) : esResueltoFn(p));

    if (tipo === 'entradas') resultado = resultado.filter(p => p.rewardType === 'TICKET');
    else if (tipo === 'merchandising') resultado = resultado.filter(p => p.rewardType === 'MERCHANDISING');
    else if (tipo === 'descuento') resultado = resultado.filter(p => p.rewardType === 'DESCUENTO');
    else if (tipo === 'experiencia') resultado = resultado.filter(p => p.rewardType === 'EXPERIENCIA');
    else if (tipo === 'sorteos') resultado = resultado.filter(p => p.type === 'SORTEO');

    if (orden === 'puntos-menor') resultado.sort((a, b) => a.pointsRequired - b.pointsRequired);
    else if (orden === 'puntos-mayor') resultado.sort((a, b) => b.pointsRequired - a.pointsRequired);
    else if (orden === 'nombre') resultado.sort((a, b) => a.name.localeCompare(b.name));

    return resultado;
}

window._pintarFreeClubFiltrado = function() {
    const grid = document.getElementById('clubGridFree');
    const premios = _clubAplicarFiltroYOrden(window._clubFreeOriginal || [], window._clubFreeEstado, window._clubFreeTipo, window._clubFreeOrden, _clubEstaResuelto);

    if (premios.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;padding:2rem;">No hay premios para este filtro.</p>';
        window._clubFreeCache = [];
        return;
    }

    window._clubFreeCache = premios;

            grid.innerHTML = premios.map(p => {
                const imagen = p.imageUrl
                    ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:0.5rem;">`
                    : `<i class="fas fa-gift" style="font-size:2.5rem;color:#e50914;"></i>`;

                const badgeTipo = p.rewardType === 'TICKET' ? '<span class="premio-badge">🎟️ Entrada</span>'
                    : p.rewardType === 'DESCUENTO' ? '<span class="premio-badge">🏷️ Descuento</span>'
                    : p.rewardType === 'EXPERIENCIA' ? '<span class="premio-badge">🎟️ Experiencia</span>'
                    : '<span class="premio-badge">🎁 Merchandising</span>';

                let btnLabel, btnDisabled;
                if (!p.hasStock) { btnLabel = 'Agotado'; btnDisabled = true; }
                else if (p.isExpired) { btnLabel = 'Expirado'; btnDisabled = true; }
                else if (!p.canRedeem) { btnLabel = `Necesitás ${p.pointsRequired - window._clubPuntosActuales} pts más`; btnDisabled = true; }
                else { btnLabel = '¡Quiero canjearlo!'; btnDisabled = false; }

                return `
                    <div class="premio-card ${!p.hasStock || p.isExpired ? 'agotado' : ''}" onclick="window._abrirModalPremioClub(${p.id}, 'free')" style="cursor:pointer;">
                        <div class="premio-imagen">${imagen}${badgeTipo}</div>
                            <div class="premio-info">
                                <h4 class="premio-titulo">${p.name}</h4>
                                <p class="premio-descripcion">${p.description || ''}</p>
                                <div class="premio-detalles">
                                    <span class="premio-puntos"><i class="fas fa-coins"></i> ${p.pointsRequired} pts</span>
                                    <span class="premio-stock"><i class="fas fa-boxes"></i> ${p.stock} disponibles</span>
                                </div>
                                <button class="btn-canjear" onclick="event.stopPropagation(); window._canjearClubBeneficios(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.pointsRequired})" ${btnDisabled ? 'disabled' : ''}>
                                    ${btnLabel}
                                </button>
                                                </div>
                                            </div>`;
                                    }).join('');
    window._inicializarCarruselClub('clubGridFree');
                            };

// Versión simple del canje — sin el modal de confirmación rico de
// mis-premios.js todavía (se porta en un paso siguiente).
window._canjearClubBeneficios = function(rewardId, rewardName, pointsRequired) {
    window._abrirConfirmClub(`¿Canjear "${rewardName}" por ${pointsRequired} pts?`, async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${CONFIG.API_URL}/redemptions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId })
            });
            if (!res.ok) { alert('No se pudo canjear. Probá de nuevo.'); return; }
            window._abrirAvisoClub('¡Listo! 🎉', `Canjeaste "${rewardName}". Revisá tu historial de canjes.`);
            window._cargarPuntosClubBeneficios();
            window._cargarFreeClubBeneficios();
        } catch (e) {
            alert('Error al canjear. Probá de nuevo.');
        }
    });
};

window.abrirDetalleMisPuntos = function() {
    document.getElementById('modalDetalleClubPuntos').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    window._clubPuntosFiltro = 'all';
    window._clubPuntosFiltroFecha = 'all';
    window._clubPuntosPagina = 1;
    window._cargarDetalleClubPuntos();
};

window._cerrarDetalleClubPuntos = function(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modalDetalleClubPuntos').style.display = 'none';
    document.body.style.overflow = '';
};

window._filtrarPuntosClub = function(filtro, btn) {
    window._clubPuntosFiltro = filtro;
    window._clubPuntosPagina = 1;
    document.querySelectorAll('.club-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window._cargarDetalleClubPuntos();
};

window._filtrarPuntosPorFechaClub = function(valor) {
    window._clubPuntosFiltroFecha = valor;
    window._clubPuntosPagina = 1;
    window._cargarDetalleClubPuntos();
};

// window.X en vez de const — un const de nivel superior no se puede
// re-declarar cuando el script se re-ejecuta al revisitar el módulo
// (cosa que SIEMPRE pasa ahora, a propósito, por el fix del router).
// Esa colisión tiraba un SyntaxError que mataba TODO el archivo antes
// de ejecutar una sola línea — por eso el filtro nunca se reseteaba:
// ni siquiera llegaba a correr el reset, el script entero fallaba al
// parsear.
window.CLUB_ICONOS_ACCION = {
    VOTE_MOVIE: 'fa-thumbs-up', VOTE_CINEMA: 'fa-building', VOTE_SERIES: 'fa-thumbs-up',
    COMMENT_MOVIE: 'fa-comment', COMMENT_SERIES: 'fa-comment',
    RECOMMEND_MOVIE: 'fa-envelope', RECOMMEND_SERIES: 'fa-envelope',
    REWARD_REDEMPTION: 'fa-ticket-alt', RECEIVE_MERECE_PUNTO: 'fa-star', REVERT_MERECE_PUNTO: 'fa-star',
    ADMIN_GRANT: 'fa-gift', PUBLISH_POST: 'fa-pen-alt', RECEIVE_BANCO_POST: 'fa-fist-raised',
    RECEIVE_MERECE_POST: 'fa-star', TRIVIA_ANSWER: 'fa-question-circle', TRIVIA_SERIES_ANSWER: 'fa-question-circle'
};
window.CLUB_ETIQUETAS_ACCION = {
    VOTE_MOVIE: 'Voto en película', VOTE_CINEMA: 'Voto en cine', VOTE_SERIES: 'Voto en serie',
    COMMENT_MOVIE: 'Comentario en película', COMMENT_SERIES: 'Comentario en serie',
    RECOMMEND_MOVIE: 'Recomendación de película', RECOMMEND_SERIES: 'Recomendación de serie',
    REWARD_REDEMPTION: 'Canje de premio', RECEIVE_MERECE_PUNTO: '¡Merecés un punto!',
    REVERT_MERECE_PUNTO: 'Reversión de punto', ADMIN_GRANT: 'Regalo de puntos',
    PUBLISH_POST: 'Publicación en Comunidad', RECEIVE_BANCO_POST: 'Te bancaron una publicación',
    RECEIVE_MERECE_POST: 'Merecés un punto en publicación', PUBLICATION_SANCTION: 'Sanción por moderación',
    TRIVIA_ANSWER: 'Trivia diaria de películas', TRIVIA_SERIES_ANSWER: 'Trivia diaria de series'
};

window._cargarDetalleClubPuntos = async function() {
    const token = localStorage.getItem('token');
    const lista = document.getElementById('clubTransactionsList');
    lista.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const params = new URLSearchParams({ filter: window._clubPuntosFiltro, page: window._clubPuntosPagina, size: 10 });
        const res = await fetch(`${CONFIG.API_URL}/users/me/points/history?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const fmt = n => (n ?? 0).toLocaleString('es-AR');
        document.getElementById('clubAccumulatedPoints').textContent = fmt(data.accumulatedPoints ?? data.earnedThisMonth);
        document.getElementById('clubRedeemedThisMonth').textContent = fmt(data.redeemedThisMonth ?? 0);
        document.getElementById('clubTotalRedeemed').textContent = fmt(data.totalRedeemed ?? data.totalSpent ?? 0);

        if (!data.transactions || data.transactions.length === 0) {
            lista.innerHTML = '<p style="text-align:center;color:#999;padding:1.5rem 0;">No hay transacciones para este filtro.</p>';
            document.getElementById('clubPuntosPaginacion').style.display = 'none';
            return;
        }

        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const limites = {
            today: hoy,
            week: new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000),
            month: new Date(ahora.getFullYear(), ahora.getMonth(), 1),
            year: new Date(ahora.getFullYear(), 0, 1)
        };
        const desde = limites[window._clubPuntosFiltroFecha] || null;
        const transacciones = desde ? data.transactions.filter(t => new Date(t.createdAt) >= desde) : data.transactions;

        if (transacciones.length === 0) {
            lista.innerHTML = '<p style="text-align:center;color:#999;padding:1.5rem 0;">No hay transacciones para este filtro.</p>';
            document.getElementById('clubPuntosPaginacion').style.display = 'none';
            return;
        }

                lista.innerHTML = transacciones.map(t => {
                    const esGanado = t.type === 'EARNED' && t.points > 0;
                    const icono = CLUB_ICONOS_ACCION[t.action] || 'fa-coins';
                    const fecha = new Date(t.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="club-transaction-item">
                            <div class="club-transaction-icon ${esGanado ? 'earned' : 'spent'}"><i class="fas ${icono}"></i></div>
                            <div class="club-transaction-details">
                                <div class="club-transaction-concept">${CLUB_ETIQUETAS_ACCION[t.action] || t.action}</div>
                                <div class="club-transaction-date">${fecha}</div>
                                ${t.referenceTitle ? `<small class="club-transaction-referencia">${t.referenceTitle}</small>` : ''}
                            </div>
                            <div class="club-transaction-amount ${esGanado ? 'earned' : 'spent'}">${esGanado ? '+' : '-'}${Math.abs(t.points)} <i class="fas fa-coins"></i></div>
                        </div>`;
                }).join('');

        window._renderPaginacionPuntosClub(data.currentPage, data.totalPages || 1);
    } catch (e) {
        lista.innerHTML = '<p style="text-align:center;color:#e50914;padding:1.5rem 0;">Error al cargar el historial.</p>';
    }
};

window._renderPaginacionPuntosClub = function(pagina, totalPaginas) {
    const paginacion = document.getElementById('clubPuntosPaginacion');
    if (totalPaginas <= 1) { paginacion.style.display = 'none'; return; }
    paginacion.style.display = 'flex';
    paginacion.innerHTML = `
        <button onclick="window._clubPuntosPagina=${pagina - 1}; window._cargarDetalleClubPuntos();" ${pagina === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
        <span>Página ${pagina} de ${totalPaginas}</span>
        <button onclick="window._clubPuntosPagina=${pagina + 1}; window._cargarDetalleClubPuntos();" ${pagina >= totalPaginas ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
    `;
};

window._moverCarruselClub = function(contenedorId, direccion) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const primeraCard = cont.querySelector('.premio-card');
    if (!primeraCard) return;
    const gap = 16; // 1rem
    const anchoTanda = (primeraCard.offsetWidth + gap) * 3;
    cont.scrollBy({ left: direccion * anchoTanda, behavior: 'smooth' });
};

// Muestra/oculta el chevron izquierdo según si ya se avanzó — arranca
// oculto siempre (scrollLeft = 0 al cargar), y aparece recién cuando
// hay contenido "atrás" para volver a ver. El derecho se oculta solo
// cuando se llegó al final real del scroll (no queda nada más a la
// derecha), no de forma fija.
window._actualizarChevronsClub = function(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const wrap = cont.closest('.club-carrusel-wrap');
    if (!wrap) return;
    const btnPrev = wrap.querySelector('.club-carrusel-nav-prev');
    const btnNext = wrap.querySelector('.club-carrusel-nav-next');
    if (!btnPrev || !btnNext) return;

    const alPrincipio = cont.scrollLeft <= 4; // pequeño margen por redondeo de píxeles
    const alFinal = cont.scrollLeft + cont.clientWidth >= cont.scrollWidth - 4;

    btnPrev.style.display = alPrincipio ? 'none' : 'flex';
    btnNext.style.display = alFinal ? 'none' : 'flex';
};

window._inicializarCarruselClub = function(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.addEventListener('scroll', () => window._actualizarChevronsClub(contenedorId));
    // Se corre una vez al terminar de pintar las tarjetas — así el
    // chevron derecho arranca oculto de una si el catálogo entero
    // entra sin necesidad de desplazar nada.
    requestAnimationFrame(() => window._actualizarChevronsClub(contenedorId));
    window._inicializarDotsClub(contenedorId);
};

// Dots de paginación acotados a un máximo de 3 (patrón clásico de
// paginación indicativa, no "1 dot por elemento"):
//   - 1 elemento  -> 1 dot
//   - 2 elementos -> 2 dots
//   - 3+ elementos -> siempre 3 dots: el primero representa "estoy
//     en el primer elemento", el último "estoy en el último
//     elemento", y el del medio representa cualquier posición
//     intermedia (simula que todavía falta para llegar al final).
window._inicializarDotsClub = function(contenedorId) {
    const cont = document.getElementById(contenedorId);
    const dotsId = contenedorId.replace('clubGrid', 'clubDots');
    const dotsCont = document.getElementById(dotsId);
    if (!cont || !dotsCont) return;

    const cards = cont.querySelectorAll('.premio-card');
    const total = cards.length;
    if (total <= 1) { dotsCont.innerHTML = ''; return; }

    const cantidadDots = Math.min(total, 3);
    dotsCont.innerHTML = Array.from({ length: cantidadDots }).map((_, i) =>
        `<span class="club-dot${i === 0 ? ' activo' : ''}" onclick="window._irADotClub('${contenedorId}', ${i})"></span>`
    ).join('');

    const actualizarDotsActivos = () => {
        const primeraCard = cont.querySelector('.premio-card');
        if (!primeraCard) return;
        const anchoCard = primeraCard.offsetWidth + 16; // + gap (1rem)
        const indiceActual = Math.round(cont.scrollLeft / anchoCard);

        let dotActivo;
        if (total <= 3) {
            dotActivo = indiceActual;
        } else if (indiceActual === 0) {
            dotActivo = 0;
        } else if (indiceActual >= total - 1) {
            dotActivo = 2;
        } else {
            dotActivo = 1; // cualquier posición intermedia
        }

        dotsCont.querySelectorAll('.club-dot').forEach((dot, i) => {
            dot.classList.toggle('activo', i === dotActivo);
        });
    };
    cont.addEventListener('scroll', actualizarDotsActivos);
};

window._irADotClub = function(contenedorId, indice) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const cards = cont.querySelectorAll('.premio-card');
    const total = cards.length;
    const primeraCard = cont.querySelector('.premio-card');
    if (!primeraCard) return;
    const anchoCard = primeraCard.offsetWidth + 16;

    // Con más de 3 elementos, el dot 0 y el último (2) saltan a los
    // extremos reales; el del medio (1, "en algún punto intermedio")
    // no representa una tarjeta fija, así que avanza una posición
    // desde donde esté el scroll actual.
    let indiceDestino;
    if (total <= 3) {
        indiceDestino = indice;
    } else if (indice === 0) {
        indiceDestino = 0;
    } else if (indice === 2) {
        indiceDestino = total - 1;
    } else {
        const indiceActual = Math.round(cont.scrollLeft / anchoCard);
        indiceDestino = Math.min(indiceActual + 1, total - 2);
    }

    cont.scrollTo({ left: indiceDestino * anchoCard, behavior: 'smooth' });
};

window._clubPremiumEstado = 'activos';
window._clubPremiumTipo = 'todos';
window._clubPremiumOrden = 'puntos-menor';

function _clubEstaResueltoEspecial(p) {
    if (p.type === 'SORTEO') return p.drawExecuted === true;
    return p.stock != null && p.stock <= 0;
}

window._cargarPremiumClubBeneficios = async function() {
    const grid = document.getElementById('clubGridPremium');
    const bannerNoPremium = document.getElementById('clubBannerNoPremium');
    const token = localStorage.getItem('token');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';

        let isPremium = false;
        try {
            const profile = await API.getProfile();
            isPremium = profile.premium === true;
        } catch (e) {}
        bannerNoPremium.style.display = isPremium ? 'none' : 'flex';
        const bannerSiPremium = document.getElementById('clubBannerSiPremium');
        if (bannerSiPremium) bannerSiPremium.style.display = isPremium ? 'flex' : 'none';
        window._clubEsPremium = isPremium;

    try {
        const res = await fetch(`${CONFIG.API_URL}/premium/rewards`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        window._clubPremiumOriginal = await res.json();
        window._pintarPremiumClubFiltrado();
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center;color:#e50914;grid-column:1/-1;padding:2rem;">Error al cargar los premios.</p>';
    }
};

window._pintarPremiumClubFiltrado = function() {
    const grid = document.getElementById('clubGridPremium');
    // Premium no tiene filtro por tipo (rewardType) — no existía en el
    // panel original de "Especiales", solo Activos/Agotados + orden.
        const premios = _clubAplicarFiltroYOrden(window._clubPremiumOriginal || [], window._clubPremiumEstado, window._clubPremiumTipo, window._clubPremiumOrden, _clubEstaResueltoEspecial);

    if (premios.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;padding:2rem;">No hay premios para este filtro.</p>';
        window._clubPremiumCache = [];
        return;
    }

        window._clubPremiumCache = premios;
        grid.innerHTML = premios.map(p => window._renderCardPremiumClub(p, window._clubEsPremium)).join('');
        window._inicializarCarruselClub('clubGridPremium');
    };

window._renderCardPremiumClub = function(p, isPremium) {
    const imagen = p.imageUrl
        ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:0.5rem;">`
        : `<i class="fas fa-star" style="font-size:2.5rem;color:#1a3a6b;"></i>`;

    const badgeTipo = p.type === 'SORTEO' ? '<span class="premio-badge sorteo-badge">🎲 Sorteo gratuito</span>'
        : p.type === 'DESCUENTO' ? '<span class="premio-badge">🏷️ Descuento</span>'
        : p.type === 'EXPERIENCIA' ? '<span class="premio-badge">🎟️ Experiencia</span>'
        : '<span class="premio-badge">⭐ Premio exclusivo</span>';

    const esSorteo = p.type === 'SORTEO';

    let infoExtra;
        if (esSorteo) {
            const fecha = p.drawDate
                ? new Date(p.drawDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'A confirmar';
            infoExtra = `
                <div class="premio-detalles">
                    <span><i class="fas fa-calendar-alt"></i> Sorteo: ${fecha}</span>
                    <span><i class="fas fa-users"></i> ${p.totalEntries || 0}</span>
                </div>`;
        } else {
        infoExtra = `
            <div class="premio-detalles">
                <span class="premio-puntos"><i class="fas fa-coins"></i> ${p.pointsRequired} pts</span>
                ${p.stock != null ? `<span class="premio-stock"><i class="fas fa-boxes"></i> ${p.stock} disponibles</span>` : ''}
            </div>`;
    }

    let boton;
    if (!isPremium) {
        boton = `<button class="btn-canjear" disabled style="background:#ccc;cursor:not-allowed;">🔒 Solo Premium</button>`;
    } else if (esSorteo) {
        if (p.drawExecuted) {
            boton = `<button class="btn-canjear" disabled>Sorteo finalizado</button>`;
        } else if (p.alreadyEntered) {
            boton = `<button class="btn-canjear" disabled>✓ Ya estás anotado</button>`;
        } else {
            boton = `<button class="btn-canjear" onclick="window._participarSorteoClub(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Participar</button>`;
        }
    } else {
        let btnLabel, btnDisabled;
        if (p.stock != null && p.stock <= 0) { btnLabel = 'Agotado'; btnDisabled = true; }
        else if (!p.canRedeem) { btnLabel = `Necesitás ${p.pointsRequired - window._clubPuntosActuales} pts más`; btnDisabled = true; }
        else { btnLabel = '¡Quiero canjearlo!'; btnDisabled = false; }
        boton = `<button class="btn-canjear" onclick="window._canjearPremiumClub(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.pointsRequired})" ${btnDisabled ? 'disabled' : ''}>${btnLabel}</button>`;
    }

            return `
                <div class="premio-card" onclick="window._abrirModalPremioClub(${p.id}, 'premium')" style="cursor:pointer;">
                    <div class="premio-imagen">${imagen}${badgeTipo}</div>
                <div class="premio-info">
                    <h4 class="premio-titulo">${p.name}</h4>
                    <p class="premio-descripcion">${p.description || ''}</p>
                    ${infoExtra}
                    <div onclick="event.stopPropagation();">${boton}</div>
                </div>
            </div>`;
};

window._participarSorteoClub = async function(rewardId, rewardName) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/premium/rewards/${rewardId}/enter`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { const err = await res.json(); alert(err.error || 'Error al anotarte al sorteo'); return; }
        window._abrirAvisoClub('¡Estás participando! 🎉', `Te anotaste al sorteo de "${rewardName}". ¡Mucha suerte!`);
        window._cargarPremiumClubBeneficios();
    } catch (e) {
        alert('Error al procesar tu participación. Intentá de nuevo.');
    }
};

window._canjearPremiumClub = function(rewardId, rewardName, pointsRequired) {
    window._abrirConfirmClub(`¿Canjear "${rewardName}" por ${pointsRequired} pts?`, async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${CONFIG.API_URL}/premium/rewards/${rewardId}/redeem`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Error al canjear el premio'); return; }
            const result = await res.json();
            window._abrirAvisoClub('¡Listo! 🎉', `Canjeaste "${rewardName}". Código: ${result.redemptionCode}`);
            window._cargarPuntosClubBeneficios();
            window._cargarPremiumClubBeneficios();
        } catch (e) {
            alert('Error al canjear el premio. Intentá de nuevo.');
        }
    });
};
// Mismo criterio que cargarCanjeados de mis-premios.js: mezcla 3
// fuentes distintas (canjes comunes, canjes premium, sorteos) en una
// sola lista ordenada por fecha — acá solo se muestran los 3 últimos.
window._cargarCanjeadosClubBeneficios = async function() {
    const lista = document.getElementById('clubCanjeadosList');
    const token = localStorage.getItem('token');

    // Los endpoints de Premium/sorteos ni se piden si el usuario no es
    // Premium — antes se pedían siempre, sabiendo de antemano que iban
    // a devolver 401 (ensuciando la consola sin necesidad).
    // window._clubEsPremium se setea al cargar el catálogo Premium; si
    // esta función corre antes de que eso pase, se asume false (más
    // seguro pedir de menos que pegarle a un endpoint sin permiso).
    const esPremium = window._clubEsPremium === true;

    try {
        const promesas = [
            fetch(`${CONFIG.API_URL}/redemptions/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        ];
        if (esPremium) {
            promesas.push(
                fetch(`${CONFIG.API_URL}/premium/redemptions/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${CONFIG.API_URL}/premium/rewards/draws/me`, { headers: { 'Authorization': `Bearer ${token}` } })
            );
        }
        const [resComunes, resPremium, resSorteos] = await Promise.all(promesas);

        const comunes = resComunes.ok ? await resComunes.json() : [];
        const premium = (esPremium && resPremium?.ok) ? await resPremium.json() : [];
        const sorteos = (esPremium && resSorteos?.ok) ? await resSorteos.json() : [];

        const premiumNorm = premium.map(p => ({
            rewardName: p.rewardName, rewardImageUrl: p.rewardImageUrl || null,
            pointsSpent: p.pointsSpent, redemptionCode: p.redemptionCode,
            redemptionDate: p.redeemedAt, status: p.status, tipoBadge: '⭐ Premium'
        }));

        const sorteosNorm = sorteos.map(s => ({
            rewardName: s.rewardName, rewardImageUrl: s.rewardImageUrl || null,
            pointsSpent: 0, redemptionCode: '-', redemptionDate: s.enteredAt,
            status: s.drawExecuted ? (s.won ? 'COMPLETED' : 'EXPIRED') : 'PENDING',
            tipoBadge: s.won ? '🏆 Ganador' : '🎲 Sorteo'
        }));

                const todos = [...comunes, ...premiumNorm, ...sorteosNorm]
                    .sort((a, b) => new Date(b.redemptionDate) - new Date(a.redemptionDate));

                window._clubCanjeadosCache = todos;

                if (todos.length === 0) {
                    lista.innerHTML = '<p style="text-align:center;color:#999;padding:1.5rem 0;">Aún no has canjeado premios. ¡Ganá puntos y canjealos por experiencias increíbles!</p>';
                    document.getElementById('clubCanjeadosPaginacion').style.display = 'none';
                    return;
                }

                window._pintarPaginaCanjeadosClub(1);
            } catch (e) {
                lista.innerHTML = '<p style="text-align:center;color:#e50914;padding:1.5rem 0;">Error al cargar tus canjes.</p>';
            }
        };

        window._clubCanjeadosPorPagina = 5;
        window._clubCanjeadosPaginaActual = 1;

        window._pintarPaginaCanjeadosClub = function(pagina) {
            const lista = document.getElementById('clubCanjeadosList');
            const todos = window._clubCanjeadosCache || [];
            const porPagina = window._clubCanjeadosPorPagina;
            const totalPaginas = Math.ceil(todos.length / porPagina);
            pagina = Math.max(1, Math.min(pagina, totalPaginas));
            window._clubCanjeadosPaginaActual = pagina;

            const inicio = (pagina - 1) * porPagina;
            const slice = todos.slice(inicio, inicio + porPagina);

            const ETIQUETAS = { PENDING: 'Pendiente', COMPLETED: 'Retirado', EXPIRED: 'Expirado', CANCELLED: 'Cancelado' };

            lista.innerHTML = slice.map(c => {
            const estado = c.status.toLowerCase();
            const etiqueta = ETIQUETAS[c.status] || c.status;
            const fecha = new Date(c.redemptionDate).toLocaleDateString('es-ES');
            const icono = c.rewardImageUrl
                ? `<img src="${c.rewardImageUrl}" alt="${c.rewardName}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
                : `<i class="fas fa-gift"></i>`;
            const badge = c.tipoBadge ? `<span style="font-size:0.72rem;background:#1a3a5c;color:gold;padding:2px 8px;border-radius:12px;margin-left:6px;">${c.tipoBadge}</span>` : '';
            const codigoRow = c.redemptionCode && c.redemptionCode !== '-' ? `<span><i class="fas fa-hashtag"></i> ${c.redemptionCode}</span>` : '';
            const puntosRow = c.pointsSpent > 0 ? `<span><i class="fas fa-coins"></i> ${c.pointsSpent} pts</span>` : '';

            return `
                <div class="canjeado-item ${estado}">
                    <div class="canjeado-imagen">${icono}</div>
                    <div class="canjeado-info">
                        <div class="canjeado-titulo">${c.rewardName}${badge}</div>
                        <div class="canjeado-metadata">
                            <span><i class="fas fa-calendar-alt"></i> ${fecha}</span>
                            ${puntosRow}
                            ${codigoRow}
                        </div>
                    </div>
                                        <div class="canjeado-estado estado-${estado}">${etiqueta}</div>
                                    </div>`;
                            }).join('');

                        window._renderPaginacionCanjeadosClub(pagina, totalPaginas);
                    };

                    window._renderPaginacionCanjeadosClub = function(pagina, totalPaginas) {
                        const paginacion = document.getElementById('clubCanjeadosPaginacion');
                        if (totalPaginas <= 1) {
                            paginacion.style.display = 'none';
                            return;
                        }
                        paginacion.style.display = 'flex';
                        paginacion.innerHTML = `
                            <button onclick="window._pintarPaginaCanjeadosClub(${pagina - 1})" ${pagina === 1 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span>Página ${pagina} de ${totalPaginas}</span>
                            <button onclick="window._pintarPaginaCanjeadosClub(${pagina + 1})" ${pagina >= totalPaginas ? 'disabled' : ''}>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        `;
                    };
window._clubCarruselState = { imagenes: [], actual: 0 };

window._abrirModalPremioClub = function(id, origen) {
    const cache = origen === 'premium' ? window._clubPremiumCache : window._clubFreeCache;
    const p = (cache || []).find(x => x.id === id);
    if (!p) return;
    window._clubPremioActual = { p, origen };

    document.getElementById('clubModalPremioTitulo').textContent = p.name;
    document.getElementById('clubModalPremioBadge').textContent =
        p.rewardType === 'TICKET' ? '🎟️ Entrada' :
        p.rewardType === 'DESCUENTO' ? '🏷️ Descuento' :
        p.rewardType === 'EXPERIENCIA' ? '🎟️ Experiencia' :
        p.type === 'SORTEO' ? '🎲 Sorteo' : '🎁 Merchandising';
        document.getElementById('clubModalPremioDescripcion').textContent = p.description || '';
        // Copia para mobile — en mobile la descripción va DENTRO del pill
        // "Descripción" junto con los datos de información, no flotando
        // arriba de los tabs como en desktop.
        const descTab = document.getElementById('clubModalPremioDescripcionTab');
        if (descTab) descTab.textContent = p.description || '';

    // Carrusel real — mismo criterio que mis-premios.js: soporta
    // múltiples imágenes (p.images) o una sola (p.imageUrl).
    const imagenes = (p.images && p.images.length > 0)
        ? p.images.map(i => i.imageUrl)
        : (p.imageUrl ? [p.imageUrl] : []);
    window._renderCarruselClub(imagenes);

    const esSorteo = p.type === 'SORTEO';
    document.getElementById('clubModalPremioPuntos').parentElement.style.display = esSorteo ? 'none' : 'flex';
    document.getElementById('clubModalPremioPuntos').textContent = p.pointsRequired ?? '—';

    const stockRow = document.getElementById('clubModalPremioStockRow');
    if (p.stock != null && !esSorteo) {
        stockRow.style.display = 'flex';
        document.getElementById('clubModalPremioStock').textContent = p.stock;
    } else {
        stockRow.style.display = 'none';
    }

    const vencRow = document.getElementById('clubModalPremioVencimientoRow');
    if (p.expiryDate) {
        vencRow.style.display = 'flex';
        document.getElementById('clubModalPremioVencimiento').textContent = new Date(p.expiryDate).toLocaleDateString('es-ES');
    } else {
        vencRow.style.display = 'none';
    }

    const partnerRow = document.getElementById('clubModalPremioPartnerRow');
    if (p.partner) {
        partnerRow.style.display = 'flex';
        document.getElementById('clubModalPremioPartner').textContent = p.partner;
    } else {
        partnerRow.style.display = 'none';
    }

    const webRow = document.getElementById('clubModalPremioWebsiteRow');
    if (p.website) {
        webRow.style.display = 'flex';
        const link = document.getElementById('clubModalPremioWebsiteLink');
        link.href = p.website;
        link.textContent = p.website;
    } else {
        webRow.style.display = 'none';
    }

                document.getElementById('clubModalPremioMisPuntos').textContent = window._clubPuntosActuales;
                // Copia para mobile — "Tus puntos actuales" ya no vive dentro
                // del pill de info, es una franja fija siempre visible arriba
                // del botón de acción.
                const misPuntosFijo = document.getElementById('clubModalPremioMisPuntosFijoValor');
                if (misPuntosFijo) misPuntosFijo.textContent = window._clubPuntosActuales;

            const tabTerminos = document.getElementById('clubTabPremio3');
            if (p.termsConditions) {
                tabTerminos.style.display = 'inline-block';
                document.getElementById('clubModalPremioTerminos').textContent = p.termsConditions;
            } else {
                tabTerminos.style.display = 'none';
            }

            // Tab "Detalles" — el tipo sale de campos distintos según el
            // origen: rewardType en Free, type en Premium (donde también
            // puede ser "SORTEO", manejado aparte más abajo).
            const tipoParaDetalles = origen === 'premium' ? p.type : p.rewardType;
            const itemsExtra = _clubBuildDetallesExtra(p, tipoParaDetalles);
            const tabDetalles = document.getElementById('clubTabPremio2');
            if (itemsExtra.length > 0) {
                tabDetalles.style.display = 'inline-block';
                document.getElementById('clubModalPremioDetallesExtra').innerHTML = itemsExtra.map(([icon, label, value]) => `
                    <div class="modal-premio-detalle-item">
                        <span class="detalle-label"><i class="${icon}"></i> ${label}</span>
                        <span class="detalle-value" style="text-align:right;max-width:55%;word-break:break-word;">${value}</span>
                    </div>`).join('');
            } else {
                tabDetalles.style.display = 'none';
            }

                        // Tabs "Resultados" y "Detalles" (ex "Detalles del premio")
                        // — solo sorteos (Premium). El orden distinto de los pills
                        // para este caso lo maneja la clase club-sorteo-orden en
                        // #modalPremioClub (ver club-beneficios.css).
                                    const tabResultados = document.getElementById('clubTabPremio4');
                                    const tabDetallesPremio = document.getElementById('clubTabPremio5');
                                    document.getElementById('modalPremioClub')?.classList.toggle('club-sorteo-orden', esSorteo);

                                    if (esSorteo) {
                            tabResultados.style.display = 'inline-block';
                            _clubRenderResultados(p);

                            if (p.prizeDetails) {
                                tabDetallesPremio.style.display = 'inline-block';
                                document.getElementById('clubModalPremioDetallesPremio').innerHTML = p.prizeDetails.replace(/\n/g, '<br>');
                            } else {
                                tabDetallesPremio.style.display = 'none';
                            }
                        } else {
                            tabResultados.style.display = 'none';
                            tabDetallesPremio.style.display = 'none';
                        }

                        // En mobile arranca mostrando el pill "Imágenes" (0); en
                        // desktop sigue arrancando en "Información" (1) como siempre
                        // — ahí no existe el pill 0, así que nunca debe usarse.
                        window._switchModalTabClub(window.matchMedia('(max-width: 768px)').matches ? 0 : 1);

        const btn = document.getElementById('clubModalPremioBtnAccion');
        if (origen === 'premium') {
            if (!window._clubEsPremium) {
                // Mismo chequeo que ya hace la tarjeta (_renderCardPremiumClub)
                // — acá faltaba, así que el modal dejaba participar/canjear
                // aunque el usuario no tuviera Premium activo de verdad.
                btn.textContent = '🔒 Solo Premium'; btn.disabled = true;
                btn.onclick = null;
            } else if (esSorteo) {
                if (p.drawExecuted) { btn.textContent = 'Sorteo finalizado'; btn.disabled = true; }
                else if (p.alreadyEntered) { btn.textContent = '✓ Ya estás anotado'; btn.disabled = true; }
                else { btn.textContent = 'Participar'; btn.disabled = false; btn.onclick = () => { window._cerrarModalPremioClub(); window._participarSorteoClub(p.id, p.name); }; }
            } else {
                if (p.stock != null && p.stock <= 0) { btn.textContent = 'Agotado'; btn.disabled = true; }
                else if (!p.canRedeem) { btn.textContent = `Necesitás ${p.pointsRequired - window._clubPuntosActuales} pts más`; btn.disabled = true; }
                else { btn.textContent = `¡Quiero canjear mis ${p.pointsRequired} pts!`; btn.disabled = false; btn.onclick = () => { window._cerrarModalPremioClub(); window._canjearPremiumClub(p.id, p.name, p.pointsRequired); }; }
            }
        } else {
        if (!p.hasStock) { btn.textContent = 'Agotado'; btn.disabled = true; }
        else if (p.isExpired) { btn.textContent = 'Expirado'; btn.disabled = true; }
        else if (!p.canRedeem) { btn.textContent = `Necesitás ${p.pointsRequired - window._clubPuntosActuales} pts más`; btn.disabled = true; }
        else { btn.textContent = `¡Quiero canjear mis ${p.pointsRequired} pts!`; btn.disabled = false; btn.onclick = () => { window._cerrarModalPremioClub(); window._canjearClubBeneficios(p.id, p.name, p.pointsRequired); }; }
    }

        document.getElementById('modalPremioClub').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    window._cerrarModalPremioClub = function() {
        document.getElementById('modalPremioClub').style.display = 'none';
        document.body.style.overflow = '';
    };

        window._switchModalTabClub = function(n) {
            // Pill 0 "Imágenes" no existe en desktop (ahí la imagen es una
            // columna siempre visible) — esta clase solo tiene efecto real
            // dentro del @media mobile de club-beneficios.css.
            const contenedor = document.getElementById('modalPremioClub');
            if (contenedor) contenedor.classList.toggle('club-pill-imagenes', n === 0);

            const tab0 = document.getElementById('clubTabPremio0');
            if (tab0) tab0.classList.toggle('active', n === 0);

            [1,2,3,4,5].forEach(i => {
                const panel = document.getElementById(`clubPanelPremio${i}`);
                const tab = document.getElementById(`clubTabPremio${i}`);
                if (panel) panel.style.display = i === n ? 'block' : 'none';
                if (tab) tab.classList.toggle('active', i === n);
            });
        };

        window._renderCarruselClub = function(imagenes) {
            window._clubCarruselState = { imagenes, actual: 0 };
            window._inicializarSwipeCarruselClub();
            const img = document.getElementById('clubModalPremioImg');
        const placeholder = document.getElementById('clubModalPremioImgPlaceholder');
        const btnPrev = document.getElementById('clubPremioBtnPrev');
        const btnNext = document.getElementById('clubPremioBtnNext');
        const miniaturas = document.getElementById('clubPremioMiniaturas');
        const dots = document.getElementById('clubPremioDots');

        if (imagenes.length === 0) {
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            btnPrev.style.display = 'none';
            btnNext.style.display = 'none';
            miniaturas.style.display = 'none';
            dots.innerHTML = '';
            return;
        }

        img.src = imagenes[0];
        img.style.display = 'block';
        placeholder.style.display = 'none';

        const hayVarias = imagenes.length > 1;
        btnPrev.style.display = hayVarias ? 'flex' : 'none';
        btnNext.style.display = hayVarias ? 'flex' : 'none';
        miniaturas.style.display = 'none';
        miniaturas.innerHTML = '';

        dots.innerHTML = hayVarias
            ? imagenes.map((_, i) => `<span class="dot${i === 0 ? ' activo' : ''}" onclick="window._irAImagenCarruselClub(${i})"></span>`).join('')
            : '';
    };

    window._cambiarImagenPremioClub = function(dir) {
        const state = window._clubCarruselState;
        state.actual = (state.actual + dir + state.imagenes.length) % state.imagenes.length;
        window._actualizarCarruselClub();
    };

    window._irAImagenCarruselClub = function(idx) {
        window._clubCarruselState.actual = idx;
        window._actualizarCarruselClub();
    };

        window._actualizarCarruselClub = function() {
            const state = window._clubCarruselState;
            document.getElementById('clubModalPremioImg').src = state.imagenes[state.actual];
            document.getElementById('clubPremioDots').querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('activo', i === state.actual));
        };

        // Swipe táctil para el carrusel del modal de premio — en mobile las
        // flechas están ocultas por CSS y hasta ahora solo se podía cambiar
        // de imagen tocando los dots. El listener se ata una sola vez
        // (dataset.swipeInit como guarda) porque el contenedor persiste en
        // el DOM entre una apertura del modal y la siguiente.
        window._inicializarSwipeCarruselClub = function() {
            const carrusel = document.getElementById('clubPremioCarrusel');
            if (!carrusel || carrusel.dataset.swipeInit) return;
            carrusel.dataset.swipeInit = '1';

            let startX = 0, startY = 0, arrastrando = false;

            carrusel.addEventListener('touchstart', (e) => {
                if (!window._clubCarruselState || window._clubCarruselState.imagenes.length <= 1) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                arrastrando = true;
            }, { passive: true });

            carrusel.addEventListener('touchend', (e) => {
                if (!arrastrando) return;
                arrastrando = false;

                const deltaX = e.changedTouches[0].clientX - startX;
                const deltaY = e.changedTouches[0].clientY - startY;

                // Umbral de 40px y que el gesto sea más horizontal que
                // vertical, para no competir con el scroll normal de la
                // página cuando el dedo se mueve más para arriba/abajo.
                if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    window._cambiarImagenPremioClub(deltaX < 0 ? 1 : -1);
                }
            });
        };

    window._irASuscripcionClub = function() {
        if (typeof window.abrirDetallePlan === 'function') {
            window.abrirDetallePlan();
        } else {
            // Fallback por si subscription.js todavía no terminó de cargar
            // en este instante — mismo criterio defensivo que ya usaba
            // mis-premios.js.
            const btnMiCuenta = document.querySelector('[onclick*="mi-cuenta"]');
            if (btnMiCuenta) btnMiCuenta.click();
            setTimeout(() => {
                if (typeof window.abrirDetallePlan === 'function') window.abrirDetallePlan();
            }, 300);
        }
    };

    function _clubBuildDetallesExtra(p, tipo) {
        const items = [];

        if (tipo === 'MERCHANDISING' || tipo === 'CANJEABLE') {
            if (p.brand)        items.push(['fas fa-tag',         'Marca',              p.brand]);
            if (p.material)     items.push(['fas fa-layer-group', 'Material',           p.material]);
            if (p.color)        items.push(['fas fa-palette',     'Color(es)',          p.color]);
            if (p.size)         items.push(['fas fa-ruler',       'Talle / Talla',      p.size]);
            if (p.dimensions)   items.push(['fas fa-vector-square','Dimensiones',       p.dimensions]);
            if (p.weight)       items.push(['fas fa-weight-hanging','Peso',             p.weight]);
            if (p.origin)       items.push(['fas fa-globe-americas','Origen',           p.origin]);
            if (p.unitsIncluded)items.push(['fas fa-boxes',       'Unidades incluidas', p.unitsIncluded]);
            if (p.condition)    items.push(['fas fa-check-circle', 'Condición',         p.condition === 'NUEVO' ? 'Nuevo' : 'Reacondicionado']);
        }

        if (tipo === 'TICKET') {
            if (p.cinemaChain)       items.push(['fas fa-film',        'Cadena de cine',    p.cinemaChain]);
            if (p.cinemaFormat)      items.push(['fas fa-tv',          'Formato',           p.cinemaFormat]);
            if (p.ticketsIncluded)   items.push(['fas fa-ticket-alt',  'Entradas incluidas',p.ticketsIncluded]);
            if (p.includesSnack != null) items.push(['fas fa-coffee',  'Incluye consumición', p.includesSnack ? 'Sí' : 'No']);
            if (p.cinemaRestrictions)items.push(['fas fa-exclamation-circle','Restricciones', p.cinemaRestrictions]);
        }

        if (tipo === 'DESCUENTO') {
            if (p.discountValue != null) {
                const val = p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `$${p.discountValue}`;
                items.push(['fas fa-percent', 'Descuento', val]);
            }
            if (p.discountChannel)       items.push(['fas fa-store',       'Canal',                   p.discountChannel]);
            if (p.minimumPurchase != null) items.push(['fas fa-shopping-cart','Compra mínima',        `$${p.minimumPurchase}`]);
            if (p.applicableProducts)    items.push(['fas fa-list',        'Productos incluidos/excluidos', p.applicableProducts]);
            if (p.stackable != null)     items.push(['fas fa-layer-group', 'Acumulable',              p.stackable ? 'Sí' : 'No']);
            if (p.redeemMethod) {
                const metodos = { CODIGO_DIGITAL: '💻 Código digital', LINK_PROMOCIONAL: '🔗 Link promocional', PRESENTAR_USUARIO: '👤 Presentar usuario', AUTOMATICO: '⚡ Automático' };
                items.push(['fas fa-exchange-alt', 'Método de canje', metodos[p.redeemMethod] || p.redeemMethod]);
            }
        }

        if (tipo === 'EXPERIENCIA') {
            if (p.experienceType)        items.push(['fas fa-star',        'Tipo de experiencia',     p.experienceType]);
            if (p.eventDate)             items.push(['fas fa-calendar-alt','Fecha del evento',        new Date(p.eventDate).toLocaleDateString('es-AR', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})]);
            if (p.location)              items.push(['fas fa-map-marker-alt','Ubicación',             p.location]);
            if (p.maxCapacity)           items.push(['fas fa-users',       'Cupo máximo',             p.maxCapacity]);
            if (p.duration)              items.push(['fas fa-clock',       'Duración',                p.duration]);
            if (p.includesTransport != null) items.push(['fas fa-bus',     'Incluye traslado',        p.includesTransport ? 'Sí' : 'No']);
            if (p.companionAllowed != null)  items.push(['fas fa-user-friends','Apto para acompañante', p.companionAllowed ? 'Sí' : 'No']);
            if (p.requirements)          items.push(['fas fa-clipboard-list','Requisitos',            p.requirements]);
            if (p.requiresConfirmation != null) items.push(['fas fa-envelope-open-text', 'Requiere confirmación', p.requiresConfirmation ? 'Sí' : 'No']);
            if (p.transferable != null)  items.push(['fas fa-exchange-alt', 'Transferible',           p.transferable ? 'Sí' : 'No']);
            if (p.organizer)             items.push(['fas fa-building',    'Responsable',             p.organizer]);
        }

        const modalidadMap = { RETIRO_PRESENCIAL: '📍 Retiro presencial', ENTREGA_DIGITAL: '📧 Entrega digital', COORDINACION_TERCERO: '🤝 Coordinación con tercero', ENVIO_DOMICILIO: '🚚 Envío a domicilio' };
        const costoMap     = { GRATUITO: '✅ Gratuito', A_CARGO_GANADOR: '💸 A cargo del ganador', COORDINAR_TERCERO: '🤝 Coordinar con tercero' };
        if (p.deliveryMethod)  items.push(['fas fa-truck', 'Modalidad de entrega', modalidadMap[p.deliveryMethod] || p.deliveryMethod]);
        if (p.pickupPoint && p.deliveryMethod === 'RETIRO_PRESENCIAL') items.push(['fas fa-map-marker-alt', 'Punto de retiro', p.pickupPoint]);
        if (p.deliveryCost)    items.push(['fas fa-dollar-sign', 'Costo de entrega', costoMap[p.deliveryCost] || p.deliveryCost]);

        return items;
    }

    function _clubRenderResultados(p) {
        const pendiente = document.getElementById('clubResultadosPendiente');
        const ejecutado = document.getElementById('clubResultadosEjecutado');
        if (!pendiente || !ejecutado) return;

        if (!p.drawExecuted) {
            pendiente.style.display = 'block';
            ejecutado.style.display = 'none';
            return;
        }
        pendiente.style.display = 'none';
        ejecutado.style.display = 'block';

        const mapearGanador = (nombreId, elId, nombre, id) => {
            const nombreEl = document.getElementById(nombreId);
            const el = document.getElementById(elId);
            if (nombre) {
                nombreEl.textContent = nombre;
                el.style.display = 'flex';
                el.onclick = () => {
                    if (id && typeof window.abrirPerfilUsuario === 'function') {
                        window._cerrarModalPremioClub();
                        window.abrirPerfilUsuario(id);
                    }
                };
            } else {
                el.style.display = 'none';
            }
        };

        mapearGanador('clubResultadoGanadorNombre', 'clubResultadoGanador', p.winner1Name, p.winner1Id);
        mapearGanador('clubResultadoSuplente1Nombre', 'clubResultadoSuplente1', p.winner2Name, p.winner2Id);
        mapearGanador('clubResultadoSuplente2Nombre', 'clubResultadoSuplente2', p.winner3Name, p.winner3Id);
    }

    window._clubConfirmCallback = null;

    window._abrirConfirmClub = function(mensaje, callback) {
        document.getElementById('clubConfirmTexto').textContent = mensaje;
        window._clubConfirmCallback = callback;
        document.getElementById('clubModalConfirmar').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    window._cerrarConfirmClub = function(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('clubModalConfirmar').style.display = 'none';
        document.body.style.overflow = '';
        window._clubConfirmCallback = null;
    };

    window._ejecutarConfirmClub = function() {
        const cb = window._clubConfirmCallback;
        window._cerrarConfirmClub();
        if (cb) cb();
    };

    window._abrirAvisoClub = function(titulo, mensaje) {
        document.getElementById('clubAvisoTitulo').textContent = titulo;
        document.getElementById('clubAvisoTexto').textContent = mensaje;
        document.getElementById('clubModalAviso').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    window._cerrarAvisoClub = function(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('clubModalAviso').style.display = 'none';
        document.body.style.overflow = '';
    };