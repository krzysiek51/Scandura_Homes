// js/render-services.js
(async () => {
  const GRID = document.querySelector('.services-list .services-grid');
  const TL   = document.querySelector('.services-process .process-steps');

  try {
    const res = await fetch('../content/services.json?v=' + Date.now());
    const data = await res.json();

    // ==== SERVICES CARDS ====
    if (GRID && Array.isArray(data.services)) {
      GRID.innerHTML = '';
      data.services.forEach(svc => {
        const article = document.createElement('article');
        article.className = 'service-card';
        article.innerHTML = `
          <div class="service-card__media">
            <img class="service-card__image" src="${svc.image}" alt="Miniatura: ${svc.title}">
          </div>
          <div class="service-card__body">
            <h3 class="service-card__title">${svc.title}</h3>
            <p class="service-card__text">${svc.excerpt}</p>
            <ul class="service-card__bullets">
              ${ (svc.bullets || []).map(b => `<li class="service-card__bullet">${b}</li>`).join('') }
            </ul>
            <div class="service-card__actions">
              <a class="service-card__btn" href="${svc.cta?.href || '#'}">${svc.cta?.text || 'Kontakt'}</a>
              <button class="service-card__more-btn" type="button" data-quickview-open aria-controls="service-modal">Szczegóły</button>
            </div>

            <template class="service-card__details-template">
              <div class="qv">
                <img class="qv-image" src="${svc.modal?.image || svc.image}" alt="${svc.modal?.title || svc.title}">
                <h4 class="qv-title">${svc.modal?.title || svc.title}</h4>
                <p class="qv-lead">${svc.modal?.lead || ''}</p>
                <ul class="qv-bullets">
                  ${ (svc.modal?.bullets || []).map(li => `<li>${li}</li>`).join('') }
                </ul>
                <a class="qv-cta" href="${svc.modal?.cta?.href || svc.cta?.href || '#'}">
                  ${svc.modal?.cta?.text || svc.cta?.text || 'Poznaj zakres'}
                </a>
              </div>
            </template>
          </div>
        `;
        GRID.appendChild(article);
      });
    }

    // ==== TIMELINE (opcjonalnie) ====
    if (TL && Array.isArray(data.timeline)) {
      TL.innerHTML = '';
      data.timeline.forEach((step, i) => {
        const li = document.createElement('li');
        li.className = 'process-step';
        li.setAttribute('data-step', String(i + 1));
        li.innerHTML = `
          <button class="process-card" type="button" aria-expanded="false">
            <span class="process-card__icon">
              <img class="process-card__icon-img" src="${step.icon}" alt="">
            </span>
            <span class="process-card__title">${step.title}</span>
            <span class="process-card__text">${step.text}</span>
            <span class="process-card__more" hidden>${step.more || ''}</span>
          </button>
        `;
        TL.appendChild(li);
      });
    }

    console.info('[render-services] content loaded');
  } catch (e) {
    console.warn('[render-services] fallback to static HTML', e);
  }
})();
