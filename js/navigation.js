// Plik: js/navigation.js
// Wersja: OSTATECZNA I POPRAWIONA

(function() {
  'use strict';

  // --- 1. POBRANIE ELEMENTÓW DOM ---
  const burgerButton = document.getElementById('burger-toggle');
  const navigationPanel = document.getElementById('mobile-menu');
  const body = document.body;

  // Sprawdzenie, czy kluczowe elementy istnieją na stronie
  if (!burgerButton ||!navigationPanel) {
    console.warn('Elementy menu nawigacyjnego nie zostały znalezione. Skrypt nie zostanie uruchomiony.');
    return;
  }

  // --- 2. ZARZĄDZANIE STANEM MENU ---
  const toggleMenu = () => {
    const isMenuOpen = body.classList.contains('is-menu-active');

    // Przełączanie klasy na <body>, która kontroluje wszystkie style CSS
    body.classList.toggle('is-menu-active');

    // Aktualizacja atrybutów ARIA dla dostępności
    burgerButton.setAttribute('aria-expanded',!isMenuOpen);
    navigationPanel.setAttribute('aria-hidden', isMenuOpen);

    if (!isMenuOpen) {
      // Menu zostało otwarte
      // Ustawienie pułapki na fokus wewnątrz menu
      trapFocus(navigationPanel);
    } else {
      // Menu zostało zamknięte
      // Zwrócenie fokusu na przycisk otwierający
      burgerButton.focus();
    }
  };

  // --- 3. OBSŁUGA ZDARZEŃ ---
  burgerButton.addEventListener('click', toggleMenu);

  // Zamykanie menu klawiszem "Escape"
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('is-menu-active')) {
      toggleMenu();
    }
  });

  // --- 4. KLUCZOWE USPRAWNIENIA DOSTĘPNOŚCI (A11Y) ---

  /**
   * Funkcja "pułapki na fokus" (Focus Trap).
   * Zapobiega opuszczeniu otwartego panelu menu przez użytkowników
   * nawigujących za pomocą klawiatury (klawisz Tab).
   * @param {HTMLElement} element - Kontener, wewnątrz którego ma być uwięziony fokus.
   */
  const trapFocus = (element) => {
    const focusableElements = element.querySelectorAll(
      'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])'
    );
    // ⬇️ TUTAJ JEST POPRAWKA BŁĘDU ⬇️
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    // Natychmiastowe przeniesienie fokusu na pierwszy element w menu
    if (firstFocusableElement) {
        firstFocusableElement.focus();
    }

    element.addEventListener('keydown', function(e) {
      const isTabPressed = e.key === 'Tab';

      if (!isTabPressed) {
        return;
      }

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    });
  };

})();
