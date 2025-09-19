/* File: js/services-icons-watch.js (fix loop + autoplay) */
(() => {
  const ACTIVE_FLAGS = [
    'is-active',
    'splide__slide--active',
    'swiper-slide-active',
    'swiper-slide-duplicate-active',
    'glide__slide--active',
    'tns-slide-active'
  ];

  const getCards = () => Array.from(document.querySelectorAll('.services__card'));
  const getIcon  = (card) => card && card.querySelector('.services__icon');

  const isCardActive = (card) => {
    if (!card || card.getAttribute('aria-hidden') === 'true') return false;
    const cl = card.classList;
    return ACTIVE_FLAGS.some(f => cl.contains(f)) || cl.contains('is-active');
  };

  // --- RESET / DRAW ---------------------------------------------------------
  const hardResetIcon = (svg) => {
    if (!svg) return;
    svg.classList.remove('is-drawn');

    const lines = svg.querySelectorAll(
      '[data-draw], .st1, path[stroke], polyline[stroke], polygon[stroke], line[stroke], rect[stroke], circle[stroke]'
    );

    lines.forEach(el => { el.style.transition = 'none'; });
    // wymuszenie reflow
    svg.getBoundingClientRect();
    lines.forEach(el => { el.style.transition = ''; });
  };

  const drawIcon = (svg) => {
    if (!svg) return;
    hardResetIcon(svg);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        svg.classList.add('is-drawn');
      });
    });
  };

  // --- MAIN STATE -----------------------------------------------------------
  let lastActiveCard = null;
  let scheduled = false;

  const handleActiveChange = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;

      const cards = getCards();
      if (!cards.length) return;

      const active = cards.find(isCardActive) || cards[0];
      if (active === lastActiveCard) return; // nic się nie zmieniło — brak migania

      // reset nieaktywnych (zostają „puste”)
      cards.forEach(card => {
        if (card === active) return;
        const icon = getIcon(card);
        if (icon) icon.classList.remove('is-drawn');
      });

      // narysuj nową aktywną
      drawIcon(getIcon(active));

      lastActiveCard = active;
    });
  };

  const prepareAll = () => {
    getCards().forEach(card => hardResetIcon(getIcon(card)));
  };

  // --- OBSERVERS ------------------------------------------------------------
  const isSlideLike = (el) => {
    if (!(el instanceof Element)) return false;
    const cl = el.className || '';
    return (
      el.classList?.contains('services__card') ||
      /slide/i.test(cl) ||
      el.matches?.('.splide__slide, .swiper-slide, .glide__slide, .tns-item')
    );
  };

  const observeActiveClassMutations = () => {
    const root =
      document.querySelector('.services__slider') ||
      document.querySelector('.services') ||
      document.body;

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type !== 'attributes' || m.attributeName !== 'class') continue;

        const target = /** @type {Element} */(m.target);

        // >>> WAŻNE: ignoruj zmiany wewnątrz ikon (np. dodanie .is-drawn na SVG),
        // aby nie wywoływać własnej pętli.
        if (target.closest('.services__icon')) continue;

        // Reaguj tylko na karty/slajdy
        if (!isSlideLike(target)) continue;

        handleActiveChange();
        break;
      }
    });

    mo.observe(root, { attributes: true, subtree: true, attributeFilter: ['class'] });
    return mo;
  };

  // Fallback, jeśli slider nie zmienia klas (same translacje)
  const startActivePoller = () => {
    let lastSig = null;
    return setInterval(() => {
      const cards = getCards();
      if (!cards.length) return;
      const active = cards.find(isCardActive) || cards[0];
      const sig = active ? (active.dataset.slideIndex || cards.indexOf(active)) : 'none';
      if (sig !== lastSig) {
        lastSig = sig;
        handleActiveChange();
      }
    }, 400);
  };

  // --- LIFECYCLE ------------------------------------------------------------
  const onVisibility = () => {
    if (document.visibilityState === 'visible') handleActiveChange();
  };

  const init = () => {
    // 1) pusta kartka wszędzie (również dla autoplay bez dotyku)
    prepareAll();

    // 2) narysuj aktualnie aktywną (pierwszy widok)
    handleActiveChange();

    // 3) obserwuj zmiany klas kart/slajdów (z pominięciem .services__icon)
    observeActiveClassMutations();

    // 4) fallback-poller
    startActivePoller();

    // 5) visibility + debounced resize
    document.addEventListener('visibilitychange', onVisibility);

    let rto = null;
    window.addEventListener('resize', () => {
      clearTimeout(rto);
      rto = setTimeout(() => {
        prepareAll();
        // wyczyść „ostatnią aktywną”, żeby wymusić dorysowanie po dużym przeliczeniu layoutu
        lastActiveCard = null;
        handleActiveChange();
      }, 150);
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
