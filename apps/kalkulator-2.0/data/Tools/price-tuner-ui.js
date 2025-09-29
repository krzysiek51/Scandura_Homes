/* /apps/kalkulator-2.0/data/Tools/price-tuner-ui.js
   Minimal UI “gałek” do strojenia stawek.
   - bez zależności
   - zapis do localStorage
   - natychmiast aktualizuje window.SCANDURA_PRICING_DATA
   - eksport JSON (base_tables[100], multipliers.roof, storeys)
*/
(() => {
  'use strict';

  const LS_KEY = '__SC_TUNER_V1__';

  // --- mały helper: bezpieczne get/set w globalnych danych ---
  function getData() {
    const d = window.SCANDURA_PRICING_DATA || {};
    d.base_tables = d.base_tables || {};
    d.base_tables.single_family = d.base_tables.single_family || {};
    const fam = d.base_tables.single_family;
    fam.DEW = fam.DEW || {};
    fam.SSZ = fam.SSZ || {};
    fam.SSO = fam.SSO || {};
    d.multipliers = d.multipliers || {};
    d.multipliers.roof = d.multipliers.roof || { values:{} };
    d.storeys = d.storeys || {};
    d.storeys.plus_1 = d.storeys.plus_1 || { mult_structure_min:1.0, mult_structure_max:1.0, mult_mep_min:1.0, mult_mep_max:1.0, stairs_pln_min:0, stairs_pln_max:0 };
    return d;
  }
  function applyStateToGlobals(state) {
    const d = getData();
    // anchors 100 m²
    for (const sh of ['DEW','SSZ','SSO']) {
      d.base_tables.single_family[sh]['100'] = { min: state.anchor[sh].min, max: state.anchor[sh].max };
    }
    // roof mults
    d.multipliers.roof.values = d.multipliers.roof.values || {};
    for (const k of Object.keys(state.roof)) {
      d.multipliers.roof.values[k] = { ...(d.multipliers.roof.values[k]||{}), mult: state.roof[k] };
    }
    // storeys (global mnożnik względem parteru; prosty V1)
    d.storeys.__ui_global = { plus1_mult: state.storeys.plus1_mult };
    // nic nie psujemy w engine: zastosujemy multiplier przy wejściu — patrz poniżej hook
    window.SCANDURA_PRICING_DATA = d;
  }

  // --- wstrzyknięcie prostego hooka (jeśli engine V1 bez globalnego mnożnika) ---
  (function injectLinearStoreysHook(){
    const pe = window.computePrice;
    if (typeof pe !== 'function') return;
    if (pe.__tunerWrapped) return;
    window.computePrice = function(state){
      const st = { ...(state||{}) };
      try {
        const ui = JSON.parse(localStorage.getItem(LS_KEY)||'{}');
        const m = Number(ui?.storeys?.plus1_mult);
        if (st.storeys === 'plus_1' && isFinite(m) && m>0) {
          // Podbijamy tymczasowo „specjalnym” polem rozpoznawalnym przez silnik V1 lub przez naszą nakładkę:
          st.__tuner_plus1_mult = m;
        }
      } catch(_){}
      const out = pe(st);
      return out;
    };
    window.computePrice.__tunerWrapped = true;
  })();

  // --- stan domyślny z globali / localStorage ---
  function getDefaultsFromGlobals(){
    const d = getData();
    const g = (fam, sh) => {
      const r = fam[sh]?.['100'] || {};
      return { min: Number(r.min)||0, max: Number(r.max)||0 };
    };
    const fam = d.base_tables.single_family;
    const roofKeys = ['gabled_2','hip_4','flat','multi_gable','mansard','other'];
    const roof = {};
    for (const k of roofKeys) {
      const v = d.multipliers.roof.values?.[k]?.mult;
      roof[k] = (typeof v === 'number' && isFinite(v)) ? v : 1.0;
    }
    // fallback storeys multiplier
    const sMul = d.storeys.__ui_global?.plus1_mult ?? 0.95;
    return {
      anchor: {
        DEW: g(fam,'DEW'),
        SSZ: g(fam,'SSZ'),
        SSO: g(fam,'SSO'),
      },
      roof,
      storeys: { plus1_mult: sMul }
    };
  }
  function loadState(){
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch(_){}
    }
    return getDefaultsFromGlobals();
  }
  function saveState(st){
    localStorage.setItem(LS_KEY, JSON.stringify(st));
    applyStateToGlobals(st);
  }

  // --- UI ---
  function css(strings){ return strings[0]; }
  const STYLES = css`
    :host {
      all: initial;
      font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,Helvetica;
      color: #111;
    }
    .btn {
      cursor: pointer; border: 1px solid #ddd; background:#fff; padding:6px 10px; border-radius:8px;
    }
    .btn.primary { background:#111; color:#fff; border-color:#111; }
    .btn.ghost { background:transparent; }
    .fab {
      position: fixed; right: 16px; bottom: 16px; z-index: 999999;
      background:#111; color:#fff; border-radius: 12px; padding: 10px 14px; box-shadow:0 6px 24px rgba(0,0,0,.25);
      font-weight: 700; border:none;
    }
    .overlay { position: fixed; inset:0; background: rgba(0,0,0,.3); display:flex; align-items:center; justify-content:center; z-index: 999998; }
    .panel {
      width: min(880px, calc(100vw - 24px)); max-height: min(88vh, 820px); overflow:auto;
      background:#fff; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.3);
      padding:16px;
    }
    .head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    .card { border:1px solid #eee; border-radius:12px; padding:12px; }
    .row { display:grid; grid-template-columns: 170px 1fr 90px; gap:10px; align-items:center; margin: 8px 0; }
    .row input[type="range"] { width: 100%; }
    .row input[type="number"] { width: 100%; padding:6px 8px; border:1px solid #ddd; border-radius:8px; }
    .footer { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }
    .muted { color:#6b7280; font-size:12px; }
    .pill { font-weight:700; background:#111; color:#fff; border-radius:999px; padding:4px 10px; }
    .title { font-size:16px; font-weight:700; }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
      .row { grid-template-columns: 120px 1fr 80px; }
    }
  `;

  function createUI(){
    const shadowHost = document.createElement('div');
    const shadow = shadowHost.attachShadow({ mode:'open' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    // floating button
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = 'Tuner';
    shadow.appendChild(fab);

    let overlay=null;
    const openPanel = () => {
      if (overlay) return;
      const st = loadState();

      overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="panel">
          <div class="head">
            <div class="title">Tuner ceny (100 m² → liniowo × m², dach, kondygnacje)</div>
            <div class="pill">LIVE</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="title">Kotwice 100 m² (brutto)</div>
              <div class="muted">Wpisz widełki dla DEW/SSZ/SSO — kalkulator przelicza liniowo × m².</div>
              ${['DEW','SSZ','SSO'].map(sh => `
                <div class="row">
                  <div><b>${sh}</b></div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
                    <input type="number" data-k="anchor.${sh}.min" min="0" step="1000" />
                    <input type="number" data-k="anchor.${sh}.max" min="0" step="1000" />
                  </div>
                  <div class="muted">min / max</div>
                </div>
              `).join('')}
            </div>

            <div class="card">
              <div class="title">Dach — mnożniki (×)</div>
              <div class="muted">Wpływ na całość (upraszczamy do jednego mnożnika na V1).</div>
              ${[['gabled_2','Dwuspadowy'],['hip_4','Czterospadowy'],['flat','Płaski'],['multi_gable','Wielospadowy'],['mansard','Mansardowy'],['other','Inny']].map(([k,lab]) => `
                <div class="row">
                  <div>${lab}</div>
                  <input type="range" min="0.70" max="1.60" step="0.01" data-k="roof.${k}">
                  <input type="number" min="0.70" max="1.60" step="0.01" data-k="roof.${k}">
                </div>
              `).join('')}
            </div>

            <div class="card">
              <div class="title">Kondygnacje</div>
              <div class="muted">Poddasze (plus_1) jako mnożnik względem parteru. Twoje zalecenie: ~0.95.</div>
              <div class="row">
                <div>plus_1</div>
                <input type="range" min="0.85" max="1.00" step="0.01" data-k="storeys.plus1_mult">
                <input type="number" min="0.85" max="1.00" step="0.01" data-k="storeys.plus1_mult">
              </div>
            </div>

            <div class="card">
              <div class="title">Podgląd (100 m² → 140 m²)</div>
              <div class="muted">Przykładowe wyceny DEW / dach dwuspadowy.</div>
              <div class="row">
                <div>100 m² (DEW)</div>
                <div class="muted">= kotwica</div>
                <div id="pv100" style="text-align:right;font-weight:700">—</div>
              </div>
              <div class="row">
                <div>140 m² (DEW)</div>
                <div class="muted">= 1.4 × kotwica × dach × storeys</div>
                <div id="pv140" style="text-align:right;font-weight:700">—</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="muted">Zapis: localStorage + od razu aktualizacja danych w pamięci strony.</div>
            <div style="display:flex; gap:8px">
              <button class="btn ghost" id="btnReset">Reset</button>
              <button class="btn" id="btnExport">Eksportuj JSON</button>
              <button class="btn primary" id="btnClose">Zamknij</button>
            </div>
          </div>
        </div>
      `;
      shadow.appendChild(overlay);

      // ---- data binding
      const $ = (sel) => overlay.querySelector(sel);
      const setPath = (obj, path, value) => {
        const parts = path.split('.');
        let ref = obj;
        for (let i=0;i<parts.length-1;i++){
          const k = parts[i];
          ref[k] = ref[k] ?? {};
          ref = ref[k];
        }
        ref[parts[parts.length-1]] = value;
      };
      const getPath = (obj, path) => path.split('.').reduce((r,k)=>r?.[k], obj);

      // init inputs
      overlay.querySelectorAll('[data-k]').forEach(el => {
        const k = el.getAttribute('data-k');
        const v = getPath(st, k);
        if (el.type === 'range' || el.type === 'number') el.value = v ?? '';
      });

      function fmt(n){
        return (typeof n === 'number' && isFinite(n)) ? n.toLocaleString('pl-PL')+' zł' : '—';
      }
      function refreshPreview(){
        const s = loadState();
        const anchor = s.anchor.DEW; // preview tylko DEW
        const roofMult = s.roof.gabled_2 ?? 1.0;
        const storeysMult = s.storeys.plus1_mult ?? 1.0;

        const rMin = (anchor.min/100);
        const rMax = (anchor.max/100);
        const p100 = { min: anchor.min, max: anchor.max };
        const p140 = { min: rMin*140*roofMult*storeysMult, max: rMax*140*roofMult*storeysMult };
        $('#pv100').textContent = `${fmt(Math.round(p100.min))} – ${fmt(Math.round(p100.max))}`;
        $('#pv140').textContent = `${fmt(Math.round(p140.min))} – ${fmt(Math.round(p140.max))}`;
      }

      function onChange(el){
        const k = el.getAttribute('data-k');
        let val = (el.type === 'range' || el.type === 'number') ? Number(el.value) : el.value;
        if (el.type === 'range') {
          // zsynchronizuj sąsiednie number
          const sib = el.parentElement.querySelector(`input[type="number"][data-k="${k}"]`);
          if (sib) sib.value = String(val);
        }
        if (el.type === 'number') {
          const sib = el.parentElement.querySelector(`input[type="range"][data-k="${k}"]`);
          if (sib) sib.value = String(val);
        }
        // update state → save → apply
        const cur = loadState();
        setPath(cur, k, val);
        saveState(cur);
        refreshPreview();
      }

      overlay.querySelectorAll('[data-k]').forEach(el => {
        el.addEventListener('input', () => onChange(el));
        el.addEventListener('change', () => onChange(el));
      });

      // btns
      $('#btnClose').addEventListener('click', () => { overlay.remove(); overlay=null; });
      $('#btnReset').addEventListener('click', () => {
        const def = getDefaultsFromGlobals();
        saveState(def);
        overlay.remove(); overlay=null;
        openPanel();
      });
      $('#btnExport').addEventListener('click', () => {
        const s = loadState();
        const out = {
          base_tables: {
            single_family: {
              DEW: { '100': s.anchor.DEW },
              SSZ: { '100': s.anchor.SSZ },
              SSO: { '100': s.anchor.SSO },
            }
          },
          multipliers: {
            roof: { values: Object.fromEntries(Object.entries(s.roof).map(([k,v])=>[k,{ mult:v }])) }
          },
          storeys: {
            plus_1_ui: { mult: s.storeys.plus1_mult }
          }
        };
        const blob = new Blob([JSON.stringify(out,null,2)], {type:'application/json'});
        const url  = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'tuner-export.json';
        a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1000);
      });

      refreshPreview();
    };

    fab.addEventListener('click', openPanel);
    document.body.appendChild(shadowHost);
  }

  // --- uruchomienie + inicjalizacja stanu ---
  const init = () => {
    // jeśli nic nie ma w LS, zainicjuj defaultami z globali
    if (!localStorage.getItem(LS_KEY)) {
      saveState( getDefaultsFromGlobals() );
    } else {
      // dopasuj do struktury (w razie update’u)
      const cur = { ...getDefaultsFromGlobals(), ...loadState() };
      saveState(cur);
    }
    // zastosuj do globali
    applyStateToGlobals(loadState());
    // stwórz UI
    createUI();
    console.log('[Tuner] ready. Kliknij przycisk „Tuner” w prawym dolnym rogu.');
  };

  // jeśli dane gotowe – start od razu
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
