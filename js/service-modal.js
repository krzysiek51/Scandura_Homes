// // ../js/service-modal.js  (v4 — odporne na inne listenery, refille po otwarciu)
// (() => {
//   const modal = document.getElementById('service-modal');
//   if (!modal) return;

//   const q  = (sel) => modal.querySelector(sel);
//   const panel     = q('.service-modal__panel');
//   const backdrop  = q('.service-modal__backdrop');
//   const closeBtn  = q('.service-modal__close');
//   const imgEl     = q('.service-modal__image');
//   const titleEl   = q('.service-modal__title');
//   const leadEl    = q('.service-modal__lead');
//   const bulletsEl = q('.service-modal__bullets');
//   const ctaEl     = q('.service-modal__btn');

//   let lastFocused = null;
//   let lastCard = null;

//   const lock   = () => { document.documentElement.style.overflow = 'hidden'; };
//   const unlock = () => { document.documentElement.style.overflow = ''; };
//   const txt    = (el) => (el ? el.textContent.trim() : '');

//   function extractFromTemplate(card) {
//     const tpl = card?.querySelector('template.service-card__details-template');
//     if (!tpl) return { lead: '', bullets: [] };
//     const frag  = tpl.content.cloneNode(true);
//     const lead  = [...frag.querySelectorAll('p')].map(p => p.textContent.trim()).filter(Boolean).join('\n\n');
//     const bullets = [...frag.querySelectorAll('li')].map(li => li.textContent.trim()).filter(Boolean);
//     return { lead, bullets };
//   }

//   function fillModalFromCard(card) {
//     if (!card) return;

//     const title = txt(card.querySelector('.service-card__title'));
//     const img   = card.querySelector('.service-card__image');
//     const cta   = card.querySelector('.service-card__btn');
//     const { lead, bullets } = extractFromTemplate(card);

//     if (titleEl) titleEl.textContent = title || '';

//     if (imgEl) {
//       if (img) {
//         imgEl.src = img.getAttribute('src') || '';
//         imgEl.alt = img.getAttribute('alt') || title || '';
//       } else {
//         imgEl.removeAttribute('src'); imgEl.alt = '';
//       }
//     }

//     if (leadEl) leadEl.textContent = lead || '';

//     if (bulletsEl) {
//       bulletsEl.innerHTML = '';
//       (bullets || []).forEach(b => {
//         const li = document.createElement('li');
//         li.textContent = b;
//         bulletsEl.appendChild(li);
//       });
//     }

//     if (ctaEl) {
//       if (cta) {
//         ctaEl.textContent = (cta.textContent || 'Poznaj zakres').trim();
//         ctaEl.href = cta.getAttribute('href') || '#';
//       } else {
//         ctaEl.textContent = 'Poznaj zakres';
//         ctaEl.href = '#';
//       }
//     }
//   }

//   function openFromButton(btn) {
//     const card = btn.closest('.service-card');
//     if (!card) return;

//     lastCard = card;                 // zapamiętujemy źródło
//     fillModalFromCard(card);         // wypełniamy
//     lastFocused = document.activeElement;

//     modal.hidden = false;
//     modal.dataset.open = 'true';
//     modal.setAttribute('aria-hidden', 'false');
//     lock();

//     // Dodatkowy „refill” po klatce – gdyby inny skrypt nadpisał po nas
//     requestAnimationFrame(() => fillModalFromCard(lastCard));
//     setTimeout(() => fillModalFromCard(lastCard), 0);

//     setTimeout(() => (closeBtn || panel).focus(), 10);
//   }

//   function closeModal() {
//     delete modal.dataset.open;
//     modal.setAttribute('aria-hidden', 'true');
//     unlock();
//     setTimeout(() => { modal.hidden = true; }, 150);
//     if (lastFocused && lastFocused.focus) lastFocused.focus();
//   }

//   // ===== Bindowanie przycisków (capture + blokada propagacji) =====
//   function bindButtons() {
//     document.querySelectorAll('[data-quickview-open]').forEach(btn => {
//       if (btn.dataset.qvBound) return;
//       btn.dataset.qvBound = '1';

//       btn.addEventListener('click', (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         e.stopImmediatePropagation();
//         openFromButton(btn);
//       }, { capture: true });
//     // });
//   }

//   bindButtons();
//   const moBtns = new MutationObserver(bindButtons);
//   moBtns.observe(document.body, { childList: true, subtree: true });

//   // ===== Obserwujemy modal: każdy „open”/zmiana atrybutów => REFILL z ostatniej karty =====
//   const moModal = new MutationObserver(() => {
//     if (modal.dataset.open === 'true' && lastCard) {
//       fillModalFromCard(lastCard);
//     }
//   });
//   moModal.observe(modal, { attributes: true, attributeFilter: ['data-open', 'aria-hidden'] });

//   // Zamknięcia
//   backdrop?.addEventListener('click', closeModal);
//   closeBtn?.addEventListener('click', closeModal);
//   document.addEventListener('keydown', (e) => {
//     if (e.key === 'Escape' && modal.dataset.open === 'true') closeModal();
//   });

//   console.info('[service-modal.js] v4 active');
// })();
