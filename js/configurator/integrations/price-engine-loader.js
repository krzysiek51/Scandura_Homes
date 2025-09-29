// global helpers — używane przez Step 9 i silnik
window.__CFG_GET_STATE = () =>
  (window.__CFG_LAST_STATE || window.__CFG_STATE || window.__CFG?.state || {});

window.__deriveAreaM2 = function(state){
  const n = (v) => { const x = Number(v); return Number.isFinite(x) && x>0 ? Math.round(x) : null; };
  const direct =
    n(state.area_m2) ??
    n(state.areaExact) ??
    n(state.area?.exact) ??
    n(state.area?.m2);
  if (direct != null) return direct;

  const raw = state.areaChoice ?? state.area?.choice ?? state.area?.value ?? state.area?.label ?? state.area?.range;
  if (!raw) return null;
  const key = String(raw).replace(/\s+/g,'').replace(/[\u2010-\u2015–—−-]/g,'-').toLowerCase();
  const map = { '0-35':25,'do-35':25,'36-70':55,'71-100':85,'101-150':125,'151-200':175,'201-250':225 };
  return map[key] ?? null;
};
