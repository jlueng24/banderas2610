
// achievements.js — MODO ESTRICTO (solo catálogo Excel) + antibloqueo
(function(){
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const LS = { achievements:'pro_achievements', achCatalog:'pro_ach_catalog' };

  // --- utils ---
  function lsGet(k, d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
  function pct(n,t){ return t? Math.round((n/t)*100) : 0; }

  // --- catálogo del Excel ---
  async function loadCatalog(){
    try{
      const res  = await fetch('./achievements.json', { cache:'no-store' });
      const data = await res.json();
      const list = Array.isArray(data.achievements) ? data.achievements : [];
      // normalizar
      return list.map(a=>({
        id: String(a.id||a.ID||'').trim(),
        name: a.name || a.Nombre || '',
        desc: a.desc || a.Descripción || '',
        category: a.category || a.Categoría || 'General',
        tier: (a.tier||'bronce'),
        icon: a.icon || a['Ilustración (ruta o enlace)'] || a['Ilustración'] || ''
      })).filter(a=>a.id);
    }catch(e){ console.warn('No se pudo leer achievements.json', e); return []; }
  }

  // --- progreso guardado (solo ids válidos del Excel) ---
  function getUnlockedStrict(validIds){
    const raw = lsGet(LS.achievements, {});
    const out = {};
    for (const id of Object.keys(raw||{})){
      if (validIds.has(id)) out[id] = raw[id]; // solo los que existen en el Excel
    }
    return out;
  }

  // --- modal seguro ---
  function ensureModal(){
    let modal = $('#achModal');
    if (modal) return modal;

    // Forzar oculta la sección inline
    const inline = $('#achievementsSection');
    if (inline){ inline.classList.add('hidden'); inline.style.display='none';
      const mo = new MutationObserver(()=>{ inline.classList.add('hidden'); inline.style.display='none'; });
      mo.observe(inline, { attributes:true, attributeFilter:['class','style'] });
    }

    modal = document.createElement('div');
    modal.id = 'achModal';
    modal.className = 'fixed inset-0 z-[100] hidden';
    modal.innerHTML = `
      <div id="achBackdrop" class="absolute inset-0 bg-black/40"></div>
      <div class="absolute inset-0 overflow-y-auto pointer-events-none">
        <div class="mx-auto max-w-6xl p-4 md:p-6 pointer-events-auto">
          <div class="rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div class="flex items-center justify-between p-4 md:p-5 border-b">
              <h3 class="text-xl md:text-2xl font-bold">🏆 Sala de logros</h3>
              <button id="achClose" class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">Cerrar ✕</button>
            </div>
            <div class="p-4 md:p-6 space-y-5">
              <section>
                <div class="flex items-center justify-between">
                  <div class="text-sm text-slate-600">Tu historia en medallas</div>
                  <div id="achPct" class="font-semibold">0%</div>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div id="achBar" class="h-2 bg-emerald-500 w-0"></div>
                </div>
              </section>
              <section>
                <div id="achGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <div id="achDrawer" class="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl translate-x-full transition-transform duration-200 z-[110]">
        <div class="p-4 md:p-5 border-b flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div id="achArt" class="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-xl">🏅</div>
            <div><div id="achName" class="font-bold"></div><div id="achCat" class="text-xs text-slate-500"></div></div>
          </div>
          <button id="achCloseDrawer" class="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">Cerrar</button>
        </div>
        <div class="p-4 space-y-3">
          <p id="achDesc" class="text-slate-700"></p>
          <p class="text-xs text-slate-500">Fecha: <span id="achDate">Aún bloqueado</span></p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.showModal = ()=>{
      // limpiar posibles bloqueos globales
      document.body.classList.remove('overflow-hidden','modal-open');
      document.documentElement.classList.remove('overflow-hidden','modal-open');
      document.body.style.overflow=''; document.documentElement.style.overflow='';
      modal.classList.remove('hidden');
    };
    modal.close = ()=>{
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden','modal-open');
      document.documentElement.classList.remove('overflow-hidden','modal-open');
      document.body.style.overflow=''; document.documentElement.style.overflow='';
      $('#achDrawer')?.classList.add('translate-x-full');
    };

    $('#achBackdrop').addEventListener('click', ()=> modal.close());
    $('#achClose').addEventListener('click',  ()=> modal.close());
    $('#achCloseDrawer').addEventListener('click', ()=> $('#achDrawer')?.classList.add('translate-x-full'));
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !modal.classList.contains('hidden')) modal.close(); });

    return modal;
  }

  // API pública que llama la app
  window.renderAchievements = async function(){
    const modal   = ensureModal();
    const catalog = await loadCatalog();
    const validIds = new Set(catalog.map(a=>a.id));
    const unlocked = getUnlockedStrict(validIds);

    // Grid
    const grid = $('#achGrid');
    let unlockedCount = 0;
    grid.innerHTML = catalog.map(meta=>{
      const u = unlocked[meta.id];
      if (u) unlockedCount++;
      const isU = !!u;
      const cls  = isU ? 'opacity-100' : 'opacity-60';
      const aura = isU ? 'ring-2 ring-emerald-400/50' : 'ring-1 ring-slate-200';
      const tier = String(meta.tier||'bronce').toLowerCase();
      const tierBg = tier==='oro'?'bg-amber-100':(tier==='plata'?'bg-slate-100':'bg-emerald-50');
      // icono: si el Excel trae emoji/url en "Ilustración", úsalo; si es URL, mostramos 🏅 (se puede ampliar a <img> si nos pasas rutas)
      const emoji = (meta.icon && !/^https?:/i.test(meta.icon)) ? meta.icon : '🏅';
      return `
        <article class="rounded-2xl ${aura} p-3 bg-white hover:shadow transition cursor-pointer ach-card" data-id="${meta.id}">
          <div class="w-16 h-16 mx-auto rounded-xl grid place-items-center text-2xl ${tierBg} ${cls}">${emoji}</div>
          <h4 class="mt-2 text-sm text-center font-medium">${meta.name}</h4>
          <div class="text-[11px] text-slate-500 text-center">${meta.category || 'General'} · ${tier}</div>
        </article>`;
    }).join('');

    // Progreso
    const p = pct(unlockedCount, catalog.length);
    $('#achBar').style.width = p + '%';
    $('#achPct').textContent = p + '%';

    // Click de tarjeta
    $$('#achGrid .ach-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        const id = card.getAttribute('data-id');
        const meta = catalog.find(a=>a.id===id);
        const info = unlocked[id];
        // icono en detalle (mismo criterio)
        const emoji = (meta.icon && !/^https?:/i.test(meta.icon)) ? meta.icon : '🏅';
        $('#achArt').textContent = emoji;
        $('#achName').textContent = meta.name;
        $('#achCat').textContent  = meta.category || 'General';
        $('#achDesc').textContent = meta.desc || '';
        const dt = info?.date ? new Date(info.date).toLocaleString('es-ES') : 'Aún bloqueado';
        $('#achDate').textContent = dt;
        $('#achDrawer')?.classList.remove('translate-x-full');
      });
    });

    modal.showModal();
  };
})();
