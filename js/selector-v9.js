// ========================================
// SELECTOR DE FOTOS - XV Años Penélope Desirée
// La nube vive en js/supabase-api.js (window.SB): protocolo
// code_version 6 + reloj lógico POR FOTO + realtime.
// ========================================
const SESSION_ID = (window.SB && SB.SESSION_ID) || 'sin-sesion';
let sbDisponible = !!window.SB;

// ========================================
// FOTOS - js/photos-v2.js define window.PHOTOS (nombres de archivo).
// El índice del arreglo ES el foto_index guardado en Supabase.
// ========================================
const PHOTO_FILES = window.PHOTOS || [];
const DIR_FULL    = window.PHOTOS_DIR       || 'imagenes/';
const DIR_THUMB   = window.PHOTOS_THUMB_DIR || 'imagenes/thumb/';
const photos      = PHOTO_FILES.map(f => DIR_FULL  + f);   // resolución completa (modal)
const thumbs      = PHOTO_FILES.map(f => DIR_THUMB + f);   // miniatura (galería)

// ── Configuración del evento (único lugar para cambiar datos del contrato) ──
const CONFIG = {
    slug:               'xv-anos-penelope-gutierrez',
    nombre:             (window.EVENT_CONFIG && window.EVENT_CONFIG.nombre)             || 'Penélope Desirée Gutiérrez',
    telefono:           (window.EVENT_CONFIG && window.EVENT_CONFIG.telefono)           || '',
    fechaEvento:        (window.EVENT_CONFIG && window.EVENT_CONFIG.fechaEvento)        || new Date(2026, 8, 13, 17, 0, 0),
    limiteImpresion:    100,
    limiteAmpliacion:   1,      // contrato: 1 foto ampliada 50x60 cm con marco
    limiteInvitacion:   null,
    costoFotoAdicional: (window.EVENT_CONFIG && window.EVENT_CONFIG.costoFotoAdicional) || 15,
};

const STORAGE_KEY = 'xv_anos_penelope_gutierrez_photo_selections';
const KEY_FILTER   = 'penelope_filter';
const KEY_SCROLL   = 'penelope_scroll';
const KEY_LAST     = 'penelope_last_photo';
const LIMITES = {
    impresion:  CONFIG.limiteImpresion,
    ampliacion: CONFIG.limiteAmpliacion,
    invitacion: CONFIG.limiteInvitacion
};
const COSTO_FOTO_ADICIONAL = CONFIG.costoFotoAdicional;

let photoSelections = {};
let currentPhotoIndex = null;
let currentFilter = 'all';
let touchStartX = 0;
let touchStartY = 0;
let scrollPositionBeforeModal = 0;
let scrollSaveTimer = null;
let modalOpen = false;

// ========================================
// LOCAL STORAGE FUNCTIONS
// ========================================
function mostrarBannerSinSeleccion() {
    if (document.getElementById('banner-sin-sel')) return;
    if (Object.keys(photoSelections).length > 0) return;
    if (CONFIG.fechaEvento > new Date()) return;
    const banner = document.createElement('div');
    banner.id = 'banner-sin-sel';
    banner.style.cssText = 'background:#78350f;color:#fcd34d;text-align:center;padding:12px 20px;font-size:.88rem;position:sticky;top:0;z-index:200;line-height:1.5;';
    banner.innerHTML = '📸 <strong>¡Tus fotos están listas!</strong> Aún no has seleccionado ninguna foto. ¡Empieza ahora! <button onclick="this.parentElement.remove()" style="margin-left:12px;background:transparent;border:1px solid #fcd34d;color:#fcd34d;padding:1px 8px;border-radius:4px;cursor:pointer;font-size:.85rem;">×</button>';
    document.body.insertBefore(banner, document.body.firstChild);
}

/* Guarda sólo en el navegador (respaldo instantáneo y modo offline). */
function saveSelections() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(photoSelections));
    } catch(e) {
        showToast('Error al guardar. Verifica el espacio del navegador.', 'error');
    }
}

/* Fotos con escritura en vuelo: un refresco no debe revertirlas
   mientras el POST viaja. */
const escriturasPendientes = new Set();

/* Sube UNA foto a Supabase (reloj lógico + verificación de escritura).
   Nunca se manda el estado completo: así una sesión no puede pisar
   las fotos que eligió otra. */
