// configurator.js

document.addEventListener('DOMContentLoaded', () => {
  console.log('Konfigurator INIT: DOM załadowany…');

  // --- ELEMENTY DOM ---
  const btnOpen    = document.getElementById('open-configurator-button');
  const modal      = document.getElementById('configurator-modal');
  const overlay    = document.getElementById('configurator-overlay');
  const btnClose   = document.getElementById('close-configurator-button');

  // kroki
  const steps = {
    style:   document.getElementById('step-style-selection'),
    area:    document.getElementById('step-area'),
    floors:  document.getElementById('step-floors'),
    roof:    document.getElementById('step-roof-elevation'),
    addons:  document.getElementById('step-addons'),
    summary: document.getElementById('step-summary'),
  };

  // przyciski nawigacji
  const nav = {
    toArea:    document.getElementById('area-continue-button'),
    toFloors:  document.getElementById('floors-continue-button'),
    toRoof:    document.getElementById('roof-elev-continue-button'),
    toAddons:  document.getElementById('addons-continue-button'),
    toSummary: document.getElementById('generate-visualization'), // tu może być inny id
    backStyle: document.getElementById('back-to-style-button'),
    backArea:  document.getElementById('back-to-area-button'),
    backFloors:document.getElementById('back-to-floors-button'),
    backRoof:  document.getElementById('back-to-roof-button'),
  };

  // pola formularza
  let user = {
    style:        null,
    area:         null,
    floors:       null,
    roof:         null,
    elev:         null,
    garage:       null,
    basement:     null,
    rental:       null,
    accessibility:null,
  };

  // helper: pokazuje tylko zadany krok
  function showStep(stepKey) {
    Object.values(steps).forEach(el => el && (el.style.display = 'none'));
    steps[stepKey].style.display = 'block';
  }

  // otwórz / zamknij
  function openModal() {
    showStep('style');
    modal.removeAttribute('hidden');
    setTimeout(() => modal.classList.add('is-open'), 10);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    setTimeout(() => modal.setAttribute('hidden', true), 300);
  }

  // --- KROK 1: STYL ---
  document.querySelectorAll('.style-carousel__select-button')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        user.style = btn.dataset.style;
        // reset dalszych kroków
        user.area = user.floors = user.roof = user.elev = null;
        nav.toArea.disabled = true;
        showStep('area');
      });
    });

  // --- KROK 2: POWIERZCHNIA ---
  const slider = document.getElementById('area-slider');
  const inputN = document.getElementById('area-input');
  function syncArea(val) {
    user.area = +val;
    nav.toFloors.disabled = user.area <= 50;
    // aktualizacja placeholderu
    document.getElementById('step-floors-title').textContent =
      `Dobrze, dom ${user.area} m².`;
  }
  slider.addEventListener('input', e => {
    inputN.value = e.target.value;
    syncArea(e.target.value);
  });
  inputN.addEventListener('input', e => {
    const v = e.target.value;
    slider.value = v;
    syncArea(v);
  });
  nav.toArea.addEventListener('click', () => showStep('floors'));

  // back
  nav.backStyle.addEventListener('click', () => showStep('style'));

  // --- KROK 3: KONDYGNACJE ---
  document.querySelectorAll('.floor-options__button')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        // odznacz wszystkich, zaznacz tylko tego
        document.querySelectorAll('.floor-options__button')
          .forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        user.floors = btn.dataset.floors;
        nav.toRoof.disabled = !user.floors;
      });
    });
  nav.toFloors.addEventListener('click', () => showStep('roof'));
  nav.backArea.addEventListener('click', () => showStep('area'));

  // --- KROK 4: DACH + ELEWACJA ---
  // dach
  document.querySelectorAll('.roof-options .floor-options__button')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.roof-options .floor-options__button')
          .forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        user.roof = btn.dataset.roof;
        nav.toAddons.disabled = !(user.roof && user.elev);
      });
    });
  // elewacja
  document.querySelectorAll('.elev-options .floor-options__button')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.elev-options .floor-options__button')
          .forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        user.elev = btn.dataset.elev;
        nav.toAddons.disabled = !(user.roof && user.elev);
      });
    });

  nav.toRoof.addEventListener('click', () => showStep('addons'));
  nav.backFloors.addEventListener('click', () => showStep('floors'));

  // --- KROK 5: DODATKI ---
  function initSingleGroup(selector, key) {
    document.querySelectorAll(selector)
      .forEach(btn => {
        btn.addEventListener('click', () => {
          // odznacz tylko w tej grupie
          document.querySelectorAll(selector)
            .forEach(x => x.classList.remove('is-active'));
          btn.classList.add('is-active');
          user[key] = btn.dataset[key];
          // włącz przycisk tylko gdy wszystkie cztery są wybrane
          nav.toSummary.disabled = !( user.garage && user.basement 
                                     && user.rental && user.accessibility );
        });
      });
  }
  initSingleGroup('.addon-garage__button',       'garage');
  initSingleGroup('.addon-basement__button',     'basement');
  initSingleGroup('.addon-rental__button',       'rental');
  initSingleGroup('.addon-accessibility__button','accessibility');

  nav.toAddons.addEventListener('click', () => showStep('summary'));
  nav.backRoof.addEventListener('click', () => showStep('roof'));

  // --- KROK 6: PODSUMOWANIE i AI ---
  // uzupełnij podsumowanie
  function updateSummary() {
    document.getElementById('sum-style').textContent = user.style;
    document.getElementById('sum-area').textContent  = user.area;
    document.getElementById('sum-floors').textContent= user.floors;
    document.getElementById('sum-roof').textContent  = user.roof;
    document.getElementById('sum-elev').textContent  = user.elev;
    // dodatki:
    document.getElementById('sum-garage')?.textContent       = user.garage;
    document.getElementById('sum-basement')?.textContent     = user.basement;
    document.getElementById('sum-rental')?.textContent       = user.rental;
    document.getElementById('sum-accessibility')?.textContent= user.accessibility;
  }

  nav.toSummary.addEventListener('click', () => {
    updateSummary();
    showStep('summary');
  });

  // tutaj generacja AI (wizualizacja + koszt)
  nav.toSummary /* czyli generate-visualization */.addEventListener('click', async () => {
    const btn = nav.toSummary;
    const out = document.getElementById('ai-result');
    btn.disabled = true;
    btn.textContent = 'Generuję…';
    out.innerHTML = '';

    try {
      const resp = await fetch('/api/generate-visualization', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(user)
      });
      const { imageUrl, costEstimate } = await resp.json();
      out.innerHTML = `<img src="${imageUrl}" alt="Wizualizacja"><p>Szacunkowy koszt: ${costEstimate} PLN</p>`;
    } catch (e) {
      out.textContent = 'Błąd przy generowaniu wizualizacji.';
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generuj wizualizację i kosztorys';
    }
  });

  // podpinamy open/close
  btnOpen  .addEventListener('click', openModal);
  btnClose .addEventListener('click', closeModal);
  overlay  .addEventListener('click', closeModal);

  console.log('Konfigurator gotowy.');
});
