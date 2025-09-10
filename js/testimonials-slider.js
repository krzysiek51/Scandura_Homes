(() => {
  /* ===========================
     Testimonials Slider (vanilla)
     =========================== */

  // KONFIG — zmieniasz tylko tu
  const CONFIG = {
  loop: true,                    
  // Czy slider działa w pętli bez końca.
  // true = po ostatniej karcie wraca płynnie na początek.
  // false = zatrzymuje się na ostatniej karcie.

  startIndex: 0,                 
  // Numer karty, od której slider startuje.
  // 0 = pierwsza karta, 1 = druga itd.

  autoplay: true,
  // Czy slider sam się przesuwa po czasie.
  // true = włącza auto-przewijanie, false = tylko ręczne sterowanie.

  autoplayDelayMs: 3500,
  // Czas w milisekundach, ile czeka slider zanim automatycznie
  // przejdzie do następnej karty (tu: 3,5 sekundy).

  transitionMs: 900,
  // Czas animacji przesuwania w milisekundach (tu: 0,9 sekundy).

  easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  // Krzywa przyspieszenia animacji:
  // zaczyna wolno → przyspiesza → łagodnie zwalnia (naturalny efekt).

  pauseOnHover: true,
  // Czy zatrzymywać autoplay, gdy mysz najedzie na slider.

  pauseOnFocus: true,
  // Czy zatrzymywać autoplay, gdy slider złapie focus (np. tabem w klawiaturze).

  swipe: true,
  // Czy można przesuwać slajdy palcem / myszą (drag/swipe).

  keyboard: true,
  // Czy można sterować klawiaturą (← →).

  respectReducedMotion: true,
  // Jeżeli użytkownik w systemie ma włączone „reduce motion”,
  // slider wyłączy autoplay i animacje (dostępność).

  dragThresholdRatio: 0.18,
  // Jak daleko trzeba przeciągnąć slajd (procent szerokości),
  // żeby slider uznał to za intencję zmiany karty.
  // 0.18 = 18% szerokości slajdu.

  slideGapPx: 30
  // Odstęp (gap) między kartami w pikselach.
};


  function initTestimonials() {
    const root = document.querySelector('.testimonials');
    if (!root) return;

    // Guard: nie montuj drugi raz
    if (root.dataset.sliderMounted === '1') return;
    root.dataset.sliderMounted = '1';

    const viewport = root.querySelector('.testimonials__slider'); // „okno”
    if (!viewport) return;

    // — Tor: przenieś slajdy do .testimonials__track (bez zmiany stylu kart)
    let slides = Array.from(viewport.querySelectorAll('.testimonials__slide'));
    if (!slides.length) return;

    let track = viewport.querySelector('.testimonials__track');
    if (!track) {
      track = document.createElement('div');
      track.className = 'testimonials__track';
      slides.forEach(s => track.appendChild(s));
      viewport.appendChild(track);
    }

    // gap między kartami (na torze)
    track.style.columnGap = `${CONFIG.slideGapPx}px`;
    track.style.rowGap = '0px';

    root.classList.add('is-slider-ready');

    const prevBtn = root.querySelector('.testimonials__arrow--prev');
    const nextBtn = root.querySelector('.testimonials__arrow--next');

    const cfg = { ...CONFIG };
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (cfg.respectReducedMotion && prefersReduced) {
      cfg.autoplay = false; cfg.transitionMs = 0;
    }

    // ——— Seamless loop: dokładamy klony ———
    if (cfg.loop && slides.length > 1) {
      const firstClone = slides[0].cloneNode(true);
      const lastClone  = slides[slides.length - 1].cloneNode(true);
      firstClone.dataset.clone = 'first';
      lastClone .dataset.clone = 'last';
      track.insertBefore(lastClone, track.firstChild);
      track.appendChild(firstClone);
    }

    // aktualna lista w torze (z klonami, jeśli są)
    let workingSlides = Array.from(track.children);

    // indeks (w workingSlides); przy pętli +1 (bo z lewej stoi klon „last”)
    let index = (cfg.loop && slides.length > 1) ? cfg.startIndex + 1 : cfg.startIndex;

    // geometra
    let viewportW = viewport.getBoundingClientRect().width;
    const gapPxFromCSS = parseFloat(getComputedStyle(track).columnGap) || 0;
    let step = viewportW + (gapPxFromCSS || cfg.slideGapPx);

    let animating = false;
    let autoTimer = null;

    function setTransition(on){
      track.style.transition = on && cfg.transitionMs
        ? `transform ${cfg.transitionMs}ms ${cfg.easing}`
        : 'none';
    }
    function applyTransform(){
      track.style.transform = `translateX(${-index * step}px)`;
    }
    function markActive(){
      workingSlides.forEach((s, i) => {
        if (i === index) s.classList.add('is-active');
        else s.classList.remove('is-active');
      });
    }
    function recalc(){
      viewportW = viewport.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap) || cfg.slideGapPx;
      step = viewportW + gap;
      setTransition(false);
      applyTransform();
      updateArrows();
      markActive();
    }
    function moveTo(i, {animate = true} = {}){
      if (animating && animate) return;
      if (animate && cfg.transitionMs) { setTransition(true); animating = true; }
      else setTransition(false);
      index = i;
      applyTransform();
      updateArrows();
      markActive();
    }

    track.addEventListener('transitionend', () => {
      animating = false;
      // korekta pozycji po klonach (seamless)
      if (!cfg.loop || slides.length <= 1) return;
      const cur = workingSlides[index];
      if (!cur) return;

      if (cur.dataset.clone === 'first') {
        // byliśmy na klonie za prawdziwym ostatnim → skok na realny pierwszy
        setTransition(false);
        index = 1;
        applyTransform();
        markActive();
      } else if (cur.dataset.clone === 'last') {
        // byliśmy na klonie przed prawdziwym pierwszym → skok na realny ostatni
        setTransition(false);
        index = slides.length;
        applyTransform();
        markActive();
      }
    });

    function canGoPrev(){ return cfg.loop || index > 0; }
    function canGoNext(){ return cfg.loop || index < (slides.length - 1); }

    function next(){ if (canGoNext()) { moveTo(index + 1); restartAutoplay(); } }
    function prev(){ if (canGoPrev()) { moveTo(index - 1); restartAutoplay(); } }

    prevBtn?.addEventListener('click', prev);
    nextBtn?.addEventListener('click', next);

    // aktywacja/dezaktywacja strzałek (w pętli zawsze aktywne)
    function updateArrows(){
      if (!prevBtn || !nextBtn) return;
      if (cfg.loop) {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        prevBtn.classList.remove('is-disabled');
        nextBtn.classList.remove('is-disabled');
        prevBtn.setAttribute('aria-disabled', 'false');
        nextBtn.setAttribute('aria-disabled', 'false');
        return;
      }
      const atFirst = index <= 0;
      const atLast  = index >= (slides.length - 1);
      prevBtn.disabled = atFirst;
      nextBtn.disabled = atLast;
      prevBtn.classList.toggle('is-disabled', atFirst);
      nextBtn.classList.toggle('is-disabled', atLast);
      prevBtn.setAttribute('aria-disabled', String(atFirst));
      nextBtn.setAttribute('aria-disabled', String(atLast));
    }

    // Klawiatura
    if (cfg.keyboard) {
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      });
      if (!root.hasAttribute('tabindex')) root.tabIndex = 0;
    }

    // Autoplay
    function clearAuto(){ clearTimeout(autoTimer); autoTimer = null; }
    function scheduleAuto(){
      if (!cfg.autoplay || slides.length <= 1) return;
      clearAuto();
      autoTimer = setTimeout(() => next(), cfg.autoplayDelayMs);
    }
    function restartAutoplay(){ clearAuto(); scheduleAuto(); }

    if (cfg.pauseOnHover) {
      root.addEventListener('mouseenter', clearAuto);
      root.addEventListener('mouseleave', scheduleAuto);
    }
    if (cfg.pauseOnFocus) {
      root.addEventListener('focusin', clearAuto);
      root.addEventListener('focusout', scheduleAuto);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearAuto(); else scheduleAuto();
    });

    // Swipe/drag
    if (cfg.swipe) {
      let startX = 0, curX = 0, dragging = false;

      const down = (e)=> {
        if (animating) return;
        dragging = true;
        setTransition(false);
        startX = (e.touches ? e.touches[0].clientX : e.clientX);
        curX = startX;
        clearAuto();
      };
      const move = (e)=> {
        if (!dragging) return;
        const x = (e.touches ? e.touches[0].clientX : e.clientX);
        curX = x;
        const delta = curX - startX;
        track.style.transform = `translateX(${(-index * step) + delta}px)`;
      };
      const up = ()=> {
        if (!dragging) return;
        dragging = false;
        const delta = curX - startX;
        const threshold = viewportW * cfg.dragThresholdRatio;
        if (Math.abs(delta) > threshold) {
          if (delta < 0) next(); else prev();
        } else {
          moveTo(index, {animate:true});
          scheduleAuto();
        }
      };

      track.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      track.addEventListener('touchstart', down, {passive:true});
      track.addEventListener('touchmove', move, {passive:true});
      track.addEventListener('touchend', up);
    }

    // start
    requestAnimationFrame(() => {
      recalc();              // policz step (viewport + gap) i ustaw pozycję
      setTransition(true);   // włącz animacje
      scheduleAuto();
    });

    window.addEventListener('resize', recalc);
  }

  // Autostart po wczytaniu DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestimonials);
  } else {
    initTestimonials();
  }
})();
