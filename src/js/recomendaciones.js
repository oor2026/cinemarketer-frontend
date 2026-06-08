// ==============================================
// recomendaciones.js - Sistema de recomendaciones
// ==============================================

(function() {

    let _movieId = null;
    let _movieTitulo = null;
    let _todosUsuarios = [];
    let _seleccionados = new Set();
    let _contextoSeleccionado = null;

    // -----------------------------------------------
    // ABRIR PANEL
    // -----------------------------------------------
    window.abrirPanelRecomendar = async function(movieId, event) {
        if (event) event.stopPropagation();

        _movieId = movieId;
        _seleccionados = new Set();
        _contextoSeleccionado = null;

        // Limpiar estado visual
        document.getElementById('recBuscadorUsuario').value = '';
        document.getElementById('recSeleccionadosRow').style.display = 'none';
        document.getElementById('recSeleccionadosTags').innerHTML = '';
        document.querySelectorAll('.rec-ctx-chip.selected').forEach(c => c.classList.remove('selected'));
        document.getElementById('btnEnviarRecomendacion').style.opacity = '0.5';
        document.getElementById('btnEnviarRecomendacion').style.cursor = 'not-allowed';

        // Mostrar panel
        const panel = document.getElementById('panelRecomendar');
        panel.style.display = 'flex';

        // Cargar datos de la película
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                _movieTitulo = data.title || data.titulo || 'Película';
                document.getElementById('recTituloFilm').textContent = _movieTitulo;
                const img = document.getElementById('recPosterImg');
                if (data.poster_path) {
                    img.src = `https://image.tmdb.org/t/p/w92${data.poster_path}`;
                    img.style.display = 'block';
                }
            }
        } catch(e) {}

        // Cargar usuarios
        await _cargarUsuarios(movieId);
    };

    // -----------------------------------------------
    // CERRAR PANEL
    // -----------------------------------------------
    window.cerrarPanelRecomendar = function() {
        document.getElementById('panelRecomendar').style.display = 'none';
        _movieId = null;
        _todosUsuarios = [];
        _seleccionados = new Set();
        _contextoSeleccionado = null;
    };

    // -----------------------------------------------
    // CARGAR USUARIOS (seguidos → sin interacción → random)
    // -----------------------------------------------
    async function _cargarUsuarios(movieId) {
        const lista = document.getElementById('recListaUsuarios');
        lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">Cargando usuarios...</div>';

        try {
            const token = localStorage.getItem('token');

            // Intentar seguidos primero
            const resSeguidos = await fetch(`${CONFIG.API_URL}/follows/following`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let usuarios = [];

            if (resSeguidos.ok) {
                const seguidos = await resSeguidos.json();
                if (seguidos && seguidos.length > 0) {
                    usuarios = seguidos.map(u => ({ ...u, fuente: 'seguido' }));
                }
            }

            // Si no hay seguidos, buscar usuarios sin interacción con la película
            if (usuarios.length === 0) {
                const resSin = await fetch(`${CONFIG.API_URL}/recommendations/movie/${movieId}/suggested-users?limit=20`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resSin.ok) {
                    const sinInteraccion = await resSin.json();
                    usuarios = (sinInteraccion || []).map(u => ({ ...u, fuente: 'sugerido' }));
                }
            }

            // Si sigue sin haber, cualquier usuario
            if (usuarios.length === 0) {
                const resRandom = await fetch(`${CONFIG.API_URL}/recommendations/movie/${movieId}/suggested-users?limit=20`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resRandom.ok) {
                    const random = await resRandom.json();
                    usuarios = (random || []).map(u => ({ ...u, fuente: 'sugerido' }));
                }
            }

            _todosUsuarios = usuarios;
            _renderizarUsuarios(usuarios);

        } catch(e) {
            lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">No se pudieron cargar usuarios.</div>';
        }
    }

    // -----------------------------------------------
    // RENDERIZAR CHIPS DE USUARIOS
    // -----------------------------------------------
    function _renderizarUsuarios(usuarios) {
        const lista = document.getElementById('recListaUsuarios');

        if (!usuarios || usuarios.length === 0) {
            lista.innerHTML = '<div style="font-size:12px;color:#999;padding:8px 0;">No hay usuarios disponibles por ahora.</div>';
            return;
        }

        lista.innerHTML = usuarios.map(u => {
            const iniciales = (u.name || u.nombre || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
            const avatarHtml = (u.profileImageUrl || u.profile_image_url)
                ? `<img src="${u.profileImageUrl || u.profile_image_url}" alt="${iniciales}">`
                : iniciales;
            const nombre = u.name || u.nombre || 'Usuario';
            const seleccionado = _seleccionados.has(u.id) ? 'selected' : '';
            return `
                <div class="rec-usuario-chip ${seleccionado}" data-id="${u.id}" data-nombre="${nombre}" onclick="window.toggleUsuarioRec(this)">
                    <div class="chip-avatar">${avatarHtml}</div>
                    <span>${nombre}</span>
                </div>
            `;
        }).join('');
    }

    // -----------------------------------------------
    // TOGGLE SELECCIÓN DE USUARIO
    // -----------------------------------------------
    window.toggleUsuarioRec = function(chip) {
        const id = parseInt(chip.dataset.id);
        const nombre = chip.dataset.nombre;

        if (_seleccionados.has(id)) {
            _seleccionados.delete(id);
            chip.classList.remove('selected');
        } else {
            _seleccionados.add(id);
            chip.classList.add('selected');
        }

        _actualizarSeleccionados();
        _actualizarBotonEnviar();
    };

    // -----------------------------------------------
    // FILTRAR USUARIOS POR BÚSQUEDA
    // -----------------------------------------------
    window.filtrarUsuariosRec = function(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            _renderizarUsuarios(_todosUsuarios);
            return;
        }
        const filtrados = _todosUsuarios.filter(u =>
            (u.name || u.nombre || '').toLowerCase().includes(q)
        );
        _renderizarUsuarios(filtrados);
    };

    // -----------------------------------------------
    // TOGGLE CONTEXTO
    // -----------------------------------------------
    window.toggleContextoRec = function(chip) {
        const ctx = chip.dataset.ctx;
        if (_contextoSeleccionado === ctx) {
            _contextoSeleccionado = null;
            chip.classList.remove('selected');
        } else {
            document.querySelectorAll('.rec-ctx-chip.selected').forEach(c => c.classList.remove('selected'));
            _contextoSeleccionado = ctx;
            chip.classList.add('selected');
        }
    };

    // -----------------------------------------------
    // ACTUALIZAR TAGS DE SELECCIONADOS
    // -----------------------------------------------
    function _actualizarSeleccionados() {
        const row = document.getElementById('recSeleccionadosRow');
        const tags = document.getElementById('recSeleccionadosTags');

        if (_seleccionados.size === 0) {
            row.style.display = 'none';
            return;
        }

        row.style.display = 'block';
        const nombresSeleccionados = _todosUsuarios
            .filter(u => _seleccionados.has(u.id))
            .map(u => u.name || u.nombre || 'Usuario');

        tags.innerHTML = nombresSeleccionados.map(n => `
            <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:#e8eef7;color:#1a3a6b;border:1px solid #c5d3f0;">${n}</span>
        `).join('');
    }

    // -----------------------------------------------
    // HABILITAR/DESHABILITAR BOTÓN ENVIAR
    // -----------------------------------------------
    function _actualizarBotonEnviar() {
        const btn = document.getElementById('btnEnviarRecomendacion');
        if (_seleccionados.size > 0) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }

    // -----------------------------------------------
    // ENVIAR RECOMENDACIÓN
    // -----------------------------------------------
    window.enviarRecomendacion = async function() {
        if (_seleccionados.size === 0) return;

        const token = localStorage.getItem('token');
        const btn = document.getElementById('btnEnviarRecomendacion');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        try {
            const promises = Array.from(_seleccionados).map(receiverId =>
                fetch(`${CONFIG.API_URL}/recommendations`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        movieId: _movieId,
                        receiverId: receiverId,
                        contextType: _contextoSeleccionado || null
                    })
                })
            );

            await Promise.all(promises);

            // Toast de éxito
            window.cerrarPanelRecomendar();
            _mostrarToast(_seleccionados.size === 1
                ? 'Recomendación enviada'
                : `${_seleccionados.size} recomendaciones enviadas`
            );

        } catch(e) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-share"></i> Enviar recomendación';
            _mostrarToast('Error al enviar. Intentá de nuevo.', true);
        }
    };

    // -----------------------------------------------
    // TOAST
    // -----------------------------------------------
    function _mostrarToast(mensaje, esError = false) {
        const toast = document.createElement('div');
        toast.textContent = mensaje;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: ${esError ? '#e50914' : '#1a3a6b'};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 99px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 9999999;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Cerrar al click en overlay
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('panelRecomendar');
        if (panel && panel.style.display !== 'none' && e.target === panel) {
            window.cerrarPanelRecomendar();
        }
    });

})();
