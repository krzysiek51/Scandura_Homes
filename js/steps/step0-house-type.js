// js/steps/step0-house-type.js
import { CFG } from '../config.js';

export function mountStep0(container) {
  if (!CFG.data.type) CFG.data.type = 'parterowy';

  const options = [
    { value: 'parterowy', label: 'Dom parterowy' },
    { value: 'poddasze',  label: 'Dom z poddaszem użytkowym' },
    { value: 'pietrowy',  label: 'Dom piętrowy' }
  ];

  container.innerHTML = `
    <h2 class="cfg-step__title">Rodzaj domu</h2>
    <p class="cfg-step__subtitle">Wybierz podstawowy typ budynku.</p>
    <div class="cfg-options-grid">
      ${options.map(opt => `
        <label class="cfg-radio-card ${CFG.data.type===opt.value ? 'selected' : ''}">
          <input type="radio" name="houseType" value="${opt.value}" ${CFG.data.type===opt.value ? 'checked' : ''}/>
          <span>${opt.label}</span>
        </label>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('input[name=houseType]').forEach(el => {
    el.addEventListener('change', (e) => {
      CFG.data.type = e.target.value;
      container.querySelectorAll('.cfg-radio-card').forEach(card =>
        card.classList.toggle('selected', card.querySelector('input').checked)
      );
    });
  });
}

export function validateStep0() {
  return Boolean(CFG.data.type);
}

export function unmountStep0(container) { container.innerHTML = ''; }

export const mount = mountStep0;
export const validate = validateStep0;
export const unmount = unmountStep0;
