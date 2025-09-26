// js/configurator/modal/configurator-step3.js
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP3__) return;
  window.__SCANDURA_CFG_STEP3__ = true;

  const MODAL    = document.getElementById('cfg-modal');
  const BODY     = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT = MODAL.querySelector('[data-cfg="next"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i, total) => Math.round((i / total) * 100);

  // Publiczny renderer Kroku 3
  window.renderStep3 = (state) => {
    state.step = 3;

    setTitle('Jaki rodzaj dachu planujesz?');
    setProgress(pct(3, state.totalSteps));
    BTN_PREV.hidden = false;

    BODY.innerHTML = `
      <form class="cfg-step" data-step="3" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Wybierz rodzaj dachu</legend>

          ${opt('dwuspadowy',        'Dach dwuspadowy')}
          ${opt('czterospadowy',     'Dach czterospadowy (kopertowy)')}
          ${opt('plaski',            'Dach płaski')}
          ${opt('wielospadowy',      'Dach wielospadowy')}
          ${opt('mansardowy',        'Dach mansardowy')}

          <label class="cfg-opt cfg-opt--other">
            <input type="radio" name="roof" value="inny" class="cfg-dot">
            <div>
              <div class="cfg-opt__label">Inny</div>
              <div class="cfg-other">
                <input type="text" class="cfg-input cfg-roof-other"
                       placeholder="Wpisz rodzaj dachu…" minlength="2" maxlength="50">
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
      if (!e.target.matches('input[name="roof"]')) return;
      BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      if (e.target.value === 'inny') BODY.querySelector('.cfg-roof-other')?.focus();
    });

    // klik/focus w polu „Inny” -> zaznacz radio
    const otherRadio = BODY.querySelector('input[name="roof"][value="inny"]');
    const otherBox   = BODY.querySelector('.cfg-roof-other');
    ['focus','click','input'].forEach(ev => {
      otherBox?.addEventListener(ev, () => {
        if (!otherRadio?.checked) {
          otherRadio.checked = true;
          otherRadio.dispatchEvent(new Event('change', { bubbles:true }));
        }
      });
    });
    // klik w cały wiersz też aktywuje
    BODY.querySelector('.cfg-opt--other')?.addEventListener('click', () => {
      if (!otherRadio?.checked) {
        otherRadio.checked = true;
        otherRadio.dispatchEvent(new Event('change', { bubbles:true }));
      }
    });

    // nawigacja
    BTN_PREV.onclick = () => window.renderStep2?.(state);
    BTN_NEXT.onclick = () => onNext(state);
  };

  function opt(value, label) {
    return `
      <label class="cfg-opt">
        <input type="radio" name="roof" value="${value}" class="cfg-dot">
        <div><div class="cfg-opt__label">${label}</div></div>
      </label>`;
  }

  function onNext(state) {
    const listRoot = BODY.querySelector('.cfg-list') || BODY;
    BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());

    const checked = BODY.querySelector('input[name="roof"]:checked');
    if (!checked) return showErr(listRoot, 'Wybierz odpowiedź');

    if (checked.value === 'inny') {
      const note = (BODY.querySelector('.cfg-roof-other')?.value || '').trim();
      if (note.length < 2) {
        BODY.querySelector('.cfg-roof-other')?.focus();
        return showErr(listRoot, 'Uzupełnij własną odpowiedź (min. 2 znaki)');
      }
      state.roof = { type: 'custom', note };
    } else {
      state.roof = { type: 'preset', value: checked.value };
    }

    // → przejście do Kroku 4 (jeśli już istnieje), w przeciwnym razie stub
    if (typeof window.renderStep4 === 'function') {
      window.renderStep4(state);
      return;
    }
    setTitle('Krok 4 — (stub)');
    setProgress(pct(4, state.totalSteps));
    BODY.innerHTML = `
      <div>
        <p>Wybrany dach: <strong>${
          state.roof.type === 'preset' ? state.roof.value : state.roof.note
        }</strong></p>
        <p>(Tu wejdzie Krok 4)</p>
      </div>
    `;
    BTN_NEXT.onclick = null;
  }

  function restoreSelection(state) {
    if (!state.roof) return;
    if (state.roof.type === 'preset') {
      BODY.querySelector(`input[name="roof"][value="${state.roof.value}"]`)
          ?.setAttribute('checked','checked');
    } else if (state.roof.type === 'custom') {
      BODY.querySelector(`input[name="roof"][value="inny"]`)
          ?.setAttribute('checked','checked');
      const box = BODY.querySelector('.cfg-roof-other');
      if (box) box.value = state.roof.note || '';
    }
  }

  function showErr(container, msg) {
    const p = document.createElement('p');
    p.className = 'cfg-error';
    p.textContent = msg;
    container.appendChild(p);
  }
})();
