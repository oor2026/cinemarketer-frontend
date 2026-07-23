// ==============================================
// suscripcion.js - Panel Premium en Mi Cuenta
// ==============================================

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
    await cargarEstadoCreator();
    engancharScrollCarrusel();
};
// ==============================================
// SINCRONIZAR PREMIUM/CREATOR EN localStorage
// Corre automáticamente en cada carga del dashboard (no solo en Mi Cuenta),
// para que cualquier pantalla (Comunidad, etc.) sepa en todo momento si el
// usuario es FREE, PREMIUM, CREATOR, o ambas suscripciones a la vez —
// son independientes entre sí, un usuario puede tener las dos activas.
// ==============================================
async function sincronizarEstadoPlan() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();

        localStorage.setItem('userPremium', data.premium === true ? 'true' : 'false');
        localStorage.setItem('userCreator', data.creator === true ? 'true' : 'false');
    } catch (e) {
        // Silencioso — no interrumpir la navegación si el backend no responde.
        // El peor caso es que localStorage quede con el valor de la sesión
        // anterior hasta la próxima carga exitosa.
    }
}

// Se ejecuta apenas este script se carga, en cualquier página del dashboard
sincronizarEstadoPlan();

window.sincronizarEstadoPlan = sincronizarEstadoPlan;

// ==============================================
// CARRUSEL DE PLANES (Premium / Creator)
// ==============================================
window.irASlidePlan = function(index) {
    const track = document.getElementById('planCarouselTrack');
    if (!track) return;
    const slide = track.children[index];
    if (slide) slide.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });

    // Actualizamos el dot al instante, sin depender del evento de scroll
    // (que puede no dispararse a tiempo, o el track puede no existir todavía
    // si esto se llama antes de que el fragmento de Mi Cuenta esté en el DOM).
    document.querySelectorAll('.plan-carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });

    ajustarAlturaCarrusel(index);
};

// El track mide siempre lo que sume TODOS los slides juntos (comportamiento
// normal de flex-row) — sin esto, el slide colapsado queda "estirado" a la
// altura del expandido, aunque su propio contenido sea mucho más corto.
// Medimos el slide que está realmente a la vista y le imponemos esa altura
// al track por código.
function ajustarAlturaCarrusel(indexForzado) {
    const track = document.getElementById('planCarouselTrack');
    if (!track) return;
    const index = indexForzado !== undefined
        ? indexForzado
        : Math.round(track.scrollLeft / track.clientWidth);
    const slideActivo = track.children[index];
    if (slideActivo) {
        track.style.height = slideActivo.scrollHeight + 'px';
    }
}
window.ajustarAlturaCarrusel = ajustarAlturaCarrusel;

// El HTML del carrusel se carga como fragmento dinámico (no está presente en
// el DOMContentLoaded de la página shell), así que enganchamos el listener
// de scroll acá — se llama cada vez que Mi Cuenta se inicializa — en vez de
// en DOMContentLoaded, que dispara demasiado temprano.
function engancharScrollCarrusel() {
    const track = document.getElementById('planCarouselTrack');
    if (!track || track.dataset.scrollListenerAttached) return;
    track.dataset.scrollListenerAttached = 'true';

    track.addEventListener('scroll', () => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        document.querySelectorAll('.plan-carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        ajustarAlturaCarrusel(index);
    }, { passive: true });

    // Altura correcta desde el primer render, no solo después de tocar algo.
    ajustarAlturaCarrusel(0);
}

window.toggleCreatorBanner = function() {
    const colapsable = document.getElementById('creatorBannerColapsable');
    const chevron = document.getElementById('creatorBannerChevron');
    const label = document.querySelector('#creatorBanner .premium-banner-toggle-label');
    if (!colapsable) return;
    const colapsado = colapsable.style.display === 'none';
    colapsable.style.display = colapsado ? '' : 'none';
    if (chevron) chevron.classList.toggle('fa-chevron-up', colapsado);
    if (chevron) chevron.classList.toggle('fa-chevron-down', !colapsado);
    if (label) label.style.display = colapsado ? 'none' : 'inline';
    if (typeof ajustarAlturaCarrusel === 'function') ajustarAlturaCarrusel();
};

