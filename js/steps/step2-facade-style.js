// js/steps/step2-facade-style.js
import { CFG } from '../config.js';

export function mountStep2(container) {
  if (!CFG.data.facade) CFG.data.facade = 'drewno';

  const options = [
    { value: 'drewno', label: 'Drewno (szalówka skandynawska)' },
    { value: 'tynk',   label: 'Tynk (mineralny / silikonowy)' },
    { value: 'mix',    label: 'Mix (drewno + tynk)' }
  ];

  container.innerHTML = `
    <h2 class="cfg-step__title">Elewacja</h2>
    <p class="cfg-step__subtitle">Wybierz styl i materiał elewacji.</p>
    <div class="cfg-options-grid">
      ${options.map(opt => `
        <label class="cfg-radio-card ${CFG.data.facade===opt.value ? 'selected' : ''}">
          <input type="radio" name="facade" value="${opt.value}" ${CFG.data.facade===opt.value ? 'checked' : ''}/>
          <span>${opt.label}</span>
        </label>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('input[name=facade]').forEach(el => {
    el.addEventListener('change', (e) => {
      CFG.data.facade = e.target.value;
      container.querySelectorAll('.cfg-radio-card').forEach(card =>
        card.classList.toggle('selected', card.querySelector('input').checked)
      );
    });
  });
}

export function validateStep2() {
  return Boolean(CFG.data.facade);
}

export function unmountStep2(container) { container.innerHTML = ''; }

export const mount = mountStep2;
export const validate = validateStep2;
export const unmount = unmountStep2;
