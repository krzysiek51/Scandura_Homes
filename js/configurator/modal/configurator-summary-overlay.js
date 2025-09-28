/* js/configurator/modal/configurator-summary-overlay.js */
(() => {
  'use strict';
  if (window.__SCANDURA_CFG_SUMMARY_OVERLAY__) return;
  window.__SCANDURA_CFG_SUMMARY_OVERLAY__ = true;

  // --- mini-style tylko dla overlaya (800x800 ≥744px; mobil: pełny viewport)
  const CSS = `
  .cfg-ov{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}
  .cfg-ov__dlg{background:#fff;width:100vw;height:100vh;max-width:100vw;max-height:100vh;display:flex;flex-direction:column;overflow:hidden}
  @media (min-width:744px){ .cfg-ov__dlg{width:800px;height:800px;border-radius:16px} }
  .cfg-ov__head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eee}
  .cfg-ov__title{font-weight:700;font-size:18px;margin:0}
  .cfg-ov__close{border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;padding:8px;border-radius:8px}
  .cfg-ov__close:focus{outline:2px solid #DC9B59;outline-offset:2px}
  .cfg-ov__body{padding:16px 20px;overflow:auto}
  .cfg-ov__lead{font-weight:600;margin:0 0 12px}
  .cfg-ov__meta{display:grid;grid-template-columns:180px 1fr;gap:10px 16px;margin:16px 0;border-top:1px solid #f0f0f0;padding-top:12px}
  .cfg-ov__lab{color:#666}
  .cfg-ov__val{color:#111}
  .cfg-ov__map{margin:8px 0;border-radius:8px;overflow:hidden;border:1px solid #eee}
  .cfg-ov__map img{display:block;width:100%;height:180px;object-fit:cover}
  .cfg-ov__price{margin-top:16px;padding:12px;border-radius:12px;background:#F7F7F7;font-weight:600}
  `;

  const injectCSS = () => {
    if (document.getElementById('cfg-ov-style')) return;
    const s = document.createElement('style');
    s.id = 'cfg-ov-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  };

  // ---- Normalizacja stanu (działa dla Twojej i starszej struktury)
  function normChoice(x){ if(!x) return {label:'',key:''}; if(typeof x==='string') return {label:x,key:x};
    if(typeof x==='object'){ const l=x.label??x.value??'', k=x.key??x.value??''; return {label:String(l),key:String(k)};}
    return {label:'',key:''}; }
  function normArea(a){ if(a==null) return {exact:null,choice:''};
    if(typeof a==='number') return {exact:a,choice:''}; if(typeof a==='string') return {exact:null,choice:a};
    if(typeof a==='object'){ if(a.type==='exact') return {exact:Number(a.value)||null,choice:''};
      if(a.type==='preset') return {exact:null,choice:String(a.value||'')}; } return {exact:null,choice:''}; }
  function normStart(s){ if(!s) return {label:'',date:''}; if(typeof s==='object') return {label:s.label||'',date:s.date||''};
    if(typeof s==='string'){ const map={asap:'ASAP','1m':'w miesiącu','3m':'w 3 mies.','6m':'w 6 mies.',agree:'do uzgodnienia'};
      return {label:map[s]||s,date:''}; } return {label:'',date:''}; }
  function normShell(st){ const src = st.shell ?? st.scope; return normChoice(src); }
  function normAll(st){ const building=normChoice(st.building), roof=normChoice(st.roof), shell=normShell(st);
    const area=normArea(st.area ?? (st.areaExact!=null?{type:'exact',value:st.areaExact}:{type:'preset',value:st.areaChoice}));
    const start=normStart(st.start), city=st.location?.city||'', country=st.location?.country||'';
    return {building,roof,shell,area,start,city,country}; }
  const fmtPL = (n)=> (typeof n==='number'&&isFinite(n))?n.toLocaleString('pl-PL'):''; 
  function priceLabel(st){ if(typeof st.price==='number') return `${fmtPL(st.price)} zł brutto`;
    const a=st.price_est_min,b=st.price_est_max; return (typeof a==='number'&&typeof b==='number')?`${fmtPL(a)} – ${fmtPL(b)} zł brutto`:'—'; }

  // ---- Utils
  const esc = (s='')=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop = (e)=>e.stopPropagation();

  // ---- Główny otwieracz
  function openSummaryOverlay(state, opts={}){
    injectCSS();
    const N = normAll(state);
    // ID (jeśli nie masz) – lekki pseudo-ID z timestampu:
    if (!state.requestId) state.requestId = String(Date.now()).slice(-8);

    const m2 = N.area.exact!=null ? `${N.area.exact} m²` : (N.area.choice || '—');
    const due = new Date(Date.now()+7*24*3600*1000); // "Ważne do" +7 dni
    const dueTxt = due.toLocaleDateString('pl-PL', { day:'numeric', month:'short', year:'numeric' });

    const mapHTML = state.location?.mapUrl
      ? `<div class="cfg-ov__map"><img src="${esc(state.location.mapUrl)}" alt="Mapa: ${esc(N.city)}, ${esc(N.country)}" loading="lazy"></div>`
      : '';

    const html = `
      <div class="cfg-ov" data-cfg="ov" >
        <div class="cfg-ov__dlg" role="dialog" aria-modal="true" aria-labelledby="cfg-ov-title">
          <div class="cfg-ov__head">
            <h3 id="cfg-ov-title" class="cfg-ov__title">Szczegóły zapytania (ID ${esc(state.requestId)})</h3>
            <button class="cfg-ov__close" aria-label="Zamknij" data-cfg="ov-close">×</button>
          </div>
          <div class="cfg-ov__body" tabindex="0">
            <p class="cfg-ov__lead">
              Zlecę budowę domu szkieletowego${N.shell.label?`, ${esc(N.shell.label.toUpperCase())}`:''}${m2?`, ${esc(m2)}`:''}${N.city?`, ${esc(N.city)}`:''}
            </p>

            <div class="cfg-ov__meta">
              <div class="cfg-ov__lab">Ważne do:</div><div class="cfg-ov__val">${esc(dueTxt)}</div>
              <div class="cfg-ov__lab">Kategoria:</div><div class="cfg-ov__val">Budowa w technologii szkieletowej</div>
              <div class="cfg-ov__lab">Miejscowość:</div><div class="cfg-ov__val">${esc(N.city)}${N.city&&N.country?', ':''}${esc(N.country)}${mapHTML}</div>

              <div class="cfg-ov__lab">Rodzaj budynku:</div><div class="cfg-ov__val">${esc(N.building.label || '—')}</div>
              <div class="cfg-ov__lab">Powierzchnia użytkowa:</div><div class="cfg-ov__val">${esc(m2)}</div>
              <div class="cfg-ov__lab">Dach:</div><div class="cfg-ov__val">${esc(N.roof.label || '—')}</div>
              <div class="cfg-ov__lab">Zakres zlecenia:</div><div class="cfg-ov__val">${esc(N.shell.label || '—')}</div>
              <div class="cfg-ov__lab">Zlecenie składa:</div><div class="cfg-ov__val">${esc(state.contact?.name || 'Inwestor prywatny')}</div>
              <div class="cfg-ov__lab">Termin rozpoczęcia budowy:</div><div class="cfg-ov__val">${esc(N.start.label || N.start.date || '—')}</div>
            </div>

            <div class="cfg-ov__price">Orientacyjna wycena: ${esc(priceLabel(state))}</div>
          </div>
        </div>
      </div>
    `;

    // usuń poprzedni overlay (jeśli był)
    closeSummaryOverlay();
    document.body.insertAdjacentHTML('beforeend', html);

    const ov = document.querySelector('.cfg-ov');
    const dlg = ov.querySelector('.cfg-ov__dlg');
    const btnClose = ov.querySelector('[data-cfg="ov-close"]');

    const close = () => closeSummaryOverlay();
    btnClose.addEventListener('click', close);
    ov.addEventListener('click', close);
    dlg.addEventListener('click', stop); // klik w środek nie zamyka
    document.addEventListener('keydown', onEsc, { once:true });

    // focus
    setTimeout(()=> btnClose.focus(), 0);
  }

  function onEsc(e){ if (e.key === 'Escape') closeSummaryOverlay(); }
  function closeSummaryOverlay(){
    const el = document.querySelector('.cfg-ov');
    if (el) el.remove();
  }

  // eksport
  window.openSummaryOverlay = openSummaryOverlay;
  window.closeSummaryOverlay = closeSummaryOverlay;
})();
