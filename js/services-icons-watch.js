/* File: js/services-icons-watch.js  — click-spam safe, stable signature, no redraw loops */
(() => {
  // --- Konfiguracja ---------------------------------------------------------
  const ACTIVE_FLAGS = [
    'is-active',
    'splide__slide--active',
    'swiper-slide-active',
    'swiper-slide-duplicate-active',
    'glide__slide--active',
    'tns-slide-active'
  ];
  const SIG_ATTRS = [
    'data-uid',
    'data-slide-id',
    'data-swiper-slide-index',
    'data-splide-index',
    'data-glide-index',
    'data-index'
  ];
  const COOLDOWN_MS = 1200; // ile minimum czasu musi minąć, aby ten sam slajd można było znów narysować

  // --- Helpers --------------------------------------------------------------
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const getCards = () => qsa('.services__card');
  const getIcon  = (card) => card && card.querySelector('.services__icon');

  const isCardActive = (card) => {
    if (!card || card.getAttribute('aria-hidden') === 'true') return false;
    const cl = card.classList;
    return ACTIVE_FLAGS.some(f => cl.contains(f)) || cl.contains('is-active');
  };

  const ensureStableUids = () => {
    // Podpisz pierwotne karty stabilnym data-uid (klony sliderów skopiują atrybut)
    getCards().forEach((card, i) => {
      if (!card.dataset.uid) card.dataset.uid = String(i);
    });
  };

  const cardSignature = (card) => {
    if (!card) return 'none';
    for (const a of SIG_ATTRS) {
      const v = card.getAttribute(a);
      if (v != null) return `${a}:${v}`;
    }
    // fallback: po treści
    const img = card.querySelector('.services__image');
    const title = card.querySelector('.services__card-title');
    return `f:${img?.getAttribute('src') || ''}|${(title?.textContent || '').trim()}`;
  };

  const lineSelector = '[data-draw], .st1, path[stroke], polyline[stroke], polygon[stroke], line[stroke], rect[stroke], circle[stroke]';

  const hardResetIcon = (svg) => {
    if (!svg) return;
    svg.classList.remove('is-drawn');
    const lines = svg.querySelectorAll(lineSelector);
    lines.forEach(el => { el.style.transition = 'none'; });
    svg.getBoundingClientRect(); // reflow
    lines.forEach(el => { el.style.transition = ''; });
  };

  // --- Stan globalny --------------------------------------------------------
  let lastActiveSig = null;
  let scheduled = false;
  const animating = new WeakSet();        // ikonka w trakcie rysowania
  const cooldownUntil = new Map();        // sig -> timestamp do kiedy blokujemy ponowne rysowanie

  const drawIcon = (svg, sig) => {
    if (!svg) return;

    // Lock per ikona
    if (animating.has(svg)) return;

    const now = performance.now();
    if (sig && (cooldownUntil.get(sig) || 0) > now) return;

    animating.add(svg);
    if (sig) cooldownUntil.set(sig, now + COOLDOWN_MS);

    hardResetIcon(svg);

    // Opóźnij do kolejnej klatki, żeby CSS "pusta kartka" na pewno się przyjął
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        svg.classList.add('is-drawn');

        // Prostą drogą: po maksymalnym czasie animacji zdejmij lock
        // (900ms transition + ewentualne drobne opóźnienia/stagger)
        setTimeout(() => {
          animating.delete(svg);
        }, 1500);
      });
    });
  };

  const handleActiveChange = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;

      const cards = getCards();
      if (!cards.length) return;

      const activeCard = cards.find(isCardActive) || cards[0];
      const sig = cardSignature(activeCard);

      if (sig === lastActiveSig) return; // ta sama karta — nic nie robimy

      // Wyzeruj nieaktywne (zostają puste)
      for (const card of cards) {
        if (card === activeCard) continue;
        const icon = getIcon(card);
        if (icon) icon.classList.remove('is-drawn');
      }

      // Dorysuj aktywną
      drawIcon(getIcon(activeCard), sig);
      lastActiveSig = sig;
    });
  };

  const prepareAll = () => {
    // Ustaw „pustą kartkę” dla wszystkich ikon na start / po resize
    getCards().forEach(card => hardResetIcon(getIcon(card)));
  };

  // --- Observers & fallback -------------------------------------------------
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

        const target = /** @type {Element} */ (m.target);

        // ignoruj zmiany wewnątrz SVG, żeby nie wywoływać samych siebie
        if (target.closest('.services__icon')) continue;

        // reaguj tylko na karty/slajdy
        if (!isSlideLike(target)) continue;

        handleActiveChange();
        break;
      }
    });

    mo.observe(root, { attributes: true, subtree: true, attributeFilter: ['class'] });
    return mo;
  };

  const startActivePoller = () => {
    let lastSig = null;
    return setInterval(() => {
      const cards = getCards();
      if (!cards.length) return;
      const active = cards.find(isCardActive) || cards[0];
      const sig = cardSignature(active);
      if (sig !== lastSig) {
        lastSig = sig;
        handleActiveChange();
      }
    }, 400);
  };

  // --- Inicjalizacja --------------------------------------------------------
  const onVisibility = () => {
    if (document.visibilityState === 'visible') handleActiveChange();
  };

  const init = () => {
    ensureStableUids();   // stabilne podpisy przed tym, jak slider sklonuje slajdy
    prepareAll();         // pusta kartka od razu (również dla autoplay)
    handleActiveChange(); // narysuj pierwszą aktywną

    observeActiveClassMutations();
    startActivePoller();

    document.addEventListener('visibilitychange', onVisibility);

    // Debounce resize → reset + dorysowanie aktywnej
    let rto = null;
    window.addEventListener('resize', () => {
      clearTimeout(rto);
      rto = setTimeout(() => {
        prepareAll();
        lastActiveSig = null;  // wymuś dorysowanie po przeliczeniu layoutu
        handleActiveChange();
      }, 150);
    }, { passive: true });

    // (opcjonalnie) nic nie klikamy wewnątrz SVG — mniej niepotrzebnych mutacji/focusów
    qsa('.services__icon').forEach(svg => {
      svg.style.pointerEvents = 'none';
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

