// js/steps/step1-foundation.js
import { CFG } from '../config.js';

export function mountStep1(container) {
  if (!CFG.data.foundation) CFG.data.foundation = 'plyta';

  const options = [
    { value: 'plyta', label: 'Płyta fundamentowa' },
    { value: 'lawy',  label: 'Ławy fundamentowe' }
  ];

  container.innerHTML = `
    <h2 class="cfg-step__title">Fundament</h2>
    <p class="cfg-step__subtitle">Wybierz preferowany rodzaj fundamentu.</p>
    <div class="cfg-options-grid">
      ${options.map(opt => `
        <label class="cfg-radio-card ${CFG.data.foundation===opt.value ? 'selected' : ''}">
          <input type="radio" name="foundation" value="${opt.value}" ${CFG.data.foundation===opt.value ? 'checked' : ''}/>
          <span>${opt.label}</span>
        </label>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('input[name=foundation]').forEach(el => {
    el.addEventListener('change', (e) => {
      CFG.data.foundation = e.target.value;
      container.querySelectorAll('.cfg-radio-card').forEach(card =>
        card.classList.toggle('selected', card.querySelector('input').checked)
      );
    });
  });
}

export function validateStep1() {
  return Boolean(CFG.data.foundation);
}

export function unmountStep1(container) { container.innerHTML = ''; }

export const mount = mountStep1;
export const validate = validateStep1;
export const unmount = unmountStep1;
