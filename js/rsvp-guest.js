// rsvp-guest.js — RSVP con acompanantes normalizados (lado invitado)
(function () {
    const SB_URL  = 'https://nzpujmlienzfetqcgsxz.supabase.co';
    const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
    const SB_H = { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };

    const token = new URLSearchParams(window.location.search).get('inv');
    if (!token) return;

    let guestData = null;
    let acompsData = [];

    async function loadGuest() {
        try {
            const r = await fetch(
                `${SB_URL}/rest/v1/invitados?token=eq.${encodeURIComponent(token)}&select=id,nombre,pases_asignados,status,asiste,pases_confirmados,mensaje&limit=1`,
                { headers: SB_H }
            );
            const rows = await r.json();
            if (!rows.length) { showNotFound(); return; }
            guestData = rows[0];
            // Cargar acompanantes
            const aR = await fetch(
                `${SB_URL}/rest/v1/acompanantes?invitado_id=eq.${guestData.id}&order=orden.asc`,
                { headers: SB_H }
            );
            acompsData = await aR.json();
            renderGuestExperience();
        } catch (e) {
            console.warn('RSVP: error', e);
        }
    }

    async function markAsViewed(id) {
        try {
            await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${id}`, {
                method: 'PATCH', headers: { ...SB_H, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ status: 'vista', fecha_vista: new Date().toISOString() })
            });
        } catch (e) {}
    }

    async function submitRSVP(asiste, pases, nombre, mensaje, nombresAcomp) {
        const body = {
            status: asiste ? 'confirmada' : 'declinada',
            asiste, pases_confirmados: pases,
            mensaje: mensaje || null,
            fecha_confirmacion: new Date().toISOString()
        };
        const r = await fetch(`${SB_URL}/rest/v1/invitados?id=eq.${guestData.id}`, {
            method: 'PATCH', headers: { ...SB_H, 'Prefer': 'return=minimal' },
            body: JSON.stringify(body)
        });
        if (!r.ok) return false;
        // Actualizar acompanantes
        await fetch(`${SB_URL}/rest/v1/acompanantes?invitado_id=eq.${guestData.id}`, { method: 'DELETE', headers: SB_H });
        if (nombresAcomp.length) {
            await fetch(`${SB_URL}/rest/v1/acompanantes`, {
                method: 'POST', headers: { ...SB_H, 'Prefer': 'return=minimal' },
                body: JSON.stringify(nombresAcomp.map((n, i) => ({ invitado_id: guestData.id, nombre: n, orden: i })))
            });
        }
        return true;
    }

    function buildNombreInputs(count, existing) {
        const container = document.getElementById('nombresContainer');
        const group = document.getElementById('nombresGroup');
        if (!container || !group) return;
        container.innerHTML = '';
        const numAcomp = Math.max(0, count - 1);
        group.style.display = numAcomp > 0 ? 'block' : 'none';
        for (let i = 0; i < numAcomp; i++) {
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'nombre-asistente';
            inp.value = existing[i] || '';
            inp.placeholder = 'Acompanante ' + (i + 1);
            inp.style.cssText = 'width:100%;padding:10px;margin-bottom:6px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:inherit;font-size:.95rem;';
            container.appendChild(inp);
        }
    }

    function renderGuestExperience() {
        const g = guestData;
        const acompNames = acompsData.map(a => a.nombre).filter(Boolean);
        const totalAcomp = g.pases_asignados - 1;

        // Splash personalizado
        const section = document.getElementById('personalizedWelcome');
        const textEl = document.getElementById('guestWelcomeText');
        const pasesEl = document.getElementById('guestPassesText');
        if (section && textEl && pasesEl) {
            if (totalAcomp > 0) {
                const yMas = acompNames.length > 0
                    ? (totalAcomp > acompNames.length ? ` y ${totalAcomp - acompNames.length} mas` : '')
                    : ` y ${totalAcomp} mas`;
                textEl.textContent = `${g.nombre}${totalAcomp > 0 ? yMas : ''}, estan cordialmente invitados`;
            } else {
                textEl.textContent = `${g.nombre}, estas cordialmente invitado(a)`;
            }
            pasesEl.innerHTML = `🎟 ${g.pases_asignados} ${g.pases_asignados === 1 ? 'pase' : 'pases'}`;
            section.style.display = 'block';
        }

        // Pre-llenar nombre
        const nameInput = document.getElementById('name');
        if (nameInput) { nameInput.value = g.nombre; nameInput.readOnly = true; nameInput.style.opacity = '.7'; }

        // Configurar input de pases
        const guestsInput = document.getElementById('guests');
        if (guestsInput) {
            if (guestsInput.tagName === 'SELECT') {
                guestsInput.innerHTML = '';
                for (let i = 1; i <= g.pases_asignados; i++) {
                    const opt = document.createElement('option');
                    opt.value = i; opt.textContent = i === 1 ? '1 persona' : `${i} personas`;
                    guestsInput.appendChild(opt);
                }
                guestsInput.value = g.pases_asignados;
            } else {
                guestsInput.max = g.pases_asignados;
                guestsInput.value = g.pases_asignados;
            }
            const existingNames = acompsData.map(a => a.nombre);
            guestsInput.addEventListener('change', function () { buildNombreInputs(parseInt(this.value) || 1, existingNames); });
            guestsInput.addEventListener('input', function () { buildNombreInputs(parseInt(this.value) || 1, existingNames); });
            buildNombreInputs(g.pases_asignados, existingNames);
        }

        // Marcar como vista
        if (g.status === 'pendiente' || g.status === 'enviada') {
            markAsViewed(g.id);
        }

        // Enganchar form
        attachFormSubmit();

        // Si ya confirmo, mostrar estado con opcion de modificar
        if (g.status === 'confirmada' || g.status === 'declinada') {
            showAlreadyConfirmed();
        }
    }

    function showAlreadyConfirmed() {
        const g = guestData;
        const asiste = g.asiste;
        const acompNames = acompsData.map(a => a.nombre).filter(Boolean);
        const nombresHtml = acompNames.length
            ? `<p style="color:#aaa;font-size:.9rem;margin-top:8px;">Asistentes: ${g.nombre}, ${acompNames.join(', ')}</p>` : '';

        const form = document.getElementById('rsvpForm');
        if (!form) return;
        form.style.display = 'none';

        const div = document.createElement('div');
        div.style.cssText = 'text-align:center;padding:30px 20px;background:rgba(255,255,255,0.05);border-radius:20px;border:2px solid var(--gold,#d4af37);margin-bottom:20px;';
        div.innerHTML = `
            <div style="font-size:3rem;margin-bottom:16px;">${asiste ? '🎉' : '💌'}</div>
            <h2 style="color:var(--gold,#d4af37);font-family:'Dancing Script',cursive;margin-bottom:12px;">
                ${asiste ? 'Ya confirmaste tu asistencia!' : 'Gracias por avisarnos'}
            </h2>
            <p style="color:var(--cream,#eee);font-size:1.1rem;margin-bottom:8px;">
                ${asiste ? `Te esperamos con ${g.pases_confirmados || g.pases_asignados} lugares reservados.` : 'Lamentamos que no puedas acompanarnos.'}
            </p>
            ${nombresHtml}
            <button id="btnModificar" style="margin-top:18px;padding:10px 28px;border-radius:20px;border:1px solid var(--gold,#d4af37);background:transparent;color:var(--gold,#d4af37);cursor:pointer;font-size:.9rem;">Modificar confirmacion</button>`;
        form.parentNode.insertBefore(div, form);
        div.querySelector('#btnModificar').addEventListener('click', function () {
            div.style.display = 'none';
            form.style.display = 'block';
        });
    }

    function showNotFound() {
        const section = document.getElementById('personalizedWelcome');
        if (section) {
            section.style.display = 'block';
            section.innerHTML = '<div style="font-size:2rem;margin-bottom:12px;">❓</div><h2 style="color:var(--gold,#d4af37);">Enlace no valido</h2><p style="color:var(--cream,#eee);">Este enlace no es valido o ha expirado.</p>';
        }
    }

    function attachFormSubmit() {
        const form = document.getElementById('rsvpForm');
        if (!form) return;
        form.onsubmit = null;
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const nombre = (document.getElementById('name')?.value || '').trim();
            const pases = parseInt(document.getElementById('guests')?.value || '1');
            const asisteSel = document.getElementById('attendance')?.value;
            const mensaje = document.getElementById('message')?.value || '';
            const nombresAcomp = Array.from(document.querySelectorAll('.nombre-asistente')).map(inp => inp.value.trim());

            if (!nombre || !asisteSel) return;
            const asiste = asisteSel === 'si';

            const btn = form.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.innerHTML = 'Enviando...'; }

            const ok = await submitRSVP(asiste, pases, nombre, mensaje, nombresAcomp);

            if (ok) {
                form.style.display = 'none';
                const successEl = document.getElementById('successMessage');
                if (successEl) {
                    const nombresStr = nombresAcomp.filter(Boolean).length
                        ? `<br><small style="opacity:.8">Asistentes: ${nombre}, ${nombresAcomp.filter(Boolean).join(', ')}</small>` : '';
                    successEl.style.display = 'block';
                    successEl.innerHTML = asiste
                        ? `✓ Gracias ${nombre}! Confirmados ${pases} lugares.${nombresStr}`
                        : `✓ Gracias ${nombre} por avisarnos.`;
                }
            } else {
                if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar Confirmacion'; }
                alert('Error al enviar. Intenta de nuevo.');
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadGuest);
    else loadGuest();
    window._rsvpGuestLoaded = true;
})();
