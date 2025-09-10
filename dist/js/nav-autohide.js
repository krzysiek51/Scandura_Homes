// nav-autohide.js
(() => {
  const nav = document.querySelector('nav#mobile-menu.header__nav');
  if (!nav) return;

  // Opcje
  const MQ_MIN = '(min-width: 1440px)';
  const SHOW_NEAR_TOP = 120;     // px od topu – zawsze pokaż
  const DOWN_DELTA = 24;         // minimalna zmiana w dół, by schować
  const UP_DELTA = 12;           // minimalna zmiana w górę, by pokazać
  const EDGE_REVEAL = 16;        // px od górnej krawędzi ekranu dla hover-reveal

  const mq = window.matchMedia(MQ_MIN);
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasFinePointer = matchMedia('(pointer: fine)').matches;

  let lastY = window.scrollY;
  let ticking = false;
  let lockedByFocus = false;

  const headerTop = document.querySelector('.header .container.header__top');

  function show() {
    nav.classList.remove('is-hidden');
    document.documentElement.classList.remove('nav-hidden'); // <<< DODANE
  }

  function hide() {
    if (!nav.classList.contains('is-open') && !lockedByFocus) {
      nav.classList.add('is-hidden');
      document.documentElement.classList.add('nav-hidden'); // <<< DODANE
    }
  }

  function onScroll() {
    if (!mq.matches || prefersReduced.matches) return;

    const y = window.scrollY;
    const dy = y - lastY;

    // Zawsze pokaż blisko topu
    if (y <= SHOW_NEAR_TOP) {
      show();
      lastY = y;
      return;
    }

    // Kierunek przewijania z progami
    if (dy > DOWN_DELTA && !lockedByFocus) {
      hide();
      lastY = y;
    } else if (dy < -UP_DELTA) {
      show();
      lastY = y;
    }
  }

  function onScrollRaf() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }

  function onMouseMove(e) {
    if (!mq.matches || prefersReduced.matches) return;
    if (!hasFinePointer) return;                // brak hover na dotyku
    if (e.clientY <= EDGE_REVEAL) show();       // dotknięcie górnej krawędzi = pokaż
  }

  function onFocusIn(e) {
    if (!mq.matches) return;
    if (nav.contains(e.target) || (headerTop && headerTop.contains(e.target))) {
      lockedByFocus = true;
      show();
    }
  }

  function onFocusOut() {
    if (!mq.matches) return;
    // po krótkiej chwili sprawdź, gdzie jest focus
    setTimeout(() => {
      const a = document.activeElement;
      if (!(nav.contains(a) || (headerTop && headerTop.contains(a)))) {
        lockedByFocus = false;
      }
    }, 0);
  }

  function syncState() {
    if (!mq.matches || prefersReduced.matches) {
      // Poza zakresem: zawsze widoczny
      nav.classList.remove('is-hidden');
      document.documentElement.classList.remove('nav-hidden'); // <<< DODANE
      return;
    }
    // W zakresie: startowo pokaż
    show();
    lastY = window.scrollY;
  }

  // Listeners
  window.addEventListener('scroll', onScrollRaf, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  mq.addEventListener?.('change', syncState);
  prefersReduced.addEventListener?.('change', syncState);
  window.addEventListener('load', syncState);
  window.addEventListener('resize', syncState);

  // Gdyby overlay mobilny używał .is-open również na desktopie – zawsze pokazuj
  const observer = new MutationObserver(() => {
    if (nav.classList.contains('is-open')) show();
  });
  observer.observe(nav, { attributes: true, attributeFilter: ['class'] });
})();
