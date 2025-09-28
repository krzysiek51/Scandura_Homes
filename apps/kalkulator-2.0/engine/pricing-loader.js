
/* Simple loader: fetch JSON files and init the engine */
(async () => {
  const loadJSON = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} ${res.status}`);
    return res.json();
  };
  try {
    const [baseTables, multipliers, costBuckets] = await Promise.all([
      loadJSON('./base-tables.json'),
      loadJSON('./multipliers.json'),
      loadJSON('./cost_buckets.json')
    ]);
    window.PRICING_BASE_TABLES = baseTables;
    window.PRICING_MULTIPLIERS = multipliers;
    window.PRICING_COST_BUCKETS = costBuckets;
    if (!window.ScanduraPricingEngine) throw new Error('Engine not loaded: include index.js first');
    window.ScanduraPricingEngine.init({ baseTables, multipliers, costBuckets });
    console.log('[Pricing] Engine initialized');
  } catch (e) {
    console.error('[Pricing] Loader error:', e);
  }
})();
