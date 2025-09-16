// /js/services-slider.js
(() => {
  const section = document.querySelector('.services');
  if (!section) return;

  const slider  = section.querySelector('.services__slider');   // viewport
  const prevBtn = section.querySelector('.services__arrow--prev');
  const nextBtn = section.querySelector('.services__arrow--next');
  if (!slider) return;

  // Unikamy konfliktu JS vs. scroll-snap/natywny scroll
  slider.style.scrollSnapType = 'none';
  slider.style.overflowX = 'hidden';
  slider.style.webkitOverflowScrolling = 'auto';
  slider.style.touchAction = 'pan-y';

  // Zbierz karty
  const initialCards = Array.from(slider.querySelectorAll('.services__card'));
  if (!initialCards.length) return;

  // Tor
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
  // Gdyby w CSS było scroll-snap-align na kartach — wyłącz lokalnie
  cards.forEach(c => { c.style.scrollSnapAlign = 'none'; });

  // ——— MQ / układ ———
  const MQ = {
    mobile: window.matchMedia('(max-width: 743px)'),
    tablet: window.matchMedia('(min-width: 744px) and (max-width: 1439px)'),
    laptop: window.matchMedia('(min-width: 1440px) and (max-width: 1919px)'),
    desktop: window.matchMedia('(min-width: 1920px)')
  };
  const getCardsPerView = () => {
    if (MQ.tablet.matches) return 2;
    if (MQ.laptop.matches || MQ.desktop.matches) return 2;
    return 1; // mobile
  };

  // ——— Konfiguracja ———
  const CONFIG = {
    transitionMs: 600,
    ease: 'cubic-bezier(.22,.61,.36,1)',
    swipeThresholdPx: 24,
    autoplay: true,
    autoplayMs: 4000,
    keyboard: true,
    loop: true,
    respectReducedMotion: true,
    offsetPx: 20 // przesunięcie w lewo o 20px względem domyślnego pozycjonowania
  };

  // ——— Stan ———
  let centers = [];   // środki kart względem LEWEJ krawędzi TRACKA
  let lefts = [];     // lewe krawędzie kart względem LEWEJ krawędzi TRACKA
  let widths = [];
  let viewportW = 0;
  let index = 0;      // mobile = aktywna karta; tablet+ = lewa karta w kadrze
  let currentX = 0;   // aktualny translateX (px)
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
  let autoTimer = null;

  const prefersReduced = CONFIG.respectReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ——— Helpers ———
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

    centers = [];
    lefts = [];
    widths = [];

    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const leftInTrack = r.left - trackRect.left;
      lefts.push(leftInTrack);
      widths.push(r.width);
      centers.push(leftInTrack + r.width / 2);
    });

    // zachowaj aktualny indeks
    goTo(index, false);
    track.style.transition = was;
  };

  const clampIndex = (i) => {
    const cpv = getCardsPerView();
    const maxIndex = Math.max(0, cards.length - cpv);
    return Math.max(0, Math.min(maxIndex, i));
  };

  // Znajdź najbliższy snap; kompensujemy offsetPx, bo goTo go odejmuje
  const nearestIndexAt = (xTranslate) => {
    const cpv = getCardsPerView();
    const x = xTranslate + CONFIG.offsetPx; // kompensacja offsetu

    if (cpv === 1) {
      // center-based
      let best = 0, bestDist = Infinity;
      const target = viewportW / 2;
      for (let i = 0; i < centers.length; i++) {
        const dist = Math.abs((centers[i] - x) - target);
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best;
    }

    // left-edge snap (tablet+)
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

  // Przejście do indeksu (z offsetem -20px)
  const goTo = (i, animate = true) => {
    if (!lefts.length) measure();

    const cpv = getCardsPerView();
    i = clampIndex(i);
    index = i;

    let targetX;
    if (cpv === 1) {
      // centrowanie + offset w lewo
      targetX = -(centers[index] - viewportW / 2) - CONFIG.offsetPx;
    } else {
      // lewa krawędź + offset w lewo
      targetX = -lefts[index] - CONFIG.offsetPx;
    }

    setTransition(animate);
    currentX = Math.round(targetX);
    track.style.transform = `translateX(${currentX}px)`;
    updateUI();
  };

  // ——— Strzałki ———
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

  // ——— Klawiatura ———
  if (CONFIG.keyboard) {
    slider.tabIndex = 0;
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn?.click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn?.click(); }
    });
  }

  // ——— Drag/Swipe ———
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

    // miękkie ograniczenia przy loop=false (z offsetem)
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

    // kompensujemy offset przy wyliczaniu najbliższego snapu
    const targetIndex = nearestIndexAt(currentX);
    goTo(targetIndex, true);
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

  // ——— Resize / Mutacje ———
  const ro = new ResizeObserver(() => measure());
  ro.observe(slider);
  ro.observe(track);
  cards.forEach(c => ro.observe(c));

  const mo = new MutationObserver(() => { measure(); });
  mo.observe(track, { childList: true, subtree: true });

  // ——— Autoplay ———
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

  // Pauza przy interakcji
  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('focusin',    stopAutoplay);
  slider.addEventListener('focusout',   startAutoplay);

  // ——— Start ———
  measure();
  goTo(index, false);
  startAutoplay();
})();
