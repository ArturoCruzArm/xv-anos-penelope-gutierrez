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

    // ── Acceso directo sin PIN ───────────────────────────────────────────────
    function checkPin() { return true; }

