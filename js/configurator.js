// js/configurator.js

document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTY DOM ---
  const openBtn                 = document.getElementById('open-configurator-button');
  const modal                   = document.getElementById('configurator-modal');
  const closeBtn                = document.getElementById('close-configurator-button');
  const overlay                 = document.getElementById('configurator-overlay');

  const step1                   = document.getElementById('step-style-selection');
  const step2                   = document.getElementById('step-area');
  const step3                   = document.getElementById('step-floors');
  const step4                   = document.getElementById('step-roof-elevation');
  const step5                   = document.getElementById('step-addons');
  const step6                   = document.getElementById('step-summary');

  const styleButtons            = document.querySelectorAll('.style-carousel__select-button');
  const prevArrow               = document.querySelector('.style-carousel__arrow--prev');
  const nextArrow               = document.querySelector('.style-carousel__arrow--next');
  const carouselTrack           = document.getElementById('style-carousel-track');
  const slides                  = carouselTrack ? Array.from(carouselTrack.children) : [];
  let carouselIndex             = 0;

  const areaSlider              = document.getElementById('area-slider');
  const areaInput               = document.getElementById('area-input');
  const btnAreaContinue         = document.getElementById('area-continue-button');
  const btnBackToStyle          = document.getElementById('back-to-style-button');

  const floorButtons            = document.querySelectorAll('.floor-options__button');
  const btnFloorsContinue       = document.getElementById('floors-continue-button');
  const btnBackToArea           = document.getElementById('back-to-area-button');

  const roofButtons             = document.querySelectorAll('[data-roof]');
  const elevButtons             = document.querySelectorAll('[data-elev]');
  const btnRoofElevContinue     = document.getElementById('roof-elev-continue-button');
  const btnBackToFloors         = document.getElementById('back-to-floors-button');

  const garageButtons           = document.querySelectorAll('.addon-garage__button');
  const basementButtons         = document.querySelectorAll('.addon-basement__button');
  const rentalButtons           = document.querySelectorAll('.addon-rental__button');
  const accessibilityButtons    = document.querySelectorAll('.addon-accessibility__button');
  const btnAddonsContinue       = document.getElementById('addons-continue-button');
  const btnBackToRoof           = document.getElementById('back-to-roof-button');

  const summaryImg              = document.getElementById('summary-img');
  const sumStyle                = document.getElementById('sum-style');
  const sumArea                 = document.getElementById('sum-area');
  const sumFloors               = document.getElementById('sum-floors');
  const sumRoof                 = document.getElementById('sum-roof');
  const sumElev                 = document.getElementById('sum-elev');
  const sumGarage               = document.getElementById('sum-garage');
  const sumBasement             = document.getElementById('sum-basement');
  const sumRental               = document.getElementById('sum-rental');
  const sumAccessibility        = document.getElementById('sum-accessibility');
  const btnGenerateVisualization= document.getElementById('generate-visualization');
  const aiResultContainer       = document.getElementById('ai-result');

  // --- STANY UŻYTKOWNIKA ---
  const userSelections = {
    style:        null,
    area:         null,
    floors:       null,
    roof:         null,
    elev:         null,
    garage:       null,
    basement:     null,
    rental:       null,
    accessibility:null
  };

  // --- FUNKCJE POMOCNICZE ---
  function changeStep(show) {
    [step1, step2, step3, step4, step5, step6].forEach(s => {
      if (!s) return;
      s.style.display = 'none';
    });
    if (show) show.style.display = 'block';
  }

  function updateCarousel() {
    if (!carouselTrack) return;
    const w = slides[0].getBoundingClientRect().width;
    carouselTrack.style.transform = `translateX(-${carouselIndex * w}px)`;
    prevArrow.disabled = carouselIndex === 0;
    nextArrow.disabled = carouselIndex >= slides.length - 1;
  }

  function updateSliderProgress() {
    const min = +areaSlider.min, max = +areaSlider.max, val = +areaSlider.value;
    const pct = (val - min) / (max - min) * 100;
    areaSlider.style.background = `linear-gradient(to right, #DC9B59 ${pct}%, #e9e9e9 ${pct}%)`;
  }

  // --- PRZEJŚCIA MIĘDZY KROKAMI ---
  function goToStep1() {
    changeStep(step1);
    setTimeout(updateCarousel, 50);
  }
  function goToStep2(style) {
    userSelections.style = style;
    userSelections.area  = +areaSlider.min;
    userSelections.floors= null;
    btnAreaContinue.disabled = true;
    areaSlider.value = areaInput.value = areaSlider.min;
    updateSliderProgress();
    changeStep(step2);
  }
  function goToStep3() {
    userSelections.area = +areaSlider.value;
    userSelections.floors = null;
    btnFloorsContinue.disabled = true;
    changeStep(step3);
  }
  function goToStep4() {
    userSelections.floors = userSelections.floors; // już ustawione
    userSelections.roof = null;
    userSelections.elev = null;
    btnRoofElevContinue.disabled = true;
    changeStep(step4);
  }
  function goToStep5() {
    userSelections.roof = userSelections.roof;
    userSelections.elev = userSelections.elev;
    userSelections.garage = null;
    userSelections.basement = null;
    userSelections.rental = null;
    userSelections.accessibility = null;
    btnAddonsContinue.disabled = true;
    changeStep(step5);
  }
  function goToStep6() {
    // wypelnij podsumowanie
    sumStyle.textContent         = userSelections.style;
    sumArea.textContent          = userSelections.area;
    sumFloors.textContent        = userSelections.floors;
    sumRoof.textContent          = userSelections.roof;
    sumElev.textContent          = userSelections.elev;
    sumGarage.textContent        = userSelections.garage;
    sumBasement.textContent      = userSelections.basement;
    sumRental.textContent        = userSelections.rental;
    sumAccessibility.textContent = userSelections.accessibility;
    changeStep(step6);
  }

  // --- OBSŁUGA OTWIERANIA/ZAMYKANIA ---
  openBtn.addEventListener('click', () => {
    goToStep1();
    modal.hidden = false;
    setTimeout(() => modal.classList.add('is-open'), 20);
  });
  function closeModal() {
    modal.classList.remove('is-open');
    setTimeout(() => modal.hidden = true, 300);
  }
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // --- KARUZELA STYLU (KROK 1) ---
  prevArrow.addEventListener('click', () => { carouselIndex--; updateCarousel(); });
  nextArrow.addEventListener('click', () => { carouselIndex++; updateCarousel(); });
  styleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep2(btn.dataset.style);
    });
  });

  // --- WYBÓR POWIERZCHNI (KROK 2) ---
  areaSlider.addEventListener('input', e => {
    updateSliderProgress();
    btnAreaContinue.disabled = +e.target.value <= +areaSlider.min;
  });
  areaInput.addEventListener('input', e => {
    let v = +e.target.value;
    if (v < areaSlider.min) v = areaSlider.min;
    if (v > areaSlider.max) v = areaSlider.max;
    areaSlider.value = areaInput.value = v;
    updateSliderProgress();
    btnAreaContinue.disabled = v <= +areaSlider.min;
  });
  btnAreaContinue.addEventListener('click', goToStep3);
  btnBackToStyle.addEventListener('click', goToStep1);

  // --- WYBÓR KONDYGNACJI (KROK 3) ---
  floorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      floorButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.floors = btn.dataset.floors;
      btnFloorsContinue.disabled = false;
    });
  });
  btnFloorsContinue.addEventListener('click', goToStep4);
  btnBackToArea.addEventListener('click', goToStep2.bind(null, userSelections.style));

  // --- WYBÓR DACHU + ELEWACJI (KROK 4) ---
  function checkRoofElev() {
    if (userSelections.roof && userSelections.elev) {
      btnRoofElevContinue.disabled = false;
    }
  }
  roofButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      roofButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.roof = btn.dataset.roof;
      checkRoofElev();
    });
  });
  elevButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elevButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.elev = btn.dataset.elev;
      checkRoofElev();
    });
  });
  btnRoofElevContinue.addEventListener('click', goToStep5);
  btnBackToFloors.addEventListener('click', goToStep3);

  // --- DODATKI (KROK 5) ---
  function checkAddons() {
    if (userSelections.garage && userSelections.basement && userSelections.rental && userSelections.accessibility) {
      btnAddonsContinue.disabled = false;
    }
  }
  garageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      garageButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.garage = btn.dataset.garage;
      checkAddons();
    });
  });
  basementButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      basementButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.basement = btn.dataset.basement;
      checkAddons();
    });
  });
  rentalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rentalButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.rental = btn.dataset.rental;
      checkAddons();
    });
  });
  accessibilityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      accessibilityButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.accessibility = btn.dataset.accessibility;
      checkAddons();
    });
  });
  btnAddonsContinue.addEventListener('click', goToStep6);
  btnBackToRoof.addEventListener('click', goToStep4);

  // --- PODSUMOWANIE I AI (KROK 6) ---
  btnGenerateVisualization.addEventListener('click', async () => {
    // wyślij userSelections na backend, odbierz image + cost
    aiResultContainer.textContent = 'Generowanie…';
    try {
      const resp = await fetch('/api/generate-visualization', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(userSelections)
      });
      const { imageUrl, costEstimate } = await resp.json();
      summaryImg.src = imageUrl;
      aiResultContainer.innerHTML = `<p>Szacunkowy koszt: ${costEstimate} PLN</p>`;
    } catch (err) {
      aiResultContainer.textContent = 'Błąd generowania wizualizacji';
      console.error(err);
    }
  });

  // --- PIERWSZE WYWOŁANIE ---
  goToStep1();
});
