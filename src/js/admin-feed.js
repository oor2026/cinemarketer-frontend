// ==============================================
// admin-feed.js - Gestión del feed principal (película destacada)
// ==============================================

const adminFeed = {

    cargado: false,
    peliculaSeleccionadaId: null,
    debounceTimer: null,

    async init() {
            // Evita recargar de nuevo cada vez que se hace click en la sección
            if (this.cargado) return;
            this.cargado = true;
            await this.cargarDestacadaActual();
            await this.cargarCarrusel();
        },

    // ------------------------------------------
    // DESTACADA ACTUAL
    // ------------------------------------------
    async cargarDestacadaActual() {
        const cont = document.getElementById('feedDestacadaActual');
        cont.innerHTML = `<p style="color:#888;"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>`;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/feed/destacada`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 204) {
                cont.innerHTML = `<p style="color:#888;">No hay ninguna película destacada configurada. La sección está oculta en el feed real.</p>`;
                return;
            }
            if (!response.ok) throw new Error();

            const data = await response.json();
            const pelicula = await this.resolverPelicula(data.movieId);

            cont.innerHTML = this.renderPreview(pelicula, data.updatedAt, data.updatedByAdminEmail);
        } catch (error) {
            cont.innerHTML = `<p style="color:#e50914;">Error al cargar la destacada actual</p>`;
        }
    },

    renderPreview(pelicula, updatedAt, updatedByAdminEmail) {
        if (!pelicula) {
            return `<p style="color:#e50914;">La película configurada ya no está disponible en TMDb</p>`;
        }
        const poster = pelicula.poster_path
            ? `https://image.tmdb.org/t/p/w200${pelicula.poster_path}`
            : 'assets/images/isologotipo.webp';
        const anio = pelicula.release_date ? pelicula.release_date.substring(0, 4) : '—';
        const meta = updatedAt
            ? `<br><small style="color:#888;">Actualizada el ${new Date(updatedAt).toLocaleDateString('es-AR')} por ${updatedByAdminEmail || '—'}</small>`
            : '';

        return `
            <img src="${poster}" alt="${pelicula.title}" style="width:70px;height:105px;object-fit:cover;border-radius:6px;">
            <div>
                <strong>${pelicula.title}</strong> <span style="color:#888;">(${anio})</span><br>
                <span style="color:#f5c518;">★ ${pelicula.vote_average ? pelicula.vote_average.toFixed(1) : '—'}</span>
                ${meta}
            </div>
            <button class="btn-accion btn-eliminar" style="margin-left:auto;" onclick="adminFeed.quitar()" title="Quitar destacada">
                <i class="fas fa-times"></i> Quitar
            </button>
        `;
    },

    async resolverPelicula(movieId) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/movies/${movieId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            return await response.json();
        } catch {
            return null;
        }
    },

    // ------------------------------------------
    // BÚSQUEDA
    // ------------------------------------------
    buscar(texto) {
        clearTimeout(this.debounceTimer);
        const query = texto.trim();
        const resultados = document.getElementById('feedResultadosBusqueda');

        if (query.length < 2) {
            resultados.style.display = 'none';
            return;
        }

        this.debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/movies/search?query=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error();
                const data = await response.json();
                this.renderResultados(data.results || []);
            } catch {
                resultados.innerHTML = `<div style="padding:0.75rem;color:#e50914;">Error al buscar</div>`;
                resultados.style.display = 'block';
            }
        }, 350);
    },

    renderResultados(peliculas) {
        const cont = document.getElementById('feedResultadosBusqueda');

        if (peliculas.length === 0) {
            cont.innerHTML = `<div style="padding:0.75rem;color:#888;">Sin resultados</div>`;
            cont.style.display = 'block';
            return;
        }

        cont.innerHTML = peliculas.slice(0, 8).map(p => {
            const poster = p.poster_path
                ? `https://image.tmdb.org/t/p/w92${p.poster_path}`
                : 'assets/images/isologotipo.webp';
            const anio = p.release_date ? p.release_date.substring(0, 4) : '—';
            return `
                <div onclick="adminFeed.seleccionar(${p.id})"
                     style="display:flex;gap:0.75rem;align-items:center;padding:0.5rem 0.75rem;cursor:pointer;border-bottom:1px solid #f0f0f0;"
                     onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background='white'">
                    <img src="${poster}" style="width:32px;height:48px;object-fit:cover;border-radius:4px;">
                    <span>${p.title} <small style="color:#888;">(${anio})</small></span>
                </div>`;
        }).join('');
        cont.style.display = 'block';
    },

    async seleccionar(movieId) {
        document.getElementById('feedResultadosBusqueda').style.display = 'none';
        document.getElementById('feedBuscarPelicula').value = '';

        const pelicula = await this.resolverPelicula(movieId);
        if (!pelicula) {
            alert('No se pudo cargar esa película');
            return;
        }

        this.peliculaSeleccionadaId = movieId;
        const preview = document.getElementById('feedSeleccionPreview');
        preview.style.display = 'flex';
        preview.innerHTML = this.renderPreview(pelicula, null, null)
            .replace(/<button.*?<\/button>/s, ''); // acá no mostramos el botón "Quitar", todavía no se guardó

        document.getElementById('feedBtnGuardar').disabled = false;
    },

    // ------------------------------------------
    // GUARDAR / QUITAR
    // ------------------------------------------
    async guardar() {
        if (!this.peliculaSeleccionadaId) return;
        const btn = document.getElementById('feedBtnGuardar');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Guardando...`;

        try {
            const response = await fetch(`${CONFIG.API_URL}/admin/feed/destacada`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ movieId: this.peliculaSeleccionadaId })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Error al guardar');
            }

            this.peliculaSeleccionadaId = null;
            document.getElementById('feedSeleccionPreview').style.display = 'none';
            await this.cargarDestacadaActual();
        } catch (error) {
            alert(error.message || 'Error al guardar la destacada');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-check"></i> Guardar como destacada`;
        }
    },

    async quitar() {
            if (!confirm('¿Quitar la película destacada? El feed va a ocultar esa sección hasta que elijas otra.')) return;
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/feed/destacada`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error();
                await this.cargarDestacadaActual();
            } catch {
                alert('Error al quitar la destacada');
            }
        },

        // ==============================================
        // CARRUSEL
        // ==============================================
        tipoPremioSeleccionando: null,
        debounceCarruselTimer: null,

        async cargarCarrusel() {
            const cont = document.getElementById('carruselListaActual');
            cont.innerHTML = `<p style="color:#888;"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>`;

            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error();
                const items = await response.json();

                if (items.length === 0) {
                    cont.innerHTML = `<p style="color:#888;">El carrusel está vacío — se muestra la destacada fija (si hay una configurada).</p>`;
                    return;
                }

                const filas = await Promise.all(items.map((item, idx) => this.renderFilaCarrusel(item, idx, items.length)));
                cont.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.5rem;">${filas.join('')}</div>`;
            } catch {
                cont.innerHTML = `<p style="color:#e50914;">Error al cargar el carrusel</p>`;
            }
        },

        async renderFilaCarrusel(item, idx, total) {
            let etiqueta = '';
            let icono = '';

            if (item.tipo === 'PELICULA_DESTACADA') {
                                icono = '<i class="fas fa-film"></i>';
                                etiqueta = 'Película destacada';
                            } else if (item.tipo === 'RANKING_TRIVIA') {
                                icono = '<i class="fas fa-trophy"></i>';
                                etiqueta = 'Ranking Trivia (Adivina Adivinador)';
                            } else if (item.tipo === 'PELICULA_CARRUSEL') {
                    icono = '<i class="fas fa-clapperboard"></i>';
                    try {
                        const res = await fetch(`${CONFIG.API_URL}/movies/${item.movieId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const p = res.ok ? await res.json() : null;
                        etiqueta = p ? `${p.title} <small style="color:#888;">(película)</small>` : `Película #${item.movieId} (no encontrada)`;
                    } catch {
                        etiqueta = `Película #${item.movieId}`;
                    }
                } else {
                icono = item.tipo === 'PREMIO_COMUN' ? '<i class="fas fa-gift"></i>' : '<i class="fas fa-star"></i>';
                const urlBase = item.tipo === 'PREMIO_COMUN' ? '/rewards/' : '/premium/rewards/';
                try {
                    const res = await fetch(`${CONFIG.API_URL}${urlBase}${item.rewardId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const premio = res.ok ? await res.json() : null;
                    etiqueta = premio ? `${premio.name} <small style="color:#888;">(${item.tipo === 'PREMIO_COMUN' ? 'común' : 'especial'})</small>` : `Premio #${item.rewardId} (no encontrado)`;
                } catch {
                    etiqueta = `Premio #${item.rewardId}`;
                }
            }

            return `
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.9rem;background:#f8f8f8;border-radius:8px;">
                    ${icono}
                    <span style="flex:1;">${etiqueta}</span>
                    <button class="btn-accion" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''} onclick="adminFeed.moverCarrusel(${item.id}, 'subir')" title="Subir"><i class="fas fa-chevron-up"></i></button>
                    <button class="btn-accion" ${idx === total - 1 ? 'disabled style="opacity:0.3;"' : ''} onclick="adminFeed.moverCarrusel(${item.id}, 'bajar')" title="Bajar"><i class="fas fa-chevron-down"></i></button>
                    <button class="btn-accion btn-eliminar" onclick="adminFeed.quitarDelCarrusel(${item.id})" title="Quitar"><i class="fas fa-times"></i></button>
                </div>`;
        },

        async agregarPeliculaAlCarrusel() {
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel/pelicula`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Error al agregar');
                }
                await this.cargarCarrusel();
            } catch (error) {
                alert(error.message);
            }
        },

        async agregarRankingAlCarrusel() {
                    try {
                        const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel/ranking-trivia`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) {
                            const err = await response.json().catch(() => ({}));
                            throw new Error(err.error || 'Error al agregar');
                        }
                        await this.cargarCarrusel();
                    } catch (error) {
                        alert(error.message);
                    }
                },

        abrirSelectorPremio(tipo) {
            this.tipoPremioSeleccionando = tipo;
            document.getElementById('carruselSelectorPremio').style.display = 'block';
            document.getElementById('carruselBuscarPremio').value = '';
            document.getElementById('carruselBuscarPremio').focus();
            document.getElementById('carruselResultadosPremio').style.display = 'none';
        },

        buscarPremio(texto) {
            clearTimeout(this.debounceCarruselTimer);
            const query = texto.trim().toLowerCase();
            const cont = document.getElementById('carruselResultadosPremio');

            this.debounceCarruselTimer = setTimeout(async () => {
                try {
                    const esComun = this.tipoPremioSeleccionando === 'COMUN';
                    const url = esComun ? `${CONFIG.API_URL}/rewards/all` : `${CONFIG.API_URL}/premium/rewards`;
                    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!response.ok) throw new Error();
                    let premios = await response.json();

                    if (query.length > 0) {
                        premios = premios.filter(p => (p.name || '').toLowerCase().includes(query));
                    }

                    if (premios.length === 0) {
                        cont.innerHTML = `<div style="padding:0.75rem;color:#888;">Sin resultados</div>`;
                        cont.style.display = 'block';
                        return;
                    }

                    cont.innerHTML = premios.slice(0, 15).map(p => `
                        <div onclick="adminFeed.seleccionarPremio(${p.id})"
                             style="display:flex;gap:0.75rem;align-items:center;padding:0.5rem 0.75rem;cursor:pointer;border-bottom:1px solid #f0f0f0;"
                             onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background='white'">
                            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : '<i class="fas fa-gift" style="width:32px;text-align:center;color:#888;"></i>'}
                            <span>${p.name}</span>
                        </div>`).join('');
                    cont.style.display = 'block';
                } catch {
                    cont.innerHTML = `<div style="padding:0.75rem;color:#e50914;">Error al buscar</div>`;
                    cont.style.display = 'block';
                }
            }, 300);
        },

        async seleccionarPremio(rewardId) {
            const tipo = this.tipoPremioSeleccionando === 'COMUN' ? 'PREMIO_COMUN' : 'PREMIO_ESPECIAL';
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel/premio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ tipo, rewardId })
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Error al agregar el premio');
                }
                document.getElementById('carruselSelectorPremio').style.display = 'none';
                document.getElementById('carruselResultadosPremio').style.display = 'none';
                await this.cargarCarrusel();
            } catch (error) {
                alert(error.message);
            }
        },

        async quitarDelCarrusel(itemId) {
            if (!confirm('¿Quitar este elemento del carrusel?')) return;
            try {
                const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel/${itemId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error();
                await this.cargarCarrusel();
            } catch {
                alert('Error al quitar el elemento');
            }
        },

        async moverCarrusel(itemId, direccion) {
                try {
                    const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel/${itemId}/${direccion}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error();
                    await this.cargarCarrusel();
                } catch {
                            alert('Error al mover el elemento');
                        }
                    },

                debounceCarruselPeliculaTimer: null,

            abrirSelectorPelicula() {
                document.getElementById('carruselSelectorPelicula').style.display = 'block';
                document.getElementById('carruselBuscarPelicula').value = '';
                document.getElementById('carruselBuscarPelicula').focus();
                document.getElementById('carruselResultadosPelicula').style.display = 'none';
            },

            buscarPeliculaCarrusel(texto) {
                clearTimeout(this.debounceCarruselPeliculaTimer);
                const query = texto.trim();
                const cont = document.getElementById('carruselResultadosPelicula');

                if (query.length < 2) {
                    cont.style.display = 'none';
                    return;
                }

                this.debounceCarruselPeliculaTimer = setTimeout(async () => {
                    try {
                        const response = await fetch(`${CONFIG.API_URL}/movies/search?query=${encodeURIComponent(query)}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) throw new Error();
                        const data = await response.json();
                        const peliculas = data.results || [];

                        if (peliculas.length === 0) {
                            cont.innerHTML = `<div style="padding:0.75rem;color:#888;">Sin resultados</div>`;
                            cont.style.display = 'block';
                            return;
                        }

                        cont.innerHTML = peliculas.slice(0, 8).map(p => {
                            const poster = p.poster_path
                                ? `https://image.tmdb.org/t/p/w92${p.poster_path}`
                                : 'assets/images/isologotipo.webp';
                            const anio = p.release_date ? p.release_date.substring(0, 4) : '—';
                            return `
                                <div onclick="adminFeed.seleccionarPeliculaCarrusel(${p.id})"
                                     style="display:flex;gap:0.75rem;align-items:center;padding:0.5rem 0.75rem;cursor:pointer;border-bottom:1px solid #f0f0f0;"
                                     onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background='white'">
                                    <img src="${poster}" style="width:32px;height:48px;object-fit:cover;border-radius:4px;">
                                    <span>${p.title} <small style="color:#888;">(${anio})</small></span>
                                </div>`;
                        }).join('');
                        cont.style.display = 'block';
                    } catch {
                        cont.innerHTML = `<div style="padding:0.75rem;color:#e50914;">Error al buscar</div>`;
                        cont.style.display = 'block';
                    }
                }, 350);
            },

            async seleccionarPeliculaCarrusel(movieId) {
                try {
                    const response = await fetch(`${CONFIG.API_URL}/admin/feed/carrusel/pelicula-nueva`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ movieId })
                    });
                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error || 'Error al agregar la película');
                    }
                    document.getElementById('carruselSelectorPelicula').style.display = 'none';
                    document.getElementById('carruselResultadosPelicula').style.display = 'none';
                    await this.cargarCarrusel();
                } catch (error) {
                    alert(error.message);
                }
            },
        };

        window.adminFeed = adminFeed;