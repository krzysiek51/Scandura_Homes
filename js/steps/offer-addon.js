// js/steps/offer-addon.js
// Niezależny dodatek z cennikiem PDF + rabatami i HTML-em maila.
// Nie dotyka Twojej logiki m²×stawki ani chatu AI.

const DOC_PRICES = {
  // D172 z Twoich załączników (możesz dodać więcej modeli)
  D172: { BASIC: 670_792.28, COMFORT: 761_053.17, PREMIUM: 796_992.24 },
};
// Rabaty: BASIC −7%, COMFORT −10%, PREMIUM −10%
const DOC_DISCOUNTS = { BASIC: 0.07, COMFORT: 0.10, PREMIUM: 0.10 };

// Domyślny model dokumentu — podmienisz gdy podepniesz typ domu
let __DOC_MODEL__ = 'D172';

// public setter (opcjonalnie, gdy zechcesz spiąć z krokiem 0)
export function setOfferDocModel(modelId) {
  __DOC_MODEL__ = modelId || 'D172';
}

// licznik ofertowy (PDF + rabat)
export function getDocSummary(currentVariant) {
  const v = String(currentVariant || 'COMFORT').toUpperCase();
  const base = DOC_PRICES[__DOC_MODEL__]?.[v] || 0;
  const disc = DOC_DISCOUNTS[v] || 0;
  const net  = Math.round(base * (1 - disc));
  return {
    mode: 'DOC',
    variant: v,
    baseNet: base,
    discountPct: disc,
    laborOnlyNet: net,
    laborMaterialsNet: net,
    vat8: Math.round(net * 1.08),
    vat23: Math.round(net * 1.23),
  };
}

const money = (n) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN', maximumFractionDigits: 0
  }).format(Math.round(n || 0));

// zwięzły HTML maila (pełny PDF wysyłacie ręcznie po kontakcie)
export function buildOfferEmailHtml(CFG, sum) {
  const c = CFG?.data?.contact || {};
  const d = CFG?.data || {};

  const ETAPY = [
    { t:'Projekt i przygotowanie', p:[
      'Dokumentacja warsztatowa wg projektu inwestorskiego',
      'Prefabrykacja elementów (ściany, dach, podłogi)',
    ]},
    { t:'Stan zero i fundamenty', p:[
      'Przyłącza, wytyczenie, wykonanie fundamentu',
      'Izolacja części podziemnej',
    ]},
    { t:'Montaż na placu budowy', p:[
      'Montaż prefabrykatów, konstrukcji i dachu',
      'Membrany, obróbki, kompletne pokrycie dachu',
    ]},
    { t:'Stan deweloperski', p:[
      'Stolarka okienna i drzwiowa, posadzki, elewacja',
      'Instalacje: elektryczna, wod-kan, C.O., wentylacja/rekuperacja',
    ]},
  ];

  return `
  <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#111">
    <h2 style="margin:0 0 8px">Scandura Homes — szczegółowa oferta (${sum?.variant||'-'})</h2>
    <p style="margin:0 0 14px">
      Dziękujemy za konfigurację. Poniżej skrót kluczowych informacji.
      Pełny dokument PDF (jak w przykładach) przygotujemy i wyślemy ręcznie po wstępnej akceptacji.
    </p>

    <table style="border-collapse:collapse;width:100%;margin:0 0 12px">
      <tr><td style="padding:6px 0;color:#555">Wariant</td><td style="padding:6px 0"><b>${sum?.variant||'-'}</b></td></tr>
      <tr><td style="padding:6px 0;color:#555">Cena bazowa (z dokumentu)</td><td style="padding:6px 0">${money(sum?.baseNet||0)}</td></tr>
      <tr><td style="padding:6px 0;color:#555">Rabat</td><td style="padding:6px 0">−${Math.round((sum?.discountPct||0)*100)}%</td></tr>
      <tr><td style="padding:6px 0;color:#555">Cena po rabacie</td><td style="padding:6px 0"><b>${money(sum?.laborMaterialsNet||0)}</b> netto</td></tr>
      <tr><td style="padding:6px 0;color:#555">Warianty z VAT</td><td style="padding:6px 0">8%: ${money(sum?.vat8||0)} &nbsp; / &nbsp; 23%: ${money(sum?.vat23||0)}</td></tr>
    </table>

    <h3 style="margin:12px 0 6px">Parametry z konfiguratora</h3>
    <ul style="margin:0 0 10px;padding:0 0 0 18px;color:#333">
      <li>Typ domu: <b>${d?.type||'—'}</b></li>
      <li>Metraż: <b>${d?.layout?.area||'—'} m²</b> • pokoje: ${d?.layout?.rooms||'—'} • łazienki: ${d?.layout?.baths||'—'}</li>
      <li>Wybrane elementy: ${Object.entries(d?.options||{}).filter(([,v])=>v).map(([k])=>k).join(', ')||'—'}</li>
      <li>Lokalizacja: ${c?.city||'—'}</li>
    </ul>

    <h3 style="margin:12px 0 6px">Etapy prac (skrót)</h3>
    ${ETAPY.map(e => `
      <div style="margin:0 0 8px">
        <b>${e.t}</b>
        <ul style="margin:4px 0 0;padding:0 0 0 18px;color:#333">
          ${e.p.map(p=>`<li>${p}</li>`).join('')}
        </ul>
      </div>`).join('')}

    <p style="margin:12px 0 0;color:#555">
      Pełny, rozbudowany PDF (zakres, materiały, warianty Basic/Comfort/Premium)
      przygotujemy i wyślemy po krótkim potwierdzeniu z Twojej strony.
    </p>
  </div>`;
}

