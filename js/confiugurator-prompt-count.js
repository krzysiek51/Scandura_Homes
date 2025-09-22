// ai-count.js — lokalny, bez-IP „rosnący” licznik per użytkownik
(() => {
  const els = document.querySelectorAll('.js-ai-count');
  if (!els.length) return;

  const STORAGE_KEY = 'aiCountState:v1';

  const getISOWeek = (d = new Date()) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() || 7);
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
  };

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // wczytaj/zainicjuj stan
  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      week: getISOWeek(),
      visitsThisWeek: 0,
      bumpThisVisit: 0,
      baseSeen: {}, // mapowanie base->aktualna_wartość
    };
  };

  const saveState = (s) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  };

  let state = loadState();
  const thisWeek = getISOWeek();

  // reset na nowy tydzień
  if (state.week !== thisWeek) {
    state = { week: thisWeek, visitsThisWeek: 0, bumpThisVisit: 0, baseSeen: {} };
  }

  // jeden „wizytowy” bump na sesję wejścia (debounce odświeżeń)
  const SESSION_FLAG = 'aiCountSessionFlag';
  const isFreshVisit = !sessionStorage.getItem(SESSION_FLAG);
  if (isFreshVisit) {
    sessionStorage.setItem(SESSION_FLAG, '1');
    state.visitsThisWeek += 1;
    state.bumpThisVisit = rand(1, 3); // możesz zmienić dynamikę, np. 1–2
  }

  els.forEach(el => {
    const base = parseInt(el.dataset.base || '87', 10);

    // maksymalny przyrost tygodniowy względem base (np. "+60")
    const maxWeeklyAttr = (el.dataset.maxWeekly || '+60').trim();
    const maxWeekly =
      maxWeeklyAttr.startsWith('+')
        ? base + parseInt(maxWeeklyAttr.slice(1),10)
        : parseInt(maxWeeklyAttr,10);

    // aktualna wartość dla tej „bazy”
    const current = state.baseSeen[base] ?? base;

    // policz nową wartość: poprzednia + bump z tej wizyty
    let next = current + (isFreshVisit ? state.bumpThisVisit : 0);

    // miękki limit (nie przekraczaj base + max przyrost tygodniowy)
    if (Number.isFinite(maxWeekly)) next = Math.min(next, maxWeekly);

    // anty-skok: nigdy nie schodź poniżej base
    next = Math.max(next, base);

    // zapisz
    state.baseSeen[base] = next;
    el.textContent = next.toLocaleString('pl-PL');
  });

  saveState(state);
})();
