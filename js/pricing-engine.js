// js/pricing-engine.js
// Bufor materiałowy (zapas) + pomocnicze funkcje kalkulacyjne.
// Ten plik jest niezależny – nie zmienia Twojego obecnego kodu.
// Użyjesz go w kroku „Wycena”, żeby doliczyć zapas do materiałów.

export const MATERIAL_CONTINGENCY = {
  MIN: 0.15, // 15% zapasu
  SR:  0.18, // 18% zapasu
  MAX: 0.20  // 20% zapasu
};

/** Zaokrąglenie do pełnych zł */
export function roundPLN(x) {
  return Math.round((Number(x) || 0));
}

/**
 * Dodaj zapas do MATERIAŁÓW w zależności od poziomu stawek.
 * Oczekuje bazowego wyniku Twojej kalkulacji:
 *  { laborNet, materialsNet, laborPlusMaterialsNet, debug? }
 */
export function applyMaterialContingency(pricing, level = "SR") {
  const c = MATERIAL_CONTINGENCY[level] ?? MATERIAL_CONTINGENCY.SR;

  const laborNetBase     = Number(pricing?.laborNet) || 0;
  const materialsNetBase = Number(pricing?.materialsNet) || 0;

  const materialsWithCont   = roundPLN(materialsNetBase * (1 + c));
  const laborPlusMaterials  = roundPLN(laborNetBase + materialsWithCont);

  return {
    ...pricing,
    materialsNet: materialsWithCont,
    laborPlusMaterialsNet: laborPlusMaterials,
    debug: {
      ...(pricing?.debug || {}),
      contingencyApplied: true,
      contingencyLevel: level,
      contingencyRate: c,
      materialsBefore: roundPLN(materialsNetBase),
      materialsAfter: materialsWithCont
    }
  };
}

/** Informacyjne przeliczenie netto→brutto (np. 8% lub 23% VAT) */
export function netToGross(net, vatRate) {
  const r = Number(vatRate) || 0;
  return roundPLN(net * (1 + r));
}
