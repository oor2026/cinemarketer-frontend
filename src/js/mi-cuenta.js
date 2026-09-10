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

                if (profile.createdAt && document.getElementById('memberSince')) {
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

                // Guardar ID para perfil público
                if (profile.id) localStorage.setItem('userId', profile.id);

                // Configuración de cuenta (privacidad, push, bloqueados) — antes
                // se cargaba solo al abrir el modal; ahora es sección fija, se
                // carga siempre al entrar a la página.
                                window._inicializarConfiguracionCuenta();

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
            console.error('[loadProfile] Error real:', error); // TEMPORAL — para diagnosticar, sacar después
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
// EDICIÓN DE PERFIL
// ==============================================

var CAMPOS_EDICION = {
    name:      { titulo: 'Editar nombre completo',     label: 'Nombre completo',    tipo: 'text',     spanId: 'userFullName'  },
    email:     { titulo: 'Editar email',               label: 'Correo electrónico', tipo: 'email',    spanId: 'userEmail'     },
    phone:     { titulo: 'Editar teléfono',            label: 'Teléfono',           tipo: 'tel',      spanId: 'userPhone'     },
    birthDate: { titulo: 'Editar fecha de nacimiento', label: 'Fecha de nacimiento',tipo: 'date',     spanId: 'userBirthDate' },
    sexo:      { titulo: 'Editar sexo',                label: 'Sexo',               tipo: 'select',   spanId: 'userSexo',     opciones: [{v:'M',l:'Masculino'},{v:'F',l:'Femenino'},{v:'O',l:'Otro'}] },
    provincia: { titulo: 'Editar provincia',           label: 'Provincia',          tipo: 'provincia',spanId: 'userProvincia' },
    localidad: { titulo: 'Editar localidad',           label: 'Localidad',          tipo: 'localidad',spanId: 'userLocalidad' }
};

var PHONE_PREFIXES_CUENTA = [
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

var selectedPrefixCuenta = PHONE_PREFIXES_CUENTA[0];
var campoActual = null;

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

var _PROVINCIAS = ['Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán','Ciudad Autónoma de Buenos Aires'];

var _LOCALIDADES = {
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

                                    // El nombre también se ve en el header/menú hamburguesa —
                                    // esa vista nunca se enteraba del cambio hasta recargar.
                                    if (campoActual === 'name') {
                                        const nombreHeader = document.querySelector('#headerUserName .user-name-text');
                                        if (nombreHeader) nombreHeader.textContent = valorDisplay;
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
            }, 50);
        inicializarPremiumCarrusel();
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
window._inicializarConfiguracionCuenta = async function() {
    // La privacidad del perfil se movió a Mi Sala — este módulo ya no
    // necesita cargar ni mostrar ese estado.

    // Cargar lista de bloqueados
        _cargarBloqueadosEnConfig();

        // Inicializar estado del toggle de notificaciones push
        _actualizarTogglePush();
    };

async function _cargarBloqueadosEnConfig() {
    const lista = document.getElementById('configBloqueadosLista');
    if (!lista) return;
    const token = localStorage.getItem('token');
    lista.innerHTML = '<div style="text-align:center;padding:0.75rem;color:#999;font-size:0.82rem;"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/me/blocked`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const bloqueados = await res.json();
        if (bloqueados.length === 0) {
            lista.innerHTML = '<div style="text-align:center;padding:0.75rem;color:#bbb;font-size:0.82rem;">No bloqueaste a ningún usuario.</div>';
            return;
        }
        lista.innerHTML = bloqueados.map(u => `
            <div id="config-bloqueado-${u.id}" style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #f0f0f0;">
                <span style="font-size:0.85rem;color:#333;font-weight:500;">${u.name || u.username || 'Usuario'}</span>
                <button onclick="window.desbloquearDesdeConfig(${u.id}, this)"
                    style="background:none;border:1.5px solid #e50914;color:#e50914;border-radius:6px;padding:0.25rem 0.7rem;font-size:0.78rem;font-weight:600;cursor:pointer;">
                    Desbloquear
                </button>
            </div>
        `).join('');
    } catch(e) {
        lista.innerHTML = '<div style="text-align:center;padding:0.75rem;color:#bbb;font-size:0.82rem;">Error al cargar.</div>';
    }
}

window.desbloquearDesdeConfig = async function(userId, btn) {
    const token = localStorage.getItem('token');
    btn.disabled = true;
    btn.textContent = '...';
    try {
        const res = await fetch(`${CONFIG.API_URL}/users/${userId}/unblock`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const fila = document.getElementById(`config-bloqueado-${userId}`);
        if (fila) fila.remove();
        // Si quedó vacía la lista
        const lista = document.getElementById('configBloqueadosLista');
        if (lista && lista.children.length === 0) {
            lista.innerHTML = '<div style="text-align:center;padding:0.75rem;color:#bbb;font-size:0.82rem;">No bloqueaste a ningún usuario.</div>';
        }
    } catch(e) {
        btn.disabled = false;
        btn.textContent = 'Desbloquear';
        alert('Error al desbloquear. Intentá de nuevo.');
    }
};

// ==============================================
// NOTIFICACIONES PUSH
// ==============================================

function _actualizarTogglePush() {
    const toggle  = document.getElementById('togglePushNotif');
    const dot     = document.getElementById('togglePushNotifDot');
    const label   = document.getElementById('pushNotifLabel');
    const msg     = document.getElementById('pushNotifBrowserMsg');
    if (!toggle) return;

    // Si el browser no soporta push, deshabilitar
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toggle.style.opacity = '0.4';
        toggle.style.pointerEvents = 'none';
        label.textContent = 'No disponible';
        if (msg) { msg.style.display = 'block'; msg.textContent = 'Tu navegador no soporta notificaciones push.'; }
        return;
    }

    const permiso = Notification.permission;

    if (permiso === 'denied') {
        toggle.style.opacity = '0.4';
        toggle.style.pointerEvents = 'none';
        label.textContent = 'Bloqueado';
        if (msg) { msg.style.display = 'block'; msg.textContent = 'Bloqueaste las notificaciones en este navegador. Para activarlas, cambiá el permiso en la configuración del navegador.'; }
        return;
    }

    // Verificar si ya tiene suscripción activa
    navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
            const activo = !!sub && permiso === 'granted';
            if (activo) {
                toggle.style.background = '#324C89';
                dot.style.left = '22px';
                label.textContent = 'Activo';
            } else {
                toggle.style.background = '#ddd';
                dot.style.left = '2px';
                label.textContent = 'Inactivo';
            }
        });
    });
}

