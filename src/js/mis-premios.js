// ==============================================
// mis-premios.js - Módulo de premios
// ==============================================

// ==============================================
// ESTADO DEL MÓDULO
// ==============================================
const premiosState = {
    puntosActuales: 0,
    filtroActual: 'todos',
    ordenActual: 'puntos-menor',
    premiosCache: [],
    premiosOriginalCache: [],
    canjeadosCache: [],
    canjeadosPagina: 1,
    canjeadosPorPagina: 10,
    disponiblesPagina: 1,
    disponiblesPorPagina: 9,
    especialesCache: [],
    especialesFiltro: 'todos',
    especialesPagina: 1,
    especialesPorPagina: 9
};

// ==============================================
// SWITCH DE TABS
// ==============================================
window.switchTab = function(tab, element) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (element) element.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const section = document.getElementById(tab + '-section');
    if (section) section.classList.add('active');

    if (tab === 'canjeados') {
        window.cargarCanjeados();
    } else if (tab === 'disponibles') {
        window.cargarDisponibles();
    } else if (tab === 'especiales') {
        window.cargarEspeciales();
    }
};

// ==============================================
// CARGAR PUNTOS DEL USUARIO
// ==============================================
async function cargarPuntosUsuario() {
    try {
        const profile = await API.getProfile();
        premiosState.puntosActuales = profile.totalPoints || 0;
    } catch (e) {
    }
}

function actualizarContadorDisponibles() {
    const comunes    = (premiosState.premiosOriginalCache || []).length;
    const especiales = (premiosState.especialesCache || []).length;
    const el = document.getElementById('totalPremiosDisponibles');
    if (el) el.textContent = comunes + especiales;
}

function actualizarBadgesTabs() {
    const canjeados   = (premiosState.canjeadosCache || []).length;
    const disponibles = (premiosState.premiosOriginalCache || []).length;
    const especiales  = (premiosState.especialesCache || []).length;

    const elC = document.getElementById('tituloCountCanjeados');
    const elD = document.getElementById('tituloCountDisponibles');
    const elE = document.getElementById('tituloCountEspeciales');

    if (elC) elC.textContent = canjeados   > 0 ? `(${canjeados})`   : '';
    if (elD) elD.textContent = disponibles > 0 ? `(${disponibles})` : '';
    if (elE) elE.textContent = especiales  > 0 ? `(${especiales})`  : '';
}

