// ==============================================
// novedades.js - Dropdown de actividad social
// ==============================================

window.toggleNovedades = function(e) {
    e.preventDefault();
    // Mobile ya no pasa por acá — el botón nuevo del header llama
    // directo a abrirNovedadesMobileFullscreen(). Esto queda solo
    // para el dropdown de desktop.
    const dropdown = document.getElementById('novedadesDropdown');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        window.cargarNovedades();
    } else {
        dropdown.style.display = 'none';
    }
};

// Modal full-screen de novedades — solo mobile.
window.abrirNovedadesMobileFullscreen = function(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('novedadesModalMobile');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    window.cargarNovedadesMobile();
};

window.cerrarNovedadesMobileFullscreen = function() {
    const modal = document.getElementById('novedadesModalMobile');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

// Cerrar al click fuera
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('novedadesDropdown');
    if (!dropdown) return;
    if (!dropdown.contains(e.target) && !e.target.closest('[onclick*="toggleNovedades"]')) {
        dropdown.style.display = 'none';
    }
});

// Helper: cierra todos los menús de novedades y hamburguesa
function cerrarTodosLosMenus() {
    const dropdown = document.getElementById('novedadesDropdown');
    if (dropdown) dropdown.style.display = 'none';

    const acordeon = document.getElementById('novedadesMobile');
    if (acordeon) acordeon.style.display = 'none';

    const chevron = document.getElementById('novedadesChevron');
    if (chevron) chevron.style.transform = 'rotate(0deg)';

    const navMenu = document.getElementById('dashNavMenu');
    if (navMenu) navMenu.classList.remove('active');

    const menuToggleIcon = document.querySelector('.dash-menu-toggle i');
    if (menuToggleIcon) {
        menuToggleIcon.classList.add('fa-bars');
        menuToggleIcon.classList.remove('fa-times');
    }

    // Modal full-screen de novedades (mobile) — si quedó abierto y la
    // notificación redirige a otra vista, tapaba el destino entero.
    if (typeof window.cerrarNovedadesMobileFullscreen === 'function') {
        window.cerrarNovedadesMobileFullscreen();
    }
}

function getNotifIcono(type, referenceType) {
    if (type === 'NEW_REWARD' || type === 'NEW_PREMIUM_REWARD') {
        switch(referenceType) {
            case 'TICKET':        return '🎟️';
            case 'MERCHANDISING': return '🎁';
            case 'DESCUENTO':     return '🏷️';
            case 'EXPERIENCIA':   return '🎬';
            case 'SORTEO':        return '🎲';
            default:              return '🎁';
        }
    }
    switch(type) {
        case 'BANCO':                    return '👍';
        case 'MERECE_PUNTO':             return '⭐';
        case 'PUB_BANCO':               return '👍';
        case 'PUB_MERECE_PUNTO':        return '⭐';
        case 'PUB_COMENTARIO':          return '💬';
        case 'PUB_BANCO_COMENTARIO':    return '👍';
        case 'PUB_RESPUESTA':           return '↩️';
        case 'NEW_FOLLOWER':             return '👤';
        case 'FOLLOW_REQUEST':           return '👤';
        case 'FOLLOW_REQUEST_ACCEPTED':  return '👤';
        case 'RECOMMENDATION_RATED':     return '🎬';
        case 'NEW_RECOMMENDATION':       return '🎬';
        case 'DRAW_WINNER':              return '🏆';
        case 'POINTS_RELEASED':          return '🪙';
        case 'ADMIN_GRANT_POINTS':       return '🪙';
        case 'PREMIUM_EXPIRING_SOON':    return '⏰';
        case 'PREMIUM_EXPIRING_TOMORROW':return '⚠️';
        case 'PUB_APROBADA':             return '✅';
        case 'PUB_PENDIENTE_REVISION':   return '🕓';
        case 'VIDEO_APROBADO':           return '🎬';
        case 'VIDEO_PENDIENTE_REVISION': return '🕓';
        case 'VIDEO_RECHAZADO':          return '⛔';
        default:                         return '💬';
    }
}

