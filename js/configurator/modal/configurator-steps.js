// js/configurator/modal/configurator-steps.js
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;

  // --- GLOBALNY STAN (wspólny dla wszystkich kroków)
  const state = window.__CFG_STATE || (window.__CFG_STATE = {
    step: 1,
    totalSteps: 8,   // <- podmienimy, gdy ustalimy finalną liczbę
    building: null,  // step1
    area: null,      // step2
    roof: null,      // step3
    scope: null      // step4 zapisze wynik
  });

  // cache DOM
  const MODAL   = document.getElementById('cfg-modal');
  const BODY    = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV= MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT= MODAL.querySelector('[data-cfg="next"]');
  const BTN_SKIP = MODAL.querySelector('[data-cfg="skip"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i) => Math.round((i / state.totalSteps) * 100);

  // ===== KROK 1: TYP BUDYNKU =====
  function renderStep1() {
    state.step = 1;
    setTitle('Jaki budynek chcesz wybudować?');
    setProgress(pct(1));
    
    BTN_PREV.hidden = true;              // K1 bez Wstecz
    BTN_NEXT.hidden = false;
    BTN_NEXT.textContent = 'Dalej';
    BTN_SKIP.hidden = true;
    BTN_SKIP.classList.remove('cfg-btn--primary');


    BODY.innerHTML = `
      <form class="cfg-step" data-step="1" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Wybierz typ budynku</legend>

          ${opt('jednorodzinny','Dom jednorodzinny','Klasyczny dom dla jednej rodziny')}
          ${opt('blizniak','Dom w zabudowie bliźniaczej','Dwie części, wspólna ściana')}
          ${opt('szeregowy','Dom w zabudowie szeregowej','Segment w szeregu')}
          ${opt('letniskowy','Dom letniskowy / rekreacyjny','Sezonowy, wypoczynkowy')}
          ${opt('uslugowy','Budynek handlowo-usługowy','Mała działalność, sklep lub biuro')}
          ${opt('garaz','Garaż lub budynek gospodarczy','Niewielki obiekt użytkowy')}

          <label class="cfg-opt cfg-opt--other">
            <input type="radio" name="building" value="inny" class="cfg-dot">
            <div>
              <div class="cfg-opt__label">Inny</div>
              <div class="cfg-other">
                <input type="text" class="cfg-input cfg-building-other"
                       placeholder="Wpisz własną odpowiedź…" minlength="2" maxlength="100">
              </div>
            </div>
          </label>
        </fieldset>
      </form>
    `;

    // przywróć zapisany wybór (jeśli wrócono do K1)
    restoreStep1();

    // FIX „Inny”: pokaż pole i zaznacz radio przy klik/focus/input
    const otherRadio = BODY.querySelector('input[name="building"][value="inny"]');
    const otherBox   = BODY.querySelector('.cfg-building-other');

    // gdy klikamy/focusujemy pole — aktywuj radio i pokaż sekcję
    ['focus','click','input'].forEach(ev => {
      otherBox?.addEventListener(ev, () => {
        if (!otherRadio?.checked) {
          otherRadio.checked = true;
          otherRadio.dispatchEvent(new Event('change', { bubbles:true }));
        }
        BODY.querySelector('.cfg-opt--other')?.classList.add('is-open');
      });
    });

    // zmiana na „Inny” → otwórz pole, inne opcje → zamknij
    BODY.addEventListener('change', (e) => {
      if (!e.target.matches('input[name="building"]')) return;
      // usuń błędy
      BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      // toggle klasy widoczności
      if (e.target.value === 'inny') {
        BODY.querySelector('.cfg-opt--other')?.classList.add('is-open');
        otherBox?.focus();
      } else {
        BODY.querySelector('.cfg-opt--other')?.classList.remove('is-open');
      }
    });

    BTN_NEXT.onclick = onNextStep1;
  }

  function opt(value, label, sub) {
    return `
      <label class="cfg-opt">
        <input type="radio" name="building" value="${value}" class="cfg-dot">
        <div>
          <div class="cfg-opt__label">${label}</div>
          <div class="cfg-opt__sub">${sub}</div>
        </div>
      </label>`;
  }

  function onNextStep1() {
    const listRoot = BODY.querySelector('.cfg-list') || BODY;
    BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());

    const checked = BODY.querySelector('input[name="building"]:checked');
    if (!checked) {
      showErr(listRoot, 'Wybierz odpowiedź');
      return;
    }

    if (checked.value === 'inny') {
      const note = (BODY.querySelector('.cfg-building-other')?.value || '').trim();
      if (note.length < 2) {
        showErr(listRoot, 'Uzupełnij własną odpowiedź (min. 2 znaki)');
        BODY.querySelector('.cfg-building-other')?.focus();
        return;
      }
      state.building = { type: 'inny', note };
    } else {
      state.building = checked.value;
    }

    // → przejście do KROKU 2
    if (typeof window.renderStep2 === 'function') {
      window.renderStep2(state);
    } else {
      console.warn('[CFG] Brak renderStep2 – dołącz plik js/configurator/modal/configurator-step2.js');
    }
  }

  function showErr(container, msg) {
    const p = document.createElement('p');
    p.className = 'cfg-error';
    p.textContent = msg;
    container.appendChild(p);
  }

  function restoreStep1() {
    if (!state.building) return;
    if (typeof state.building === 'string') {
      BODY.querySelector(`input[name="building"][value="${state.building}"]`)?.click();
    } else if (state.building.type === 'inny') {
      BODY.querySelector('input[name="building"][value="inny"]')?.click();
      const inp = BODY.querySelector('.cfg-building-other');
      if (inp) {
        inp.value = state.building.note || '';
        BODY.querySelector('.cfg-opt--other')?.classList.add('is-open'); // <- ważne: pokaż pole przy powrocie
      }
    }
  }

  // start: po otwarciu modala renderujemy K1
  window.addEventListener('cfg:open', renderStep1);

  // udostępnij, aby inne kroki mogły wracać do K1
  window.renderStep1 = renderStep1;
})();