// ==============================================
// CARGAR PREMIOS CANJEADOS
// ==============================================
window.cargarCanjeados = async function(pagina = 1) {
    const lista   = document.getElementById('canjeadosList');
    const noEl    = document.getElementById('noCanjeados');
    const countEl = document.getElementById('canjeadosCount');
    const token   = localStorage.getItem('token');

    if (!lista) return;
    lista.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando tus premios...</p></div>';

    try {
        const [resComunes, resPremium, resSorteos] = await Promise.all([
            fetch(`${CONFIG.API_URL}/redemptions/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CONFIG.API_URL}/premium/redemptions/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CONFIG.API_URL}/premium/rewards/draws/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const comunes  = resComunes.ok  ? await resComunes.json()  : [];
        const premium  = resPremium.ok  ? await resPremium.json()  : [];
        const sorteos  = resSorteos.ok  ? await resSorteos.json()  : [];

        const premiumNorm = premium.map(p => ({
            rewardName:        p.rewardName,
            rewardDescription: '',
            rewardImageUrl:    p.rewardImageUrl || null,
            pointsSpent:       p.pointsSpent,
            redemptionCode:    p.redemptionCode,
            redemptionDate:    p.redeemedAt,
            status:            p.status,
            expiresAt:         null,
            tipoBadge:         '⭐ Premium'
        }));

        const sorteosNorm = sorteos.map(s => ({
            rewardName:        s.rewardName,
            rewardDescription: s.drawExecuted ? (s.won ? '🏆 ¡Ganaste este sorteo!' : 'Sorteo finalizado') : 'Sorteo en curso',
            rewardImageUrl:    s.rewardImageUrl || null,
            pointsSpent:       0,
            redemptionCode:    '-',
            redemptionDate:    s.enteredAt,
            status:            s.drawExecuted ? (s.won ? 'COMPLETED' : 'EXPIRED') : 'PENDING',
            expiresAt:         null,
            tipoBadge:         s.won ? '🏆 Ganador' : '🎲 Sorteo'
        }));

        const todos = [...comunes, ...premiumNorm, ...sorteosNorm]
            .sort((a, b) => new Date(b.redemptionDate) - new Date(a.redemptionDate));

        premiosState.canjeadosCache  = todos;
        premiosState.canjeadosPagina = pagina;

        if (countEl) countEl.textContent = `${todos.length} premios`;
        actualizarBadgesTabs();

        if (todos.length === 0) {
            lista.style.display = 'none';
            if (noEl) noEl.style.display = 'block';
            renderCanjeadosPaginacion();
            return;
        }

        lista.style.display = 'block';
        if (noEl) noEl.style.display = 'none';
        renderCanjeadosPagina(pagina);

    } catch (error) {
        lista.innerHTML = '<div style="text-align:center;padding:3rem;color:#e50914;">Error al cargar los premios</div>';
    }
};

// ==============================================
// RENDER DE PÁGINA DE CANJEADOS
// ==============================================
function renderCanjeadosPagina(pagina) {
    const lista = document.getElementById('canjeadosList');
    if (!lista) return;

    const canjeados    = premiosState.canjeadosCache;
    const porPagina    = premiosState.canjeadosPorPagina;
    const totalPaginas = Math.ceil(canjeados.length / porPagina);
    pagina = Math.max(1, Math.min(pagina, totalPaginas));
    premiosState.canjeadosPagina = pagina;

    const inicio = (pagina - 1) * porPagina;
    const slice  = canjeados.slice(inicio, inicio + porPagina);

    lista.innerHTML = slice.map(c => {
        const estado   = c.status.toLowerCase();
        const etiqueta = getEtiquetaEstado(c.status);
        const fecha    = new Date(c.redemptionDate).toLocaleDateString('es-ES');
        const icono    = c.rewardImageUrl
            ? `<img src="${c.rewardImageUrl}" alt="${c.rewardName}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
            : `<i class="fas fa-gift"></i>`;

        const badge = c.tipoBadge
            ? `<span style="font-size:0.72rem;background:#1a3a5c;color:gold;padding:2px 8px;border-radius:12px;margin-left:6px;">${c.tipoBadge}</span>`
            : '';

        const codigoRow = c.redemptionCode && c.redemptionCode !== '-'
            ? `<span><i class="fas fa-hashtag"></i> ${c.redemptionCode}</span>`
            : '';

        const puntosRow = c.pointsSpent > 0
            ? `<span><i class="fas fa-coins"></i> ${c.pointsSpent} pts</span>`
            : '';

        return `
            <div class="canjeado-item ${estado}">
                <div class="canjeado-imagen">${icono}</div>
                <div class="canjeado-info">
                    <div class="canjeado-titulo">${c.rewardName}${badge}</div>
                    <div class="canjeado-descripcion">${c.rewardDescription || ''}</div>
                    <div class="canjeado-metadata">
                        <span><i class="fas fa-calendar-alt"></i> ${fecha}</span>
                        ${puntosRow}
                        ${codigoRow}
                    </div>
                    ${c.expiresAt ? `<small style="color:#999">Vence: ${new Date(c.expiresAt).toLocaleDateString('es-ES')}</small>` : ''}
                </div>
                <div class="canjeado-estado estado-${estado}">${etiqueta}</div>
            </div>`;
    }).join('');

    renderCanjeadosPaginacion();
}

// ==============================================
// RENDER PAGINACIÓN CANJEADOS
// ==============================================
function renderCanjeadosPaginacion() {
    let paginacion = document.getElementById('canjeadosPaginacion');
    if (!paginacion) {
        const seccion = document.getElementById('canjeados-section');
        if (!seccion) return;
        paginacion = document.createElement('div');
        paginacion.id = 'canjeadosPaginacion';
        paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
        seccion.appendChild(paginacion);
    }

    const total        = premiosState.canjeadosCache.length;
    const porPagina    = premiosState.canjeadosPorPagina;
    const totalPaginas = Math.ceil(total / porPagina);
    const pagina       = premiosState.canjeadosPagina;

    if (totalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }

    paginacion.style.display = 'flex';
    paginacion.innerHTML = `
        <button onclick="window.cambiarPaginaCanjeados(${pagina - 1})"
            ${pagina === 1 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span style="font-size:0.9rem; color:#666;">
            Página ${pagina} de ${totalPaginas}
        </span>
        <button onclick="window.cambiarPaginaCanjeados(${pagina + 1})"
            ${pagina >= totalPaginas ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

window.cambiarPaginaCanjeados = function(pagina) {
    renderCanjeadosPagina(pagina);
    document.getElementById('canjeados-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ==============================================
// CARGAR PREMIOS DISPONIBLES
// ==============================================
window.cargarDisponibles = async function(pagina = 1) {
    const grid  = document.getElementById('premiosGrid');
    const token = localStorage.getItem('token');

    if (!grid) return;
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando premios...</p></div>';

    await cargarPuntosUsuario();

    try {
        const response = await fetch(`${CONFIG.API_URL}/rewards/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        let premios = await response.json();
        premiosState.premiosOriginalCache = premios;
        premiosState.premiosCache = aplicarFiltroYOrden(premios);
        premiosState.disponiblesPagina = pagina;

        if (premiosState.premiosCache.length === 0) {
            const filtroActivo = premiosState.filtroActual;
            const tipoLabel = filtroActivo === 'TICKET' ? 'entradas' : filtroActivo === 'MERCHANDISING' ? 'merchandising' : null;
            const mensaje = tipoLabel
                ? `No hay premios de tipo <strong>${tipoLabel}</strong> disponibles por el momento.`
                : 'No hay premios disponibles por el momento.';
            grid.innerHTML = `
                <div class="no-premios">
                    <i class="fas fa-box-open"></i>
                    <h3>¡Ups! Nada por aquí</h3>
                    <p>${mensaje}</p>
                    <p>¡Volvé pronto, estamos preparando nuevos premios!</p>
                    ${tipoLabel ? `<button class="btn-canjea" onclick="window.filtrarPremios('todos', this)">Ver todos los premios</button>` : ''}
                </div>`;
            return;
        }

        renderDisponiblesPagina(pagina);
        actualizarContadorDisponibles();

    } catch (error) {
        grid.innerHTML = '<div style="text-align:center;padding:3rem;color:#e50914;">Error al cargar los premios</div>';
    }
};

// ==============================================
// RENDER DE PÁGINA DE DISPONIBLES
// ==============================================
function renderDisponiblesPagina(pagina) {
    const grid = document.getElementById('premiosGrid');
    if (!grid) return;

    const premios      = premiosState.premiosCache;
    const porPagina    = premiosState.disponiblesPorPagina;
    const totalPaginas = Math.ceil(premios.length / porPagina);
    pagina = Math.max(1, Math.min(pagina, totalPaginas));
    premiosState.disponiblesPagina = pagina;

    const inicio = (pagina - 1) * porPagina;
    const slice  = premios.slice(inicio, inicio + porPagina);

    grid.innerHTML = slice.map(p => {
        const imagen = p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:0.5rem;">`
            : `<i class="fas fa-gift" style="font-size:3rem;color:#e50914;"></i>`;

        const badgeTipo = p.rewardType === 'TICKET'
                    ? '<span class="premio-badge">🎟️ Entrada</span>'
                    : p.rewardType === 'DESCUENTO'
                    ? '<span class="premio-badge">🏷️ Descuento</span>'
                    : p.rewardType === 'EXPERIENCIA'
                    ? '<span class="premio-badge">🎟️ Experiencia</span>'
                    : '<span class="premio-badge">🎁 Merchandising</span>';

        let btnLabel, btnDisabled;
        if (!p.hasStock) {
            btnLabel = 'Agotado'; btnDisabled = true;
        } else if (p.isExpired) {
            btnLabel = 'Expirado'; btnDisabled = true;
        } else if (!p.canRedeem) {
            btnLabel = `Necesitás ${p.pointsRequired - premiosState.puntosActuales} pts más`; btnDisabled = true;
        } else {
            btnLabel = '¡Quiero canjearlo!'; btnDisabled = false;
        }

        return `
            <div class="premio-card ${!p.hasStock || p.isExpired ? 'agotado' : ''}"
                 onclick="window.abrirModalPremio(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                 style="cursor:pointer;">
                <div class="premio-imagen">
                    ${imagen}
                    ${badgeTipo}
                </div>
                <div class="premio-info">
                    <h4 class="premio-titulo">${p.name}</h4>
                    <p class="premio-descripcion">${p.description || ''}</p>
                    <div class="premio-detalles">
                        <span class="premio-puntos"><i class="fas fa-coins"></i> ${p.pointsRequired} pts</span>
                        <span class="premio-stock"><i class="fas fa-boxes"></i> ${p.stock} disponibles</span>
                    </div>
                    <button class="btn-canjear"
                            onclick="event.stopPropagation(); window.canjearPremio(${p.id}, '${p.name}', ${p.pointsRequired})"
                            ${btnDisabled ? 'disabled' : ''}>
                        ${btnLabel}
                    </button>
                </div>
            </div>`;
    }).join('');

    renderDisponiblesPaginacion();
}

// ==============================================
// RENDER PAGINACIÓN DISPONIBLES
// ==============================================
function renderDisponiblesPaginacion() {
    let paginacion = document.getElementById('disponiblesPaginacion');
    if (!paginacion) {
        const seccion = document.getElementById('disponibles-section');
        if (!seccion) return;
        paginacion = document.createElement('div');
        paginacion.id = 'disponiblesPaginacion';
        paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
        seccion.appendChild(paginacion);
    }

    const total        = premiosState.premiosCache.length;
    const porPagina    = premiosState.disponiblesPorPagina;
    const totalPaginas = Math.ceil(total / porPagina);
    const pagina       = premiosState.disponiblesPagina;

    if (totalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }

    paginacion.style.display = 'flex';
    paginacion.innerHTML = `
        <button onclick="window.cambiarPaginaDisponibles(${pagina - 1})"
            ${pagina === 1 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span style="font-size:0.9rem; color:#666;">
            Página ${pagina} de ${totalPaginas}
        </span>
        <button onclick="window.cambiarPaginaDisponibles(${pagina + 1})"
            ${pagina >= totalPaginas ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

window.cambiarPaginaDisponibles = function(pagina) {
    renderDisponiblesPagina(pagina);
    document.getElementById('disponibles-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ==============================================
// CARGAR PREMIOS ESPECIALES (PREMIUM)
// ==============================================
window.cargarEspeciales = async function() {
    const grid  = document.getElementById('especialesGrid');
    const token = localStorage.getItem('token');
    if (!grid) return;

    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando premios especiales...</p></div>';

    // Consultar estado premium directo desde el servidor, no del token cacheado
    let isPremium = false;
    try {
        const profile = await API.getProfile();
        isPremium = profile.premium === true;
    } catch(e) {
        isPremium = typeof window.esPremiumActivo === 'function' && window.esPremiumActivo();
    }

    const bannerNoPremium = document.getElementById('especialesBannerNoPremium');
        const contenido       = document.getElementById('especialesContenido');
        if (bannerNoPremium) bannerNoPremium.style.display = isPremium ? 'none' : 'block';
        if (contenido)       contenido.style.display       = 'block';
        if (!isPremium) inicializarEspecialesBannerCarrusel();

    try {
        const url = premiosState.especialesFiltro !== 'todos'
            ? `${CONFIG.API_URL}/premium/rewards?type=${premiosState.especialesFiltro}`
            : `${CONFIG.API_URL}/premium/rewards`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const premios = await response.json();
        premiosState.especialesCache = premios;

        if (premios.length === 0) {
            grid.innerHTML = `
                <div class="no-premios">
                    <i class="fas fa-star"></i>
                    <h3>Próximamente</h3>
                    <p>Estamos preparando premios y sorteos exclusivos. ¡Volvé pronto!</p>
                </div>`;
            return;
        }

        renderEspecialesPagina(1, isPremium);
                actualizarContadorDisponibles();

            } catch (error) {
                grid.innerHTML = '<div style="text-align:center;padding:3rem;color:#e50914;">Error al cargar los premios especiales</div>';
            }
        };

// ==============================================
// RENDER DE PÁGINA DE ESPECIALES
// ==============================================
function renderEspecialesPagina(pagina, isPremium) {
    const grid = document.getElementById('especialesGrid');
    if (!grid) return;

    const premios      = premiosState.especialesCache;
    const porPagina    = premiosState.especialesPorPagina;
    const totalPaginas = Math.ceil(premios.length / porPagina);
    pagina = Math.max(1, Math.min(pagina, totalPaginas));
    premiosState.especialesPagina = pagina;

    const inicio = (pagina - 1) * porPagina;
    const slice  = premios.slice(inicio, inicio + porPagina);

    grid.innerHTML = slice.map(p => renderCardEspecial(p, isPremium)).join('');

    renderEspecialesPaginacion();
}

// ==============================================
// RENDER PAGINACIÓN ESPECIALES
// ==============================================
function renderEspecialesPaginacion() {
    let paginacion = document.getElementById('especialesPaginacion');
    if (!paginacion) {
        const seccion = document.getElementById('especiales-section');
        if (!seccion) return;
        paginacion = document.createElement('div');
        paginacion.id = 'especialesPaginacion';
        paginacion.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0;';
        seccion.appendChild(paginacion);
    }

    const total        = premiosState.especialesCache.length;
    const porPagina    = premiosState.especialesPorPagina;
    const totalPaginas = Math.ceil(total / porPagina);
    const pagina       = premiosState.especialesPagina;

    if (totalPaginas <= 1) {
        paginacion.style.display = 'none';
        return;
    }

    paginacion.style.display = 'flex';
    paginacion.innerHTML = `
        <button onclick="window.cambiarPaginaEspeciales(${pagina - 1})"
            ${pagina === 1 ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-left"></i>
        </button>
        <span style="font-size:0.9rem; color:#666;">
            Página ${pagina} de ${totalPaginas}
        </span>
        <button onclick="window.cambiarPaginaEspeciales(${pagina + 1})"
            ${pagina >= totalPaginas ? 'disabled' : ''}
            style="padding:0.4rem 0.9rem; border-radius:6px; border:1px solid #ddd; cursor:pointer; background:white;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

window.cambiarPaginaEspeciales = async function(pagina) {
    let isPremium = false;
    try {
        const profile = await API.getProfile();
        isPremium = profile.premium === true;
    } catch(e) {
        isPremium = typeof window.esPremiumActivo === 'function' && window.esPremiumActivo();
    }
    renderEspecialesPagina(pagina, isPremium);
    document.getElementById('especiales-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function renderCardEspecial(p, isPremium) {
    const imagen = p.imageUrl
        ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:0.5rem;">`
        : `<i class="fas fa-star" style="font-size:3rem;color:#1a3a6b;"></i>`;

    const esSorteo = p.type === 'SORTEO';

    const badge = p.type === 'SORTEO'      ? `<span class="premio-badge sorteo-badge">🎲 Sorteo gratuito</span>`
                : p.type === 'DESCUENTO'   ? `<span class="premio-badge">🏷️ Descuento</span>`
                : p.type === 'EXPERIENCIA' ? `<span class="premio-badge">🎟️ Experiencia</span>`
                : `<span class="premio-badge">⭐ Premio exclusivo</span>`;

    let infoExtra = '';
    if (esSorteo) {
        const fecha = p.drawDate
            ? new Date(p.drawDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'A confirmar';
        infoExtra = `
            <div class="sorteo-fecha"><i class="fas fa-calendar-alt"></i> Sorteo: ${fecha}</div>
            <div class="sorteo-participantes"><i class="fas fa-users"></i> ${p.totalEntries || 0} participantes</div>`;
    } else {
        infoExtra = `
            <div class="premio-detalles">
                <span class="premio-puntos"><i class="fas fa-coins"></i> ${p.pointsRequired} pts</span>
                ${p.stock != null ? `<span class="premio-stock"><i class="fas fa-boxes"></i> ${p.stock} disponibles</span>` : ''}
            </div>`;
    }

    let boton = '';
    if (!isPremium) {
        boton = `<button class="btn-canjear" disabled style="background:#ccc;cursor:not-allowed;">
                    🔒 Solo Premium
                 </button>`;
    } else if (esSorteo) {
        if (p.drawExecuted) {
            boton = `<button class="btn-participar" disabled>Sorteo finalizado</button>`;
        } else if (p.alreadyEntered) {
            boton = `<button class="btn-participar ya-anotado" disabled>✓ Ya estás anotado</button>`;
        } else {
            boton = `<button class="btn-participar"
                        onclick="event.stopPropagation(); window.participarSorteo(${p.id}, '${p.name}')">
                        Participar
                     </button>`;
        }
    } else {
        let btnLabel, btnDisabled;
        if (p.stock === 0 || p.stock != null && p.stock <= 0) {
            btnLabel = 'Agotado';
            btnDisabled = true;
        } else if (!p.canRedeem) {
            btnLabel = `Necesitás ${p.pointsRequired - premiosState.puntosActuales} pts más`;
            btnDisabled = true;
        } else {
            btnLabel = '¡Quiero canjearlo!';
            btnDisabled = false;
        }
        boton = `<button class="btn-canjear"
                    onclick="event.stopPropagation(); window.canjearEspecial(${p.id}, '${p.name}', ${p.pointsRequired})"
                    ${btnDisabled ? 'disabled' : ''}>
                    ${btnLabel}
                 </button>`;
    }

    const agotado = (!esSorteo && (p.stock != null && p.stock <= 0 || p.isExpired)) || (esSorteo && p.drawExecuted);
    return `
        <div class="premio-card ${agotado ? 'agotado' : ''}" style="cursor:pointer;"
             onclick="window.abrirModalEspecial(${JSON.stringify(p).replace(/"/g, '&quot;')}, ${isPremium})">
            <div class="premio-imagen">
                ${imagen}
                ${badge}
            </div>
            <div class="premio-info">
                <h4 class="premio-titulo">${p.name}</h4>
                <p class="premio-descripcion">${p.description || ''}</p>
                ${infoExtra}
                ${boton}
            </div>
        </div>`;
}

window.filtrarEspeciales = function(filtro) {
    premiosState.especialesFiltro = filtro;
    window.cargarEspeciales();
};

window.participarSorteo = async function(rewardId, rewardName) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${CONFIG.API_URL}/premium/rewards/${rewardId}/enter`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            showToast('error', err.error || 'Error al anotarte al sorteo');
            return;
        }

        showToast('success', `¡Te anotaste al sorteo de ${rewardName}!`);
        window.cargarEspeciales();

    } catch (error) {
        showToast('error', 'Error al procesar tu participación. Intentá de nuevo.');
    }
};

window.canjearEspecial = async function(rewardId, rewardName, pointsRequired) {
    const confirmado = await mostrarConfirmacion(rewardName, pointsRequired);
    if (!confirmado) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${CONFIG.API_URL}/premium/rewards/${rewardId}/redeem`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            showToast('error', err.error || 'Error al canjear el premio');
            return;
        }

        const result = await response.json();
        await cargarPuntosUsuario();
        window.cargarEspeciales();
        mostrarExito(rewardName, result.redemptionCode);

    } catch (error) {
        showToast('error', 'Error al canjear el premio. Intentá de nuevo.');
    }
};

// ==============================================
// FILTROS Y ORDEN
// ==============================================
function aplicarFiltroYOrden(premios) {
    let resultado = [...premios];

    if (premiosState.filtroActual === 'entradas') {
        resultado = resultado.filter(p => p.rewardType === 'TICKET');
    } else if (premiosState.filtroActual === 'merchandising') {
        resultado = resultado.filter(p => p.rewardType === 'MERCHANDISING');
    } else if (premiosState.filtroActual === 'descuento') {
        resultado = resultado.filter(p => p.rewardType === 'DESCUENTO');
    } else if (premiosState.filtroActual === 'experiencia') {
        resultado = resultado.filter(p => p.rewardType === 'EXPERIENCIA');
    }

    if (premiosState.ordenActual === 'puntos-menor') {
        resultado.sort((a, b) => a.pointsRequired - b.pointsRequired);
    } else if (premiosState.ordenActual === 'puntos-mayor') {
        resultado.sort((a, b) => b.pointsRequired - a.pointsRequired);
    } else if (premiosState.ordenActual === 'nombre') {
        resultado.sort((a, b) => a.name.localeCompare(b.name));
    }

    return resultado;
}

window.filtrarPremios = function(filtro) {
    premiosState.filtroActual = filtro;
    premiosState.disponiblesPagina = 1;
    premiosState.premiosCache = aplicarFiltroYOrden(premiosState.premiosOriginalCache);
    renderDisponiblesPagina(1);
};

window.ordenarPremios = function(orden) {
    premiosState.ordenActual = orden;
    premiosState.disponiblesPagina = 1;
    premiosState.premiosCache = aplicarFiltroYOrden(premiosState.premiosOriginalCache);
    renderDisponiblesPagina(1);
};

// ==============================================
// CANJEAR PREMIO
// ==============================================
window.canjearPremio = async function(rewardId, rewardName, pointsRequired) {
    const confirmado = await mostrarConfirmacion(rewardName, pointsRequired);
    if (!confirmado) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${CONFIG.API_URL}/redemptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rewardId })
        });

        if (!response.ok) {
            const err = await response.json();
            mostrarToast(err.error || 'Error al canjear el premio', 'error');
            return;
        }

        const redemption = await response.json();

        window.cerrarModalPremio();

        await cargarPuntosUsuario();
        if (typeof window.loadHeaderUserInfo === 'function') {
            window.loadHeaderUserInfo();
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        const profile = await API.getProfile();
        localStorage.setItem('userPoints', profile.totalPoints || 0);
        const levelChanged = profile.level && profile.level !== localStorage.getItem('userLevel');
        if (levelChanged) localStorage.setItem('userLevel', profile.level);

        await Promise.all([window.cargarDisponibles(), window.cargarCanjeados()]);

        mostrarExito(rewardName, redemption.redemptionCode, levelChanged ? () => {
            if (typeof window.showLevelUp === 'function') {
                window.showLevelUp(profile.level, profile.levelDisplayName);
            }
        } : null);

    } catch (error) {
        mostrarToast('Error al canjear el premio. Intentá de nuevo.', 'error');
    }
};

