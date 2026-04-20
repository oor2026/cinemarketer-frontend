// ==============================================
// mi-cuenta.js - Módulo de perfil de usuario
// ==============================================

console.log('👤 Mi-cuenta módulo JS cargado');

function formatearVotos(cantidad) {
    if (cantidad === 0) return '0';
    if (cantidad === 1) return '1';
    if (cantidad >= 1000000) return (cantidad / 1000000).toFixed(1) + 'M';
    if (cantidad >= 1000) return (cantidad / 1000).toFixed(1) + 'K';
    return cantidad.toString();
}

window.loadProfile = async function() {
    try {
        const profile = await API.getProfile();
        console.log('✅ Perfil completo:', profile);

        document.getElementById('userName').textContent         = profile.name || '';
        document.getElementById('userFullName').textContent     = profile.name  || '—';
        document.getElementById('userEmail').textContent        = profile.email || '';
        document.getElementById('userDni').textContent          = profile.dni   || '—';
        document.getElementById('userPhone').textContent        = profile.phone || '—';
        document.getElementById('totalPoints').textContent      = profile.totalPoints ?? 0;
        document.getElementById('redemptionsCount').textContent = profile.commentsCount ?? 0;

        const reviewsSpan = document.getElementById('reviewsCountFormatted');
        if (reviewsSpan) reviewsSpan.textContent = formatearVotos(profile.reviewsCount ?? 0);

        document.getElementById('emailVerified').innerHTML = profile.emailVerified ? '✅ Sí' : '❌ No';

        if (profile.createdAt) {
            const joinDate = new Date(profile.createdAt);
            document.getElementById('memberSince').textContent =
                `Miembro desde ${joinDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        }

        if (profile.lastLoginAt) {
            const lastLogin = new Date(profile.lastLoginAt);
            document.getElementById('lastLogin').textContent = lastLogin.toLocaleString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else {
            document.getElementById('lastLogin').textContent = 'Primer inicio de sesión';
        }

        cargarAvatarYNivel(profile);

    if (typeof window.initSuscripcion === 'function') {
        window.initSuscripcion();
    }

    } catch (error) {
        console.error('❌ Error cargando perfil:', error);
        const card = document.querySelector('.profile-card');
        if (card) card.innerHTML = `
            <div style="text-align: center; color: #e50914; padding: 2rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem;"></i>
                <h3>Error al cargar el perfil</h3>
                <p>Por favor, intenta nuevamente más tarde.</p>
            </div>
        `;
    }
};

// ==============================================
// CARGAR AVATAR Y NIVEL EN EL PERFIL
// ==============================================
function cargarAvatarYNivel(profile) {
    // Avatar
    const avatarContainer = document.getElementById('profileAvatar');
    if (profile.avatarUrl) {
        avatarContainer.innerHTML = `<img src="${profile.avatarUrl}" alt="Avatar" class="avatar-img">`;
    } else {
        avatarContainer.innerHTML = `<i class="fas fa-user-circle"></i>`;
    }

    // Nivel + nombre del avatar (viene del perfil al cargar)
    const levelBadge = document.getElementById('profileLevelBadge');
    if (profile.level && levelBadge) {
        const levelEmoji = profile.levelEmoji || getLevelEmoji(profile.level);
        const levelName  = profile.levelDisplayName || profile.level;
        levelBadge.innerHTML = `
            <span class="level-icon">${levelEmoji}</span>
            <span class="level-name">${levelName}</span>
            ${profile.avatarName ? `<span class="avatar-name">· ${profile.avatarName}</span>` : ''}
        `;
    }

    // Progreso
    if (profile.levelProgress !== undefined) {
        const progressFill = document.querySelector('#profileLevelProgress .progress-fill');
        const progressText = document.querySelector('#profileLevelProgress .progress-text');
        if (profile.levelProgress !== null && profile.levelProgress !== undefined) {
            if (progressFill) progressFill.style.width = `${profile.levelProgress}%`;
            if (progressText) progressText.textContent = `${profile.levelProgress.toFixed(1)}% al siguiente nivel`;
        } else {
            if (progressFill) progressFill.style.width = `100%`;
            if (progressText) progressText.textContent = `Nivel máximo alcanzado`;
        }
    }

    // Siguiente nivel
    const nextLevelDiv = document.getElementById('profileNextLevel');
    if (profile.nextLevel) {
        nextLevelDiv.innerHTML = `
            <span class="next-level-label">Próximo nivel:</span>
            <span class="next-level-name">${profile.nextLevelDisplayName || profile.nextLevel}</span>
            <span class="next-level-points">(faltan ${profile.pointsToNextLevel || 0} pts)</span>
        `;
    } else {
        nextLevelDiv.innerHTML = `
            <span class="next-level-label" style="display:flex; align-items:center; gap:6px;">
                🏆 <strong>¡Sos Jurado Experto!</strong>
            </span>
            <span class="next-level-points" style="margin-top:4px; line-height:1.5;">
                El nivel más alto de Cinemarketer. Tu pasión y dedicación al cine te trajeron hasta acá. ¡Seguí disfrutando de los beneficios exclusivos!
            </span>
        `;
    }
    }

// ==============================================
// ACTUALIZAR NOMBRE DEL AVATAR EN EL BADGE
// (llamado desde guardarAvatar, ANTES de cerrar el modal)
// ==============================================
function actualizarNombreAvatarEnBadge(nuevoNombre) {
    const levelBadge = document.getElementById('profileLevelBadge');
    if (!levelBadge) return;

    const avatarNameSpan = levelBadge.querySelector('.avatar-name');
    if (nuevoNombre) {
        if (avatarNameSpan) {
            avatarNameSpan.textContent = `· ${nuevoNombre}`;
        } else {
            levelBadge.insertAdjacentHTML('beforeend',
                `<span class="avatar-name">· ${nuevoNombre}</span>`);
        }
    } else {
        // Avatar personalizado — sin nombre
        if (avatarNameSpan) avatarNameSpan.remove();
    }
}

function getLevelEmoji(level) {
    const emojis = {
        'AMATEUR': '🟢',
        'COLABORADOR': '🔵',
        'CRITICO': '🟣',
        'JURADO_EXPERTO': '🏆'
    };
    return emojis[level] || '🟢';
}

// ==============================================
// SELECTOR DE AVATAR
// ==============================================

let avatarSeleccionado = null;
let avatarCategoriaActual = 'predefinidos';

// ==============================================
// FILE INPUT - PREVIEW DE IMAGEN
// ==============================================
function inicializarFileInput() {
    const fileInput = document.getElementById('avatarFileInput');
    if (!fileInput || fileInput._listenerAttached) return;
    fileInput._listenerAttached = true;

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const errorEl = document.getElementById('avatarError');

        if (!file.type.startsWith('image/')) {
            errorEl.textContent = 'Solo se permiten archivos de imagen (JPG, PNG, WEBP)';
            errorEl.style.display = 'block';
            this.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            errorEl.textContent = 'La imagen no puede superar los 5MB';
            errorEl.style.display = 'block';
            this.value = '';
            return;
        }

        errorEl.style.display = 'none';

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('avatarPreview');
            const img = document.getElementById('avatarPreviewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}

window.abrirSelectorAvatar = function() {
    avatarSeleccionado = null;
    document.getElementById('avatarError').style.display = 'none';

    // Resetear tabs visualmente ANTES de abrir
    document.querySelectorAll('.avatar-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.avatar-tab:first-child').classList.add('active');

    // Resetear vista de personalizado
    document.getElementById('avatarFileInput').value = '';
    document.getElementById('avatarPreview').style.display = 'none';

    document.getElementById('modalSelectorAvatar').style.display = 'flex';

    // Cargar predefinidos pasando el tab ya activo
    const tabPredefinidos = document.querySelector('.avatar-tab:first-child');
    window.cambiarCategoriaAvatar('predefinidos', tabPredefinidos);
};

window.cerrarSelectorAvatar = function() {
    document.getElementById('modalSelectorAvatar').style.display = 'none';
};

window.cambiarCategoriaAvatar = function(categoria, btn) {
    document.querySelectorAll('.avatar-tab').forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');

    avatarCategoriaActual = categoria;

    if (categoria === 'predefinidos') {
        document.getElementById('avatarPredefinidos').style.display = 'grid';
        document.getElementById('avatarPersonalizado').style.display = 'none';
        cargarAvataresPredefinidos();
    } else {
        document.getElementById('avatarPredefinidos').style.display = 'none';
        document.getElementById('avatarPersonalizado').style.display = 'block';

        // Inicializar listener (por si el input fue reemplazado)
        inicializarFileInput();

        // Restaurar preview si ya había una imagen seleccionada
        const fileInput = document.getElementById('avatarFileInput');
        const preview = document.getElementById('avatarPreview');
        const previewImg = document.getElementById('avatarPreviewImg');
        if (fileInput?.files[0] && preview && previewImg) {
            const reader = new FileReader();
            reader.onload = e => {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    }
};

async function cargarAvataresPredefinidos() {
    const grid = document.getElementById('avatarPredefinidos');
    grid.innerHTML = '<div class="avatar-loading"><i class="fas fa-spinner fa-spin"></i> Cargando avatares...</div>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/avatars/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar avatares');

        const avatares = await response.json();

        if (avatares.length === 0) {
            grid.innerHTML = '<div class="avatar-loading">No hay avatares disponibles</div>';
            return;
        }

        grid.innerHTML = avatares.map(avatar => `
            <div class="avatar-item" onclick="window.seleccionarAvatar(${avatar.id}, this)">
                <img src="${avatar.imageUrl}" alt="${avatar.name}">
                <span class="avatar-item-name">${avatar.name}</span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error cargando avatares:', error);
        grid.innerHTML = '<div class="avatar-loading">Error al cargar avatares</div>';
    }
}

window.seleccionarAvatar = function(avatarId, elemento) {
    document.querySelectorAll('.avatar-item').forEach(item => item.classList.remove('selected'));
    elemento.classList.add('selected');
    avatarSeleccionado = avatarId;
};

function mostrarErrorAvatar(mensaje) {
    const errorEl = document.getElementById('avatarError');
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
}

window.guardarAvatar = async function() {
    const errorEl = document.getElementById('avatarError');
    errorEl.style.display = 'none';

    const btn    = document.getElementById('btnGuardarAvatar');
    const texto  = document.getElementById('btnGuardarAvatarTexto');
    const loader = document.getElementById('btnGuardarAvatarLoader');

    btn.disabled = true;
    texto.style.display  = 'none';
    loader.style.display = 'inline-block';

    try {
        const token = localStorage.getItem('token');
        let response;

        if (avatarCategoriaActual === 'predefinidos') {
            if (!avatarSeleccionado) throw new Error('Seleccioná un avatar');

            response = await fetch(`${CONFIG.API_URL}/users/me/avatar/${avatarSeleccionado}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

        } else {
            const fileInput = document.getElementById('avatarFileInput');
            const file = fileInput.files[0];
            if (!file) throw new Error('Seleccioná una imagen');

            const formData = new FormData();
            formData.append('file', file);

            response = await fetch(`${CONFIG.API_URL}/users/me/avatar/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
        }

        const data = await response.json();

        if (response.ok) {
            // 1. Actualizar imagen en el perfil
            const avatarContainer = document.getElementById('profileAvatar');
            avatarContainer.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" class="avatar-img">`;

            // 2. Actualizar avatar en el header del dashboard
            const headerAvatar = document.getElementById('headerAvatar');
            if (headerAvatar) {
                headerAvatar.innerHTML = `<img src="${data.avatarUrl}" alt="Avatar" class="avatar-img">`;
            }

            // 3. Capturar nombre del avatar ANTES de cerrar el modal
            let nuevoNombre = null;
            if (avatarCategoriaActual === 'predefinidos' && avatarSeleccionado) {
                const itemSeleccionado = document.querySelector('.avatar-item.selected .avatar-item-name');
                if (itemSeleccionado) nuevoNombre = itemSeleccionado.textContent.trim();
            }

            // 4. Cerrar modal
            window.cerrarSelectorAvatar();

            // 5. Actualizar nombre en el badge (después de cerrar está bien porque el badge está fuera del modal)
            actualizarNombreAvatarEnBadge(nuevoNombre);

            // 6. Toast
            mostrarToast(data.message || 'Avatar actualizado', 'success');

        } else {
            throw new Error(data.message || 'Error al guardar avatar');
        }

    } catch (error) {
        console.error('Error guardando avatar:', error);
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        texto.style.display  = 'inline';
        loader.style.display = 'none';
    }
};

// ==============================================
// EDICIÓN DE PERFIL
// ==============================================

const CAMPOS_EDICION = {
    name:  { titulo: 'Editar nombre completo', label: 'Nombre completo',    tipo: 'text',  spanId: 'userFullName' },
    email: { titulo: 'Editar email',           label: 'Correo electrónico', tipo: 'email', spanId: 'userEmail'    },
    phone: { titulo: 'Editar teléfono',        label: 'Teléfono',           tipo: 'tel',   spanId: 'userPhone'    }
};

const PHONE_PREFIXES_CUENTA = [
    { code: '+54',  flag: '🇦🇷', name: 'Argentina',      max: 10 },
    { code: '+591', flag: '🇧🇴', name: 'Bolivia',         max: 8  },
    { code: '+55',  flag: '🇧🇷', name: 'Brasil',          max: 11 },
    { code: '+56',  flag: '🇨🇱', name: 'Chile',           max: 9  },
    { code: '+57',  flag: '🇨🇴', name: 'Colombia',        max: 10 },
    { code: '+506', flag: '🇨🇷', name: 'Costa Rica',      max: 8  },
    { code: '+53',  flag: '🇨🇺', name: 'Cuba',            max: 8  },
    { code: '+593', flag: '🇪🇨', name: 'Ecuador',         max: 9  },
    { code: '+503', flag: '🇸🇻', name: 'El Salvador',     max: 8  },
    { code: '+502', flag: '🇬🇹', name: 'Guatemala',       max: 8  },
    { code: '+509', flag: '🇭🇹', name: 'Haití',           max: 8  },
    { code: '+504', flag: '🇭🇳', name: 'Honduras',        max: 8  },
    { code: '+52',  flag: '🇲🇽', name: 'México',          max: 10 },
    { code: '+505', flag: '🇳🇮', name: 'Nicaragua',       max: 8  },
    { code: '+507', flag: '🇵🇦', name: 'Panamá',          max: 8  },
    { code: '+595', flag: '🇵🇾', name: 'Paraguay',        max: 9  },
    { code: '+51',  flag: '🇵🇪', name: 'Perú',            max: 9  },
    { code: '+598', flag: '🇺🇾', name: 'Uruguay',         max: 9  },
    { code: '+58',  flag: '🇻🇪', name: 'Venezuela',       max: 10 },
    { code: '+34',  flag: '🇪🇸', name: 'España',          max: 9  },
    { code: '+1',   flag: '🇺🇸', name: 'Estados Unidos',  max: 10 },
    { code: '+44',  flag: '🇬🇧', name: 'Reino Unido',     max: 10 },
    { code: '+33',  flag: '🇫🇷', name: 'Francia',         max: 9  },
    { code: '+49',  flag: '🇩🇪', name: 'Alemania',        max: 11 },
    { code: '+39',  flag: '🇮🇹', name: 'Italia',          max: 10 },
    { code: '+351', flag: '🇵🇹', name: 'Portugal',        max: 9  },
    { code: '+91',  flag: '🇮🇳', name: 'India',           max: 10 },
    { code: '+61',  flag: '🇦🇺', name: 'Australia',       max: 9  },
];

let selectedPrefixCuenta = PHONE_PREFIXES_CUENTA[0];
let campoActual = null;

function parsearTelefono(valorCompleto) {
    const sorted = [...PHONE_PREFIXES_CUENTA].sort((a, b) => b.code.length - a.code.length);
    for (const p of sorted) {
        if (valorCompleto.startsWith(p.code)) {
            return { prefix: p, numero: valorCompleto.slice(p.code.length).trim() };
        }
    }
    return { prefix: PHONE_PREFIXES_CUENTA[0], numero: valorCompleto };
}

function renderPrefixListCuenta(filter = '') {
    const list = document.getElementById('cuentaPhonePrefixList');
    if (!list) return;
    const filtered = PHONE_PREFIXES_CUENTA.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) || p.code.includes(filter)
    );
    list.innerHTML = filtered.map(p => `
        <div class="phone-prefix-option" data-code="${p.code}">
            <span>${p.flag}</span>
            <span class="option-name">${p.name}</span>
            <span class="option-code">${p.code}</span>
        </div>
    `).join('');

    list.querySelectorAll('.phone-prefix-option').forEach(el => {
        el.addEventListener('click', function() {
            const code = this.dataset.code;
            selectedPrefixCuenta = PHONE_PREFIXES_CUENTA.find(p => p.code === code);
            document.getElementById('cuentaPhonePrefixFlag').textContent = selectedPrefixCuenta.flag;
            document.getElementById('cuentaPhonePrefixCode').textContent = selectedPrefixCuenta.code;
            document.getElementById('cuentaPhoneNumber').maxLength = selectedPrefixCuenta.max;
            document.getElementById('cuentaPhonePrefixDropdown').style.display = 'none';
        });
    });
}

