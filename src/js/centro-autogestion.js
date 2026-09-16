// ============================================================
// CENTRO DE AUTOGESTIÓN DE ENTREGA DE PREMIOS
// Página standalone, sin login del sitio. Identidad por magic
// link (mail -> token de un solo uso -> JWT real de Cinemarketer,
// vía /api/self-service/*). El JWT se guarda en sessionStorage
// (no localStorage) — es un acceso puntual para coordinar un
// premio, no una sesión general del sitio.
// ============================================================

const SS_TOKEN_KEY = 'ss_token';

const SS_COOLDOWN_KEY = 'ss_last_request_ts';
const SS_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos — mismo valor que el backend

function ssIniciarCooldown() {
    sessionStorage.setItem(SS_COOLDOWN_KEY, Date.now().toString());
    ssActualizarCooldown();
}

function ssActualizarCooldown() {
    const btn = document.getElementById('ssBtnPedirLink');
    const ultimoPedido = parseInt(sessionStorage.getItem(SS_COOLDOWN_KEY) || '0', 10);
    const restante = SS_COOLDOWN_MS - (Date.now() - ultimoPedido);

    if (restante <= 0) {
        btn.disabled = false;
        btn.textContent = 'Enviarme el enlace de acceso';
        return;
    }

    btn.disabled = true;
    const minutos = Math.floor(restante / 60000);
    const segundos = Math.floor((restante % 60000) / 1000).toString().padStart(2, '0');
    btn.textContent = `Podés pedir otro enlace en ${minutos}:${segundos}`;

    setTimeout(ssActualizarCooldown, 1000);
}

// Misma fuente exacta que mi-cuenta.js (_PROVINCIAS / _LOCALIDADES) —
// no inventar una lista propia que pueda desalinearse de la real.
const SS_PROVINCIAS = ['Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán','Ciudad Autónoma de Buenos Aires'];

const SS_LOCALIDADES = {
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

function ssMostrarPaso(paso) {
    ['ssStepEmail', 'ssStepChecking', 'ssStepError', 'ssStepPerfil', 'ssStepCanjes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === paso) ? 'block' : 'none';
    });
}

function ssMostrarError(msg) {
    document.getElementById('ssErrorTexto').textContent = msg;
    ssMostrarPaso('ssStepError');
}

function ssVolverAEmail() {
    sessionStorage.removeItem(SS_TOKEN_KEY);
    document.getElementById('ssEmailMensaje').style.display = 'none';
    ssMostrarPaso('ssStepEmail');
}

function ssAuthHeaders() {
    return { 'Authorization': `Bearer ${sessionStorage.getItem(SS_TOKEN_KEY)}` };
}

