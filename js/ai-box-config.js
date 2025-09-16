// ai-box-config.js
// Regulacja timingu i bramki scrolla dla AI Box

export const AIBoxConfig = {
  // Timingi (ms)
  delayStart: 120,     // start: kiedy wchodzą 1) badge i 2) tytuł (+ ewentualnie sub na mobile)
  delayHeadStep: 90,   // odstęp między 1 i 2 (oraz 2→sub na mobile)
  delayGap: 120,       // (desktop/tablet) przerwa między "head" a ogonem
  delayBase: 240,      // bazowy delay dla pierwszego elementu ogona
  delayStep: 90,       // odstęp między elementami ogona

  // Breakpoint mobile
  breakpoints: {
    mobileMax: 743,    // <= 743 px traktujemy jako mobile
  },

  // Bramka scrolla tylko na mobile
  mobileScrollGate: {
    enabled: true,     // włącz/wyłącz logikę bramki
    offsetPx: 30,      // ile px AI box ma się odsłonić (od góry viewportu), by uznać „lekki scroll”
    delayMs: 180,      // ⬅️ NOWOŚĆ: opóźnienie PO spełnieniu bramki, zanim pokażemy ogon
    debounceMs: 50     // filtr przeciw drganiom zdarzeń scroll/touch/wheel
  },
};
