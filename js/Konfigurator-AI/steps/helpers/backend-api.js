// backend-api.js

/**
 * Wysyła dane do backendu i zwraca odpowiedź z obrazem i ceną
 * @param {object} config
 * @returns {Promise<{ imageUrl: string, costEstimate: number }>}
 */
export async function generateVisualizationAndPrice(config) {
  const response = await fetch('http://localhost:4000/api/generate-visualization', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.details || 'Błąd po stronie serwera');
  }

  return await response.json(); // { imageUrl, costEstimate }
}
