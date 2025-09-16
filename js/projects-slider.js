// /js/projects-slider.js
// v7: bez migotania (brak recyklingu podczas drag), center względem KONTENERA,
// hard-snap z łagodniejszym przyspieszeniem + regulowana pauza, pointer events + axis-lock
(() => {
  const section = document.querySelector('.projects');
  if (!section) return;

  const slider = section.querySelector('.projects__cards-container');
  if (!slider) return;

  const cards = Array.from(slider.querySelectorAll('.project-card'));
  if (cards.length === 0) return;

  // Track (czyści stary jeśli istniał)
  const oldTrack = slider.querySelector('.projects__track');
  if (oldTrack) oldTrack.remove();
  const track = document.createElement('div');
  track.className = 'projects__track';
  cards.forEach(c => track.appendChild(c));
  slider.appendChild(track);
  track.style.willChange = 'transform';
  track.style.transition = 'none';

  // ── Parametry ──────────────────────────────────────────────────
  const CRUISE_SPEED = 200;            // px/s – prędkość rejsowa
  const TRIGGER_DIST = 110;            // px – w jakiej odległości auto-snap do next (w CRUISE)
  const FRICTION     = 1.8;            // 1/s – „wygaszanie” prędkości w cruise
  const SAFE_TRIGGER_MIN = 30;
  const SAFE_TRIGGER_MAX_RATIO = 0.8;
  const STALL_TIMEOUT_MS = 1500;
  const RECYCLE_PAD  = 2;
  const PAUSE_BETWEEN_SLIDES = 1200;   // ms – pauza po dociągnięciu (0 = brak pauzy)

  // Łagodniejsze dociąganie (mniej „szarpie”):
  const SNAP_DURATION = 560;           // ms (wcześniej ~220)
  const SNAP_EASING   = 'cubic-bezier(.15,.65,.1,1)'; // miękki ease-out (mniej agresywny)

  // ── Helpers względem KONTENERA ─────────────────────────────────
  const isTablet = () => (innerWidth >= 744 && innerWidth < 1440);
  const sliderRect = () => slider.getBoundingClientRect();
  const vpCenter = () => {
    const r = sliderRect();
    const tabletOffset = isTablet() ? -60 : 0;  // zgodnie z Twoją wcześniejszą logiką
    return r.left + r.width / 2 + tabletOffset;
  };

  const getGap = () => {
    const cs = getComputedStyle(track);
    const g = parseFloat(cs.gap || cs.columnGap || '0');
    return Number.isFinite(g) ? g : 0;
  };

  const getStep = () => {
    const a = track.children[0], b = track.children[1];
    if (a && b) {
      const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
      const dx = r2.left - r1.left;
      if (dx > 0 && Number.isFinite(dx)) return dx;
    }
    if (a) return a.getBoundingClientRect().width + getGap();
    return 0;
  };

  const getClosestCardToCenter = () => {
    if (!track.children.length) return null;
    const c = vpCenter();
    let best=null, dist=Infinity;
    Array.from(track.children).forEach(el=>{
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.left + r.width/2) - c);
      if (d < dist) { dist = d; best = el; }
    });
    return best;
  };

  const computeTxForCentering = (cardEl, currentTx) => {
    const el = cardEl || getClosestCardToCenter();
    if (!el) return currentTx;
    const r = el.getBoundingClientRect();
    const delta = vpCenter() - (r.left + r.width/2);
    return currentTx + delta;
  };

  const getNextRightCard = () => {
    if (!track.children.length) return null;
    const c = vpCenter();
    let cand=null, bestDx=Infinity;
    Array.from(track.children).forEach(el=>{
      const r = el.getBoundingClientRect();
      const dx = (r.left + r.width/2) - c;
      if (dx > 0 && dx < bestDx) { bestDx = dx; cand = el; }
    });
    return cand || getClosestCardToCenter();
  };

  const getPrevLeftCard = () => {
    if (!track.children.length) return null;
    const c = vpCenter();
    let cand=null, bestDx=-Infinity;
    Array.from(track.children).forEach(el=>{
      const r = el.getBoundingClientRect();
      const dx = (r.left + r.width/2) - c;
      if (dx < 0 && dx > bestDx) { bestDx = dx; cand = el; }
    });
    return cand || getClosestCardToCenter();
  };

  // ── Stan ───────────────────────────────────────────────────────
  let tx = 0;
  let v  = -CRUISE_SPEED;
  let mode = 'CRUISE'; // CRUISE | DRAG | SNAP | PAUSE
  let step = getStep();
  let gap  = getGap();

  const apply = () => { track.style.transform = `translate3d(${tx}px,0,0)`; };

  // start: wycentruj 1. kartę
  apply();
  requestAnimationFrame(()=>{
    const first = track.children[0] || getClosestCardToCenter();
    tx = computeTxForCentering(first, tx);
    apply();
  });

  // ── Snap (twardy) + pauza ──────────────────────────────────────
  let snapPauseTimer = 0;

  const snapToCard = (cardEl, { animate = true, duration = SNAP_DURATION } = {}) => {
    if (!cardEl) return;
    const target = computeTxForCentering(cardEl, tx);

    const startPauseThenCruise = () => {
      if (PAUSE_BETWEEN_SLIDES > 0) {
        mode = 'PAUSE';
        clearTimeout(snapPauseTimer);
        snapPauseTimer = setTimeout(() => {
          mode = 'CRUISE';
          v = -CRUISE_SPEED;
        }, PAUSE_BETWEEN_SLIDES);
      } else {
        mode = 'CRUISE';
        v = -CRUISE_SPEED;
      }
    };

    if (animate) {
      // defer o 1 klatkę – stabilizacja layoutu po drag (eliminuje "flash")
      void track.getBoundingClientRect();
      requestAnimationFrame(() => {
        track.style.transition = `transform ${duration}ms ${SNAP_EASING}`;
        tx = target;
        apply();
        const done = () => {
          track.style.transition = 'none';
          track.removeEventListener('transitionend', done);
          startPauseThenCruise();
        };
        track.addEventListener('transitionend', done);
      });
    } else {
      tx = target; apply();
      startPauseThenCruise();
    }
  };

  // ── Pointer Events + axis-lock ─────────────────────────────────
  slider.style.touchAction = 'pan-y';

  let dragging=false, dragStartX=0, dragStartY=0, dragTx0=0;
  let lastMoveTs=0, lastMoveX=0, dragPending=false, dragNextTx=0;
  let gestureLocked=false, lockHorizontal=false;
  const H_LOCK_THRESHOLD=10;

  // NIE recyklingujemy podczas drag (eliminuje flash)
  const dragRecycleOnce = () => {
    if (!track.children.length) return;
    step = getStep(); gap = getGap();

    const r = sliderRect();
    const leftEdge  = r.left;
    const rightEdge = r.right;
    const buffer = step * 1.1;

    let guard = 0;
    while (track.firstElementChild) {
      const fr = track.firstElementChild.getBoundingClientRect();
      if (fr.right + 1 < leftEdge - buffer && guard++ < 20) {
        track.appendChild(track.firstElementChild);
        tx += step; dragTx0 += step;
      } else break;
    }

    guard = 0;
    while (track.lastElementChild) {
      const lr = track.lastElementChild.getBoundingClientRect();
      if (lr.left - 1 > rightEdge + buffer && guard++ < 20) {
        track.insertBefore(track.lastElementChild, track.firstElementChild);
        tx -= step; dragTx0 -= step;
      } else break;
    }
  };

  const scheduleDragFrame = () => {
    if (dragPending) return;
    dragPending = true;
    requestAnimationFrame(()=>{
      dragPending = false;
      tx = dragNextTx;
      apply(); // recykling dopiero po puszczeniu palca
    });
  };

  const onPointerDown = (e) => {
    if (e.pointerType==='mouse' && e.button!==0) return;
    slider.setPointerCapture?.(e.pointerId);
    gestureLocked=false; lockHorizontal=false;
    dragging=false;
    dragStartX=e.clientX; dragStartY=e.clientY; dragTx0=tx;
    lastMoveTs=performance.now(); lastMoveX=e.clientX;
    clearTimeout(snapPauseTimer); // przerwij pauzę jeśli była
  };

  const onPointerMove = (e) => {
    if (!slider.hasPointerCapture?.(e.pointerId)) return;
    const dx0 = e.clientX - dragStartX;
    const dy0 = e.clientY - dragStartY;

    if (!gestureLocked) {
      if (Math.abs(dx0) > H_LOCK_THRESHOLD || Math.abs(dy0) > H_LOCK_THRESHOLD) {
        gestureLocked = true;
        lockHorizontal = Math.abs(dx0) > Math.abs(dy0);
        if (!lockHorizontal) { slider.releasePointerCapture?.(e.pointerId); return; }
        dragging = true;
        mode = 'DRAG';
        dragTx0 = tx;
      }
    }
    if (!dragging || !lockHorizontal) return;

    dragNextTx = dragTx0 + dx0;
    lastMoveTs = performance.now();
    lastMoveX  = e.clientX;
    scheduleDragFrame();
  };

  const onPointerUp = (e) => {
    if (slider.hasPointerCapture?.(e.pointerId)) slider.releasePointerCapture?.(e.pointerId);
    if (!dragging) return;
    dragging = false;

    if (!dragPending) {
      tx = dragNextTx;
      // porządkowanie DOM *po* drag – bez flasha
      dragRecycleOnce();
      dragRecycleOnce(); // drugi raz, gdy przesunięcie było duże
      apply();
    }

    // wybór celu wg prędkości/kierunku albo najbliższa
    const dt = Math.max(16, performance.now() - lastMoveTs) / 1000;
    const vx = (lastMoveX - dragStartX) / Math.max(dt, 0.016);
    const MIN_VX_FOR_DIRECTION = 120;

    let targetCard = null;
    if (Math.abs(vx) > MIN_VX_FOR_DIRECTION) {
      targetCard = vx > 0 ? getPrevLeftCard() : getNextRightCard();
    }
    if (!targetCard) targetCard = getClosestCardToCenter();

    mode = 'SNAP';
    snapToCard(targetCard, { animate: true, duration: SNAP_DURATION });
  };

  slider.addEventListener('pointerdown', onPointerDown);
  slider.addEventListener('pointermove',  onPointerMove);
  slider.addEventListener('pointerup',    onPointerUp);
  slider.addEventListener('pointercancel', onPointerUp);

  // Strzałki
  Array.from(track.querySelectorAll('.project-card')).forEach(card=>{
    const arrow = card.querySelector('img.project-card_header-arrow, .project-card__header-arrow');
    if (!arrow) return;
    arrow.addEventListener('click',(e)=>{
      e.preventDefault();
      const next = getNextRightCard();
      if (!next) return;
      clearTimeout(snapPauseTimer);
      mode='SNAP';
      snapToCard(next, { animate:true, duration: SNAP_DURATION });
    });
  });

  // Klawiatura
  slider.tabIndex = 0;
  slider.addEventListener('keydown',(e)=>{
    if (e.key==='ArrowRight') {
      e.preventDefault();
      const n=getNextRightCard();
      if (n){ clearTimeout(snapPauseTimer); mode='SNAP'; snapToCard(n,{animate:true}); }
    }
    if (e.key==='ArrowLeft')  {
      e.preventDefault();
      const p=getPrevLeftCard();
      if (p){ clearTimeout(snapPauseTimer); mode='SNAP'; snapToCard(p,{animate:true}); }
    }
  });

  // ===== Resize/orientation =====
  let resizeTimer = 0;
  const handleResize = () => {
    step = getStep();
    gap  = getGap();
    clearTimeout(snapPauseTimer);
    const closest = getClosestCardToCenter();
    if (closest) { tx = computeTxForCentering(closest, tx); apply(); }
    mode = 'CRUISE';
    v = -CRUISE_SPEED;
  };
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 180);
  });
  window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 180);
  });

  // ── Pętla animacji (CRUISE) ────────────────────────────────────
  let lastTs = performance.now();
  let lastProgressTx = 0, lastProgressTs = performance.now();

  const recycleInCruise = () => {
    if (!track.children.length) return;
    step = getStep();

    const r = sliderRect();
    const leftEdge  = r.left;
    const rightEdge = r.right;
    const buffer    = step * RECYCLE_PAD;

    const firstEl = track.firstElementChild;
    if (firstEl) {
      const fr = firstEl.getBoundingClientRect();
      if (fr.right + 1 < leftEdge - buffer) {
        track.appendChild(firstEl);
        tx += step; apply();
      }
    }
    const lastEl = track.lastElementChild;
    if (lastEl) {
      const lr = lastEl.getBoundingClientRect();
      if (lr.left - 1 > rightEdge + buffer) {
        track.insertBefore(lastEl, track.firstElementChild);
        tx -= step; apply();
      }
    }
  };

  const tick = (ts) => {
    const dtRaw = (ts - lastTs) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, dtRaw));
    lastTs = ts;

    if (mode === 'PAUSE') { requestAnimationFrame(tick); return; }

    if (mode === 'CRUISE') {
      v = -CRUISE_SPEED + (v + CRUISE_SPEED) * Math.exp(-FRICTION * dt);
      tx += v * dt;
      apply();

      recycleInCruise();

      const safeMax = Math.max(SAFE_TRIGGER_MIN, Math.min(TRIGGER_DIST, getStep() * SAFE_TRIGGER_MAX_RATIO));
      const next = getNextRightCard();
      if (next) {
        const target = computeTxForCentering(next, tx);
        const dist = Math.abs(tx - target);
        if (dist <= safeMax) { mode='SNAP'; snapToCard(next, { animate:true, duration: Math.max(140, SNAP_DURATION - 80) }); }
      }

      if (Math.abs(tx - lastProgressTx) > 2) { lastProgressTx = tx; lastProgressTs = ts; }
      else if (ts - lastProgressTs > STALL_TIMEOUT_MS) {
        const n = getNextRightCard(); if (n) { mode='SNAP'; snapToCard(n, { animate:false }); }
        lastProgressTs = ts;
      }
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
