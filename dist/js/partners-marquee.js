/* ============================================================================
   PARTNERS MARQUEE — seamless triple-track (no gaps, no jumps, resize-proof)
   ============================================================================ */
(() => {
  const CFG = {
    rowsSelector: '.partners__logos > .partners__row',
    speedsPxPerSec: [ +30, -30 ],   // [top, bottom] ; + => right, - => left
    startDelaysMs:  [    0, 1000 ],
    minSegmentWidthFactor: 1.0,
    disableTouchDrag: true,
    respectReducedMotion: true,
    resizeDebounceMs: 120
  };

  if (CFG.respectReducedMotion &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const rows = Array.from(document.querySelectorAll(CFG.rowsSelector));
  if (!rows.length) return;

  const mod = (n, m) => ((n % m) + m) % m;

  function waitImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    if (!imgs.length) return Promise.resolve();
    const waits = imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(res => {
        const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); res(); };
        img.addEventListener('load', done);
        img.addEventListener('error', done);
      });
    });
    return Promise.race([Promise.all(waits), new Promise(r => setTimeout(r, 2000))]);
  }

  async function setupRow(rowEl, idx) {
    // Bierzemy seed z .partners__marquee (bez dodatkowego wrappera)
    const marquee = rowEl.querySelector('.partners__marquee');
    const seedHTML = marquee ? marquee.innerHTML.trim() : rowEl.innerHTML.trim();
    if (!seedHTML) return null;

    rowEl.style.overflow = 'hidden';
    rowEl.style.position = 'relative';

    // Pasek z trzema segmentami [A][A][A]
    const strip = document.createElement('div');
    Object.assign(strip.style, {
      display: 'flex',
      flexWrap: 'nowrap',
      height: '100%',
      willChange: 'transform'
    });

    // Segment środkowy A
    const segMid = document.createElement('div');
    Object.assign(segMid.style, { display: 'flex', flexWrap: 'nowrap', height: '100%', flex: '0 0 auto' });
    segMid.innerHTML = seedHTML;

    // Wstaw i poczekaj na obrazki (prawdziwe wymiary)
    rowEl.innerHTML = '';
    strip.appendChild(segMid);
    rowEl.appendChild(strip);
    await waitImages(segMid);

    // Dolej seed, aż A >= viewport * factor
    const need = Math.max(1, rowEl.clientWidth * CFG.minSegmentWidthFactor);
    const seedChunk = segMid.innerHTML;
    let guard = 0;
    while (segMid.scrollWidth < need && guard++ < 200) {
      segMid.insertAdjacentHTML('beforeend', seedChunk);
    }

    // Skopiuj A w lewo i w prawo
    const segLeft  = segMid.cloneNode(true);
    const segRight = segMid.cloneNode(true);
    strip.insertBefore(segLeft, strip.firstChild);
    strip.appendChild(segRight);

    // Początkowy pomiar i „zamrożenie” szerokości A
    let W = segMid.getBoundingClientRect().width;
    [segLeft, segMid, segRight].forEach(seg => seg.style.width = W + 'px');

    // Blokada drag na touch (opcjonalnie)
    if (CFG.disableTouchDrag) {
      rowEl.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
      rowEl.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') e.preventDefault(); });
    }

    // Parametry ruchu
    const v = CFG.speedsPxPerSec[idx] ?? CFG.speedsPxPerSec[0];
    const delay = CFG.startDelaysMs[idx] ?? 0;
    let started = delay === 0;
    if (delay > 0) setTimeout(() => { started = true; }, delay);

    // Stan animacji
    let offset = 0;      // narastające przesunięcie (px)
    let base   = -W;     // tak, by środkowy A był w kadrze

    // Reakcja na resize — zawsze ponownie mierz i zamrażaj W (nawet bez dolewek)
    let rzTimer = 0;
    const recalc = () => {
      // Odmroź, przelicz potrzeby, ewentualnie dolej seed
      [segLeft, segMid, segRight].forEach(seg => seg.style.width = 'auto');
      const needNow = Math.max(1, rowEl.clientWidth * CFG.minSegmentWidthFactor);
      let added = false, guard2 = 0;
      while (segMid.scrollWidth < needNow && guard2++ < 200) {
        segMid.insertAdjacentHTML('beforeend', seedChunk);
        added = true;
      }
      if (added) {
        // klony muszą dostać tę samą zawartość
        segLeft.innerHTML  = segMid.innerHTML;
        segRight.innerHTML = segMid.innerHTML;
      }
      // Nowy pomiar i zamrożenie
      W = segMid.getBoundingClientRect().width;
      [segLeft, segMid, segRight].forEach(seg => seg.style.width = W + 'px');
      // Zachowaj płynność – przemapuj base o aktualny moduł
      base = -W + mod(offset, W);
    };

    const ro = new ResizeObserver(() => {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(recalc, CFG.resizeDebounceMs);
    });
    ro.observe(rowEl);

    return {
      strip,
      getW: () => W,
      v,
      startedRef: () => started,
      getOff: () => offset,
      setOff: x => (offset = x),
      getBase: () => base,
      setBase: b => (base = b),
    };
  }

  Promise.all(rows.map((r, i) => setupRow(r, i))).then(statesRaw => {
    const states = statesRaw.filter(Boolean);
    if (!states.length) return;

    let last = null;
    function tick(ts) {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;

      for (const s of states) {
        if (!s.startedRef()) continue;
        const W = s.getW();
        if (W <= 0) continue;

        const off = s.getOff() + s.v * dt;
        s.setOff(off);

        const base = -W + mod(off, W);
        s.setBase(base);

        s.strip.style.transform = `translate3d(${base}px,0,0)`;
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
