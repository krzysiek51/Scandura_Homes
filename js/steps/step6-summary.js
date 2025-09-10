// js/steps/step6-summary.js
// Krok „Wycena” – spójny z tokenami, stabilny progres, DOMYŚLNIE UKRYTE podsumowanie,
// delegacja klików, stała wysokość modala (grid + scroll body).

import { CFG } from '../config.js';

/* ====== STAWKI (Trójmiasto) ====== */
const STAGE_RATES = {
  fundamenty_sciany: { labor:{min:130, mid:150, max:170}, materials:{min:450, mid:500, max:550} },
  sciany_nosne:      { labor:{min:110, mid:130, max:150}, materials:{min:270, mid:310, max:350} },
  sciany_dzialowe:   { labor:{min:100, mid:115, max:130}, materials:{min:220, mid:260, max:300} },
  strop:             { labor:{min:170, mid:190, max:210}, materials:{min:320, mid:355, max:390} },
  dach:              { labor:{min:150, mid:165, max:180}, materials:{min:400, mid:450, max:500} },
  elewacja:          { labor:{min:300, mid:450, max:600}, materials:{min: 50, mid: 85, max:120} }
};
const INSTALL_RATES = {
  elektryka:  { labor:{min: 80, mid:110, max:140}, materials:{min: 80, mid:100, max:120} },
  wodkan:     { labor:{min: 90, mid:120, max:150}, materials:{min: 90, mid:110, max:130} },
  ogrzewanie: { labor:{min:120, mid:155, max:190}, materials:{min:130, mid:170, max:210} }
};
const EXTRA_RATES = {
  taras: { labor:{min:130, mid:150, max:170}, materials:{min:140, mid:170, max:200} },
  garaz: { labor:{min:150, mid:175, max:200}, materials:{min:250, mid:300, max:350} }
};
// „za sztukę”
const PER_PIECE_DEFAULTS = { windowAllIn:1200, doorAllIn:900, bathLabor:18000, bathAllIn:35000 };
const DEFAULT_AREAS = { terraceM2:20, garageM2:30 };

/* ====== UTIL ====== */
const money = n => new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',maximumFractionDigits:0}).format(n||0);
const num   = (v,d=0)=>{ const n=Number(v); return Number.isFinite(n)? n : d; };
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const escapeHtml = s => String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]);
const LMAP  = { MIN:'min', SR:'mid', MAX:'max' };

/* ====== STATE ====== */
let S = {
  level: 'SR',
  perWindowAllIn: PER_PIECE_DEFAULTS.windowAllIn,
  perDoorAllIn:   PER_PIECE_DEFAULTS.doorAllIn,
  perBathLabor:   PER_PIECE_DEFAULTS.bathLabor,
  perBathAllIn:   PER_PIECE_DEFAULTS.bathAllIn,
  terraceM2: DEFAULT_AREAS.terraceM2,
  garageM2:  DEFAULT_AREAS.garageM2,
  ai: { loading:false, progress:0, resultText:'', chat:[], _finalized:false, _fallbackIndex:0 },
  ui: { showDetails:false } // DOMYŚLNIE UKRYTE
};

/* ====== LABEL HELPERS (naprawa ReferenceError) ====== */
function titleCase(x){ return (x||'').toString().replace(/_/g,' ').replace(/(^|\s)\p{L}/gu,m=>m.toUpperCase()); }
function labelType(v){
  const map = { parterowy:'Parterowy', z_poddaszem:'Z poddaszem', pietrowy:'Piętrowy' };
  return map[v] || titleCase(v) || '—';
}
function labelFoundation(v){
  const map = { plyta:'Płyta fundamentowa', lawy:'Ławy fundamentowe' };
  return map[v] || titleCase(v) || '—';
}
function labelFacade(v){
  const map = { drewno:'Drewno', tynk:'Tynk', mix:'Mix' };
  return map[v] || titleCase(v) || '—';
}
function labelRoof(v){
  const map = { dwuspadowy:'Dwuspadowy', czterospadowy:'Czterospadowy', plaski:'Płaski' };
  return map[v] || titleCase(v) || '—';
}

/* ====== MNOŻNIKI wg wyborów ====== */
function stageMultipliers(data){
  return {
    fundamenty_sciany: (data?.foundation === 'plyta') ? 1.08 : 1.00,
    dach:              (data?.roof === 'czterospadowy' || data?.roof === 'czterospad') ? 1.12 : 1.00,
    elewacja:          (data?.facade === 'drewno') ? 1.06 : 1.00,
    sciany_nosne:1.00, sciany_dzialowe:1.00, strop:1.00
  };
}

