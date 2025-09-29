// js/callback.js
(() => {
  'use strict';

  /* ===== 1x INIT GUARD ===== */
  if (window.__SCANDURA_CALLBACK_MODAL__) return;
  window.__SCANDURA_CALLBACK_MODAL__ = true;

  /* ===== KONFIG ===== */
  const FORMSPREE_URL = 'https://formspree.io/f/myzdrpob';

  /* ===== TEMPLATE (centrowany flexem w CSS) ===== */
  const TEMPLATE = `
    <div class="callback-pop__overlay" data-cb="overlay"></div>
    <div class="callback-pop__card" role="dialog" aria-modal="true" aria-labelledby="cbTitle" data-cb="card">
      <button class="callback-pop__close" aria-label="Zamknij" data-cb="close">&times;</button>
      <h3 id="cbTitle" class="callback-pop__title">Oddzwonimy do Ciebie</h3>
      <p class="callback-pop__lead">Zostaw numer telefonu – skontaktujemy się maksymalnie w 1 dniu roboczym.</p>

      <form class="callback-pop__form" novalidate autocomplete="off" data-cb="form">
        <!-- honeypot (anty-spam) -->
        <input type="text" name="website_url_2" class="callback-pop__hp" tabindex="-1"
               aria-hidden="true" autocomplete="off" data-lpignore="true">

        <!-- Imię / Nazwisko -->
        <div class="callback-pop__row callback-pop__row--2">
          <div class="callback-pop__cell">
            <label class="callback-pop__label" for="cbFirst">Imię</label>
            <input id="cbFirst" name="first_name" type="text" autocomplete="given-name"
                   class="callback-pop__input" required>
          </div>
          <div class="callback-pop__cell">
            <label class="callback-pop__label" for="cbLast">Nazwisko</label>
            <input id="cbLast" name="last_name" type="text" autocomplete="family-name"
                   class="callback-pop__input" required>
          </div>
        </div>

        <!-- Telefon + przycisk -->
        <label class="callback-pop__label" for="cbPhone">Telefon</label>
        <div class="callback-pop__field">
          <input id="cbPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel"
                 placeholder="+48 600 000 000" class="callback-pop__input" required aria-required="true"/>
          <button type="submit" class="callback-pop__btn" data-cb="submit">Zadzwońcie do mnie</button>
        </div>

        <label class="callback-pop__consent">
          <input type="checkbox" id="cbConsent" required>
          <span>
            Wyrażam zgodę na kontakt telefoniczny w celu przedstawienia oferty. Administratorem danych jest Scandura Homes.
            <a href="/polityka-prywatnosci" target="_blank" rel="nofollow">Polityka prywatności</a>.
          </span>
        </label>

        <p class="callback-pop__hint">Obsługujemy numery PL (+48) i NO (+47). Podaj z prefiksem kraju.</p>
        <div class="callback-pop__status" data-cb="status" role="status" aria-live="polite"></div>
      </form>

      <!-- Widok sukcesu (ukryty do czasu wysyłki) -->
      <div class="callback-pop__success" data-cb="success" hidden>
        <h3 class="callback-pop__title">Dziękujemy!</h3>
        <p class="callback-pop__lead">
          Zgłoszenie zostało wysłane poprawnie. Zadzwonimy wkrótce.
        </p>
        <button type="button" class="callback-pop__btn" data-cb="ok">OK</button>
      </div>

      <div class="callback-pop__arrow" data-cb="arrow" aria-hidden="true"></div>
    </div>`;

  /* ===== STAN ===== */
  const state = { root: null, lastFocused: null };
  const phoneOk = (v) => /^\+(48|47)\s?\d(?:[\s-]?\d){7,}$/.test((v || '').trim());
  const nameOk  = (v) => (v || '').trim().length >= 2;

  /* ===== UTYLsy ===== */
  document.querySelectorAll('.callback-pop[data-cb="root"]').forEach((el, i) => { if (i > 0) el.remove(); });

  function createRoot() {
    let root = document.querySelector('.callback-pop[data-cb="root"]');
    if (!root) {
      root = document.createElement('div');
      root.className = 'callback-pop';
      root.setAttribute('data-cb', 'root');
      root.innerHTML = TEMPLATE;
      document.body.appendChild(root);
    }
    return root;
  }

  // blokada scrolla + kompensacja szerokości paska
  function lockScroll(lock) {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (lock) document.documentElement.style.setProperty('--sbw', sbw + 'px');
    else document.documentElement.style.removeProperty('--sbw');
    document.documentElement.classList.toggle('cb-lock', lock);
    document.body.classList.toggle('cb-lock', lock);
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const card = state.root.querySelector('[data-cb="card"]');
    const focusables = card.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  function showCentered() {
    const overlay = state.root.querySelector('[data-cb="overlay"]');
    const card    = state.root.querySelector('[data-cb="card"]');
    const form    = state.root.querySelector('[data-cb="form"]');
    const success = state.root.querySelector('[data-cb="success"]');

    // reset widoków
    form.hidden = false;
    success.hidden = true;

    // wyczyść ewentualne inline z innych skryptów
    card.removeAttribute('style');
    card.classList.remove('is-open');

    overlay.classList.add('is-visible');
    requestAnimationFrame(() => card.classList.add('is-open'));
  }

  /* ===== OPEN / CLOSE ===== */
  function open() {
    if (!state.root) state.root = createRoot();
    document.querySelectorAll('.callback-pop[data-cb="root"]').forEach((el, i) => { if (i > 0) el.remove(); });

    state.lastFocused = document.activeElement;
    lockScroll(true);
    state.root.classList.add('is-active');
    showCentered();

    setTimeout(() => {
      const input = state.root.querySelector('#cbFirst') || state.root.querySelector('#cbPhone');
      if (input) input.focus();
    }, 60);

    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keydown', trapFocus, true);

    state.root.querySelector('[data-cb="overlay"]').addEventListener('click', close, { once: true });
    state.root.querySelector('[data-cb="close"]').addEventListener('click', close, { once: true });

    const form = state.root.querySelector('[data-cb="form"]');
    form.addEventListener('submit', onSubmit, { once: true });

    state.root.querySelector('[data-cb="ok"]').addEventListener('click', close, { once: true });
  }

  function close() {
    if (!state.root) return;
    const card = state.root.querySelector('[data-cb="card"]');
    const overlay = state.root.querySelector('[data-cb="overlay"]');
    card.classList.remove('is-open');
    overlay.classList.remove('is-visible');

    setTimeout(() => {
      state.root.classList.remove('is-active');
      lockScroll(false);
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('keydown', trapFocus, true);
      if (state.lastFocused && typeof state.lastFocused.focus === 'function') state.lastFocused.focus();
    }, 180);
  }

  function onKeydown(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }

  /* ===== WYSYŁKA ===== */
  async function onSubmit(e) {
    e.preventDefault();
    const root    = state.root;
    const form    = root.querySelector('[data-cb="form"]');
    const firstEl = root.querySelector('#cbFirst');
    const lastEl  = root.querySelector('#cbLast');
    const phoneEl = root.querySelector('#cbPhone');
    const consent = root.querySelector('#cbConsent');
    const hp      = root.querySelector('.callback-pop__hp');
    const status  = root.querySelector('[data-cb="status"]');
    const btn     = root.querySelector('[data-cb="submit"]');

    // honeypot
    if (hp && hp.value) { status.textContent = 'Zabezpieczenie anty-spam zadziałało. Wyślij bez autouzupełniania.'; return; }

    // walidacja
    status.textContent = '';
    [firstEl, lastEl, phoneEl].forEach(el => el.classList.remove('is-invalid'));

    const first = (firstEl.value || '').trim();
    const last  = (lastEl.value  || '').trim();
    const phone = (phoneEl.value || '').trim();

    if (!nameOk(first)) { firstEl.classList.add('is-invalid'); status.textContent = 'Podaj imię.'; return; }
    if (!nameOk(last))  { lastEl.classList.add('is-invalid');  status.textContent = 'Podaj nazwisko.'; return; }
    if (!phoneOk(phone)) { phoneEl.classList.add('is-invalid'); status.textContent = 'Podaj numer z prefiksem +48 lub +47.'; return; }
    if (!consent.checked) { status.textContent = 'Zaznacz zgodę na kontakt.'; return; }

    // FormData zgodnie z Formspree + subject
    const fd = new FormData(form);
    fd.set('first_name', first);
    fd.set('last_name',  last);
    fd.set('name', `${first} ${last}`);
    fd.set('phone', phone);
    fd.set('subject', `Scandura Callback: ${phone} — ${first} ${last}`);
    fd.append('source', location.href);
    fd.append('ts', new Date().toISOString());
    fd.append('ua', navigator.userAgent);

    btn.disabled = true;
    status.textContent = 'Wysyłanie…';

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd
      });

      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      console.log('[Formspree]', res.status, data);

      if (!res.ok) {
        const msg =
          (data && data.errors && data.errors[0] && data.errors[0].message) ||
          (typeof data === 'string' ? data : '') ||
          ('HTTP ' + res.status);
        throw new Error(msg);
      }

      // SUKCES: pokaż jasne potwierdzenie
      form.hidden = true;
      const success = root.querySelector('[data-cb="success"]');
      success.hidden = false;
      success.setAttribute('tabindex', '-1');
      success.focus();
      status.textContent = '';

    } catch (err) {
      console.error(err);
      status.textContent = 'Nie udało się wysłać. Sprawdź połączenie i spróbuj ponownie.';
    } finally {
      btn.disabled = false;
    }
  }

  /* ===== PODPIĘCIE DO CTA (twarde) ===== */
  const triggerSelector = '.js-callback-link, [data-callback="open"], a[href="#callbackSection"]';

  // pointerdown wyprzedza click (w razie gdyby inny skrypt zjadał klik)
  function onTrigger(e) {
    const trigger = e.target.closest(triggerSelector);
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    open();
  }

  document.addEventListener('pointerdown', onTrigger, { capture: true });
  document.addEventListener('click',       onTrigger, { capture: true });
})();
