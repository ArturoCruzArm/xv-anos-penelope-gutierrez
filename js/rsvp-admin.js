// rsvp-admin.js — Dashboard RSVP con acompanantes normalizados
(function () {
    const cfg       = window.RSVP_CONFIG || {};
    const SB_URL    = 'https://nzpujmlienzfetqcgsxz.supabase.co';
    const SB_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
    const SB_H      = { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };
    const EVENTO_SLUG = cfg.slug || '';
    const BASE_URL    = cfg.baseUrl || window.location.origin;

    let eventoId = null, guests = [], editingId = null, currentFilter = 'all';

    function checkPin() { return true; }

    async function getEventoId() {
        if (eventoId) return eventoId;
        const r = await fetch(`${SB_URL}/rest/v1/eventos?slug=eq.${EVENTO_SLUG}&select=id&limit=1`, { headers: SB_H });
        const rows = await r.json();
        eventoId = rows[0]?.id || null;
        return eventoId;
    }

    // ── Cargar invitados + acompanantes ──────────────────────────────────────
    async function loadGuests() {
        const eid = await getEventoId();
        if (!eid) { showError('No se encontro el evento.'); return; }
        const [gR, aR] = await Promise.all([
            fetch(`${SB_URL}/rest/v1/invitados?evento_id=eq.${eid}&order=fecha_creacion.asc`, { headers: SB_H }),
            fetch(`${SB_URL}/rest/v1/acompanantes?select=*,invitado_id&order=orden.asc`, { headers: SB_H })
        ]);
        guests = await gR.json();
        const acomps = await aR.json();
        // Adjuntar acompanantes a cada invitado
        guests.forEach(g => {
            g._acomps = acomps.filter(a => a.invitado_id === g.id).sort((a,b) => a.orden - b.orden);
        });
        renderAll();
    }

    // ── Guardar invitado + acompanantes ──────────────────────────────────────
    async function saveGuest(data, nombresAcomp) {
        const eid = await getEventoId();
        let guestId;
        if (editingId) {
            await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${editingId}`, {
                method: 'PATCH', headers: { ...SB_H, 'Prefer': 'return=minimal' },
                body: JSON.stringify(data)
            });
            guestId = editingId;
            // Borrar acompanantes viejos y recrear
            await fetch(`${SB_URL}/rest/v1/acompanantes?invitado_id=eq.${guestId}`, {
                method: 'DELETE', headers: SB_H
            });
        } else {
            const r = await fetch(`${SB_URL}/rest/v1/invitados`, {
                method: 'POST', headers: { ...SB_H, 'Prefer': 'return=representation' },
                body: JSON.stringify({ evento_id: eid, ...data })
            });
            const created = await r.json();
            guestId = created[0].id;
        }
        // Insertar acompanantes
        if (nombresAcomp.length) {
            const rows = nombresAcomp.map((n, i) => ({ invitado_id: guestId, nombre: n, orden: i }));
            await fetch(`${SB_URL}/rest/v1/acompanantes`, {
                method: 'POST', headers: { ...SB_H, 'Prefer': 'return=minimal' },
                body: JSON.stringify(rows)
            });
        }
        await loadGuests();
    }

    async function deleteGuest(id) {
        if (!confirm('Eliminar este invitado?')) return;
        await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, { method: 'DELETE', headers: SB_H });
        guests = guests.filter(g => g.id !== id);
        renderAll();
    }

    async function sendWhatsApp(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        const link = `${BASE_URL}/index.html?inv=${g.token}`;
        const evName = cfg.eventName || 'el evento';
        const evDate = cfg.eventDate ? ` el ${cfg.eventDate}` : '';
        const acompNombres = (g._acomps || []).filter(a => a.nombre).map(a => a.nombre);
        const extra = g.pases_asignados > 1
            ? (acompNombres.length ? `\n\nAcompanantes registrados: ${acompNombres.join(', ')}` : '')
            : '';
        const msg = `Hola ${g.nombre}\n\nTe invitamos a *${evName}*${evDate}.\n\n${link}\n\nTienes *${g.pases_asignados} ${g.pases_asignados === 1 ? 'pase' : 'pases'}*.${extra}\n\nConfirma desde el enlace.`;

        await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, {
            method: 'PATCH', headers: { ...SB_H, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ status: 'enviada', fecha_envio: new Date().toISOString() })
        });
        const idx = guests.findIndex(x => x.id === id);
        if (idx >= 0) { guests[idx].status = 'enviada'; guests[idx].fecha_envio = new Date().toISOString(); }
        renderAll();

        const phone = g.telefono ? g.telefono.replace(/\D/g, '') : '';
        window.open(phone ? `https://wa.me/52${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }

    // ── Confirmar manualmente ────────────────────────────────────────────────
    function confirmManual(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        const acomps = g._acomps || [];

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

        let nombresHtml = '';
        const total = g.pases_asignados || 1;
        for (let i = 0; i < total; i++) {
            const val = i === 0 ? g.nombre : (acomps[i-1]?.nombre || '');
            const ro = i === 0 ? 'style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:.9rem;box-sizing:border-box;margin-bottom:6px;background:#f0f0f0;" readonly' : 'style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:.9rem;box-sizing:border-box;margin-bottom:6px;"';
            nombresHtml += `<input type="text" class="_mc_nombre" value="${val}" placeholder="Nombre persona ${i+1}" ${ro}>`;
        }

        overlay.innerHTML = `
            <div style="background:#fff;border-radius:14px;padding:32px;max-width:400px;width:90%;font-family:'Lato',sans-serif;max-height:90vh;overflow-y:auto;">
                <h3 style="margin:0 0 6px;">Confirmacion manual</h3>
                <p style="color:#666;font-size:.9rem;margin:0 0 20px;"><strong>${g.nombre}</strong> — ${total} pases</p>
                <label style="font-size:.82rem;font-weight:700;display:block;margin-bottom:6px;">Asistira?</label>
                <div style="display:flex;gap:10px;margin-bottom:18px;">
                    <button id="_mc_si" style="flex:1;padding:10px;border-radius:8px;border:2px solid #55efc4;background:#f0fff8;font-weight:700;cursor:pointer;">Si</button>
                    <button id="_mc_no" style="flex:1;padding:10px;border-radius:8px;border:2px solid #ccc;background:#f9f9f9;font-weight:700;cursor:pointer;">No</button>
                </div>
                <label style="font-size:.82rem;font-weight:700;display:block;margin-bottom:6px;">Pases confirmados</label>
                <input id="_mc_pases" type="number" min="0" max="${total}" value="${total}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;margin-bottom:14px;">
                <label style="font-size:.82rem;font-weight:700;display:block;margin-bottom:6px;">Nombres (titular + acompanantes)</label>
                <div id="_mc_nombres">${nombresHtml}</div>
                <div style="display:flex;gap:10px;margin-top:18px;">
                    <button id="_mc_cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;">Cancelar</button>
                    <button id="_mc_save" style="flex:1;padding:10px;border-radius:8px;background:#6c5ce7;color:#fff;border:none;font-weight:700;cursor:pointer;">Guardar</button>
                </div>
            </div>`;

        let selected = 'si';
        overlay.querySelector('#_mc_si').addEventListener('click', () => { selected = 'si'; overlay.querySelector('#_mc_si').style.borderColor = '#55efc4'; overlay.querySelector('#_mc_no').style.borderColor = '#ccc'; });
        overlay.querySelector('#_mc_no').addEventListener('click', () => { selected = 'no'; overlay.querySelector('#_mc_no').style.borderColor = '#d63031'; overlay.querySelector('#_mc_si').style.borderColor = '#ccc'; });
        overlay.querySelector('#_mc_cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#_mc_save').addEventListener('click', async () => {
            const asiste = selected === 'si';
            const pases = parseInt(overlay.querySelector('#_mc_pases').value) || 0;
            const nombres = Array.from(overlay.querySelectorAll('._mc_nombre')).map(inp => inp.value.trim());
            const acompNames = nombres.slice(1); // sin el titular
            overlay.remove();
            // Actualizar invitado
            await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, {
                method: 'PATCH', headers: { ...SB_H, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ status: asiste ? 'confirmada' : 'declinada', asiste, pases_confirmados: pases, fecha_confirmacion: new Date().toISOString() })
            });
            // Recrear acompanantes
            await fetch(`${SB_URL}/rest/v1/acompanantes?invitado_id=eq.${id}`, { method: 'DELETE', headers: SB_H });
            if (acompNames.length) {
                await fetch(`${SB_URL}/rest/v1/acompanantes`, {
                    method: 'POST', headers: { ...SB_H, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(acompNames.map((n, i) => ({ invitado_id: id, nombre: n, orden: i })))
                });
            }
            await loadGuests();
            showToast(asiste ? '✓ Confirmado' : '✓ Declinado');
        });
        document.body.appendChild(overlay);
    }

    async function copyLink(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        try { await navigator.clipboard.writeText(`${BASE_URL}/index.html?inv=${g.token}`); showToast('✓ Link copiado'); }
        catch(e) { prompt('Copia:', `${BASE_URL}/index.html?inv=${g.token}`); }
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    function calcStats() {
        return {
            total: guests.length,
            confirmados: guests.filter(g => g.status === 'confirmada').length,
            declinados: guests.filter(g => g.status === 'declinada').length,
            pendientes: guests.filter(g => ['pendiente','enviada','vista'].includes(g.status)).length,
            totalPases: guests.reduce((s, g) => s + (g.pases_asignados || 0), 0),
            totalAsisten: guests.reduce((s, g) => s + (g.pases_confirmados || 0), 0),
            catFamilia: guests.filter(g => g.categoria === 'familia').length,
            catPadrinos: guests.filter(g => g.categoria === 'padrinos').length,
            catAmigos: guests.filter(g => g.categoria === 'amigos').length,
            catConocidos: guests.filter(g => g.categoria === 'conocidos').length
        };
    }

    function renderAll() { renderStats(); renderTable(); renderCategories(); }

    function renderStats() {
        const s = calcStats(), set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('totalInvitados', s.total); set('confirmados', s.confirmados);
        set('pendientes', s.pendientes); set('noAsistiran', s.declinados);
        set('totalAsistentes', s.totalAsisten); set('totalPases', s.totalPases + ' pases');
    }

    function renderCategories() {
        const s = calcStats(), set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('catFamilia', s.catFamilia); set('catPadrinos', s.catPadrinos);
        set('catAmigos', s.catAmigos); set('catConocidos', s.catConocidos);
    }

    const SL = {
        pendiente: { i:'🔴', t:'Pendiente', c:'status-pendiente' },
        enviada: { i:'🟡', t:'Enviada', c:'status-enviada' },
        vista: { i:'🔵', t:'Vista', c:'status-vista' },
        confirmada: { i:'🟢', t:'Confirmada', c:'status-confirmada' },
        declinada: { i:'⚫', t:'Declinada', c:'status-declinada' }
    };

    function fmtDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    }

    function renderNombres(g) {
        const acomps = g._acomps || [];
        if (!acomps.length) return '—';
        const filled = acomps.filter(a => a.nombre);
        const empty = acomps.length - filled.length;
        let html = '<div class="nombres-list">';
        filled.forEach(a => { html += `<span>• ${a.nombre}</span>`; });
        if (empty > 0) html += `<span style="opacity:.5">+ ${empty} sin nombre</span>`;
        html += '</div>';
        return html;
    }

    function renderTable() {
        const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const tbody = document.getElementById('guestsTableBody');
        if (!tbody) return;
        const filtered = guests.filter(g => {
            const mf = currentFilter === 'all' || g.status === currentFilter;
            const ms = !search || g.nombre.toLowerCase().includes(search) || (g.telefono || '').includes(search);
            return mf && ms;
        });
        if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#999;">No hay invitados</td></tr>'; return; }

        tbody.innerHTML = filtered.map(g => {
            const s = SL[g.status] || SL.pendiente;
            const pConf = g.pases_confirmados ? `<strong>${g.pases_confirmados}</strong>` : '—';
            return `<tr>
                <td><strong>${g.nombre}</strong>${g.notas ? `<br><small style="color:#999">${g.notas}</small>` : ''}${g.mensaje ? `<br><small style="color:#6c5ce7;font-style:italic">"${g.mensaje}"</small>` : ''}</td>
                <td><span class="badge-cat cat-${g.categoria||'otro'}">${g.categoria||'—'}</span></td>
                <td style="text-align:center">${g.pases_asignados}</td>
                <td style="text-align:center">${pConf}</td>
                <td>${renderNombres(g)}</td>
                <td>${g.mesa_asignada||'—'}</td>
                <td><span class="status-badge ${s.c}">${s.i} ${s.t}</span></td>
                <td style="font-size:.78rem">${fmtDate(g.fecha_envio)}<br>${fmtDate(g.fecha_confirmacion)}</td>
                <td><div class="action-group">
                    ${g.telefono ? `<button class="btn-wa" onclick="RSVP_ADMIN.sendWhatsApp('${g.id}')"><i class="fab fa-whatsapp"></i></button>` : `<button class="btn-copy" onclick="RSVP_ADMIN.confirmManual('${g.id}')" style="background:#f39c12"><i class="fas fa-user-check"></i></button>`}
                    <button class="btn-copy" onclick="RSVP_ADMIN.copyLink('${g.id}')"><i class="fas fa-link"></i></button>
                </div></td>
                <td><div class="action-group">
                    <button class="btn-edit" onclick="RSVP_ADMIN.openEdit('${g.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="RSVP_ADMIN.deleteGuest('${g.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`;
        }).join('');
    }

    // ── Modal con campos de acompanantes ─────────────────────────────────────
    function buildAcompFields(count, existing) {
        const container = document.getElementById('acompContainer');
        if (!container) return;
        container.innerHTML = '';
        const numAcomp = Math.max(0, count - 1); // -1 porque el titular ya esta
        for (let i = 0; i < numAcomp; i++) {
            const val = existing[i] || '';
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'acomp-name-input';
            inp.placeholder = `Acompanante ${i + 1}`;
            inp.value = val;
            inp.style.cssText = 'width:100%;padding:10px;margin-bottom:6px;border:2px solid var(--border,#dfe6e9);border-radius:8px;font-size:.95rem;';
            container.appendChild(inp);
        }
        const group = document.getElementById('acompGroup');
        if (group) group.style.display = numAcomp > 0 ? 'block' : 'none';
    }

    function openAddGuestModal() {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Invitado';
        document.getElementById('guestForm').reset();
        buildAcompFields(1, []);
        document.getElementById('guestModal').style.display = 'flex';
    }

    function openEdit(id) {
        const g = guests.find(x => x.id === id);
        if (!g) return;
        editingId = id;
        document.getElementById('modalTitle').textContent = 'Editar Invitado';
        document.getElementById('guestName').value = g.nombre || '';
        document.getElementById('guestPhone').value = g.telefono || '';
        document.getElementById('guestCategory').value = g.categoria || 'familia';
        document.getElementById('guestPases').value = g.pases_asignados || 1;
        document.getElementById('guestTable').value = g.mesa_asignada || '';
        document.getElementById('guestNotes').value = g.notas || '';
        const existingNames = (g._acomps || []).map(a => a.nombre);
        buildAcompFields(g.pases_asignados || 1, existingNames);
        document.getElementById('guestModal').style.display = 'flex';
    }

    function closeGuestModal() { document.getElementById('guestModal').style.display = 'none'; editingId = null; }

    function showToast(msg) {
        let el = document.getElementById('rsvp-toast');
        if (!el) { el = document.createElement('div'); el.id = 'rsvp-toast'; el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1c1c;color:#fff;padding:10px 22px;border-radius:8px;font-size:.88rem;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;'; document.body.appendChild(el); }
        el.textContent = msg; el.style.opacity = '1';
        clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
    }

    function showError(msg) {
        const tbody = document.getElementById('guestsTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#e74c3c;">${msg}</td></tr>`;
    }

    function exportCSV() {
        const headers = ['Nombre','Telefono','Categoria','Pases','Conf.','Acompanantes','Mesa','Status','Mensaje'];
        const rows = guests.map(g => [
            g.nombre, g.telefono||'', g.categoria||'', g.pases_asignados,
            g.pases_confirmados||'', (g._acomps||[]).map(a=>a.nombre).filter(Boolean).join('; '),
            g.mesa_asignada||'', g.status, g.mensaje||''
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + [headers.join(','), ...rows].join('\n'));
        a.download = `invitados-${EVENTO_SLUG}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); showToast('✓ CSV descargado');
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        if (!checkPin()) return;
        loadGuests();

        document.getElementById('searchInput')?.addEventListener('input', renderTable);

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                currentFilter = this.dataset.filter || 'all';
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                renderTable();
            });
        });

        // Cuando cambie pases, regenerar campos acompanantes
        const pasesInput = document.getElementById('guestPases');
        if (pasesInput) {
            pasesInput.addEventListener('input', function () {
                const existing = Array.from(document.querySelectorAll('.acomp-name-input')).map(i => i.value);
                buildAcompFields(parseInt(this.value) || 1, existing);
            });
        }

        const form = document.getElementById('guestForm');
        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    nombre: document.getElementById('guestName').value.trim(),
                    telefono: document.getElementById('guestPhone').value.trim() || null,
                    categoria: document.getElementById('guestCategory').value || 'familia',
                    pases_asignados: parseInt(document.getElementById('guestPases').value) || 1,
                    mesa_asignada: document.getElementById('guestTable').value.trim() || null,
                    notas: document.getElementById('guestNotes').value.trim() || null
                };
                const nombresAcomp = Array.from(document.querySelectorAll('.acomp-name-input'))
                    .map((inp, i) => ({ nombre: inp.value.trim(), orden: i }))
                    .map(a => a.nombre); // guardamos todos, incluso vacios
                const btn = form.querySelector('.btn-save');
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
                await saveGuest(data, nombresAcomp);
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar Invitado'; }
                closeGuestModal();
                showToast('✓ Invitado guardado');
            });
        }

        const btnExport = document.querySelector('[onclick="exportToExcel()"]');
        if (btnExport) { btnExport.onclick = exportCSV; btnExport.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV'; }

        window.openAddGuestModal = openAddGuestModal;
        window.closeGuestModal = closeGuestModal;
    });

    window.RSVP_ADMIN = { sendWhatsApp, copyLink, deleteGuest, openEdit, confirmManual };
})();
