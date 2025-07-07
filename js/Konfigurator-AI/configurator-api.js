// public/js/configurator/configurator-api.js

/**
 * Wysyła dane użytkownika do backendu w celu wygenerowania wizualizacji i wyceny.
 * @param {Object} selections - Wybrane dane użytkownika (style, roof, area itd.)
 * @returns {Promise<{ imageUrl: string, costEstimate: number }>}
 */
export async function sendToAI(selections) {
  // 1) Zbuduj payload zgodny z oczekiwaniami serwera:
  const payload = {
    style:        selections.style,
    area:         selections.area,
    floors:       selections.floors,
    roof:         selections.roof,
    // backend oczekuje pola 'elev', nie 'elevation'
    elev:         selections.elevation ?? selections.elev,
    garage:       selections.garage,
    basement:     selections.basement,
    rent:         selections.rent,
    availability: selections.availability,
    customPrompt: selections.customPrompt
  };

  // 2) (Opcjonalnie) podejrzyj, co wysyłasz:
  console.log('📤 Wysyłam do AI payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('http://localhost:4000/api/generate-visualization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Spróbuj odczytać treść błędu z serwera
      let details = 'Błąd komunikacji z serwerem.';
      try {
        const errBody = await response.json();
        details = errBody.details || JSON.stringify(errBody);
      } catch { /* jeśli nie JSON, pomiń */ }

      throw new Error(details);
    }

    const data = await response.json();
    return {
      imageUrl:    data.imageUrl,
      costEstimate: data.costEstimate
    };

  } catch (err) {
    console.error('❌ Błąd wysyłania danych do AI:', err.message);
    throw err;
  }
}

/**
 * Generuje obraz dla stylu custom
 * @param {string} prompt - Prompt użytkownika
 * @returns {Promise<string>}
 */
export async function generateCustomImage(prompt) {
  try {
    const response = await fetch('http://localhost:4000/api/generate-custom-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.details || 'Błąd generowania obrazu');
    }

    const { imageUrl } = await response.json();
    return imageUrl;

  } catch (err) {
    console.error('❌ Błąd generowania custom obrazu:', err.message);
    throw err;
  }
}