function persistirFoto(idx) {
    saveSelections();
    if (!sbDisponible) return;

    escriturasPendientes.add(idx);
    const sel = photoSelections[idx];
    const tarea = (sel && SB.tieneAlgo(sel))
        ? SB.guardarFoto(idx, sel, PHOTO_FILES[idx])
        : SB.borrarFoto(idx);

    tarea.then(res => {
        if (res === 'conflicto') showToast('Esta foto la está editando otro dispositivo', 'error');
    }).catch(e => {
        console.warn('[Supabase] foto ' + idx + ':', e.message);
        showToast('Sin conexión: guardado sólo en este dispositivo', 'error');
    }).finally(() => {
        escriturasPendientes.delete(idx);
    });
}

/* Sube en orden las fotos que este dispositivo tenía pendientes
   (selecciones viejas de localStorage o hechas sin conexión). */
async function subirPendientes(indices) {
    // Se marcan TODAS desde el principio: mientras la cola avanza puede
    // entrar un refresco, y sin esto borraría de la pantalla las fotos
    // que todavía no alcanzan a subir.
    indices.forEach(i => escriturasPendientes.add(i));
    for (const idx of indices) {
        const sel = photoSelections[idx];
        try {
            if (sel && SB.tieneAlgo(sel)) await SB.guardarFoto(idx, sel, PHOTO_FILES[idx]);
            else                          await SB.borrarFoto(idx);
        } catch (e) { console.warn('[Supabase] pendiente ' + idx + ':', e.message); }
        finally { escriturasPendientes.delete(idx); }
    }
}

/* Carga desde la nube.
   - Inicial: muestra localStorage al instante y luego fusiona FOTO POR
     FOTO comparando el reloj local contra el remoto. Lo que este
     dispositivo tenía y la nube no conoce, se sube.
   - Refresco (isPoll): adopta la nube, respetando las fotos con
     escritura en vuelo. */
async function loadSelections(isPoll = false) {
    if (!isPoll) {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) photoSelections = JSON.parse(saved);
        } catch(e) { photoSelections = {}; }
    }

    if (!sbDisponible) return;
    try {
        const filas = await SB.fetchFilas();      // aún no toca los relojes locales

        if (!isPoll) {
            const remoto = {}, relojRemoto = {};
            filas.forEach(f => {
                relojRemoto[f.idx] = f.clock;
                if (!f.deleted && SB.tieneAlgo(f.sel)) remoto[f.idx] = f.sel;
            });

            const local  = photoSelections;
            const fusion = {};
            const subir  = [];
            const indices = new Set([...Object.keys(local), ...Object.keys(relojRemoto)]);

            indices.forEach(k => {
                const idx        = Number(k);
                const selLocal   = local[k];
                const tieneLocal = !!(selLocal && SB.tieneAlgo(selLocal));
                const rc         = Number(relojRemoto[idx] || 0);
                const lc         = SB.relojDe(idx);

                if (lc > rc) {
                    // Este dispositivo va adelantado: su cambio nunca llegó.
                    if (tieneLocal) fusion[idx] = SB.normalizar(selLocal);
                    subir.push(idx);
                } else if (rc > 0) {
                    // La nube manda (incluye el borrado suave: no entra a fusion).
                    if (remoto[idx]) fusion[idx] = remoto[idx];
                } else if (tieneLocal) {
                    // Selección vieja, guardada antes de existir el reloj.
                    fusion[idx] = SB.normalizar(selLocal);
                    subir.push(idx);
                }
            });

            photoSelections = fusion;
            filas.forEach(f => SB.recordarReloj(f.idx, f.clock));

            if (subir.length) subirPendientes(subir);
            SB.registrarVisita('selector');
            mostrarBannerSinSeleccion();
            saveSelections();
            renderGallery(); setupLazyLoad(); updateStats(); updateFilterButtons();
        } else {
            const nube = {};
            filas.forEach(f => {
                SB.recordarReloj(f.idx, f.clock);
                if (!f.deleted && SB.tieneAlgo(f.sel)) nube[f.idx] = f.sel;
            });
            // Las fotos con escritura en vuelo conservan el valor local.
            escriturasPendientes.forEach(idx => {
                if (photoSelections[idx]) nube[idx] = photoSelections[idx];
                else delete nube[idx];
            });

            // Sólo se repintan las tarjetas que de verdad cambiaron: así el
            // refresco no interrumpe el scroll ni la carga de miniaturas.
            const cambiadas = [];
            new Set([...Object.keys(photoSelections), ...Object.keys(nube)]).forEach(k => {
                if (!mismaSeleccion(photoSelections[k], nube[k])) cambiadas.push(Number(k));
            });
            if (!cambiadas.length) return;

            photoSelections = nube;
            saveSelections();
            cambiadas.forEach(updateCard);
            updateStats(); updateFilterButtons();
            if (modalOpen && cambiadas.includes(currentPhotoIndex)) refrescarBotonesModal();
        }
    } catch(e) {
        console.warn('[Supabase] Usando localStorage:', e.message);
        sbDisponible = false;
        actualizarEstadoNube('offline');
    }
}

