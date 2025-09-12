document.addEventListener("DOMContentLoaded", () => {
  const scope = document.querySelector(".about-process .process-grid");
  if (!scope) return;

  const cards = Array.from(scope.querySelectorAll("article"));
  const total = cards.length;

  // --- PROGRESS: ustaw 0..100 (bez %!) + upewnij się, że fill i dot istnieją
  cards.forEach((card, i) => {
    const progress = total > 1 ? (i / (total - 1)) * 100 : 0;
    card.style.setProperty("--progress", progress);

    // .progress-fill (do iluminacji od 0 do kropki)
    if (!card.querySelector(".progress-fill")) {
      const fill = document.createElement("span");
      fill.className = "progress-fill";
      fill.setAttribute("aria-hidden", "true");
      card.appendChild(fill);
    }

    // .progress-dot (znacznik na końcu)
    if (!card.querySelector(".progress-dot")) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      dot.setAttribute("aria-hidden", "true");
      card.appendChild(dot);
    }
  });

  // --- DRAWER: tylko ≥1440 aktywujemy overlay
  const media = window.matchMedia("(min-width: 1440px)");

  function closeAll() { cards.forEach(c => c.classList.remove("is-open")); }

  function bindDesktop() {
    closeAll();
    cards.forEach(card => {
      card.addEventListener("mouseenter", () => {
        if (!media.matches) return;
        closeAll();
        card.classList.add("is-open");
      });
      card.addEventListener("mouseleave", (e) => {
        if (!media.matches) return;
        const to = e.relatedTarget;
        if (to && (to === card || card.contains(to))) return;
        card.classList.remove("is-open");
      });
    });
    document.addEventListener("pointerdown", (e) => {
      if (!media.matches) return;
      if (!scope.contains(e.target)) closeAll();
    });
  }

  function unbindMobileState() { closeAll(); }

  function handleMedia() {
    if (media.matches) bindDesktop();
    else unbindMobileState();
  }
  media.addEventListener?.("change", handleMedia);
  handleMedia();
});
