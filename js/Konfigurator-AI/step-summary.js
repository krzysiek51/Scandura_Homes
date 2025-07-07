// Pełny plik step-summary.js z wszystkimi funkcjami

// Funkcja wypełniająca podsumowanie danymi użytkownika
export function populateSummary(selections) {
  // Normalizacja danych - dopasowanie nazw pól i typów
  const normalizedSelections = {
    style: selections.style,
    area: selections.area,
    floors: typeof selections.floors === 'string' ? 1 : parseInt(selections.floors) || 1,
    roof: selections.roof,
    elevation: selections.elev, // zmiana nazwy z elev na elevation dla API
    garage: selections.garage,
    basement: selections.basement || false,
    rent: selections.rent,
    availability: selections.availability,
    customPrompt: selections.customPrompt
  };

  // Wyświetl podsumowanie w kontenerze
  const summaryContainer = document.getElementById('summary-selections');
  if (summaryContainer) {
    let summaryHTML = `
      <div class="summary-section">
        <h3 class="summary-section-title">Podstawowe informacje</h3>
        <div class="summary-item">
          <span class="summary-label">Styl domu:</span>
          <span class="summary-value">${getStyleLabel(selections.style)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Powierzchnia:</span>
          <span class="summary-value">${selections.area} m²</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Liczba kondygnacji:</span>
          <span class="summary-value">${normalizedSelections.floors}</span>
        </div>
      </div>
      
      <div class="summary-section">
        <h3 class="summary-section-title">Specyfikacja techniczna</h3>
        <div class="summary-item">
          <span class="summary-label">Rodzaj dachu:</span>
          <span class="summary-value">${getRoofLabel(selections.roof)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Typ elewacji:</span>
          <span class="summary-value">${getElevationLabel(selections.elev)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Garaż:</span>
          <span class="summary-value">${getGarageLabel(selections.garage)}</span>
        </div>
      </div>`;

    // Dodaj sekcję opcji dodatkowych jeśli są wybrane
    if (selections.basement || selections.rent !== null || selections.availability) {
      summaryHTML += `
        <div class="summary-section">
          <h3 class="summary-section-title">Opcje dodatkowe</h3>`;
      
      if (selections.basement) {
        summaryHTML += `
          <div class="summary-item">
            <span class="summary-label">Piwnica:</span>
            <span class="summary-value">Tak</span>
          </div>`;
      }
      
      if (selections.rent !== null) {
        summaryHTML += `
          <div class="summary-item">
            <span class="summary-label">Przeznaczenie:</span>
            <span class="summary-value">${selections.rent ? 'Na wynajem' : 'Do zamieszkania własnego'}</span>
          </div>`;
      }
      
      if (selections.availability) {
        summaryHTML += `
          <div class="summary-item">
            <span class="summary-label">Planowana data gotowości:</span>
            <span class="summary-value">${formatDate(selections.availability)}</span>
          </div>`;
      }
      
      summaryHTML += `</div>`;
    }

    // Dodaj informację o custom prompt jeśli istnieje
    if (selections.customPrompt) {
      summaryHTML += `
        <div class="summary-section">
          <h3 class="summary-section-title">Własny projekt</h3>
          <div class="summary-item">
            <span class="summary-label">Opis projektu:</span>
            <span class="summary-value summary-value--custom">${selections.customPrompt}</span>
          </div>
        </div>`;
    }

    summaryContainer.innerHTML = summaryHTML;
  }

  // Zapisz znormalizowane dane globalnie dla API
  window.userSelectionsNormalized = normalizedSelections;
  
  // Oblicz szacunkową cenę
  const estimatedPrice = calculateEstimatedPrice(normalizedSelections);
  const priceElement = document.getElementById('estimated-price-preview');
  if (priceElement) {
    priceElement.textContent = estimatedPrice.toLocaleString('pl-PL') + ' NOK';
  }
}

// Funkcje pomocnicze do etykiet
function getStyleLabel(style) {
  const labels = {
    modern: 'Nowoczesny minimalizm',
    classic: 'Klasyczna elegancja',
    dworek: 'Dworek',
    custom: 'Własny projekt'
  };
  return labels[style] || style;
}

