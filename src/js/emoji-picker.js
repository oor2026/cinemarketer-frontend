// ==============================================
// emoji-picker.js — Picker de emojis Unicode
// Uso: initEmojiPicker(inputElement, triggerButton)
// ==============================================

(function() {

    const EMOJI_CATEGORIES = [
        {
            label: '😀 Caras',
            emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
                     '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
                     '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫',
                     '🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
                     '🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢',
                     '🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸',
                     '😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲',
                     '😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
                     '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠',
                     '🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
                     '👽','👾','🤖']
        },
        {
            label: '👋 Gestos',
            emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
                     '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
                     '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
                     '🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂',
                     '🦻','👃','🫀','🫁','🧠','🦷','🦴','👁️','👀','👅',
                     '👄','💋']
        },
        {
            label: '❤️ Corazones',
            emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
                     '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
                     '✝️','☯️','♾️','💲','♻️','🔰','⭐','🌟','💫','✨',
                     '⚡','🔥','💥','❄️','🌈','☀️','🌤️','⛅','🌦️','🌧️']
        },
        {
            label: '🎬 Cine',
            emojis: ['🎬','🎥','📽️','🎞️','🎭','🎪','🎟️','🎫','🍿','🎦',
                     '📺','📻','🎙️','🎚️','🎛️','📡','🔭','🎠','🎡','🎢',
                     '🎪','🤹','🎨','🖼️','🎭','🎤','🎧','🎵','🎶','🎼',
                     '🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯',
                     '🎳','🎮','🕹️','🃏','🀄','🎴','🎰']
        },
        {
            label: '🐶 Animales',
            emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
                     '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
                     '🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄',
                     '🐝','🐛','🦋','🐌','🐞','🐜','🦗','🕷️','🦂','🐢']
        },
        {
            label: '🍕 Comida',
            emojis: ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥥',
                     '🍅','🥝','🍆','🥑','🥦','🌽','🥕','🧅','🥔','🍠',
                     '🍞','🥐','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇',
                     '🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯',
                     '🥙','🧆','🥚','🍜','🍝','🍣','🍱','🍛','🍲','🍤',
                     '🍙','🍚','🍘','🍥','🥮','🍡','🧁','🎂','🍰','🍮',
                     '🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧂',
                     '🍼','🥛','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻',
                     '🥂','🍷','🥃','🍸','🍹','🧉','🍾']
        },
        {
            label: '⚽ Deportes',
            emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
                     '🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁',
                     '🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️',
                     '🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺',
                     '🏇','🧘','🏄','🏊','🚴','🏆','🥇','🥈','🥉','🏅']
        },
        {
            label: '🚗 Viajes',
            emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
                     '🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚨',
                     '🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞',
                     '🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️',
                     '🛫','🛬','🛩️','💺','🛸','🚁','🛶','⛵','🚤','🛥️',
                     '🛳️','⛴️','🚢','🏖️','🏝️','🏔️','🗻','🏕️','🏗️','🏘️']
        },
        {
            label: '💡 Objetos',
            emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾',
                     '💿','📀','📷','📸','📹','🎥','📽️','📞','☎️','📟',
                     '📠','📺','📻','🧭','⏱️','⌛','⏰','⏲️','🕰️','⌛',
                     '🔋','🔌','💡','🔦','🕯️','🗑️','🛢️','💰','💴','💵',
                     '💳','💎','⚖️','🧲','🔧','🔨','⚒️','🛠️','⛏️','🔩',
                     '🗜️','🔑','🗝️','🔒','🔓','🚪','🪑','🛋️','🚿','🛁',
                     '🪤','🪣','🧴','🧷','🧹','🧺','🧻','🪣','🪥','🪒']
        }
    ];

    let pickerEl      = null;
    let currentTarget = null;
    let triggerBtnRef = null;

    function insertAtCursor(el, text) {
        if (!el) return;
        el.focus();
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const start = el.selectionStart;
            const end   = el.selectionEnd;
            const val   = el.value;
            el.value = val.substring(0, start) + text + val.substring(end);
            el.selectionStart = el.selectionEnd = start + text.length;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function getPosicionRelativa(triggerBtn) {
        const modalBody = document.querySelector('#modalPelicula .modal-body');
        if (!modalBody) return { top: 0, left: 0 };

        const modalRect   = modalBody.getBoundingClientRect();
        const triggerRect = triggerBtn.getBoundingClientRect();
        const scrollTop   = modalBody.scrollTop;

        const pickerH    = 320;
        const spaceBelow = modalRect.bottom - triggerRect.bottom;

        let top = spaceBelow < pickerH + 10
        ? (triggerRect.bottom - modalRect.top + scrollTop) - pickerH - 6
        : (triggerRect.bottom - modalRect.top + scrollTop) + 6;

        let left = triggerRect.left - modalRect.left;
        if (left + 300 > modalRect.width) left = modalRect.width - 304;
        if (left < 0) left = 4;

        return { top, left };
    }

    function crearPicker() {
        if (pickerEl) return;

        pickerEl = document.createElement('div');
        pickerEl.id = 'cine-emoji-picker';
        pickerEl.className = 'cine-emoji-picker';
        pickerEl.style.cssText = 'display:none; position:absolute; z-index:9999;';

        const tabsDiv = document.createElement('div');
        tabsDiv.className = 'cep-tabs';
        EMOJI_CATEGORIES.forEach((cat, i) => {
            const tab = document.createElement('button');
            tab.className = 'cep-tab' + (i === 0 ? ' active' : '');
            tab.title = cat.label;
            tab.textContent = cat.label.split(' ')[0];
            tab.onclick = (e) => {
                e.stopPropagation();
                pickerEl.querySelectorAll('.cep-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderGrid(i);
            };
            tabsDiv.appendChild(tab);
        });
        pickerEl.appendChild(tabsDiv);

        const grid = document.createElement('div');
        grid.className = 'cep-grid';
        grid.id = 'cep-grid';
        pickerEl.appendChild(grid);

        // Insertar dentro del modal-body para que respete su scroll
        const modalBody = document.querySelector('#modalPelicula .modal-body') || document.body;
        modalBody.style.position = 'relative';
        modalBody.appendChild(pickerEl);

        document.addEventListener('click', (e) => {
            if (pickerEl && !pickerEl.contains(e.target) && !e.target.classList.contains('cep-trigger')) {
                cerrarPicker();
            }
        });

        renderGrid(0);
    }

    function renderGrid(catIndex) {
        const grid = document.getElementById('cep-grid');
        if (!grid) return;
        const emojis = EMOJI_CATEGORIES[catIndex].emojis;
        grid.innerHTML = emojis.map(em =>
            `<button class="cep-emoji" onclick="window._cepInsert('${em}')">${em}</button>`
        ).join('');
    }

    window._cepInsert = function(emoji) {
        insertAtCursor(currentTarget, emoji);
    };

    function abrirPicker(triggerBtn, targetEl) {
        if (typeof window.cerrarGifPicker === 'function') window.cerrarGifPicker();
        crearPicker();
        currentTarget  = targetEl;
        triggerBtnRef  = triggerBtn;

        const pos = getPosicionRelativa(triggerBtn);
        pickerEl.style.top     = pos.top + 'px';
        pickerEl.style.left    = pos.left + 'px';
        pickerEl.style.display = 'flex';
    }

    function cerrarPicker() {
        if (pickerEl) pickerEl.style.display = 'none';
    }

    window.initEmojiPicker = function(targetEl, triggerBtn) {
        if (!targetEl || !triggerBtn) return;
        triggerBtn.classList.add('cep-trigger');
        triggerBtn.onclick = function(e) {
            e.stopPropagation();
            if (pickerEl && pickerEl.style.display !== 'none' && currentTarget === targetEl) {
                cerrarPicker();
            } else {
                abrirPicker(triggerBtn, targetEl);
            }
        };
    };

    window.cerrarEmojiPicker = cerrarPicker;

})();