// ==============================================
// ESTADO CREATOR — versión simple usando /users/me
// (todavía no hay endpoint de suscripción dedicado a Creator, como sí
// existe para Premium con /subscriptions/me — eso se arma en el paso
// de Mercado Pago. Por ahora solo distinguimos activo/no-activo.)
// ==============================================
async function cargarEstadoCreator() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();

        const banner = document.getElementById('creatorBanner');
        const activo = document.getElementById('creatorActivo');
        if (!banner || !activo) return;

        if (data.creator === true) {
            banner.style.display = 'none';
            activo.style.display = 'flex';
            const vencEl = document.getElementById('creatorVencimiento');
            if (vencEl && data.creatorUntil) {
                vencEl.textContent = new Date(data.creatorUntil).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                });
            }
        } else {
            banner.style.display = '';
            activo.style.display = 'none';
        }
    } catch (e) {
        // Silencioso — se muestra el banner por defecto si falla
    }
}

// ==============================================
// MODAL DETALLE PLAN CREATOR — placeholder hasta integrar Mercado Pago
// ==============================================
window.abrirDetallePlanCreator = function() {
    let modal = document.getElementById('creatorModalDetalle');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'creatorModalDetalle';
        modal.className = 'premium-modal-overlay';
        modal.innerHTML = `
            <div class="premium-modal-caja">
                <div class="premium-modal-header" style="background:#241242;">
                    <h3>Cinemarketer Creator</h3>
                    <p>Suscripción mensual sin permanencia</p>
                </div>
                <div class="premium-modal-body">
                    <div class="premium-modal-precio" style="color:#7c3aed;">$1999 <span>/ mes</span></div>
                    <ul class="premium-modal-lista">
                        <li><span class="premium-check creator-theme"></span>Publicá con imagen y también con video/reels</li>
                        <li><span class="premium-check creator-theme"></span>Hasta 10 imágenes por publicación</li>
                        <li><span class="premium-check creator-theme"></span>Hasta 60 seg de reels por publicación</li>
                        <li><span class="premium-check creator-theme"></span>Publicá con encuestas, votaciones y mucho más</li>
                    </ul>
                </div>
                <div class="premium-modal-aviso" style="
                                    background: #fff8e1;
                                    border: 1px solid #ffe082;
                                    border-radius: 8px;
                                    padding: 0.75rem 1rem;
                                    margin: 0 0 1rem 0;
                                    font-size: 0.82rem;
                                    color: #666;
                                    display: flex;
                                    gap: 0.5rem;
                                    align-items: flex-start;
                                    line-height: 1.5;">
                                    <span style="font-size:1rem;flex-shrink:0;">⚠️</span>
                                    <span>Para que tu suscripción se active automáticamente, pagá con la cuenta de Mercado Pago que tenga el mismo email con el que estás registrado en Cinemarketer. Si usás otro email, contactanos a <strong>info@cinemarketer.com.ar</strong> para activarla manualmente.</span>
                                </div>
                <div class="premium-modal-footer">
                    <button class="btn-modal-cancelar" onclick="window.cerrarDetallePlanCreator()">Ahora no</button>
                    <button class="btn-modal-continuar" style="background:#7c3aed;"
                            onclick="window.iniciarSuscripcionCreator()">
                        Suscribirme ahora
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.classList.add('open');
    document.body.classList.add('modal-open');
};

window.cerrarDetallePlanCreator = function() {
    const modal = document.getElementById('creatorModalDetalle');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('modal-open');
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
            if (banner)    banner.style.display    = '';
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
    if (banner)    banner.style.display    = '';
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
                    <div class="premium-modal-precio">$999 <span>/ mes</span></div>
                    <ul class="premium-modal-lista">
                        <li><span class="premium-check"></span>Acceso a premios exclusivos para suscriptores</li>
                        <li><span class="premium-check"></span>Participación gratuita en sorteos mensuales</li>
                        <li><span class="premium-check"></span>Puntos x2 en votos, comentarios y recomendaciones</li>
                        <li><span class="premium-check"></span>Sin límite diario de comentarios ni recomendaciones con puntos</li>
                        <li><span class="premium-check"></span>Sin tope mensual — cobrás todo lo que acumulás</li>
                        <li><span class="premium-check"></span>Tus puntos nunca vencen</li>
                        <li><span class="premium-check"></span>Cancelás cuando quieras</li>
                    </ul>
                </div>
                <div class="premium-modal-aviso" style="
                                    background: #fff8e1;
                                    border: 1px solid #ffe082;
                                    border-radius: 8px;
                                    padding: 0.75rem 1rem;
                                    margin: 0 0 1rem 0;
                                    font-size: 0.82rem;
                                    color: #666;
                                    display: flex;
                                    gap: 0.5rem;
                                    align-items: flex-start;
                                    line-height: 1.5;">
                                    <span style="font-size:1rem;flex-shrink:0;">⚠️</span>
                                    <span>Para que tu suscripción se active automáticamente, pagá con la cuenta de Mercado Pago que tenga el mismo email con el que estás registrado en Cinemarketer. Si usás otro email, contactanos a <strong>info@cinemarketer.com.ar</strong> para activarla manualmente.</span>
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
        document.body.classList.add('modal-open');
    };

    window.cerrarDetallePlan = function() {
        const modal = document.getElementById('premiumModalDetalle');
        if (modal) modal.classList.remove('open');
        document.body.classList.remove('modal-open');
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
        showToast('error', 'Error al conectar con Mercado Pago. Intentá de nuevo.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Suscribirme ahora';
        }
    }
};

// ==============================================
// INICIAR SUSCRIPCIÓN CREATOR → llama al backend
// ==============================================
window.iniciarSuscripcionCreator = async function() {
    const token = localStorage.getItem('token');
    const btn = document.querySelector('#creatorModalDetalle .btn-modal-continuar');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Procesando...';
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/subscriptions/subscribe?plan=Creator`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            showToast('error', err.error || 'Error al iniciar la suscripción');
            return;
        }

        const data = await response.json();

        window.cerrarDetallePlanCreator();

        if (data.initPoint) {
            window.location.href = data.initPoint;
        } else {
            showToast('error', 'No se pudo obtener el link de pago. Intentá de nuevo.');
        }

    } catch (error) {
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
    document.body.classList.add('modal-open');
};

window.cerrarCancelarSuscripcion = function() {
    const modal = document.getElementById('premiumModalCancelar');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('modal-open');
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
        showToast('error', 'Error al cancelar. Intentá de nuevo.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sí, cancelar';
        }
    }
};

// ==============================================
// CANCELAR SUSCRIPCIÓN CREATOR
// ==============================================
window.abrirCancelarSuscripcionCreator = function() {
    const modal = document.getElementById('creatorModalCancelar');
    if (modal) modal.classList.add('open');
    document.body.classList.add('modal-open');
};

window.cerrarCancelarSuscripcionCreator = function() {
    const modal = document.getElementById('creatorModalCancelar');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('modal-open');
};

window.confirmarCancelacionCreator = async function() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btnConfirmarCancelacionCreator');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Cancelando...';
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/subscriptions/cancel?plan=Creator`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            showToast('error', err.error || 'Error al cancelar la suscripción');
            return;
        }

        window.cerrarCancelarSuscripcionCreator();
        showToast('success', 'Suscripción Creator cancelada. Mantenés el acceso hasta fin del período pagado.');

        await cargarEstadoCreator();

    } catch (error) {
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
        window.cerrarCancelarSuscripcionCreator();
    }
});