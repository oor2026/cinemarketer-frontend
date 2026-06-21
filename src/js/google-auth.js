// ==============================================
// google-auth.js — Autenticación con Google
// ==============================================

window.googleAuth = {

    _tokenTemporal: null,

    _initialized: false,

    iniciar: function() {
            if (!window.googleAuth._initialized) {
                google.accounts.id.initialize({
                    client_id: '842892243934-ug8f2tn79ohm9nqvca01kjt84i5q6vic.apps.googleusercontent.com',
                    callback: window.googleAuth._handleCredential,
                    ux_mode: 'popup',
                    use_fedcm_for_prompt: false
                });
                window.googleAuth._initialized = true;
            }

            // Crear contenedor temporal invisible para renderButton
            let tempDiv = document.getElementById('_googleBtnTemp');
            if (!tempDiv) {
                tempDiv = document.createElement('div');
                tempDiv.id = '_googleBtnTemp';
                tempDiv.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden;';
                document.body.appendChild(tempDiv);
            }

            // Renderizar botón real de Google y hacer click automático
            google.accounts.id.renderButton(tempDiv, {
                type: 'standard',
                theme: 'outline',
                size: 'large'
            });

            // Hacer click en el botón real que Google renderizó
            setTimeout(() => {
                const googleBtn = tempDiv.querySelector('div[role="button"]');
                if (googleBtn) {
                    googleBtn.click();
                } else {
                    // Fallback: intentar prompt de todas formas
                    google.accounts.id.prompt();
                }
            }, 100);
        },

    _handleCredential: async function(googleResponse) {
        const btn = document.getElementById('googleLoginBtn');
        if (btn) { btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }

        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: googleResponse.credential })
            });

            const data = await response.json();

            if (!response.ok) {
                let mensaje = data.message || data.detail || data.title || data.error || 'Error al autenticar con Google';
                mensaje = mensaje.replace(/^\d{3}\s+[A-Z_]+\s+"?/i, '').replace(/"$/, '');
                showToast('error', mensaje);
                return;
            }

            // Guardar token temporalmente
            window.googleAuth._tokenTemporal = data.token;

            if (!data.profileComplete) {
                // Mostrar modal de completar perfil
                const modal = document.getElementById('googleCompleteProfileModal');
                if (modal) modal.style.display = 'flex';
                return;
            }

            // Perfil completo — guardar y redirigir
            window.googleAuth._guardarSesionYRedirigir(data);

        } catch (error) {
            showToast('error', 'Error de conexión con el servidor');
        } finally {
            if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
        }
    },

    completarPerfil: async function() {
        const dni   = document.getElementById('googleDni')?.value.trim() || '';
        const phone = document.getElementById('googlePhone')?.value.trim() || '';
        const errorEl = document.getElementById('googleProfileError');
        const btn   = document.getElementById('googleCompleteBtn');

        // Validar DNI
        if (!/^\d{7,8}$/.test(dni)) {
            errorEl.textContent = 'El DNI debe tener 7 u 8 dígitos numéricos, sin puntos.';
            errorEl.style.display = 'block';
            return;
        }

        // Validar teléfono
        if (!phone || phone.length < 6) {
            errorEl.textContent = 'El teléfono debe tener al menos 6 dígitos.';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/google/complete-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.googleAuth._tokenTemporal}`
                },
                body: JSON.stringify({ dni, phone: `+54${phone}` })
            });

            const data = await response.json();

            if (response.status === 409) {
                errorEl.textContent = 'Este DNI ya se encuentra registrado. Si cometiste un error, contactanos a info@cinemarketer.com.ar';
                errorEl.style.display = 'block';
                return;
            }

            if (!response.ok) {
                errorEl.textContent = data.message || 'Error al guardar los datos.';
                errorEl.style.display = 'block';
                return;
            }

            // Cerrar modal y redirigir
            const modal = document.getElementById('googleCompleteProfileModal');
            if (modal) modal.style.display = 'none';

            window.googleAuth._guardarSesionYRedirigir(data);

        } catch (error) {
            errorEl.textContent = 'Error de conexión. Intentá de nuevo.';
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Ingresar a Cinemarketer';
        }
    },

    _guardarSesionYRedirigir: function(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userPoints', data.totalPoints);
        localStorage.setItem('userLevel', data.level || 'AMATEUR');

        showToast('success', '¡Bienvenido a Cinemarketer!');

        setTimeout(() => {
            if (data.role === 'ADMIN') {
                window.location.replace('admin/admin.html');
            } else {
                window.location.replace('dashboard.html');
            }
        }, 1500);
    }
};