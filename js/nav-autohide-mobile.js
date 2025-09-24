// /js/autohide-nav.js — bulletproof: hit-test bar + logo, no nav-hidden
(() => {
  'use strict';

  /** pick the real TOP BAR by hit-testing the top edge and climbing to a sane-height ancestor */
  const climbToBar = (el) => {
    while (el && el !== document.body && el !== document.documentElement) {
      const r = el.getBoundingClientRect();
      // Pasek ma zwykle 40–160 px i pełną szerokość (nie wymagamy fixed: czasem fixed ma rodzic)
      if (r.height >= 40 && r.height <= 160 && r.top > -4 && r.top < 40 && r.width >= window.innerWidth * 0.5) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  };

  const pickBar = () => {
    const pts = [12, 20, 28]; // różne wysokości nad krawędzią
    const xs  = [8, Math.floor(window.innerWidth/2), Math.max(8, window.innerWidth - 8)];
    for (const y of pts) {
      for (const x of xs) {
        const hit = document.elementFromPoint(x, y);
        const bar = climbToBar(hit);
        if (bar) return bar;
      }
    }
    // awaryjnie spróbuj klasycznych selektorów
    return (
      document.querySelector('.header .container.header__top') ||
      document.querySelector('.container.header__top') ||
      document.querySelector('.header .header__top') ||
      document.querySelector('.header__top')
    );
  };

  let BAR  = pickBar();
  const LOGO =
    document.querySelector('.header .header__logo') ||
    document.querySelector('.header__logo');

  if (!BAR) {
    console.warn('[autohide] BAR not found. Check structure.');
    return;
  }

  // prepare identical transition (no desync)
  const prep = (el) => {
    if (!el) return;
    el.style.willChange = 'transform';
    el.style.backfaceVisibility = 'hidden';
    el.style.transition = 'transform 0.22s cubic-bezier(.2,.7,.3,1)';
    el.style.transform  = 'translate3d(0,0,0)';
  };
  const prepAll = () => { prep(BAR); prep(LOGO); };

  const show = () => {
    BAR.style.transform = 'translate3d(0,0,0)';
    if (LOGO) LOGO.style.transform = 'translate3d(0,0,0)';
  };
  const hide = () => {
    BAR.style.transform = 'translate3d(0,-100%,0)';
    if (LOGO) LOGO.style.transform = 'translate3d(0,-100%,0)';
  };

  // Apple-like thresholds
  const HIDE_TH = 24, SHOW_TH = 12, MIN_D = 1;
  let lastY = window.scrollY || 0, acc = 0, ticking = false;

  // If mobile menu is open → keep bar visible
  const MENU = document.getElementById('mobile-menu');
  const isMenuOpen = () => MENU && MENU.getAttribute('aria-hidden') === 'false';

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y  = window.scrollY || 0;
      const dy = y - lastY;
      lastY = y;

      if (isMenuOpen() || y <= 0) { show(); acc = 0; ticking = false; return; }
      if (Math.abs(dy) < MIN_D)   { ticking = false; return; }

      if (dy > 0) { // down
        acc = acc >= 0 ? acc + dy : dy;
        if (acc > HIDE_TH) { hide(); acc = 0; }
      } else {       // up
        const up = -dy;
        acc = acc <= 0 ? acc - up : -up;
        if (-acc > SHOW_TH) { show(); acc = 0; }
      }
      ticking = false;
    });
  };

  const onResize = () => {
    // re-detect the bar if layout changed
    const prev = BAR;
    BAR = pickBar() || prev;
    prepAll();
    show();
    acc = 0; lastY = window.scrollY || 0;
  };

  // keep visible while menu open
  if (MENU) {
    new MutationObserver(() => { if (isMenuOpen()) show(); })
      .observe(MENU, { attributes: true, attributeFilter: ['aria-hidden'] });
  }

  // init
  prepAll();
  show();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize);
})();