function getRoofLabel(roof) {
  const labels = {
    flat: 'Płaski dach',
    gabled: 'Dwuspadowy',
    multi: 'Wielospadowy'
  };
  return labels[roof] || roof;
}

function getElevationLabel(elev) {
  const labels = {
    wood: 'Drewniana',
    stucco: 'Tynk',
    brick: 'Cegła',
    stone: 'Kamień'
  };
  return labels[elev] || elev;
}

function getGarageLabel(garage) {
  const labels = {
    none: 'Brak garażu',
    single: 'Garaż jednostanowiskowy',
    double: 'Garaż dwustanowiskowy'
  };
  return labels[garage] || garage;
}

// Formatowanie daty
function formatDate(dateString) {
  const date = new Date(dateString);
  const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 
                  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Obliczanie szacunkowej ceny
function calculateEstimatedPrice(config) {
  const basePricePerM2 = 4200;
  let price = basePricePerM2 * config.area;
  
  // Modyfikatory dla dachu
  const roofModifiers = {
    flat: -0.1,
    gabled: 0,
    multi: 0.2
  };
  
  // Modyfikatory dla elewacji
  const elevationModifiers = {
    stucco: 0,
    wood: 0.12,
    brick: 0.15,
    stone: 0.25
  };
  
  // Koszty garażu
  const garageCosts = {
    none: 0,
    single: 40000,
    double: 50000
  };
  
  // Zastosuj modyfikatory
  if (roofModifiers[config.roof] !== undefined) {
    price *= (1 + roofModifiers[config.roof]);
  }
  
  if (elevationModifiers[config.elevation] !== undefined) {
    price *= (1 + elevationModifiers[config.elevation]);
  }
  
  // Dodaj koszt garażu
  price += garageCosts[config.garage] || 0;
  
  // Druga kondygnacja
  if (config.floors > 1) {
    const additionalArea = config.area * (config.floors - 1) * 0.7; // 70% powierzchni na piętrze
    price += additionalArea * basePricePerM2;
  }
  
  // Piwnica
  if (config.basement) {
    price += config.area * 1500; // 1500 NOK/m² za piwnicę
  }
  
  return Math.round(price);
}

// Globalna funkcja do pobierania danych konfiguratora
window.getConfiguratorData = function() {
  return window.userSelectionsNormalized || window.userSelections;
};

// Globalna funkcja do wysyłania danych do AI
window.sendConfigToAI = async function(configData) {
  try {
    const response = await fetch('http://localhost:4000/api/generate-visualization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Błąd komunikacji z serwerem.');
    }

    const data = await response.json();
    return {
      imageUrl: data.imageUrl,
      costEstimate: data.costEstimate
    };
  } catch (err) {
    console.error('❌ Błąd wysyłania danych do AI:', err);
    throw err;
  }
};

