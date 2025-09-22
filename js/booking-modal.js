// /js/booking-modal.js
(() => {
  'use strict';

  // API base ustaw w HTML, np.:
  // <script>window.BOOKING_API_BASE='http://localhost:3001'</script>
  const API_BASE = (window.BOOKING_API_BASE || '').replace(/\/+$/, '');
  const API = {
    slots:     `${API_BASE}/api/slots`,
    slotsMeta: `${API_BASE}/api/slots/meta`,
    booking:   `${API_BASE}/api/booking`,
  };

  // --- state ---
  let state = { type: 'IN_PERSON', startAt: null, endAt: null, _visibleDays: 2 };

  // --- dom helpers ---
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // --- refs ---
  const modal         = $('#bookingModal');
  const closeBtn      = $('[data-bm="close"]', modal);
  const toastEl       = $('#bmToast');

  const stepType      = $('[data-step="type"]', modal);
  const stepSlot      = $('[data-step="slot"]', modal);
  const stepDetails   = $('[data-step="details"]', modal);

  const leadTimeEl    = $('#bmLeadTime');
  const slotsWrap     = $('#bmSlots');
  const emptyEl       = $('#bmEmpty');
  const chosenEl      = $('#bmChosen');
  const moreWrap      = $('#bmMoreWrap');
  const moreBtn       = $('#bmMoreBtn');

  const nextTypeBtn   = $('[data-bm="next-type"]', modal);
  const backToTypeBtn = $('[data-bm="back-to-type"]', modal);
  const nextSlotBtn   = $('[data-bm="next-slot"]', modal);
  const backToSlotBtn = $('[data-bm="back-to-slot"]', modal);

  const form          = $('#bmForm');
  const addressWrap   = $('#bmAddressWrap');

  // --- utils ---
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    setTimeout(()=> toastEl.style.display='none', 2200);
  }

  function show(step){
    [stepType, stepSlot, stepDetails].forEach(s => s.hidden = true);
    step.hidden = false;
    const f = step.querySelector('button,[href],input,select,textarea');
    if (f) f.focus({preventScroll:true});
  }

  // API
  async function loadLeadTime(){
    try{
      const r = await fetch(`${API.slotsMeta}?type=${encodeURIComponent(state.type)}`);
      if (!r.ok) return;
      const j = await r.json();
      if (j.nextAvailableAt){
        const dt = new Date(j.nextAvailableAt);
        leadTimeEl.textContent = `Najbliższy dostępny od: ${dt.toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'})}`;
        leadTimeEl.hidden = false;
      } else leadTimeEl.hidden = true;
    }catch{}
  }

  async function fetchSlots(){
    try{
      const r = await fetch(`${API.slots}?type=${encodeURIComponent(state.type)}`);
      if (!r.ok) throw 0;
      const j = await r.json();
      return Array.isArray(j.slots) ? j.slots : [];
    }catch{
      toast('Nie udało się pobrać wolnych terminów.');
      return [];
    }
  }

  // formaty
  const TZ = { timeZone: 'Europe/Warsaw' };
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('pl-PL',{ hour:'2-digit', minute:'2-digit', ...TZ });
  const keyDay  = (iso) => {
    const d = new Date(iso);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  };
  function prettyDayLabel(iso){
    const d = new Date(iso);
    const now = new Date();
    const dKey = keyDay(d.toISOString());
    const todayKey = keyDay(now.toISOString());
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
    const tomorrowKey = keyDay(tomorrow.toISOString());
    if (dKey === todayKey)    return 'Dziś';
    if (dKey === tomorrowKey) return 'Jutro';
    return d.toLocaleDateString('pl-PL', { weekday:'short', day:'2-digit', month:'short', ...TZ });
  }
  function groupByDay(slots){
    const map = new Map();
    for (const s of slots){
      const k = keyDay(s.startAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
    return Array.from(map.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,items]) => ({ key:k, label: prettyDayLabel(items[0].startAt), items }));
  }

  // --- render slotów (czytelna „tabelka” dni -> godziny) ---
  function renderSlots(slots){
    slotsWrap.innerHTML = '';
    chosenEl.hidden = true;
    chosenEl.textContent = '';
    nextSlotBtn.disabled = true;

    if (!slots.length){
      emptyEl.hidden = false;
      moreWrap.hidden = true;
      return;
    }
    emptyEl.hidden = true;

    const groups = groupByDay(slots);
    // ile dni pokazać (domyślnie 2, potem „Pokaż więcej”)
    const view = groups.slice(0, state._visibleDays);

    // render dni
    for (const g of view){
      const day = document.createElement('div');
      day.className = 'bm-day';

      const h = document.createElement('div');
      h.className = 'bm-day__header';
      h.textContent = g.label;
      day.appendChild(h);

      const grid = document.createElement('div');
      grid.className = 'bm-day__grid';

      for (const s of g.items){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bm-slot';
        btn.innerHTML = `<div>${fmtTime(s.startAt)}–${fmtTime(s.endAt)}</div>`;
        btn.addEventListener('click', ()=>{
          $$('.bm-slot', slotsWrap).forEach(x => x.classList.remove('is-active'));
          btn.classList.add('is-active');
          state.startAt = s.startAt;
          state.endAt   = s.endAt;
          nextSlotBtn.disabled = false;

          chosenEl.textContent = `Wybrano: ${prettyDayLabel(s.startAt)}, ${fmtTime(s.startAt)}–${fmtTime(s.endAt)}`;
          chosenEl.hidden = false;

          btn.scrollIntoView({ block:'nearest', behavior:'smooth' });
        });
        grid.appendChild(btn);
      }

      day.appendChild(grid);
      slotsWrap.appendChild(day);
    }

    // Pokaż więcej
    if (moreWrap && moreBtn){
      if (groups.length > state._visibleDays){
        moreWrap.hidden = false;
        moreBtn.onclick = () => { state._visibleDays += 2; renderSlots(slots); };
      } else {
        moreWrap.hidden = true;
      }
    }
  }

  // --- walidacje formularza i submit ---
  function clearErrors(){ $$('[data-err]', form).forEach(e=>e.textContent=''); }
  function setErr(name,msg){ const el = $(`[data-err="${name}"]`, form); if (el) el.textContent = msg||''; }

  async function onSubmit(e){
    e.preventDefault(); clearErrors();

    const fd = new FormData(form);
    const payload = {
      type: state.type,
      startAt: state.startAt,
      endAt: state.endAt,
      address: state.type === 'IN_PERSON' ? (fd.get('address') || '').toString().trim() : undefined,
      notes: (fd.get('notes') || '').toString().trim() || undefined,
      customer: {
        name:  (fd.get('client_name')  || '').toString().trim(),
        email: (fd.get('client_email') || '').toString().trim(),
        phone: (fd.get('client_phone') || '').toString().trim(),
      }
    };

    // frontend validation
    if (!payload.customer.name)  setErr('client_name','Wpisz imię i nazwisko.');
    if (!payload.customer.email || !/.+@.+\..+/.test(payload.customer.email)) setErr('client_email','Podaj poprawny e-mail.');
    if (payload.type==='IN_PERSON' && !payload.address) setErr('address','Adres wymagany dla spotkania na żywo.');
    if (!payload.startAt) toast('Wybierz termin.');
    if ($$('[data-err]',form).some(n=>n.textContent.trim().length)) return;

    $('[data-bm="submit"]', form).disabled = true;
    try{
      const r = await fetch(API.booking,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });

      if (r.status === 409){
        toast('Wybrany slot jest już zajęty. Odświeżam…');
        renderSlots(await fetchSlots()); show(stepSlot); return;
      }
      if (r.status === 400){
        const j = await r.json().catch(()=>({}));
        const fe = j?.details?.fieldErrors || {};
        if (fe['customer.name'])  setErr('client_name',  fe['customer.name'][0]);
        if (fe['customer.email']) setErr('client_email', fe['customer.email'][0]);
        if (fe['customer.phone']) setErr('client_phone', fe['customer.phone'][0]);
        if (fe['address'])        setErr('address',       fe['address'][0]);
        if (!Object.keys(fe).length) toast('Błąd walidacji.');
        return;
      }
      if (!r.ok){ toast('Błąd serwera.'); return; }

      const j = await r.json();
      const b = j.booking || {};
      gtagSafe('event','purchase',{
        value: 0,
        currency: 'PLN',
        booking_id: b.id,
        startAt: b.startAt || payload.startAt,
        type: payload.type
      });
      toast('Zarezerwowane! Sprawdź e-mail.');
      closeModal();
    }catch(err){
      console.error(err); toast('Błąd połączenia.');
    }finally{
      $('[data-bm="submit"]', form).disabled = false;
    }
  }

  function gtagSafe(...a){ try{ if (typeof gtag==='function') gtag(...a); }catch{} }

  // --- API publiczne ---
  function openBookingModal({preferredType='IN_PERSON'} = {}){
    state = { type: preferredType, startAt:null, endAt:null, _visibleDays: 2 };
    $$('input[name="bm_type"]').forEach(r=> r.checked = (r.value===preferredType));
    addressWrap.style.display = state.type==='IN_PERSON' ? '' : 'none';
    show(stepType); nextSlotBtn.disabled = true;

    modal.hidden = false; modal.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('cb-lock');

    loadLeadTime();
    (async()=>{ renderSlots(await fetchSlots()); })();
    bindOnce();
    gtagSafe('event','begin_checkout',{ type: state.type });
  }

  function closeModal(){
    modal.hidden = true; modal.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('cb-lock');
  }

  function bindOnce(){
    if (modal.__bound) return; modal.__bound = true;

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e)=>{ if (e.target===modal || e.target.dataset.bm==='backdrop') closeModal(); });

    $$('input[name="bm_type"]').forEach(r=>{
      r.addEventListener('change', ()=>{
        state.type = r.value;
        addressWrap.style.display = state.type==='IN_PERSON' ? '' : 'none';
        loadLeadTime();
        state._visibleDays = 2;
        (async()=>{ renderSlots(await fetchSlots()); })();
      });
    });

    nextTypeBtn.addEventListener('click', async ()=>{
      show(stepSlot); nextSlotBtn.disabled = true;
      state._visibleDays = 2;
      renderSlots(await fetchSlots());
      gtagSafe('event','add_payment_info',{ type: state.type, step:'slot_select' });
    });

    backToTypeBtn.addEventListener('click', ()=> show(stepType));
    nextSlotBtn.addEventListener('click', ()=> show(stepDetails));
    backToSlotBtn.addEventListener('click', ()=> show(stepSlot));
    form.addEventListener('submit', onSubmit);
  }

  // wystawiamy globalnie
  window.openBookingModal = openBookingModal;
})();
