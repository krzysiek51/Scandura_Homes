// /js/projects-slider.js
(() => {
  const section = document.querySelector('.projects');
  if (!section) return;

  const slider = section.querySelector('.projects__cards-container');
  if (!slider) return;

  const cards = Array.from(slider.querySelectorAll('.project-card'));
  if (cards.length === 0) return;

  // Usuń poprzedni track i zbuduj nowy
  const oldTrack = slider.querySelector('.projects__track');
  if (oldTrack) oldTrack.remove();
  const track = document.createElement('div');
  track.className = 'projects__track';
  cards.forEach(c => track.appendChild(c));
  slider.appendChild(track);
  track.style.transition = 'none';
  track.style.willChange = 'transform';

  // ── Parametry strojenia ────────────────────────────────────────
  const CRUISE_SPEED = 200;   // px/s
  const TRIGGER_DIST = 110;   // px
  const MAX_BOUNCES  = 8;
  const RESTITUTION  = 0.52;  // 0..1
  const FRICTION     = 1.8;   // 1/s
  const V_STOP       = 8;     // px/s
  const X_STOP       = 0.8;   // px
  const RECYCLE_PAD  = 2;     // step * N
  const DWELL_MS     = 800;   // ms

  // Bezpieczniki
  const SAFE_TRIGGER_MIN = 30;
  const SAFE_TRIGGER_MAX_RATIO = 0.8;
  const STALL_TIMEOUT_MS = 1500;
  const UNSTICK_KICK = 80;
  const MAX_RELEASE_SPEED = 1200;

  // ── Pomiary ────────────────────────────────────────────────────
  const isTablet = () => {
    const w = window.innerWidth;
    return w >= 744 && w < 1440;
  };

  // Środek viewportu z offsetem na tablet (−60 px w lewo)
  const vpCenter = () => window.innerWidth / 2 + (isTablet() ? -60 : 0);

  const getGap = () => {
    const cs = getComputedStyle(track);
    const g = parseFloat(cs.gap || cs.columnGap || '0');
    return Number.isFinite(g) ? g : 0;
  };

  const getStep = () => {
    const a = track.children[0], b = track.children[1];
    if (a && b) {
      const r1 = a.getBoundingClientRect();
      const r2 = b.getBoundingClientRect();
      const dx = r2.left - r1.left;
      if (dx > 0 && Number.isFinite(dx)) return dx;
    }
    const w = a ? a.getBoundingClientRect().width : 0;
    return w + getGap();
  };

  const computeTxForCentering = (cardEl, currentTx) => {
    const r = cardEl.getBoundingClientRect();
    const delta = vpCenter() - (r.left + r.width / 2);
    return currentTx + delta;
  };

  const getNextRightCard = () => {
    const c = vpCenter();
    let candidate = null, bestDx = Infinity;
    Array.from(track.children).forEach(el => {
      const r = el.getBoundingClientRect();
      const dx = (r.left + r.width / 2) - c;
      if (dx > 0 && dx < bestDx) { bestDx = dx; candidate = el; }
    });
    if (!candidate) {
      let best = null, dist = Infinity;
      Array.from(track.children).forEach(el => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.left + r.width / 2) - c);
        if (d < dist) { dist = d; best = el; }
      });
      candidate = best || track.children[0];
    }
    return candidate;
  };

  const getPrevLeftCard = () => {
    const c = vpCenter();
    let candidate = null, bestDx = -Infinity;
    Array.from(track.children).forEach(el => {
      const r = el.getBoundingClientRect();
      const dx = (r.left + r.width / 2) - c;
      if (dx < 0 && dx > bestDx) { bestDx = dx; candidate = el; }
    });
    return candidate || track.children[0];
  };

  // Najbliższa karta do środka (używane przy resize)
  const getClosestCardToCenter = () => {
    const c = vpCenter();
    let best = null, dist = Infinity;
    Array.from(track.children).forEach(el => {
      const r = el.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const d = Math.abs(mid - c);
      if (d < dist) { dist = d; best = el; }
    });
    return best || track.children[0];
  };

  // ── Stan ────────────────────────────────────────────────────────
  let tx = 0;                 // bieżący translateX toru
  let wallTx = 0;             // cel dla bounce (dokładne centrum karty)
  let v = -CRUISE_SPEED;      // px/s
  let mode = 'CRUISE';        // CRUISE | BOUNCE | HOLD | DRAG
  let bounces = 0;
  let dwellUntil = 0;

  let step = getStep();
  let gap = getGap();

  const apply = () => { track.style.transform = `translate3d(${tx}px,0,0)`; };

  // Watchdog postępu
  let lastProgressTx = 0;
  let lastProgressTs = performance.now();

  // Start: wycentruj 1. kartę po 1 klatce (gdy layout gotowy)
  tx = 0; apply();
  requestAnimationFrame(() => {
    tx = computeTxForCentering(track.children[0], tx);
    apply();
    lastProgressTx = tx;
    lastProgressTs = performance.now();
  });

  // Bounce z gwarancją energii
  const startBounceTo = (targetTx) => {
    wallTx = targetTx;
    bounces = 0;
    const dist = Math.abs(wallTx - tx);
    const dir  = wallTx >= tx ? 1 : -1;
    const vNeeded = Math.max(UNSTICK_KICK, FRICTION * dist * 1.05);
    const vProj   = Math.abs(v);
    v = dir * Math.max(vProj, vNeeded);
    mode = 'BOUNCE';
  };

  // ── DRAG (koaleskowany do rAF, bez migotania) ──────────────────
  let dragging = false, dragStartX = 0, dragTx0 = 0;
  let lastMoveTs = 0, lastMoveX = 0;
  let dragPending = false, dragNextTx = 0;

  const dragRecycleOnce = () => {
    step = getStep(); gap = getGap();
    const buffer = step * 1.1;
    const sliderLeft = slider.getBoundingClientRect().left;

    const estFirstRight = sliderLeft + tx + Math.max(10, step - gap);
    let guard = 0;
    while (estFirstRight < -buffer && guard++ < 20) {
      track.appendChild(track.firstElementChild);
      tx     += step;
      dragTx0 += step;
    }

    let lastLeftEst = sliderLeft + tx + (track.children.length - 1) * step;
    guard = 0;
    while (lastLeftEst > window.innerWidth + buffer && guard++ < 20) {
      track.insertBefore(track.lastElementChild, track.firstElementChild);
      tx     -= step;
      dragTx0 -= step;
      lastLeftEst -= step;
    }
  };

  const scheduleDragFrame = () => {
    if (dragPending) return;
    dragPending = true;
    requestAnimationFrame(() => {
      dragPending = false;
      tx = dragNextTx;
      dragRecycleOnce();
      apply();
    });
  };

  const onDown = (x) => {
    dragging = true;
    dragStartX = x;
    dragTx0 = tx;
    lastMoveTs = performance.now();
    lastMoveX  = x;
    mode = 'DRAG';
  };

  const onMove = (x) => {
    if (!dragging) return;
    const dx = x - dragStartX;
    dragNextTx = dragTx0 + dx;
    lastMoveTs = performance.now();
    lastMoveX  = x;
    scheduleDragFrame();
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;

    if (dragPending) {
      // pozwól rAF dokończyć
    } else {
      tx = dragNextTx;
      dragRecycleOnce();
      apply();
    }

    const dt = Math.max(16, performance.now() - lastMoveTs) / 1000;
    const vx = (lastMoveX - dragStartX) / Math.max(dt, 0.016);
    const vxClamped = Math.max(-MAX_RELEASE_SPEED, Math.min(MAX_RELEASE_SPEED, vx));
    v = -CRUISE_SPEED + vxClamped * 0.4;

    mode = 'CRUISE';
  };

  slider.addEventListener('mousedown', e => onDown(e.clientX));
  window.addEventListener('mousemove', e => onMove(e.clientX));
  window.addEventListener('mouseup',   onUp);

  slider.addEventListener('touchstart', e => onDown(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchmove',  e => onMove(e.touches[0].clientX),  { passive: true });
  slider.addEventListener('touchend',   onUp);

  // Strzałki
  Array.from(track.querySelectorAll('.project-card')).forEach(card => {
    const arrow = card.querySelector('img.project-card_header-arrow, .project-card__header-arrow');
    if (!arrow) return;
    arrow.addEventListener('click', (e) => {
      e.preventDefault();
      const next = getNextRightCard();
      startBounceTo(computeTxForCentering(next, tx));
    });
  });

  // Klawiatura
  slider.tabIndex = 0;
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = getNextRightCard();
      startBounceTo(computeTxForCentering(next, tx));
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = getPrevLeftCard();
      startBounceTo(computeTxForCentering(prev, tx));
    }
  });

  // ===== Resize handling (debounce + rekalkulacja i re-centrowanie) =====
  let resizeTimer = 0;
  let resizing = false;

  const handleResize = () => {
    resizing = false;

    // odśwież kroki toru
    step = getStep();
    gap  = getGap();

    // zakończ ewentualny drag
    dragging = false;
    dragPending = false;

    // wycentruj najbliższą kartę (z offsetem tablet −60)
    const closest = getClosestCardToCenter();
    tx = computeTxForCentering(closest, tx);
    apply();

    // restart „cruise”
    lastProgressTx = tx;
    lastProgressTs = performance.now();
    v = -CRUISE_SPEED;
    mode = 'CRUISE';
  };

  window.addEventListener('resize', () => {
    resizing = true;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 180);
  });
  window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 180);
  });

  // ── Pętla animacji ─────────────────────────────────────────────
  let lastTs = performance.now();

  const recycleInCruise = () => {
    step = getStep();
    const thresholdLeft = -step * RECYCLE_PAD;
    const firstRect = track.firstElementChild.getBoundingClientRect();
    if (firstRect.right + 1 < thresholdLeft) {
      track.appendChild(track.firstElementChild);
      tx += step; apply();
    }
    const lastRect = track.lastElementChild.getBoundingClientRect();
    if (lastRect.left - 1 > window.innerWidth + step * RECYCLE_PAD) {
      track.insertBefore(track.lastElementChild, track.firstElementChild);
      tx -= step; apply();
    }
  };

  const tick = (ts) => {
    const dtRaw = (ts - lastTs) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, dtRaw));
    lastTs = ts;

    // pauza na czas aktywnego resize (pozwalamy handleResize zrobić swoje)
    if (resizing && mode !== 'DRAG') {
      requestAnimationFrame(tick);
      return;
    }

    // Watchdog postępu
    if (mode === 'CRUISE') {
      if (Math.abs(tx - lastProgressTx) > 2) {
        lastProgressTx = tx; lastProgressTs = ts;
      } else if (ts - lastProgressTs > STALL_TIMEOUT_MS) {
        const next = getNextRightCard();
        startBounceTo(computeTxForCentering(next, tx));
        lastProgressTs = ts;
      }
    }

    // Aktualizacja step/gap na żywo (dla resize/zmian stylów)
    step = getStep(); gap = getGap();

    if (mode === 'CRUISE') {
      v = -CRUISE_SPEED + (v + CRUISE_SPEED) * Math.exp(-FRICTION * dt);
      tx += v * dt;
      apply();

      recycleInCruise();

      const safeMax = Math.max(SAFE_TRIGGER_MIN, Math.min(TRIGGER_DIST, step * SAFE_TRIGGER_MAX_RATIO));
      const next = getNextRightCard();
      const target = computeTxForCentering(next, tx);
      const dist = Math.abs(tx - target);
      if (dist <= safeMax) startBounceTo(target);

    } else if (mode === 'BOUNCE') {
      const prevTx = tx;
      tx += v * dt;
      v  *= Math.exp(-FRICTION * dt);

      const crossed = (prevTx - wallTx) * (tx - wallTx) <= 0;
      if (crossed) {
        tx = wallTx + (wallTx - tx);
        v  = -v * RESTITUTION;
        bounces += 1;
        if (bounces >= MAX_BOUNCES) {
          tx = wallTx; v = 0; apply();
          mode = 'HOLD'; dwellUntil = ts + DWELL_MS;
        }
      }

      if (Math.abs(v) < V_STOP && Math.abs(tx - wallTx) < X_STOP) {
        tx = wallTx; v = 0; apply();
        mode = 'HOLD'; dwellUntil = ts + DWELL_MS;
      }

      apply();

    } else if (mode === 'HOLD') {
      if (ts >= dwellUntil) {
        mode = 'CRUISE'; v = -CRUISE_SPEED;
        lastProgressTx = tx; lastProgressTs = ts;
      }
    }
    // DRAG rysuje rAF z onMove()

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
})();
