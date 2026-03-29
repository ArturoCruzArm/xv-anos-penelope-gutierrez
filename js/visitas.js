// Contador de visitas - XV Años Penélope Desirée
(function () {
    const SUPABASE_URL = 'https://nzpujmlienzfetqcgsxz.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
    const EVENTO_SLUG = 'xv-anos-penelope-gutierrez';
    const SB_H = { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' };

    const SESSION_KEY = 'foro7_sid';
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, sid); }

    const pagina = (location.pathname.split('/').pop().replace('.html', '') || 'index').toLowerCase();
    const isSelector = pagina === 'selector';

    // Inject floating counter widget
    const widget = document.createElement('div');
    widget.id = 'foro7-visit-counter';
    widget.style.cssText = [
        'position:fixed', 'bottom:14px', 'right:14px',
        'background:rgba(0,0,0,0.45)', 'color:rgba(255,255,255,0.75)',
        'font-size:11px', 'padding:4px 11px', 'border-radius:20px',
        'z-index:9000', 'pointer-events:none', 'font-family:sans-serif',
        'letter-spacing:0.04em', 'backdrop-filter:blur(4px)'
    ].join(';');
    widget.textContent = '👁 …';

    async function init() {
        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/eventos?slug=eq.${EVENTO_SLUG}&select=id&limit=1`, { headers: SB_H });
            const [ev] = await r.json();
            const evento_id = ev?.id;
            if (!evento_id) return;

            // Register visit only for non-selector pages (selector.js handles selector)
            if (!isSelector) {
                fetch(`${SUPABASE_URL}/rest/v1/visitas`, {
                    method: 'POST',
                    headers: { ...SB_H, 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ evento_id, pagina, session_id: sid })
                }).catch(() => {});
            }

            // Count visits to this page
            const cr = await fetch(
                `${SUPABASE_URL}/rest/v1/visitas?evento_id=eq.${evento_id}&pagina=eq.${pagina}&select=id`,
                { headers: { ...SB_H, 'Prefer': 'count=exact', 'Range': '0-0' } }
            );
            const range = cr.headers.get('Content-Range');
            const count = range ? (range.split('/')[1] ?? '?') : '?';
            widget.textContent = `👁 ${Number(count).toLocaleString('es-MX')}`;
        } catch (e) {
            widget.remove();
        }
    }

    function mount() {
        document.body.appendChild(widget);
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
