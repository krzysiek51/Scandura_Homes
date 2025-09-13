// ====== SERVICES CARDS SLIDER ======
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".services-grid");
  const prevBtn = document.querySelector(".snav--prev");
  const nextBtn = document.querySelector(".snav--next");
  if (!grid) return;

  const mq = window.matchMedia("(max-width: 1023px)");
  let cleanupFns = [];
  let autoplayTimer = null;

  function getGapPx(el) {
    const cs = getComputedStyle(el);
    // dla flex + gap czy grid + gap
    const g = cs.columnGap || cs.gap || "16px";
    return parseFloat(g) || 16;
  }

  function getStep() {
    const card = grid.querySelector(".service-card");
    if (!card) return 300;
    const gap = getGapPx(grid);
    return Math.round(card.getBoundingClientRect().width + gap);
  }

  function scrollByStep(dir = 1) {
    const step = getStep();
    grid.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      // jeżeli jesteśmy praktycznie na końcu – wróć do początku
      const nearEnd = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 4;
      if (nearEnd) {
        grid.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByStep(1);
      }
    }, 3500);
  }
  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function enable() {
    grid.classList.add("is-slider");
    grid.style.scrollBehavior = "smooth";

    // Drag-to-scroll (mysz)
    let isDown = false, startX = 0, startScroll = 0;
    const onDown = (e) => { isDown = true; startX = e.pageX - grid.offsetLeft; startScroll = grid.scrollLeft; grid.classList.add("dragging"); };
    const onUp = () => { isDown = false; grid.classList.remove("dragging"); };
    const onMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - grid.offsetLeft;
      grid.scrollLeft = startScroll - (x - startX) * 1.2;
    };
    grid.addEventListener("mousedown", onDown);
    grid.addEventListener("mouseleave", onUp);
    grid.addEventListener("mouseup", onUp);
    grid.addEventListener("mousemove", onMove);
    cleanupFns.push(() => {
      grid.removeEventListener("mousedown", onDown);
      grid.removeEventListener("mouseleave", onUp);
      grid.removeEventListener("mouseup", onUp);
      grid.removeEventListener("mousemove", onMove);
    });

    // Strzałki
    if (prevBtn && nextBtn) {
      const prevH = () => scrollByStep(-1);
      const nextH = () => scrollByStep(1);
      prevBtn.addEventListener("click", prevH);
      nextBtn.addEventListener("click", nextH);
      cleanupFns.push(() => {
        prevBtn.removeEventListener("click", prevH);
        nextBtn.removeEventListener("click", nextH);
      });
    }

    // Autoplay + pauza na hover/focus
    startAutoplay();
    const pause = () => stopAutoplay();
    const resume = () => startAutoplay();
    grid.addEventListener("pointerenter", pause);
    grid.addEventListener("pointerleave", resume);
    grid.addEventListener("focusin", pause);
    grid.addEventListener("focusout", resume);
    cleanupFns.push(() => {
      grid.removeEventListener("pointerenter", pause);
      grid.removeEventListener("pointerleave", resume);
      grid.removeEventListener("focusin", pause);
      grid.removeEventListener("focusout", resume);
    });

    // Loop: jeśli użytkownik doscrolluje na koniec ręcznie
    const onScroll = () => {
      const nearEnd = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 2;
      if (nearEnd) grid.scrollLeft = 0;
    };
    grid.addEventListener("scroll", onScroll);
    cleanupFns.push(() => grid.removeEventListener("scroll", onScroll));
  }

  function disable() {
    stopAutoplay();
    grid.classList.remove("is-slider");
    grid.style.scrollBehavior = "";
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
  }

  function check(e) { e.matches ? enable() : disable(); }

  // init + nasłuch
  check(mq);
  mq.addEventListener("change", check);
});
