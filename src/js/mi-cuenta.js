// ==============================================
// mi-cuenta.js -  Módulo de perfil de usuario
// ==============================================

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

        document.getElementById('userName').textContent         = profile.name || '';
        document.getElementById('userFullName').textContent     = profile.name  || '—';
        document.getElementById('userEmail').textContent        = profile.email || '';
        document.getElementById('userDni').textContent          = profile.dni   || '—';
        document.getElementById('userPhone').textContent        = profile.phone || '—';
        document.getElementById('userBirthDate').textContent    = profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('es-AR') : '—';
        document.getElementById('userSexo').textContent         = profile.sexo === 'M' ? 'Masculino' : profile.sexo === 'F' ? 'Femenino' : profile.sexo === 'O' ? 'Otro' : '—';
        document.getElementById('userProvincia').textContent    = profile.provincia || '—';
        document.getElementById('userLocalidad').textContent    = profile.localidad || '—';
        // Puntos — los detalles se muestran en el módulo Mis Puntos
        const redemptionsEl = document.getElementById('redemptionsCount');
                if (redemptionsEl) redemptionsEl.textContent = profile.commentsCount ?? 0;
                const recomendadasEl = document.getElementById('recomendadasCount');
                if (recomendadasEl) recomendadasEl.textContent = profile.recommendationsCount ?? 0;
                const puntosEl = document.getElementById('puntosCount');
                if (puntosEl) puntosEl.textContent = profile.merecePuntosCount ?? 0;
                const reviewsSpan = document.getElementById('reviewsCountFormatted');
                        if (reviewsSpan) reviewsSpan.textContent = formatearVotos(profile.reviewsCount ?? 0);

        document.getElementById('emailVerified').innerHTML = profile.emailVerified ? '✅ Sí' : '❌ No';

        if (profile.createdAt) {
            const joinDate = new Date(profile.createdAt);
            document.getElementById('memberSince').textContent =
                `Miembro desde ${joinDate.toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })}`;
        }

        if (profile.lastLoginAt) {
            const lastLogin = new Date(profile.lastLoginAt);
            document.getElementById('lastLogin').textContent = lastLogin.toLocaleString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
        } else {
            document.getElementById('lastLogin').textContent = 'Primer inicio de sesión';
        }

        window._perfilNivel = profile.level || 'AMATEUR';
        window._perfilData  = profile;
        cargarAvatarYNivel(profile);

        // Guardar ID para perfil público
        if (profile.id) localStorage.setItem('userId', profile.id);

        // Resetear cache y cargar Mi red
        _siguiendoCache = [];
        _seguidoresCache = [];
        _redTab = 'siguiendo';
        cargarMiRed();

        // Detectar si es cuenta Google y ajustar campo contraseña
        const isGoogleAccount = profile.googleId !== null && profile.googleId !== undefined;
        const btnCambiarPassword = document.getElementById('btnCambiarPassword');
        const passwordDisplay = document.getElementById('passwordDisplay');

        if (isGoogleAccount) {
            if (btnCambiarPassword) btnCambiarPassword.style.display = 'none';
            if (passwordDisplay) {
                passwordDisplay.innerHTML = `
                    <span style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:#666;">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        Autenticado con Google
                    </span>
                `;
            }
        }

    if (typeof window.initSuscripcion === 'function') {
        window.initSuscripcion();
    }

    } catch (error) {
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
            <span class="level-label">NIVEL:</span>
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
    name:      { titulo: 'Editar nombre completo',     label: 'Nombre completo',    tipo: 'text',     spanId: 'userFullName'  },
    email:     { titulo: 'Editar email',               label: 'Correo electrónico', tipo: 'email',    spanId: 'userEmail'     },
    phone:     { titulo: 'Editar teléfono',            label: 'Teléfono',           tipo: 'tel',      spanId: 'userPhone'     },
    birthDate: { titulo: 'Editar fecha de nacimiento', label: 'Fecha de nacimiento',tipo: 'date',     spanId: 'userBirthDate' },
    sexo:      { titulo: 'Editar sexo',                label: 'Sexo',               tipo: 'select',   spanId: 'userSexo',     opciones: [{v:'M',l:'Masculino'},{v:'F',l:'Femenino'},{v:'O',l:'Otro'}] },
    provincia: { titulo: 'Editar provincia',           label: 'Provincia',          tipo: 'provincia',spanId: 'userProvincia' },
    localidad: { titulo: 'Editar localidad',           label: 'Localidad',          tipo: 'localidad',spanId: 'userLocalidad' }
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

const _PROVINCIAS = ['Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán','Ciudad Autónoma de Buenos Aires'];

const _LOCALIDADES = {
    'Buenos Aires': ['La Plata','Mar del Plata','Bahía Blanca','Quilmes','Lanús','Lomas de Zamora','Almirante Brown','Berazategui','Florencio Varela','Tigre','San Isidro','Vicente López','General San Martín','Tres de Febrero','Morón','Hurlingham','Ituzaingó','Merlo','Moreno','General Rodríguez','Luján','Campana','Zárate','San Nicolás','Tandil','Azul','Olavarría','Necochea','Junín','Pergamino','Pehuajó','Trenque Lauquen','Chivilcoy','Mercedes','Lobos','Chascomús','Dolores','Pinamar','Villa Gesell','Miramar'],
    'Córdoba': ['Córdoba','Villa Carlos Paz','Río Cuarto','San Francisco','Villa María','Alta Gracia','Jesús María','Bell Ville','Río Tercero','Cosquín','La Falda','Cruz del Eje','Laboulaye','Marcos Juárez','Villa Dolores'],
    'Santa Fe': ['Rosario','Santa Fe','Rafaela','Venado Tuerto','Santo Tomé','Reconquista','Villa Constitución','Casilda','Cañada de Gómez','Esperanza','Las Rosas','Firmat'],
    'Mendoza': ['Mendoza','San Rafael','Godoy Cruz','Luján de Cuyo','Maipú','Guaymallén','Las Heras','Rivadavia','General Alvear','Malargüe','Tunuyán'],
    'Tucumán': ['San Miguel de Tucumán','Yerba Buena','Tafí Viejo','Concepción','Aguilares','Banda del Río Salí','Famailla'],
    'Salta': ['Salta','San Ramón de la Nueva Orán','Tartagal','Rosario de la Frontera','Metán','Cafayate'],
    'Misiones': ['Posadas','Oberá','Eldorado','Puerto Iguazú','Apóstoles','Leandro N. Alem'],
    'Chaco': ['Resistencia','Presidencia Roque Sáenz Peña','Villa Ángela','Charata','General San Martín'],
    'Entre Ríos': ['Paraná','Concordia','Gualeguaychú','Concepción del Uruguay','Colón','Victoria','La Paz'],
    'Corrientes': ['Corrientes','Goya','Paso de los Libres','Mercedes','Curuzú Cuatiá'],
    'Jujuy': ['San Salvador de Jujuy','Palpalá','San Pedro de Jujuy','Libertador General San Martín','Humahuaca'],
    'Río Negro': ['Viedma','San Carlos de Bariloche','Cipolletti','Allen','Roca','El Bolsón'],
    'Neuquén': ['Neuquén','San Martín de los Andes','Zapala','Cutral Có','Centenario'],
    'Formosa': ['Formosa','Clorinda','Pirané','El Colorado'],
    'La Pampa': ['Santa Rosa','General Pico','Realicó','Eduardo Castex'],
    'San Juan': ['San Juan','Rivadavia','Pocito','Chimbas','Rawson','Caucete'],
    'San Luis': ['San Luis','Villa Mercedes','Merlo','Quines'],
    'Santiago del Estero': ['Santiago del Estero','La Banda','Termas de Río Hondo','Añatuya','Frías'],
    'Catamarca': ['San Fernando del Valle de Catamarca','Andalgalá','Belén','Tinogasta'],
    'La Rioja': ['La Rioja','Chilecito','Aimogasta','Chepes'],
    'Chubut': ['Rawson','Comodoro Rivadavia','Puerto Madryn','Trelew','Esquel','Rada Tilly'],
    'Santa Cruz': ['Río Gallegos','Caleta Olivia','El Calafate','Pico Truncado','Puerto Deseado'],
    'Tierra del Fuego': ['Ushuaia','Río Grande','Tolhuin'],
    'Ciudad Autónoma de Buenos Aires': ['Palermo','Belgrano','Caballito','Flores','San Telmo','La Boca','Recoleta','Almagro','Boedo','Villa Crespo','Núñez','Colegiales','Chacarita','Villa del Parque','Liniers','Mataderos','Parque Patricios','Barracas','San Cristóbal','Monserrat']
};

window.abrirEdicion = function(campo) {
    const config = CAMPOS_EDICION[campo];
    if (!config) return;

    campoActual = campo;

    document.getElementById('modalEdicionTitulo').textContent = config.titulo;
    document.getElementById('modalEdicionLabel').textContent  = config.label;
    document.getElementById('modalEdicionError').style.display = 'none';

    // Ocultar inputs por defecto
    document.getElementById('modalEdicionInput').style.display = 'none';
    document.getElementById('modalPhoneWrapper').style.display = 'none';

    // Limpiar selects previos
    document.querySelectorAll('.select-edicion-dinamico').forEach(el => el.remove());

    if (config.tipo === 'tel') {
        document.getElementById('modalPhoneWrapper').style.display = 'block';
        const valorActual = document.getElementById(config.spanId).textContent;
        const parsed = parsearTelefono(valorActual === '—' ? '' : valorActual);
        selectedPrefixCuenta = parsed.prefix;
        document.getElementById('cuentaPhonePrefixFlag').textContent = selectedPrefixCuenta.flag;
        document.getElementById('cuentaPhonePrefixCode').textContent = selectedPrefixCuenta.code;
        document.getElementById('cuentaPhoneNumber').value = parsed.numero;
        document.getElementById('cuentaPhoneNumber').maxLength = selectedPrefixCuenta.max;
        renderPrefixListCuenta();
        setTimeout(() => document.getElementById('cuentaPhoneNumber').focus(), 50);
    } else if (config.tipo === 'select') {
        const sel = document.createElement('select');
        sel.id = 'modalEdicionSelect';
        sel.className = 'modal-edicion-input select-edicion-dinamico';
        sel.innerHTML = `<option value="">Seleccionar...</option>` +
            config.opciones.map(o => `<option value="${o.v}">${o.l}</option>`).join('');
        document.getElementById('modalEdicionInput').insertAdjacentElement('afterend', sel);
    } else if (config.tipo === 'provincia') {
        const sel = document.createElement('select');
        sel.id = 'modalEdicionSelect';
        sel.className = 'modal-edicion-input select-edicion-dinamico';
        const provinciaActual = document.getElementById('userProvincia').textContent;
        sel.innerHTML = `<option value="">Seleccioná una provincia...</option>` +
            _PROVINCIAS.map(p => `<option value="${p}" ${p === provinciaActual ? 'selected' : ''}>${p}</option>`).join('');
        document.getElementById('modalEdicionInput').insertAdjacentElement('afterend', sel);
    } else if (config.tipo === 'localidad') {
        const provinciaActual = document.getElementById('userProvincia').textContent;
        if (!provinciaActual || provinciaActual === '—') {
            alert('Primero seleccioná una provincia');
            return;
        }
        const sel = document.createElement('select');
        sel.id = 'modalEdicionSelect';
        sel.className = 'modal-edicion-input select-edicion-dinamico';
        const locs = _LOCALIDADES[provinciaActual] || [];
        sel.innerHTML = `<option value="">Seleccioná una localidad...</option>` +
            locs.map(l => `<option value="${l}">${l}</option>`).join('');
        document.getElementById('modalEdicionInput').insertAdjacentElement('afterend', sel);
    } else {
        const input = document.getElementById('modalEdicionInput');
        input.style.display = 'block';
        input.type = config.tipo;
        input.value = '';
    }

    document.getElementById('modalEdicion').style.display = 'flex';
        campoActual = campo;
    };

function _actualizarLocalidades(provincia) {
    const locs = _LOCALIDADES[provincia] || [];
    const sel = document.getElementById('modalEdicionSelect');
    if (!sel) return;
    sel.innerHTML = `<option value="">Seleccioná una localidad...</option>` +
        locs.map(l => `<option value="${l}">${l}</option>`).join('');
}

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
            const selectDin = document.getElementById('modalEdicionSelect');
            valor = selectDin
                ? selectDin.value
                : document.getElementById('modalEdicionInput').value.trim();

            if (!valor) {
                mostrarErrorEdicion('Este campo no puede estar vacío.');
                return;
            }

        if (campoActual === 'email') {
            const parteLocal = valor.split('@')[0] || '';
            if (parteLocal.length < 6) {
                mostrarErrorEdicion('La parte local del email debe tener al menos 6 caracteres.');
                return;
            }
            if (parteLocal.length > 64) {
                mostrarErrorEdicion('La parte local del email no puede superar los 64 caracteres.');
                return;
            }
            const emailFormatoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailFormatoRegex.test(valor)) {
                mostrarErrorEdicion('Ingresá un email con formato válido.');
                return;
            }
            const emailDominioRegex = /^[^\s@]+@(gmail|hotmail|outlook|yahoo|live|msn|icloud|me|mac|protonmail|proton|tutanota|gmx|yandex|zoho|fibertel|arnet|speedy|ciudad|uolsinectis|infovia|personal|claro|terra|bol|uol|oi|telmex)(\.[a-zA-Z]{2,6}){1,2}$/i;
            if (!emailDominioRegex.test(valor)) {
                mostrarErrorEdicion('El proveedor de email no está permitido. Los proveedores aceptados son: Gmail, Hotmail, Outlook, Yahoo, Live, iCloud, ProtonMail, Tutanota, GMX, Yandex, Zoho, Fibertel, Arnet, Speedy, Ciudad, Personal, Claro. Para dominios privados o institucionales contactanos a info@cinemarketer.com.ar');
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

            let valorDisplay = valor;
            if (campoActual === 'sexo') {
                valorDisplay = valor === 'M' ? 'Masculino' : valor === 'F' ? 'Femenino' : 'Otro';
            }
            document.getElementById(config.spanId).textContent = valorDisplay;
            if (campoActual === 'name') {
                document.getElementById('userName').textContent = valor;
            }
            // Si cambió la provincia, blanquear localidad
            if (campoActual === 'provincia') {
                document.getElementById('userLocalidad').textContent = '—';
                // Blanquear también en el backend
                const token2 = localStorage.getItem('token');
                fetch(`${CONFIG.API_URL}/users/me`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
                    body: JSON.stringify({ localidad: '' })
                }).catch(() => {});
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
        if (typeof window.cerrarModalProgreso === 'function') window.cerrarModalProgreso();
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

    // ── Carrusel datos personales mobile ──────────
    if (window.innerWidth <= 480) {
        const grid = document.querySelector('.datos-grid');
        if (grid) {
            const cards = Array.from(grid.querySelectorAll('.dato-card'));
            if (cards.length > 0) {
                const grupos = [ cards.slice(0, 6), cards.slice(6) ];
                cards.forEach(c => c.style.display = 'none');
                grupos[0].forEach(c => c.style.display = 'flex');

                const dotsWrapper = document.createElement('div');
                dotsWrapper.style.cssText = 'display:flex;justify-content:center;gap:6px;margin:0.5rem 0;';

                let currentPage = 0;

                function goTo(page) {
                    currentPage = page;
                    cards.forEach(c => c.style.display = 'none');
                    grupos[page].forEach(c => c.style.display = 'flex');
                    dotsWrapper.querySelectorAll('.dato-dot').forEach((d, i) => {
                        d.style.background = i === page ? '#324C89' : 'rgba(0,0,0,0.15)';
                    });
                }

                grupos.forEach((_, i) => {
                    const d = document.createElement('span');
                    d.className = 'dato-dot';
                    d.style.cssText = `width:7px;height:7px;border-radius:50%;cursor:pointer;transition:background 0.2s;background:${i === 0 ? '#324C89' : 'rgba(0,0,0,0.15)'};`;
                    d.onclick = () => goTo(i);
                    dotsWrapper.appendChild(d);
                });

                grid.insertAdjacentElement('afterend', dotsWrapper);

                let startX = 0;
                grid.addEventListener('touchstart', e => startX = e.touches[0].clientX);
                grid.addEventListener('touchend', e => {
                    const diff = startX - e.changedTouches[0].clientX;
                    if (Math.abs(diff) > 40) {
                        if (diff > 0 && currentPage < grupos.length - 1) goTo(currentPage + 1);
                        if (diff < 0 && currentPage > 0) goTo(currentPage - 1);
                    }
                });
            }
        }
    }

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

    setTimeout(() => {
            window.loadProfile();
            cargarPrecioPlan();
            cargarConteoRecomendaciones();
            if (typeof window.cargarMiLista === 'function') window.cargarMiLista();
        }, 50);
        };

async function cargarPrecioPlan() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${CONFIG.API_URL}/subscriptions/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const sub = await res.json();
            if (sub && sub.planPrice != null) {
                const priceEl = document.getElementById('premiumPlanPrice');
                if (priceEl) {
                    // Formateo manual para evitar bugs con toLocaleString
                    const val = Math.round(Number(sub.planPrice));
                    priceEl.textContent = '$' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                }
            }
        }
    } catch (e) {
        // El precio hardcodeado en HTML queda como fallback
    }
}

