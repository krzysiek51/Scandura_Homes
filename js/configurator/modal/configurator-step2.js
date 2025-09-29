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

    // konfiguracja przycisków
    BTN_PREV.hidden = false;
    BTN_NEXT.hidden = false;
    BTN_NEXT.textContent = 'Dalej';
    BTN_NEXT.type = 'button';           // ważne: nie submit
    BTN_NEXT.onclick = null;            // wyczyść stare handlery
    BTN_SKIP.hidden = true;
    BTN_SKIP.classList.remove('cfg-btn--primary');

    setTitle('Jaką powierzchnię użytkową budynku planujesz?');
    setProgress(pct(2, state.totalSteps));

    // widok
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

    // blokada submitu formularza (Enter w polu itp.)
    BODY.querySelector('form.cfg-step')?.addEventListener('submit', (e) => {
      e.preventDefault();
      onNext(state);
    });

    // ===== BEGIN AREA HOOKS (MINIMAL) ===================================

    function __cfg_setAreaExact(st, v) {
      const m = Math.round(Number(String(v).replace(',', '.')));
      if (!Number.isFinite(m) || m < 15 || m > 600) return false;
      st.area = { type:'exact', exact:m, m2:m };
      st.areaExact = m;
      delete st.areaChoice;
      document.dispatchEvent(new CustomEvent('cfg:change', { detail: st }));
      return true;
    }

    function __cfg_setAreaPreset(st, label) {
      const raw  = String(label || '').trim(); // np. "do-35" lub "101-150"
      const norm = raw.replace(/\s+/g,'').replace(/[–—−]/g,'-').toLowerCase();
      const bandKey = (norm === 'do-35') ? '0-35' : norm;
      st.area = { type:'preset', value: raw }; // do odtworzenia UI
      st.areaChoice = bandKey;                 // dla silnika
      delete st.areaExact;
      document.dispatchEvent(new CustomEvent('cfg:change', { detail: st }));
      return true;
    }

    const fieldset  = BODY.querySelector('.cfg-list');
    const exactBox  = BODY.querySelector('.cfg-exact__box');
    const exactRadio= BODY.querySelector('input[name="area"][value="exact"]');

    // 1) zmiana radia -> zapis
    fieldset.addEventListener('change', (e) => {
      const inp = e.target;
      if (!inp || inp.name !== 'area') return;
      if (inp.value === 'exact') {
        exactBox?.focus();
        if (exactBox?.value) __cfg_setAreaExact(state, exactBox.value);
      } else {
        __cfg_setAreaPreset(state, inp.value);
      }
    });

    // 2) klik w label/kafel -> zaznacz radio i wyemituj change
    fieldset.addEventListener('click', (e) => {
      const lab = e.target.closest('label.cfg-opt');
      if (!lab) return;
      const inp = lab.querySelector('input[name="area"]');
      if (!inp) return;
      if (!inp.checked) inp.checked = true;
      inp.dispatchEvent(new Event('change', { bubbles:true }));
    });

    // 3) exact: auto-zaznacz radio + live zapis
    if (exactBox) {
      const prev = (state.area?.exact ?? state.area?.m2 ?? state.areaExact);
      if (prev) exactBox.value = prev;
      const sync = () => __cfg_setAreaExact(state, exactBox.value);
      exactBox.addEventListener('input',  () => { if (!exactRadio.checked){ exactRadio.checked = true; } sync(); });
      exactBox.addEventListener('change', sync);
    }

    // ===== END AREA HOOKS ===============================================

    restoreSelection(state);

    // UX: czyszczenie błędów + focus
    BODY.addEventListener('change', (e) => {
      if (!e.target.matches('input[name="area"]')) return;
      BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      if (e.target.value === 'exact') BODY.querySelector('.cfg-exact__box')?.focus();
    });

    // nawigacja
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
    try {
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
        // zapis exact do stanu
        const ok = (function(v){ const m = Math.round(Number(String(v).replace(',', '.')));
          if (!Number.isFinite(m) || m < 15 || m > 600) return false;
          state.area = { type:'exact', exact:m, m2:m };
          state.areaExact = m; delete state.areaChoice;
          document.dispatchEvent(new CustomEvent('cfg:change', { detail: state }));
          return true;
        })(val);
        if (!ok) return;
      } else {
        // zapis preset do stanu
        (function(label){
          const raw  = String(label || '').trim();
          const norm = raw.replace(/\s+/g,'').replace(/[–—−]/g,'-').toLowerCase();
          state.area = { type:'preset', value: raw };
          state.areaChoice = (norm === 'do-35') ? '0-35' : norm;
          delete state.areaExact;
          document.dispatchEvent(new CustomEvent('cfg:change', { detail: state }));
        })(checked.value);
      }

      if (typeof window.renderStep3 === 'function') {
        window.renderStep3(state);
      } else {
        console.warn('[CFG] renderStep3 undefined – dołącz js/configurator/modal/configurator-step3.js');
      }
    } catch (err) {
      console.error('[Step2 onNext error]', err);
      showErr(BODY, 'Wystąpił błąd — spróbuj ponownie.');
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

    // preset/pasmo
    const band = state.area.value || state.areaChoice;
    if (band) {
      BODY.querySelector(`input[name="area"][value="${band}"]`)?.setAttribute('checked','checked');
    }

    // exact/liczba
    const m = (state.area?.exact ?? state.area?.m2 ?? state.areaExact);
    if (Number.isFinite(m)) {
      BODY.querySelector(`input[name="area"][value="exact"]`)?.setAttribute('checked','checked');
      const box = BODY.querySelector('.cfg-exact__box');
      if (box) box.value = m;
    }
  }
})();
