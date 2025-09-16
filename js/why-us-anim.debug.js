// why-us-anim.debug.js — DIAGNOSTYKA KOLEJKI
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const log = (...a) => console.log('%c[WHY-US]', 'color:#0bb;font-weight:700', ...a);
  const warn = (...a) => console.warn('[WHY-US]', ...a);
  const err = (...a) => console.error('[WHY-US]', ...a);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const win = (t, a, b) => easeOutCubic(clamp01((t - a) / Math.max(1e-6, b - a)));

  function animateCounter(el, to, { duration = 900, prefix = '', suffix = '+' } = {}) {
    const from = 0, t0 = performance.now();
    const step = (now) => {
      const p = clamp01((now - t0) / duration);
      const v = Math.round(from + (to - from) * easeOutCubic(p));
      el.textContent = `${prefix}${v}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function init() {
    log('Init start. DOM ready =', document.readyState);

    const section = document.querySelector('.why-us');
    if (!section) return err('Nie znaleziono .why-us (sprawdź HTML).');

    // DEBUG atrybut + klasa blokująca FOUC
    section.dataset.debugWhy = '1';
    section.classList.add('reveal-queue');

    const $ = (sel) => section.querySelector(sel);
    const bigCard   = $('.why-us__review-card');
    const bigImg    = $('.why-us__review-image');
    const smallWrap = $('.why-us__image-wrapper');
    const smallImg  = $('.why-us__image');
    const badge     = $('.why-us__projects');
    const badgeNum  = $('.why-us__projects-number');
    const divider   = $('.why-us__divider');
    const title     = $('.why-us__title');
    const subtitle  = $('.why-us__description-title');
    const desc      = $('.why-us__description');
    const listItems = Array.from(section.querySelectorAll('.why-us__list .why-us__item'));

    // PODSUMOWANIE ELEMENTÓW
    log('Hooks:', {
      bigCard: !!bigCard, bigImg: !!bigImg,
      smallWrap: !!smallWrap, smallImg: !!smallImg,
      badge: !!badge, badgeNum: !!badgeNum,
      divider: !!divider, title: !!title, subtitle: !!subtitle, desc: !!desc,
      listItems: listItems.length
    });

    // MUTATION OBSERVER — pokaże kiedy klasy się zmieniają
    const mo = new MutationObserver((muts) => {
      muts.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          log('class change:', el.className);
        }
      });
    });
    [bigCard, smallWrap, badge].forEach(el => el && mo.observe(el, { attributes: true }));

    // REDUCED MOTION
    if (prefersReduced) {
      log('prefers-reduced-motion: reduce → omijam animacje.');
      [bigCard, smallWrap, badge].forEach(el => el && el.classList.add('is-in'));
      if (badgeNum) {
        const m = (badgeNum.textContent || '26+').match(/(\D*)(\d+)(\D*)/);
        badgeNum.textContent = `${m?.[1] ?? ''}${m?.[2] ?? '26'}${m?.[3] ?? '+'}`;
      }
      exposeDebugAPI({ section, bigCard, smallWrap, badge, divider, title, subtitle, desc, listItems, badgeNum });
      return;
    }

    // 1) KOLEJKA ZDJĘĆ + BADGE — IntersectionObserver
    let queued = false;
    const ioQueue = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      log('IO(queue): isIntersecting=', e.isIntersecting, 'ratio=', e.intersectionRatio.toFixed(3));
      if (!queued && e.isIntersecting) {
        queued = true;

        // Stagger: duże -> małe -> badge
        log('QUEUE FIRE → duże → małe → badge');
        setTimeout(() => { bigCard?.classList.add('is-in'); log('bigCard.is-in'); }, 80);
        setTimeout(() => { smallWrap?.classList.add('is-in'); log('smallWrap.is-in'); }, 280);
        setTimeout(() => {
          badge?.classList.add('is-in'); log('badge.is-in + counter');
          if (badgeNum) {
            const raw = badgeNum.textContent || '26+';
            const m = raw.match(/(\D*)(\d+)(\D*)/);
            animateCounter(badgeNum, m?.[2] ? parseInt(m[2], 10) : 26, { duration: 900, prefix: m?.[1] ?? '', suffix: m?.[3] ?? '+' });
          }
        }, 520);

        ioQueue.disconnect();
      }
    }, { threshold: 0.35 });
    ioQueue.observe(section);

    // 2) SCROLL-SYNC dla divider/copy/listy
    const computeT = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * 0.72, end = vh * 0.28;
      const total = r.height + start - end;
      const t = clamp01((start - r.top) / Math.max(1, total));
      // Debug overlay wartości:
      section.dataset.t = t.toFixed(3);
      section.dataset.top = r.top.toFixed(1);
      section.dataset.bottom = r.bottom.toFixed(1);
      section.dataset.vh = vh.toFixed(0);
      return t;
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
      log('IO(scroll): isIntersecting=', e.isIntersecting, 'ratio=', e.intersectionRatio.toFixed(3));
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

    exposeDebugAPI({ section, bigCard, smallWrap, badge, divider, title, subtitle, desc, listItems, badgeNum, ioQueue, ioScroll });
    log('Init done.');
  }

  function exposeDebugAPI(ctx) {
    const api = {
      /** Stan sekcji i klas */
      state() {
        const { section, bigCard, smallWrap, badge } = ctx;
        return {
          hasRevealQueue: section?.classList.contains('reveal-queue'),
          bigCard: bigCard?.className,
          smallWrap: smallWrap?.className,
          badge: badge?.className,
          t: section?.dataset.t,
          top: section?.dataset.top,
          bottom: section?.dataset.bottom
        };
      },
      /** Wymuś startowy stan (ukryj wszystko) */
      forceHide() {
        const { section, bigCard, smallWrap, badge } = ctx;
        section.classList.add('reveal-queue');
        [bigCard, smallWrap, badge].forEach(el => el && el.classList.remove('is-in'));
        console.log('forceHide → ukryto');
      },
      /** Wymuś stan „pokazane” (bez kolejek) */
      forceShow() {
        const { section, bigCard, smallWrap, badge } = ctx;
        section.classList.remove('reveal-queue');
        [bigCard, smallWrap, badge].forEach(el => el && el.classList.add('is-in'));
        console.log('forceShow → pokazano');
      },
      /** Zagraj kolejkę ręcznie (do testu bez IO) */
      playQueue() {
        const { bigCard, smallWrap, badge, badgeNum } = ctx;
        [bigCard, smallWrap, badge].forEach(el => el && el.classList.remove('is-in'));
        setTimeout(() => { bigCard?.classList.add('is-in'); console.log('playQueue big'); }, 80);
        setTimeout(() => { smallWrap?.classList.add('is-in'); console.log('playQueue small'); }, 280);
        setTimeout(() => {
          badge?.classList.add('is-in'); console.log('playQueue badge');
          if (badgeNum) animateCounter(badgeNum, 26, { duration: 900, suffix: '+' });
        }, 520);
      },
      /** Ping — podaj bounding rect i t */
      ping() {
        const r = ctx.section.getBoundingClientRect();
        console.table({
          top: r.top.toFixed(1), bottom: r.bottom.toFixed(1),
          height: r.height.toFixed(1), vh: (innerHeight).toFixed(0),
          t: (ctx.section.dataset.t || '?')
        });
      }
    };
    window._whyUsDebug = api;
    console.info('%cwhy-us debug → dostępne w konsoli jako _whyUsDebug', 'color:#0bb');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
