// configurator.js
// Poprawiona, kompletna wersja pliku JS dla modalnego konfiguratora

document.addEventListener('DOMContentLoaded', () => {
  try {
    // --- ELEMENTY DOM ---
    const openBtn = document.getElementById('open-configurator-button');
    const modal = document.getElementById('configurator-modal');
    const closeBtn = document.getElementById('close-configurator-button');
    const overlay = document.getElementById('configurator-overlay');

    const step1 = document.getElementById('step-style-selection');
    const step2 = document.getElementById('step-area');
    const step3 = document.getElementById('step-floors');
    const step4 = document.getElementById('step-roof-elevation');
    const step5 = document.getElementById('step-addons');
    const step6 = document.getElementById('step-summary');

    const prevArrow = document.querySelector('.style-carousel__arrow--prev');
    const nextArrow = document.querySelector('.style-carousel__arrow--next');
    const carouselTrack = document.getElementById('style-carousel-track');
    const styleButtons = document.querySelectorAll('.style-carousel__select-button');
    const slides = carouselTrack ? Array.from(carouselTrack.children) : [];
    let carouselIndex = 0;

    const areaSlider = document.getElementById('area-slider');
    const areaInput = document.getElementById('area-input');
    const btnAreaContinue = document.getElementById('area-continue-button');
    const btnBackToStyle = document.getElementById('back-to-style-button');

    const floorButtons = document.querySelectorAll('.floor-options__button');
    const btnFloorsContinue = document.getElementById('floors-continue-button');
    const btnBackToArea = document.getElementById('back-to-area-button');

    const roofButtons = document.querySelectorAll('[data-roof]');
    const elevButtons = document.querySelectorAll('[data-elev]');
    const btnRoofElevContinue = document.getElementById('roof-elev-continue-button');
    const btnBackToFloors = document.getElementById('back-to-floors-button');

    const garageButtons = document.querySelectorAll('[data-garage]');
    const basementButtons = document.querySelectorAll('[data-basement]');
    const rentalButtons = document.querySelectorAll('[data-rental]');
    const accessibilityButtons = document.querySelectorAll('[data-accessibility]');
    const btnAddonsContinue = document.getElementById('addons-continue-button');
    const btnBackToRoof = document.getElementById('back-to-roof-button');

    const sumStyle = document.getElementById('sum-style');
    const sumArea = document.getElementById('sum-area');
    const sumFloors = document.getElementById('sum-floors');
    const sumRoof = document.getElementById('sum-roof');
    const sumElev = document.getElementById('sum-elev');
    const sumGarage = document.getElementById('sum-garage');
    const sumBasement = document.getElementById('sum-basement');
    const sumRental = document.getElementById('sum-rental');
    const sumAccessibility = document.getElementById('sum-accessibility');
    const btnGenerateVisualization = document.getElementById('generate-visualization');
    const aiResultContainer = document.getElementById('ai-result');

    // --- STANY UŻYTKOWNIKA ---
    const userSelections = {
      style: null,
      area: +areaSlider?.min || 0,
      floors: null,
      roof: null,
      elev: null,
      garage: null,
      basement: null,
      rental: null,
      accessibility: null
    };

    // --- FUNKCJE POMOCNICZE ---
    function changeStep(stepEl) {
      [step1, step2, step3, step4, step5, step6].forEach(s => s && (s.style.display = 'none'));
      if (stepEl) stepEl.style.display = 'block';
    }

    function updateCarousel() {
      if (!carouselTrack || !slides.length) return;
      const w = slides[0].getBoundingClientRect().width;
      carouselTrack.style.transform = `translateX(-${carouselIndex * w}px)`;
      prevArrow && (prevArrow.disabled = carouselIndex === 0);
      nextArrow && (nextArrow.disabled = carouselIndex === slides.length - 1);
    }

    function updateSliderProgress() {
      if (!areaSlider) return;
      const min = +areaSlider.min;
      const max = +areaSlider.max;
      const val = +areaSlider.value;
      const pct = ((val - min) / (max - min)) * 100;
      areaSlider.style.background = `linear-gradient(to right, #DC9B59 ${pct}%, #e9e9e9 ${pct}%)`;
    }

    // --- PRZEJŚCIA KROKÓW ---
    function goToStep1() {
      changeStep(step1);
      carouselIndex = 0;
      setTimeout(updateCarousel, 50);
    }
    function goToStep2(style) {
      userSelections.style = style;
      if (areaSlider) {
        areaSlider.value = areaInput.value = areaSlider.min;
        btnAreaContinue && (btnAreaContinue.disabled = true);
        updateSliderProgress();
      }
      changeStep(step2);
    }
    function goToStep3() {
      userSelections.area = +areaInput.value;
      btnFloorsContinue && (btnFloorsContinue.disabled = true);
      changeStep(step3);
    }
    function goToStep4() {
      btnRoofElevContinue && (btnRoofElevContinue.disabled = true);
      changeStep(step4);
    }
    function goToStep5() {
      btnAddonsContinue && (btnAddonsContinue.disabled = true);
      changeStep(step5);
    }
    function goToStep6() {
      sumStyle && (sumStyle.textContent = userSelections.style || 'N/A');
      sumArea && (sumArea.textContent = userSelections.area + ' m²');
      sumFloors && (sumFloors.textContent = userSelections.floors || 'N/A');
      sumRoof && (sumRoof.textContent = userSelections.roof || 'N/A');
      sumElev && (sumElev.textContent = userSelections.elev || 'N/A');
      sumGarage && (sumGarage.textContent = userSelections.garage || 'N/A');
      sumBasement && (sumBasement.textContent = userSelections.basement || 'N/A');
      sumRental && (sumRental.textContent = userSelections.rental || 'N/A');
      sumAccessibility && (sumAccessibility.textContent = userSelections.accessibility || 'N/A');
      changeStep(step6);
    }

    // --- MODAL OPEN/CLOSE ---
    function openModal() {
      modal && modal.removeAttribute('hidden');
      setTimeout(() => modal.classList.add('is-open'), 20);
      goToStep1();
    }
    function closeModal() {
      modal && modal.classList.remove('is-open');
      setTimeout(() => modal.setAttribute('hidden', 'true'), 300);
    }

    // --- PODPIĘCIE ZDARZEŃ ---
    openBtn && openBtn.addEventListener('click', openModal);
    closeBtn && closeBtn.addEventListener('click', closeModal);
    overlay && overlay.addEventListener('click', closeModal);

    // Karuzela
    prevArrow && prevArrow.addEventListener('click', () => { if (carouselIndex > 0) { carouselIndex--; updateCarousel(); } });
    nextArrow && nextArrow.addEventListener('click', () => { if (carouselIndex < slides.length - 1) { carouselIndex++; updateCarousel(); } });
    styleButtons.forEach(btn => btn.addEventListener('click', () => goToStep2(btn.dataset.style)));

    // Krok 2: Powierzchnia
    areaSlider && areaSlider.addEventListener('input', () => { areaInput.value = areaSlider.value; updateSliderProgress(); btnAreaContinue.disabled = +areaSlider.value <= +areaSlider.min; });
    areaInput && areaInput.addEventListener('input', () => { areaSlider.value = areaInput.value; updateSliderProgress(); btnAreaContinue.disabled = +areaInput.value <= +areaSlider.min; });
    btnAreaContinue && btnAreaContinue.addEventListener('click', goToStep3);
    btnBackToStyle && btnBackToStyle.addEventListener('click', goToStep1);

    // Krok 3: Kondygnacje
    floorButtons.forEach(btn => btn.addEventListener('click', () => {
      floorButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.floors = btn.dataset.floors;
      btnFloorsContinue.disabled = false;
    }));
    btnFloorsContinue && btnFloorsContinue.addEventListener('click', goToStep4);
    btnBackToArea && btnBackToArea.addEventListener('click', goToStep2(userSelections.style));

    // Krok 4: Dach + Elewacja
    const checkRoofElev = () => { if (userSelections.roof && userSelections.elev) btnRoofElevContinue.disabled = false; };
    roofButtons.forEach(btn => btn.addEventListener('click', () => {
      roofButtons.forEach(x => x.classList.remove('is-active')); btn.classList.add('is-active'); userSelections.roof = btn.dataset.roof; checkRoofElev();
    }));
    elevButtons.forEach(btn => btn.addEventListener('click', () => {
      elevButtons.forEach(x => x.classList.remove('is-active')); btn.classList.add('is-active'); userSelections.elev = btn.dataset.elev; checkRoofElev();
    }));
    btnRoofElevContinue && btnRoofElevContinue.addEventListener('click', goToStep5);
    btnBackToFloors && btnBackToFloors.addEventListener('click', goToStep3);

    // Krok 5: Dodatki
    const checkAddons = () => {
      if (userSelections.garage && userSelections.basement && userSelections.rental && userSelections.accessibility) btnAddonsContinue.disabled = false;
    };
    [[garageButtons,'garage'],[basementButtons,'basement'],[rentalButtons,'rental'],[accessibilityButtons,'accessibility']].forEach(([group,key]) => {
      group.forEach(btn => btn.addEventListener('click', () => {
        group.forEach(x => x.classList.remove('is-active')); btn.classList.add('is-active'); userSelections[key] = btn.dataset[key]; checkAddons();
      }));
    });
    btnAddonsContinue && btnAddonsContinue.addEventListener('click', goToStep6);
    btnBackToRoof && btnBackToRoof.addEventListener('click', goToStep4);

    // Krok 6: AI Visualization
    btnGenerateVisualization && btnGenerateVisualization.addEventListener('click', async () => {
      // tutaj logika wywołania AI
    });

  } catch (error) {
    console.error('BŁĄD KRYTYCZNY W KONFIGURATORZE:', error);
  }
});
