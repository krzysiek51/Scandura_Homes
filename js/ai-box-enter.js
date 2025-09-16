// ai-box-enter.js
import { AIBoxConfig } from './ai-box-config.js';

(() => {
  const onReady = (fn) =>
    (document.readyState === 'loading')
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const box = document.querySelector('.configurator-prompt');
    if (!box) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const q = (sel, root = box) => root.querySelector(sel);
    const qAll = (sel, root = box) => Array.from(root.querySelectorAll(sel));

    // ——— SEKWENCJA ———
    const elBadge    = q('.configurator-prompt__badge');   // 1
    const elTitle    = q('.configurator-prompt__title');   // 2
    const elSub      = q('.configurator-prompt__sub');
    const elBenefits = q('.configurator-prompt__benefits');
    const liBenefits = qAll('.configurator-prompt__benefits li');
    const elCtaWrap  = q('.configurator-prompt__cta');
    const elBtn      = q('.configurator-prompt__button');
    const elLink     = q('.configurator-prompt__link');

    const headNow = [elBadge, elTitle].filter(Boolean);
    const tailSeq = [
      elSub,
      elBenefits,
      ...liBenefits,
      elCtaWrap,
      elBtn,
      elLink,
    ].filter(Boolean);

    // ——— UZBROJENIE + WŁĄCZENIE TRANSITION ———
    box.classList.add('ai-armed');
    requestAnimationFrame(() => box.classList.add('ai-animate'));

    const revealGroup = (list, baseDelay, stepDelay) => {
      list.forEach((el, i) => {
        el.style.transitionDelay = `${baseDelay + i * stepDelay}ms`;
        el.classList.add('ai-revealed');
      });
    };

    // ——— HARMONOGRAM ———
    setTimeout(() => {
      revealGroup(headNow, 0, AIBoxConfig.delayHeadStep);
    }, AIBoxConfig.delayStart);

    setTimeout(() => {
      revealGroup(tailSeq, AIBoxConfig.delayBase, AIBoxConfig.delayStep);
    }, AIBoxConfig.delayStart + AIBoxConfig.delayGap);
  });
})();