// ==========================================================
// ARRANQUE — decide en qué paso empezar
// ==========================================================
async function iniciarCentroAutogestion() {
    const params = new URLSearchParams(window.location.search);
    const tokenUrl = params.get('token');
    const error = params.get('error');

    // Viene de clickear el link del mail — intercambiar el token de
    // un solo uso por el JWT real. Nunca dejamos el JWT en la URL.
    if (tokenUrl) {
        ssMostrarPaso('ssStepChecking');
        try {
            const res = await fetch(`${CONFIG.API_URL}/self-service/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenUrl })
            });
            if (!res.ok) {
                ssMostrarError('El enlace es inválido o ya fue utilizado. Pedí uno nuevo.');
                return;
            }
            const data = await res.json();
            sessionStorage.setItem(SS_TOKEN_KEY, data.token);
            // Sacamos el token de la URL así no queda en el historial del navegador.
            window.history.replaceState({}, '', window.location.pathname);
            await ssContinuarLogueado();
        } catch (e) {
            ssMostrarError('No pudimos validar el enlace. Probá de nuevo en un momento.');
        }
        return;
    }

    if (error === 'invalid') { ssMostrarError('El enlace no es válido.'); return; }
    if (error === 'expired') { ssMostrarError('El enlace venció (son válidos por 15 minutos). Pedí uno nuevo.'); return; }

    // Refresh de página con un acceso todavía vigente en esta pestaña.
    if (sessionStorage.getItem(SS_TOKEN_KEY)) {
        await ssContinuarLogueado();
        return;
    }

    ssMostrarPaso('ssStepEmail');
}

// ==========================================================
// PASO 1 — pedir el link
// ==========================================================

// Mismas reglas exactas que login.html/register.html — no inventar
// una validación paralela.
const SS_DOMINIOS_PERMITIDOS = [
    'gmail', 'hotmail', 'outlook', 'yahoo', 'live', 'msn',
    'icloud', 'me', 'mac', 'protonmail', 'proton',
    'tutanota', 'gmx', 'yandex', 'zoho',
    'fibertel', 'arnet', 'speedy', 'ciudad', 'uolsinectis',
    'infovia', 'personal', 'claro',
    'terra', 'bol', 'uol', 'oi', 'telmex'
];

const SS_DOMINIOS_DISPLAY = [
    'Gmail', 'Hotmail', 'Outlook', 'Yahoo', 'Live', 'iCloud',
    'ProtonMail', 'Tutanota', 'GMX', 'Yandex', 'Zoho',
    'Fibertel', 'Arnet', 'Speedy', 'Ciudad', 'Personal', 'Claro'
];

const SS_TLD_VALIDOS = [
    'com.ar','net.ar','org.ar','gob.ar','edu.ar',
    'com.br','net.br','com.mx','net.mx','com.uy','net.uy',
    'com.co','net.co','com.pe','net.pe','com.cl','com.ve',
    'com.bo','com.py','com.es',
    'com','net','org','info','io','co',
    'ar','es','mx','br','uy','cl','pe','ve','bo','py'
];

function ssValidarEmail(email) {
    if (!email) return { valido: false, error: 'El email es obligatorio' };

    if (email.trim().toLowerCase().endsWith('@cinemarketer.com.ar')) {
        return { valido: true };
    }

    if (email.length > 254) return { valido: false, error: 'El email es demasiado largo (máximo 254 caracteres)' };

    const partes = email.split('@');
    if (partes.length !== 2) return { valido: false, error: 'El email debe contener exactamente un @' };

    const local = partes[0];
    const dominio = partes[1].toLowerCase();

    if (local.length < 6) return { valido: false, error: 'La parte local del email debe tener al menos 6 caracteres' };
    if (local.length > 64) return { valido: false, error: 'La parte local del email no puede superar 64 caracteres' };
    if (!/^[a-zA-Z0-9._-]+$/.test(local)) return { valido: false, error: 'El email contiene caracteres no permitidos antes del @' };
    if (/^[._-]/.test(local) || /[._-]$/.test(local)) return { valido: false, error: 'El email no puede empezar ni terminar con punto, guión o guión bajo' };
    if (/[._-]{2,}/.test(local)) return { valido: false, error: 'El email no puede tener caracteres especiales consecutivos' };

    const proveedor = dominio.split('.')[0];
    if (!SS_DOMINIOS_PERMITIDOS.includes(proveedor)) {
        return {
            valido: false,
            error: 'Proveedor de email no reconocido. Proveedores aceptados: ' +
                   SS_DOMINIOS_DISPLAY.join(', ') +
                   '. Para dominios privados o institucionales contactá a info@cinemarketer.com.ar'
        };
    }

    const tld = dominio.substring(proveedor.length + 1).toLowerCase();
    if (!SS_TLD_VALIDOS.includes(tld)) return { valido: false, error: 'La extensión del email (' + tld + ') no es reconocida' };

    return { valido: true };
}

document.getElementById('ssEmailForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('ssEmailInput').value.trim();
    const btn = document.getElementById('ssBtnPedirLink');
    const msg = document.getElementById('ssEmailMensaje');

    const validacion = ssValidarEmail(email);
    if (!validacion.valido) {
        msg.textContent = validacion.error;
        msg.className = 'ss-mensaje ss-mensaje-error';
        msg.style.display = 'block';
        return;
    }

        btn.disabled = true;
        try {
            const res = await fetch(`${CONFIG.API_URL}/self-service/request-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            msg.textContent = data.message || 'Si el email está registrado, recibirás el enlace en breve.';
            msg.className = 'ss-mensaje';
            msg.style.display = 'block';
            ssIniciarCooldown();
        } catch (e) {
            msg.textContent = 'Ocurrió un error. Probá de nuevo en un momento.';
            msg.className = 'ss-mensaje ss-mensaje-error';
            msg.style.display = 'block';
            btn.disabled = false;
        }
    });

// ==========================================================
// PASO 2 — perfil pendiente
// ==========================================================
async function ssContinuarLogueado() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/self-service/perfil-pendiente`, { headers: ssAuthHeaders() });
        if (res.status === 401) {
            sessionStorage.removeItem(SS_TOKEN_KEY);
            ssMostrarError('Tu acceso venció. Pedí un nuevo enlace.');
            return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.completo) {
            ssMostrarFormPerfil(data.faltantes, data.provinciaActual);
            return;
        }
    } catch (e) {
        ssMostrarError('No pudimos cargar tu perfil. Probá de nuevo.');
        return;
    }

    await ssCargarCanjes();
}

function ssMostrarFormPerfil(faltantes, provinciaActual) {
    const cont = document.getElementById('ssPerfilCampos');
    let html = '';
    if (faltantes.birthDate) {
        html += `<label for="ssBirthDate">Fecha de nacimiento</label><input type="date" id="ssBirthDate" required>`;
    }
    if (faltantes.sexo) {
        html += `<label for="ssSexo">Sexo</label>
            <select id="ssSexo" required>
                <option value="">Elegí una opción</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Prefiero no decir / otro</option>
            </select>`;
    }
    if (faltantes.provincia) {
        html += `<label for="ssProvincia">Provincia</label>
            <select id="ssProvincia" required onchange="ssActualizarLocalidades(this.value)">
                <option value="">Seleccioná una provincia...</option>
                ${SS_PROVINCIAS.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>`;
    }
    if (faltantes.localidad) {
        html += `<label for="ssLocalidad">Localidad</label>
            <select id="ssLocalidad" required>
                <option value="">Seleccioná una localidad...</option>
            </select>`;
    }
    cont.innerHTML = html;
    ssMostrarPaso('ssStepPerfil');

    // Si la provincia ya estaba cargada (solo faltaba localidad), la
    // usamos para prefiltrar sin esperar a que el usuario la toque.
    if (faltantes.localidad && !faltantes.provincia && provinciaActual) {
        ssActualizarLocalidades(provinciaActual);
    }
}

function ssActualizarLocalidades(provincia) {
    const sel = document.getElementById('ssLocalidad');
    if (!sel) return;
    const locs = SS_LOCALIDADES[provincia] || [];
    sel.innerHTML = `<option value="">Seleccioná una localidad...</option>` +
        locs.map(l => `<option value="${l}">${l}</option>`).join('');
}

document.getElementById('ssPerfilForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const body = {};
    const birthDate  = document.getElementById('ssBirthDate');
    const sexo       = document.getElementById('ssSexo');
    const provincia  = document.getElementById('ssProvincia');
    const localidad  = document.getElementById('ssLocalidad');
    if (birthDate)  body.birthDate  = birthDate.value;
    if (sexo)       body.sexo       = sexo.value;
    if (provincia)  body.provincia  = provincia.value;
    if (localidad)  body.localidad  = localidad.value;

    const btn = document.getElementById('ssBtnGuardarPerfil');
    btn.disabled = true;
    try {
        const res = await fetch(`${CONFIG.API_URL}/self-service/perfil`, {
            method: 'PATCH',
            headers: { ...ssAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error();

        // No confiamos en que el PATCH haya guardado todo — le volvemos
        // a preguntar al backend si el perfil quedó realmente completo
        // antes de dejar avanzar al listado de canjes.
        await ssContinuarLogueado();
    } catch (e) {
        alert('No pudimos guardar tus datos. Probá de nuevo.');
    } finally {
        btn.disabled = false;
    }
});

// ==========================================================
// PASO 3 — listado de canjes
// ==========================================================
async function ssCargarCanjes() {
    ssMostrarPaso('ssStepCanjes');
    const cont = document.getElementById('ssCanjesLista');
    cont.innerHTML = '<div class="ss-loading"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}/self-service/canjes`, { headers: ssAuthHeaders() });
        if (!res.ok) throw new Error();
        const canjes = await res.json();

        if (canjes.length === 0) {
            cont.innerHTML = `
                <div class="ss-vacio">
                    <i class="fas fa-gift"></i>
                    <p>No tenés premios pendientes de coordinar en este momento.</p>
                </div>`;
            return;
        }

        cont.innerHTML = canjes.map(ssRenderCanje).join('');
    } catch (e) {
        cont.innerHTML = '<p class="ss-error">No pudimos cargar tus premios. Probá de nuevo más tarde.</p>';
    }
}

