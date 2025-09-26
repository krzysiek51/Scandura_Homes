(() => {
  'use strict';
  // Guard – jeden mount na stronę
  if (window.UI_QUOTE) return;

  // === KONFIG UŻYTKOWY ===
  const DISCOUNT = 0.15; // 15% taniej w każdym wariancie
  const TIERS = [
    { id: 'basic',    label: 'Basic',    mult: 1.00 },
    { id: 'standard', label: 'Standard', mult: 1.12 },
    { id: 'premium',  label: 'Premium',  mult: 1.25 },
  ];
  const CURRENCY = new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN', maximumFractionDigits: 0
  });

  // === HELPERY POBIERANIA CENY Z RÓŻNYCH API SILNIKA ===
  const getRawPrice = () => {
    try {
      if (!window.CALC) return null;

      // 1) Jeśli jest metoda getQuote → preferowana
      if (typeof CALC.getQuote === 'function') {
        const q = CALC.getQuote();              // { base, total } albo liczba
        if (q && typeof q === 'object') {
          return Number(q.total ?? q.base ?? 0) || null;
        }
        return Number(q) || null;
      }

      // 2) Jeśli jest getTotal()
      if (typeof CALC.getTotal === 'function') {
        const t = CALC.getTotal();
        return Number(t) || null;
      }

      // 3) Jeśli trzyma w state
      if (CALC.state?.total)  return Number(CALC.state.total)  || null;
      if (CALC.state?.price)  return Number(CALC.state.price)  || null;
      if (CALC.state?.sum)    return Number(CALC.state.sum)    || null;

      return null;
    } catch (e) {
      console.error('[UI_QUOTE] getRawPrice error:', e);
      return null;
    }
  };

  const computeTierPrice = (raw, mult) => {
    if (!raw || raw <= 0) return null;
    const val = raw * mult * (1 - DISCOUNT);
    // Zaokrąglamy do pełnych zł
    return Math.round(val);
  };

  // === RENDER ===
  const html = (raw, activeId = 'standard') => {
    const makeBtn = (t) => {
      const p = computeTierPrice(raw, t.mult);
      const price = p != null ? CURRENCY.format(p) : '—';
      const active = t.id === activeId ? ' aria-pressed="true" class="cfgq__btn is-active"' : ' class="cfgq__btn"';
      return `
        <button type="button" data-tier="${t.id}"${active}>
          <span class="cfgq__btn-label">${t.label}</span>
          <span class="cfgq__btn-price">${price}</span>
        </button>`;
    };

    const activeTier = TIERS.find(t => t.id === activeId) ?? TIERS[1]; // domyślnie standard
    const activePrice = computeTierPrice(raw, activeTier.mult);
    const big = activePrice != null ? CURRENCY.format(activePrice) : '—';

    return `
      <div class="cfgq">
        <div class="cfgq__buttons" role="group" aria-label="Warianty wyceny">
          ${TIERS.map(makeBtn).join('')}
        </div>
        <div class="cfgq__total" aria-live="polite">
          <span class="cfgq__total-label">Szacunkowa cena</span>
          <span class="cfgq__total-value">${big}</span>
          <span class="cfgq__note">Zawiera rabat ${Math.round(DISCOUNT*100)}% dla wszystkich wariantów</span>
        </div>
        <div class="cfgq__cta">
          <button type="button" class="cfgq__next" data-cfg="go-next">
            Przejdź dalej, by otrzymać szczegółową wycenę
          </button>
        </div>
      </div>
    `;
  };

  // Minimalne style (opcjonalne – możesz ogarnąć w SCSS)
  const injectMinimalStyles = () => {
    if (document.getElementById('cfgq-mincss')) return;
    const s = document.createElement('style');
    s.id = 'cfgq-mincss';
    s.textContent = `
      .cfgq{display:grid;gap:12px}
      .cfgq__buttons{display:flex;gap:8px;flex-wrap:wrap}
      .cfgq__btn{display:grid;gap:2px;align-items:center;justify-items:center;padding:8px 12px;border-radius:999px;border:1px solid rgba(0,0,0,.12);background:#fff}
      .cfgq__btn.is-active{border-color:rgba(0,0,0,.28);box-shadow:0 2px 10px rgba(0,0,0,.08)}
      .cfgq__btn-price{font-weight:600}
      .cfgq__total{display:grid;gap:4px}
      .cfgq__total-value{font-size:1.25rem;font-weight:700}
      .cfgq__note{font-size:.85rem;opacity:.7}
      .cfgq__cta{margin-top:6px}
      .cfgq__next{padding:10px 16px;border-radius:10px;border:1px solid rgba(0,0,0,.14);background:#fff}
      @media (prefers-color-scheme: dark){
        .cfgq__btn, .cfgq__next{background:#111;border-color:rgba(255,255,255,.16);color:#eee}
      }
    `;
    document.head.appendChild(s);
  };

  // === KONTROLER ===
  const mount = (sel) => {
    const host = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!host) return;

    injectMinimalStyles();

    // 1) Wstępny render (może być jeszcze bez ceny)
    let active = 'standard';
    let raw = getRawPrice();
    host.innerHTML = html(raw, active);

    // 2) Obsługa klików – przełączanie wariantów
    const onClick = (e) => {
      const btn = e.target.closest('[data-tier]');
      if (!btn) return;

      active = btn.getAttribute('data-tier');
      host.innerHTML = html(raw, active);
    };
    host.addEventListener('click', onClick);

    // 3) Reaktywne odświeżenie, gdy kalkulator policzy cenę
    //    (obsługujemy i event i fallback polling)
    const redraw = () => {
      const next = getRawPrice();
      if (next && next !== raw) {
        raw = next;
        host.innerHTML = html(raw, active);
      }
    };

    const onCalcEvent = () => { redraw(); };
    window.addEventListener('calc:price', onCalcEvent);

    let tries = 0;
    const poll = () => {
      redraw();
      if (++tries < 40) setTimeout(poll, 250); // ~10s max
    };
    poll();

    // 4) „Dalej” – jeśli masz router kroków, wyślij sygnał
    const observer = new MutationObserver(() => {
      const btnNext = host.querySelector('[data-cfg="go-next"]');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          // Własny event – obsłuż w swoim routerze, jeśli chcesz.
          window.dispatchEvent(new CustomEvent('configurator:next'));
        }, { once: true });
        observer.disconnect();
      }
    });
    observer.observe(host, { childList: true, subtree: true });

    // 5) Zwróć funkcję unmount dla hooka
    return () => {
      window.removeEventListener('calc:price', onCalcEvent);
      host.innerHTML = '';
    };
  };

  const unmount = (sel) => {
    const host = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!host) return;
    host.innerHTML = '';
  };

  // Eksport globalny dla hooka
  window.UI_QUOTE = { mount, unmount };
})();
