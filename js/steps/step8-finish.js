// js/steps/step8-finish.js
// Krok 8 – Zakończenie konfiguracji (potwierdzenie)
import { CFG } from '../config.js';

function mountStep8(container, cfg = CFG) {
  const c = (cfg?.data?.contact) || { firstName:'', lastName:'', email:'', phone:'', city:'' };

  container.innerHTML = `
    <h2 class="cfg-step__title">Dziękujemy za skorzystanie z konfiguratora!</h2>
    <p class="cfg-step__subtitle">
      Twoja konfiguracja została zapisana. Nasi doradcy przygotują dokładną ofertę
      i skontaktują się z Tobą mailowo oraz telefonicznie.
    </p>

    <div class="thankyou-box">
      <p><strong>Podane dane:</strong></p>
      <ul>
        <li>${c.firstName || ''} ${c.lastName || ''}</li>
        <li>E-mail: ${c.email || ''}</li>
        <li>Telefon: ${c.phone || ''}</li>
        <li>Lokalizacja: ${c.city || ''}</li>
      </ul>
    </div>

    <p class="cfg-note" style="margin-top:10px">
      Oferta zostanie wysłana w ciągu 1–2 dni roboczych na wskazany adres e‑mail.
    </p>

    <button id="cfg-finish-btn" class="btn" style="margin-top:15px">
      Zakończ
    </button>
  `;

  const closeBtn = container.querySelector('#cfg-finish-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('cfg-modal');
      if (modal) {
        modal.classList.add('is-hidden');
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = '';
      }
    });
  }
}

function validateStep8() {
  // To już ekran końcowy – nic nie walidujemy.
  return true;
}

function unmountStep8(container) {
  container.innerHTML = '';
}

/* Eksporty wymagane przez configurator.js */
export const mount = mountStep8;
export const validate = validateStep8;
export const unmount = unmountStep8;
