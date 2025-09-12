// about-stats.js
document.addEventListener("DOMContentLoaded", () => {
  const stats = document.querySelectorAll(".stat__value");

  stats.forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    const decimals = parseInt(el.dataset.decimals) || 0;

    let current = 0;
    const step = target / 100;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current.toFixed(decimals) + suffix;
    }, 20);
  });
});
