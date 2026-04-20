// ==============================================
// suscripcion.js - Panel Premium en Mi Cuenta
// ==============================================

console.log('💎 Suscripcion módulo JS cargado');

// ==============================================
// ESTADO
// ==============================================
const suscripcionState = {
    isPremium: false,
    subscriptionData: null
};

// ==============================================
// INICIALIZACIÓN — llamar desde mi-cuenta.js
// ==============================================
window.initSuscripcion = async function() {
    await cargarEstadoPremium();
};

// ==============================================
// CARGAR ESTADO PREMIUM DEL USUARIO
// ==============================================
async function cargarEstadoPremium() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/subscriptions/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();

        suscripcionState.isPremium = data.active === true;
        suscripcionState.subscriptionData = data;

        renderPanelPremium(data);

    } catch (error) {
        console.error('❌ Error cargando estado premium:', error);
        mostrarBanner();
    }
}

// ==============================================
// RENDER DEL PANEL SEGÚN ESTADO
// ==============================================
function renderPanelPremium(data) {
    const banner    = document.getElementById('premiumBanner');
    const activo    = document.getElementById('premiumActivo');
    const cancelado = document.getElementById('premiumCancelado');

    // Ocultar todo primero
    if (banner)    banner.style.display    = 'none';
    if (activo)    activo.style.display    = 'none';
    if (cancelado) cancelado.style.display = 'none';

    if (data.active && data.status === 'ACTIVE') {
        // Escenario A — suscripción activa
        mostrarPanelActivo(data);

    } else if (data.status === 'CANCELLED' && data.endDate) {
        // Escenario B — cancelada con acceso vigente
        const hoy         = new Date();
        const vencimiento = new Date(data.endDate);

        if (vencimiento > hoy) {
            // Aún vigente — mostrar banner + bloque cancelado
            if (banner)    banner.style.display    = 'flex';
            if (cancelado) cancelado.style.display = 'flex';

            const fechaEl = document.getElementById('premiumCanceladoFecha');
            if (fechaEl) {
                fechaEl.textContent = vencimiento.toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                });
            }
        } else {
            // Escenario C — vencida, solo banner
            mostrarBanner();
        }
    } else {
        // Sin suscripción — solo banner
        mostrarBanner();
    }
}

function mostrarBanner() {
    const banner    = document.getElementById('premiumBanner');
    const activo    = document.getElementById('premiumActivo');
    const cancelado = document.getElementById('premiumCancelado');
    if (banner)    banner.style.display    = 'flex';
    if (activo)    activo.style.display    = 'none';
    if (cancelado) cancelado.style.display = 'none';
}

function mostrarPanelActivo(data) {
    const banner    = document.getElementById('premiumBanner');
    const activo    = document.getElementById('premiumActivo');
    const cancelado = document.getElementById('premiumCancelado');
    if (banner)    banner.style.display    = 'none';
    if (activo)    activo.style.display    = 'flex';
    if (cancelado) cancelado.style.display = 'none';

    // Fecha de próxima renovación
    const renovacionEl = document.getElementById('premiumRenovacion');
    if (renovacionEl && data.nextBillingDate) {
        const fecha = new Date(data.nextBillingDate);
        renovacionEl.textContent = fecha.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
}

// ==============================================
// ABRIR MODAL DETALLE DEL PLAN
// ==============================================
window.abrirDetallePlan = function() {
    let modal = document.getElementById('premiumModalDetalle');

    // Si el modal no existe en el DOM (estamos fuera de Mi Cuenta), crearlo
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'premiumModalDetalle';
        modal.className = 'premium-modal-overlay';
        modal.innerHTML = `
            <div class="premium-modal-caja">
                <div class="premium-modal-header">
                    <h3>Cinemarketer Premium</h3>
                    <p>Suscripción mensual sin permanencia</p>
                </div>
                <div class="premium-modal-body">
                    <div class="premium-modal-precio">$2.999 <span>/ mes</span></div>
                    <ul class="premium-modal-lista">
                        <li><span class="premium-check"></span>Acceso a premios exclusivos para suscriptores</li>
                        <li><span class="premium-check"></span>Participación gratuita en sorteos mensuales</li>
                        <li><span class="premium-check"></span>Puntos x2 en votos y comentarios</li>
                        <li><span class="premium-check"></span>Cancelás cuando quieras</li>
                    </ul>
                </div>
                <div class="premium-modal-footer">
                    <button class="btn-modal-cancelar" onclick="window.cerrarDetallePlan()">Ahora no</button>
                    <button class="btn-modal-continuar" onclick="window.iniciarSuscripcion()">
                        Suscribirme ahora
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    modal.classList.add('open');
};

window.cerrarDetallePlan = function() {
    const modal = document.getElementById('premiumModalDetalle');
    if (modal) modal.classList.remove('open');
};

// ==============================================
// INICIAR SUSCRIPCIÓN → llama al backend
// ==============================================
window.iniciarSuscripcion = async function() {
    const token = localStorage.getItem('token');
    const btn = document.querySelector('.btn-modal-continuar');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Procesando...';
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/subscriptions/subscribe`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            showToast('error', err.error || 'Error al iniciar la suscripción');
            return;
        }

        const data = await response.json();

        // Cerrar modal de detalle
        window.cerrarDetallePlan();

        // MP devuelve init_point — redirigir al checkout de MP
        if (data.initPoint) {
            window.location.href = data.initPoint;
        } else {
            showToast('error', 'No se pudo obtener el link de pago. Intentá de nuevo.');
        }

    } catch (error) {
        console.error('❌ Error iniciando suscripción:', error);
        showToast('error', 'Error al conectar con Mercado Pago. Intentá de nuevo.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Suscribirme ahora';
        }
    }
};

// ==============================================
// ABRIR MODAL CANCELAR SUSCRIPCIÓN
// ==============================================
window.abrirCancelarSuscripcion = function() {
    const modal = document.getElementById('premiumModalCancelar');
    if (modal) modal.classList.add('open');
};

window.cerrarCancelarSuscripcion = function() {
    const modal = document.getElementById('premiumModalCancelar');
    if (modal) modal.classList.remove('open');
};

// ==============================================
// CONFIRMAR CANCELACIÓN
// ==============================================
window.confirmarCancelacion = async function() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnConfirmarCancelacion');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Cancelando...';
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/subscriptions/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            showToast('error', err.error || 'Error al cancelar la suscripción');
            return;
        }

        window.cerrarCancelarSuscripcion();
        showToast('success', 'Suscripción cancelada. Mantenés el acceso hasta fin del período pagado.');

        // Recargar estado desde el servidor para mostrar el bloque correcto
        await cargarEstadoPremium();

    } catch (error) {
        console.error('❌ Error cancelando suscripción:', error);
        showToast('error', 'Error al cancelar. Intentá de nuevo.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sí, cancelar';
        }
    }
};

// ==============================================
// HELPER — verificar si el usuario es premium
// (para usar desde otros módulos)
// ==============================================
window.esPremiumActivo = function() {
    return suscripcionState.isPremium;
};

// ==============================================
// CERRAR MODALES CON ESCAPE
// ==============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.cerrarDetallePlan();
        window.cerrarCancelarSuscripcion();
    }
});