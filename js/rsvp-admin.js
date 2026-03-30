// rsvp-admin.js — Dashboard RSVP Profesional (lado del admin)
// Config desde window.RSVP_CONFIG = { slug, baseUrl, pin, eventName }
(function () {
    const cfg       = window.RSVP_CONFIG || {};
    const SB_URL    = 'https://nzpujmlienzfetqcgsxz.supabase.co';
    const SB_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
    const SB_H      = { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };
    const EVENTO_SLUG = cfg.slug    || document.querySelector('meta[name="evento-slug"]')?.content || '';
    const BASE_URL    = cfg.baseUrl || (window.location.origin + window.location.pathname.replace('invitados.html',''));
    const ADMIN_PIN   = cfg.pin     || '7070';

    let eventoId   = null;
    let guests     = [];
    let editingId  = null;
    let currentFilter = 'all';

    // ── PIN de acceso (formulario inline) ───────────────────────────────────
    function checkPin() {
        if (sessionStorage.getItem('rsvp_admin_pin') === ADMIN_PIN) return true;
        showPinScreen();
        return false;
    }

    function showPinScreen() {
        document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f0f4f8;font-family:'Lato',sans-serif;">
            <div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:360px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,.12);text-align:center;">
                <div style="font-size:2.5rem;margin-bottom:12px;">🔐</div>
                <h2 style="margin:0 0 8px;color:#1c1c1c;font-size:1.4rem;">Acceso Admin</h2>
                <p style="color:#666;margin:0 0 28px;font-size:.9rem;">Gestión de invitados — ${cfg.eventName || 'Evento'}</p>
                <input id="pinInput" type="password" maxlength="10" placeholder="PIN de acceso"
                    style="width:100%;padding:12px 16px;border:2px solid #ddd;border-radius:8px;font-size:1.1rem;text-align:center;letter-spacing:4px;box-sizing:border-box;outline:none;margin-bottom:16px;"
                    onkeydown="if(event.key==='Enter')document.getElementById('pinBtn').click()">
                <button id="pinBtn" onclick="window._checkPinInput()"
                    style="width:100%;padding:12px;background:#6c5ce7;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;">
                    Entrar
                </button>
                <div id="pinError" style="color:#d63031;margin-top:12px;font-size:.85rem;display:none;">PIN incorrecto. Intenta de nuevo.</div>
                <br><a href="admin.html" style="color:#999;font-size:.8rem;">← Volver al panel</a>
            </div>
        </div>`;
        setTimeout(() => document.getElementById('pinInput')?.focus(), 100);
        window._checkPinInput = function () {
            const val = document.getElementById('pinInput').value;
            if (val === ADMIN_PIN) {
                sessionStorage.setItem('rsvp_admin_pin', ADMIN_PIN);
                location.reload();
            } else {
                document.getElementById('pinError').style.display = 'block';
                document.getElementById('pinInput').value = '';
                document.getElementById('pinInput').focus();
            }
        };
    }

    // ── Obtener evento_id ────────────────────────────────────────────────────
    async function getEventoId() {
        if (eventoId) return eventoId;
        const r = await fetch(`${SB_URL}/rest/v1/eventos?slug=eq.${EVENTO_SLUG}&select=id&limit=1`, { headers: SB_H });
        const rows = await r.json();
        eventoId = rows[0]?.id || null;
        return eventoId;
    }

    // ── Cargar invitados ─────────────────────────────────────────────────────
    async function loadGuests() {
        const eid = await getEventoId();
        if (!eid) { showError('No se encontró el evento en la base de datos.'); return; }
        const r = await fetch(
            `${SB_URL}/rest/v1/invitados?evento_id=eq.${eid}&order=fecha_creacion.asc`,
            { headers: SB_H }
        );
        guests = await r.json();
        renderAll();
    }

    // ── Guardar invitado (crear o editar) ────────────────────────────────────
    async function saveGuest(data) {
        const eid = await getEventoId();
        if (editingId) {
            // Editar: solo campos del admin
            const r = await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${editingId}`, {
                method: 'PATCH',
                headers: Object.assign({}, SB_H, { 'Prefer': 'return=representation' }),
                body: JSON.stringify(data)
            });
            const updated = await r.json();
            const idx = guests.findIndex(g => g.id === editingId);
            if (idx >= 0) guests[idx] = updated[0];
        } else {
            // Crear nuevo
            const r = await fetch(`${SB_URL}/rest/v1/invitados`, {
                method: 'POST',
                headers: Object.assign({}, SB_H, { 'Prefer': 'return=representation' }),
                body: JSON.stringify(Object.assign({ evento_id: eid }, data))
            });
            const created = await r.json();
            guests.push(created[0]);
        }
        renderAll();
    }

    // ── Eliminar invitado ────────────────────────────────────────────────────
    async function deleteGuest(id) {
        if (!confirm('¿Eliminar este invitado? Esta acción no se puede deshacer.')) return;
        await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, { method: 'DELETE', headers: SB_H });
        guests = guests.filter(g => g.id !== id);
        renderAll();
    }

    // ── Marcar como enviada + abrir WhatsApp ─────────────────────────────────
    async function sendWhatsApp(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        const link = `${BASE_URL}/index.html?inv=${g.token}`;
        const evName = cfg.eventName || 'el evento';
        const evDate = cfg.eventDate ? ` el ${cfg.eventDate}` : '';
        const msg  = `Hola ${g.nombre} 👑✨\n\nTe invitamos cordialmente a *${evName}*${evDate}.\n\nTu enlace de invitación personalizada:\n${link}\n\nPor favor confirma tu asistencia desde el enlace. Tienes *${g.pases_asignados} ${g.pases_asignados === 1 ? 'pase' : 'pases'}* asignados. 🎀`;

        // Marcar como enviada
        await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, {
            method: 'PATCH',
            headers: Object.assign({}, SB_H, { 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ status: 'enviada', fecha_envio: new Date().toISOString() })
        });
        const idx = guests.findIndex(x => x.id === id);
        if (idx >= 0) { guests[idx].status = 'enviada'; guests[idx].fecha_envio = new Date().toISOString(); }
        renderAll();

        const phone = g.telefono ? g.telefono.replace(/\D/g, '') : '';
        const wa = phone
            ? `https://wa.me/52${phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(wa, '_blank');
    }

    // ── Confirmar manualmente (sin WhatsApp) ─────────────────────────────────
    function confirmManual(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;

        // Modal inline rápido
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:14px;padding:32px;max-width:360px;width:90%;font-family:'Lato',sans-serif;">
                <h3 style="margin:0 0 6px;font-size:1.1rem;">Confirmación manual</h3>
                <p style="color:#666;font-size:.9rem;margin:0 0 20px;"><strong>${g.nombre}</strong> — ${g.pases_asignados} pases</p>
                <label style="font-size:.82rem;font-weight:700;display:block;margin-bottom:6px;">¿Asistirá?</label>
                <div style="display:flex;gap:10px;margin-bottom:18px;">
                    <button id="_mc_si" style="flex:1;padding:10px;border-radius:8px;border:2px solid #55efc4;background:#f0fff8;font-weight:700;cursor:pointer;">✅ Sí asistirá</button>
                    <button id="_mc_no" style="flex:1;padding:10px;border-radius:8px;border:2px solid #ccc;background:#f9f9f9;font-weight:700;cursor:pointer;">❌ No asistirá</button>
                </div>
                <label style="font-size:.82rem;font-weight:700;display:block;margin-bottom:6px;">Personas que asistirán</label>
                <input id="_mc_pases" type="number" min="0" max="${g.pases_asignados}" value="${g.pases_asignados}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;margin-bottom:18px;">
                <div style="display:flex;gap:10px;">
                    <button id="_mc_cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Cancelar</button>
                    <button id="_mc_save" style="flex:1;padding:10px;border-radius:8px;background:#6c5ce7;color:#fff;border:none;font-weight:700;cursor:pointer;">Guardar</button>
                </div>
            </div>`;

        let selected = 'si';
        overlay.querySelector('#_mc_si').addEventListener('click', () => {
            selected = 'si';
            overlay.querySelector('#_mc_si').style.borderColor = '#55efc4';
            overlay.querySelector('#_mc_si').style.background  = '#f0fff8';
            overlay.querySelector('#_mc_no').style.borderColor = '#ccc';
            overlay.querySelector('#_mc_no').style.background  = '#f9f9f9';
        });
        overlay.querySelector('#_mc_no').addEventListener('click', () => {
            selected = 'no';
            overlay.querySelector('#_mc_no').style.borderColor = '#d63031';
            overlay.querySelector('#_mc_no').style.background  = '#fff5f5';
            overlay.querySelector('#_mc_si').style.borderColor = '#ccc';
            overlay.querySelector('#_mc_si').style.background  = '#f9f9f9';
        });
        overlay.querySelector('#_mc_cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#_mc_save').addEventListener('click', async () => {
            const asiste = selected === 'si';
            const pases  = parseInt(overlay.querySelector('#_mc_pases').value) || 0;
            overlay.remove();
            await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, {
                method: 'PATCH',
                headers: Object.assign({}, SB_H, { 'Prefer': 'return=minimal' }),
                body: JSON.stringify({
                    status: asiste ? 'confirmada' : 'declinada',
                    asiste, pases_confirmados: pases,
                    fecha_confirmacion: new Date().toISOString()
                })
            });
            const idx = guests.findIndex(x => x.id === id);
            if (idx >= 0) {
                guests[idx].status = asiste ? 'confirmada' : 'declinada';
                guests[idx].asiste = asiste;
                guests[idx].pases_confirmados = pases;
            }
            renderAll();
            showToast(asiste ? '✓ Confirmado manualmente' : '✓ Marcado como declinado');
        });

        document.body.appendChild(overlay);
    }

    // ── Copiar link al portapapeles ──────────────────────────────────────────
    async function copyLink(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        const link = `${BASE_URL}/index.html?inv=${g.token}`;
        try {
            await navigator.clipboard.writeText(link);
            showToast('✓ Link copiado al portapapeles');
        } catch (e) {
            prompt('Copia este link:', link);
        }
    }

    // ── Estadísticas ─────────────────────────────────────────────────────────
    function calcStats() {
        const total        = guests.length;
        const confirmados  = guests.filter(g => g.status === 'confirmada').length;
        const declinados   = guests.filter(g => g.status === 'declinada').length;
        const vistos       = guests.filter(g => g.status === 'vista').length;
        const enviados     = guests.filter(g => g.status === 'enviada').length;
        const pendientes   = guests.filter(g => g.status === 'pendiente').length;
        const totalPases   = guests.reduce((s, g) => s + (g.pases_asignados || 0), 0);
        const totalAsisten = guests.reduce((s, g) => s + (g.pases_confirmados || 0), 0);
        const catFamilia   = guests.filter(g => g.categoria === 'familia').length;
        const catPadrinos  = guests.filter(g => g.categoria === 'padrinos').length;
        const catAmigos    = guests.filter(g => g.categoria === 'amigos').length;
        const catConocidos = guests.filter(g => g.categoria === 'conocidos').length;
        return { total, confirmados, declinados, vistos, enviados, pendientes, totalPases, totalAsisten, catFamilia, catPadrinos, catAmigos, catConocidos };
    }

    // ── Render completo ──────────────────────────────────────────────────────
    function renderAll() {
        renderStats();
        renderTable();
        renderCategories();
    }

    function renderStats() {
        const s = calcStats();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('totalInvitados', s.total);
        set('confirmados',    s.confirmados);
        set('pendientes',     s.pendientes + s.enviados + s.vistos);
        set('noAsistiran',    s.declinados);
        set('totalAsistentes', s.totalAsisten);
        set('totalPases',     s.totalPases);
    }

    function renderCategories() {
        const s = calcStats();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('catFamilia',   s.catFamilia);
        set('catPadrinos',  s.catPadrinos);
        set('catAmigos',    s.catAmigos);
        set('catConocidos', s.catConocidos);
    }

    const STATUS_LABEL = {
        pendiente:  { icon: '🔴', text: 'Pendiente',  cls: 'status-pendiente'  },
        enviada:    { icon: '🟡', text: 'Enviada',    cls: 'status-enviada'    },
        vista:      { icon: '🔵', text: 'Vista',      cls: 'status-vista'      },
        confirmada: { icon: '🟢', text: 'Confirmada', cls: 'status-confirmada' },
        declinada:  { icon: '⚫', text: 'Declinada',  cls: 'status-declinada'  }
    };

    function fmtDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function renderTable() {
        const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const tbody  = document.getElementById('guestsTableBody');
        if (!tbody) return;

        const filtered = guests.filter(g => {
            const matchFilter = currentFilter === 'all' || g.status === currentFilter;
            const matchSearch = !search || g.nombre.toLowerCase().includes(search) || (g.telefono || '').includes(search);
            return matchFilter && matchSearch;
        });

        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#999;">No hay invitados en esta categoría</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(g => {
            const s = STATUS_LABEL[g.status] || STATUS_LABEL.pendiente;
            const pConf = g.pases_confirmados ? `<strong>${g.pases_confirmados}</strong>` : '—';
            const waDisabled = !g.telefono ? 'title="Sin teléfono"' : '';
            return `
            <tr data-id="${g.id}">
                <td><strong>${g.nombre}</strong>${g.notas ? `<br><small style="color:#999">${g.notas}</small>` : ''}</td>
                <td><span class="badge-cat cat-${g.categoria}">${g.categoria || '—'}</span></td>
                <td style="text-align:center">${g.pases_asignados}</td>
                <td style="text-align:center">${pConf}</td>
                <td>${g.mesa_asignada || '—'}</td>
                <td><span class="status-badge ${s.cls}">${s.icon} ${s.text}</span></td>
                <td style="font-size:.78rem">${fmtDate(g.fecha_envio)}<br>${fmtDate(g.fecha_confirmacion)}</td>
                <td>
                    <div class="action-group">
                        ${g.telefono
                            ? `<button class="btn-wa" onclick="RSVP_ADMIN.sendWhatsApp('${g.id}')" title="Enviar por WhatsApp"><i class="fab fa-whatsapp"></i></button>`
                            : `<button class="btn-copy" onclick="RSVP_ADMIN.confirmManual('${g.id}')" title="Confirmar manualmente" style="background:#f39c12"><i class="fas fa-user-check"></i></button>`
                        }
                        <button class="btn-copy" onclick="RSVP_ADMIN.copyLink('${g.id}')" title="Copiar link">
                            <i class="fas fa-link"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <div class="action-group">
                        <button class="btn-edit" onclick="RSVP_ADMIN.openEdit('${g.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="RSVP_ADMIN.deleteGuest('${g.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // ── Modal agregar/editar ─────────────────────────────────────────────────
    function openAddGuestModal() {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Invitado';
        document.getElementById('guestForm').reset();
        document.getElementById('guestModal').style.display = 'flex';
    }

    function openEdit(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        editingId = id;
        document.getElementById('modalTitle').textContent = 'Editar Invitado';
        document.getElementById('guestName').value     = g.nombre || '';
        document.getElementById('guestPhone').value    = g.telefono || '';
        document.getElementById('guestCategory').value = g.categoria || 'familia';
        document.getElementById('guestPases').value    = g.pases_asignados || 1;
        document.getElementById('guestTable').value    = g.mesa_asignada || '';
        document.getElementById('guestNotes').value    = g.notas || '';
        document.getElementById('guestModal').style.display = 'flex';
    }

    function closeGuestModal() {
        document.getElementById('guestModal').style.display = 'none';
        editingId = null;
    }

    // ── Toast ────────────────────────────────────────────────────────────────
    function showToast(msg) {
        let el = document.getElementById('rsvp-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'rsvp-toast';
            el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1c1c;color:#fff;padding:10px 22px;border-radius:8px;font-size:.88rem;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
    }

    function showError(msg) {
        const tbody = document.getElementById('guestsTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#e74c3c;">${msg}</td></tr>`;
    }

    // ── Export CSV ───────────────────────────────────────────────────────────
    function exportCSV() {
        const headers = ['Nombre','Teléfono','Categoría','Pases Asig.','Pases Conf.','Mesa','Status','F. Envío','F. Confirmación','Mensaje'];
        const rows = guests.map(g => [
            g.nombre, g.telefono || '', g.categoria || '', g.pases_asignados,
            g.pases_confirmados || '', g.mesa_asignada || '', g.status,
            g.fecha_envio ? new Date(g.fecha_envio).toLocaleString('es-MX') : '',
            g.fecha_confirmacion ? new Date(g.fecha_confirmacion).toLocaleString('es-MX') : '',
            g.mensaje || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv);
        a.download = `invitados-${EVENTO_SLUG || 'evento'}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast('✓ CSV descargado');
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        if (!checkPin()) return;

        loadGuests();

        // Búsqueda
        const search = document.getElementById('searchInput');
        if (search) search.addEventListener('input', renderTable);

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                currentFilter = this.dataset.filter || 'all';
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                renderTable();
            });
        });

        // Form submit del modal
        const form = document.getElementById('guestForm');
        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    nombre:          document.getElementById('guestName').value.trim(),
                    telefono:        document.getElementById('guestPhone').value.trim() || null,
                    categoria:       document.getElementById('guestCategory').value || 'familia',
                    pases_asignados: parseInt(document.getElementById('guestPases').value) || 1,
                    mesa_asignada:   document.getElementById('guestTable').value.trim() || null,
                    notas:           document.getElementById('guestNotes').value.trim() || null
                };
                const btn = form.querySelector('.btn-save');
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
                await saveGuest(data);
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar Invitado'; }
                closeGuestModal();
                showToast(editingId ? '✓ Invitado actualizado' : '✓ Invitado agregado');
            });
        }

        // Botón export CSV
        const btnExport = document.querySelector('[onclick="exportToExcel()"]');
        if (btnExport) { btnExport.onclick = exportCSV; btnExport.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV'; }

        // Exponer funciones al HTML (onclick inline)
        window.openAddGuestModal = openAddGuestModal;
        window.closeGuestModal   = closeGuestModal;
    });

    // Exponer al window para onclick inline
    window.RSVP_ADMIN = { sendWhatsApp, copyLink, deleteGuest, openEdit, confirmManual };
})();

