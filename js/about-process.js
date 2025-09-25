// about-process.js — MOBILE (touch ≤743): auto-open + TAP; TABLET (touch): TAP; DESKTOP (hover&fine): CLICK + optional HOVER
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".about-process .process-grid");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll("article"));
  if (!cards.length) return;

  // ---- MEDIA CAPABILITIES / BREAKPOINTS ----
  const MQ_MOBILE_W      = window.matchMedia("(max-width: 743px)");             // szerokość telefonu
  const MQ_CAN_HOVER     = window.matchMedia("(hover: hover) and (pointer: fine)");
  const MQ_TOUCH_ONLY    = window.matchMedia("(hover: none), (pointer: coarse)");

  // Auto-open tylko naprawdę na phone + touch
  const autoOpenEnabled  = () => MQ_MOBILE_W.matches && MQ_TOUCH_ONLY.matches;

  // ---- AUTO-OPEN (lepkość) ----
  const USER_PAUSE_MS  = 2200;
  const CENTER_BAND_PX = 160;
  const MIN_SWITCH_MS  = 1200;

  // ---- STAN ----
  let lastUserInteract = 0;
  let lastSwitchAt     = 0;
  let currentOpen      = null;
  let rafId            = 0;

  // deduplikacja pointerup vs click (ghost-click z mobile)
  const DEDUP_WINDOW_MS = 800;
  let lastActivateTs    = 0;
  let suppressNextClick = false;

  // ---- UTILS ----
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const log = (...a)=>{ if (window.ABOUT_DEBUG) console.log("[about-process]", ...a); };

  // ---- STYLE OCHRONNE ----
  (function injectStyle(){
    const css = `
      .about-process .process-grid{ position:relative; }

      .about-process .process-grid article{
        position:relative; z-index:0; cursor:pointer;
        -webkit-tap-highlight-color: rgba(0,0,0,0);
        touch-action: manipulation;
        pointer-events:auto !important;
      }
      .about-process .process-grid article.is-open{ z-index:3; }

      /* nagłówek nad dekoracjami (tablet 2 kolumny) */
      .about-process .process-grid article h3{
        position:relative; padding-right:28px; z-index:2; pointer-events:auto !important;
      }

      .about-process .process-grid article .step-caret{
        position:absolute; inset-inline-end:4px; top:.35em; width:14px; height:14px; opacity:.9;
        background:no-repeat center/contain url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23222222'><path d='M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'/></svg>");
        transition: transform .25s cubic-bezier(.2,.7,.3,1);
        pointer-events:none;
      }
      .about-process .process-grid article.is-open .step-caret{ transform: rotate(180deg); }

      /* dekoracje NIGDY nie łapią klików */
      .about-process .process-grid .progress-fill,
      .about-process .process-grid .progress-dot,
      .about-process .process-grid [data-decor],
      .about-process .process-grid svg,
      .about-process .process-grid canvas,
      .about-process .process-grid::before,
      .about-process .process-grid::after { pointer-events:none !important; }

      /* drawer — akordeon */
      .about-process .process-grid article .drawer{
        display:block; position:static; overflow:hidden; visibility:visible; opacity:1;
        will-change:height; transition: height .32s cubic-bezier(.2,.7,.3,1);
        contain: layout; pointer-events:auto !important;
      }

      .about-process .process-grid article:focus-visible{
        outline:2px solid rgba(220,155,89,.8); outline-offset:4px; border-radius:16px;
      }

      /* Na urządzeniach bez hovera wyłącz jakiekolwiek :hover efekty na kartach (jeśli istnieją w CSS projektu) */
      @media (hover: none), (pointer: coarse) {
        .about-process .process-grid article:hover { }
      }
    `;
    const tag = document.createElement("style");
    tag.textContent = css;
    document.head.appendChild(tag);
  })();

  // ---- INIT: progress/aria/caret/tabIndex ----
  const total = cards.length;
  cards.forEach((card, i) => {
    const prog = total > 1 ? (i/(total-1))*100 : 0;
    card.dataset.index = String(i);
    card.dataset.progress = String(prog);
    card.style.setProperty("--progress", prog);

    if (!card.querySelector(".progress-fill")){
      const f = document.createElement("span"); f.className="progress-fill"; f.setAttribute("aria-hidden","true"); card.appendChild(f);
    }
    if (!card.querySelector(".progress-dot")){
      const d = document.createElement("span"); d.className="progress-dot"; d.setAttribute("aria-hidden","true"); card.appendChild(d);
    }

    const h3 = card.querySelector("h3");
    if (h3){
      h3.setAttribute("aria-expanded","false");
      if (!card.querySelector(".step-caret")){
        const caret = document.createElement("span"); caret.className="step-caret"; h3.appendChild(caret);
      }
    }

    const dr = card.querySelector(".drawer");
    if (dr){ dr.hidden = true; dr.style.height = "0px"; }

    card.tabIndex = 0;
    card.setAttribute("role","button");
  });

  // ---- HELPERS ----
  function setActiveProgress(card){
    const p = Number(card?.dataset.progress || 0);
    grid.style.setProperty("--progress-active", String(clamp(p,0,100)));
  }
  function markTimeline(activeCard){
    const idx = Number(activeCard.dataset.index||0);
    cards.forEach((c,i)=>{
      c.classList.toggle("is-active", i===idx);
      c.classList.toggle("is-past",   i< idx);
      c.classList.toggle("is-future", i> idx);
    });
  }
  function expand(dr){
    if (!dr) return;
    dr.hidden = false;
    dr.style.height = "0px";
    dr.offsetHeight;
    dr.style.height = dr.scrollHeight + "px";
    dr.addEventListener("transitionend", function onEnd(e){
      if (e.propertyName !== "height") return;
      dr.removeEventListener("transitionend", onEnd);
      if (!dr.hidden) dr.style.height = "auto";
    }, { once:true });
  }
  function collapse(dr){
    if (!dr) return;
    const current = dr.getBoundingClientRect().height;
    dr.style.height = current + "px";
    dr.offsetHeight;
    dr.style.height = "0px";
    dr.addEventListener("transitionend", function onEnd(e){
      if (e.propertyName !== "height") return;
      dr.removeEventListener("transitionend", onEnd);
      if (parseFloat(getComputedStyle(dr).height) === 0) dr.hidden = true;
    }, { once:true });
  }
  function closeAllExcept(except){
    cards.forEach(c=>{
      if (c === except) return;
      c.classList.remove("is-open");
      const h3 = c.querySelector("h3");
      const dr = c.querySelector(".drawer");
      if (h3) h3.setAttribute("aria-expanded","false");
      if (dr) collapse(dr);
    });
  }
  function openCard(card){
    if (!card) return;
    closeAllExcept(card);
    const dr = card.querySelector(".drawer");
    const h3 = card.querySelector("h3");
    card.classList.add("is-open");
    if (h3) h3.setAttribute("aria-expanded","true");
    expand(dr);
    setActiveProgress(card);
    markTimeline(card);
    currentOpen  = card;
    lastSwitchAt = performance.now();
  }
  function toggleCard(card){
    if (!card) return;
    if (card.classList.contains("is-open")){
      collapse(card.querySelector(".drawer"));
      card.classList.remove("is-open");
      const h3 = card.querySelector("h3");
      if (h3) h3.setAttribute("aria-expanded","false");
      currentOpen = null;
    } else {
      openCard(card);
    }
    lastUserInteract = performance.now();
  }

  // ---- INTERAKCJE ----
  // 1) GŁÓWNY: pointerup (CAPTURE) — pewny TAP na dotyku, działa także na desktopie
  grid.addEventListener("pointerup", (e)=>{
    const t = e.target;
    const card = t && t.closest("article");
    if (!card || !grid.contains(card)) return;
    if (t.closest("a,button,[role='button'],input,textarea,select,summary")) return;

    // blokada ghost-clicka po tapie
    e.preventDefault();
    suppressNextClick = true;
    setTimeout(()=> suppressNextClick = false, DEDUP_WINDOW_MS);

    const now = performance.now();
    if (now - lastActivateTs < DEDUP_WINDOW_MS) return;
    lastActivateTs = now;

    toggleCard(card);
  }, true); // capture

  // 2) Fallback: click (CAPTURE) — głównie dla desktopu/starych UA
  grid.addEventListener("click", (e)=>{
    if (suppressNextClick) return; // ghost-click po pointerup
    const t = e.target;
    const card = t && t.closest("article");
    if (!card || !grid.contains(card)) return;
    if (t.closest("a,button,[role='button'],input,textarea,select,summary")) return;

    const now = performance.now();
    if (now - lastActivateTs < DEDUP_WINDOW_MS) return;
    lastActivateTs = now;

    toggleCard(card);
  }, true);

  // 3) Klawiatura (A11y)
  grid.addEventListener("keydown", (e)=>{
    const card = e.target.closest("article");
    if (!card) return;
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); toggleCard(card); }
  });

  // 4) HOVER — tylko tam, gdzie urządzenie faktycznie potrafi hoverować (fine pointer)
  function attachHover(){
    cards.forEach(card=>{
      if (card.__onHover){ card.removeEventListener("mouseenter", card.__onHover); card.__onHover = null; }
      if (!MQ_CAN_HOVER.matches) return; // brak hovera na tabletach/telefonach
      card.__onHover = ()=>{ openCard(card); lastUserInteract = performance.now(); };
      card.addEventListener("mouseenter", card.__onHover);
    });
  }
  attachHover();
  MQ_CAN_HOVER.addEventListener?.("change", attachHover);

  // ---- AUTO-OPEN: tylko PHONE (touch + ≤743) ----
  function gridInView(){
    const r = grid.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return (r.top < vh * 0.85) && (r.bottom > vh * 0.20);
  }
  function stepScroll(){
    rafId = 0;
    if (!autoOpenEnabled()) return;
    const now = performance.now();
    if (now - lastUserInteract < USER_PAUSE_MS) return;
    if (!gridInView()) return;

    const vh = window.innerHeight || document.documentElement.clientHeight;
    const center = vh / 2;
    const dist = (el) => {
      const r = el.getBoundingClientRect();
      return Math.abs((r.top + r.height/2) - center);
    };

    if (currentOpen && currentOpen.isConnected && dist(currentOpen) <= CENTER_BAND_PX) return;

    let best = null, bestDist = Infinity;
    for (const c of cards){
      const d = dist(c);
      if (d < bestDist){ bestDist = d; best = c; }
    }
    if (!best) return;
    if (best === currentOpen) return;
    if (now - lastSwitchAt < MIN_SWITCH_MS) return;
    openCard(best);
  }
  function onScroll(){
    if (!autoOpenEnabled()) return;
    if (rafId) return;
    rafId = requestAnimationFrame(stepScroll);
  }

  // Reset przy zmianach MQ/capabilities
  const onEnvChange = () => {
    // usuń hover handler gdy środowisko się zmieni
    attachHover();
    // zresetuj stan kart
    cards.forEach(c=>{
      c.classList.remove("is-open");
      const dr = c.querySelector(".drawer");
      const h3 = c.querySelector("h3");
      if (h3) h3.setAttribute("aria-expanded","false");
      if (dr){ dr.hidden = true; dr.style.height = "0px"; }
    });
    currentOpen = null;
    lastUserInteract = performance.now();
  };
  MQ_MOBILE_W.addEventListener?.("change", onEnvChange);
  MQ_CAN_HOVER.addEventListener?.("change", onEnvChange);
  MQ_TOUCH_ONLY.addEventListener?.("change", onEnvChange);

  window.addEventListener("scroll", onScroll, { passive:true });
  window.addEventListener("resize", onScroll);
  if (autoOpenEnabled()) onScroll();

  log("INIT ok", {cards: cards.length});
});
