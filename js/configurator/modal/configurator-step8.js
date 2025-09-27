/* js/configurator/modal/configurator-step8.js */
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP8__) return;
  window.__SCANDURA_CFG_STEP8__ = true;

  // ===== odporne selektory modala =====
  const MODAL =
    document.getElementById('cfg-modal') ||
    document.querySelector('[data-cfg="root"]') ||
    document.querySelector('.cfg-modal') ||
    document.querySelector('[role="dialog"]') ||
    document;

  const qIn = (sel) =>
    (MODAL && MODAL.querySelector && MODAL.querySelector(sel)) ||
    document.querySelector(sel);

  const BODY     = qIn('[data-cfg="body"]') || qIn('.cfg-body, main.cfg-body') || document.body;
  const BTN_PREV = qIn('[data-cfg="prev"]');
  const BTN_NEXT = qIn('[data-cfg="next"]');
  const BTN_SKIP = qIn('[data-cfg="skip"]');

  const { setTitle, setProgress } = window.ScanduraConfigurator;

  // ==== ENDPOINT (ustaw w index.html, np. <script>window.FORMSPREE_ENDPOINT='https://formspree.io/f/xxxxx'</script>)
  const FORMSPREE_ENDPOINT =
    window.FORMSPREE_ENDPOINT ||
    window.__CFG_FORMSPREE_ENDPOINT ||
    null; // null => DEV (symulacja)
  const DEV_SIMULATE_SUCCESS = !FORMSPREE_ENDPOINT;

  const pct = (i, total=8) => Math.round((i / (total || 8)) * 100);

  // Walidacja
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const PHONE_RE = /^[\s\d()+\-]{6,}$/;

  // Środek zakresu m² (fallback)
  function midFromRange(key){
    const map = { '0-35':25,'36-70':55,'71-100':85,'101-150':125,'151-200':175,'200-250':225 };
    return map[key] || null;
  }

  // === NORMALIZACJA STATE (obsługa Twojej struktury i starszej) ===
  function normChoice(x) {
    if (!x) return { label:'', key:'' };
    if (typeof x === 'string') return { label:x, key:x };
    if (typeof x === 'object') {
      const label = x.label ?? x.value ?? '';
      const key   = x.key   ?? x.value ?? '';
      return { label: String(label), key: String(key) };
    }
    return { label:'', key:'' };
  }

  function normArea(area) {
    if (area == null) return { exact:null, choice:'' };
    if (typeof area === 'number') return { exact:area, choice:'' };
    if (typeof area === 'string') return { exact:null, choice:area };
    if (typeof area === 'object') {
      if (area.type === 'exact')  return { exact: Number(area.value) || null, choice:'' };
      if (area.type === 'preset') return { exact:null, choice: String(area.value || '') };
    }
    return { exact:null, choice:'' };
  }

  function normStart(start) {
    if (!start) return { label:'', date:'' };
    if (typeof start === 'object') return { label: start.label || '', date: start.date || '' };
    if (typeof start === 'string') {
      const map = { asap:'ASAP', '1m':'w miesiącu', '3m':'w 3 mies.', '6m':'w 6 mies.', agree:'do uzgodnienia' };
      return { label: map[start] || start, date:'' };
    }
    return { label:'', date:'' };
  }

  function normShell(state) {
    // stan bywa w `scope` (Twoja struktura) lub w `shell` (stara)
    const src = state.shell ?? state.scope;
    return normChoice(src);
  }

  function normAll(state) {
    const building = normChoice(state.building);
    const roof     = normChoice(state.roof);
    const shell    = normShell(state);
    const area     = normArea(state.area ?? (state.areaExact!=null ? {type:'exact', value:state.areaExact} : {type:'preset', value:state.areaChoice}));
    const start    = normStart(state.start);
    const city     = state.location?.city || '';
    const country  = state.location?.country || '';
    return { building, roof, shell, area, start, city, country };
  }

  function summaryFromNorm(n) {
    const m2 = n.area.exact != null ? `${n.area.exact} m²` : (n.area.choice || '—');
    return [
      `Typ: ${n.building.label || '—'}`,
      `Pow.: ${m2}`,
      `Dach: ${n.roof.label || '—'}`,
      `Stan: ${n.shell.label || '—'}`,
      `Start: ${n.start.label || n.start.date || '—'}`,
      `Lokalizacja: ${n.city || '—'}, ${n.country || '—'}`
    ].join(' | ');
  }

  // ===== RENDER KROKU 8 =====
  window.renderStep8 = (state) => {
    state.step = 8;
    state.totalSteps ||= 8;
    state.contact ||= { name: '', email: '', phone: '', consent: false };

    setTitle?.('Dane kontaktowe');
    setProgress?.(pct(8, state.totalSteps));

    // stopka
    if (BTN_PREV) { BTN_PREV.hidden = false; BTN_PREV.onclick = () => window.renderStep7?.(state); }
    if (BTN_NEXT) { BTN_NEXT.hidden = false; BTN_NEXT.textContent = 'Pokaż cenę'; BTN_NEXT.onclick = () => onSubmit(state); }
    if (BTN_SKIP) { BTN_SKIP.hidden = true; BTN_SKIP.classList?.remove('cfg-btn--primary'); }

    // widok
    BODY.innerHTML = `
      <form class="cfg-step" data-step="8" novalidate>
        <fieldset class="cfg-list">
          <legend class="sr-only">Podaj dane kontaktowe</legend>

          <div class="cfg-field">
            <label class="cfg-opt__label" for="cfg-name">Imię i nazwisko <span class="cfg-opt__sub">(wymagane)</span></label>
            <input id="cfg-name" class="cfg-input" type="text" autocomplete="name" placeholder="np. Jan Kowalski"
                   value="${esc(state.contact.name)}" required>
            <div class="cfg-error" data-err="name" hidden></div>
          </div>

          <div class="cfg-field">
            <label class="cfg-opt__label" for="cfg-email">E-mail <span class="cfg-opt__sub">(wymagane)</span></label>
            <input id="cfg-email" class="cfg-input" type="email" inputmode="email" autocomplete="email"
                   placeholder="np. jan@domena.pl" value="${esc(state.contact.email)}" required>
            <div class="cfg-error" data-err="email" hidden></div>
          </div>

          <div class="cfg-field">
            <label class="cfg-opt__label" for="cfg-phone">Telefon <span class="cfg-opt__sub">(opcjonalnie)</span></label>
            <input id="cfg-phone" class="cfg-input" type="tel" inputmode="tel" autocomplete="tel"
                   placeholder="np. 600 700 800" value="${esc(state.contact.phone || '')}">
            <div class="cfg-error" data-err="phone" hidden></div>
          </div>

          <label class="cfg-check" style="display:flex;gap:10px;align-items:flex-start;margin-top:6px;">
            <input id="cfg-consent" type="checkbox" ${state.contact.consent ? 'checked' : ''} />
            <span>Wyrażam zgodę na kontakt w sprawie przygotowania oferty i akceptuję politykę prywatności.</span>
          </label>
          <div class="cfg-error" data-err="consent" hidden></div>

          <div class="cfg-error" data-err="form" hidden style="margin-top:8px"></div>
        </fieldset>
      </form>
    `;

    // czyszczenie błędów
    BODY.addEventListener('input', onEditClear, { passive: true });
    BODY.addEventListener('change', onEditClear, { passive: true });
  };

  function onEditClear(e){
    const map = { 'cfg-name':'name','cfg-email':'email','cfg-phone':'phone','cfg-consent':'consent' };
    const id = e.target?.id;
    const key = map[id];
    if (!key) return;
    const err = BODY.querySelector(`[data-err="${key}"]`);
    if (err) hideErr(err);
    const formErr = BODY.querySelector('[data-err="form"]');
    if (formErr) hideErr(formErr);
  }

  // ===== WALIDACJA + ZEBRANIE =====
  function onSubmit(state){
    const nameEl    = BODY.querySelector('#cfg-name');
    const emailEl   = BODY.querySelector('#cfg-email');
    const phoneEl   = BODY.querySelector('#cfg-phone');
    const consentEl = BODY.querySelector('#cfg-consent');

    const name    = (nameEl?.value || '').trim();
    const email   = (emailEl?.value || '').trim();
    const phone   = (phoneEl?.value || '').trim();
    const consent = !!consentEl?.checked;

    let ok = true;
    if (name.length < 2){ showErr('name','Podaj imię i nazwisko (min. 2 znaki).'); ok = false; }
    if (!EMAIL_RE.test(email)){ showErr('email','Podaj prawidłowy adres e-mail.'); ok = false; }
    if (phone && !PHONE_RE.test(phone)){ showErr('phone','Podaj prawidłowy numer telefonu lub pozostaw puste.'); ok = false; }
    if (!consent){ showErr('consent','Zaznacz zgodę, aby przejść dalej.'); ok = false; }

    if (!ok){
      const firstErr = BODY.querySelector('.cfg-error:not([hidden])');
      if (firstErr){
        const field = firstErr.previousElementSibling?.tagName === 'INPUT'
          ? firstErr.previousElementSibling
          : BODY.querySelector('#cfg-name');
        field?.focus();
      }
      return;
    }

    // zapis do state
    state.contact = { name, email, phone, consent: true };

    // widełki (jeśli price-engine jest podpięty) + fallback m²
    try {
      const est = window.computePrice?.(state);
      if (est && typeof est.min === 'number' && typeof est.max === 'number') {
        state.price_est_min = est.min;
        state.price_est_max = est.max;
        if (est.m2) state.areaComputed = est.m2;
      } else if (!state.areaExact && state.areaChoice) {
        state.areaComputed = midFromRange(state.areaChoice);
      }
    } catch(e){ /* no-op */ }

    // WYŚLIJ
    sendNow(state);
  }

  // ===== WYSYŁKA DO FORMSPREE (pełne dane 1–8) =====
  async function sendNow(state){
    setBusy(BTN_NEXT, true);
    hideAllErrors();

    // znormalizuj stan (czytelne etykiety/klucze)
    const N = normAll(state);

    // FormData — pełne dane + state_json
    const fd = new FormData();

    // K8 — kontakt
    fd.append('name',  state.contact?.name  || '');
    fd.append('email', state.contact?.email || '');
    if (state.contact?.phone) fd.append('phone', state.contact.phone);
    fd.append('consent', String(!!state.contact?.consent));

    // K5 + lokalizacja + skrót
    if (state.notes) fd.append('notes', state.notes);
    fd.append('location_city',    N.city);
    fd.append('location_country', N.country);
    fd.append('location', `${N.city}${N.city && N.country ? ', ' : ''}${N.country}`);

    // summary z normalizacji (czytelny)
    fd.append('summary', summaryFromNorm(N));

    // widełki / cena
    if (state.price_est_min != null || state.price_est_max != null) {
      fd.append('meta', JSON.stringify({
        price_est_min: state.price_est_min ?? null,
        price_est_max: state.price_est_max ?? null
      }));
    }
    if (state.price != null)        fd.append('price_exact', String(state.price));
    if (state.areaComputed != null) fd.append('area_computed', String(state.areaComputed));

    // K1–K7 spłaszczone (z norm)
    if (N.area.exact != null) fd.append('area_exact', String(N.area.exact));
    fd.append('area_choice', N.area.choice);

    fd.append('building_label', N.building.label);
    fd.append('building_key',   N.building.key);

    fd.append('roof_label', N.roof.label);
    fd.append('roof_key',   N.roof.key);

    fd.append('shell_label', N.shell.label);
    fd.append('shell_key',   N.shell.key);

    fd.append('start_label', N.start.label);
    fd.append('start_date',  N.start.date);

    // liczniki
    fd.append('notes_len', String((state.notes || '').length));
    fd.append('attachments_count', String(Array.isArray(state.attachments) ? state.attachments.length : 0));

    // pełny stan JSON (tekst, nie Blob)
    fd.append('state_json', JSON.stringify(state));

    // załączniki (opcjonalnie)
    if (Array.isArray(state.attachments)) {
      state.attachments.forEach((att) => {
        if (att?.file instanceof File) fd.append('attachments[]', att.file, att.file.name);
      });
    }

    try {
      if (DEV_SIMULATE_SUCCESS) {
        await delay(300);
        setBusy(BTN_NEXT, false);
        return goToPrice(state);
      }

      const resp = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: fd
      });

      let data = null; try { data = await resp.clone().json(); } catch {}
      if (!resp.ok) throw new Error(`Formspree HTTP ${resp.status}`);

      setBusy(BTN_NEXT, false);
      goToPrice(state);
    } catch (err) {
      console.error(err);
      setBusy(BTN_NEXT, false);
      const errBox = BODY.querySelector('[data-err="form"]');
      if (errBox) { errBox.textContent = 'Błąd wysyłki. Spróbuj ponownie.'; errBox.hidden = false; }
      else alert('Błąd wysyłki. Spróbuj ponownie.');
    }
  }

  function goToPrice(state){
    if (typeof window.renderPrice === 'function'){ window.renderPrice(state); return; }
    if (typeof window.renderSummary === 'function'){ window.renderSummary(state); return; }

    // fallback stub
    setTitle?.('Twoja wycena — (stub)');
    setProgress?.(100);
    BODY.innerHTML = `
      <div>
        <p>Dziękujemy, ${esc(state.contact?.name || '')}. Wysłaliśmy potwierdzenie na <strong>${esc(state.contact?.email || '')}</strong>.</p>
        <p>(Tutaj pojawi się animacja liczenia i wynik wyceny z wariantami.)</p>
      </div>
    `;
  }

  // ===== helpers =====
  function hideAllErrors(){ BODY.querySelectorAll('.cfg-error').forEach(el => { el.hidden = true; el.textContent=''; }); }
  function setBusy(btn, busy){ if (!btn) return; btn.disabled = !!busy; btn.setAttribute('aria-busy', busy ? 'true' : 'false'); }
  function delay(ms){ return new Promise(r => setTimeout(r, ms)); }
  function showErr(key, msg){ const el = BODY.querySelector(`[data-err="${key}"]`); if (!el) return; el.textContent = msg; el.hidden = false; }
  function hideErr(el){ el.hidden = true; el.textContent = ''; }
  function esc(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

  // Auto-mount (jeśli już jesteś na step=8, a widoku nie ma)
  setTimeout(() => {
    const st = window.ScanduraConfigurator?.state;
    if (st?.step === 8 && !BODY.querySelector('form[data-step="8"]')) {
      window.renderStep8(st);
    }
  }, 0);
})();
