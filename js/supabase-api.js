/* ============================================================
   CAPA DE DATOS SUPABASE — XV Años Penélope Desirée Gutiérrez
   Usada por selector-v8.js

   PROTOCOLO (obligatorio, no cambiar a la ligera)
   -----------------------------------------------
   La tabla `selecciones` tiene el trigger BEFORE INSERT/UPDATE
   `reject_old_code_version`, que DESCARTA EN SILENCIO (PostgREST
   responde 201 pero no guarda nada) cualquier fila que no cumpla:

     1. code_version >= 3            -> mandamos CODE_VERSION = 6
     2. datos._sync.clock > 0        -> reloj lógico por foto
     3. clock entrante > clock guardado para (evento_id, foto_index)

   Por eso cada escritura: lee la fila remota -> calcula el reloj
   siguiente -> escribe -> RELEE para verificar que quedó grabada.
   Si en ese instante otro dispositivo escribió la misma foto, se
   reintenta con un reloj mayor (hasta 3 veces). Así la última
   acción humana sobre esa foto es la que gana.

   MULTI-SESIÓN
   ------------
   El reloj es POR FOTO, nunca global: una sesión jamás reemplaza
   el estado completo del evento. Cada dispositivo sólo puede
   avanzar las fotos que él tocó; las demás quedan intactas aunque
   su copia local esté vieja.

   Borrar una foto = escribir la fila con todo en false y
   _sync.deleted = true (borrado suave, conserva el reloj).
   El DELETE duro (borrar todo) sí funciona: el trigger no aplica.
   ============================================================ */
