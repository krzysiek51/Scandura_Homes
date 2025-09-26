// js/configurator/modal/configurator-step4.js
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP4__) return;
  window.__SCANDURA_CFG_STEP4__ = true;

  const MODAL    = document.getElementById('cfg-modal');
  const BODY     = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT = MODAL.querySelector('[data-cfg="next"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i, total) => Math.round((i / total) * 100);

  // Publiczny renderer Kroku 4
  window.renderStep4 = (state) => {
    state.step = 4;

    setTitle('Jaki zakres (stan budowy) planujesz?');
    setProgress(pct(4, state.totalSteps));
    BTN_PREV.hidden = false;

    BODY.innerHTML = `
      <form class="cfg-step" data-step="4" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Wybierz zakres prac</legend>

          ${opt('surowy-otwarty',   'Stan surowy otwarty')}
          ${opt('surowy-zamkniety', 'Stan surowy zamknięty')}
          ${opt('deweloperski',     'Stan deweloperski')}
          ${opt('pod-klucz',        'Pod klucz')}

          <label class="cfg-opt cfg-opt--other">
            <input type="radio" name="scope" value="inny" class="cfg-dot">
            <div>
              <div class="cfg-opt__label">Inny</div>
              <div class="cfg-other">
                <input type="text" class="cfg-input cfg-scope-other"
                       placeholder="Opisz zakres prac…" minlength="2" maxlength="100">
              </div>
            </div>
          </label>
        </fieldset>
      </form>
    `;

    // przywróć poprzedni wybór
    restoreSelection(state);

    // UX: czyszczenie błędów, autofocus i auto-zaznaczenie „Inny”
    BODY.addEventListener('change', (e) => {
      if (!e.target.matches('input[name="scope"]')) return;
      BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      if (e.target.value === 'inny') BODY.querySelector('.cfg-scope-other')?.focus();
      // toggle widoku pola
      BODY.querySelector('.cfg-opt--other')?.classList.toggle('is-open', e.target.value === 'inny');
    });

    // klik/focus w polu „Inny” -> zaznacz radio
    const otherRadio = BODY.querySelector('input[name="scope"][value="inny"]');
    const otherBox   = BODY.querySelector('.cfg-scope-other');
    ['focus','click','input'].forEach(ev => {
      otherBox?.addEventListener(ev, () => {
        if (!otherRadio?.checked) {
          otherRadio.checked = true;
          otherRadio.dispatchEvent(new Event('change', { bubbles:true }));
        }
        BODY.querySelector('.cfg-opt--other')?.classList.add('is-open');
      });
    });

    // nawigacja
    BTN_PREV.onclick = () => window.renderStep3?.(state);
    BTN_NEXT.onclick = () => onNext(state);
  };

  function opt(value, label) {
    return `
      <label class="cfg-opt">
        <input type="radio" name="scope" value="${value}" class="cfg-dot">
        <div><div class="cfg-opt__label">${label}</div></div>
      </label>`;
  }

  function onNext(state) {
    const listRoot = BODY.querySelector('.cfg-list') || BODY;
    BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());

    const checked = BODY.querySelector('input[name="scope"]:checked');
    if (!checked) return showErr(listRoot, 'Wybierz odpowiedź');

    if (checked.value === 'inny') {
      const note = (BODY.querySelector('.cfg-scope-other')?.value || '').trim();
      if (note.length < 2) {
        BODY.querySelector('.cfg-scope-other')?.focus();
        return showErr(listRoot, 'Uzupełnij własną odpowiedź (min. 2 znaki)');
      }
      state.scope = { type: 'custom', note };
    } else {
      state.scope = { type: 'preset', value: checked.value };
    }

    // → przejście do Kroku 5 (jeśli istnieje), w przeciwnym razie stub
    if (typeof window.renderStep5 === 'function') {
      window.renderStep5(state);
      return;
    }
    setTitle('Krok 5 — (stub)');
    setProgress(pct(5, state.totalSteps));
    BODY.innerHTML = `
      <div>
        <p>Wybrany zakres: <strong>${
          state.scope.type === 'preset' ? state.scope.value : state.scope.note
        }</strong></p>
        <p>(Tu wejdzie Krok 5)</p>
      </div>
    `;
    BTN_NEXT.onclick = null;
  }

  function restoreSelection(state) {
    if (!state.scope) return;
    if (state.scope.type === 'preset') {
      BODY.querySelector(`input[name="scope"][value="${state.scope.value}"]`)
          ?.setAttribute('checked','checked');
    } else if (state.scope.type === 'custom') {
      BODY.querySelector(`input[name="scope"][value="inny"]`)
          ?.setAttribute('checked','checked');
      const box = BODY.querySelector('.cfg-scope-other');
      if (box) {
        box.value = state.scope.note || '';
        BODY.querySelector('.cfg-opt--other')?.classList.add('is-open');
      }
    }
  }

  function showErr(container, msg) {
    const p = document.createElement('p');
    p.className = 'cfg-error';
    p.textContent = msg;
    container.appendChild(p);
  }
})();
