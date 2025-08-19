// /js/steps/step3-roof.js
// Krok 3 – Dach (typ dachu)

import { updatePriceAndPreview } from '../configurator.js';

export function mount(container, CFG) {
  container.innerHTML = `
    <h2>Dach</h2>
    <p>Wybierz typ dachu dopasowany do stylu i wymagań działki:</p>

    <div class="cfg-options" role="radiogroup" aria-label="Typ dachu">
      <label class="cfg-option">
        <input type="radio" name="roofType" value="plaski" 
          ${CFG.data.roofType === 'plaski' ? 'checked' : ''}/>
        <span>Płaski</span>
      </label>

      <label class="cfg-option">
        <input type="radio" name="roofType" value="dwuspadowy" 
          ${CFG.data.roofType === 'dwuspadowy' ? 'checked' : ''}/>
        <span>Dwuspadowy</span>
      </label>

      <label class="cfg-option">
        <input type="radio" name="roofType" value="czterospadowy" 
          ${CFG.data.roofType === 'czterospadowy' ? 'checked' : ''}/>
        <span>Czterospadowy</span>
      </label>
    </div>

    <p class="muted" style="margin-top:8px">
      * Płaski – nowoczesny wygląd i niższa kubatura; Dwuspadowy – ekonomiczny i popularny;
      Czterospadowy – bardziej reprezentacyjny, zwykle droższy.
    </p>
  `;

  // Obsługa wyboru
  container.querySelectorAll('input[name="roofType"]').forEach(input => {
    input.addEventListener('change', e => {
      CFG.data.roofType = e.target.value;
      updatePriceAndPreview();
    });
  });
}

export function validate(CFG) {
  if (!CFG.data.roofType) {
    alert('Wybierz typ dachu, aby kontynuować.');
    return false;
  }
  return true;
}

export function unmount(container, CFG) {
  // opcjonalny cleanup, jeśli będziesz coś podpinać dynamicznie
}

