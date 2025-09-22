// ai-count.js — per-użytkownik, zliczanie po powrocie po przerwie
(() => {
  const els = document.querySelectorAll('.js-ai-count');
  if (!els.length) return;

  const STORAGE_KEY = 'aiCountState:v2';

  // ——— PARAMETRY DO TWEAKU ———
  const INACTIVITY_MS = 6 * 60 * 60 * 1000; // „nowa wizyta”, jeśli wróci po ≥6 h
  const COOLDOWN_MS   = 30 * 60 * 1000;     // min. odstęp między podbiciami (anty-spam)
  const BUMP_MIN = 1;                       // losowy przyrost
  const BUMP_MAX = 3;

  // ——— UTIL ———
  const now = () => Date.now();
  const getISOWeek = (d = new Date()) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
  };
  const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

  // ——— STAN ———
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  };
  const save = (s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };

  // jedno miejsce na stan wspólny
  let state = Object.assign({
    week: getISOWeek(),
    lastActiveAt: 0,      // kiedy user ostatnio „był” na stronie (widoczna karta)
    lastBumpAt:   0,      // kiedy ostatnio podbiliśmy licznik
    baseSeen: {}          // per data-base: aktualna liczba
  }, load());

  // reset tygodnia
  if (state.week !== getISOWeek()) {
    state = { week: getISOWeek(), lastActiveAt: 0, lastBumpAt: 0, baseSeen: {} };
  }

  // ——— LOGIKA PODBICIA ———
  const maybeBump = (reason = 'load') => {
    const t = now();

    // warunek „nowa wizyta”: powrót po dłuższej przerwie
    const inactiveLong = (t - (state.lastActiveAt || 0)) > INACTIVITY_MS;

    // anty-spam: min odstęp pomiędzy bumpami niezależnie od kart/refreshy
    const cooldownOver = (t - (state.lastBumpAt || 0)) > COOLDOWN_MS;

    // Podbijamy tylko jeśli: (wrócił po przerwie) i (minął cooldown)
    if (!(inactiveLong && cooldownOver) && reason !== 'force') {
      state.lastActiveAt = t;
      save(state);
      render();
      return;
    }

    // policz i zapisz nową wartość dla każdej „bazy”
    document.querySelectorAll('.js-ai-count').forEach(el => {
      const base = parseInt(el.dataset.base || '87', 10);

      // miękki tygodniowy limit: np. data-max-weekly="+60" albo "140"
      const maxWeeklyAttr = (el.dataset.maxWeekly || '+60').trim();
      const weeklyCap = maxWeeklyAttr.startsWith('+')
        ? base + parseInt(maxWeeklyAttr.slice(1),10)
        : parseInt(maxWeeklyAttr,10); // bez plusa = wartość bezwzględna

      const current = state.baseSeen[base] ?? base;
      let next = current + rand(BUMP_MIN, BUMP_MAX);

      if (Number.isFinite(weeklyCap)) next = Math.min(next, weeklyCap);
      next = Math.max(next, base);

      state.baseSeen[base] = next;
    });

    state.lastBumpAt = t;
    state.lastActiveAt = t;
    save(state);
    render();
  };

  // ——— RENDER ———
  const render = () => {
    els.forEach(el => {
      const base = parseInt(el.dataset.base || '87', 10);
      const value = state.baseSeen[base] ?? base;
      el.textContent = value.toLocaleString('pl-PL');
    });
  };

  // inicjalny render i decyzja o bumpie (load = traktujemy jak „powrót”)
  render();
  maybeBump('load');

  // Page Visibility: jeśli user wróci do karty po dłuższej przerwie → bump
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      maybeBump('visible');
    } else {
      state.lastActiveAt = now();
      save(state);
    }
  });

  // jako backup (np. iOS/Safari): gdy strona znów się „pokazuje”
  window.addEventListener('pageshow', () => { maybeBump('pageshow'); });

  // DEV: ?forceBump=1 jednorazowo wymusza podbicie
  if (new URL(location.href).searchParams.get('forceBump') === '1') {
    maybeBump('force');
  }
})();
