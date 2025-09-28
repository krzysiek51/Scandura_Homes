
// DevTools console tests
const T = (name, fn) => { try { const r = fn(); console.log(`✅ ${name}`, r||'OK'); } catch(e){ console.error(`❌ ${name}`, e.code||e.tag||e.message, e); } };

T('INIT sanity', () => {
  const s = ScanduraPricingEngine.store;
  if (!s.base || !s.mult || !s.buckets) throw 'Brak danych w STORE';
});

T('Baseline DEW 100m²', () => {
  const res = computePrice({ shell:'DEW', area_m2:100, storeys:'parter', roof:'gabled_2', garage:'none', city:'Gdańsk' });
  console.log(res);
  if (res.min < 279000 || res.max > 381000) throw `Poza kotwicą 280–380k: ${res.min}–${res.max}`;
});

T('120m² + garaż 1-stan w bryle', () => {
  const res = computePrice({ shell:'DEW', area_m2:120, storeys:'parter', roof:'gabled_2', garage:'attached_1', city:'Gdynia' });
  console.log(res);
});

T('plus_1 (schody + multipliers)', () => {
  const res = computePrice({ shell:'DEW', area_m2:100, storeys:'plus_1', roof:'gabled_2', garage:'none', city:'Sopot' });
  console.log(res);
});

T('hip_4 roof effects', () => {
  const res = computePrice({ shell:'DEW', area_m2:100, storeys:'parter', roof:'hip_4', garage:'none', city:'Gdańsk' });
  console.log(res);
});

T('flat roof effects', () => {
  const res = computePrice({ shell:'DEW', area_m2:100, storeys:'parter', roof:'flat', garage:'none', city:'Gdańsk' });
  console.log(res);
});