/* ====== OBLICZENIA ====== */
function compute(C){
  const d = C.data || {};
  const layout  = d.layout  || {};
  const options = d.options || {};
  const area    = Math.max(35, num(layout.area, 0));
  const lvl     = LMAP[S.level] || 'mid';
  const mult    = stageMultipliers(d);

  let baseLabor_m2 = 0, baseMaterials_m2 = 0;
  for (const [key, r] of Object.entries(STAGE_RATES)) {
    const k = mult[key] || 1;
    baseLabor_m2     += (r.labor?.[lvl]     || 0) * k;
    baseMaterials_m2 += (r.materials?.[lvl] || 0) * k;
  }
  const baseLaborNet     = area * baseLabor_m2;
  const baseMaterialsNet = area * baseMaterials_m2;

  const elecLabor = options.elec    ? area * (INSTALL_RATES.elektryka.labor?.[lvl]     || 0) : 0;
  const elecMat   = options.elec    ? area * (INSTALL_RATES.elektryka.materials?.[lvl] || 0) : 0;
  const wodLabor  = options.water   ? area * (INSTALL_RATES.wodkan.labor?.[lvl]        || 0) : 0;
  const wodMat    = options.water   ? area * (INSTALL_RATES.wodkan.materials?.[lvl]    || 0) : 0;
  const heatLabor = options.heating ? area * (INSTALL_RATES.ogrzewanie.labor?.[lvl]    || 0) : 0;
  const heatMat   = options.heating ? area * (INSTALL_RATES.ogrzewanie.materials?.[lvl]|| 0) : 0;

  const terraceLabor = options.terrace ? num(S.terraceM2,0) * (EXTRA_RATES.taras.labor?.[lvl]     || 0) : 0;
  const terraceMat   = options.terrace ? num(S.terraceM2,0) * (EXTRA_RATES.taras.materials?.[lvl] || 0) : 0;
  const garageLabor  = options.garage  ? num(S.garageM2,0)  * (EXTRA_RATES.garaz.labor?.[lvl]     || 0) : 0;
  const garageMat    = options.garage  ? num(S.garageM2,0)  * (EXTRA_RATES.garaz.materials?.[lvl] || 0) : 0;

  const windowsAllIn = num(S.perWindowAllIn) * num(layout.windows,0);
  const doorsAllIn   = num(S.perDoorAllIn)   * num(layout.doors,0);
  const extraBaths   = Math.max(0, num(layout.baths,0) - 1);
  const bathsLabor   = num(S.perBathLabor) * extraBaths;
  const bathsAllIn   = num(S.perBathAllIn) * extraBaths;

  const laborOnlyNet =
    baseLaborNet +
    elecLabor + wodLabor + heatLabor +
    terraceLabor + garageLabor +
    bathsLabor;

  const withMaterialsNet =
    baseLaborNet + baseMaterialsNet +
    elecLabor + elecMat + wodLabor + wodMat + heatLabor + heatMat +
    terraceLabor + terraceMat + garageLabor + garageMat +
    windowsAllIn + doorsAllIn + bathsAllIn;

  const grossAt = (net, vat) => net * (1 + vat/100);

  return {
    input: { area, layout, options },
    parts: {
      baseLaborNet, baseMaterialsNet,
      elecLabor, elecMat, wodLabor, wodMat, heatLabor, heatMat,
      terraceLabor, terraceMat, garageLabor, garageMat,
      windowsAllIn, doorsAllIn, bathsLabor, bathsAllIn
    },
    totals: {
      laborOnlyNet,
      laborOnlyGross8:  grossAt(laborOnlyNet, 8),
      laborOnlyGross23: grossAt(laborOnlyNet, 23),
      withMaterialsNet,
      withMaterialsGross8:  grossAt(withMaterialsNet, 8),
      withMaterialsGross23: grossAt(withMaterialsNet, 23)
    }
  };
}

/* ====== RENDER ====== */
function mount(container){
  if (CFG._pricingState) S = { ...S, ...CFG._pricingState };
  ensureFixedModalFrameStyles(container.ownerDocument); // stała wysokość modala
  if (S.ai.loading && S.ai.progress >= 100) finalize(container);
  render(container);

  // DELEGACJA KLIKÓW – działa po każdym rerenderze
  container.addEventListener('click', (e)=>{
    const toggle = e.target.closest('.js-toggle-details');
    if (toggle) {
      S.ui.showDetails = !S.ui.showDetails;
      rerender(container);
      return;
    }
    const gen = e.target.closest('.js-ai-generate');
    if (gen) {
      if (!S.ai.loading) startAiGenerate(container);
      return;
    }
    const lvlBtn = e.target.closest('[data-level]');
    if (lvlBtn && !S.ai.loading) {
      S.level = lvlBtn.dataset.level;
      rerender(container);
    }
  });

  // Formularz czatu – delegacja submit
  container.addEventListener('submit', (e)=>{
    const form = e.target.closest('#ai-chat-form');
    if (!form) return;
    e.preventDefault();
    if (S.ai.loading) return;
    const input = form.querySelector('input[name="msg"]');
    const text = (input?.value||'').trim();
    if (!text) return;
    input.value = '';
    handleChatMessage(text, container);
  });
}

function render(container){
  const res = compute(CFG);
  if (S.ai.loading && S.ai.progress >= 100) finalize(container);

  container.innerHTML = `
    <div class="cfg-pricing">
      <div class="pricing-scroll">
        ${renderHeader()}
        ${renderAiCta()}
        ${renderAiLoader()}
        ${renderAiBanner(res)}
        <div class="pricing-layout">
          ${S.ui.showDetails ? `
            <div class="card">
              ${renderIntroExplainer()}
              ${renderChips()}
            </div>
            <div class="card">
              <div class="card__title">Rozbicie pozycji (netto)</div>
              ${buildSections(res).join('')}
            </div>
          ` : ``}
          <aside class="summary">
            ${S.ui.showDetails ? renderSummary(res) : ``}
            ${renderAiPanel()}
          </aside>
        </div>
      </div>
    </div>
  `;

  ensurePricingStyles(container.ownerDocument); // style kafli/tooltipów
  enableTooltips(container);                    // tooltippy
}

