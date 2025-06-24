document.addEventListener('DOMContentLoaded', () => {

    const configuratorPrompt = document.getElementById('configurator-prompt');
    if (!configuratorPrompt) return;

    // ... (reszta Twoich stałych, jak svgSketches, friendlyStyleNames, etc.) ...
    const svgSketches = { /* ... Twoje szkice SVG ... */ };
    const placeholderImageHTML = `<img src="photos/main/AIStarcCloud.png" alt="Szkic domu generowany przez AI" class="sketch-placeholder">`;
    let userSelections = {};


    // --- POBIERANIE ELEMENTÓW DOM ---
    const openBtn = document.getElementById('open-configurator-button');
    const modal = document.getElementById('configurator-modal');
    const areaInput = document.getElementById('area-input');
    const areaSlider = document.getElementById('area-slider');
    const sketchContainer = document.getElementById('dynamic-sketch-container');
    // ... i reszta Twoich elementów ...

    if (!openBtn || !modal || !areaInput || !areaSlider || !sketchContainer) {
        return console.error("Błąd: Brakuje elementów konfiguratora.");
    }
        
    // --- FUNKCJE ---

    const updateSliderProgress = () => { /* ... bez zmian ... */ };

    // --- NOWA, ULEPSZONA FUNKCJA AKTUALIZACJI ---
    const handleAreaUpdate = (newArea) => {
        const area = parseInt(newArea, 10);
        const selectedStyle = userSelections.style || "classic"; 

        if (area > 50) {
            // Pokazujemy szkic, jeśli jeszcze go nie ma
            if (sketchContainer.querySelector('.sketch-placeholder')) {
                sketchContainer.innerHTML = svgSketches[selectedStyle] || svgSketches.classic;
            }
            if(continueButton) continueButton.disabled = false;

            // --- NOWA LOGIKA SKALOWANIA ---
            const minArea = 50;
            const maxArea = 400;
            const minScale = 0.5; // Zaczynamy od połowy rozmiaru
            const maxScale = 1.2; // Kończymy na 120% rozmiaru

            // Obliczamy postęp (wartość od 0 do 1)
            const progress = (area - minArea) / (maxArea - minArea);
            // Obliczamy skalę na podstawie postępu
            const scale = minScale + (progress * (maxScale - minScale));
            
            // Stosujemy transformację do kontenera ze szkicem
            sketchContainer.style.transform = `scale(${scale})`;
            // -----------------------------

        } else {
            // Pokazujemy chmurkę i resetujemy skalę
            sketchContainer.innerHTML = placeholderImageHTML;
            sketchContainer.style.transform = 'scale(1)';
            if(continueButton) continueButton.disabled = true;
        }
    };

    const openModal = () => {
        const minVal = areaSlider.min || 50;
        areaInput.value = '';
        areaSlider.value = minVal;
        updateSliderProgress();
        handleAreaUpdate(0); // Pokazujemy chmurkę i resetujemy
        
        // ... reszta logiki otwierania modala ...
    };

    // ... Reszta Twoich funkcji i listenerów ...
    // Pamiętaj, aby Twoje listenery dla suwaka i inputu wywoływały handleAreaUpdate
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

    // ... openBtn, closeBtn, etc. ...
});