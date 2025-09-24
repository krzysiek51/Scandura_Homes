// about-timeline-wires.js
(() => {
  const SEL = {
    root: ".about-timeline",
    card: ".timeline-card",
    media: ".timeline-card__media",
    svg:  ".timeline-wires",
  };

  // USTAWIENIA
  const BP = 1440;        // aktywacja tylko od tej szerokości
  const AXIS_GAP = 28;    // odległość szyn od osi (px)
  const CORNER_R = 12;    // promień łuków
  const MIN_SEG  = 6;     // min. długość odcinków (stabilniejsze łuki)
  const CAP_PAD  = 60;    // zapas nad pierwszą i pod ostatnią kartą (px)
  const NODE_R   = 7;     // promień „noda” przy karcie
  const CAP_R    = 8;     // promień punktów start/koniec na osi

  const NS = "http://www.w3.org/2000/svg";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const E = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  const root = $(SEL.root);
  if (!root) return;

  // Utwórz/znajdź SVG
  let svg = $(SEL.svg, root);
  if (!svg) {
    svg = E("svg", { class: "timeline-wires", "aria-hidden": "true" });
    root.appendChild(svg);
  }

  // Definicje filtrów (glow = blur + SourceGraphic)
  const ensureDefs = (svgEl) => {
    let defs = $("defs", svgEl);
    if (!defs) defs = svgEl.insertBefore(E("defs"), svgEl.firstChild);
    if (!$("#tl-glow", defs)) {
      const f = E("filter", { id: "tl-glow", x: "-20%", y: "-20%", width: "140%", height: "140%" });
      f.appendChild(E("feGaussianBlur", { stdDeviation: "2", result: "blur" }));
      const merge = E("feMerge");
      merge.appendChild(E("feMergeNode", { in: "blur" }));
      merge.appendChild(E("feMergeNode", { in: "SourceGraphic" })); // KLUCZ: ostry rdzeń
      f.appendChild(merge);
      defs.appendChild(f);
    }
  };

  const getCards = () => $$(SEL.card, root);

  const draw = () => {
    if (window.innerWidth < BP) {
      svg.replaceChildren();
      svg.setAttribute("width", 0);
      svg.setAttribute("height", 0);
      return;
    }

    const cards = getCards();
    if (!cards.length) { svg.replaceChildren(); return; }

    const secRect = root.getBoundingClientRect();
    const W = secRect.width;
    const H = secRect.height;
    const axisX = secRect.left + W / 2;
    const railL = axisX - AXIS_GAP;
    const railR = axisX + AXIS_GAP;

    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();
    ensureDefs(svg);

    const gRails = E("g");
    const gWires = E("g");
    const gDots  = E("g");
    svg.append(gRails, gWires, gDots);

    // Zbierz nody (środek mediów + strona)
    const nodes = cards.map(card => {
      const m = $(SEL.media, card);
      if (!m) return null;
      const r = m.getBoundingClientRect();
      const side = (r.left + r.width / 2) < axisX ? "left" : "right";
      const y = r.top - secRect.top + r.height / 2;
      const xEdge = side === "left" ? (r.right - secRect.left) : (r.left - secRect.left);
      const railX = side === "left" ? (railL - secRect.left) : (railR - secRect.left);
      return { side, y, xEdge, railX };
    }).filter(Boolean);

    if (!nodes.length) return;

    // Zakres osi i szyn
    const topY = Math.min(...nodes.map(n => n.y)) - CAP_PAD;
    const botY = Math.max(...nodes.map(n => n.y)) + CAP_PAD;

    // Oś (kropkowana) + dwie szyny
    const axis = E("line", {
      x1: (axisX - secRect.left), y1: topY,
      x2: (axisX - secRect.left), y2: botY,
      class: "timeline-rail timeline-axis"
    });
    const railLeft  = E("line", {
      x1: (railL - secRect.left), y1: topY,
      x2: (railL - secRect.left), y2: botY,
      class: "timeline-rail"
    });
    const railRight = E("line", {
      x1: (railR - secRect.left), y1: topY,
      x2: (railR - secRect.left), y2: botY,
      class: "timeline-rail"
    });
    gRails.append(axis, railLeft, railRight);

    // Czapki (start/koniec) na osi
    gDots.append(
      E("circle", { cx: (axisX - secRect.left), cy: topY, r: CAP_R, class: "timeline-cap" }),
      E("circle", { cx: (axisX - secRect.left), cy: botY, r: CAP_R, class: "timeline-cap" }),
    );

    // Nody przy kartach + przewody z łukami
    nodes.forEach((n, i) => {
      // znacznik przy krawędzi media
      gDots.appendChild(E("circle", { cx: n.xEdge, cy: n.y, r: NODE_R, class: "timeline-node" }));
      if (i === nodes.length - 1) return;

      const m = nodes[i + 1];
      const midY = (n.y + m.y) / 2;

      const seg1 = Math.max(Math.abs(n.railX - n.xEdge), MIN_SEG);
      const seg2 = Math.max(Math.abs(midY - n.y), MIN_SEG);
      const seg3 = Math.max(Math.abs(m.railX - n.railX), MIN_SEG);
      const seg4 = Math.max(Math.abs(m.y - midY), MIN_SEG);
      const r1 = Math.min(CORNER_R, seg1, seg2);
      const r2 = Math.min(CORNER_R, seg2, seg3);
      const r3 = Math.min(CORNER_R, seg3, seg4);
      const r4 = Math.min(CORNER_R, seg4, seg1);

      const h1dir = n.railX > n.xEdge ? 1 : -1;
      const v1dir = midY > n.y ? 1 : -1;
      const h2dir = m.railX > n.railX ? 1 : -1;
      const v2dir = m.y > midY ? 1 : -1;

      let d = `M ${n.xEdge} ${n.y}`;
      d += ` H ${n.railX - h1dir * r1}`;
      d += ` Q ${n.railX} ${n.y} ${n.railX} ${n.y + v1dir * r1}`;
      d += ` V ${midY - v1dir * r2}`;
      d += ` Q ${n.railX} ${midY} ${n.railX + h2dir * r2} ${midY}`;
      d += ` H ${m.railX - h2dir * r3}`;
      d += ` Q ${m.railX} ${midY} ${m.railX} ${midY + v2dir * r3}`;
      d += ` V ${m.y - v2dir * r4}`;
      d += ` Q ${m.railX} ${m.y} ${m.railX + (m.side === "left" ? -1 : 1) * r4} ${m.y}`;
      d += ` H ${m.xEdge}`;

      gWires.appendChild(E("path", { d, class: "timeline-wire" }));
    });
  };

  // RAF debounce
  const rafDraw = () => {
    cancelAnimationFrame(rafDraw._id);
    rafDraw._id = requestAnimationFrame(draw);
  };

  // Redraw na typowe zdarzenia
  window.addEventListener("load", rafDraw, { passive: true });
  window.addEventListener("resize", rafDraw, { passive: true });
  window.addEventListener("scroll", rafDraw, { passive: true });

  // Redraw, gdy layout/nadrzędne klasy się zmieniają lub obrazki się doczytują
  const mo = new MutationObserver(rafDraw);
  mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

  // Start
  rafDraw();
})();
