// js/configurator.js
// Kompletny i poprawiony konfigurator z obsługą custom-prompt
import { initStepSummary, populateSummary } from './Konfigurator-AI/step-summary.js';
import { sendToAI } from './Konfigurator-AI/configurator-api.js';

console.log('📁 Sprawdzam ścieżki:');
console.log('Aktualny URL:', window.location.href);
console.log('Bazowa ścieżka:', window.location.origin);

document.addEventListener('DOMContentLoaded', () => {
  try {
    
    // --- ELEMENTY DOM ---
    const openBtn   = document.getElementById('open-configurator-button');
    const modal     = document.getElementById('configurator-modal');
    const closeBtn  = document.getElementById('close-configurator-button');
    const overlay   = document.getElementById('configurator-overlay');

    const step1         = document.getElementById('step-style-selection');
    const step2         = document.getElementById('step-area');
    const stepCustom    = document.getElementById('step-custom-prompt');
    const step3Modern   = document.getElementById('step-options-modern');
    const step3Classic  = document.getElementById('step-options-classic');
    const step3Dworek   = document.getElementById('step-options-dworek');
    const step4         = document.getElementById('step-floor-count');
    const step5         = document.getElementById('step-roof-elevation');
    const step6         = document.getElementById('step-garage');
    const step7         = document.getElementById('step-summary');

    // --- STANY UŻYTKOWNIKA ---
    const userSelections = {
      style:        null,
      area:         null,
      floors:       null,
      roof:         null,
      elev:         null,
      garage:       null,
      basement:     null,
      rent:         null,
      availability: null,
      customPrompt: null
    };
    window.userSelections = userSelections;

    // --- FUNKCJE GLOBALNE ---
    window.sendConfigToAI = sendToAI; // Przypisz funkcję z importu

    // --- FUNKCJA PRZEŁĄCZANIA KROKÓW ---
    function changeStep(target) {
      document.querySelectorAll('.configurator-modal__step').forEach(el => {
        el.style.display = 'none';
      });
      
      if (target instanceof HTMLElement) {
        target.style.display = 'block';
      }
    }
    window.changeStep = changeStep;

    // --- OTWIERANIE / ZAMYKANIE MODALU ---
    openBtn?.addEventListener('click', () => {
      modal.hidden = false;
      setTimeout(() => modal.classList.add('is-open'), 10);
      changeStep(step1);
    });
    
    function closeModal() {
      modal.classList.remove('is-open');
      setTimeout(() => { modal.hidden = true; }, 300);
    }
    
    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    // --- KROK 1: WYBÓR STYLU (Karuzela) ---
    const prevArrow     = step1.querySelector('.style-carousel__arrow--prev');
    const nextArrow     = step1.querySelector('.style-carousel__arrow--next');
    const carouselTrack = step1.querySelector('#style-carousel-track');
    const slides        = carouselTrack ? Array.from(carouselTrack.children) : [];
    let carouselIndex   = 0;

    function updateCarousel() {
      if (!carouselTrack || !slides.length) return;
      const w = slides[0].getBoundingClientRect().width;
      carouselTrack.style.transform = `translateX(-${carouselIndex * w}px)`;
      prevArrow.disabled = carouselIndex === 0;
      nextArrow.disabled = carouselIndex >= slides.length - 1;
    }

    prevArrow?.addEventListener('click', () => {
      if (carouselIndex > 0) {
        carouselIndex--;
        updateCarousel();
      }
    });
    
    nextArrow?.addEventListener('click', () => {
      if (carouselIndex < slides.length - 1) {
        carouselIndex++;
        updateCarousel();
      }
    });

    const styleButtons = step1.querySelectorAll('.style-carousel__select-button');
    styleButtons.forEach(btn => {
      btn.type = 'button';
      btn.addEventListener('click', () => {
        userSelections.style = btn.dataset.style;
        changeStep(step2);
        initStep2();
      });
    });

    // --- KROK 2: POWIERZCHNIA ---
    function initStep2() {
      changeStep(step2);

      const areaSlider  = document.getElementById('area-slider');
      const areaInput   = document.getElementById('area-input');
      const btnContinue = document.getElementById('area-continue-button');
      const btnBack     = document.querySelector('#step-area .step-area-selection__nav-button');
      const minVal      = +areaSlider.min;
      const maxVal      = +areaSlider.max;

      function updateProgress(v) {
        const pct = ((v - minVal) / (maxVal - minVal)) * 100;
        areaSlider.style.background = `linear-gradient(to right, #DC9B59 ${pct}%, #e9e9e9 ${pct}%)`;
      }

      function syncArea(e) {
        let v = parseInt(e.target.value, 10);
        if (isNaN(v)) v = minVal;
        v = Math.max(minVal, Math.min(maxVal, v));
        areaSlider.value = v;
        areaInput.value  = v;
        updateProgress(v);
        btnContinue.disabled = v <= minVal;
        userSelections.area = v;
      }

      areaSlider.addEventListener('input', syncArea);
      areaInput.addEventListener('input', syncArea);
      syncArea({ target: areaSlider });

      btnBack?.addEventListener('click', () => changeStep(step1));

      btnContinue?.addEventListener('click', () => {
        if (btnContinue.disabled) return;
        if (userSelections.style === 'custom') {
          changeStep(stepCustom);
          initStepCustomPrompt();
        } else {
          initStep3();
        }
      });
    }
    window.initStep2 = initStep2;

    // --- KROK CUSTOM PROMPT ---
    function initStepCustomPrompt() {
      changeStep(stepCustom);

      const promptInput = document.getElementById('custom-prompt-textarea');
      const btnBack     = document.getElementById('custom-prompt-back-button');
      const btnCont     = document.getElementById('custom-prompt-continue-button');

      if (!promptInput || !btnBack || !btnCont) {
        console.error('Brakuje elementów w kroku custom prompt.');
        return;
      }

      btnCont.disabled = promptInput.value.trim() === '';
      
      promptInput.addEventListener('input', () => {
        btnCont.disabled = promptInput.value.trim() === '';
      });

      btnBack.addEventListener('click', () => {
        initStep2();
      });

      btnCont.addEventListener('click', async () => {
        const userText = promptInput.value.trim();
        const basePrompt = `Stwórz fotorealistyczną wizualizację nowoczesnego domu jednorodzinnego o powierzchni ${userSelections.area} m².`;
        const finalPrompt = `${basePrompt} Szczegóły: ${userText}`;

        userSelections.customPrompt = finalPrompt;

        // Przejdź od razu do kroku kondygnacji
        changeStep(step4);
        initStep4();
      });
    }
    window.initStepCustomPrompt = initStepCustomPrompt;

    // --- KROK 3: WARIANTY (dla modern, classic, dworek) ---
    function initStep3() {
      const id = `step-options-${userSelections.style}`;
      const container = document.getElementById(id);
      if (!container) {
        console.error('Nie znaleziono kroku 3:', id);
        return;
      }
      changeStep(container);

      const opts   = container.querySelectorAll('.floor-options__button');
      const btnCont = container.querySelector('[data-continue-from="options"]');
      const btnBack = container.querySelector('[data-back-to="step-area"]');
      let selected = null;

      btnCont.disabled = true;
      opts.forEach(b => {
        b.type = 'button';
        b.addEventListener('click', () => {
          opts.forEach(x => x.classList.remove('is-active'));
          b.classList.add('is-active');
          selected = b.dataset.variant;
          userSelections.variant = selected;
          btnCont.disabled = false;
        });
      });

      btnBack?.addEventListener('click', () => initStep2());
      btnCont?.addEventListener('click', () => {
        changeStep(step4);
        initStep4();
      });
    }
    window.initStep3 = initStep3;

    // --- KROK 4: KONDYGNACJE ---
    function initStep4() {
      changeStep(step4);
      const opts    = step4.querySelectorAll('.step-floor-count__option');
      const btnCont = step4.querySelector('.step-floor-count__nav-button--continue');
      const btnBack = step4.querySelector('.step-floor-count__nav-button--back');
      let sel = null;

      btnCont.disabled = true;
      opts.forEach(b => {
        b.type = 'button';
        b.addEventListener('click', () => {
          opts.forEach(x => x.classList.remove('is-active'));
          b.classList.add('is-active');
          sel = b.dataset.floors;
          userSelections.floors = sel;
          btnCont.disabled = false;
        });
      });

      btnBack?.addEventListener('click', () => {
        if (userSelections.style === 'custom') {
          initStepCustomPrompt();
        } else {
          initStep3();
        }
      });

      btnCont?.addEventListener('click', () => {
        changeStep(step5);
        initStep5();
      });
    }
    window.initStep4 = initStep4;

    // --- KROK 5: DACH I ELEWACJA ---
    function initStep5() {
      changeStep(step5);
      const roofOpts = step5.querySelectorAll('.step-roof-elev__roof-option');
      const elevOpts = step5.querySelectorAll('.step-roof-elev__facade-option');
      const btnBack = step5.querySelector('[data-back-to="step-floor-count"]');
      const btnCont = step5.querySelector('.step-roof-elev__nav-button--continue');
      let roofSel = false, elevSel = false;

      btnCont.disabled = true;

      roofOpts.forEach(b => {
        b.type = 'button';
        b.addEventListener('click', () => {
          roofOpts.forEach(x => x.classList.remove('is-active'));
          b.classList.add('is-active');
          roofSel = true;
          userSelections.roof = b.dataset.roof;
          if (roofSel && elevSel) btnCont.disabled = false;
        });
      });

      elevOpts.forEach(b => {
        b.type = 'button';
        b.addEventListener('click', () => {
          elevOpts.forEach(x => x.classList.remove('is-active'));
          b.classList.add('is-active');
          elevSel = true;
          userSelections.elev = b.dataset.facade;
          if (roofSel && elevSel) btnCont.disabled = false;
        });
      });

      btnBack?.addEventListener('click', () => initStep4());
      btnCont?.addEventListener('click', () => {
        changeStep(step6);
        initStep6();
      });
    }
    window.initStep5 = initStep5;

    // --- KROK 6: GARAŻ ---
    function initStep6() {
      changeStep(step6);

      const opts    = step6.querySelectorAll('.step-garage__button');
      const btnCont = step6.querySelector('.step-garage__nav-button--continue');
      const btnBack = step6.querySelector('.step-garage__nav-button--back');
      let sel = null;

      btnCont.disabled = true;

      opts.forEach(b => {
        b.type = 'button';
        b.addEventListener('click', () => {
          opts.forEach(x => x.classList.remove('is-active'));
          b.classList.add('is-active');
          sel = b.dataset.garage;
          userSelections.garage = sel;
          btnCont.disabled = false;
        });
      });

      btnBack?.addEventListener('click', () => initStep5());
      btnCont?.addEventListener('click', () => {
        initStepAdditional();
      });
    }
    window.initStep6 = initStep6;

    // --- KROK 7: OPCJE DODATKOWE ---
    function initStepAdditional() {
      const stepAdd      = document.getElementById('step-additional-options');
      const backBtn      = document.getElementById('additional-back-button');
      const contBtn      = document.getElementById('additional-continue-button');
      const chkBasement  = document.getElementById('opt-basement');
      const radRent      = document.getElementById('opt-rent');
      const radOwn       = document.getElementById('opt-own');
      const inputAvail   = document.getElementById('opt-availability');

      // Domyślne wartości
      userSelections.basement     = false;
      userSelections.rent         = null;
      userSelections.availability = null;

      changeStep(stepAdd);

      const updateContinue = () => {
        const modeChosen = radRent.checked || radOwn.checked;
        const dateChosen = inputAvail.value.trim() !== '';
        contBtn.disabled = !(modeChosen && dateChosen);
      };

      contBtn.disabled = true;

      chkBasement.addEventListener('change', () => {
        userSelections.basement = chkBasement.checked;
      });

      radRent.addEventListener('change', () => {
        userSelections.rent = true;
        updateContinue();
      });
      
      radOwn.addEventListener('change', () => {
        userSelections.rent = false;
        updateContinue();
      });

      inputAvail.addEventListener('change', () => {
        userSelections.availability = inputAvail.value;
        updateContinue();
      });

      backBtn.addEventListener('click', () => {
        initStep6();
      });

      contBtn.addEventListener('click', () => {
        const stepSummary = document.getElementById('step-summary');
        changeStep(stepSummary);
        populateSummary(userSelections);
        initStepSummary();
      });
    }
    window.initStepAdditional = initStepAdditional;

    // --- FUNKCJA GENEROWANIA OBRAZU DLA CUSTOM ---
    async function generateImageFromAI(prompt) {
      try {
        const response = await fetch('http://localhost:4000/api/generate-custom-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || 'Błąd generowania obrazu');
        }

        const data = await response.json();
        return data.imageUrl;
      } catch (err) {
        console.error('❌ Błąd generowania obrazu:', err);
        throw err;
      }
    }
    window.generateImageFromAI = generateImageFromAI;

  } catch (error) {
    console.error('Błąd w konfiguratorze:', error);
  }
});