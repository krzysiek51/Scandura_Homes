// services-icons-draw.js — przygotuj linie (pusta kartka) i dorysuj
(() => {
  const LINES = 'path,polyline,polygon,line';
  const FORCE = '[data-draw]';
  const SKIP  = '[data-nodraw]';

  function ready(fn){ document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded', fn, {once:true})
    : fn(); }

  function prepareSVG(svg){
    if (!svg || svg.__prepared) return;
    const items = [...svg.querySelectorAll(LINES+','+FORCE)]
      .filter(el => !el.matches(SKIP));
    items.forEach(el => {
      el.setAttribute('pathLength','1');     // normalizacja długości
      el.style.fill             = 'none';
      el.style.stroke           = 'transparent';
      el.style.strokeDasharray  = '1';
      el.style.strokeDashoffset = '1';
      el.style.transition       = 'stroke-dashoffset 900ms cubic-bezier(.22,.61,.36,1)';
      el.style.willChange       = 'stroke-dashoffset';
    });
    svg.__prepared = true;
  }

  function drawIn(root){
    const svgs = (root instanceof SVGSVGElement) ? [root]
      : [...(root||document).querySelectorAll('svg.services__icon.js-draw')];
    svgs.forEach(svg => {
      prepareSVG(svg);
      requestAnimationFrame(() => {
        document.body.offsetHeight; // force layout
        requestAnimationFrame(() => {
          [...svg.querySelectorAll(LINES+','+FORCE)]
            .filter(el => !el.matches(SKIP))
            .forEach(el => {
              el.style.stroke = 'currentColor';
              el.style.strokeDashoffset = '0';
            });
          svg.classList.add('is-drawn');
        });
      });
    });
  }

  function drawActive(){
    document
      .querySelectorAll('.services__card.is-active,'+
                        '.swiper-slide-active,.splide__slide.is-active,'+
                        '.glide__slide--active,.slick-active,.tns-slide-active,'+
                        '.flickity-slider .is-selected')
      .forEach(card => drawIn(card));
  }

  function prepareAll(root){
    [...(root||document).querySelectorAll('svg.services__icon.js-draw')].forEach(prepareSVG);
  }

  ready(() => {
    // przygotuj wszystko i narysuj aktywną kartę bez dotyku
    prepareAll(document);
    drawActive();
    [0,120,320,600,1000].forEach(t => setTimeout(drawActive, t));

    // gdy dojdą nowe SVG (klony slidera) — przygotuj je
    const mo = new MutationObserver(muts => muts.forEach(m => {
      m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType!==1) return;
        if (n.matches?.('svg.services__icon.js-draw')) prepareSVG(n);
        n.querySelectorAll?.('svg.services__icon.js-draw')?.forEach?.(prepareSVG);
      });
    }));
    mo.observe(document.body, {subtree:true, childList:true});

    // API
    window.ServicesDraw = Object.assign(window.ServicesDraw||{}, {
      prepareAll, drawIn, drawAll: () => drawIn(document)
    });
  });
})();
