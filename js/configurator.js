// js/configurator.js

document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTY DOM ---
  const openBtn                   = document.getElementById('open-configurator-button');
  const modal                     = document.getElementById('configurator-modal');
  const closeBtn                  = document.getElementById('close-configurator-button');
  const overlay                   = document.getElementById('configurator-overlay');

  const step1                     = document.getElementById('step-style-selection');
  const step2                     = document.getElementById('step-area');
  const step3                     = document.getElementById('step-floors');
  const step4                     = document.getElementById('step-roof-elevation');
  const step5                     = document.getElementById('step-addons');
  const step6                     = document.getElementById('step-summary');

  // Krok 1
  const styleButtons              = document.querySelectorAll('.style-carousel__select-button');
  const prevArrow                 = document.querySelector('.style-carousel__arrow--prev');
  const nextArrow                 = document.querySelector('.style-carousel__arrow--next');
  const carouselTrack             = document.getElementById('style-carousel-track');
  const slides                    = carouselTrack ? Array.from(carouselTrack.children) : [];
  let carouselIndex               = 0;

  // Krok 2
  const areaSlider                = document.getElementById('area-slider');
  const areaInput                 = document.getElementById('area-input');
  const btnAreaContinue           = document.getElementById('area-continue-button');
  const btnBackToStyle            = document.getElementById('back-to-style-button');

  // Krok 3
  const floorButtons              = document.querySelectorAll('.floor-options__button');
  const btnFloorsContinue         = document.getElementById('floors-continue-button');
  const btnBackToArea             = document.getElementById('back-to-area-button');

  // Krok 4: DACH + ELEWACJA
  const roofButtons               = document.querySelectorAll('#step-roof-elevation .roof-options__button');
  const elevButtons               = document.querySelectorAll('#step-roof-elevation .elev-options__button');
  const btnRoofElevContinue       = document.getElementById('roof-elev-continue-button');
  const btnBackToFloors           = document.getElementById('back-to-floors-button');

  // Krok 5: Dodatki
  const garageButtons             = document.querySelectorAll('.addon-garage__button');
  const basementButtons           = document.querySelectorAll('.addon-basement__button');
  const rentalButtons             = document.querySelectorAll('.addon-rental__button');
  const accessibilityButtons      = document.querySelectorAll('.addon-accessibility__button');
  const btnAddonsContinue         = document.getElementById('addons-continue-button');
  const btnBackToRoof             = document.getElementById('back-to-roof-button');

  // Krok 6: Podsumowanie
  const summaryImg                = document.getElementById('summary-img');
  const sumStyle                  = document.getElementById('sum-style');
  const sumArea                   = document.getElementById('sum-area');
  const sumFloors                 = document.getElementById('sum-floors');
  const sumRoof                   = document.getElementById('sum-roof');
  const sumElev                   = document.getElementById('sum-elev');
  const sumGarage                 = document.getElementById('sum-garage');
  const sumBasement               = document.getElementById('sum-basement');
  const sumRental                 = document.getElementById('sum-rental');
  const sumAccessibility          = document.getElementById('sum-accessibility');
  const btnGenerateVisualization  = document.getElementById('generate-visualization');
  const aiResultContainer         = document.getElementById('ai-result');

  // --- STANY UŻYTKOWNIKA ---
  const userSelections = {
    style:        null,
    area:         null,
    floors:       null,
    roof:         null,
    elev:         null,
    garage:       null,
    basement:     null,
    rental:       null,
    accessibility:null
  };

  // --- FUNKCJE POMOCNICZE ---
  function changeStep(show) {
    [step1, step2, step3, step4, step5, step6].forEach(s => {
      if (s) s.style.display = 'none';
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
    const pct = (val - min)/(max-min)*100;
    areaSlider.style.background = `linear-gradient(to right, #DC9B59 ${pct}%, #e9e9e9 ${pct}%)`;
  }

  // --- PRZEJŚCIA MIĘDZY KROKAMI ---
  function goToStep1() {
    changeStep(step1);
    setTimeout(updateCarousel,50);
  }
  function goToStep2(style) {
    userSelections.style = style;
    userSelections.area  = +areaSlider.min; // Ustawienie domyślnej wartości dla obszaru
    btnAreaContinue.disabled = true; // Przycisk jest nieaktywny, dopóki użytkownik nie ruszy sliderem/wpisze wartość
    areaSlider.value = areaInput.value = areaSlider.min;
    updateSliderProgress();
    changeStep(step2);
  }
  function goToStep3() {
    userSelections.area   = +areaSlider.value;
    userSelections.floors = null; // Resetuj wybór pięter
    btnFloorsContinue.disabled = true; // Przycisk jest nieaktywny, dopóki użytkownik nie wybierze piętra
    changeStep(step3);
  }
  function goToStep4() {
    // userSelections.floors jest już ustawione z poprzedniego kroku
    userSelections.roof   = null; // Resetuj wybór dachu
    userSelections.elev   = null; // Resetuj wybór elewacji
    btnRoofElevContinue.disabled = true; // Przycisk jest nieaktywny, dopóki nie wybrano dachu i elewacji
    changeStep(step4);
  }
  function goToStep5() {
    // userSelections.roof i userSelections.elev są już ustawione
    userSelections.garage        = null; // Resetuj wybory dodatków
    userSelections.basement      = null;
    userSelections.rental        = null;
    userSelections.accessibility = null;
    btnAddonsContinue.disabled   = true; // Przycisk nieaktywny, dopóki nie wybrano wszystkich dodatków
    changeStep(step5);
  }
  function goToStep6() {
    // Aktualizuj podsumowanie na podstawie userSelections
    sumStyle.textContent         = userSelections.style ? userSelections.style : 'N/A';
    sumArea.textContent          = userSelections.area ? `${userSelections.area} m²` : 'N/A';
    sumFloors.textContent        = userSelections.floors ? userSelections.floors : 'N/A';
    sumRoof.textContent          = userSelections.roof ? userSelections.roof : 'N/A';
    sumElev.textContent          = userSelections.elev ? userSelections.elev : 'N/A';
    sumGarage.textContent        = userSelections.garage ? userSelections.garage : 'N/A';
    sumBasement.textContent      = userSelections.basement ? userSelections.basement : 'N/A';
    sumRental.textContent        = userSelections.rental ? userSelections.rental : 'N/A';
    sumAccessibility.textContent = userSelections.accessibility ? userSelections.accessibility : 'N/A';
    changeStep(step6);
  }

  // --- OTWIERANIE / ZAMYKANIE MODALA ---
  openBtn.addEventListener('click', () => {
    modal.hidden = false;
    setTimeout(() => modal.classList.add('is-open'), 20);
    goToStep1();
  });
  function closeModal() {
    modal.classList.remove('is-open');
    setTimeout(() => modal.hidden = true, 300);
  }
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // --- KARUZELA STYLU (Krok 1) ---
  prevArrow.addEventListener('click', () => { carouselIndex--; updateCarousel(); });
  nextArrow.addEventListener('click', () => { carouselIndex++; updateCarousel(); });
  styleButtons.forEach(btn => btn.addEventListener('click', () => goToStep2(btn.dataset.style)));

  // --- POWIERZCHNIA (Krok 2) ---
  areaSlider.addEventListener('input', e => {
    updateSliderProgress();
    areaInput.value = e.target.value; // Aktualizuj pole tekstowe z wartością slidera
    btnAreaContinue.disabled = +e.target.value <= +areaSlider.min; // Aktywuj przycisk
  });
  areaInput.addEventListener('input', e => {
    let v = +e.target.value;
    if (v < areaSlider.min)    v = +areaSlider.min;
    if (v > areaSlider.max)    v = +areaSlider.max;
    areaSlider.value = v; // Aktualizuj slider z wartością z pola tekstowego
    e.target.value = v; // Upewnij się, że pole tekstowe wyświetla skorygowaną wartość
    updateSliderProgress();
    btnAreaContinue.disabled = v <= +areaSlider.min; // Aktywuj przycisk
  });
  btnAreaContinue.addEventListener('click', goToStep3);
  btnBackToStyle.addEventListener('click', goToStep1);

  // --- KONDYGNACJE (Krok 3) ---
  floorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      floorButtons.forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      userSelections.floors = btn.dataset.floors;
      btnFloorsContinue.disabled = false; // Aktywuj przycisk po wyborze
    });
  });
  btnFloorsContinue.addEventListener('click', goToStep4);
  btnBackToArea.addEventListener('click', () => goToStep2(userSelections.style));

  // --- DACH + ELEWACJA (Krok 4) ---
  function checkRoofElev() {
    if (userSelections.roof && userSelections.elev) {
      btnRoofElevContinue.disabled = false; // Aktywuj przycisk, gdy oba wybrane
    } else {
        btnRoofElevContinue.disabled = true; // Upewnij się, że jest wyłączony, jeśli brakuje
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

  // --- DODATKI (Krok 5) ---
  function checkAddons() {
    if (
      userSelections.garage !== null && // Zmieniono na !== null, aby uwzględnić "no"
      userSelections.basement !== null &&
      userSelections.rental !== null &&
      userSelections.accessibility !== null
    ) {
      btnAddonsContinue.disabled = false; // Aktywuj przycisk, gdy wszystkie wybrane
    } else {
        btnAddonsContinue.disabled = true; // Wyłącz, jeśli brakuje
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

// --- PODSUMOWANIE + AI (Krok 6) ---
  btnGenerateVisualization.addEventListener('click', async () => {
    aiResultContainer.textContent = 'Generowanie…';
    console.log('Wysyłane dane do AI:', userSelections);

    try {
      const resp = await fetch('http://localhost:4000/api/generate-visualization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userSelections)
      });

      if (!resp.ok) {
          const errorBody = await resp.json();
          const errorMessage = errorBody.error || 'Nieznany błąd';
          const errorDetails = errorBody.details ? ` (${errorBody.details})` : '';
          throw new Error(`Błąd serwera: ${errorMessage}${errorDetails}`);
      }

      const { imageUrl, costEstimate } = await resp.json(); // <--- POBIERAMY costEstimate
      console.log('AI image URL (z serwera):', imageUrl);
      console.log('Szacunkowy koszt (z serwera):', costEstimate); // Nowy log

      if (imageUrl) {
          summaryImg.src = `http://localhost:4000/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
          // Wyświetlamy kosztorys
          aiResultContainer.innerHTML = `<p>Wizualizacja wygenerowana pomyślnie!</p><p>Szacunkowy koszt: ${costEstimate.toLocaleString('pl-PL')} PLN</p>`; // <--- WYŚWIETLAMY KOSZTORYS
      } else {
          throw new Error("Serwer nie zwrócił adresu URL obrazka.");
      }
    } catch (err) {
      aiResultContainer.textContent = `Błąd generowania wizualizacji: ${err.message}`;
      console.error('❌ Błąd w generowaniu wizualizacji (frontend):', err);
    }
  });

      // Poprawiona obsługa błędów i wyświetlanie obrazka
      if (!resp.ok) {
          const errorBody = await resp.json(); // Spróbuj sparsować jako JSON, bo serwer zwraca JSON z błędem
          const errorMessage = errorBody.error || 'Nieznany błąd';
          const errorDetails = errorBody.details ? ` (${errorBody.details})` : '';
          throw new Error(`Błąd serwera: ${errorMessage}${errorDetails}`);
      }

      const { imageUrl } = await resp.json();
      console.log('AI image URL (z serwera):', imageUrl);

      if (imageUrl) {
          // Użyj endpointu proxy do obejścia CORS dla obrazków
          summaryImg.src = `http://localhost:4000/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
          aiResultContainer.innerHTML = `<p>Wizualizacja wygenerowana pomyślnie!</p>`;
      } else {
          throw new Error("Serwer nie zwrócił adresu URL obrazka.");
      }
    } catch (err) {
      aiResultContainer.textContent = `Błąd generowania wizualizacji: ${err.message}`;
      console.error('❌ Błąd w generowaniu wizualizacji (frontend):', err);
    }
  });

  // --- START ---
  goToStep1();
});