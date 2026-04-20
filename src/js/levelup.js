// ========== LEVEL UP CELEBRATION - CINEMARKETER ==========

(function() {

    const LEVEL_CONFIG = {
        'COLABORADOR':    { emoji: '🔵', bg: '#e3f2fd', color: '#0c447c' },
        'CRITICO':        { emoji: '🟣', bg: '#f3e5f5', color: '#4a148c' },
        'JURADO_EXPERTO': { emoji: '🏆', bg: '#fff8e1', color: '#633806' }
    };

    const CONFETTI_COLORS = ['#e50914','#1a3a6b','#ffd700','#4caf50','#9c27b0','#ff9800','#2196f3'];

    function buildOverlay() {
        if (document.getElementById('cm-levelup-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'cm-levelup-overlay';
        overlay.innerHTML = `
            <div id="cm-levelup-card">
                <span class="lu-icon" id="cm-lu-icon"></span>
                <div class="lu-title">¡Subiste de nivel!</div>
                <div class="lu-name" id="cm-lu-name"></div>
                <div class="lu-badge" id="cm-lu-badge"></div>
                <div class="lu-msg">Seguí votando, comentando y canjeando para alcanzar el próximo nivel.</div>
                <button class="lu-close" onclick="window.closeLevelUp()">¡Genial!</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function spawnConfetti() {
        const card = document.getElementById('cm-levelup-card');
        if (!card) return;
        for (let i = 0; i < 45; i++) {
            const el = document.createElement('div');
            el.className = 'cm-confetti-piece';
            el.style.cssText = `
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 15}%;
                background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
                width: ${4 + Math.random() * 8}px;
                height: ${4 + Math.random() * 8}px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                animation-duration: ${1.2 + Math.random() * 1.5}s;
                animation-delay: ${Math.random() * 0.5}s;
            `;
            card.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }
    }

    window.showLevelUp = function(newLevel, displayName) {
        buildOverlay();

        const config = LEVEL_CONFIG[newLevel] || { emoji: '⭐', bg: '#f5f5f5', color: '#333' };
        const name = displayName || newLevel;

        document.getElementById('cm-lu-icon').textContent = config.emoji;
        document.getElementById('cm-lu-name').textContent = name;

        const badge = document.getElementById('cm-lu-badge');
        badge.textContent = name;
        badge.style.background = config.bg;
        badge.style.color = config.color;

        const overlay = document.getElementById('cm-levelup-overlay');
        const card = document.getElementById('cm-levelup-card');
        overlay.classList.add('visible');

        // Reiniciar animaciones
        card.style.animation = 'none';
        card.offsetHeight;
        card.style.animation = 'cm-cardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';

        const icon = document.getElementById('cm-lu-icon');
        icon.style.animation = 'none';
        icon.offsetHeight;
        icon.style.animation = 'cm-bounce 0.6s ease 0.3s both';

        setTimeout(spawnConfetti, 200);

        // Cerrar automáticamente después de 6 segundos
        setTimeout(() => window.closeLevelUp(), 6000);
    };

    window.closeLevelUp = function() {
        const overlay = document.getElementById('cm-levelup-overlay');
        if (overlay) overlay.classList.remove('visible');
    };

})();