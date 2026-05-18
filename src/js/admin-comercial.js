// =============================================
// admin-comercial.js — Módulo Comercial
// Gestión de banners publicitarios
// Cinemarketer
// =============================================

const adminComercial = (() => {

    const API_URL = CONFIG.API_URL;
    let banners = [];
    let bannerEditandoId = null;
    let bannerEliminarId = null;

    // ── Labels legibles ──
    const MODULO_LABELS = {
        MI_CUENTA:     'Mi Cuenta',
        MIS_PUNTOS:    'Mis Puntos',
        MIS_PREMIOS:   'Mis Premios',
        MIS_CONSULTAS: 'Mis Consultas',
        CONTACTO:      'Contacto',
        FEED_FILMS:    'Feed de Películas'
    };

    const POSICION_LABELS = {
        IZQUIERDO: 'Lateral izquierdo',
        DERECHO:   'Lateral derecho'
    };

    // =============================================
    // CARGAR BANNERS
    // =============================================
    async function cargar() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/admin/banners`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar banners');
            banners = await res.json();
            renderTabla(banners);
            actualizarStats(banners);
        } catch (e) {
            document.getElementById('tablaBannersBody').innerHTML =
                `<tr><td colspan="7" style="text-align:center;color:#e50914;">Error al cargar banners</td></tr>`;
        }
    }

    // =============================================
    // RENDER TABLA
    // =============================================
    function renderTabla(lista) {
        const tbody = document.getElementById('tablaBannersBody');
        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No hay banners creados aún</td></tr>`;
            return;
        }

        tbody.innerHTML = lista.map(b => `
            <tr>
                <td>
                    ${b.imageUrl
                        ? `<img src="${b.imageUrl}" class="banner-preview-thumb" alt="Banner">`
                        : `<div class="banner-sin-imagen"><i class="fas fa-image"></i></div>`
                    }
                </td>
                <td><strong>${b.nombreMarca || '—'}</strong></td>
                <td><span class="badge-modulo">${MODULO_LABELS[b.modulo] || b.modulo}</span></td>
                <td><span class="badge-posicion">${POSICION_LABELS[b.posicion] || b.posicion}</span></td>
                <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${b.linkDestino
                        ? `<a href="${b.linkDestino}" target="_blank" rel="noopener" title="${b.linkDestino}">${b.linkDestino}</a>`
                        : '<span style="color:#bbb;">Sin link</span>'
                    }
                </td>
                <td>
                    <button class="btn-toggle-visible ${b.visible ? 'visible' : 'oculto'}"
                            onclick="adminComercial.toggleVisible(${b.id})">
                        ${b.visible ? '✅ Visible' : '🚫 Oculto'}
                    </button>
                </td>
                <td>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                        <button class="btn-accion btn-editar" onclick="adminComercial.abrirFormulario(${b.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-accion btn-eliminar" onclick="adminComercial.abrirEliminar(${b.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // =============================================
    // STATS
    // =============================================
    function actualizarStats(lista) {
        document.getElementById('comercialStatTotal').textContent     = lista.length;
        document.getElementById('comercialStatVisibles').textContent  = lista.filter(b => b.visible).length;
        document.getElementById('comercialStatOcultos').textContent   = lista.filter(b => !b.visible).length;
        document.getElementById('comercialStatSinImagen').textContent = lista.filter(b => !b.imageUrl).length;
    }

    // =============================================
    // FILTROS
    // =============================================
    function filtrar() {
        const modulo      = document.getElementById('filtroModuloBanners').value;
        const visibilidad = document.getElementById('filtroVisibilidadBanners').value;

        let filtrados = [...banners];

        if (modulo !== 'todos') {
            filtrados = filtrados.filter(b => b.modulo === modulo);
        }

        if (visibilidad === 'visibles') {
            filtrados = filtrados.filter(b => b.visible);
        } else if (visibilidad === 'ocultos') {
            filtrados = filtrados.filter(b => !b.visible);
        }

        renderTabla(filtrados);
    }

    // =============================================
    // ABRIR FORMULARIO (nuevo o editar)
    // =============================================
    function abrirFormulario(id = null) {
        bannerEditandoId = id;

        document.getElementById('modalComercialTitulo').textContent =
            id ? 'Editar Banner' : 'Nuevo Banner';
        document.getElementById('btnComercialGuardarLabel').textContent =
            id ? 'Guardar cambios' : 'Crear Banner';

        document.getElementById('inputBannerMarca').value    = '';
        document.getElementById('inputBannerLink').value     = '';
        document.getElementById('inputBannerModulo').value   = '';
        document.getElementById('inputBannerPosicion').value = '';
        document.getElementById('inputBannerVisible').value  = 'true';

        const imagenSection = document.getElementById('bannerImagenSection');
        const notaGuardar   = document.getElementById('comercialNotaGuardar');
        const preview       = document.getElementById('comercialPreview');

        if (id) {
            const banner = banners.find(b => b.id === id);
            if (banner) {
                document.getElementById('inputBannerMarca').value    = banner.nombreMarca || '';
                document.getElementById('inputBannerLink').value     = banner.linkDestino || '';
                document.getElementById('inputBannerModulo').value   = banner.modulo || '';
                document.getElementById('inputBannerPosicion').value = banner.posicion || '';
                document.getElementById('inputBannerVisible').value  = banner.visible ? 'true' : 'false';
            }

            imagenSection.style.display = 'block';
            notaGuardar.style.display   = 'none';

            if (banner && banner.imageUrl) {
                preview.innerHTML = `<img src="${banner.imageUrl}" alt="Banner actual">`;
                document.getElementById('btnEliminarImagen').style.display = 'inline-flex';
            } else {
                preview.innerHTML = `<i class="fas fa-image"></i><span>Sin imagen</span>`;
                document.getElementById('btnEliminarImagen').style.display = 'none';
            }
        } else {
            imagenSection.style.display = 'none';
            notaGuardar.style.display   = 'block';
        }

        document.getElementById('modalComercialOverlay').classList.add('open');
        document.getElementById('modalComercial').classList.add('open');
    }

    function cerrarFormulario() {
        document.getElementById('modalComercialOverlay').classList.remove('open');
        document.getElementById('modalComercial').classList.remove('open');
        bannerEditandoId = null;
    }

    // =============================================
    // GUARDAR (crear o editar)
    // =============================================
    async function guardar() {
        const token = localStorage.getItem('token');

        const marca    = document.getElementById('inputBannerMarca').value.trim();
        const link     = document.getElementById('inputBannerLink').value.trim();
        const modulo   = document.getElementById('inputBannerModulo').value;
        const posicion = document.getElementById('inputBannerPosicion').value;
        const visible  = document.getElementById('inputBannerVisible').value === 'true';

        if (!marca || !modulo || !posicion) {
            alert('Completá los campos obligatorios: Marca, Módulo y Posición.');
            return;
        }

        const body = { nombreMarca: marca, linkDestino: link, modulo, posicion, visible };

        const btnLabel = document.getElementById('btnComercialGuardarLabel');
        btnLabel.textContent = 'Guardando...';

        try {
            const url    = bannerEditandoId
                ? `${API_URL}/admin/banners/${bannerEditandoId}`
                : `${API_URL}/admin/banners`;
            const method = bannerEditandoId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Error al guardar');
            const bannerGuardado = await res.json();

            if (!bannerEditandoId) {
                bannerEditandoId = bannerGuardado.id;
                document.getElementById('bannerImagenSection').style.display   = 'block';
                document.getElementById('comercialNotaGuardar').style.display  = 'none';
                document.getElementById('modalComercialTitulo').textContent    = 'Editar Banner';
                document.getElementById('btnComercialGuardarLabel').textContent = 'Guardar cambios';
                mostrarToastAdmin('Banner creado. Ahora podés subir la imagen.', 'success');
            } else {
                mostrarToastAdmin('Banner actualizado correctamente.', 'success');
                cerrarFormulario();
            }

            await cargar();

        } catch (e) {
            mostrarToastAdmin('Error al guardar el banner.', 'error');
        } finally {
            btnLabel.textContent = bannerEditandoId ? 'Guardar cambios' : 'Crear Banner';
        }
    }

    // =============================================
    // TOGGLE VISIBLE
    // =============================================
    async function toggleVisible(id) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/admin/banners/${id}/toggle-visible`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            mostrarToastAdmin(data.message, 'success');
            await cargar();
        } catch (e) {
            mostrarToastAdmin('Error al cambiar visibilidad.', 'error');
        }
    }

    // =============================================
    // SUBIR IMAGEN
    // =============================================
    function previewImagen(input) {
        const file = input.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen no puede superar los 2MB.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('comercialPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);

        subirImagen(file);
    }

    async function subirImagen(file) {
        if (!bannerEditandoId) return;
        const token = localStorage.getItem('token');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`${API_URL}/admin/banners/${bannerEditandoId}/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al subir imagen');
            }

            document.getElementById('btnEliminarImagen').style.display = 'inline-flex';
            mostrarToastAdmin('Imagen subida correctamente.', 'success');
            await cargar();

        } catch (e) {
            mostrarToastAdmin(e.message, 'error');
        }
    }

    // =============================================
    // ELIMINAR IMAGEN
    // =============================================
    async function eliminarImagen() {
        if (!bannerEditandoId) return;
        if (!confirm('¿Eliminar la imagen de este banner?')) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/admin/banners/${bannerEditandoId}/image`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();

            const preview = document.getElementById('comercialPreview');
            preview.innerHTML = `<i class="fas fa-image"></i><span>Sin imagen</span>`;
            document.getElementById('btnEliminarImagen').style.display = 'none';
            mostrarToastAdmin('Imagen eliminada.', 'success');
            await cargar();

        } catch (e) {
            mostrarToastAdmin('Error al eliminar la imagen.', 'error');
        }
    }

    // =============================================
    // ELIMINAR BANNER
    // =============================================
    function abrirEliminar(id) {
        bannerEliminarId = id;
        const banner = banners.find(b => b.id === id);
        document.getElementById('eliminarBannerNombre').textContent =
            banner ? (banner.nombreMarca || 'este banner') : 'este banner';

        document.getElementById('modalEliminarBannerOverlay').classList.add('open');
        document.getElementById('modalEliminarBanner').classList.add('open');
    }

    function cerrarEliminar() {
        document.getElementById('modalEliminarBannerOverlay').classList.remove('open');
        document.getElementById('modalEliminarBanner').classList.remove('open');
        bannerEliminarId = null;
    }

    async function confirmarEliminar() {
        if (!bannerEliminarId) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/admin/banners/${bannerEliminarId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            mostrarToastAdmin('Banner eliminado correctamente.', 'success');
            cerrarEliminar();
            await cargar();
        } catch (e) {
            mostrarToastAdmin('Error al eliminar el banner.', 'error');
        }
    }

    // =============================================
    // TOAST (reutiliza el sistema del admin)
    // =============================================
    function mostrarToastAdmin(mensaje, tipo) {
        if (typeof toast === 'function') {
            toast(mensaje, tipo);
        } else {
            alert(mensaje);
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================
    return {
        cargar,
        filtrar,
        abrirFormulario,
        cerrarFormulario,
        guardar,
        toggleVisible,
        previewImagen,
        eliminarImagen,
        abrirEliminar,
        cerrarEliminar,
        confirmarEliminar
    };

})();