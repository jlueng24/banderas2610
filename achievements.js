
// achievements.js — Vitrina de logros desde achievements.json
(function(){
  const LS = {
    achievements: 'pro_achievements',
    achCatalog:   'pro_ach_catalog'
  };
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const catEmoji = {
    'Progreso':'📈','Modos':'🎮','Velocidad':'⚡','Racha':'🔥','Colección':'🗂️','Exploración':'🧭','General':'🏅'
  };
  const tierBg = {
    'oro':'bg-amber-100','plata':'bg-slate-100','bronce':'bg-emerald-50'
  };

  function lsGet(k, def){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def; }catch{ return def; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

  async function loadCatalog(){
    const cached = lsGet(LS.achCatalog, null);
    if (cached && Array.isArray(cached)) return cached;
    try{
      const res = await fetch('./achievements.json', { cache: 'no-store' });
      const data = await res.json();
      const list = Array.isArray(data.achievements) ? data.achievements : [];
      // Heurística de tier si viene vacío
      list.forEach(a=>{
        if (!a.tier || !['oro','plata','bronce'].includes(a.tier)) {
          a.tier = (a.category==='Modos' || a.category==='Velocidad') ? 'plata' : 'bronce';
        }
      });
      lsSet(LS.achCatalog, list);
      return list;
    } catch(e){
      console.warn('No se pudo cargar achievements.json', e);
      return [];
    }
  }

  function listUnlocked(){
    const map = lsGet(LS.achievements, {});
    // Formato: { [id]: {date, id, name, desc, ...} } o legacy
    return map;
  }

  function pct(part, total){ return total? Math.round((part/total)*100) : 0; }

  function openDrawer(meta, unlockedInfo){
    document.body.classList.add('drawer-open');
    $('#achvArt').textContent = (catEmoji[meta.category] || '🏅');
    $('#achvName').textContent = meta.name;
    $('#achvCat').textContent = meta.category || 'General';
    $('#achvDesc').textContent = meta.desc || meta.idea || '';
    const dt = unlockedInfo?.date ? new Date(unlockedInfo.date).toLocaleString('es-ES') : 'Aún bloqueado';
    $('#achvDate').textContent = dt;
  }
  function closeDrawer(){ document.body.classList.remove('drawer-open'); }

  window.renderAchievements = async function renderAchievements(){
    const grid = $('#achievementsGrid');
    if (!grid) return;
    const catalog = await loadCatalog();
    const unlocked = listUnlocked();
    const total = catalog.length;
    let unlockedCount = 0;

    // Build cards
    grid.innerHTML = catalog.map(meta=>{
      const isUnlocked = !!unlocked[meta.id];
      if (isUnlocked) unlockedCount++;
      const cls = isUnlocked ? 'opacity-100' : 'opacity-50';
      const aura = isUnlocked ? 'achv-aura' : '';
      const emoji = (catEmoji[meta.category] || '🏅');
      const tier = tierBg[meta.tier] || 'bg-slate-100';
      return `
        <article class="achv-card ${cls}" data-id="${meta.id}" aria-label="${meta.name}">
          <div class="achv-art ${tier} ${aura}">${emoji}</div>
          <h4 class="achv-title">${meta.name}</h4>
          <div class="achv-meta">
            <span class="achv-chip">${meta.category||'General'}</span>
            <span class="achv-chip">${meta.tier||'bronce'}</span>
          </div>
        </article>`;
    }).join('');

    // Progress bar
    const p = pct(unlockedCount, total);
    const bar = $('#achievementsBar'), pctEl = $('#achievementsPct');
    if (bar) bar.style.width = p + '%';
    if (pctEl) pctEl.textContent = p + '%';

    // Click -> drawer
    $$('#achievementsGrid .achv-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        const id = card.getAttribute('data-id');
        const meta = catalog.find(a=>a.id===id);
        const info = unlocked[id];
        openDrawer(meta, info);
      });
    });

    // Close drawer
    $('#closeAchievementDrawer')?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });
  };

  // Auto init if the section is visible on load
  document.addEventListener('DOMContentLoaded', ()=>{
    const section = document.getElementById('achievementsSection');
    if (section && !section.classList.contains('hidden')) {
      renderAchievements();
    }
  });
})();
