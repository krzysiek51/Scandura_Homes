// js/callback-modal.js
(() => {
  const TEMPLATE = `
  <div class="callback-pop__overlay" data-cb="overlay"></div>
  <div class="callback-pop__card" role="dialog" aria-modal="true" aria-labelledby="cbTitle" data-cb="card">
    <button class="callback-pop__close" aria-label="Zamknij" data-cb="close">&times;</button>
    <h3 id="cbTitle" class="callback-pop__title">Oddzwonimy do Ciebie</h3>
    <p class="callback-pop__lead">Zostaw numer telefonu – skontaktujemy się maksymalnie w 1 dniu roboczym.</p>

    <form class="callback-pop__form" novalidate data-cb="form">
      <!-- honeypot -->
      <input type="text" name="company" autocomplete="off" class="callback-pop__hp" tabindex="-1" aria-hidden="true">

      <label class="callback-pop__label" for="cbPhone">Telefon</label>
      <div class="callback-pop__field">
        <input id="cbPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel"
               placeholder="+48 600 000 000" class="callback-pop__input" required aria-required="true"/>
        <button type="submit" class="callback-pop__btn" data-cb="submit">Zadzwońcie do mnie</button>
      </div>

      <label class="callback-pop__consent">
        <input type="checkbox" id="cbConsent" required>
        <span>
          Wyrażam zgody na kontakt telefoniczny w celu przedstawienia oferty. Administratorem danych jest Scandura Homes.
          <a href="/polityka-prywatnosci" target="_blank" rel="nofollow">Polityka prywatności</a>.
        </span>
      </label>

      <p class="callback-pop__hint">Obsługujemy numery PL (+48) i NO (+47). Podaj z prefiksem kraju.</p>
      <div class="callback-pop__status" data-cb="status" role="status" aria-live="polite"></div>
    </form>
    <div class="callback-pop__arrow" data-cb="arrow" aria-hidden="true"></div>
  </div>`;

  const state = {
    root: null,
    lastFocused: null,
  };

  const phoneOk = (v) => {
    // pozwól na +48 / +47, spacje, myślniki
    const s = (v || '').trim();
    return /^\+(48|47)\s?\d(?:[\s-]?\d){7,}$/.test(s);
  };

  function createRoot() {
    const root = document.createElement('div');
    root.className = 'callback-pop';
    root.setAttribute('data-cb', 'root');
    root.innerHTML = TEMPLATE;
    document.body.appendChild(root);
    return root;
  }

  function lockScroll(lock) {
    document.documentElement.classList.toggle('cb-lock', lock);
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const card = state.root.querySelector('[data-cb="card"]');
    const focusables = card.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  function positionNearTrigger(trigger) {
    const card = state.root.querySelector('[data-cb="card"]');
    const arrow = state.root.querySelector('[data-cb="arrow"]');
    const overlay = state.root.querySelector('[data-cb="overlay"]');

    overlay.classList.add('is-visible');

    const tRect = trigger.getBoundingClientRect();
    const cRect = card.getBoundingClientRect(); // before visible it's 0, force position after measuring
    // pokaż kartę niewidzialnie by poznać jej wymiary
    card.style.visibility = 'hidden';
    card.style.display = 'block';
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;

    // preferuj nad przyciskiem, inaczej pod; wycentruj horyzontalnie względem triggera
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = tRect.top - ch - margin;
    let placeAbove = true;
    if (top < 16) {
      top = tRect.bottom + margin;
      placeAbove = false;
    }
    let left = tRect.left + (tRect.width / 2) - (cw / 2);
    left = Math.max(16, Math.min(left, vw - cw - 16));

    card.style.top = `${Math.round(top)}px`;
    card.style.left = `${Math.round(left)}px`;
    card.dataset.placement = placeAbove ? 'top' : 'bottom';

    // strzałka – ustaw środek na środek przycisku (z ograniczeniami)
    const arrowCenter = Math.max(20, Math.min((tRect.left + tRect.width / 2) - left, cw - 20));
    arrow.style.left = `${Math.round(arrowCenter)}px`;

    // animacja z punktu kliknięcia (transform-origin)
    const originX = `${Math.round(arrowCenter)}px`;
    const originY = placeAbove ? '100%' : '0%';
    card.style.setProperty('--cb-origin-x', originX);
    card.style.setProperty('--cb-origin-y', originY);

    // pokaż kartę z animacją
    card.style.visibility = '';
    requestAnimationFrame(() => {
      card.classList.add('is-open');
    });
  }

  function open(trigger) {
    if (!state.root) state.root = createRoot();
    state.lastFocused = document.activeElement;

    lockScroll(true);
    state.root.classList.add('is-active');
    positionNearTrigger(trigger);

    // Focus
    const input = state.root.querySelector('#cbPhone');
    setTimeout(() => input && input.focus(), 60);

    // Listeners
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keydown', trapFocus, true);

    // overlay / close
    state.root.querySelector('[data-cb="overlay"]').addEventListener('click', close, { once: true });
    state.root.querySelector('[data-cb="close"]').addEventListener('click', close, { once: true });

    // submit
    const form = state.root.querySelector('[data-cb="form"]');
    form.addEventListener('submit', onSubmit);
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
      // zwrot focusu
      if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
        state.lastFocused.focus();
      }
    }, 180);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const root = state.root;
    const phoneEl = root.querySelector('#cbPhone');
    const consentEl = root.querySelector('#cbConsent');
    const hp = root.querySelector('.callback-pop__hp');
    const status = root.querySelector('[data-cb="status"]');
    const btn = root.querySelector('[data-cb="submit"]');

    // anty-spam
    if (hp && hp.value) return;

    // walidacja
    let ok = true;
    phoneEl.classList.remove('is-invalid');
    status.textContent = '';

    if (!phoneOk(phoneEl.value)) {
      ok = false;
      phoneEl.classList.add('is-invalid');
      status.textContent = 'Podaj poprawny numer z prefiksem +48 lub +47.';
    }
    if (!consentEl.checked) {
      ok = false;
      status.textContent = 'Zaznacz zgodę na kontakt.';
    }
    if (!ok) return;

    // wysyłka — PODMIEŃ na swój endpoint (Formspree/Webhook/Apps Script)
    // Poniżej: symulacja powodzenia po 700 ms.
    btn.disabled = true;
    status.textContent = 'Wysyłanie…';
    try {
      await new Promise(r => setTimeout(r, 700));
      // TODO: fetch('TWÓJ_ENDPOINT', { method: 'POST', body: new FormData(e.target) })
      status.textContent = 'Dziękujemy! Oddzwonimy wkrótce.';
      btn.disabled = false;
      e.target.reset();
      setTimeout(close, 800);
    } catch (err) {
      status.textContent = 'Coś poszło nie tak. Spróbuj ponownie.';
      btn.disabled = false;
    }
  }

  // podpinamy wszystkie przyciski
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-callback-link');
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
})();
