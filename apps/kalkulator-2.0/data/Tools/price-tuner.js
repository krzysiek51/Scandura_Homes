/* /js/configurator/price-tuner.js */
(() => {
  'use strict';
  const LS_KEY = 'pricing_tuner_overrides_v1';

  // Bezpieczne pobranie danych kalkulatora
  function getCFG() {
    const cfg = window.SCANDURA_PRICING_DATA || {};
    cfg.base_tables = cfg.base_tables || {};
    cfg.base_tables.single_family = cfg.base_tables.single_family || {};
    cfg.multipliers = cfg.multipliers || {};
    cfg.multipliers.roof = cfg.multipliers.roof || {};
    cfg.multipliers.roof.values = cfg.multipliers.roof.values || {};
    return cfg;
  }

  // ——— OVERRIDES (to co trzymamy w localStorage) ———
  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveOverrides(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  }

  // Zastosuj override’y do SCANDURA_PRICING_DATA (in-place)
  function applyOverrides() {
    const ov = loadOverrides();
    const cfg = getCFG();
    const fam = cfg.base_tables.single_family;

    // 1) kotwice 100 m² dla shelli
    if (ov.anchors_100) {
      for (const shell of Object.keys(ov.anchors_100)) {
        const row = ov.anchors_100[shell];
        fam[shell] = fam[shell] || {};
        fam[shell]['100'] = {
          min: Number(row.min),
          max: Number(row.max),
        };
      }
    }

    // 2) mnożniki dachu
    if (ov.roof_mult) {
      const values = cfg.multipliers.roof.values;
      for (const roofKey of Object.keys(ov.roof_mult)) {
        values[roofKey] = values[roofKey] || {};
        values[roofKey].mult = Number(ov.roof_mult[roofKey]);
      }
    }

    // 3) kondygnacje (globalny mnożnik dla plus_1)
    if (ov.storeys_plus1_mult != null) {
      cfg.multipliers.storeys = cfg.multipliers.storeys || {};
      cfg.multipliers.storeys.plus_1 = cfg.multipliers.storeys.plus_1 || {};
      // zapisujemy jako zakres = identyczne min/max, bo computePrice V1 używa tylko mnożnika zbiorczego
      cfg.multipliers.storeys.plus_1.__linear_mult = Number(ov.storeys_plus1_mult);
    }

    // 4) rounding (opcjonalny)
    if (ov.round_to) {
      cfg.__round_to = Number(ov.round_to);
    }
    return cfg;
  }

  // Helpers: eksport/import
  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // Domyślne gałki (jeśli nic nie było)
  function ensureDefaults() {
    const ov = loadOverrides();
    ov.anchors_100 = ov.anchors_100 || {
      DEW: { min: 520000, max: 650000 },  // ← podmień na Twoją kotwicę rynkową 100 m²
      SSZ: { min: 350000, max: 420000 },
      SSO: { min: 250000, max: 320000 },
    };
    ov.roof_mult = ov.roof_mult || {
      gabled_2: 1.00,
      hip_4: 1.17,
      flat: 0.90,
      multi_gable: 1.27,
      mansard: 1.40,
      other: 1.08,
    };
    if (ov.storeys_plus1_mult == null) ov.storeys_plus1_mult = 0.95; // -5% dla poddasza
    if (ov.round_to == null) ov.round_to = 1000;
    saveOverrides(ov);
  }

  // PUBLIC API (konsola)
  const API = {
    // podgląd tego co trzymamy
    get() { return loadOverrides(); },

    // ustawienia kotwic 100 m²
    setAnchor(shell, min, max) {
      const ov = loadOverrides();
      ov.anchors_100 = ov.anchors_100 || {};
      ov.anchors_100[String(shell).toUpperCase()] = { min:Number(min), max:Number(max) };
      saveOverrides(ov); applyOverrides();
      console.info('[Tuner] anchor set:', shell, min, max);
    },

    // ustawienie mnożnika dachu
    setRoofMult(roofKey, mult) {
      const ov = loadOverrides();
      ov.roof_mult = ov.roof_mult || {};
      ov.roof_mult[String(roofKey)] = Number(mult);
      saveOverrides(ov); applyOverrides();
      console.info('[Tuner] roof mult set:', roofKey, mult);
    },

    // -5% dla poddasza? ustaw tu (np. 0.95)
    setStoreysPlus1(mult) {
      const ov = loadOverrides();
      ov.storeys_plus1_mult = Number(mult);
      saveOverrides(ov); applyOverrides();
      console.info('[Tuner] storeys.plus_1 mult set:', mult);
    },

    // rounding (np. 1000, 500)
    setRounding(step) {
      const ov = loadOverrides();
      ov.round_to = Number(step);
      saveOverrides(ov); applyOverrides();
      console.info('[Tuner] rounding set:', step);
    },

    // eksport / import
    export() { downloadJSON('pricing-overrides.json', loadOverrides()); },
    import(jsonOrObj) {
      let obj = jsonOrObj;
      if (typeof jsonOrObj === 'string') {
        try { obj = JSON.parse(jsonOrObj); } catch(e){ console.error('Bad JSON'); return; }
      }
      if (!obj || typeof obj !== 'object') return;
      saveOverrides(obj); applyOverrides();
      console.info('[Tuner] overrides imported & applied.');
    },

    // szybki preview liczenia pod aktualnymi gałkami
    preview({ m2=100, shell='DEW', roof='gabled_2', storeys='parter' } = {}) {
      // mini patch rounding dla V1 (jeśli używasz computePrice V1 z rounding=1000)
      const roundTo = (getCFG().__round_to || 1000);
      const origCompute = window.computePrice;
      const res = origCompute({ area_m2:m2, shell, roof, storeys });
      // tylko informacja — computePrice ma swój rounding, ale pokażę też niestandardowy
      const r = (v)=> Math.round(v/roundTo)*roundTo;
      console.table([{ m2, shell, roof, storeys, min: res.min, max: res.max, min_custom: r(res.min), max_custom: r(res.max) }]);
      return res;
    },

    // wyczyść wszystko
    reset() {
      localStorage.removeItem(LS_KEY);
      ensureDefaults(); applyOverrides();
      console.info('[Tuner] overrides reset to defaults.');
    },

    // wymuś ponowne zastosowanie (np. po reładowaniu danych)
    apply() { applyOverrides(); console.info('[Tuner] overrides applied.'); }
  };

  // inicjalizacja
  ensureDefaults();
  applyOverrides();
  window.PricingTuner = API;
  console.info('%cPricingTuner ready.', 'color:#10b981;font-weight:700', 'Użycie: PricingTuner.get(), .setAnchor(), .setRoofMult(), .preview({...}), .export()');
})();
