
// achievements.js — Modal seguro y aislado (no interfiere con la app)
(function(){
  // Helpers locales (no contaminan global)
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const LS = { achievements:'pro_achievements', achCatalog:'pro_ach_catalog' };

  const catEmoji = {
    'Progreso':'📈','Modos':'🎮','Velocidad':'⚡','Racha':'🔥','Colección':'🗂️','Exploración':'🧭','General':'🏅'
  };
  const tierBg = { 'oro':'bg-amber-100','plata':'bg-slate-100','bronce':'bg-emerald-50' };

  function lsGet(k, def){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def; }catch{ return def; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

  async function loadCatalog(){
    try{
      // Usa sólo el catálogo (nada de extras)
      const res = await fetch('./achievements.json', { cache:'no-store' });
      const data = await res.json();
      const list = Array.isArray(data.achievements) ? data.achievements : [];
      list.forEach(a=>{
        if (!a.tier || !['oro','plata','bronce'].includes(a.tier)) a.tier = 'bronce';
        if (!a.category) a.category = 'General';
      });
      // cache soft
      lsSet(LS.achCatalog, list);
      return list;
    }catch(e){
      console.warn('achievements.json no disponible', e);
      return lsGet(LS.achCatalog, []);
    }
  }

  function listUnlocked(){ return lsGet(LS.achievements, {}) || {}; }
  function pct(part, total){ return total? Math.round((part/total)*100) : 0; }

  // Crea un <div id="achModal"> compatible con .showModal()/.close()
  function ensureModal(){
    let modal = $('#achModal');
    if (modal) return modal;

    // Esconde cualquier sección inline si la hubiese
    const inline = $('#achievementsSection');
    if (inline){
      inline.classList.add('hidden');
      inline.style.display = 'none';
      // Si la app intenta mostrarla, la volvemos a ocultar
      const mo = new MutationObserver(()=>{ inline.classList.add('hidden'); inline.style.display='none'; });
      mo.observe(inline, { attributes:true, attributeFilter:['class','style'] });
    }

    modal = document.createElement('div');
    modal.id = 'achModal';
    modal.className = 'fixed inset-0 z-[100] hidden';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `
      <div id="achBackdrop" class="absolute inset-0 bg-black/40"></div>
      <div class="absolute inset-0 overflow-y-auto pointer-events-none">
        <div class="mx-auto max-w-6xl p-4 md:p-6 pointer-events-auto">
          <div class="rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div class="flex items-center justify-between p-4 md:p-5 border-b">
              <h3 class="text-xl md:text-2xl font-bold flex items-center gap-2">🏆 Sala de logros</h3>
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
            <div>
              <div id="achName" class="font-bold"></div>
              <div id="achCat" class="text-xs text-slate-500"></div>
            </div>
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

    // Shim de compatibilidad (la app llama achModal.showModal/close)
    modal.showModal = function(){
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');
      // No tocamos overflow del body para evitar romper scroll/botones
    };
    modal.close = function(){
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      closeDrawer();
    };

    // Cierres seguros
    $('#achBackdrop').addEventListener('click', ()=> modal.close());
    $('#achClose').addEventListener('click',  ()=> modal.close());
    $('#achCloseDrawer').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        const dr = $('#achDrawer');
        if (dr && !dr.classList.contains('translate-x-full')) closeDrawer();
        else modal.close();
      }
    });

    return modal;
  }

  function openDrawer(meta, unlockedInfo){
    $('#achArt').textContent = (catEmoji[meta.category] || '🏅');
    $('#achName').textContent = meta.name;
    $('#achCat').textContent  = meta.category || 'General';
    $('#achDesc').textContent = meta.desc || meta.idea || '';
    const dt = unlockedInfo?.date ? new Date(unlockedInfo.date).toLocaleString('es-ES') : 'Aún bloqueado';
    $('#achDate').textContent = dt;
    $('#achDrawer')?.classList.remove('translate-x-full');
  }
  function closeDrawer(){ $('#achDrawer')?.classList.add('translate-x-full'); }

  // API pública que la app ya invoca
  window.renderAchievements = async function renderAchievements(){
    const modal = ensureModal();
    const grid = $('#achGrid');
    const catalog = await loadCatalog();
    const unlocked = listUnlocked();
    let unlockedCount = 0;

    grid.innerHTML = catalog.map(meta=>{
      const isUnlocked = !!unlocked[meta.id];
      if (isUnlocked) unlockedCount++;
      const cls = isUnlocked ? 'opacity-100' : 'opacity-60';
      const aura = isUnlocked ? 'ring-2 ring-emerald-400/50' : 'ring-1 ring-slate-200';
      const emoji = (catEmoji[meta.category] || '🏅');
      const tier = tierBg[meta.tier] || 'bg-slate-100';
      return `
        <article class="rounded-2xl ${aura} p-3 bg-white hover:shadow transition cursor-pointer ach-card" data-id="${meta.id}">
          <div class="w-16 h-16 mx-auto rounded-xl grid place-items-center text-2xl ${tier} ${cls}">${emoji}</div>
          <h4 class="mt-2 text-sm text-center font-medium">${meta.name}</h4>
          <div class="text-[11px] text-slate-500 text-center">${meta.category || 'General'} · ${meta.tier || 'bronce'}</div>
        </article>`;
    }).join('');

    const total = catalog.length;
    const p = pct(unlockedCount, total);
    $('#achBar').style.width = p + '%';
    $('#achPct').textContent = p + '%';

    $$('#achGrid .ach-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        const id = card.getAttribute('data-id');
        const meta = catalog.find(a=>a.id===id);
        const info = unlocked[id];
        openDrawer(meta, info);
      });
    });

    // Abrimos el modal (la app también puede llamar .showModal())
    modal.showModal();
  };

  // No auto-enganchar botones aquí para evitar efectos colaterales.
  // La app ya tiene su listener que llama window.renderAchievements() y achModal.showModal().
})();
