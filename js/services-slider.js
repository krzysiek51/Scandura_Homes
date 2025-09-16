// /js/services-slider.js
(() => {
  const section = document.querySelector('.services');
  if (!section) return;

  const slider  = section.querySelector('.services__slider');
  const prevBtn = section.querySelector('.services__arrow--prev');
  const nextBtn = section.querySelector('.services__arrow--next');
  if (!slider) return;

  // wyłącz natywny snap/scroll poziomy – kontrolę przejmuje JS
  slider.style.scrollSnapType = 'none';
  slider.style.overflowX = 'hidden';
  slider.style.webkitOverflowScrolling = 'auto';
  slider.style.touchAction = 'pan-y';

  // oryginalne karty
  const originals = Array.from(slider.querySelectorAll('.services__card'));
  if (!originals.length) return;

  // tor
  let track = slider.querySelector('.services__track');
  if (!track) {
    track = document.createElement('div');
    track.className = 'services__track';
    originals.forEach(c => track.appendChild(c));
    slider.appendChild(track);
  }
  track.style.touchAction = 'pan-y';

  // MQ
  const MQ = {
    mobile: window.matchMedia('(max-width: 743px)'),
    tablet: window.matchMedia('(min-width: 744px) and (max-width: 1439px)'),
    laptop: window.matchMedia('(min-width: 1440px) and (max-width: 1919px)'),
    desktop: window.matchMedia('(min-width: 1920px)')
  };
  const getCardsPerView = () => {
    if (MQ.tablet.matches) return 2;
    if (MQ.laptop.matches || MQ.desktop.matches) return 2;
    return 1;
  };

  // konfiguracja
  const CONFIG = {
    transitionMs: 600,
    ease: 'cubic-bezier(.22,.61,.36,1)',
    swipeThresholdPx: 24,
    autoplay: true,
    autoplayMs: 4000,
    keyboard: true,
    respectReducedMotion: true,
    offsetPx: 20
  };
  const prefersReduced = CONFIG.respectReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // stan
  const ORG = originals.length;
  let cpv = getCardsPerView();
  let CLONES = Math.max(1, cpv);
  let baseOffset = CLONES;
  let index = baseOffset;
  let centers = [], lefts = [], widths = [], viewportW = 0;
  let currentX = 0;
  let isDragging = false;
  let dragStartX = 0, dragStartTranslate = 0;
  let autoTimer = null;

  // Guardy do pętli
  let isNormalizing = false;
  let isAnimating = false;

  // helpers
  const getCards = () => Array.from(track.children).filter(el => el.classList.contains('services__card'));
  const setTransition = (on) => {
    track.style.transition = on && !prefersReduced
      ? `transform ${CONFIG.transitionMs}ms ${CONFIG.ease}`
      : 'none';
  };

  const cloneCard = (orig) => {
    const n = orig.cloneNode(true);
    n.classList.add('is-clone');
    n.setAttribute('aria-hidden', 'true');
    n.querySelectorAll('a,button,input,select,textarea').forEach(el => el.tabIndex = -1);
    return n;
  };

  const rebuildClones = () => {
    Array.from(track.querySelectorAll('.services__card.is-clone')).forEach(n => n.remove());
    cpv = getCardsPerView();
    CLONES = Math.max(1, cpv);

    originals.slice(-CLONES).map(cloneCard).forEach(n => track.insertBefore(n, track.firstChild));
    originals.slice(0, CLONES).map(cloneCard).forEach(n => track.appendChild(n));

    baseOffset = CLONES;
    index = baseOffset;
    getCards().forEach(c => { c.style.scrollSnapAlign = 'none'; });
  };

  const measure = () => {
    const was = track.style.transition;
    track.style.transition = 'none';

    const cards = getCards();
    const rectT = track.getBoundingClientRect();
    viewportW = slider.clientWidth;

    centers = []; lefts = []; widths = [];
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const l = r.left - rectT.left;
      lefts.push(l);
      widths.push(r.width);
      centers.push(l + r.width / 2);
    });

    applyTransformForIndex(index);
    track.style.transition = was;
  };

  const computeTargetX = (i) => {
    const cards = getCards();
    if (!cards.length || !lefts.length) return currentX;
    const cpvNow = getCardsPerView();

    if (cpvNow === 1) {
      return -(centers[i] - viewportW / 2) - CONFIG.offsetPx;
    } else {
      return -lefts[i] - CONFIG.offsetPx;
    }
  };

  const applyTransformForIndex = (i) => {
    const x = Math.round(computeTargetX(i));
    currentX = x;
    track.style.transform = `translateX(${x}px)`;
  };

  // Granice logiczne (dla UI/disabled, autoplay) — ostatni lewy realny indeks, który mieści pełny kadr
  const firstReal = () => baseOffset;
  const lastRealVisible = () => baseOffset + ORG - getCardsPerView();

  const updateUI = () => {
    getCards().forEach((c, i) => c.classList.toggle('is-active', i === index));
    if (prevBtn) prevBtn.disabled = false; // w pętli nic nie wyłączamy
    if (nextBtn) nextBtn.disabled = false;
  };

  const goTo = (i, animate = true) => {
    index = i;
    isAnimating = animate;
    setTransition(animate);
    applyTransformForIndex(index);
    updateUI();
  };

  // Normalizacja po animacji (tylko dla transform)
  const normalizeIfNeeded = () => {
    if (isNormalizing) return;
    const first = firstReal();
    const lastReal = baseOffset + ORG - 1;

    if (index < first || index > lastReal) {
      isNormalizing = true;
      // przemapowanie indeksu na odpowiadający oryginał
      if (index < first) index += ORG;
      if (index > lastReal) index -= ORG;

      // teleport bez animacji w następnym frame — nie widać cofki
      requestAnimationFrame(() => {
        const wasTrans = track.style.transition;
        setTransition(false);
        applyTransformForIndex(index);
        // przywróć transition w następnym frame (żeby następna animacja działała)
        requestAnimationFrame(() => {
          track.style.transition = wasTrans;
          isNormalizing = false;
          isAnimating = false;
        });
      });
    } else {
      isAnimating = false;
    }
  };

  // strzałki
  prevBtn?.addEventListener('click', () => { goTo(index - 1, true); resetAutoplay(); });
  nextBtn?.addEventListener('click', () => { goTo(index + 1, true); resetAutoplay(); });

  // po animacji — teleport z klonu na oryginał
  track.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform') return;
    if (!isAnimating) return;
    normalizeIfNeeded();
  });

  // klawiatura
  if (CONFIG.keyboard) {
    slider.tabIndex = 0;
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn?.click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn?.click(); }
    });
  }

  // swipe
  const onPointerDown = (x) => { isDragging = true; dragStartX = x; dragStartTranslate = currentX; setTransition(false); stopAutoplay(); };
  const onPointerMove = (x) => {
    if (!isDragging) return;
    const dx = x - dragStartX;
    currentX = dragStartTranslate + dx;
    track.style.transform = `translateX(${Math.round(currentX)}px)`;
  };
  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    const dx = currentX - dragStartTranslate;
    if (Math.abs(dx) >= CONFIG.swipeThresholdPx) {
      goTo(index + (dx > 0 ? -1 : 1), true);
    } else {
      // snap do najbliższego
      const x = currentX + CONFIG.offsetPx;
      const cpvNow = getCardsPerView();
      const cards = getCards();
      let best = index, bestDist = Infinity;
      if (cpvNow === 1) {
        const target = viewportW / 2;
        centers.forEach((c, i) => {
          const d = Math.abs((c - x) - target);
          if (d < bestDist) { bestDist = d; best = i; }
        });
      } else {
        const targetLeft = 0;
        lefts.forEach((l, i) => {
          const d = Math.abs((l - x) - targetLeft);
          if (d < bestDist) { bestDist = d; best = i; }
        });
      }
      goTo(best, true);
    }
    resetAutoplay();
  };

  // mouse
  slider.addEventListener('mousedown', e => onPointerDown(e.clientX));
  window.addEventListener('mousemove', e => onPointerMove(e.clientX));
  window.addEventListener('mouseup',   onPointerUp);

  // touch
  slider.addEventListener('touchstart', e => onPointerDown(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchmove',  e => onPointerMove(e.touches[0].clientX),  { passive: true });
  slider.addEventListener('touchend',   onPointerUp);

  // Resize — przy zmianie układu przebuduj klony i pomiar
  const ro = new ResizeObserver(() => {
    const prev = cpv;
    const now  = getCardsPerView();
    if (prev !== now) {
      rebuildClones();
      measure();
      setTransition(false); goTo(baseOffset, false); setTransition(true);
    } else {
      measure();
    }
  });
  ro.observe(slider);

  // Autoplay
  const startAutoplay = () => {
    if (!CONFIG.autoplay || prefersReduced) return;
    stopAutoplay();
    autoTimer = setInterval(() => {
      // pilnujemy, żeby zawsze iść o 1 w prawo — normalizacja zrobi resztę
      goTo(index + 1, true);
    }, CONFIG.autoplayMs);
  };
  const stopAutoplay = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };
  const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('focusin',    stopAutoplay);
  slider.addEventListener('focusout',   startAutoplay);

  // start
  rebuildClones();
  measure();
  setTransition(false);
  goTo(baseOffset, false); // zacznij na pierwszej REALNEJ karcie
  setTransition(true);
  startAutoplay();
})();
