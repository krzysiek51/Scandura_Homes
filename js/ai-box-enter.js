(() => {
  const box = document.querySelector('.configurator-prompt');
  if (!box) return;

  // prefers-reduced-motion → pomijamy animacje
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const els = [
    box.querySelector('.configurator-prompt__badge'),
    box.querySelector('.configurator-prompt__title'),
    box.querySelector('.configurator-prompt__sub'),
    box.querySelector('.configurator-prompt__benefits'),
    ...box.querySelectorAll('.configurator-prompt__benefits li'),
    box.querySelector('.configurator-prompt__cta'),
    box.querySelector('.configurator-prompt__button'),
    box.querySelector('.configurator-prompt__link'),
  ].filter(Boolean);

  // Na start ukryj
  box.classList.add('ai-armed');

  // Gdy dokument gotowy → odpal animację
  window.addEventListener('load', () => {
    box.classList.add('ai-animate');
    els.forEach((el, i) => {
      setTimeout(() => el.classList.add('ai-revealed'), 120 + i * 90);
    });
  });
})();
