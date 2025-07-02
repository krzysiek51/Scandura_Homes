// js/configurator.js
// Full configurator script with custom-prompt step support for style 'custom'
// nowa wersja: oba wywalamy z jednego modułu, który ma już pełne tłumaczenia
import { initStepSummary, populateSummary } from './Konfigurator-AI/step-summary.js';


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
  basement:     null,   // ← nowe pole, zawsze zdefiniowane
  rent:         null,   // ← nowe pole, zawsze zdefiniowane
  availability: null,   // ← nowe pole, zawsze zdefiniowane
  customPrompt: null
};
window.userSelections = userSelections;


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

    // Arrow navigation for carousel
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

    // Style selection buttons
    const styleButtons = step1.querySelectorAll('.style-carousel__select-button');
    styleButtons.forEach(btn => {
      btn.type = 'button';
      btn.addEventListener('click', () => {
        // Save selected style and go to step 2
        userSelections.style = btn.dataset.style; // 'modern'|'classic'|'dworek'|'custom'
        changeStep(step2);
        initStep2();
      });
    });

    // --- KROK 2: POWIERZCHNIA (Area Selection) ---
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
        // Enable continue only if area > minimum
        btnContinue.disabled = v <= minVal;
        userSelections.area = v;
      }

      areaSlider.addEventListener('input', syncArea);
      areaInput.addEventListener('input', syncArea);
      syncArea({ target: areaSlider }); // initialize with slider's default value

      btnBack?.addEventListener('click', () => changeStep(step1));

      btnContinue?.addEventListener('click', () => {
        if (btnContinue.disabled) return;
        if (userSelections.style === 'custom') {
          // For custom style: go to custom prompt step
          changeStep(stepCustom);
          window.initStepCustomPrompt();  // call the function to initialize custom prompt step
        } else {
          // For other styles: proceed to variants selection (step 3)
          initStep3();
        }
      });
    }
    window.initStep2 = initStep2;

   function initStepCustomPrompt() {
  // Pokazuje krok custom prompt
  changeStep(document.getElementById('step-custom-prompt'));

  const promptInput = document.getElementById('custom-prompt-textarea');
  const btnBack     = document.getElementById('custom-prompt-back-button');
  const btnCont     = document.getElementById('custom-prompt-continue-button');

  if (!promptInput || !btnBack || !btnCont) {
    console.error('Brakuje elementów w kroku custom prompt.');
    return;
  }

  // Walidacja: włącz przycisk tylko jeśli coś wpisano
  btnCont.disabled = promptInput.value.trim() === '';
  promptInput.addEventListener('input', () => {
    btnCont.disabled = promptInput.value.trim() === '';
  });

  // Wstecz do kroku powierzchni
  btnBack.addEventListener('click', () => {
    initStep2();
  });

  // Kliknięcie „Generuj wizualizację”
  btnCont.addEventListener('click', async () => {
    const userText = promptInput.value.trim();
    const basePrompt = `Stwórz fotorealistyczną wizualizację nowoczesnego domu jednorodzinnego o powierzchni ${userSelections.area} m².`;
    const finalPrompt = `${basePrompt} Szczegóły: ${userText}`;

    window.userSelections.customPrompt = finalPrompt;

    // Zablokuj UI
    btnCont.disabled = true;
    btnCont.textContent = '⏳ Generuję...';

    // Dodaj loader
    const loader = document.createElement('div');
    loader.className = 'configurator-loader';
    loader.textContent = 'AI tworzy wizualizację...';
    document.getElementById('step-custom-prompt').appendChild(loader);

    try {
      const imageUrl = await generateImageFromAI(finalPrompt);
      console.log('Obrazek wygenerowany:', imageUrl);

      // Tu możesz wyświetlić obrazek lub przejść do kolejnego kroku
      alert('Wizualizacja gotowa! (tu pojawi się obrazek)');

    } catch (err) {
      console.error('Błąd generowania:', err);
      alert('Wystąpił błąd podczas generowania.');
    } finally {
      loader.remove();
      btnCont.disabled = false;
      btnCont.textContent = '🎨 Generuj wizualizację';
    }
  });
}
window.initStepCustomPrompt = initStepCustomPrompt;


    // --- KROK 3: TYPOWY DOM (Variants for modern, classic, dworek) ---
    function initStep3() {
      // Determine which variant container to show based on style
      const id = `step-options-${userSelections.style}`;
      const container = document.getElementById(id);
      if (!container) {
        console.error('Nie znaleziono kroku 3:', id);
        return;
      }
      changeStep(container);

      // Initialize variant selection buttons
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
          userSelections.floors = selected;  // possibly number of floors or variant ID
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

    // --- KROK 4: KONDYGNACJE (Floor Count) ---
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

      // <!-- MODIFIED: Back navigation for custom style -->
      btnBack?.addEventListener('click', () => {
        if (userSelections.style === 'custom') {
          // If custom style, go back to custom prompt step
          initStepCustomPrompt();
        } else {
          // Otherwise, go back to variants selection (step 3)
          initStep3();
        }
      });
      // <!-- END MODIFIED -->

      btnCont?.addEventListener('click', () => {
        changeStep(step5);
        initStep5();
      });
    }
    window.initStep4 = initStep4;

    // --- KROK 5: DACH I ELEWACJA (Roof and Facade) ---
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
      userSelections.roof = b.dataset.roof; // Upewnij się że tu jest .roof
      console.log('✅ Dach wybrany:', userSelections.roof);
      if (roofSel && elevSel) btnCont.disabled = false;
    });
  });

  elevOpts.forEach(b => {
    b.type = 'button';
    b.addEventListener('click', () => {
      elevOpts.forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      elevSel = true;
      userSelections.elev = b.dataset.facade; // Upewnij się że tu jest .facade
      console.log('✅ Elewacja wybrana:', userSelections.elev);
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

   // === Krok 6: Garaż ===
function initStep6() {
  // step6 masz już zdefiniowane wyżej: const step6 = document.getElementById('step-garage');
  changeStep(step6);

  const opts    = step6.querySelectorAll('.step-garage__button');
  const btnCont = step6.querySelector('.step-garage__nav-button--continue');
  const btnBack = step6.querySelector('.step-garage__nav-button--back');
  let sel = null;

  // zablokuj przycisk kontynuuj do czasu wyboru
  btnCont.disabled = true;

  // obsługa wyboru garażu
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

  // wstecz do kroku 5
  btnBack?.addEventListener('click', () => initStep5());

  // przejdź do dodatkowego kroku (new)
  btnCont?.addEventListener('click', () => {
    initStepAdditional();
  });
}
window.initStep6 = initStep6;
 // --- Krok 7: Dodatkowe opcje (piwnica, wynajem/własność, dostępność) ---
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

  // Pokaż sekcję
  changeStep(stepAdd);

  // Funkcja odblokowująca "Kontynuuj" - wymaga rent/own oraz daty
  const updateContinue = () => {
    const modeChosen = radRent.checked || radOwn.checked;
    const dateChosen = inputAvail.value.trim() !== '';
    contBtn.disabled = !(modeChosen && dateChosen);
  };

  // Początkowy stan
  contBtn.disabled = true;

  // Obsługa checkboxa piwnicy
  chkBasement.addEventListener('change', () => {
    userSelections.basement = chkBasement.checked;
  });

  // Obsługa wyboru rent/own
  radRent.addEventListener('change', () => {
    userSelections.rent = true;
    updateContinue();
  });
  radOwn.addEventListener('change', () => {
    userSelections.rent = false;
    updateContinue();
  });

  // Obsługa wyboru daty
  inputAvail.addEventListener('change', () => {
    userSelections.availability = inputAvail.value;
    updateContinue();
  });

  // Wstecz do kroku Garaż
  backBtn.addEventListener('click', () => {
    initStep6();
  });

  // Dalej do Podsumowania
  contBtn.addEventListener('click', () => {
    const stepSummary = document.getElementById('step-summary');
    changeStep(stepSummary);
    populateSummary(userSelections);
    initStepSummary();
  });
}
window.initStepAdditional = initStepAdditional;


    // --- KROK 8: PODSUMOWANIE (Summary) ---
    function initStep7() {
  initStepSummary(); // <-- teraz import będzie użyty
}
window.initStep7 = initStep7;

    window.initStep7 = initStep7;

  } catch (e) {
    console.error('Błąd konfiguratora:', e);
  }
});