window.cargarNovedades = async function() {
    const lista = document.getElementById('novedadesLista');
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const novedades = await res.json();

                // Actualizar badge
                const noLeidas = novedades.filter(n => !n.read).length;
                const badge = document.getElementById('novedadesBadge');
                if (badge) {
                    badge.textContent = noLeidas;
                    badge.style.display = noLeidas > 0 ? 'inline-block' : 'none';
                }
                const badgeMobile = document.getElementById('novedadesBadgeMobile');
                if (badgeMobile) {
                    badgeMobile.textContent = noLeidas;
                    badgeMobile.style.display = noLeidas > 0 ? 'inline-block' : 'none';
                }

        if (novedades.length === 0) {
            lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Sin novedades por ahora</div>';
            return;
        }

        lista.innerHTML = novedades.map(n => {
            const esFollowRequest = n.type === 'FOLLOW_REQUEST';
            const botonesFollow = esFollowRequest ? `
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;" onclick="event.stopPropagation()">
                    <button onclick="window.responderFollowRequest(${n.actorId}, true, ${n.id}, this.closest('[data-notif-id]'))"
                        style="background:#324C89;color:white;border:none;border-radius:6px;padding:0.3rem 0.8rem;cursor:pointer;font-size:0.8rem;font-weight:600;">
                        ✓ Aceptar
                    </button>
                    <button onclick="window.responderFollowRequest(${n.actorId}, false, ${n.id}, this.closest('[data-notif-id]'))"
                        style="background:none;color:#e50914;border:1.5px solid #e50914;border-radius:6px;padding:0.3rem 0.8rem;cursor:pointer;font-size:0.8rem;font-weight:600;">
                        ✕ Rechazar
                    </button>
                </div>` : '';

            return `
                <div data-notif-id="${n.id}"
                    onclick="window.clickNovedad(${n.id}, ${n.movieId}, ${n.commentId}, ${n.replyId || 'null'}, '${n.type}', ${n.read}, ${n.actorId || 'null'}, ${n.publicationId || 'null'}, ${n.rewardId || 'null'}, ${n.seriesId || 'null'})"
                    style="padding:0.75rem 1rem;border-bottom:1px solid #f5f5f5;cursor:pointer;
                           background:${n.read ? 'white' : '#f0f4ff'};
                           transition:background 0.2s;"
                    onmouseover="this.style.background='#f8f8f8'"
                    onmouseout="this.style.background='${n.read ? 'white' : '#f0f4ff'}'">
                    <div style="display:flex;align-items:flex-start;gap:0.5rem;">
                            <span style="font-size:1rem;flex-shrink:0;">${getNotifIcono(n.type, n.referenceType)}</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:0.83rem;color:#333;line-height:1.4;">${n.message}</div>
                                <div style="font-size:0.75rem;color:#999;margin-top:0.2rem;">${new Date(n.createdAt).toLocaleDateString('es-ES')} ${new Date(n.createdAt).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}</div>
                                ${botonesFollow}
                            </div>
                            ${!n.read ? '<span style="width:8px;height:8px;background:#e50914;border-radius:50%;flex-shrink:0;margin-top:4px;"></span>' : ''}
                            <i class="fas fa-trash-alt" onclick="event.stopPropagation(); window.confirmarEliminarNovedad(${n.id})"
                               style="font-size:0.8rem;color:#bbb;flex-shrink:0;margin-top:3px;cursor:pointer;padding:2px;"
                               onmouseover="this.style.color='#e50914'" onmouseout="this.style.color='#bbb'"></i>
                        </div>
                    </div>`;
            }).join('');

    } catch(e) {
        lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Error al cargar novedades</div>';
    }
};

