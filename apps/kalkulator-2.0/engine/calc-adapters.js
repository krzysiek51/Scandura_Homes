(() => {
  'use strict';
  if (window.CALC) return; // prosty guard – jeden adapter na stronę

  const STATE = {
    // wyboru użytkownika (wizard)
    area: 100,            // m² – baseline
    storeys: 1,           // 1 lub 2
    roof: 'gabled',       // 'gabled' | 'flat'
    zone: 'center',       // 'north' | 'center' | 'south'
    // wyniki
    base: 0,
    total: 0,
    loaded: false,
  };

  // Pobranie pricing.master.json
  async function loadPricing() {
    const tries = [
      '/apps/kalkulator-2.0/data/pricing.master.json',
      'apps/kalkulator-2.0/data/pricing.master.json'
    ];
    let lastErr;
    for (const url of tries) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('pricing.master.json not found');
  }

  // Heurystyka: suma średnich (min/max) ze wszystkich sekcji
  function averageOf(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const min = Number(obj.min ?? obj.MIN);
    const max = Number(obj.max ?? obj.MAX);
    if (Number.isFinite(min) && Number.isFinite(max) && max > 0) return (min + max) / 2;
    if (Number.isFinite(min) && min > 0) return min;
    if (Number.isFinite(max) && max > 0) return max;
    return null;
  }
  function computeBaseFromSections(json) {
    const sections = json?.sections || json?.scopes || json;
    if (!sections || typeof sections !== 'object') return 0;
    let total = 0; let used = 0;
    for (const entry of Object.values(sections)) {
      if (!entry || typeof entry !== 'object') continue;
      const a = averageOf(entry);
      if (a) { total += a; used++; continue; }
      const nested = Object.values(entry).find(v => averageOf(v));
      if (nested) { total += averageOf(nested) || 0; used++; }
    }
    return used ? total : 0;
  }

  // Mnożniki (iteracja 1 – proste)
  const MULT = {
    areaBase: 100,      // punkt odniesienia m²
    storeys2: 1.08,     // +8% dla 2 kondygnacji
    roofFlat: 0.97,     // -3% dla dachu płaskiego
    zoneNorth: 1.00,
    zoneCenter: 1.00,
    zoneSouth: 1.00,
  };

  // Recalc total
  function recalc() {
    const areaFactor    = Math.max(STATE.area, 1) / MULT.areaBase;
    const storeysFactor = STATE.storeys === 2 ? MULT.storeys2 : 1.0;
    const roofFactor    = STATE.roof === 'flat' ? MULT.roofFlat : 1.0;
    let zoneFactor = 1.0;
    if (STATE.zone === 'north') zoneFactor = MULT.zoneNorth;
    if (STATE.zone === 'center') zoneFactor = MULT.zoneCenter;
    if (STATE.zone === 'south') zoneFactor = MULT.zoneSouth;

    STATE.total = Math.round(STATE.base * areaFactor * storeysFactor * roofFactor * zoneFactor);

    // powiadom UI (step-quote u Ciebie to obsługuje)
    window.dispatchEvent(new CustomEvent('calc:price', { detail: { total: STATE.total } }));
  }

  // API publiczne
  async function load() {
    if (STATE.loaded) return STATE.base;
    try {
      const json = await loadPricing();
      STATE.base = computeBaseFromSections(json);
      STATE.loaded = true;
      recalc();
      return STATE.base;
    } catch (e) {
      console.warn('[CALC] Nie udało się wczytać pricing.master.json', e);
      STATE.base = 0;
      STATE.loaded = true;
      recalc();
      return STATE.base;
    }
  }

  function setState(patch = {}) {
    Object.assign(STATE, patch);
    if (STATE.loaded) recalc();
  }

  function getQuote() { return { base: STATE.base, total: STATE.total }; }
  function getTotal() { return STATE.total; }

  // Upublicznij
  window.CALC = { state: STATE, load, setState, recalc, getQuote, getTotal };

  // Autostart – wczytaj pricing i policz bazę po załadowaniu strony
  // (UI zobaczy skeleton, potem dostanie event calc:price)
  load();
})();