// /js/services-slider.js
(() => {
  const section = document.querySelector('.services');
  if (!section) return;

  const slider  = section.querySelector('.services__slider');
  const prevBtn = section.querySelector('.services__arrow--prev');
  const nextBtn = section.querySelector('.services__arrow--next');
  if (!slider) return;

  // wyłączamy natywny snap/scroll poziomy
  slider.style.scrollSnapType = 'none';
  slider.style.overflowX = 'hidden';
  slider.style.webkitOverflowScrolling = 'auto';
  slider.style.touchAction = 'pan-y';

  const initialCards = Array.from(slider.querySelectorAll('.services__card'));
  if (!initialCards.length) return;

  let track = slider.querySelector('.services__track');
  if (!track) {
    track = document.createElement('div');
    track.className = 'services__track';
    initialCards.forEach(c => track.appendChild(c));
    slider.appendChild(track);
  }
  track.style.touchAction = 'pan-y';

  const cards = Array.from(track.children).filter(el => el.classList.contains('services__card'));
  if (!cards.length) return;
  cards.forEach(c => { c.style.scrollSnapAlign = 'none'; });

  // MQ
  const MQ = {
    mobile: window.matchMedia('(max-width: 743px)'),
    tablet: window.matchMedia('(min-width: 744px) && (max-width: 1439px)'),
    laptop: window.matchMedia('(min-width: 1440px) && (max-width: 1919px)'),
    desktop: window.matchMedia('(min-width: 1920px)')
  };
  const getCardsPerView = () => {
    if (MQ.tablet.matches) return 2;
    if (MQ.laptop.matches || MQ.desktop.matches) return 2;
    return 1;
  };

  const CONFIG = {
    transitionMs: 600,
    ease: 'cubic-bezier(.22,.61,.36,1)',
    swipeThresholdPx: 24,   // ⬅ próg zmiany slajdu
    autoplay: true,
    autoplayMs: 4000,
    keyboard: true,
    loop: true,
    respectReducedMotion: true,
    offsetPx: 20            // ⬅ przesunięcie w lewo
  };

  // Stan
  let centers = [], lefts = [], widths = [];
  let viewportW = 0;
  let index = 0;
  let currentX = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
  let autoTimer = null;

  const prefersReduced = CONFIG.respectReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Helpers
  const setTransition = (on) => {
    track.style.transition = on && !prefersReduced
      ? `transform ${CONFIG.transitionMs}ms ${CONFIG.ease}`
      : 'none';
  };

  const measure = () => {
    const was = track.style.transition;
    track.style.transition = 'none';

    const trackRect = track.getBoundingClientRect();
    viewportW = slider.clientWidth;

    centers = []; lefts = []; widths = [];
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const leftInTrack = r.left - trackRect.left;
      lefts.push(leftInTrack);
      widths.push(r.width);
      centers.push(leftInTrack + r.width / 2);
    });

    goTo(index, false);
    track.style.transition = was;
  };

  const clampIndex = (i) => {
    const cpv = getCardsPerView();
    const maxIndex = Math.max(0, cards.length - cpv);
    return Math.max(0, Math.min(maxIndex, i));
  };

  const nearestIndexAt = (xTranslate) => {
    const cpv = getCardsPerView();
    const x = xTranslate + CONFIG.offsetPx; // kompensacja offsetu

    if (cpv === 1) {
      let best = 0, bestDist = Infinity;
      const target = viewportW / 2;
      for (let i = 0; i < centers.length; i++) {
        const dist = Math.abs((centers[i] - x) - target);
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best;
    }
    let best = 0, bestDist = Infinity;
    const targetLeft = 0;
    for (let i = 0; i < lefts.length; i++) {
      const dist = Math.abs((lefts[i] - x) - targetLeft);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return clampIndex(best);
  };

  const updateUI = () => {
    const cpv = getCardsPerView();
    cards.forEach((c, i) => c.classList.toggle('is-active', i === index));

    if (prevBtn) prevBtn.disabled = !CONFIG.loop && clampIndex(index) === 0;
    if (nextBtn) {
      const maxIndex = Math.max(0, cards.length - cpv);
      nextBtn.disabled = !CONFIG.loop && clampIndex(index) === maxIndex;
    }
  };

  const goTo = (i, animate = true) => {
    if (!lefts.length) measure();

    const cpv = getCardsPerView();
    i = clampIndex(i);
    index = i;

    let targetX;
    if (cpv === 1) {
      targetX = -(centers[index] - viewportW / 2) - CONFIG.offsetPx;
    } else {
      targetX = -lefts[index] - CONFIG.offsetPx;
    }

    setTransition(animate);
    currentX = Math.round(targetX);
    track.style.transform = `translateX(${currentX}px)`;
    updateUI();
  };

  // Strzałki
  prevBtn?.addEventListener('click', () => {
    const cpv = getCardsPerView();
    const maxIndex = Math.max(0, cards.length - cpv);
    if (!CONFIG.loop && index <= 0) return;

    const nextIndex = CONFIG.loop
      ? (index - 1 + (maxIndex + 1)) % (maxIndex + 1)
      : index - 1;

    goTo(nextIndex, true);
    resetAutoplay();
  });

  nextBtn?.addEventListener('click', () => {
    const cpv = getCardsPerView();
    const maxIndex = Math.max(0, cards.length - cpv);
    if (!CONFIG.loop && index >= maxIndex) return;

    const nextIndex = CONFIG.loop
      ? (index + 1) % (maxIndex + 1)
      : index + 1;

    goTo(nextIndex, true);
    resetAutoplay();
  });

  // Klawiatura
  if (CONFIG.keyboard) {
    slider.tabIndex = 0;
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn?.click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn?.click(); }
    });
  }

  // Drag/Swipe
  const onPointerDown = (clientX) => {
    isDragging = true;
    dragStartX = clientX;
    dragStartTranslate = currentX;
    setTransition(false);
    stopAutoplay();
  };

  const onPointerMove = (clientX) => {
    if (!isDragging) return;
    const dx = clientX - dragStartX;
    currentX = dragStartTranslate + dx;

    if (!CONFIG.loop && lefts.length) {
      const cpv = getCardsPerView();
      const maxIndex = Math.max(0, cards.length - cpv);
      const lastLeftIndex = maxIndex;
      const minX = -lefts[lastLeftIndex] - CONFIG.offsetPx;
      const maxX = -lefts[0] - CONFIG.offsetPx;

      const overflow =
        currentX > maxX ? currentX - maxX :
        currentX < minX ? currentX - minX : 0;
      if (overflow !== 0) currentX -= overflow * 0.6;
    }

    track.style.transform = `translateX(${Math.round(currentX)}px)`;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;

    const dxTotal = currentX - dragStartTranslate;

    // ⬇ PRÓG SWIPE — jeśli przekroczony, wymuś zmianę karty
    if (Math.abs(dxTotal) >= CONFIG.swipeThresholdPx) {
      const cpv = getCardsPerView();
      const maxIndex = Math.max(0, cards.length - cpv);
      let nextIndex = dxTotal > 0 ? index - 1 : index + 1; // prawo=poprzednia, lewo=następna
      if (CONFIG.loop) {
        nextIndex = (nextIndex + (maxIndex + 1)) % (maxIndex + 1);
      }
      goTo(nextIndex, true);
    } else {
      // w przeciwnym razie — najbliższy snap
      const targetIndex = nearestIndexAt(currentX);
      goTo(targetIndex, true);
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

  // Resize / Mutacje
  const ro = new ResizeObserver(() => measure());
  ro.observe(slider);
  ro.observe(track);
  cards.forEach(c => ro.observe(c));

  const mo = new MutationObserver(() => { measure(); });
  mo.observe(track, { childList: true, subtree: true });

  // Autoplay
  const startAutoplay = () => {
    if (!CONFIG.autoplay || prefersReduced) return;
    stopAutoplay();
    autoTimer = setInterval(() => {
      const cpv = getCardsPerView();
      const maxIndex = Math.max(0, cards.length - cpv);
      const nextIndex = CONFIG.loop ? (index + 1) % (maxIndex + 1) : Math.min(maxIndex, index + 1);
      goTo(nextIndex, true);
    }, CONFIG.autoplayMs);
  };

  const stopAutoplay = () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  };

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  // Start
  measure();
  goTo(index, false);
  startAutoplay();
})();
