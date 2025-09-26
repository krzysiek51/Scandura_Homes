(() => {
  'use strict';
  if (window.__KALK_LOADERS__) return; window.__KALK_LOADERS__ = true;

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Nie można wczytać ' + path);
    return res.json();
  }

  const loaders = {
    async loadAll(base = './') {
      // Używaj ścieżek względnych względem HTML-a, który ładuje skrypty (np. demo.html)
      const pricing   = await loadJSON(base + 'data/pricing.master.json');
      const garages   = await loadJSON(base + 'data/garages.json');
      const modifiers = await loadJSON(base + 'data/modifiers.json');
      return { pricing, garages, modifiers };
    }
  };

  window.KALK_LOADERS = loaders;
})();
