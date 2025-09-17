// Services: animacja wejścia (tytuł + divider + kolor liter po literze)
// Startuje DOPIERO po pierwszym scrollu i w zdefiniowanym oknie widoku.

(() => {
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  // Podziel <em> na <span.char style="--i:n">X</span>
  function splitTitleLetters(em){
    if (!em || em.dataset.splitted) return;
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const ch of em.textContent){
      if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
      const span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--i', i++);
      span.textContent = ch; // działa dla liter, cyfr i znaków PL
      frag.appendChild(span);
    }
    em.textContent = '';
    em.appendChild(frag);
    em.dataset.splitted = '1';
  }

  onReady(() => {
    const sec = document.querySelector('section.services');
    if (!sec) return;

    // 1) Przygotuj litery
    splitTitleLetters(sec.querySelector('h2.services__title em'));

    // 2) Uzbrój – dopiero teraz CSS ustawia stany startowe
    sec.classList.add('is-armed');

    // 3) Reflow (zapamiętaj start, także ::before)
    const title = sec.querySelector('h2.services__title');
    void title?.offsetTop;
    getComputedStyle(title, '::before').transform;

    // 4) Czekaj na PIERWSZY scroll użytkownika, by nie odpalać „na loadzie”
    let scrollingArmed = false;
    const armOnFirstScroll = () => { scrollingArmed = true; window.removeEventListener('scroll', armOnFirstScroll); };
    window.addEventListener('scroll', armOnFirstScroll, { once: true, passive: true });

    // 5) IO – odpal gdy środek sekcji wejdzie w „okno” (nie od razu przy krawędzi)
    const fire = () => {
      // krótki odstęp + flush → gwarancja odpalenia transition
      setTimeout(() => {
        requestAnimationFrame(() => {
          getComputedStyle(title, '::before').transform;
          requestAnimationFrame(() => sec.classList.add('is-inview'));
        });
      }, 80);
    };

    let fired = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // uruchamiaj dopiero po pierwszym realnym scrollu
        if (!scrollingArmed) return;
        if (!fired && entry.isIntersecting) {
          fired = true;
          fire();
          io.disconnect();
        }
      },
      {
        // Wyzwalaj, gdy ~50% sekcji w kadrze, z lekkim opóźnieniem od dołu
        threshold: 0.5,
        rootMargin: '-15% 0px -40% 0px',
      }
    );
    io.observe(sec);

    // 6) Awaryjnie: jeśli user nie scrolluje, a ma dotrzeć klawiaturą itp.
    setTimeout(() => {
      if (!fired && scrollingArmed && !sec.classList.contains('is-inview')) fire();
    }, 3000);
  });
})();
