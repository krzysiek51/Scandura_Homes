// js/step-garage.js
// Logic for the Garage selection step (Step 6) with proper disabled attribute handling

function initStepGarage() {
  // Pokaż krok garażu
  window.changeStep('step-garage');

  const container = document.getElementById('step-garage');
  if (!container) {
    console.error('Krok garażu nie znaleziony');
    return;
  }

  // Pobierz opcje i przycisk kontynuuj
  const options = Array.from(container.querySelectorAll('.step-garage__button'));
  const continueBtn = container.querySelector('.step-garage__nav-button--continue');

  if (!continueBtn) {
    console.error('Nie znaleziono przycisku „Dalej” w kroku garażu');
    return;
  }

  // Ustaw type i atrybut disabled przy starcie
  continueBtn.type = 'button';
  continueBtn.setAttribute('disabled', '');

  // Podłącz eventy do opcji
  options.forEach(btn => {
    btn.type = 'button';
    btn.addEventListener('click', event => {
      event.preventDefault();
      options.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      window.userSelections = window.userSelections || {};
      window.userSelections.garage = btn.dataset.value;
      // Usuń disabled z atrybutu
      continueBtn.removeAttribute('disabled');
    });
  });

  // Handler przycisku Dalej
  continueBtn.addEventListener('click', event => {
    event.preventDefault();
    if (continueBtn.hasAttribute('disabled')) {
      return;
    }
    window.changeStep('step-summary');
  });
}

// Udostępnij globalnie
window.initStepGarage = initStepGarage;
