// why-us-anim.js — kolejka zdjęć + counter 26+, divider/teksty scroll-synced
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const win = (t, a, b) => {
    const x = Math.max(0, Math.min(1, (t - a) / Math.max(1e-6, b - a)));
    return easeOutCubic(x);
  };

  const animateCounter = (el, to, { duration = 900, prefix = '', suffix = '' } = {}) => {
    const from = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp01((now - t0) / duration);
      const v = Math.round(from + (to - from) * easeOutCubic(p));
      el.textContent = `${prefix}${v}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  function init() {
    const section = document.querySelector('.why-us');
    if (!section) return;

    // 🔒 Dodaj klasę, która aktywuje "startowy stan ukrycia" w CSS.
    // Dzięki temu nie zobaczysz elementów zanim JS odpali kolejkę.
    section.classList.add('reveal-queue');

    const bigCard   = section.querySelector('.why-us__review-card');
    const smallWrap = section.querySelector('.why-us__image-wrapper');
    const badge     = section.querySelector('.why-us__projects');
    const badgeNum  = section.querySelector('.why-us__projects-number');

    const divider   = section.querySelector('.why-us__divider');
    const title     = section.querySelector('.why-us__title');
    const subtitle  = section.querySelector('.why-us__description-title');
    const desc      = section.querySelector('.why-us__description');
    const listItems = Array.from(section.querySelectorAll('.why-us__list .why-us__item'));

    // Reduced Motion -> pokaż wszystko od razu + ustaw licznik na docelową wartość
    if (prefersReduced) {
      [bigCard, smallWrap, badge].forEach(el => el && el.classList.add('is-in'));
      section.classList.remove('reveal-queue');
      if (badgeNum) {
        const m = (badgeNum.textContent || '26+').match(/(\D*)(\d+)(\D*)/);
        badgeNum.textContent = `${m?.[1] ?? ''}${m?.[2] ?? '26'}${m?.[3] ?? '+'}`;
      }
      return;
    }

    // 1) KOLEJKA ZDJĘĆ + BADGE (jednorazowo po wejściu sekcji)
    let queued = false;
    const ioQueue = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e || queued) return;
      if (e.isIntersecting) {
        queued = true;

        // Stagger: duże → małe → badge (z licznikiem)
        setTimeout(() => bigCard?.classList.add('is-in'),   80);
        setTimeout(() => smallWrap?.classList.add('is-in'), 280);
        setTimeout(() => {
          badge?.classList.add('is-in');
          if (badgeNum) {
            const raw = badgeNum.textContent || '26+';
            const m = raw.match(/(\D*)(\d+)(\D*)/);
            animateCounter(
              badgeNum,
              m?.[2] ? parseInt(m[2], 10) : 26,
              { duration: 900, prefix: m?.[1] ?? '', suffix: m?.[3] ?? '+' }
            );
          }
        }, 520);

        // Po odpaleniu kolejki nie potrzebujemy blokady startowej
        // (zostawiamy klasę reveal-queue, bo nie przeszkadza)
        ioQueue.disconnect();
      }
    }, { threshold: 0.35 });
    ioQueue.observe(section);

    // 2) SCROLL-SYNC dla divider + copy + lista (jak wcześniej)
    const computeT = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * 0.72, end = vh * 0.28;
      const total = r.height + start - end;
      return clamp01((start - r.top) / Math.max(1, total));
    };

    const onScroll = () => {
      const t = computeT();
      section.style.setProperty('--w-div',   win(t, 0.20, 0.45).toFixed(4));
      section.style.setProperty('--w-title', win(t, 0.32, 0.58).toFixed(4));
      section.style.setProperty('--w-sub',   win(t, 0.40, 0.66).toFixed(4));
      section.style.setProperty('--w-desc',  win(t, 0.48, 0.82).toFixed(4));
      section.style.setProperty('--w-list',  win(t, 0.58, 1.00).toFixed(4));

      const base = 0.58, per = 0.07;
      listItems.forEach((li, i) => {
        const s = base + i * per;
        const p = win(t, s, s + 0.22);
        li.style.setProperty('--p-li', p.toFixed(4));
      });
    };

    const ioScroll = new IntersectionObserver((entries) => {
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
    }, { threshold: [0, 0.01, 0.5, 1] });
    ioScroll.observe(section);

    // Start od razu (na wypadek wejścia „w połowie”)
    onScroll();
    setTimeout(onScroll, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
