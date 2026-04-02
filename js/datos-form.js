/**
 * datos-form.js — Sistema de captura de datos de evento
 * Muestra solo campos vacíos · Guarda con debounce 5s · Notifica al admin
 * Foro 7 © 2026
 */
(function () {
  'use strict';

  const SB_URL  = 'https://nzpujmlienzfetqcgsxz.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
  const H = { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' };

  /* ═══════════════════════════════════════════════════════════════════
   * DEFINICIÓN DE SECCIONES Y CAMPOS
   * ═══════════════════════════════════════════════════════════════════ */
  const SECCIONES = {

    protagonistas: {
      icon: '👑', label: 'Protagonistas',
      tiposEvento: ['xv','boda','bautizo','graduacion','cumpleanos','otro'],
      campos: [
        { key:'nombre',       label:'Nombre de la quinceañera',           type:'text',     ph:'Ej: Sheilyn Guadalupe Herrera Reynoso', tiposEvento:['xv'] },
        { key:'nombre',       label:'Nombre de la novia',                type:'text',     ph:'Ej: Patricia Berenice Martínez',        tiposEvento:['boda'] },
        { key:'nombre',       label:'Nombre del festejado/a',            type:'text',     ph:'Nombre completo',                       tiposEvento:['bautizo','cumpleanos','graduacion','otro'] },
        { key:'fecha_nac',    label:'Fecha de nacimiento',               type:'date',     ph:'',                                      tiposEvento:['xv','bautizo','cumpleanos'] },
        { key:'nombre_2',     label:'Nombre del novio',                  type:'text',     ph:'Ej: Carlos Eduardo López',              tiposEvento:['boda'] },
        { key:'nombre_madre', label:'Nombre completo de la mamá de la quinceañera', type:'text', ph:'Ej: María Concepción Reynoso Cuevas', tiposEvento:['xv','bautizo','cumpleanos','graduacion','otro'] },
        { key:'nombre_padre', label:'Nombre completo del papá de la quinceañera', type:'text', ph:'Ej: Roberto Herrera García',        tiposEvento:['xv','bautizo','cumpleanos','graduacion','otro'] },
        { key:'nombre_madre', label:'Nombre completo de la mamá de la novia',     type:'text', ph:'Ej: Patricia Becerra Pacheco',      tiposEvento:['boda'] },
        { key:'nombre_padre', label:'Nombre completo del papá de la novia',       type:'text', ph:'Ej: Ramón Martínez Espinoza',       tiposEvento:['boda'] },
        { key:'nombre_madre_novio', label:'Nombre de la mamá del novio',          type:'text', ph:'Ej: Erika Fabiola Huerta',          tiposEvento:['boda'] },
        { key:'nombre_padre_novio', label:'Nombre del papá del novio',            type:'text', ph:'Ej: Joaquin Cordova Camarillo',     tiposEvento:['boda'] },
        { key:'mensaje_especial',   label:'Mensaje o frase especial',    type:'textarea', ph:'"Hoy comienza un nuevo capítulo..."' },
      ]
    },

    padrinos_honor: {
      icon: '🤝', label: 'Padrinos de Honor',
      tiposEvento: ['xv','bautizo','cumpleanos'],
      campos: [
        { key:'padrino', label:'Padrino de honor', type:'text', ph:'Nombre completo' },
        { key:'madrina', label:'Madrina de honor', type:'text', ph:'Nombre completo' },
      ]
    },

    padrinos_novios: {
      icon: '🤝', label: 'Padrinos de los Novios',
      tiposEvento: ['boda'],
      campos: [
        { key:'padrino', label:'Padrino',        type:'text', ph:'Nombre completo' },
        { key:'madrina', label:'Madrina',         type:'text', ph:'Nombre completo' },
      ]
    },

    // ── MADRINAS XV AÑOS ────────────────────────────────────────────────
    madrinas: {
      icon: '🎀', label: 'Madrinas de XV Años',
      tiposEvento: ['xv'],
      campos: [
        // Arreglo personal
        { key:'maquillaje',   label:'💄 Maquillaje',        type:'text', ph:'Nombre' },
        { key:'peinado',      label:'💇 Peinado',           type:'text', ph:'Nombre' },
        { key:'unas',         label:'💅 Uñas',              type:'text', ph:'Nombre' },
        // Accesorios y vestuario
        { key:'vestido',      label:'👗 Vestido',           type:'text', ph:'Nombre' },
        { key:'zapatillas',   label:'👠 Zapatillas',        type:'text', ph:'Nombre' },
        { key:'corona',       label:'👑 Corona',            type:'text', ph:'Nombre' },
        { key:'anillo',       label:'💍 Anillo',            type:'text', ph:'Nombre' },
        { key:'aretes',       label:'👂 Aretes',            type:'text', ph:'Nombre' },
        { key:'collar',       label:'📿 Collar',            type:'text', ph:'Nombre' },
        { key:'pulsera',      label:'⌚ Pulsera',           type:'text', ph:'Nombre' },
        { key:'ramo',         label:'💐 Ramo',              type:'text', ph:'Nombre' },
        // Ceremonia religiosa
        { key:'biblia_misal', label:'📖 Biblia/Misal',      type:'text', ph:'Nombre' },
        { key:'rosario',      label:'📿 Rosario',           type:'text', ph:'Nombre' },
        { key:'cojin',        label:'🛋️ Cojín',             type:'text', ph:'Nombre' },
        // Solo XV años
        { key:'ultima_muneca',label:'🪆 Última muñeca',     type:'text', ph:'Nombre' },
        // Recepción / fiesta
        { key:'pastel',       label:'🎂 Pastel',            type:'text', ph:'Nombre' },
        { key:'brindis',      label:'🥂 Brindis',           type:'text', ph:'Nombre' },
        { key:'vals',         label:'💃 Vals',              type:'text', ph:'Nombre' },
        { key:'recuerdos',    label:'🎁 Recuerdos',         type:'text', ph:'Nombre' },
        { key:'centros_mesa', label:'🌸 Centros de mesa',   type:'text', ph:'Nombre' },
        { key:'invitaciones', label:'💌 Invitaciones',      type:'text', ph:'Nombre' },
        { key:'foto_video',   label:'📸 Foto/Video',        type:'text', ph:'Nombre' },
        { key:'musica_dj',    label:'🎵 DJ/Música',         type:'text', ph:'Nombre' },
        { key:'decoracion',   label:'🎨 Decoración',        type:'text', ph:'Nombre' },
      ]
    },

    // ── MADRINAS BODA ────────────────────────────────────────────────────
    madrinas_boda: {
      icon: '🎀', label: 'Madrinas de Boda',
      tiposEvento: ['boda'],
      campos: [
        // Arreglo personal novia
        { key:'maquillaje',   label:'💄 Maquillaje de novia',    type:'text', ph:'Nombre' },
        { key:'peinado',      label:'💇 Peinado de novia',       type:'text', ph:'Nombre' },
        // Ceremonia religiosa
        { key:'lazo',         label:'🪢 Lazo',                   type:'text', ph:'Nombre' },
        { key:'arras',        label:'💰 Arras',                  type:'text', ph:'Nombre' },
        { key:'cojin_anillos',label:'💍 Cojín de anillos',       type:'text', ph:'Nombre' },
        { key:'velo',         label:'👰 Velo',                   type:'text', ph:'Nombre' },
        { key:'biblia_misal', label:'📖 Biblia/Misal',           type:'text', ph:'Nombre' },
        { key:'ramo_novia',   label:'💐 Ramo de la novia',       type:'text', ph:'Nombre' },
        { key:'flores_templo',label:'🌺 Flores del templo',      type:'text', ph:'Nombre' },
        // Recepción
        { key:'pastel',       label:'🎂 Pastel',                 type:'text', ph:'Nombre' },
        { key:'brindis',      label:'🥂 Brindis',                type:'text', ph:'Nombre' },
        { key:'mesa_dulces',  label:'🍬 Mesa de dulces',         type:'text', ph:'Nombre' },
        { key:'recuerdos',    label:'🎁 Recuerdos',              type:'text', ph:'Nombre' },
        { key:'centros_mesa', label:'🌸 Centros de mesa',        type:'text', ph:'Nombre' },
        { key:'musica_dj',    label:'🎵 DJ/Música',              type:'text', ph:'Nombre' },
        { key:'decoracion',   label:'🎨 Decoración',             type:'text', ph:'Nombre' },
        { key:'foto_video',   label:'📸 Foto/Video',             type:'text', ph:'Nombre' },
        // Legal
        { key:'testigo_novia',label:'⚖️ Testigo de la novia',   type:'text', ph:'Nombre' },
        { key:'testigo_novio',label:'⚖️ Testigo del novio',     type:'text', ph:'Nombre' },
      ]
    },

    // ── MADRINAS / PADRINOS ADICIONALES (ambos tipos) ───────────────────
    madrinas_extra: {
      icon: '➕', label: 'Madrinas / Padrinos adicionales',
      tiposEvento: ['xv','boda','bautizo'],
      tipo: 'extras',   // rol libre + nombre libre
      ph_rol:    'Ej: Madrina de flores, Padrino de mesa',
      ph_nombre: 'Nombre completo',
    },

    chambelanes: {
      icon: '🤵', label: 'Chambelanes',
      tiposEvento: ['xv'],
      tipo: 'array',
      keyLista: 'nombres',
      keyCantidad: 'cantidad',
      phItem: 'Nombre del chambelán',
      opciones: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    },

    damas: {
      icon: '👗', label: 'Damas de Honor',
      tiposEvento: ['xv'],
      tipo: 'array',
      keyLista: 'nombres',
      keyCantidad: 'cantidad',
      phItem: 'Nombre de la dama',
      opciones: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    },

    damas_boda: {
      icon: '👗', label: 'Damas de la Novia',
      tiposEvento: ['boda'],
      tipo: 'array',
      keyLista: 'nombres',
      keyCantidad: 'cantidad',
      phItem: 'Nombre de la dama',
      opciones: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    },

    familiares: {
      icon: '👨‍👩‍👧‍👦', label: 'Familiares Especiales',
      tiposEvento: ['xv','boda','bautizo','graduacion','cumpleanos'],
      tipo: 'familiares',
      parentescos: ['Abuelita','Abuelito','Tía','Tío','Prima','Primo','Hermana','Hermano','Madrina especial','Padrino especial','Amiga especial','Otro'],
    },

    ceremonia: {
      icon: '⛪', label: 'Ceremonia Religiosa',
      campos: [
        { key:'lugar',    label:'Nombre de la iglesia / capilla', type:'text', ph:'Ej: Capilla Divina Infantita' },
        { key:'direccion',label:'Dirección completa',             type:'text', ph:'Calle, número, colonia, León, Gto.' },
        { key:'hora',     label:'Hora de inicio',                 type:'time', ph:'' },
        { key:'maps_url', label:'Enlace Google Maps',             type:'url',  ph:'https://maps.app.goo.gl/...' },
      ]
    },

    recepcion: {
      icon: '🎉', label: 'Recepción',
      campos: [
        { key:'lugar',    label:'Nombre del salón',              type:'text', ph:'Ej: Salón El Portal' },
        { key:'direccion',label:'Dirección completa',            type:'text', ph:'Calle, número, colonia, León, Gto.' },
        { key:'hora',     label:'Hora de inicio',                type:'time', ph:'' },
        { key:'hora_fin', label:'Hora aproximada de cierre',     type:'time', ph:'' },
        { key:'maps_url', label:'Enlace Google Maps',            type:'url',  ph:'https://maps.app.goo.gl/...' },
      ]
    },

    vestimenta: {
      icon: '👗', label: 'Código de Vestimenta',
      campos: [
        { key:'tipo',              label:'Tipo de vestimenta',                             type:'select', opciones:['Formal','Semi-formal','Elegante casual','Etiqueta rigurosa','Libre'] },
        { key:'colores_reservados',label:'Colores reservados para la quinceañera',      type:'text',   ph:'Ej: Rosa, Lila',      tiposEvento:['xv'] },
        { key:'colores_reservados',label:'Colores reservados (blanco exclusivo novia)',  type:'text',   ph:'Ej: Blanco, Marfil',  tiposEvento:['boda'] },
        { key:'colores_reservados',label:'Colores reservados para el festejado/a',       type:'text',   ph:'Ej: Azul rey',        tiposEvento:['bautizo','cumpleanos','graduacion','otro'] },
        { key:'nota',              label:'Indicación adicional',                         type:'text',   ph:'Ej: No usar tacones de aguja' },
      ]
    },

    sesion: {
      icon: '📸', label: 'Sesión Fotográfica Previa',
      campos: [
        { key:'fecha',         label:'Fecha de la sesión',           type:'date',   ph:'' },
        { key:'hora',          label:'Hora de inicio',               type:'time',   ph:'' },
        { key:'lugares',       label:'Lugar(es)',                    type:'text',   ph:'Ej: La Calzada y Templo Expiatorio' },
        { key:'vestido_listo', label:'¿El vestido de quinceañera ya está listo?', type:'select', opciones:['Sí, está listo','En proceso','Pendiente de elegir'], tiposEvento:['xv'] },
        { key:'vestido_listo', label:'¿El vestido de novia ya está listo?',      type:'select', opciones:['Sí, está listo','En proceso','Pendiente de elegir'], tiposEvento:['boda'] },
      ]
    },

    video: {
      icon: '🎬', label: 'Inspiración para el Video',
      campos: [
        // Bodas
        { key:'como_se_conocieron',   label:'¿Cómo se conocieron?',                          type:'textarea', ph:'Cuéntanos la historia desde el principio…',                      tiposEvento:['boda'] },
        { key:'testimonio_ella',      label:'Testimonio de ella: ¿qué hace único a tu novio?', type:'textarea', ph:'Con sus propias palabras…',                                     tiposEvento:['boda'] },
        { key:'testimonio_el',        label:'Testimonio de él: ¿qué hace única a tu novia?',   type:'textarea', ph:'Con sus propias palabras…',                                     tiposEvento:['boda'] },
        { key:'momento_favorito',     label:'Momento favorito juntos antes de la boda',        type:'textarea', ph:'Un recuerdo, viaje, fecha especial…',                           tiposEvento:['boda'] },
        // XV años
        { key:'como_planificaron',    label:'¿Cómo imaginaban esta fiesta? ¿De quién fue la idea?', type:'textarea', ph:'La quinceañera, mamá, papá… cuénten la historia detrás…', tiposEvento:['xv'] },
        { key:'testimonio_madre_xv',  label:'Testimonio de mamá: algo especial sobre tu hija',  type:'textarea', ph:'Un recuerdo, su personalidad, lo que más la enorgullece…',    tiposEvento:['xv'] },
        { key:'testimonio_xv',        label:'Testimonio de la quinceañera: ¿cómo te imaginas este día?', type:'textarea', ph:'Emociones, sueños, lo que más esperas…',              tiposEvento:['xv'] },
        // General
        { key:'emocion_video',        label:'¿Qué emoción principal quieren que sienta quien vea el video?', type:'select', opciones:['Emoción / nostalgia','Alegría / celebración','Romance / amor profundo','Orgullo familiar','Energía / fiesta'] },
        { key:'estilo_edicion',       label:'Estilo de edición preferido',                     type:'select',   opciones:['Cinematográfico','Dinámico / moderno','Clásico / elegante','Documental / natural'] },
        { key:'mensaje_video',        label:'Frase o dedicatoria que aparecerá en los títulos', type:'textarea', ph:'Un texto corto lleno de significado…' },
      ]
    },

    musica_invitacion: {
      icon: '🎵', label: 'Inspiración para la Música de la Invitación',
      campos: [
        { key:'ambiente_musica',      label:'¿Qué ambiente quieres transmitir al abrir la invitación?', type:'select', opciones:['Romántico y emotivo','Alegre y festivo','Elegante y sofisticado','Fresco y juvenil','Íntimo y familiar'] },
        { key:'generos_gustan',       label:'Géneros musicales que les gustan',               type:'text',     ph:'Ej: regional mexicano, pop en español, baladas, electrónico…' },
        { key:'recuerdo_musical',     label:'¿Hay alguna canción o melodía que los identifique o recuerden juntos?', type:'textarea', ph:'No para usarla, sino para inspirarnos en ese sentimiento…' },
        { key:'instrumentos_prefiere',label:'Instrumentos o sonidos que les agradan',         type:'text',     ph:'Ej: piano, guitarra acústica, violín, beats electrónicos…' },
        { key:'musica_no',            label:'Sonidos o estilos que definitivamente NO quieren', type:'text',   ph:'Ej: música muy estridente, reggaetón, cumbia…' },
      ]
    },

    invitacion_web: {
      icon: '💌', label: 'Invitación Digital',
      campos: [
        { key:'frase',             label:'Frase personalizada',      type:'textarea', ph:'"Con alegría te invitamos a celebrar..."' },
        { key:'color_principal',   label:'Color principal',          type:'text',     ph:'Ej: morado, rosa, azul marino' },
        { key:'limite_confirmacion',label:'Fecha límite de confirmación', type:'date', ph:'' },
        { key:'max_invitados',     label:'Número estimado de invitados', type:'number', ph:'Ej: 150' },
      ]
    },

    contacto: {
      icon: '📞', label: 'Datos de Contacto',
      campos: [
        { key:'nombre_cliente', label:'Nombre completo del cliente', type:'text',  ph:'Nombre legal completo' },
        { key:'telefono',       label:'Teléfono WhatsApp',           type:'tel',   ph:'477 000 0000' },
        { key:'email',          label:'Correo electrónico',          type:'email', ph:'correo@ejemplo.com' },
        { key:'domicilio',      label:'Domicilio',                   type:'text',  ph:'Calle, número, colonia, León, Gto.' },
      ]
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
   * ESTADO
   * ═══════════════════════════════════════════════════════════════════ */
  let eventoId   = null;
  let eventoTipo = 'xv';
  let configData = {};
  let timers     = {};

  /* ═══════════════════════════════════════════════════════════════════
   * SUPABASE HELPERS
   * ═══════════════════════════════════════════════════════════════════ */
  async function sbFetch(path, opts) {
    const r = await fetch(SB_URL + path, { headers: H, ...opts });
    const txt = await r.text();
    return txt ? JSON.parse(txt) : [];
  }

  async function upsertSeccion(seccion, datos) {
    const existing = await sbFetch(`/rest/v1/eventos_config?evento_id=eq.${eventoId}&seccion=eq.${encodeURIComponent(seccion)}&select=id`);
    const merged = Object.assign({}, configData[seccion] || {}, datos);
    if (existing.length) {
      await sbFetch(`/rest/v1/eventos_config?evento_id=eq.${eventoId}&seccion=eq.${encodeURIComponent(seccion)}`, {
        method: 'PATCH', body: JSON.stringify({ datos: merged, updated_at: new Date().toISOString() })
      });
    } else {
      await sbFetch('/rest/v1/eventos_config', {
        method: 'POST',
        headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ evento_id: eventoId, seccion, datos: merged, updated_at: new Date().toISOString() })
      });
    }
    configData[seccion] = merged;
  }

  async function notificarAdmin(seccion, campos) {
    try {
      await sbFetch('/rest/v1/notificaciones', {
        method: 'POST',
        headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ evento_id: eventoId, tipo: 'datos_actualizados', seccion, campos_actualizados: campos })
      });
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
   * CARGA DE DATOS
   * ═══════════════════════════════════════════════════════════════════ */
  async function cargarDatos(slug) {
    const evData = await sbFetch(`/rest/v1/eventos?slug=eq.${encodeURIComponent(slug)}&select=id,nombre,tipo,fecha_evento&limit=1`);
    if (!evData.length) throw new Error('Evento no encontrado: ' + slug);
    eventoId   = evData[0].id;
    eventoTipo = evData[0].tipo || 'xv';
    const cfgData = await sbFetch(`/rest/v1/eventos_config?evento_id=eq.${eventoId}&select=seccion,datos`);
    configData = {};
    cfgData.forEach(r => { configData[r.seccion] = r.datos || {}; });
    return evData[0];
  }

  function getVal(seccion, key) {
    const v = (configData[seccion] || {})[key];
    if (v === null || v === undefined || v === '' || v === 'por_confirmar' || v === 'Por confirmar') return null;
    return v;
  }

  /* ═══════════════════════════════════════════════════════════════════
   * RENDER
   * ═══════════════════════════════════════════════════════════════════ */

  /** Cuenta todos los campos aplicables a este tipo de evento */
  function contarCampos() {
    let total = 0, llenos = 0;
    Object.entries(SECCIONES).forEach(([secKey, sec]) => {
      if (sec.tiposEvento && !sec.tiposEvento.includes(eventoTipo)) return;
      if (sec.tipo === 'array') {
        total++;
        const d = configData[secKey] || {};
        // cantidad=0 (sin chambelanes/damas) también cuenta como resuelto
        if (d[sec.keyCantidad] === 0 || (d[sec.keyLista]||[]).length > 0) llenos++;
        return;
      }
      if (sec.tipo === 'familiares' || sec.tipo === 'extras') {
        total++;
        const d = configData[secKey] || {};
        if (Array.isArray(d.lista)) llenos++;
        return;
      }
      (sec.campos||[]).forEach(c => {
        if (c.tiposEvento && !c.tiposEvento.includes(eventoTipo)) return;
        total++;
        if (getVal(secKey, c.key) !== null) llenos++;
      });
    });
    return { total, llenos };
  }

  /** Bloque "Ya tenemos" — datos llenos, editables con ✏️ */
  function renderSummary() {
    let grupos = [];
    Object.entries(SECCIONES).forEach(([secKey, sec]) => {
      if (sec.tiposEvento && !sec.tiposEvento.includes(eventoTipo)) return;
      let items = [];
      if (sec.tipo === 'array') {
        const d = configData[secKey] || {};
        const lista = d[sec.keyLista] || [];
        if (d[sec.keyCantidad] !== undefined && lista.length) {
          items.push({ key:'_array', label: sec.label, val: lista.filter(Boolean).join(', '), editable: false });
        }
      } else if (sec.tipo === 'familiares') {
        const lista = (configData[secKey]||{}).lista || [];
        if (lista.length) {
          items.push({ key:'_fam', label: sec.label, val: lista.map(f=>`${f.parentesco}: ${f.nombre}`).join(' · '), editable: false });
        } else if (Array.isArray((configData[secKey]||{}).lista)) {
          items.push({ key:'_fam', label: sec.label, val: 'N/A', editable: false });
        }
      } else if (sec.tipo === 'extras') {
        const lista = (configData[secKey]||{}).lista || [];
        if (lista.length) {
          items.push({ key:'_ext', label: sec.label, val: lista.map(f=>`${f.rol}: ${f.nombre}`).join(' · '), editable: false });
        } else if (Array.isArray((configData[secKey]||{}).lista)) {
          items.push({ key:'_ext', label: sec.label, val: 'N/A', editable: false });
        }
      } else {
        (sec.campos||[]).forEach(c => {
          if (c.tiposEvento && !c.tiposEvento.includes(eventoTipo)) return;
          const v = getVal(secKey, c.key);
          if (v !== null) items.push({ seccion: secKey, key: c.key, label: c.label, val: v, type: c.type, opciones: c.opciones, editable: true });
        });
      }
      if (items.length) grupos.push({ secKey, sec, items });
    });

    if (!grupos.length) return '';
    const totalLlenos = grupos.reduce((s,g) => s + g.items.length, 0);

    let html = `<details class="df-summary" open><summary class="df-sum-hdr">✅ Ya tenemos <strong>${totalLlenos}</strong> dato${totalLlenos!==1?'s':''} <span class="df-sum-toggle">▾</span></summary><div class="df-sum-body">`;
    grupos.forEach(({secKey, sec, items}) => {
      html += `<div class="df-sum-sec"><h3 class="df-sum-sec-title">${sec.icon} ${sec.label}</h3>`;
      items.forEach(item => {
        const isNA = item.val === 'N/A';
        const shortVal = isNA ? '— No aplica' : (String(item.val).length > 100 ? String(item.val).substring(0,97)+'…' : item.val);
        const editBtn = item.editable ? `<button class="df-sum-edit" onclick="window._DFedit('${item.seccion}','${item.key}')" title="Editar">✏️</button>` : '';
        html += `<div class="df-sum-field${isNA?' df-sum-na':''}" id="sumwrap-${secKey}-${item.key}" data-label="${item.label.replace(/"/g,'&quot;')}">
          <span class="df-sum-label">${item.label}</span>
          <span class="df-sum-val">${shortVal}</span>${editBtn}
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div></details>`;
    return html;
  }

  /** Bloque "Pendientes" — campos vacíos editables */
  function renderPending() {
    let html = '', hayVacios = false;
    Object.entries(SECCIONES).forEach(([secKey, sec]) => {
      if (sec.tiposEvento && !sec.tiposEvento.includes(eventoTipo)) return;
      if (sec.tipo === 'array') {
        const cantidad = (configData[secKey] || {})[sec.keyCantidad];
        const lista    = (configData[secKey] || {})[sec.keyLista] || [];
        const lleno    = cantidad !== undefined && cantidad !== null && lista.length >= cantidad;
        if (!lleno) { hayVacios = true; html += renderArraySection(secKey, sec, cantidad, lista); }
        return;
      }
      if (sec.tipo === 'familiares') { hayVacios = true; html += renderFamiliaresSection(secKey, sec); return; }
      if (sec.tipo === 'extras')    { html += renderExtrasSection(secKey, sec); return; }
      const camposFiltrados = (sec.campos || []).filter(c => {
        if (c.tiposEvento && !c.tiposEvento.includes(eventoTipo)) return false;
        return getVal(secKey, c.key) === null;
      });
      if (!camposFiltrados.length) return;
      hayVacios = true;
      html += `<div class="df-section" id="sec-${secKey}"><h2 class="df-sec-title">${sec.icon} ${sec.label}</h2><div class="df-fields">`;
      camposFiltrados.forEach(c => { html += renderField(secKey, c); });
      html += `</div></div>`;
    });
    return { html, hayVacios };
  }

  function renderForm(container, nombreEvento) {
    const { total, llenos } = contarCampos();
    const pct = total ? Math.round(llenos / total * 100) : 0;
    const pendientes = total - llenos;

    let html = `
      <div class="df-header">
        <h1 class="df-title">📋 Datos del Evento</h1>
        <p class="df-subtitle">${nombreEvento}</p>
        <div class="df-progress-bar"><div class="df-progress-fill" style="width:${pct}%"></div></div>
        <p class="df-progress-label">${llenos} de ${total} campos completados (${pct}%)</p>
      </div>`;

    html += renderSummary();

    const { html: pendHtml, hayVacios } = renderPending();
    if (hayVacios) {
      html += `<div class="df-pending-hdr">📝 Pendientes — ${pendientes} campo${pendientes!==1?'s':''} por llenar <span class="df-pending-hint">Se guardan solos a los 5 seg de escribir</span></div>`;
      html += pendHtml;
    } else {
      html += `<div class="df-complete"><div class="df-complete-icon">🎉</div><p>¡Todo está completo! No hay datos pendientes.</p></div>`;
    }

    html += `<div style="text-align:center;margin-top:2rem;padding:1rem">
      <button class="df-wa-btn" id="btnEnviarWA">📱 Enviar resumen por WhatsApp</button>
      <p style="font-size:.75rem;opacity:.4;margin-top:.5rem">Los datos ya se guardan automáticamente al escribirlos</p>
    </div>`;

    container.innerHTML = html;
    attachListeners(container);
    attachArrayListeners(container);
    document.getElementById('btnEnviarWA')?.addEventListener('click', enviarResumenWA);
  }

  /* ── Edición inline desde el bloque "Ya tenemos" ── */
  window._DFedit = function(seccion, key) {
    const wrap = document.getElementById(`sumwrap-${seccion}-${key}`);
    if (!wrap) return;
    const label = wrap.dataset.label;
    const val   = getVal(seccion, key) || '';
    const campo = (SECCIONES[seccion]?.campos||[]).find(c=>c.key===key);
    if (!campo) return;
    const fid = `dfedit-${seccion}-${key}`;
    let inp = '';
    if (campo.type === 'textarea') {
      inp = `<textarea id="${fid}" class="df-input" rows="3">${val}</textarea>`;
    } else if (campo.type === 'select') {
      inp = `<select id="${fid}" class="df-input">${campo.opciones.map(o=>`<option value="${o}" ${o===val?'selected':''}>${o}</option>`).join('')}</select>`;
    } else {
      inp = `<input type="${campo.type}" id="${fid}" class="df-input" value="${val.replace(/"/g,'&quot;')}">`;
    }
    wrap.innerHTML = `<span class="df-sum-label">${label}</span>${inp}<span class="df-status" id="st-${fid}"></span>
      <div style="display:flex;gap:.5rem;margin-top:.4rem">
        <button class="df-btn-save" onclick="window._DFsaveEdit('${seccion}','${key}','${fid}')">💾 Guardar</button>
        <button class="df-btn-rem" onclick="window._DFcancelEdit('${seccion}','${key}')">Cancelar</button>
      </div>`;
  };

  window._DFsaveEdit = async function(seccion, key, fid) {
    const el  = document.getElementById(fid);
    const stEl = document.getElementById(`st-${fid}`);
    if (!el) return;
    const val = el.value.trim();
    if (!val) return;
    if (stEl) { stEl.textContent = '⏳ Guardando…'; stEl.className = 'df-status df-status-saving'; }
    try {
      await upsertSeccion(seccion, { [key]: val });
      await notificarAdmin(seccion, [key]);
      const wrap  = document.getElementById(`sumwrap-${seccion}-${key}`);
      const label = wrap?.dataset?.label || key;
      const shortVal = val.length > 100 ? val.substring(0,97)+'…' : val;
      if (wrap) wrap.innerHTML = `<span class="df-sum-label">${label}</span><span class="df-sum-val">${shortVal}</span><button class="df-sum-edit" onclick="window._DFedit('${seccion}','${key}')">✏️</button>`;
    } catch(e) {
      if (stEl) { stEl.textContent = '❌ Error'; stEl.className = 'df-status df-status-error'; }
    }
  };

  window._DFcancelEdit = function(seccion, key) {
    const wrap  = document.getElementById(`sumwrap-${seccion}-${key}`);
    const label = wrap?.dataset?.label || key;
    const val   = getVal(seccion, key) || '';
    const isNA  = val === 'N/A';
    const shortVal = isNA ? '— No aplica' : (val.length > 100 ? val.substring(0,97)+'…' : val);
    if (wrap) {
      wrap.className = 'df-sum-field' + (isNA ? ' df-sum-na' : '');
      wrap.innerHTML = `<span class="df-sum-label">${label}</span><span class="df-sum-val">${shortVal}</span><button class="df-sum-edit" onclick="window._DFedit('${seccion}','${key}')" title="Editar">✏️</button>`;
    }
  };

  /** Marca un campo como "No aplica" — cuenta como resuelto y sube al bloque Ya tenemos */
  window._DFnoAplica = async function(seccion, key, fid) {
    clearTimeout(timers[fid]);
    setStatus(fid, 'saving');
    try {
      await upsertSeccion(seccion, { [key]: 'N/A' });
      await notificarAdmin(seccion, [key]);
      setStatus(fid, 'saved');
      // Mueve al bloque "Ya tenemos" con estilo N/A
      const wrap = document.getElementById(`wrap-${fid}`);
      const label = wrap?.querySelector('.df-label')?.textContent || key;
      // Inserta en el resumen si ya está renderizado
      const sumBody = document.querySelector('.df-sum-body');
      if (sumBody) {
        // Busca la sección o crea una entrada al final
        let sumSecEl = document.getElementById(`sumwrap-${seccion}-${key}`);
        if (!sumSecEl) {
          // Agrega al final del resumen
          const newItem = document.createElement('div');
          newItem.className = 'df-sum-field df-sum-na';
          newItem.id = `sumwrap-${seccion}-${key}`;
          newItem.dataset.label = label;
          newItem.innerHTML = `<span class="df-sum-label">${label}</span><span class="df-sum-val">— No aplica</span><button class="df-sum-edit" onclick="window._DFedit('${seccion}','${key}')" title="Editar">✏️</button>`;
          sumBody.appendChild(newItem);
        }
      }
      // Actualiza barra de progreso
      setTimeout(() => {
        const {total, llenos} = contarCampos();
        const pct = total ? Math.round(llenos/total*100) : 0;
        const fill = document.querySelector('.df-progress-fill');
        const lbl  = document.querySelector('.df-progress-label');
        if (fill) fill.style.width = pct+'%';
        if (lbl)  lbl.textContent = `${llenos} de ${total} campos completados (${pct}%)`;
        ocultarCampo(fid, seccion);
      }, 1500);
    } catch(e) { setStatus(fid, 'error'); }
  };

  function renderField(seccion, c) {
    const fid = `df-${seccion}-${c.key}`;
    let input = '';
    if (c.type === 'textarea') {
      input = `<textarea id="${fid}" class="df-input" placeholder="${c.ph||''}" data-seccion="${seccion}" data-key="${c.key}" rows="3"></textarea>`;
    } else if (c.type === 'select') {
      input = `<select id="${fid}" class="df-input" data-seccion="${seccion}" data-key="${c.key}"><option value="">— Selecciona —</option>${c.opciones.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
    } else {
      input = `<input type="${c.type}" id="${fid}" class="df-input" placeholder="${c.ph||''}" data-seccion="${seccion}" data-key="${c.key}">`;
    }
    const naId = `na-${seccion}-${c.key}`;
    return `<div class="df-field" id="wrap-${fid}"><label class="df-label" for="${fid}">${c.label}</label>${input}<span class="df-status" id="st-${fid}"></span><button class="df-na-btn" id="${naId}" onclick="window._DFnoAplica('${seccion}','${c.key}','${fid}')">↩ No tengo / No aplica</button></div>`;
  }

  function renderArraySection(secKey, sec, cantidad, lista) {
    const cantidadOpts = sec.opciones.map(n => `<option value="${n}" ${n==cantidad?'selected':''}>${n===0?'Sin '+sec.label.toLowerCase():n+' '+sec.label.toLowerCase()}</option>`).join('');
    let itemsHTML = '';
    const num = parseInt(cantidad) || 0;
    for (let i = 0; i < num; i++) {
      itemsHTML += `<div class="df-array-item"><span class="df-array-num">${i+1}</span><input type="text" class="df-input df-array-input" data-idx="${i}" placeholder="${sec.phItem} ${i+1}" value="${(lista[i]||'').replace(/"/g,'&quot;')}"></div>`;
    }
    return `
      <div class="df-section" id="sec-${secKey}">
        <h2 class="df-sec-title">${sec.icon} ${sec.label}</h2>
        <div class="df-field">
          <label class="df-label">¿Cuántos ${sec.label.toLowerCase()} tendrás?</label>
          <select class="df-input df-array-select" data-seccion="${secKey}" id="sel-${secKey}">
            ${cantidadOpts}
          </select>
        </div>
        <div class="df-array-list" id="list-${secKey}">${itemsHTML}</div>
        <span class="df-status" id="st-${secKey}"></span>
      </div>`;
  }

  function renderFamiliaresSection(secKey, sec) {
    const lista = (configData[secKey] || {}).lista || [];
    const opciones = sec.parentescos.map(p=>`<option value="${p}">${p}</option>`).join('');
    let itemsHTML = lista.map((f,i) => `
      <div class="df-familiar-item" data-idx="${i}">
        <select class="df-input df-fam-par" style="flex:0 0 150px"><option value="">${f.parentesco}</option>${opciones}</select>
        <input type="text" class="df-input df-fam-nom" value="${(f.nombre||'').replace(/"/g,'&quot;')}" placeholder="Nombre completo">
        <button class="df-btn-rem" onclick="this.closest('.df-familiar-item').remove()">✕</button>
      </div>`).join('');
    return `
      <div class="df-section" id="sec-${secKey}">
        <h2 class="df-sec-title">${sec.icon} ${sec.label}</h2>
        <p class="df-hint" style="margin-bottom:1rem">Abuelitas, tíos, primos, hermanos u otras personas especiales</p>
        <div id="list-${secKey}">${itemsHTML}</div>
        <button class="df-btn-add" onclick="window._DFaddFamiliar('${secKey}')">+ Agregar familiar</button>
        <span class="df-status" id="st-${secKey}"></span>
        <div style="margin-top:.8rem">
          <button class="df-btn-save" onclick="window._DFsaveFamiliares('${secKey}')">💾 Guardar familiares</button>
        </div>
      </div>`;
  }

  /** Extras: madrina/padrino con rol libre + nombre libre */
  function renderExtrasSection(secKey, sec) {
    const lista = (configData[secKey] || {}).lista || [];
    let itemsHTML = lista.map((f,i) => `
      <div class="df-familiar-item" data-idx="${i}">
        <input type="text" class="df-input df-fam-par" style="flex:0 0 200px" placeholder="${sec.ph_rol}" value="${(f.rol||'').replace(/"/g,'&quot;')}">
        <input type="text" class="df-input df-fam-nom" placeholder="${sec.ph_nombre}" value="${(f.nombre||'').replace(/"/g,'&quot;')}">
        <button class="df-btn-rem" onclick="this.closest('.df-familiar-item').remove()">✕</button>
      </div>`).join('');
    return `
      <div class="df-section" id="sec-${secKey}">
        <h2 class="df-sec-title">${sec.icon} ${sec.label}</h2>
        <p class="df-hint" style="margin-bottom:1rem">Agrega madrinas o padrinos con un rol personalizado que no esté en la lista de arriba</p>
        <div id="list-${secKey}">${itemsHTML}</div>
        <button class="df-btn-add" onclick="window._DFaddExtra('${secKey}','${(sec.ph_rol||'').replace(/'/g,"\\'")}','${(sec.ph_nombre||'').replace(/'/g,"\\'")}')">+ Agregar madrina / padrino</button>
        <span class="df-status" id="st-${secKey}"></span>
        <div style="margin-top:.8rem">
          <button class="df-btn-save" onclick="window._DFsaveExtras('${secKey}')">💾 Guardar</button>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════════
   * LISTENERS
   * ═══════════════════════════════════════════════════════════════════ */
  function attachListeners(container) {
    container.querySelectorAll('.df-input[data-seccion]').forEach(el => {
      const ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        const seccion = el.dataset.seccion, key = el.dataset.key;
        const fid = el.id;
        setStatus(fid, 'saving');
        clearTimeout(timers[fid]);
        timers[fid] = setTimeout(() => guardarCampo(fid, seccion, key, el.value.trim()), 5000);
      });
    });
  }

  function attachArrayListeners(container) {
    container.querySelectorAll('.df-array-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const secKey = sel.dataset.seccion;
        const num    = parseInt(sel.value);
        const sec    = SECCIONES[secKey];
        const lista  = (configData[secKey] || {})[sec.keyLista] || [];
        let html = '';
        for (let i = 0; i < num; i++) {
          html += `<div class="df-array-item"><span class="df-array-num">${i+1}</span><input type="text" class="df-input df-array-input" data-idx="${i}" placeholder="${sec.phItem} ${i+1}" value="${(lista[i]||'').replace(/"/g,'&quot;')}"></div>`;
        }
        document.getElementById(`list-${secKey}`).innerHTML = html;
        clearTimeout(timers[secKey]);
        setStatus(`st-${secKey}`, 'saving');
        timers[secKey] = setTimeout(() => guardarArray(secKey, num, lista), 5000);
        // Re-attach input listeners
        document.querySelectorAll(`#list-${secKey} .df-array-input`).forEach(inp => {
          inp.addEventListener('input', () => {
            clearTimeout(timers[secKey]);
            setStatus(`st-${secKey}`, 'saving');
            timers[secKey] = setTimeout(() => {
              const items = [...document.querySelectorAll(`#list-${secKey} .df-array-input`)].map(i=>i.value.trim());
              guardarArray(secKey, num, items);
            }, 5000);
          });
        });
      });
    });
  }

  async function guardarCampo(fid, seccion, key, val) {
    if (!val) { setStatus(fid, ''); return; }
    setStatus(fid, 'saving');
    try {
      await upsertSeccion(seccion, { [key]: val });
      await notificarAdmin(seccion, [key]);
      setStatus(fid, 'saved');
      actualizarProgreso();
      setTimeout(() => ocultarCampo(fid, seccion), 2000);
    } catch (e) { setStatus(fid, 'error'); }
  }

  function actualizarProgreso() {
    const {total, llenos} = contarCampos();
    const pct = total ? Math.round(llenos/total*100) : 0;
    const fill = document.querySelector('.df-progress-fill');
    const lbl  = document.querySelector('.df-progress-label');
    if (fill) fill.style.width = pct+'%';
    if (lbl)  lbl.textContent = `${llenos} de ${total} campos completados (${pct}%)`;
  }

  async function guardarArray(secKey, cantidad, nombres) {
    setStatus(`st-${secKey}`, 'saving');
    try {
      const items = [...document.querySelectorAll(`#list-${secKey} .df-array-input`)].map(i=>i.value.trim());
      await upsertSeccion(secKey, { cantidad, nombres: items });
      await notificarAdmin(secKey, ['cantidad','nombres']);
      setStatus(`st-${secKey}`, 'saved');
    } catch (e) { setStatus(`st-${secKey}`, 'error'); }
  }

  // Familiares
  window._DFaddFamiliar = function(secKey) {
    const sec = SECCIONES[secKey];
    const opciones = sec.parentescos.map(p=>`<option value="${p}">${p}</option>`).join('');
    const div = document.createElement('div');
    div.className = 'df-familiar-item';
    div.innerHTML = `<select class="df-input df-fam-par" style="flex:0 0 150px"><option value="">Parentesco</option>${opciones}</select><input type="text" class="df-input df-fam-nom" placeholder="Nombre completo"><button class="df-btn-rem" onclick="this.closest('.df-familiar-item').remove()">✕</button>`;
    document.getElementById(`list-${secKey}`).appendChild(div);
  };

  window._DFaddExtra = function(secKey, phRol, phNombre) {
    const div = document.createElement('div');
    div.className = 'df-familiar-item';
    div.innerHTML = `<input type="text" class="df-input df-fam-par" style="flex:0 0 200px" placeholder="${phRol}"><input type="text" class="df-input df-fam-nom" placeholder="${phNombre}"><button class="df-btn-rem" onclick="this.closest('.df-familiar-item').remove()">✕</button>`;
    document.getElementById(`list-${secKey}`).appendChild(div);
  };

  window._DFsaveExtras = async function(secKey) {
    const items = [...document.querySelectorAll(`#list-${secKey} .df-familiar-item`)].map(item => ({
      rol:    item.querySelector('.df-fam-par').value.trim(),
      nombre: item.querySelector('.df-fam-nom').value.trim()
    })).filter(f => f.nombre);
    setStatus(`st-${secKey}`, 'saving');
    try {
      await upsertSeccion(secKey, { lista: items });
      await notificarAdmin(secKey, ['lista']);
      actualizarProgreso();
      setStatus(`st-${secKey}`, 'saved');
    } catch(e) { setStatus(`st-${secKey}`, 'error'); }
  };

  window._DFsaveFamiliares = async function(secKey) {
    const items = [...document.querySelectorAll(`#list-${secKey} .df-familiar-item`)].map(item => ({
      parentesco: item.querySelector('.df-fam-par').value,
      nombre:     item.querySelector('.df-fam-nom').value.trim()
    })).filter(f => f.nombre);
    setStatus(`st-${secKey}`, 'saving');
    try {
      await upsertSeccion(secKey, { lista: items });
      await notificarAdmin(secKey, ['lista']);
      setStatus(`st-${secKey}`, 'saved');
    } catch (e) { setStatus(`st-${secKey}`, 'error'); }
  };

  function ocultarCampo(fid, seccion) {
    const wrap = document.getElementById(`wrap-${fid}`);
    if (wrap) { wrap.style.transition='opacity .5s'; wrap.style.opacity='0'; setTimeout(()=>{ wrap.remove(); checkSeccionVacia(seccion); },500); }
  }

  function checkSeccionVacia(seccion) {
    const sec = document.getElementById(`sec-${seccion}`);
    if (sec && !sec.querySelectorAll('.df-field').length) {
      sec.style.transition='opacity .5s'; sec.style.opacity='0'; setTimeout(()=>sec.remove(),500);
    }
  }

  function setStatus(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const map = { saving:'⏳ Guardando en 5s…', saved:'✅ Guardado', error:'❌ Error', '':'' };
    el.textContent = map[state]||'';
    el.className = 'df-status df-status-'+state;
  }

  /* ═══════════════════════════════════════════════════════════════════
   * RESUMEN POR WHATSAPP
   * ═══════════════════════════════════════════════════════════════════ */
  function enviarResumenWA() {
    let msg = '📋 *DATOS DEL EVENTO*\n━━━━━━━━━━━━━━━━━━━━\n\n';
    Object.entries(configData).forEach(([sec, datos]) => {
      if (!datos || !Object.keys(datos).length) return;
      const secDef = SECCIONES[sec];
      msg += `${secDef?.icon||'•'} *${(secDef?.label||sec).toUpperCase()}*\n`;
      if (Array.isArray(datos.nombres)) {
        datos.nombres.forEach((n,i) => { if(n) msg += `  ${i+1}. ${n}\n`; });
      } else if (Array.isArray(datos.lista)) {
        datos.lista.forEach(f => { msg += `  ${f.parentesco}: ${f.nombre}\n`; });
      } else {
        Object.entries(datos).forEach(([k,v]) => { if(v && k!=='cantidad') msg += `  ${k}: ${v}\n`; });
      }
      msg += '\n';
    });
    msg += '─────────────────────\nEnviado desde invitados.org';
    window.open('https://wa.me/524779203776?text='+encodeURIComponent(msg), '_blank');
  }

  /* ═══════════════════════════════════════════════════════════════════
   * CSS
   * ═══════════════════════════════════════════════════════════════════ */
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
      .df-header{text-align:center;padding:2rem 1rem 1rem}
      .df-title{font-size:clamp(1.4rem,5vw,2rem);margin:0 0 .4rem}
      .df-subtitle{font-size:1.1rem;opacity:.7;margin:0 0 .4rem}
      .df-hint{font-size:.82rem;opacity:.45;margin:0}
      .df-section{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:1.5rem;margin:1.5rem 0}
      .df-sec-title{font-size:1.05rem;margin:0 0 1.2rem;letter-spacing:.04em}
      .df-fields{display:grid;gap:1rem}
      .df-field{display:flex;flex-direction:column;gap:.35rem}
      .df-label{font-size:.82rem;opacity:.65;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
      .df-input{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:.7rem 1rem;color:inherit;font-size:.95rem;font-family:inherit;transition:border .2s;width:100%;box-sizing:border-box}
      .df-input:focus{outline:none;border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.15)}
      select.df-input option{background:#1a0a2e;color:#fff}
      textarea.df-input{resize:vertical;min-height:80px}
      .df-status{font-size:.75rem;min-height:1rem}
      .df-status-saving{color:#fbbf24}.df-status-saved{color:#34d399}.df-status-error{color:#f87171}
      .df-array-item{display:flex;gap:.6rem;align-items:center;margin:.4rem 0}
      .df-array-num{font-weight:700;opacity:.5;min-width:20px;text-align:right}
      .df-array-input{flex:1}
      .df-familiar-item{display:flex;gap:.5rem;align-items:center;margin:.4rem 0;flex-wrap:wrap}
      .df-fam-par{flex:0 0 145px}
      .df-fam-nom{flex:1;min-width:150px}
      .df-btn-rem{background:#7f1d1d;border:none;color:#fca5a5;border-radius:8px;padding:.4rem .7rem;cursor:pointer;font-size:.85rem}
      .df-btn-add{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:inherit;border-radius:10px;padding:.6rem 1.2rem;cursor:pointer;margin-top:.8rem;font-size:.9rem;width:100%}
      .df-btn-save{background:#4c1d95;border:1px solid #7c3aed;color:#c4b5fd;border-radius:10px;padding:.6rem 1.4rem;cursor:pointer;font-size:.9rem}
      .df-wa-btn{background:linear-gradient(135deg,#25d366,#128c7e);color:#fff;border:none;border-radius:30px;padding:1rem 2.5rem;font-size:1rem;font-weight:700;cursor:pointer;transition:transform .2s;box-shadow:0 4px 15px rgba(37,211,102,.3)}
      .df-wa-btn:hover{transform:translateY(-2px)}
      .df-progress-bar{background:rgba(255,255,255,.1);border-radius:20px;height:8px;margin:.8rem auto;max-width:400px;overflow:hidden}
      .df-progress-fill{height:100%;background:linear-gradient(90deg,#34d399,#6ee7b7);border-radius:20px;transition:width .6s}
      .df-progress-label{font-size:.82rem;opacity:.5;margin:0}
      .df-summary{background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.25);border-radius:16px;margin:1.5rem 0;overflow:hidden}
      .df-sum-hdr{padding:1rem 1.4rem;cursor:pointer;font-size:.95rem;display:flex;justify-content:space-between;align-items:center;list-style:none;user-select:none}
      .df-sum-hdr::-webkit-details-marker{display:none}
      .df-sum-toggle{opacity:.5;font-size:.8rem}
      details.df-summary[open] .df-sum-toggle{transform:rotate(180deg)}
      .df-sum-body{padding:.5rem 1.4rem 1.2rem;border-top:1px solid rgba(52,211,153,.15)}
      .df-sum-sec{margin-top:1rem}
      .df-sum-sec-title{font-size:.82rem;opacity:.5;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 .6rem}
      .df-sum-field{display:grid;grid-template-columns:1fr auto auto;align-items:start;gap:.4rem .8rem;padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,.05)}
      .df-sum-field:last-child{border-bottom:none}
      .df-sum-label{font-size:.78rem;opacity:.5;grid-column:1;align-self:center}
      .df-sum-val{font-size:.9rem;grid-column:1;word-break:break-word;white-space:pre-wrap;line-height:1.4}
      .df-sum-edit{background:none;border:none;cursor:pointer;font-size:.85rem;opacity:.4;padding:0;align-self:start;margin-top:2px;transition:opacity .2s}
      .df-sum-edit:hover{opacity:1}
      .df-na-btn{background:none;border:none;color:rgba(255,255,255,.3);font-size:.72rem;cursor:pointer;padding:.2rem 0;text-align:left;letter-spacing:.02em;transition:color .2s;margin-top:.1rem}
      .df-na-btn:hover{color:rgba(255,255,255,.6)}
      .df-sum-na .df-sum-val{opacity:.35;font-style:italic}
      .df-sum-na .df-sum-label{opacity:.3}
      .df-pending-hdr{margin:2rem 0 .8rem;font-size:.9rem;font-weight:700;opacity:.7;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
      .df-pending-hint{font-size:.75rem;font-weight:400;opacity:.5}
      .df-complete{text-align:center;padding:3rem 1rem}
      .df-complete-icon{font-size:3rem;margin-bottom:.8rem}
      @media(max-width:500px){.df-familiar-item{flex-direction:column;align-items:stretch}.df-fam-par{flex:none}.df-sum-field{grid-template-columns:1fr auto}}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════════
   * API PÚBLICA
   * ═══════════════════════════════════════════════════════════════════ */
  window.DatosForm = {
    async init(slug, containerId) {
      injectCSS();
      const container = document.getElementById(containerId);
      container.innerHTML = '<p style="text-align:center;opacity:.5;padding:3rem">Cargando...</p>';
      try {
        const ev = await cargarDatos(slug);
        renderForm(container, ev.nombre);
      } catch (e) {
        container.innerHTML = `<p style="color:#f87171;text-align:center;padding:2rem">Error: ${e.message}</p>`;
      }
    }
  };
})();
