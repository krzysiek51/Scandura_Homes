// services-anim.js — animuj tylko pierwszą kartę, gdy slider "osiądzie" (settle+dwell)
(() => {
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const slider = document.querySelector('.services__slider');
    const track  = slider?.querySelector('.services__track');
    if (!slider || !track) return;

    const cards = Array.from(slider.querySelectorAll('.services__card'));
    if (!cards.length) return;

    /* ===== Konfiguracja ===== */
    const SETTLE_MS  = 220;   // ile ms tor ma być nieruchomy, by uznać, że "osiadł"
    const DWELL_MS   = 160;   // ile ms karta ma pozostać widoczna (stabilnie)
    const VIS_RATIO  = 0.55;  // minimalna część szerokości karty w kadrze slidera (0..1)
    const ROOT_MARGIN = '0px 0px -20% 0px'; // wcześniejszy „próg” wejścia slidera

    const log = (...a) => console.log('%c[services-anim]', 'color:#0bb;font-weight:700', ...a);

    /* ===== Helpers ===== */
    const getTransform = (el) => getComputedStyle(el).transform || '';
    const visibleWidthInside = (cardRect, sliderRect) => {
      const left  = Math.max(cardRect.left, sliderRect.left);
      const right = Math.min(cardRect.right, sliderRect.right);
      return Math.max(0, right - left);
    };
    const pickBestCard = () => {
      // preferuj .is-active jeśli jest i spełnia widoczność
      const active = slider.querySelector('.services__card.is-active');
      const sRect = slider.getBoundingClientRect();
      if (active) {
        const ar = active.getBoundingClientRect();
        const vis = visibleWidthInside(ar, sRect);
        if (vis / Math.max(1, ar.width) >= VIS_RATIO) return active;
      }
      // inaczej: największa widoczna szerokość, tie-break: mniejszy left
      let best = null;
      for (const el of cards) {
        const r = el.getBoundingClientRect();
        const vertOverlap = Math.min(sRect.bottom, r.bottom) - Math.max(sRect.top, r.top);
        if (vertOverlap <= 0) continue;
        const visW = visibleWidthInside(r, sRect);
        if (visW <= 1) continue;
        if (!best || visW > best.vis || (visW === best.vis && r.left < best.rect.left)) {
          best = { el, vis: visW, rect: r };
        }
      }
      return best?.el || null;
    };

    /* ===== Fire (rAF staged) ===== */
    const fireAnimation = (card) => {
      if (!card || card.classList.contains('is-animated')) return;
      card.classList.add('will-animate');
      requestAnimationFrame(() => {
        card.classList.add('is-animated');
        requestAnimationFrame(() => {
          card.classList.remove('will-animate');
          log('animated card:', card);
        });
      });
    };

    /* ===== Główna pętla: czekamy aż tor się uspokoi, potem dwell na karcie ===== */
    let armed = false;     // slider w kadrze
    let fired = false;     // animacja już odpalona
    let lastMove = performance.now();
    let lastTransform = getTransform(track);
    let dwellStart = 0;

    const tick = () => {
      if (fired || !armed) return; // nic nie rób, jeśli nie w kadrze albo już zagrane

      // 1) wykryj ruch toru (zmiana transform)
      const t = getTransform(track);
      if (t !== lastTransform) {
        lastTransform = t;
        lastMove = performance.now();
        dwellStart = 0; // reset dwell
      }

      const now = performance.now();
      const settled = (now - lastMove) >= SETTLE_MS;

      if (settled) {
        // 2) tor stoi -> sprawdź najlepszą kartę i jej widoczność
        const sRect = slider.getBoundingClientRect();
        const card = pickBestCard();
        if (card) {
          const r = card.getBoundingClientRect();
          const vis = visibleWidthInside(r, sRect) / Math.max(1, r.width);
          if (vis >= VIS_RATIO) {
            if (dwellStart === 0) dwellStart = now;
            const dwellOk = (now - dwellStart) >= DWELL_MS;
            if (dwellOk) {
              fired = true;
              fireAnimation(card);
              return; // koniec pętli
            }
          } else {
            dwellStart = 0; // widoczność spadła — reset dwell
          }
        }
      }
      requestAnimationFrame(tick);
    };

    /* ===== IO: uzbrój, gdy slider wejdzie w viewport ===== */
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting && !armed) {
        armed = true;
        lastMove = performance.now();
        lastTransform = getTransform(track);
        requestAnimationFrame(tick);
        log('armed (in viewport)');
      }
    }, { threshold: [0, 0.05], rootMargin: ROOT_MARGIN });

    io.observe(slider);

    // Fallback: jeśli na starcie już w kadrze — uzbrój
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const sRect = slider.getBoundingClientRect();
    if (sRect.top < vh && sRect.bottom > 0 && !armed) {
      armed = true;
      requestAnimationFrame(tick);
      log('armed (initially in view)');
    }

    // Ostateczny fallback (np. dziwne webview): po 1200ms spróbuj wymusić
    setTimeout(() => {
      if (!fired) {
        const card = pickBestCard() || cards[0];
        fireAnimation(card);
        fired = true;
        log('forced (timeout)');
      }
    }, 1200);
  });
})();
