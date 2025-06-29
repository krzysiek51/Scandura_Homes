// public/js/Konfigurator AI/configurator-api-client.js

/**
 * Wysyła dane konfiguracyjne do backendu w celu:
 * 1. Wygenerowania wizualizacji (obraz AI)
 * 2. Obliczenia szacunkowej ceny
 * 
 * @param {object} configData - Obiekt zawierający wszystkie dane z konfiguratora.
 * @returns {Promise<object>} - Obiekt z imageUrl i costEstimate
 */
export async function sendConfigToAI(configData) {
  try {
    const response = await fetch('http://localhost:4000/api/generate-visualization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(errorDetails.details || 'Nieznany błąd serwera');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Błąd komunikacji z serwerem AI:', error);
    throw error;
  }
}
