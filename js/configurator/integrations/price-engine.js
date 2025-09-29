/* /js/configurator/price-engine.js */
(() => {
  'use strict';
  if (window.__SCANDURA_PRICE_ENGINE__) return;
  window.__SCANDURA_PRICE_ENGINE__ = true;

  // Polyfill
  const cloneDeep = (obj) => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));
  const ERR = (code, msg, extra = {}) => { const e = new Error(msg); e.name = code; e.extra = extra; return e; };
  const round1000 = (v) => Math.round(v / 1000) * 1000;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  
// Skala metrażu — czysto liniowa względem kotwicy 100 m²
function areaMultiplier(area) {
  // 100 m² → 1.00 ; 35 m² → 0.35 ; 140 m² → 1.40
  return area / 100;
}


  // Dane globalne
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

  // Suma koszyków
  function sumBuckets(buckets) {
    let min = 0, max = 0;
    for (const [k, v] of Object.entries(buckets)) {
      if (v && isFinite(v.min) && isFinite(v.max)) { min += v.min; max += v.max; }
    }
    return { min, max };
  }

  // Walidacja baseline 100 m²
  function assertBaselineCompleteness(baseline) {
    const required = ['foundation','structure','roof','windows','mep','elevation','finishes','logistics','project_supervision'];
    const missing = [];
    for (const key of required) {
      const row = baseline.buckets[key];
      if (!row || !isFinite(row.min) || !isFinite(row.max)) missing.push(key);
    }
    if (missing.length) throw ERR('HARD_ERROR', `Brak widełek 100 m² w cost_buckets dla: ${missing.join(', ')}`, { missing });
  }

  // Normalizacja baseline do kotwicy
  function normalizeBaselineToAnchor(buckets100, anchorMin, anchorMax, audit) {
    const { min: sumMin, max: sumMax } = sumBuckets(buckets100);
    if (!(sumMin > 0 && sumMax > 0)) throw ERR('HARD_ERROR', 'Suma koszyków baseline = 0 — nie można znormalizować.');
    const sMin = anchorMin / sumMin;
    const sMax = anchorMax / sumMax;
    const scaled = {};
    for (const [k, v] of Object.entries(buckets100)) scaled[k] = { min: v.min * sMin, max: v.max * sMax };
    audit.push({ step:'baseline_normalization', anchorMin, anchorMax, sumMin, sumMax, scaleMin:sMin, scaleMax:sMax });
    return scaled;
  }

  // Mnożniki per koszyk
  function multBuckets(buckets, keys, multMin, multMax, audit, label) {
    for (const key of keys) {
      if (!buckets[key]) continue;
      const before = { ...buckets[key] };
      buckets[key] = { min: before.min * multMin, max: before.max * multMax };
      audit.push({ step: label, bucket: key, before, multMin, multMax, after: { ...buckets[key] } });
    }
  }

  // Dodanie ryczałtu jako osobny „bucket”
  function addLump(buckets, _unused, lumpMin, lumpMax, audit, label) {
    const before = buckets[label] || { min:0, max:0 };
    const after = { min: before.min + (lumpMin||0), max: before.max + (lumpMax||0) };
    buckets[label] = after;
    audit.push({ step: label, bucket: label, before, addMin:lumpMin||0, addMax:lumpMax||0, after });
  }

  // Kalibracja shelli z DEW
  const SHELL_FACTORS = { DEW: 1.00, SSO: 0.46, SSZ: 0.60 };
  const FORCE_SHELL_FROM_DEW = true;

