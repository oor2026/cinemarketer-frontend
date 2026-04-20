// ========== SISTEMA DE TOAST - CINEMARKETER ==========

(function() {
    const _activos = {}; // rastrea tipos activos

    function getContainer() {
        let container = document.getElementById('cm-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'cm-toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    window.showToast = function(type, message, duration = 4000) {
        // Si ya hay un toast activo del mismo tipo y mensaje, ignorar
        const key = type + '|' + message;
        if (_activos[key]) return;
        _activos[key] = true;

        const icons = { success: '✓', error: '✕', info: 'i', warning: '⚠' };
        const container = getContainer();
        const toast = document.createElement('div');
        toast.className = `cm-toast ${type}`;
        toast.innerHTML = `
            <span class="cm-toast-icon">${icons[type] || 'i'}</span>
            <span class="cm-toast-msg">${message}</span>
            <span class="cm-toast-close">×</span>
            <div class="cm-toast-progress" style="animation-duration:${duration}ms"></div>
        `;
        toast.querySelector('.cm-toast-close').addEventListener('click', () => removeToast(toast, key));
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('cm-toast-close')) removeToast(toast, key);
        });
        container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
        setTimeout(() => removeToast(toast, key), duration);
    };

    function removeToast(toast, key) {
        if (!toast || toast.classList.contains('hide')) return;
        toast.classList.add('hide');
        setTimeout(() => {
            toast.remove();
            if (key) delete _activos[key]; // liberar el slot al desaparecer
        }, 350);
    }
})();