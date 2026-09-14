// ============================================================
// CLUB DE BENEFICIOS — VISTA PÚBLICA (sin sesión)
// Mismo criterio visual que club-beneficios.js, pero:
//  - pega contra /rewards/public/all y /premium/rewards/public/all
//    (sin Authorization: no hay token de un visitante sin cuenta)
//  - no hay puntos de usuario, ni historial de canjes, ni canje real
//  - "Quiero canjearlo"/"Participar" abren un CTA de registro en vez
//    de pegarle a /redemptions o /premium/rewards/{id}/redeem
// ============================================================

window.CLUB_PUB_REGISTRO_URL = 'register.html';

window['init_club-beneficios-publica'] = async function() {
    window._clubPubFreeCargado = false;
    window._clubPubPremiumCargado = false;
    window._cargarFreeClubBeneficiosPub();
};

// ==========================================================
// TABS
// ==========================================================
window.cambiarTabClubBeneficiosPub = function(tab, btn) {
    document.querySelectorAll('.club-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.club-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tab === 'premium' ? 'clubPubPanelPremium' : 'clubPubPanelFree').classList.add('active');

    document.getElementById('clubPubFiltrosFree').style.display = tab === 'free' ? 'flex' : 'none';
    document.getElementById('clubPubFiltrosPremium').style.display = tab === 'premium' ? 'flex' : 'none';

    if (tab === 'premium' && !window._clubPubPremiumCargado) {
        window._clubPubPremiumCargado = true;
        window._cargarPremiumClubBeneficiosPub();
    }
};

// ==========================================================
// ESTADO DE FILTROS (idéntico al logueado)
// ==========================================================
window._clubPubFreeEstado = 'activos';
window._clubPubFreeTipo = 'todos';
window._clubPubFreeOrden = 'puntos-menor';
window._clubPubPremiumEstado = 'activos';
window._clubPubPremiumTipo = 'todos';
window._clubPubPremiumOrden = 'puntos-menor';

function _clubPubEstaResuelto(p) {
    return p.isExpired || !p.hasStock;
}
function _clubPubEstaResueltoEspecial(p) {
    if (p.type === 'SORTEO') return p.drawExecuted === true;
    return p.stock != null && p.stock <= 0;
}

window._filtrarClubTipoPub = function(catalogo, valor) {
    if (catalogo === 'free') {
        window._clubPubFreeTipo = valor;
        window._pintarFreeClubFiltradoPub();
    } else {
        window._clubPubPremiumTipo = valor;
        window._pintarPremiumClubFiltradoPub();
    }
};

// "Agotados" viaja en el mismo select que el orden — mismo criterio
// que el logueado: elegirlo cambia el ESTADO, no es un orden real.
window._ordenarClubPub = function(tipo, valor) {
    const esFree = tipo === 'free';
    if (valor === 'agotados') {
        if (esFree) { window._clubPubFreeEstado = 'agotados'; window._pintarFreeClubFiltradoPub(); }
        else { window._clubPubPremiumEstado = 'agotados'; window._pintarPremiumClubFiltradoPub(); }
    } else {
        if (esFree) {
            window._clubPubFreeEstado = 'activos';
            window._clubPubFreeOrden = valor;
            window._pintarFreeClubFiltradoPub();
        } else {
            window._clubPubPremiumEstado = 'activos';
            window._clubPubPremiumOrden = valor;
            window._pintarPremiumClubFiltradoPub();
        }
    }
};

function _clubPubAplicarFiltroYOrden(lista, estado, tipo, orden, esResueltoFn) {
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

// ==========================================================
// CARGA — FREE
// ==========================================================
window._cargarFreeClubBeneficiosPub = async function() {
    const grid = document.getElementById('clubPubGridFree');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/rewards/public/all`);
        if (!res.ok) throw new Error();
        window._clubPubFreeOriginal = await res.json();
        window._pintarFreeClubFiltradoPub();
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center;color:#e50914;grid-column:1/-1;padding:2rem;">Error al cargar los premios.</p>';
    }
};

window._pintarFreeClubFiltradoPub = function() {
    const grid = document.getElementById('clubPubGridFree');
    const premios = _clubPubAplicarFiltroYOrden(window._clubPubFreeOriginal || [], window._clubPubFreeEstado, window._clubPubFreeTipo, window._clubPubFreeOrden, _clubPubEstaResuelto);

    if (premios.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;padding:2rem;">No hay premios para este filtro.</p>';
        window._clubPubFreeCache = [];
        return;
    }

    window._clubPubFreeCache = premios;

    grid.innerHTML = premios.map(p => {
        const imagen = p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:0.5rem;">`
            : `<i class="fas fa-gift" style="font-size:2.5rem;color:#e50914;"></i>`;

        const badgeTipo = p.rewardType === 'TICKET' ? '<span class="premio-badge">🎟️ Entrada</span>'
            : p.rewardType === 'DESCUENTO' ? '<span class="premio-badge">🏷️ Descuento</span>'
            : p.rewardType === 'EXPERIENCIA' ? '<span class="premio-badge">🎟️ Experiencia</span>'
            : '<span class="premio-badge">🎁 Merchandising</span>';

        // Sin usuario no existe "canRedeem" — el único motivo para
        // deshabilitar acá es que el premio no esté disponible en sí
        // mismo (agotado/expirado), nunca por puntos insuficientes.
        let btnLabel, btnDisabled;
        if (!p.hasStock) { btnLabel = 'Agotado'; btnDisabled = true; }
        else if (p.isExpired) { btnLabel = 'Expirado'; btnDisabled = true; }
        else { btnLabel = '¡Quiero canjearlo!'; btnDisabled = false; }

        return `
            <div class="premio-card ${!p.hasStock || p.isExpired ? 'agotado' : ''}" onclick="window._abrirModalPremioClubPub(${p.id}, 'free')" style="cursor:pointer;">
                <div class="premio-imagen">
                    ${imagen}${badgeTipo}
                </div>
                <div class="premio-info">
                    <h4 class="premio-titulo">${p.name}</h4>
                    <p class="premio-descripcion">${p.description || ''}</p>
                    <div class="premio-detalles">
                        <span class="premio-puntos"><i class="fas fa-coins"></i> ${p.pointsRequired} pts</span>
                        <span class="premio-stock"><i class="fas fa-boxes"></i> ${p.stock} disponibles</span>
                    </div>
                    <button class="btn-canjear" onclick="event.stopPropagation(); window._clubPubAbrirCTA('canje', '${p.name.replace(/'/g, "\\'")}')" ${btnDisabled ? 'disabled' : ''}>
                        ${btnLabel}
                    </button>
                </div>
            </div>`;
    }).join('');
    window._inicializarCarruselClubPub('clubPubGridFree');
};

