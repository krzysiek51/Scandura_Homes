// /js/steps/step2-facade-style.js
// Krok 2 – Styl i wykończenie elewacji

export function mount(container, CFG) {
  container.innerHTML = `
    <h2>Styl i elewacja</h2>
    <p>Wybierz styl domu i rodzaj elewacji:</p>

    <div class="cfg-group">
      <h3>Styl architektoniczny</h3>
      <div class="cfg-options">
        <label class="cfg-option">
          <input type="radio" name="style" value="skandynawski" ${CFG.data.style === 'skandynawski' ? 'checked' : ''}/>
          <span>Skandynawski</span>
        </label>
        <label class="cfg-option">
          <input type="radio" name="style" value="nowoczesny" ${CFG.data.style === 'nowoczesny' ? 'checked' : ''}/>
          <span>Nowoczesny</span>
        </label>
        <label class="cfg-option">
          <input type="radio" name="style" value="tradycyjny" ${CFG.data.style === 'tradycyjny' ? 'checked' : ''}/>
          <span>Tradycyjny</span>
        </label>
      </div>
    </div>

    <div class="cfg-group">
      <h3>Wykończenie elewacji</h3>
      <div class="cfg-options">
        <label class="cfg-option">
          <input type="radio" name="facade" value="drewno" ${CFG.data.facade === 'drewno' ? 'checked' : ''}/>
          <span>Drewno</span>
        </label>
        <label class="cfg-option">
          <input type="radio" name="facade" value="tynk" ${CFG.data.facade === 'tynk' ? 'checked' : ''}/>
          <span>Tynk</span>
        </label>
        <label class="cfg-option">
          <input type="radio" name="facade" value="mix" ${CFG.data.facade === 'mix' ? 'checked' : ''}/>
          <span>Mix drewna i tynku</span>
        </label>
      </div>
    </div>
  `;

  // obsługa stylu
  container.querySelectorAll('input[name="style"]').forEach(input => {
    input.addEventListener('change', e => {
      CFG.data.style = e.target.value;
    });
  });

  // obsługa elewacji
  container.querySelectorAll('input[name="facade"]').forEach(input => {
    input.addEventListener('change', e => {
      CFG.data.facade = e.target.value;
    });
  });
}

export function validate(CFG) {
  if (!CFG.data.style) {
    alert('Wybierz styl architektoniczny, aby kontynuować.');
    return false;
  }
  if (!CFG.data.facade) {
    alert('Wybierz rodzaj elewacji, aby kontynuować.');
    return false;
  }
  return true;
}

export function unmount(container, CFG) {
  // opcjonalny cleanup
}

