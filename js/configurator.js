document.addEventListener('DOMContentLoaded', () => {

    const configuratorPrompt = document.getElementById('configurator-prompt');
    if (configuratorPrompt) {
        console.log("Configurator Script INIT: Znaleziono. Podpinam listenery.");

        const openBtn = document.getElementById('open-configurator-button');
        const modal = document.getElementById('configurator-modal');
        const closeBtn = document.getElementById('close-configurator-button');
        const overlay = document.getElementById('configurator-overlay');
        
        const carouselTrack = document.getElementById('style-carousel-track');
        const styleSlides = carouselTrack ? Array.from(carouselTrack.children) : [];
        const carouselContainer = document.getElementById('style-carousel');
        const nextArrow = carouselContainer ? carouselContainer.querySelector('.style-carousel__arrow--next') : null;
        const prevArrow = carouselContainer ? carouselContainer.querySelector('.style-carousel__arrow--prev') : null;
        
        const selectStyleButtons = modal.querySelectorAll('.style-carousel__select-button');
        const step1_StyleSelection = document.getElementById('step-style-selection');
        const step2_AreaQuestion = document.getElementById('step-area');
        const backToStyleButton = document.getElementById('back-to-style-button');
        
        if (openBtn && modal && closeBtn && overlay && carouselTrack && step1_StyleSelection && step2_AreaQuestion) {
            
            let carouselIndex = 0;
            let slideWidth = 0;

            const updateCarousel = () => {
                if (styleSlides.length > 0) {
                    slideWidth = styleSlides[0].getBoundingClientRect().width;
                    if (slideWidth > 0) {
                        carouselTrack.style.transform = `translateX(-${carouselIndex * slideWidth}px)`;
                    }
                }
                if(prevArrow && nextArrow) {
                    prevArrow.disabled = carouselIndex === 0;
                    nextArrow.disabled = carouselIndex >= styleSlides.length - 1;
                }
            };

            const openModal = () => {
                step1_StyleSelection.style.display = 'block';
                step2_AreaQuestion.style.display = 'none';
                modal.removeAttribute('hidden');
                setTimeout(() => {
                    modal.classList.add('is-open');
                    carouselIndex = 0;
                    updateCarousel();
                }, 20);
            };

            const closeModal = () => {
                modal.classList.remove('is-open');
                setTimeout(() => {
                    modal.setAttribute('hidden', true);
                }, 300);
            };
            
            openBtn.addEventListener('click', openModal);
            closeBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);
            if (backToStyleButton) backToStyleButton.addEventListener('click', () => {
                step2_AreaQuestion.style.display = 'none';
                step1_StyleSelection.style.display = 'block';
            });
            
            if (nextArrow && prevArrow) {
                nextArrow.addEventListener('click', () => { if (carouselIndex < styleSlides.length - 1) { carouselIndex++; updateCarousel(); }});
                prevArrow.addEventListener('click', () => { if (carouselIndex > 0) { carouselIndex--; updateCarousel(); }});
            }

            selectStyleButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const selectedStyle = event.currentTarget.dataset.style;
                    console.log(`Użytkownik wybrał styl: ${selectedStyle}`);
                    goToStep2(selectedStyle); // Ta funkcja musi być zdefiniowana
                });
            });
            
            // Funkcja do przechodzenia do kroku 2 (teraz widoczna dla listenera)
            const goToStep2 = (selectedStyle) => {
                // Tutaj w przyszłości będzie logika wstawiania szkicu SVG
                step1_StyleSelection.style.display = 'none';
                step2_AreaQuestion.style.display = 'block';
            };

        } else {
            console.error("Błąd krytyczny konfiguratora: Brakuje kluczowych elementów HTML.");
        }
    }
});