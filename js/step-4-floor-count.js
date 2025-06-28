// step-4-floor-count.js
document.addEventListener('DOMContentLoaded', () => {
const floorOptionsMap = {
  // nowoczesne
  'a-frame':       ['1', '1.5'],
  'box':           ['1', '2'],
  'barn':          ['1', '1.5'],

  // klasyczne
  'torpet':        ['1'],
  'rorbu':         ['1'],
  'langhus':       ['1', '2'],

  // dworek
  'gustavian':     ['1', '1.5'],
  'baroque':       ['2'],
  'empire':        ['2'],

  // indywidualny
  'custom-prompt': ['1', '2', '3']
};

  function goToStep4() {
    console.log('🛠️ window.goToStep4() z step-4-floor-count.js');
    const stepEl = document.getElementById('step-floor-count');
    if (!stepEl) return;

    // Generujemy tylko przyciski, widoczność już ustawił configurator.js
    const variant = window.userSelections.floors;
    const options = floorOptionsMap[variant] || ['1','2'];
    const container = stepEl.querySelector('.step-floor-count__options');
    container.innerHTML = '';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'step-floor-count__option';
      btn.textContent = opt.includes('.')
        ? opt.replace('.', '½') + ' kondygnacji'
        : opt + ' kondygnacja' + (opt !== '1' ? 'e' : '');
      btn.dataset.floors = opt;
      btn.disabled = false;

      btn.addEventListener('click', () => {
        container.querySelectorAll('.step-floor-count__option')
          .forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        // zapisujemy globalnie
        window.userSelections.floors = opt;
        document.getElementById('floor-count-continue').disabled = false;
      });

      container.appendChild(btn);
    });

  const btnContinue = document.getElementById('floor-count-continue');
if (btnContinue) {
  btnContinue.disabled = true;
  // zamiast addons idziemy do kroku dachu i elewacji
  btnContinue.onclick = window.goToStepRoofElev;
}
    const btnBack = stepEl.querySelector('[data-back-to="step-options"]');
    if (btnBack) btnBack.onclick = window.goToStep3;
  }

  window.goToStep4 = goToStep4;
});
