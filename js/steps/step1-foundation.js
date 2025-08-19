
// /js/steps/step1-foundation.js
// Krok 1 – Fundament (płyta / ławy)

export function mount(container, CFG) {
  container.innerHTML = `
    <h2>Fundament</h2>
    <p>Wybierz rodzaj fundamentu dopasowany do warunków gruntu:</p>

    <div class="cfg-options">
      <label class="cfg-option">
        <input type="radio" name="foundation" value="plyta" ${CFG.data.foundation === 'plyta' ? 'checked' : ''}/>
        <span>Płyta fundamentowa</span>
      </label>
      <label class="cfg-option">
        <input type="radio" name="foundation" value="lawy" ${CFG.data.foundation === 'lawy' ? 'checked' : ''}/>
        <span>Ławy fundamentowe</span>
      </label>
    </div>

    <p class="muted" style="margin-top:8px">
      * Płyta — stabilna i ciepła (często droższa). Ławy — klasyczne rozwiązanie, zależne od gruntu i głębokości przemarzania.
    </p>
  `;

  container.querySelectorAll('input[name="foundation"]').forEach(input => {
    input.addEventListener('change', e => {
      CFG.data.foundation = e.target.value;
    });
  });
}

export function validate(CFG) {
  if (!CFG.data.foundation) {
    alert('Wybierz rodzaj fundamentu, aby kontynuować.');
    return false;
  }
  return true;
}

export function unmount(container, CFG) {
  // opcjonalnie: cleanup
}
