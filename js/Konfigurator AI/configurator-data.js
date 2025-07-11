// konfigurator/configurator-data.js
// Tu przechowujemy dane konfiguracyjne i ceny

export const CONFIG_OPTIONS = {
  styles: {
    modern: {
      label: "Nowoczesny minimalizm",
      substyles: [
        { id: "a-frame", label: "A-Frame" },
        { id: "box", label: "Płaski dach Box" },
        { id: "modern-barn", label: "Nowoczesna stodoła" },
      ],
    },
    classic: {
      label: "Klasyczna elegancja",
      substyles: [
        { id: "torpet", label: "Torpet" },
        { id: "rorbu", label: "Rorbu" },
        { id: "langhus", label: "Langhus" },
      ],
    },
    manor: {
      label: "Dworek",
      substyles: [
        { id: "gustavian", label: "Gustawiański" },
        { id: "rococo", label: "Rokoko/Barokowy" },
        { id: "empire", label: "Empire" },
      ],
    },
    custom: {
      label: "Custom",
      substyles: [],
    },
  },

  roofs: [
    { id: "flat", label: "Płaski dach", modifier: -0.1 },
    { id: "gabled", label: "Dwuspadowy", modifier: 0 },
    { id: "multi", label: "Wielospadowy", modifier: 0.2 },
  ],

  elevations: [
    { id: "wood", label: "Drewniana", modifier: 0.12 },
    { id: "stucco", label: "Tynk (bazowy)", modifier: 0 },
  ],

  garages: [
    { id: "none", label: "Brak garażu", cost: 0 },
    { id: "single", label: "Garaż jednostanowiskowy", cost: 40000 },
    { id: "double", label: "Garaż dwustanowiskowy", cost: 50000 },
  ],

  floors: [1, 2],

  basePricePerM2: 4200,
};

export function calculatePrice(config) {
  let price = CONFIG_OPTIONS.basePricePerM2 * config.area;
  
  // Dach (modifier)
  const roof = CONFIG_OPTIONS.roofs.find(r => r.id === config.roof);
  if (roof) price *= 1 + roof.modifier;

  // Elewacja (modifier)
  const elevation = CONFIG_OPTIONS.elevations.find(e => e.id === config.elevation);
  if (elevation) price *= 1 + elevation.modifier;

  // Garaż (fixed)
  const garage = CONFIG_OPTIONS.garages.find(g => g.id === config.garage);
  if (garage) price += garage.cost;

  // Druga kondygnacja = więcej powierzchni
  if (config.floors > 1) {
    const additional = config.area * (config.floors - 1);
    price += additional * CONFIG_OPTIONS.basePricePerM2;
  }

  return Math.round(price);
}
