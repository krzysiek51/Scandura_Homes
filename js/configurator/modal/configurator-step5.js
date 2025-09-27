// js/configurator/modal/configurator-step5.js
(() => {
  'use strict';
  if (!window.ScanduraConfigurator) return;
  if (window.__SCANDURA_CFG_STEP5__) return;
  window.__SCANDURA_CFG_STEP5__ = true;

  const MODAL     = document.getElementById('cfg-modal');
  const BODY      = MODAL.querySelector('[data-cfg="body"]');
  const BTN_PREV  = MODAL.querySelector('[data-cfg="prev"]');
  const BTN_NEXT  = MODAL.querySelector('[data-cfg="next"]');
  const BTN_SKIP  = MODAL.querySelector('[data-cfg="skip"]');
  const { setTitle, setProgress } = window.ScanduraConfigurator;

  const pct = (i, total) => Math.round((i / (total || 8)) * 100);

  // upload config
  const ACCEPT = ['application/pdf','image/jpeg','image/png','image/webp'];
  const MAX_FILES = 10;
  const MAX_SIZE  = 20 * 1024 * 1024; // 20MB

  // Public API
  window.renderStep5 = (state) => {
    state.step = 5;
    state.attachments ||= [];       // [{name,type,size,url,file}]
    state.notes ??= '';             // opcjonalny opis

    // Header
    setTitle('Jeżeli chcesz, możesz podać więcej szczegółów:');
    setProgress(pct(5, state.totalSteps));

    // Footer CTA:
    // DOMYŚLNIE: POMIŃ widoczny, DALEJ ukryty
    if (BTN_PREV) BTN_PREV.hidden = false;
    if (BTN_SKIP) {
    BTN_PREV.hidden = false;

    BTN_SKIP.hidden = false;
    BTN_SKIP.textContent = 'Pomiń';
    BTN_SKIP.classList.add('cfg-btn--primary');   // pomarańcz
    BTN_SKIP.onclick = () => goNext(state);

    BTN_NEXT.textContent = 'Dalej';
    BTN_NEXT.onclick = () => goNext(state);
    BTN_NEXT.hidden = true;                        // pokaże się dopiero po spełnieniu warunku
}

    if (BTN_NEXT) {
      BTN_NEXT.textContent = 'Dalej';
      BTN_NEXT.onclick = () => goNext(state);
      BTN_NEXT.hidden = true; // startowo ukryty
    }

    // Body
    BODY.innerHTML = `
      <section class="cfg-step" data-step="5" aria-describedby="cfg-files-hint">
        <p class="cfg-subtitle">To może pomóc ustalić zakres usługi i ceny.</p>

        <div class="cfg-notes-wrap" style="margin-top:10px;">
          <textarea class="cfg-textarea" rows="6"
            placeholder="Rekomendujemy dodanie opisu, jeśli parametry Twojego projektu są nietypowe. Pomoże to Wykonawcom w wycenie zlecenia."></textarea>
          <p class="cfg-opt__sub" style="margin:6px 0 0;">Napisz 2–3 zdania (min. 10 znaków)</p>
        </div>

        <div style="margin:18px 0 6px; text-align:center;">
          <div class="cfg-opt__label" style="font-size:18px;">Dodaj załączniki:</div>
          <p class="cfg-opt__sub">Zdjęcia są bardzo przydatne podczas określania zakresu usługi i szacowania cen.</p>
        </div>

        <div class="cfg-upload" id="cfgUpload">
          <div class="cfg-drop" data-drop tabindex="0" role="button" aria-label="Upuść pliki tutaj lub kliknij przycisk"></div>
          <input id="cfgFileInput" class="sr-only" type="file" multiple accept=".pdf,image/*" aria-hidden="true" />
          <ul class="cfg-files" id="cfgFilesList" aria-live="polite"></ul>
          <p class="cfg-opt__sub" id="cfg-files-hint" style="margin-top:8px;">
            Obsługiwane: PDF, JPG, PNG, WEBP. Maks. ${MAX_FILES} plików, do 20&nbsp;MB każdy.
          </p>
        </div>
      </section>
    `;

    // Notatka (opcjonalna)
    const notesBox = BODY.querySelector('.cfg-textarea');
    if (notesBox) notesBox.value = state.notes || '';
    notesBox?.addEventListener('input', () => {
      state.notes = notesBox.value;
      updateCtaVisibility(state);
    });

    // Upload
    const input = BODY.querySelector('#cfgFileInput');
    const drop  = BODY.querySelector('[data-drop]');
    const list  = BODY.querySelector('#cfgFilesList');

    // klik w kafel „+” => otwórz selektor plików
    drop?.addEventListener('click', () => input?.click());
    drop?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input?.click(); }
    });

    input?.addEventListener('change', () => {
      if (!input.files?.length) return;
      addFiles([...input.files], state, list);
      input.value = '';
      updateCtaVisibility(state);
    });

    ['dragenter','dragover'].forEach(ev =>
      drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-hover'); })
    );
    ['dragleave','drop'].forEach(ev =>
      drop?.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-hover'); })
    );
    drop?.addEventListener('drop', (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if (!files.length) return;
      addFiles(files, state, list);
      updateCtaVisibility(state);
    });

    // initial render list + CTA
    renderList(state, list);
    updateCtaVisibility(state);

    // Prev -> krok 4
    BTN_PREV && (BTN_PREV.onclick = () => window.renderStep4?.(state));
  };

  // ---- CTA przełączanie: Pomiń <-> Dalej ----
  function updateCtaVisibility(state){
    const hasText  = (state.notes || '').trim().length >= 10;
    const hasFiles = (state.attachments?.length || 0) > 0;
    const showNext = hasText || hasFiles;

    if (BTN_NEXT) BTN_NEXT.hidden = !showNext; // pokaż Dalej gdy spełniony warunek
    if (BTN_SKIP) BTN_SKIP.hidden =  showNext; // ukryj Pomiń gdy spełniony warunek
  }

  // ---- helpers ----
