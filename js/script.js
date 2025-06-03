document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM załadowany, skrypt startuje...');

    const projectsSection = document.querySelector('.projects');
    if (!projectsSection) {
        console.error('BŁĄD: Sekcja .projects nie została znaleziona!');
        return;
    }
    console.log('Sekcja .projects znaleziona:', projectsSection);

    const cardsContainer = projectsSection.querySelector('.projects__cards-container');
    if (!cardsContainer) {
        console.error('BŁĄD: Kontener .projects__cards-container nie został znaleziony!');
        return;
    }
    console.log('Kontener kart .projects__cards-container znaleziony:', cardsContainer);

    // Pobieramy wszystkie karty, aby zaktualizować ich numery i dla logiki slidera
    const allCards = Array.from(cardsContainer.querySelectorAll('.project-card'));
    const numCards = allCards.length;

    if (numCards === 0) {
        console.warn('OSTRZEŻENIE: Brak kart .project-card w kontenerze.');
        // Jeśli nie ma kart, nie ma sensu kontynuować z logiką slidera/numeracji
        return;
    }
    console.log(`Znaleziono ${numCards} kart .project-card.`);

    // Obliczanie wartości do przewinięcia (na podstawie pierwszej karty)
    const firstCard = allCards[0];
    console.log('Pierwsza karta znaleziona:', firstCard);
    const cardWidth = firstCard.offsetWidth;
    const containerStyles = window.getComputedStyle(cardsContainer);
    const gap = parseFloat(containerStyles.gap) || 16;
    const scrollAmount = cardWidth + gap;
    console.log(`Obliczenia dla slidera: cardWidth=${cardWidth}, gap=${gap}, scrollAmount=${scrollAmount}`);

    // --- NOWA SEKCJA: Dynamiczna aktualizacja numerów w kartach ---
    function formatSlideNumber(num) {
        return num.toString().padStart(2, '0');
    }

    allCards.forEach((card, index) => {
        const currentNumberEl = card.querySelector('.project-card__header-number--current');
        // Bardziej precyzyjny selektor dla drugiego numeru, aby uniknąć pomyłki, jeśli struktura HTML by się zmieniła
        const nextNumberEl = card.querySelector('.project-card__header-info .project-card__header-number:not(.project-card__header-number--current)');

        if (currentNumberEl && nextNumberEl) {
            const currentIndexOneBased = index + 1; // Numeracja od 1
            let nextIndexOneBased = (currentIndexOneBased % numCards) + 1; // Następny z zapętleniem

            currentNumberEl.textContent = formatSlideNumber(currentIndexOneBased);
            nextNumberEl.textContent = formatSlideNumber(nextIndexOneBased);
            console.log(`Karta ${currentIndexOneBased}: ustawiono numery na ${currentNumberEl.textContent} --- ${nextNumberEl.textContent}`);
        } else {
            console.warn(`Nie znaleziono elementów numerów w karcie ${index + 1}`);
        }
    });
    // --- KONIEC SEKCJI: Dynamiczna aktualizacja numerów ---

    const nextArrowsInCards = cardsContainer.querySelectorAll('.project-card__header-arrow');
    console.log(`Znaleziono ${nextArrowsInCards.length} strzałek .project-card__header-arrow do nawigacji "następny".`);
    if (nextArrowsInCards.length === 0 && numCards > 0) { // Jeśli są karty, ale nie ma strzałek
        console.warn('OSTRZEŻENIE: Nie znaleziono żadnych elementów .project-card__header-arrow!');
    }

    nextArrowsInCards.forEach((arrow, index) => {
        console.log(`Dodaję listener do strzałki "następny" ${index + 1} w karcie`, arrow);
        arrow.style.cursor = 'pointer';

        arrow.addEventListener('click', (event) => {
            console.log(`Kliknięto strzałkę "następny" ${index + 1} w karcie!`, event.currentTarget);

            const scrollLeft = Math.round(cardsContainer.scrollLeft);
            const scrollWidth = cardsContainer.scrollWidth;
            const clientWidth = cardsContainer.clientWidth;
            const atTheEnd = scrollLeft >= (scrollWidth - clientWidth - (scrollAmount / 2)); // Tolerancja dla płynnego przewijania

            if (scrollWidth <= clientWidth) {
                console.log('Brak możliwości przewinięcia (cała zawartość widoczna).');
                return;
            }

            if (atTheEnd) {
                console.log('Koniec slidera, przewijam do początku (zapętlenie w prawo).');
                cardsContainer.scrollTo({
                    left: 0,
                    behavior: 'smooth'
                });
            } else {
                console.log('Przewijam w prawo o:', scrollAmount);
                cardsContainer.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Przypomnienie: Nadal potrzebujemy rozwiązania dla nawigacji "w lewo".
    // W następnym kroku możemy dodać strzałkę "w lewo" do HTML i obsłużyć ją w JS.
});