/* ========================================
   REALTIME: cambios de otras sesiones activas
   ======================================== */
function aplicarCambioRemoto(c) {
    // Nuestro propio eco: ya está aplicado en pantalla.
    if (c.propia) return;

    if (c.tipo === 'delete') {
        // Sólo ocurre con "Limpiar Todo" (borrado duro).
        if (photoSelections[c.idx]) {
            delete photoSelections[c.idx];
            saveSelections();
            updateCard(c.idx); updateStats(); updateFilterButtons();
        }
        return;
    }

    // El reloj decide: una sesión vieja no puede revivir un estado anterior.
    if (!c.clock || c.clock <= SB.relojDe(c.idx)) return;
    SB.recordarReloj(c.idx, c.clock);

    if (c.borrada || !SB.tieneAlgo(c.sel)) delete photoSelections[c.idx];
    else                                   photoSelections[c.idx] = c.sel;

    saveSelections();
    updateCard(c.idx); updateStats(); updateFilterButtons();

    // Si esa foto está abierta en el modal, reflejar el cambio ahí también.
    if (modalOpen && currentPhotoIndex === c.idx) refrescarBotonesModal();
    avisarCambioRemoto();
}

/* Vuelve a pintar los botones del modal con lo que hay en memoria. */
function refrescarBotonesModal() {
    const actual = photoSelections[currentPhotoIndex] || {};
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.toggle('selected', actual[btn.dataset.category] === true);
    });
}

let avisoTimer = null;
function avisarCambioRemoto() {
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => showToast('Actualizado desde otro dispositivo', 'success'), 400);
}

function actualizarEstadoNube(estado) {
    const el = document.getElementById('estadoNube');
    if (!el) return;
    const mapa = {
        online:  { txt: '🟢 Sincronizado en vivo', color: '#2e7d32' },
        polling: { txt: '🟡 Sincronizado (cada 20 s)', color: '#ef6c00' },
        offline: { txt: '🔴 Sin conexión — sólo este dispositivo', color: '#c62828' }
    };
    const m = mapa[estado] || mapa.polling;
    el.textContent = m.txt;
    el.style.color = m.color;
}

function iniciarRealtime() {
    if (!sbDisponible) { actualizarEstadoNube('offline'); return; }
    actualizarEstadoNube('polling');
    SB.suscribirRealtime(aplicarCambioRemoto, estado => {
        if (estado === 'SUBSCRIBED') {
            actualizarEstadoNube('online');
            loadSelections(true);          // ponerse al día tras (re)conectar
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' ||
                   estado === 'CLOSED'        || estado === 'SIN_LIBRERIA') {
            actualizarEstadoNube('polling');
        }
    });
}

function swipeSaveAndNext() {
    if (currentPhotoIndex === null) return;
    const selectedCategories = {};
    let hasAnySelection = false;
    document.querySelectorAll('.option-btn').forEach(btn => {
        selectedCategories[btn.dataset.category] = btn.classList.contains('selected');
        if (btn.classList.contains('selected')) hasAnySelection = true;
    });
    const idx = currentPhotoIndex;
    if (hasAnySelection) photoSelections[idx] = selectedCategories;
    else                 delete photoSelections[idx];
    persistirFoto(idx);
    updateCard(idx);
    updateStats();
    updateFilterButtons();
    navigatePhoto('next');
    showToast('Guardado ✓', 'success');
}

function swipeClearAndNext() {
    if (currentPhotoIndex === null) return;
    const idx = currentPhotoIndex;
    if (photoSelections[idx]) {
        delete photoSelections[idx];
        persistirFoto(idx);
        updateCard(idx);
        updateStats();
        updateFilterButtons();
    }
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    navigatePhoto('next');
    showToast('Selección quitada', 'success');
}

