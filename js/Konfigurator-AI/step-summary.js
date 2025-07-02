// js/Konfigurator-AI/step-summary.js

import { sendConfigToAI } from './configurator-api-client.js';

// Mapa tłumaczeń wartości wyborów
const labels = {
  style: {
    modern: "Nowoczesny",
    classic: "Klasyczny",
    dworek: "Dworek",
    custom: "Indywidualny projekt",
  },
  roof: {
    flat: "Płaski dach",
    gable: "Dach dwuspadowy",
    hip: "Dach wielospadowy",
  },
  elev: {
    wood: "Drewniana elewacja",
    plaster: "Tynk mineralny + styropian",
  },
  garage: {
    none: "Brak garażu",
    single: "Garaż jednostanowiskowy",
    double: "Garaż dwustanowiskowy",
  },
  floors: {
    "1": "1 kondygnacja",
    "1.5": "1½ kondygnacji",
    "2": "2 kondygnacje",
  },
};

// Tłumaczy wartość na podstawie powyższej mapy
function translateValue(category, value) {
  return labels[category]?.[value] || value || '—';
}

// Formatuje liczbę kondygnacji
function formatFloors(value) {
  return translateValue('floors', value);
}

// Inicjalizacja kroku "Podsumowanie"
export function initStepSummary() {
  const stepSummary    = document.getElementById('step-summary');
  const btnGenerate    = document.getElementById('summary-generate-button');
  const btnBack        = document.getElementById('summary-back-button');
  const loader         = document.getElementById('summary-loader');
  const imageContainer = document.getElementById('summary-image');
  const costOutput     = document.getElementById('summary-cost');
  const errorOutput    = document.getElementById('summary-error');

  // Pokaż modal i wypełnij przetłumaczone podsumowanie z globalnego obiektu
  changeStep(stepSummary);
  populateSummary(window.userSelections);

  // Listener "Wstecz" tylko raz
  if (!btnBack.dataset.bound) {
    btnBack.addEventListener('click', () => initStepGarage());
    btnBack.dataset.bound = 'true';
  }

  // Listener "Generuj" tylko raz
  if (!btnGenerate.dataset.bound) {
    btnGenerate.addEventListener('click', async () => {
      loader.style.display         = 'block';
      btnGenerate.disabled         = true;
      imageContainer.style.display = 'none';
      imageContainer.src           = '';
      costOutput.textContent       = '';
      errorOutput.textContent      = '';

      try {
        const { imageUrl, costEstimate } = await sendConfigToAI(window.userSelections);
        imageContainer.src     = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
        imageContainer.alt     = 'Wizualizacja AI';
        imageContainer.style.display = 'block';
        costOutput.textContent = costEstimate.toLocaleString('pl-PL');
      } catch (err) {
        console.error('[Błąd AI]', err);
        errorOutput.textContent = `Błąd podczas generowania wizualizacji: ${err.message}`;
      } finally {
        loader.style.display = 'none';
        btnGenerate.disabled = false;
      }
    });
    btnGenerate.dataset.bound = 'true';
  }
}

// Wypełnia listę podsumowania przetłumaczonymi wartościami
export function populateSummary(data) {
  console.log('[DEBUG] Wywołano populateSummary z:', data);

  const summaryList = document.getElementById('summary-selections');
  if (!summaryList) return;

  summaryList.innerHTML = `
    <ul id="summary-details">
      <li><strong>Styl:</strong> ${translateValue('style', data.style)}</li>
      <li><strong>Powierzchnia:</strong> ${data.area != null ? data.area + ' m²' : '—'}</li>
      <li><strong>Kondygnacje:</strong> ${formatFloors(data.floors)}</li>
      <li><strong>Dach:</strong> ${translateValue('roof', data.roof)}</li>
      <li><strong>Elewacja:</strong> ${translateValue('elev', data.elev)}</li>
      <li><strong>Garaż:</strong> ${translateValue('garage', data.garage)}</li>
      <li><strong>Piwnica:</strong> ${data.basement ? 'Tak' : 'Nie'}</li>
      <li><strong>Tryb:</strong> ${data.rent === true ? 'Wynajem' : data.rent === false ? 'Własność' : '—'}</li>
      <li><strong>Dostępność od:</strong> ${data.availability || '—'}</li>
      <li><strong>Opis własny:</strong> ${data.customPrompt || '—'}</li>
    </ul>
  `;
}

// Udostępnij globalnie
window.initStepSummary   = initStepSummary;
window.populateSummary   = populateSummary;
