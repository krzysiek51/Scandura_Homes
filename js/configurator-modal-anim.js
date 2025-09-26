// /js/configurator-modal-anim.js
(() => {
  'use strict';

  if (window.__SCANDURA_CFG_MODAL_ANIM__) return;
  window.__SCANDURA_CFG_MODAL_ANIM__ = true;

  const MODAL_SEL = '#configuratorModal';
  const SEL = {
    backdrop : '[data-cfg="backdrop"], .configurator-modal__backdrop',
    card     : '[data-cfg="card"], .configurator-modal__card',
    close    : '[data-cfg="close"], .configurator-modal__close',
  };

  const getModal = () => document.querySelector(MODAL_SEL);
  const isOpen = (m) => m && m.getAttribute('aria-hidden') === 'false';

  const animateClose = (via = 'ui') => {
    const modal = getModal();
    if (!isOpen(modal) || modal.dataset.closing === 'true') return;

    const card = modal.querySelector(SEL.card);

    // flaga dla CSS (wyzwala animację wyjścia)
    modal.dataset.closing = 'true';

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;

      // wywołaj oryginalne API z core
      if (typeof window.closeConfiguratorModal === 'function') {
        try { window.closeConfiguratorModal({ via }); }
        catch (e) { delete modal.dataset.closing; }
      } else {
        // awaryjnie usuń flagę
        delete modal.dataset.closing;
      }
    };

    const onEnd = (e) => {
      // czekamy na zakończenie animacji karty
      if (!e || e.target === card) {
        cleanup();
        done();
      }
    };

    const cleanup = () => {
      if (card) {
        card.removeEventListener('animationend', onEnd);
        card.removeEventListener('transitionend', onEnd);
      }
    };

    if (card) {
      card.addEventListener('animationend', onEnd, { once: true });
      card.addEventListener('transitionend', onEnd, { once: true });
    }

    // twardy timeout, gdyby animacja była wyłączona (prefers-reduced-motion)
    setTimeout(done, 700);
  };

  // Przechwytuj klik w overlay i X (zamykanie z animacją)
  document.addEventListener('click', (e) => {
    const modal = getModal();
    if (!isOpen(modal)) return;

    if (e.target.closest(SEL.backdrop)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      animateClose('overlay');
      return;
    }
    if (e.target.closest(SEL.close)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      animateClose('close-btn');
      return;
    }
  }, { capture: true });

  // Esc → zamknięcie z animacją
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = getModal();
    if (!isOpen(modal)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    animateClose('esc');
  }, { capture: true });

  // Publiczny hook do użycia z dowolnego miejsca
  window.animateCloseConfiguratorModal = animateClose;
})();
