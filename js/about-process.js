// js/about-process.js
document.addEventListener("DOMContentLoaded", () => {
  const scope = document.querySelector(".about-process .process-grid");
  if (!scope) return;

  const cards = Array.from(scope.querySelectorAll("article"));
  const total = cards.length;

  // --- PROGRESS: ustaw 0..100 (bez %!)
  cards.forEach((card, i) => {
    const progress = total > 1 ? (i / (total - 1)) * 100 : 0;
    card.style.setProperty("--progress", String(progress));

    if (!card.querySelector(".progress-dot")) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      dot.setAttribute("aria-hidden", "true");
      card.appendChild(dot);
    }
  });

  // --- DRAWER: tylko ≥1440 aktywujemy overlay
  const media = window.matchMedia("(min-width: 1440px)");

  function closeAll() {
    cards.forEach(c => c.classList.remove("is-open"));
  }

  function bindDesktop() {
    // najpierw wyczyść
    closeAll();

    // hover – otwórz aktywną, zamknij resztę
    cards.forEach(card => {
      card.addEventListener("mouseenter", () => {
        if (!media.matches) return;
        closeAll();
        card.classList.add("is-open");
      });
      card.addEventListener("mouseleave", (e) => {
        if (!media.matches) return;
        // jeśli szybko zjeżdżasz na drawer, nie zamykaj od razu
        const to = e.relatedTarget;
        if (to && (to === card || card.contains(to))) return;
        card.classList.remove("is-open");
      });
    });

    // klik poza – zamknij
    document.addEventListener("pointerdown", (e) => {
      if (!media.matches) return;
      if (!scope.contains(e.target)) closeAll();
    });
  }

  function unbindMobileState() {
    closeAll();
  }

  // init + reaguj na zmianę szerokości
  function handleMedia() {
    if (media.matches) bindDesktop();
    else unbindMobileState();
  }
  media.addEventListener?.("change", handleMedia);
  handleMedia();
});
