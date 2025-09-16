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
    const isMobile = window.matchMedia(`(max-width:${AIBoxConfig.breakpoints.mobileMax}px)`).matches;

    // Elements
    const elBadge    = q('.configurator-prompt__badge');
    const elTitle    = q('.configurator-prompt__title');
    const elSub      = q('.configurator-prompt__sub');
    const elBenefits = q('.configurator-prompt__benefits');
    const liBenefits = qAll('.configurator-prompt__benefits li');
    const elCtaWrap  = q('.configurator-prompt__cta');
    const elBtn      = q('.configurator-prompt__button');
    const elLink     = q('.configurator-prompt__link');

    // HEAD (pojawia się od razu): badge + title + sub
    const headNow = [elBadge, elTitle, elSub].filter(Boolean);

    // TAIL (ma wejść po lekkim scrollu na mobile)
    const tailSeq = [
      elBenefits,
      ...liBenefits,
      elCtaWrap,
      elBtn,
      elLink,
    ].filter(Boolean);

    // Arm + transitions
    box.classList.add('ai-armed');
    requestAnimationFrame(() => box.classList.add('ai-animate'));

    const revealGroup = (list, baseDelay, stepDelay) => {
      list.forEach((el, i) => {
        el.style.transitionDelay = `${baseDelay + i * stepDelay}ms`;
        el.classList.add('ai-revealed');
      });
    };

    // HEAD — bez scrolla
    setTimeout(() => {
      revealGroup(headNow, 0, AIBoxConfig.delayHeadStep);
    }, AIBoxConfig.delayStart);

    // === TAIL ===
    let cleanupGate = null;
    let gateTimer = null;
    const gateCfg = AIBoxConfig.mobileScrollGate;

    const clearGateTimer = () => {
      if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
    };

    const revealTail = () => {
      if (revealTail._done) return;
      revealTail._done = true;
      clearGateTimer();
      revealGroup(tailSeq, AIBoxConfig.delayBase, AIBoxConfig.delayStep);
      if (typeof cleanupGate === 'function') cleanupGate();
    };

    // Tablet/Desktop — stary tryb (po gapie)
    if (!isMobile || !gateCfg.enabled) {
      setTimeout(revealTail, AIBoxConfig.delayStart + AIBoxConfig.delayGap);
      return;
    }

    // MOBILE — wymagamy prawdziwego scrolla + odsłonięcia min. offsetPx
    const gatePx = Math.max(0, Number(gateCfg.offsetPx) || 0);
    let scrolledOnce = false; // <-- KLUCZ: bez tego ogon nie wejdzie

    const passedGate = () => {
      const rect = box.getBoundingClientRect();
      const coverageFromTop = window.innerHeight - rect.top; // ile px AI box wszedł do viewportu od góry
      return rect.bottom > 0 && rect.top < window.innerHeight && coverageFromTop >= gatePx;
    };

    const armTailAfterGate = () => {
      if (revealTail._done || gateTimer) return;
      gateTimer = setTimeout(revealTail, Math.max(0, Number(gateCfg.delayMs) || 0));
    };

    const tryReveal = () => {
      if (!scrolledOnce) return;        // wymagamy realnego scrolla użytkownika
      if (passedGate()) armTailAfterGate();
    };

    const opts = { passive: true };
    const onScroll = () => { scrolledOnce = true; tryReveal(); };
    const onTouchMove = () => { scrolledOnce = true; tryReveal(); };
    const onWheel = () => { scrolledOnce = true; tryReveal(); };

    window.addEventListener('scroll', onScroll, opts);
    window.addEventListener('touchmove', onTouchMove, opts);
    window.addEventListener('wheel', onWheel, opts);

    let io;
    if ('IntersectionObserver' in window) {
      // IO tylko „budzi” sprawdzanie, ale i tak wymaga scrolledOnce
      io = new IntersectionObserver(() => tryReveal(), {
        root: null,
        rootMargin: `0px 0px -${Math.max(0, 100 - gatePx)}%`,
        threshold: [0, 0.01, 0.1],
      });
      io.observe(box);
    }

    cleanupGate = () => {
      window.removeEventListener('scroll', onScroll, opts);
      window.removeEventListener('touchmove', onTouchMove, opts);
      window.removeEventListener('wheel', onWheel, opts);
      if (io) io.disconnect();
      clearGateTimer();
    };

    // Uwaga: NIE wywołujemy tryReveal na starcie — wymagamy interakcji (scrolledOnce)
  });
})();
