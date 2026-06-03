// ==============================================
// gif-picker.js — Picker de GIFs via GIPHY
// ==============================================

(function() {

    const GIPHY_KEY      = '3NsZhHlVLb8NiphwMDkuXS3d2Borc0Sm';
    const GIPHY_SEARCH   = 'https://api.giphy.com/v1/gifs/search';
    const GIPHY_TRENDING = 'https://api.giphy.com/v1/gifs/trending';

    let pickerEl      = null;
    let currentMode   = 'main';
    let searchTimeout = null;
    let triggerBtnRef = null;

    function getPosicionRelativa(triggerBtn) {
        const modalBody = document.querySelector('#modalPelicula .modal-body');
        if (!modalBody) return { top: 0, left: 0 };

        const modalRect   = modalBody.getBoundingClientRect();
        const triggerRect = triggerBtn.getBoundingClientRect();
        const scrollTop   = modalBody.scrollTop;

        const pickerH    = 340;
        const spaceBelow = modalRect.bottom - triggerRect.bottom;

        let top = spaceBelow < pickerH + 10
            ? (triggerRect.top - modalRect.top + scrollTop) - pickerH - 6
            : (triggerRect.bottom - modalRect.top + scrollTop) + 6;

        let left = triggerRect.left - modalRect.left;
        if (left + 324 > modalRect.width) left = modalRect.width - 328;
        if (left < 0) left = 4;

        return { top, left };
    }

    function crearPicker() {
        if (pickerEl) return;

        pickerEl = document.createElement('div');
        pickerEl.id = 'cine-gif-picker';
        pickerEl.style.cssText = `
            position: absolute;
            z-index: 9999;
            width: 320px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18);
            border: 1px solid #e8e8e8;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;

        pickerEl.innerHTML = `
            <div style="padding:0.6rem 0.6rem 0.4rem;background:#fafafa;border-bottom:1px solid #eee;">
                <div style="display:flex;align-items:center;gap:0.4rem;background:white;border:1.5px solid #e0e0e0;border-radius:20px;padding:0.3rem 0.75rem;">
                    <span style="font-size:0.8rem;color:#999;">🔍</span>
                    <input id="gifSearchInput" type="text" placeholder="Buscar GIFs..."
                        style="border:none;outline:none;font-size:0.85rem;flex:1;color:#333;background:transparent;"
                        oninput="window._gifPickerBuscar(this.value)">
                    <button id="gifSearchClear" onclick="window._gifPickerLimpiar()"
                        style="display:none;background:none;border:none;cursor:pointer;color:#aaa;font-size:0.9rem;padding:0;line-height:1;">✕</button>
                </div>
            </div>
            <div id="gifGrid" style="
                display:grid;
                grid-template-columns:repeat(2,1fr);
                gap:4px;
                padding:6px;
                max-height:260px;
                overflow-y:auto;
                scrollbar-width:thin;
            ">
                <div style="grid-column:span 2;text-align:center;padding:2rem;color:#aaa;font-size:0.85rem;">
                    <i class="fas fa-spinner fa-spin"></i> Cargando GIFs...
                </div>
            </div>
            <div style="padding:0.3rem 0.6rem;background:#fafafa;border-top:1px solid #eee;text-align:center;">
                <span style="font-size:0.65rem;color:#bbb;">Powered by GIPHY</span>
            </div>
        `;

        const modalBody = document.querySelector('#modalPelicula .modal-body') || document.body;
        modalBody.style.position = 'relative';
        modalBody.appendChild(pickerEl);

        document.addEventListener('click', (e) => {
            if (pickerEl &&
                !pickerEl.contains(e.target) &&
                !e.target.classList.contains('gif-trigger-btn') &&
                e.target.id !== 'gifTriggerMain') {
                cerrarPicker();
            }
        });

        cargarTrending();
    }

    async function cargarTrending() {
        const grid = document.getElementById('gifGrid');
        if (!grid) return;
        grid.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:2rem;color:#aaa;font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>`;
        try {
            const res  = await fetch(`${GIPHY_TRENDING}?api_key=${GIPHY_KEY}&limit=12&rating=g`);
            const data = await res.json();
            renderGifs(data.data);
        } catch (e) {
            grid.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:1rem;color:#aaa;font-size:0.8rem;">Error al cargar GIFs</div>`;
        }
    }

    window._gifPickerBuscar = function(query) {
        const clearBtn = document.getElementById('gifSearchClear');
        if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
        clearTimeout(searchTimeout);
        if (!query.trim()) { cargarTrending(); return; }

        const grid = document.getElementById('gifGrid');
        if (grid) grid.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:2rem;color:#aaa;font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i></div>`;

        searchTimeout = setTimeout(async () => {
            try {
                const res  = await fetch(`${GIPHY_SEARCH}?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g&lang=es`);
                const data = await res.json();
                renderGifs(data.data);
            } catch (e) {
                if (grid) grid.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:1rem;color:#aaa;font-size:0.8rem;">Error al buscar</div>`;
            }
        }, 500);
    };

    window._gifPickerLimpiar = function() {
        const input    = document.getElementById('gifSearchInput');
        const clearBtn = document.getElementById('gifSearchClear');
        if (input)    input.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        cargarTrending();
    };

    function renderGifs(gifs) {
        const grid = document.getElementById('gifGrid');
        if (!grid) return;
        if (!gifs || gifs.length === 0) {
            grid.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:1.5rem;color:#aaa;font-size:0.85rem;">No se encontraron GIFs</div>`;
            return;
        }
        grid.innerHTML = gifs.map(gif => {
            const url = gif.images?.fixed_height_small?.url || gif.images?.original?.url;
            if (!url) return '';
            return `<img src="${url}" alt="${gif.title}"
                         style="width:100%;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;display:block;"
                         onclick="window._gifSeleccionar('${url}')"
                         loading="lazy">`;
        }).join('');
    }

    window._gifSeleccionar = function(url) {
        if (currentMode === 'main') {
            window._gifSeleccionado = url;
            const preview = document.getElementById('gifPreviewMain');
            const img     = document.getElementById('gifPreviewImgMain');
            if (preview && img) { img.src = url; preview.style.display = 'block'; }
        } else if (currentMode === 'reply') {
            window._gifSeleccionadoReply = url;
            const preview = document.getElementById(`gifPreviewReply-${window._gifReplyCommentId}`);
            const img     = document.getElementById(`gifPreviewImgReply-${window._gifReplyCommentId}`);
            if (preview && img) { img.src = url; preview.style.display = 'block'; }
        }
        cerrarPicker();
    };

    window.quitarGifMain = function() {
        window._gifSeleccionado = null;
        const preview = document.getElementById('gifPreviewMain');
        const img     = document.getElementById('gifPreviewImgMain');
        if (preview) preview.style.display = 'none';
        if (img)     img.src = '';
    };

    window.quitarGifReply = function(commentId) {
        window._gifSeleccionadoReply = null;
        const preview = document.getElementById(`gifPreviewReply-${commentId}`);
        const img     = document.getElementById(`gifPreviewImgReply-${commentId}`);
        if (preview) preview.style.display = 'none';
        if (img)     img.src = '';
    };

    function abrirPicker(triggerBtn, mode, commentId) {
        if (typeof window.cerrarEmojiPicker === 'function') window.cerrarEmojiPicker();
        crearPicker();
        currentMode              = mode || 'main';
        window._gifReplyCommentId = commentId || null;
        triggerBtnRef            = triggerBtn;

        const pos = getPosicionRelativa(triggerBtn);
        pickerEl.style.top     = pos.top + 'px';
        pickerEl.style.left    = pos.left + 'px';
        pickerEl.style.display = 'flex';

        setTimeout(() => document.getElementById('gifSearchInput')?.focus(), 100);
    }

    function cerrarPicker() {
        if (pickerEl) pickerEl.style.display = 'none';
    }

    window.initGifPicker = function(triggerBtn, mode, commentId) {
        if (!triggerBtn) return;
        triggerBtn.onclick = function(e) {
            e.stopPropagation();
            if (pickerEl && pickerEl.style.display !== 'none' && currentMode === mode) {
                cerrarPicker();
            } else {
                abrirPicker(triggerBtn, mode, commentId);
            }
        };
    };

    window.initGifPickerMain = function() {
        const btn = document.getElementById('gifTriggerMain');
        if (btn) window.initGifPicker(btn, 'main', null);
    };

    window.cerrarGifPicker = cerrarPicker;

})();