// ==========================================================
// CARGA — PREMIUM
// ==========================================================
window._cargarPremiumClubBeneficiosPub = async function() {
    const grid = document.getElementById('clubPubGridPremium');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/premium/rewards/public/all`);
        if (!res.ok) throw new Error();
        window._clubPubPremiumOriginal = await res.json();
        window._pintarPremiumClubFiltradoPub();
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center;color:#e50914;grid-column:1/-1;padding:2rem;">Error al cargar los premios.</p>';
    }
};

window._pintarPremiumClubFiltradoPub = function() {
    const grid = document.getElementById('clubPubGridPremium');
    const premios = _clubPubAplicarFiltroYOrden(window._clubPubPremiumOriginal || [], window._clubPubPremiumEstado, window._clubPubPremiumTipo, window._clubPubPremiumOrden, _clubPubEstaResueltoEspecial);

    if (premios.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;padding:2rem;">No hay premios para este filtro.</p>';
        window._clubPubPremiumCache = [];
        return;
    }

    window._clubPubPremiumCache = premios;
    grid.innerHTML = premios.map(p => window._renderCardPremiumClubPub(p)).join('');
    window._inicializarCarruselClubPub('clubPubGridPremium');
};

window._renderCardPremiumClubPub = function(p) {
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

    // Sin usuario, el único botón posible es "sumate" — nunca hay un
    // estado personal (ya participaste, ya sos Premium) para mostrar.
    let boton;
    if (esSorteo) {
        boton = p.drawExecuted
            ? `<button class="btn-canjear" disabled>Sorteo finalizado</button>`
            : `<button class="btn-canjear" onclick="window._clubPubAbrirCTA('sorteo', '${p.name.replace(/'/g, "\\'")}')">Quiero participar</button>`;
    } else {
        const agotado = p.stock != null && p.stock <= 0;
        boton = agotado
            ? `<button class="btn-canjear" disabled>Agotado</button>`
            : `<button class="btn-canjear" onclick="window._clubPubAbrirCTA('canje', '${p.name.replace(/'/g, "\\'")}')">¡Quiero canjearlo!</button>`;
    }

    return `
        <div class="premio-card" onclick="window._abrirModalPremioClubPub(${p.id}, 'premium')" style="cursor:pointer;">
            <div class="premio-imagen">
                ${imagen}${badgeTipo}
            </div>
            <div class="premio-info">
                <h4 class="premio-titulo">${p.name}</h4>
                <p class="premio-descripcion">${p.description || ''}</p>
                ${infoExtra}
                <div onclick="event.stopPropagation();">${boton}</div>
            </div>
        </div>`;
};

