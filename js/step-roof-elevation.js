document.addEventListener('DOMContentLoaded', () => {
  function goToStepRoofElev() {
    console.log('🔍 goToStepRoofElev uruchomione');

    if (!window.userSelections) {
      window.userSelections = {};
    }

    const stepEl = document.getElementById('step-roof-elevation');
    if (!stepEl) {
      console.error('Brak kroku „Wybierz dach i elewację”');
      return;
    }
    window.changeStep(stepEl);

    const roofButtons   = stepEl.querySelectorAll('[data-roof]');
    const facadeButtons = stepEl.querySelectorAll('[data-facade]');
    const btnContinue   = stepEl.querySelector('#roof-elev-continue-button');
    const btnBack       = stepEl.querySelector('[data-back-to="step-floors"]');

    roofButtons.forEach(b => b.classList.remove('is-active'));
    facadeButtons.forEach(b => b.classList.remove('is-active'));
    btnContinue.disabled = true;

    roofButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        roofButtons.forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        window.userSelections.roof = btn.dataset.roof;
        console.log('✅ Wybrano dach:', window.userSelections.roof);
        if (window.userSelections.elev) {
          btnContinue.disabled = false;
        }
      });
    });

    facadeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        facadeButtons.forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        window.userSelections.elev = btn.dataset.facade;
        console.log('✅ Wybrano elewację:', window.userSelections.elev);
        if (window.userSelections.roof) {
          btnContinue.disabled = false;
        }
      });
    });

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        window.goToStep4();
      });
    }

    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        window.goToStep6();
      });
    }
  }

  window.goToStepRoofElev = goToStepRoofElev;
});
