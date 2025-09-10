/* ===================================
   Mobile Menu (hamburger + X close)
   =================================== */
(() => {
  'use strict';

  const html = document.documentElement;
  const btn  = document.getElementById('burger-toggle');   // burger w headerze
  const nav  = document.getElementById('mobile-menu');     // overlay nav
  const closeBtn = nav ? nav.querySelector('.header__nav-close') : null; // X w overlayu

  if (!btn || !nav) return;

  const icon = btn.querySelector('.header__burger-icon');

  const ICONS = {
    open: 'photos/svg/burger.svg',
    close: 'photos/svg/x.svg'
  };

  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let lastActive = null;

  const isOpen = () => html.classList.contains('is-menu-open');

  function openMenu() {
    if (isOpen()) return;
    lastActive = document.activeElement;

    html.classList.add('is-menu-open');
    nav.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    nav.setAttribute('aria-hidden', 'false');

    if (icon) icon.setAttribute('src', ICONS.close);

    // focus pierwszy element w menu
    const first = nav.querySelector(FOCUSABLE);
    (first || nav).focus({ preventScroll: true });

    document.addEventListener('keydown', onKeyDown, { passive: false });
    nav.addEventListener('click', onBackdropClick);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  }

  function closeMenu() {
    if (!isOpen()) return;

    html.classList.remove('is-menu-open');
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');

    if (icon) icon.setAttribute('src', ICONS.open);

    (lastActive || btn).focus({ preventScroll: true });

    document.removeEventListener('keydown', onKeyDown);
    nav.removeEventListener('click', onBackdropClick);
    if (closeBtn) closeBtn.removeEventListener('click', closeMenu);
  }

  function toggleMenu() {
    isOpen() ? closeMenu() : openMenu();
  }

  function onBackdropClick(e) {
    // klik w samo tło overlayu
    if (e.target === nav) closeMenu();
    // klik w link zamyka menu
    if (e.target.closest('a[href]')) closeMenu();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      // focus trap
      const focusables = Array.from(nav.querySelectorAll(FOCUSABLE))
        .filter(el => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last  = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
        return;
      }
    }
  }

  // zdarzenia
  btn.addEventListener('click', toggleMenu);

  // stan początkowy
  btn.setAttribute('aria-expanded', 'false');
  nav.setAttribute('aria-hidden', 'true');
})();
