// js/configurator/integrations/formspree.js
(() => {
  'use strict';
  if (window.__CFG_FORMSPREE__) return;
  window.__CFG_FORMSPREE__ = true;

  // ⬇️ Ustaw swój endpoint Formspree (zostawiłem ten z przykładu)
  const CONFIG = {
    ACTION: 'https://formspree.io/f/myzdrpob',
    // THANKS_URL: '/pages/thanks.html', // <- odkomentuj jeśli chcesz redirect po sukcesie
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Utils
  // ──────────────────────────────────────────────────────────────────────────────
  const esc = (s = '') =>
    s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = n => (n == null || n === '') ? '-' : `${Number(n).toLocaleString('pl-PL')} PLN`;
  const str  = v => (v == null || v === '') ? '-' : String(v);

  // Bezpieczny absolutny URL do logo (działa z dowolnej podstrony)
  const logoUrl = (() => {
    try {
      return new URL('/photos/logo.svg', window.location.origin).href;
    } catch { return '/photos/logo.svg'; }
  })();

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: TXT (fallback)
  // ──────────────────────────────────────────────────────────────────────────────
  function renderEmailText(state = {}) {
    const contact = state.contact || {};
    const loc = state.location || {};
    const [min, max] = Array.isArray(state.priceRange) ? state.priceRange : [];

    return [
      'SCANDURA HOMES — NOWE ZAPYTANIE Z KONFIGURATORA',
      '------------------------------------------------',
      `Imię i nazwisko: ${str(contact.name)}`,
      `Email: ${str(contact.email)}`,
      `Telefon: ${str(contact.phone)}`,
      '',
      'PARAMETRY',
      `• Budynek: ${str(state.building)}`,
      `• Powierzchnia: ${str(state.areaExact)} m² (wybór: ${str(state.areaChoice)})`,
      `• Kondygnacje: ${str(state.floors)}`,
      `• Garaż: ${str(state.garage)}`,
      `• Termin startu: ${str(state.startWhen)}`,
      `• Lokalizacja: ${[loc.city, loc.region, loc.country].filter(Boolean).join(', ') || '-'}`,
      '',
      'CENA (orientacyjnie)',
      `• Widełki: ${money(min)} – ${money(max)}`,
      `• Cena wyliczona: ${money(state.price)}`,
      '',
      'NOTATKI KLIENTA',
      (state.notes && String(state.notes)) || '-',
      '',
      `Źródło: ${window.location.href}`,
    ].join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: HTML (brandowany, tabelkowy, lekki)
  // ──────────────────────────────────────────────────────────────────────────────
  function renderEmailHTML(state = {}) {
    const contact = state.contact || {};
    const loc = state.location || {};
    const [min, max] = Array.isArray(state.priceRange) ? state.priceRange : [];

    const locStr = [loc.city, loc.region, loc.country].filter(Boolean).join(', ') || '-';

    return `
  <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#222;background:#fff;padding:0;margin:0">
    <div style="max-width:720px;margin:0 auto;padding:20px 16px">
      <div style="text-align:center;margin:8px 0 18px">
        <img src="${esc(logoUrl)}" alt="Scandura Homes" style="max-width:200px;height:auto;display:inline-block" />
      </div>

      <h2 style="margin:0 0 14px;font-weight:700;font-size:20px;color:#111">
        Nowe zapytanie z Konfiguratora
      </h2>

      <!-- Dane kontaktowe -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 18px">
        <tbody>
          <tr><td colspan="2" style="padding:10px 0;border-bottom:2px solid #DC9B59"><strong>Dane kontaktowe</strong></td></tr>
          <tr><td style="padding:8px 0 4px;color:#666;width:180px">Imię i nazwisko</td><td style="padding:8px 0 4px">${esc(str(contact.name))}</td></tr>
          <tr><td style="padding:4px 0;color:#666">Email</td><td style="padding:4px 0">${esc(str(contact.email))}</td></tr>
          <tr><td style="padding:4px 0 8px;color:#666">Telefon</td><td style="padding:4px 0 8px">${esc(str(contact.phone))}</td></tr>
        </tbody>
      </table>

      <!-- Parametry -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 18px">
        <tbody>
          <tr><td colspan="2" style="padding:10px 0;border-bottom:2px solid #DC9B59"><strong>Parametry</strong></td></tr>
          <tr><td style="padding:8px 0 4px;color:#666;width:180px">Budynek</td><td style="padding:8px 0 4px">${esc(str(state.building))}</td></tr>
          <tr><td style="padding:4px 0;color:#666">Powierzchnia</td><td style="padding:4px 0">${esc(str(state.areaExact))} m² (wybór: ${esc(str(state.areaChoice))})</td></tr>
          <tr><td style="padding:4px 0;color:#666">Kondygnacje</td><td style="padding:4px 0">${esc(str(state.floors))}</td></tr>
          <tr><td style="padding:4px 0;color:#666">Garaż</td><td style="padding:4px 0">${esc(str(state.garage))}</td></tr>
          <tr><td style="padding:4px 0;color:#666">Termin startu</td><td style="padding:4px 0">${esc(str(state.startWhen))}</td></tr>
          <tr><td style="padding:4px 0 8px;color:#666">Lokalizacja</td><td style="padding:4px 0 8px">${esc(locStr)}</td></tr>
        </tbody>
      </table>

      <!-- Cena -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 18px">
        <tbody>
          <tr><td colspan="2" style="padding:10px 0;border-bottom:2px solid #DC9B59"><strong>Cena (orientacyjna)</strong></td></tr>
          <tr><td style="padding:8px 0 4px;color:#666;width:180px">Widełki</td><td style="padding:8px 0 4px"><strong>${esc(money(min))} – ${esc(money(max))}</strong></td></tr>
          <tr><td style="padding:4px 0 8px;color:#666">Cena wyliczona</td><td style="padding:4px 0 8px"><strong>${esc(money(state.price))}</strong></td></tr>
        </tbody>
      </table>

      <!-- Notatki -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 10px">
        <tbody>
          <tr><td style="padding:10px 0;border-bottom:2px solid #DC9B59"><strong>Notatki klienta</strong></td></tr>
          <tr><td style="padding:8px 0;white-space:pre-wrap">${esc((state.notes && String(state.notes)) || '-')}</td></tr>
        </tbody>
      </table>

      <div style="margin-top:14px;color:#888;font-size:12px">
        Lead z: ${esc(window.location.href)}
      </div>
    </div>
  </div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Budowa FormData z pełnego state (Krok 1–8) + załączniki + szablony
  // ──────────────────────────────────────────────────────────────────────────────
  function buildFormDataFromState(state = {}) {
    const fd = new FormData();

    const leadId = state.leadId || (crypto?.randomUUID?.() || String(Date.now()));
    // Temat: zawiera ID oraz widełki jeśli są
    const [min, max] = Array.isArray(state.priceRange) ? state.priceRange : [];
    const priceTag = [min, max].filter(v => v != null).map(v => Number(v).toLocaleString('pl-PL')).join('–');
    fd.append('leadId', leadId);
    fd.append('_subject', `Scandura • Zapytanie #${leadId}${priceTag ? ` • ${priceTag} PLN` : ''}`);
    fd.append('source_url', window.location.href);

    // Klient
    const contact = state.contact || {};
    fd.append('name', contact.name || '');
    fd.append('email', contact.email || '');
    fd.append('_replyto', contact.email || '');
    if (contact.phone) fd.append('phone', contact.phone);
    fd.append('consent', state.contact?.consent ? '1' : '0');

    // Krok 1 – Budynek
    if (typeof state.building === 'string') {
      fd.append('Budynek', state.building);
    } else if (state.building?.type === 'inny') {
      fd.append('Budynek', `inny: ${state.building?.note || ''}`);
    }

    // Krok 2 – Powierzchnia
    if (state.areaChoice != null) fd.append('Powierzchnia (wybór)', String(state.areaChoice));
    if (state.areaExact != null)  fd.append('Powierzchnia (m2)', String(state.areaExact));

    // Krok 3 – Kondygnacje
    if (state.floors != null) fd.append('Kondygnacje', String(state.floors));

    // Krok 4 – Garaż
    if (state.garage != null) fd.append('Garaż', String(state.garage));

    // Krok 5 – Notatki + załączniki
    if (state.notes) fd.append('Notatki klienta', state.notes);
    if (Array.isArray(state.attachments)) {
      let i = 1;
      for (const a of state.attachments) {
        if (a?.file instanceof File) {
          fd.append(`Załącznik_${i}`, a.file, a.name || a.file.name);
          i++;
        }
      }
    }

    // Krok 6 – Termin startu
    if (state.startWhen != null) fd.append('Termin startu', String(state.startWhen));

    // Krok 7 – Lokalizacja
    const loc = state.location || {};
    if (loc.city)    fd.append('Miasto', loc.city);
    if (loc.region)  fd.append('Województwo/Region', loc.region);
    if (loc.country) fd.append('Kraj', loc.country);

    // Krok 8 – Cena
    if (state.price != null) fd.append('Cena wyliczona', String(state.price));
    if (min != null) fd.append('Widełki min', String(min));
    if (max != null) fd.append('Widełki max', String(max));

    // Honeypot
    fd.append('_gotcha', '');

    // SZABLON: główna treść wiadomości (TXT + HTML)
    try {
      const msgTxt  = renderEmailText(state);
      const msgHtml = renderEmailHTML(state);
      fd.append('message', msgTxt);        // wiele klientów pokaże to jako treść
      fd.append('message_html', msgHtml);  // część klientów potrafi wyrenderować HTML
    } catch (e) {
      console.warn('Render email failed:', e);
    }

    return fd;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────────────────
  async function submit(state) {
    const fd = buildFormDataFromState(state);
    const res = await fetch(CONFIG.ACTION, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      // Spróbuj odczytać błąd z JSON
      try {
        const data = await res.json();
        const msg = data?.errors?.map(e => e.message).join('; ') || data?.error || 'Formspree: błąd wysyłki';
        throw new Error(msg);
      } catch {
        throw new Error('Formspree: błąd wysyłki');
      }
    }

    // (opcjonalnie) redirect na stronę "Dziękujemy"
    if (CONFIG.THANKS_URL) {
      try { window.location.assign(CONFIG.THANKS_URL); } catch {}
    }

    return true;
  }

  // Export
  window.CFG_SubmitLeadFormspree = {
    submit,
    config: CONFIG
  };
})();
