// ==============================================
// MODAL DE PELÍCULA / SERIE EN MOBILE: portada fija, contenido que sube por encima y títulos que se intercambian
//
// La portada es el fondo fijo del modal (un pseudo-elemento del .modal-contenido) y el .modal-body scrollea por
// encima. Este archivo hace tres cosas, todas solo en pantallas de hasta 768 px:
//  1) Mueve los botones y los números del encabezado (dónde verla, compartir, puntuación...) a la capa que va sobre
//     la portada. Se MUEVEN, no se copian, así conservan sus id y sus acciones. En escritorio vuelven al encabezado.
//  2) Escucha el scroll y escribe cuatro variables CSS en el modal (oscurecimiento de la portada, opacidad del título
//     grande, opacidad del título chico de la barra y del fondo de la barra). El CSS hace el resto.
//  3) Pide a TMDB las imágenes de la película o serie (a través del backend) y decide qué título mostrar sobre la portada:
//       - si el póster YA TRAE el título impreso, no se agrega ninguno (ni texto ni logo) y se aclara el degradé oscuro
//         para que el título impreso se vea con todo su brillo;
//       - si el póster no lo trae pero hay logo, se muestra el logo en vez del texto;
//       - si no hay ninguna de las dos cosas, se muestra el texto.
//     Mientras llega la respuesta el título queda oculto (así no aparece el texto un instante y desaparece).
// ==============================================
(function() {
    const TIPOS = {
        pelicula: { modal: 'modalPelicula', ruta: 'movies', acciones: 'modalAccionesHero', texto: 'modalTituloTexto', logoTitulo: 'modalLogoTitulo', logoBarra: 'modalLogoBarra' },
        serie:    { modal: 'modalSerie',    ruta: 'series', acciones: 'modalAccionesHeroSerie', texto: 'modalTituloTextoSerie', logoTitulo: 'modalLogoTituloSerie', logoBarra: 'modalLogoBarraSerie' }
    };
    const TMDB_IMG = 'https://image.tmdb.org/t/p/';
    const estado = { pelicula: {}, serie: {} };
    const memoria = new Map();                                   // imágenes ya resueltas por "tipo:id"
    const ESPERA_MAX = 1500;                                     // ms que se espera la respuesta antes de mostrar el texto
    const esMobile = () => !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    const limitar = (v) => Math.max(0, Math.min(1, v));
    const por = (id) => document.getElementById(id);

    // Qué tan temprano o tarde pasa cada cosa, medido sobre el video de referencia (en px de pantalla de 360 px de ancho).
    const CURVAS = {
        oscurecer: 0.78,                // cuánto se oscurece la portada como máximo (0 a 1)
        distanciaOscurecer: 0.5,        // el máximo se alcanza a esta fracción del alto de la pantalla
        tituloGrande: [12, 70],         // el título grande se apaga entre estos dos scrolls (px)
        tituloChico: [100, 310]         // el título chico de la barra aparece entre estos dos scrolls (px)
    };

    function variables(scroll) {
        const alto = window.innerHeight || 800;
        const chico = limitar((scroll - CURVAS.tituloChico[0]) / (CURVAS.tituloChico[1] - CURVAS.tituloChico[0]));
        return {
            '--hero-dim': (CURVAS.oscurecer * limitar(scroll / (alto * CURVAS.distanciaOscurecer))).toFixed(3),
            '--titulo-grande': (1 - limitar((scroll - CURVAS.tituloGrande[0]) / (CURVAS.tituloGrande[1] - CURVAS.tituloGrande[0]))).toFixed(3),
            '--titulo-chico': chico.toFixed(3),
            '--barra-fondo': chico.toFixed(3)
        };
    }
    function escribir(modal, scroll) { const v = variables(scroll); Object.keys(v).forEach(k => modal.style.setProperty(k, v[k])); }

    // Mueve los hijos del encabezado (menos el botón de cerrar) a la capa de la portada, o los devuelve.
    function mover(tipo, haciaPortada) {
        const t = TIPOS[tipo], modal = por(t.modal); if (!modal) return;
        const derecha = modal.querySelector('.modal-header-right'), destino = por(t.acciones); if (!derecha || !destino) return;
        const cerrar = derecha.querySelector('.modal-cerrar');
        if (haciaPortada) {
            [...derecha.children].filter(h => h !== cerrar).forEach(h => destino.appendChild(h));
        } else {
            [...destino.children].forEach(h => derecha.insertBefore(h, cerrar || null));
        }
    }

    // Prioridad de idioma: español, inglés y sin idioma (logo internacional). Después, el mejor votado y el más grande.
    function elegirLogo(logos) {
        const rango = { es: 0, en: 1 };
        const validos = (logos || []).filter(l => l && l.file_path && (l.iso_639_1 == null || l.iso_639_1 === 'es' || l.iso_639_1 === 'en'));
        validos.sort((a, b) => {
            const ra = a.iso_639_1 in rango ? rango[a.iso_639_1] : 2, rb = b.iso_639_1 in rango ? rango[b.iso_639_1] : 2;
            return (ra - rb) || ((b.vote_average || 0) - (a.vote_average || 0)) || ((b.width || 0) - (a.width || 0));
        });
        return validos.length ? validos[0].file_path : null;
    }

    // Devuelve { logo: ruta o null, posters: [{ file_path, iso_639_1 }] }. Si algo falla, no hay logo ni posters.
    async function buscarImagenes(tipo, id) {
        const clave = tipo + ':' + id;
        if (memoria.has(clave)) return memoria.get(clave);
        let res = { logo: null, posters: [] };
        try {
            if (typeof CONFIG === 'undefined') throw new Error('sin CONFIG');
            const token = localStorage.getItem('token');
            const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const corte = ctl ? setTimeout(() => ctl.abort(), 5000) : null;
            const resp = await fetch(`${CONFIG.API_URL}/${TIPOS[tipo].ruta}/${id}/images?include_image_language=es,en,null`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {}, signal: ctl ? ctl.signal : undefined });
            if (corte) clearTimeout(corte);
            if (resp.ok) { const datos = await resp.json(); res = { logo: elegirLogo(datos.logos), posters: Array.isArray(datos.posters) ? datos.posters : [] }; }
        } catch (e) { res = { logo: null, posters: [] }; }
        memoria.set(clave, res);
        return res;
    }

    // ¿El póster que se está mostrando trae texto impreso? TMDB guarda el idioma del texto de cada póster; vacío = sin texto.
    // Si el póster no está en la lista (por ejemplo, está en otro idioma), no se puede asegurar y se considera que no.
    function posterConTitulo(posters, posterPath) {
        if (!posterPath) return false;
        const p = (posters || []).find(x => x && x.file_path === posterPath);
        return !!(p && p.iso_639_1);
    }

    function precargar(url) { return new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; }); }

    window._modalHero = {
        imagenes: buscarImagenes, _elegirLogo: elegirLogo, _posterConTitulo: posterConTitulo, _variables: variables, _curvas: CURVAS,

        abrir(tipo) {
            const t = TIPOS[tipo], modal = por(t.modal); if (!modal) return;
            const st = estado[tipo]; st.id = null;
            const cuerpo = modal.querySelector('.modal-body');
            if (esMobile()) mover(tipo, true); else mover(tipo, false);
            clearTimeout(st.espera); modal.classList.remove('con-logo', 'titulo-impreso', 'titulo-cargando');
            if (cuerpo) { cuerpo.scrollTop = 0; }
            escribir(modal, 0);
            if (cuerpo && !st.alScroll) {
                let pendiente = false;
                st.alScroll = () => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; escribir(modal, cuerpo.scrollTop); }); };
                cuerpo.addEventListener('scroll', st.alScroll, { passive: true });
            }
            if (!st.mq && window.matchMedia) {                           // si gira el teléfono o cambia el ancho con el modal abierto
                st.mq = window.matchMedia('(max-width: 768px)');
                st.mq.addEventListener('change', e => { if (modal.style.display !== 'none') mover(tipo, e.matches); });
            }
        },

        // La portada del fondo: la misma imagen del modal, en mayor resolución porque ahora ocupa todo el ancho.
        poster(tipo, posterPath) {
            const modal = por(TIPOS[tipo].modal); if (!modal) return;
            estado[tipo].posterPath = posterPath || null;
            if (posterPath) modal.style.setProperty('--modal-poster', `url("${TMDB_IMG}w780${posterPath}")`);
            else modal.style.removeProperty('--modal-poster');
        },

        // Título: se decide con lo que diga TMDB. Hasta entonces el título queda oculto (máximo ESPERA_MAX ms).
        titulo(tipo, id, texto) {
            const t = TIPOS[tipo], modal = por(t.modal); if (!modal) return;
            const st = estado[tipo]; st.id = id;
            const elTexto = por(t.texto); if (elTexto) elTexto.textContent = texto || '';
            clearTimeout(st.espera); modal.classList.remove('con-logo', 'titulo-impreso'); modal.classList.add('titulo-cargando');
            st.espera = setTimeout(() => { if (estado[tipo].id === id) modal.classList.remove('titulo-cargando'); }, ESPERA_MAX);
            buscarImagenes(tipo, id).then(async img => {
                if (estado[tipo].id !== id) return;
                let urlLogo = null;
                if (img.logo) { const url = TMDB_IMG + 'w500' + img.logo; if (await precargar(url)) urlLogo = url; }
                if (estado[tipo].id !== id) return;
                if (urlLogo) {
                    const grande = por(t.logoTitulo), barra = por(t.logoBarra);
                    if (grande) { grande.src = urlLogo; grande.alt = texto || ''; }
                    if (barra) { barra.src = urlLogo; barra.alt = texto || ''; }
                    modal.classList.add('con-logo');
                }
                if (posterConTitulo(img.posters, estado[tipo].posterPath)) modal.classList.add('titulo-impreso');
                clearTimeout(st.espera); modal.classList.remove('titulo-cargando');
            });
        },

        cerrar(tipo) {
            const t = TIPOS[tipo], modal = por(t.modal); if (!modal) return;
            clearTimeout(estado[tipo].espera); estado[tipo].id = null; modal.classList.remove('con-logo', 'titulo-impreso', 'titulo-cargando'); mover(tipo, false);
        }
    };
})();