(function (global) {
'use strict';

const URL_BASE = 'https://nzpujmlienzfetqcgsxz.supabase.co';
const ANON     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
const SLUG     = 'xv-anos-penelope-gutierrez';
const HEADERS  = {
    'apikey':        ANON,
    'Authorization': 'Bearer ' + ANON,
    'Content-Type':  'application/json'
};

const CODE_VERSION = 6;
const CATS         = ['impresion', 'invitacion', 'descartada'];
const CLOCK_KEY    = 'penelope_relojes_v1';
const SELECT_COLS  = 'foto_index,datos,impresion,invitacion,descartada,session_id';

/* ── Sesión ───────────────────────────────────────────────── */
function getSessionId() {
    const KEY = 'foro7_sid';
    let s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    if (!s) {
        s = (global.crypto && crypto.randomUUID) ? crypto.randomUUID()
                                                 : String(Date.now()) + Math.random();
        try { localStorage.setItem(KEY, s); } catch (e) {}
    }
    return s;
}
const SESSION_ID = getSessionId();

/* ── Relojes lógicos por foto ─────────────────────────────── */
function leerRelojes() {
    try { return JSON.parse(localStorage.getItem(CLOCK_KEY) || '{}'); }
    catch (e) { return {}; }
}
function guardarRelojes(r) {
    try { localStorage.setItem(CLOCK_KEY, JSON.stringify(r)); } catch (e) {}
}
function relojDe(idx) {
    return Number(leerRelojes()[String(idx)] || 0);
}
function recordarReloj(idx, clock) {
    if (!clock) return;
    const r = leerRelojes();
    r[String(idx)] = Math.max(Number(r[String(idx)] || 0), Number(clock));
    guardarRelojes(r);
}
function siguienteReloj(idx, relojRemoto) {
    const r = leerRelojes();
    const n = Math.max(Number(r[String(idx)] || 0), Number(relojRemoto || 0)) + 1;
    r[String(idx)] = n;
    guardarRelojes(r);
    return n;
}

/* ── Normalización ────────────────────────────────────────── */
function normalizar(sel) {
    const limpio = {};
    CATS.forEach(c => { limpio[c] = !!(sel && sel[c]); });
    return limpio;
}

function tieneAlgo(sel) {
    const s = normalizar(sel);
    return CATS.some(c => s[c]);
}

function metaDe(row) {
    const datos = (row && row.datos) ? row.datos : null;
    const m = (datos && datos._sync) ? datos._sync : {};
    return {
        clock:   Number(m.clock || 0),
        sid:     m.sid || (row && row.session_id) || '',
        deleted: !!m.deleted
    };
}

/* Fila de Supabase -> selección. `datos` manda; si viene vacía
   (filas viejas, code_version 1) se reconstruye de las columnas. */
function filaASeleccion(row) {
    const base = (row.datos && Object.keys(row.datos).length)
        ? row.datos
        : { impresion: row.impresion, invitacion: row.invitacion, descartada: row.descartada };
    return normalizar(base);
}

/* ── Evento ───────────────────────────────────────────────── */
let eventoIdCache = null;
async function getEventoId() {
    if (eventoIdCache) return eventoIdCache;
    const r = await fetch(
        `${URL_BASE}/rest/v1/eventos?slug=eq.${SLUG}&select=id&limit=1`,
        { headers: HEADERS }
    );
    if (!r.ok) throw new Error('eventos ' + r.status);
    const [ev] = await r.json();
    if (!ev || !ev.id) throw new Error('Evento "' + SLUG + '" no existe en Supabase');
    eventoIdCache = ev.id;
    return eventoIdCache;
}

async function filaRemota(eid, idx) {
    const r = await fetch(
        `${URL_BASE}/rest/v1/selecciones?evento_id=eq.${eid}&foto_index=eq.${idx}&select=${SELECT_COLS}&limit=1`,
        { headers: Object.assign({}, HEADERS, { 'Cache-Control': 'no-cache' }) }
    );
    if (!r.ok) throw new Error('lectura ' + r.status);
    const rows = await r.json();
    return rows[0] || null;
}

async function escribir(row) {
    const r = await fetch(`${URL_BASE}/rest/v1/selecciones?on_conflict=evento_id,foto_index`, {
        method:  'POST',
        headers: Object.assign({}, HEADERS, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body:    JSON.stringify([row])
    });
    if (!r.ok) throw new Error('upsert ' + r.status);
}

function armarFila(eid, idx, sel, clock, borrada, filename) {
    const datos = normalizar(sel);
    datos._sync = {
        clock:     clock,
        sid:       SESSION_ID,
        updatedAt: new Date().toISOString(),
        deleted:   !!borrada
    };
    if (filename) datos.filename = filename;
    return {
        evento_id:    eid,
        session_id:   SESSION_ID,
        foto_index:   idx,
        impresion:    datos.impresion,
        invitacion:   datos.invitacion,
        descartada:   datos.descartada,
        datos:        datos,
        code_version: CODE_VERSION
    };
}

/* ── Cola por foto: dos guardados seguidos de la MISMA foto
      (swipe rápido) se encadenan en vez de pisarse. ────────── */
const colas = {};
function enCola(idx, tarea) {
    const k = String(idx);
    const previa = colas[k] || Promise.resolve();
    const actual = previa.catch(() => {}).then(tarea);
    colas[k] = actual.catch(() => {});
    return actual;
}

/* Escribe UNA foto y VERIFICA que Supabase la haya aceptado.
   Devuelve 'ok' | 'conflicto'. */
async function escribirVerificado(idx, sel, borrada, filename) {
    const eid = await getEventoId();
    for (let intento = 0; intento < 3; intento++) {
        const meta = metaDe(await filaRemota(eid, idx));
        recordarReloj(idx, meta.clock);

        const clock = siguienteReloj(idx, meta.clock);
        await escribir(armarFila(eid, idx, sel, clock, borrada, filename));

        const verif = metaDe(await filaRemota(eid, idx));
        recordarReloj(idx, verif.clock);
        if (verif.clock === clock && verif.sid === SESSION_ID) return 'ok';
        // Otro dispositivo escribió la misma foto en el mismo instante:
        // reintentamos con un reloj mayor para que gane la última acción.
    }
    return 'conflicto';
}

/* ============================================================
   API PÚBLICA
   ============================================================ */

/* Filas crudas del evento, SIN tocar los relojes locales: la carga
   inicial necesita comparar reloj remoto contra reloj local antes de
   que éste se actualice.
   -> [ { idx, sel, clock, sid, deleted }, … ] */
async function fetchFilas() {
    const eid = await getEventoId();
    const r = await fetch(
        `${URL_BASE}/rest/v1/selecciones?evento_id=eq.${eid}&select=${SELECT_COLS}`,
        { headers: Object.assign({}, HEADERS, { 'Cache-Control': 'no-cache' }) }
    );
    if (!r.ok) throw new Error('selecciones ' + r.status);
    const rows = await r.json();
    return rows.map(row => {
        const meta = metaDe(row);
        return {
            idx:     Number(row.foto_index),
            sel:     filaASeleccion(row),
            clock:   meta.clock,
            sid:     meta.sid,
            deleted: meta.deleted
        };
    });
}

/* { "12": {impresion:true, invitacion:false, descartada:false}, … }
   Además pone al día los relojes locales (para refrescos). */
async function fetchSelecciones() {
    const filas   = await fetchFilas();
    const out     = {};
    const relojes = leerRelojes();
    filas.forEach(f => {
        if (f.clock) {
            const k = String(f.idx);
            relojes[k] = Math.max(Number(relojes[k] || 0), f.clock);
        }
        if (f.deleted) return;
        if (tieneAlgo(f.sel)) out[f.idx] = f.sel;
    });
    guardarRelojes(relojes);
    return out;
}

function guardarFoto(idx, sel, filename) {
    return enCola(idx, () => escribirVerificado(idx, sel, false, filename));
}

function borrarFoto(idx) {
    return enCola(idx, async () => {
        const eid = await getEventoId();
        if (!(await filaRemota(eid, idx))) return 'ok';   // nunca se guardó
        return escribirVerificado(idx, {}, true);
    });
}

/* Sube en bloque (migración de localStorage -> nube). Secuencial:
   cada foto necesita leer y verificar su propio reloj. */
async function subirTodas(selecciones, nombres) {
    const entradas = Object.entries(selecciones).filter(([, s]) => tieneAlgo(s));
    for (const [idx, sel] of entradas) {
        const i = parseInt(idx, 10);
        try { await guardarFoto(i, sel, nombres && nombres[i]); }
        catch (e) { console.warn('[Supabase] foto ' + i + ':', e.message); }
    }
}

/* Borrado duro de todo el evento (el trigger no aplica a DELETE). */
async function borrarTodas() {
    const eid = await getEventoId();
    const r = await fetch(`${URL_BASE}/rest/v1/selecciones?evento_id=eq.${eid}`, {
        method: 'DELETE', headers: HEADERS
    });
    if (!r.ok) throw new Error('delete ' + r.status);
    guardarRelojes({});
}

async function registrarVisita(pagina) {
    try {
        const eid = await getEventoId();
        await fetch(`${URL_BASE}/rest/v1/visitas`, {
            method:  'POST',
            headers: Object.assign({}, HEADERS, { 'Prefer': 'return=minimal' }),
            body:    JSON.stringify({ evento_id: eid, pagina: pagina || 'selector', session_id: SESSION_ID })
        });
    } catch (e) { /* silencioso */ }
}

/* ── Realtime ─────────────────────────────────────────────────
   Escucha INSERT/UPDATE/DELETE de ESTE evento y entrega cambios
   ya normalizados. La tabla está en la publicación
   `supabase_realtime` con REPLICA IDENTITY FULL, así que los
   DELETE también traen la fila completa.
   onCambio({ tipo, idx, sel, clock, sid, borrada, propia })
   ------------------------------------------------------------ */
let canal = null;
function suscribirRealtime(onCambio, onEstado) {
    if (!global.supabase || !global.supabase.createClient) {
        if (onEstado) onEstado('SIN_LIBRERIA');
        return;
    }
    if (canal) return;

    getEventoId().then(eid => {
        const client = global.supabase.createClient(URL_BASE, ANON, {
            auth:     { persistSession: false },
            realtime: { params: { eventsPerSecond: 20 } }
        });

        canal = client
            .channel('selecciones-' + eid)
            .on('postgres_changes', {
                event:  '*',
                schema: 'public',
                table:  'selecciones',
                filter: 'evento_id=eq.' + eid
            }, payload => {
                const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
                if (!row || row.foto_index === undefined || row.foto_index === null) return;
                const idx  = Number(row.foto_index);
                const meta = metaDe(row);
                onCambio({
                    tipo:    payload.eventType === 'DELETE' ? 'delete' : 'upsert',
                    idx:     idx,
                    sel:     filaASeleccion(row),
                    clock:   meta.clock,
                    sid:     meta.sid,
                    borrada: meta.deleted,
                    propia:  meta.sid === SESSION_ID
                });
            })
            .subscribe(estado => { if (onEstado) onEstado(estado); });
    }).catch(e => {
        console.warn('[Realtime] no disponible:', e.message);
        if (onEstado) onEstado('ERROR');
    });
}

global.SB = {
    SESSION_ID,
    CODE_VERSION,
    CATS,
    getEventoId,
    fetchFilas,
    fetchSelecciones,
    guardarFoto,
    borrarFoto,
    subirTodas,
    borrarTodas,
    registrarVisita,
    suscribirRealtime,
    tieneAlgo,
    normalizar,
    relojDe,
    recordarReloj
};

})(window);
