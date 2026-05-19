// ==============================================
// register.js - Registro de usuarios
// ==============================================

// Elementos del DOM
const registerForm = document.getElementById('registerForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const dniInput = document.getElementById('dni');
const phoneInput = document.getElementById('phone');
const submitBtn = document.getElementById('registerButton');
const errorContainer = document.getElementById('errorContainer');
const termsCheckbox     = document.getElementById('terms');
const privacidadCheckbox = document.getElementById('privacidad');
const normasCheckbox     = document.getElementById('normas');

// ==============================================
// PROVEEDORES DE EMAIL PERMITIDOS
// ==============================================

const DOMINIOS_PERMITIDOS = [
    'gmail', 'hotmail', 'outlook', 'yahoo', 'live', 'msn',
    'icloud', 'me', 'mac', 'protonmail', 'proton',
    'tutanota', 'gmx', 'yandex', 'zoho',
    'fibertel', 'arnet', 'speedy', 'ciudad', 'uolsinectis',
    'infovia', 'personal', 'claro',
    'terra', 'bol', 'uol', 'oi', 'telmex'
];

const DOMINIOS_PERMITIDOS_DISPLAY = [
    'Gmail', 'Hotmail', 'Outlook', 'Yahoo', 'Live', 'iCloud',
    'ProtonMail', 'Tutanota', 'GMX', 'Yandex', 'Zoho',
    'Fibertel', 'Arnet', 'Speedy', 'Ciudad', 'Personal', 'Claro'
];

// TLD simples y compuestos válidos
const TLD_VALIDOS = [
    'com.ar','net.ar','org.ar','gob.ar','edu.ar',
    'com.br','net.br',
    'com.mx','net.mx',
    'com.uy','net.uy',
    'com.co','net.co',
    'com.pe','net.pe',
    'com.cl','com.ve','com.bo','com.py','com.es',
    'com','net','org','info','io','co',
    'ar','es','mx','br','uy','cl','pe','ve','bo','py'
];

// ==============================================
// VALIDACIÓN COMPLETA DE EMAIL
// Reglas alineadas a los estándares de Gmail, Outlook, Yahoo:
// - Parte local: letras, números, puntos, guiones y guiones bajos
// - No empieza ni termina con punto, guión o guión bajo
// - Sin puntos, guiones o guiones bajos consecutivos
// - Longitud parte local: 1-64 caracteres
// - Longitud total: máximo 254 caracteres
// - Proveedor: debe estar en la lista permitida
// - TLD: debe ser uno de los reconocidos
// ==============================================

function validarEmail(email) {
    if (!email) return { valido: false, error: 'El email es obligatorio' };

    // Longitud total máxima RFC 5321
    if (email.length > 254) return { valido: false, error: 'El email es demasiado largo (máximo 254 caracteres)' };

    // Debe tener exactamente un @
    const partes = email.split('@');
    if (partes.length !== 2) return { valido: false, error: 'El email debe contener exactamente un @' };

    const local = partes[0];
    const dominio = partes[1].toLowerCase();

    // Validar parte local
    if (local.length === 0) return { valido: false, error: 'La parte local del email no puede estar vacía' };
    if (local.length > 64) return { valido: false, error: 'La parte local del email no puede superar 64 caracteres' };

    // Solo caracteres permitidos en parte local
    if (!/^[a-zA-Z0-9._-]+$/.test(local)) {
        return { valido: false, error: 'El email contiene caracteres no permitidos. Solo se aceptan letras, números, puntos, guiones y guiones bajos antes del @' };
    }

    // No puede empezar ni terminar con punto, guión o guión bajo
    if (/^[._-]/.test(local) || /[._-]$/.test(local)) {
        return { valido: false, error: 'El email no puede empezar ni terminar con punto, guión o guión bajo' };
    }

    // Sin caracteres especiales consecutivos
    if (/[._-]{2,}/.test(local)) {
        return { valido: false, error: 'El email no puede tener puntos, guiones o guiones bajos consecutivos' };
    }

    // Validar proveedor
    const proveedor = dominio.split('.')[0];
    if (!DOMINIOS_PERMITIDOS.includes(proveedor)) {
        return {
            valido: false,
            error: 'El proveedor de email no está permitido. Los proveedores aceptados son: ' +
                   DOMINIOS_PERMITIDOS_DISPLAY.join(', ') +
                   '. Si deseás registrarte con un dominio privado o institucional, comunicate con nosotros a info@cinemarketer.com.ar'
        };
    }

    // Validar TLD
    const tldParte = dominio.substring(proveedor.length + 1).toLowerCase();
    if (!TLD_VALIDOS.includes(tldParte)) {
        return { valido: false, error: 'La extensión del email (' + tldParte + ') no es reconocida' };
    }

    return { valido: true };
}

// ==============================================
// VALIDACIÓN DE CONTRASEÑA
// ==============================================

function validarPassword(password) {
    const errores = [];
    if (password.length < 8) errores.push('• Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errores.push('• Al menos una letra mayúscula');
    if (!/[0-9]/.test(password)) errores.push('• Al menos un número');
    if (/[^A-Za-z0-9@!_-]/.test(password)) errores.push('• Solo letras, números y @ ! - _');
    return errores;
}

// ==============================================
// VALIDACIÓN COMPLETA DEL FORMULARIO
// ==============================================

function validarFormulario() {
    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    const confirmPassword = confirmPasswordInput?.value || '';
    const dni = dniInput?.value.trim() || '';
    const phoneNumber = document.getElementById('phoneNumber')?.value.trim() || '';
    const terms = termsCheckbox?.checked || false;

    const errores = [];

    // Validar nombre
    if (!name) {
        errores.push('El nombre es obligatorio');
    } else if (name.length < 2) {
        errores.push('El nombre debe tener al menos 2 caracteres');
    } else if (name.length > 50) {
        errores.push('El nombre no puede superar los 50 caracteres');
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+(\s[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+)*$/.test(name)) {
        errores.push('El nombre solo puede contener letras y espacios simples entre palabras');
    }

    // Validar email — validación completa
    const emailValidacion = validarEmail(email);
    if (!emailValidacion.valido) {
        errores.push(emailValidacion.error);
    }

    // Validar DNI
    if (!/^\d{7,8}$/.test(dni)) {
        errores.push('El DNI debe tener 7 u 8 dígitos numéricos');
    }

    // Validar teléfono
    if (!phoneNumber || phoneNumber.length < 6) {
        errores.push('El teléfono debe tener al menos 6 dígitos');
    }

    // Validar contraseña
    const passwordErrores = validarPassword(password);
    if (passwordErrores.length > 0) {
        errores.push('❌ La contraseña debe cumplir:');
        passwordErrores.forEach(err => errores.push(`   ${err}`));
    }

    // Validar confirmación
    if (password !== confirmPassword) {
        errores.push('Las contraseñas no coinciden');
    }

    // Validar los 3 documentos obligatorios
    const privacidad = privacidadCheckbox?.checked || false;
    const normas     = normasCheckbox?.checked || false;
    if (!terms)     errores.push('Debés aceptar los Términos y Condiciones');
    if (!privacidad) errores.push('Debés aceptar la Política de Privacidad');
    if (!normas)     errores.push('Debés aceptar las Normas de Convivencia');

    return errores;
}

// ==============================================
// MOSTRAR ERRORES
// ==============================================

function mostrarErrores(errores) {
    if (!errorContainer) {
        errores.forEach(err => showToast('error', err));
        return;
    }

    if (errores.length === 0) {
        errorContainer.style.display = 'none';
        errorContainer.innerHTML = '';
        return;
    }

    errorContainer.style.display = 'block';
    errorContainer.innerHTML = `
        <div style="
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ffcdd2;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            font-size: 0.9rem;
        ">
            <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
            <strong>Por favor, corregí los siguientes errores:</strong>
            <ul style="margin: 0.5rem 0 0; padding-left: 1.5rem;">
                ${errores.map(err => `<li style="margin: 0.3rem 0;">${err}</li>`).join('')}
            </ul>
        </div>
    `;
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ==============================================
// TOGGLE VISIBILIDAD DE CONTRASEÑA
// ==============================================

function setupPasswordToggles() {
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');

    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function() {
            const type = passwordField.type === 'password' ? 'text' : 'password';
            passwordField.type = type;
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    if (toggleConfirmPassword && confirmPasswordField) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordField.type === 'password' ? 'text' : 'password';
            confirmPasswordField.type = type;
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
}

// ==============================================
// ENVÍO DEL FORMULARIO
// ==============================================

async function handleRegister(e) {
    e.preventDefault();

    const errores = validarFormulario();
    mostrarErrores(errores);
    if (errores.length > 0) return;

    if (submitBtn) {
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-block';
    }

    try {
        const phone = document.getElementById('phone').value;
        const registerData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            dni: dniInput.value.trim(),
            phone: phone
        };

        const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData)
        });

        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (response.ok) {
            mostrarErrores([]);
            const mensajeExito = '✅ ¡Registro exitoso!\n\n' +
                                'Te hemos enviado un email de verificación a:\n' +
                                emailInput.value.trim() + '\n\n' +
                                'Por favor, revisá tu bandeja de entrada y hacé clic en el enlace de verificación antes de iniciar sesión.';

            if (errorContainer) {
                errorContainer.style.display = 'block';
                errorContainer.innerHTML = `
                    <div style="background:#e8f5e9;color:#2e7d32;border:1px solid #c8e6c9;border-radius:8px;padding:1rem;margin:1rem 0;">
                        <i class="fas fa-check-circle" style="margin-right:8px;"></i>
                        <strong>${mensajeExito}</strong>
                        <p style="margin:0.5rem 0 0;">Serás redirigido al login en 3 segundos...</p>
                    </div>
                `;
            } else {
                alert(mensajeExito);
            }
            setTimeout(() => window.location.href = 'login.html', 3000);

        } else {
            if (response.status === 400 && data && typeof data === 'object') {
                if (data.message) {
                    mostrarErrores([data.message]);
                } else {
                    const erroresCampo = Object.entries(data)
                        .filter(([campo]) => !['email', 'emailSent', 'success', 'token', 'type'].includes(campo))
                        .map(([_, mensaje]) => mensaje);
                    mostrarErrores(erroresCampo.length > 0 ? erroresCampo : ['Error en el registro']);
                }
            } else if (response.status === 409) {
                mostrarErrores([data?.message || 'El DNI o email ya están registrados']);
            } else {
                mostrarErrores([data?.message || 'Error en el registro. Intenta de nuevo.']);
            }
        }

    } catch (error) {
        mostrarErrores(['Error de conexión con el servidor']);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }
}

// ==============================================
// EVENTO SUBMIT
// ==============================================

if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
}

document.addEventListener('DOMContentLoaded', function() {
    const termsLink = document.getElementById('termsLink');
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            footerModal.abrir('terminos');
        });
    }
    const privacidadLink = document.getElementById('privacidadLink');
    if (privacidadLink) {
        privacidadLink.addEventListener('click', function(e) {
            e.preventDefault();
            footerModal.abrir('privacidad');
        });
    }
    const normasLink = document.getElementById('normasLink');
    if (normasLink) {
        normasLink.addEventListener('click', function(e) {
            e.preventDefault();
            footerModal.abrir('normasConvivencia');
        });
    }
});