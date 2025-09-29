/* Simple loader: fetch JSON files and init the engine */
(async () => {
  const loadJSON = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${url} ${res.status}`);
    return res.json();
  };

  try {
    // 🔧 USTAW KATALOG Z DANYMI
    const ROOT = '/apps/kalkulator-2.0/engine/'; // <- dostosuj do swojej struktury

    const [baseTables, multipliers, costBuckets] = await Promise.all([
      loadJSON(ROOT + 'base-tables.json'),
      loadJSON(ROOT + 'multipliers.json'),
      loadJSON(ROOT + 'cost_buckets.json'),
    ]);

    // jeśli wolisz także pobierać tiers z pliku, możesz dodać:
    // const pricingTiers = await loadJSON(ROOT + 'pricing-tiers.json');
    const pricingTiers = window.PRICING_TIERS; // u Ciebie już jest z HTML

    // przypięcie do window (do ręcznych testów w konsoli)
    window.PRICING_BASE_TABLES  = baseTables;
    window.PRICING_MULTIPLIERS  = multipliers;
    window.PRICING_COST_BUCKETS = costBuckets;

    if (!window.ScanduraPricingEngine) throw new Error('Engine not loaded: include index.js first');

    window.ScanduraPricingEngine.init({
      baseTables,
      multipliers,
      costBuckets,
      pricingTiers, // << kluczowe
    });

    console.log('[Pricing] Engine initialized');
  } catch (e) {
    console.error('[Pricing] Loader error:', e);
  }
})();