window.clickNovedad = async function(notificationId, movieId, commentId, replyId, type, yaLeida, actorId, publicationId, rewardId, seriesId) {
     console.log('clickNovedad ejecutado, type:', type);
     console.log('movieId:', movieId, 'abrirDetallePelicula:', typeof window.abrirDetallePelicula);
    const token = localStorage.getItem('token');

    // Cerrar todos los menús al inicio
    cerrarTodosLosMenus();

    // Marcar como leída si no lo está
    if (!yaLeida) {
        try {
            await fetch(`${CONFIG.API_URL}/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch(e) {}

                // Actualizar badge inmediatamente
                const badge = document.getElementById('novedadesBadge');
                const badgeMobile = document.getElementById('novedadesBadgeMobile');
                [badge, badgeMobile].forEach(b => {
                    if (!b) return;
                    const actual = parseInt(b.textContent) || 0;
                    const nuevo = Math.max(0, actual - 1);
                    b.textContent = nuevo;
                    b.style.display = nuevo > 0 ? 'inline-block' : 'none';
                });

        // Recargar lista para actualizar visual
        window.cargarNovedades();
    }

    // Navegar a perfil del seguidor
        if (type === 'NEW_FOLLOWER' || type === 'FOLLOW_REQUEST' || type === 'FOLLOW_REQUEST_ACCEPTED') {
            if (actorId && typeof window.abrirPerfilUsuario === 'function') {
                window.abrirPerfilUsuario(actorId);
            }
            return;
        }

    // Abrir película al clickear recomendación nueva
        if (type === 'NEW_RECOMMENDATION') {
                    if (movieId) {
                        await _asegurarModalPeliculaEnDOM();
                        if (typeof window.abrirDetallePelicula === 'function') {
                            window.abrirDetallePelicula(movieId);
                        }
                    }
                    return;
                }
    // Abrir serie al clickear recomendación nueva de serie, o al clickear
        // el aviso de "calificaron tu recomendación" cuando es de una serie
        // (RECOMMENDATION_RATED lo comparten película y serie — se distingue
        // por cuál de los dos ids viene poblado).
            if (type === 'NEW_RECOMMENDATION_SERIES' || (type === 'RECOMMENDATION_RATED' && seriesId)) {
                if (seriesId && typeof window.abrirDetalleSerie === 'function') {
                    window.abrirDetalleSerie(seriesId);
                }
                return;
            }


        // Navegar a suscripción al clickear notif de vencimiento premium
        if (type === 'PREMIUM_EXPIRING_SOON' || type === 'PREMIUM_EXPIRING_TOMORROW') {
            if (typeof window.loadModule === 'function') {
                loadModule('mi-cuenta');
                setTimeout(() => {
                    const bannerEl = document.querySelector('.subscription-banner, .premium-banner, #premiumBanner, [id*="premium"]');
                    if (bannerEl) {
                        bannerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        bannerEl.style.transition = 'box-shadow 0.3s';
                        bannerEl.style.boxShadow = '0 0 0 4px #e50914, 0 0 20px rgba(229,9,20,0.4)';
                        setTimeout(() => { bannerEl.style.boxShadow = ''; }, 3000);
                    }
                }, 1000);
            }
            return;
        }

                // Notif de puntos liberados mensualmente — sin importar el tipo
                // de usuario (Free o Premium), siempre va a Club de Beneficios
                // a que pueda canjearlos.
                    if (type === 'POINTS_RELEASED') {
                                if (typeof window.loadModule === 'function') {
                                    loadModule('club-beneficios');
                                }
                                return;
                            }

            if (type === 'ADMIN_GRANT_POINTS') {
                if (typeof loadModule === 'function') loadModule('mis-puntos');
                return;
            }

            if (type === 'NEW_REWARD') {
                            await _abrirModalPremioDesdeNotificacion(rewardId, false);
                            return;
                        }

                        if (type === 'NEW_PREMIUM_REWARD') {
                            await _abrirModalPremioDesdeNotificacion(rewardId, true);
                            return;
                        }

            // Notificaciones de publicaciones en Comunidad
            if (type === 'PUB_BANCO') {
                await window.abrirPublicacion(publicationId, false, null);
                return;
            }
            if (type === 'PUB_MERECE_PUNTO') {
                await window.abrirPublicacion(publicationId, false, null);
                return;
            }
            if (type === 'PUB_BANCO_COMENTARIO') {
                await window.abrirPublicacion(publicationId, true, null);
                return;
            }
            if (type === 'PUB_COMENTARIO') {
                await window.abrirPublicacion(publicationId, true, commentId);
                return;
            }
            if (type === 'PUB_RESPUESTA') {
                await window.abrirPublicacion(publicationId, true, commentId);
                return;
            }
            if (type === 'PUB_APROBADA' || type === 'PUB_PENDIENTE_REVISION'
                || type === 'VIDEO_APROBADO' || type === 'VIDEO_PENDIENTE_REVISION'
                || type === 'VIDEO_RECHAZADO') {
                await window.abrirPublicacion(publicationId, false, null);
                return;
            }

            if (type === 'BANCO' || type === 'MERECE_PUNTO') {
                                    // Inyecta el modal correspondiente si todavía no está en el DOM,
                                    // sin tocar #module-container — no recarga los carruseles del feed.
                                    await _asegurarModalPeliculaEnDOM();

                                    if (seriesId && typeof window.abrirDetalleSerie === 'function') {

                            // Consultar si el comentario es spoiler antes de abrir
                            let esSpoilerSerie = false;
                            if (commentId) {
                                try {
                                    const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        if (data.spoiler) esSpoilerSerie = true;
                                    }
                                } catch(e) {}
                            }

                            window.abrirDetalleSerie(seriesId);

                            if (commentId) {
                                setTimeout(async () => {
                                    if (esSpoilerSerie && typeof window.activarModoSpoilerSerie === 'function') {
                                        window.activarModoSpoilerSerie(true);
                                    }
                                    // Esperar a que cargarComentariosSerie termine de renderizar
                                    await new Promise(resolve => setTimeout(resolve, 600));

                                    const comentEl = document.getElementById(`comment-serie-${commentId}`);
                                    if (comentEl) {
                                        comentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        comentEl.style.transition = 'background 0.3s';
                                        comentEl.style.background = '#fff3cd';
                                        setTimeout(() => { comentEl.style.background = ''; }, 3000);
                                    }
                                }, 800);
                            }
                            return;
                        }

                                    if (typeof window.abrirDetallePelicula === 'function' && movieId) {

                            // Consultar si el comentario es spoiler antes de abrir
                            let esSpoiler = false;
                            if (commentId) {
                                try {
                                    const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        if (data.spoiler) esSpoiler = true;
                                    }
                                } catch(e) {}
                            }

                            window.abrirDetallePelicula(movieId);

                            if (commentId) {
                                setTimeout(async () => {
                                    if (esSpoiler && typeof window.activarModoSpoiler === 'function') {
                                        window.activarModoSpoiler(true);
                                    }
                                    // Esperar a que cargarComentariosPelicula termine de renderizar
                                    await new Promise(resolve => setTimeout(resolve, 600));

                                    const comentEl = document.getElementById(`comment-${commentId}`);
                                    if (comentEl) {
                                        comentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        comentEl.style.transition = 'background 0.3s';
                                        comentEl.style.background = '#fff3cd';
                                        setTimeout(() => { comentEl.style.background = ''; }, 3000);
                                    }
                                }, 800);
                            }
                        }
                        return;
                    }

                if (type === 'REPLY') {
                                        // Inyecta el modal correspondiente si todavía no está en el DOM,
                                        // sin tocar #module-container — no recarga los carruseles del feed.
                                        await _asegurarModalPeliculaEnDOM();

                                    if (seriesId && typeof window.abrirDetalleSerie === 'function') {

                    // Consultar si el comentario padre es spoiler antes de abrir
                    let modoSpoilerActivoSerieNotif = false;
                    if (commentId) {
                        try {
                            const token2 = localStorage.getItem('token');
                            const res = await fetch(`${CONFIG.API_URL}/series-comments/${commentId}`, {
                                headers: { 'Authorization': `Bearer ${token2}` }
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.spoiler) {
                                    modoSpoilerActivoSerieNotif = true;
                                }
                            }
                        } catch(e) {}
                    }

                    window.abrirDetalleSerie(seriesId);

                    if (replyId && commentId) {
                        setTimeout(async () => {
                            if (modoSpoilerActivoSerieNotif && typeof window.activarModoSpoilerSerie === 'function') {
                                window.activarModoSpoilerSerie(true);
                            }
                            // Esperar a que cargarComentariosSerie termine de renderizar
                            await new Promise(resolve => setTimeout(resolve, 600));

                            const container = document.querySelector(`.replies-container-serie-${commentId}`);
                            if (container) {
                                container.style.display = 'block';
                                await window.cargarRespuestasSerie(commentId, 0);
                            }

                            setTimeout(() => {
                                const containerFinal = document.querySelector(`.replies-container-serie-${commentId}`);
                                const bancoBtns = containerFinal
                                    ? containerFinal.querySelectorAll(`button[onclick*="toggleReplyBancoSerie(${replyId}"]`)
                                    : [];
                                const targetEl = bancoBtns.length > 0
                                    ? bancoBtns[0].closest('div[style*="display:flex"]')
                                    : null;
                                if (targetEl) {
                                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    targetEl.style.transition = 'background 0.3s';
                                    targetEl.style.background = '#fff3cd';
                                    setTimeout(() => { targetEl.style.background = ''; }, 3000);
                                }
                            }, 600);
                        }, 800);
                    }
                    return;
                }

                                    if (typeof window.abrirDetallePelicula === 'function') {

                    // Consultar si el comentario padre es spoiler antes de abrir
                    if (commentId) {
                        try {
                            const token2 = localStorage.getItem('token');
                            const res = await fetch(`${CONFIG.API_URL}/comments/${commentId}`, {
                                headers: { 'Authorization': `Bearer ${token2}` }
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.spoiler) {
                                    modoSpoilerActivo = true;
                                }
                            }
                        } catch(e) {}
                    }

                    window.abrirDetallePelicula(movieId);

                    if (replyId && commentId) {
                        setTimeout(async () => {
                            // Aplicar modo spoiler visual ahora que el modal ya está abierto
                            if (modoSpoilerActivo && typeof window.activarModoSpoiler === 'function') {
                                window.activarModoSpoiler(true);
                            }
                            // Esperar a que cargarComentariosPelicula termine de renderizar
                            await new Promise(resolve => setTimeout(resolve, 600));

                            const container = document.querySelector(`.replies-container-${commentId}`);
                            if (container) {
                                container.style.display = 'block';
                                await window.cargarRespuestas(commentId, 0);
                            }

                            setTimeout(() => {
                                const containerFinal = document.querySelector(`.replies-container-${commentId}`);
                                const bancoBtns = containerFinal
                                    ? containerFinal.querySelectorAll(`button[onclick*="toggleReplyBanco(${replyId}"]`)
                                    : [];
                                const targetEl = bancoBtns.length > 0
                                    ? bancoBtns[0].closest('div[style*="display:flex"]')
                                    : null;
                                if (targetEl) {
                                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    targetEl.style.transition = 'background 0.3s';
                                    targetEl.style.background = '#fff3cd';
                                    setTimeout(() => { targetEl.style.background = ''; }, 3000);
                                }
                            }, 600);
                        }, 800);
                    }
                }
            }
        };

async function _abrirModalPremioDesdeNotificacion(rewardId, esPremiumReward) {
    // "mis-premios" (módulo viejo) fue reemplazado por "club-beneficios".
    loadModule('club-beneficios');
    if (!rewardId) return; // notificación vieja, de antes de guardar el id — solo navega

    let tabPremiumForzada = false;
    let intentos = 0;
    const esperar = setInterval(() => {
        intentos++;

        // El catálogo Premium carga lazy recién al activar esa pestaña
        // (window.cambiarTabClubBeneficios) — a diferencia de Free, que
        // ya carga solo con entrar al módulo. Si la notificación es de
        // un premio Premium, forzamos el cambio de tab una sola vez.
        if (esPremiumReward && !tabPremiumForzada && typeof window.cambiarTabClubBeneficios === 'function') {
            const btnPremium = document.getElementById('clubTabPremium');
            if (btnPremium) {
                tabPremiumForzada = true;
                window.cambiarTabClubBeneficios('premium', btnPremium);
            }
        }

        const cache = esPremiumReward ? window._clubPremiumCache : window._clubFreeCache;
        const listo = typeof window._abrirModalPremioClub === 'function' && Array.isArray(cache) && cache.length > 0;

        if (listo) {
            clearInterval(esperar);
            const p = cache.find(x => x.id === rewardId);
            if (p) window._abrirModalPremioClub(rewardId, esPremiumReward ? 'premium' : 'free');
        } else if (intentos > 25) {
            clearInterval(esperar);
        }
    }, 200);
}

window.marcarTodasLeidas = async function() {
    const token = localStorage.getItem('token');
    try {
        await fetch(`${CONFIG.API_URL}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const modalMobile = document.getElementById('novedadesModalMobile');
        if (modalMobile && modalMobile.style.display !== 'none') {
            window.cargarNovedadesMobile();
        } else {
            window.cargarNovedades();
        }
    } catch(e) {}
};

// Cargar badge al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
                const badge = document.getElementById('novedadesBadge');
                if (badge && data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline-block';
                }
                const badgeMobile = document.getElementById('novedadesBadgeMobile');
                if (badgeMobile && data.count > 0) {
                    badgeMobile.textContent = data.count;
                    badgeMobile.style.display = 'inline-block';
                }
            } catch(e) {}
        });