window.abrirEdicion = function(campo) {
    campoActual = campo;
    const config = CAMPOS_EDICION[campo];
    const valorActual = document.getElementById(config.spanId).textContent;

    document.getElementById('modalEdicionTitulo').textContent = config.titulo;
    document.getElementById('modalEdicionError').style.display = 'none';

    if (campo === 'phone') {
        document.getElementById('modalEdicionInput').style.display = 'none';
        document.getElementById('modalEdicionLabel').style.display = 'none';
        document.getElementById('modalPhoneWrapper').style.display = 'block';

        const parsed = parsearTelefono(valorActual === '—' ? '' : valorActual);
        selectedPrefixCuenta = parsed.prefix;
        document.getElementById('cuentaPhonePrefixFlag').textContent = selectedPrefixCuenta.flag;
        document.getElementById('cuentaPhonePrefixCode').textContent = selectedPrefixCuenta.code;
        document.getElementById('cuentaPhoneNumber').value = parsed.numero;
        document.getElementById('cuentaPhoneNumber').maxLength = selectedPrefixCuenta.max;

        renderPrefixListCuenta();
        setTimeout(() => document.getElementById('cuentaPhoneNumber').focus(), 50);
    } else {
        document.getElementById('modalEdicionInput').style.display = 'block';
        document.getElementById('modalEdicionLabel').style.display = 'block';
        document.getElementById('modalPhoneWrapper').style.display = 'none';

        document.getElementById('modalEdicionLabel').textContent = config.label;
        const input = document.getElementById('modalEdicionInput');
        input.type  = config.tipo;
        input.value = valorActual === '—' ? '' : valorActual;
        setTimeout(() => input.focus(), 50);
    }

    document.getElementById('modalEdicion').style.display = 'flex';
};

