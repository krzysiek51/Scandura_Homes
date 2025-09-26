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

  const pct = (i, total) => Math.round((i / total) * 100);

  // upload config
  const ACCEPT = ['application/pdf','image/jpeg','image/png','image/webp'];
  const MAX_FILES = 10;
  const MAX_SIZE  = 20 * 1024 * 1024; // 20MB

  window.renderStep5 = (state) => {
    state.step = 5;
    state.attachments ||= [];       // [{name,type,size,url,file}]
    state.notes ??= '';             // opcjonalny opis

    setTitle('Jeżeli chcesz, możesz podać więcej szczegółów:');
    setProgress(pct(5, state.totalSteps));

    BTN_PREV.hidden = false;
    // Step 5: tylko „Pomiń”
    if (BTN_NEXT) BTN_NEXT.hidden = true;
    if (BTN_SKIP) {
      BTN_SKIP.hidden = false;
      BTN_SKIP.textContent = 'Pomiń';
      BTN_SKIP.onclick = () => goNext(state);
    }

    BODY.innerHTML = `
      <section class="cfg-step" data-step="5" aria-describedby="cfg-files-hint">
        <div class="cfg-notes-wrap">
          <p class="cfg-opt__sub" style="text-align:center; margin:4px 0 10px;">
            To może pomóc ustalić zakres usługi i ceny.
          </p>
          <textarea class="cfg-textarea" rows="6"
            placeholder="Rekomendujemy dodanie opisu, jeśli parametry Twojego projektu są nietypowe. Pomoże to Wykonawcom w wycenie zlecenia."></textarea>
          <p class="cfg-opt__sub" style="margin:6px 0 0;">Napisz 2–3 zdania (min. 10 znaków)</p>
        </div>

        <div style="margin:18px 0 6px; text-align:center;">
          <div class="cfg-opt__label" style="font-size:18px;">Dodaj załączniki:</div>
          <p class="cfg-opt__sub">Zdjęcia są bardzo przydatne podczas określania zakresu usługi i szacowania cen.</p>
        </div>

        <div class="cfg-upload" id="cfgUpload">
          <div class="cfg-drop" data-drop tabindex="0" role="button" aria-label="Upuść pliki tutaj lub kliknij przycisk">
            <p class="cfg-opt__sub" style="margin:0 0 8px;">Przeciągnij i upuść pliki tutaj</p>
            <button type="button" class="cfg-btn" data-action="pick">Dodaj pliki</button>
          </div>

          <input id="cfgFileInput" class="sr-only" type="file" multiple
                 accept=".pdf,image/*" aria-hidden="true" />

          <ul class="cfg-files" id="cfgFilesList" aria-live="polite"></ul>

          <p class="cfg-opt__sub" id="cfg-files-hint" style="margin-top:8px;">
            Obsługiwane: PDF, JPG, PNG, WEBP. Maks. ${MAX_FILES} plików, do 20&nbsp;MB każdy.
          </p>
        </div>
      </section>
    `;

    // odtwórz opis
    const notesBox = BODY.querySelector('.cfg-textarea');
    if (notesBox) notesBox.value = state.notes || '';
    notesBox?.addEventListener('input', () => {
      state.notes = notesBox.value;
    });

    // upload: UI & logika
    const input   = BODY.querySelector('#cfgFileInput');
    const drop    = BODY.querySelector('[data-drop]');
    const list    = BODY.querySelector('#cfgFilesList');
    const pickBtn = BODY.querySelector('[data-action="pick"]');

    renderList(state, list);

    pickBtn?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', () => {
      if (!input.files?.length) return;
      addFiles([...input.files], state, list);
      input.value = '';
    });

    ['dragenter','dragover'].forEach(ev =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-hover'); })
    );
    ['dragleave','drop'].forEach(ev =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-hover'); })
    );
    drop.addEventListener('drop', (e) => {
      const files = [...(e.dataTransfer?.files || [])];
      if (!files.length) return;
      addFiles(files, state, list);
    });

    // prev -> krok 4
    BTN_PREV.onclick = () => window.renderStep4?.(state);
  };

  function goNext(state) {
    // notatki są opcjonalne, ale jeśli użytkownik coś wpisał i ma <10 znaków — przytnij/ignoruj bez blokady
    if ((state.notes || '').trim().length < 10) {
      state.notes = (state.notes || '').trim(); // zostaw jak jest; krok jest opcjonalny
    }

    if (typeof window.renderStep6 === 'function') {
      window.renderStep6(state);
      return;
    }
    // STUB, zanim powstanie Step 6
    setTitle('Krok 6 — (stub)');
    setProgress( Math.round((6 / (state.totalSteps || 8)) * 100) );
    BODY.innerHTML = `
      <div>
        <p>Notatka: <strong>${state.notes ? state.notes.substring(0,120) + (state.notes.length>120?'…':'') : '—'}</strong></p>
        <p>Załączniki: <strong>${state.attachments.length}</strong> szt.</p>
        <p>(Tu wejdzie Krok 6: Termin startu)</p>
      </div>
    `;
    // ukryj „Pomiń” na stubie
    const BTN_SKIP = MODAL.querySelector('[data-cfg="skip"]');
    if (BTN_SKIP) BTN_SKIP.hidden = true;
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

    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-remove'));
        const item = state.attachments[i];
        try { if (item?.url) URL.revokeObjectURL(item.url); } catch {}
        state.attachments.splice(i, 1);
        renderList(state, list);
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
