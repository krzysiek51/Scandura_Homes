document.addEventListener('DOMContentLoaded', () => {
    try {
        const configuratorPrompt = document.getElementById('configurator-prompt');
        if (!configuratorPrompt) return;

        console.log("Configurator Script INIT: Uruchomiono.");

        // --- BAZA DANYCH i ZMIENNE ---
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
        let carouselIndex = 0;
        let slideWidth = 0;

        // --- POBIERANIE WSZYSTKICH ELEMENTÓW DOM ---
        const openBtn = document.getElementById('open-configurator-button');
        const modal = document.getElementById('configurator-modal');
        const closeBtn = document.getElementById('close-configurator-button');
        const overlay = document.getElementById('configurator-overlay');
        const step1 = document.getElementById('step-style-selection');
        const step2 = document.getElementById('step-area');
        const step3 = document.getElementById('step-floors');
        const sketchContainerStep2 = document.getElementById('dynamic-sketch-container');
        const sketchContainerStep3 = document.getElementById('floors-sketch-container');
        const step2Title = document.getElementById('step-area-title');
        const step3Title = document.getElementById('step-floors-title');
        const areaInput = document.getElementById('area-input');
        const areaSlider = document.getElementById('area-slider');
        const areaContinueButton = document.getElementById('area-continue-button');
        const backToStyleButton = document.getElementById('back-to-style-button');
        const backToAreaButton = document.getElementById('back-to-area-button');
        const selectStyleButtons = document.querySelectorAll('.style-carousel__select-button');
        const floorOptionButtons = document.querySelectorAll('.floor-options__button');
        const carouselTrack = document.getElementById('style-carousel-track');
        const styleSlides = carouselTrack ? Array.from(carouselTrack.children) : [];
        const nextArrow = modal.querySelector('.style-carousel__arrow--next');
        const prevArrow = modal.querySelector('.style-carousel__arrow--prev');
            
        // --- DEKLARACJE FUNKCJI (muszą być przed ich użyciem w listenerach) ---

        const updateCarousel = () => {
            if (styleSlides.length > 0 && styleSlides[0].getBoundingClientRect().width > 0) {
                slideWidth = styleSlides[0].getBoundingClientRect().width;
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

        const updateSketch = () => {
            const style = userSelections.style || 'classic';
            let baseSketch = svgSketches[style] || svgSketches.classic;
            if (userSelections.floors === 'pietrowy') {
                baseSketch = baseSketch.replace(/height="(\d+)"/, (match, height) => `height="${parseInt(height) + 40}"`);
            }
            if (sketchContainerStep2) sketchContainerStep2.innerHTML = baseSketch;
            if (sketchContainerStep3) sketchContainerStep3.innerHTML = baseSketch;
        };

        const handleAreaUpdate = (newArea) => {
            const area = parseInt(newArea, 10) || 0;
            if (area > 50) {
                updateSketch();
                if (areaContinueButton) areaContinueButton.disabled = false;
            } else {
                if (sketchContainerStep2) sketchContainerStep2.innerHTML = placeholderImageHTML;
                if (areaContinueButton) areaContinueButton.disabled = true;
            }
            if (sketchContainerStep2) {
                const minArea = 50, maxArea = 400, minScale = 0.6, maxScale = 1.1;
                let scale = 1.0;
                if (area > 50) {
                    const progress = Math.max(0, (area - minArea)) / (maxArea - minArea);
                    scale = minScale + (progress * (maxScale - minScale));
                }
                sketchContainerStep2.style.transform = `scale(${Math.min(scale, maxScale)})`;
            }
        };

        const changeStep = (stepToShow) => {
            [step1, step2, step3].forEach(step => {
                if(step) step.style.display = 'none';
            });
            if (stepToShow) stepToShow.style.display = 'block';
        };
        
        const goToStep1 = () => {
            changeStep(step1);
            setTimeout(updateCarousel, 50);
        };
        
        const goToStep2 = (selectedStyle) => {
            userSelections.style = selectedStyle;
            if (areaInput) areaInput.value = '';
            if (areaSlider) { areaSlider.value = areaSlider.min; updateSliderProgress(); }
            handleAreaUpdate(0);
            if (step2Title && friendlyStyleNames[selectedStyle]) {
                step2Title.textContent = `Świetny wybór! (${friendlyStyleNames[selectedStyle]})`;
            }
            changeStep(step2);
        };

        const goToStep3 = () => {
            userSelections.area = areaInput.value;
            if (step3Title) step3Title.textContent = `Dobrze, dom ${userSelections.area} m². Ile kondygnacji ma mieć?`;
            updateSketch();
            changeStep(step3);
        };

        const openModal = () => {
            goToStep1();
            modal.removeAttribute('hidden');
            setTimeout(() => modal.classList.add('is-open'), 50);
        };

        const closeModal = () => {
            modal.classList.remove('is-open');
            setTimeout(() => modal.setAttribute('hidden', true), 300);
        };
        
        // --- PODPIĘCIE ZDARZEŃ (EVENT LISTENERS) ---
        openBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);
        if (backToStyleButton) backToStyleButton.addEventListener('click', goToStep1);
        if (backToAreaButton) backToAreaButton.addEventListener('click', () => goToStep2(userSelections.style));
        if (areaContinueButton) areaContinueButton.addEventListener('click', () => { if (!areaContinueButton.disabled) goToStep3(); });
        
        if (nextArrow && prevArrow) {
            nextArrow.addEventListener('click', () => { if (carouselIndex < styleSlides.length - 1) { carouselIndex++; updateCarousel(); }});
            prevArrow.addEventListener('click', () => { if (carouselIndex > 0) { carouselIndex--; updateCarousel(); }});
        }

        selectStyleButtons.forEach(button => button.addEventListener('click', () => goToStep2(button.dataset.style)));
        
        floorOptionButtons.forEach(button => {
            button.addEventListener('click', () => {
                floorOptionButtons.forEach(btn => btn.classList.remove('is-active'));
                button.classList.add('is-active');
                userSelections.floors = button.dataset.floors;
                updateSketch();
            });
        });
        
        if (areaSlider && areaInput) {
            const syncAndUpdate = (value) => {
                areaSlider.value = value;
                areaInput.value = value;
                updateSliderProgress();
                handleAreaUpdate(value);
            };
            areaSlider.addEventListener('input', () => syncAndUpdate(areaSlider.value));
            areaInput.addEventListener('input', () => syncAndUpdate(areaInput.value));
        }

    } catch (error) {
        console.error("BŁĄD KRYTYCZNY W KONFIGURATORZE:", error);
    }
});