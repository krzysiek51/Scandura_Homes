// js/callback-modal.js
(() => {
  'use strict';

  // --- GLOBAL GUARD: nie pozwól uruchomić się drugi raz ---
  if (window.__SCANDURA_CALLBACK_MODAL__) return;
  window.__SCANDURA_CALLBACK_MODAL__ = true;

  // Usuń ew. duplikaty modal-root po innych skryptach
  document.querySelectorAll('.callback-pop[data-cb="root"]').forEach((el, i) => { if (i > 0) el.remove(); });

  const TEMPLATE = `
  <div class="callback-pop__overlay" data-cb="overlay"></div>
  <div class="callback-pop__card" role="dialog" aria-modal="true" aria-labelledby="cbTitle" data-cb="card">
    <button class="callback-pop__close" aria-label="Zamknij" data-cb="close">&times;</button>
    <h3 id="cbTitle" class="callback-pop__title">Oddzwonimy do Ciebie</h3>
    <p class="callback-pop__lead">Zostaw numer telefonu – skontaktujemy się maksymalnie w 1 dniu roboczym.</p>

    <form class="callback-pop__form" novalidate data-cb="form">
      <input type="text" name="company" autocomplete="off" class="callback-pop__hp" tabindex="-1" aria-hidden="true">
      <label class="callback-pop__label" for="cbPhone">Telefon</label>
      <div class="callback-pop__field">
        <input id="cbPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel"
               placeholder="+48 600 000 000" class="callback-pop__input" required aria-required="true"/>
        <button type="submit" class="callback-pop__btn" data-cb="submit">Zadzwońcie do mnie</button>
      </div>
      <label class="callback-pop__consent">
        <input type="checkbox" id="cbConsent" required>
        <span>Wyrażam zgodę na kontakt telefoniczny w celu przedstawienia oferty. Administratorem danych jest Scandura Homes.
          <a href="/polityka-prywatnosci" target="_blank" rel="nofollow">Polityka prywatności</a>.
        </span>
      </label>
      <p class="callback-pop__hint">Obsługujemy numery PL (+48) i NO (+47). Podaj z prefiksem kraju.</p>
      <div class="callback-pop__status" data-cb="status" role="status" aria-live="polite"></div>
    </form>
    <div class="callback-pop__arrow" data-cb="arrow" aria-hidden="true"></div>
  </div>`;

  const FORMSPREE_URL = 'https://formspree.io/f/myzdrpob';
  const state = { root: null, lastFocused: null };
  const phoneOk = (v) => /^\+(48|47)\s?\d(?:[\s-]?\d){7,}$/.test((v || '').trim());

  function createRoot() {
    const exist = document.querySelector('.callback-pop[data-cb="root"]');
    if (exist) return exist;
    const root = document.createElement('div');
    root.className = 'callback-pop';
    root.setAttribute('data-cb', 'root');
    root.innerHTML = TEMPLATE;
    document.body.appendChild(root);
    return root;
  }

  // lock scroll z kompensacją paska
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
    const focusables = card.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  function showCentered() {
    const overlay = state.root.querySelector('[data-cb="overlay"]');
    const card    = state.root.querySelector('[data-cb="card"]');

    // WYCZYŚĆ WSZELKIE INLINE Z POPRZEDNICH SKRYPTÓW
    card.removeAttribute('style');            // usuwa display/top/left/--cb-origin itp.
    // przywróć wymagane startowe właściwości przez klasy
    card.classList.remove('is-open');         // start od skali .96/opacity:0 (CSS)
    overlay.classList.add('is-visible');
    requestAnimationFrame(() => card.classList.add('is-open'));
  }

  function open(trigger) {
    if (!state.root) state.root = createRoot();
    // zapobiegaj duplikatom rootów utworzonych wcześniej
    document.querySelectorAll('.callback-pop[data-cb="root"]').forEach((el, i) => { if (i > 0) el.remove(); });

    state.lastFocused = document.activeElement;
    lockScroll(true);
    state.root.classList.add('is-active');
    showCentered();

    setTimeout(() => { const input = state.root.querySelector('#cbPhone'); if (input) input.focus(); }, 60);

    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keydown', trapFocus, true);

    state.root.querySelector('[data-cb="overlay"]').addEventListener('click', close, { once: true });
    state.root.querySelector('[data-cb="close"]').addEventListener('click', close, { once: true });

    const form = state.root.querySelector('[data-cb="form"]');
    form.addEventListener('submit', onSubmit, { once: true });
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

  async function onSubmit(e) {
    e.preventDefault();
    const root    = state.root;
    const phoneEl = root.querySelector('#cbPhone');
    const consent = root.querySelector('#cbConsent');
    const hp      = root.querySelector('.callback-pop__hp');
    const status  = root.querySelector('[data-cb="status"]');
    const btn     = root.querySelector('[data-cb="submit"]');

    if (hp && hp.value) return;
    let ok = true;
    phoneEl.classList.remove('is-invalid'); status.textContent = '';

    if (!/^\+(48|47)\s?\d(?:[\s-]?\d){7,}$/.test((phoneEl.value || '').trim())) { ok = false; phoneEl.classList.add('is-invalid'); status.textContent = 'Podaj poprawny numer z prefiksem +48 lub +47.'; }
    if (!consent.checked) { ok = false; status.textContent = 'Zaznacz zgodę na kontakt.'; }
    if (!ok) return;

    const body = new URLSearchParams({
      phone: phoneEl.value.trim(), consent: 'yes', source: location.href,
      ts: new Date().toISOString(), ua: navigator.userAgent,
      _subject: 'Scandura Callback: ' + phoneEl.value.trim()
    }).toString();

    btn.disabled = true; status.textContent = 'Wysyłanie…';

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body
      });
      const txt = await res.text();
      console.log('[Formspree]', res.status, txt);
      if (!res.ok) throw new Error(txt || ('HTTP ' + res.status));
      status.textContent = 'Dziękujemy! Oddzwonimy wkrótce.';
      e.target.reset();
      setTimeout(close, 900);
    } catch (err) {
      console.error(err);
      status.textContent = 'Coś poszło nie tak. Spróbuj ponownie.';
    } finally {
      btn.disabled = false;
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-callback-link');
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
})();
