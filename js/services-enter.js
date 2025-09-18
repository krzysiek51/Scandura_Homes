// ai-box-enter.js
// - NIC nie ukrywa.
// - Od razu uruchamia fill badge (bez delaya).
// - Title/Sub podnoszą się i „malują” po lekkim scrollu lub auto po 4s.

(() => {
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const box = document.querySelector('.configurator-prompt');
    if (!box) return;

    // elementy
    const title = box.querySelector('.configurator-prompt__title');
    const sub   = box.querySelector('.configurator-prompt__sub');
    const badge = box.querySelector('.configurator-prompt__badge');
    if (!title || !sub) return;

    // 1) Włącz same transitions (nie wpływa na widoczność)
    box.classList.add('ai-animate');

    // 2) BADGE: startuj fill natychmiast (bez delaya)
    if (badge) {
      // jeśli style ładują się ciut po DOM, daj microtask, ale bez widocznego opóźnienia
      Promise.resolve().then(() => badge.classList.add('ai-badge-animate'));
    }

    // 3) Ustawienia triggera dla title/sub
    const deltaPx  = Number(box.getAttribute('data-ai-delta')  || 24);   // min. realny scroll
    const offsetPx = Number(box.getAttribute('data-ai-offset') || 16);   // ile px box ma wejść w viewport
    const lagMs    = Number(box.getAttribute('data-ai-lag')    || 120);  // opóźnienie sub po title
    const autoMs   = Number(box.getAttribute('data-ai-auto')   || 4000); // auto-reveal po czasie

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
