/* AUREN visual design settings — safe public read, admin-only writes via RLS. */
(() => {
  'use strict';
  const db = window.supabase?.createClient
    ? window.supabase.createClient('https://upcgbbwwghaazsqfbwri.supabase.co', 'sb_publishable_SrxxuVdqu0TqBEhkfxIO1Q_Xdi834aQ')
    : null;
  const DEFAULTS = {
    colors: { ink: '#30241D', paper: '#F2E8DC', accent: '#9B765A', white: '#FFFAF3' },
    font: 'Georgia, "Times New Roman", serif',
    heroTitle: 'Quattro mondi. Un’unica visione.',
    heroSubtitle: 'AUREN riunisce immobiliare, arredamento, servizi creativi e ispirazione in un unico universo. Esplora i quattro mondi e scegli ciò di cui hai bisogno.',
    sectionOrder: ['hero','divisions','explore','living-info','services','studio-info','how','sell','journal'],
    hiddenSections: [],
    customBlocks: []
  };
  const SECTION_LABELS = {
    hero:'Hero / presentazione', divisions:'I quattro mondi', explore:'Immobili in evidenza',
    'living-info':'Auren Living', services:'Servizi', 'studio-info':'Auren Studio',
    how:'Valori AUREN', sell:'Vendi con AUREN', journal:'Journal'
  };
  function safeColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
  }
  function apply(config) {
    const c = { ...DEFAULTS, ...(config || {}) };
    const root = document.documentElement;
    root.style.setProperty('--ink', safeColor(c.colors?.ink, DEFAULTS.colors.ink));
    root.style.setProperty('--paper', safeColor(c.colors?.paper, DEFAULTS.colors.paper));
    root.style.setProperty('--accent', safeColor(c.colors?.accent, DEFAULTS.colors.accent));
    root.style.setProperty('--white', safeColor(c.colors?.white, DEFAULTS.colors.white));
    if (['Georgia, "Times New Roman", serif','Arial, Helvetica, sans-serif','"Times New Roman", serif','system-ui, sans-serif'].includes(c.font)) {
      root.style.setProperty('--serif', c.font);
      document.body.style.fontFamily = c.font;
    }
    const hero = document.querySelector('.hero h1');
    if (hero && c.heroTitle) hero.textContent = String(c.heroTitle).slice(0,140);
    const heroP = document.querySelector('.hero > div:first-child > p');
    if (heroP && c.heroSubtitle) heroP.textContent = String(c.heroSubtitle).slice(0,500);
    const main = document.querySelector('main#top');
    const nodes = {};
    Object.keys(SECTION_LABELS).forEach(id => {
      nodes[id] = id === 'hero' ? document.querySelector('.hero') : document.getElementById(id);
    });
    (c.hiddenSections || []).forEach(id => { if (nodes[id]) nodes[id].hidden = true; });
    const order = Array.isArray(c.sectionOrder) ? c.sectionOrder : DEFAULTS.sectionOrder;
    if (main) order.forEach(id => { if (nodes[id] && nodes[id].parentElement === main) main.appendChild(nodes[id]); });
    document.querySelectorAll('[data-auren-custom-block]').forEach(el => el.remove());
    (Array.isArray(c.customBlocks) ? c.customBlocks : []).slice(0,12).forEach(block => {
      const section = document.createElement('section');
      section.className = 'wrap auren-custom-block';
      section.dataset.aurenCustomBlock = 'true';
      section.style.cssText = 'padding:44px 28px;margin:24px auto;background:var(--white);border:1px solid var(--line);';
      const h = document.createElement('h2');
      h.textContent = String(block.title || 'Nuova sezione').slice(0,100);
      h.style.cssText = 'font:400 clamp(28px,4vw,42px) var(--serif);margin:0 0 12px;';
      const p = document.createElement('p');
      p.textContent = String(block.text || '').slice(0,1000);
      p.style.cssText = 'max-width:760px;color:var(--muted);';
      section.append(h,p);
      if (main) main.appendChild(section);
    });
  }
  async function load() {
    if (!db) return;
    const { data, error } = await db.from('site_settings').select('setting_value').eq('setting_key','homepage').maybeSingle();
    if (error) { console.warn('AUREN design settings unavailable:', error.message); return; }
    if (data?.setting_value) apply(data.setting_value);
  }
  window.AURENDesign = { defaults: DEFAULTS, labels: SECTION_LABELS, apply, load };
  load();
})();