function goNext(state) {
  state.notes = (state.notes || '').trim();

  if (typeof window.renderStep6 === 'function') {
    window.renderStep6(state);
    return;
  }

  // STUB K6 – wyraźnie ustaw własne CTA: DALEJ widoczne, POMIŃ ukryty
  setTitle('Krok 6 — (stub)');
  setProgress(Math.round((6 / (state.totalSteps || 8)) * 100));
  BODY.innerHTML = `
    <div>
      <p>Notatka: <strong>${state.notes ? escapeHtml(state.notes).substring(0,120) + (state.notes.length>120?'…':'') : '—'}</strong></p>
      <p>Załączniki: <strong>${state.attachments.length}</strong> szt.</p>
      <p>(Tu wejdzie Krok 6: Termin startu)</p>
    </div>
  `;

  // CTA w stubie K6:
  BTN_PREV.hidden = false;
  BTN_NEXT.hidden = false;
  BTN_NEXT.textContent = 'Dalej';
  BTN_SKIP.hidden = true;
  BTN_SKIP.classList.remove('cfg-btn--primary');
}


  function addFiles(files, state, list) {
    let current = state.attachments.length;
    for (const file of files) {
      if (current >= MAX_FILES) { toast('Osiągnięto limit plików.'); break; }
      if (!ACCEPT.includes(file.type)) { toast(`Nieobsługiwany typ: ${file.name}`); continue; }
      if (file.size > MAX_SIZE) { toast(`Za duży plik: ${file.name}`); continue; }
      const url = URL.createObjectURL(file);
      state.attachments.push({ name:file.name, type:file.type, size:file.size, url, file });
      current++;
    }
    renderList(state, list);
  }

  function renderList(state, list) {
    if (!list) return;
    list.innerHTML = '';
    state.attachments.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'cfg-file';
      li.innerHTML = `
        <div class="cfg-file__preview">${previewTemplate(item)}</div>
        <div class="cfg-file__meta">
          <div class="cfg-file__name">${escapeHtml(item.name)}</div>
          <div class="cfg-file__sub">${prettySize(item.size)}</div>
        </div>
        <button type="button" class="cfg-btn" data-remove="${idx}" aria-label="Usuń ${escapeHtml(item.name)}">Usuń</button>
      `;
      list.appendChild(li);
    });

    // usuń
    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-remove'));
        const item = state.attachments[i];
        try { if (item?.url) URL.revokeObjectURL(item.url); } catch {}
        state.attachments.splice(i, 1);
        renderList(state, list);
        updateCtaVisibility(state);
      });
    });
  }

  function previewTemplate(item) {
    if (item.type.startsWith('image/')) {
      return `<img src="${item.url}" alt="" class="cfg-file__img">`;
    }
    return `<span class="cfg-file__icon" aria-hidden="true">📄</span>`;
  }

  function prettySize(bytes) {
    const mb = bytes / (1024*1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${Math.ceil(kb)} KB`;
  }

  function toast(msg){ console.warn('[CFG]', msg); }

  function escapeHtml(s=''){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
})();
