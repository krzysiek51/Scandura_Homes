document.addEventListener("DOMContentLoaded", () => {
  const statsSection = document.querySelector('[data-animate="stats"]');
  const stats = Array.from(document.querySelectorAll(".stat__value"));
  if (!statsSection || !stats.length) return;

  let hasAnimated = false;

  const animateValue = (el) => {
    const target = Number.parseFloat(el.dataset.target || "0");
    const suffix = el.dataset.suffix || "";
    const decimals = Number.parseInt(el.dataset.decimals || "0", 10) || 0;
    const duration = 1400;
    const start = performance.now();

    const render = (value) => {
      el.textContent = value.toFixed(decimals) + suffix;
    };

    if (!Number.isFinite(target)) {
      render(0);
      return;
    }

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      render(target * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        render(target);
      }
    };

    render(0);
    requestAnimationFrame(tick);
  };

  const startAnimation = () => {
    if (hasAnimated) return;
    hasAnimated = true;
    stats.forEach(animateValue);
  };

  const isVisible = () => {
    const rect = statsSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.15;
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        startAnimation();
        observer.disconnect();
      });
    }, {
      threshold: 0.2,
      rootMargin: "0px 0px -10% 0px"
    });

    observer.observe(statsSection);

    if (isVisible()) {
      startAnimation();
      observer.disconnect();
    }
  } else {
    const onScroll = () => {
      if (!isVisible()) return;
      startAnimation();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }
});
