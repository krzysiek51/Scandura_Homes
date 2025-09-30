/* js/configurator/modal/configurator-price.js */
(() => {
  'use strict';
  if (window.__SCANDURA_CFG_PRICE__) return;
  window.__SCANDURA_CFG_PRICE__ = true;


  // --- GLOBAL HELPERS (wystarczą raz w całej aplikacji) ---
  window.__CFG_GET_STATE = () =>
    (window.__CFG_LAST_STATE || window.__CFG_STATE || window.__CFG?.state || {});

  window.__deriveAreaM2 = window.__deriveAreaM2 || function (state) {
    const n = (v) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.round(x) : null; };

    // 1) bezpośrednio podane liczby
    const direct =
      n(state?.area_m2) ??
      n(state?.areaExact) ??
      n(state?.area?.exact) ??
      n(state?.area?.m2);
    if (direct != null) return direct;

    // 2) pasmo z UI
    const raw = state?.areaChoice ?? state?.area?.choice ?? state?.area?.value ?? state?.area?.label ?? state?.area?.range;
    if (!raw) return null;

    const key = String(raw).replace(/\s+/g, '').replace(/[\u2010-\u2015–—−-]/g, '-').toLowerCase(); // "do-35" → "do-35"
    const map = { '0-35': 25, 'do-35': 25, '36-70': 55, '71-100': 85, '101-150': 125, '151-200': 175, '200-250': 225, '201-250': 225 };
    return map[key] ?? null;
  };


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

  const BODY = qIn('[data-cfg="body"]') || qIn('.cfg-body, main.cfg-body') || document.body;
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
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

  function midFromRange(key) {
    const map = {
      '0-35': 25,
      '36-70': 55,
      '71-100': 85,
      '101-150': 125,
      '151-200': 175,
      '200-250': 225,
      '201-250': 225
    };
    return map[key] || null;
  }

  // ——— Ustawienie labela ceny w karcie
  function setPriceLabel(state) {
    const el = BODY?.querySelector('.cfg-price');
    if (!el) return;
    const a = state?.price_est_min, b = state?.price_est_max;
    if (typeof a === 'number' && a > 0 && typeof b === 'number' && b > 0) {
      el.textContent = `${fmtPL(a)} – ${fmtPL(b)} zł brutto`;
    } else {
      el.textContent = '—';
    }
  }



  // === V2: blok przełącznika Basic/Classic/Premium + płyta ===
  function initTierBlockV2(root, initState) {
    if (!root) return;

    const $ = (s) => root.querySelector(s);

    // startowy stan (bazuje na initState)
    const state = {
      area_m2: Number(initState?.area_m2) > 0 ? Math.round(initState.area_m2) : 100,
      tier: (initState?.tier || 'basic'),
      includeSlab: (initState?.includeSlab !== false)
    };

    const tierBtnsWrap = root.querySelector('[data-price="tiers"]');
    const btns = tierBtnsWrap ? tierBtnsWrap.querySelectorAll('button[data-tier]') : [];
    const elHouse = $('[data-price="house"]');
    const elSlab = $('[data-price="slab"]');
    const elTotal = $('[data-price="total"]');
    const elVat = $('[data-price="vat"]');
    const slabToggle = $('[data-price="toggle-slab"]');

    function render() {
      if (typeof window.computePriceV2 !== 'function') return;

      const res = window.computePriceV2({
        area_m2: state.area_m2,
        tier: state.tier,
        includeSlab: !!state.includeSlab
      });

      if (elHouse) elHouse.textContent = `${res.fmt.house_min} – ${res.fmt.house_max} NETTO`;
      if (elSlab) elSlab.textContent = `${res.fmt.slab} NETTO`;
      if (elTotal) elTotal.textContent = `${res.fmt.total_min} – ${res.fmt.total_max} NETTO`;
      if (elVat) elVat.textContent = res.fmt.vat_hint;

      btns.forEach(b => b.classList.toggle('is-active', b.dataset.tier === state.tier));
      if (slabToggle) slabToggle.checked = !!state.includeSlab;
    }

    // handlery
    btns.forEach(b => b.addEventListener('click', () => {
      state.tier = b.dataset.tier || 'basic';
      // zapamiętaj w globalnym stanie, wyślij event
      (window.__CFG_LAST_STATE ||= {}).priceTier = state.tier;
      root.dispatchEvent(new CustomEvent('tier:change', { detail: { tier: state.tier } }));
      // opcj. analityka
      window.dataLayer?.push?.({ event: 'price_tier_select', tier: state.tier });
      render();
    }));

    if (slabToggle) {
      slabToggle.addEventListener('change', () => {
        state.includeSlab = !!slabToggle.checked;
        (window.__CFG_LAST_STATE ||= {}).includeSlab = state.includeSlab;
        root.dispatchEvent(new CustomEvent('slab:toggle', { detail: { includeSlab: state.includeSlab } }));
        window.dataLayer?.push?.({ event: 'price_slab_toggle', includeSlab: state.includeSlab });
        render();
      });
    }

    // API do zmiany metrażu z zewnątrz
    root.__setAreaM2 = (m2) => {
      const n = Number(m2);
      if (Number.isFinite(n) && n > 0) { state.area_m2 = Math.round(n); render(); }
    };

    render();
  }


  // === PATCH: robust area + roof/storeys/garage mapping ===

  // normalizacja "101–150 m²" -> "101-150"
  function _cleanRangeKey(s) {
    return String(s ?? '')
      .replace(/[^\d\-–— ]+/g, '')     // usuń "m²", przecinki, itp.
      .replace(/\s+/g, '')
      .replace(/[–—−]/g, '-');         // wszystkie rodzaje dashy -> '-'
  }

  // środek pasma ze stringa; fallback do LUT
  function _midFromStrRange(s) {
    const m = String(s ?? '').match(/(\d+)\D+(\d+)/);
    if (m) {
      const a = +m[1], b = +m[2];
      if (a > 0 && b > a) return Math.round((a + b) / 2);
    }
    const key = _cleanRangeKey(s);
    const LUT = { '0-35': 25, '36-70': 55, '71-100': 85, '101-150': 125, '151-200': 175, '200-250': 225 };
    return LUT[key] ?? null;
  }

  // A) deriveAreaM2 — wyprowadza area_m2 z exact/m2 lub z pasma
  function deriveAreaM2(state) {
    const pickNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    };

    // 1) najpierw twarde liczby w różnych miejscach
    const direct =
      pickNum(state?.area_m2) ??
      pickNum(state?.areaExact) ??
      pickNum(state?.area?.exact) ??
      pickNum(state?.area?.m2);
    if (direct != null) return direct;

    // 2) pasmo z UI: choice/value/label/range itp.
    const rawBand =
      state?.areaChoice ??
      state?.area?.choice ??
      state?.area?.value ??
      state?.area?.label ??
      state?.area?.range;
    if (!rawBand) return null;

    const asStr = String(rawBand).trim();
    // a) jeśli wygląda jak zakres, policz środek (np. "101–150 m²" → 126)
    const m = asStr.match(/(\d+)\D+(\d+)/);
    if (m) {
      const a = +m[1], b = +m[2];
      if (a > 0 && b > a) return Math.round((a + b) / 2);
    }

    // b) normalizacja skrótów/kluczy UI
    const bandKey = asStr
      .replace(/\s+/g, '')
      .replace(/[\u2010-\u2015–—−-]/g, '-')
      .toLowerCase();

    // c) LUT dla nazw własnych i edge-case'ów z kroku 2
    const map = {
      'do-35': 25,   // "Do 35" → 0–35
      '0-35': 25,
      '36-70': 55,
      '71-100': 85,
      '101-150': 125,
      '151-200': 175,
      '200-250': 225,
      '201-250': 225   // obsłuż nowy preset
    };

    return map[bandKey] ?? null;
  }


  // helper: normalizacja tekstu PL -> klucz
  function _normKey(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[._]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // mapy etykiet -> klucze silnika
  const ROOF_FROM_LABEL = {
    // bazowe
    'dwuspadowy': 'gabled_2', 'dwu spadowy': 'gabled_2',
    'czterospadowy': 'hip_4', 'cztero spadowy': 'hip_4', 'hip 4': 'hip_4',
    'plaski': 'flat', 'płaski': 'flat', 'plaski dach': 'flat',
    // nowe
    'wielospadowy': 'multi_gable', 'wielo spadowy': 'multi_gable',
    'mansardowy': 'mansard', 'dach mansardowy': 'mansard',
    'inny': 'other', 'pozostaly': 'other', 'pozostały': 'other'
  };

  const GARAGE_FROM_LABEL = {
    'bez garazu': 'none', 'bez garażu': 'none', 'bez garazu.': 'none',
    'w bryle (1-stan.)': 'attached_1', '1 stan w bryle': 'attached_1',
    'w bryle (2-stan.)': 'attached_2', '2 stan w bryle': 'attached_2',
    'wolnostojacy': 'detached_1', 'wolnostojący': 'detached_1', 'wolno stojacy': 'detached_1'
  };
  const SHELL_FROM_LABEL = {
    'deweloperski': 'DEW', 'pod klucz': 'DEW',
    'ssz': 'SSZ', 'stan surowy zamkniety': 'SSZ', 'stan surowy zamknięty': 'SSZ',
    'sso': 'SSO', 'stan surowy otwarty': 'SSO'
  };
  const STOREYS_FROM_LABEL = {
    'parter': 'parter', 'parterowy': 'parter',
    'z poddaszem': 'plus_1', '1 pietro': 'plus_1', '1 piętro': 'plus_1', 'plus 1': 'plus_1'
  };

  // >>> PODMIEN TO: adapter stanu z UI -> wejście silnika (z mapowaniem etykiet)
  // Adapter: stan z UI -> wejście silnika (z mapowaniem PL -> kody)
  function toEngineInput(state) {
    const pick = (x) => (x && (x.key ?? x.value ?? x.label)) || (typeof x === 'string' ? x : '');

    // --- shell/scope -> DEW/SSZ/SSO
    const rawShell = pick(state.shell) || pick(state.scope) || '';
    let shell = rawShell.toUpperCase();
    if (!['DEW', 'SSZ', 'SSO'].includes(shell)) {
      const s = _normKey(rawShell);
      shell = (SHELL_FROM_LABEL && SHELL_FROM_LABEL[s]) || (s.includes('klucz') ? 'DEW'
        : s.includes('zamkn') || s.includes('ssz') ? 'SSZ'
          : s.includes('otwar') || s.includes('sso') ? 'SSO'
            : 'DEW');
    }

    // --- roof (dach)
    const rawRoof = pick(state.roof);
    let roof = rawRoof;
    if (!['gabled_2', 'hip_4', 'flat'].includes(roof)) {
      const rk = _normKey(rawRoof);
      roof = (ROOF_FROM_LABEL && ROOF_FROM_LABEL[rk]) || 'gabled_2';
    }

    // --- storeys (kondygnacje)
    const rawStoreys = pick(state.storeys);
    let storeys = rawStoreys;
    if (!['parter', 'plus_1'].includes(storeys)) {
      const sk = _normKey(rawStoreys);
      storeys = (STOREYS_FROM_LABEL && STOREYS_FROM_LABEL[sk]) || 'parter';
    }

    // --- garage (garaż)
    const rawGarage = pick(state.garage);
    let garage = rawGarage || 'none';
    if (!['none', 'attached_1', 'attached_2', 'detached_1'].includes(garage)) {
      const gk = _normKey(rawGarage);
      garage = (GARAGE_FROM_LABEL && GARAGE_FROM_LABEL[gk]) || 'none';
    }

    // --- miasto
    const city = state.location?.city || state.city || 'Gdańsk';

    return { shell, roof, storeys, garage, city };
  }




  // Normalizacja stanu (zgodna z Twoją strukturą i starszą)
  function normChoice(x) {
    if (!x) return { label: '', key: '' };
    if (typeof x === 'string') return { label: x, key: x };
    if (typeof x === 'object') {
      const label = x.label ?? x.value ?? '';
      const key = x.key ?? x.value ?? '';
      return { label: String(label), key: String(key) };
    }
    return { label: '', key: '' };
  }
  function normArea(area) {
    if (area == null) return { exact: null, choice: '' };
    if (typeof area === 'number') return { exact: area, choice: '' };
    if (typeof area === 'string') return { exact: null, choice: area };
    if (typeof area === 'object') {
      if (area.type === 'exact') return { exact: Number(area.value) || null, choice: '' };
      if (area.type === 'preset') return { exact: null, choice: String(area.value || '') };
    }
    return { exact: null, choice: '' };
  }
  function normStart(start) {
    if (!start) return { label: '', date: '' };
    if (typeof start === 'object') return { label: start.label || '', date: start.date || '' };
    if (typeof start === 'string') {
      const map = { asap: 'ASAP', '1m': 'w miesiącu', '3m': 'w 3 mies.', '6m': 'w 6 mies.', agree: 'do uzgodnienia' };
      return { label: map[start] || start, date: '' };
    }
    return { label: '', date: '' };
  }
  function normShell(state) {
    const src = state.shell ?? state.scope;
    return normChoice(src);
  }
  function normAll(state) {
    const building = normChoice(state.building);
    const roof = normChoice(state.roof);
    const shell = normShell(state);
    const area = normArea(state.area ?? (state.areaExact != null ? { type: 'exact', value: state.areaExact } : { type: 'preset', value: state.areaChoice }));
    const start = normStart(state.start);
    const city = state.location?.city || '';
    const country = state.location?.country || '';
    return { building, roof, shell, area, start, city, country };
  }
  // zwięzłe przycięcie opisu do maila
  function clip(s, n = 160) {
    s = String(s || '').trim();
    return s.length > n ? (s.slice(0, n - 1) + '…') : s;
  }

  // NOWA wersja: pełne podsumowanie 1–8 (zgodne z krokami)
  function summaryFromNorm(n, state = window.__CFG_LAST_STATE || window.__CFG_STATE || {}) {
    const pick = (x) => (x && (x.key ?? x.value ?? x.label)) || (typeof x === 'string' ? x : '');

    const ROOF_MAP = { gabled_2: 'dwuspadowy', hip_4: 'czterospadowy', flat: 'płaski' };
    const GARAGE_MAP = { none: 'bez garażu', attached_1: 'w bryle (1-stan.)', attached_2: 'w bryle (2-stan.)', detached_1: 'wolnostojący (1-stan.)' };
    const SHELL_MAP = { DEW: 'pod klucz', SSZ: 'stan surowy zamknięty', SSO: 'stan surowy otwarty' };
    const STOREYS_MAP = { parter: 'parterowy', plus_1: 'z poddaszem / 1 piętro' };

    // metraż (exact albo pasmo)
    const m2 = (n.area.exact != null) ? `${n.area.exact} m²` : (n.area.choice || '—');

    // kody techniczne z raw state
    const roofKey = pick(state.roof) || 'gabled_2';
    const garageKey = pick(state.garage) || 'none';
    let shellRaw = pick(state.shell) || pick(state.scope) || 'DEW';
    let shellKey = String(shellRaw).toUpperCase();
    if (!['DEW', 'SSZ', 'SSO'].includes(shellKey)) {
      const s = String(shellRaw).toLowerCase();
      shellKey = s.includes('zamk') || s.includes('ssz') ? 'SSZ'
        : s.includes('otwar') || s.includes('sso') ? 'SSO'
          : 'DEW';
    }
    const storeysKey = pick(state.storeys) === 'plus_1' ? 'plus_1' : 'parter';

    // opis + załączniki
    const notes = (state.notes || '').trim();
    const atts = Array.isArray(state.attachments) ? state.attachments : [];
    const attInfo = atts.length
      ? (atts.map(a => a?.file?.name).filter(Boolean).slice(0, 3).join(', ') + (atts.length > 3 ? ` +${atts.length - 3}` : ''))
      : 'brak';

    // kontakt
    const C = state.contact || {};
    const contactTxt = [C.name, C.email, (C.phone || '').trim()].filter(Boolean).join(' • ') || '—';

    // wiersze 1–8
    const rows = [
      ['1. Rodzaj budynku', n.building.label || 'jednorodzinny'],
      ['2. Powierzchnia użytkowa', m2],
      ['3. Rodzaj dachu', ROOF_MAP[roofKey] || n.roof.label || '—'],
      ['4. Zakres zlecenia', SHELL_MAP[shellKey] || '—'],
      ['5. Opis i załączniki', (notes ? clip(notes) : '—') + '  •  Załączniki: ' + attInfo],
      ['6. Planowany start', n.start.label || n.start.date || '—'],
      ['7. Lokalizacja budowy', [n.city, n.country].filter(Boolean).join(', ') || '—'],
      ['8. Dane kontaktowe', contactTxt],
      // dodatki (nienumerowane):
      ['Kondygnacje', STOREYS_MAP[storeysKey] || '—'],
      ['Garaż', GARAGE_MAP[garageKey] || '—'],
    ];

    // jednowierszowy string do Formspree
    return rows.map(([k, v]) => `${k.replace(/^\d+\.\s*/, '')}: ${v}`).join(' | ');
  }


  // B) ensurePrice — czeka na dane, wyprowadza area_m2 i dopiero liczy; błędy pokazuje w UI
  function ensurePrice(state) {

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
        state.areaComputed = est.m2 ?? areaM2;
        if (BODY?.getAttribute('data-view') === 'price') renderPrice(state);
      } else if (!state.areaExact && state.areaChoice) {
        state.areaComputed = midFromRange(state.areaChoice);
      }
    } catch (e) {
      const msg = (e && (e.message || e.toString())) || 'Błąd liczenia.';
      showInlineError(msg);
      console.warn('[price] compute error', e);
    }
  }

  function priceLabel(state) {
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
  // ===== Szczegóły w stylu "Szczegóły zapytania" =====
  function openDetails(state, source = 'price') {
    // 1) normalizacja i pomocnicze mapy PL
    const N = normAll(state);
    const pick = (x) => (x && (x.key ?? x.value ?? x.label)) || (typeof x === 'string' ? x : '');

    // mapy: kody -> ładne etykiety
    const ROOF_MAP = { gabled_2: 'dwuspadowy', hip_4: 'czterospadowy', flat: 'płaski' };
    const GARAGE_MAP = { none: 'bez garażu', attached_1: 'w bryle (1-stan.)', attached_2: 'w bryle (2-stan.)', detached_1: 'wolnostojący (1-stan.)' };
    const SHELL_MAP = { DEW: 'pod klucz', SSZ: 'stan surowy zamknięty', SSO: 'stan surowy otwarty' };
    const STOREYS_MAP = { parter: 'parterowy', plus_1: 'z poddaszem / 1 piętro' };

    // --- ROOF: akceptuj zarówno kody silnika jak i polskie etykiety
    (function ensureRoofMapsExist() {
      // wykorzystujemy słownik z góry pliku: ROOF_FROM_LABEL (etykieta -> kod)
      // jeśli go nie ma, to i tak zadziała fallback na N.roof.label
    })();
    const rawRoof = pick(state.roof);
    const roofCode = (['gabled_2', 'hip_4', 'flat'].includes(rawRoof))
      ? rawRoof
      : ((typeof _normKey === 'function' && typeof ROOF_FROM_LABEL === 'object')
        ? (ROOF_FROM_LABEL[_normKey(rawRoof)] || 'gabled_2')
        : 'gabled_2'
      );
    const roofLabel = ROOF_MAP[roofCode] || N.roof.label || rawRoof || '—';

    // --- SHELL: akceptuj DEW/SSZ/SSO oraz PL etykiety
    let shellRaw = pick(state.shell) || pick(state.scope) || 'DEW';
    let shellKey = String(shellRaw).toUpperCase();
    if (!['DEW', 'SSZ', 'SSO'].includes(shellKey)) {
      const s = (typeof _normKey === 'function') ? _normKey(shellRaw) : String(shellRaw).toLowerCase();
      shellKey = (typeof SHELL_FROM_LABEL === 'object' && SHELL_FROM_LABEL[s]) || (
        s.includes('zamk') || s.includes('ssz') ? 'SSZ' :
          s.includes('otwar') || s.includes('sso') ? 'SSO' : 'DEW'
      );
    }

    // --- STOREYS: akceptuj kod i PL
    const rawStoreys = pick(state.storeys);
    let storeysKey = ['parter', 'plus_1'].includes(rawStoreys)
      ? rawStoreys
      : (typeof STOREYS_FROM_LABEL === 'object' && typeof _normKey === 'function'
        ? (STOREYS_FROM_LABEL[_normKey(rawStoreys)] || 'parter')
        : 'parter');

    // --- GARAGE: akceptuj kod i PL
    const rawGarage = pick(state.garage) || 'none';
    let garageKey = ['none', 'attached_1', 'attached_2', 'detached_1'].includes(rawGarage)
      ? rawGarage
      : (typeof GARAGE_FROM_LABEL === 'object' && typeof _normKey === 'function'
        ? (GARAGE_FROM_LABEL[_normKey(rawGarage)] || 'none')
        : 'none');

    // --- AREA: pokazuj exact, pasmo, albo wyliczony środek gdy brak
    const areaTxt = (N.area.exact != null)
      ? `${N.area.exact} m²`
      : (N.area.choice || (function () {
        const m = (typeof deriveAreaM2 === 'function') ? deriveAreaM2(state) : null;
        return m ? `${m} m²` : '—';
      })());

    const cityTxt = [N.city, N.country].filter(Boolean).join(', ') || '—';
    const startTxt = N.start.label || N.start.date || '—';
    const priceTxt = priceLabel(state);

    // 2) wiersze 1–8 + dodatki (tak jak oczekujesz)
    const notes = (state.notes || '').trim();
    const atts = Array.isArray(state.attachments) ? state.attachments : [];
    const attInfo = atts.length
      ? (atts.map(a => a?.file?.name).filter(Boolean).slice(0, 3).join(', ') + (atts.length > 3 ? ` +${atts.length - 3}` : ''))
      : 'brak';
    const C = state.contact || {};
    const contactTxt = [C.name, C.email, (C.phone || '').trim()].filter(Boolean).join(' • ') || '—';

    const rows = [
      ['1. Rodzaj budynku', N.building.label || 'jednorodzinny'],
      ['2. Powierzchnia użytkowa', areaTxt],
      ['3. Rodzaj dachu', roofLabel],
      ['4. Zakres zlecenia', SHELL_MAP[shellKey] || '—'],
      ['5. Opis i załączniki', (notes || '—') + '  •  Załączniki: ' + attInfo],
      ['6. Planowany start', startTxt],
      ['7. Lokalizacja budowy', cityTxt],
      ['8. Dane kontaktowe', contactTxt],
      // dodatki (nienumerowane)
      ['Kondygnacje', STOREYS_MAP[storeysKey] || '—'],
      ['Garaż', GARAGE_MAP[garageKey] || '—'],
    ];

    // 3) (opcjonalnie) audit kroków liczenia — rozwijany
    let auditHTML = '';
    try {
      const aM2 = (typeof deriveAreaM2 === 'function') ? deriveAreaM2(state) : null;
      if (aM2 != null && typeof window.computePrice === 'function') {
        const est = window.computePrice({ ...toEngineInput(state), area_m2: aM2 });
        const items = (est.audit || []).map(a => `<li><code>${esc(a.step)}</code></li>`).join('');
        auditHTML = items
          ? `<details class="cfg-audit"><summary>Jak to liczymy (audit)</summary><ul>${items}</ul></details>`
          : '';
      }
    } catch (_) { }

    // 4) render widoku
    BODY.setAttribute('data-view', 'details');
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

    /* lekki styl V2 (guziki wariantów) */
    .price-step__tiers{display:grid;grid-auto-flow:column;gap:8px;margin-bottom:10px}
    .price-step__tiers .is-active{outline:2px solid #DC9B59}
    .cfg-tier-block{background:#fff;border-radius:14px;padding:12px;box-shadow:0 1px 0 rgba(0,0,0,.06);margin-top:12px}
    .cfg-tier-block .cfg-row{display:flex;justify-content:space-between;align-items:center;border:0;padding:6px 0}
    .cfg-tier-block hr{border:none;border-top:1px solid #eee;margin:8px 0}
    .cfg-tier-block .price-vat{opacity:.7;font-size:.9rem;margin-top:4px}
  </style>

  <div class="cfg-details-card">
    <div class="cfg-head">
      <h3>Szczegóły wyceny</h3>
      <div class="cfg-pill">${esc(priceTxt)}</div>
    </div>

    <div class="cfg-table">
      ${rows.map(([l, v]) => `
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

  <!-- V2: warianty Basic/Classic/Premium + płyta (NETTO) w widoku Szczegóły -->
  <section id="v2-tier-details" class="cfg-tier-block" aria-label="Porównaj pakiety">
    <div class="price-step__tiers" data-price="tiers">
    <button type="button" data-tier="basic"   class="cfg-btn cfg-btn--ghost is-active">Basic</button>
    <button type="button" data-tier="classic" class="cfg-btn cfg-btn--ghost">Comfort</button>
    <button type="button" data-tier="premium" class="cfg-btn cfg-btn--ghost">Premium</button>
    </div>

    <!-- TU — POD TĄ BELKĄ Z PAKIETAMI -->
    <div style="display:flex;justify-content:flex-end;margin:-6px 0 8px">
      <button type="button" class="cfg-link" data-cfg="open-price-table">Tabela cenowa</button>
    </div>


    <div class="cfg-row">
      <span>Dom (bez płyty):</span>
      <strong data-price="house">—</strong>
    </div>
    <div class="cfg-row">
      <label style="display:flex;gap:8px;align-items:center">
        <input type="checkbox" data-price="toggle-slab" checked> Płyta fundamentowa
      </label>
      <strong data-price="slab">—</strong>
    </div>
    <hr>
    <div class="cfg-row">
      <span><b>Suma</b>:</span>

      <strong data-price="total" style="font-size:1.05rem">—</strong>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px">
  <button class="cfg-link" data-cfg="open-price-table">Tabela cenowa</button>
</div>

    <div class="price-vat" data-price="vat"></div>
  </section>
`;
// po BODY.innerHTML = `...`
placePriceLinkAboveTiers(document.getElementById('v2-tier-details'));

    // ——— Inicjalizacja bloku V2 pod „Szczegóły”
    try {
      const tierRoot = BODY.querySelector('#v2-tier-details');
      if (tierRoot && typeof window.computePriceV2 === 'function') {
        const m2 = (typeof deriveAreaM2 === 'function' ? deriveAreaM2(state) : null) || 100;
        // initTierBlockV2 musi być zdefiniowane (dodałem je wyżej w pliku, pod setPriceLabel)
        initTierBlockV2(tierRoot, { area_m2: m2, tier: 'basic', includeSlab: true });

        // jeśli gdzieś w aplikacji zmienia się metraż po wejściu w Szczegóły:
        window.__onAreaChanged = (newM2) => tierRoot.__setAreaM2?.(newM2);
      }
    } catch (e) {
      console.warn('[V2 tier details] init error', e);
    }


    // 5) akcje
    BODY.querySelector('[data-cfg="details-back"]')?.addEventListener('click', () => renderPrice(state));
    BODY.querySelector('[data-cfg="details-close"]')?.addEventListener('click', () => renderPrice(state));
  }



  // ===== Szybkie wysłanie do konsultanta =====
  async function sendImmediate(state) {
    const btn = BODY.querySelector('[data-cfg="send-now"]');
    setBusy(btn, true);

    // ping tylko, żeby zaznaczyć „wyślij teraz”
    const N = normAll(state);
    const fd = new FormData();
    fd.append('stage', 'price_card');
    fd.append('fast_send', 'true');
    fd.append('summary', summaryFromNorm(N));
    fd.append('name', state.contact?.name || '');
    fd.append('email', state.contact?.email || '');
    if (state.contact?.phone) fd.append('phone', state.contact.phone);
    fd.append('price_label', priceLabel(state));
    fd.append('state_json', JSON.stringify(state));

    try {
      if (DEV_SIMULATE_SUCCESS) {
        await delay(250);
        setBusy(btn, false);
        return showThanks(state, 'Dziękujemy! Zgłoszenie trafiło do konsultanta. Skontaktujemy się wkrótce.');
      }
      const resp = await fetch(FORMSPREE_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd });
      let data = null; try { data = await resp.clone().json(); } catch { }
      if (!resp.ok) throw new Error(`Formspree HTTP ${resp.status}`);
      setBusy(btn, false);
      showThanks(state, 'Dziękujemy! Zgłoszenie trafiło do konsultanta. Skontaktujemy się wkrótce.');
    } catch (e) {
      console.error(e);
      setBusy(btn, false);
      showInlineError('Błąd wysyłki. Spróbuj ponownie.');
    }
  }

  function showInlineError(msg) {
    let box = BODY.querySelector('[data-cfg="price-error"]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-cfg', 'price-error');
      box.className = 'cfg-error';
      BODY.appendChild(box);
    }
    box.textContent = msg || '';
    box.style.marginTop = '8px';
  }

  function showThanks(state, text) {
    BODY.setAttribute('data-view', 'thanks');
    BODY.innerHTML = `
      <div class="cfg-thanks">
        <h3>Dziękujemy!</h3>
        <p>${esc(text)}</p>
        <div style="margin-top:12px">
          <button class="cfg-btn cfg-btn--primary" data-cfg="back-price">Wróć do wyceny</button>
        </div>
      </div>
    `;
    BODY.querySelector('[data-cfg="back-price"]')?.addEventListener('click', () => renderPrice(state));
  }


// ===== Move "Tabela cenowa" above the tier buttons (all MQ) + dedupe =====
// ===== Move "Tabela cenowa" where it belongs (price: in header row, details: above tiers) + dedupe =====
function placePriceLinkAboveTiers(root) {
  if (!root) return;

  // We will reuse (and dedupe) the same link
  const links = Array.from(root.querySelectorAll('[data-cfg="open-price-table"]'));
  if (!links.length) return;
  const primary = links[0];
  const wrap = primary.closest('div') || primary;
  links.slice(1).forEach(l => (l.closest('div') || l).remove()); // remove duplicates

  // 1) PRICE CARD (#v2-tier): put link in the same row as "Ulepsz wycenę", on the right
  if (root.id === 'v2-tier') {
    const actionsRow = root.closest('.cfg-price-card')?.querySelector('[data-cfg="ai-enhance"]')?.parentElement;
    if (actionsRow) {
      // make the row flex and push link to the right
      actionsRow.style.display = 'flex';
      actionsRow.style.alignItems = 'center';
      actionsRow.style.gap = '12px';
      actionsRow.style.flexWrap = 'wrap';

      wrap.style.margin = '0 0 0 auto';     // shove to the right
      wrap.style.display = 'block';
      actionsRow.appendChild(wrap);
      return;
    }
  }

  // 2) DETAILS (#v2-tier-details): keep it ABOVE the tier buttons
  const tiers = root.querySelector('.price-step__tiers');
  if (!tiers) return;

  if (tiers.previousElementSibling !== wrap) {
    tiers.parentNode.insertBefore(wrap, tiers);
  }
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'flex-start';
  wrap.style.margin = '0 0 10px';
}





  function renderPrice(state) {
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

    // ===== Globalny handler "Tabela cenowa" (działa w Price & Details) =====
(function attachPriceTableHandlerOnce(){
  if (window.__CFG_PRICE_TABLE_BOUND__) return;
  window.__CFG_PRICE_TABLE_BOUND__ = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-cfg="open-price-table"]');
    if (!btn) return;

    const base = (window.__CFG_LAST_STATE || window.__CFG_STATE || {});
    const area = (typeof deriveAreaM2 === 'function' ? deriveAreaM2(base) : null) || 100;
    const tier = base.priceTier || 'basic';
    const slab = (base.includeSlab ?? true);

    if (typeof window.openPriceTable === 'function') {
      window.openPriceTable({ ...base, area_m2: area, tier, includeSlab: slab });
    } else {
      console.warn('openPriceTable() nie jest dostępne');
    }
  }, { capture:false, passive:true });
})();

// ===== Popup z tabelą cenową (MODAL/PORTAL) =====
window.openPriceTable = window.openPriceTable || (function () {
  // computePriceV2 -> dane liczbowe
  function computeFor(tier, area_m2, includeSlab) {
    if (typeof window.computePriceV2 !== 'function') return null;
    const r = window.computePriceV2({ tier, area_m2, includeSlab });
    const dn = r?.breakdown_display_net || r?.breakdown_net || {};
    return {
      total_min_num: dn.total_min ?? null,
      total_max_num: dn.total_max ?? null,
      vat_hint: r?.fmt?.vat_hint ?? ''
    };
  }
  const TIER_LABELS = { basic: 'BASIC', classic: 'COMFORT', premium: 'PREMIUM' };
  const nf0 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
  function mid(a, b){ const x=+a||0,y=+b||0; return x&&y ? (x+y)/2 : (y||x||0); }

  // Sekcje i features (to samo co wcześniej – treść łatwo zmienisz)
const FEATURES = [
  { title: 'Konstrukcja – Drewno', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Konstrukcja – Płyta Fermacell (poszycie)', values: { basic: '✓', classic: '✓', premium: '✓' } },

  { title: 'Pokrycie dachu z rynnami', values: { basic: 'Blacha', classic: 'blacha', premium: 'Dachówka' } },
  { title: 'Elewacja lamel', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Parapety zewnętrzne', values: { basic: 'Stalowe', classic: 'Stalowe', premium: 'Granitowe' } },

  { title: 'Stolarka okienna i drzwiowa', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Okna dachowe', values: { basic: '✓', classic: '✓', premium: '✓' } },

  { title: 'Instalacja elektryczna', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Instalacja wod.-kan.', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Instalacja C.O.', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Wentylacja (naturalna, grawitacyjna)', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Rekuperacja', values: { basic: '—', classic: '✓', premium: '✓' } },
  { title: 'Komin', values: { basic: '—', classic: '✓', premium: '✓' } },

  { title: 'Płyta Fermacell / G-K', values: { basic: 'Płyta G-K', classic: 'Fermacell', premium: 'Fermacell' } },
  { title: 'Posadzki parter', values: { basic: '✓', classic: '✓', premium: '✓' } },
  { title: 'Termoizolacja (U)', values: { basic: 'U=0,16', classic: 'U=0,14', premium: 'U=0,11' } },
  { title: 'Dodatkowa termoizolacja', values: { basic: '—', classic: '—', premium: '✓' } },
  { title: 'Schody', values: { basic: '—', classic: '✓', premium: '✓' } }
];

function featureRows() {
  const cell = (val) => {
    if (val === '✓') return `<span class="ptm__check" aria-label="tak">✓</span>`;
    if (val === '—' || val === '-') return `<span class="ptm__dash">—</span>`;
    return String(val ?? '');
  };
  const rows = Array.isArray(FEATURES) ? FEATURES : [];

  return rows.map((item) => {
    // Usuwamy wsparcie dla separatorów (nie używamy już item.sep)
    const titleFull  = item.title || '';
    const titleShort = item.short || item.title || '';
    const subtitle   = item.subtitle ? `<small class="ptm__sub">${item.subtitle}</small>` : '';

    return `
      <tr class="ptm__row">
        <td class="col-h">
          <span class="ptm__title-full">${titleFull}</span>
          <span class="ptm__title-short">${titleShort}</span>
          ${subtitle}
        </td>
        <td class="col-b">${cell(item.values?.basic)}</td>
        <td class="col-c">${cell(item.values?.classic)}</td>
        <td class="col-p">${cell(item.values?.premium)}</td>
      </tr>
    `;
  }).join('');
}


  // Budowa DOM
function buildModal({ area_m2, includeSlab, rows }) {
  const price = {
    basic:   mid(rows.basic?.total_min_num,   rows.basic?.total_max_num),
    classic: mid(rows.classic?.total_min_num, rows.classic?.total_max_num),
    premium: mid(rows.premium?.total_min_num, rows.premium?.total_max_num)
  };

  const wrap = document.createElement('div');
  wrap.className = 'ptm-overlay';

  wrap.innerHTML = `
    <div class="ptm" role="dialog" aria-modal="true" tabindex="-1" aria-label="Tabela cenowa">
      <div class="ptm__head">
        <div>
          <h3 class="ptm__title">Tabela cenowa</h3>
          <div class="ptm__meta">
            Metraż: <b>${nf0.format(area_m2)} m²</b> •
            Płyta fundamentowa: <b>${includeSlab ? 'tak' : 'nie'}</b>
          </div>
        </div>
        <button class="ptm__close" type="button" data-close aria-label="Zamknij">✕</button>
      </div>

      <div class="ptm__body">
        <div class="ptm__table-wrap">
          <table class="ptm__table" role="table" aria-label="Tabela pakietów">
            <thead>
              <tr>
                <th class="col-h"></th>
                <th class="col-b">${TIER_LABELS.basic}</th>
                <th class="col-c">${TIER_LABELS.classic}</th>
                <th class="col-p">${TIER_LABELS.premium}</th>
              </tr>
            </thead>
            <tbody>
              ${featureRows()}
            </tbody>
          </table>
        </div>

        <!-- KARTY CEN POD TABELĄ -->
        <div class="ptm__prices">
          <div class="ptm__card">
            <h4>${TIER_LABELS.basic}</h4>
            <div class="price">${nf0.format(price.basic)} zł/netto</div>
          </div>
          <div class="ptm__card">
            <h4>${TIER_LABELS.classic}</h4>
            <div class="price">${nf0.format(price.classic)} zł/netto</div>
          </div>
          <div class="ptm__card">
            <h4>${TIER_LABELS.premium}</h4>
            <div class="price">${nf0.format(price.premium)} zł/netto</div>
          </div>
        </div>

        <p class="ptm__note">Podane ceny są cenami netto: budownictwo mieszkaniowe +8% VAT.</p>
      </div>
    </div>
  `;

  return wrap;
}


  function open(params) {
    const area_m2 = Math.round(Number(params?.area_m2) || 100);
    const includeSlab = !!params?.includeSlab;

    const rows = {
      basic: computeFor('basic', area_m2, includeSlab),
      classic: computeFor('classic', area_m2, includeSlab),
      premium: computeFor('premium', area_m2, includeSlab)
    };

    // wyczyść poprzednie
    document.querySelectorAll('.ptm-overlay').forEach(n => n.remove());

    // PORTAL do <body> z bardzo wysokim z-index
    const overlay = buildModal({ area_m2, includeSlab, rows });
    document.body.appendChild(overlay);

    // z-index > główny modal (podbijamy mocno)
    overlay.style.zIndex = '100000';

    // Zablokuj tło i uśpij główny modal
    const rootModal = document.getElementById('cfg-modal') || document.querySelector('.cfg-modal');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const hadAriaHidden = rootModal?.hasAttribute('aria-hidden');
    const prevInert = rootModal?.inert;
    if (rootModal) {
      rootModal.setAttribute('aria-hidden', 'true');
      try { rootModal.inert = true; } catch(_) {}
    }

    // Zamknięcie + focus/ESC/outside
    const dialog = overlay.querySelector('.ptm');
    const btnClose = overlay.querySelector('[data-close]');
    setTimeout(() => dialog?.focus(), 0);

    function cleanup() {
      overlay.remove();
      document.body.style.overflow = prevOverflow || '';
      if (rootModal) {
        if (!hadAriaHidden) rootModal.removeAttribute('aria-hidden');
        try { rootModal.inert = prevInert || false; } catch(_) {}
      }
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOutside);
    }
    function onKey(e){ if (e.key === 'Escape') cleanup(); }
    function onOutside(e){ if (e.target === overlay) cleanup(); }
    btnClose?.addEventListener('click', cleanup, { once:true });
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', onOutside);
  }

  return open;
})();


    // 2) UI (nagłówek, progress, stopka)
    setTitle?.('Cześć! Chcesz ulepszyć wycenę?');
    setProgress?.(100);
    if (BTN_NEXT) { BTN_NEXT.hidden = true; BTN_NEXT.onclick = null; }
    if (BTN_SKIP) { BTN_SKIP.hidden = true; BTN_SKIP.onclick = null; }
    if (BTN_PREV) { BTN_PREV.hidden = true; BTN_PREV.onclick = null; }

    BODY.setAttribute('data-view', 'price');
    BODY.innerHTML = `
  <section class="cfg-price-card" style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:flex-start">
      <button class="cfg-btn cfg-btn--primary" data-cfg="ai-enhance" style="white-space:nowrap">
        ✨ Ulepsz wycenę
      </button>
    </div>

    <!-- WARIANTY + PŁYTA (główna karta) -->
    <section id="v2-tier" class="cfg-tier-block"
             aria-label="Warianty cenowe"
             style="margin-top:4px;background:#fff;border-radius:14px;padding:12px;box-shadow:0 1px 0 rgba(0,0,0,.06)">
      <div class="price-step__tiers" data-price="tiers"
           style="display:grid;grid-auto-flow:column;gap:8px;margin-bottom:10px">
        <button type="button" data-tier="basic"   class="cfg-btn cfg-btn--ghost is-active">Basic</button>
        <button type="button" data-tier="classic" class="cfg-btn cfg-btn--ghost">Classic</button>
        <button type="button" data-tier="premium" class="cfg-btn cfg-btn--ghost">Premium</button>
      </div>

      <div style="display:flex;justify-content:flex-end;margin:-6px 0 8px">
        <button type="button" class="cfg-link" data-cfg="open-price-table">Tabela cenowa</button>
      </div>

      

      <div class="cfg-row" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <span>Dom (bez płyty):</span>
        <strong data-price="house">—</strong>
      </div>

      <div class="cfg-row" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <label style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" data-price="toggle-slab" checked> Płyta fundamentowa
        </label>
        <strong data-price="slab">—</strong>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:8px 0">

      <div class="cfg-row" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
        <span data-price="total-label"><b>SZACUNKOWA CENA BASIC Z PŁYTĄ FUNDAMENTOWĄ</b>:</span>
        <strong data-price="total" style="font-size:1.05rem">—</strong>
      </div>
      <div class="price-vat" data-price="vat" style="opacity:.75;font-size:.92rem;margin-top:4px">
        +8% VAT (budownictwo mieszkaniowe)
      </div>
    </section>

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

// po wyrenderowaniu karty: zrób górny pasek akcji
(function alignTopBar(){
  const card = document.querySelector('.cfg-price-card');
  if (!card) return;

  // div z przyciskiem "Ulepsz wycenę"
  const left = card.querySelector('[data-cfg="ai-enhance"]')?.closest('div');
  // wrapper linku "Tabela cenowa" (po naszym earlier move helperze)
  const right = card.querySelector('[data-cfg="open-price-table"]')?.closest('div');

  if (!left || !right) return;

  // stwórz wspólny pasek, jeżeli jeszcze go nie ma
  if (!card.querySelector('.cfg-price-card__top')){
    const bar = document.createElement('div');
    bar.className = 'cfg-price-card__top';
    left.replaceWith(bar);
    bar.appendChild(left);
    bar.appendChild(right);
  }
})();


// po BODY.innerHTML = `...`
placePriceLinkAboveTiers(document.getElementById('v2-tier'));


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

    // 5) obliczenia ceny: V1 fallback (nie pokazujemy – label nadpisze V2)
    (async () => {
      try {
        if (!window.computePrice || !window.SCANDURA_PRICING_DATA) {
          if (window.whenPricingReady?.then) await window.whenPricingReady;
        }
        if (!window.computePrice) return;

        const m2 = deriveAreaM2(state);
        if (!m2) {
          showInlineError('Brak metrażu — wróć do kroku 2 i wybierz metraż.');
          if (typeof setPriceLabel === 'function') setPriceLabel(state);
          return;
        }
        const input = toEngineInput(state);
        const res = window.computePrice({ ...input, area_m2: m2 });
        if (res && Number.isFinite(res.min) && Number.isFinite(res.max)) {
          state.price_est_min = res.min;
          state.price_est_max = res.max;
          state.areaComputed = res.m2 ?? m2;
        }
      } catch (e) {
        showInlineError((e && e.message) || 'Błąd liczenia.');
        console.warn('[price] compute error', e);
      } finally {
        if (typeof setPriceLabel === 'function') setPriceLabel(state);
      }
    })();

    // 6) INIT bloku V2 + podpięcie głównego labela pod V2
    try {
      const tierRoot = document.getElementById('v2-tier');
      if (tierRoot && typeof initTierBlockV2 === 'function') {
        const m2 = deriveAreaM2(state) || 100;
        const startTier = window.__CFG_LAST_STATE?.priceTier || 'basic';             // DOMYŚLNIE BASIC
        const startSlab = (window.__CFG_LAST_STATE?.includeSlab ?? true);

        initTierBlockV2(tierRoot, {
          area_m2: m2,
          tier: startTier,
          includeSlab: startSlab
        });

        // główny label (BRUTTO) liczony z V2
        const fmtPL = (n) => (typeof n === 'number' && isFinite(n)) ? n.toLocaleString('pl-PL') : '—';
        const VAT = 0.08;
        const priceEl = BODY.querySelector('.cfg-price');

        function updateMainPriceLabelFromV2() {
          if (typeof window.computePriceV2 !== 'function' || !priceEl) return;
          const res = window.computePriceV2({
            area_m2: m2,
            tier: (window.__CFG_LAST_STATE?.priceTier || startTier || 'basic'),
            includeSlab: (window.__CFG_LAST_STATE?.includeSlab ?? startSlab ?? true)
          });
          const tmin = res?.breakdown_display_net?.total_min ?? res?.breakdown_net?.total_min;
          const tmax = res?.breakdown_display_net?.total_max ?? res?.breakdown_net?.total_max;
          if (typeof tmin === 'number' && typeof tmax === 'number') {
            const gmin = Math.round(tmin * (1 + VAT));
            const gmax = Math.round(tmax * (1 + VAT));
            priceEl.textContent = `${fmtPL(gmin)} – ${fmtPL(gmax)} zł brutto`;
          }
        }

        // pierwszy label + reakcja na zmiany wariantu i płyty
        updateMainPriceLabelFromV2();
        tierRoot.addEventListener('tier:change', updateMainPriceLabelFromV2);
        tierRoot.addEventListener('slab:toggle', updateMainPriceLabelFromV2);

        // zmiana metrażu z kroków 1–8
        window.__onAreaChanged = (newM2) => {
          tierRoot.__setAreaM2?.(newM2);
          updateMainPriceLabelFromV2();
        };
      }
    } catch (e) {
      console.warn('[V2 @ price card] init error', e);
    }
  }


renderPrice();



  // ===== Utils =====
  function setBusy(btn, busy) { if (!btn) return; btn.disabled = !!busy; btn.setAttribute('aria-busy', busy ? 'true' : 'false'); }
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
  function esc(s = '') { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c])); }

  // DEBUG: wystaw helpery do konsoli
  window.__CFG_DEBUG = {
    deriveAreaM2: window.__deriveAreaM2,
    toEngineInput,
    midFromRange,
    ensurePrice,
    openDetails
  };



  window.renderPrice = renderPrice;



  // ========================================================================

  // === Fit label for the "Ulepsz wycenę" button (bez zmian globalnego CSS) ===
  (function () {
    const MIN_W = 143;       // jak w Twoim CSS
    const MAX_W = 240;       // ile maksymalnie pozwalamy temu jednemu przyciskowi urosnąć
    const VARIANTS = ['✨ Ulepsz wycenę', '✨ Popraw wycenę', '✨ Ulepsz'];

    function expandToFit(btn, capPx) {
      // pozwól przeliczyć naturalną szerokość tekstu
      const prevMin = btn.style.minWidth;
      const prevW = btn.style.width;
      btn.style.minWidth = '0px';
      btn.style.width = 'auto';

      // naturalna szerokość (z paddingiem przycisku)
      const need = Math.ceil(btn.scrollWidth);
      // cel: między MIN_W a capPx
      const target = Math.max(MIN_W, Math.min(capPx, need));

      btn.style.minWidth = target + 'px';
      btn.style.width = '';     // wróć do normalnego
      // zwraca: czy się mieści w jednej linii
      const fits = btn.scrollWidth <= target + 1;
      // nic nie przywracamy — zostawiamy ustawioną minWidth dla tego jednego przycisku
      return fits;
    }

    function pickVariantThatFits(btn) {
      for (const txt of VARIANTS) {
        btn.textContent = txt;
        if (expandToFit(btn, MAX_W)) {
          btn.setAttribute('aria-label', 'Ulepsz wycenę'); // pełna fraza dla a11y
          btn.title = 'Ulepsz wycenę';
          return;
        }
      }
      // awaryjnie: zostaw najkrótszą
      btn.textContent = VARIANTS[VARIANTS.length - 1];
      expandToFit(btn, MAX_W);
    }

    function fitEnhanceButton(root = document) {
      const btn = root.querySelector?.('[data-cfg="ai-enhance"]');
      if (!btn) return;

      pickVariantThatFits(btn);

      // reaguj na zmiany szerokości kontenera (np. po otwarciu modala / zmianie viewportu)
      const ro = new ResizeObserver(() => pickVariantThatFits(btn));
      const host = btn.closest('.cfg-price-row') || btn.parentElement || document.body;
      try { ro.observe(host); } catch (_) { }
      // zachowaj referencję, by GC nie ubił obserwatora
      btn.__fitRO = ro;
    }

    // uruchom po wyrenderowaniu karty ceny
    const origRenderPrice = window.renderPrice;
    window.renderPrice = function (state) {
      origRenderPrice?.(state);
      // poczekaj jedną klatkę na DOM
      requestAnimationFrame(() => fitEnhanceButton(document));
    };

    // na wszelki wypadek przy starcie (gdyby przycisk już był w DOM)
    requestAnimationFrame(() => fitEnhanceButton(document));
  })();

})(); // ← domknięcie IIFE
