// js/Konfigurator-AI/configurator-api-client.js

/**
 * Wysyła dane konfiguracyjne do backendu w celu:
 * 1. Wygenerowania wizualizacji (obraz AI)
 * 2. Obliczenia szacunkowej ceny
 *
 * @param {object} configData - Obiekt zawierający wszystkie dane z konfiguratora.
 * @returns {Promise<object>} - Obiekt z imageUrl i costEstimate
 */
export async function sendConfigToAI(configData) {
  // zbuduj payload ze wszystkimi wymaganymi polami
  const payload = {
    style:        configData.style,
    elev:         configData.elev,
    roof:         configData.roof,
    floors:       configData.floors,
    area:         configData.area,
    garage:       configData.garage,
    basement:     configData.basement,
    rent:         configData.rent,
    availability: configData.availability,
    customPrompt: configData.customPrompt
  };

  // dla pewności zobacz payload w konsoli
  console.log('📤 Wysyłam do serwera:', payload);

  const response = await fetch('/api/generate-visualization', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });

  if (!response.ok) {
    // spróbuj odczytać szczegóły błędu
    const details = await response.json().catch(() => ({}));
    throw new Error(details.details || response.statusText || 'Nieznany błąd serwera');
  }

  return response.json();
}
