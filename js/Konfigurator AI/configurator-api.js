// public/js/configurator/configurator-api.js

/**
 * Wysyła dane użytkownika do backendu w celu wygenerowania wizualizacji i wyceny.
 * @param {Object} selections - Wybrane dane użytkownika (styl, dach, powierzchnia itd.)
 * @returns {Promise<{ imageUrl: string, costEstimate: number }>} - URL obrazka i koszt.
 */
export async function sendToAI(selections) {
  try {
    const response = await fetch('http://localhost:4000/api/generate-visualization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(selections)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Błąd komunikacji z serwerem.');
    }

    const data = await response.json();
    return {
      imageUrl: data.imageUrl,
      costEstimate: data.costEstimate
    };
  } catch (err) {
    console.error('❌ Błąd wysyłania danych do AI:', err);
    throw err;
  }
}
