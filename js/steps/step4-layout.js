// js/steps/step4-layout.js
import { CFG } from '../config.js';

export function mountStep4(container) {
  const defaults = { area: 100, rooms: 3, baths: 2, windows: 10, doors: 2 };
  CFG.data.layout = { ...defaults, ...(CFG.data.layout || {}) };

  container.innerHTML = `
    <h2 class="cfg-step__title">Rozkład i metraż</h2>
    <p class="cfg-step__subtitle">Ustal parametry wnętrza (wpływają na wycenę robocizny).</p>

    <div class="cfg-grid cfg-grid--fit-3">
      ${numberField('area','Powierzchnia (m²)',        CFG.data.layout.area,   35, 500)}
      ${numberField('rooms','Liczba pokoi',            CFG.data.layout.rooms,  1,  12)}
      ${numberField('baths','Liczba łazienek',         CFG.data.layout.baths,  1,  8)}
      ${numberField('windows','Liczba okien',          CFG.data.layout.windows,2,  40)}
      ${numberField('doors','Drzwi zewnętrzne (szt.)', CFG.data.layout.doors,  1,  6)}
    </div>
  `;

  container.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const val = t.valueAsNumber ?? parseInt(t.value, 10) ?? 0;
    CFG.data.layout[t.name] = val;
  });
}

export function validateStep4() {
  const L = CFG.data.layout || {};
  if (!L.area   || L.area   < 35) return false;
  if (!L.rooms  || L.rooms  < 1 ) return false;
  if (!L.baths  || L.baths  < 1 ) return false;
  if (!L.windows|| L.windows< 2 ) return false;
  if (!L.doors  || L.doors  < 1 ) return false;
  return true;
}

export function unmountStep4(container) { container.innerHTML = ''; }

function numberField(name, label, value, min, max) {
  return `
    <div class="cfg-field">
      <label class="cfg-field__label" for="${name}">${label}</label>
      <input class="cfg-input" type="number" id="${name}" name="${name}"
             value="${value}" min="${min}" max="${max}" />
    </div>
  `;
}

export const mount = mountStep4;
export const validate = validateStep4;
export const unmount = unmountStep4;
