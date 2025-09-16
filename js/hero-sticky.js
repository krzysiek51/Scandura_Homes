// js/hero-steps.js
(() => {
  // Ustaw wrapper class na sekcji, która BEZPOŚREDNIO zawiera Twój <header class="header">
  // <section class="hero-steps"> ... <header class="header"> ... </header> ... </section>
  const wrapper = document.querySelector('.hero-steps');
  if (!wrapper) return;

  const header = wrapper.querySelector('.header');
  if (!header) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    wrapper.classList.remove('hs-step-2', 'hs-step-3');
    wrapper.classList.add('hs-step-1');
    return;
  }

  let lastStep = 0;

  // Funkcja liczy progres „przejścia” headera przez viewport (0..1)
  const computeProgress = () => {
    const rect = header.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // gdy górna krawędź jest tuż nad górą ekranu -> 0
    // gdy dolna krawędź dosięga dołu -> 1
    const total = rect.height + vh;
    const passed = vh - Math.max(Math.min(rect.bottom, vh), 0); // 0..vh
    const prog = Math.min(Math.max((passed + rect.height * 0.0) / total, 0), 1);
    return prog; // 0..1
  };

  const toStep = (p) => (p < 0.33 ? 1 : p < 0.66 ? 2 : 3);

  const setStep = (step) => {
    if (step === lastStep) return;
    wrapper.classList.remove('hs-step-1', 'hs-step-2', 'hs-step-3');
    wrapper.classList.add(`hs-step-${step}`);
    lastStep = step;
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const p = computeProgress();
      setStep(toStep(p));
      ticking = false;
    });
  };

  // Inicjalizacja
  wrapper.classList.add('hs-step-1');
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
