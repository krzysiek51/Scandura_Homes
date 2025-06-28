document.addEventListener('DOMContentLoaded', () => {
    try {
        const configuratorPrompt = document.getElementById('configurator-prompt');
        if (!configuratorPrompt) return;

        console.log("Configurator Script INIT: Uruchomiono.");

        // Obiekt do przechowywania wyborów użytkownika
        let userSelections = {};

        // --- POBIERANIE GŁÓWNYCH ELEMENTÓW DOM ---
        const elements = {
            openBtn: document.getElementById('open-configurator-button'),
            modal: document.getElementById('configurator-modal'),
            closeBtn: document.getElementById('close-configurator-button'),
            overlay: document.getElementById('configurator-overlay'),
            
            // Główne kontenery kroków
            steps: {
                style: document.getElementById('step-style-selection'),
                area: document.getElementById('step-area'),
                // Dynamiczne kroki dla wariantów
                optionsModern: document.getElementById('step-options-modern'),
                optionsClassic: document.getElementById('step-options-classic'),
                optionsDworek: document.getElementById('step-options-dworek'),
                customPrompt: document.getElementById('step-custom-prompt'),
                // ... w przyszłości step4, step5, itd.
            },
            
            // Elementy interaktywne
            areaContinueButton: document.getElementById('area-continue-button'),
            carousel: {
                nextArrow: document.querySelector('#style-carousel .style-carousel__arrow--next'),
                prevArrow: document.querySelector('#style-carousel .style-carousel__arrow--prev'),
                track: document.getElementById('style-carousel-track'),
                slides: document.querySelectorAll('.style-carousel__slide'),
            },
            areaInput: document.getElementById('area-input'),
            areaSlider: document.getElementById('area-slider'),
        };

        let carouselIndex = 0;

        // --- GŁÓWNA FUNKCJA DO ZMIANY WIDOCZNYCH KROKÓW ---
        const changeStep = (stepToShow) => {
            // Ukryj wszystkie kroki
            Object.values(elements.steps).forEach(step => {
                if (step) step.style.display = 'none';
            });
            // Pokaż tylko ten, który chcemy
            if (stepToShow) {
                stepToShow.style.display = 'block';
            }
        };

        // --- FUNKCJE NAWIGACYJNE ---
        const goToStep1 = () => {
            changeStep(elements.steps.style);
            // Karuzela musi być zresetowana
            carouselIndex = 0;
            updateCarousel();
        };

        const goToStep2 = (style) => {
            console.log(`Wybrano styl: ${style}`);
            userSelections.style = style;
            changeStep(elements.steps.area);
        };
        
        const goToStep3 = () => {
            userSelections.area = elements.areaInput.value;
            console.log(`Wybrano powierzchnię: ${userSelections.area} m²`);
            const style = userSelections.style;

            // DYNAMICZNA LOGIKA: Pokaż odpowiedni krok na podstawie stylu
            if (style === 'modern') {
                changeStep(elements.steps.optionsModern);
            } else if (style === 'classic') {
                changeStep(elements.steps.optionsClassic);
            } else if (style === 'dworek') {
                changeStep(elements.steps.optionsDworek);
            } else if (style === 'custom') {
                changeStep(elements.steps.customPrompt);
            } else {
                console.error("Nieznany styl, nie można przejść do kroku 3.");
            }
        };

        const openModal = () => {
            elements.modal.removeAttribute('hidden');
            setTimeout(() => {
                elements.modal.classList.add('is-open');
                goToStep1();
            }, 20);
        };

        const closeModal = () => {
            elements.modal.classList.remove('is-open');
            setTimeout(() => {
                elements.modal.setAttribute('hidden', true);
            }, 300);
        };

        // --- LOGIKA KARUZELI ---
        const updateCarousel = () => {
            if (elements.carousel.track && elements.carousel.slides.length > 0) {
                const slideWidth = elements.carousel.slides[0].getBoundingClientRect().width;
                if(slideWidth > 0) {
                   elements.carousel.track.style.transform = `translateX(-${carouselIndex * slideWidth}px)`;
                }
                elements.carousel.prevArrow.disabled = carouselIndex === 0;
                elements.carousel.nextArrow.disabled = carouselIndex >= elements.carousel.slides.length - 1;
            }
        };

        // --- PODPIĘCIE ZDARZEŃ ---
        elements.openBtn.addEventListener('click', openModal);
        elements.closeBtn.addEventListener('click', closeModal);
        elements.overlay.addEventListener('click', closeModal);

        // Krok 1: Karuzela
        elements.carousel.nextArrow.addEventListener('click', () => {
            if (carouselIndex < elements.carousel.slides.length - 1) {
                carouselIndex++;
                updateCarousel();
            }
        });
        elements.carousel.prevArrow.addEventListener('click', () => {
            if (carouselIndex > 0) {
                carouselIndex--;
                updateCarousel();
            }
        });
        modal.querySelectorAll('.style-carousel__select-button').forEach(button => {
            button.addEventListener('click', () => goToStep2(button.dataset.style));
        });

        // Krok 2: Powierzchnia i nawigacja wsteczna
        elements.areaContinueButton.addEventListener('click', goToStep3);
        modal.querySelectorAll('[data-back-to]').forEach(button => {
            button.addEventListener('click', () => {
                const targetStepId = button.dataset.backTo;
                const targetStep = document.getElementById(targetStepId);
                changeStep(targetStep);
            });
        });
        
    } catch (error) {
        console.error("BŁĄD KRYTYCZNY W KONFIGURATORZE:", error);
    }
});