// ==============================================
// module-loader.js - Cargador de Módulos
// ==============================================

console.log('📦 Module Loader cargado');

const MODULE_PATH = 'modules/';
const CSS_PATH = 'css/';
const JS_PATH = 'js/';

async function loadModule(moduleName, element = null) {

    if (!localStorage.getItem('token')) {
        window.location.replace('login.html');
        return;
    }

    console.log('🔥 Cargando módulo:', moduleName);

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

        // Actualizar URL SIN agregar al historial
        const newUrl = window.location.pathname + `?module=${moduleName}`;
        history.replaceState(null, null, newUrl);
        console.log(`📌 URL actualizada (sin historial): ${newUrl}`);

    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `<div style="text-align:center;padding:3rem;">
            <i class="fas fa-exclamation-circle" style="font-size:3rem;color:#e50914;"></i>
            <h3>Error al cargar ${moduleName}</h3>
            <button onclick="location.reload()">Reintentar</button>
        </div>`;
    }
}

function loadDefaultModule() {
    const defaultModule = 'feed-films';
    const links = document.querySelectorAll('.nav-link');
    let targetLink = null;
    links.forEach(link => {
        if (link.getAttribute('onclick')?.includes(defaultModule)) {
            targetLink = link;
        }
    });
    loadModule(defaultModule, targetLink);
}

function resetDashboardState() {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
}

function loadDefaultModule() {
    const defaultModule = 'feed-films';
    const links = document.querySelectorAll('.nav-link');
    let targetLink = null;
    links.forEach(link => {
        if (link.getAttribute('onclick')?.includes(defaultModule)) {
            targetLink = link;
        }
    });
    loadModule(defaultModule, targetLink);

    // Solo en móvil — registra evento en historial y muestra bienvenida
    // Solo en móvil — esperar interacción del usuario para registrar historial
    const esMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (esMobile) {
        let historialRegistrado = false;

        const registrarHistorial = () => {
            if (historialRegistrado) return;
            historialRegistrado = true;

            for (let i = 0; i < 15; i++) {
                history.pushState(null, '', window.location.pathname + '?module=feed-films');
            }
            console.log('✅ Historial registrado tras interacción del usuario');
        };

        // Escuchar cualquier interacción del usuario
        ['touchstart', 'touchend', 'click', 'scroll'].forEach(evento => {
            document.addEventListener(evento, registrarHistorial, { once: true });
        });

        // Toast de aviso
        setTimeout(() => {
            const toast = document.createElement('div');
            toast.id = 'toast-bienvenida';
            toast.innerHTML = `<i class="fas fa-film"></i> ¡Hola! Explorá las películas 🎬`;
            toast.style.cssText = `
                position:fixed; bottom:2rem; left:50%;
                transform:translateX(-50%);
                background:#1a3a6b; color:white;
                padding:0.85rem 1.5rem; border-radius:25px;
                font-size:0.9rem; z-index:999999;
                display:flex; align-items:center; gap:0.5rem;
                box-shadow:0 4px 20px rgba(0,0,0,0.3);
                white-space:nowrap; max-width:90vw;
            `;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }, 1500);
    }
}

// ==============================================
// INICIALIZACIÓN
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const moduleFromUrl = urlParams.get('module');

    if (moduleFromUrl && moduleFromUrl !== 'feed-films') {
        loadModule(moduleFromUrl);
    } else {
        loadDefaultModule();
    }
});

window.loadModule = loadModule;
window.loadDefaultModule = loadDefaultModule;
window.resetDashboardState = resetDashboardState;