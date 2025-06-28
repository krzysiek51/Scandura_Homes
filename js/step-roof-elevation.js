// js/step-roof-elevation.js

document.addEventListener('DOMContentLoaded', () => {
  // Funkcja wyświetlająca krok dach + elewacja
  function goToStepRoofElev() {
    const stepEl = document.getElementById('step-roof-elevation');
    if (!stepEl) {
      console.error('Brak kroku „Wybierz dach i elewację”');
      return;
    }
    // Schowaj wszystkie kroki
    window.changeStep(stepEl);

    // Pobierz przyciski dachowe i elewacyjne
    const roofButtons   = stepEl.querySelectorAll('[data-roof]');
    const facadeButtons = stepEl.querySelectorAll('[data-facade]');
    const btnContinue   = stepEl.querySelector('#roof-elev-continue-button');
    const btnBack       = stepEl.querySelector('[data-back-to="step-floor-count"]');

    // Reset stanu
    window.userSelections.roof   = null;
    window.userSelections.elev   = null;
    roofButtons.forEach(b => b.classList.remove('is-active'));
    facadeButtons.forEach(b => b.classList.remove('is-active'));
    btnContinue.disabled = true;

    // Dach: klik → zaznacz, zapisz, ewentualnie odblokuj Continue
    roofButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        roofButtons.forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        window.userSelections.roof = btn.dataset.roof;
        if (window.userSelections.elev) {
          btnContinue.disabled = false;
        }
      });
    });

    // Elewacja: klik → zaznacz, zapisz, ewentualnie odblokuj Continue
    facadeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        facadeButtons.forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        window.userSelections.elev = btn.dataset.facade;
        if (window.userSelections.roof) {
          btnContinue.disabled = false;
        }
      });
    });

    // Powrót do kroku kondygnacji
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        window.goToStep4();
      });
    }

    // Kontynuuj do dodatków (krok 5)
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        window.goToStep5();
      });
    }
  }

  // Wystawiamy globalnie
  window.goToStepRoofElev = goToStepRoofElev;
});