// Główna funkcja inicjalizująca krok podsumowania
export function initStepSummary() {
  const generateBtn = document.getElementById('summary-generate-button');
  const backBtn = document.getElementById('summary-back-button');
  const imageEl = document.getElementById('summary-image');
  const loaderEl = document.getElementById('summary-loader');
  const costEl = document.getElementById('summary-cost');
  const priceSection = document.getElementById('summary-price');
  const errorEl = document.getElementById('summary-error');
  const successEl = document.getElementById('summary-success');

  const nameInput = document.getElementById('user-name');
  const phoneInput = document.getElementById('user-phone');
  const emailInput = document.getElementById('user-email');

  populateSummary(window.userSelections);

  // Walidacja formularza
  function validateForm() {
    const name = nameInput?.value.trim();
    const phone = phoneInput?.value.trim();
    const email = emailInput?.value.trim();
    
    if (!name || !phone || !email) {
      return { valid: false, message: 'Uzupełnij wszystkie pola formularza.' };
    }
    
    // Walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Podaj prawidłowy adres e-mail.' };
    }
    
    // Walidacja telefonu (norwegski format)
    const phoneRegex = /^(\+47)?[\s]?[0-9]{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return { valid: false, message: 'Podaj prawidłowy numer telefonu (8 cyfr).' };
    }
    
    return { valid: true };
  }

  // Wyświetlanie błędów
  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Ukrywanie błędów
  function hideError() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  // Wyświetlanie sukcesu
  function showSuccess(message) {
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
    }
  }

  // Obsługa generowania wizualizacji
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      // Walidacja
      const validation = validateForm();
      if (!validation.valid) {
        showError(validation.message);
        return;
      }

      hideError();
      
      // Pokaż loader
      if (loaderEl) loaderEl.style.display = 'block';
      if (imageEl) imageEl.style.display = 'none';
      if (priceSection) priceSection.style.display = 'none';
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generowanie...';

      // Animacja progress bar
      let progress = 0;
      const progressBar = loaderEl?.querySelector('.loader-progress');
      const percentText = loaderEl?.querySelector('#loader-percent');
      const statusText = loaderEl?.querySelector('.loader-status');
      
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 15, 95);
        if (progressBar) progressBar.style.width = progress + '%';
        if (percentText) percentText.textContent = Math.floor(progress) + '%';
        
        // Aktualizuj status
        if (statusText) {
          if (progress < 30) statusText.textContent = 'Przygotowywanie danych...';
          else if (progress < 60) statusText.textContent = 'Generowanie wizualizacji AI...';
          else if (progress < 90) statusText.textContent = 'Finalizowanie projektu...';
          else statusText.textContent = 'Prawie gotowe...';
        }
      }, 500);

      try {
        // Pobierz dane konfiguracji
        const configData = window.getConfiguratorData();
        
        // Wyślij do AI
        const response = await window.sendConfigToAI(configData);

        // Zakończ animację progress
        clearInterval(progressInterval);
        if (progressBar) progressBar.style.width = '100%';
        if (percentText) percentText.textContent = '100%';
        if (statusText) statusText.textContent = 'Gotowe!';

        // Wyświetl wyniki
        setTimeout(() => {
          if (imageEl) {
            imageEl.src = response.imageUrl;
            imageEl.style.display = 'block';
          }
          
          if (costEl) {
            costEl.textContent = response.costEstimate.toLocaleString('pl-PL') + ' NOK';
          }
          
          if (loaderEl) loaderEl.style.display = 'none';
          if (priceSection) priceSection.style.display = 'block';
          
          showSuccess('Wizualizacja została wygenerowana pomyślnie!');
        }, 500);

        // Wyślij dane kontaktowe i ofertę
        try {
          await fetch('http://localhost:4000/api/send-offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameInput.value,
              phone: phoneInput.value,
              email: emailInput.value,
              config: configData,
              imageUrl: response.imageUrl,
              estimate: response.costEstimate,
              timestamp: new Date().toISOString()
            })
          });
          
          // Pokaż przycisk pobierania
          const downloadBtn = document.getElementById('download-offer-button');
          if (downloadBtn) {
            downloadBtn.style.display = 'inline-block';
            downloadBtn.onclick = () => downloadOffer(configData, response);
          }
          
        } catch (offerError) {
          console.error('Błąd wysyłania oferty:', offerError);
          // Nie pokazuj błędu użytkownikowi - wizualizacja została wygenerowana
        }

      } catch (err) {
        clearInterval(progressInterval);
        if (loaderEl) loaderEl.style.display = 'none';
        showError('Wystąpił błąd podczas generowania wizualizacji. Spróbuj ponownie.');
        console.error('Błąd:', err);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '🎨 Generuj wizualizację';
      }
    });
  }

  // Przycisk wstecz
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Wróć do kroku dodatkowych opcji
      if (window.initStepAdditional) {
        window.initStepAdditional();
      } else {
        // Fallback - wróć do kroku garażu
        const step6 = document.getElementById('step-garage');
        if (step6 && window.changeStep) {
          window.changeStep(step6);
        }
      }
    });
  }

  // Walidacja w czasie rzeczywistym
  [nameInput, phoneInput, emailInput].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        hideError();
      });
    }
  });
}

// Funkcja do pobierania oferty
function downloadOffer(config, response) {
  // Tworzenie pliku PDF lub przekierowanie do endpointu pobierania
  const downloadData = {
    config: config,
    imageUrl: response.imageUrl,
    estimate: response.costEstimate,
    date: new Date().toLocaleDateString('pl-PL')
  };
  
  // Symulacja pobierania
  const dataStr = JSON.stringify(downloadData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `oferta-domu-${Date.now()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}