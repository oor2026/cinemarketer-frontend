// ==============================================
// module-loader.js - Cargador de Módulos con Hash Routing
// ==============================================

const MODULE_PATH = 'modules/';
const CSS_PATH = 'css/';
const JS_PATH = 'js/';

// ==============================================
// MÓDULOS CON BANNER PUBLICITARIO HABILITADO
// Agregar aquí el nombre del módulo para activar
// el sidebar de ads en esa vista.
// ==============================================
const MODULES_WITH_ADS = ['mi-cuenta', 'mis-puntos', 'mis-premios', 'mis-consultas', 'contacto', 'feed-films'];

// Mapa de nombre de módulo → valor del enum en el backend
const MODULO_API_MAP = {
    'mi-cuenta':    'MI_CUENTA',
    'mis-puntos':   'MIS_PUNTOS',
    'mis-premios':  'MIS_PREMIOS',
    'mis-consultas':'MIS_CONSULTAS',
    'contacto':     'CONTACTO',
    'feed-films':   'FEED_FILMS'
};

// Módulos donde aplica el splash mobile
const MODULES_WITH_SPLASH = ['feed-films', 'mi-cuenta', 'mis-puntos', 'mis-premios', 'mis-consultas', 'contacto'];

// Clave de sessionStorage para controlar que solo aparezca una vez por sesión por módulo
function splashKey(moduleName) {
    return `splash_shown_${moduleName}`;
}

window._splashTimer = null;

