document.addEventListener('DOMContentLoaded', () => {
    console.log('Global INIT: DOM załadowany, skrypty startują...');

    // ===================================================================
    //  LOGIKA DLA SLIDERA PROJEKTÓW (.projects)
    // ===================================================================
    const projectsSection = document.querySelector('.projects');
    if (projectsSection) {
        console.log('Slider INIT: Sekcja .projects znaleziona, inicjalizuję...');
        
        const cardsContainer = projectsSection.querySelector('.projects__cards-container');
        if (!cardsContainer) { 
            console.error('Slider INIT ERROR: Kontener .projects__cards-container nie został znaleziony!'); 
        } else {
            const allProjectCardElements = Array.from(cardsContainer.querySelectorAll('.project-card:not(.project-card--custom-cta)'));
            const numProjectCards = allProjectCardElements.length;
            const customCtaCardElement = document.getElementById('customCtaCard');

            if (numProjectCards === 0) {
                console.warn('Slider INIT: Brak kart projektów do wyświetlenia.');
                if (customCtaCardElement) customCtaCardElement.style.display = 'none';
            } else {
                const ctaTextElement = customCtaCardElement ? customCtaCardElement.querySelector('.custom-cta__text') : null;
                const ctaFormElement = customCtaCardElement ? customCtaCardElement.querySelector('.custom-cta__form') : null;
                const ctaArrowElement = customCtaCardElement ? customCtaCardElement.querySelector('.custom-cta__arrow') : null;
                const ctaPhoneInputElement = ctaFormElement ? ctaFormElement.querySelector('#ctaPhoneInput') : null;

                const firstProjectCard = allProjectCardElements[0];
                const cardWidth = firstProjectCard.offsetWidth;
                const containerStyles = window.getComputedStyle(cardsContainer);
                const gap = parseFloat(containerStyles.gap) || 16;
                const scrollAmount = cardWidth + gap;

                let projectLoopCompletions = 0;
                let currentCtaMessageIndex = 0;
                let isCtaCardVisible = false;
                let isSliderActionInProgress = false;

                const ctaMessages = [
                    { text: "Nie znalazłeś domu, który Cię w pełni zadowala? Skontaktuj się z nami, aby omówić indywidualny projekt dopasowany do Twoich marzeń!", showForm: false },
                    { text: "Chcesz dowiedzieć się więcej lub potrzebujesz porady eksperta? Zostaw swój numer telefonu, oddzwonimy i odpowiemy na wszystkie pytania!", showForm: true },
                    { text: "Masz pytania lub specjalne życzenia? Zostaw numer, nasz doradca skontakuje się z Tobą, aby stworzyć projekt idealnie dopasowany do Ciebie!", showForm: true }
                ];

                const formatSlideNumber = (num) => num.toString().padStart(2, '0');

                const updateProjectCardNumbers = () => {
                    allProjectCardElements.forEach((card, index) => {
                        const currentNumberEl = card.querySelector('.project-card__header-number--current');
                        const nextNumberEl = card.querySelector('.project-card__header-info .project-card__header-number:not(.project-card__header-number--current)');
                        if (currentNumberEl && nextNumberEl) {
                            const currentIndexOneBased = index + 1;
                            const nextIndexOneBased = (currentIndexOneBased % numProjectCards) + 1;
                            currentNumberEl.textContent = formatSlideNumber(currentIndexOneBased);
                            nextNumberEl.textContent = formatSlideNumber(nextIndexOneBased);
                        }
                    });
                };

                const scrollToFirstProjectCard = (smooth = true) => {
                    cardsContainer.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
                    if (customCtaCardElement) customCtaCardElement.style.display = 'none';
                    isCtaCardVisible = false;
                };

                // ... reszta Twoich funkcji dla slidera projektów ...
                // (showCustomCtaCard, handleEndOfProjectCards, etc.)

                updateProjectCardNumbers();
                if (customCtaCardElement) customCtaCardElement.style.display = 'none';

                allProjectCardElements.forEach((card, cardIndex) => {
                    const arrow = card.querySelector('.project-card__header-arrow');
                    if (arrow) {
                        arrow.style.cursor = 'pointer';
                        arrow.addEventListener('click', () => {
                            if (isCtaCardVisible) return;
                            if (isSliderActionInProgress && cardIndex === numProjectCards - 1) return;

                            if (cardIndex < numProjectCards - 1) {
                                cardsContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                            } else {
                                handleEndOfProjectCards();
                            }
                        });
                    }
                });
                
                // ... reszta Twoich event listenerów
            }
        }
    } else {
        console.log('INIT: Sekcja .projects nie znaleziona, pomijam.');
    }

    // ===================================================================
    //  LOGIKA DLA KARUZELI PARTNERÓW (.partners)
    // ===================================================================
    const partnersSection = document.querySelector('.partners');
    if(partnersSection) {
        
        const setupCarouselAnimation = () => {
            console.log('Partners Carousel: Obrazki załadowane, uruchamiam animację.');
            const allLogoRows = document.querySelectorAll('.partners__row');

            allLogoRows.forEach((row, index) => {
                // Klonujemy tylko jeśli logotypów jest na tyle dużo, że wystają poza kontener
                if (row.scrollWidth <= row.clientWidth) {
                    console.log(`Partners Carousel: Rząd ${index + 1} nie wymaga animacji (mieści się w całości).`);
                    return; // Pomiń ten rząd
                }

                const logos = Array.from(row.children);
                if (logos.length === 0) return;

                logos.forEach(logo => {
                    const clone = logo.cloneNode(true);
                    clone.setAttribute('aria-hidden', 'true');
                    row.appendChild(clone);
                });

                if (index === 0) {
                    row.classList.add('animate-scroll-normal');
                } else {
                    row.classList.add('animate-scroll-reverse');
                }

                row.addEventListener('mouseenter', () => row.style.animationPlayState = 'paused');
                row.addEventListener('mouseleave', () => row.style.animationPlayState = 'running');
            });
        };

        // Czekamy na pełne załadowanie strony (w tym obrazków)
        window.addEventListener('load', setupCarouselAnimation);

    } else {
        console.log('INIT: Sekcja .partners nie znaleziona, pomijam.');
    }

});