/* ====== HEADER / CTA ====== */
function renderHeader(){
  return `
  <div class="ai-head">
    <h2 class="cfg-step__title">Wycena</h2>
    <p class="cfg-step__subtitle">
      Wyceniamy: <b>1) samą robociznę</b> oraz <b>2) robociznę + materiały</b> (orientacyjnie).
      Stawki dla <b>Trójmiasta</b>. To nie jest oferta w rozumieniu prawa.
    </p>
  </div>`;
}
function renderAiCta(){
  const disabled = S.ai.loading ? 'disabled' : '';
  const label = S.ai.resultText ? 'Przelicz wycenę ponownie' : 'Wygeneruj wycenę AI';
  return `
  <div class="ai-cta">
    <div class="segmented" data-tip="Zmienia wysokość stawek — nie zakres prac.">
      <div class="segmented__label">Poziom stawek</div>
      <div class="segmented__group">
        <button class="segmented__btn ${S.level==='MIN'?'is-active':''}" data-level="MIN" data-tip="MIN — oszczędnie (niższe widełki)">MIN</button>
        <button class="segmented__btn ${S.level==='SR'?'is-active':''}"  data-level="SR"  data-tip="SR — standard rynkowy (najczęściej wybierany)">SR</button>
        <button class="segmented__btn ${S.level==='MAX'?'is-active':''}" data-level="MAX" data-tip="MAX — premium/szybszy termin/rezerwa">MAX</button>
      </div>
      <div class="segmented__legend"><b>MIN</b> – oszczędnie • <b>SR</b> – standard • <b>MAX</b> – premium</div>
      <div class="segmented__note">Reguluje <b>stawki</b>, nie zmienia <b>zakresu</b>.</div>
    </div>
    <button class="btn btn-accent js-ai-generate" ${disabled}>${sparklesIcon()}<span>${label}</span></button>
  </div>`;
}

/* ====== LOADER ====== */
function renderAiLoader(){
  if (!S.ai.loading) return '';
  const p = Math.max(0, Math.min(100, S.ai.progress|0));
  return `
  <div class="ai-loader" aria-live="polite">
    <div class="ai-loader__title">AI przygotowuje Twoją wycenę…</div>
    <div class="ai-steps">
      <div class="ai-step ${p>=1?'done':''}">Zbieram wybory</div>
      <div class="ai-step ${p>=30?'done':''}">Przeliczam koszty</div>
      <div class="ai-step ${p>=80?'done':''}">Tworzę podsumowanie</div>
    </div>
    <div class="progress"><div class="progress__bar" style="width:${p}%"></div></div>
    <div class="progress__percent">${p}%</div>
  </div>`;
}

/* ====== AI BANNER ====== */
function renderAiBanner(res){
  if (!S.ai.resultText) return '';
  return `
  <div class="ai-banner" id="ai-result">
    <div class="ai-banner__left">${renderSvgHouse()}</div>
    <div class="ai-banner__right">
      <div class="ai-banner__title">Wycena AI</div>
      <div class="ai-tiles">
        <div class="ai-tile" data-tip="Kwota netto za pracę ekipy — bez materiałów.">
          <div class="ai-tile__label">Robocizna (netto)</div>
          <div class="ai-tile__value">${money(res.totals.laborOnlyNet)}</div>
          <div class="ai-tile__sub">Brutto: 8% → ${money(res.totals.laborOnlyGross8)} • 23% → ${money(res.totals.laborOnlyGross23)}</div>
        </div>
        <div class="ai-tile" data-tip="Robocizna + materiały (część materiałowa liczona orientacyjnie).">
          <div class="ai-tile__label">Robocizna + materiały (netto)</div>
          <div class="ai-tile__value">${money(res.totals.withMaterialsNet)}</div>
          <div class="ai-tile__sub">Brutto: 8% → ${money(res.totals.withMaterialsGross8)} • 23% → ${money(res.totals.withMaterialsGross23)}</div>
        </div>
      </div>
      <div class="ai-banner__text">${S.ai.resultText}</div>
      <div class="ai-banner__actions">
        <button class="btn btn-outline js-toggle-details">${S.ui.showDetails ? 'Ukryj podsumowanie' : 'Pokaż podsumowanie'}</button>
      </div>
    </div>
  </div>`;
}

/* ====== EXPLAINER / CHIPS ====== */
function renderIntroExplainer(){
  return `
  <div class="explainer">
    <div class="explainer__title">Co liczymy?</div>
    <ul class="explainer__list">
      <li>Konstrukcję</li>
      <li>Instalacje (jeśli wybrane)</li>
      <li>Dodatki i sztuki</li>
    </ul>
    <div class="explainer__note">Wycena orientacyjna. VAT wg przepisów (często 8% w mieszk.).</div>
  </div>`;
}
function renderChips(){
  const d = CFG.data || {};
  const l = d.layout || {};
  const o = d.options || {};
  return `
  <div class="card__title">Parametry</div>
  <div class="chips">
    <span class="chip">Pow.: <b>${num(l.area,0)} m²</b></span>
    <span class="chip">Pokoje: <b>${num(l.rooms,0)}</b></span>
    <span class="chip">Łazienki: <b>${num(l.baths,0)}</b></span>
    <span class="chip">Okna: <b>${num(l.windows,0)}</b></span>
    <span class="chip">Drzwi: <b>${num(l.doors,0)}</b></span>
    <span class="chip">Rodzaj: <b>${labelType(d.type)}</b></span>
    <span class="chip">Fundament: <b>${labelFoundation(d.foundation)}</b></span>
    <span class="chip">Elewacja: <b>${labelFacade(d.facade)}</b></span>
    <span class="chip">Dach: <b>${labelRoof(d.roof)}</b></span>
    ${o.terrace ? `<span class="chip">Taras: <b>${S.terraceM2} m²</b></span>`:''}
    ${o.garage  ? `<span class="chip">Garaż: <b>${S.garageM2} m²</b></span>`:''}
    ${o.elec    ? `<span class="chip chip--on">Elektryka</span>`:''}
    ${o.water   ? `<span class="chip chip--on">Wod-kan</span>`:''}
    ${o.heating ? `<span class="chip chip--on">Ogrzewanie</span>`:''}
  </div>`;
}

