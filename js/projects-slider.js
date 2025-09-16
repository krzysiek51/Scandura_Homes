// /js/projects-slider.js
// v9: autoscroll + strzałka NEXT, centrowanie względem kontenera
(() => {
  const section = document.querySelector('.projects');
  if (!section) return;

  const slider = section.querySelector('.projects__cards-container');
  if (!slider) return;

  // zbierz karty
  const cards = Array.from(slider.querySelectorAll('.project-card'));
  if (!cards.length) return;

  // zbuduj track (czyść stary)
  const oldTrack = slider.querySelector('.projects__track');
  if (oldTrack) oldTrack.remove();
  const track = document.createElement('div');
  track.className = 'projects__track';
  cards.forEach(c => track.appendChild(c));
  slider.appendChild(track);

  track.style.willChange = 'transform';
  track.style.transition = 'none';
  slider.style.touchAction = 'pan-y'; // brak drag scroll

  // ── Parametry ──────────────────────────────────────────────
  const SNAP_DURATION = 260; // ms
  const SNAP_EASING   = 'cubic-bezier(.15,.65,.1,1)';
  const AUTOSCROLL_INTERVAL = 4000; // ms – odstęp między autoprzejściami

  // ── Helpers ────────────────────────────────────────────────
  const isTablet   = () => (innerWidth >= 744 && innerWidth < 1440);
  const sliderRect = () => slider.getBoundingClientRect();
  const vpCenter   = () => {
    const r = sliderRect();
    const tabletOffset = isTablet() ? -60 : 0;
    return r.left + r.width / 2 + tabletOffset;
  };

  const getClosestCardToCenter = () => {
    const c = vpCenter();
    let best = null, dist = Infinity;
    Array.from(track.children).forEach(el => {
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.left + r.width/2) - c);
      if (d < dist) { dist = d; best = el; }
    });
    return best;
  };

  const computeTxForCentering = (cardEl, currentTx) => {
    if (!cardEl) return currentTx;
    const r = cardEl.getBoundingClientRect();
    const delta = vpCenter() - (r.left + r.width / 2);
    return currentTx + delta;
  };

  // zamiast pozycji geometrycznej — prosta logika indeksowa
  let currentIndex = 0;

  const snapToIndex = (index, duration = SNAP_DURATION) => {
    if (!cards.length) return;
    if (index < 0) index = cards.length - 1;
    if (index >= cards.length) index = 0;
    currentIndex = index;

    const targetCard = cards[currentIndex];
    const target = computeTxForCentering(targetCard, tx);

    void track.getBoundingClientRect();
    requestAnimationFrame(() => {
      track.style.transition = `transform ${duration}ms ${SNAP_EASING}`;
      tx = target;
      apply();
      const done = () => {
        track.style.transition = 'none';
        track.removeEventListener('transitionend', done);
      };
      track.addEventListener('transitionend', done);
    });
  };

  // ── Stan ───────────────────────────────────────────────────
  let tx = 0;
  const apply = () => { track.style.transform = `translate3d(${tx}px,0,0)`; };

  // start: wycentruj 1. kartę
  apply();
  requestAnimationFrame(() => {
    tx = computeTxForCentering(track.children[0], tx);
    apply();
  });

  // ── Strzałka NEXT ──────────────────────────────────────────
  Array.from(track.querySelectorAll('.project-card')).forEach((card, idx) => {
    const arrow = card.querySelector(
      'img.project-card__header-arrow, img.project-card_header-arrow, .project-card__header-arrow'
    );
    if (!arrow) return;
    arrow.setAttribute('role', 'button');
    arrow.setAttribute('aria-label', 'Następny slajd');
    arrow.style.cursor = 'pointer';

    arrow.addEventListener('click', (e) => {
      e.preventDefault();
      snapToIndex(currentIndex + 1);
      resetAutoscroll();
    });
  });

  // ── Autoscroll ─────────────────────────────────────────────
  let autoTimer = 0;
  const startAutoscroll = () => {
    stopAutoscroll();
    autoTimer = setInterval(() => {
      snapToIndex(currentIndex + 1);
    }, AUTOSCROLL_INTERVAL);
  };
  const stopAutoscroll = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = 0;
  };
  const resetAutoscroll = () => {
    startAutoscroll();
  };

  // włącz na starcie
  startAutoscroll();

  // ── Resize/orientation ─────────────────────────────────────
  let resizeTimer = 0;
  const handleResize = () => {
    const closest = getClosestCardToCenter();
    tx = computeTxForCentering(closest, tx);
    apply();
  };
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 180);
  });
  window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 180);
  });
})();
