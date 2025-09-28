/* /js/configurator/price-engine.js */
(() => {
  'use strict';
  if (window.__SCANDURA_PRICE_ENGINE__) return;
  window.__SCANDURA_PRICE_ENGINE__ = true;

  /**
   * Oczekiwane dane w window.SCANDURA_PRICING_DATA:
   * {
   *   base_tables: { single_family: { DEW: { "80":{min,max}, "100":{min,max}, "150":{min,max} }, SSZ:{...}, SSO:{...} } },
   *   multipliers: { roof:{values:{...}, cross_effects:{...}}, storeys:{...}, garage:{...} },
   *   cost_buckets: {
   *     baseline: {...},        // globalny baseline 100 m²
   *     baseline_DEW?: {...},   // opcjonalny baseline per shell
   *     baseline_SSZ?: {...},
   *     baseline_SSO?: {...}
   *   }
   * }
   */

  // Polyfill na wypadek braku structuredClone (stare przeglądarki)
  const cloneDeep = (obj) => {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  };

  const ERR = (code, msg, extra = {}) => {
    const e = new Error(msg);
    e.name = code;
    e.extra = extra;
    return e;
  };

  const round1000 = (v) => Math.round(v / 1000) * 1000;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // ——— METRAŻ: interpolacja liniowa + clamp (80→1.07, 100→1.00, 150→0.93)
  function areaMultiplier(area) {
    if (area <= 80) return 1.07;
    if (area >= 150) return 0.93;
    if (area <= 100) {
      // 80..100: 1.07 -> 1.00
      const t = (area - 80) / 20;
      return 1.07 + t * (1.00 - 1.07);
    } else {
      // 100..150: 1.00 -> 0.93
      const t = (area - 100) / 50;
      return 1.00 + t * (0.93 - 1.00);
    }
  }

  // ——— pobranie danych globalnych
  function getData() {
    const cfg = window.SCANDURA_PRICING_DATA || {};
    const base_tables = cfg.base_tables;
    const multipliers = cfg.multipliers;
    const cost_buckets = cfg.cost_buckets;
    if (!base_tables) throw ERR('HARD_ERROR', 'Brak base_tables w SCANDURA_PRICING_DATA');
    if (!multipliers) throw ERR('HARD_ERROR', 'Brak multipliers w SCANDURA_PRICING_DATA');
    if (!cost_buckets) throw ERR('HARD_ERROR', 'Brak cost_buckets w SCANDURA_PRICING_DATA');
    return { base_tables, multipliers, cost_buckets };
  }

  // ——— suma min/max koszyków
  function sumBuckets(buckets) {
    let min = 0, max = 0;
    for (const [k, v] of Object.entries(buckets)) {
      if (v && isFinite(v.min) && isFinite(v.max)) {
        min += v.min;
        max += v.max;
      }
    }
    return { min, max };
  }

  // ——— sprawdzenie kompletności baseline 100 m²
  function assertBaselineCompleteness(baseline) {
    const required = ['foundation','structure','roof','windows','mep','elevation','finishes','logistics','project_supervision'];
    const missing = [];
    for (const key of required) {
      const row = baseline.buckets[key];
      if (!row || !isFinite(row.min) || !isFinite(row.max)) {
        missing.push(key);
      }
    }
    if (missing.length) {
      throw ERR('HARD_ERROR', `Brak widełek 100 m² w cost_buckets dla: ${missing.join(', ')}`, { missing });
    }
  }

  // ——— dopasowanie baseline do kotwicy z base_tables (np. DEW/100 = 280–380k)
  function normalizeBaselineToAnchor(baselineBuckets, anchorMin, anchorMax, audit) {
    const { min: sumMin, max: sumMax } = sumBuckets(baselineBuckets);
    if (!(sumMin > 0 && sumMax > 0)) {
      throw ERR('HARD_ERROR', 'Suma koszyków baseline = 0 — nie można znormalizować.');
    }
    const sMin = anchorMin / sumMin;
    const sMax = anchorMax / sumMax;
    const scaled = {};
    for (const [k, v] of Object.entries(baselineBuckets)) {
      scaled[k] = {
        min: v.min * sMin,
        max: v.max * sMax
      };
    }
    audit.push({ step: 'baseline_normalization', anchorMin, anchorMax, sumMin, sumMax, scaleMin: sMin, scaleMax: sMax });
    return scaled;
  }

  // ——— zastosowanie mnożnika do wybranych koszyków
  function multBuckets(buckets, keys, multMin, multMax, audit, label) {
    for (const key of keys) {
      if (!buckets[key]) continue;
      const before = { ...buckets[key] };
      buckets[key] = {
        min: before.min * multMin,
        max: before.max * multMax
      };
      audit.push({ step: label, bucket: key, before, multMin, multMax, after: { ...buckets[key] } });
    }
  }

  // ——— dodanie ryczałtu (np. schody, garaż)
  function addLump(buckets, _multiset, lumpMin, lumpMax, audit, label) {
    const key = label;
    const before = { min: 0, max: 0 };
    const existing = buckets[key];
    const after = {
      min: (existing?.min || 0) + lumpMin,
      max: (existing?.max || 0) + lumpMax
    };
    buckets[key] = after;
    audit.push({ step: label, bucket: key, before, addMin: lumpMin, addMax: lumpMax, after });
  }

  // ——— główna funkcja licząca
  window.computePrice = function computePrice(state) {
    const audit = [];
    const warns = [];

    // — 0) wejście
    const {
      shell = 'DEW',
      area_m2,
      storeys = 'parter',
      roof = 'gabled_2',
      garage = 'none',
      city = 'Gdańsk'
    } = state || {};

    if (!isFinite(area_m2) || area_m2 <= 0) {
      throw ERR('HARD_ERROR', 'Brak lub nieprawidłowy metraż (area_m2).');
    }

    // — 1) dane
    const { base_tables, multipliers, cost_buckets } = getData();

    // — 2) kotwica z base_tables (dla shell/area band ~ 100 m²)
    const family = base_tables.single_family || {};
    const shellTable = family?.[shell];
    if (!shellTable) {
      throw ERR('HARD_ERROR', `Brak base_table dla shell=${shell}.`);
    }

    const anchorRow = shellTable["100"];
    const anchorMin = Number(anchorRow?.min);
    const anchorMax = Number(anchorRow?.max);
    if (!isFinite(anchorMin) || !isFinite(anchorMax)) {
      throw ERR('HARD_ERROR', `Brak kotwicy min/max dla shell=${shell} przy 100 m².`);
    }
    audit.push({ step: 'anchor_100m2', shell, anchorMin, anchorMax });

    // — 3) baseline koszyków 100 m² (gabled_2, parter, no garage, standard)
    // preferuj baseline dopasowany do shellu; jeśli brak — użyj globalnego
    const baseline = cost_buckets['baseline_' + shell] || cost_buckets.baseline;
    if (!baseline || baseline.area_m2 !== 100) {
      throw ERR('HARD_ERROR', 'Brak bazy koszyków 100 m² w cost_buckets.');
    }
    assertBaselineCompleteness(baseline);

    // — 4) normalizacja baseline do anchor (skalowanie proporcjonalne)
    let buckets = normalizeBaselineToAnchor(cloneDeep(baseline.buckets), anchorMin, anchorMax, audit);

    // — 5) garaż → odejmij m² domu, określ preset garażu
    let garageArea = 0;
    const GAR_PRESETS = { attached_1: 25, attached_2: 36, detached_1: 0, none: 0 };
    if (!(garage in GAR_PRESETS)) throw ERR('HARD_ERROR', `Nieobsługiwany wariant garażu: ${garage}`);
    garageArea = GAR_PRESETS[garage] || 0;
    const area_house = clamp(area_m2 - ((garage === 'attached_1' || garage === 'attached_2') ? garageArea : 0), 30, 10000);
    audit.push({ step: 'garage_area', garage, garageArea, area_total: area_m2, area_house });

    // — 6) metraż: mnożnik tylko dla koszyków m²-zależnych
    const mA = areaMultiplier(area_house);
    const areaBuckets = ['foundation','structure','roof','windows','mep','elevation','finishes'];
    multBuckets(buckets, areaBuckets, mA, mA, audit, 'area_multiplier');

    // — 7) dach + cross-effects (na właściwych koszykach)
    const rvals = multipliers.roof?.values || {};
    const rce   = multipliers.roof?.cross_effects || {};
    const roofDef = rvals[roof];
    if (!roofDef) throw ERR('HARD_ERROR', `Brak definicji dachu: ${roof}`);

    let roofMultMin = 1.00, roofMultMax = 1.00;
    if (isFinite(roofDef.mult)) {
      roofMultMin = roofMultMax = roofDef.mult;
    } else if (isFinite(roofDef.mult_min) && isFinite(roofDef.mult_max)) {
      roofMultMin = roofDef.mult_min;
      roofMultMax = roofDef.mult_max;
    } else {
      throw ERR('HARD_ERROR', `Niekompletne mnożniki dachu: ${roof}`);
    }
    multBuckets(buckets, ['roof'], roofMultMin, roofMultMax, audit, `roof.${roof}`);

    // cross: foundation_slab, structure, elevation
    const applyCross = (key, label) => {
      const rec = rce[key] && rce[key][roof];
      if (rec && isFinite(rec.mult_min) && isFinite(rec.mult_max)) {
        multBuckets(buckets, [key === 'foundation_slab' ? 'foundation' : key], rec.mult_min, rec.mult_max, audit, `roof_cross.${label}`);
      }
    };
    applyCross('foundation_slab', 'foundation');
    applyCross('structure', 'structure');
    applyCross('elevation', 'elevation');

    // — 8) kondygnacje (structure, mep + schody)
    const st = multipliers.storeys || {};
    if (storeys === 'plus_1') {
      const mStructMin = st.plus_1?.mult_structure_min;
      const mStructMax = st.plus_1?.mult_structure_max;
      const mMepMin    = st.plus_1?.mult_mep_min;
      const mMepMax    = st.plus_1?.mult_mep_max;
      const stairsMin  = st.plus_1?.stairs_pln_min;
      const stairsMax  = st.plus_1?.stairs_pln_max;
      if (![mStructMin,mStructMax,mMepMin,mMepMax,stairsMin,stairsMax].every(isFinite)) {
        throw ERR('HARD_ERROR', 'Brak kompletu mnożników dla plus_1.');
      }
      multBuckets(buckets, ['structure'], mStructMin, mStructMax, audit, 'storeys.plus_1.structure');
      multBuckets(buckets, ['mep'],       mMepMin,    mMepMax,    audit, 'storeys.plus_1.mep');
      addLump(buckets, null, stairsMin, stairsMax, audit, 'stairs');
    } else if (storeys !== 'parter') {
      throw ERR('HARD_ERROR', `Nieobsługiwany typ kondygnacji: ${storeys}`);
    }

    // — 9) garaż (koszyk)
    const gdef = multipliers.garage?.[garage];
    if (!gdef) throw ERR('HARD_ERROR', `Brak definicji ryczałtu garażu: ${garage}`);
    if (isFinite(gdef.add_pln_min) && isFinite(gdef.add_pln_max) && (gdef.add_pln_min || gdef.add_pln_max)) {
      addLump(buckets, null, gdef.add_pln_min, gdef.add_pln_max, audit, 'garage');
    }

    // — 10) region: Trójmiasto/Pomorskie = ×1.00 → pomijamy

    // — 11) suma i rounding
    const { min: sumMin, max: sumMax } = sumBuckets(buckets);
    const outMin = round1000(sumMin);
    const outMax = round1000(sumMax);
    audit.push({ step: 'sum+round', sumMin, sumMax, outMin, outMax });

    return {
      min: outMin,
      max: outMax,
      currency: 'PLN',
      vat: 'brutto',
      audit,
      warns
    };
  };

  // ——— proste testy konsolowe (uruchom window.SCANDURA_PRICING_TESTS.run())
  window.SCANDURA_PRICING_TESTS = {
    run() {
      const cases = [
        {
          name: 'T01 BASE 100m2, DEW, gabled_2, parter, no garage',
          state: { shell: 'DEW', area_m2: 100, roof: 'gabled_2', storeys: 'parter', garage: 'none', city: 'Gdańsk' }
        },
        {
          name: 'T02 METRAŻ 120m2',
          state: { shell: 'DEW', area_m2: 120, roof: 'gabled_2', storeys: 'parter', garage: 'none', city: 'Gdańsk' }
        },
        {
          name: 'T03 GARAGE attached_1 w bryle (-25m2 z domu, +ryczałt)',
          state: { shell: 'DEW', area_m2: 100, roof: 'gabled_2', storeys: 'parter', garage: 'attached_1', city: 'Gdańsk' }
        },
        {
          name: 'T04 PLUS_1 (structure↑, mep↑, +schody)',
          state: { shell: 'DEW', area_m2: 100, roof: 'gabled_2', storeys: 'plus_1', garage: 'none', city: 'Gdańsk' }
        },
        {
          name: 'T05 ROOF hip_4 (roof↑ + foundation↑ + structure↑)',
          state: { shell: 'DEW', area_m2: 100, roof: 'hip_4', storeys: 'parter', garage: 'none', city: 'Gdańsk' }
        },
        {
          name: 'T06 ROOF flat (roof↓ + foundation↑ + elevation↑)',
          state: { shell: 'DEW', area_m2: 100, roof: 'flat', storeys: 'parter', garage: 'none', city: 'Gdańsk' }
        },
        {
          name: 'T07 LARGE 250m2, attached_2 (−36m2 z domu, +ryczałt)',
          state: { shell: 'DEW', area_m2: 250, roof: 'gabled_2', storeys: 'parter', garage: 'attached_2', city: 'Gdańsk' }
        }
      ];
      for (const tc of cases) {
        try {
          const res = window.computePrice(tc.state);
          console.group(tc.name);
          console.log('in:', tc.state);
          console.log('out:', res.min, '-', res.max, res.currency);
          console.log('audit:', res.audit);
          console.groupEnd();
        } catch (e) {
          console.group(tc.name + ' [ERROR]');
          console.error(e.name, e.message, e.extra || '');
          console.groupEnd();
        }
      }
    }
  };

})();
