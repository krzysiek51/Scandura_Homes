// js/config.js

// Minimalny stan konfiguratora – eksportowany i współdzielony w krokach
export const CFG = {
  step: 0,
  stepsCount: 8,
  data: {
    style: null,       // np. nowoczesny / klasyczny
    area: null,        // powierzchnia w m²
    variant: null,     // wariant stylu
    floors: null,      // liczba kondygnacji
    roof: null,        // dach
    facade: null,      // elewacja
    garage: null,      // garaż
    extras: {},        // dodatki
    contact: {}        // dane kontaktowe
  }
};

