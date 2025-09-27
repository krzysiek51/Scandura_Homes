// js/configurator/modal/configurator-step2.js
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP2__) return;
  window.__SCANDURA_CFG_STEP2__ = true;

  const MODAL    = document.getElementById('cfg-modal');
  const BODY     = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT = MODAL.querySelector('[data-cfg="next"]');
  const BTN_SKIP = MODAL.querySelector('[data-cfg="skip"]');

  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i, total) => Math.round((i / total) * 100);

  // Publiczny renderer kroku 2
  window.renderStep2 = (state) => {
    state.step = 2;

    BTN_PREV.hidden = false;
    BTN_NEXT.hidden = false;
    BTN_NEXT.textContent = 'Dalej';
    BTN_SKIP.hidden = true;
    BTN_SKIP.classList.remove('cfg-btn--primary');


    setTitle('Jaką powierzchnię użytkową budynku planujesz?');
    setProgress(pct(2, state.totalSteps));
    BTN_PREV.hidden = false;
    BODY.innerHTML = `
      <form class="cfg-step" data-step="2" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Wybierz powierzchnię</legend>

          <!-- Dokładnie m² -->
          <label class="cfg-opt cfg-opt--exact">
            <input type="radio" name="area" value="exact" class="cfg-dot">
            <div class="cfg-exact">
              <div class="cfg-exact__row">
                <div class="cfg-opt__label">Dokładnie m²:</div>
                <input type="number" class="cfg-input cfg-exact__box"
                       placeholder="np. 120" min="15" max="600" step="1" inputmode="numeric">
              </div>
              <div class="cfg-opt__sub">Podaj liczbę w granicach 15–600 m²</div>
            </div>
          </label>

          ${opt('do-35',   'Do 35 m²')}
          ${opt('36-70',   '36 – 70 m²')}
          ${opt('71-100',  '71 – 100 m²')}
          ${opt('101-150', '101 – 150 m²')}
          ${opt('151-200', '151 – 200 m²')}
          ${opt('201-250', '201 – 250 m²')}
        </fieldset>
      </form>
    `;
// po BODY.innerHTML = `...` i (np.) przed restoreSelection(state);
const exactRadio = BODY.querySelector('input[name="area"][value="exact"]');
const exactBox   = BODY.querySelector('.cfg-exact__box');

// każde wejście w pole (klik/focus/input) aktywuje radio "exact"
['focus', 'click', 'input'].forEach(ev => {
  exactBox?.addEventListener(ev, () => {
    if (!exactRadio.checked) {
      exactRadio.checked = true;
      exactRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
});

// (opcjonalnie) klik w cały wiersz z "Dokładnie" też zaznacza radio
BODY.querySelector('.cfg-opt--exact')?.addEventListener('click', (e) => {
  // jeśli klik był w input liczbowy, powyższe już zadziała – po prostu zaznacz radio
  if (!exactRadio.checked) {
    exactRadio.checked = true;
    exactRadio.dispatchEvent(new Event('change', { bubbles: true }));
  }
});

    // przywróć wcześniejszy wybór
    restoreSelection(state);

    // UX: czyszczenie błędów + focus w input po wyborze „Dokładnie”
    BODY.addEventListener('change', (e) => {
      if (!e.target.matches('input[name="area"]')) return;
      BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      if (e.target.value === 'exact') BODY.querySelector('.cfg-exact__box')?.focus();
    });

    BTN_PREV.onclick = () => window.renderStep1(state);
    BTN_NEXT.onclick = () => onNext(state);
  };

  function opt(value, label) {
    return `
      <label class="cfg-opt">
        <input type="radio" name="area" value="${value}" class="cfg-dot">
        <div><div class="cfg-opt__label">${label}</div></div>
      </label>`;
  }
function onNext(state) {
  const listRoot = BODY.querySelector('.cfg-list') || BODY;
  BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());

  const checked = BODY.querySelector('input[name="area"]:checked');
  if (!checked) return showErr(listRoot, 'Wybierz odpowiedź');

  if (checked.value === 'exact') {
    const box = BODY.querySelector('.cfg-exact__box');
    const val = parseInt((box?.value || '').trim(), 10);
    if (!Number.isFinite(val) || val < 15 || val > 600) {
      box?.focus();
      return showErr(listRoot, 'Podaj wartość 15–600 m²');
    }
    state.area = { type: 'exact', m2: val };
  } else {
    state.area = { type: 'preset', value: checked.value };
  }

  // ✅ przejście do Kroku 3
  if (typeof window.renderStep3 === 'function') {
    window.renderStep3(state);
  } else {
    console.warn('[CFG] Brak renderStep3 – dołącz js/configurator/modal/configurator-step3.js');
  }
}


  function showErr(container, msg) {
    const p = document.createElement('p');
    p.className = 'cfg-error';
    p.textContent = msg;
    container.appendChild(p);
  }

  function restoreSelection(state) {
    if (!state.area) return;
    if (state.area.type === 'preset') {
      BODY.querySelector(`input[name="area"][value="${state.area.value}"]`)?.setAttribute('checked','checked');
    } else if (state.area.type === 'exact') {
      BODY.querySelector(`input[name="area"][value="exact"]`)?.setAttribute('checked','checked');
      const box = BODY.querySelector('.cfg-exact__box');
      if (box) box.value = state.area.m2;
    }
  }
})();
