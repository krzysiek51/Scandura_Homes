// js/steps/step5-options.js
import { CFG } from '../config.js';

export function mountStep5(container) {
  if (!CFG.data.options) {
    CFG.data.options = { elec:false, water:false, heating:false, terrace:false, garage:false };
  }

  container.innerHTML = `
    <h2 class="cfg-step__title">Opcje dodatkowe</h2>
    <p class="cfg-step__subtitle">Zaznacz, co chcesz uwzględnić (instalacje wyceniamy osobno mailowo).</p>

    <h3 class="cfg-group-title">Instalacje</h3>
    <div class="cfg-options-grid">
      ${checkCard('elec','Instalacja elektryczna',                         CFG.data.options.elec)}
      ${checkCard('water','Instalacja wod.-kan.',                          CFG.data.options.water)}
      ${checkCard('heating','Ogrzewanie (np. podłogowe / pompa ciepła)',   CFG.data.options.heating)}
    </div>

    <h3 class="cfg-group-title">Elementy wpływające na robociznę</h3>
    <div class="cfg-options-grid">
      ${checkCard('terrace','Taras', CFG.data.options.terrace)}
      ${checkCard('garage','Garaż',  CFG.data.options.garage)}
    </div>
  `;

  container.querySelectorAll('input[type=checkbox]').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const t = e.target;
      CFG.data.options[t.name] = t.checked;
      const card = t.closest('.cfg-checkbox-card');
      if (card) card.classList.toggle('selected', t.checked);
    });
  });
}

export function validateStep5() { return true; }

export function unmountStep5(container) { container.innerHTML = ''; }

function checkCard(name, label, checked) {
  return `
    <label class="cfg-checkbox-card ${checked ? 'selected' : ''}">
      <input type="checkbox" name="${name}" ${checked ? 'checked' : ''}/>
      <span>${label}</span>
    </label>
  `;
}

export const mount = mountStep5;
export const validate = validateStep5;
export const unmount = unmountStep5;
