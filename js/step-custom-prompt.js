function initStepCustomPrompt() {
  changeStep('step-custom-prompt');


  const promptInput = document.getElementById('custom-prompt-textarea');
  const btnBack = document.getElementById('custom-prompt-back-button');
  const btnCont = document.getElementById('custom-prompt-continue-button');

  if (!promptInput || !btnCont || !btnBack) {
    console.error('Brakuje elementów w kroku custom prompt.');
    return;
  }

  // Walidacja textarea
  btnCont.disabled = promptInput.value.trim() === '';
  promptInput.addEventListener('input', () => {
    btnCont.disabled = promptInput.value.trim() === '';
  });

  // Powrót do kroku 2
  btnBack.addEventListener('click', () => {
    initStep2();
  });

  // Kliknięcie "Generuj wizualizację"
  btnCont.addEventListener('click', async () => {
    const userText = promptInput.value.trim();
    const basePrompt = `Stwórz fotorealistyczną wizualizację nowoczesnego domu jednorodzinnego o powierzchni ${userSelections.area} m².`;
    const finalPrompt = `${basePrompt} Szczegóły: ${userText}`;

    window.userSelections.customPrompt = finalPrompt;

    // Zablokowanie UI
    btnCont.disabled = true;
    btnCont.textContent = '⏳ Generuję...';

    // Pokaż loader
    const loader = document.createElement('div');
    loader.className = 'configurator-loader';
    loader.textContent = 'AI tworzy wizualizację...';
    stepCustom.appendChild(loader);

    try {
      const imageUrl = await generateImageFromAI(finalPrompt);

      console.log('Obrazek wygenerowany:', imageUrl);
      alert('Wizualizacja gotowa! (tu pojawi się obrazek)');

    } catch (err) {
      console.error('Błąd generowania:', err);
      alert('Wystąpił błąd podczas generowania.');
    } finally {
      loader.remove();
      btnCont.disabled = false;
      btnCont.textContent = '🎨 Generuj wizualizację';
    }
  });
}
 window.initStepCustomPrompt = initStepCustomPrompt;

// Dummy funkcja symulująca połączenie z AI
async function generateImageFromAI(prompt) {
  console.log('[DALL·E prompt]', prompt);
  await new Promise(res => setTimeout(res, 2000)); // sztuczne opóźnienie
  return 'https://dummyimage.com/600x400/cccccc/000000&text=Wizualizacja+AI';
}