// /js/steps/step4-layout.js
// Krok 4 – Rozkład i metraż (powierzchnia, pokoje, łazienki, okna, drzwi)

import { updatePriceAndPreview } from '../configurator.js';

export function mount(container, CFG) {
  container.innerHTML = `
    <h2>Rozkład i metraż</h2>
    <p>Ustal podstawowe parametry wnętrza. Te dane wpływają na wycenę robocizny.</p>

    <div class="grid">
      <label>
        Powierzchnia (m²)
        <input type="number" name="area" min="35" max="500" step="5" value="${CFG.data.area ?? 100}" />
      </label>

      <label>
        Liczba pokoi
        <input type="number" name="rooms" min="1" max="12" step="1" value="${CFG.data.rooms ?? 3}" />
      </label>

      <label>
        Liczba łazienek
        <input type="number" name="baths" min="1" max="6" step="1" value="${CFG.data.baths ?? 2}" />
      </label>

      <label>
        Liczba okien
        <input type="number" name="windows" min="1" max="60" step="1" value="${CFG.data.windows ?? 10}" />
      </label>

      <label>
        Drzwi zewnętrzne (szt.)
        <input type="number" name="doors" min="1" max="6" step="1" value="${CFG.data.doors ?? 2}" />
      </label>
    </div>

    <p class="muted" style="margin-top:8px">
      * Większa liczba łazienek, okien i drzwi zwiększa nakład prac i koszt instalacji/wykończeń.
    </p>
  `;

  // nasłuchiwanie zmian pól
  container.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.addEventListener('input', () => {
      const v = (name) => {
        const el = container.querySelector(`input[name="${name}"]`);
        return el ? Math.max(+el.min || 0, Math.min(+el.max || 1e9, +el.value || 0)) : 0;
      };

      CFG.data.area    = v('area');
      CFG.data.rooms   = v('rooms');
      CFG.data.baths   = v('baths');
      CFG.data.windows = v('windows');
      CFG.data.doors   = v('doors');

      updatePriceAndPreview();
    });
  });
}

export function validate(CFG) {
  const { area, rooms, baths, windows, doors } = CFG.data;
  if (!area || area < 35)   { alert('Podaj powierzchnię min. 35 m².'); return false; }
  if (!rooms || rooms < 1)  { alert('Podaj liczbę pokoi (min. 1).'); return false; }
  if (!baths || baths < 1)  { alert('Podaj liczbę łazienek (min. 1).'); return false; }
  if (!windows || windows < 1){ alert('Podaj liczbę okien (min. 1).'); return false; }
  if (!doors || doors < 1)  { alert('Podaj liczbę drzwi zewnętrznych (min. 1).'); return false; }
  return true;
}

export function unmount(container, CFG) {
  // opcjonalny cleanup
}
