// js/configurator.js

document.addEventListener('DOMContentLoaded', () => {
  try {
    // --- ELEMENTY DOM ---
    const openBtn   = document.getElementById('open-configurator-button');
    const modal     = document.getElementById('configurator-modal');
    const closeBtn  = document.getElementById('close-configurator-button');
    const overlay   = document.getElementById('configurator-overlay');

    const step1     = document.getElementById('step-style-selection');
    const step2     = document.getElementById('step-area');
    // Krok 3: dynamiczne kontenery step-options-*
    const step4     = document.getElementById('step-roof-elevation');
    const step5     = document.getElementById('step-addons');
    const step6     = document.getElementById('step-summary');

    // --- STANY UŻYTKOWNIKA ---
    const userSelections = {
      style: null,
      area: null,
      floors: null,
      roof: null,
      elev: null,
      garage: null,
      basement: null,
      rental: null,
      accessibility: null
    };
    window.userSelections = userSelections;

    // --- POMOCNICZE ---
    function changeStep(show) {
      document.querySelectorAll('.configurator-modal__step').forEach(el => {
        el.style.display = 'none';
      });
      if (show) show.style.display = 'block';
    }
    window.changeStep = changeStep;

    // --- KROK 1: STYL ---
    const styleButtons  = document.querySelectorAll('.style-carousel__select-button');
    const prevArrow     = document.querySelector('.style-carousel__arrow--prev');
    const nextArrow     = document.querySelector('.style-carousel__arrow--next');
    const carouselTrack = document.getElementById('style-carousel-track');
    const slides        = carouselTrack ? Array.from(carouselTrack.children) : [];
    let carouselIndex   = 0;

    function updateCarousel() {
      if (!carouselTrack) return;
      const w = slides[0].getBoundingClientRect().width;
      carouselTrack.style.transform = `translateX(-${carouselIndex * w}px)`;
      if (prevArrow) prevArrow.disabled = carouselIndex === 0;
      if (nextArrow) nextArrow.disabled = carouselIndex >= slides.length - 1;
    }

    openBtn?.addEventListener('click', () => {
      modal.hidden = false;
      setTimeout(() => modal.classList.add('is-open'), 20);
      goToStep1();
    });
    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    prevArrow?.addEventListener('click', () => {
      if (carouselIndex > 0) { carouselIndex--; updateCarousel(); }
    });
    nextArrow?.addEventListener('click', () => {
      if (carouselIndex < slides.length - 1) { carouselIndex++; updateCarousel(); }
    });

    styleButtons.forEach(btn =>
      btn.addEventListener('click', () => {
        userSelections.style = btn.dataset.style;
        goToStep2();
      })
    );

    // --- KROK 2: POWIERZCHNIA ---
    const areaSlider      = document.getElementById('area-slider');
    const areaInput       = document.getElementById('area-input');
    const btnAreaContinue = document.getElementById('area-continue-button');
    const btnBackToStyle  = document.querySelector(
      '#step-area .step-area-selection__nav-button[data-back-to="step-style-selection"]'
    );

    function updateSliderProgress() {
      if (!areaSlider) return;
      const min = +areaSlider.min,
            max = +areaSlider.max,
            val = +areaSlider.value,
            pct = ((val - min) / (max - min)) * 100;
      areaSlider.style.background = `linear-gradient(to right, #DC9B59 ${pct}%, #e9e9e9 ${pct}%)`;
    }

    if (areaSlider && areaInput && btnAreaContinue && btnBackToStyle) {
      const minVal = +areaSlider.min,
            maxVal = +areaSlider.max;
      const handleAreaSync = e => {
        let v = parseInt(e.target.value, 10);
        if (isNaN(v)) v = minVal;
        v = Math.max(minVal, Math.min(v, maxVal));
        areaSlider.value = v;
        areaInput.value  = v;
        updateSliderProgress();
        btnAreaContinue.disabled = v <= minVal;
        userSelections.area = v;
      };
      areaSlider.addEventListener('input', handleAreaSync);
      areaInput.addEventListener('input', handleAreaSync);
      handleAreaSync({ target: areaSlider });

      btnAreaContinue.addEventListener('click', goToStep3);
      btnBackToStyle.addEventListener('click', goToStep1);
    }

    // --- PRZEJŚCIA MIĘDZY KROKAMI ---
    function goToStep1() {
      changeStep(step1);
      setTimeout(updateCarousel, 50);
    }
    window.goToStep1 = goToStep1;

    function goToStep2() {
      changeStep(step2);
    }
    window.goToStep2 = goToStep2;

    function goToStep3() {
      const id = userSelections.style === 'modern'  ? 'step-options-modern'
               : userSelections.style === 'classic' ? 'step-options-classic'
               : userSelections.style === 'dworek'  ? 'step-options-dworek'
               : 'step-custom-prompt';
      const stepEl = document.getElementById(id);
      if (!stepEl) return console.error('Brak kroku 3:', id);
      changeStep(stepEl);

      const variantButtons = stepEl.querySelectorAll('.floor-options__button');
      const btnContinueOpt = stepEl.querySelector('[data-continue-from="options"]');
      const btnBackToArea  = stepEl.querySelector('[data-back-to="step-area"]');

      if (btnContinueOpt) {
        btnContinueOpt.disabled = true;
        variantButtons.forEach(b =>
          b.addEventListener('click', () => {
            variantButtons.forEach(x => x.classList.remove('is-active'));
            b.classList.add('is-active');
            userSelections.floors = b.dataset.variant;
            btnContinueOpt.disabled = false;
          })
        );
        btnContinueOpt.addEventListener('click', goToStep4);
      }
      btnBackToArea?.addEventListener('click', goToStep2);
    }
    window.goToStep3 = goToStep3;

    function goToStep4() {
      changeStep(document.getElementById('step-floor-count'));
      window.goToStep4?.(); // external logic
    }
    window.goToStep4 = goToStep4;

    function goToStep5() {
      changeStep(step5);
    }
    window.goToStep5 = goToStep5;

    function goToStep6() {
      document.getElementById('sum-style').textContent  = userSelections.style || 'N/A';
      document.getElementById('sum-area').textContent   = userSelections.area ? `${userSelections.area} m²` : 'N/A';
      document.getElementById('sum-floors').textContent = userSelections.floors || 'N/A';
      changeStep(step6);
    }
    window.goToStep6 = goToStep6;

    function closeModal() {
      modal.classList.remove('is-open');
      setTimeout(() => modal.hidden = true, 300);
    }
  }
  catch (e) {
    console.error("BŁĄD KRYTYCZNY W KONFIGURATORZE:", e);
  }
});