window.cerrarEdicion = function() {
    document.getElementById('modalEdicion').style.display = 'none';
    campoActual = null;
};

window.guardarEdicion = async function() {
    const errorEl = document.getElementById('modalEdicionError');
    errorEl.style.display = 'none';

    let valor;

    if (campoActual === 'phone') {
        const numero = document.getElementById('cuentaPhoneNumber').value.trim();
        if (!numero || numero.length < 6) {
            mostrarErrorEdicion('El teléfono debe tener al menos 6 dígitos.');
            return;
        }
        if (!/^\d+$/.test(numero)) {
            mostrarErrorEdicion('El teléfono solo debe contener números.');
            return;
        }
        valor = `${selectedPrefixCuenta.code} ${numero}`;
    } else {
        valor = document.getElementById('modalEdicionInput').value.trim();

        if (!valor) {
            mostrarErrorEdicion('Este campo no puede estar vacío.');
            return;
        }

        if (campoActual === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(valor)) {
                mostrarErrorEdicion('Ingresá un email con formato válido.');
                return;
            }
        }
    }

    const btn = document.getElementById('btnGuardarTexto').parentElement;
    document.getElementById('btnGuardarTexto').style.display = 'none';
    document.getElementById('btnGuardarLoader').style.display = 'inline-block';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        const body  = {};
        body[campoActual] = valor;

        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            const config = CAMPOS_EDICION[campoActual];

            if (data.message === 'email_changed') {
                window.cerrarEdicion();
                mostrarAvisoRelogin(data.email);
                return;
            }

            document.getElementById(config.spanId).textContent = valor;
            if (campoActual === 'name') {
                document.getElementById('userName').textContent = valor;
            }
            window.cerrarEdicion();
        } else {
            if (response.status === 409 || (data.message && data.message.toLowerCase().includes('email'))) {
                mostrarErrorEdicion(
                    'Este email ya está siendo utilizado por otra cuenta. Si creés que es un error o alguien está usando tu mail indebidamente, no dudes en enviarnos un mensaje en la sección de Ayuda (menú superior).'
                );
            } else {
                mostrarErrorEdicion(data.message || 'Ocurrió un error al guardar. Intentá nuevamente.');
            }
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        mostrarErrorEdicion('Error de conexión con el servidor.');
    } finally {
        document.getElementById('btnGuardarTexto').style.display = 'inline';
        document.getElementById('btnGuardarLoader').style.display = 'none';
        btn.disabled = false;
    }
};

