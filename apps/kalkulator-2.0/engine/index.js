/* =========================================================================
   Scandura Kalkulator 2.0 — Silnik FULL (per-koszyk)
   Wersja: 1.0.0
   Wymagania danych (ładowane wcześniej w <script type="application/json"> lub importowane):
   - window.PRICING_BASE_TABLES     (base-tables.json)
   - window.PRICING_MULTIPLIERS     (multipliers.json)
   - window.PRICING_COST_BUCKETS    (cost_buckets.json)  ← baseline 100 m², gabled_2, parter, no_garage, standard

   PUBLIC API:
   //  - window.computePriceV2(state)           // wariant TIER/m² + płyta osobno (NETTO)

   - window.ScanduraPricingEngine.init({ baseTables, multipliers, costBuckets, flags? })
   - window.computePrice(state)
     state = {
       shell: "DEW"|"SSZ"|"SSO",
       area_m2: number,                 // metraż całkowity użytkownika (przed odjęciem garażu w bryle)
       storeys: "parter"|"plus_1",
       roof: "gabled_2"|"hip_4"|"flat",
       garage: "none"|"attached_1"|"attached_2"|"detached_1",
       city: "Gdańsk"|"Gdynia"|"Sopot"|"inne_z_pomorskie"
     }

   Polityka błędów:
   - Brak bazowej tabeli lub koszyka → Error(code:"HARD_ERROR", details)
   - Brak mnożnika → Fallback 1.0 + WARN (zgodnie z multipliers.meta.policy, ale domyślnie nie potrzebne dla Trójmiasta)

   Zaokrąglenie:
   - nearest 1000 PLN (min i max osobno)

   Noty:
   - Region (Trójmiasto/Pomorskie) = 1.00 w V1
   - AI-ulepszacz OFF w Step 9 (osobny etap)
   - Garaż w bryle: odejmujemy preset m² od domu i dokładamy koszyk garażu jako ryczałt
   - Krzywa metrażu: interpolacja liniowa 80→1.07 → 100→1.00 → 150→0.93, poza zakresem CLAMP (≤80→1.07, ≥150→0.93)
   ====================================================================== */

