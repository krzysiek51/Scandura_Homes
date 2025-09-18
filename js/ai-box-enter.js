// ai-box-enter.js
(() => {
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const box = document.querySelector('.configurator-prompt');
    if (!box) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const title = box.querySelector('.configurator-prompt__title');
    const sub   = box.querySelector('.configurator-prompt__sub');
    if (!title || !sub) return;

    [title, sub].forEach(el => el.setAttribute('data-text', el.textContent.trim()));

    box.classList.add('ai-armed');
    requestAnimationFrame(() => box.classList.add('ai-animate'));

    const deltaPx  = Number(box.getAttribute('data-ai-delta')  || 24);
    const offsetPx = Number(box.getAttribute('data-ai-offset') || 16);
    const lagMs    = Number(box.getAttribute('data-ai-lag')    || 120);
    const autoMs   = Number(box.getAttribute('data-ai-auto')   || 4000);

    let scrolled = 0, lastY = window.scrollY || 0, revealed = false;

    function measure() {
      const y = window.scrollY || 0;
      scrolled += Math.abs(y - lastY);
      lastY = y;
    }
    function inGate() {
      const r = box.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight &&
             (window.innerHeight - r.top) >= offsetPx;
    }
    function reveal() {
      if (revealed) return;
      revealed = true;
      title.classList.add('ai-revealed');
      setTimeout(() => sub.classList.add('ai-revealed'), lagMs);
      cleanup();
    }
    function tryReveal() {
      if (!revealed && scrolled >= deltaPx && inGate()) reveal();
    }

    const opts = { passive: true };
    function onScroll() { measure(); tryReveal(); }
    window.addEventListener('scroll', onScroll, opts);
    window.addEventListener('wheel', onScroll,  opts);
    window.addEventListener('touchmove', onScroll, opts);

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(tryReveal, {
        root: null, rootMargin: '0px 0px -35% 0px', threshold: [0, .1, .3, .6, 1]
      });
      io.observe(box);
    }

    const autoTimer = setTimeout(reveal, autoMs);

    function cleanup() {
      clearTimeout(autoTimer);
      window.removeEventListener('scroll', onScroll, opts);
      window.removeEventListener('wheel', onScroll,  opts);
      window.removeEventListener('touchmove', onScroll, opts);
      if (io) io.disconnect();
    }
  });
})();
