(() => {
  'use strict';
  if (window.__KALK_ROUTER__) return; window.__KALK_ROUTER__ = true;

  window.addEventListener('calc:navigate', (e) => {
    console.log('[router] navigate →', e.detail);
    // TODO: podłącz przełączanie kroków
  });
})();