async function clearAllSelections() {
    if (confirm('¿Estás seguro de que quieres borrar TODAS las selecciones? Esta acción no se puede deshacer.\n\nOJO: también se borran en los demás dispositivos.')) {
        // Borrado duro en Supabase (el trigger del reloj no aplica a DELETE)
        if (sbDisponible) {
            try { await SB.borrarTodas(); }
            catch(e) { console.warn('[Supabase] Error al borrar:', e.message); }
        }
        photoSelections = {};
        try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
        renderGallery();
        setupLazyLoad();
        updateStats();
        updateFilterButtons();
        showToast('Todas las selecciones han sido eliminadas', 'success');
    }
}

// ========================================
// STATS FUNCTIONS
// ========================================
function getStats() {
    const stats = {
        impresion: 0,
        ampliacion: 0,
        invitacion: 0,
        descartada: 0,
        sinClasificar: photos.length
    };

    Object.values(photoSelections).forEach(selection => {
        if (selection.impresion) stats.impresion++;
        if (selection.ampliacion) stats.ampliacion++;
        if (selection.invitacion) stats.invitacion++;
        if (selection.descartada) stats.descartada++;
    });

    stats.sinClasificar = photos.length - Object.keys(photoSelections).length;

    return stats;
}

function updateStats() {
    const stats = getStats();

    document.getElementById('countImpresion').textContent =
        LIMITES.impresion ? `${stats.impresion}/${LIMITES.impresion}` : stats.impresion;
    document.getElementById('countAmpliacion').textContent =
        LIMITES.ampliacion ? `${stats.ampliacion}/${LIMITES.ampliacion}` : stats.ampliacion;
    document.getElementById('countInvitacion').textContent = stats.invitacion;
    document.getElementById('countDescartada').textContent = stats.descartada;
    document.getElementById('countSinClasificar').textContent = stats.sinClasificar;

    const fotosAdicionales = Math.max(0, stats.impresion - LIMITES.impresion);
    const costoExtra = fotosAdicionales * COSTO_FOTO_ADICIONAL;

    const extraCostDisplay = document.getElementById('extraCostDisplay');
    if (extraCostDisplay) {
        if (fotosAdicionales > 0) {
            extraCostDisplay.style.display = 'block';
            document.getElementById('extraCostAmount').textContent = `$${costoExtra} MXN`;
            document.getElementById('extraCostDetail').textContent = `${fotosAdicionales} foto${fotosAdicionales > 1 ? 's' : ''} adicional${fotosAdicionales > 1 ? 'es' : ''} x $${COSTO_FOTO_ADICIONAL}`;
        } else {
            extraCostDisplay.style.display = 'none';
        }
    }

    const impresionCard = document.querySelector('.stat-card.impresion');
    if (impresionCard) {
        if (stats.impresion > LIMITES.impresion) {
            impresionCard.style.borderColor = '#ff9800';
            impresionCard.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
        } else if (stats.impresion === LIMITES.impresion) {
            impresionCard.style.borderColor = '#4caf50';
            impresionCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        } else {
            impresionCard.style.borderColor = '';
            impresionCard.style.backgroundColor = '';
        }
    }
}

// ========================================
// GALLERY FUNCTIONS
// ========================================
function renderGallery() {
    const grid = document.getElementById('photosGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (photos.length === 0) {
        grid.innerHTML = '<div class="no-photos-message">Las fotos estarán disponibles después del evento (13 de septiembre de 2026)</div>';
        return;
    }

    photos.forEach((photo, index) => {
        const selection = photoSelections[index] || {};
        const hasAny = selection.impresion || selection.ampliacion || selection.invitacion || selection.descartada;

        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.index = index;

        if (selection.descartada) {
            card.classList.add('has-descartada');
        } else {
            const categories = [];
            if (selection.impresion) categories.push('impresion');
            if (selection.ampliacion) categories.push('ampliacion');
            if (selection.invitacion) categories.push('invitacion');
            if (categories.length > 1) card.classList.add('has-multiple');
            else if (categories.length === 1) card.classList.add(`has-${categories[0]}`);
        }

        let badgesHTML = '';
        if (hasAny) {
            badgesHTML = '<div class="photo-badges">';
            if (selection.impresion) badgesHTML += '<span class="badge badge-impresion">📸 Impresión</span>';
            if (selection.ampliacion) badgesHTML += '<span class="badge badge-ampliacion">🖼️ Ampliación</span>';
            if (selection.invitacion) badgesHTML += '<span class="badge badge-invitacion">💌 Invitación</span>';
            if (selection.descartada) badgesHTML += '<span class="badge badge-descartada">❌ Descartada</span>';
            badgesHTML += '</div>';
        }

        const displayNumber = `Foto ${index + 1}`;
        const mediaHTML = `
            <div class="photo-image-container">
                <img data-src="${thumbs[index]}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E" alt="${displayNumber}" class="lazy-img" loading="lazy" decoding="async" width="400" height="300">
            </div>
        `;

        card.innerHTML = `
            ${mediaHTML}
            <div class="photo-number">${displayNumber}</div>
            ${badgesHTML}
        `;

        card.addEventListener('click', () => openModal(index));
        grid.appendChild(card);
    });

    applyFilter();
}