/* ====== TABELKI ====== */
function buildSections(res){
  const blocks = [];

  const konstrukcja = [
    ['Konstrukcja — robocizna',  res.parts.baseLaborNet],
    ['Konstrukcja — materiały',  res.parts.baseMaterialsNet],
  ].filter(([,v])=>v>0);
  if (konstrukcja.length) blocks.push(sectionTable('Konstrukcja', konstrukcja));

  const instalacje = [
    (res.parts.elecLabor+res.parts.elecMat) ? ['Instalacja elektryczna', res.parts.elecLabor+res.parts.elecMat] : null,
    (res.parts.wodLabor+res.parts.wodMat)   ? ['Instalacja wod-kan',     res.parts.wodLabor+res.parts.wodMat] : null,
    (res.parts.heatLabor+res.parts.heatMat) ? ['Instalacja ogrzewania',  res.parts.heatLabor+res.parts.heatMat] : null,
    (res.parts.terraceLabor+res.parts.terraceMat) ? ['Taras',  res.parts.terraceLabor+res.parts.terraceMat] : null,
    (res.parts.garageLabor+res.parts.garageMat)   ? ['Garaż',  res.parts.garageLabor+res.parts.garageMat]   : null,
  ].filter(Boolean);
  if (instalacje.length) blocks.push(sectionTable('Instalacje i dodatki', instalacje));

  const allin = [
    res.parts.windowsAllIn ? ['Okna — montaż all-in',  res.parts.windowsAllIn] : null,
    res.parts.doorsAllIn   ? ['Drzwi — montaż all-in', res.parts.doorsAllIn]   : null,
    res.parts.bathsAllIn   ? ['Łazienki — dodatkowe (all-in)', res.parts.bathsAllIn] : null,
  ].filter(Boolean);
  if (allin.length) blocks.push(sectionTable('Pozycje jednostkowe — all-in', allin));

  const rob = [
    res.parts.bathsLabor ? ['Łazienki — dodatkowe (robocizna)', res.parts.bathsLabor] : null
  ].filter(Boolean);
  if (rob.length) blocks.push(sectionTable('Pozycje jednostkowe — robocizna', rob));

  return blocks;
}
function sectionTable(title, rows){
  return `
  <div class="money-table__section">
    <div class="money-table__head">${title}</div>
    <div class="money-table">
      ${rows.map(([label,val])=>{
        const full = escapeHtml(label);
        return `
        <div class="money-table__row has-tip" data-tip="${full}">
          <div class="money-table__label">
            <span class="label__text">${full}</span>
            <span class="label__hint" aria-hidden="true">i</span>
          </div>
          <div class="money-table__value">${money(val)}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ====== PODSUMOWANIE ====== */
function renderSummary(res){
  return `
  <div class="summary-card">
    <div class="sum-block">
      <div class="sum-label">Robocizna (netto)</div>
      <div class="sum-value">${money(res.totals.laborOnlyNet)}</div>
      <div class="vat">Brutto: 8% → ${money(res.totals.laborOnlyGross8)} • 23% → ${money(res.totals.laborOnlyGross23)}</div>
      <p class="note">To koszt samej robocizny. VAT wg przepisów (budownictwo mieszkaniowe często 8%).</p>
    </div>
    <div class="sum-block">
      <div class="sum-label">Robocizna + materiały (netto)</div>
      <div class="sum-value">${money(res.totals.withMaterialsNet)}</div>
      <div class="vat">Brutto: 8% → ${money(res.totals.withMaterialsGross8)} • 23% → ${money(res.totals.withMaterialsGross23)}</div>
      <p class="note"><b>Wycena orientacyjna</b> — nie jest ofertą. Potwierdzimy po doborze materiałów i zakresu.</p>
    </div>
  </div>`;
}

/* ====== CHAT ====== */
function renderAiPanel(){
  const history = (S.ai.chat||[]).map(m=>`
    <div class="msg msg--${m.role}"><div class="msg__bubble">${escapeHtml(m.text)}</div></div>
  `).join('');
  return `
  <div class="ai-chat">
    <div class="ai-chat__title">Asystent AI</div>
    <div class="ai-chat__history">${history || '<div class="msg msg--assistant"><div class="msg__bubble">Cześć! Mogę odpowiadać na pytania i od razu zmieniać parametry projektu (a kalkulator przeliczy kwoty). Od czego zaczynamy?</div></div>'}</div>
    <form id="ai-chat-form" class="ai-chat__form">
      <input class="ai-input" name="msg" placeholder="Napisz wiadomość…" autocomplete="off"/>
      <button class="btn btn-primary" type="submit">Wyślij</button>
    </form>
  </div>`;
}
function handleChatMessage(text, container){
  S.ai.chat.push({role:'user', text});

  const before = compute(CFG);
  const intents = parseIntents(text);
  const applied = applyIntents(intents);
  const after  = compute(CFG);

  // aktualizujemy kafel AI po zmianach
  S.ai.resultText = makeAiSummaryText(after);

  const diffLabor = after.totals.laborOnlyNet - before.totals.laborOnlyNet;
  const diffAll   = after.totals.withMaterialsNet - before.totals.withMaterialsNet;

  let reply = '';
  if (applied.length){
    const bullets = applied.map(a=>`• ${a}`).join('<br>');
    reply = `Zastosowałem zmiany:<br>${bullets}<br><br>Nowe kwoty:<br>• robocizna ${money(after.totals.laborOnlyNet)} (${diffLabor>=0?'+':''}${money(diffLabor)})<br>• robocizna + materiały ${money(after.totals.withMaterialsNet)} (${diffAll>=0?'+':''}${money(diffAll)}).`;
  } else {
    reply = answerUserQuestion(text, after);
    if (!reply) {
      const fallbacks = [
        'Mogę policzyć wpływ okien, drzwi, dodatkowych łazienek, tarasu i garażu albo włączyć/wyłączyć instalacje (elektryka, wod-kan, ogrzewanie). Co zmieniamy?',
        'Mogę też wyjaśnić VAT 8%/23%, realne widełki stawek i co dokładnie wchodzi w materiały. Który temat wybierasz?'
      ];
      reply = fallbacks[S.ai._fallbackIndex++ % fallbacks.length];
    }
  }

  S.ai.chat.push({role:'assistant', text: reply});
  rerender(container);
}

/* ====== Intenty ====== */
function parseIntents(text){
  const t = text.toLowerCase().replace(',', '.');
  const intents = [];
  const findNum = (rx) => { const m = t.match(rx); return (m && m[1]) ? num(m[1]) : null; };

  if (/\b(min|sr|max)\b/.test(t)){
    const lv = t.match(/\b(min|sr|max)\b/)?.[1].toUpperCase();
    if (lv) intents.push({type:'set', key:'level', value: lv});
  }
  let v = findNum(/\bokn[aeo]?\s*(?:na|=)?\s*(\d{1,3})/);
  if (v!==null) intents.push({type:'set', key:'windows', value: clamp(v,0,50)});
  v = findNum(/\bdrzwi(?: zewn\.)?\s*(?:na|=)?\s*(\d{1,2})/);
  if (v!==null) intents.push({type:'set', key:'doors', value: clamp(v,0,10)});
  v = findNum(/\błazienk[aie]\s*(?:na|=)?\s*(\d{1,2})/);
  if (v!==null) intents.push({type:'set', key:'baths', value: clamp(v,1,6)});
  v = findNum(/\bpokoj[e]?\s*(?:na|=)?\s*(\d{1,2})/);
  if (v!==null) intents.push({type:'set', key:'rooms', value: clamp(v,1,10)});
  v = findNum(/\b(?:pow(?:ierzchnia)?|m2|m²)\s*(?:na|=)?\s*(\d{2,4}(?:\.\d{1,2})?)/);
  if (v!==null) intents.push({type:'set', key:'area', value: clamp(v,35,500)});
  v = findNum(/\bgara[żz][^\d]*(\d{1,3}(?:\.\d{1,2})?)\s*m/);
  if (v!==null) intents.push({type:'set', key:'garage_m2', value: clamp(v,0,120), enable:'garage'});
  v = findNum(/\btaras[^\d]*(\d{1,3}(?:\.\d{1,2})?)\s*m/);
  if (v!==null) intents.push({type:'set', key:'terrace_m2', value: clamp(v,0,200), enable:'terrace'});

  if (/(włącz|dodaj).*elektryk/.test(t)) intents.push({type:'toggle', key:'elec', value:true});
  if (/(wyłącz|usuń).*elekryk|elekryk/.test(t)) intents.push({type:'toggle', key:'elec', value:false});
  if (/(włącz|dodaj).*(wod|kan)/.test(t)) intents.push({type:'toggle', key:'water', value:true});
  if (/(wyłącz|usuń).*(wod|kan)/.test(t)) intents.push({type:'toggle', key:'water', value:false});
  if (/(włącz|dodaj).*ogrzew/.test(t)) intents.push({type:'toggle', key:'heating', value:true});
  if (/(wyłącz|usuń).*ogrzew/.test(t)) intents.push({type:'toggle', key:'heating', value:false});

  return intents;
}
function applyIntents(intents){
  const d = CFG.data || (CFG.data = {});
  const l = d.layout || (d.layout = {});
  const o = d.options || (d.options = {});
  const applied = [];
  intents.forEach(it=>{
    switch(it.type){
      case 'set':
        if (it.key==='level' && (it.value==='MIN'||it.value==='SR'||it.value==='MAX')){ S.level = it.value; applied.push(`Poziom stawek: ${it.value}`); }
        if (it.key==='windows'){ l.windows = it.value; applied.push(`Okna: ${it.value} szt.`); }
        if (it.key==='doors'){   l.doors   = it.value; applied.push(`Drzwi: ${it.value} szt.`); }
        if (it.key==='baths'){   l.baths   = it.value; applied.push(`Łazienki: ${it.value} szt.`); }
        if (it.key==='rooms'){   l.rooms   = it.value; applied.push(`Pokoje: ${it.value} szt.`); }
        if (it.key==='area'){    l.area    = it.value; applied.push(`Pow.: ${it.value} m²`); }
        if (it.key==='garage_m2'){ o.garage = true; S.garageM2 = it.value; applied.push(`Garaż: ${S.garageM2} m²`); }
        if (it.key==='terrace_m2'){ o.terrace = true; S.terraceM2 = it.value; applied.push(`Taras: ${S.terraceM2} m²`); }
        if (it.enable==='garage'){ o.garage = true; }
        if (it.enable==='terrace'){ o.terrace = true; }
        break;
      case 'toggle':
        o[it.key] = !!it.value;
        applied.push(`${{elec:'Elektryka',water:'Wod-kan',heating:'Ogrzewanie'}[it.key]||it.key}: ${it.value?'włączone':'wyłączone'}`);
        break;
    }
  });
  CFG._pricingState = S;
  return applied;
}

/* ====== AI FLOW ====== */
function startAiGenerate(container){
  S.ai.loading = true;
  S.ai._finalized = false;
  S.ai.progress = 0;
  rerender(container);

  const DUR = 2200;
  const start = performance.now();
  const tick = setInterval(()=>{
    const now = performance.now();
    const p = Math.min(100, Math.round(((now - start) / DUR) * 100));
    S.ai.progress = p;
    rerender(container);
    if (p >= 100) doFinalizeOnce();
  }, 120);

  const safety = setTimeout(doFinalizeOnce, DUR + 800);
  function doFinalizeOnce(){
    if (S.ai._finalized) return;
    S.ai._finalized = true;
    clearInterval(tick);
    clearTimeout(safety);
    finalize(container);
  }
}
function finalize(container){
  try{
    const res = compute(CFG);
    S.ai.loading = false;
    S.ai.progress = 100;
    S.ai.resultText = makeAiSummaryText(res);
    S.ui.showDetails = false; // domyślnie ukryte
  } finally {
    rerender(container);
    requestAnimationFrame(()=>{
      const el = container.querySelector('#ai-result');
      if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
    });
  }
}
function makeAiSummaryText(res){
  const parts = [];
  parts.push(`Poziom: <b>${S.level}</b>, pow. <b>${num(CFG?.data?.layout?.area,0)} m²</b>.`);
  const adds = [];
  if (CFG?.data?.options?.elec)    adds.push('elektryka');
  if (CFG?.data?.options?.water)   adds.push('wod-kan');
  if (CFG?.data?.options?.heating) adds.push('ogrzewanie');
  if (CFG?.data?.options?.garage)  adds.push(`garaż ${S.garageM2} m²`);
  if (CFG?.data?.options?.terrace) adds.push(`taras ${S.terraceM2} m²`);
  if (adds.length) parts.push(`Uwzględniono: <b>${adds.join(', ')}</b>.`);
  parts.push(`Robocizna: <b>${money(res.totals.laborOnlyNet)}</b>. Robo + materiały: <b>${money(res.totals.withMaterialsNet)}</b>.`);
  return parts.join(' ');
}

/* ====== Q&A ====== */
function answerUserQuestion(text){
  const t = text.toLowerCase();
  if (/o czym|temat|możemy pogada|co (możesz|potrafisz)|nic więcej/.test(t)){
    return [
      'Mogę policzyć wpływ okien, drzwi, dodatkowych łazienek, tarasu i garażu, a także włączyć/wyłączyć instalacje (elektryka, wod-kan, ogrzewanie). Co zmieniamy?',
      'Mogę też wyjaśnić VAT 8%/23%, realne widełki stawek i co dokładnie wchodzi w materiały. Który temat wybierasz?'
    ][S.ai._fallbackIndex++ % 2];
  }
  if (/\bvat\b|brutto|netto/.test(t)){
    return 'W budownictwie mieszkaniowym często 8% VAT (np. dom ≤ 300 m²), w pozostałych 23%. W kaflu pokazuję obie wersje brutto.';
  }
  if (/min|sr|max|poziom stawek/.test(t)){
    return 'Poziom stawek zmienia widełki ceny (MIN oszczędnie, SR standard, MAX premium/szybszy termin). Zakres prac pozostaje ten sam.';
  }
  if (/skąd|stawki|materiały|źródł/.test(t)){
    return 'Stawki opieram o zestawienie dla Trójmiasta. Konstrukcję liczę per m² etapami, instalacje i dodatki osobno, a okna/drzwi/łazienki jako pozycje „za sztukę”.';
  }
  if (/okna/.test(t))  return 'Mogę zmienić liczbę okien — np. „okna na 5” — i przeliczę kwoty.';
  if (/drzwi/.test(t)) return 'Mogę zmienić liczbę drzwi zewnętrznych i pokażę różnicę w cenie.';
  if (/łazienk/.test(t)) return 'Każda dodatkowa łazienka doliczana jest jako pozycja jednostkowa (robocizna lub all-in). Mogę zmienić liczbę.';
  if (/garaż|garaz/.test(t)) return 'Mogę dodać garaż i ustalić metraż (np. „garaż 25 m²”).';
  if (/taras/.test(t)) return 'Mogę dodać taras i ustalić metraż (np. „taras 20 m²”).';
  if (/termin|harmonogram|czas|kiedy/.test(t)) return 'Termin zależy od zakresu i dostępności ekip; poziom MAX zwykle skraca termin (wyższe stawki).';
  if (/zakres|co wchodzi|co obejmuje/.test(t)) return 'Bazowo: fundament, konstrukcja, dach, elewacja. Opcjonalnie: instalacje, taras, garaż, pozycje „za sztukę”.';
  return '';
}

/* ====== TOOLTIP (bez CTA) ====== */
function enableTooltips(root){
  const doc = root.ownerDocument || document;
  if (doc.getElementById('cfg-tip-root')) return;
  const tip = doc.createElement('div');
  tip.id = 'cfg-tip-root';
  tip.className = 'cfg-tip';
  tip.style.position = 'fixed';
  tip.style.pointerEvents = 'none';
  tip.style.opacity = '0';
  tip.style.left = '-9999px';
  tip.style.top  = '-9999px';
  doc.body.appendChild(tip);

  let hideTimer = null;
  const show = (text, x, y)=>{
    tip.textContent = text;
    tip.style.opacity = '1';
    tip.style.left = Math.max(8, Math.min(x+12, window.innerWidth - 260)) + 'px';
    tip.style.top  = Math.max(8, y+16) + 'px';
  };
  const hide = ()=>{
    tip.style.opacity = '0';
    tip.style.left = '-9999px';
    tip.style.top  = '-9999px';
    tip.textContent = '';
  };

  root.addEventListener('mouseenter', onEnter, true);
  root.addEventListener('mouseleave', onLeave, true);
  root.addEventListener('mousemove', onMove, true);

  function onEnter(e){
    const el = e.target.closest('[data-tip],.has-tip');
    if (!el || !root.contains(el)) return;
    if (el.closest('.js-ai-generate')) return; // brak tooltipa na CTA
    const text = el.getAttribute('data-tip') || el.getAttribute('title') || '';
    if (!text) return;
    if (hideTimer) clearTimeout(hideTimer);
    show(text, e.clientX, e.clientY);
  }
  function onMove(e){
    if (tip.style.opacity !== '1') return;
    show(tip.textContent, e.clientX, e.clientY);
  }
  function onLeave(){
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 80);
  }
}