window.cerrarSplashAd = function() {
    const overlay = document.getElementById('splashAdOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window._splashTimer) { clearInterval(window._splashTimer); window._splashTimer = null; }
};

async function mostrarSplashMobile(moduleName) {
    // Solo mobile
    if (window.innerWidth > 768) return;

    // Solo una vez por sesión por módulo
    if (sessionStorage.getItem(splashKey(moduleName))) return;

    if (!MODULES_WITH_SPLASH.includes(moduleName)) return;

    try {
        const moduloApi = MODULO_API_MAP[moduleName] || moduleName.toUpperCase().replace(/-/g, '_');
        const res = await fetch(`${CONFIG.API_URL}/banners?modulo=${moduloApi}`);
        if (!res.ok) return;
        const banners = await res.json();
        const banner = banners.find(b => b.posicion === 'SPLASH' && b.imageUrl);
        if (!banner) return;

        const overlay = document.getElementById('splashAdOverlay');
        const img     = document.getElementById('splashAdImg');
        const link    = document.getElementById('splashAdLink');
        const countdown = document.getElementById('splashCountdown');
        const closeBtn  = document.getElementById('splashCloseBtn');

        if (!overlay || !img) return;

        img.src   = banner.imageUrl;
        img.alt   = banner.nombreMarca || 'Publicidad';
        link.href = banner.linkDestino || '#';

        overlay.style.display = 'flex';
        sessionStorage.setItem(splashKey(moduleName), '1');

        // Countdown de 5 segundos
        let segundos = 5;
        if (countdown) { countdown.textContent = segundos; countdown.style.display = 'block'; }
        if (closeBtn)    closeBtn.style.display = 'none';

        window._splashTimer = setInterval(() => {
            segundos--;
            if (countdown) countdown.textContent = segundos;
            if (segundos <= 0) {
                clearInterval(window._splashTimer);
                window._splashTimer = null;
                if (countdown) countdown.style.display = 'none';
                if (closeBtn)  closeBtn.style.display  = 'block';
                // Cerrar automáticamente después de mostrar el botón por 2 segundos más
                setTimeout(() => window.cerrarSplashAd(), 2000);
            }
        }, 1000);

    } catch(e) {}
}

function actualizarClaseModulo(moduleName) {
    document.body.className = document.body.className
        .split(' ')
        .filter(c => !c.startsWith('modulo-'))
        .join(' ');
    document.body.classList.add(`modulo-${moduleName}`);
}

// ==============================================
// CARGAR BANNERS DESDE LA API
// Consulta GET /api/banners?modulo=XX y monta
// las imágenes en los sidebars izquierdo y derecho
// ==============================================
async function cargarBanners(moduleName) {
    const moduloApi = MODULO_API_MAP[moduleName];

    // Resetear ambos sidebars a vacío por defecto
    const sidebarLeft  = document.getElementById('adsSidebarLeft');
    const sidebarRight = document.getElementById('adsSidebarRight');
    const imgLeft      = document.getElementById('adBannerImgLeft');
    const linkLeft     = document.getElementById('adBannerLinkLeft');
    const imgRight     = document.getElementById('adBannerImg');
    const linkRight    = document.getElementById('adBannerLink');

    // Ocultar imágenes y marcar como vacíos
    if (imgLeft)  { imgLeft.src  = ''; imgLeft.style.display  = 'none'; }
    if (imgRight) { imgRight.src = ''; imgRight.style.display = 'none'; }
    if (linkLeft)  linkLeft.href  = '#';
    if (linkRight) linkRight.href = '#';
    if (sidebarLeft)  sidebarLeft.classList.add('ad-empty');
    if (sidebarRight) sidebarRight.classList.add('ad-empty');

    // Resetear banner horizontal por defecto
    const feedBanner = document.getElementById('feedBannerHorizontal');
    if (feedBanner) feedBanner.style.display = 'none';

    // Si el módulo no tiene ads habilitados, no consultar la API
    if (!moduloApi || !MODULES_WITH_ADS.includes(moduleName)) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}/banners?modulo=${moduloApi}`);
        if (!res.ok) return;
        const banners = await res.json();

        banners.forEach(banner => {
            if (!banner.imageUrl) return;

            if (banner.posicion === 'IZQUIERDO' && imgLeft && linkLeft && sidebarLeft) {
                imgLeft.src           = banner.imageUrl;
                imgLeft.alt           = banner.nombreMarca || 'Publicidad';
                imgLeft.style.display = 'block';
                linkLeft.href         = banner.linkDestino || '#';
                sidebarLeft.classList.remove('ad-empty');
            }

            if (banner.posicion === 'DERECHO' && imgRight && linkRight && sidebarRight) {
                imgRight.src           = banner.imageUrl;
                imgRight.alt           = banner.nombreMarca || 'Publicidad';
                imgRight.style.display = 'block';
                linkRight.href         = banner.linkDestino || '#';
                sidebarRight.classList.remove('ad-empty');
            }

            if (banner.posicion === 'SPLASH') return; // Lo maneja mostrarSplashMobile
            if (banner.posicion === 'HORIZONTAL') {
                const bloque = document.getElementById('feedBannerHorizontal');
                const img    = document.getElementById('feedBannerImg');
                const link   = document.getElementById('feedBannerLink');
                if (bloque && img && link) {
                    img.src              = banner.imageUrl;
                    img.alt              = banner.nombreMarca || 'Publicidad';
                    link.href            = banner.linkDestino || '#';
                    bloque.style.display = 'block';
                }
            }
        });

    } catch (e) {
        // Falla silenciosa — los sidebars quedan vacíos, no rompe la experiencia
    }
}

async function loadModule(moduleName, element = null, updateHash = true) {

    if (!localStorage.getItem('token')) {
        window.location.replace('login.html');
        return;
    }

    const container = document.getElementById('module-container');
    if (!container) return;

    container.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (element) element.classList.add('active');

    // Actualiza la clase del body según el módulo — controla visibilidad del banner
    actualizarClaseModulo(moduleName);

    // Carga los banners correspondientes al módulo desde la API
    // Se ejecuta después del timeout para asegurar que el HTML del módulo ya está en el DOM
    setTimeout(() => cargarBanners(moduleName), 300);

    // Splash mobile — solo una vez por sesión por módulo
        mostrarSplashMobile(moduleName);

    try {
        // HTML
        const htmlResponse = await fetch(`${MODULE_PATH}${moduleName}.html`);
        if (!htmlResponse.ok) throw new Error(`Error HTTP: ${htmlResponse.status}`);

        container.innerHTML = await htmlResponse.text();
        window.scrollTo(0, 0);

        // CSS
        const cssId = `css-${moduleName}`;
        const existingCss = document.getElementById(cssId);
        if (existingCss) existingCss.remove();
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = `${CSS_PATH}${moduleName}.css?v=${Date.now()}`;
        document.head.appendChild(link);

        // JS
        const jsId = `js-${moduleName}`;
        await new Promise((resolve) => {
            if (document.getElementById(jsId)) {
                resolve();
            } else {
                const script = document.createElement('script');
                script.id = jsId;
                script.src = `${JS_PATH}${moduleName}.js?v=2`;
                script.onload = () => resolve();
                script.onerror = () => resolve();
                document.head.appendChild(script);
            }
        });

        // Inicializadores específicos
        setTimeout(() => {
            const initFn = window[`init_${moduleName}`];

            if (typeof initFn === 'function') {
                initFn();
            } else {
                if (moduleName === 'feed-films' && typeof window.cargarPeliculasPopulares === 'function') {
                                    window.cargarPeliculasPopulares(1);
                } else if (moduleName === 'mis-premios' && typeof window.cargarCanjeados === 'function') {
                    window.cargarCanjeados();
                } else if (moduleName === 'mi-cuenta' && typeof window.loadProfile === 'function') {
                    window.loadProfile();
                } else if (moduleName === 'mis-puntos' && typeof window.loadTransactions === 'function') {
                    window.loadTransactions();
                }
            }
        }, 200);

        // ACTUALIZAR HASH
        if (updateHash) {
            window.location.hash = moduleName;
        }

    } catch (error) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem;">
                <i class="fas fa-exclamation-circle" style="font-size:3rem;color:#e50914;"></i>
                <h3>Error al cargar ${moduleName}</h3>
                <button onclick="location.reload()">Reintentar</button>
            </div>
        `;
    }
}

