// /js/configurator-modal.js
(() => {
  'use strict';

  /* ====== INIT GUARD ====== */
  if (window.__SCANDURA_CONFIGURATOR_MODAL__) return;
  window.__SCANDURA_CONFIGURATOR_MODAL__ = true;

  /* ====== KONFIG / SELECTORS ====== */
  const MODAL_ID    = 'configuratorModal';
  const TRIGGER_SEL = '[data-open-configurator], #open-configurator-button';
  const HASH        = '#configurator';

  // Hooki wewnątrz modala (opcjonalne w HTML/SCSS)
  const SEL = {
    backdrop : '[data-cfg="backdrop"]',
    card     : '[data-cfg="card"]',
    close    : '[data-cfg="close"]',
    title    : '.configurator-modal__title, [data-cfg="title"]',
    desc     : '.configurator-modal__desc, [data-cfg="desc"]',
    cta      : '[data-cfg="cta"]',
    quote    : '#calc-quote'
  };

  /* ====== STAN ====== */
  let modal, card, backdrop;
  let lastActiveEl = null;
  let openedByHashPush = false; // gdy otwieramy programowo -> ustawiamy hash
  let scrollState = { y: 0, padApplied: false, locked: false };

  /* ====== HELPERS ====== */
  const isIOS = () =>
    /iP(ad|hone|od)/.test(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

  const getScrollbarWidth = () => {
    const docW = document.documentElement.clientWidth;
    return Math.max(0, window.innerWidth - docW);
  };

  const fireAnalytics = (type, detail = {}) => {
    // CustomEvent
    window.dispatchEvent(new CustomEvent(`configurator:${type}`, { detail }));
    // dataLayer (GA/GTM)
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: `configurator_${type}`, ...detail });
    }
  };

  // Zwraca fokusowalne elementy wewnątrz node
  const getFocusable = (root) => {
    const sel = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(root.querySelectorAll(sel))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  };

  /* ====== TWORZENIE MODALA (jeśli brak) ====== */
  function ensureModal() {
    if (document.getElementById(MODAL_ID)) {
      modal    = document.getElementById(MODAL_ID);
      card     = modal.querySelector(SEL.card);
      backdrop = modal.querySelector(SEL.backdrop);
      return;
    }

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'configurator-modal';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="configurator-modal__backdrop" data-cfg="backdrop"></div>
      <div class="configurator-modal__card" data-cfg="card">
        <button class="configurator-modal__close" data-cfg="close" aria-label="Zamknij">×</button>
        <h3 class="configurator-modal__title">Konfigurator AI</h3>
        <p class="visually-hidden configurator-modal__desc" data-cfg="desc"></p>
        <div id="calc-quote"></div>
      </div>
    `;
    document.body.appendChild(modal);

    card     = modal.querySelector(SEL.card);
    backdrop = modal.querySelector(SEL.backdrop);

    // Zamknięcia
    modal.addEventListener('click', (e) => {
      if (e.target.closest(SEL.close) || e.target.closest(SEL.backdrop)) {
        closeModal({ via: 'ui' });
      }
    });

    // ESC
    document.addEventListener('keydown', (e) => {
      if (modal.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') {
        e.preventDefault();
        closeModal({ via: 'esc' });
      }
    });

    // ARIA: title/desc powiązania (możesz podmienić w HTML)
    ensureAriaLabels();
  }

  function ensureAriaLabels() {
    if (!modal) return;
    const titleEl = modal.querySelector(SEL.title);
    const descEl  = modal.querySelector(SEL.desc);

    if (titleEl) {
      if (!titleEl.id) titleEl.id = 'configuratorModalTitle';
      modal.setAttribute('aria-labelledby', titleEl.id);
    }
    if (descEl && (descEl.textContent || '').trim().length) {
      if (!descEl.id) descEl.id = 'configuratorModalDesc';
      modal.setAttribute('aria-describedby', descEl.id);
    } else {
      modal.removeAttribute('aria-describedby');
    }
  }

  /* ====== SCROLL LOCK + iOS bounce fix + kompensacja paska ====== */
  function lockScroll() {
    if (scrollState.locked) return;
    scrollState.y = window.scrollY;

    // kompensacja paska (desktop)
    const sw = getScrollbarWidth();
    if (sw > 0) {
      const currentPR = getComputedStyle(document.body).paddingRight;
      document.body.style.paddingRight = `calc(${currentPR} + ${sw}px)`;
      scrollState.padApplied = true;
    }

    if (isIOS()) {
      // iOS: fixed body bez skoku
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollState.y}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      // zapobieganie bounce wewnątrz karty (scroll tylko w card)
      if (card) card.style.webkitOverflowScrolling = 'touch';
    } else {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    scrollState.locked = true;
  }

  function unlockScroll() {
    if (!scrollState.locked) return;

    if (isIOS()) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollState.y || 0);
      if (card) card.style.webkitOverflowScrolling = '';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    if (scrollState.padApplied) {
      document.body.style.paddingRight = '';
      scrollState.padApplied = false;
    }

    scrollState.locked = false;
  }

  /* ====== FOCUS TRAP ====== */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const inside = modal && modal.getAttribute('aria-hidden') === 'false';
    if (!inside) return;

    const focusables = getFocusable(card || modal);
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    // Shift+Tab na pierwszym -> idź na koniec
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }
    // Tab na ostatnim -> idź na początek
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
      return;
    }
  }
  document.addEventListener('keydown', trapFocus, true);

  /* ====== OPEN / CLOSE ====== */
  function openModal({ via = 'ui' } = {}) {
    ensureModal();
    ensureAriaLabels();

    lastActiveEl = document.activeElement; // zapamiętaj, kto otworzył

    modal.removeAttribute('inert');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    lockScroll();

    // FOCUS: X jako pierwszy
    const closeBtn = modal.querySelector(SEL.close);
    closeBtn && closeBtn.focus();

    // Leniwy mount kalkulatora (jeśli jest dostępny na stronie)
    if (!modal.dataset.calcReady && window.CALC && window.UI_QUOTE) {
      modal.dataset.calcReady = '1';
      Promise.resolve()
        .then(() => window.CALC.init?.({ base: '/apps/kalkulator-2.0/' }))
        .then(() => window.UI_QUOTE.mount?.({ mountSelector: SEL.quote }))
        .catch(() => { /* brak kalkulatora = ignoruj */ });
    }

    // Analytika
    fireAnalytics('open', { via });

    // Jeśli otwarto nie przez hash, dopisz hash aby działał back
    if (location.hash !== HASH) {
      openedByHashPush = true;
      // użyj pushState, by nie wywołać natychmiast hashchange -> spójniejsze sterowanie
      history.pushState({ configurator: true }, '', HASH);
    } else {
      openedByHashPush = false;
    }
  }

  function closeModal({ via = 'ui' } = {}) {
    if (!modal) return;

    // wyczyść fokus z wnętrza
    if (modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    modal.setAttribute('inert', '');

    unlockScroll();

    // przywróć fokus
    if (lastActiveEl && document.contains(lastActiveEl) && typeof lastActiveEl.focus === 'function') {
      lastActiveEl.focus();
    }

    fireAnalytics('close', { via });

    // Zamykamy przez back jeżeli w URL jest hash
    if (location.hash === HASH) {
      // poprz. open mogło zrobić pushState — zrób dokładnie back
      history.back();
    }
  }

  /* ====== HASH / HISTORIA ====== */
  // Reaguj na ręczne wpisanie/usunięcie #configurator
  window.addEventListener('hashchange', () => {
    if (location.hash === HASH) {
      // hash przyszedł z zewnątrz (np. link / odświeżenie)
      if (!modal || modal.getAttribute('aria-hidden') === 'true') {
        openModal({ via: 'hash' });
      }
    } else {
      // hash zniknął — zamknij, jeśli otwarte
      if (modal && modal.getAttribute('aria-hidden') === 'false') {
        // Jeżeli hashchange to wynik naszego close->back, to UI już zamknięte.
        // Upewnij się, że stan scrolla jest przywrócony, nic więcej.
        unlockScroll();
        modal.setAttribute('aria-hidden', 'true');
        modal.hidden = true;
        modal.setAttribute('inert', '');
      }
    }
  });

  // Wejście bezpośrednio na stronę z #configurator
  document.addEventListener('DOMContentLoaded', () => {
    ensureModal();
    if (location.hash === HASH) {
      openModal({ via: 'hash' });
    }
  });

  /* ====== DELEGACJA KLIKÓW (triggery i CTA) ====== */
  document.addEventListener('click', (e) => {
    // Otwieranie
    const trg = e.target.closest(TRIGGER_SEL);
    if (trg) {
      if (trg.tagName === 'A' || trg.getAttribute('href')) e.preventDefault();
      openModal({ via: 'trigger' });
      return;
    }

    // CTA eventy
    if (modal && modal.getAttribute('aria-hidden') === 'false') {
      const cta = e.target.closest(SEL.cta);
      if (cta) {
        fireAnalytics('click-cta', {
          id: cta.id || null,
          text: (cta.textContent || '').trim().slice(0, 120)
        });
      }
    }
  }, { capture: true });

  /* ====== EKSPORT DO TESTÓW ====== */
  window.openConfiguratorModal  = () => openModal({ via: 'api' });
  window.closeConfiguratorModal = () => closeModal({ via: 'api' });
})();
