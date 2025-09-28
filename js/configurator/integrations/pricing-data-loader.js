
/**
 * pricing-data-loader.js (for /content/js/configurator/integrations/)
 * Loads JSONs from /apps/kalkulator-2.0/engine/ and exposes window.SCANDURA_PRICING_DATA
 * so that /content/js/configurator/integrations/price-engine.js can work.
 *
 * It also provides: window.whenPricingReady (Promise) and fires event 'ScanduraPricing:ready'.
 */
(() => {
  // Allow override from HTML if needed:
  const BASE = (window.PRICING_ASSETS_BASE || '/apps/kalkulator-2.0/engine/').replace(/\/?$/, '/');

  async function loadJSON(path) {
    const url = BASE + path;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
    return res.json();
  }

  window.whenPricingReady = window.whenPricingReady || new Promise(res => { window.__pricingReadyResolve = res; });

  (async function boot(){
    try {
      const [bt, mult, buckets] = await Promise.all([
        loadJSON('base-tables.json'),
        loadJSON('multipliers.json'),
        loadJSON('cost_buckets.json')
      ]);

      // Adapt shape expected by price-engine.js:
      const base_tables = bt?.table?.single_family ? { single_family: bt.table.single_family } : bt;
      window.SCANDURA_PRICING_DATA = {
        base_tables,      // expects { single_family: { DEW: { "80":{min,max}, ... } } }
        multipliers: mult,
        cost_buckets: buckets
      };

      console.log('[Pricing] Data loaded from', BASE);
      window.__pricingReadyResolve && window.__pricingReadyResolve();
      window.dispatchEvent(new Event('ScanduraPricing:ready'));
    } catch (e) {
      console.error('[Pricing] Data loader error:', e);
    }
  })();
})();