// ========================================
// LAZY LOADER CON COLA (máx 4 concurrentes)
// ========================================
let lazyObserver = null;
let lazyQueue = [];
let lazyActive = 0;
const LAZY_MAX = 4;

function lazyLoadNext() {
    while (lazyActive < LAZY_MAX && lazyQueue.length > 0) {
        const img = lazyQueue.shift();
        if (!img.dataset.src || img.classList.contains('lazy-loaded')) continue;
        lazyActive++;
        img.onload = img.onerror = () => { lazyActive--; lazyLoadNext(); };
        img.src = img.dataset.src;
        img.classList.add('lazy-loaded');
    }
}

function setupLazyLoad() {
    if (lazyObserver) lazyObserver.disconnect();
    lazyQueue = [];
    lazyActive = 0;

    lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                lazyObserver.unobserve(img);
                if (!img.classList.contains('lazy-loaded')) {
                    lazyQueue.push(img);
                    lazyLoadNext();
                }
            }
        });
    }, { rootMargin: '300px 0px' });

    document.querySelectorAll('img.lazy-img:not(.lazy-loaded)').forEach(img => {
        lazyObserver.observe(img);
    });
}

// ========================================
// FILTER FUNCTIONS
// ========================================
function applyFilter() {
    const cards = document.querySelectorAll('.photo-card');
    cards.forEach(card => {
        const index = parseInt(card.dataset.index);
        const selection = photoSelections[index] || {};
        let show = false;
        switch (currentFilter) {
            case 'all': show = true; break;
            case 'impresion': show = selection.impresion === true; break;
            case 'ampliacion': show = selection.ampliacion === true; break;
            case 'invitacion': show = selection.invitacion === true; break;
            case 'descartada': show = selection.descartada === true; break;
            case 'sin-clasificar': show = !selection.impresion && !selection.ampliacion && !selection.invitacion && !selection.descartada; break;
        }
        card.classList.toggle('hidden', !show);
    });
}

function setFilter(filter) {
    currentFilter = filter;
    applyFilter();
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    try { localStorage.setItem(KEY_FILTER, filter); } catch (e) {}
}

