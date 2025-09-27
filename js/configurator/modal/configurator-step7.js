// js/configurator/modal/configurator-step7.js
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP7__) return;
  window.__SCANDURA_CFG_STEP7__ = true;

  // --- unikamy kolizji nazw:
  const CFG7_norm = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // zdejmij diakrytyki
      .replace(/-/g, ' ')
      .trim();

  const CFG7_escape = (s = '') =>
    s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const MODAL    = document.getElementById('cfg-modal');
  const BODY     = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT = MODAL.querySelector('[data-cfg="next"]');
  const BTN_SKIP = MODAL.querySelector('[data-cfg="skip"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i, total) => Math.round((i / (total || 8)) * 100);

  // spodziewana baza offline (np. tylko Pomorskie): window.CFG_CITIES_PL_POM = ["Gdańsk","Gdynia",...]
  const DATA = Array.isArray(window.CFG_CITIES_PL_POM) ? window.CFG_CITIES_PL_POM : [];

  window.renderStep7 = (state) => {
    state.step = 7;
    state.location ||= { city: '', country: 'Polska' };

    setTitle('W jakiej miejscowości chcesz zrealizować usługę?');
    setProgress(pct(7, state.totalSteps));

    // wymagany krok (bez Pomiń)
    BTN_PREV.hidden = false;
    BTN_NEXT.hidden = false;
    BTN_NEXT.textContent = 'Dalej';
    BTN_SKIP.hidden = true;
    BTN_SKIP.classList.remove('cfg-btn--primary');

    BODY.innerHTML = `
      <form class="cfg-step" data-step="7" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Podaj lokalizację</legend>

          <div class="cfg-field">
            <label class="cfg-opt__label" for="cfg-city">Podaj swoją miejscowość <span class="cfg-opt__sub">(wymagane)</span></label>
            <div class="cfg-row" style="display:flex; gap:8px; align-items:center; position:relative;">
              <input id="cfg-city" class="cfg-input" type="text" inputmode="text" autocomplete="address-level2"
                     placeholder="np. Gdańsk" value="${CFG7_escape(state.location.city)}"
                     style="flex:1; max-width:none;">
              <select id="cfg-country" class="cfg-input" style="width:auto;">
                ${optCountry('Polska', state.location.country)}
                ${optCountry('Niemcy', state.location.country)}
                ${optCountry('Czechy', state.location.country)}
                ${optCountry('Słowacja', state.location.country)}
                ${optCountry('Norwegia', state.location.country)}
              </select>

              <!-- dropdown -->
              <ul id="cfg-city-dd" class="cfg-dd" style="
                position:absolute; left:0; right:140px; top:100%; z-index:5;
                background:#fff; border:1px solid #E5E5E5; border-radius:10px; margin-top:4px; padding:6px 0;
                display:none; max-height:220px; overflow:auto;
              " role="listbox" aria-label="Podpowiedzi miast"></ul>
            </div>
            <p class="cfg-opt__sub" style="margin-top:6px;">Wpisz miasto/gminę, gdzie ma być realizacja.</p>
          </div>
        </fieldset>
      </form>
    `;

    const cityEl    = BODY.querySelector('#cfg-city');
    const countryEl = BODY.querySelector('#cfg-country');
    const dd        = BODY.querySelector('#cfg-city-dd');

    // czyszczenie błędu przy edycji
    BODY.addEventListener('input', (e) => {
      if (e.target.matches('#cfg-city')) {
        BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
      }
    });

    // Autocomplete (offline)
    cityEl.addEventListener('input', () => {
      const q = CFG7_norm(cityEl.value);
      if (!q || DATA.length === 0) { dd.style.display = 'none'; dd.innerHTML = ''; return; }

      const items = DATA
        .filter(name => CFG7_norm(name).includes(q))
        .slice(0, 12);

      if (items.length === 0) { dd.style.display = 'none'; dd.innerHTML = ''; return; }

      dd.innerHTML = items.map(n => `<li class="cfg-dd__item" role="option" style="padding:8px 12px; cursor:pointer;">${CFG7_escape(n)}</li>`).join('');
      dd.style.display = 'block';
    });

    // Klik na sugestię
    dd.addEventListener('click', (e) => {
      const li = e.target.closest('.cfg-dd__item');
      if (!li) return;
      cityEl.value = li.textContent.trim();
      dd.style.display = 'none'; dd.innerHTML = '';
      cityEl.focus();
    });

    // schowaj dropdown, gdy focus wyjdzie poza wiersz
    BODY.addEventListener('click', (e) => {
      if (!e.target.closest('.cfg-row')) { dd.style.display = 'none'; }
    });

    BTN_PREV.onclick = () => window.renderStep6?.(state);
    BTN_NEXT.onclick = () => onNext(state, cityEl, countryEl, dd);
  };

  function onNext(state, cityEl, countryEl, dd) {
    const listRoot = BODY.querySelector('.cfg-list') || BODY;
    BODY.querySelectorAll('.cfg-error').forEach(el => el.remove());
    dd.style.display = 'none';

    const city = (cityEl?.value || '').trim();
    const country = (countryEl?.value || 'Polska');

    if (city.length < 2) {
      showErr(listRoot, 'Podaj nazwę miejscowości (min. 2 znaki).');
      cityEl?.focus();
      return;
    }

    state.location = { city, country };

    if (typeof window.renderStep8 === 'function') {
      window.renderStep8(state);
      return;
    }
    // STUB Step 8
    setTitle('Krok 8 — (stub)');
    setProgress(pct(8, state.totalSteps));
    BODY.innerHTML = `
      <div>
        <p>Lokalizacja: <strong>${CFG7_escape(city)}, ${CFG7_escape(country)}</strong></p>
        <p>(Tu wejdzie Krok 8: Dane kontaktowe)</p>
      </div>
    `;
  }

  function optCountry(name, current) {
    const sel = current === name ? ' selected' : '';
    return `<option${sel}>${name}</option>`;
  }

  function showErr(container, msg) {
    const p = document.createElement('p');
    p.className = 'cfg-error';
    p.textContent = msg;
    container.appendChild(p);
  }
})();
