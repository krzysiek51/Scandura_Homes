// js/steps/step7-contact.js
import { CFG } from '../config.js';

/**
 * Krok 7 – Kontakt
 * - renderuje formularz
 * - trzyma wartości w CFG.data.contact
 * - walidacja live + końcowa (validateStep7)
 */

function mountStep7(container) {
  // Domyślna struktura kontaktu (zachowuje istniejące wartości)
  CFG.data.contact = {
    firstName: CFG.data.contact?.firstName || '',
    lastName:  CFG.data.contact?.lastName  || '',
    email:     CFG.data.contact?.email     || '',
    phone:     CFG.data.contact?.phone     || '',
    city:      CFG.data.contact?.city      || ''
  };

  container.innerHTML = `
    <h2 class="cfg-step__title">Twoje dane kontaktowe</h2>
    <p class="cfg-step__subtitle">
      Podaj dane, abyśmy mogli wysłać Ci ofertę i pełną wycenę.
    </p>

    <form class="cfg-grid cfg-grid--fit-2" id="contact-form" novalidate>
      ${inputField({
        name: 'firstName',
        label: 'Imię',
        value: CFG.data.contact.firstName,
        autocomplete: 'given-name',
        required: true
      })}
      ${inputField({
        name: 'lastName',
        label: 'Nazwisko',
        value: CFG.data.contact.lastName,
        autocomplete: 'family-name',
        required: true
      })}
      ${inputField({
        name: 'email',
        label: 'E‑mail',
        type: 'email',
        value: CFG.data.contact.email,
        autocomplete: 'email',
        required: true,
        placeholder: 'np. jan.kowalski@example.com'
      })}
      ${inputField({
        name: 'phone',
        label: 'Telefon',
        type: 'tel',
        value: CFG.data.contact.phone,
        autocomplete: 'tel',
        required: true,
        placeholder: '+48 600 000 000'
      })}
      ${inputField({
        name: 'city',
        label: 'Lokalizacja budowy (miasto / okolica)',
        value: CFG.data.contact.city,
        autocomplete: 'address-level2',
        required: true
      })}
    </form>

    <p class="cfg-note">
      Obsługujemy woj. pomorskie (Trójmiasto i okolice).
    </p>
  `;

  const form = container.querySelector('#contact-form');

  // Zmiany → CFG + walidacja pojedynczego pola
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    CFG.data.contact[t.name] = t.value;
    validateField(t); // live feedback (usuwa błąd, gdy ok)
  });

  // Na blur — pokaż błąd, jeśli jest
  form.addEventListener('blur', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement) validateField(t, {showErrors: true});
  }, true);
}

function validateStep7() {
  const c = CFG.data.contact || {};
  if (!c.firstName?.trim()) return false;
  if (!c.lastName?.trim())  return false;
  if (!c.city?.trim())      return false;

  // E‑mail
  const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '');
  if (!emailOK) return false;

  // Telefon – cyfry/spacje/+/-, minimum 6 znaków
  const phoneOK = /^[0-9+\-\s]{6,}$/.test(c.phone || '');
  if (!phoneOK) return false;

  return true;
}

function unmountStep7(container) {
  container.innerHTML = '';
}

/* -------------------- Helpers -------------------- */

function inputField({
  name, label, value = '', type = 'text',
  autocomplete = '', required = false, placeholder = ''
}) {
  const reqAttr = required ? 'aria-required="true"' : '';
  const ph = placeholder ? `placeholder="${placeholder}"` : '';
  const ac = autocomplete ? `autocomplete="${autocomplete}"` : '';

  return `
    <div class="cfg-field">
      <label class="cfg-field__label" for="${name}">${label}${required ? ' *' : ''}</label>
      <input
        class="cfg-input"
        id="${name}"
        name="${name}"
        type="${type}"
        value="${escapeHtml(value)}"
        ${ac}
        ${ph}
        ${reqAttr}
      />
      <div class="cfg-field__error" data-error-for="${name}" hidden></div>
    </div>
  `;
}

function validateField(input, { showErrors = false } = {}) {
  const name = input.name;
  const val  = (input.value || '').trim();
  let error = '';

  switch (name) {
    case 'firstName':
    case 'lastName':
    case 'city':
      if (!val) error = 'To pole jest wymagane.';
      break;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Podaj poprawny adres e‑mail.';
      break;
    case 'phone':
      if (!/^[0-9+\-\s]{6,}$/.test(val)) error = 'Podaj poprawny numer telefonu.';
      break;
  }

  const errorEl = input.closest('.cfg-field')?.querySelector(`[data-error-for="${name}"]`);
  const field   = input.closest('.cfg-field');

  if (error) {
    if (showErrors && errorEl) {
      errorEl.textContent = error;
      errorEl.hidden = false;
    }
    field?.classList.add('is-invalid');
    return false;
  } else {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
    field?.classList.remove('is-invalid');
    return true;
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* -------- Eksporty wymagane przez configurator.js -------- */
export const mount   = mountStep7;
export const validate = validateStep7;
export const unmount = unmountStep7;