/* ====== STYLE – inline z tokenami ====== */
function ensurePricingStyles(doc){
  if (doc.getElementById('cfg-pricing-inline')) return;

  const colorPrimary = '#c79041';
  const colorText = '#1d1d1f';
  const colorMuted = '#6b7280';
  const surface = '#ffffff';
  const surface2 = '#f7f7f9';
  const radiusL = '16px';
  const radiusM = '12px';
  const radiusS = '8px';
  const shadowPanel = '0 24px 64px rgba(0,0,0,.18)';

  const css = `
  .pricing-scroll{max-height:min(78vh,880px);overflow:auto;padding-right:8px;padding-bottom:36px}
  .cfg-step__title{margin:0 0 6px;color:${colorText}}
  .cfg-step__subtitle{margin:0 0 10px;color:${colorMuted}}

  .ai-cta{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;margin:8px 0 12px}
  @media (max-width:820px){.ai-cta{grid-template-columns:1fr}}
  .segmented__label{font-weight:800;margin-bottom:6px;color:${colorText}}
  .segmented__group{display:inline-flex;border:1px solid #ececf0;border-radius:${radiusM};overflow:hidden;background:${surface}}
  .segmented__btn{padding:10px 14px;border:0;background:${surface};cursor:pointer;font-weight:700;color:${colorText}}
  .segmented__btn:not(:last-child){border-right:1px solid #ececf0}
  .segmented__btn.is-active{background:${colorText};color:#fff}
  .segmented__btn:hover{background:#f3f3f5}
  .segmented__legend{font-size:12px;color:${colorMuted};margin-top:6px}
  .segmented__note{font-size:12px;color:${colorMuted};margin-top:2px}

  .btn{display:inline-flex;gap:8px;align-items:center;justify-content:center;font-weight:800;border-radius:${radiusM};cursor:pointer;transition:transform .05s ease, box-shadow .15s ease, background .15s ease, color .15s ease;border:1px solid transparent}
  .btn:active{transform:translateY(1px)}
  .btn[disabled]{opacity:.6;cursor:not-allowed;filter:grayscale(.15)}
  .btn-primary{background:${colorText};color:#fff;padding:10px 14px;border-color:${colorText}}
  .btn-primary:hover{background:#2a2a2e;border-color:${colorText}}
  .btn-outline{background:${surface};color:${colorText};border-color:${colorText};padding:10px 14px}
  .btn-outline:hover{background:${colorText};color:#fff}
  .btn-accent{background:${colorPrimary};color:#fff;padding:12px 18px;box-shadow:${shadowPanel}}
  .btn-accent:hover{filter:brightness(1.05)}

  .ai-loader{border:1px solid #ececf0;border-radius:${radiusL};padding:14px 16px;margin:6px 0 12px;background:${surface}}
  .ai-loader__title{font-weight:800;margin-bottom:8px;color:${colorText}}
  .ai-steps{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
  .ai-step{font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #ececf0;background:${surface2};color:${colorText}}
  .ai-step.done{background:#e9fbec;border-color:#bfe6c8}
  .progress{height:8px;background:#f2f2f5;border-radius:999px;overflow:hidden}
  .progress__bar{height:100%;background:${colorText}}
  .progress__percent{font-size:12px;color:${colorMuted};margin-top:6px}

  .ai-banner{display:grid;grid-template-columns:180px 1fr;gap:16px;border:1px solid #e9edf2;background:${surface2};border-radius:${radiusL};padding:14px 16px;margin:6px 0 12px}
  @media (max-width:820px){.ai-banner{grid-template-columns:1fr}}
  .ai-banner__title{font-weight:900;font-size:20px;margin-bottom:8px;color:${colorText}}
  .ai-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px}
  @media (max-width:620px){.ai-tiles{grid-template-columns:1fr}}
  .ai-tile{background:${surface};border:1px solid #ececf0;border-radius:${radiusM};padding:12px 14px}
  .ai-tile__label{color:${colorMuted};font-size:13px}
  .ai-tile__value{font-size:28px;font-weight:900;line-height:1.1;margin-top:4px;color:${colorText}}
  .ai-tile__sub{font-size:12px;color:${colorMuted};margin-top:4px}
  .ai-banner__text{color:${colorText}}
  .ai-banner__actions{margin-top:8px}

  .pricing-layout{display:grid;gap:18px;align-items:start;grid-template-columns:1fr 1fr 380px}
  @media (max-width:1100px){.pricing-layout{grid-template-columns:1fr}}
  .card,.summary-card{background:${surface};border:1px solid #ececf0;border-radius:${radiusL};padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
  .card__title{font-weight:800;margin-bottom:10px;color:${colorText}}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .chip{background:${surface2};border:1px solid #ececf0;border-radius:999px;padding:6px 10px;font-size:12px;color:${colorText}}
  .chip--on{background:#e9fbec;border-color:#bfe6c8}

  .money-table__section+.money-table__section{margin-top:14px}
  .money-table__head{font-weight:700;color:${colorText};border-bottom:1px solid #ececf0;padding-bottom:6px;margin-bottom:6px}
  .money-table{display:grid}
  .money-table__row{display:grid;grid-template-columns:1fr auto;gap:12px;padding:10px;border-bottom:1px dashed #ececf0}
  .money-table__row:nth-child(odd){background:#fafafa}
  .money-table__label{display:flex;align-items:center;gap:6px;min-width:0;color:${colorText}}
  .label__text{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.25}
  .label__hint{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid #ddd;font-size:11px;color:${colorMuted};opacity:.9}
  .money-table__value{font-weight:700;text-align:right;color:${colorText}}

  .summary-card{position:sticky;top:8px}
  .sum-block{border-bottom:1px solid #ececf0;padding:10px 0}
  .sum-label{color:${colorMuted};font-size:13px}
  .sum-value{font-size:26px;font-weight:800;line-height:1.2;margin-top:4px;color:${colorText}}
  .vat{font-size:12px;color:${colorMuted};margin-top:4px}
  .note{font-size:12px;color:${colorText}}

  .ai-chat{margin-top:16px;border:1px solid #ececf0;border-radius:${radiusL};padding:12px;background:${surface}}
  .ai-chat__title{font-weight:800;color:${colorText}}
  .ai-chat__history{max-height:240px;overflow:auto;padding-right:4px;margin:8px 0}
  .ai-chat__form{display:flex;gap:8px}
  .ai-input{flex:1;padding:10px 12px;border:1px solid #e0e0e6;border-radius:${radiusM};color:${colorText}}

  .msg{display:flex;margin:6px 0}
  .msg--assistant{justify-content:flex-start}
  .msg--user{justify-content:flex-end}
  .msg__bubble{max-width:92%;padding:10px 12px;border-radius:${radiusM};font-size:14px;line-height:1.3;border:1px solid #ececf0;background:${surface};color:${colorText}}
  .msg--assistant .msg__bubble{background:${surface2}}
  .msg--user .msg__bubble{background:${colorText};color:#fff;border-color:${colorText}}

  .cfg-tip{z-index:9999;max-width:240px;background:${colorText};color:#fff;padding:8px 10px;border-radius:${radiusS};font-size:12px;line-height:1.25;transition:opacity .08s ease}

  /* domek */
  .ai-banner__left svg .roof { stroke:${colorPrimary}; }
  `;
  const tag = doc.createElement('style');
  tag.id = 'cfg-pricing-inline';
  tag.textContent = css;
  doc.head.appendChild(tag);
}