// ==========================================================
// CARRUSEL / DOTS (idéntico al logueado, solo cambia el ID base)
// ==========================================================
window._moverCarruselClubPub = function(contenedorId, direccion) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const primeraCard = cont.querySelector('.premio-card');
    if (!primeraCard) return;
    const gap = 16;
    const anchoTanda = (primeraCard.offsetWidth + gap) * 3;
    cont.scrollBy({ left: direccion * anchoTanda, behavior: 'smooth' });
};

window._actualizarChevronsClubPub = function(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const wrap = cont.closest('.club-carrusel-wrap');
    if (!wrap) return;
    const btnPrev = wrap.querySelector('.club-carrusel-nav-prev');
    const btnNext = wrap.querySelector('.club-carrusel-nav-next');
    if (!btnPrev || !btnNext) return;

    const alPrincipio = cont.scrollLeft <= 4;
    const alFinal = cont.scrollLeft + cont.clientWidth >= cont.scrollWidth - 4;

    btnPrev.style.display = alPrincipio ? 'none' : 'flex';
    btnNext.style.display = alFinal ? 'none' : 'flex';
};

window._inicializarCarruselClubPub = function(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.addEventListener('scroll', () => window._actualizarChevronsClubPub(contenedorId));
    requestAnimationFrame(() => window._actualizarChevronsClubPub(contenedorId));
    window._inicializarDotsClubPub(contenedorId);
};

window._inicializarDotsClubPub = function(contenedorId) {
    const cont = document.getElementById(contenedorId);
    const dotsId = contenedorId.replace('clubPubGrid', 'clubPubDots');
    const dotsCont = document.getElementById(dotsId);
    if (!cont || !dotsCont) return;

    const cards = cont.querySelectorAll('.premio-card');
    const total = cards.length;
    if (total <= 1) { dotsCont.innerHTML = ''; return; }

    const cantidadDots = Math.min(total, 3);
    dotsCont.innerHTML = Array.from({ length: cantidadDots }).map((_, i) =>
        `<span class="club-dot${i === 0 ? ' activo' : ''}" onclick="window._irADotClubPub('${contenedorId}', ${i})"></span>`
    ).join('');

    const actualizarDotsActivos = () => {
        const primeraCard = cont.querySelector('.premio-card');
        if (!primeraCard) return;
        const anchoCard = primeraCard.offsetWidth + 16;
        const indiceActual = Math.round(cont.scrollLeft / anchoCard);

        let dotActivo;
        if (total <= 3) dotActivo = indiceActual;
        else if (indiceActual === 0) dotActivo = 0;
        else if (indiceActual >= total - 1) dotActivo = 2;
        else dotActivo = 1;

        dotsCont.querySelectorAll('.club-dot').forEach((dot, i) => {
            dot.classList.toggle('activo', i === dotActivo);
        });
    };
    cont.addEventListener('scroll', actualizarDotsActivos);
};

window._irADotClubPub = function(contenedorId, indice) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const cards = cont.querySelectorAll('.premio-card');
    const total = cards.length;
    const primeraCard = cont.querySelector('.premio-card');
    if (!primeraCard) return;
    const anchoCard = primeraCard.offsetWidth + 16;

    let indiceDestino;
    if (total <= 3) indiceDestino = indice;
    else if (indice === 0) indiceDestino = 0;
    else if (indice === 2) indiceDestino = total - 1;
    else {
        const indiceActual = Math.round(cont.scrollLeft / anchoCard);
        indiceDestino = Math.min(indiceActual + 1, total - 2);
    }

    cont.scrollTo({ left: indiceDestino * anchoCard, behavior: 'smooth' });
};