function ssRenderCanje(c) {
    const badge = c.redemptionType === 'PREMIUM' ? '⭐ Premium' : '🎁 Club de Beneficios';
    const imagen = c.rewardImageUrl ? `<img src="${c.rewardImageUrl}" alt="${c.rewardName}">` : '';
    const header = `
        <div class="ss-canje-header">
            ${imagen}
            <div>
                <span class="ss-canje-badge">${badge}</span>
                <h3>${c.rewardName}</h3>
            </div>
        </div>`;

    if (c.status === 'COORDINATED') {
        const detalle = c.chosenDeliveryPoint
            ? `<p><strong>${c.chosenDeliveryPoint.locationReference}</strong><br>${c.chosenDeliveryPoint.scheduleInfo}</p>`
            : (c.deliveryAddress ? `<p>Envío a: <strong>${c.deliveryAddress}</strong></p>` : '');
                const whatsapp = c.whatsappSupportPhone
                    ? `<p class="ss-whatsapp"><strong>Importante:</strong> tenés que comunicarte sí o sí por
                       <a href="https://wa.me/${c.whatsappSupportPhone.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                       para confirmar el día y horario exactos, o avisarnos si no podés en el rango informado.</p>`
                    : '';
        return `
            <div class="ss-canje-card ss-coordinado">
                ${header}
                <p class="ss-canje-estado">✅ Coordinado</p>
                ${detalle}
                ${whatsapp}
            </div>`;
    }

    // PENDING
    if (c.deliveryMethod === 'ENVIO_DOMICILIO') {
        return `
            <div class="ss-canje-card">
                ${header}
                <p>Este premio se envía a domicilio. Ingresá la dirección donde querés recibirlo:</p>
                <textarea id="ssDireccion-${c.id}" rows="2" placeholder="Calle, número, piso/depto, localidad"></textarea>
                <button onclick="ssElegirDireccion(${c.id}, '${c.redemptionType}')">Confirmar dirección</button>
            </div>`;
    }

    if (!c.deliveryPoints || c.deliveryPoints.length === 0) {
        return `
            <div class="ss-canje-card">
                ${header}
                <p class="ss-esperando">Todavía estamos preparando las opciones de entrega de este premio. Volvé a revisar en un ratito.</p>
            </div>`;
    }

    const opciones = c.deliveryPoints.map(p => `
        <label class="ss-punto-opcion">
            <input type="radio" name="ssPunto-${c.id}" value="${p.id}">
            <span><strong>${p.locationReference}</strong><br>${p.scheduleInfo}</span>
        </label>`).join('');

    return `
        <div class="ss-canje-card">
            ${header}
            <p>Elegí dónde y cuándo vas a retirarlo:</p>
            <div class="ss-puntos-lista">${opciones}</div>
            <button onclick="ssElegirPunto(${c.id}, '${c.redemptionType}')">Confirmar</button>
        </div>`;
}

