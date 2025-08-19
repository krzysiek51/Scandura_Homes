
// /js/steps/step6-summary.js
// Krok 6 – Podsumowanie + wstępna wycena

import { updatePriceAndPreview, estimateCost } from '../configurator.js';

export function mount(container, CFG) {
  const estimate = estimateCost(CFG.data);

  container.innerHTML = `
    <h2>Podsumowanie konfiguracji</h2>
    <p>Sprawdź wybrane opcje i zapoznaj się z wstępną wyceną.</p>

    <div class="summary-box">
      <ul>
        <li><strong>Rodzaj domu:</strong> ${CFG.data.houseType || '-'}</li>
        <li><strong>Fundament:</strong> ${CFG.data.foundation || '-'}</li>
        <li><strong>Styl:</strong> ${CFG.data.style || '-'}</li>
        <li><strong>Elewacja:</strong> ${CFG.data.facade || '-'}</li>
        <li><strong>Dach:</strong> ${CFG.data.roofType || '-'}</li>
        <li><strong>Powierzchnia:</strong> ${CFG.data.area || '-'} m²</li>
        <li><strong>Pokoje:</strong> ${CFG.data.rooms || '-'}</li>
        <li><strong>Łazienki:</strong> ${CFG.data.baths || '-'}</li>
        <li><strong>Okna:</strong> ${CFG.data.windows || '-'}</li>
        <li><strong>Drzwi:</strong> ${CFG.data.doors || '-'}</li>
        <li><strong>Dodatki:</strong> 
          ${CFG.data.extraElectric ? 'Inst. elektryczna, ' : ''}
          ${CFG.data.extraHydraulic ? 'Inst. hydrauliczna, ' : ''}
          ${CFG.data.extraHeating ? 'Ogrzewanie, ' : ''}
          ${CFG.data.extraTerrace ? 'Taras, ' : ''}
          ${CFG.data.extraGarage ? 'Garaż' : ''}
        </li>
      </ul>
    </div>

    <div class="estimate-box">
      <h3>Wstępna wycena</h3>
      <p><strong>Stan surowy:</strong> ${estimate.raw} zł</p>
      <p><strong>Stan deweloperski:</strong> ${estimate.developer} zł</p>
      <p><strong>Pod klucz:</strong> ${estimate.turnkey} zł</p>
    </div>

    <p class="muted" style="margin-top:8px">
      * To tylko wstępna kalkulacja. Dokładna oferta zostanie przygotowana po kontakcie z naszym zespołem.
    </p>
  `;
}

export function validate(CFG) {
  // tu nie ma dodatkowej walidacji
  return true;
}

export function unmount(container, CFG) {
  // opcjonalny cleanup
}
