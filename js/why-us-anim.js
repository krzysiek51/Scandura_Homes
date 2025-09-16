// why-us-anim.js — pełna regulacja opóźnień (zdjęcia + badge + teksty + lista)
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================
     KONFIG: progi & opóźnienia
     ======================= */
  const THRESHOLDS = {
    big:    0.06, // duże foto start
    small:  0.26, // małe foto start
    badge:  0.32, // badge start
    title:  0.46, // start auto-kolejki tekstów
  };

  const DELAYS = {
    // Zdjęcia
    big:    80,   // opóźnienie pojawienia dużego zdjęcia (ms)
    small:  380,  // małe zdjęcie
    badge:  520,  // badge

    // Counter
    counterDuration: 900, // czas trwania animacji licznika (ms)

    // Teksty
    title:    100,     // tytuł (ms od startu kolejki)
    subtitle: 320,   // podtytuł
    desc:     750,   // opis
    listStep: 510,   // odstęp pomiędzy punktami listy
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const mapWin = (t, a, b) => easeOutCubic(clamp01((t - a) / Math.max(1e-6, b - a)));

  function animateCounter(el, to, { duration = 900, prefix = '', suffix = '+' } = {}) {
    const from = 0, t0 = performance.now();
    const step = (now) => {
      const p = clamp01((now - t0) / duration);
      el.textContent = `${prefix}${Math.round(from + (to - from) * easeOutCubic(p))}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function init() {
    const section = document.querySelector('.why-us');
    if (!section) return;

    section.classList.add('reveal-queue');

    // Hooks
    const bigCard   = section.querySelector('.why-us__review-card');
    const smallWrap = section.querySelector('.why-us__image-wrapper');
    const badge     = section.querySelector('.why-us__projects');
    const badgeNum  = section.querySelector('.why-us__projects-number');

    const divider   = section.querySelector('.why-us__divider');
    const title     = section.querySelector('.why-us__title');
    const subtitle  = section.querySelector('.why-us__description-title');
    const desc      = section.querySelector('.why-us__description');
    const listItems = Array.from(section.querySelectorAll('.why-us__list .why-us__item'));

    if (prefersReduced) {
      [bigCard, smallWrap, badge].forEach(el => el && el.classList.add('is-in'));
      [title, subtitle, desc].forEach(el => el && el.classList.add('is-in'));
      listItems.forEach(li => li.classList.add('is-in'));
      if (badgeNum) {
        const m = (badgeNum.textContent || '26+').match(/(\D*)(\d+)(\D*)/);
        badgeNum.textContent = `${m?.[1] ?? ''}${m?.[2] ?? '26'}${m?.[3] ?? '+'}`;
      }
      section.style.setProperty('--w-div', '1');
      return;
    }

    let shownBig = false, shownSmall = false, shownBadge = false, counted = false;
    let textsQueued = false;

    const computeT = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * 0.72, end = vh * 0.28;
      const total = r.height + start - end;
      return clamp01((start - r.top) / Math.max(1, total));
    };

    function playTextsQueue() {
      if (textsQueued) return;
      textsQueued = true;
      section.classList.add('texts-queue');

      setTimeout(() => title?.classList.add('is-in'),    DELAYS.title);
      setTimeout(() => subtitle?.classList.add('is-in'), DELAYS.subtitle);
      setTimeout(() => desc?.classList.add('is-in'),     DELAYS.desc);
      setTimeout(() => {
        listItems.forEach((li, i) => {
          setTimeout(() => li.classList.add('is-in'), i * DELAYS.listStep);
        });
      }, DELAYS.desc + 120);
    }

    const onScroll = () => {
      const t = computeT();

      // Zdjęcia
      if (!shownBig   && t >= THRESHOLDS.big) {
        setTimeout(() => bigCard?.classList.add('is-in'), DELAYS.big);
        shownBig = true;
      }
      if (!shownSmall && t >= THRESHOLDS.small) {
        setTimeout(() => smallWrap?.classList.add('is-in'), DELAYS.small);
        shownSmall = true;
      }
      if (!shownBadge && t >= THRESHOLDS.badge) {
        setTimeout(() => {
          badge?.classList.add('is-in');
          if (!counted && badgeNum) {
            const raw = badgeNum.textContent || '26+';
            const m = raw.match(/(\D*)(\d+)(\D*)/);
            animateCounter(
              badgeNum,
              m?.[2] ? parseInt(m[2], 10) : 26,
              { duration: DELAYS.counterDuration, prefix: m?.[1] ?? '', suffix: m?.[3] ?? '+' }
            );
            counted = true;
          }
        }, DELAYS.badge);
        shownBadge = true;
      }

      // Teksty — kolejka
      if (!textsQueued && t >= THRESHOLDS.title) {
        playTextsQueue();
      }

      // Divider scroll-synced
      section.style.setProperty('--w-div', mapWin(t, 0.38, 0.56).toFixed(4));
    };

    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting) {
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }, { threshold: [0, 0.01, 0.2, 0.4, 0.6, 1] });

    io.observe(section);

    onScroll();
    setTimeout(onScroll, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