window.cargarNovedadesMobile = async function() {
    const lista = document.getElementById('novedadesListaMobileFull');
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const novedades = await res.json();

        if (novedades.length === 0) {
            lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Sin novedades por ahora</div>';
            return;
        }

        lista.innerHTML = novedades.map(n => {
                    const esFollowRequest = n.type === 'FOLLOW_REQUEST';
                    const botonesFollow = esFollowRequest ? `
                        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;" onclick="event.stopPropagation()">
                            <button onclick="window.responderFollowRequestMobile(${n.actorId}, true, ${n.id}, this.closest('[data-notif-id-mobile]'))"
                                style="background:#324C89;color:white;border:none;border-radius:6px;padding:0.3rem 0.8rem;cursor:pointer;font-size:0.8rem;font-weight:600;">
                                ✓ Aceptar
                            </button>
                            <button onclick="window.responderFollowRequestMobile(${n.actorId}, false, ${n.id}, this.closest('[data-notif-id-mobile]'))"
                                style="background:none;color:#e50914;border:1.5px solid #e50914;border-radius:6px;padding:0.3rem 0.8rem;cursor:pointer;font-size:0.8rem;font-weight:600;">
                                ✕ Rechazar
                            </button>
                        </div>` : '';

                    return `
                        <div data-notif-id-mobile="${n.id}"
                            onclick="window.clickNovedad(${n.id}, ${n.movieId}, ${n.commentId}, ${n.replyId || 'null'}, '${n.type}', ${n.read}, ${n.actorId || 'null'}, ${n.publicationId || 'null'}, ${n.rewardId || 'null'}, ${n.seriesId || 'null'})"
                            style="padding:0.75rem 1rem;border-bottom:1px solid #eee;cursor:pointer;
                                   background:${n.read ? 'white' : '#f0f4ff'};">
                            <div style="display:flex;align-items:flex-start;gap:0.5rem;">
                                <span style="font-size:1rem;flex-shrink:0;">${getNotifIcono(n.type, n.referenceType)}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:0.83rem;color:#333;line-height:1.4;">${n.message}</div>
                                    <div style="font-size:0.75rem;color:#999;margin-top:0.2rem;">${new Date(n.createdAt).toLocaleDateString('es-ES')} ${new Date(n.createdAt).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}</div>
                                    ${botonesFollow}
                                </div>
                                ${!n.read ? '<span style="width:8px;height:8px;background:#e50914;border-radius:50%;flex-shrink:0;margin-top:4px;"></span>' : ''}
                                <i class="fas fa-trash-alt" onclick="event.stopPropagation(); window.confirmarEliminarNovedad(${n.id})"
                                   style="font-size:0.8rem;color:#bbb;flex-shrink:0;margin-top:3px;cursor:pointer;padding:2px;"></i>
                            </div>
                        </div>`;
                }).join('');

    } catch(e) {
        lista.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.85rem;">Error al cargar novedades</div>';
    }
};

