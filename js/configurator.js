// configurator.js — wersja kompatybilna ze starymi krokami (CFG, bus) i nowymi ({cfg,bus})
export const CFG = {
  step: 0,
  stepsCount: 7,
  data: {
    houseType: null, foundation: null, style: null, facade: null, roofType: null,
    area: 100, rooms: 3, baths: 2, windows: 10, doors: 2,
    extras: { installations: [], terrace: false, garage: 'brak' },
    price: null,
    contact: { firstName:'', lastName:'', email:'', phone:'', city:'' }
  }
};

export const bus = {
  _l:{}, on(t,fn){(this._l[t] ||= []).push(fn)}, off(t,fn){this._l[t]=(this._l[t]||[]).filter(f=>f!==fn)},
  emit(t,p){(this._l[t]||[]).forEach(fn=>fn(p))}
};

const STEP_MODULES = [
  () => import('./steps/step0-house-type.js'),
  () => import('./steps/step1-foundation.js'),
  () => import('./steps/step2-style-facade.js'),
  () => import('./steps/step3-roof.js'),
  () => import('./steps/step4-layout.js'),
  () => import('./steps/step5-extras.js'),
  () => import('./steps/step6-summary-contact.js')
];

function getRefs(){
  const backdrop = document.querySelector('.cfg__backdrop');
  const panel    = document.querySelector('.cfg__panel');
  const stepper  = panel?.querySelector('.cfg-stepper') || null;
  const progress = panel?.querySelector('.cfg-progress__value') || null;
  const nav      = panel?.querySelector('.cfg-nav') || null;
  return { backdrop, panel, stepper, progress, nav };
}

let _pageScrollY = 0;
let _currentUnmount = null;

export function openConfigurator(){
  const {backdrop,panel} = getRefs();
  if(!backdrop || !panel) return;

  _pageScrollY = window.scrollY||0;
  document.body.classList.add('no-scroll');
  document.body.style.top = `-${_pageScrollY}px`;

  backdrop.classList.add('is-open');
  backdrop.classList.remove('is-hidden');
  backdrop.setAttribute('aria-hidden','false');

  panel.scrollTo({top:0, behavior:'instant'});
  CFG.step = Math.max(0, Math.min(CFG.step, CFG.stepsCount-1));
  renderStep(CFG.step);
  updateStepper(); updateProgressBar();
}

export function closeConfigurator(){
  const {backdrop} = getRefs(); if(!backdrop) return;
  backdrop.classList.remove('is-open'); backdrop.classList.add('is-hidden');
  backdrop.setAttribute('aria-hidden','true');

  document.body.classList.remove('no-scroll');
  const top = document.body.style.top; document.body.style.top = '';
  if(top){ const y=parseInt(top,10)||0; window.scrollTo(0,-y); } else { window.scrollTo(0,_pageScrollY||0); }

  if(typeof _currentUnmount==='function'){ try{_currentUnmount()}catch{} _currentUnmount=null; }
}

async function renderStep(n){
  const {panel,nav} = getRefs(); if(!panel) return;

  let slot = panel.querySelector('[data-cfg-step-slot]');
  if(!slot){ slot=document.createElement('div'); slot.setAttribute('data-cfg-step-slot',''); panel.insertBefore(slot, nav||null); }

  if(typeof _currentUnmount==='function'){ try{_currentUnmount()}catch{} _currentUnmount=null; }
  slot.innerHTML='';

  const loader = STEP_MODULES[n]; if(!loader){ slot.innerHTML='<p>Brak modułu kroku.</p>'; return; }

  try{
    const mod = await loader();
    if(typeof mod.mount!=='function'){ slot.innerHTML='<p>Moduł nie eksportuje mount().</p>'; return; }

    // === KOMPATYBILNOŚĆ SYGNATUR ===
    // Jeżeli stary krok ma mount(root, CFG, bus) – wywołaj w ten sposób.
    // Jeśli nowy – mount(root, {cfg,bus}).
    _currentUnmount =
      (mod.mount.length >= 3) ? mod.mount(slot, CFG, bus)
                              : mod.mount(slot, { cfg: CFG, bus });

  }catch(err){
    console.error('Błąd ładowania kroku', err);
    slot.innerHTML='<p>Nie udało się załadować kroku. Sprawdź konsolę.</p>';
  }
}

function updateStepper(){
  const {panel} = getRefs(); if(!panel) return;
  const items = panel.querySelectorAll('.cfg-step-item');
  items.forEach((el,i)=>{ el.classList.toggle('is-active', i===CFG.step); el.classList.toggle('is-done', i<CFG.step); });
}

function updateProgressBar(){
  const {progress} = getRefs(); if(!progress) return;
  progress.style.width = `${((CFG.step+1)/CFG.stepsCount)*100}%`;
}

function goToStep(n){
  const {panel}=getRefs(); const next=Math.max(0,Math.min(n,CFG.stepsCount-1));
  if(next===CFG.step) return;
  CFG.step=next; renderStep(next);
  panel?.scrollTo({top:0, behavior:'smooth'}); updateStepper(); updateProgressBar();
  bus.emit('cfg:step',{step:next});
}

function bindUI(){
  const {backdrop,panel}=getRefs(); if(!panel||!backdrop) return;

  panel.addEventListener('click', (e)=>{
    const prev=e.target.closest('[data-cfg-prev]');
    const next=e.target.closest('[data-cfg-next]');
    const close=e.target.closest('.cfg__close]');
    if(close){ e.preventDefault(); closeConfigurator(); return; }
    if(prev){ e.preventDefault(); goToStep(CFG.step-1); return; }
    if(next){ e.preventDefault(); goToStep(CFG.step+1); return; }
  });

  backdrop.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ e.stopPropagation(); closeConfigurator(); }});
}

export function initConfigurator(){
  const boot = ()=>{ bindUI(); wireOpeners(); updateStepper(); updateProgressBar(); };
  (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded', boot) : boot();
}

function wireOpeners(){
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-cfg-open]');
    if(btn){ e.preventDefault(); openConfigurator(); }
  });
}

// Haki do testów z konsoli (możesz zostawić)
window.cfgOpen = openConfigurator;
window.cfgInit = initConfigurator;
