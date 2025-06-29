window.goToStepGarage = function () {
  console.log('🚗 Przechodzę do kroku GARAŻ');
  const step = document.getElementById('step-garage');
  if (!step) return;

  // Nie resetuj userSelections.garage — zachowujemy wybór użytkownika
  const buttons = step.querySelectorAll('.step-garage__button');
  const btnContinue = document.getElementById('garage-continue-button');
  const btnBack = step.querySelector('[data-back-to="step-roof-elev-garage"]');

  // PRZYWRÓĆ WCZEŚNIEJSZY WYBÓR jeśli istnieje
  buttons.forEach(b => {
    b.classList.toggle('is-active', b.dataset.garage === window.userSelections.garage);
  });

  btnContinue.disabled = !window.userSelections.garage;

  // Zabezpiecz, żeby nie dublować eventów
  if (!step.dataset.initialized) {
    console.log('🔁 Inicjalizuję eventy w kroku GARAŻ');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        window.userSelections.garage = btn.dataset.garage;
        btnContinue.disabled = false;
      });
    });

    btnContinue?.addEventListener('click', () => {
      console.log('➡ Użytkownik kontynuuje po wyborze garażu');
      window.goToStep7?.(); // <- może jeszcze nie istnieć
    });

    btnBack?.addEventListener('click', () => {
      window.goToStepRoofElev?.();
    });

    // Flaga: eventy już ustawione
    step.dataset.initialized = 'true';
  }

  // Wyświetl krok
  changeStep(step);
};