window.responderFollowRequest = async function(followerId, aceptar, notifId, notifEl) {
    const token = localStorage.getItem('token');
    try {
        // Buscar el follow pendiente
        const resBuscar = await fetch(`${CONFIG.API_URL}/follows/pending/${followerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resBuscar.ok) return;
        const follow = await resBuscar.json();

        // Obtener nombre del actor desde la notificación en el DOM
        const actorNombre = notifEl?.querySelector('[data-actor-name]')?.dataset.actorName
            || notifEl?.querySelector('.notif-message')?.textContent?.split(' ')[0]
            || 'El usuario';

        const endpoint = aceptar
            ? `${CONFIG.API_URL}/follows/${follow.id}/accept`
            : `${CONFIG.API_URL}/follows/${follow.id}/reject`;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        // Marcar notificación como leída
        await fetch(`${CONFIG.API_URL}/notifications/${notifId}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (aceptar) {
            // Ocultar solo los botones, mantener la notificación
            const btns = notifEl?.querySelector('div[onclick*="stopPropagation"]');
            if (btns) btns.remove();
            _mostrarToastNovedades(`Ahora ${follow.actorName || actorNombre} te sigue`);
        } else {
            // Eliminar la notificación completa
            if (notifEl) notifEl.remove();
            _mostrarToastNovedades(`Rechazaste la solicitud de ${follow.actorName || actorNombre}`);
        }

        window.cargarNovedades();

    } catch(e) {}
};

function _mostrarToastNovedades(mensaje) {
    const t = document.createElement('div');
    t.textContent = mensaje;
    t.style.cssText = `
        position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
        background:#324C89; color:white; padding:0.75rem 1.5rem;
        border-radius:24px; font-size:0.88rem; font-weight:600;
        z-index:9999999; box-shadow:0 4px 16px rgba(0,0,0,0.2);
        white-space:nowrap;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

window.responderFollowRequestMobile = async function(followerId, aceptar, notifId, notifEl) {
    const token = localStorage.getItem('token');
    try {
        const resBuscar = await fetch(`${CONFIG.API_URL}/follows/pending/${followerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resBuscar.ok) return;
        const follow = await resBuscar.json();

        const endpoint = aceptar
            ? `${CONFIG.API_URL}/follows/${follow.id}/accept`
            : `${CONFIG.API_URL}/follows/${follow.id}/reject`;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        await fetch(`${CONFIG.API_URL}/notifications/${notifId}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (aceptar) {
            const btns = notifEl?.querySelector('div[onclick*="stopPropagation"]');
            if (btns) btns.remove();
            _mostrarToastNovedades(`Ahora ${follow.actorName || 'el usuario'} te sigue`);
        } else {
            if (notifEl) notifEl.remove();
            _mostrarToastNovedades(`Rechazaste la solicitud de ${follow.actorName || 'el usuario'}`);
        }

        window.cargarNovedadesMobile();

    } catch(e) {}
};

// Abre la película vinculada reemplazando visualmente el modal de publicación,
// y lo restaura automáticamente cuando se cierra el modal de película (efecto "Volver").
// Trae solo el <div id="modalPelicula"> de feed-films.html e inyecta su CSS/JS,
// SIN tocar #module-container — así nunca reemplaza la vista actual (perfil, etc.)
async function _asegurarModalPeliculaEnDOM() {
    if (document.getElementById('modalPelicula')) return true;
    try {
        const res = await fetch('modules/feed-films.html');
        if (!res.ok) return false;
        const html = await res.text();
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Todo lo que el modal de película necesita para funcionar, no solo el propio modal
        const idsNecesarios = [
                    'modalPelicula', 'modalSerie', 'modalReportarComentario', 'modalMerecePunto',
                    'modalOcultarComentario', 'panelRecomendar', 'modalSpoilerWarning',
                    'dondeVerlaOverlay', 'dondeVerlaPanel', 'actorOverlay', 'actorPanel'
                ];

        let encontroPrincipal = false;
        idsNecesarios.forEach(id => {
            const el = temp.querySelector(`#${id}`);
            if (el && !document.getElementById(id)) {
                el.dataset.bgAsset = 'feed-films'; // marca de origen, para poder limpiarlos después
                document.body.appendChild(el);
                if (id === 'modalPelicula') encontroPrincipal = true;
            }
        });
        if (!encontroPrincipal) return false;

        // Estilos embebidos inline en feed-films.html (no viven en feed-films.css)
        if (!document.getElementById('style-feed-films-inline')) {
            const estilosInline = temp.querySelectorAll('style');
            estilosInline.forEach((styleTag, i) => {
                const nuevoStyle = document.createElement('style');
                nuevoStyle.id = i === 0 ? 'style-feed-films-inline' : `style-feed-films-inline-${i}`;
                nuevoStyle.dataset.bgAsset = 'feed-films';
                nuevoStyle.textContent = styleTag.textContent;
                document.head.appendChild(nuevoStyle);
            });
        }

        if (!document.getElementById('css-feed-films')) {
            const link = document.createElement('link');
            link.id = 'css-feed-films';
            link.rel = 'stylesheet';
            link.href = `css/feed-films.css?v=${Date.now()}`;
            document.head.appendChild(link);
        }
        if (!document.getElementById('js-feed-films')) {
                    await new Promise(resolve => {
                        const script = document.createElement('script');
                        script.id = 'js-feed-films';
                        script.src = `js/feed-films.js?v=${Date.now()}`;
                        script.onload = resolve;
                        script.onerror = resolve;
                        document.head.appendChild(script);
                    });
                }

                // feed-series.css / feed-series.js — el modal de Serie también
                // vino en el mismo fetch de arriba (modalSerie vive en
                // feed-films.html), pero su CSS y su lógica están en archivos aparte.
                if (!document.getElementById('css-feed-series')) {
                    const linkSerie = document.createElement('link');
                    linkSerie.id = 'css-feed-series';
                    linkSerie.rel = 'stylesheet';
                    linkSerie.href = `css/feed-series.css?v=${Date.now()}`;
                    document.head.appendChild(linkSerie);
                }
                if (!document.getElementById('js-feed-series')) {
                    await new Promise(resolve => {
                        const script = document.createElement('script');
                        script.id = 'js-feed-series';
                        script.src = `js/feed-series.js?v=${Date.now()}`;
                        script.onload = resolve;
                        script.onerror = resolve;
                        document.head.appendChild(script);
                    });
                }

                // Margen para que los scripts recién cargados registren sus funciones globales
                await new Promise(r => setTimeout(r, 300));
                return true;
    } catch(e) {
        return false;
    }
}
window._asegurarModalPeliculaEnDOM = _asegurarModalPeliculaEnDOM;