(() => {
  'use strict';
  if (window.__SCANDURA_PRICE_ENGINE__) return;
  window.__SCANDURA_PRICE_ENGINE__ = true;

  // ====== Internal Store ======
  const STORE = {
    base: null,
    mult: null,
    buckets: null,
    tiers: null,                 // <-- TU (poziom jak base/mult/buckets)
    flags: {
      NORMALIZE_TO_ANCHOR: true, // skalowanie baseline 100 m² do kotwicy z base-tables.json
      REGION_MULT: 1.00,         // Trójmiasto/Pomorskie
      ROUND_STEP_PLN: 1000,
      MIN_HOUSE_AREA: 30         // gdy garaż w bryle odejmie dużo m²
    }
  };


  // ====== Public API: init ======
  function init({ baseTables, multipliers, costBuckets, pricingTiers, flags = {} }) {
    STORE.base = baseTables || window.PRICING_BASE_TABLES;
    STORE.mult = multipliers || window.PRICING_MULTIPLIERS;
    STORE.buckets = costBuckets || window.PRICING_COST_BUCKETS;
    STORE.tiers = pricingTiers || window.PRICING_TIERS;   // <-- nowość
    STORE.flags = { ...STORE.flags, ...flags };

    if (!STORE.base || !STORE.mult || !STORE.buckets) {
      throwHard('INIT_MISSING_DATA', 'Brak wymaganych danych: baseTables/multipliers/costBuckets.');
    }
  }


  // ====== Utilities ======
  const roundTo = (val, step) => Math.round(val / step) * step;
  const roundPln = (val) => roundTo(val, STORE.flags.ROUND_STEP_PLN);

  function throwHard(code, message, extra = {}) {
    const err = new Error(message);
    err.code = 'HARD_ERROR';
    err.tag = code;
    err.extra = extra;
    throw err;
  }
  function formatMoney(pln) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(pln);
  }

  function ensureTiers() {
    const T = STORE.tiers;
    if (!T || !T.tiers || !T.foundation_slab) {
      throwHard('MISSING_TIERS', 'Brak pricing-tiers.json (STORE.tiers).');
    }
    // minimalna walidacja pól
    const need = ['basic', 'classic', 'premium'];
    for (const k of need) {
      const t = T.tiers[k];
      if (!t || typeof t.unit_net_pln_per_m2 !== 'number') {
        throwHard('BAD_TIER', `Brak/niepoprawny tiers.${k}.unit_net_pln_per_m2`);
      }
    }
    if (typeof T.foundation_slab.unit_net_pln_per_m2 !== 'number') {
      throwHard('BAD_SLAB', 'Brak/niepoprawny foundation_slab.unit_net_pln_per_m2');
    }
    return T;
  }



  function ensureNumRange(obj, key, ctx) {
    if (!obj || typeof obj.min !== 'number' || typeof obj.max !== 'number') {
      throwHard('MISSING_RANGE', `Brak lub niepoprawne widełki dla: ${ctx}.${key}`, { ctx, key, obj });
    }
  }

  function getBaseAnchor(shell, bandM2) {
    try {
      const table = STORE.base.table['single_family'][shell][String(bandM2)];
      if (!table || typeof table.min !== 'number' || typeof table.max !== 'number') {
        throwHard('MISSING_BASE_ANCHOR', `Brak base-table dla ${shell}/${bandM2} m².`);
      }
      return { min: table.min, max: table.max };
    } catch {
      throwHard('MISSING_BASE_ANCHOR', `Brak base-table dla ${shell}/${bandM2} m².`);
    }
  }

  function areaMultiplier(area) {
    // Interpolacja liniowa: 80→1.07 → 100→1.00 → 150→0.93; clamp poza zakresem
    if (area <= 80) return 1.07;
    if (area >= 150) return 0.93;
    if (area <= 100) {
      // 80..100: 1.07 -> 1.00
      const t = (area - 80) / (100 - 80);
      return 1.07 + t * (1.00 - 1.07);
    } else {
      // 100..150: 1.00 -> 0.93
      const t = (area - 100) / (150 - 100);
      return 1.00 + t * (0.93 - 1.00);
    }
  }

  function rangeMul(range, factorMin, factorMax) {
    return {
      min: range.min * factorMin,
      max: range.max * factorMax
    };
  }

  function rangeAdd(a, b) {
    return {
      min: a.min + b.min,
      max: a.max + b.max
    };
  }

  function getRoofMainMult(roof) {
    const v = STORE.mult.roof.values[roof];
    if (!v) return { min: 1.0, max: 1.0, warn: `Brak wartości roof.values.${roof}` };
    // Obsługa formatu {mult} albo {mult_min, mult_max}
    if (typeof v.mult === 'number') return { min: v.mult, max: v.mult };
    const hasMin = typeof v.mult_min === 'number';
    const hasMax = typeof v.mult_max === 'number';
    if (hasMin && hasMax) return { min: v.mult_min, max: v.mult_max };
    return { min: 1.0, max: 1.0, warn: `Niekompletne wartości roof.values.${roof}` };
  }

  function getCross(bucketKey, roof, crossKey) {
    // cross_effects[crossKey][roof] = {mult_min, mult_max}
    const ce = STORE.mult.roof.cross_effects?.[crossKey]?.[roof];
    if (!ce) return { min: 1.0, max: 1.0, warn: `Brak cross_effect ${crossKey}.${roof} dla ${bucketKey}` };
    const hasMin = typeof ce.mult_min === 'number';
    const hasMax = typeof ce.mult_max === 'number';
    if (hasMin && hasMax) return { min: ce.mult_min, max: ce.mult_max };
    return { min: 1.0, max: 1.0, warn: `Niekompletne cross_effect ${crossKey}.${roof}` };
  }

  function getGaragePreset(garage) {
    // Definicja odejmowanego metrażu od domu i ryczałtu kosztowego
    const presetsArea = {
      attached_1: 25,
      attached_2: 36,
      detached_1: 0,
      none: 0
    };
    const area = presetsArea[garage];
    if (typeof area !== 'number') throwHard('BAD_GARAGE', `Nieznany typ garażu: ${garage}`);

    const g = STORE.mult.garage?.[garage];
    if (!g || typeof g.add_pln_min !== 'number' || typeof g.add_pln_max !== 'number') {
      throwHard('MISSING_GARAGE_RANGE', `Brak widełek kosztu garażu: multipliers.garage.${garage}`);
    }
    return { areaSubtract: area, cost: { min: g.add_pln_min, max: g.add_pln_max } };
  }

  function ensureBucketsBaseline(shell) {
    const b = STORE.buckets?.baseline;
    if (!b) throwHard('MISSING_BUCKETS', 'Brak cost_buckets.baseline');
    if (b.shell !== shell) {
      // Możemy pozwolić na różne shelle, ale w V1 wymagamy zgodności
      throwHard('BUCKET_SHELL_MISMATCH', `Baseline koszyków (${b.shell}) ≠ shell żądania (${shell}).`);
    }
    const keys = [
      'foundation', 'structure', 'roof', 'windows', 'mep', 'elevation', 'finishes',
      'logistics', 'project_supervision'
    ];
    for (const k of keys) {
      const r = b.buckets[k];
      if (!r || typeof r.min !== 'number' || typeof r.max !== 'number') {
        throwHard('MISSING_BUCKET_RANGE', `Brak widełek w baseline dla koszyka: ${k}`);
      }
    }
    return b;
  }

  function normalizeBucketsToAnchor(baselineBuckets, shell) {
    if (!STORE.flags.NORMALIZE_TO_ANCHOR) return baselineBuckets; // bez skalowania

    // bierzemy kotwicę z base-tables: 100 m²
    const anchor = getBaseAnchor(shell, 100); // np. 280–380k
    const sum = Object.values(baselineBuckets).reduce((acc, r) => {
      acc.min += r.min; acc.max += r.max; return acc;
    }, { min: 0, max: 0 });

    if (sum.min <= 0 || sum.max <= 0) {
      throwHard('INVALID_BASELINE_SUM', 'Suma baseline koszyków niepoprawna.');
    }
    const fMin = anchor.min / sum.min;
    const fMax = anchor.max / sum.max;

    const scaled = {};
    for (const [k, r] of Object.entries(baselineBuckets)) {
      scaled[k] = { min: r.min * fMin, max: r.max * fMax };
    }
    return scaled;
  }

  function computePrice(state) {
    const audit = [];
    const warns = [];

    // ===== 1) Walidacje wejścia =====
    const shell = state.shell;
    const areaTotal = Number(state.area_m2);
    const roof = state.roof || 'gabled_2';
    const storeys = state.storeys || 'parter';
    const garage = state.garage || 'none';

    if (!shell || !['DEW', 'SSZ', 'SSO'].includes(shell)) {
      throwHard('BAD_SHELL', 'Nieobsługiwany shell (DEW/SSZ/SSO).');
    }
    if (!Number.isFinite(areaTotal) || areaTotal <= 0) {
      throwHard('BAD_AREA', 'Niepoprawna powierzchnia całkowita.');
    }

    // --- patch: liniowe skalowanie względem 100 m² -------------------
    // UWAGA: to działa globalnie dla całego wyniku (fallback, gdy brak anchorów dla danego m²).
    // Prawdziwe per-koszyk skalowanie jest niżej (sekcja 5), ale to zabezpiecza edge-case'y.
    state.__scaleFactor = areaTotal / 100;
    audit.push({ step: 'linear_scale_patch', f: state.__scaleFactor });


    // ===== 2) Garaż (odejmowanie m² + koszt ryczałtowy) =====
    const gp = getGaragePreset(garage);
    const areaHouse = Math.max(areaTotal - gp.areaSubtract, STORE.flags.MIN_HOUSE_AREA);
    audit.push({ step: 'garage_area', garage, areaTotal, areaSubtract: gp.areaSubtract, areaHouse });

    // ===== 3) Baseline koszyków (100 m², gabled_2, parter, no_garage, standard) =====
    const baseline = ensureBucketsBaseline(shell);
    const baselineBuckets = { ...baseline.buckets };

    // ===== 4) Normalizacja koszyków do kotwicy z base-tables (100 m²) =====
    const normalizedBuckets = normalizeBucketsToAnchor(baselineBuckets, shell);
    audit.push({ step: 'normalize_to_anchor', anchorFromBaseTables: getBaseAnchor(shell, 100) });

    // ===== 5) Skalowanie metrażu (dom) — per m² + krzywa =====
    const curve = areaMultiplier(areaHouse); // np. 0.93 dla 150+
    const m2Buckets = ['foundation', 'structure', 'roof', 'windows', 'mep', 'elevation', 'finishes'];
    const weakAreaBuckets = ['logistics', 'project_supervision']; // te były stałe — stąd odwrócenie

    const scaledBuckets = {};
    for (const [k, r] of Object.entries(normalizedBuckets)) {
      if (m2Buckets.includes(k)) {
        const rateMin = r.min / 100;  // stawka min za 1 m² z kotwicy 100 m²
        const rateMax = r.max / 100;  // stawka max za 1 m²
        scaledBuckets[k] = {
          min: rateMin * areaHouse * curve,
          max: rateMax * areaHouse * curve
        };
      } else if (weakAreaBuckets.includes(k)) {
        // Skalowanie "słabe" ryczałtów po metrażu (liniowo, ale z ograniczeniem)
        const f = Math.max(0.35, Math.min(1.4, areaHouse / 100)); // 50 m²→0.5x, 100 m²→1.0x, 140 m²→1.4x
        scaledBuckets[k] = {
          min: r.min * f,
          max: r.max * f
        };
      } else {
        // inne ewentualne ryczałty zostawiamy bez zmian
        scaledBuckets[k] = { ...r };
      }
    }
    audit.push({ step: 'area_scale_per_m2', areaHouse, curve, weakScaleApplied: true });



    // ===== 6) Dach + cross-effects (per koszyk) =====
    const roofMain = getRoofMainMult(roof);
    if (roofMain.warn) warns.push(roofMain.warn);

    // roof bucket
    scaledBuckets.roof = rangeMul(scaledBuckets.roof, roofMain.min, roofMain.max);

    // cross-effects
    const crossMap = [
      { crossKey: 'foundation_slab', bucket: 'foundation' },
      { crossKey: 'structure', bucket: 'structure' },
      { crossKey: 'elevation', bucket: 'elevation' }
    ];
    for (const { crossKey, bucket } of crossMap) {
      const m = getCross(bucket, roof, crossKey);
      if (m.warn) warns.push(m.warn);
      scaledBuckets[bucket] = rangeMul(scaledBuckets[bucket], m.min, m.max);
    }
    audit.push({ step: 'roof_effects', roof, roofMain, crossApplied: crossMap.map(x => x.crossKey) });

    // ===== 7) Kondygnacje =====
    if (storeys === 'plus_1') {
      const st = STORE.mult.storeys?.plus_1;
      if (!st) throwHard('MISSING_STOREYS', 'Brak definicji storeys.plus_1');

      const mStruct = {
        min: (typeof st.mult_structure_min === 'number' ? st.mult_structure_min : 1.0),
        max: (typeof st.mult_structure_max === 'number' ? st.mult_structure_max : 1.0)
      };
      const mMep = {
        min: (typeof st.mult_mep_min === 'number' ? st.mult_mep_min : 1.0),
        max: (typeof st.mult_mep_max === 'number' ? st.mult_mep_max : 1.0)
      };
      const stairs = {
        min: (typeof st.stairs_pln_min === 'number' ? st.stairs_pln_min : 0),
        max: (typeof st.stairs_pln_max === 'number' ? st.stairs_pln_max : 0)
      };

      scaledBuckets.structure = rangeMul(scaledBuckets.structure, mStruct.min, mStruct.max);
      scaledBuckets.mep = rangeMul(scaledBuckets.mep, mMep.min, mMep.max);

      // Dodamy schody na etapie sumowania
      audit.push({ step: 'storeys_plus_1', mStruct, mMep, stairs });
    }

    // ===== 8) Garaż — koszt ryczałtowy =====
    const garageCost = gp.cost;
    audit.push({ step: 'garage_cost', garage, garageCost });

    // ===== 9) Region (V1: 1.00) =====
    const regionMult = STORE.flags.REGION_MULT || 1.00;
    audit.push({ step: 'region', regionMult });

    // ===== 10) Sumowanie i rounding =====
    let sum = { min: 0, max: 0 };
    for (const [k, r] of Object.entries(scaledBuckets)) {
      ensureNumRange(r, k, 'scaledBuckets');
      sum = rangeAdd(sum, r);
    }

    // Dodaj schody jeśli plus_1
    if (storeys === 'plus_1') {
      const st = STORE.mult.storeys.plus_1;
      sum.min += st.stairs_pln_min || 0;
      sum.max += st.stairs_pln_max || 0;
    }

    // Dodaj garaż ryczałt
    sum = rangeAdd(sum, garageCost);

    // Region
    sum.min *= regionMult;
    sum.max *= regionMult;

    // Rounding
    const out = {
      min: roundPln(sum.min),
      max: roundPln(sum.max),
      currency: (STORE.base.meta?.currency || 'PLN'),
      vat: (STORE.base.meta?.vat || 'brutto'),
      audit,
      warns
    };
    if (out.min > out.max) {
      // Skrajnie rzadkie (np. fMin/fMax dziwnie ułożone) — ustabilizuj
      const swap = out.min; out.min = out.max; out.max = swap;
      out.warns.push('MIN_GREATER_THAN_MAX: values swapped after rounding.');
    }
    return out;
  }
  /**
   * computePriceV2(state)
   * Liczenie NETTO za 1 m² (Basic/Classic/Premium) + płyta fundamentowa osobno.
   * state = {
   *   area_m2: number,
   *   tier: 'basic'|'classic'|'premium',
   *   includeSlab?: boolean   // domyślnie true
   * }
   */
  function computePriceV2(state) {
    const T = ensureTiers();
    const area = Math.max(1, Math.round(Number(state?.area_m2 || 0)));
    const tierKey = (state?.tier || 'basic');
    const tier = T.tiers[tierKey] || T.tiers.basic;
    const includeSlab = state?.includeSlab !== false;

    const unitNet = tier.unit_net_pln_per_m2;                // zł/m² NETTO (dom, bez płyty)
    const slabUnitNet = T.foundation_slab.unit_net_pln_per_m2; // zł/m² NETTO (płyta)
    const vat = typeof T.meta?.vat_rate === 'number' ? T.meta.vat_rate : 0.08;

    // „marketingowe” widełki do wyświetlania (bias + pasmo)
    const bias = typeof tier.display_bias === 'number' ? tier.display_bias : 0;
    const band = typeof tier.display_band_pct === 'number' ? tier.display_band_pct : 0;

    const house_net = unitNet * area;
    const slab_net = includeSlab ? slabUnitNet * area : 0;
    const total_net = house_net + slab_net;

    const unit_display_min = unitNet * (1 + bias) * (1 - band);
    const unit_display_max = unitNet * (1 + bias) * (1 + band);
    const house_min = unit_display_min * area;
    const house_max = unit_display_max * area;

    const total_min = house_min + (includeSlab ? slab_net : 0);
    const total_max = house_max + (includeSlab ? slab_net : 0);

    return {
      kind: 'V2_TIER_PER_M2',
      meta: { m2: area, tier: tierKey, currency: 'PLN', vat_rate: vat },
      breakdown_net: {
        house_net: Math.round(house_net),
        slab_net: Math.round(slab_net),
        total_net: Math.round(total_net)
      },
      breakdown_display_net: {
        house_min: Math.round(house_min),
        house_max: Math.round(house_max),
        slab: Math.round(slab_net),
        total_min: Math.round(total_min),
        total_max: Math.round(total_max)
      },
      fmt: {
        house_net: formatMoney(house_net),
        slab_net: formatMoney(slab_net),
        total_net: formatMoney(total_net),
        house_min: formatMoney(house_min),
        house_max: formatMoney(house_max),
        slab: formatMoney(slab_net),
        total_min: formatMoney(total_min),
        total_max: formatMoney(total_max),
        vat_hint: `+${Math.round(vat * 100)}% VAT (budownictwo mieszkaniowe)`
      }
    };
  }

  // ====== Expose ======
  window.ScanduraPricingEngine = {
    init,
    get store() { return STORE; }
  };
  window.computePrice = computePrice;          // V1 (per-koszyk)
  window.computePriceV2 = computePriceV2;      // <-- [ADD] V2 (tiers/m² + płyta)
})();
