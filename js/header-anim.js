// header-anim.js
import { HeaderAnimConfig } from './header-anim-config.js';

(() => {
  const onReady = (fn) =>
    (document.readyState === 'loading')
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const header = document.querySelector('.header');
    if (!header) return;

    // Szacun dla prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const title = header.querySelector('.header__title');
    const desc  = header.querySelector('.header__description');
    const cta   = header.querySelector('.button--header');

    const seq = [title, desc, cta].filter(Boolean);
    if (!seq.length) return;

    // Uzbrój (ukryj) i aktywuj transition po 1 frame, by uniknąć mrugnięć
    header.classList.add('hero-armed');
    requestAnimationFrame(() => header.classList.add('hero-animate'));

    const reveal = () => {
      seq.forEach((el, i) => {
        el.style.transitionDelay = `${HeaderAnimConfig.delayBase + i * HeaderAnimConfig.delayStep}ms`;
        // dla przycisku — mikro "pop" (jeśli włączony)
        if (HeaderAnimConfig.buttonPop && el === cta) {
          el.classList.add('hero-pop');
        }
        el.classList.add('hero-revealed');
      });
    };

    // Start po delayStart — bez scrolla
    setTimeout(reveal, HeaderAnimConfig.delayStart);
  });
})();
