// =====================================================================================================================
// misiones.js — Misiones y sellos (mobile)
//
// Qué hace:
//   1. La tarjeta "Misión de hoy" del feed (#inicioMision) deja de ser una maqueta: muestra la misión MÁS FÁCIL de cumplir
//      (la elige el servidor) y es un botón que abre el modal. Si el servidor todavía no tiene misiones, la tarjeta no se ve.
//   2. El modal "Tus misiones" (hoja inferior): la más cercana, filtros (Hoy / Esta semana / Permanentes), misiones en curso,
//      próximas (bloqueadas, programadas y misteriosas), los sellos ganados y los que quedan por descubrir.
//   3. El detalle de una misión y la celebración al cumplir una (con la siguiente misión ya servida).
//   4. Cada misión cumplida da un SELLO, no puntos. El modal lo dice, y no se muestra ningún puntaje.
//   5. "Ver todos mis logros" lleva a Mi Sala › Mis logros.
//
// Servicio (todo con el token del usuario):
//   GET  /missions/me/resumen   → { destacada, cumplidasSinVer: [ { id, titulo, sello, siguiente } ] }
//   GET  /missions/me           → { destacada, enCurso: [ mision ], proximas: [ mision ], sellos: { total, recientes: [ sello ], porDescubrir } }
//   POST /missions/me/cumplidas/{id}/visto   (marca la celebración como vista, para que no se repita)
//   mision = { id, titulo, descripcion, categoria, vigencia, tipoContenido, progreso, meta, unidad, sello: { id, nombre, categoria },
//              estado?, desbloqueo?, comienza?, misterio?: { sellosActuales, sellosNecesarios }, accion?: { texto, destino } }
//   vigencia: HOY | SEMANA | RACHA | PERMANENTE | EVENTO · tipoContenido: PELICULA | SERIE | null
//   estado (solo en "proximas"): BLOQUEADA | PROGRAMADA | MISTERIOSA
//   categoria / sello.categoria: votos | comentarios | constancia | genero | autor | trivia | comunidad | especial
//
// Solo mobile (hasta 768 px). Escritorio no cambia.
// =====================================================================================================================
(function () {
    'use strict';
    if (window._misiones) return;

    const esMobile = () => window.innerWidth <= 768;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const cab = () => ({ headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const api = () => (window.CONFIG && CONFIG.API_URL) || '';

    const E = { resumen: null, completo: null, abierto: false, vista: 'lista', filtro: 'todas', detalleId: null, disparador: null, cargando: false, error: false, ultimoResumen: 0, fiesta: null, vistas: {}, descartadas: null, confirmar: null, disparadorConf: null, avisosVistos: {} };

    // ------------------------------------------------------------------------------------------------ Sellos
    const IC = {
        votos: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
        comentarios: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        constancia: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        genero: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
        autor: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
        trivia: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        comunidad: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        especial: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
        saga: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
        elenco: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
        premios: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
        perfil: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
        recomendaciones: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
        _: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
        candado: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
    };
    const cat = (c) => (IC[c] && c !== '_' && c !== 'candado' ? c : '_');
    // variante: '' ganado · 'apag' en curso · 'bloq' bloqueado · 'mist' misterioso. tam: 'p' (44) · 'm' (56) · 'g' (72) · 'xg' (120) · 'xxg' (164)
    // img = la imagen propia del sello (la sube el admin); si no tiene, o es el sello misterioso o el candado, se dibuja con el ícono de su categoría.
    function sello(categoria, variante, tam, img) {
        const c = variante === 'bloq' ? 'bloq' : variante === 'mist' ? 'mist' : cat(categoria);
        const conImg = typeof img === 'string' && /^https:\/\//.test(img) && variante !== 'mist' && variante !== 'bloq';
        const dentro = variante === 'mist' ? '<b>?</b>' : `<svg viewBox="0 0 24 24" aria-hidden="true">${variante === 'bloq' ? IC.candado : IC[cat(categoria)]}</svg>${conImg ? `<img src="${esc(img)}" alt="" decoding="async">` : ''}`;
        return `<span class="mi-sello mi-s-${tam || 'm'} mi-c-${c}${variante === 'apag' ? ' mi-apag' : ''}${conImg ? ' mi-con-img' : ''}">${dentro}</span>`;
    }
    // Si la imagen no carga (URL rota, sin conexión) el sello vuelve a mostrar el ícono de su categoría. «error» no burbujea: se escucha en la captura.
    document.addEventListener('error', (e) => {
        const i = e.target, p = i && i.parentNode;
        if (i && i.tagName === 'IMG' && p && p.classList && p.classList.contains('mi-con-img')) { p.classList.remove('mi-con-img'); i.remove(); }
        else if (i && i.tagName === 'IMG' && p && p.classList && p.classList.contains('mi-det-fondo')) { p.remove(); }      // el fondo del detalle no cargó: no queda un hueco
    }, true);
    const ETQ_VIGENCIA = { HOY: 'Hoy', SEMANA: 'Esta semana', RACHA: 'Racha', PERMANENTE: 'Permanente', EVENTO: 'Especial' };
    const ETQ_FAMILIA = { SAGA: 'Saga', ACTOR: 'Actor o actriz', DIRECTOR: 'Director', GENERO: 'Género' };
    const CAT_FAMILIA = { SAGA: 'saga', ACTOR: 'elenco', DIRECTOR: 'autor', GENERO: 'genero' };
    // En las misiones rotativas la etiqueta es la familia (Saga, Actor o actriz...): «Permanente» no diría nada.
    const tagVig = (m) => `<span class="mi-tag${m.familia ? ' fam' : ''}">${m.familia ? (ETQ_FAMILIA[m.familia] || '') : (ETQ_VIGENCIA[m.vigencia] || '')}</span>`;
    // «Nv 3»: el escalón que se está persiguiendo (solo las misiones con escalera).
    const tagNivel = (m) => m.escalera && m.nivel ? `<span class="mi-tag nv">Nv ${m.nivel}</span>` : '';
    const tagTipo = (m) => m.tipoContenido === 'PELICULA' ? '<span class="mi-tag pel">Película</span>' : m.tipoContenido === 'SERIE' ? '<span class="mi-tag ser">Serie</span>' : '';
    const faltan = (m) => Math.max(0, (m.meta || 0) - (m.progreso || 0));
    const pct = (m) => (m.meta ? Math.min(100, Math.round((m.progreso || 0) * 100 / m.meta)) : 0);
    const unidadTxt = (m, n) => { const u = m.unidad || ''; return u ? `${n} ${n === 1 && u.endsWith('s') ? u.slice(0, -1) : u}` : String(n); };
    const fechaLarga = (f) => { const d = new Date(f + (String(f).length === 10 ? 'T12:00:00' : '')); return isNaN(d) ? '' : new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d).replace(',', ''); };
    const fechaCorta = (f) => { const d = new Date(f); return isNaN(d) ? '' : new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d).replace('.', ''); };

    // ------------------------------------------------------------------------------------------------ Estilos
    function inyectarEstilos() {
        if ($('miEstilos')) return;
        const st = document.createElement('style');
        st.id = 'miEstilos';
        st.textContent = `
        /* --- sellos --- */
        .mi-sello{position:relative;flex:none;display:flex;align-items:center;justify-content:center;border-radius:50%;border:4px dotted var(--mi-p);width:56px;height:56px}
        .mi-sello::before{content:"";position:absolute;left:2px;top:2px;right:2px;bottom:2px;border-radius:50%;background:linear-gradient(135deg,var(--mi-c1),var(--mi-c2))}
        .mi-sello::after{content:"";position:absolute;left:6px;top:6px;right:6px;bottom:6px;border-radius:50%;border:1.2px solid rgba(255,255,255,.55)}
        .mi-sello svg{position:relative;z-index:1;width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .mi-sello b{position:relative;z-index:1;font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#fff}
        .mi-s-p{width:44px;height:44px;border-width:3px}.mi-s-p::after{left:5px;top:5px;right:5px;bottom:5px}.mi-s-p svg{width:17px;height:17px}.mi-s-p b{font-size:17px}
        .mi-s-g{width:72px;height:72px}.mi-s-g::after{left:7px;top:7px;right:7px;bottom:7px}.mi-s-g svg{width:26px;height:26px}.mi-s-g b{font-size:26px}
        .mi-s-xg{width:120px;height:120px;border-width:6px}.mi-s-xg::before{left:3px;top:3px;right:3px;bottom:3px}.mi-s-xg::after{left:12px;top:12px;right:12px;bottom:12px;border-width:1.5px}.mi-s-xg svg{width:40px;height:40px}.mi-s-xg b{font-size:40px}
        .mi-s-xxg{width:164px;height:164px;border-width:8px}.mi-s-xxg::before{left:4px;top:4px;right:4px;bottom:4px}.mi-s-xxg::after{left:16px;top:16px;right:16px;bottom:16px;border-width:2px}.mi-s-xxg svg{width:56px;height:56px}
        .mi-apag{opacity:.55;filter:grayscale(.6)}
        .mi-apag.mi-con-img{opacity:.88;filter:grayscale(.2)}        /* con una imagen (p. ej. el póster de la saga) el sello en curso se ve casi a color */
        .mi-c-elenco.mi-con-img img,.mi-c-autor.mi-con-img img{object-position:center 18%}        /* la foto de un actor o director se alinea arriba, para que entre la cara en el círculo */
        .mi-det-fondo{position:relative;height:138px;margin:0 -16px;overflow:hidden;background:#EAECF0}
        .mi-det-fondo img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 22%}
        .mi-det-fondo::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(255,255,255,0) 30%,#fff 100%)}
        .mi-det-fondo + div .mi-anillo{margin-top:-74px;z-index:1}
        .mi-sello img{position:absolute;z-index:2;border-radius:50%;object-fit:cover;background:#fff;left:4px;top:4px;width:calc(100% - 8px);height:calc(100% - 8px)}
        .mi-sello.mi-con-img::before{background:#fff}.mi-sello.mi-con-img::after{display:none}.mi-sello.mi-con-img svg{display:none}
        .mi-s-p img{left:3px;top:3px;width:calc(100% - 6px);height:calc(100% - 6px)}.mi-s-g img{left:5px;top:5px;width:calc(100% - 10px);height:calc(100% - 10px)}
        .mi-s-xg img{left:8px;top:8px;width:calc(100% - 16px);height:calc(100% - 16px)}.mi-s-xxg img{left:10px;top:10px;width:calc(100% - 20px);height:calc(100% - 20px)}
        .mi-c-votos{--mi-c1:#067647;--mi-c2:#12B76A;--mi-p:rgba(18,183,106,.55)}
        .mi-c-comentarios{--mi-c1:#B54708;--mi-c2:#D9631A;--mi-p:rgba(217,99,26,.55)}
        .mi-c-constancia{--mi-c1:#8A5A00;--mi-c2:#C99700;--mi-p:rgba(201,151,0,.6)}
        .mi-c-genero{--mi-c1:#A11043;--mi-c2:#DD2590;--mi-p:rgba(221,37,144,.5)}
        .mi-c-autor{--mi-c1:#3538CD;--mi-c2:#6172F3;--mi-p:rgba(97,114,243,.55)}
        .mi-c-trivia{--mi-c1:#5B2EA6;--mi-c2:#7A4CC7;--mi-p:rgba(122,76,199,.55)}
        .mi-c-comunidad{--mi-c1:#0E7C7B;--mi-c2:#14A09E;--mi-p:rgba(20,160,158,.55)}
        .mi-c-especial{--mi-c1:#B42318;--mi-c2:#E50914;--mi-p:rgba(229,9,20,.5)}
        .mi-c-saga{--mi-c1:#4D7C0F;--mi-c2:#84CC16;--mi-p:rgba(132,204,22,.55)}
        .mi-c-elenco{--mi-c1:#0E7490;--mi-c2:#06B6D4;--mi-p:rgba(6,182,212,.55)}
        .mi-c-premios{--mi-c1:#BE185D;--mi-c2:#F472B6;--mi-p:rgba(244,114,182,.55)}
        .mi-c-perfil{--mi-c1:#0369A1;--mi-c2:#38BDF8;--mi-p:rgba(56,189,248,.55)}
        .mi-c-recomendaciones{--mi-c1:#86198F;--mi-c2:#D946EF;--mi-p:rgba(217,70,239,.55)}
        .mi-c-_{--mi-c1:#344054;--mi-c2:#667085;--mi-p:rgba(102,112,133,.5)}
        .mi-c-bloq{--mi-c1:#98A2B3;--mi-c2:#667085;--mi-p:rgba(102,112,133,.45)}
        .mi-c-mist{--mi-c1:#101828;--mi-c2:#344054;--mi-p:rgba(52,64,84,.55)}
        /* --- tarjeta del feed --- */
        .inicio-hero-mobile .inicio-mision{width:calc(100% + 2rem - 24px);box-sizing:border-box;border:1px solid rgba(22,38,77,.08);font-family:inherit;text-align:left;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative}
        .inicio-hero-mobile .inicio-mision[hidden]{display:none}
        .inicio-hero-mobile .inicio-mision:active{transform:scale(.99)}
        .inicio-hero-mobile .inicio-mision:focus-visible{outline:3px solid rgba(11,77,162,.45);outline-offset:2px}
        .inicio-hero-mobile .inicio-mision-rotulo{font-size:12px}
        .inicio-hero-mobile .inicio-mision-avance span.hecho{background:#067647}
        .inicio-hero-mobile .inicio-mision-conteo{font-size:12px;font-weight:600;color:#475467;white-space:nowrap}
        .inicio-hero-mobile .inicio-mision-barra{display:block;height:6px;border-radius:3px;background:#e3e6ee;overflow:hidden}
        .inicio-hero-mobile .inicio-mision-barra i{display:block;height:100%;border-radius:3px;background:#067647}
        .inicio-hero-mobile .inicio-mision-flecha{flex:none;color:#667085;font-size:.8rem}
        .inicio-hero-mobile .inicio-mision.cumplida{border-color:#ABEFC6;background:#F6FEF9}
        .inicio-hero-mobile .inicio-mision.cumplida .inicio-mision-icono{background:#DCFAE6;color:#067647}
        .inicio-hero-mobile .inicio-mision.cumplida .inicio-mision-rotulo{color:#067647}
        .inicio-hero-mobile .inicio-mision .mi-sello{width:48px;height:48px;border-width:3px}
        .inicio-hero-mobile .inicio-mision .mi-sello::after{left:5px;top:5px;right:5px;bottom:5px}
        .inicio-hero-mobile .inicio-mision .mi-sello svg{width:18px;height:18px}
        .inicio-hero-mobile .inicio-mision-sub{display:block;margin-top:2px;font-size:12.5px;line-height:17px;color:#475467}
        /* --- hoja --- */
        html.mi-bloqueado,html.mi-bloqueado body{overflow:hidden}
        #miOverlay,#miFiesta{position:fixed;left:0;top:0;right:0;bottom:0;z-index:100001;display:none;background:rgba(16,24,40,.58);align-items:flex-end;font-family:'Inter',system-ui,sans-serif;color:#101828}
        #miOverlay.on,#miFiesta.on{display:flex}
        #miFiesta{z-index:100002;align-items:center;justify-content:center;padding:16px}
        .mi-hoja{width:100%;max-height:calc(100vh - 54px);max-height:calc(100dvh - 54px);display:flex;flex-direction:column;border-radius:28px 28px 0 0;background:#fff;box-shadow:0 -10px 40px rgba(16,24,40,.25);transform:translateY(24px);opacity:0;transition:transform .22s ease,opacity .22s ease}
        #miOverlay.on .mi-hoja{transform:none;opacity:1}
        @media (prefers-reduced-motion:reduce){.mi-hoja{transition:none}}
        .mi-asa{flex:none;width:44px;height:5px;margin:10px auto 0;border-radius:3px;background:#D0D5DD}
        .mi-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 16px calc(28px + env(safe-area-inset-bottom,0px))}
        .mi-h1{margin:0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:26px;line-height:1.1;color:#0B2A63}
        .mi-h2{margin:0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:19px;line-height:1.15;color:#0B2A63}
        .mi-sub{margin:4px 0 0;font-size:13.5px;line-height:19px;color:#475467}
        .mi-fila-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
        .mi-cerrar{flex:none;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:#F2F4F7;display:flex;align-items:center;justify-content:center;color:#344054;cursor:pointer}
        .mi-aviso{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px 14px;border-radius:14px;background:#F9FAFB;border:1px solid #EAECF0;font-size:13px;line-height:18px;color:#344054}
        .mi-aviso svg{flex:none;margin-top:1px;color:#0B2A63}.mi-aviso b{color:#101828;font-weight:600}
        .mi-cercana{margin-top:18px;padding:16px;border-radius:22px;background:linear-gradient(155deg,#0B2A63 0%,#16397F 100%);color:#fff;display:flex;gap:14px;align-items:center;width:100%;border:0;font-family:inherit;text-align:left;cursor:pointer}
        .mi-cercana .e{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .mi-cercana .e span:first-child{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C7D7FE}
        .mi-cercana .e span+span{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.16);font-size:11px;font-weight:700}
        .mi-cercana h2{margin:0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:23px;line-height:1.1;color:#fff}
        .mi-cercana p{margin:5px 0 0;font-size:13.5px;line-height:19px;color:#E0E7FF}.mi-cercana p b{color:#fff}
        .mi-cercana .seg{display:flex;align-items:center;gap:6px;margin-top:12px}
        .mi-cercana .seg i{flex:1;height:8px;border-radius:99px;background:rgba(255,255,255,.28)}.mi-cercana .seg i.on{background:#fff}
        .mi-cercana .seg span{margin-left:6px;font-size:12px;font-weight:700;color:#fff;white-space:nowrap}
        .mi-chips{display:flex;gap:8px;margin:18px -16px 4px;padding:0 16px;overflow-x:auto;scrollbar-width:none}
        .mi-chips::-webkit-scrollbar{display:none}
        .mi-chip{flex:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:999px;border:1.5px solid #D0D5DD;background:#fff;font-family:inherit;font-size:13px;font-weight:600;color:#344054;white-space:nowrap;cursor:pointer}
        .mi-chip.on{background:#0B2A63;border-color:#0B2A63;color:#fff}
        .mi-cab{display:flex;align-items:center;justify-content:space-between;margin:26px 0 12px}
        .mi-cuenta{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:#F2F4F7;font-size:12px;font-weight:700;color:#475467}
        .mi-lista{display:flex;flex-direction:column;gap:10px}
        .mi-mis{display:flex;gap:14px;align-items:center;width:100%;padding:14px;border:1px solid #EAECF0;border-radius:20px;background:#fff;box-shadow:0 1px 2px rgba(16,24,40,.05);text-align:left;font-family:inherit;color:inherit}
        button.mi-mis{cursor:pointer}
        .mi-mis-c{flex:1;min-width:0}
        .mi-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:5px}
        .mi-tag{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:700;background:#F2F4F7;color:#475467}
        .mi-tag.pel{background:#FEF3F2;color:#B42318}.mi-tag.ser{background:#EFF4FF;color:#1C5BB8}.mi-tag.fut{background:#F9F5FF;color:#6941C6}
        .mi-mis h3{margin:0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:600;font-size:16px;line-height:1.2;color:#101828}
        .mi-mis p{margin:3px 0 0;font-size:13px;line-height:18px;color:#475467}
        .mi-barra{height:8px;margin-top:9px;border-radius:99px;background:#EAECF0;overflow:hidden}
        .mi-barra i{display:block;height:100%;border-radius:99px;background:var(--mi-c1)}
        .mi-prog{margin-top:5px;font-size:12px;font-weight:600;color:#475467}
        .mi-flecha{flex:none;color:#98A2B3}
        .mi-mis.bloq{background:#F9FAFB;box-shadow:none}
        .mi-mis.mist{background:#fff;border:1.5px dashed #98A2B3;box-shadow:none}
        .mi-vacio{margin:6px 0 0;padding:18px 16px;border-radius:18px;background:#F9FAFB;border:1px dashed #D0D5DD;text-align:center;font-size:13.5px;line-height:19px;color:#475467}
        .mi-fila-s{display:flex;gap:14px;overflow-x:auto;margin:0 -16px;padding:0 16px;scrollbar-width:none}.mi-fila-s::-webkit-scrollbar{display:none}
        .mi-s-it{display:flex;flex-direction:column;align-items:center;gap:6px;width:66px;flex:none;font-size:12px;line-height:14px;text-align:center;color:#344054}
        .mi-mas{display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#F2F4F7;font-size:13px;font-weight:700;color:#475467}
        .mi-cta{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;height:56px;margin-top:6px;border:0;border-radius:999px;background:#E50914;box-shadow:0 10px 24px rgba(229,9,20,.32);font-family:'Space Grotesk','Inter',sans-serif;font-size:16px;font-weight:600;color:#fff;cursor:pointer}
        .mi-nota{margin:10px 0 0;text-align:center;font-size:12.5px;line-height:17px;color:#475467}
        .mi-cargando{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 0;font-size:14px;color:#475467}
        .mi-cargando img{width:40px;height:40px;animation:miLatido 1.1s ease-in-out infinite}
        @keyframes miLatido{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        .mi-reintentar{height:44px;padding:0 20px;border:1.5px solid #D0D5DD;border-radius:999px;background:#fff;font-family:inherit;font-size:14px;font-weight:600;color:#0B2A63;cursor:pointer}
        /* detalle */
        .mi-barra-sup{display:flex;align-items:center;justify-content:space-between}
        .mi-volver{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 10px 0 0;border:0;background:none;font-family:inherit;font-size:14px;font-weight:600;color:#0B2A63;cursor:pointer}
        .mi-anillo{position:relative;width:156px;height:156px;margin:6px auto 0;border-radius:50%;background:conic-gradient(var(--mi-c1) 0 var(--mi-pct,0%),#EAECF0 var(--mi-pct,0%) 100%);display:flex;align-items:center;justify-content:center}
        .mi-anillo::before{content:"";position:absolute;left:8px;top:8px;right:8px;bottom:8px;border-radius:50%;background:#fff}
        .mi-det-c{text-align:center;margin-top:14px}
        .mi-det-c .t{display:flex;justify-content:center;gap:6px}
        .mi-det-c h1{margin:10px 0 0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:27px;line-height:1.1;color:#0B2A63}
        .mi-det-c p{margin:7px auto 0;max-width:310px;font-size:14.5px;line-height:21px;color:#475467}
        .mi-pasos{display:flex;gap:6px;margin-top:12px}.mi-pasos i{flex:1;height:10px;border-radius:99px;background:#EAECF0}.mi-pasos i.on{background:var(--mi-c1)}
        .mi-dato{display:flex;align-items:center;gap:12px;margin-top:18px;padding:12px 14px;border-radius:16px;background:#F9FAFB;border:1px solid #EAECF0;font-size:13.5px;line-height:19px;color:#344054}
        .mi-dato b{color:#101828;font-weight:600}
        .mi-sec{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;margin-top:6px;border:0;background:transparent;font-family:inherit;font-size:14px;font-weight:600;color:#475467;cursor:pointer}
        .mi-wrap{position:relative}
        .mi-x{position:absolute;top:4px;right:4px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:#667085;cursor:pointer;font-family:inherit}
        .mi-x i{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#F2F4F7}
        .mi-x svg{width:13px;height:13px}
        .mi-x:hover i,.mi-x:focus-visible i{background:#E4E7EC;color:#101828}
        .mi-x.osc{color:#fff}.mi-x.osc i{background:rgba(255,255,255,.2)}
        .mi-tag.nv{background:#FFF6E5;color:#93370D}
        .mi-tag.fam{background:#F2F4F7;color:var(--mi-c1,#475467)}
        .mi-quitar{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;margin-top:12px;border:1px solid #D0D5DD;border-radius:999px;background:#fff;font-family:inherit;font-size:14px;font-weight:600;color:#475467;cursor:pointer}
        .mi-quitar svg{width:16px;height:16px}
        .mi-enlace{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;margin-top:18px;border:0;background:transparent;font-family:inherit;font-size:13.5px;font-weight:600;color:#475467;text-decoration:underline;cursor:pointer}
        .mi-rec{flex:none;height:40px;padding:0 14px;border:1px solid #D0D5DD;border-radius:999px;background:#fff;font-family:inherit;font-size:13px;font-weight:600;color:#101828;cursor:pointer}
        #miConfirmar{position:fixed;left:0;top:0;right:0;bottom:0;z-index:100003;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(16,24,40,.58);font-family:'Inter',system-ui,sans-serif;color:#101828}
        #miConfirmar.on{display:flex}
        .mi-conf{width:100%;max-width:340px;padding:22px 20px 14px;border-radius:24px;background:#fff;box-shadow:0 24px 60px rgba(0,0,0,.35);text-align:center}
        .mi-conf h2{margin:0 0 8px;font-family:'Space Grotesk','Inter',sans-serif;font-size:19px;font-weight:700;line-height:1.2}
        .mi-conf p{margin:0 0 16px;font-size:14px;line-height:20px;color:#475467}
        .mi-conf button{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:0;border-radius:999px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer}
        .mi-conf .si{background:#0B2A63;color:#fff}.mi-conf .no{margin-top:4px;background:transparent;color:#475467}
        #miToast{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:100004;width:max-content;max-width:calc(100vw - 32px);display:flex;align-items:center;gap:10px;padding:11px 18px;border-radius:22px;background:#101828;color:#fff;font:600 13.5px/18px 'Inter',system-ui,sans-serif;box-shadow:0 10px 30px rgba(16,24,40,.35);opacity:0;transform:translate(-50%,12px);pointer-events:none;transition:opacity .2s,transform .2s}
        #miToast.on{opacity:1;transform:translate(-50%,0)}
        #miToast svg{flex:none;width:18px;height:18px;stroke:#47CD89}#miToast.err svg{stroke:#FDA29B}
        @media (prefers-reduced-motion:reduce){#miToast{transition:none}}
        .mi-fiesta .nv{display:inline-flex;align-items:center;height:26px;margin-top:10px;padding:0 12px;border-radius:999px;background:#FFF6E5;color:#93370D;font-size:12.5px;font-weight:700}
        /* celebración */
        .mi-fiesta{position:relative;width:100%;max-height:calc(100vh - 32px);overflow-y:auto;padding:26px 22px 20px;border-radius:30px;background:#fff;box-shadow:0 24px 60px rgba(0,0,0,.35);text-align:center;transform:scale(.94);opacity:0;transition:transform .25s ease,opacity .25s ease}
        #miFiesta.on .mi-fiesta{transform:none;opacity:1}
        .mi-fiesta .cf{position:absolute;display:block;border-radius:50%;pointer-events:none}.mi-fiesta .cf.r{border-radius:3px}
        .mi-fiesta .glow{border-radius:50%;box-shadow:0 0 0 12px rgba(18,183,106,.12),0 20px 44px -10px rgba(6,118,71,.55);display:inline-block}
        .mi-fiesta .e{position:relative;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#067647;margin-bottom:18px}
        .mi-fiesta h1{position:relative;margin:26px 0 0;font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:27px;line-height:1.1;color:#0B2A63}
        .mi-fiesta p{position:relative;margin:8px 0 0;font-size:14.5px;line-height:21px;color:#475467}
        .mi-fiesta .nota{display:flex;align-items:center;justify-content:center;gap:8px;margin:14px auto 0;max-width:300px;padding:9px 13px;border-radius:14px;background:#F9FAFB;border:1px solid #EAECF0;font-size:12.5px;line-height:17px;color:#344054;text-align:left}
        .mi-fiesta .sig{margin-top:18px;padding:12px 14px;border-radius:18px;border:1px solid #EAECF0;background:#fff;display:flex;align-items:center;gap:12px;text-align:left}
        .mi-fiesta .sig .k{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475467}
        .mi-fiesta .sig .n{margin-top:2px;font-family:'Space Grotesk','Inter',sans-serif;font-weight:600;font-size:16px;color:#101828}
        .mi-fiesta .sig .d{font-size:12.5px;line-height:17px;color:#475467}`;
        document.head.appendChild(st);
    }

    // ------------------------------------------------------------------------------------------------ Tarjeta del feed
    function pintarTarjeta() {
        const el = $('inicioMision');
        if (!el) return;
        const r = E.resumen;
        const d = r && r.destacada;
        const pendiente = r && r.cumplidasSinVer && r.cumplidasSinVer[0];
        const ocultar = () => { el.hidden = true; el.style.display = 'none'; };
        if (!esMobile() || (!d && !pendiente)) { ocultar(); return; }
        el.hidden = false; el.style.display = '';
        if (pendiente && !E.vistas[pendiente.id]) {
            const sg = pendiente.sello || {}, niv = pendiente.nivel > 1;      // al subir de nivel dice «Subiste de nivel», no «Misión cumplida»
            el.className = 'inicio-mision cumplida';
            el.setAttribute('aria-label', `${niv ? 'Subiste de nivel' : 'Misión cumplida'}: ${niv ? `tu sello ${sg.nombre || ''} ahora es Nv ${pendiente.nivel}` : `ganaste el sello ${sg.nombre || ''}`}. Ver mis misiones`);
            el.innerHTML = `<span class="inicio-mision-icono"><i class="fas fa-check" aria-hidden="true"></i></span>
                <span class="inicio-mision-texto"><span><span class="inicio-mision-rotulo">${niv ? '¡Subiste de nivel!' : '¡Misión cumplida!'}</span><span class="inicio-mision-titulo">${niv ? `«${esc(sg.nombre || pendiente.titulo)}» ahora es Nv ${pendiente.nivel}` : `Ganaste «${esc(sg.nombre || pendiente.titulo)}»`}</span></span>${pendiente.siguiente ? `<span class="inicio-mision-sub">Tu próxima misión: <b>${esc(pendiente.siguiente.titulo)}</b></span>` : ''}</span>
                ${sello(sg.categoria, '', 'm', sg.imagenUrl)}<i class="fas fa-chevron-right inicio-mision-flecha" aria-hidden="true"></i>`;
            return;
        }
        if (!d) { ocultar(); return; }
        const rot = (d.vigencia === 'HOY' ? 'Misión de hoy' : d.vigencia === 'SEMANA' ? 'Misión de la semana' : 'Misión') + (d.escalera && d.nivel ? ` · Nv ${d.nivel}` : '');
        const avance = d.meta && d.meta <= 6
            ? `<span class="inicio-mision-avance">${Array.from({ length: d.meta }, (_, i) => `<span class="${i < (d.progreso || 0) ? 'hecho' : ''}"></span>`).join('')}</span>`
            : `<span class="inicio-mision-barra"><i style="width:${pct(d)}%"></i></span>`;
        el.className = 'inicio-mision';
        el.setAttribute('aria-label', `${rot}: ${d.titulo}, ${d.progreso || 0} de ${d.meta}. Ver mis misiones`);
        el.innerHTML = `<span class="inicio-mision-icono"><i class="fas fa-bolt" aria-hidden="true"></i></span>
            <span class="inicio-mision-texto"><span><span class="inicio-mision-rotulo">${rot}</span><span class="inicio-mision-titulo">${esc(d.titulo)}</span></span>${avance}</span>
            <span class="inicio-mision-conteo">${d.progreso || 0} de ${d.meta}</span>
            ${sello((d.sello || {}).categoria || d.categoria, 'apag', 'm', (d.sello || {}).imagenUrl)}<i class="fas fa-chevron-right inicio-mision-flecha" aria-hidden="true"></i>`;
    }

    function enganchar(el) {
        el._misionesListo = true;
        el.addEventListener('click', () => { if (E.resumen && E.resumen.cumplidasSinVer && E.resumen.cumplidasSinVer[0] && !E.vistas[E.resumen.cumplidasSinVer[0].id]) mostrarFiesta(E.resumen.cumplidasSinVer[0], el); else abrir(el); });
        pintarTarjeta();
        if (Date.now() - E.ultimoResumen > 20000) cargarResumen(false);
    }

    // ------------------------------------------------------------------------------------------------ Pedidos
    async function cargarResumen(detectar) {
        if (!esMobile() || !localStorage.getItem('token')) return;
        E.ultimoResumen = Date.now();
        try {
            const res = await fetch(`${api()}/missions/me/resumen`, cab());
            if (!res.ok) throw new Error();
            const nuevo = await res.json();
            const antes = E.resumen;
            E.resumen = nuevo;
            pintarTarjeta();
            mostrarAvisos(nuevo.avisos, detectar);
            const sinVer = (nuevo.cumplidasSinVer || []).filter((c) => !E.vistas[c.id]);
            // Cumplida durante esta sesión (no la que ya estaba pendiente al abrir la app): se celebra en el momento.
            if (detectar && sinVer.length && !(antes && (antes.cumplidasSinVer || []).some((c) => c.id === sinVer[0].id))) mostrarFiesta(sinVer[0], null);
            if (E.abierto && E.vista === 'lista') cargarCompleto(true);
        } catch (e) { /* sin servicio de misiones todavía: la tarjeta queda oculta */ pintarTarjeta(); }
    }

    async function cargarCompleto(silencioso) {
        if (!silencioso) { E.cargando = !E.completo; E.error = false; pintarHoja(); }
        try {
            const res = await fetch(`${api()}/missions/me`, cab());
            if (!res.ok) throw new Error();
            E.completo = await res.json(); E.error = false;
        } catch (e) { if (!E.completo) E.error = true; }
        E.cargando = false;
        if (E.abierto) pintarHoja();
    }

    // ------------------------------------------------------------------------------------------------ Quitar misiones, avisos y cartelitos
    const ATRAS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    const TILDE = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    const ALERTA = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';

    // La ✕ de una misión rotativa (saga, actor/actriz, director, género). Va AL LADO de la tarjeta y no adentro: la tarjeta es un botón.
    function xBoton(m, osc) {
        return `<button type="button" class="mi-x${osc ? ' osc' : ''}" data-mi="descartar" data-id="${m.id}" aria-label="Quitar la misión ${esc(m.titulo)}"><i>${X}</i></button>`;
    }
    const conX = (html, m, osc) => m.descartable ? `<div class="mi-wrap">${html}${xBoton(m, osc)}</div>` : html;

    let tToast = null;
    function toast(texto, ms, error) {
        let t = $('miToast');
        if (!t) { t = document.createElement('div'); t.id = 'miToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
        t.className = error ? 'err' : '';
        t.innerHTML = `${error ? ALERTA : TILDE}<span>${esc(texto)}</span>`;
        void t.offsetWidth;                                   // para que la animación arranque aunque ya hubiera un cartelito
        t.classList.add('on');
        clearTimeout(tToast);
        tToast = setTimeout(() => t.classList.remove('on'), ms || 3200);
    }

    // «Cumplida hoy»: un cartelito liviano, no una pantalla. Solo se muestra si pasó recién (después de una acción del usuario en esta sesión);
    // los que llegan al abrir la app son de otro momento y solo se limpian (se marcan como vistos).
    function mostrarAvisos(avisos, detectar) {
        const nuevos = (avisos || []).filter((a) => !E.avisosVistos[a.id]);
        nuevos.forEach((a) => {
            E.avisosVistos[a.id] = true;
            fetch(`${api()}/missions/me/cumplidas/${a.id}/visto`, { method: 'POST', headers: cab().headers }).catch(() => {});
        });
        if (!detectar || !nuevos.length) return;
        const a = nuevos[0], sem = /semana/i.test(a.texto || '');
        const veces = a.veces ? ` · ${a.veces} ${sem ? (a.veces === 1 ? 'semana cumplida' : 'semanas cumplidas') : (a.veces === 1 ? 'día cumplido' : 'días cumplidos')}` : '';
        toast(nuevos.length > 1 ? `${a.texto}: ${a.titulo} y ${nuevos.length - 1} más` : `${a.texto}: ${a.titulo}${veces}`, 3600);
    }

    async function cargarDescartadas() {
        if (!esMobile() || !localStorage.getItem('token')) return;
        try {
            const res = await fetch(`${api()}/missions/me/descartadas`, cab());
            if (!res.ok) throw new Error();
            E.descartadas = await res.json();
        } catch (e) { if (!E.descartadas) E.descartadas = []; }
        if (E.abierto && (E.vista === 'lista' || E.vista === 'descartadas')) pintarHoja();
    }

    function pedirConfirmacion(id) {
        const m = buscar(id);
        if (!m) return;
        E.confirmar = { id: m.id, titulo: m.titulo };
        let c = $('miConfirmar');
        if (!c) { c = document.createElement('div'); c.id = 'miConfirmar'; document.body.appendChild(c); c.addEventListener('click', (e) => { if (e.target === c) cerrarConfirmacion(); }); }
        c.innerHTML = `<div class="mi-conf" role="alertdialog" aria-modal="true" aria-labelledby="miConfTit" aria-describedby="miConfTxt"><h2 id="miConfTit">¿Quitar «${esc(m.titulo)}»?</h2><p id="miConfTxt">No te la vamos a mostrar más y pasamos a la siguiente. Si cambiás de opinión, la recuperás desde «Misiones que quitaste».</p><button type="button" class="si" data-mi="confirmar-si">Sí, quitarla</button><button type="button" class="no" data-mi="confirmar-no">Cancelar</button></div>`;
        c.classList.add('on');
        requestAnimationFrame(() => { const n = c.querySelector('.no'); if (n) n.focus(); });      // el foco arranca en «Cancelar»: lo seguro
    }

    function cerrarConfirmacion() {
        const c = $('miConfirmar');
        if (!c || !c.classList.contains('on')) return;
        c.classList.remove('on');
        E.confirmar = null;
        const d = E.disparadorConf; E.disparadorConf = null;
        if (d && document.contains(d) && d.focus) { try { d.focus(); } catch (e) {} }
    }

    async function descartar(id, titulo) {
        cerrarConfirmacion();
        try {
            const res = await fetch(`${api()}/missions/me/${id}/descartar`, { method: 'POST', headers: cab().headers });
            if (!res.ok) throw new Error();
            toast(`Quitaste «${titulo}». Pasamos a la siguiente.`, 3800);
            if (E.vista === 'detalle') E.vista = 'lista';
            pintarHoja();
            cargarDescartadas();
            cargarResumen(false);                              // refresca la tarjeta del feed y la lista (ahora con la que sigue)
        } catch (e) { toast('No pudimos quitar la misión. Probá de nuevo.', 3800, true); }
    }

    async function restaurar(id, nombre) {
        try {
            const res = await fetch(`${api()}/missions/me/${id}/restaurar`, { method: 'POST', headers: cab().headers });
            if (!res.ok) throw new Error();
            toast(`Listo: «${nombre}» volvió a tus misiones.`, 3800);
            await cargarDescartadas();
            if (!(E.descartadas || []).length) E.vista = 'lista';
            pintarHoja();
            cargarResumen(false);
            if (E.vista !== 'lista') cargarCompleto(true);     // todavía hay otras para recuperar: la lista de atrás se vuelve a pedir igual, la recuperada ya es la actual
        } catch (e) { toast('No pudimos recuperar la misión. Probá de nuevo.', 3800, true); }
    }

    // ------------------------------------------------------------------------------------------------ La hoja
    function crearHoja() {
        let o = $('miOverlay');
        if (o) return o;
        o = document.createElement('div');
        o.id = 'miOverlay';
        o.innerHTML = '<div class="mi-hoja" role="dialog" aria-modal="true" aria-labelledby="miTitulo" tabindex="-1"><div class="mi-asa"></div><div class="mi-scroll" id="miScroll"></div></div>';
        o.addEventListener('click', (e) => { if (e.target === o) cerrar(); });
        document.body.appendChild(o);
        return o;
    }

    function abrir(disparador) {
        if (!esMobile()) return;
        inyectarEstilos();
        const o = crearHoja();
        E.disparador = disparador || document.activeElement;
        E.abierto = true; E.vista = 'lista'; E.filtro = 'todas'; E.detalleId = null;
        document.documentElement.classList.add('mi-bloqueado');
        o.classList.add('on');
        pintarHoja();
        cargarCompleto(!!E.completo);
        cargarDescartadas();
        requestAnimationFrame(() => { const c = o.querySelector('.mi-cerrar'); if (c) c.focus(); });
    }

    function cerrar() {
        const o = $('miOverlay');
        if (!o) return;
        o.classList.remove('on');
        E.abierto = false;
        document.documentElement.classList.remove('mi-bloqueado');
        if (E.disparador && E.disparador.focus) { try { E.disparador.focus(); } catch (e) {} }
    }

    const X = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    const CHEV = '<svg class="mi-flecha" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    const TROFEO = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC._}</svg>`;

    // Cada redibujado (llega la lista, se filtra, se vuelve del detalle) reemplaza el HTML: si el foco estaba adentro, se lo devuelve al
    // mismo control (o al botón de cerrar), para que el teclado y los lectores de pantalla no pierdan el lugar.
    function pintarHoja() {
        const cont = $('miScroll');
        if (!cont) return;
        const a = document.activeElement, tenia = !!(a && cont.contains(a));
        const clave = tenia ? { mi: a.dataset.mi, f: a.dataset.f, id: a.dataset.id } : null;
        dibujarHoja(cont);
        if (tenia && !cont.contains(document.activeElement)) {
            let nuevo = null;
            if (clave && clave.mi) nuevo = cont.querySelector(`[data-mi="${clave.mi}"]${clave.f ? `[data-f="${clave.f}"]` : ''}${clave.id ? `[data-id="${clave.id}"]` : ''}`);
            (nuevo || cont.querySelector('.mi-cerrar') || cont.querySelector('.mi-volver')).focus();
        }
    }

    function dibujarHoja(cont) {
        if (E.vista === 'detalle') { pintarDetalle(cont); return; }
        if (E.vista === 'descartadas') { pintarDescartadas(cont); return; }
        const C = E.completo;
        let html = `<div class="mi-fila-cab"><div><h1 class="mi-h1" id="miTitulo">Tus misiones</h1><p class="mi-sub">Cumplí misiones para ganar sellos. Siempre hay una nueva esperándote.</p></div><button class="mi-cerrar" type="button" aria-label="Cerrar" data-mi="cerrar">${X}</button></div>
            <div class="mi-aviso"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span><b>Las misiones no suman puntos,</b> pero te acercan a premios, sorteos y sorpresas exclusivas, asi que mantén tu colección lo más completa posible.</span></div>`;
        if (!C) {
            html += E.error
                ? `<div class="mi-cargando"><span>No pudimos cargar tus misiones.</span><button type="button" class="mi-reintentar" data-mi="reintentar">Reintentar</button></div>`
                : `<div class="mi-cargando" role="status"><img src="assets/images/icon-512.png" alt=""><span>Cargando tus misiones...</span></div>`;
            cont.innerHTML = html; return;
        }
        const d = C.destacada;
        if (d) {
            const seg = d.meta && d.meta <= 6 ? Array.from({ length: d.meta }, (_, i) => `<i class="${i < (d.progreso || 0) ? 'on' : ''}"></i>`).join('') : `<i class="on" style="flex:${Math.max(pct(d), 1)}"></i><i style="flex:${Math.max(100 - pct(d), 1)}"></i>`;
            html += conX(`<button type="button" class="mi-cercana mi-c-${cat((d.sello || {}).categoria || d.categoria)}" data-mi="detalle" data-id="${d.id}" aria-label="La más cercana: ${esc(d.titulo)}, ${d.progreso || 0} de ${d.meta}. Ver detalle">
                <span style="flex:1;min-width:0"><span class="e"><span>La más cercana</span><span>${d.familia ? (ETQ_FAMILIA[d.familia] || '') : (ETQ_VIGENCIA[d.vigencia] || '')}</span>${d.escalera && d.nivel ? `<span>Nv ${d.nivel}</span>` : ''}</span>
                <h2>${esc(d.titulo)}</h2>
                <p>Te ${faltan(d) === 1 ? 'falta' : 'faltan'} <b>${unidadTxt(d, faltan(d))}</b> para ganar el sello «${esc((d.sello || {}).nombre || '')}».</p>
                <span class="seg">${seg}<span>${d.progreso || 0} de ${d.meta}</span></span></span>
                ${sello((d.sello || {}).categoria || d.categoria, 'apag', 'g', (d.sello || {}).imagenUrl)}</button>`, d, true);
        }
        const filtros = [['todas', 'Todas'], ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['perm', 'Permanentes']];
        html += `<div class="mi-chips" role="group" aria-label="Filtrar misiones">${filtros.map(([k, n]) => `<button type="button" class="mi-chip${E.filtro === k ? ' on' : ''}" data-mi="filtro" data-f="${k}" aria-pressed="${E.filtro === k}">${n}</button>`).join('')}</div>`;
        const pasa = (m) => E.filtro === 'todas' || (E.filtro === 'hoy' && m.vigencia === 'HOY') || (E.filtro === 'semana' && m.vigencia === 'SEMANA') || (E.filtro === 'perm' && (m.vigencia === 'PERMANENTE' || m.vigencia === 'RACHA'));
        const enCurso = (C.enCurso || []).filter((m) => !(d && m.id === d.id)).filter(pasa);
        html += `<div class="mi-cab"><h2 class="mi-h2">En curso</h2><span class="mi-cuenta">${enCurso.length}</span></div>`;
        html += enCurso.length ? `<div class="mi-lista">${enCurso.map(tarjetaMision).join('')}</div>` : `<p class="mi-vacio">${E.filtro === 'todas' ? 'No tenés otras misiones en curso por ahora.' : 'No hay misiones de esta categoría en curso por ahora.'}</p>`;
        const prox = E.filtro === 'todas' ? (C.proximas || []) : [];
        if (prox.length) html += `<div class="mi-cab"><h2 class="mi-h2">Próximas</h2><span class="mi-cuenta">${prox.length}</span></div><div class="mi-lista">${prox.map(tarjetaProxima).join('')}</div>`;
        const S = C.sellos || { total: 0, recientes: [], porDescubrir: 0 };
        html += `<div class="mi-cab"><h2 class="mi-h2">Tus sellos</h2><span class="mi-cuenta">${S.total || 0} ${S.total === 1 ? 'ganado' : 'ganados'}</span></div>`;
        if ((S.recientes || []).length) {
            const extra = Math.max(0, (S.total || 0) - S.recientes.length);
            html += `<div class="mi-fila-s">${S.recientes.slice(0, 6).map((s) => `<div class="mi-s-it">${sello(s.categoria, '', 'm', s.imagenUrl)}${esc(s.nombre)}</div>`).join('')}${extra ? `<div class="mi-s-it"><span class="mi-mas">+${extra}</span></div>` : ''}</div>`;
        } else html += '<p class="mi-vacio">Tus sellos van a aparecer acá cuando cumplas tu primera misión.</p>';
        if (S.porDescubrir > 0) html += `<p style="margin:16px 0 10px;font-size:13px;font-weight:600;color:#344054">Sellos por descubrir</p><div class="mi-fila-s">${Array.from({ length: Math.min(S.porDescubrir, 5) }, () => `<div class="mi-s-it">${sello('', 'mist', 'm')}???</div>`).join('')}</div>`;
        html += `<div style="margin-top:28px"><button type="button" class="mi-cta" data-mi="logros">${TROFEO}Ver todos mis logros</button></div>`;
        if ((E.descartadas || []).length) html += `<button type="button" class="mi-enlace" data-mi="descartadas">Misiones que quitaste (${E.descartadas.length})</button>`;
        const antes = cont.scrollTop; cont.innerHTML = html; cont.scrollTop = antes;
    }

    function tarjetaMision(m) {
        const c = cat((m.sello || {}).categoria || m.categoria);
        return conX(`<button type="button" class="mi-mis mi-c-${c}" data-mi="detalle" data-id="${m.id}" aria-label="${esc(m.titulo)}, ${m.progreso || 0} de ${m.meta}. Ver detalle">${sello((m.sello || {}).categoria || m.categoria, 'apag', 'm', (m.sello || {}).imagenUrl)}
            <span class="mi-mis-c"><span class="mi-meta">${tagVig(m)}${tagNivel(m)}${tagTipo(m)}</span><h3>${esc(m.titulo)}</h3><p>${esc(m.descripcion || '')}</p>
            <span class="mi-barra" style="display:block"><i style="width:${pct(m)}%"></i></span><span class="mi-prog" style="display:block">${m.progreso || 0} de ${m.meta}${m.unidad === 'días' ? ' días' : ''}</span></span>${CHEV}</button>`, m);
    }

    function tarjetaProxima(m) {
        const mist = m.estado === 'MISTERIOSA', prog = m.estado === 'PROGRAMADA';
        const tag = mist ? '<span class="mi-tag fut">Misteriosa</span>' : prog ? `<span class="mi-tag fut">${m.vigencia === 'EVENTO' ? 'Especial' : 'Próximamente'}</span>` : m.estado === 'SIGUIENTE' ? '<span class="mi-tag fut">Tu próxima</span>' : `<span class="mi-tag">Bloqueada</span>`;
        let texto = esc(m.descripcion || '');
        if (m.estado === 'BLOQUEADA' || m.estado === 'SIGUIENTE') texto = esc(m.desbloqueo || m.descripcion || '');
        if (prog && m.comienza) texto = `Empieza el ${esc(fechaLarga(m.comienza))}.`;
        if (mist) texto = m.misterio && m.misterio.sellosNecesarios ? `Se revela cuando tengas ${m.misterio.sellosNecesarios} sellos. Te ${m.misterio.sellosNecesarios - m.misterio.sellosActuales === 1 ? 'falta 1' : 'faltan ' + (m.misterio.sellosNecesarios - m.misterio.sellosActuales)}.` : 'Todavía no sabés de qué se trata. Pronto lo vas a descubrir.';
        const barra = mist && m.misterio && m.misterio.sellosNecesarios ? `<span class="mi-barra mi-c-trivia" style="display:block;--mi-c1:#6941C6"><i style="width:${Math.min(100, Math.round(m.misterio.sellosActuales * 100 / m.misterio.sellosNecesarios))}%"></i></span><span class="mi-prog" style="display:block">${m.misterio.sellosActuales} de ${m.misterio.sellosNecesarios} sellos</span>` : '';
        const sel = mist ? sello('', 'mist', 'm') : m.estado === 'BLOQUEADA' ? sello('', 'bloq', 'm') : sello((m.sello || {}).categoria || m.categoria, '', 'm', (m.sello || {}).imagenUrl);
        return conX(`<div class="mi-mis ${mist ? 'mist' : 'bloq'} mi-c-${cat((m.sello || {}).categoria || m.categoria)}">${sel}<div class="mi-mis-c"><div class="mi-meta">${tag}${m.familia ? tagVig(m) : ''}${tagTipo(m)}</div><h3>${mist ? 'Misión sorpresa' : esc(m.titulo)}</h3><p>${texto}</p>${barra}</div></div>`, m);
    }

    // ------------------------------------------------------------------------------------------------ Detalle
    function buscar(id) {
        const C = E.completo; if (!C) return null;
        return [C.destacada].concat(C.enCurso || [], C.proximas || []).find((m) => m && String(m.id) === String(id)) || null;
    }

    function pintarDetalle(cont) {
        const m = buscar(E.detalleId);
        if (!m) { E.vista = 'lista'; pintarHoja(); return; }
        const sg = m.sello || {}, c = cat(sg.categoria || m.categoria), p = pct(m);
        const pasos = m.meta && m.meta <= 12 ? `<div class="mi-pasos" aria-hidden="true">${Array.from({ length: m.meta }, (_, i) => `<i class="${i < (m.progreso || 0) ? 'on' : ''}"></i>`).join('')}</div>` : `<div class="mi-barra" aria-hidden="true"><i style="width:${p}%"></i></div>`;
        const nombreSello = esc(sg.nombre || m.titulo);
        const datoTxt = m.escalera
            ? (m.veces != null
                ? `<b>Se repite ${m.vigencia === 'SEMANA' ? 'cada semana' : 'cada día'}.</b> La llevás cumplida ${m.veces} ${m.veces === 1 ? 'vez' : 'veces'}; a las ${m.metaVeces} subís el sello «${nombreSello}» a Nv ${m.nivel}.`
                : `<b>Subís el sello «${nombreSello}» a Nv ${m.nivel}.</b> No suma puntos: es parte de tu colección.`)
            : `<b>Ganás el sello «${nombreSello}».</b> No suma puntos: es parte de tu colección.`;
        cont.innerHTML = `<div class="mi-barra-sup"><button type="button" class="mi-volver" data-mi="volver"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>Tus misiones</button><button class="mi-cerrar" type="button" aria-label="Cerrar" data-mi="cerrar">${X}</button></div>
            ${/^https:\/\//.test(sg.fondoUrl || '') ? `<div class="mi-det-fondo" aria-hidden="true"><img src="${esc(sg.fondoUrl)}" alt="" decoding="async"></div>` : ''}
            <div class="mi-c-${c}"><div class="mi-anillo" style="--mi-pct:${p}%" role="img" aria-label="Progreso: ${m.progreso || 0} de ${m.meta}">${sello(sg.categoria || m.categoria, 'apag', 'xg', sg.imagenUrl)}</div>
            <div class="mi-det-c"><div class="t">${tagVig(m)}${tagNivel(m)}${tagTipo(m)}</div><h1 id="miTitulo">${esc(m.titulo)}</h1><p>${esc(m.descripcion || '')}</p></div>
            <div style="margin-top:18px"><div style="display:flex;align-items:baseline;justify-content:space-between"><span style="font-family:'Space Grotesk','Inter',sans-serif;font-weight:700;font-size:22px;color:#101828">${m.progreso || 0} de ${m.meta}</span><span style="font-size:13px;font-weight:600;color:#475467">Te ${faltan(m) === 1 ? 'falta' : 'faltan'} ${faltan(m)}</span></div>${pasos}</div>
            <div class="mi-dato">${sello(sg.categoria || m.categoria, 'apag', 'p', sg.imagenUrl)}<span>${datoTxt}</span></div></div>
            ${m.accion && m.accion.texto ? `<button type="button" class="mi-cta" style="margin-top:20px" data-mi="accion" data-destino="${esc(m.accion.destino || '')}">${esc(m.accion.texto)}</button>` : ''}
            ${m.descartable ? `<p class="mi-nota">Esta misión es solo para vos. Si no es lo tuyo, podés quitarla y pasamos a la siguiente.</p><button type="button" class="mi-quitar" data-mi="descartar" data-id="${m.id}">${X}Quitar esta misión</button>` : ''}
            <button type="button" class="mi-sec" data-mi="volver">Volver a mis misiones</button>`;
        cont.scrollTop = 0;
        const v = cont.querySelector('.mi-volver'); if (v) v.focus();
    }

    // ------------------------------------------------------------------------------------------------ Misiones que quitaste
    function pintarDescartadas(cont) {
        const lista = E.descartadas || [];
        const item = (x) => {
            const c = CAT_FAMILIA[x.familia] || '_';
            return `<div class="mi-mis mi-c-${c}">${sello(c, 'apag', 'm')}<div class="mi-mis-c"><div class="mi-meta"><span class="mi-tag fam">${ETQ_FAMILIA[x.familia] || ''}</span></div><h3>${esc(x.nombre)}</h3></div><button type="button" class="mi-rec" data-mi="recuperar" data-id="${x.id}" data-nombre="${esc(x.nombre)}" aria-label="Recuperar ${esc(x.nombre)}">Recuperar</button></div>`;
        };
        cont.innerHTML = `<div class="mi-barra-sup"><button type="button" class="mi-volver" data-mi="volver-lista">${ATRAS}Tus misiones</button><button class="mi-cerrar" type="button" aria-label="Cerrar" data-mi="cerrar">${X}</button></div>
            <h1 class="mi-h1" id="miTitulo" style="margin-top:6px">Misiones que quitaste</h1>
            <p class="mi-sub">No te aparecen más. Si cambiás de opinión, recuperalas: vuelven a ser tu misión actual.</p>
            ${lista.length ? `<div class="mi-lista" style="margin-top:16px">${lista.map(item).join('')}</div>` : '<p class="mi-vacio" style="margin-top:16px">No quitaste ninguna misión.</p>'}
            <button type="button" class="mi-sec" data-mi="volver-lista">Volver a mis misiones</button>`;
    }


    // ------------------------------------------------------------------------------------------------ Celebración
    function mostrarFiesta(c, disparador) {
        if (!esMobile() || !c || E.vistas[c.id]) return;
        inyectarEstilos();
        let f = $('miFiesta');
        if (!f) { f = document.createElement('div'); f.id = 'miFiesta'; document.body.appendChild(f); f.addEventListener('click', (e) => { if (e.target === f) cerrarFiesta(); }); }
        E.fiesta = c; E.disparadorFiesta = disparador || document.activeElement;
        const sg = c.sello || {}, sig = c.siguiente, niv = c.nivel > 1;
        const cf = [['left:24px;top:44px;width:10px;height:10px;background:#12B76A', ''], ['left:62px;top:96px;width:12px;height:6px;background:#F79009;transform:rotate(30deg)', 'r'], ['left:34px;top:156px;width:8px;height:8px;background:#DD2590', ''], ['left:84px;top:30px;width:12px;height:6px;background:#6172F3;transform:rotate(-25deg)', 'r'], ['right:30px;top:46px;width:10px;height:10px;background:#F79009', ''], ['right:64px;top:108px;width:12px;height:6px;background:#12B76A;transform:rotate(40deg)', 'r'], ['right:36px;top:168px;width:8px;height:8px;background:#6172F3', ''], ['right:92px;top:34px;width:12px;height:6px;background:#DD2590;transform:rotate(-35deg)', 'r']];
        f.innerHTML = `<div class="mi-fiesta" role="dialog" aria-modal="true" aria-labelledby="miFiestaTit" tabindex="-1">${cf.map(([s, k]) => `<span class="cf ${k}" style="${s}"></span>`).join('')}
            <div class="e">${niv ? '¡Subiste de nivel!' : '¡Misión cumplida!'}</div>
            <div class="mi-c-${cat(sg.categoria)}"><span class="glow">${sello(sg.categoria, '', 'xxg', sg.imagenUrl)}</span>${niv ? `<div class="nv">Nivel ${c.nivel}</div>` : ''}</div>
            <h1 id="miFiestaTit">${niv ? `Tu sello «${esc(sg.nombre || c.titulo)}»<br>ahora es Nv ${c.nivel}` : `Ganaste el sello<br>«${esc(sg.nombre || c.titulo)}»`}</h1>
            ${c.descripcion ? `<p>${esc(c.descripcion)}</p>` : ''}
            <div class="nota"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B2A63" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Los sellos no suman puntos pero te acercan a premios, sorteos y sorpresas exclusivas.</span></div>
            ${sig ? `<div class="sig mi-c-${cat((sig.sello || {}).categoria || sig.categoria)}">${sello((sig.sello || {}).categoria || sig.categoria, 'apag', 'p', (sig.sello || {}).imagenUrl)}<div style="flex:1;min-width:0"><div class="k">Tu siguiente misión</div><div class="n">${esc(sig.titulo)}</div><div class="d">${esc(sig.descripcion || '')}${sig.meta ? ` · ${sig.progreso || 0} de ${sig.meta}` : ''}</div></div></div>` : ''}
            <button type="button" class="mi-cta" style="margin-top:18px" data-mi="fiesta-logros">${TROFEO}Ver en Mis logros</button>
            <button type="button" class="mi-sec" data-mi="fiesta-seguir">Seguir</button></div>`;
        document.documentElement.classList.add('mi-bloqueado');
        f.classList.add('on');
        requestAnimationFrame(() => { const b = f.querySelector('.mi-cta'); if (b) b.focus(); });
    }

    function cerrarFiesta() {
        const f = $('miFiesta'), c = E.fiesta;
        if (!f || !f.classList.contains('on')) return;
        f.classList.remove('on');
        if (!E.abierto) document.documentElement.classList.remove('mi-bloqueado');
        if (c) {
            E.vistas[c.id] = true;                               // no se vuelve a celebrar
            fetch(`${api()}/missions/me/cumplidas/${c.id}/visto`, { method: 'POST', headers: cab().headers }).catch(() => {});
            if (E.resumen) E.resumen.cumplidasSinVer = (E.resumen.cumplidasSinVer || []).filter((x) => x.id !== c.id);
            // La tarjeta pasa a mostrar la siguiente misión.
            if (c.siguiente && E.resumen) E.resumen.destacada = c.siguiente;
            pintarTarjeta();
        }
        E.fiesta = null;
        if (E.disparadorFiesta && E.disparadorFiesta.focus) { try { E.disparadorFiesta.focus(); } catch (e) {} }
    }

    // ------------------------------------------------------------------------------------------------ Ir a Mi Sala › Mis logros
    function irALogros() {
        cerrar(); cerrarFiesta();
        const miId = localStorage.getItem('userId');
        if ($('salaLogros') && typeof window._salaIr === 'function') { window._salaIr('salaLogros'); return; }
        try { sessionStorage.setItem('salaIrA', 'salaLogros'); } catch (e) {}
        window.location.hash = miId ? `#perfil/${miId}` : '#perfil';
    }

    // ------------------------------------------------------------------------------------------------ Eventos
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-mi]');
        if (!b) return;
        const acc = b.dataset.mi;
        if (acc === 'cerrar') cerrar();
        else if (acc === 'reintentar') cargarCompleto(false);
        else if (acc === 'detalle') { E.vista = 'detalle'; E.detalleId = b.dataset.id; pintarHoja(); }
        else if (acc === 'volver') { E.vista = 'lista'; pintarHoja(); const c = $('miScroll'); const x = c && c.querySelector(`[data-id="${E.detalleId}"]`); if (x) x.focus(); }
        else if (acc === 'filtro') { E.filtro = b.dataset.f; pintarHoja(); const c = $('miScroll'); const x = c && c.querySelector(`[data-f="${E.filtro}"]`); if (x) x.focus(); }
        else if (acc === 'logros' || acc === 'fiesta-logros') irALogros();
        else if (acc === 'fiesta-seguir') cerrarFiesta();
        else if (acc === 'descartar') { E.disparadorConf = b; pedirConfirmacion(b.dataset.id); }
        else if (acc === 'confirmar-si') { if (E.confirmar) descartar(E.confirmar.id, E.confirmar.titulo); }
        else if (acc === 'confirmar-no') cerrarConfirmacion();
        else if (acc === 'descartadas') { E.vista = 'descartadas'; pintarHoja(); const c = $('miScroll'); if (c) { c.scrollTop = 0; const v = c.querySelector('.mi-volver'); if (v) v.focus(); } cargarDescartadas(); }
        else if (acc === 'volver-lista') { E.vista = 'lista'; pintarHoja(); const c = $('miScroll'); const x = c && c.querySelector('[data-mi="descartadas"]'); if (x) x.focus(); }
        else if (acc === 'recuperar') restaurar(b.dataset.id, b.dataset.nombre);
        else if (acc === 'accion') { const d = b.dataset.destino; cerrar(); if (d) window.location.hash = d.charAt(0) === '#' ? d : '#' + d; }
    });

    document.addEventListener('keydown', (e) => {
        const conf = $('miConfirmar') && $('miConfirmar').classList.contains('on');
        const fiesta = $('miFiesta') && $('miFiesta').classList.contains('on');
        if (!E.abierto && !fiesta && !conf) return;
        if (e.key === 'Escape') { if (conf) cerrarConfirmacion(); else if (fiesta) cerrarFiesta(); else cerrar(); return; }
        if (e.key !== 'Tab') return;
        const raiz = conf ? $('miConfirmar') : fiesta ? $('miFiesta') : $('miOverlay');
        const foc = Array.from(raiz.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
        if (!foc.length) return;
        const a = document.activeElement, i = foc.indexOf(a);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); foc[foc.length - 1].focus(); }
        else if (!e.shiftKey && (i === foc.length - 1 || i === -1)) { e.preventDefault(); foc[0].focus(); }
    });

    // Tras cualquier acción del usuario que escriba (votar, comentar, trivia, publicar) se revisa si una misión avanzó o se cumplió.
    let refresco = null;
    const fetchOriginal = window.fetch;
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const metodo = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        const p = fetchOriginal.apply(this, arguments);
        if (metodo !== 'GET' && api() && url.indexOf(api()) === 0 && url.indexOf('/missions') === -1) {
            p.then((r) => { if (r && r.ok) { clearTimeout(refresco); refresco = setTimeout(() => cargarResumen(true), 900); } }).catch(() => {});
        }
        return p;
    };

    // La tarjeta vive en el HTML del feed, que se arma de nuevo en cada visita al módulo: se engancha cuando aparece.
    let revisando = false;
    function vigilar() {
        if (revisando) return;
        revisando = true;
        requestAnimationFrame(() => { revisando = false; const el = $('inicioMision'); if (el && !el._misionesListo) { inyectarEstilos(); enganchar(el); } });
    }
    new MutationObserver(vigilar).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', vigilar);
    window.addEventListener('resize', () => { if (!esMobile() && E.abierto) cerrar(); else pintarTarjeta(); });

    window._misiones = { abrir: () => abrir($('inicioMision')), cerrar, refrescar: () => cargarResumen(true), irALogros, _estado: E };
})();