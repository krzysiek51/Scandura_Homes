// /js/steps/step7-contact.js
// Krok 7 – Formularz kontaktowy (imię, nazwisko, email, tel, lokalizacja)

export function mount(container, CFG) {
  const c = CFG.data.contact || (CFG.data.contact = {
    firstName: '', lastName: '', email: '', phone: '', city: ''
  });

  container.innerHTML = `
    <h2>Dane kontaktowe</h2>
    <p>Uzupełnij proszę dane, abyśmy mogli wysłać Ci ofertę.</p>

    <form class="grid" id="cfg-contact" novalidate>
      <label>
        Imię
        <input name="firstName" autocomplete="given-name" required value="${escapeHtml(c.firstName)}" />
      </label>

      <label>
        Nazwisko
        <input name="lastName" autocomplete="family-name" required value="${escapeHtml(c.lastName)}" />
      </label>

      <label>
        E-mail
        <input name="email" type="email" autocomplete="email" required value="${escapeHtml(c.email)}" />
      </label>

      <label>
        Telefon
        <input name="phone" inputmode="tel" autocomplete="tel" required value="${escapeHtml(c.phone)}" />
      </label>

      <label class="full">
        Miejscowość budowy (woj. pomorskie)
        <input name="city" required placeholder="np. Gdańsk, Gdynia, Sopot" value="${escapeHtml(c.city)}" />
      </label>
    </form>

    <p class="muted">Obsługujemy obecnie woj. pomorskie (Trójmiasto i okolice). Jeśli inwestycja jest w innym regionie, skontaktujemy się w celu potwierdzenia możliwości.</p>
  `;

  // live zapis do CFG
  const form = container.querySelector('#cfg-contact');
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name) return;
    CFG.data.contact[t.name] = t.value.trim();
  });
}

// prosta walidacja
export function validate(CFG) {
  const { firstName, lastName, email, phone, city } = CFG.data.contact || {};
  if (!firstName || !lastName || !email || !phone || !city) {
    alert('Uzupełnij wszystkie pola kontaktowe.');
    return false;
  }
  if (!isValidEmail(email)) {
    alert('Podaj poprawny adres e-mail.');
    return false;
  }
  if (!isValidPhone(phone)) {
    alert('Podaj poprawny numer telefonu (min. 7 cyfr).');
    return false;
  }
  return true;
}

export function unmount(container, CFG) {
  // opcjonalnie: cleanup
}

// helpers
function isValidEmail(v) {
  // bardzo prosta walidacja e-mail
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isValidPhone(v) {
  // minimalna walidacja: co najmniej 7 cyfr
  const digits = (v || '').replace(/\D+/g, '');
  return digits.length >= 7;
}
function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