// ==========================================================
// MODAL DE DETALLE
// ==========================================================
window._clubPubCarruselState = { imagenes: [], actual: 0 };

window._abrirModalPremioClubPub = function(id, origen) {
    const cache = origen === 'premium' ? window._clubPubPremiumCache : window._clubPubFreeCache;
    const p = (cache || []).find(x => x.id === id);
    if (!p) return;

    document.getElementById('clubPubModalPremioTitulo').textContent = p.name;
    document.getElementById('clubPubModalPremioBadge').textContent =
        p.rewardType === 'TICKET' ? '🎟️ Entrada' :
        p.rewardType === 'DESCUENTO' ? '🏷️ Descuento' :
        p.rewardType === 'EXPERIENCIA' ? '🎟️ Experiencia' :
        p.type === 'SORTEO' ? '🎲 Sorteo' : '🎁 Merchandising';
    document.getElementById('clubPubModalPremioDescripcion').textContent = p.description || '';
    const descTab = document.getElementById('clubPubModalPremioDescripcionTab');
    if (descTab) descTab.textContent = p.description || '';

    const imagenes = (p.images && p.images.length > 0)
        ? p.images.map(i => i.imageUrl)
        : (p.imageUrl ? [p.imageUrl] : []);
    window._renderCarruselClubPub(imagenes);

    const esSorteo = p.type === 'SORTEO';
    document.getElementById('clubPubModalPremioPuntos').parentElement.style.display = esSorteo ? 'none' : 'flex';
    document.getElementById('clubPubModalPremioPuntos').textContent = p.pointsRequired ?? '—';

    const stockRow = document.getElementById('clubPubModalPremioStockRow');
    if (p.stock != null && !esSorteo) {
        stockRow.style.display = 'flex';
        document.getElementById('clubPubModalPremioStock').textContent = p.stock;
    } else {
        stockRow.style.display = 'none';
    }

    const vencRow = document.getElementById('clubPubModalPremioVencimientoRow');
    if (p.expiryDate) {
        vencRow.style.display = 'flex';
        document.getElementById('clubPubModalPremioVencimiento').textContent = new Date(p.expiryDate).toLocaleDateString('es-ES');
    } else {
        vencRow.style.display = 'none';
    }

    const partnerRow = document.getElementById('clubPubModalPremioPartnerRow');
    if (p.partner) {
        partnerRow.style.display = 'flex';
        document.getElementById('clubPubModalPremioPartner').textContent = p.partner;
    } else {
        partnerRow.style.display = 'none';
    }

    const webRow = document.getElementById('clubPubModalPremioWebsiteRow');
    if (p.website) {
        webRow.style.display = 'flex';
        const link = document.getElementById('clubPubModalPremioWebsiteLink');
        link.href = p.website;
        link.textContent = p.website;
    } else {
        webRow.style.display = 'none';
    }

    const tabTerminos = document.getElementById('clubPubTabPremio3');
    if (p.termsConditions) {
        tabTerminos.style.display = 'inline-block';
        document.getElementById('clubPubModalPremioTerminos').textContent = p.termsConditions;
    } else {
        tabTerminos.style.display = 'none';
    }

    const tipoParaDetalles = origen === 'premium' ? p.type : p.rewardType;
    const itemsExtra = _clubPubBuildDetallesExtra(p, tipoParaDetalles);
    const tabDetalles = document.getElementById('clubPubTabPremio2');
    if (itemsExtra.length > 0) {
        tabDetalles.style.display = 'inline-block';
        document.getElementById('clubPubModalPremioDetallesExtra').innerHTML = itemsExtra.map(([icon, label, value]) => `
            <div class="modal-premio-detalle-item">
                <span class="detalle-label"><i class="${icon}"></i> ${label}</span>
                <span class="detalle-value" style="text-align:right;max-width:55%;word-break:break-word;">${value}</span>
            </div>`).join('');
    } else {
        tabDetalles.style.display = 'none';
    }

    const tabResultados = document.getElementById('clubPubTabPremio4');
    const tabDetallesPremio = document.getElementById('clubPubTabPremio5');
    document.getElementById('clubPubModalPremio')?.classList.toggle('club-sorteo-orden', esSorteo);

    if (esSorteo) {
        tabResultados.style.display = 'inline-block';
        _clubPubRenderResultados(p);

        if (p.prizeDetails) {
            tabDetallesPremio.style.display = 'inline-block';
            document.getElementById('clubPubModalPremioDetallesPremio').innerHTML = p.prizeDetails.replace(/\n/g, '<br>');
        } else {
            tabDetallesPremio.style.display = 'none';
        }
    } else {
        tabResultados.style.display = 'none';
        tabDetallesPremio.style.display = 'none';
    }

    window._switchModalTabClubPub(window.matchMedia('(max-width: 768px)').matches ? 0 : 1);

    // Botón de acción — sin usuario, solo puede llevar al CTA de
    // registro o mostrar que el premio no está disponible.
    const btn = document.getElementById('clubPubModalPremioBtnAccion');
    if (origen === 'premium') {
        if (esSorteo) {
            if (p.drawExecuted) { btn.textContent = 'Sorteo finalizado'; btn.disabled = true; btn.onclick = null; }
            else { btn.textContent = 'Quiero participar'; btn.disabled = false; btn.onclick = () => window._clubPubAbrirCTA('sorteo', p.name); }
        } else {
            const agotado = p.stock != null && p.stock <= 0;
            if (agotado) { btn.textContent = 'Agotado'; btn.disabled = true; btn.onclick = null; }
            else { btn.textContent = '¡Quiero canjearlo!'; btn.disabled = false; btn.onclick = () => window._clubPubAbrirCTA('canje', p.name); }
        }
    } else {
        if (!p.hasStock) { btn.textContent = 'Agotado'; btn.disabled = true; btn.onclick = null; }
        else if (p.isExpired) { btn.textContent = 'Expirado'; btn.disabled = true; btn.onclick = null; }
        else { btn.textContent = '¡Quiero canjearlo!'; btn.disabled = false; btn.onclick = () => window._clubPubAbrirCTA('canje', p.name); }
    }

    document.getElementById('clubPubModalPremio').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window._cerrarModalPremioClubPub = function() {
    document.getElementById('clubPubModalPremio').style.display = 'none';
    document.body.style.overflow = '';
};

window._switchModalTabClubPub = function(n) {
    // Pill 0 "Imágenes" no existe en desktop (ahí la imagen es una
    // columna siempre visible) — esta clase solo tiene efecto real
    // dentro del @media mobile de club-beneficios-publica.css.
    const contenedor = document.getElementById('clubPubModalPremio');
    if (contenedor) contenedor.classList.toggle('club-pill-imagenes', n === 0);

    for (let i = 0; i <= 5; i++) {
        const panel = document.getElementById(`clubPubPanelPremio${i}`);
        const tab = document.getElementById(`clubPubTabPremio${i}`);
        if (panel) panel.style.display = i === n ? 'block' : 'none';
        if (tab) tab.classList.toggle('active', i === n);
    }
};

function _clubPubRenderResultados(p) {
    const pendiente = document.getElementById('clubPubResultadosPendiente');
    const ejecutado = document.getElementById('clubPubResultadosEjecutado');
    if (!pendiente || !ejecutado) return;

    if (!p.drawExecuted) {
        pendiente.style.display = 'block';
        ejecutado.style.display = 'none';
        return;
    }
    pendiente.style.display = 'none';
    ejecutado.style.display = 'block';

    // Sin abrirPerfilUsuario (no aplica sin sesión) — acá los nombres
    // de ganador/suplentes son de solo lectura, no clickeables.
    const mapear = (nombreId, elId, nombre) => {
        const nombreEl = document.getElementById(nombreId);
        const el = document.getElementById(elId);
        if (nombre) { nombreEl.textContent = nombre; el.style.display = 'flex'; }
        else { el.style.display = 'none'; }
    };

    mapear('clubPubResultadoGanadorNombre', 'clubPubResultadoGanador', p.winner1Name);
    mapear('clubPubResultadoSuplente1Nombre', 'clubPubResultadoSuplente1', p.winner2Name);
    mapear('clubPubResultadoSuplente2Nombre', 'clubPubResultadoSuplente2', p.winner3Name);
}

// ==========================================================
// CARRUSEL DE IMÁGENES DEL MODAL
// ==========================================================
window._renderCarruselClubPub = function(imagenes) {
    window._clubPubCarruselState = { imagenes, actual: 0 };
    window._inicializarSwipeCarruselClubPub();
    const img = document.getElementById('clubPubModalPremioImg');
    const placeholder = document.getElementById('clubPubModalPremioImgPlaceholder');
    const btnPrev = document.getElementById('clubPubPremioBtnPrev');
    const btnNext = document.getElementById('clubPubPremioBtnNext');
    const dots = document.getElementById('clubPubPremioDots');

    if (imagenes.length === 0) {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
        dots.innerHTML = '';
        return;
    }

    img.src = imagenes[0];
    img.style.display = 'block';
    placeholder.style.display = 'none';

    const hayVarias = imagenes.length > 1;
    btnPrev.style.display = hayVarias ? 'flex' : 'none';
    btnNext.style.display = hayVarias ? 'flex' : 'none';

    dots.innerHTML = hayVarias
        ? imagenes.map((_, i) => `<span class="dot${i === 0 ? ' activo' : ''}" onclick="window._irAImagenCarruselClubPub(${i})"></span>`).join('')
        : '';
};

window._cambiarImagenPremioClubPub = function(dir) {
    const state = window._clubPubCarruselState;
    state.actual = (state.actual + dir + state.imagenes.length) % state.imagenes.length;
    window._actualizarCarruselClubPub();
};

window._irAImagenCarruselClubPub = function(idx) {
    window._clubPubCarruselState.actual = idx;
    window._actualizarCarruselClubPub();
};

window._actualizarCarruselClubPub = function() {
    const state = window._clubPubCarruselState;
    document.getElementById('clubPubModalPremioImg').src = state.imagenes[state.actual];
    document.getElementById('clubPubPremioDots').querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('activo', i === state.actual));
};