window._abrirPeliculaDesdeModalPublicacion = async function(movieId) {
    if (!movieId) return;

    const modalPub = document.getElementById('modalPublicacion');
    // Solo lo marcamos para "volver" si realmente estaba abierto/visible en este momento
    // (el elemento puede seguir existiendo en el DOM, oculto, de un uso anterior).
    const modalPubEstabaAbierto = modalPub && modalPub.style.display !== 'none' && modalPub.style.display !== '';
    if (modalPubEstabaAbierto) {
        modalPub.style.display = 'none';
        modalPub.dataset.reabrirTrasPelicula = 'true';
    }

    // Si estamos dentro de "Ver todas las publicaciones" del perfil, también hay
    // que ocultarla, si no la película quedaría tapada por ese overlay.
    const overlayPerfil = document.getElementById('perfilPubsOverlay');
    if (overlayPerfil && overlayPerfil.style.display !== 'none') {
        overlayPerfil.style.display = 'none';
        overlayPerfil.dataset.reabrirTrasPelicula = 'true';
    }

    // Envolvemos cerrarModal (del modal de película) una sola vez, para que al
    // cerrarla vuelvan a mostrarse el modal de publicación y/o el overlay de perfil.
    // No afecta ningún otro flujo: solo actúa cuando esos flags están en 'true'.
    if (typeof window.cerrarModal === 'function' && !window.cerrarModal._envuelvePublicacion) {
        const cerrarModalOriginal = window.cerrarModal;
        window.cerrarModal = function() {
            cerrarModalOriginal();
            const modalPubActual = document.getElementById('modalPublicacion');
            if (modalPubActual && modalPubActual.dataset.reabrirTrasPelicula === 'true') {
                modalPubActual.dataset.reabrirTrasPelicula = 'false';
                modalPubActual.style.display = 'flex';
            }
            const overlayActual = document.getElementById('perfilPubsOverlay');
            if (overlayActual && overlayActual.dataset.reabrirTrasPelicula === 'true') {
                overlayActual.dataset.reabrirTrasPelicula = 'false';
                overlayActual.style.display = 'block';
            }
        };
        window.cerrarModal._envuelvePublicacion = true;
    }

    await _asegurarModalPeliculaEnDOM();

    if (typeof window.abrirDetallePelicula === 'function') {
        window.abrirDetallePelicula(movieId);
    }
};

