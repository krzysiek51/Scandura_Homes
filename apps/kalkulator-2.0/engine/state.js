(() => {
  'use strict';
  if (window.__KALK_STATE__) return; window.__KALK_STATE__ = true;

  const bus = new EventTarget();
  const state = {
    inputs: {
      area_m2: 100,
      floors: 1,
      scope: 'pod_klucz_standard',    // 'ssz' | 'pod_klucz_standard' | 'pod_klucz_premium' | 'pod_klucz_basic'
      variant: 'standard',            // 'basic' | 'standard' | 'premium'
      garage: { mode: 'none', key: null, m2: 0 } // mode: 'none' | 'by_unit' | 'by_m2'
    },
    data: { pricing: null, garages: null, modifiers: null }
  };

  const api = {
    get: () => structuredClone(state),
    set(patch = {}) {
      Object.assign(state.inputs, patch);
      bus.dispatchEvent(new CustomEvent('calc:changed', { detail: { kind: 'inputs', patch } }));
    },
    setData({ pricing, garages, modifiers } = {}) {
      if (pricing)  state.data.pricing  = pricing;
      if (garages)  state.data.garages  = garages;
      if (modifiers)state.data.modifiers= modifiers;
      bus.dispatchEvent(new CustomEvent('calc:changed', { detail: { kind: 'data' } }));
    },
    on: (t, cb) => bus.addEventListener(t, cb),
    off: (t, cb) => bus.removeEventListener(t, cb)
  };

  window.KALK_STATE = api;
})();