// ==============================================
// MI RED — SIGUIENDO / SEGUIDORES
// ==============================================
let _redTab = 'siguiendo';
let _siguiendoCache = [];
let _seguidoresCache = [];

async function cargarMiRed() {
    const token = localStorage.getItem('token');
    try {
        const [resSig, resSeg] = await Promise.all([
            fetch(`${CONFIG.API_URL}/follows/following`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CONFIG.API_URL}/follows/followers`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        _siguiendoCache = resSig.ok ? await resSig.json() : [];
        _seguidoresCache = resSeg.ok ? await resSeg.json() : [];

        document.getElementById('countSiguiendo').textContent = _siguiendoCache.length;
        document.getElementById('countSeguidores').textContent = _seguidoresCache.length;

        renderRedTab(_redTab);
    } catch (e) {
        document.getElementById('miRedLista').innerHTML =
            '<div class="mi-red-vacio">Error al cargar tu red</div>';
    }
}

window.switchRedTab = function(tab) {
    _redTab = tab;
    document.getElementById('tabSiguiendo').classList.toggle('active', tab === 'siguiendo');
    document.getElementById('tabSeguidores').classList.toggle('active', tab === 'seguidores');
    renderRedTab(tab);
};

window.switchListaTab = function(tab) {
    document.getElementById('tabMiLista').classList.toggle('active', tab === 'mi-lista');
    document.getElementById('tabRecomendaciones').classList.toggle('active', tab === 'recomendaciones');
    document.getElementById('panelMiLista').style.display = tab === 'mi-lista' ? 'block' : 'none';
    document.getElementById('panelRecomendaciones').style.display = tab === 'recomendaciones' ? 'block' : 'none';
    if (tab === 'recomendaciones') cargarMeRecomendaron();
    if (tab === 'mi-lista') window.cargarMiLista();
};

function renderRedTab(tab) {
    const lista = document.getElementById('miRedLista');
    const usuarios = tab === 'siguiendo' ? _siguiendoCache : _seguidoresCache;

    if (usuarios.length === 0) {
        lista.innerHTML = `<div class="mi-red-vacio">${
            tab === 'siguiendo' ? 'Todavía no seguís a nadie' : 'Todavía nadie te sigue'
        }</div>`;
        return;
    }

    const miId = localStorage.getItem('userId');

    lista.innerHTML = usuarios.map(u => {
        const inicial = u.name?.charAt(0)?.toUpperCase() || 'U';
        const avatar = u.avatarUrl
            ? `<img src="${u.avatarUrl}" alt="${u.name}">`
            : inicial;

        // En tab "seguidores" mostrar botón seguir/siguiendo según si ya lo sigo
        let btn = '';
        if (tab === 'siguiendo') {
            btn = `<button class="mi-red-btn"
                           onclick="window.dejarDeSeguirDesdeRed(${u.id || u.userId}, '${u.name}', this)">
                       Siguiendo
                   </button>`;
        } else {
            const yaSigo = _siguiendoCache.some(s => String(s.id) === String(u.id));
            btn = yaSigo
                ? `<button class="mi-red-btn"
                           onclick="window.dejarDeSeguirDesdeRed(${u.id || u.userId}, '${u.name}', this)">
                       Siguiendo
                   </button>`
                : `<button class="mi-red-btn seguir"
                           onclick="window.seguirDesdeRed(${u.id || u.userId}, this)">
                       Seguir
                   </button>`;
        }

        const btnBloquear = `
                    <button class="mi-red-btn-bloquear"
                        onclick="window.abrirModalBloquear(${u.id || u.userId}, '${(u.name || '').replace(/'/g, "\\'")}', this)"
                        title="Bloquear usuario">
                        <i class="fas fa-ban"></i>
                    </button>`;

                return `
                    <div class="mi-red-usuario" id="mi-red-user-${u.id}">
                        <div class="mi-red-avatar" onclick="window.abrirPerfilUsuario(${u.id})">${avatar}</div>
                        <div class="mi-red-info" onclick="window.abrirPerfilUsuario(${u.id})">
                            <p class="mi-red-nombre">${u.name}</p>
                            <p class="mi-red-nivel">${u.levelEmoji || ''} ${u.levelDisplayName || u.level || ''}</p>
                        </div>
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            ${btn}
                            ${btnBloquear}
                        </div>
                    </div>`;
            }).join('');
        }

window.seguirDesdeRed = async function(userId, btn) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/follows/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        // Actualizar cache y re-render
        const usuario = _seguidoresCache.find(u => String(u.id) === String(userId));
        if (usuario) _siguiendoCache.push(usuario);
        document.getElementById('countSiguiendo').textContent = _siguiendoCache.length;
        renderRedTab(_redTab);
    } catch (e) {}
};

let _dejarSeguirRedUserId = null;

window.dejarDeSeguirDesdeRed = function(userId, nombre, btn) {
    _dejarSeguirRedUserId = userId;
    document.getElementById('dejarSeguirRedNombre').textContent = nombre;
    const modal = document.getElementById('modalDejarSeguirRed');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalDejarSeguirRed = function() {
    const modal = document.getElementById('modalDejarSeguirRed');
    if (modal) modal.style.display = 'none';
    _dejarSeguirRedUserId = null;
};

window.confirmarDejarSeguirRed = async function() {
    if (!_dejarSeguirRedUserId) return;
    const userIdAEliminar = _dejarSeguirRedUserId;
    window.cerrarModalDejarSeguirRed();
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/follows/${userIdAEliminar}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        _siguiendoCache = _siguiendoCache.filter(u => u.id !== userIdAEliminar);
        document.getElementById('countSiguiendo').textContent = _siguiendoCache.length;
        renderRedTab(_redTab);
    } catch (e) {}
};

// ==============================================
// ME RECOMENDARON
// ==============================================

let _recomendacionesCache = [];
window._recModalId = null;

async function cargarConteoRecomendaciones() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/recommendations/received`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const countEl = document.getElementById('countRecomendaciones');
        if (countEl) countEl.textContent = data.length;
    } catch (e) {}
}

async function cargarMeRecomendaron() {
    const token = localStorage.getItem('token');
    const lista = document.getElementById('meRecomendaronLista');
    if (!lista) return;
    lista.innerHTML = '<div class="mi-red-vacio">Cargando...</div>';
    try {
        const res = await fetch(`${CONFIG.API_URL}/recommendations/received`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        _recomendacionesCache = res.ok ? await res.json() : [];
        const countEl = document.getElementById('countRecomendaciones');
                if (countEl) countEl.textContent = _recomendacionesCache.length;
        renderMeRecomendaron();
    } catch (e) {
        lista.innerHTML = '<div class="mi-red-vacio">Error al cargar recomendaciones</div>';
    }
}

function renderMeRecomendaron() {
    const lista = document.getElementById('meRecomendaronLista');
    if (!lista) return;

    if (_recomendacionesCache.length === 0) {
        lista.innerHTML = '<div class="mi-red-vacio">Todavía no te recomendaron ninguna película</div>';
        return;
    }

    lista.innerHTML = _recomendacionesCache.map(r => {
        const posterUrl = r.moviePosterPath
            ? `https://image.tmdb.org/t/p/w185${r.moviePosterPath}`
            : null;
        const senderInicial = r.senderName?.charAt(0)?.toUpperCase() || '?';
        const avatarHtml = r.senderAvatarUrl
            ? `<img src="${r.senderAvatarUrl}" alt="${r.senderName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : senderInicial;

        const yaVista = !!r.seenAt;
        const yaCalificada = !!r.rating;

        const estrellasActivas = [1,2,3,4,5].map(i => `
            <span onclick="window.seleccionarEstrellaRec(${r.id}, ${i})"
                  style="cursor:pointer;font-size:1.3rem;color:${yaCalificada && r.rating >= i ? '#E8A800' : '#ddd'};"
                  data-rec-id="${r.id}" data-star="${i}">★</span>
        `).join('');

        const estrellasDeshabilitadas = `
            <span title="Primero marcá la película como vista"
                  style="font-size:1.3rem;color:#ddd;cursor:not-allowed;" title="Marcá como vista para calificar">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:1.3rem;color:#ddd;cursor:not-allowed;">★</span>
            <span style="font-size:0.72rem;color:#aaa;margin-left:4px;">Marcá como vista para calificar</span>
        `;

        return `
            <div style="display:flex;align-items:flex-start;gap:0.85rem;padding:0.9rem 0;border-bottom:1px solid #f5f5f5;position:relative;">
                            <button onclick="window.abrirModalEliminarRec(${r.id})"
                                    title="Eliminar recomendación"
                                    style="position:absolute;top:8px;right:0;background:none;border:none;cursor:pointer;color:#ccc;font-size:1rem;padding:4px;line-height:1;"
                                    onmouseover="this.style.color='#e50914'"
                                    onmouseout="this.style.color='#ccc'">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                ${posterUrl
                    ? `<img src="${posterUrl}" alt="${r.movieTitle || 'Película'}" style="width:85px;height:128px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
                    : `<div style="width:85px;height:128px;background:#1a3a6b;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;">🎬</div>`
                }
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.92rem;font-weight:600;color:#333;margin-bottom:4px;">
                        Película: ${r.movieTitle || '—'}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
                        <div style="width:22px;height:22px;border-radius:50%;background:#1a3a6b;color:white;font-size:0.7rem;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">${avatarHtml}</div>
                        <span style="font-size:0.8rem;color:#666;">Por <strong><a href="#" onclick="event.preventDefault(); window.abrirPerfilUsuario(${r.senderId})" style="color:#e50914;text-decoration:none;cursor:pointer;">${r.senderName}</a></strong></span>
                        ${r.contextType ? `<span style="font-size:0.75rem;padding:2px 8px;border-radius:99px;background:#f0f0f0;color:#666;">${r.contextType}</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        ${!yaVista
                            ? `<button onclick="window.abrirModalYaLaVi(${r.id})"
                                       style="font-size:0.8rem;padding:4px 12px;border-radius:8px;background:#1a3a6b;color:white;border:none;cursor:pointer;font-weight:500;">
                                   ✓ Ya la vi
                               </button>`
                            : `<span style="font-size:0.75rem;color:#1d9e75;font-weight:500;">✓ Vista</span>`
                        }
                    </div>
                    <div style="display:flex;align-items:center;gap:2px;margin-top:6px;flex-wrap:wrap;">
                        ${yaVista ? estrellasActivas : estrellasDeshabilitadas}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.abrirModalYaLaVi = function(recId) {
    _recModalId = recId;
    const modal = document.getElementById('modalYaLaVi');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalYaLaVi = function() {
    _recModalId = null;
    const modal = document.getElementById('modalYaLaVi');
    if (modal) modal.style.display = 'none';
};

window.confirmarYaLaVi = async function() {
    const recId = window._recModalId;
    if (!recId) return;
    window.cerrarModalYaLaVi();
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/recommendations/${recId}/seen`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const rec = _recomendacionesCache.find(r => r.id === recId);
            if (rec) rec.seenAt = new Date().toISOString();
            renderMeRecomendaron();
        }
    } catch (e) {}
};

window.seleccionarEstrellaRec = async function(recId, rating) {
    const rec = _recomendacionesCache.find(r => r.id === recId);
    if (!rec || !rec.seenAt || rec.rating) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/recommendations/${recId}/rate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rating })
        });
        if (res.ok) {
            rec.rating = rating;
            renderMeRecomendaron();
        }
    } catch (e) {}
};

// ── Eliminar recomendación ──────────────────────────────────────
let _eliminarRecId = null;

window.abrirModalEliminarRec = function(recId) {
    _eliminarRecId = recId;
    const modal = document.getElementById('modalEliminarRec');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalEliminarRec = function() {
    _eliminarRecId = null;
    const modal = document.getElementById('modalEliminarRec');
    if (modal) modal.style.display = 'none';
};

window.confirmarEliminarRec = async function() {
    const recId = _eliminarRecId;
    if (!recId) return;
    window.cerrarModalEliminarRec();
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/recommendations/${recId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            _recomendacionesCache = _recomendacionesCache.filter(r => r.id !== recId);
            const countEl = document.getElementById('countRecomendaciones');
            if (countEl) countEl.textContent = _recomendacionesCache.length;
            renderMeRecomendaron();
        }
    } catch (e) {}
};

window.verMiSala = function() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    window._perfilUsuarioId = userId;
    sessionStorage.setItem('perfilUsuarioId', userId);
    sessionStorage.setItem('perfilDesdeMiCuenta', '1');
    if (typeof loadModule === 'function') loadModule('perfil');
};

// ==============================================
// CONFIGURACIÓN DE CUENTA
// ==============================================
let _perfilEsPrivado = false;

window.abrirConfiguracion = async function() {
    const modal = document.getElementById('modalConfiguracion');
    modal.style.display = 'flex';

    // Cargar estado actual de privacidad
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        _perfilEsPrivado = data.profileVisibility === 'PRIVATE';
        _actualizarTogglePrivacidad();
    } catch(e) {}
};

window.cerrarConfiguracion = function() {
    document.getElementById('modalConfiguracion').style.display = 'none';
};

function _actualizarTogglePrivacidad() {
    const toggle = document.getElementById('togglePrivacidad');
    const dot    = document.getElementById('togglePrivacidadDot');
    const label  = document.getElementById('privacidadLabel');
    const desc   = document.getElementById('privacidadDesc');

    if (_perfilEsPrivado) {
        toggle.style.background = '#324C89';
        dot.style.left = '22px';
        label.textContent = 'Privado';
        desc.textContent = 'Tu perfil es privado. Solo usuarios aprobados pueden ver tu contenido.';
    } else {
        toggle.style.background = '#ddd';
        dot.style.left = '2px';
        label.textContent = 'Público';
        desc.textContent = 'Tu perfil es público. Cualquier usuario puede ver tu contenido.';
    }
}

window.togglePrivacidad = async function() {
    const nuevaVisibilidad = _perfilEsPrivado ? 'PUBLIC' : 'PRIVATE';
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${CONFIG.API_URL}/follows/privacy`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ visibility: nuevaVisibilidad })
        });
        if (!res.ok) return;
        _perfilEsPrivado = nuevaVisibilidad === 'PRIVATE';
        _actualizarTogglePrivacidad();
    } catch(e) {
        alert('Error al actualizar la privacidad. Intentá de nuevo.');
    }
};

// ==============================================
// BLOQUEAR USUARIO
// ==============================================
let _bloquearUserId = null;
let _bloquearNombre = null;

window.abrirModalBloquear = function(userId, nombre) {
    _bloquearUserId = userId;
    _bloquearNombre = nombre;
    document.getElementById('bloquearNombre').textContent = nombre;
    const chk = document.getElementById('checkReportarAlBloquear');
    if (chk) chk.checked = false;
    document.getElementById('modalBloquearUsuario').style.display = 'flex';
};

window.cerrarModalBloquear = function() {
    document.getElementById('modalBloquearUsuario').style.display = 'none';
    _bloquearUserId = null;
    _bloquearNombre = null;
};

window.confirmarBloquear = async function() {
    if (!_bloquearUserId) return;
    const token = localStorage.getItem('token');
    const reportar = document.getElementById('checkReportarAlBloquear')?.checked || false;

    const btn = document.getElementById('btnConfirmarBloquear');
    if (btn) { btn.disabled = true; btn.textContent = 'Bloqueando...'; }

    try {
        const res = await fetch(`${CONFIG.API_URL}/users/${_bloquearUserId}/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reportar, reason: reportar ? 'Reportado al bloquear' : null })
        });
        if (!res.ok) throw new Error();

        // Eliminar de la lista visual
        const el = document.getElementById(`mi-red-user-${_bloquearUserId}`);
        if (el) el.remove();

        // Actualizar caches
        _siguiendoCache = _siguiendoCache.filter(u => String(u.id) !== String(_bloquearUserId));
        _seguidoresCache = _seguidoresCache.filter(u => String(u.id) !== String(_bloquearUserId));
        document.getElementById('countSiguiendo').textContent = _siguiendoCache.length;
        document.getElementById('countSeguidores').textContent = _seguidoresCache.length;

        window.cerrarModalBloquear();

        // Toast
        const t = document.createElement('div');
        t.textContent = `Bloqueaste a ${_bloquearNombre || 'el usuario'}`;
        t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#333;color:white;padding:0.75rem 1.5rem;border-radius:24px;font-size:0.88rem;font-weight:600;z-index:9999999;';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);

    } catch(e) {
        alert('Error al bloquear. Intentá de nuevo.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sí, bloquear'; }
    }
};

// ── Premium benefits carrusel mobile ──────────
(function() {
    if (window.innerWidth > 480) return;

    const list   = document.getElementById('premiumBenefitsList');
    const dots   = document.getElementById('premiumBenefitsDots');
    if (!list || !dots) return;

    const items       = Array.from(list.querySelectorAll('li'));
    const perPage     = 3;
    const totalPages  = Math.ceil(items.length / perPage);
    let current       = 0;

    // Crear dots
    for (let i = 0; i < totalPages; i++) {
        const d = document.createElement('span');
        d.className = 'premium-benefit-dot' + (i === 0 ? ' active' : '');
        d.onclick = () => goTo(i);
        dots.appendChild(d);
    }

    function goTo(page) {
        current = page;
        items.forEach((li, idx) => {
            li.style.display = (idx >= page * perPage && idx < (page + 1) * perPage) ? '' : 'none';
        });
        dots.querySelectorAll('.premium-benefit-dot').forEach((d, i) => {
            d.classList.toggle('active', i === page);
        });
    }

    goTo(0);

    // Swipe support
    let startX = 0;
    list.addEventListener('touchstart', e => startX = e.touches[0].clientX);
    list.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            if (diff > 0 && current < totalPages - 1) goTo(current + 1);
            if (diff < 0 && current > 0) goTo(current - 1);
        }
    });
})();

// ── Modal progreso de insignia ──────────────────────────────────
window.abrirModalProgreso = function() {
    const modal = document.getElementById('modalProgreso');
    const body  = document.getElementById('modalProgresoBody');
    if (!modal || !body) return;

    const nivel = window._perfilNivel || 'AMATEUR';
    const profile = window._perfilData || {};

    body.innerHTML = _renderProgresoBody(nivel, profile);
    modal.style.display = 'flex';
};

window.cerrarModalProgreso = function() {
    const modal = document.getElementById('modalProgreso');
    if (modal) modal.style.display = 'none';
};

function _check(cumple) {
    return cumple
        ? `<i class="fas fa-check-circle" style="color:#2e7d32;font-size:17px;flex-shrink:0;"></i>`
        : `<i class="far fa-circle" style="color:#ccc;font-size:17px;flex-shrink:0;"></i>`;
}

function _item(cumple, texto) {
    const color = cumple ? 'color:#333;' : 'color:#999;';
    return `<div style="display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:8px;">
        ${_check(cumple)}
        <span style="${color}">${texto}</span>
    </div>`;
}

function _renderProgresoBody(nivel, p) {
    const btnAceptar = `<button onclick="window.cerrarModalProgreso()"
        style="width:100%;background:#324C89;border:none;color:white;padding:0.65rem;border-radius:8px;font-size:14px;cursor:pointer;margin-top:1.25rem;">
        Aceptar
    </button>`;

    if (nivel === 'JURADO_EXPERTO') {
        return `
            <div style="text-align:center;padding:0.5rem 0;">
                <div style="font-size:36px;margin-bottom:0.75rem;">🏆</div>
                <div style="font-size:17px;font-weight:600;color:#333;margin-bottom:0.5rem;">¡Sos Jurado Experto!</div>
                <div style="font-size:13px;color:#888;line-height:1.6;margin-bottom:0.5rem;">
                    Alcanzaste el nivel más alto de Cinemarketer. Tu dedicación y pasión por el cine te llevaron hasta acá. ¡Seguí siendo parte de nuestra comunidad!
                </div>
            </div>
            ${btnAceptar}`;
    }

    let titulo = '';
    let emoji  = '';
    let items  = '';

    if (nivel === 'AMATEUR') {
        titulo = 'Colaborador'; emoji = '🔵';
        const emailOk     = p.emailVerified || !!p.googleId;
        const perfilOk    = !!(p.name && p.dni && p.phone && p.avatarUrl && p.provincia && p.localidad);
        const peliculasOk = (p.reviewsCount || 0) >= 100;
        const comentOk    = (p.commentsCount || 0) >= 50;
        items = _item(emailOk,     'Email verificado') +
                _item(perfilOk,    'Perfil completo al 100%') +
                _item(peliculasOk, '100 películas únicas votadas') +
                _item(comentOk,    '50 comentarios en películas distintas');
    }

    if (nivel === 'COLABORADOR') {
        titulo = 'Crítico'; emoji = '🟣';
        const peliculasOk = (p.reviewsCount || 0) >= 200;
        const comentOk    = (p.commentsCount || 0) >= 100;
        const puntosOk    = (p.totalRedeemedPoints || 0) >= 2000;
        items = _item(peliculasOk, '200 películas únicas votadas') +
                _item(comentOk,    '100 comentarios en películas distintas') +
                _item(false,       '25 usuarios seguidos') +
                _item(false,       '60 días activos en la plataforma') +
                _item(false,       '30 recomendaciones enviadas') +
                _item(false,       '20 "Te banco" de usuarios distintos') +
                _item(puntosOk,    '2.000 puntos canjeados');
    }

    if (nivel === 'CRITICO') {
        titulo = 'Jurado Experto'; emoji = '🏆';
        const premiumOk   = !!p.isPremium;
        const peliculasOk = (p.reviewsCount || 0) >= 500;
        const comentOk    = (p.commentsCount || 0) >= 300;
        const puntosOk    = (p.totalRedeemedPoints || 0) >= 10000;
        items = _item(premiumOk,   'Suscripción Premium activa') +
                _item(peliculasOk, '500 películas únicas votadas') +
                _item(comentOk,    '300 comentarios en películas distintas') +
                _item(false,       '100 usuarios seguidos') +
                _item(false,       '120 días activos en la plataforma') +
                _item(false,       '200 recomendaciones enviadas') +
                _item(false,       '100 "Te banco" de usuarios distintos') +
                _item(false,       '100 "Merecés un punto" recibidos') +
                _item(false,       '100 seguidores ganados') +
                _item(puntosOk,    '10.000 puntos canjeados');
    }

    return `
        <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Próximo objetivo</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem;">
            <span style="font-size:20px;">${emoji}</span>
            <span style="font-size:17px;font-weight:600;color:#333;">${titulo}</span>
        </div>
        ${items}
        ${btnAceptar}`;
}

document.body.classList.remove('modal-open');