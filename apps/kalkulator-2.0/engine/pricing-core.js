(() => {
  'use strict';
  if (window.__KALK_CORE__) return; window.__KALK_CORE__ = true;

  const round = (n) => Math.round(Number(n) || 0);

  // Dopasowanie sekcji do modyfikatorów kondygnacji (fundament / dach / konstrukcja_stropy)
  function pickFloorKey(sectionKey) {
    const k = String(sectionKey || '').toLowerCase();
    if (k.includes('fundament')) return 'fundament';
    if (k.includes('dach') || k.includes('więźba') || k.includes('wiezba') || k.includes('pokrycie')) return 'dach';
    if (k.includes('konstrukcja') || k.includes('strop') || k.includes('stropy') || k.includes('ścian') || k.includes('scian')) return 'konstrukcja_stropy';
    return null; // brak modyfikatora
  }

  function applyFloorMod(value, sectionKey, floors, floorMods) {
    const key = pickFloorKey(sectionKey);
    const mods = floorMods?.[String(floors)];
    if (!mods || !key || mods[key] == null) return value;
    return value * Number(mods[key]);
  }

  const core = {
    // Liczy sekcje po skalowaniu do m² i modyfikatorach kondygnacji
    computeSections() {
      const ST = window.KALK_STATE?.get();
      if (!ST) throw new Error('KALK_STATE missing');
      const { inputs, data } = ST;
      const pricing = data.pricing;
      if (!pricing) throw new Error('pricing data missing');

      const unitBase = pricing.meta?.unit_base_m2 ?? 100;
      const scope = pricing.scopes?.[inputs.scope];
      if (!scope) throw new Error('unknown scope: ' + inputs.scope);

      const scale = (inputs.area_m2 || unitBase) / unitBase;
      const floors = inputs.floors || 1;
      const floorMods = pricing.floor_modifiers || {};

      const out = {};
      let sumBase100 = 0;
      let sumScaledNoFloors = 0;
      let sumScaledWithFloors = 0;

      for (const [name, v100] of Object.entries(scope.sections || {})) {
        const base100 = Number(v100) || 0;
        sumBase100 += base100;

        const scaled = base100 * scale;
        sumScaledNoFloors += scaled;

        const withFloors = applyFloorMod(scaled, name, floors, floorMods);
        out[name] = round(withFloors);
        sumScaledWithFloors += withFloors;
      }

      return {
        sections: out,             // { sekcja: kwota_po_skalowaniu_i_modach }
        base100: round(sumBase100),
        scaledNoFloors: round(sumScaledNoFloors),
        scaled: round(sumScaledWithFloors)
      };
    },

    // Liczy całkowitą cenę: sekcje → + garaż → × wariant (Basic/Standard/Premium)
    computeTotal() {
      const ST = window.KALK_STATE?.get();
      if (!ST) throw new Error('KALK_STATE missing');
      const { inputs, data } = ST;

      const pricing = data.pricing;
      const garages = data.garages;
      if (!pricing) throw new Error('pricing data missing');

      const variant = (inputs.variant || 'standard').toLowerCase();
      const variantMult = Number(pricing.variant_multipliers?.[variant] ?? 1);

      // Sekcje domu
      const sec = this.computeSections();

      // Garaż (osobny moduł, nie wpływa na m² domu)
      let garageCost = 0;
      const g = inputs.garage || {};
      if (g.mode === 'by_unit' && g.key && garages?.by_unit?.[g.key] != null) {
        garageCost = Number(garages.by_unit[g.key]) || 0;
      } else if (g.mode === 'by_m2' && Number(g.m2) > 0) {
        const rate = Number(garages?.by_m2?.generic) || 0;
        garageCost = rate * Number(g.m2);
      }

      const sumBeforeVariant = sec.scaled + round(garageCost);
      const total = round(sumBeforeVariant * variantMult);

      return {
        total,                                   // to pokazujemy klientowi (jedna liczba)
        debug: {                                 // ślad dla nas (dev)
          scope: inputs.scope,
          area_m2: inputs.area_m2,
          floors: inputs.floors,
          variant,
          variant_mult: variantMult,
          sections: sec.sections,
          sum_sections: sec.scaled,
          garage_cost: round(garageCost),
          before_variant: round(sumBeforeVariant)
        }
      };
    }
  };

  window.KALK_CORE = core;
})();