function mostrarErrorEdicion(mensaje) {
    const errorEl = document.getElementById('modalEdicionError');
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
}

function mostrarAvisoRelogin(nuevoEmail) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.5);
        display:flex; align-items:center; justify-content:center; z-index:99999;
    `;
    overlay.innerHTML = `
        <div style="background:white; border-radius:16px; padding:2rem; max-width:400px;
                    margin:1rem; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.3);">
            <div style="width:64px;height:64px;background:#fff3cd;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
                <i class="fas fa-envelope-open-text" style="color:#e89c00;font-size:1.6rem;"></i>
            </div>
            <h3 style="color:#333;margin-bottom:0.75rem;font-size:1.2rem;">¡Verificá tu nuevo email!</h3>
            <p style="color:#555;font-size:0.9rem;line-height:1.6;margin-bottom:0.5rem;">
                Te enviamos un email de confirmación a:
            </p>
            <p style="color:#e50914;font-weight:700;font-size:1rem;margin-bottom:1rem;">${nuevoEmail}</p>
            <p style="color:#777;font-size:0.85rem;line-height:1.5;margin-bottom:1.5rem;">
                Revisá tu bandeja de entrada y confirmá tu nueva dirección de correo antes de volver a iniciar sesión.
            </p>
            <button onclick="API.logout()" style="
                background:#e50914; color:white; border:none; border-radius:10px;
                padding:0.85rem 2rem; font-size:1rem; font-weight:600; cursor:pointer; width:100%;
            ">Entendido, ir al login</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Cerrar con ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        window.cerrarEdicion();
        window.cerrarEliminarCuenta();
        window.cerrarCambiarPassword();
        window.cerrarSelectorAvatar();
    if (typeof window.cerrarDetallePlan === 'function') window.cerrarDetallePlan();
            if (typeof window.cerrarCancelarSuscripcion === 'function') window.cerrarCancelarSuscripcion();
        }
});

