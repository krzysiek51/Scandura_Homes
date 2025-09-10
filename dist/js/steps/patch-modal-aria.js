// js/patch-modal-aria.js
// Naprawa ostrzeżenia: "Blocked aria-hidden ... descendant retained focus".
// Działa obok istniejącego kodu – pilnuje porządku z aria-hidden i fokusem.

(function () {
  const modal = document.getElementById('cfg-modal');
  if (!modal) return;

  const panel = modal.querySelector('.cfg__panel');
  let lastFocus = null;

  // Pomocnicze: modal uważać za widoczny tylko gdy NIE ma .is-hidden i nie jest ukryty stylem
  const isVisible = () =>
    !modal.classList.contains('is-hidden') &&
    getComputedStyle(modal).visibility !== 'hidden';

  // Synchronizacja a11y przy każdej zmianie atrybutów
  const sync = () => {
    if (isVisible()) {
      // Modal otwarty: aria-hidden musi być false, fokus do środka
      modal.setAttribute('aria-hidden', 'false');
      if (!lastFocus) lastFocus = document.activeElement;
      if (panel) {
        panel.setAttribute('tabindex', '-1');
        if (document.activeElement && !panel.contains(document.activeElement)) {
          panel.focus();
        }
      }
    } else {
      // Modal zamknięty: najpierw przywróć fokus, potem aria-hidden=true
      if (lastFocus && document.contains(lastFocus)) {
        try { lastFocus.focus(); } catch (_) {}
      } else {
        try { document.body.focus(); } catch (_) {}
      }
      lastFocus = null;
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  // Obserwuj zmiany klas/stylu/aria-hidden na modalu (otwieranie/zamykanie)
  const mo = new MutationObserver(sync);
  mo.observe(modal, { attributes: true, attributeFilter: ['class', 'style', 'aria-hidden'] });

  // Klik w krzyżyk – domknij w poprawnej kolejności (observer zrobi resztę)
  modal.addEventListener('click', (e) => {
    if (e.target.closest('.cfg__close')) {
      // zapamiętaj, co miało fokus (jeśli patch nie zdążył)
      if (!lastFocus) lastFocus = document.activeElement;
      modal.classList.add('is-hidden');
      modal.style.visibility = 'hidden';
      // aria-hidden przełączy observer po utracie widoczności
    }
  });

  // Gdy modal właśnie otwieracie (np. przez Wasz kod) – ustaw poprawnie aria i fokus
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('.cfg__open, [data-cfg-open], .js-open-configurator');
    if (!opener) return;
    // Po jednym tyknięciu klasę .is-hidden zdejmie Wasz kod – my tylko zapamiętamy fokus
    lastFocus = opener;
    // minimalne opóźnienie, by wejść PO usunięciu .is-hidden
    setTimeout(() => { if (isVisible()) sync(); }, 0);
  }, true);

  // Pierwsza synchronizacja (na wypadek stanu początkowego)
  sync();
})();
