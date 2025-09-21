// mission-anim.js — parallax/zoom (CSS vars) + reveal tekstów + panel z „gałkami”
(() => {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Animacja reveal (fade + lift)
  const EASING  = 'cubic-bezier(.22,1,.36,1)';
  const DUR     = 720;     // ms
  const START_Y = 20;      // px

  // ===== „Gałki” — progi wejścia (procent wysokości viewportu od GÓRY)
  const DEFAULT_LINES = { title: 88, subtitle: 84, text: 80, button: 76 };
  const LS_KEY  = 'missionLines';   // storage dla linii wejścia
  const IMG_KEY = 'missionImage';   // storage dla parallax/zoom (lift, scaleStart, scaleEnd)

  // ===== Helpers
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const win = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));

  const loadLines = () => {
    let fromLS = {};
    try { fromLS = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch {}
    const fromWin = (window.MISSION_REVEAL && window.MISSION_REVEAL.lines) || {};
    return { ...DEFAULT_LINES, ...fromLS, ...fromWin };
  };
  let GLOBAL_LINES = loadLines();

  const makeLineChecker = (linePercent /* 0..100 */) => {
    return () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return vh * (linePercent / 100); // linia w X% od GÓRY (np. 96% ≈ prawie dół)
    };
  };

  function readLinePercent(section, name) {
    if (GLOBAL_LINES && typeof GLOBAL_LINES[name] === 'number') return GLOBAL_LINES[name];
    const dataKey = 'line' + name.charAt(0).toUpperCase() + name.slice(1);
    const fromData = section.dataset[dataKey];
    if (fromData && !Number.isNaN(+fromData)) return +fromData;
    const cssVar = `--mission-line-${name}`;
    const v = getComputedStyle(section).getPropertyValue(cssVar).trim();
    if (v) { const num = parseFloat(v); if (!Number.isNaN(num)) return num; }
    return DEFAULT_LINES[name];
  }

  // ===== Progres sekcji (0..1) na podstawie data-start / data-end
  const computeProgressFactory = (section) => {
    const ds = parseFloat(section.getAttribute('data-start') || '0.72');
    const de = parseFloat(section.getAttribute('data-end')   || '0.28');
    return () => {
      const r  = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start  = vh * ds;
      const end    = vh * de;
      const total  = r.height + (start - end);
      const passed = start - r.top;
      return clamp01(passed / Math.max(1, total));
    };
  };

  // ===== Ustaw zmienne CSS używane w SCSS (parallax/zoom/dekor)
  const updateScrollVars = (section, t) => {
    const pImg  = win(t, 0.00, 0.24);
    const pDots = win(t, 0.12, 0.36);
    const pDiv  = win(t, 0.18, 0.42);

    section.style.setProperty('--p',      t.toFixed(4));
    section.style.setProperty('--p-img',  pImg.toFixed(4));
    section.style.setProperty('--p-dots', pDots.toFixed(4));
    section.style.setProperty('--p-div',  pDiv.toFixed(4));
  };

  // ===== REVEAL pojedynczego elementu po przecięciu „linii”
  function armReveal(el, linePercent, label = '') {
    if (!el) return;
    if (el.__missionArmed) return;
    el.__missionArmed = true;

    const lineY = makeLineChecker(linePercent);

    if (!prefersReduced) {
      el.style.opacity = '0';
      el.style.transform = `translateY(${START_Y}px)`;
    }

    const animateIn = () => {
      if (el.__missionRevealed) return;
      el.__missionRevealed = true;

      if (prefersReduced) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        return;
      }

      el.animate(
        [
          { opacity: 0, transform: `translateY(${START_Y}px)` },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: DUR, easing: EASING, fill: 'forwards' }
      );
      if (window.__missionLog) console.log('[mission:in]', label || el.className);
    };

    const checkNow = () => {
      const r = el.getBoundingClientRect();
      if (r.top <= lineY()) animateIn();
    };

    checkNow(); setTimeout(checkNow, 0); setTimeout(checkNow, 150);

    let ticking = false;
    const onScroll = () => {
      if (el.__missionRevealed) {
        window.removeEventListener('scroll', onScroll, { passive: true });
        window.removeEventListener('resize', onScroll);
        return;
      }
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          checkNow();
        });
      }
    };

    if (!el.__missionRevealed) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }

    el.__missionCheckNow = checkNow; // do liveRefresh (panel)
  }

  function armTextReveal(section) {
    const titleP    = readLinePercent(section, 'title');
    const subtitleP = readLinePercent(section, 'subtitle');
    const textP     = readLinePercent(section, 'text');
    const buttonP   = readLinePercent(section, 'button');

    armReveal(section.querySelector('.mission__title'),      titleP,    'title');
    armReveal(section.querySelector('.mission__text-title'), subtitleP, 'subtitle');
    armReveal(section.querySelector('.mission__text'),       textP,     'text');
    armReveal(section.querySelector('.mission__button'),     buttonP,   'button');

    section.__missionReveals = Array.from(section.querySelectorAll(
      '.mission__title, .mission__text-title, .mission__text, .mission__button'
    ));
  }

  // ===== Restore zapisanych wartości Parallax/Zoom przy starcie (nawet bez panelu)
  function restoreImageVarsOnLoad() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(IMG_KEY) || '{}') || {}; } catch {}
    const has = (k) => saved[k] != null && saved[k] !== '';

    document.querySelectorAll('.mission').forEach(sec => {
      if (has('lift'))       sec.style.setProperty('--img-lift',        String(saved.lift) + 'vh');
      if (has('scaleStart')) sec.style.setProperty('--img-scale-start', String(saved.scaleStart));
      if (has('scaleEnd'))   sec.style.setProperty('--img-scale-end',   String(saved.scaleEnd));
    });
  }

  // ===== Init jednej sekcji (parallax + reveal)
  function initOne(section) {
    // Parallax/zoom — natychmiast ustaw stan (t) i nasłuchuj scroll/resize
    if (prefersReduced) {
      updateScrollVars(section, 1);
    } else {
      const computeProgress = computeProgressFactory(section);
      let ticking = false;
      const rafUpdate = () => { ticking = false; updateScrollVars(section, computeProgress()); };
      const onScroll  = () => { if (!ticking) { ticking = true; requestAnimationFrame(rafUpdate); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll(); setTimeout(onScroll, 32); setTimeout(onScroll, 160);
    }

    // Teksty (reveal)
    armTextReveal(section);
  }

  // ===== Init all
  function initAll() {
    restoreImageVarsOnLoad();
    document.querySelectorAll('.mission').forEach(initOne);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }

  // ===== Panel (Alt+M / ?missionPanel=1) — linie + parallax/zoom
  function injectPanel() {
    if (document.getElementById('missionPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'missionPanel';
    panel.style.cssText = `
      position:fixed; inset:auto 16px 16px auto; z-index:99999;
      background:#111; color:#fff; font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
      padding:12px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.35); width:260px; opacity:.96;
    `;

    const row = (label, key) => {
      const val = (GLOBAL_LINES && GLOBAL_LINES[key]) ?? DEFAULT_LINES[key];
      return `
        <label style="display:block;margin:8px 0 4px">${label} <b id="val-${key}">${val}</b>%</label>
        <input type="range" min="50" max="100" step="1" value="${val}" data-key="${key}" style="width:100%" />
      `;
    };

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>Mission Reveal</strong>
        <button id="mpClose" style="all:unset;cursor:pointer;padding:4px 8px;background:#333;border-radius:6px">×</button>
      </div>
      ${row('Title', 'title')}
      ${row('Subtitle', 'subtitle')}
      ${row('Text', 'text')}
      ${row('Button', 'button')}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="mpReset" style="all:unset;cursor:pointer;padding:6px 8px;background:#333;border-radius:6px">Reset</button>
        <button id="mpSave"  style="all:unset;cursor:pointer;padding:6px 8px;background:#4b8;border-radius:6px">Save</button>
      </div>

      <div style="margin-top:10px;border-top:1px solid #444;padding-top:8px">
        <label style="display:block;margin:8px 0 4px">Parallax <b id="val-lift">20</b>vh</label>
        <input type="range" min="0" max="50" step="1" value="20"
               data-prop="--img-lift" data-unit="vh" style="width:100%" />

        <label style="display:block;margin:8px 0 4px">Zoom start <b id="val-scale-start">1.20</b></label>
        <input type="range" min="1" max="2" step="0.01" value="1.20"
               data-prop="--img-scale-start" style="width:100%" />

        <label style="display:block;margin:8px 0 4px">Zoom end <b id="val-scale-end">1.00</b></label>
        <input type="range" min="0.8" max="1.2" step="0.01" value="1.00"
               data-prop="--img-scale-end" style="width:100%" />
      </div>
    `;
    document.body.appendChild(panel);

    const $ = (sel) => panel.querySelector(sel);
    $('#mpClose').onclick = () => panel.remove();

    // helper: ustaw var na KAŻDEJ .mission (inline — przebija SCSS)
    const applyImgVar = (prop, val, unit = '') => {
      document.querySelectorAll('.mission').forEach(sec => {
        sec.style.setProperty(prop, String(val) + unit);
      });
    };

    // init suwaków obrazu (restore z localStorage + ustaw CSS vars)
    (() => {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(IMG_KEY) || '{}') || {}; } catch {}
      const cfg = [
        { sel: 'input[data-prop="--img-lift"]',        id: 'val-lift',        unit: 'vh',  key: 'lift' },
        { sel: 'input[data-prop="--img-scale-start"]', id: 'val-scale-start', unit: '',    key: 'scaleStart' },
        { sel: 'input[data-prop="--img-scale-end"]',   id: 'val-scale-end',   unit: '',    key: 'scaleEnd' },
      ];
      cfg.forEach(({ sel, id, unit, key }) => {
        const inp = $(sel); if (!inp) return;
        if (saved[key] != null) inp.value = saved[key];
        applyImgVar(inp.dataset.prop, inp.value, unit);
        const lbl = $('#'+id); if (lbl) lbl.textContent = inp.value;
      });
    })();

    // obsługa inputów (obrazu i tekstów)
    panel.addEventListener('input', (e) => {
      const inp = e.target;
      if (inp.tagName !== 'INPUT') return;

      // suwak obrazu (parallax / zoom)
      if (inp.dataset.prop) {
        const unit = inp.dataset.unit || '';
        const prop = inp.dataset.prop;
        applyImgVar(prop, inp.value, unit);
        const id = prop.replace('--img-', '');
        const lbl = $('#val-' + id);
        if (lbl) lbl.textContent = inp.value;
        return;
      }

      // suwak tekstów (linie wejścia)
      const key = inp.dataset.key; // title / subtitle / text / button
      const val = +inp.value;
      GLOBAL_LINES = { ...GLOBAL_LINES, [key]: val };
      const lbl = $('#val-' + key);
      if (lbl) lbl.textContent = val;
      liveRefresh();
    });

    // Reset — czyści oba zestawy
    $('#mpReset').onclick = () => {
      // teksty
      GLOBAL_LINES = { ...DEFAULT_LINES };
      ['title','subtitle','text','button'].forEach(k => {
        const inp = panel.querySelector(`input[data-key="${k}"]`);
        if (inp) { inp.value = DEFAULT_LINES[k]; $('#val-'+k).textContent = DEFAULT_LINES[k]; }
      });
      localStorage.removeItem(LS_KEY);
      liveRefresh();

      // obraz — przywróć domyślne z HTML panelu
      const cfg = [
        { sel: 'input[data-prop="--img-lift"]',        id: 'val-lift',        unit: 'vh' },
        { sel: 'input[data-prop="--img-scale-start"]', id: 'val-scale-start', unit: ''   },
        { sel: 'input[data-prop="--img-scale-end"]',   id: 'val-scale-end',   unit: ''   },
      ];
      cfg.forEach(({ sel, id, unit }) => {
        const inp = $(sel); if (!inp) return;
        applyImgVar(inp.dataset.prop, inp.value, unit);
        const lbl = $('#'+id); if (lbl) lbl.textContent = inp.value;
      });
      localStorage.removeItem(IMG_KEY);
    };

    // Save — zapisuje oba zestawy
    $('#mpSave').onclick = () => {
      localStorage.setItem(LS_KEY, JSON.stringify(GLOBAL_LINES));
      const data = {};
      [
        { sel: 'input[data-prop="--img-lift"]',        key: 'lift' },
        { sel: 'input[data-prop="--img-scale-start"]', key: 'scaleStart' },
        { sel: 'input[data-prop="--img-scale-end"]',   key: 'scaleEnd' },
      ].forEach(({ sel, key }) => {
        const inp = $(sel); if (inp) data[key] = inp.value;
      });
      localStorage.setItem(IMG_KEY, JSON.stringify(data));
    };
  }

  // Live-odświeżenie triggerów dla jeszcze niewyzwolonych elementów
  function liveRefresh() {
    document.querySelectorAll('.mission').forEach(section => {
      const nodes = section.__missionReveals || [];
      nodes.forEach(el => {
        if (el && !el.__missionRevealed && typeof el.__missionCheckNow === 'function') {
          el.__missionCheckNow();
        }
      });
    });
  }

  // Skrót Alt+M — pokaż panel
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      injectPanel();
    }
  });

  // Auto-panel przez URL
  if (/\bmissionPanel=1\b/.test(location.search)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectPanel, { once: true });
    } else {
      injectPanel();
    }
  }
})();