// ==============================================
// ELIMINAR CUENTA
// ==============================================

window.abrirEliminarCuenta = function() {
    document.getElementById('inputEliminarPassword').value = '';
    document.getElementById('eliminarError').style.display = 'none';
    document.getElementById('modalEliminarCuenta').style.display = 'flex';
    setTimeout(() => document.getElementById('inputEliminarPassword').focus(), 50);
};

window.cerrarEliminarCuenta = function() {
    document.getElementById('modalEliminarCuenta').style.display = 'none';
};

window.confirmarEliminarCuenta = async function() {
    const password = document.getElementById('inputEliminarPassword').value;
    const errorEl  = document.getElementById('eliminarError');
    errorEl.style.display = 'none';

    if (!password) {
        errorEl.textContent = 'Ingresá tu contraseña para confirmar.';
        errorEl.style.display = 'block';
        return;
    }

    const btn    = document.getElementById('btnEliminarConfirmar');
    const texto  = document.getElementById('btnEliminarTexto');
    const loader = document.getElementById('btnEliminarLoader');

    btn.disabled = true;
    texto.style.display  = 'none';
    loader.style.display = 'inline-block';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/users/me`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            window.cerrarEliminarCuenta();
            localStorage.clear();
            mostrarCuentaEliminada();
        } else if (response.status === 401) {
            errorEl.textContent = 'La contraseña ingresada es incorrecta.';
            errorEl.style.display = 'block';
        } else {
            errorEl.textContent = data.message || 'Ocurrió un error. Intentá nuevamente.';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        errorEl.textContent = 'Error de conexión con el servidor.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        texto.style.display  = 'inline';
        loader.style.display = 'none';
    }
};

function mostrarCuentaEliminada() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.6);
        display:flex; align-items:center; justify-content:center; z-index:99999;
    `;
    overlay.innerHTML = `
        <div style="background:white; border-radius:16px; padding:2.5rem; max-width:380px;
                    margin:1rem; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.3);">
            <div style="width:70px;height:70px;background:#e8f5e9;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
                <i class="fas fa-check-circle" style="color:#4caf50;font-size:2rem;"></i>
            </div>
            <h3 style="color:#333;margin-bottom:0.75rem;">Cuenta eliminada</h3>
            <p style="color:#666;font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem;">
                Tu cuenta y todos tus datos han sido eliminados correctamente. ¡Hasta pronto!
            </p>
            <button onclick="window.location.href='login.html'" style="
                background:#e50914; color:white; border:none; border-radius:10px;
                padding:0.85rem 2rem; font-size:1rem; font-weight:600; cursor:pointer; width:100%;
            ">Volver al inicio</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ==============================================
// CAMBIAR CONTRASEÑA
// ==============================================

window.togglePassVis = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!input || !icon) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
};

window.abrirCambiarPassword = function() {
    document.getElementById('inputPasswordActual').value    = '';
    document.getElementById('inputPasswordNueva').value     = '';
    document.getElementById('inputPasswordConfirmar').value = '';
    document.getElementById('cambiarPassError').style.display = 'none';
    document.getElementById('modalCambiarPassword').style.display = 'flex';
    setTimeout(() => document.getElementById('inputPasswordActual').focus(), 50);
};

window.cerrarCambiarPassword = function() {
    document.getElementById('modalCambiarPassword').style.display = 'none';
};

window.confirmarCambiarPassword = async function() {
    const actual    = document.getElementById('inputPasswordActual').value;
    const nueva     = document.getElementById('inputPasswordNueva').value;
    const confirmar = document.getElementById('inputPasswordConfirmar').value;
    const errorEl   = document.getElementById('cambiarPassError');
    errorEl.style.display = 'none';

    if (!actual) {
        errorEl.textContent = 'Ingresá tu contraseña actual.';
        errorEl.style.display = 'block';
        return;
    }

    function validarPassword(pass) {
        if (pass.length < 8)                    return 'La contraseña debe tener al menos 8 caracteres.';
        if (!/[A-Z]/.test(pass))                return 'La contraseña debe contener al menos una letra mayúscula.';
        if (!/[0-9]/.test(pass))                return 'La contraseña debe contener al menos un número.';
        if (/[^A-Za-z0-9@!\-_]/.test(pass))    return 'Solo se permiten letras, números y los caracteres @ ! - _';
        return null;
    }

    const passError = validarPassword(nueva);
    if (passError) {
        errorEl.textContent = passError;
        errorEl.style.display = 'block';
        return;
    }
    if (nueva !== confirmar) {
        errorEl.textContent = 'Las contraseñas no coinciden.';
        errorEl.style.display = 'block';
        return;
    }
    if (nueva === actual) {
        errorEl.textContent = 'La nueva contraseña debe ser diferente a la actual.';
        errorEl.style.display = 'block';
        return;
    }

    const btn    = document.getElementById('btnCambiarPassGuardar');
    const texto  = document.getElementById('btnCambiarPassTexto');
    const loader = document.getElementById('btnCambiarPassLoader');
    btn.disabled = true;
    texto.style.display  = 'none';
    loader.style.display = 'inline-block';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_URL}/users/me/password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: actual, newPassword: nueva })
        });

        if (response.ok) {
            window.cerrarCambiarPassword();

            const aviso = document.createElement('div');
            aviso.style.cssText = `
                position:fixed; inset:0; background:rgba(0,0,0,0.5);
                display:flex; align-items:center; justify-content:center; z-index:100000;
            `;
            aviso.innerHTML = `
                <div style="background:white; border-radius:16px; padding:2rem; max-width:360px;
                            margin:1rem; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.3);">
                    <div style="width:64px;height:64px;background:#e8f5e9;border-radius:50%;
                                display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                        <i class="fas fa-check-circle" style="color:#4caf50;font-size:2rem;"></i>
                    </div>
                    <h3 style="color:#333;margin-bottom:0.75rem;">¡Contraseña actualizada!</h3>
                    <p style="color:#666;font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem;">
                        Tu contraseña fue cambiada correctamente.
                    </p>
                    <button onclick="this.closest('div[style*=\\'fixed\\']').remove()" style="
                        background:#e50914;color:white;border:none;border-radius:10px;
                        padding:0.75rem 2rem;font-size:1rem;font-weight:600;cursor:pointer;width:100%;
                    ">Aceptar</button>
                </div>
            `;
            document.body.appendChild(aviso);
        } else {
            let data = null;
            try { data = await response.json(); } catch(e) {}

            if (response.status === 401 || response.status === 403) {
                errorEl.textContent = 'La contraseña actual es incorrecta.';
            } else if (response.status === 400) {
                errorEl.textContent = data?.message || 'La contraseña no cumple los requisitos.';
            } else {
                errorEl.textContent = data?.message || 'Ocurrió un error. Intentá nuevamente.';
            }
            errorEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        errorEl.textContent = 'Error de conexión con el servidor.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        texto.style.display  = 'inline';
        loader.style.display = 'none';
    }
};

// ==============================================
// TOAST
// ==============================================
function mostrarToast(mensaje, tipo = 'info') {
    // Si existe la función global toast del dashboard, usarla
    if (typeof toast === 'function') {
        toast(mensaje, tipo);
        return;
    }

    // Fallback: crear toast propio
    const toastEl = document.createElement('div');
    toastEl.style.cssText = `
        position:fixed; bottom:2rem; right:2rem; background:#333; color:white;
        padding:1rem 1.5rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15);
        z-index:99999;
    `;
    if (tipo === 'success') toastEl.style.background = '#2e7d32';
    if (tipo === 'error')   toastEl.style.background = '#c62828';
    toastEl.textContent = mensaje;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3500);
}

// El module-loader llama a esta función cuando el HTML ya está en el DOM
window['init_mi-cuenta'] = function() {

    // Toggle contraseña modal eliminar cuenta
    const toggle = document.getElementById('toggleEliminarPassword');
    if (toggle) {
        toggle.addEventListener('click', function() {
            const input = document.getElementById('inputEliminarPassword');
            const icon  = this.querySelector('i');
            input.type  = input.type === 'password' ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Dropdown prefijo teléfono en modal de edición
    const prefixBtn = document.getElementById('cuentaPhonePrefixBtn');
    if (prefixBtn) {
        prefixBtn.addEventListener('click', function() {
            const dd = document.getElementById('cuentaPhonePrefixDropdown');
            dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
            if (dd.style.display === 'block') {
                document.getElementById('cuentaPhonePrefixSearch').value = '';
                renderPrefixListCuenta('');
                setTimeout(() => document.getElementById('cuentaPhonePrefixSearch').focus(), 50);
            }
        });

        document.getElementById('cuentaPhonePrefixSearch').addEventListener('input', function() {
            renderPrefixListCuenta(this.value);
        });

        document.addEventListener('click', function(e) {
            const wrapper = document.querySelector('#modalPhoneWrapper .phone-wrapper');
            const dd = document.getElementById('cuentaPhonePrefixDropdown');
            if (wrapper && !wrapper.contains(e.target) && dd) {
                dd.style.display = 'none';
            }
        });

        document.getElementById('cuentaPhoneNumber').addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    window.loadProfile();
};