// Popup de confirmación custom
function mostrarConfirmacion(rewardName, pointsRequired) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'premio-popup-overlay';
        overlay.innerHTML = `
            <div class="premio-popup">
                <div class="premio-popup-icon">🎁</div>
                <h3>¿Confirmás el canje?</h3>
                <p>Estás a punto de canjear <strong>${rewardName}</strong></p>
                ${pointsRequired ? `<p class="premio-popup-puntos">Se descontarán <strong>${pointsRequired} pts</strong> de tu cuenta</p>` : ''}
                <div class="premio-popup-btns">
                    <button class="premio-popup-btn-cancelar" id="popupCancelar">Cancelar</button>
                    <button class="premio-popup-btn-confirmar" id="popupConfirmar">Sí, ¡canjear!</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('visible'), 10);

        document.getElementById('popupConfirmar').onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 250);
            resolve(true);
        };
        document.getElementById('popupCancelar').onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 250);
            resolve(false);
        };
    });
}

// Popup de éxito — acepta callback opcional que se ejecuta al cerrar
function mostrarExito(rewardName, code, onClose = null) {
    const overlay = document.createElement('div');
    overlay.className = 'premio-popup-overlay';
    overlay.innerHTML = `
        <div class="premio-popup premio-popup-exito">
            <div class="premio-popup-icon exito-icon">🏆</div>
            <h3>¡Felicitaciones!</h3>
            <p class="exito-nombre">El premio <strong>${rewardName}</strong> ya es tuyo.</p>
            <div class="exito-code">
                <span class="exito-code-label">Tu código de canje</span>
                <span class="exito-code-valor">${code}</span>
            </div>
            <p class="exito-info">Guardalo, lo vas a necesitar para reclamar tu premio.</p>
            <button class="premio-popup-btn-confirmar" id="popupCerrarExito">¡Genial!</button>
        </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 10);

    document.getElementById('popupCerrarExito').onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.remove();
                if (typeof onClose === 'function') onClose();
                // Sugerir activar notificaciones push (solo mobile, solo si no está activo)
                _sugerirActivarPush();
            }, 250);
        };
    }

    // Sugerir push después del canje — solo mobile, solo una vez por sesión
    async function _sugerirActivarPush() {
        // Solo mobile
        if (window.innerWidth > 768) return;
        // Solo si el browser soporta push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        // Solo si no está ya activo o bloqueado
        if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
        // Solo una vez por sesión
        if (sessionStorage.getItem('pushSugerido')) return;
        sessionStorage.setItem('pushSugerido', '1');

        // Pequeña pausa para no solapar con la animación del modal anterior
        await new Promise(resolve => setTimeout(resolve, 400));

        const overlay = document.createElement('div');
        overlay.className = 'premio-popup-overlay';
        overlay.innerHTML = `
            <div class="premio-popup">
                <div class="premio-popup-icon">🔔</div>
                <h3>¡No te pierdas el próximo premio!</h3>
                <p>Activá las notificaciones para enterarte antes que nadie cuando haya nuevos premios, sorteos y novedades exclusivas.</p>
                <div class="premio-popup-btns">
                    <button class="premio-popup-btn-cancelar" id="pushSugerirNo">Por ahora no</button>
                    <button class="premio-popup-btn-confirmar" id="pushSugerirSi">🔔 Sí, activar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('visible'), 10);

        document.getElementById('pushSugerirNo').onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('pushSugerirSi').onclick = async () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 250);
            if (typeof window.PushNotifications !== 'undefined') {
                await window.PushNotifications.solicitarPermiso();
            }
        };
    }

// ==============================================
// HELPERS
// ==============================================
function getEtiquetaEstado(status) {
    const labels = {
        PENDING:   'Pendiente',
        COMPLETED: 'Retirado',
        EXPIRED:   'Expirado',
        CANCELLED: 'Cancelado'
    };
    return labels[status] || status;
}

window.irASuscripcion = function() {
    if (typeof window.abrirDetallePlan === 'function') {
        window.abrirDetallePlan();
    } else {
        const btnMiCuenta = document.querySelector('[onclick*="mi-cuenta"]');
        if (btnMiCuenta) btnMiCuenta.click();
        setTimeout(() => {
            if (typeof window.abrirDetallePlan === 'function') {
                window.abrirDetallePlan();
            }
        }, 800);
    }
};

function inicializarEspecialesBannerCarrusel() {
    if (window.innerWidth > 480) return;

    const list = document.getElementById('especialesBenefitsList');
    const dots = document.getElementById('especialesBenefitsDots');
    if (!list || !dots) return;

    dots.innerHTML = '';

    const items      = Array.from(list.querySelectorAll('li'));
    const perPage    = 3;
    const totalPages = Math.ceil(items.length / perPage);
    let current      = 0;

    for (let i = 0; i < totalPages; i++) {
        const d = document.createElement('span');
        d.className = 'premium-benefit-dot' + (i === 0 ? ' active' : '');
        d.onclick = () => goTo(i);
        dots.appendChild(d);
    }

    function goTo(page) {
        current = page;
        items.forEach((li, idx) => {
            li.style.display = (idx >= page * perPage && idx < (page + 1) * perPage) ? '' : 'none';
        });
        dots.querySelectorAll('.premium-benefit-dot').forEach((d, i) => {
            d.classList.toggle('active', i === page);
        });
    }

    goTo(0);

    let startX = 0;
    list.addEventListener('touchstart', e => startX = e.touches[0].clientX);
    list.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            if (diff > 0 && current < totalPages - 1) goTo(current + 1);
            if (diff < 0 && current > 0) goTo(current - 1);
        }
    });
}

// ==============================================
// INICIALIZACIÓN
// ==============================================
window['init_mis-premios'] = function() {
    cargarPuntosUsuario();
    window.cargarCanjeados();
    cargarPrecioPlanEspeciales();
    inicializarEspecialesBannerCarrusel();

    // Cargar contador de premios disponibles al iniciar
    Promise.all([
        window.cargarDisponibles(),
        window.cargarEspeciales()
    ]).then(() => actualizarContadorDisponibles());
};

async function cargarPrecioPlanEspeciales() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${CONFIG.API_URL}/subscriptions/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const sub = await res.json();
            if (sub && sub.planPrice != null) {
                const el = document.getElementById('especialesPlanPrice');
                if (el) {
                    const val = Math.round(Number(sub.planPrice));
                    el.textContent = '$' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                }
            }
        }
    } catch (e) { /* fallback hardcodeado queda visible */ }
}

// ==============================================
// MODAL DE DETALLE DE PREMIO (DISPONIBLES)
// ==============================================
let premioActual = null;

// ================================================
// TABS DE MODALES DE PREMIOS
// ================================================
window.switchModalTab = function(tipo, n) {
    const prefix = tipo === 'premio' ? 'Premio' : 'Especial';
    [1, 2, 3, 4, 5].forEach(i => {
        const panel = document.getElementById(`panel${prefix}${i}`);
        const tab   = document.getElementById(`tab${prefix}${i}`);
        if (panel) panel.style.display = i === n ? 'block' : 'none';
        if (tab) {
            tab.classList.toggle('active', i === n);
        }
    });
};

function buildDetallesExtra(p, tipo) {
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
            if (p.discountCode)          items.push(['fas fa-barcode',     'Código',                  p.discountCode]);
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

        // Campos de entrega comunes (todos los tipos)
        const modalidadMap = { RETIRO_PRESENCIAL: '📍 Retiro presencial', ENTREGA_DIGITAL: '📧 Entrega digital', COORDINACION_TERCERO: '🤝 Coordinación con tercero', ENVIO_DOMICILIO: '🚚 Envío a domicilio' };
        const costoMap     = { GRATUITO: '✅ Gratuito', A_CARGO_GANADOR: '💸 A cargo del ganador', COORDINAR_TERCERO: '🤝 Coordinar con tercero' };
        if (p.deliveryMethod)  items.push(['fas fa-truck', 'Modalidad de entrega', modalidadMap[p.deliveryMethod] || p.deliveryMethod]);
        if (p.pickupPoint && p.deliveryMethod === 'RETIRO_PRESENCIAL') items.push(['fas fa-map-marker-alt', 'Punto de retiro', p.pickupPoint]);
        if (p.deliveryCost)    items.push(['fas fa-dollar-sign', 'Costo de entrega', costoMap[p.deliveryCost] || p.deliveryCost]);

        return items;
}

function renderTabsModal(p, tipoReward, prefixModal) {
    const items = buildDetallesExtra(p, tipoReward);
    const tab2  = document.getElementById(`tab${prefixModal}2`);
    const tab3  = document.getElementById(`tab${prefixModal}3`);
    const panel2 = document.getElementById(`panel${prefixModal}2`);

    if (items.length > 0 && tab2) {
        tab2.style.display = 'inline-block';
        const grid = document.getElementById(`modal${prefixModal}DetallesExtra`);
        if (grid) {
            grid.innerHTML = items.map(([icon, label, value]) => `
                <div class="modal-premio-detalle-item">
                    <span class="detalle-label"><i class="${icon}"></i> ${label}</span>
                    <span class="detalle-value" style="text-align:right;max-width:55%;word-break:break-word;">${value}</span>
                </div>`).join('');
        }
    } else if (tab2) {
        tab2.style.display = 'none';
        if (panel2) panel2.style.display = 'none';
    }

    if (p.termsConditions && tab3) {
            tab3.style.display = 'inline-block';
        } else if (tab3) {
            tab3.style.display = 'none';
        }

        // Tab Resultados — solo para sorteos
                const tab4 = document.getElementById(`tab${prefixModal}4`);
                if (tab4) {
                    if (p.type === 'SORTEO') {
                        tab4.style.display = 'inline-block';
                        _renderResultados(p);
                    } else {
                        tab4.style.display = 'none';
                    }
                }

                // Tab Detalles del premio — solo para sorteos con prizeDetails
                const tab5 = document.getElementById(`tab${prefixModal}5`);
                const panel5 = document.getElementById(`panel${prefixModal}5`);
                if (tab5) {
                    if (p.type === 'SORTEO' && p.prizeDetails) {
                        tab5.style.display = 'inline-block';
                        const el = document.getElementById(`modal${prefixModal}DetallesPremio`);
                        if (el) el.innerHTML = p.prizeDetails.replace(/\n/g, '<br>');
                    } else {
                        tab5.style.display = 'none';
                        if (panel5) panel5.style.display = 'none';
                    }
                }

        window.switchModalTab(prefixModal === 'Premio' ? 'premio' : 'especial', 1);
    }

    function _renderResultados(p) {
        const pendiente  = document.getElementById('resultadosPendiente');
        const ejecutado  = document.getElementById('resultadosEjecutado');
        if (!pendiente || !ejecutado) return;

        if (!p.drawExecuted) {
            pendiente.style.display  = 'block';
            ejecutado.style.display  = 'none';
            return;
        }

        pendiente.style.display = 'none';
        ejecutado.style.display = 'block';

        // Ganador
        const ganadorNombre = document.getElementById('resultadoGanadorNombre');
        const ganadorEl     = document.getElementById('resultadoGanador');
        if (p.winner1Name) {
            ganadorNombre.textContent = p.winner1Name;
            ganadorEl.onclick = () => {
                if (p.winner1Id && typeof window.abrirPerfilUsuario === 'function') {
                    window.cerrarModalEspecial();
                    window.abrirPerfilUsuario(p.winner1Id);
                }
            };
        } else {
            ganadorEl.style.display = 'none';
        }

        // Suplente 1
        const suplente1Nombre = document.getElementById('resultadoSuplente1Nombre');
        const suplente1El     = document.getElementById('resultadoSuplente1');
        if (p.winner2Name) {
            suplente1Nombre.textContent = p.winner2Name;
            suplente1El.onclick = () => {
                if (p.winner2Id && typeof window.abrirPerfilUsuario === 'function') {
                    window.cerrarModalEspecial();
                    window.abrirPerfilUsuario(p.winner2Id);
                }
            };
        } else {
            suplente1El.style.display = 'none';
        }

        // Suplente 2
        const suplente2Nombre = document.getElementById('resultadoSuplente2Nombre');
        const suplente2El     = document.getElementById('resultadoSuplente2');
        if (p.winner3Name) {
            suplente2Nombre.textContent = p.winner3Name;
            suplente2El.onclick = () => {
                if (p.winner3Id && typeof window.abrirPerfilUsuario === 'function') {
                    window.cerrarModalEspecial();
                    window.abrirPerfilUsuario(p.winner3Id);
                }
            };
        } else {
            suplente2El.style.display = 'none';
        }
    }

window.abrirModalPremio = function(premio) {
    premioActual = premio;

    document.getElementById('modalPremioTitulo').textContent = premio.name;
    document.getElementById('modalPremioBadge').textContent =
        premio.rewardType === 'TICKET' ? '🎟️ Entrada' : '🎁 Merchandising';

    const img         = document.getElementById('modalPremioImg');
    const placeholder = document.getElementById('modalPremioImgPlaceholder');
    const imagenes    = (premio.images && premio.images.length > 0)
        ? premio.images.map(i => i.imageUrl)
        : (premio.imageUrl ? [premio.imageUrl] : []);

    renderCarrusel(imagenes, img, placeholder,
        document.getElementById('premioBtnPrev'),
        document.getElementById('premioBtnNext'),
        document.getElementById('premioMiniaturas'),
        'premio');

    document.getElementById('modalPremioDescripcion').textContent = premio.description || '';
    document.getElementById('modalPremioPuntos').textContent = premio.pointsRequired + ' pts';
    document.getElementById('modalPremioStock').textContent = premio.stock + ' disponibles';
    document.getElementById('modalPremioMisPuntos').textContent = premiosState.puntosActuales;

    const vencRow = document.getElementById('modalPremioVencimientoRow');
    if (premio.expiryDate) {
        vencRow.style.display = 'flex';
        document.getElementById('modalPremioVencimiento').textContent =
            new Date(premio.expiryDate).toLocaleDateString('es-ES');
    } else {
        vencRow.style.display = 'none';
    }

    const partnerRow  = document.getElementById('modalPremioPartnerRow');
    const partnerSpan = document.getElementById('modalPremioPartner');
    if (premio.partner) {
        partnerRow.style.display = 'flex';
        partnerSpan.textContent = premio.partner;
    } else {
        partnerRow.style.display = 'none';
    }

    const websiteRow  = document.getElementById('modalPremioWebsiteRow');
    const websiteLink = document.getElementById('modalPremioWebsiteLink');
    if (premio.website) {
        websiteRow.style.display = 'flex';
        websiteLink.href = premio.website;
        websiteLink.textContent = premio.website;
        websiteLink.target = '_blank';
        websiteLink.rel = 'noopener noreferrer';
    } else {
        websiteRow.style.display = 'none';
        websiteLink.href = '#';
        websiteLink.textContent = '-';
    }

    if (premio.termsConditions) {
            document.getElementById('modalPremioTerminos').textContent = premio.termsConditions;
        }

        const rewardTipo = premio.rewardType || '';
        renderTabsModal(premio, rewardTipo, 'Premio');

        const btn = document.getElementById('btnCanjearModal');
    if (!premio.hasStock) {
        btn.textContent = 'Agotado'; btn.disabled = true;
    } else if (premio.isExpired) {
        btn.textContent = 'Expirado'; btn.disabled = true;
    } else if (!premio.canRedeem) {
        btn.textContent = `Necesitás ${premio.pointsRequired - premiosState.puntosActuales} pts más`;
        btn.disabled = true;
    } else {
        btn.textContent = `¡Quiero canjear mis ${premio.pointsRequired} pts!`;
        btn.disabled = false;
    }

    const modal = document.getElementById('modalPremio');
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => modal.classList.add('open'), 10);
    };

    window.cerrarModalPremio = function() {
        const modal = document.getElementById('modalPremio');
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 260);
        premioActual = null;
    };

window.canjearDesdeModal = async function() {
    if (!premioActual) return;
    const premio = { ...premioActual };

    const confirmado = await mostrarConfirmacion(premio.name, premio.pointsRequired);
    if (!confirmado) return;

    window.cerrarModalPremio();

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${CONFIG.API_URL}/redemptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rewardId: premio.id })
        });

        if (!response.ok) {
            const err = await response.json();
            mostrarToast(err.error || 'Error al canjear el premio', 'error');
            return;
        }

        const redemption = await response.json();
        await cargarPuntosUsuario();
        if (typeof window.loadHeaderUserInfo === 'function') {
            window.loadHeaderUserInfo();
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        const profile = await API.getProfile();
        localStorage.setItem('userPoints', profile.totalPoints || 0);
        const levelChanged = profile.level && profile.level !== localStorage.getItem('userLevel');
        if (levelChanged) localStorage.setItem('userLevel', profile.level);

        await Promise.all([window.cargarDisponibles(), window.cargarCanjeados()]);

        mostrarExito(premio.name, redemption.redemptionCode, levelChanged ? () => {
            if (typeof window.showLevelUp === 'function') {
                window.showLevelUp(profile.level, profile.levelDisplayName);
            }
        } : null);

    } catch (error) {
        mostrarToast('Error al canjear el premio. Intentá de nuevo.', 'error');
    }
};

// ==============================================
// MODAL DE DETALLE PREMIO ESPECIAL
// ==============================================
let especialActual = null;

window.abrirModalEspecial = function(p, isPremium) {
    especialActual = p;
    const esSorteo = p.type === 'SORTEO';

    document.getElementById('modalEspecialTitulo').textContent = p.name;
    document.getElementById('modalEspecialBadge').textContent =
            p.type === 'SORTEO'      ? '🎲 Sorteo gratuito'  :
            p.type === 'DESCUENTO'   ? '🏷️ Descuento'        :
            p.type === 'EXPERIENCIA' ? '🎟️ Experiencia'       :
                                       '⭐ Premio exclusivo';

    // Imagen
    const img         = document.getElementById('modalEspecialImg');
    const placeholder = document.getElementById('modalEspecialImgPlaceholder');
    const imagenes    = (p.images && p.images.length > 0)
        ? p.images.map(i => i.imageUrl)
        : (p.imageUrl ? [p.imageUrl] : []);

    renderCarrusel(imagenes, img, placeholder,
        document.getElementById('especialBtnPrev'),
        document.getElementById('especialBtnNext'),
        document.getElementById('especialMiniaturas'),
        'especial');

    document.getElementById('modalEspecialDescripcion').textContent = p.description || '';

    // Filas según tipo
    const puntosRow    = document.getElementById('modalEspecialPuntosRow');
    const stockRow     = document.getElementById('modalEspecialStockRow');
    const fechaRow     = document.getElementById('modalEspecialFechaRow');
    const participRow  = document.getElementById('modalEspecialParticipantesRow');
    const misPuntosBox = document.getElementById('modalEspecialMisPuntosBox');

    // Partner
    const partnerRow  = document.getElementById('modalEspecialPartnerRow');
    const partnerSpan = document.getElementById('modalEspecialPartner');
    if (p.partner) {
        partnerRow.style.display = 'flex';
        partnerSpan.textContent  = p.partner;
    } else {
        partnerRow.style.display = 'none';
    }

    // Website
    const websiteRow  = document.getElementById('modalEspecialWebsiteRow');
    const websiteLink = document.getElementById('modalEspecialWebsiteLink');
    if (p.website) {
        websiteRow.style.display  = 'flex';
        websiteLink.href          = p.website;
        websiteLink.textContent   = p.website;
    } else {
        websiteRow.style.display  = 'none';
        websiteLink.href          = '#';
        websiteLink.textContent   = '-';
    }

    if (p.termsConditions) {
            document.getElementById('modalEspecialTerminos').textContent = p.termsConditions;
        }

        const especialTipo = p.type || '';
        renderTabsModal(p, especialTipo, 'Especial');

        if (esSorteo) {
        puntosRow.style.display    = 'none';
        stockRow.style.display     = 'none';
        fechaRow.style.display     = 'flex';
        participRow.style.display  = 'flex';
        misPuntosBox.style.display = 'none';

        const fecha = p.drawDate
            ? new Date(p.drawDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'A confirmar';
        document.getElementById('modalEspecialFecha').textContent         = fecha;
        document.getElementById('modalEspecialParticipantes').textContent = `${p.totalEntries || 0} anotados`;

        // Fila ganador — solo si el sorteo fue ejecutado
        const ganadorRow  = document.getElementById('modalEspecialGanadorRow');
        const ganadorSpan = document.getElementById('modalEspecialGanador');
        if (ganadorRow && ganadorSpan) {
            if (p.drawExecuted && p.winnerName) {
                ganadorRow.style.display = 'flex';
                ganadorSpan.textContent  = p.winnerName;
            } else {
                ganadorRow.style.display = 'none';
            }
        }
    } else {
        puntosRow.style.display    = 'flex';
        stockRow.style.display     = 'flex';
        fechaRow.style.display     = 'none';
        participRow.style.display  = 'none';
        misPuntosBox.style.display = 'block';

        document.getElementById('modalEspecialPuntos').textContent    = `${p.pointsRequired} pts`;
        document.getElementById('modalEspecialStock').textContent     = p.stock != null ? `${p.stock} disponibles` : 'Ilimitado';
        document.getElementById('modalEspecialMisPuntos').textContent = premiosState.puntosActuales;
    }

    // Botón acción
    const btn = document.getElementById('btnEspecialAccion');
    const btnDesktop = document.getElementById('btnEspecialAccionDesktop');
    btn.style.color = 'white';
    if (!isPremium) {
        btn.textContent      = '🔒 Solo Premium';
        btn.disabled         = true;
        btn.style.background = '#ccc';
        btn.style.color      = '#666';
    } else if (esSorteo) {
        if (p.drawExecuted) {
            btn.textContent      = 'Sorteo finalizado';
            btn.disabled         = true;
            btn.style.background = '#ccc';
            btn.style.color      = '#666';
        } else if (p.alreadyEntered) {
            btn.textContent      = '✓ Ya estás anotado';
            btn.disabled         = true;
            btn.style.background = '#e8f5e9';
            btn.style.color      = '#2e7d32';
        } else {
            btn.textContent      = '¡Participar en el sorteo!';
            btn.disabled         = false;
            btn.style.background = '#1a3a6b';
            btn.style.color      = 'white';
        }
    } else {
        if (p.stock === 0 || (p.stock != null && p.stock <= 0)) {
            btn.textContent      = 'Agotado';
            btn.disabled         = true;
            btn.style.background = '#ccc';
            btn.style.color      = '#666';
        } else if (!p.canRedeem) {
            btn.textContent      = `Necesitás ${p.pointsRequired - premiosState.puntosActuales} pts más`;
            btn.disabled         = true;
            btn.style.background = '#ccc';
            btn.style.color      = '#666';
        } else {
            btn.textContent      = `¡Canjear por ${p.pointsRequired} pts!`;
            btn.disabled         = false;
            btn.style.background = '#e50914';
            btn.style.color      = 'white';
        }
    }

    if (btnDesktop) {
            btnDesktop.textContent      = btn.textContent;
            btnDesktop.disabled         = btn.disabled;
            btnDesktop.style.background = btn.style.background;
            btnDesktop.style.color      = btn.style.color;
        }

        const modal = document.getElementById('modalEspecial');
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            setTimeout(() => modal.classList.add('open'), 10);
    };

window.cerrarModalEspecial = function() {
    const modal = document.getElementById('modalEspecial');
    modal.classList.remove('open');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 260);
    especialActual = null;
};

window.accionDesdeModalEspecial = async function() {
    if (!especialActual) return;
    const p = { ...especialActual };

    // Verificar premium directo desde el servidor
    let isPremium = false;
    try {
        const profile = await API.getProfile();
        isPremium = profile.premium === true;
    } catch(e) {
        isPremium = typeof window.esPremiumActivo === 'function' && window.esPremiumActivo();
    }

    if (!isPremium) return;

    window.cerrarModalEspecial();

    if (p.type === 'SORTEO') {
        await window.participarSorteo(p.id, p.name);
    } else {
        await window.canjearEspecial(p.id, p.name, p.pointsRequired);
    }
};

// ==============================================
// CERRAR CON ESCAPE
// ==============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.cerrarModalPremio();
        window.cerrarModalEspecial();
    }
});

// ==============================================
// CARRUSEL DE IMÁGENES DE PREMIOS
// ==============================================
const carruselState = { premio: { imagenes: [], actual: 0 }, especial: { imagenes: [], actual: 0 } };

function renderCarrusel(imagenes, imgEl, placeholderEl, btnPrev, btnNext, miniaturasEl, tipo) {
    carruselState[tipo] = { imagenes, actual: 0 };

    if (imagenes.length === 0) {
        imgEl.style.display         = 'none';
        placeholderEl.style.display = 'flex';
        btnPrev.style.display       = 'none';
        btnNext.style.display       = 'none';
        miniaturasEl.style.display  = 'none';
        const dotsElVacio = document.getElementById(tipo === 'premio' ? 'premioDots' : 'especialDots');
        if (dotsElVacio) dotsElVacio.innerHTML = '';
        return;
    }

    imgEl.src               = imagenes[0];
    imgEl.style.display     = 'block';
    placeholderEl.style.display = 'none';

    const hayVarias = imagenes.length > 1;
    btnPrev.style.display = hayVarias ? 'flex' : 'none';
    btnNext.style.display = hayVarias ? 'flex' : 'none';

    miniaturasEl.style.display = 'none';
    miniaturasEl.innerHTML     = '';

    // Dots (visibles solo en mobile via CSS)
    const dotsEl = document.getElementById(tipo === 'premio' ? 'premioDots' : 'especialDots');
    if (dotsEl) {
        if (hayVarias) {
            dotsEl.innerHTML = imagenes.map((_, i) =>
                `<span class="dot${i === 0 ? ' activo' : ''}" onclick="irAImagenCarrusel('${tipo}', ${i})"></span>`
            ).join('');
        } else {
            dotsEl.innerHTML = '';
        }
    }

    // Drag táctil (mobile)
    iniciarDragCarrusel(imgEl, tipo);
}

window.cambiarImagenPremio   = function(dir) { moverCarrusel('premio', dir); };
window.cambiarImagenEspecial = function(dir) { moverCarrusel('especial', dir); };

function moverCarrusel(tipo, dir) {
    const state = carruselState[tipo];
    state.actual = (state.actual + dir + state.imagenes.length) % state.imagenes.length;
    actualizarCarrusel(tipo);
}

window.irAImagenCarrusel = function(tipo, idx) {
    carruselState[tipo].actual = idx;
    actualizarCarrusel(tipo);
};

function actualizarCarrusel(tipo) {
    const state    = carruselState[tipo];
    const esPremio = tipo === 'premio';
    const imgEl    = document.getElementById(esPremio ? 'modalPremioImg' : 'modalEspecialImg');
    const miniEl   = document.getElementById(esPremio ? 'premioMiniaturas' : 'especialMiniaturas');
    const dotsEl   = document.getElementById(esPremio ? 'premioDots' : 'especialDots');

    imgEl.src = state.imagenes[state.actual];
    miniEl.querySelectorAll('.miniatura').forEach((m, i) =>
        m.classList.toggle('activa', i === state.actual));
    if (dotsEl) {
        dotsEl.querySelectorAll('.dot').forEach((d, i) =>
            d.classList.toggle('activo', i === state.actual));
    }
}

// Handlers globales únicos por tipo — evita acumulación de listeners
const _carruselHandlers = {};

function iniciarDragCarrusel(imgEl, tipo) {
    // Remover listeners anteriores si existen
    if (_carruselHandlers[tipo]) {
        imgEl.removeEventListener('touchstart', _carruselHandlers[tipo].start);
        imgEl.removeEventListener('touchend',   _carruselHandlers[tipo].end);
    }

    let startX   = 0;
    let startY   = 0;
    let dragging = false;

    const onStart = (e) => {
        startX   = e.touches[0].clientX;
        startY   = e.touches[0].clientY;
        dragging = true;
    };

    const onEnd = (e) => {
        if (!dragging) return;
        dragging = false;
        const diffX = startX - e.changedTouches[0].clientX;
        const diffY = Math.abs(startY - e.changedTouches[0].clientY);
        // Solo swipe horizontal (ignorar si hay más movimiento vertical)
        if (Math.abs(diffX) > 40 && diffY < Math.abs(diffX)) {
            moverCarrusel(tipo, diffX > 0 ? 1 : -1);
        }
    };

    _carruselHandlers[tipo] = { start: onStart, end: onEnd };

    imgEl.addEventListener('touchstart', onStart, { passive: true });
    imgEl.addEventListener('touchend',   onEnd,   { passive: true });
}