// ==============================================
// module-loader.js - Cargador de Módulos con Hash Routing
// ==============================================

const MODULE_PATH = 'modules/';
const CSS_PATH = 'css/';
const JS_PATH = 'js/';

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

    try {
        // HTML
        const htmlResponse = await fetch(`${MODULE_PATH}${moduleName}.html`);
        if (!htmlResponse.ok) throw new Error(`Error HTTP: ${htmlResponse.status}`);

        container.innerHTML = await htmlResponse.text();
        window.scrollTo(0, 0);

        // CSS
        const cssId = `css-${moduleName}`;
        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = `${CSS_PATH}${moduleName}.css`;
            document.head.appendChild(link);
        }

        // JS
        const jsId = `js-${moduleName}`;
        await new Promise((resolve) => {
            if (document.getElementById(jsId)) {
                resolve();
            } else {
                const script = document.createElement('script');
                script.id = jsId;
                script.src = `${JS_PATH}${moduleName}.js`;
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
        }, 100);

        // ==============================================
        // ACTUALIZAR HASH
        // ==============================================
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

function resetDashboardState() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
}

function getModuleFromHash() {
    const hash = window.location.hash.replace('#', '');
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
    loadDefaultModule();
});

window.loadModule = loadModule;
window.loadDefaultModule = loadDefaultModule;
window.resetDashboardState = resetDashboardState;