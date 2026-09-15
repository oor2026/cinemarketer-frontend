// ============================================================
// CENTRO DE AUTOGESTIÓN DE ENTREGA DE PREMIOS
// Página standalone, sin login del sitio. Identidad por magic
// link (mail -> token de un solo uso -> JWT real de Cinemarketer,
// vía /api/self-service/*). El JWT se guarda en sessionStorage
// (no localStorage) — es un acceso puntual para coordinar un
// premio, no una sesión general del sitio.
// ============================================================

const SS_TOKEN_KEY = 'ss_token';

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
async function ssPedirLink() {
    const email = document.getElementById('ssEmailInput').value.trim();
    const btn = document.getElementById('ssBtnPedirLink');
    const msg = document.getElementById('ssEmailMensaje');
    if (!email) return;

    btn.disabled = true;
    try {
        const res = await fetch(`${CONFIG.API_URL}/self-service/request-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        msg.textContent = data.message || 'Si el email está registrado, recibirás el enlace en breve.';
        msg.style.display = 'block';
    } catch (e) {
        msg.textContent = 'Ocurrió un error. Probá de nuevo en un momento.';
        msg.style.display = 'block';
    } finally {
        btn.disabled = false;
    }
}

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
            ssMostrarFormPerfil(data.faltantes);
            return;
        }
    } catch (e) {
        ssMostrarError('No pudimos cargar tu perfil. Probá de nuevo.');
        return;
    }

    await ssCargarCanjes();
}

function ssMostrarFormPerfil(faltantes) {
    const cont = document.getElementById('ssPerfilCampos');
    let html = '';
    if (faltantes.birthDate) {
        html += `<label for="ssBirthDate">Fecha de nacimiento</label><input type="date" id="ssBirthDate">`;
    }
    if (faltantes.sexo) {
        html += `<label for="ssSexo">Sexo</label>
            <select id="ssSexo">
                <option value="">Elegí una opción</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="X">Prefiero no decir / otro</option>
            </select>`;
    }
    if (faltantes.provincia) {
        html += `<label for="ssProvincia">Provincia</label><input type="text" id="ssProvincia" placeholder="Ej: Buenos Aires">`;
    }
    if (faltantes.localidad) {
        html += `<label for="ssLocalidad">Localidad</label><input type="text" id="ssLocalidad" placeholder="Ej: La Plata">`;
    }
    cont.innerHTML = html;
    ssMostrarPaso('ssStepPerfil');
}

async function ssGuardarPerfil() {
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
        await ssCargarCanjes();
    } catch (e) {
        alert('No pudimos guardar tus datos. Probá de nuevo.');
    } finally {
        btn.disabled = false;
    }
}

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
            ? `<p class="ss-whatsapp">¿Tenés dudas o necesitás la dirección exacta? Escribinos por
               <a href="https://wa.me/${c.whatsappSupportPhone.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>`
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

iniciarCentroAutogestion();