function updateFilterButtons() {
    const stats = getStats();
    const btnAll = document.getElementById('btnFilterAll');
    const btnImpresion = document.getElementById('btnFilterImpresion');
    const btnAmpliacion = document.getElementById('btnFilterAmpliacion');
    const btnInvitacion = document.getElementById('btnFilterInvitacion');
    const btnDescartada = document.getElementById('btnFilterDescartada');
    const btnSinClasificar = document.getElementById('btnFilterSinClasificar');

    if (btnAll) btnAll.textContent = `Todas (${photos.length})`;
    if (btnImpresion) btnImpresion.textContent = `Impresión (${stats.impresion})`;
    if (btnAmpliacion) btnAmpliacion.textContent = `Ampliación (${stats.ampliacion})`;
    if (btnInvitacion) btnInvitacion.textContent = `Invitación (${stats.invitacion})`;
    if (btnDescartada) btnDescartada.textContent = `Descartadas (${stats.descartada})`;
    if (btnSinClasificar) btnSinClasificar.textContent = `Sin Clasificar (${stats.sinClasificar})`;
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openModal(index) {
    currentPhotoIndex = index;
    try { localStorage.setItem(KEY_LAST, index); } catch (e) {}
    const modal = document.getElementById('photoModal');
    const modalPhotoNumber = document.getElementById('modalPhotoNumber');

    const photo = photos[index];
    const displayNumber = `Foto ${index + 1}`;

    modalPhotoNumber.textContent = displayNumber;
    const modalImg = document.getElementById('modalImage');
    modalImg.alt = displayNumber;
    // Miniatura al instante y foto completa en cuanto termine de bajar.
    modalImg.src = thumbs[index];
    const completa = new Image();
    completa.onload = () => { if (currentPhotoIndex === index) modalImg.src = photo; };
    completa.src = photo;

    const selection = photoSelections[index] || {};
    document.querySelectorAll('.option-btn').forEach(btn => {
        const category = btn.dataset.category;
        btn.classList.toggle('selected', selection[category] === true);
    });

    modal.classList.add('active');
    updateNavigationButtons();
    modalOpen = true;
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalOpen = false;
    currentPhotoIndex = null;
}

function navigatePhoto(direction) {
    if (currentPhotoIndex === null) return;
    let newIndex;
    if (direction === "next") {
        newIndex = currentPhotoIndex + 1;
        if (newIndex >= photos.length) newIndex = 0;
    } else {
        newIndex = currentPhotoIndex - 1;
        if (newIndex < 0) newIndex = photos.length - 1;
    }
    saveCurrentSelections();
    openModal(newIndex);
}

/* ¿Cambió realmente la selección? Evita escribir en la nube cada vez
   que se pasa de foto sin tocar nada. */
function mismaSeleccion(a, b) {
    const A = a || {}, B = b || {};
    return ['impresion', 'ampliacion', 'invitacion', 'descartada']
        .every(c => !!A[c] === !!B[c]);
}

function leerBotonesModal() {
    const sel = {};
    let alguna = false;
    document.querySelectorAll('.option-btn').forEach(btn => {
        const marcado = btn.classList.contains('selected');
        sel[btn.dataset.category] = marcado;
        if (marcado) alguna = true;
    });
    return { sel, alguna };
}

function saveCurrentSelections() {
    if (currentPhotoIndex === null) return;
    const idx = currentPhotoIndex;
    const { sel, alguna } = leerBotonesModal();
    if (mismaSeleccion(photoSelections[idx], alguna ? sel : null)) return;

    if (alguna) photoSelections[idx] = sel;
    else        delete photoSelections[idx];
    persistirFoto(idx);
    updateCard(idx);
    updateStats();
    updateFilterButtons();
}

function updateNavigationButtons() {
    const btnPrev = document.getElementById("btnPrevPhoto");
    const btnNext = document.getElementById("btnNextPhoto");
    if (btnPrev && btnNext) {
        btnPrev.disabled = false;
        btnNext.disabled = false;
    }
}

function updateCard(index) {
    const card = document.querySelector(`.photo-card[data-index="${index}"]`);
    if (!card) return;
    const selection = photoSelections[index] || {};
    const hasAny = selection.impresion || selection.ampliacion || selection.invitacion || selection.descartada;
    card.className = 'photo-card';
    if (selection.descartada) {
        card.classList.add('has-descartada');
    } else {
        const cats = [];
        if (selection.impresion) cats.push('impresion');
        if (selection.ampliacion) cats.push('ampliacion');
        if (selection.invitacion) cats.push('invitacion');
        if (cats.length > 1) card.classList.add('has-multiple');
        else if (cats.length === 1) card.classList.add(`has-${cats[0]}`);
    }
    const existing = card.querySelector('.photo-badges');
    if (existing) existing.remove();
    if (hasAny) {
        const badges = document.createElement('div');
        badges.className = 'photo-badges';
        if (selection.impresion) badges.innerHTML += '<span class="badge badge-impresion">📸 Impresión</span>';
        if (selection.ampliacion) badges.innerHTML += '<span class="badge badge-ampliacion">🖼️ Ampliación</span>';
        if (selection.invitacion) badges.innerHTML += '<span class="badge badge-invitacion">💌 Invitación</span>';
        if (selection.descartada) badges.innerHTML += '<span class="badge badge-descartada">❌ Descartada</span>';
        card.appendChild(badges);
    }
    let show = false;
    switch (currentFilter) {
        case 'all': show = true; break;
        case 'impresion': show = selection.impresion === true; break;
        case 'ampliacion': show = selection.ampliacion === true; break;
        case 'invitacion': show = selection.invitacion === true; break;
        case 'descartada': show = selection.descartada === true; break;
        case 'sin-clasificar': show = !selection.impresion && !selection.ampliacion && !selection.invitacion && !selection.descartada; break;
    }
    card.classList.toggle('hidden', !show);
}

function saveModalSelection() {
    if (currentPhotoIndex === null) return;
    const idx = currentPhotoIndex;
    const { sel, alguna } = leerBotonesModal();

    if (!mismaSeleccion(photoSelections[idx], alguna ? sel : null)) {
        if (alguna) photoSelections[idx] = sel;
        else        delete photoSelections[idx];
        persistirFoto(idx);
        updateCard(idx);
        updateStats();
        updateFilterButtons();
    }
    closeModal();
    showToast('Selección guardada correctamente', 'success');
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
function generateTextSummary() {
    const stats = getStats();
    const fotosAdicionales = Math.max(0, stats.impresion - LIMITES.impresion);
    const costoExtra = fotosAdicionales * COSTO_FOTO_ADICIONAL;

    let summary = '💜 SELECCIÓN DE FOTOS - XV AÑOS PENÉLOPE DESIRÉE GUTIÉRREZ\n';
    summary += '═══════════════════════════════════════════════════\n\n';
    summary += `📋 SEGÚN CONTRATO:\n`;
    summary += `   📸 Impresión incluida: ${LIMITES.impresion} fotos\n\n`;
    summary += `📊 RESUMEN ACTUAL:\n`;
    summary += `   Total de fotos disponibles: ${photos.length}\n`;
    summary += `   📸 Para impresión: ${stats.impresion}/${LIMITES.impresion} ${stats.impresion === LIMITES.impresion ? '✓' : stats.impresion > LIMITES.impresion ? '⚠️ ADICIONALES' : ''}\n`;
    summary += `   🖼️ Para ampliación 50x60: ${stats.ampliacion}/${LIMITES.ampliacion} ${stats.ampliacion > LIMITES.ampliacion ? '⚠️ ADICIONALES' : ''}\n`;
    summary += `   💌 Para invitación: ${stats.invitacion}\n`;
    summary += `   ❌ Descartadas: ${stats.descartada}\n`;
    summary += `   ⭕ Sin clasificar: ${stats.sinClasificar}\n\n`;

    if (fotosAdicionales > 0) {
        summary += `💰 COSTO ADICIONAL:\n`;
        summary += `   Fotos adicionales: ${fotosAdicionales}\n`;
        summary += `   Costo por foto: $${COSTO_FOTO_ADICIONAL} MXN\n`;
        summary += `   TOTAL ADICIONAL: $${costoExtra} MXN\n\n`;
    }

    summary += `\n📅 Generado el: ${new Date().toLocaleString('es-MX')}\n`;
    return summary;
}

function copyToClipboard() {
    const summary = generateTextSummary();
    navigator.clipboard.writeText(summary).then(() => {
        showToast('Resumen copiado al portapapeles', 'success');
    }).catch(() => {
        showToast('No se pudo copiar. Selecciona el texto manualmente.', 'error');
    });
}

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => { toast.classList.add('show'); }, 100);
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    renderGallery();
    setupLazyLoad();
    updateStats();
    updateFilterButtons();
    loadSelections();

    const savedFilter = localStorage.getItem(KEY_FILTER);
    if (savedFilter) setFilter(savedFilter);
    const savedScroll = parseInt(localStorage.getItem(KEY_SCROLL) || '0');
    if (savedScroll > 0) {
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, savedScroll)));
    }

    document.getElementById('btnFilterAll')?.addEventListener('click', () => setFilter('all'));
    document.getElementById('btnFilterImpresion')?.addEventListener('click', () => setFilter('impresion'));
    document.getElementById('btnFilterAmpliacion')?.addEventListener('click', () => setFilter('ampliacion'));
    document.getElementById('btnFilterInvitacion')?.addEventListener('click', () => setFilter('invitacion'));
    document.getElementById('btnFilterDescartada')?.addEventListener('click', () => setFilter('descartada'));
    document.getElementById('btnFilterSinClasificar')?.addEventListener('click', () => setFilter('sin-clasificar'));

    document.getElementById('btnExport')?.addEventListener('click', () => {
        const text = generateTextSummary();
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'seleccion-fotos-penelope.txt';
        a.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById('btnShare')?.addEventListener('click', copyToClipboard);
    document.getElementById('btnClear')?.addEventListener('click', clearAllSelections);

    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelSelection')?.addEventListener('click', closeModal);
    document.getElementById('btnSaveSelection')?.addEventListener('click', saveModalSelection);

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });

    const photoModal = document.getElementById('photoModal');
    if (photoModal) {
        photoModal.addEventListener('click', (e) => {
            if (e.target.id === 'photoModal') closeModal();
        });
        photoModal.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        photoModal.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const deltaY = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) swipeSaveAndNext();
                else swipeClearAndNext();
            }
        }, { passive: true });
    }

    document.getElementById('btnPrevPhoto')?.addEventListener('click', () => navigatePhoto('prev'));
    document.getElementById('btnNextPhoto')?.addEventListener('click', () => navigatePhoto('next'));

    // Realtime: cambios de otras sesiones activas al instante.
    iniciarRealtime();

    // Red de seguridad: si el websocket se cae o el navegador no lo
    // soporta, un refresco periódico mantiene todo sincronizado.
    if (sbDisponible) {
        setInterval(() => { loadSelections(true); }, 20000);
    }
    // Al volver a la pestaña, ponerse al día de inmediato.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && sbDisponible) loadSelections(true);
    });

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('photoModal');
        if (modal && modal.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            else if (e.key === 'Enter') saveModalSelection();
            else if (e.key === 'ArrowLeft') navigatePhoto('prev');
            else if (e.key === 'ArrowRight') navigatePhoto('next');
        }
    });
});

