(() => {
  const sb = document.querySelector('[data-smartbar]');
  if (!sb) return;

  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    sb.hidden = false;
    requestAnimationFrame(() => sb.classList.remove('is-hidden'));
  };

  const hide = () => {
    if (!shown) return;
    sb.classList.add('is-hidden');
  };

  // pokaż po 2s
  const t = setTimeout(show, 2000);

  // lub po pierwszym scrollu 80px
  const onScrollFirst = () => {
    if (window.scrollY > 80) {
      show();
      window.removeEventListener('scroll', onScrollFirst);
      clearTimeout(t);
    }
  };
  window.addEventListener('scroll', onScrollFirst, { passive: true });

  // chowanie przy szybkim scrollu w dół (opcjonalnie)
  let lastY = 0;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const down = y > lastY;
      lastY = y;
      if (down && y > 600) hide();
      else sb.classList.remove('is-hidden');
    },
    { passive: true }
  );

  // analityka (jeśli masz gtag)
  const track = (name) =>
    window.gtag &&
    gtag('event', 'click', {
      event_category: 'smartbar',
      event_label: name,
    });

  sb
    .querySelector('.smartbar__btn--call')
    ?.addEventListener('click', () => track('call'));
  sb
    .querySelector('.smartbar__btn--ai')
    ?.addEventListener('click', () => track('ai'));
})();
