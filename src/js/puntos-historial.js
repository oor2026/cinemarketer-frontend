// =====================================================================================================================
// puntos-historial.js — Modal «Detalle de mis puntos» (historial de puntos) disponible desde CUALQUIER lugar de la app.
//
// Qué hace:
//   - window.abrirHistorialPuntos() abre el modal donde estés parado (sin ir al Club de Beneficios).
//   - Lo usan el ícono de puntos del header y el botón «Ver historial» del Club.
//   - Muestra lo mismo que el modal del Club (acumulados del mes, canjeados del mes, canjeados histórico, filtros por tipo y por
//     fecha, movimientos y paginación) y agrega arriba de todo el badge «Puntos disponibles».
//
// Servicio: GET /users/me/points/history?filter=all|earned|redeemed|spent&page=N&size=10  (con el token del usuario)
//   Campos que lee: totalPoints (puntos disponibles; también acepta availablePoints), accumulatedPoints (o earnedThisMonth), redeemedThisMonth, totalRedeemed (o totalSpent),
//   transactions[{ type, action, points, referenceTitle, createdAt }], currentPage, totalPages.
//
// Trae sus propios estilos (inyectados al abrir por primera vez), así no depende de que el CSS del Club esté cargado.
// Todo va con el prefijo «hp» para no chocar con el modal del Club ni con ningún otro.
// =====================================================================================================================
(function () {
    'use strict';
    if (window._puntosHistorial) return;

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = (n) => (n ?? 0).toLocaleString('es-AR');

    const ICONOS = {
        VOTE_MOVIE: 'fa-thumbs-up', VOTE_CINEMA: 'fa-building', VOTE_SERIES: 'fa-thumbs-up',
        COMMENT_MOVIE: 'fa-comment', COMMENT_SERIES: 'fa-comment',
        RECOMMEND_MOVIE: 'fa-envelope', RECOMMEND_SERIES: 'fa-envelope',
        REWARD_REDEMPTION: 'fa-ticket-alt', RECEIVE_MERECE_PUNTO: 'fa-star', REVERT_MERECE_PUNTO: 'fa-star',
        ADMIN_GRANT: 'fa-gift', PUBLISH_POST: 'fa-pen-alt', RECEIVE_BANCO_POST: 'fa-fist-raised',
        RECEIVE_MERECE_POST: 'fa-star', TRIVIA_ANSWER: 'fa-question-circle', TRIVIA_SERIES_ANSWER: 'fa-question-circle'
    };
    const ETIQUETAS = {
        VOTE_MOVIE: 'Voto en película', VOTE_CINEMA: 'Voto en cine', VOTE_SERIES: 'Voto en serie',
        COMMENT_MOVIE: 'Comentario en película', COMMENT_SERIES: 'Comentario en serie',
        RECOMMEND_MOVIE: 'Recomendación de película', RECOMMEND_SERIES: 'Recomendación de serie',
        REWARD_REDEMPTION: 'Canje de premio', RECEIVE_MERECE_PUNTO: '¡Merecés un punto!',
        REVERT_MERECE_PUNTO: 'Reversión de punto', ADMIN_GRANT: 'Regalo de puntos',
        PUBLISH_POST: 'Publicación en Comunidad', RECEIVE_BANCO_POST: 'Te bancaron una publicación',
        RECEIVE_MERECE_POST: 'Merecés un punto en publicación', PUBLICATION_SANCTION: 'Sanción por moderación',
        TRIVIA_ANSWER: 'Trivia diaria de películas', TRIVIA_SERIES_ANSWER: 'Trivia diaria de series'
    };

    const E = { filtro: 'all', fecha: 'all', pagina: 1, abierto: false, disparador: null, pedido: 0 };

    // ------------------------------------------------------------------------------------------------ Estilos (los mismos del modal del Club)
    function inyectarEstilos() {
        if ($('hpEstilos')) return;
        const st = document.createElement('style');
        st.id = 'hpEstilos';
        st.textContent = `
        html.hp-bloqueado,html.hp-bloqueado body{overflow:hidden}
        #hpOverlay{position:fixed;inset:0;z-index:999999;display:none;align-items:flex-end;justify-content:center;background:rgba(16,24,40,.58);font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:#101828}
        #hpOverlay.on{display:flex}
        #hpOverlay .hp-caja{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 54px);max-height:calc(100dvh - 54px);display:flex;flex-direction:column;background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -10px 40px rgba(16,24,40,.25);outline:none;transform:translateY(24px);opacity:0;transition:transform .22s ease,opacity .22s ease}
        #hpOverlay.in .hp-caja{transform:none;opacity:1}
        #hpOverlay .hp-asa{flex:none;width:44px;height:5px;margin:10px auto 0;border-radius:3px;background:#D0D5DD}
        #hpOverlay .hp-header{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 16px 0}
        #hpOverlay .hp-header h3{margin:0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:26px;line-height:1.1;color:#0B2A63}
        #hpOverlay .hp-header p{margin:4px 0 0;font-size:13.5px;line-height:19px;color:#475467}
        #hpOverlay .hp-header button{flex:none;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:#F2F4F7;color:#344054;display:flex;align-items:center;justify-content:center;cursor:pointer}
        #hpOverlay .hp-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px calc(24px + env(safe-area-inset-bottom,0px))}
        #hpOverlay .hp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        #hpOverlay .hp-stat{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px;background:#fff;border:1px solid #EAECF0;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.05);min-width:0}
        #hpOverlay .hp-ic{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.85rem}
        #hpOverlay .hp-ic.v{background:#DCFAE6;color:#067647}
        #hpOverlay .hp-ic.a{background:#FEF0C7;color:#B54708}
        #hpOverlay .hp-ic.p{background:#F4EBFF;color:#6941C6}
        #hpOverlay .hp-valor{display:block;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:20px;line-height:1.1;color:#101828}
        #hpOverlay .hp-label{display:block;margin-top:2px;font-size:11.5px;line-height:15px;font-weight:500;color:#475467}
        #hpOverlay .hp-stat.hp-disp{grid-column:1/-1;position:relative;overflow:hidden;flex-direction:row;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border:0;border-radius:22px;background:linear-gradient(155deg,#0B2A63 0%,#16397F 100%);color:#fff;box-shadow:none}
        #hpOverlay .hp-disp::before{content:"";position:absolute;right:-50px;top:-60px;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,rgba(255,213,79,.30),transparent 65%);pointer-events:none}
        #hpOverlay .hp-disp > div{position:relative}
        #hpOverlay .hp-disp .hp-label{margin:0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C7D7FE}
        #hpOverlay .hp-disp .hp-valor{margin-top:4px;font-size:40px;line-height:1.05;color:#fff}
        #hpOverlay .hp-moneda{position:relative;flex:none;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FFE082,#F5B301);display:flex;align-items:center;justify-content:center;color:#7A4B00;font-size:1.5rem;box-shadow:0 6px 16px rgba(245,179,1,.35)}
        #hpOverlay .hp-filtros{display:flex;gap:8px;margin:18px -16px 4px;padding:0 16px;overflow-x:auto;scrollbar-width:none}
        #hpOverlay .hp-filtros::-webkit-scrollbar{display:none}
        #hpOverlay .hp-filtro,#hpOverlay .hp-fecha{flex:none;height:38px;padding:0 14px;border:1.5px solid #D0D5DD;border-radius:999px;background:#fff;font-family:inherit;font-size:13px;font-weight:600;color:#344054;white-space:nowrap;cursor:pointer}
        #hpOverlay .hp-filtro.active{background:#0B2A63;border-color:#0B2A63;color:#fff}
        #hpOverlay .hp-fecha{appearance:none;-webkit-appearance:none;padding-right:32px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23344054' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center/12px}
        #hpOverlay .hp-cab{margin:22px 0 4px;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:18px;color:#0B2A63}
        #hpOverlay .hp-mov{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F2F4F7}
        #hpOverlay .hp-mov:last-child{border-bottom:0}
        #hpOverlay .hp-mov-icono{flex:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        #hpOverlay .hp-mov-icono.earned{background:#DCFAE6;color:#067647}
        #hpOverlay .hp-mov-icono.spent{background:#FEF3F2;color:#B42318}
        #hpOverlay .hp-mov-det{flex:1;min-width:0}
        #hpOverlay .hp-mov-concepto{font-size:14.5px;font-weight:600;line-height:1.25;color:#101828}
        #hpOverlay .hp-mov-fecha{margin-top:1px;font-size:12.5px;color:#667085}
        #hpOverlay .hp-mov-ref{display:block;margin-top:2px;font-size:12.5px;line-height:1.3;color:#475467}
        #hpOverlay .hp-mov-monto{flex:none;display:flex;align-items:center;gap:5px;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:16px}
        #hpOverlay .hp-mov-monto i{font-size:.8rem;opacity:.85}
        #hpOverlay .hp-mov-monto.earned{color:#067647}
        #hpOverlay .hp-mov-monto.spent{color:#B42318}
        #hpOverlay .hp-vacio,#hpOverlay .hp-error{margin:0;padding:26px 12px;text-align:center;font-size:14px;line-height:20px;color:#475467}
        #hpOverlay .hp-vacio i{display:block;margin-bottom:8px;font-size:1.6rem;color:#98A2B3}
        #hpOverlay .hp-error{color:#B42318}
        #hpOverlay .hp-reintentar{display:block;margin:10px auto 0;height:44px;padding:0 20px;border:1.5px solid #D0D5DD;border-radius:999px;background:#fff;font-family:inherit;font-size:14px;font-weight:600;color:#0B2A63;cursor:pointer}
        #hpOverlay .hp-sk{display:flex;align-items:center;gap:12px;padding:12px 0}
        #hpOverlay .hp-sk i{display:block;border-radius:999px;background:linear-gradient(90deg,#F2F4F7 25%,#E4E7EC 50%,#F2F4F7 75%);background-size:200% 100%;animation:hpBrillo 1.2s linear infinite}
        #hpOverlay .hp-sk i:first-child{width:40px;height:40px}
        #hpOverlay .hp-sk i:nth-child(2){flex:1;height:34px;border-radius:10px}
        #hpOverlay .hp-sk i:last-child{width:44px;height:18px}
        @keyframes hpBrillo{0%{background-position:200% 0}100%{background-position:-200% 0}}
        #hpOverlay .hp-paginacion{display:flex;justify-content:center;align-items:center;gap:14px;padding:16px 0 0}
        #hpOverlay .hp-paginacion button{width:44px;height:44px;border-radius:50%;border:1.5px solid #D0D5DD;background:#fff;color:#344054;cursor:pointer}
        #hpOverlay .hp-paginacion button:disabled{opacity:.4;cursor:not-allowed}
        #hpOverlay .hp-paginacion span{font-size:13px;font-weight:600;color:#475467}
        #hpOverlay button:focus-visible,#hpOverlay select:focus-visible{outline:3px solid rgba(11,77,162,.45);outline-offset:2px}
        @media (min-width:769px){
            #hpOverlay{align-items:center;padding:1rem}
            #hpOverlay .hp-caja{max-height:86vh;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.35);transform:translateY(12px) scale(.98)}
            #hpOverlay.in .hp-caja{transform:none}
            #hpOverlay .hp-asa{display:none}
            #hpOverlay .hp-header{padding:22px 24px 0}
            #hpOverlay .hp-body{padding:16px 24px 28px}
            #hpOverlay .hp-filtros{margin-left:-24px;margin-right:-24px;padding:0 24px}
        }
        @media (prefers-reduced-motion:reduce){#hpOverlay .hp-caja{transition:none}#hpOverlay .hp-sk i{animation:none}}`;
        document.head.appendChild(st);
    }

    // ------------------------------------------------------------------------------------------------ Marcado
    function construir() {
        if ($('hpOverlay')) return;
        inyectarEstilos();
        const o = document.createElement('div');
        o.id = 'hpOverlay';
        o.innerHTML = `<div class="hp-caja" role="dialog" aria-modal="true" aria-labelledby="hpTitulo" tabindex="-1">
            <div class="hp-asa"></div>
            <div class="hp-header"><div><h3 id="hpTitulo">Mis puntos</h3><p>Cómo ganaste y usaste tus puntos</p></div>
                <button type="button" data-hp="cerrar" aria-label="Cerrar"><i class="fas fa-times" aria-hidden="true"></i></button></div>
            <div class="hp-body">
                <div class="hp-stats">
                    <div class="hp-stat hp-disp"><div><span class="hp-label">Puntos disponibles</span><span class="hp-valor" id="hpDisponibles">–</span></div><span class="hp-moneda" aria-hidden="true"><i class="fas fa-coins"></i></span></div>
                    <div class="hp-stat"><span class="hp-ic v" aria-hidden="true"><i class="fas fa-piggy-bank"></i></span><div><span class="hp-valor" id="hpAcumulados">0</span><span class="hp-label">Acumulados este mes</span></div></div>
                    <div class="hp-stat"><span class="hp-ic a" aria-hidden="true"><i class="fas fa-calendar-check"></i></span><div><span class="hp-valor" id="hpCanjeadosMes">0</span><span class="hp-label">Canjeados este mes</span></div></div>
                    <div class="hp-stat"><span class="hp-ic p" aria-hidden="true"><i class="fas fa-trophy"></i></span><div><span class="hp-valor" id="hpCanjeadosTotal">0</span><span class="hp-label">Canjeados histórico</span></div></div>
                </div>
                <div class="hp-filtros" role="group" aria-label="Filtrar movimientos">
                    <button type="button" class="hp-filtro active" data-hp="filtro" data-f="all">Todos</button>
                    <button type="button" class="hp-filtro" data-hp="filtro" data-f="earned">Ganados</button>
                    <button type="button" class="hp-filtro" data-hp="filtro" data-f="redeemed">Canjeados</button>
                    <button type="button" class="hp-filtro" data-hp="filtro" data-f="spent">Descontados</button>
                    <select class="hp-fecha" id="hpFecha" aria-label="Filtrar por fecha">
                        <option value="all">Todas las fechas</option><option value="today">Hoy</option><option value="week">Esta semana</option>
                        <option value="month">Este mes</option><option value="year">Este año</option>
                    </select>
                </div>
                <h4 class="hp-cab">Movimientos</h4>
                <div id="hpLista" aria-live="polite"></div>
                <div id="hpPaginacion" class="hp-paginacion" style="display:none"></div>
            </div></div>`;
        o.addEventListener('click', (e) => {
            if (e.target === o) { cerrar(); return; }
            const b = e.target.closest('[data-hp]');
            if (!b || b.disabled) return;
            const acc = b.dataset.hp;
            if (acc === 'cerrar') cerrar();
            else if (acc === 'filtro') {
                E.filtro = b.dataset.f; E.pagina = 1;
                o.querySelectorAll('.hp-filtro').forEach((x) => x.classList.toggle('active', x === b));
                cargar();
            } else if (acc === 'pagina') { E.pagina = parseInt(b.dataset.p, 10) || 1; cargar(); }
            else if (acc === 'reintentar') cargar();
        });
        o.querySelector('#hpFecha').addEventListener('change', (e) => { E.fecha = e.target.value; E.pagina = 1; cargar(); });
        document.body.appendChild(o);
    }

    // ------------------------------------------------------------------------------------------------ Abrir y cerrar
    function abrir() {
        construir();
        const o = $('hpOverlay');
        E.disparador = document.activeElement;
        E.filtro = 'all'; E.fecha = 'all'; E.pagina = 1; E.abierto = true;
        o.querySelectorAll('.hp-filtro').forEach((x) => x.classList.toggle('active', x.dataset.f === 'all'));
        $('hpFecha').value = 'all';
        $('hpDisponibles').textContent = '–';
        document.documentElement.classList.add('hp-bloqueado');
        o.classList.add('on');
        requestAnimationFrame(() => o.classList.add('in'));
        cargar();
        requestAnimationFrame(() => { const c = o.querySelector('[data-hp="cerrar"]'); if (c) c.focus(); });
    }

    function cerrar() {
        const o = $('hpOverlay');
        if (!o) return;
        o.classList.remove('on', 'in');
        E.abierto = false; E.pedido++;                       // descarta cualquier respuesta que todavía esté en camino
        document.documentElement.classList.remove('hp-bloqueado');
        if (E.disparador && E.disparador.focus) { try { E.disparador.focus(); } catch (e) { /* el elemento ya no existe */ } }
    }

    document.addEventListener('keydown', (e) => {
        if (!E.abierto) return;
        if (e.key === 'Escape') { cerrar(); return; }
        if (e.key !== 'Tab') return;
        const foc = Array.from($('hpOverlay').querySelectorAll('button:not([disabled]),select,[tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
        if (!foc.length) return;
        const i = foc.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); foc[foc.length - 1].focus(); }
        else if (!e.shiftKey && (i === foc.length - 1 || i === -1)) { e.preventDefault(); foc[0].focus(); }
    });

    // ------------------------------------------------------------------------------------------------ Datos
    // «Hoy · 23:07», «Ayer · 18:42» o «09/11/2026 · 13:26».
    function etiquetaFecha(iso, hoy) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate()), dif = Math.round((hoy - dia) / 86400000);
        if (dif === 0) return `Hoy · ${hora}`;
        if (dif === 1) return `Ayer · ${hora}`;
        return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${hora}`;
    }

    async function cargar() {
        const lista = $('hpLista'), pag = $('hpPaginacion');
        const mio = ++E.pedido;
        lista.innerHTML = '<div role="status" aria-label="Cargando">' + '<div class="hp-sk"><i></i><i></i><i></i></div>'.repeat(4) + '</div>';
        try {
            const params = new URLSearchParams({ filter: E.filtro, page: E.pagina, size: 10 });
            const res = await fetch(`${CONFIG.API_URL}/users/me/points/history?${params}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (mio !== E.pedido) return;                    // llegó tarde: ya se pidió otra cosa o se cerró el modal

            const disponibles = data.availablePoints ?? data.totalPoints;       // el servicio los manda como totalPoints
            $('hpDisponibles').textContent = disponibles == null ? '–' : fmt(disponibles);
            $('hpAcumulados').textContent = fmt(data.accumulatedPoints ?? data.earnedThisMonth);
            $('hpCanjeadosMes').textContent = fmt(data.redeemedThisMonth ?? 0);
            $('hpCanjeadosTotal').textContent = fmt(data.totalRedeemed ?? data.totalSpent ?? 0);

            const vacio = '<div class="hp-vacio"><i class="fas fa-receipt" aria-hidden="true"></i>No hay transacciones para este filtro.</div>';
            if (!data.transactions || !data.transactions.length) { lista.innerHTML = vacio; pag.style.display = 'none'; return; }

            const ahora = new Date(), hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            const limites = { today: hoy, week: new Date(hoy.getTime() - 6 * 86400000), month: new Date(ahora.getFullYear(), ahora.getMonth(), 1), year: new Date(ahora.getFullYear(), 0, 1) };
            const desde = limites[E.fecha] || null;
            const movs = desde ? data.transactions.filter((t) => new Date(t.createdAt) >= desde) : data.transactions;
            if (!movs.length) { lista.innerHTML = vacio; pag.style.display = 'none'; return; }

            lista.innerHTML = movs.map((t) => {
                const ganado = t.type === 'EARNED' && t.points > 0;
                const fecha = etiquetaFecha(t.createdAt, hoy);
                return `<div class="hp-mov">
                    <div class="hp-mov-icono ${ganado ? 'earned' : 'spent'}"><i class="fas ${ICONOS[t.action] || 'fa-coins'}" aria-hidden="true"></i></div>
                    <div class="hp-mov-det"><div class="hp-mov-concepto">${esc(ETIQUETAS[t.action] || t.action)}</div><div class="hp-mov-fecha">${esc(fecha)}</div>${t.referenceTitle ? `<small class="hp-mov-ref">${esc(t.referenceTitle)}</small>` : ''}</div>
                    <div class="hp-mov-monto ${ganado ? 'earned' : 'spent'}">${ganado ? '+' : '-'}${Math.abs(t.points)} <i class="fas fa-coins" aria-hidden="true"></i></div>
                </div>`;
            }).join('');

            const actual = data.currentPage || E.pagina, total = data.totalPages || 1;
            if (total <= 1) { pag.style.display = 'none'; }
            else {
                pag.style.display = 'flex';
                pag.innerHTML = `<button type="button" data-hp="pagina" data-p="${actual - 1}" aria-label="Página anterior" ${actual <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
                    <span>Página ${actual} de ${total}</span>
                    <button type="button" data-hp="pagina" data-p="${actual + 1}" aria-label="Página siguiente" ${actual >= total ? 'disabled' : ''}><i class="fas fa-chevron-right" aria-hidden="true"></i></button>`;
            }
        } catch (e) {
            if (mio !== E.pedido) return;
            lista.innerHTML = '<div class="hp-error">Error al cargar el historial.<button type="button" class="hp-reintentar" data-hp="reintentar">Reintentar</button></div>';
            pag.style.display = 'none';
        }
    }

    window._puntosHistorial = { abrir, cerrar };
    window.abrirHistorialPuntos = abrir;
})();