window._inicializarSwipeCarruselClubPub = function() {
    const carrusel = document.getElementById('clubPubPremioCarrusel');
    if (!carrusel || carrusel.dataset.swipeInit) return;
    carrusel.dataset.swipeInit = '1';

    let startX = 0, startY = 0, arrastrando = false;

    carrusel.addEventListener('touchstart', (e) => {
        if (!window._clubPubCarruselState || window._clubPubCarruselState.imagenes.length <= 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        arrastrando = true;
    }, { passive: true });

    carrusel.addEventListener('touchend', (e) => {
        if (!arrastrando) return;
        arrastrando = false;
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            window._cambiarImagenPremioClubPub(deltaX < 0 ? 1 : -1);
        }
    });
};

// ==========================================================
// DETALLES EXTRA POR TIPO (idéntico al logueado — pura data)
// ==========================================================
function _clubPubBuildDetallesExtra(p, tipo) {
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

// ==========================================================
// CTA DE REGISTRO — reemplaza canje/participación real
// ==========================================================
const CLUB_PUB_CTA_TEXTOS = {
    general: 'Creá tu cuenta gratis en Cinemarketer para empezar a ganar puntos votando, comentando y participando de trivias — y canjealos por estos premios.',
    premium: 'Los premios Premium son exclusivos para suscriptores. Creá tu cuenta gratis y desde ahí vas a poder sumarte a Premium cuando quieras.',
    canje: 'Para canjear este premio necesitás una cuenta en Cinemarketer. Es gratis — y de paso empezás a sumar puntos con lo que ya hacés como espectador.',
    sorteo: 'Para participar de este sorteo necesitás una cuenta en Cinemarketer. Registrate gratis para anotarte.',
};

window._clubPubAbrirCTA = function(motivo, nombrePremio) {
    const texto = nombrePremio
        ? `${CLUB_PUB_CTA_TEXTOS[motivo] || CLUB_PUB_CTA_TEXTOS.general} (${nombrePremio})`
        : (CLUB_PUB_CTA_TEXTOS[motivo] || CLUB_PUB_CTA_TEXTOS.general);
    document.getElementById('clubPubCTATexto').textContent = texto;
    document.getElementById('clubPubModalCTA').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window._cerrarCTAClubPub = function(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('clubPubModalCTA').style.display = 'none';
    document.body.style.overflow = '';
};

window._irARegistroClubPub = function() {
    window.location.href = window.CLUB_PUB_REGISTRO_URL;
};

