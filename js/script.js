document.addEventListener('DOMContentLoaded', () => {
    console.log('Slider INIT: DOM załadowany, skrypt startuje...');

    const projectsSection = document.querySelector('.projects');
    if (!projectsSection) { console.error('Slider INIT ERROR: Sekcja .projects nie została znaleziona!'); return; }

    const cardsContainer = projectsSection.querySelector('.projects__cards-container');
    if (!cardsContainer) { console.error('Slider INIT ERROR: Kontener .projects__cards-container nie został znaleziony!'); return; }

    const allProjectCardElements = Array.from(cardsContainer.querySelectorAll('.project-card:not(.project-card--custom-cta)'));
    const numProjectCards = allProjectCardElements.length;

    const customCtaCardElement = document.getElementById('customCtaCard');
    const ctaTextElement = customCtaCardElement ? customCtaCardElement.querySelector('.custom-cta__text') : null;
    const ctaFormElement = customCtaCardElement ? customCtaCardElement.querySelector('.custom-cta__form') : null;
    const ctaArrowElement = customCtaCardElement ? customCtaCardElement.querySelector('.custom-cta__arrow') : null;
    const ctaPhoneInputElement = ctaFormElement ? ctaFormElement.querySelector('#ctaPhoneInput') : null;

    console.log(`Slider INIT: Znaleziono ${numProjectCards} kart projektów.`); // Powinno być przed return dla numProjectCards === 0

    if (numProjectCards === 0) {
        console.warn('Slider INIT: Brak kart projektów do wyświetlenia.');
        if (customCtaCardElement) customCtaCardElement.style.display = 'none';
        return;
    }
    
    if (!customCtaCardElement || !ctaTextElement || !ctaFormElement || !ctaArrowElement) {
        console.warn('Slider INIT WARNING: Brakuje niektórych elementów karty CTA. Funkcjonalność CTA może być ograniczona lub nie działać poprawnie.');
    }

    // Definicja scrollAmount musi być tutaj, po upewnieniu się, że są karty projektów
    const firstProjectCard = allProjectCardElements[0];
    const cardWidth = firstProjectCard.offsetWidth;
    const containerStyles = window.getComputedStyle(cardsContainer);
    const gap = parseFloat(containerStyles.gap) || 16;
    const scrollAmount = cardWidth + gap; // <--- KLUCZOWA DEFINICJA
    console.log(`Slider INIT: cardWidth=${cardWidth}, gap=${gap}, scrollAmount=${scrollAmount}`);


    let projectLoopCompletions = 0;
    let currentCtaMessageIndex = 0;
    let isCtaCardVisible = false;
    let isSliderActionInProgress = false;

    const ctaMessages = [
        { text: "Nie znalazłeś domu, który Cię w pełni zadowala? Skontaktuj się z nami, aby omówić indywidualny projekt dopasowany do Twoich marzeń!", showForm: false },
        { text: "Chcesz dowiedzieć się więcej lub potrzebujesz porady eksperta? Zostaw swój numer telefonu, oddzwonimy i odpowiemy na wszystkie pytania!", showForm: true },
        { text: "Masz pytania lub specjalne życzenia? Zostaw numer, nasz doradca skontakuje się z Tobą, aby stworzyć projekt idealnie dopasowany do Ciebie!", showForm: true }
    ];
    console.log('Slider INIT: Tablica ctaMessages zainicjalizowana:', JSON.stringify(ctaMessages));


    function formatSlideNumber(num) { return num.toString().padStart(2, '0'); }

    function updateProjectCardNumbers() {
        console.log('Aktualizuję numerację kart projektów...');
        allProjectCardElements.forEach((card, index) => {
            const currentNumberEl = card.querySelector('.project-card__header-number--current');
            const nextNumberEl = card.querySelector('.project-card__header-info .project-card__header-number:not(.project-card__header-number--current)');
            if (currentNumberEl && nextNumberEl) {
                const currentIndexOneBased = index + 1;
                const nextIndexOneBased = (currentIndexOneBased % numProjectCards) + 1;
                currentNumberEl.textContent = formatSlideNumber(currentIndexOneBased);
                nextNumberEl.textContent = formatSlideNumber(nextIndexOneBased);
            } else {
                console.warn(`Nie znaleziono elementów numerów w karcie projektu ${index + 1}`);
            }
        });
    }

    function scrollToFirstProjectCard(smooth = true) {
        console.log('Akcja: Przewijam do pierwszej karty projektu.');
        if (allProjectCardElements[0]) {
            cardsContainer.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
        }
        if (customCtaCardElement) customCtaCardElement.style.display = 'none';
        isCtaCardVisible = false;
    }

    function showCustomCtaCard() {
        console.log("--- DEBUG: Wejście do showCustomCtaCard ---");
        if (!customCtaCardElement || !ctaTextElement || !ctaFormElement) {
            console.error("showCustomCtaCard ERROR: Kluczowe elementy HTML karty CTA nie zostały znalezione!");
            scrollToFirstProjectCard(); return;
        }
        if (isCtaCardVisible) {
            console.log("showCustomCtaCard INFO: Karta CTA jest już widoczna, próbuję ją dosunąć.");
            customCtaCardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            return;
        }
        
        console.log("showCustomCtaCard: Zaczynam pokazywanie karty CTA.");
        isCtaCardVisible = true;
        console.log(`showCustomCtaCard: currentCtaMessageIndex przed wyborem = ${currentCtaMessageIndex}`);
        let messageConfig;
        if (currentCtaMessageIndex >= 0 && currentCtaMessageIndex < ctaMessages.length) {
            messageConfig = ctaMessages[currentCtaMessageIndex];
        } else {
            if (ctaMessages.length > 0) {
                const randomIndex = Math.floor(Math.random() * ctaMessages.length);
                messageConfig = ctaMessages[randomIndex];
            } else {
                console.error("showCustomCtaCard ERROR: Tablica ctaMessages jest pusta!");
                ctaTextElement.textContent = "Błąd ładowania wiadomości.";
                ctaFormElement.style.display = 'none';
                customCtaCardElement.style.display = 'flex';
                customCtaCardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                return;
            }
        }
        console.log("showCustomCtaCard: Wybrana konfiguracja wiadomości (messageConfig):", messageConfig);
        if (messageConfig && typeof messageConfig.text !== 'undefined') {
            ctaTextElement.textContent = messageConfig.text;
            ctaFormElement.style.display = messageConfig.showForm ? 'flex' : 'none';
            if(ctaPhoneInputElement) ctaPhoneInputElement.value = '';
        } else {
            console.error("showCustomCtaCard ERROR: messageConfig jest 'undefined' lub nie ma właściwości 'text'!");
            ctaTextElement.textContent = "Wystąpił problem z treścią. Skontaktuj się z nami.";
            ctaFormElement.style.display = 'none';
        }
        customCtaCardElement.style.display = 'flex';
        customCtaCardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }

    function handleEndOfProjectCards() {
        if (isSliderActionInProgress) {
            console.log("handleEndOfProjectCards: Akcja już w toku, pomijam.");
            return;
        }
        isSliderActionInProgress = true;
        console.log("handleEndOfProjectCards: Rozpoczynam akcję końca pętli.");
        projectLoopCompletions++;
        console.log(`handleEndOfProjectCards: Ukończone pętle projektów: ${projectLoopCompletions}`);
        if (projectLoopCompletions === 1) {
            scrollToFirstProjectCard();
        } else { 
            showCustomCtaCard();
        }
        setTimeout(() => {
            isSliderActionInProgress = false;
            console.log("handleEndOfProjectCards: Akcja zakończona, flaga zresetowana.");
        }, 800); 
    }

    updateProjectCardNumbers();
    if (customCtaCardElement) customCtaCardElement.style.display = 'none';

    allProjectCardElements.forEach((card, cardIndex) => {
        const arrow = card.querySelector('.project-card__header-arrow');
        if (arrow) {
            arrow.style.cursor = 'pointer';
            arrow.addEventListener('click', () => {
                if (isCtaCardVisible) {
                     console.log(`Akcja strzałki projektu ${cardIndex + 1} zablokowana: Karta CTA jest widoczna.`);
                    return;
                }
                 if (isSliderActionInProgress && cardIndex === numProjectCards -1) { // Dodatkowe zabezpieczenie dla ostatniej strzałki
                    console.log(`Akcja strzałki projektu ${cardIndex + 1} zablokowana: isSliderActionInProgress=true (ostatnia karta)`);
                    return;
                 }

                console.log(`Kliknięto strzałkę "następny" na karcie projektu ${cardIndex + 1}`);
                if (cardIndex < numProjectCards - 1) {
                    console.log(`Przewijam w prawo (karta ${cardIndex + 1} -> ${cardIndex + 2}) o: ${scrollAmount}px`);
                    cardsContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                } else {
                    console.log('Kliknięto strzałkę na ostatniej karcie projektu.');
                    handleEndOfProjectCards();
                }
            });
        }
    });

    if (ctaArrowElement) {
        ctaArrowElement.style.cursor = 'pointer';
        ctaArrowElement.addEventListener('click', () => {
             if (isSliderActionInProgress) {
                 console.log("Kliknięcie strzałki CTA zablokowane: isSliderActionInProgress=true");
                return;
            }
            console.log('Kliknięto strzałkę na karcie CTA.');
            scrollToFirstProjectCard();
            if (currentCtaMessageIndex < ctaMessages.length) {
                currentCtaMessageIndex++;
            }
        });
    }

    if (ctaFormElement) {
        ctaFormElement.addEventListener('submit', (event) => {
            event.preventDefault();
            if (ctaPhoneInputElement) {
                const phoneNumber = ctaPhoneInputElement.value;
                console.log(`FORMULARZ CTA: Próba wysłania numeru telefonu: ${phoneNumber}`);
                alert(`Dziękujemy! Skontaktujemy się z Tobą pod numerem: ${phoneNumber} (To jest symulacja)`);
                ctaPhoneInputElement.value = '';
            }
        });
    }
    
    const imageWrappers = cardsContainer.querySelectorAll('.project-card:not(.project-card--custom-cta) .project-card__image-wrapper');
    if (imageWrappers.length > 0) {
        imageWrappers.forEach(wrapper => {
            const image = wrapper.querySelector('.project-card__image');
            if (image) {
                wrapper.addEventListener('mouseover', () => { image.style.transform = 'scale(1.05)'; });
                wrapper.addEventListener('mouseout', () => { image.style.transform = 'scale(1)'; });
            }
        });
    }

    let scrollDebounceTimer;
    cardsContainer.addEventListener('scroll', () => {
        clearTimeout(scrollDebounceTimer);
        scrollDebounceTimer = setTimeout(() => {
            if (isCtaCardVisible || isSliderActionInProgress || numProjectCards === 0) {
                return;
            }
            const scrollLeft = Math.round(cardsContainer.scrollLeft);
            const clientWidth = cardsContainer.clientWidth;
            const firstCardW = allProjectCardElements[0].offsetWidth;
            const currentGap = parseFloat(window.getComputedStyle(cardsContainer).gap) || 16;
            const totalWidthOfProjectCards = (numProjectCards * firstCardW) + ((numProjectCards - 1) * currentGap);
            const maxScrollLeftForProjects = Math.max(0, totalWidthOfProjectCards - clientWidth);
            
            if (scrollLeft >= maxScrollLeftForProjects - 10) {
                console.log('SCROLL: Wykryto dotarcie do końca kart projektów (lub próbę przewinięcia dalej).');
                handleEndOfProjectCards(); 
            }
        }, 200);
    });
});