// /js/services-slider.js
(() => {
  const section = document.querySelector('.services');
  if (!section) return;

  const slider  = section.querySelector('.services__slider');   // viewport (375px na mobile)
  const prevBtn = section.querySelector('.services__arrow--prev');
  const nextBtn = section.querySelector('.services__arrow--next');
  if (!slider) return;

  // Zbierz karty (mogły już istnieć jako dzieci slidera)
  const initialCards = Array.from(slider.querySelectorAll('.services__card'));
  if (!initialCards.length) return;

  // Utwórz tor i przenieś karty (tak jak w Twojej wersji)
  let track = slider.querySelector('.services__track');
  if (!track) {
    track = document.createElement('div');
    track.className = 'services__track';
    initialCards.forEach(c => track.appendChild(c));
    slider.appendChild(track);
  }
  const cards = Array.from(track.children).filter(el => el.classList.contains('services__card'));
  if (!cards.length) return;

  // ——— MQ / układ ———
  const MQ = {
    mobile: window.matchMedia('(max-width: 743px)'),
    tablet: window.matchMedia('(min-width: 744px) and (max-width: 1439px)'),
    laptop: window.matchMedia('(min-width: 1440px) and (max-width: 1919px)'),
    desktop: window.matchMedia('(min-width: 1920px)')
  };
  const getCardsPerView = () => {
    if (MQ.tablet.matches) return 2;                  // tablet: 2 pełne karty
    if (MQ.laptop.matches || MQ.desktop.matches) return 2; // prawa kolumna: 2 (łatwo zmienisz)
    return 1;                                         // mobile: 1 karta w kadrze
  };

  // ——— Konfiguracja ———
  const CONFIG = {
    transitionMs: 600,
    ease: 'cubic-bezier(.22,.61,.36,1)',
    swipeThresholdPx: 24,
    autoplay: true,
    autoplayMs: 4000,
    keyboard: true,
    loop: true,                   // autoplay: przechodź w kółko
    respectReducedMotion: true
  };

  // ——— Stan ———
  let centers = [];               // środki kart względem LEWEJ krawędzi TRACKA
  let lefts = [];                 // lewe krawędzie kart względem LEWEJ krawędzi TRACKA
  let widths = [];                // szerokości kart
  let viewportW = 0;
  let index = 0;                  // indeks: na mobile = aktywna karta; na tablet+ = LEWA karta w kadrze
  let currentX = 0;               // aktualny translateX (px)
  let isDragging = false;
  let dragStartX = 0;             // pozycja kursora/palca na start
  let dragStartTranslate = 0;     // translateX na start przeciągania
  let autoTimer = null;

  const prefersReduced = CONFIG.respectReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ——— Helpers ———
  const setTransition = (on) => {
    track.style.transition = on && !prefersReduced
      ? `transform ${CONFIG.transitionMs}ms ${CONFIG.ease}`
      : 'none';
  };

  // oblicz metryki kart względem LEWEJ krawędzi TRACKA
  const measure = () => {
    const wasTransition = track.style.transition;
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

    // przelicz aktualny X utrzymując bieżący indeks zgodnie z trybem (center vs. left-snap)
    goTo(index, false);

    track.style.transition = wasTransition;
  };

  // utnij index do zakresu dopuszczalnego (ostatni pełny kadr)
  const clampIndex = (i) => {
    const cpv = getCardsPerView();
    const maxIndex = Math.max(0, cards.length - cpv);
    return Math.max(0, Math.min(maxIndex, i));
  };

  // znajdź najbliższy "snap" dla danego currentX
  // mobile: do środka najbliższej karty
  // tablet+ : do LEWEJ krawędzi najbliższej karty (lewa karta w kadrze)
  const nearestIndexAt = (xTranslate) => {
    const cpv = getCardsPerView();

    if (cpv === 1) {
      // center-based
      let best = 0;
      let bestDist = Infinity;
      const target = viewportW / 2;
      for (let i = 0; i < centers.length; i++) {
        const dist = Math.abs((centers[i] - xTranslate) - target);
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best;
    }

    // left-edge snap (tablet+)
    let best = 0;
    let bestDist = Infinity;
    const targetLeft = 0; // lewa krawędź viewportu
    for (let i = 0; i < lefts.length; i++) {
      const dist = Math.abs((lefts[i] - xTranslate) - targetLeft);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return clampIndex(best);
  };

  // zaktualizuj stany UI (aktywną kartę, przyciski)
  const updateUI = () => {
    const cpv = getCardsPerView();

    // aktywna karta:
    // - mobile: index
    // - tablet+: środkowa z widocznych (albo pierwsza – wybieram pierwszą dla prostoty)
    const active = cpv === 1 ? index : index; // możesz zmienić na index+1 przy 2 w kadrze
    cards.forEach((c, i) => c.classList.toggle('is-active', i === active));

    if (prevBtn) prevBtn.disabled = !CONFIG.loop && clampIndex(index) === 0;
    if (nextBtn) {
      const maxIndex = Math.max(0, cards.length - cpv);
      nextBtn.disabled = !CONFIG.loop && clampIndex(index) === maxIndex;
    }
  };

  // wykonaj przesunięcie do indeksu
  // - mobile: karta i jest centrowana
  // - tablet+: karta i jest LEWĄ kartą w kadrze (left-edge snap)
  const goTo = (i, animate = true) => {
    if (!lefts.length) measure();

    const cpv = getCardsPerView();
    i = clampIndex(i);
    index = i;

    let targetX;
    if (cpv === 1) {
      // center-based
      targetX = -(centers[index] - viewportW / 2);
    } else {
      // left-edge snap
      targetX = -lefts[index];
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

    // opcjonalnie: miękkie ograniczenia na krańcach przy loop=false
    if (!CONFIG.loop && lefts.length) {
      const cpv = getCardsPerView();
      const maxIndex = Math.max(0, cards.length - cpv);

      const lastLeftIndex = maxIndex; // lewa karta ostatniego pełnego kadru
      const minX = -lefts[lastLeftIndex]; // najbardziej w lewo (ostatni pełny kadr)
      const maxX = -lefts[0];            // najbardziej w prawo (pierwszy kadr)

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

    // wybierz najbliższy snap (center lub left-edge zależnie od trybu)
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