// GŁÓWNA FUNKCJA — PROSTA WERSJA V1 (linia od 100 m² × m² + dach + kondygnacje)
window.computePrice = function computePrice(state) {
  const audit = [];
  const warns = [];

  // --- wejście
  const shell   = String(state?.shell || 'DEW').toUpperCase();            // 'DEW' | 'SSZ' | 'SSO'
  const m2      = Number(state?.area_m2);
  const roofKey = state?.roof || 'gabled_2';                              // 'gabled_2' | 'hip_4' | 'flat' | ...
  const storeys = state?.storeys === 'plus_1' ? 'plus_1' : 'parter';      // 'parter' | 'plus_1'

  if (!['DEW','SSZ','SSO'].includes(shell)) {
    throw ERR('HARD_ERROR', `Zły shell: ${shell}`);
  }
  if (!Number.isFinite(m2) || m2 <= 0) {
    throw ERR('HARD_ERROR', 'Brak lub nieprawidłowy metraż (area_m2).');
  }

  // --- dane
  const cfg = getData(); // używa Twojej funkcji getData()
  const family = cfg.base_tables?.single_family || {};

  // 1) KOTWICA 100 m² dla danego shell
  const row100 = family[shell]?.['100'];
  if (!row100 || !isFinite(row100.min) || !isFinite(row100.max)) {
    throw ERR('HARD_ERROR', `Brak kotwicy 100 m² w base_tables dla ${shell}`);
  }
  const anchorMin = Number(row100.min);
  const anchorMax = Number(row100.max);
  audit.push({ step: 'anchor_100m2', shell, anchorMin, anchorMax });

  // 2) CZYSTA PROPORCJA: cena ~ m2/100 × kotwica
  const rateMin = anchorMin / 100;
  const rateMax = anchorMax / 100;
  let outMin = rateMin * m2;
  let outMax = rateMax * m2;
  audit.push({ step: 'linear_by_m2', m2, rateMin, rateMax, baseMin: outMin, baseMax: outMax });

  // 3) DACH: główny mnożnik (bez rozbijania na koszyki — V1)
  const rvals = cfg.multipliers?.roof?.values || {};
  let roofMult = 1.0;
  if (rvals[roofKey] && isFinite(rvals[roofKey].mult)) {
    roofMult = Number(rvals[roofKey].mult);
  } else {
    warns.push(`Brak/niepełny mnożnik dachu: ${roofKey} — użyto 1.00`);
  }
  outMin *= roofMult;
  outMax *= roofMult;
  audit.push({ step: 'roof', roof: roofKey, mult: roofMult });

  // 4) KONDYGNACJE: poddasze ~ -5% względem parteru (Twoje założenie V1)
  const storeysMult = (storeys === 'plus_1') ? 0.95 : 1.00;
  outMin *= storeysMult;
  outMax *= storeysMult;
  audit.push({ step: 'storeys', storeys, mult: storeysMult });

  // 5) ZAOKRĄGLENIE
  const r = (v) => Math.round(v / 1000) * 1000;
  let min = r(outMin);
  let max = r(outMax);
  if (min > max) [min, max] = [max, min];

  audit.push({ step: 'sum+round', outMin, outMax, min, max });

  return {
    min,
    max,
    currency: 'PLN',
    vat: 'brutto',
    audit,
    warns
  };
};


  // Proste testy (konsola)
  window.SCANDURA_PRICING_TESTS = {
    run() {
      const cases = [
        { name:'T01 BASE 100m2, DEW, gabled_2, parter, no garage', state:{ shell:'DEW', area_m2:100, roof:'gabled_2', storeys:'parter', garage:'none', city:'Gdańsk' } },
        { name:'T02 METRAŻ 120m2', state:{ shell:'DEW', area_m2:120, roof:'gabled_2', storeys:'parter', garage:'none', city:'Gdańsk' } },
        { name:'T03 GARAGE attached_1 (−25m2 + ryczałt)', state:{ shell:'DEW', area_m2:100, roof:'gabled_2', storeys:'parter', garage:'attached_1', city:'Gdańsk' } },
        { name:'T04 PLUS_1 (structure↑, mep↑, +schody)', state:{ shell:'DEW', area_m2:100, roof:'gabled_2', storeys:'plus_1', garage:'none', city:'Gdańsk' } },
        { name:'T05 HIP_4', state:{ shell:'DEW', area_m2:100, roof:'hip_4', storeys:'parter', garage:'none', city:'Gdańsk' } },
        { name:'T06 FLAT', state:{ shell:'DEW', area_m2:100, roof:'flat', storeys:'parter', garage:'none', city:'Gdańsk' } },
        { name:'T07 LARGE 250m2 + attached_2', state:{ shell:'DEW', area_m2:250, roof:'gabled_2', storeys:'parter', garage:'attached_2', city:'Gdańsk' } },
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
