/* js/configurator/modal/configurator-price.js */
(() => {
  'use strict';
  if (window.__SCANDURA_CFG_PRICE__) return;
  window.__SCANDURA_CFG_PRICE__ = true;

  // ===== odporne selektory modala =====
  const MODAL =
    document.getElementById('cfg-modal') ||
    document.querySelector('[data-cfg="root"]') ||
    document.querySelector('.cfg-modal') ||
    document.querySelector('[role="dialog"]') ||
    document;

  const qIn = (sel) =>
    (MODAL && MODAL.querySelector && MODAL.querySelector(sel)) ||
    document.querySelector(sel);

  const BODY     = qIn('[data-cfg="body"]') || qIn('.cfg-body, main.cfg-body') || document.body;
  const BTN_PREV = qIn('[data-cfg="prev"]');
  const BTN_NEXT = qIn('[data-cfg="next"]');
  const BTN_SKIP = qIn('[data-cfg="skip"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator || {};

  // ENDPOINT (ten sam co w Step 8)
  const FORMSPREE_ENDPOINT =
    window.FORMSPREE_ENDPOINT || window.__CFG_FORMSPREE_ENDPOINT || null;
  const DEV_SIMULATE_SUCCESS = !FORMSPREE_ENDPOINT;

  // ===== Helpers =====
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const fmtPL = (n) => (typeof n === 'number' && isFinite(n))
      ? n.toLocaleString('pl-PL')
      : '';
  const clamp = (x,min,max)=>Math.min(max,Math.max(min,x));

  function midFromRange(key){
    const map = { '0-35':25,'36-70':55,'71-100':85,'101-150':125,'151-200':175,'200-250':225 };
    return map[key] || null;
  }

  // ——— Ustawienie labela ceny w karcie
function setPriceLabel(state){
  const el = BODY?.querySelector('.cfg-price');
  if (!el) return;
  const a = state?.price_est_min, b = state?.price_est_max;
  if (typeof a === 'number' && a > 0 && typeof b === 'number' && b > 0) {
    el.textContent = `${fmtPL(a)} – ${fmtPL(b)} zł brutto`;
  } else {
    el.textContent = '—';
  }
}



// A) deriveAreaM2 — wyprowadza area_m2 z exact lub z pasma (obsługuje area.value/choice/label)
function deriveAreaM2(state){
  // liczba?
  if (typeof state.area_m2 === 'number' && isFinite(state.area_m2) && state.area_m2 > 0)
    return Math.round(state.area_m2);
  if (typeof state.areaExact === 'number' && isFinite(state.areaExact) && state.areaExact > 0)
    return Math.round(state.areaExact);
  if (state.area && typeof state.area.exact === 'number' && isFinite(state.area.exact) && state.area.exact > 0)
    return Math.round(state.area.exact);

  // pasmo z UI: choice/value/label
  const rawBand = state.areaChoice || state.area?.choice || state.area?.value || state.area?.label;
  if (!rawBand) return null;

  // normalizacja: usuń spacje i zamień wszystkie rodzaje „dashy” na zwykły '-'
  const bandKey = String(rawBand).replace(/\s+/g,'').replace(/[\u2010-\u2015–—−-]/g,'-');

  const map = { '0-35':25,'36-70':55,'71-100':85,'101-150':125,'151-200':175,'200-250':225 };
  return map[bandKey] ?? null;
}

// Adapter: stan z UI -> wejście silnika
function toEngineInput(state){
  const pick = (x) => (x && (x.key ?? x.value ?? x.label)) || (typeof x === 'string' ? x : '');

  // shell (scope): pod-klucz -> DEW, SSZ/SSO po słowach-kluczach
  const rawShell = pick(state.shell) || pick(state.scope) || '';
  let shell = rawShell.toUpperCase();
  if (!['DEW','SSZ','SSO'].includes(shell)) {
    const s = rawShell.toLowerCase();
    if (s.includes('klucz')) shell = 'DEW';
    else if (s.includes('ssz') || s.includes('zamk')) shell = 'SSZ';
    else if (s.includes('sso') || s.includes('otwar')) shell = 'SSO';
    else shell = 'DEW';
  }

  // roof: nieznane -> gabled_2
  const rawRoof = pick(state.roof);
  const roof = ['gabled_2','hip_4','flat'].includes(rawRoof) ? rawRoof : 'gabled_2';

  // storeys: tylko 'parter' / 'plus_1'
  const storeysRaw = pick(state.storeys);
  const storeys = storeysRaw === 'plus_1' ? 'plus_1' : 'parter';

  // garage: jeśli brak -> 'none'
  const garage = pick(state.garage) || 'none';

  // city
  const city = state.location?.city || state.city || 'Gdańsk';

  return { shell, roof, storeys, garage, city };
}




  // Normalizacja stanu (zgodna z Twoją strukturą i starszą)
  function normChoice(x) {
    if (!x) return { label:'', key:'' };
    if (typeof x === 'string') return { label:x, key:x };
    if (typeof x === 'object') {
      const label = x.label ?? x.value ?? '';
      const key   = x.key   ?? x.value ?? '';
      return { label: String(label), key: String(key) };
    }
    return { label:'', key:'' };
  }
  function normArea(area) {
    if (area == null) return { exact:null, choice:'' };
    if (typeof area === 'number') return { exact:area, choice:'' };
    if (typeof area === 'string') return { exact:null, choice:area };
    if (typeof area === 'object') {
      if (area.type === 'exact')  return { exact: Number(area.value) || null, choice:'' };
      if (area.type === 'preset') return { exact:null, choice: String(area.value || '') };
    }
    return { exact:null, choice:'' };
  }
  function normStart(start) {
    if (!start) return { label:'', date:'' };
    if (typeof start === 'object') return { label: start.label || '', date: start.date || '' };
    if (typeof start === 'string') {
      const map = { asap:'ASAP', '1m':'w miesiącu', '3m':'w 3 mies.', '6m':'w 6 mies.', agree:'do uzgodnienia' };
      return { label: map[start] || start, date:'' };
    }
    return { label:'', date:'' };
  }
  function normShell(state) {
    const src = state.shell ?? state.scope;
    return normChoice(src);
  }
  function normAll(state) {
    const building = normChoice(state.building);
    const roof     = normChoice(state.roof);
    const shell    = normShell(state);
    const area     = normArea(state.area ?? (state.areaExact!=null ? {type:'exact', value:state.areaExact} : {type:'preset', value:state.areaChoice}));
    const start    = normStart(state.start);
    const city     = state.location?.city || '';
    const country  = state.location?.country || '';
    return { building, roof, shell, area, start, city, country };
  }
  function summaryFromNorm(n) {
    const m2 = n.area.exact != null ? `${n.area.exact} m²` : (n.area.choice || '—');
    return [
      `Typ: ${n.building.label || '—'}`,
      `Pow.: ${m2}`,
      `Dach: ${n.roof.label || '—'}`,
      `Stan: ${n.shell.label || '—'}`,
      `Start: ${n.start.label || n.start.date || '—'}`,
      `Lokalizacja: ${n.city || '—'}, ${n.country || '—'}`
    ].join(' | ');
  }

// B) ensurePrice — czeka na dane, wyprowadza area_m2 i dopiero liczy; błędy pokazuje w UI
function ensurePrice(state){

    state = state || window.__CFG_LAST_STATE || window.__CFG_STATE || {};
  // widełki już są? nic nie rób
  if (state.price || (state.price_est_min != null && state.price_est_max != null)) return;

  // poczekaj na silnik + dane
  if (!window.computePrice || !window.SCANDURA_PRICING_DATA) {
    if (window.whenPricingReady?.then) {
      window.whenPricingReady.then(() => {
        ensurePrice(state);
        if (BODY?.getAttribute('data-view') === 'price') renderPrice(state);
      });
    }
    return;
  }

  // wyprowadź metraż do silnika (exact albo środek pasma z UI)
  const areaM2 = deriveAreaM2(state);
  if (areaM2 == null) {
    showInlineError('Brak metrażu — wróć do kroku 2 i wybierz metraż.');
    return; // nie wywołuj computePrice bez area_m2
  }

  try {
    const input = toEngineInput(state);
const est = window.computePrice({ ...input, area_m2: areaM2 });

    if (est && typeof est.min === 'number' && typeof est.max === 'number') {
      state.price_est_min = est.min;
      state.price_est_max = est.max;
      state.areaComputed  = est.m2 ?? areaM2;
      if (BODY?.getAttribute('data-view') === 'price') renderPrice(state);
    } else if (!state.areaExact && state.areaChoice) {
      state.areaComputed = midFromRange(state.areaChoice);
    }
  } catch(e) {
    const msg = (e && (e.message || e.toString())) || 'Błąd liczenia.';
    showInlineError(msg);
    console.warn('[price] compute error', e);
  }
}

  function priceLabel(state){
    if (typeof state.price === 'number') {
      return `${fmtPL(state.price)} zł brutto`;
    }
    const a = state.price_est_min, b = state.price_est_max;
    if (typeof a === 'number' && typeof b === 'number') {
      return `${fmtPL(a)} – ${fmtPL(b)} zł brutto`;
    }
    return '—';
  }

// ===== Szczegóły w stylu "Szczegóły zapytania" =====
function openDetails(state, source='price'){
  // 1) normalizacja i pomocnicze mapy PL
  const N = normAll(state);

  const pick = (x) => (x && (x.key ?? x.value ?? x.label)) || (typeof x === 'string' ? x : '');

  const ROOF_MAP    = { gabled_2: 'dwuspadowy', hip_4: 'czterospadowy', flat: 'płaski' };
  const GARAGE_MAP  = { none: 'bez garażu', attached_1: 'w bryle (1-stan.)', attached_2: 'w bryle (2-stan.)', detached_1: 'wolnostojący (1-stan.)' };
  const SHELL_MAP   = { DEW: 'pod klucz', SSZ: 'stan surowy zamknięty', SSO: 'stan surowy otwarty' };
  const STOREYS_MAP = { parter: 'parterowy', plus_1: 'z poddaszem / 1 piętro' };

  // klucze techniczne
  const roofKey    = pick(state.roof) || 'gabled_2';
  const garageKey  = pick(state.garage) || 'none';
  let   shellRaw   = pick(state.shell) || pick(state.scope) || 'DEW';
  let   shellKey   = shellRaw.toUpperCase();
  if (!['DEW','SSZ','SSO'].includes(shellKey)) {
    const s = shellRaw.toLowerCase();
    shellKey = s.includes('zamk') || s.includes('ssz') ? 'SSZ'
             : s.includes('otwar') || s.includes('sso') ? 'SSO'
             : 'DEW';
  }
  const storeysKey = pick(state.storeys) === 'plus_1' ? 'plus_1' : 'parter';

  // metraż (exact albo pasmo)
  const areaTxt = (N.area.exact != null)
    ? `${N.area.exact} m²`
    : (N.area.choice || '—');

  const cityTxt = [N.city, N.country].filter(Boolean).join(', ') || '—';
  const startTxt = N.start.label || N.start.date || '—';
  const priceTxt = priceLabel(state);

  // 2) zbuduj wiersze jak w referencji
  const rows = [
    ['Rodzaj budynku',      N.building.label || 'jednorodzinny'],
    ['Powierzchnia użytkowa', areaTxt],
    ['Kondygnacje',         STOREYS_MAP[storeysKey] || '—'],
    ['Garaż',               GARAGE_MAP[garageKey] || '—'],
    ['Dach',                ROOF_MAP[roofKey] || '—'],
    ['Zakres zlecenia',     SHELL_MAP[shellKey] || '—'],
    ['Miejscowość',         cityTxt],
    ['Start prac',          startTxt],
  ];

  // 3) (opcjonalnie) audit kroków liczenia — rozwijany
  let auditHTML = '';
  try {
    const aM2 = deriveAreaM2(state);
    if (aM2 != null && typeof window.computePrice === 'function') {
      const est = window.computePrice({ ...toEngineInput(state), area_m2: aM2 });
      const items = (est.audit || []).map(a => `<li><code>${esc(a.step)}</code></li>`).join('');
      auditHTML = items
        ? `<details class="cfg-audit"><summary>Jak to liczymy (audit)</summary><ul>${items}</ul></details>`
        : '';
    }
  } catch(_) {}

  // 4) render widoku
  BODY.setAttribute('data-view','details');
  BODY.innerHTML = `
    <style>
      .cfg-details-card{background:#fff;border-radius:16px;padding:16px}
      .cfg-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 12px}
      .cfg-head h3{margin:0;font-size:18px}
      .cfg-pill{font-weight:700;padding:8px 12px;border-radius:10px;background:#F3F4F6}
      .cfg-table{border-top:1px solid #eee;margin-top:8px}
      .cfg-row{display:grid;grid-template-columns:220px 1fr;gap:8px;padding:10px 0;border-bottom:1px solid #f1f1f1}
      .cfg-row .lbl{color:#6b7280}
      .cfg-actions{display:flex;gap:8px;margin-top:14px}
      .cfg-audit{margin-top:12px}
      .cfg-audit summary{cursor:pointer}
      @media (max-width:640px){ .cfg-row{grid-template-columns:1fr} }
    </style>

    <div class="cfg-details-card">
      <div class="cfg-head">
        <h3>Szczegóły wyceny</h3>
        <div class="cfg-pill">${esc(priceTxt)}</div>
      </div>

      <div class="cfg-table">
        ${rows.map(([l,v]) => `
          <div class="cfg-row">
            <div class="lbl">${esc(l)}</div>
            <div class="val">${esc(v)}</div>
          </div>
        `).join('')}
      </div>

      ${auditHTML}

      <div class="cfg-actions">
        <button type="button" class="cfg-btn" data-cfg="details-back">Wróć</button>
        <button type="button" class="cfg-btn cfg-btn--primary" data-cfg="details-close">Zamknij</button>
      </div>
    </div>
  `;

  // 5) akcje
  BODY.querySelector('[data-cfg="details-back"]')?.addEventListener('click', () => renderPrice(state));
  BODY.querySelector('[data-cfg="details-close"]')?.addEventListener('click', () => renderPrice(state));
}


  // ===== Szybkie wysłanie do konsultanta =====
  async function sendImmediate(state){
    const btn = BODY.querySelector('[data-cfg="send-now"]');
    setBusy(btn, true);

    // ping tylko, żeby zaznaczyć „wyślij teraz”
    const N = normAll(state);
    const fd = new FormData();
    fd.append('stage', 'price_card');
    fd.append('fast_send', 'true');
    fd.append('summary', summaryFromNorm(N));
    fd.append('name',  state.contact?.name || '');
    fd.append('email', state.contact?.email || '');
    if (state.contact?.phone) fd.append('phone', state.contact.phone);
    fd.append('price_label', priceLabel(state));
    fd.append('state_json', JSON.stringify(state));

    try{
      if (DEV_SIMULATE_SUCCESS) {
        await delay(250);
        setBusy(btn, false);
        return showThanks(state, 'Dziękujemy! Zgłoszenie trafiło do konsultanta. Skontaktujemy się wkrótce.');
      }
      const resp = await fetch(FORMSPREE_ENDPOINT, { method:'POST', headers:{'Accept':'application/json'}, body: fd });
      let data=null; try{ data=await resp.clone().json(); }catch{}
      if (!resp.ok) throw new Error(`Formspree HTTP ${resp.status}`);
      setBusy(btn, false);
      showThanks(state, 'Dziękujemy! Zgłoszenie trafiło do konsultanta. Skontaktujemy się wkrótce.');
    }catch(e){
      console.error(e);
      setBusy(btn, false);
      showInlineError('Błąd wysyłki. Spróbuj ponownie.');
    }
  }

  function showInlineError(msg){
    let box = BODY.querySelector('[data-cfg="price-error"]');
    if (!box){
      box = document.createElement('div');
      box.setAttribute('data-cfg','price-error');
      box.className = 'cfg-error';
      BODY.appendChild(box);
    }
    box.textContent = msg || '';
    box.style.marginTop = '8px';
  }

  function showThanks(state, text){
    BODY.setAttribute('data-view','thanks');
    BODY.innerHTML = `
      <div class="cfg-thanks">
        <h3>Dziękujemy!</h3>
        <p>${esc(text)}</p>
        <div style="margin-top:12px">
          <button class="cfg-btn cfg-btn--primary" data-cfg="back-price">Wróć do wyceny</button>
        </div>
      </div>
    `;
    BODY.querySelector('[data-cfg="back-price"]')?.addEventListener('click', ()=> renderPrice(state));
  }

 function renderPrice(state){
  // 1) stan + debug
  state = state || window.__CFG_LAST_STATE || window.__CFG_STATE || {};
  window.__CFG_LAST_STATE = state;

  // wyczyść „stare zera” przywleczone z wcześniejszych kroków
  if (state) {
    if (state.price === 0) delete state.price;
    if (state.price_est_min === 0 || state.price_est_max === 0) {
      delete state.price_est_min;
      delete state.price_est_max;
    }
  }

  // 2) UI (nagłówek, progress, stopka)
  setTitle?.('Cześć! Chcesz ulepszyć wycenę?');
  setProgress?.(100);
  if (BTN_NEXT){ BTN_NEXT.hidden = true; BTN_NEXT.onclick = null; }
  if (BTN_SKIP){ BTN_SKIP.hidden = true; BTN_SKIP.onclick = null; }
  if (BTN_PREV){ BTN_PREV.hidden = true; BTN_PREV.onclick = null; }

  // 3) render karty z placeholderem
  BODY.setAttribute('data-view','price');
  BODY.innerHTML = `
    <section class="cfg-price-card" style="display:flex;flex-direction:column;gap:12px">
      <div><p class="cfg-muted" style="margin:0">
        Odpowiedz na kilka dodatkowych pytań, by wycena była dokładniejsza.
      </p></div>

      <div class="cfg-price-row"
           style="display:flex;align-items:center;gap:12px;justify-content:space-between;padding:12px;border-radius:14px;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.06)">
        <div>
          <div class="cfg-label" style="font-size:14px;color:#555">Orientacyjna wycena:</div>
          <div class="cfg-price" style="font-size:20px;font-weight:700">—</div>
        </div>
        <button class="cfg-btn cfg-btn--primary" data-cfg="ai-enhance" style="white-space:nowrap">
          ✨ Ulepsz wycenę
        </button>
      </div>

      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <button class="cfg-btn cfg-btn--ghost" data-cfg="send-now">Wyślij teraz do konsultanta</button>
        <button class="cfg-link" data-cfg="price-details"
                style="background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer">
          Zobacz szczegóły wyceny
        </button>
      </div>

      <div class="cfg-note" style="font-size:12px;color:#666;display:flex;gap:6px;align-items:flex-start">
        <span aria-hidden="true" style="font-weight:700">i</span>
        <span>Widełki obejmują materiały i robociznę, VAT wliczony. To wynik orientacyjny — dokładność poprawisz w Ulepszaczu.</span>
      </div>
    </section>
  `;

  // 4) handlery (raz)
  BODY.querySelector('[data-cfg="ai-enhance"]')?.addEventListener('click', () => {
    if (typeof window.renderEnhancer === 'function') {
      window.renderEnhancer(state);
    } else {
      openDetails(state);
      showInlineError('Ulepszacz nie jest jeszcze podpięty. (renderEnhancer brak)');
    }
  });
  BODY.querySelector('[data-cfg="price-details"]')?.addEventListener('click', () => openDetails(state));
  BODY.querySelector('[data-cfg="send-now"]')?.addEventListener('click', () => sendImmediate(state));

  // 5) obliczenia ceny i uzupełnienie labela
  (async () => {
    try {
      if (!window.computePrice || !window.SCANDURA_PRICING_DATA) {
        if (window.whenPricingReady?.then) await window.whenPricingReady;
      }
      if (!window.computePrice) return;

      const m2 = deriveAreaM2(state);
      if (!m2) {
        showInlineError('Brak metrażu — wróć do kroku 2 i wybierz metraż.');
        // jeśli masz helpera do labela – odśwież pusty
        if (typeof setPriceLabel === 'function') setPriceLabel(state);
        return;
      }

      const input = toEngineInput(state);
      const res = window.computePrice({ ...input, area_m2: m2 });

      if (res && Number.isFinite(res.min) && Number.isFinite(res.max)) {
        state.price_est_min = res.min;
        state.price_est_max = res.max;
        state.areaComputed  = res.m2 ?? m2;

        const el = BODY.querySelector('.cfg-price');
        if (el) el.textContent = `${fmtPL(res.min)} – ${fmtPL(res.max)} zł brutto`;
      } else {
        showInlineError('Nie udało się policzyć widełek.');
      }
    } catch (e) {
      showInlineError((e && e.message) || 'Błąd liczenia.');
      console.warn('[price] compute error', e);
    } finally {
      // bezpiecznie, tylko jeśli istnieje
      if (typeof setPriceLabel === 'function') setPriceLabel(state);
    }
  })();


}




// ===== Utils =====
function setBusy(btn, busy){ if (!btn) return; btn.disabled = !!busy; btn.setAttribute('aria-busy', busy ? 'true' : 'false'); }
function delay(ms){ return new Promise(r => setTimeout(r, ms)); }
function esc(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }


// DEBUG: wystaw helpery do konsoli
window.__CFG_DEBUG = {
  deriveAreaM2,
  toEngineInput,
  midFromRange,
  ensurePrice
};

window.__CFG_DEBUG = { deriveAreaM2, toEngineInput, midFromRange, ensurePrice };
window.renderPrice = renderPrice;

})(); // ← domknięcie IIFE