// ===================================================================
//  LOGIKA DLA SLIDERA Z OPINIAMI (.testimonials)
// ===================================================================
const testimonialsSection = document.querySelector('.testimonials');
if (testimonialsSection) {
    console.log('Testimonials Slider INIT: Sekcja .testimonials znaleziona, inicjalizuję.');

    const slider = testimonialsSection.querySelector('.testimonials__slider');
    const prevButton = testimonialsSection.querySelector('.testimonials__arrow--prev');
    const nextButton = testimonialsSection.querySelector('.testimonials__arrow--next');
    const slides = testimonialsSection.querySelectorAll('.testimonials__slide');

    if (slider && prevButton && nextButton && slides.length > 0) {
        
        let currentIndex = 0;

        const updateButtons = () => {
            // Wyłącz przycisk "wstecz" na pierwszym slajdzie
            prevButton.disabled = currentIndex === 0;
            // Wyłącz przycisk "dalej" na ostatnim slajdzie
            nextButton.disabled = currentIndex === slides.length - 1;
        };
        
        const goToSlide = (index) => {
            const slideWidth = slides[0].offsetWidth;
            const gap = parseInt(window.getComputedStyle(slider).gap) || 30;
            const scrollAmount = (slideWidth + gap) * index;
            slider.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
            currentIndex = index;
            updateButtons();
        };

        nextButton.addEventListener('click', () => {
            if (currentIndex < slides.length - 1) {
                goToSlide(currentIndex + 1);
            }
        });

        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                goToSlide(currentIndex - 1);
            }
        });

        // Nasłuchuj scrolla, aby zaktualizować stan przycisków, jeśli użytkownik przewija palcem
        let scrollTimeout;
        slider.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const slideWidth = slides[0].offsetWidth;
                const gap = parseInt(window.getComputedStyle(slider).gap) || 30;
                const newIndex = Math.round(slider.scrollLeft / (slideWidth + gap));
                if (newIndex !== currentIndex) {
                    currentIndex = newIndex;
                    updateButtons();
                }
            }, 150);
        });

        // Ustaw stan początkowy
        updateButtons();

    } else {
        console.warn('Testimonials Slider: Brakuje niektórych elementów (slider, przyciski lub slajdy).');
    }
}