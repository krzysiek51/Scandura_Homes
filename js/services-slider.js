// /js/services-slider.js
(() => {
  const section = document.querySelector('.services');
  if (!section) return;

  const slider  = section.querySelector('.services__slider');
  const track   = section.querySelector('.services__track');
  const prevBtn = section.querySelector('.services__arrow--prev');
  const nextBtn = section.querySelector('.services__arrow--next');
  if (!slider || !track) return;

  // Kontrola biorę na siebie (bez natywnego snapu/scrollu poziomego)
  slider.style.scrollSnapType = 'none';
  slider.style.overflowX = 'hidden';
  slider.style.webkitOverflowScrolling = 'auto';
  slider.style.touchAction = 'pan-y';            // domyślnie: pion strony dozwolony
  slider.style.overscrollBehavior = 'contain';   // bez „przeciągania” całej strony
  track.style.touchAction  = 'pan-y';

  // Oryginalne karty
  const originals = Array.from(track.querySelectorAll('.services__card'));
  if (!originals.length) return;

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

  // Konfiguracja
  const CONFIG = {
    transitionMs: 420,
    ease: 'cubic-bezier(.2,.6,.2,1)',
    swipeThresholdPx: 44,           // dystans dla decyzji L/R
    swipeSpeedThreshold: 0.35,      // px/ms — szybki „flick”
    autoplay: true,
    autoplayMs: 4000,
    keyboard: true,
    respectReducedMotion: true,
    offsetPx: 0                     // nie przesuwamy centrum „na bok”
  };
  const prefersReduced = CONFIG.respectReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stan
  const ORG = originals.length;
  let cpv = getCardsPerView();
  let CLONES = Math.max(1, cpv);
  let baseOffset = CLONES;
  let index = baseOffset;

  let centers = [], lefts = [], widths = [], viewportW = 0;
  let currentX = 0;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0, dragStartTranslate = 0;
  let dirLock = null; // null | 'x' | 'y'
  let lastMoveT = 0, lastMoveX = 0;
  let autoTimer = null;
  let isNormalizing = false;
  let isAnimating = false;

  // Klony (loop)
  const cloneCard = (orig) => {
    const n = orig.cloneNode(true);
    n.classList.add('is-clone');
    n.setAttribute('aria-hidden', 'true');
    n.querySelectorAll('a,button,input,select,textarea').forEach(el => el.tabIndex = -1);
    return n;
  };
  const rebuildClones = () => {
    track.querySelectorAll('.services__card.is-clone').forEach(n => n.remove());
    cpv = getCardsPerView();
    CLONES = Math.max(1, cpv);
    originals.slice(-CLONES).map(cloneCard).forEach(n => track.insertBefore(n, track.firstChild));
    originals.slice(0, CLONES).map(cloneCard).forEach(n => track.appendChild(n));
    baseOffset = CLONES;
    index = baseOffset;
    // wyłącz ewentualny snap na kartach
    track.querySelectorAll('.services__card').forEach(c => c.style.scrollSnapAlign = 'none');
  };

  // Pomiary
  const measure = () => {
    const was = track.style.transition;
    track.style.transition = 'none';
    const cards = Array.from(track.querySelectorAll('.services__card'));
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

  // Rzutowanie indeksu na translateX
  const computeTargetX = (i) => {
    if (!lefts.length) return currentX;
    const cpvNow = getCardsPerView();
    if (cpvNow === 1) {
      return -(centers[i] - viewportW / 2) - CONFIG.offsetPx;
    } else {
      // dla >=2 kart w kadrze — lewa krawędź aktywnej do początku toru
      return -lefts[i] - CONFIG.offsetPx;
    }
  };
  const setTransition = (on) => {
    track.style.transition = on && !prefersReduced
      ? `transform ${CONFIG.transitionMs}ms ${CONFIG.ease}`
      : 'none';
  };
  const applyTransformForIndex = (i) => {
    const x = Math.round(computeTargetX(i));
    currentX = x;
    track.style.transform = `translate3d(${x}px,0,0)`;
  };

  // UI
  const updateUI = () => {
    const cards = Array.from(track.querySelectorAll('.services__card'));
    cards.forEach((c, i) => c.classList.toggle('is-active', i === index));
    prevBtn && (prevBtn.disabled = false);
    nextBtn && (nextBtn.disabled = false);
  };

  // Nawigacja
  const goTo = (i, animate = true) => {
    index = i;
    isAnimating = animate;
    setTransition(animate);
    applyTransformForIndex(index);
    updateUI();
  };

  // Normalizacja po przejściu przez klony
  const normalizeIfNeeded = () => {
    if (isNormalizing) return;
    const firstReal = baseOffset;
    const lastReal  = baseOffset + ORG - 1;

    if (index < firstReal || index > lastReal) {
      isNormalizing = true;
      if (index < firstReal) index += ORG;
      if (index > lastReal)  index -= ORG;

      requestAnimationFrame(() => {
        const was = track.style.transition;
        setTransition(false);
        applyTransformForIndex(index);
        requestAnimationFrame(() => {
          track.style.transition = was;
          isNormalizing = false;
          isAnimating = false;
        });
      });
    } else {
      isAnimating = false;
    }
  };

  // Strzałki
  prevBtn?.addEventListener('click', () => { goTo(index - 1, true); resetAutoplay(); });
  nextBtn?.addEventListener('click', () => { goTo(index + 1, true); resetAutoplay(); });

  // Transition end -> teleport
  track.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform') return;
    if (!isAnimating) return;
    normalizeIfNeeded();
  });

  // Klawiatura
  if (CONFIG.keyboard) {
    slider.tabIndex = 0;
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn?.click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn?.click(); }
    });
  }

  // Autoplay
  const startAutoplay = () => {
    if (!CONFIG.autoplay || prefersReduced) return;
    stopAutoplay();
    autoTimer = setInterval(() => { goTo(index + 1, true); }, CONFIG.autoplayMs);
  };
  const stopAutoplay  = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };
  const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('focusin',    stopAutoplay);
  slider.addEventListener('focusout',   startAutoplay);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay(); else startAutoplay();
  });

  // ---- GESTY: directional-lock (Apple-like) ----
  const onDown = (x, y) => {
    isDragging = true;
    dirLock = null;
    dragStartX = x;
    dragStartY = y;
    dragStartTranslate = currentX;
    lastMoveT = performance.now();
    lastMoveX = x;
    setTransition(false);
    stopAutoplay();
  };

  const onMove = (x, y, rawEvent) => {
    if (!isDragging) return;
    const dx = x - dragStartX;
    const dy = y - dragStartY;

    // Ustal kierunek po przekroczeniu małego progu
    if (!dirLock) {
      const TH = 10;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) {
        dirLock = 'x';
        // zablokuj oba kierunki tylko na czas swipa poziomego
        slider.style.touchAction = 'none';
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > TH) {
        dirLock = 'y';
      }
    }

    if (dirLock === 'x') {
      // pilnuj, by strona nie jechała — potrzebujemy passive:false
      rawEvent?.preventDefault?.();
      currentX = dragStartTranslate + dx;
      track.style.transform = `translate3d(${Math.round(currentX)}px,0,0)`;
      lastMoveT = performance.now();
      lastMoveX = x;
    } else if (dirLock === 'y') {
      // oddajemy scroll pionowy stronie
      cancelDrag();
    }
  };

  const finishToNearest = (deltaX, speed) => {
    // szybki flick → w prawo/lewo, inaczej próg px
    if (Math.abs(deltaX) >= CONFIG.swipeThresholdPx || Math.abs(speed) >= CONFIG.swipeSpeedThreshold) {
      goTo(index + (deltaX > 0 ? -1 : 1), true);
    } else {
      // snap do najbliższej karty (center dla 1 per view)
      const x = currentX + CONFIG.offsetPx;
      const cpvNow = getCardsPerView();
      const cards = Array.from(track.querySelectorAll('.services__card'));
      let best = index, bestDist = Infinity;

      if (cpvNow === 1) {
        const target = viewportW / 2;
        centers.forEach((c, i) => {
          const d = Math.abs((c + currentX) - target);
          if (d < bestDist) { bestDist = d; best = i; }
        });
      } else {
        const targetLeft = 0;
        lefts.forEach((l, i) => {
          const d = Math.abs((l + currentX) - targetLeft);
          if (d < bestDist) { bestDist = d; best = i; }
        });
      }
      goTo(best, true);
    }
  };

  const cancelDrag = () => {
    isDragging = false;
    dirLock = null;
    slider.style.touchAction = 'pan-y';
  };

  const onUp = (x) => {
    if (!isDragging) return;
    const dx = x - dragStartX;
    const dt = Math.max(1, performance.now() - lastMoveT);
    const vx = (x - lastMoveX) / dt; // px/ms
    cancelDrag();
    finishToNearest(dx, vx);
    resetAutoplay();
  };

  // Mouse
  slider.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY, e));
  window.addEventListener('mouseup',   e => onUp(e.clientX));

  // Touch (ważne: move musi być passive:false, by działało preventDefault)
  slider.addEventListener('touchstart', e => {
    const t = e.touches[0]; onDown(t.clientX, t.clientY);
  }, { passive: true });

  slider.addEventListener('touchmove', e => {
    const t = e.touches[0]; onMove(t.clientX, t.clientY, e);
  }, { passive: false });

  slider.addEventListener('touchend', e => {
    const t = e.changedTouches[0]; onUp(t.clientX);
  }, { passive: true });

  // Resize/układ
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

  // Start
  rebuildClones();
  measure();
  setTransition(false);
  goTo(baseOffset, false);
  setTransition(true);
  startAutoplay();
})();
