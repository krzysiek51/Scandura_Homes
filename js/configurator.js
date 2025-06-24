document.addEventListener('DOMContentLoaded', () => {

    const configuratorPrompt = document.getElementById('configurator-prompt');
    if (!configuratorPrompt) return;

    console.log("Configurator Script INIT: Uruchomiono.");

    // --- BAZA DANYCH ---
    const svgSketches = {
        modern: `<svg width="120" height="100" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 80 L10 40 L100 30 L100 80 Z" fill="none" stroke="#1C1C1C" stroke-width="2" /><rect x="25" y="55" width="15" height="20" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="50" y="55" width="15" height="15" fill="none" stroke="#1C1C1C" stroke-width="2"/></svg>`,
        classic: `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><polygon points="10,60 60,20 110,60" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="10" y="60" width="100" height="50" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="50" y="75" width="15" height="30" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="25" y="75" width="15" height="15" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="75" y="75" width="15" height="15" fill="none" stroke="#1C1C1C" stroke-width="2"/></svg>`,
        bungalow: `<svg width="140" height="100" viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg"><polygon points="10,50 70,20 130,50" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="10" y="50" width="120" height="40" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="35" y="65" width="15" height="15" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="90" y="65" width="15" height="15" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="60" y="65" width="20" height="25" fill="none" stroke="#1C1C1C" stroke-width="2"/></svg>`,
        custom: `<svg width="150" height="110" viewBox="0 0 150 110" xmlns="http://www.w3.org/2000/svg"><polygon points="10,60 50,30 90,60" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="10" y="60" width="80" height="40" fill="none" stroke="#1C1C1C" stroke-width="2"/><polygon points="60,70 90,50 120,70" fill="none" stroke="#1C1C1C" stroke-width="2"/><rect x="60" y="70" width="60" height="30" fill="none" stroke="#1C1C1C" stroke-width="2"/></svg>`
    };
    const friendlyStyleNames = {
        modern: 'Nowoczesny Minimalizm', classic: 'Klasyczna Elegancja',
        bungalow: 'Parterowy Komfort', custom: 'Indywidualny Projekt'
    };
    const placeholderImageHTML = `<img src="photos/main/AIStarcCloud.png" alt="Szkic domu generowany przez AI" class="sketch-placeholder">`;
    let userSelections = {};

    // --- POBIERANIE ELEMENTÓW DOM ---
    const openBtn = document.getElementById('open-configurator-button');
    const modal = document.getElementById('configurator-modal');
    if (!openBtn || !modal) return;

    const closeBtn = document.getElementById('close-configurator-button');
    const overlay = document.getElementById('configurator-overlay');
    const step1 = document.getElementById('step-style-selection');
    const step2 = document.getElementById('step-area');
    const sketchContainer = document.getElementById('dynamic-sketch-container');
    const step2Title = document.getElementById('step-area-title');
    const areaInput = document.getElementById('area-input');
    const areaSlider = document.getElementById('area-slider');
    const continueButton = document.getElementById('area-continue-button');
    const backToStyleButton = document.getElementById('back-to-style-button');
    const selectStyleButtons = document.querySelectorAll('.style-carousel__select-button');
    const carouselTrack = document.getElementById('style-carousel-track');
    const styleSlides = carouselTrack ? Array.from(carouselTrack.children) : [];
    const nextArrow = modal.querySelector('.style-carousel__arrow--next');
    const prevArrow = modal.querySelector('.style-carousel__arrow--prev');
        
    let carouselIndex = 0;
    let slideWidth = 0;

    // --- FUNKCJE ---

    const updateCarousel = () => {
        if (styleSlides.length > 0 && slideWidth > 0) {
            carouselTrack.style.transform = `translateX(-${carouselIndex * slideWidth}px)`;
        }
        if(prevArrow && nextArrow) {
            prevArrow.disabled = carouselIndex === 0;
            nextArrow.disabled = carouselIndex >= styleSlides.length - 1;
        }
    };
    
    const updateSliderProgress = () => {
        if (!areaSlider) return;
        const min = parseFloat(areaSlider.min);
        const max = parseFloat(areaSlider.max);
        const value = parseFloat(areaSlider.value);
        const percentage = ((value - min) / (max - min)) * 100;
        areaSlider.style.background = `linear-gradient(to right, #DC9B59 ${percentage}%, #e9e9e9 ${percentage}%)`;
    };

    const handleAreaUpdate = (newArea) => {
        const area = parseInt(newArea, 10);
        const selectedStyle = userSelections.style || "classic"; 

        if (sketchContainer) {
            if (area > 50 && svgSketches[selectedStyle]) {
                sketchContainer.innerHTML = svgSketches[selectedStyle];
                if(continueButton) continueButton.disabled = false;
            } else {
                sketchContainer.innerHTML = placeholderImageHTML;
                if(continueButton) continueButton.disabled = true;
            }
        }
    };
    
    const goToStep1 = () => {
        if(step2) step2.style.display = 'none';
        if(step1) step1.style.display = 'block';
        updateCarousel(); // Upewniamy się, że karuzela jest na właściwej pozycji
    };

    const goToStep2 = (selectedStyle) => {
        userSelections.style = selectedStyle;
        if(areaInput) areaInput.value = '';
        if(areaSlider) areaSlider.value = areaSlider.min;
        updateSliderProgress();
        handleAreaUpdate(0); // Pokaż chmurkę na starcie

        if (step2Title && friendlyStyleNames[selectedStyle]) {
            step2Title.textContent = `Świetny wybór! (${friendlyStyleNames[selectedStyle]})`;
        }
        if(step1) step1.style.display = 'none';
        if(step2) step2.style.display = 'block';
    };

    const openModal = () => {
        goToStep1();
        modal.removeAttribute('hidden');
        setTimeout(() => {
            modal.classList.add('is-open');
            if (styleSlides.length > 0) {
                slideWidth = styleSlides[0].getBoundingClientRect().width;
            }
            carouselIndex = 0;
            updateCarousel(); 
        }, 50); 
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        setTimeout(() => modal.setAttribute('hidden', true), 300);
    };

    // --- PODPIĘCIE ZDARZEŃ ---
    openBtn.addEventListener('click', openModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(overlay) overlay.addEventListener('click', closeModal);
    if (backToStyleButton) backToStyleButton.addEventListener('click', goToStep1);

    // Nawigacja karuzeli stylów
    if (nextArrow && prevArrow) {
        nextArrow.addEventListener('click', () => { if (carouselIndex < styleSlides.length - 1) { carouselIndex++; updateCarousel(); }});
        prevArrow.addEventListener('click', () => { if (carouselIndex > 0) { carouselIndex--; updateCarousel(); }});
    }

    // Przyciski "Wybierz" w karuzeli
    selectStyleButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const style = event.currentTarget.dataset.style;
            goToStep2(style);
        });
    });

    // Synchronizacja suwaka i pola input
    if (areaSlider && areaInput) {
        areaSlider.addEventListener('input', () => {
            areaInput.value = areaSlider.value;
            updateSliderProgress();
            handleAreaUpdate(areaSlider.value);
        });
        areaInput.addEventListener('input', () => {
            areaSlider.value = areaInput.value;
            updateSliderProgress();
            handleAreaUpdate(areaInput.value);
        });
    }

    if (continueButton) {
        continueButton.addEventListener('click', () => {
            if (!continueButton.disabled) {
                userSelections.area = areaInput.value;
                alert(`Super! Przechodzimy dalej z domem w stylu "${userSelections.style}" o powierzchni ${userSelections.area} m².`);
            }
        });
    }
});
