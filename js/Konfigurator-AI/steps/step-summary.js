// Konfigurator AI - step-summary.js

import { generatePrompt } from './helpers/prompt-generator.js';
import { generateVisualizationAndPrice as generateImageAndCost } from './helpers/backend-api.js';


export function initStepSummary() {
  const stepSummary = document.getElementById('step-summary');
  const backBtn = document.getElementById('summary-back-button');
  const generateBtn = document.getElementById('summary-generate-button');
  const selectionsEl = document.getElementById('summary-selections');
  const loaderEl = document.getElementById('summary-loader');
  const imageEl = document.getElementById('summary-image');
  const costEl = document.getElementById('summary-cost');

  if (!stepSummary || !backBtn || !generateBtn || !selectionsEl || !loaderEl || !imageEl || !costEl) {
    console.error('[initStepSummary] Brakuje któregoś z elementów UI');
    return;
  }

  // Przejście do kroku
  changeStep(stepSummary);

  // Wypełnij podsumowanie wyborami użytkownika
  selectionsEl.innerHTML = '';
  for (const [key, value] of Object.entries(userSelections)) {
    const item = document.createElement('div');
    item.className = 'summary__item';
    item.innerHTML = `<strong>${key}:</strong> ${value}`;
    selectionsEl.appendChild(item);
  }

  // Back
  backBtn.addEventListener('click', () => {
    initStepGarage();
  });

  // Generate image + cost
  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    loaderEl.style.display = 'block';
    imageEl.src = '';
    costEl.textContent = '';

    try {
      const response = await generateImageAndCost(userSelections);

      imageEl.src = response.imageUrl;
      imageEl.alt = 'Wizualizacja AI';
      costEl.textContent = `Szacunkowy koszt budowy: ${response.costEstimate.toLocaleString()} NOK`;
    } catch (err) {
      alert('Wystąpił błąd podczas generowania: ' + err.message);
    } finally {
      loaderEl.style.display = 'none';
      generateBtn.disabled = false;
    }
  });
}
