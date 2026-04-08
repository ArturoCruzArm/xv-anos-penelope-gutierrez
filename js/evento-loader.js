/**
 * evento-loader.js — Carga datos dinámicos de eventos_config y actualiza el DOM
 * Si un campo fue guardado en datos.html, aquí se refleja en la invitación
 * Foro 7 © 2026
 */
(function () {
  const SB_URL  = 'https://nzpujmlienzfetqcgsxz.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
  const H       = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON };

  // Mapeo: [seccion, key] → selector CSS a actualizar
  // Agrega aquí los selectores que usa tu index.html
  const BINDINGS = [
    // Ceremonia
    { seccion: 'ceremonia', key: 'lugar',     sel: '[data-campo="ceremonia-lugar"]' },
    { seccion: 'ceremonia', key: 'direccion', sel: '[data-campo="ceremonia-direccion"]' },
    { seccion: 'ceremonia', key: 'hora',      sel: '[data-campo="ceremonia-hora"]' },
    { seccion: 'ceremonia', key: 'maps_url',  sel: '[data-campo="ceremonia-maps"]', attr: 'href' },
    // Recepción
    { seccion: 'recepcion', key: 'lugar',     sel: '[data-campo="recepcion-lugar"]' },
    { seccion: 'recepcion', key: 'direccion', sel: '[data-campo="recepcion-direccion"]' },
    { seccion: 'recepcion', key: 'hora',      sel: '[data-campo="recepcion-hora"]' },
    { seccion: 'recepcion', key: 'maps_url',  sel: '[data-campo="recepcion-maps"]', attr: 'href' },
    // Protagonistas
    { seccion: 'protagonistas', key: 'nombre',       sel: '[data-campo="protagonista-nombre"]' },
    { seccion: 'protagonistas', key: 'nombre_madre', sel: '[data-campo="madre-nombre"]' },
    { seccion: 'protagonistas', key: 'nombre_padre', sel: '[data-campo="padre-nombre"]' },
    { seccion: 'protagonistas', key: 'mensaje_especial', sel: '[data-campo="mensaje-especial"]' },
    // Vestimenta
    { seccion: 'vestimenta', key: 'tipo',              sel: '[data-campo="vestimenta-tipo"]' },
    { seccion: 'vestimenta', key: 'colores_reservados', sel: '[data-campo="vestimenta-colores"]' },
    // Invitación web
    { seccion: 'invitacion_web', key: 'frase', sel: '[data-campo="invitacion-frase"]' },
  ];

  async function load(slug) {
    try {
      const evR = await fetch(`${SB_URL}/rest/v1/eventos?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`, { headers: H });
      const [ev] = await evR.json();
      if (!ev) return;

      const cfgR = await fetch(`${SB_URL}/rest/v1/eventos_config?evento_id=eq.${ev.id}&select=seccion,datos`, { headers: H });
      const cfgArr = await cfgR.json();
      const cfg = {};
      cfgArr.forEach(r => { cfg[r.seccion] = r.datos || {}; });

      BINDINGS.forEach(({ seccion, key, sel, attr }) => {
        const val = cfg[seccion]?.[key];
        if (!val) return;
        document.querySelectorAll(sel).forEach(el => {
          if (attr) el.setAttribute(attr, val);
          else el.textContent = val;
        });
      });

      // Exponer para uso en otros scripts
      window.EVENTO_CONFIG = cfg;
    } catch (e) {
      // Fallo silencioso — los datos estáticos siguen mostrándose
    }
  }

  window.EventoLoader = { load };
  document.addEventListener('DOMContentLoaded', () => {
    const slug = window.EVENTO_SLUG || document.querySelector('meta[name="evento-slug"]')?.content;
    if (slug) load(slug);
  });
})();