async function _asegurarComunidadJsCargado() {
    // OJO: no usar toggleBanco como indicador de "ya está cargado" — existe
    // TAMBIÉN en feed-films.js (banco de comentario de película, cargado
    // siempre por defecto en el dashboard), así que da un falso positivo
    // apenas carga la página, antes de que comunidad.js exista de verdad.
    // renderPublicacionModal es exclusivo de comunidad.js, sin colisión.
    if (typeof window.renderPublicacionModal === 'function') return true;

    if (!document.getElementById('css-comunidad')) {
        const link = document.createElement('link');
        link.id = 'css-comunidad';
        link.rel = 'stylesheet';
        link.href = `css/comunidad.css?v=${Date.now()}`;
        document.head.appendChild(link);
    }

    if (!document.getElementById('js-comunidad')) {
        const script = document.createElement('script');
        script.id = 'js-comunidad';
        script.src = `js/comunidad.js?v=${Date.now()}`;
        document.head.appendChild(script);
    }

    await new Promise(resolve => {
        if (typeof window.renderPublicacionModal === 'function') { resolve(); return; }
        const check = setInterval(() => {
            if (typeof window.renderPublicacionModal === 'function') {
                clearInterval(check);
                resolve();
            }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 5000);
    });

    return true;
}

window.confirmarEliminarNovedad = function(id) {
        let overlay = document.getElementById('modalEliminarNovedadOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalEliminarNovedadOverlay';
            overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999999;align-items:center;justify-content:center;padding:1rem;';
            overlay.innerHTML = `
                <div style="background:white;border-radius:12px;padding:1.5rem;max-width:320px;width:100%;text-align:center;">
                    <p style="font-size:0.95rem;color:#333;margin-bottom:1.25rem;">¿Eliminar esta notificación?</p>
                    <div style="display:flex;gap:0.75rem;justify-content:center;">
                        <button id="btnCancelarEliminarNovedad" style="padding:0.5rem 1.2rem;border-radius:8px;border:1px solid #ddd;background:white;color:#555;cursor:pointer;">Cancelar</button>
                        <button id="btnConfirmarEliminarNovedad" style="padding:0.5rem 1.2rem;border-radius:8px;border:none;background:#e50914;color:white;font-weight:600;cursor:pointer;">Eliminar</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
            overlay.querySelector('#btnCancelarEliminarNovedad').onclick = () => { overlay.style.display = 'none'; };
        }
        overlay.querySelector('#btnConfirmarEliminarNovedad').onclick = async () => {
            overlay.style.display = 'none';
            await window.eliminarNovedad(id);
        };
        overlay.style.display = 'flex';
    };

    window.eliminarNovedad = async function(id) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            document.querySelectorAll(`[data-notif-id="${id}"], [data-notif-id-mobile="${id}"]`).forEach(el => el.remove());
            if (typeof window.cargarNovedades === 'function') window.cargarNovedades();
            if (typeof window.cargarNovedadesMobile === 'function') window.cargarNovedadesMobile();
        } catch (e) {
            alert('No se pudo eliminar la notificación. Probá de nuevo.');
        }
    };

window.abrirPublicacion = async function(pubId, abrirComentarios, comentarioId) {
    await _asegurarComunidadJsCargado();

    if (!document.getElementById('modalPublicacion')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="modalPublicacion" style="display:none; position:fixed; inset:0; z-index:999999; align-items:center; justify-content:center; padding:1rem; background:rgba(0,0,0,0.6);">
                <div class="modal-overlay" onclick="window.cerrarModalPublicacion()"></div>
                <div class="modal-pub-contenido" style="position:relative;z-index:1;background:white;border-radius:16px;width:100%;max-width:680px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;">
                    <div class="modal-pub-header" style="display:flex;justify-content:flex-end;padding:0.5rem 0.75rem 0;flex-shrink:0;">
                        <button onclick="window.cerrarModalPublicacion()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#999;line-height:1;">×</button>
                    </div>
                    <div id="modalPublicacionContenido" style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;">
                        <div style="text-align:center;padding:2rem;color:#ccc;">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>
                </div>
            </div>`);
    }

    const modal = document.getElementById('modalPublicacion');
    const contenido = document.getElementById('modalPublicacionContenido');
    if (!modal || !contenido) return;

    // Siempre al final del <body>, así queda por encima de cualquier
    // otro overlay abierto (ej: la vista "Ver todas las publicaciones" del perfil)
    document.body.appendChild(modal);

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    contenido.innerHTML = '<div style="text-align:center;padding:2rem;color:#ccc;"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${CONFIG.API_URL}/publications/${pubId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 404) {
                    contenido.innerHTML = '<div style="text-align:center;padding:3rem 1.5rem;color:#999;"><i class="fas fa-eye-slash" style="font-size:1.8rem;display:block;margin-bottom:0.75rem;color:#ccc;"></i>Esta publicación no está disponible por el momento (fue ocultada, o todavía está en revisión).</div>';
                    return;
                }
                if (!res.ok) throw new Error();
                const pub = await res.json();

        const imagenesHtml = pub.imageUrls && pub.imageUrls.length > 0
            ? `<div class="com-card-imagenes">${pub.imageUrls.map(url =>
                `<img src="${url}" alt="imagen" style="width:100%;max-height:480px;object-fit:cover;">`
              ).join('')}</div>`
            : '';

        // Reutilizamos el mismo render que usa el feed oficial de Comunidad
                // (renderCard, expuesto como window.renderPublicacionModal), en vez de
                // mantener una plantilla propia que se desincroniza cada vez que se
                // agrega algo nuevo a la tarjeta (título, hashtags, menú de 3 puntos, etc.)
                contenido.innerHTML = (typeof window.renderPublicacionModal === 'function')
                                    ? window.renderPublicacionModal(pub)
                                    : `<div style="text-align:center;padding:2rem;color:#ccc;">No se pudo mostrar la publicación.</div>`;

                                // Resolver la herramienta activa (Ficha técnica, Countdown, Votación,
                                // o la que sea) — sin esto, renderPublicacionModal solo pinta el
                                // placeholder ("Cargando...") y nadie lo termina de resolver, porque
                                // acá no pasa por el loop del feed de comunidad.js.
                                const herramientaActivaModal = (window.CreatorTools || []).find(t => typeof t.activoPara === 'function' && t.activoPara(pub));
                                if (herramientaActivaModal && typeof herramientaActivaModal.resolverEnCard === 'function') {
                                    herramientaActivaModal.resolverEnCard(pub);
                                }

                if (pub.movieId && pub.movieFichaEnabled && typeof window.resolverFichaPelicula === 'function') {
                    window.resolverFichaPelicula(pub.id, pub.movieId);
                }

        // Cargar reacciones
        const tokenR = localStorage.getItem('token');
        Promise.all([
            fetch(`${CONFIG.API_URL}/publications/${pubId}/reactions/count`, { headers: { 'Authorization': `Bearer ${tokenR}` } }),
            fetch(`${CONFIG.API_URL}/publications/${pubId}/my-reactions`, { headers: { 'Authorization': `Bearer ${tokenR}` } }),
            fetch(`${CONFIG.API_URL}/publications/${pubId}/comments/count`, { headers: { 'Authorization': `Bearer ${tokenR}` } })
        ]).then(async ([countRes, myRes, comentRes]) => {
            if (countRes.ok) {
                const counts = await countRes.json();
                const el = document.getElementById(`bancoCount-${pubId}`);
                if (el) el.textContent = counts.banco || 0;
            }
            if (myRes.ok) {
                const my = await myRes.json();
                if (my.banco) {
                    const btn = document.getElementById(`btnBanco-${pubId}`);
                    if (btn) btn.classList.add('com-accion-active');
                }
            }
            if (comentRes.ok) {
                const dataC = await comentRes.json();
                const el = document.getElementById(`comentCount-${pubId}`);
                if (el && dataC.count > 0) el.textContent = dataC.count;
            }
        }).catch(() => {});

        // Abrir comentarios si corresponde
            if (abrirComentarios) {
                // Cargar comunidad.js si no está disponible
                if (typeof window.abrirComentariosPub !== 'function') {
                    await new Promise(resolve => {
                        const s = document.createElement('script');
                        s.src = `js/comunidad.js?v=${Date.now()}`;
                        s.onload = resolve;
                        s.onerror = resolve;
                        document.head.appendChild(s);
                    });
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                if (typeof window.abrirComentariosPub === 'function') {
                    window.abrirComentariosPub(pubId);

                    if (comentarioId) {
                        await new Promise(resolve => setTimeout(resolve, 800));
                        const comentEl = document.getElementById(`pubComment-${comentarioId}`);
                        if (comentEl) {
                            comentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            comentEl.style.transition = 'background 0.3s';
                            comentEl.style.background = '#eef1f8';
                            setTimeout(() => { comentEl.style.background = ''; }, 2500);
                        }
                    }
                }
        }

    } catch(e) {
        contenido.innerHTML = '<div style="text-align:center;padding:2rem;color:#ccc;">No se pudo cargar la publicación.</div>';
    }
};