// ==============================================
// CARGAR PERFIL EN HEADER
// ==============================================
async function cargarPerfilHeader() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();

        if (data.id) localStorage.setItem('userId', data.id);

        const nameEl = document.getElementById('headerUserName');
        if (nameEl) {
            nameEl.innerHTML = `<span class="user-name-text">${data.name || data.email}</span>`;
        }

        const avatarEl = document.getElementById('headerAvatar');
        if (avatarEl && data.avatarUrl) {
            avatarEl.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" class="avatar-img">`;
        }

        const levelEl = document.getElementById('headerLevel');
        if (levelEl && data.levelEmoji && data.levelDisplayName) {
            levelEl.innerHTML = `<span class="level-badge level-${data.level}">${data.levelEmoji} ${data.levelDisplayName}</span>`;
        }

    } catch (e) {}
}

function resetDashboardState() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
}

function getModuleFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('perfil/')) {
        const userId = hash.split('/')[1];
        window._perfilUsuarioId = userId;
        return 'perfil';
    }
    return hash || 'feed-films';
}

function loadDefaultModule() {
    const moduleName = getModuleFromHash();

    const links = document.querySelectorAll('.nav-link');
    let targetLink = null;

    links.forEach(link => {
        if (link.getAttribute('onclick')?.includes(moduleName)) {
            targetLink = link;
        }
    });

    loadModule(moduleName, targetLink, false);
}

// ==============================================
// ESCUCHAR CAMBIO DE HASH
// ==============================================
window.addEventListener('hashchange', function() {
    loadDefaultModule();
});

// ==============================================
// INICIALIZACIÓN
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    cargarPerfilHeader();
    loadDefaultModule();
});

window.loadModule = loadModule;
window.loadDefaultModule = loadDefaultModule;
window.resetDashboardState = resetDashboardState;
window.cargarPerfilHeader = cargarPerfilHeader;

window.abrirPerfilUsuario = function(userId) {
    window._perfilUsuarioId = userId;
    sessionStorage.setItem('perfilUsuarioId', userId);
    window.location.hash = `perfil/${userId}`;
    loadModule('perfil', null, false);
};