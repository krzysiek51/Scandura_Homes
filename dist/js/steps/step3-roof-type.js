// js/steps/step3-roof-type.js
import { CFG } from '../config.js';

export function mountStep3(container) {
  if (!CFG.data.roof) CFG.data.roof = 'dwuspadowy';

  const options = [
    { value: 'plaski',     label: 'Płaski' },
    { value: 'dwuspadowy', label: 'Dwuspadowy' },
    { value: 'czterospad', label: 'Czterospadowy' }
  ];

  container.innerHTML = `
    <h2 class="cfg-step__title">Dach</h2>
    <p class="cfg-step__subtitle">Wybierz typ dachu.</p>
    <div class="cfg-options-grid">
      ${options.map(opt => `
        <label class="cfg-radio-card ${CFG.data.roof===opt.value ? 'selected' : ''}">
          <input type="radio" name="roof" value="${opt.value}" ${CFG.data.roof===opt.value ? 'checked' : ''}/>
          <span>${opt.label}</span>
        </label>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('input[name=roof]').forEach(el => {
    el.addEventListener('change', (e) => {
      CFG.data.roof = e.target.value;
      container.querySelectorAll('.cfg-radio-card').forEach(card =>
        card.classList.toggle('selected', card.querySelector('input').checked)
      );
    });
  });
}

export function validateStep3() {
  return Boolean(CFG.data.roof);
}

export function unmountStep3(container) { container.innerHTML = ''; }

export const mount = mountStep3;
export const validate = validateStep3;
export const unmount = unmountStep3;
