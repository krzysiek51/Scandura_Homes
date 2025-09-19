// mission-anim.js — Apple-like scroll-synced wejście .mission
// Zoom-out + parallax obrazu -> dekor -> typografia (kaskadowo, once dla tekstów)

(() => {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** DEBUG **/
  let _dbgTick = 0;
  const debugLog = (section, t, pImg) => {
    if (!window.__missionDebug) return;
    if ((_dbgTick++ % 10) !== 0) return;
    const cs = getComputedStyle(section);
    console.log('[mission]', {
      t: +t.toFixed(3),
      pImg: +pImg.toFixed(3),
      scaleStart: cs.getPropertyValue('--img-scale-start').trim(),
      parallax:   cs.getPropertyValue('--img-parallax').trim(),
      lift:       cs.getPropertyValue('--img-lift').trim()
    });
  };

  /** EASING (decelerate) **/
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /** Mapuje globalny progress [0..1] do okna [a..b] (z opcją easing) **/
  const win = (t, a, b, ease = true) => {
    if (b === a) return t >= b ? 1 : 0;
    const x = clamp01((t - a) / (b - a));
    return ease ? easeOutCubic(x) : x;
  };

  /** Liczy globalny progress sekcji w viewport (0..1) */
  const computeProgressFactory = (section) => {
    const ds = parseFloat(section.getAttribute('data-start') || '0.72');
    const de = parseFloat(section.getAttribute('data-end')   || '0.28');

    return () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      const start = vh * ds;
      const end   = vh * de;

      const total  = r.height + (start - end);
      const passed = start - r.top;
      return clamp01(passed / Math.max(1, total));
    };
  };

  /** Ustaw końcowe stany dla reduced motion */
  const setFinal = (section) => {
    section.style.setProperty('--p', '1');
    section.style.setProperty('--p-img', '1');
    section.style.setProperty('--p-dots', '1');
    section.style.setProperty('--p-div', '1');
    section.style.setProperty('--p-title', '1');
    section.style.setProperty('--p-sub', '1');
    section.style.setProperty('--p-text', '1');
    section.style.setProperty('--p-btn', '1');
  };

  /** Aktualizacja zmiennych CSS dla danej sekcji */
  const updateVars = (section, t) => {
    // Obraz/dots/divider — scroll-synced jak dotąd
    const pImg  = win(t, 0.00, 0.28);
    const pDots = win(t, 0.12, 0.38);
    const pDiv  = win(t, 0.18, 0.44);

    // Teksty — nowy timing z delikatnym staggerem + "once" (latch)
    // okna pod ~0.72s feeling i decelerate:
    const tl = section.__textLatch ?? 0;
    const tLatched = Math.max(tl, t);       // nie cofamy tekstów po wejściu
    section.__textLatch = tLatched;

    const pTit = win(tLatched, 0.34, 0.52);
    const pSub = win(tLatched, 0.37, 0.57);
    const pTxt = win(tLatched, 0.41, 0.63);
    const pBtn = win(tLatched, 0.46, 0.70);

    section.style.setProperty('--p',       t.toFixed(4));
    section.style.setProperty('--p-img',   pImg.toFixed(4));
    section.style.setProperty('--p-dots',  pDots.toFixed(4));
    section.style.setProperty('--p-div',   pDiv.toFixed(4));
    section.style.setProperty('--p-title', pTit.toFixed(4));
    section.style.setProperty('--p-sub',   pSub.toFixed(4));
    section.style.setProperty('--p-text',  pTxt.toFixed(4));
    section.style.setProperty('--p-btn',   pBtn.toFixed(4));

    debugLog(section, t, pImg);
  };

  /** Inicjalizacja pojedynczej sekcji .mission */
  const initOne = (section) => {
    if (prefersReduced) {
      setFinal(section);
      return () => {};
    }

    const computeProgress = computeProgressFactory(section);

    let ticking = false;
    const rafUpdate = () => {
      ticking = false;
      const t = computeProgress();
      updateVars(section, t);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(rafUpdate);
      }
    };

    // IntersectionObserver: trigger wg wytycznych (threshold ~0.18, rootMargin -10%)
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) {
          section.classList.add('is-armed');
          onScroll(); // natychmiast
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
        } else {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      },
      { root: null, threshold: 0.18, rootMargin: '0px 0px -10% 0px' }
    );

    io.observe(section);

    // Wejście „w połowie” po odświeżeniu / nawigacji z kotwicy
    onScroll();
    setTimeout(onScroll, 50);
    setTimeout(onScroll, 200);

    // Cleanup
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  };

  /** Inicjalizacja wszystkich sekcji .mission */
  const init = () => {
    const sections = Array.from(document.querySelectorAll('.mission'));
    if (!sections.length) return;
    const cleanups = sections.map(initOne);
    window.__missionAnimCleanup = () => cleanups.forEach((fn) => fn && fn());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
