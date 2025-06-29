// prompt-generator.js

/**
 * Generuje prompt do wysyłki do DALL·E na podstawie konfiguracji użytkownika.
 * @param {object} config
 * @returns {string}
 */
export function generatePrompt(config) {
  const { style, elev, roof, floors, garage } = config;

  return `Fotorealistyczna wizualizacja domu w stylu: ${style}. Elewacja: ${elev}. Dach: ${roof}. Kondygnacje: ${floors}. Garaż: ${garage}. Otoczenie: zieleń, krajobraz skandynawski.`;
}
