(() => {
  'use strict';
  if (window.__KALK_UI_QUOTE__) return; window.__KALK_UI_QUOTE__ = true;

  function fmtPLN(n) {
    return (Number(n) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
  }

  function makeVariantBtn(label, key) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quote__variant';
    b.dataset.variant = key;
    b.textContent = label;
    return b;
  }

  function mount({ mountSelector = '#calc-quote' } = {}) {
    const host = document.querySelector(mountSelector);
    if (!host) return console.error('[quote] Brak kontenera', mountSelector);

    host.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'quote';

    const priceEl = document.createElement('div');
    priceEl.className = 'quote__value';
    priceEl.style.fontSize = '40px';
    priceEl.style.fontWeight = '700';
    priceEl.style.marginBottom = '10px';

    const labelEl = document.createElement('div');
    labelEl.className = 'quote__label';
    labelEl.textContent = 'Szacunkowa cena (średnia × wariant)';

    const noteEl = document.createElement('div');
    noteEl.className = 'quote__note';
    noteEl.textContent = 'Klient widzi jedną liczbę. Garaż liczony osobno.';

    const btns = document.createElement('div');
    btns.className = 'quote__variants';
    btns.style.display = 'flex';
    btns.style.gap = '8px';
    btns.style.margin = '12px 0';

    const bBasic = makeVariantBtn('Basic', 'basic');
    const bStd   = makeVariantBtn('Standard', 'standard');
    const bPrem  = makeVariantBtn('Premium', 'premium');
    btns.append(bBasic, bStd, bPrem);

    box.append(labelEl, priceEl, btns, noteEl);
    host.appendChild(box);

    // render
    const render = () => {
      try {
        const res = window.CALC.compute();
        priceEl.textContent = fmtPLN(res?.total ?? 0);

        // podświetl aktywny wariant
        const active = window.CALC.state()?.inputs?.variant || 'standard';
        host.querySelectorAll('.quote__variant').forEach(b => {
          b.classList.toggle('is-active', b.dataset.variant === active);
          b.style.padding = '8px 12px';
          b.style.borderRadius = '10px';
          b.style.border = b.classList.contains('is-active') ? '2px solid #333' : '1px solid #bbb';
          b.style.background = b.classList.contains('is-active') ? '#f2f2f2' : '#fff';
          b.style.cursor = 'pointer';
        });
      } catch (e) {
        console.error('[quote] compute error', e);
        priceEl.textContent = '—';
      }
    };

    // obsługa klików wariantów
    btns.addEventListener('click', (e) => {
      const btn = e.target.closest('.quote__variant');
      if (!btn) return;
      window.CALC.set({ variant: btn.dataset.variant });
    });

    // reaguj na zmiany stanu/danych
    window.KALK_STATE?.on('calc:changed', render);

    // pierwszy render
    render();
  }

  window.UI_QUOTE = { mount };
})();
