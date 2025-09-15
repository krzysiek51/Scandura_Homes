// services-process-timeline.js
// Timeline: progres osi SVG na scroll, "reveal" kart na scroll, expand/collapse na klik.
// Działa bez żadnych zewnętrznych bibliotek.

(() => {
  const section = document.querySelector('.services-process');
  if (!section) return;

  const container = section.querySelector('.services-process__container');
  const steps = Array.from(section.querySelectorAll('.process-step'));
  const cards = Array.from(section.querySelectorAll('.process-card'));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================
     1) Reveal kart na scroll
     ========================= */
  if ('IntersectionObserver' in window && !prefersReduced) {
    const thresholds = Array.from({ length: 11 }, (_, i) => i / 10);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const r = Math.max(0, Math.min(1, e.intersectionRatio));
        e.target.style.setProperty('--reveal', r.toFixed(3));
        if (r > 0.15) e.target.classList.add('is-visible');
      }
    }, { threshold: thresholds, rootMargin: '0px 0px -10% 0px' });
    steps.forEach(step => io.observe(step));
  } else {
    steps.forEach(step => step.classList.add('is-visible'));
  }

  /* =========================
     2) Progres osi na scroll
     ========================= */
  const updateSpine = () => {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // ile sekcji jest przewinięte w zakresie [0..1]
    const start = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh)));
    // clamp i wpisanie do CSS var
    const progress = Math.max(0, Math.min(1, start));
    section.style.setProperty('--spine-progress', progress.toFixed(3));
  };

  updateSpine();
  window.addEventListener('scroll', updateSpine, { passive: true });
  window.addEventListener('resize', updateSpine);

  /* =========================
     3) Toggle "więcej"
     ========================= */
  const toggle = (btn) => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));

    const moreId = btn.getAttribute('aria-controls');
    if (moreId) {
      const more = document.getElementById(moreId);
      if (more) more.hidden = expanded; // jeżeli było rozwinięte -> schowaj
    }
  };

  cards.forEach(btn => {
    btn.addEventListener('click', () => toggle(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(btn);
      }
    });
  });
})();
