// mission-anim.js
// Scroll-synced "Apple-like" wejście sekcji .mission (zoom-out obrazu → potem typografia).
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** EASING **/
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /** Mapuje globalny progress [0..1] do okna [a..b] **/
  const win = (t, a, b, ease = true) => {
    const x = clamp01((t - a) / Math.max(1e-6, (b - a)));
    return ease ? easeOutCubic(x) : x;
  };

  /** Główna inicjalizacja **/
  const initMission = () => {
    const section = document.querySelector('.mission');
    if (!section) return;

    // prefer-reduced-motion → ustaw stany końcowe
    if (prefersReduced) {
      section.style.setProperty('--p', '1');
      section.style.setProperty('--p-img', '1');
      section.style.setProperty('--p-dots', '1');
      section.style.setProperty('--p-div', '1');
      section.style.setProperty('--p-title', '1');
      section.style.setProperty('--p-sub', '1');
      section.style.setProperty('--p-text', '1');
      section.style.setProperty('--p-btn', '1');
      return;
    }

    // Zakres aktywacji względem viewportu
    // start: gdy górna krawędź sekcji dojedzie do ~72% wysokości okna
    // end:   gdy dolna krawędź sekcji minie ~28% wysokości okna
    const computeProgress = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      const start = vh * 0.72;
      const end   = vh * 0.28;

      const total = (r.height + start - end);
      const passed = (start - r.top);
      const t = clamp01(passed / Math.max(1, total));
      return t;
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      const t = computeProgress();   // globalny progress 0..1
      section.style.setProperty('--p', t.toFixed(4));

      // SEKWENCJA:
      // Obraz kończy się szybciej (0.00 → 0.22), zanim ruszą teksty.
      // Potem: dots, divider, tytuł, podtytuł, tekst, CTA.
      const pImg  = win(t, 0.00, 0.22);   // 🔥 ZDJĘCIE — zoom-out i lekki parallax
      const pDots = win(t, 0.12, 0.36);
      const pDiv  = win(t, 0.18, 0.44);
      const pTit  = win(t, 0.30, 0.58);
      const pSub  = win(t, 0.38, 0.68);
      const pTxt  = win(t, 0.48, 0.86);
      const pBtn  = win(t, 0.64, 1.00);

      section.style.setProperty('--p-img',  pImg.toFixed(4));
      section.style.setProperty('--p-dots', pDots.toFixed(4));
      section.style.setProperty('--p-div',  pDiv.toFixed(4));
      section.style.setProperty('--p-title',pTit.toFixed(4));
      section.style.setProperty('--p-sub',  pSub.toFixed(4));
      section.style.setProperty('--p-text', pTxt.toFixed(4));
      section.style.setProperty('--p-btn',  pBtn.toFixed(4));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    // IO: liczymy tylko, kiedy sekcja jest w kadrze
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting) {
        onScroll(); // natychmiast
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }, { root: null, threshold: [0, 0.01, 0.1, 0.5, 0.9, 1] });

    io.observe(section);

    // Wejście „w połowie” po odświeżeniu
    onScroll();
    setTimeout(onScroll, 50);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMission, { once: true });
  } else {
    initMission();
  }
})();
