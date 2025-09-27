// KROK 6 — Termin startu
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP6__) return;
  window.__SCANDURA_CFG_STEP6__ = true;

  const MODAL    = document.getElementById('cfg-modal');
  const BODY     = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT = MODAL.querySelector('[data-cfg="next"]');
  const BTN_SKIP = MODAL.querySelector('[data-cfg="skip"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i, total) => Math.round((i / (total || 8)) * 100);

  // boundaries dla <input type="date">
  function getDateBounds() {
    const today = new Date();
    const min = today.toISOString().slice(0, 10);

    const d = new Date(today);
    d.setMonth(d.getMonth() + 18); // +18 miesięcy
    // korekta dnia miesiąca przy przeskoku (np. 31 -> 30)
    if (d.getDate() !== today.getDate()) d.setDate(0);
    const max = d.toISOString().slice(0, 10);

    return { min, max };
  }

  // render publiczny
  window.renderStep6 = (state) => {
    state.step = 6;
    // przechowujemy wybór:
    // preset: "asap" | "1m" | "3m" | "6m" | "talk"
    // lub obiekt { type:"date", value:"YYYY-MM-DD" }
    state.start ||= null;

    setTitle('Kiedy chcesz rozpocząć budowę?');
    setProgress(pct(6, state.totalSteps));

    // CTA: bez "Pomiń" w tym kroku
    BTN_PREV.hidden = false;
    BTN_NEXT.hidden = false;
    BTN_NEXT.textContent = 'Dalej';
    BTN_SKIP.hidden = true;
    BTN_SKIP.classList.remove('cfg-btn--primary');

    const { min, max } = getDateBounds();
    const dateValue = typeof state.start === 'object' && state.start?.type === 'date'
      ? state.start.value
      : '';

    BODY.innerHTML = `
      <form class="cfg-step" data-step="6" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Wybierz termin rozpoczęcia</legend>

          ${opt('asap','W najbliższym możliwym terminie')}
          ${opt('1m','W ciągu miesiąca')}
          ${opt('3m','W ciągu 3 miesięcy')}
          ${opt('6m','W ciągu 6 miesięcy')}

          <label class="cfg-opt cfg-opt--date">
            <input type="radio" name="start" value="date" class="cfg-dot">
            <div class="cfg-opt__wrap">
              <div class="cfg-opt__label">Orientacyjna data:</div>
              <div class="cfg-date-wrap">
                <input type="date" class="cfg-date"
                       min="${min}" max="${max}" value="${dateValue}" />
              </div>
            </div>
          </label>

          ${opt('talk','Do uzgodnienia w rozmowie')}
        </fieldset>
      </form>
    `;

    // odtwórz wcześniejszy wybór
    restore(state);

    // czyszczenie błędów + auto-zaznaczanie "date"
    BODY.addEventListener('change', (e) => {
      if (e.target.matches('input[name="start"]')) {
        BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      }
      if (e.target.matches('.cfg-date')) {
        const radio = BODY.querySelector('input[name="start"][value="date"]');
        if (radio) radio.checked = true;
        BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      }
    });
    BODY.addEventListener('focusin', (e) => {
      if (e.target.matches('.cfg-date')) {
        const radio = BODY.querySelector('input[name="start"][value="date"]');
        if (radio) radio.checked = true;
      }
    });

    BTN_PREV.onclick = () => window.renderStep5?.(state);
    BTN_NEXT.onclick = () => onNext(state, { min, max });
  };

  function opt(value, label) {
    return `
      <label class="cfg-opt">
        <input type="radio" name="start" value="${value}" class="cfg-dot">
        <div class="cfg-opt__label">${label}</div>
      </label>`;
  }

  function onNext(state, bounds) {
    const listRoot = BODY.querySelector('.cfg-list') || BODY;
    BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());

    const checked = BODY.querySelector('input[name="start"]:checked');
    if (!checked) {
      showErr(listRoot, 'Wybierz odpowiedź');
      return;
    }

    if (checked.value === 'date') {
      const input = BODY.querySelector('.cfg-date');
      const val = (input?.value || '').trim();
      if (!val) {
        showErr(listRoot, 'Wybierz datę');
        input?.focus();
        return;
      }
      // (HTML min/max broni zakresu — tu tylko zapis)
      state.start = { type: 'date', value: val };
    } else {
      state.start = checked.value; // asap | 1m | 3m | 6m | talk
    }

    // dalej
    if (typeof window.renderStep7 === 'function') {
      window.renderStep7(state);
      return;
    }
    // STUB, dopóki nie ma Krok 7 (Lokalizacja)
    setTitle('Krok 7 — (stub)');
    setProgress( pct(7, state.totalSteps) );
    const text =
      typeof state.start === 'object'
        ? `data: ${state.start.value}`
        : checkedLabelText(checked);
    BODY.innerHTML = `
      <div>
        <p>Termin startu: <strong>${text}</strong></p>
        <p>(Tu wejdzie Krok 7: Lokalizacja)</p>
      </div>
    `;
  }

  function showErr(container, msg) {
    const p = document.createElement('p');
    p.className = 'cfg-error';
    p.textContent = msg;
    container.appendChild(p);
  }

  function restore(state) {
    if (!state.start) return;
    if (typeof state.start === 'string') {
      BODY.querySelector(`input[name="start"][value="${state.start}"]`)?.click();
    } else if (state.start.type === 'date') {
      BODY.querySelector(`input[name="start"][value="date"]`)?.click();
      const inp = BODY.querySelector('.cfg-date');
      if (inp) inp.value = state.start.value || '';
    }
  }

  function checkedLabelText(radio) {
    const label = radio.closest('.cfg-opt')?.querySelector('.cfg-opt__label')?.textContent?.trim();
    return label || radio.value;
  }
})();