window.addEventListener('scroll', () => {
    if (modalOpen) return;
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
        try { localStorage.setItem(KEY_SCROLL, window.scrollY); } catch (e) {}
    }, 300);
}, { passive: true });

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveSelections();
        try { localStorage.setItem(KEY_SCROLL, window.scrollY); } catch (e) {}
    }
});

window.addEventListener('beforeunload', () => {
    saveSelections();
    try { localStorage.setItem(KEY_SCROLL, window.scrollY); } catch (e) {}
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ========================================
// DOWNLOAD FUNCTIONS
// ========================================
async function downloadCurrentPhoto() {
    if (currentPhotoIndex === null) return;
    const url = photos[currentPhotoIndex];
    if (!url) return;
    const filename = 'foto-' + (currentPhotoIndex + 1) + '.jpg';
    showToast('Descargando...', 'success');
    try {
        const resp = await fetch(url, { mode: 'cors' });
        const blob = await resp.blob();
        let finalBlob = blob;
        if (!blob.type.includes('jpeg') && !blob.type.includes('jpg')) {
            const bmp = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bmp.width; canvas.height = bmp.height;
            canvas.getContext('2d').drawImage(bmp, 0, 0);
            finalBlob = await new Promise(function(res){ canvas.toBlob(res, 'image/jpeg', 0.95); });
        }
        const a = document.createElement('a');
        const objUrl = URL.createObjectURL(finalBlob);
        a.href = objUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(objUrl); }, 2000);
        if (sbDisponible) SB.registrarVisita('descarga');
        showToast('Descargando ' + filename, 'success');
    } catch(e) {
        window.open(url, '_blank');
        showToast('Abriendo foto...', 'success');
    }
}

function downloadAndClose() {
    downloadCurrentPhoto();
    closeModal();
}

// Inyectar botones de descarga en el modal al cargar
(function injectDownloadButtons(){
    function tryInject(){
        var actions = document.querySelector('.modal-actions');
        if (!actions) return;
        if (document.getElementById('btnDownloadClose')) return;
        var btnDlClose = document.createElement('button');
        btnDlClose.id = 'btnDownloadClose';
        btnDlClose.className = 'btn';
        btnDlClose.textContent = '\u2B07 Descargar y Cerrar';
        btnDlClose.style.cssText = 'background:#6c5ce7;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:.85rem;margin-right:4px;';
        btnDlClose.addEventListener('click', downloadAndClose);
        var btnDl = document.createElement('button');
        btnDl.id = 'btnDownloadPhoto';
        btnDl.className = 'btn';
        btnDl.textContent = '\u2B07 JPG';
        btnDl.style.cssText = 'background:#0984e3;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:.85rem;margin-right:4px;';
        btnDl.addEventListener('click', downloadCurrentPhoto);
        actions.insertBefore(btnDlClose, actions.firstChild);
        actions.insertBefore(btnDl, btnDlClose);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInject);
    else tryInject();
})();
