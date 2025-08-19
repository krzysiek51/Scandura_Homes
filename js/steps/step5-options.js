// /js/steps/step5-options.js
// Krok 5 – Opcje dodatkowe (instalacje, taras, garaż)

import { updatePriceAndPreview } from '../configurator.js';

export function mount(container, CFG) {
  container.innerHTML = `
    <h2>Opcje dodatkowe</h2>
    <p>Zaznacz opcje, które chcesz uwzględnić w wycenie:</p>

    <div class="cfg-options cfg-options--checkboxes">
      <label class="cfg-option">
        <input type="checkbox" name="extraElectric" ${CFG.data.extraElectric ? 'checked' : ''}/>
        <span>Instalacja elektryczna</span>
      </label>

      <label class="cfg-option">
        <input type="checkbox" name="extraHydraulic" ${CFG.data.extraHydraulic ? 'checked' : ''}/>
        <span>Instalacja hydrauliczna</span>
      </label>

      <label class="cfg-option">
        <input type="checkbox" name="extraHeating" ${CFG.data.extraHeating ? 'checked' : ''}/>
        <span>Ogrzewanie (np. podłogowe, pompa ciepła)</span>
      </label>

      <label class="cfg-option">
        <input type="checkbox" name="extraTerrace" ${CFG.data.extraTerrace ? 'checked' : ''}/>
        <span>Taras</span>
      </label>

      <label class="cfg-option">
        <input type="checkbox" name="extraGarage" ${CFG.data.extraGarage ? 'checked' : ''}/>
        <span>Garaż</span>
      </label>
    </div>

    <p class="muted" style="margin-top:8px">
      * Instalacje są wyceniane osobno – pełną ofertę otrzymasz na maila.  
      Taras i garaż wpływają bezpośrednio na koszt robocizny.
    </p>
  `;

  // Obsługa checkboxów
  container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => {
      CFG.data[chk.name] = chk.checked;
      updatePriceAndPreview();
    });
  });
}

export function validate(CFG) {
  // wszystkie opcje są opcjonalne → zawsze zwracamy true
  return true;
}

export function unmount(container, CFG) {
  // cleanup opcjonalny
}
