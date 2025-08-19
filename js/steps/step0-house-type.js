// /js/steps/step0-house-type.js
// Krok 0 – Rodzaj domu

export function mount(container, CFG) {
  container.innerHTML = `
    <h2>Rodzaj domu</h2>
    <p>Wybierz typ domu, który chcesz skonfigurować:</p>
    <div class="cfg-options">
      <label class="cfg-option">
        <input type="radio" name="houseType" value="parterowy" ${CFG.data.houseType === 'parterowy' ? 'checked' : ''}/>
        <span>Dom parterowy</span>
      </label>
      <label class="cfg-option">
        <input type="radio" name="houseType" value="z_poddaszem" ${CFG.data.houseType === 'z_poddaszem' ? 'checked' : ''}/>
        <span>Dom z poddaszem użytkowym</span>
      </label>
      <label class="cfg-option">
        <input type="radio" name="houseType" value="pietrowy" ${CFG.data.houseType === 'pietrowy' ? 'checked' : ''}/>
        <span>Dom piętrowy</span>
      </label>
    </div>
  `;

  container.querySelectorAll('input[name="houseType"]').forEach(input => {
    input.addEventListener('change', e => {
      CFG.data.houseType = e.target.value;
    });
  });
}

export function validate(CFG) {
  if (!CFG.data.houseType) {
    alert('Wybierz rodzaj domu, aby kontynuować.');
    return false;
  }
  return true;
}

export function unmount(container, CFG) {
  // tu można dodać cleanup, np. zapisać stan do localStorage
}
