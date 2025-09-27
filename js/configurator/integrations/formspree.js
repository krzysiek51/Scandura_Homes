// js/configurator/integrations/formspree.js
(() => {
  'use strict';
  if (window.__CFG_FORMSPREE__) return;
  window.__CFG_FORMSPREE__ = true;

  // ⬇️ PODMIEŃ na swój endpoint Formspree
  const CONFIG = {
    ACTION: 'https://formspree.io/f/myzdrpob', // <--- wstaw swój ID
    // THANKS_URL: '/pages/thanks.html', // jeśli chcesz po wysłaniu przejść na stronę "dziękuję"
  };

  // Bezpieczne escapowanie
  const esc = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Z płaskiego "state" do FormData (w tym załączniki z Krok 5)
  function buildFormDataFromState(state = {}) {
    const fd = new FormData();

    const leadId = state.leadId || (crypto?.randomUUID?.() || String(Date.now()));
    fd.append('leadId', leadId);
    fd.append('_subject', `Konfigurator • Nowe zapytanie #${leadId}`);
    fd.append('source_url', window.location.href);

    // Klient
    const contact = state.contact || {};
    fd.append('name', contact.name || '');
    fd.append('email', contact.email || '');
    fd.append('_replyto', contact.email || '');
    if (contact.phone) fd.append('phone', contact.phone);
    fd.append('consent', contact.consent ? '1' : '0');

    // Krok 1–7 (to co mamy w stanie)
    // 1. Typ budynku
    if (typeof state.building === 'string') {
      fd.append('building', state.building);
    } else if (state.building?.type === 'inny') {
      fd.append('building', `inny: ${state.building?.note || ''}`);
    }

    // 2. Powierzchnia
    if (state.areaChoice) fd.append('area_choice', String(state.areaChoice));
    if (state.areaExact != null) fd.append('area_exact', String(state.areaExact));

    // 3. Kondygnacje
    if (state.floors) fd.append('floors', String(state.floors));

    // 4. Garaż
    if (state.garage) fd.append('garage', String(state.garage));

    // 5. Notatki + załączniki
    if (state.notes) fd.append('notes', state.notes);
    if (Array.isArray(state.attachments)) {
      let i = 1;
      for (const a of state.attachments) {
        if (a?.file instanceof File) {
          // Formspree akceptuje wiele plików – różne nazwy pól:
          fd.append(`file${i}`, a.file, a.name || a.file.name);
          i++;
        }
      }
    }

    // 6. Termin startu
    if (state.startWhen) fd.append('start_when', String(state.startWhen));

    // 7. Lokalizacja
    const loc = state.location || {};
    if (loc.city) fd.append('location_city', loc.city);
    if (loc.region) fd.append('location_region', loc.region);
    if (loc.country) fd.append('location_country', loc.country);

    // 8. Cena (jeśli mamy)
    if (state.price != null) fd.append('price', String(state.price));
    if (Array.isArray(state.priceRange)) {
      const [min, max] = state.priceRange;
      if (min != null) fd.append('price_min', String(min));
      if (max != null) fd.append('price_max', String(max));
    }

    // Honeypot (opcjonalnie)
    fd.append('_gotcha', '');

    return fd;
  }

  async function submit(state) {
    const fd = buildFormDataFromState(state);
    const res = await fetch(CONFIG.ACTION, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error('Formspree: błąd wysyłki');
    return true;
  }

  // Export do globala
  window.CFG_SubmitLeadFormspree = {
    submit,
    config: CONFIG
  };
})();
