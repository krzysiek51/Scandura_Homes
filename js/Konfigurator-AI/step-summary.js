// js/Konfigurator AI/step-summary.js

import { sendConfigToAI } from './configurator-api-client.js';
import { userSelections } from './user-selections.js'; // zakładam że trzymasz wybory użytkownika w tym module

const stepSummary = document.getElementById('step-summary');
const btnGenerate = document.getElementById('summary-generate-button');
const btnBack = document.getElementById('summary-back-button');
const loader = document.getElementById('summary-loader');
const imageContainer = document.getElementById('summary-image');
const costOutput = document.getElementById('summary-cost');
const errorOutput = document.getElementById('summary-error');

export function initStepSummary() {
  changeStep(stepSummary);
  populateSummary(userSelections);

  btnBack.addEventListener('click', () => {
    // wracamy do poprzedniego kroku (np. garaż)
    initStepGarage();
  });

  btnGenerate.addEventListener('click', async () => {
    loader.style.display = 'block';
    btnGenerate.disabled = true;
    imageContainer.innerHTML = '';
    costOutput.textContent = '';
    errorOutput.textContent = '';

    try {
      const { imageUrl, costEstimate } = await sendConfigToAI(userSelections);

      // Pokaz obrazek
      const img = document.createElement('img');
      img.src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      img.alt = 'Wizualizacja AI';
      img.classList.add('summary-image');
      imageContainer.appendChild(img);

      // Pokaz cene
      costOutput.textContent = `Szacunkowy koszt budowy: ${costEstimate.toLocaleString('pl-PL')} NOK`;

    } catch (err) {
      console.error('[Błąd AI]', err);
      errorOutput.textContent = `Błąd podczas generowania wizualizacji: ${err.message}`;
    } finally {
      loader.style.display = 'none';
      btnGenerate.disabled = false;
    }
  });
}

function populateSummary(data) {
  const summaryList = document.getElementById('summary-details');
  summaryList.innerHTML = `
    <li><strong>Styl:</strong> ${data.style}</li>
    <li><strong>Powierzchnia:</strong> ${data.area} m²</li>
    <li><strong>Kondygnacje:</strong> ${data.floors}</li>
    <li><strong>Dach:</strong> ${data.roof}</li>
    <li><strong>Elewacja:</strong> ${data.elev}</li>
    <li><strong>Garaż:</strong> ${data.garage}</li>
    <li><strong>Piwnica:</strong> ${data.basement}</li>
    <li><strong>Wynajem:</strong> ${data.rental}</li>
    <li><strong>Dostępność:</strong> ${data.accessibility}</li>
  `;
}