/* ====== STAŁA WYSOKOŚĆ MODALA (ramy) ====== */
function ensureFixedModalFrameStyles(doc){
  if (doc.getElementById('cfg-panel-fixed')) return;
  const css = `
    .cfg__panel{display:grid;grid-template-rows:auto 1fr auto;gap:12px;height:min(88vh,880px);width:min(1080px,calc(100vw - 32px));max-width:1080px;background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.18);overflow:hidden}
    .cfg__panel > .cfg-stepper{grid-row:1/2;min-height:0}
    .cfg__panel > .cfg-step{grid-row:2/3;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding-inline:8px;padding-bottom:16px}
    .cfg__panel > .cfg-step[hidden]{display:none!important}
    .cfg__panel > .cfg-nav{grid-row:3/4;background:#fff;border-top:1px solid rgba(0,0,0,.06);padding:10px 12px;position:sticky;bottom:0;z-index:2}
    @media (max-width:1024px){.cfg__panel{height:min(92vh,820px);width:min(100vw - 16px,960px)}}
    @media (max-width:480px){.cfg__panel{height:92vh;width:calc(100vw - 12px);border-radius:12px}.cfg__panel>.cfg-step{padding-inline:6px}}
  `;
  const tag = doc.createElement('style');
  tag.id = 'cfg-panel-fixed';
  tag.textContent = css;
  doc.head.appendChild(tag);
}

/* ====== Ikony / grafika ====== */
function sparklesIcon(){
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2l1.8 4.6L18 8.4l-4.2 1.8L12 15l-1.8-4.8L6 8.4l4.2-1.8L12 2z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity=".9"/>
  </svg>`;
}
function renderSvgHouse(){
  return `<svg width="160" height="120" viewBox="0 0 160 120" fill="none" aria-hidden="true">
    <rect x="18" y="52" width="124" height="56" rx="8" fill="#ffffff"/>
    <rect x="18" y="52" width="124" height="56" rx="8" stroke="#e9edf2" fill="none"/>
    <path class="roof" d="M18 52 L80 16 L142 52" stroke="#c79041" stroke-width="3" fill="none"/>
    <rect x="40" y="74" width="26" height="34" fill="#f7f7f9" stroke="#e9edf2"/>
    <rect x="98" y="74" width="24" height="18" fill="#f7f7f9" stroke="#e9edf2"/>
    <circle cx="52" cy="90" r="3" fill="#c79041"/>
  </svg>`;
}

/* ====== API ====== */
export { mount };
export const validate = ()=> true;
export const unmount = (container)=>{ CFG._pricingState = S; container.innerHTML=''; };
function rerender(container){ render(container); }