window.togglePushNotificaciones = async function() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const permiso = Notification.permission;
    const reg = await navigator.serviceWorker.ready;
    const subActual = await reg.pushManager.getSubscription();

    if (subActual) {
        // Ya está suscripto → desuscribir
        await window.PushNotifications.desuscribir();
        _actualizarTogglePush();
    } else {
        // No está suscripto → pedir permiso y suscribir
        if (permiso === 'denied') return; // ya bloqueado, no hacer nada

        const ok = await window.PushNotifications.solicitarPermiso();
        if (ok) {
            _actualizarTogglePush();
        } else if (Notification.permission === 'denied') {
            // El usuario denegó en este intento
            const msg = document.getElementById('pushNotifBrowserMsg');
            if (msg) {
                msg.style.display = 'block';
                msg.textContent = 'Denegaste el permiso. Para activarlo, cambiá el permiso en la configuración del navegador.';
            }
            _actualizarTogglePush();
        }
    }
};

// ==============================================
// BLOQUEAR USUARIO
// ==============================================
var _bloquearUserId = null;
var _bloquearNombre = null;

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

// ── Premium benefits: ya no se pagina (el banner colapsable dejó
// innecesarios los dots internos) — se muestran siempre los 4 completos.
function inicializarPremiumCarrusel() {
    const list = document.getElementById('premiumBenefitsList');
    const dots = document.getElementById('premiumBenefitsDots');
    if (dots) dots.innerHTML = '';
    if (list) list.querySelectorAll('li').forEach(li => { li.style.display = ''; });
}

// Premium y Creator son slides del mismo carrusel — colapsar/desplegar uno
// tiene que reflejarse en el otro, para que al deslizar entre ambos el
// estado (ocupa espacio / no ocupa espacio) sea consistente.
var BANNERS_COLAPSABLES = [
    { colapsable: 'premiumBannerColapsable', chevron: 'premiumBannerChevron', banner: 'premiumBanner' },
    { colapsable: 'creatorBannerColapsable', chevron: 'creatorBannerChevron', banner: 'creatorBanner' }
];

function aplicarEstadoColapsoBanners(colapsado) {
    BANNERS_COLAPSABLES.forEach(({ colapsable, chevron, banner }) => {
        const colapsableEl = document.getElementById(colapsable);
        const chevronEl    = document.getElementById(chevron);
        const labelEl      = document.querySelector(`#${banner} .premium-banner-toggle-label`);
        if (!colapsableEl || !chevronEl) return;

        if (colapsado) {
            colapsableEl.classList.add('collapsed');
            chevronEl.className = 'fas fa-chevron-down';
            if (labelEl) labelEl.style.display = 'inline';
        } else {
            colapsableEl.classList.remove('collapsed');
            chevronEl.className = 'fas fa-chevron-up';
            if (labelEl) labelEl.style.display = 'none';
        }
    });

    // La transición de max-height tarda 0.35s (ver .premium-banner-colapsable
    // en mi-cuenta.css) — medimos recién cuando termina, para no capturar
    // una altura a mitad de animación.
    setTimeout(() => {
        if (typeof window.ajustarAlturaCarrusel === 'function') window.ajustarAlturaCarrusel();
    }, 360);
}

window.togglePremiumBanner = function() {
    const colapsable = document.getElementById('premiumBannerColapsable');
    const estaColapsado = colapsable.classList.contains('collapsed');
    aplicarEstadoColapsoBanners(!estaColapsado);
};

window.toggleCreatorBanner = function() {
    const colapsable = document.getElementById('creatorBannerColapsable');
    const estaColapsado = colapsable.classList.contains('collapsed');
    aplicarEstadoColapsoBanners(!estaColapsado);
};

// Modal de progreso de insignia — migró al header (ícono global,
// funciona desde cualquier módulo). Ver main.js: abrirModalProgresoHeader,
// cerrarModalProgresoHeader, _renderProgresoBodyHeader y compañía.

document.body.classList.remove('modal-open');