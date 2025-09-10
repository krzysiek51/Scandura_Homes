// js/patch-modal-ux.js
// STAŁA RAMA MODALA + naprawa ARIA/focus bez pętli i bez wieszania.

(function () {
  const modal = document.getElementById('cfg-modal');
  if (!modal) return;

  const panel = modal.querySelector('.cfg__panel');

  // ——————————————————————————————————————————————
  // 1) WSTRZYKNIJ STAŁĄ RAMĘ (jeśli nie ma w <head>)
  // ——————————————————————————————————————————————
  (function injectCSS(doc){
    if (doc.getElementById('cfg-fixed-frame-css')) return;
    const css = `
      #cfg-modal .cfg__panel{
        display:grid !important;
        grid-template-rows:auto 1fr auto !important;
        gap:12px !important;
        height:min(88vh,880px) !important;
        width:min(1080px,calc(100vw - 32px)) !important;
        max-width:1080px !important;
        background:#fff !important;
        border-radius:16px !important;
        box-shadow:0 24px 64px rgba(0,0,0,.18) !important;
        overflow:hidden !important;
      }
      #cfg-modal .cfg__panel > .cfg-stepper{grid-row:1/2 !important;min-height:0 !important;}
      #cfg-modal .cfg__panel > .cfg-step{
        grid-row:2/3 !important;min-height:0 !important;
        overflow:auto !important;-webkit-overflow-scrolling:touch;
        padding-inline:8px !important;padding-bottom:16px !important;
      }
      #cfg-modal .cfg__panel > .cfg-step[hidden]{display:none !important;}
      #cfg-modal .cfg__panel > .cfg-nav{
        grid-row:3/4 !important;background:#fff !important;
        border-top:1px solid rgba(0,0,0,.06) !important;
        padding:10px 12px !important;position:sticky !important;bottom:0 !important;z-index:2 !important;
      }
      @media (max-width:1024px){
        #cfg-modal .cfg__panel{height:min(92vh,820px) !important;width:min(100vw - 16px,960px) !important;}
      }
      @media (max-width:480px){
        #cfg-modal .cfg__panel{height:92vh !important;width:calc(100vw - 12px) !important;border-radius:12px !important;}
        #cfg-modal .cfg__panel > .cfg-step{padding-inline:6px !important;}
      }
    `;
    const tag = doc.createElement('style');
    tag.id = 'cfg-fixed-frame-css';
    tag.textContent = css;
    doc.head.appendChild(tag);
  })(document);

  // ——————————————————————————————————————————————
  // 2) FOKUS/ARIA + „inert” dla tła (bez pętli)
  // ——————————————————————————————————————————————
  let lastFocus = null;

  // elementy strony poza modalem (bez <script>/<style>)
  const pageSiblings = Array
    .from(document.body.children)
    .filter(el => el !== modal && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE');

  const isVisible = () =>
    !modal.classList.contains('is-hidden') &&
    getComputedStyle(modal).visibility !== 'hidden';

  const setAriaHidden = (value) => {
    const cur = modal.getAttribute('aria-hidden');
    const val = String(value);
    if (cur !== val) modal.setAttribute('aria-hidden', val);
  };

  const setPageInert = (on) => {
    pageSiblings.forEach(el => {
      const has = el.hasAttribute('inert');
      if (on && !has) el.setAttribute('inert','');
      if (!on && has) el.removeAttribute('inert');
    });
  };

  const focusInside = () => modal.contains(document.activeElement);

  const onOpen = () => {
    setAriaHidden(false);
    modal.setAttribute('aria-modal','true');
    setPageInert(true);
    if (panel) {
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex','-1');
      if (!focusInside()) panel.focus();
    }
  };

  const onClose = () => {
    setPageInert(false);
    setAriaHidden(true);
    if (lastFocus && document.contains(lastFocus)) {
      try { lastFocus.focus(); } catch (_){}
    } else {
      try { document.body.focus(); } catch (_){}
    }
    lastFocus = null;
  };

  // Obserwuj TYLKO zmiany klasy/aria-hidden (bez 'style' → brak lawiny callbacków)
  let ticking = false;
  const sync = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (isVisible()) onOpen(); else onClose();
      ticking = false;
    });
  };

  const mo = new MutationObserver((list) => {
    // jeżeli nic istotnego się nie zmieniło — wyjdź
    const relevant = list.some(m =>
      (m.attributeName === 'class' || m.attributeName === 'aria-hidden'));
    if (relevant) sync();
  });
  mo.observe(modal, { attributes:true, attributeFilter:['class','aria-hidden'] });

  // Zapamiętuj, co otwiera modal
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('.cfg__open, [data-open-configurator], .js-open-configurator, #open-configurator-button');
    if (!opener) return;
    lastFocus = opener;
    // po usunięciu .is-hidden przez Wasz kod — dociągnij fokus/ARIA
    setTimeout(() => { if (isVisible()) onOpen(); }, 0);
  }, true);

  // Klik w krzyżyk: nie zamykamy sami — tylko porządkujemy fokus po zamknięciu
  modal.addEventListener('click', (e) => {
    if (e.target.closest('.cfg__close')) {
      if (!lastFocus) lastFocus = document.activeElement;
    }
  });

  // Stan początkowy
  if (isVisible()) onOpen(); else onClose();
})();
