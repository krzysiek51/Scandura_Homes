// js/configurator.js
// WYMAGANE: js/config.js z exportem { CFG }

import { CFG } from './config.js';

const STEP_MODULES = [
  () => import('./steps/step0-house-type.js'),
  () => import('./steps/step1-foundation.js'),
  () => import('./steps/step2-facade-style.js'),
  () => import('./steps/step3-roof-type.js'), // <- jeżeli masz plik step3-roof.js, zmień ścieżkę
  () => import('./steps/step4-layout.js'),
  () => import('./steps/step5-options.js'),
  () => import('./steps/step6-summary.js'),
  () => import('./steps/step7-contact.js'),
];

/* ---------- UX: lekki toast zamiast alertów ---------- */
function showToast(msg) {
  let el = document.getElementById('cfg-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cfg-toast';
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,.88)',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '10px',
      fontSize: '14px',
      lineHeight: '1.3',
      boxShadow: '0 8px 28px rgba(0,0,0,.25)',
      zIndex: '10001',
      opacity: '0',
      transition: 'opacity .25s ease',
      pointerEvents: 'none',
      maxWidth: '90vw',
      textAlign: 'center',
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  const modal    = document.getElementById('cfg-modal');
  if (!modal) {
    console.error('[Configurator] Nie znaleziono #cfg-modal w DOM.');
    return;
  }

  const sections = [...modal.querySelectorAll('.cfg-step')];
  const labels   = [...modal.querySelectorAll('[data-step-label]')];
  const barFill  = modal.querySelector('.cfg-stepper__bar-fill');
  const stepMeta = modal.querySelector('#cfg-stepper-current');
  const btnNext  = modal.querySelector('[data-next]');
  const btnPrev  = modal.querySelector('[data-prev]');
  const backdrop = modal.querySelector('.cfg__backdrop');
  const closeEls = [...modal.querySelectorAll('[data-close-configurator]')];

  const openButtons = [
    ...document.querySelectorAll('[data-open-configurator]'),
    ...document.querySelectorAll('#open-configurator-button'),
    ...document.querySelectorAll('.configurator-prompt__button'),
  ];

  function renderStep() {
    sections.forEach((s, i) => { s.hidden = (i !== CFG.step); });
    labels.forEach((l, i) => l.classList.toggle('is-active', i === CFG.step));

    const pct = ((CFG.step + 1) / CFG.stepsCount) * 100;
    if (barFill) barFill.style.width = `${pct}%`;
    if (stepMeta) stepMeta.textContent = `Krok ${CFG.step + 1}/${CFG.stepsCount}`;

    if (btnPrev) btnPrev.disabled = CFG.step === 0;
    if (btnNext) btnNext.textContent = (CFG.step === CFG.stepsCount - 1) ? 'Wyślij' : 'Dalej';
  }

  async function currentStepModule() {
    const loader = STEP_MODULES[CFG.step];
    if (!loader) return null;
    try {
      return await loader();
    } catch (e) {
      console.error('[Configurator] Import kroku nieudany', CFG.step, e);
      showToast('Nie udało się załadować kroku. Spróbuj ponownie.');
      return null;
    }
  }

  function preloadNext() {
    const next = CFG.step + 1;
    if (next < STEP_MODULES.length) {
      STEP_MODULES[next]().catch(() => {});
    }
  }

  async function mountCurrent() {
    const mod = await currentStepModule();
    mod?.mount?.(sections[CFG.step], CFG);
    return mod;
  }

  function openConfigurator() {
    modal.classList.remove('is-hidden');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    // twarde CSS fallbacki, gdyby build/inline CSS się rozjechał
    modal.style.display   = 'block';
    modal.style.visibility = 'visible';
    modal.style.zIndex     = '10000';

    CFG.step = 0;
    renderStep();
    mountCurrent().then(() => preloadNext());
    console.log('[Configurator] OPEN');
  }

  function closeConfigurator() {
    modal.classList.add('is-hidden');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = '';
    console.log('[Configurator] CLOSE');
  }

  async function goNext() {
    const mod = await currentStepModule();
    if (mod?.validate && !mod.validate(CFG)) {
      // zamiast alertu
      showToast('Uzupełnij wymagane pola w tym kroku.');
      return;
    }

    mod?.unmount?.(sections[CFG.step], CFG);

    if (CFG.step === CFG.stepsCount - 1) {
      // ostatni krok – symulacja submitu
      showToast('Dziękujemy! Twoja konfiguracja została wysłana.');
      setTimeout(closeConfigurator, 900);
      return;
    }

    CFG.step++;
    renderStep();
    await mountCurrent();
    preloadNext();
  }

  async function goPrev() {
    const mod = await currentStepModule();
    mod?.unmount?.(sections[CFG.step], CFG);
    CFG.step = Math.max(0, CFG.step - 1);
    renderStep();
    await mountCurrent();
  }

  /* Handlery */
  if (btnNext) btnNext.addEventListener('click', goNext);
  if (btnPrev) btnPrev.addEventListener('click', goPrev);

  openButtons.forEach(btn => btn.addEventListener('click', openConfigurator));
  closeEls.forEach(el => el.addEventListener('click', closeConfigurator));
  if (backdrop) backdrop.addEventListener('click', closeConfigurator);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeConfigurator(); });

  // pomoc dla devów: ScanduraCfg.open(), ScanduraCfg.close()
  window.ScanduraCfg = { open: openConfigurator, close: closeConfigurator, CFG };
  console.log(`[Configurator] Podpięto ${openButtons.length} przycisk(i/ów) otwierających.`);
});