async function ssElegirPunto(id, tipo) {
    const seleccionado = document.querySelector(`input[name="ssPunto-${id}"]:checked`);
    if (!seleccionado) { alert('Elegí un punto de entrega.'); return; }

    const path = tipo === 'PREMIUM' ? `canjes-premium/${id}/elegir-punto` : `canjes/${id}/elegir-punto`;
    try {
        const res = await fetch(`${CONFIG.API_URL}/self-service/${path}`, {
            method: 'POST',
            headers: { ...ssAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryPointId: seleccionado.value })
        });
        if (!res.ok) throw new Error();
        await ssCargarCanjes();
    } catch (e) {
        alert('No pudimos guardar tu elección. Probá de nuevo.');
    }
}

async function ssElegirDireccion(id, tipo) {
    const address = document.getElementById(`ssDireccion-${id}`).value.trim();
    if (!address) { alert('Ingresá una dirección.'); return; }

    const path = tipo === 'PREMIUM' ? `canjes-premium/${id}/elegir-punto` : `canjes/${id}/elegir-punto`;
    try {
        const res = await fetch(`${CONFIG.API_URL}/self-service/${path}`, {
            method: 'POST',
            headers: { ...ssAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });
        if (!res.ok) throw new Error();
        await ssCargarCanjes();
    } catch (e) {
        alert('No pudimos guardar tu dirección. Probá de nuevo.');
    }
}

ssActualizarCooldown();
iniciarCentroAutogestion();
