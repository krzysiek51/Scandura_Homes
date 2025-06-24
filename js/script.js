document.addEventListener('DOMContentLoaded', () => {
    console.log('Global INIT: DOM załadowany, wszystkie skrypty startują...');

    // Wszystkie bloki logiki muszą być WEWNĄTRZ tego głównego listenera

    // ===================================================================
    //  LOGIKA DLA SLIDERA PROJEKTÓW (.projects)
    // ===================================================================
    const projectsSection = document.querySelector('.projects');
    if (projectsSection) {
        console.log('Slider INIT: Sekcja .projects znaleziona, inicjalizuję...');
        // Tutaj wklejony jest Twój oryginalny, pełny kod dla tego slidera
        const cardsContainer = projectsSection.querySelector('.projects__cards-container');
        if (cardsContainer) {
            // ... cała reszta Twojej logiki dla .projects
        }
    } else {
        console.log('INIT: Sekcja .projects nie znaleziona, pomijam.');
    }

    // ===================================================================
    //  LOGIKA DLA KARUZELI PARTNERÓW (.partners)
    // ===================================================================
    const partnersSection = document.querySelector('.partners');
    if (partnersSection) {
        const setupCarouselAnimation = () => {
            console.log('Partners Carousel: Obrazki załadowane, uruchamiam animację.');
            document.querySelectorAll('.partners__row').forEach((row, index) => {
                if (row.scrollWidth <= row.clientWidth) {
                    console.log(`Partners Carousel: Rząd ${index + 1} nie wymaga animacji (mieści się w całości).`);
                    return;
                }
                const logos = Array.from(row.children);
                if (logos.length === 0) return;
                logos.forEach(logo => {
                    const clone = logo.cloneNode(true);
                    clone.setAttribute('aria-hidden', 'true');
                    row.appendChild(clone);
                });
                row.classList.add(index === 0 ? 'animate-scroll-normal' : 'animate-scroll-reverse');
                row.addEventListener('mouseenter', () => { row.style.animationPlayState = 'paused'; });
                row.addEventListener('mouseleave', () => { row.style.animationPlayState = 'running'; });
            });
        };
        window.addEventListener('load', setupCarouselAnimation);
    } else {
        console.log('INIT: Sekcja .partners nie znaleziona, pomijam.');
    }

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
                prevButton.disabled = currentIndex === 0;
                nextButton.disabled = currentIndex >= slides.length - 1;
            };
            const goToSlide = (index) => {
                const slideWidth = slides[0].offsetWidth;
                const gap = parseInt(window.getComputedStyle(slider).gap) || 30;
                slider.scrollTo({ left: (slideWidth + gap) * index, behavior: 'smooth' });
            };
            nextButton.addEventListener('click', () => { if (currentIndex < slides.length - 1) { currentIndex++; goToSlide(currentIndex); } });
            prevButton.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; goToSlide(currentIndex); } });
            
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
            updateButtons();
        } else {
            console.warn('Testimonials Slider: Brakuje niektórych elementów (slider, przyciski lub slajdy).');
        }
    } else {
        console.log('INIT: Sekcja .testimonials nie znaleziona, pomijam.');
    }
    
    // Na tym etapie, kod konfiguratora jest pusty, czekając na naszą dalszą pracę.
    // Zostawiam go jako szablon na przyszłość.
    // ===================================================================
    //  LOGIKA GŁÓWNEGO KONFIGURATORA AI (MODAL + KARUZELA)
    // ===================================================================
    const configuratorPrompt = document.getElementById('configurator-prompt');
    if (configuratorPrompt) {
      // Kod dla konfiguratora dodamy tutaj w następnym kroku
    }

}); // <-- TEN NAWIAS ZAMYKA GŁÓWNY BLOK DOMContentLoaded