(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;

  // ---- globalny stan (rozszerzymy przy kolejnych krokach)
  const state = { step: 1, building: null };

  // ---- cache
  const MODAL = document.getElementById('cfg-modal');
  const BODY  = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT = MODAL.querySelector('[data-cfg="next"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  // ===== Step 1: Typ budynku =====
  function renderStep1() {
    state.step = 1;
    setTitle('Jaki budynek chcesz wybudować?');
    setProgress(12);                // ~1/8
    BTN_PREV.hidden = true;         // bez "Wstecz" na kroku 1

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
                <input type="text" class="cfg-input" placeholder="Wpisz własną odpowiedź…" minlength="2" maxlength="100">
              </div>
            </div>
          </label>
        </fieldset>
      </form>
    `;

    // przywróć wybór, jeśli był
    restoreStep1();

    // czyszczenie błędu i focus na "Inny"
    BODY.addEventListener('change', (e) => {
      if (!e.target.matches('input[name="building"]')) return;
      BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      if (e.target.value === 'inny') BODY.querySelector('.cfg-opt--other .cfg-input')?.focus();
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
      const note = (BODY.querySelector('.cfg-opt--other .cfg-input')?.value || '').trim();
      if (note.length < 2) {
        showErr(listRoot, 'Uzupełnij własną odpowiedź (min. 2 znaki)');
        BODY.querySelector('.cfg-opt--other .cfg-input')?.focus();
        return;
      }
      state.building = { type: 'inny', note };
    } else {
      state.building = checked.value;
    }

    // TODO: renderStep2(); — na razie stub
    setTitle('Krok 2 — (stub)');
    setProgress(25);
    BTN_PREV.hidden = false;
    BODY.innerHTML = `<p>Zapisano: <strong>${typeof state.building==='string' ? state.building : (state.building.type+': '+state.building.note)}</strong></p>
                      <p>(Tu wejdzie Krok 2: Powierzchnia m²)</p>`;
    BTN_NEXT.onclick = null;
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
      BODY.querySelector(`input[name="building"][value="inny"]`)?.click();
      const inp = BODY.querySelector('.cfg-opt--other .cfg-input');
      if (inp) inp.value = state.building.note || '';
    }
  }

  // start: po otwarciu modala
  window.addEventListener('cfg:open', renderStep1);
})();
