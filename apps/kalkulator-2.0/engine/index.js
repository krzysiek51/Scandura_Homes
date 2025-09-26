(() => {
  'use strict';
  if (window.__KALK_INDEX__) return; window.__KALK_INDEX__ = true;

  const CALC = {
    async init({ base = './' } = {}) {
      const data = await window.KALK_LOADERS.loadAll(base);
      window.KALK_STATE.setData(data);
      return true;
    },
    state: () => window.KALK_STATE?.get(),
    set:   (patch) => window.KALK_STATE?.set(patch),
    compute: () => window.KALK_CORE?.computeTotal()
  };

  window.CALC = CALC;
})();
