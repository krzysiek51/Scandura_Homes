// why-us-anim.js — Apple-like foto + title-lift + divider + Apple-reveal (lead/desc/list) + CountUp
(() => {
  /* ====== GAŁKI ====== */
  const TITLE_START_VH = 0.98;
  const TITLE_END_VH   = 0.52;
  const MOVE_SPAN      = 0.35;
  const MOVE_DELAY     = 0.10;

  // Divider — okno domyślne (po własnym TOP-ie paska)
  const DIV_START_VH_DEFAULT = 0.98;
  const DIV_END_VH_DEFAULT   = 0.35;

  /* ====== helpers ====== */
  const ease     = t => 1 - Math.pow(1 - t, 3);                  // ease-out cubic
  const clamp    = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const map      = (t, a, b) => ease(clamp((t - a) / (b - a)));
  const delayed  = (p, delay = 0.12) => clamp((p - delay) / (1 - delay));
  const squeeze  = (p, span = 0.35, delay = 0) => clamp((p - delay) / Math.max(1e-6, span));
  const vhPx     = () => window.innerHeight || document.documentElement.clientHeight;

  // Mapowanie 0..1 po TOP-ie elementu w oknie [startVH..endVH]
  const progressByTop = (el, startVH, endVH) => {
    if (!el) return 0;
    const r  = el.getBoundingClientRect();
    const vh = vhPx();
    const s  = Math.max(startVH * vh, endVH * vh);
    const e  = Math.min(startVH * vh, endVH * vh);
    return clamp((s - r.top) / (s - e || 1));
  };

  const sectionProgress = (sec) => {
    const r  = sec.getBoundingClientRect();
    const vh = vhPx();
    const start = 1.10 * vh, end = -0.10 * vh;
    return clamp((start - r.top) / (start - end));
  };

  /* ====== Apple reveal (poza tytułem) ====== */
  const setupReveal = (sec) => {
    // cele: podtytuł, opis, elementy listy — tytułu NIE dotykamy
    const targets = [
      ...sec.querySelectorAll('.why-us__description-title'),
      ...sec.querySelectorAll('.why-us__description'),
      ...sec.querySelectorAll('.why-us__list .why-us__item')
    ];
    if (!targets.length) return;

    targets.forEach(el => el.classList.add('reveal'));

    // IO: odpala raz, gdy ~18% elementu jest w viewport (nieco przed dołem)
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal--in');
        io.unobserve(entry.target);
      });
    }, { root: null, threshold: 0.18, rootMargin: '0px 0px -10% 0px' });

    // Stagger: 0ms (subtitle), 80ms (desc), kolejne li co 60ms
    let delayMs = 0;
    targets.forEach((el, idx) => {
      const isItem = el.matches('.why-us__list .why-us__item');
      if (idx === 0) delayMs = 0;           // description-title
      else if (idx === 1) delayMs = 80;     // description
      else delayMs += isItem ? 60 : 0;      // list items
      el.style.transitionDelay = `${delayMs}ms`;
      io.observe(el);
    });
  };

  /* ====== Divider driver (monotoniczny) ====== */
  const DIV_MAX = new WeakMap(); // pamięć max progresu (0..1)

  const driveDivider = (divider) => {
    if (!divider) return;

    const startVH = parseFloat(divider.dataset.startVh || DIV_START_VH_DEFAULT);
    const endVH   = parseFloat(divider.dataset.endVh   || DIV_END_VH_DEFAULT);

    // liczony po własnym TOP-ie dividera
    const raw   = progressByTop(divider, startVH, endVH);
    const eased = ease(raw);

    const prev  = DIV_MAX.get(divider) ?? 0;
    const next  = eased > prev ? eased : prev; // tylko rośnie

    if (next !== prev) {
      DIV_MAX.set(divider, next);
      divider.style.setProperty('--div-p', next.toFixed(4));
    }
  };

  /* ====== CountUp (26+ i np. tytuł) ======
     Użycie w HTML:
       - 26+:  <p class="why-us__projects-number" data-countup data-target="26" data-suffix="+">0+</p>
       - Title z liczbą: <em class="why-us__title" data-countup data-target="15">15 lat …</em>
     Atrybuty opcjonalne:
       data-from="0" data-duration="900" data-decimals="0" data-prefix="" data-suffix="+"
  */
  const setupCountups = (sec) => {
    const nodes = [
      ...sec.querySelectorAll('[data-countup]'),
      // wsteczna kompatybilność: jeżeli ktoś nie doda atrybutu do 26+
      ...sec.querySelectorAll('.why-us__projects-number:not([data-countup])')
    ];
    if (!nodes.length) return;

    const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    nodes.forEach(el => {
      if (!el.dataset.countup) el.dataset.countup = '1'; // oznacz jako aktywny

      const targetAttr = el.dataset.target;
      // jeżeli nie podano targetu, spróbuj wyciągnąć liczby z tekstu
      const parsed = parseFloat((targetAttr ?? el.textContent).toString().replace(/[^\d.]/g, ''));
      const target = isNaN(parsed) ? 0 : parsed;

      const from  = parseFloat(el.dataset.from ?? '0');
      const dur   = parseInt(el.dataset.duration ?? '900', 10);
      const dec   = Math.max(0, parseInt(el.dataset.decimals ?? '0', 10));
      const prefix = el.dataset.prefix ?? '';
      const suffix = el.dataset.suffix ?? (/\D+$/.test(el.textContent) ? el.textContent.match(/\D+$/)[0] : '');

      const format = (v) => {
        const f = dec ? v.toFixed(dec) : Math.round(v).toString();
        return `${prefix}${f}${suffix}`;
      };

      // RM=reduce → od razu końcowa wartość
      if (prefersReduce) { el.textContent = format(target); return; }

      let started = false, t0 = 0;

      const tick = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const v = from + (target - from) * ease(p);
        el.textContent = format(v);
        if (p < 1) requestAnimationFrame(tick);
      };

      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (started || !e.isIntersecting) return;
          started = true;
          requestAnimationFrame(tick);
          io.disconnect();
        });
      }, { threshold: 0.3, rootMargin: '0px 0px -10% 0px' });

      io.observe(el);
    });
  };

  /* ====== Uruchomienie jednej sekcji ====== */
  const arm = (sec) => {
    // NIE dotykamy --w-div
    ['--w-img','--w-title','--w-title-move','--w-lead','--w-desc','--w-list']
      .forEach(v => { sec.style.removeProperty(v); sec.style.setProperty(v, '0'); });
  };

  const runOne = (sec) => {
    const title   = sec.querySelector('.why-us__title');
    const lead    = sec.querySelector('.why-us__lead, .why-us__description-title');
    const desc    = sec.querySelector('.why-us__description');
    const divider = sec.querySelector('.why-us__divider');
    // lista zostaje do reveal, nie sterujemy już --p-li w JS

    if (title && getComputedStyle(title).display === 'inline') {
      title.style.display = 'inline-block';
    }

    // Apple reveal dla lead/desc/list (once)
    setupReveal(sec);
    // CountUp dla 26+ i/lub title jeśli ma liczbę
    setupCountups(sec);

    let ticking = false;
    const raf = () => {
      ticking = false;

      // FOTO — zoom-out + parallax (Twoje gałki)
      const tSec = sectionProgress(sec);
      sec.style.setProperty('--w-img', map(tSec, 0.00, 0.40).toFixed(4));

      // DIVIDER — 0→1 po TOP-ie paska, monotonicznie
      driveDivider(divider);

      // TITLE — fade + lift (jak dotychczas)
      const eTitle = progressByTop(title, TITLE_START_VH, TITLE_END_VH);
      const pTitle = delayed(eTitle, 0.12);
      const mTitle = squeeze(pTitle, MOVE_SPAN, MOVE_DELAY);
      sec.style.setProperty('--w-title',      pTitle.toFixed(4));
      sec.style.setProperty('--w-title-move', mTitle.toFixed(4));

      // Lead/Desc/List animuje IO + CSS .reveal (nie sterujemy zmiennymi)
    };

    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(raf); } };

    arm(sec);
    onScroll(); setTimeout(onScroll, 60); setTimeout(onScroll, 200);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      // DIV_MAX zostawiamy — po 1.0 zostaje 1.0
    };
  };

  /* ====== Init wszystkich sekcji ====== */
  const init = () => {
    const sections = document.querySelectorAll('.why-us');
    if (!sections.length) return;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const sec = e.target;
        if (e.isIntersecting) {
          if (!sec.__whyUsCleanup) sec.__whyUsCleanup = runOne(sec);
        } else {
          if (sec.__whyUsCleanup) {
            sec.__whyUsCleanup();
            sec.__whyUsCleanup = null;
          }
        }
      }
    }, { root: null, rootMargin: '120% 0px 120% 0px', threshold: 0 });

    sections.forEach(s => io.observe(s));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
