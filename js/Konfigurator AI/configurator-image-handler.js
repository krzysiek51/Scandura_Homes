// public/js/Konfigurator AI/configurator-image-handler.js

/**
 * Odpowiada za wyświetlenie obrazu AI i szacunku kosztów w podsumowaniu.
 * @param {string} imageUrl - URL do obrazka wygenerowanego przez DALL·E
 * @param {number} costEstimate - Szacunkowa cena domu
 */
export function displayAIResult(imageUrl, costEstimate) {
  const container = document.getElementById('ai-visualization-container');
  const summaryBox = document.getElementById('ai-summary-box');

  if (!container || !summaryBox) {
    console.error('❌ Nie znaleziono kontenerów podsumowania lub wizualizacji.');
    return;
  }

  // Wyczyść poprzednią zawartość
  container.innerHTML = '';
  summaryBox.innerHTML = '';

  // Stwórz i osadź obraz
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Wygenerowany dom';
  img.loading = 'lazy';
  img.style.width = '100%';
  img.style.borderRadius = '1rem';
  container.appendChild(img);

  // Pokaż szacunkową cenę
  const priceBox = document.createElement('div');
  priceBox.className = 'ai-cost-box';
  priceBox.innerHTML = `
    <p class="ai-cost-heading">Szacunkowa cena budowy:</p>
    <p class="ai-cost-value">${costEstimate.toLocaleString('pl-PL')} NOK</p>
  `;
  summaryBox.appendChild(priceBox);
} 

/**
 * Pokazuje loader w kontenerze wizualizacji AI
 */
export function showLoader() {
  const container = document.getElementById('ai-visualization-container');
  if (!container) return;
  container.innerHTML = '<div class="ai-loader">⏳ Generowanie wizualizacji...</div>';
} 

/**
 * Ukrywa loader
 */
export function hideLoader() {
  const container = document.getElementById('ai-visualization-container');
  if (!container) return;
  container.innerHTML = '';
}
