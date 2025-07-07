import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import axios from 'axios';

// Wczytywanie zmiennych środowiskowych z pliku .env
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
// Użycie CORS do zezwalania na żądania z różnych domen (np. z Twojego frontendu na innym porcie/domenie)
app.use(cors());
// Middleware do parsowania JSON z body requestu (zastępuje body-parser dla JSON)
app.use(express.json());

const port = 4000; // Port, na którym działa serwer backendu

// ====================================================================
// MAPY DLA PROMPTÓW DALL-E:
// KLUCZE W TYCH MAPACH MUSZĄ DOKŁADNIE ODPOWIADAĆ WARTOŚCIOM
// data-style, data-elev, data-roof, data-floors, data-garage
// Z TWOJEGO FRONTENDU (configurator.js / HTML)!
// ====================================================================

// 🔶 Mapa stylów dla promptu DALL-E i ich opisów
const styleMap = {
    // KLUCZE TUTAJ MUSZĄ ODPOWIADAĆ WARTOSCIOM data-style Z FRONTENDU
    'nowoczesny_minimalizm': 'nowoczesny minimalizm, prosta, geometryczna bryła, duże przeszklenia, płaski dach',
    'klasyczna_elegancja': 'klasyczny styl, elegancka i tradycyjna forma, symetryczna fasada',
    'dworek': 'klasyczny dworek polski, z kolumnami, gankiem',
    // Dodatkowe klucze, jeśli używane w frontendzie:
    'modern': 'nowoczesny styl, prosta, geometryczna bryła, duże przeszklenia, płaski dach',
    'traditional': 'klasyczny styl, tradycyjna forma, symetryczna fasada',
    'mansion': 'klasyczny dworek polski, z kolumnami, gankiem'
};

// 🔶 Mapa elewacji dla promptu DALL-E
const elevMap = {
    // KLUCZE TUTAJ MUSZĄ ODPOWIADAĆ WARTOSCIOM data-elev Z FRONTENDU (np. 'Deska elewacyjna', 'Tynk mineralny')
    'Deska elewacyjna': 'elewacja WYŁĄCZNIE ze skandynawskiej deski elewacyjnej (ciemnobrązowy dąb), wąskie pionowe panele LUB poziome, wyraźne usłojenie, BEZ TYNKU CZY BETONU',
    'Tynk mineralny': 'elewacja WYŁĄCZNIE otynkowana na biało, gładka powierzchnia',
    // Dodatkowe klucze, jeśli używane w frontendzie:
    'wood': 'elewacja WYŁĄCZNIE ze skandynawskiej deski elewacyjnej (ciemnobrązowy dąb), wąskie pionowe panele LUB poziome, wyraźne usłojenie, BEZ TYNKU CZY BETONU',
    'tynk': 'elewacja WYŁĄCZNIE otynkowana na biało, gładka powierzchnia'
};

// 🔶 Mapa dachów dla promptu DALL-E
const roofMap = {
    // KLUCZE TUTAJ MUSZĄ ODPOWIADAĆ WARTOSCIOM data-roof Z FRONTENDU (np. 'blachodachowka', 'dachowka_ceramiczna', 'tiles')
    'blachodachowka': 'dach pokryty nowoczesną, modułową blachodachówką w kolorze antracytowym',
    'dachowka_ceramiczna': 'dach pokryty tradycyjną dachówką ceramiczną (czerwoną lub czarną)',
    'papa': 'dach pokryty papą (bitumiczna), płaski', // Dodana opcja dla papy
    // Dodatkowe klucze, jeśli używane w frontendzie:
    'blacha': 'dach pokryty nowoczesną, modułową blachodachówką w kolorze antracytowym',
    'dachowka': 'dach pokryty tradycyjną dachówką ceramiczną (czerwoną lub czarną)',
    'tiles': 'dach pokryty tradycyjną dachówką ceramiczną (czerwoną lub czarną)'
};


// =========================================================
// LOGIKA WYCENY:
// DOSTOSUJ TE WARTOŚCI DO REALNYCH KOSZTÓW W TWOIM REGIONIE (Trondheim, Norwegia)!
// KLUCZE W TYCH MAPACH MUSZĄ ODPOWIADAĆ WARTOŚCIOM Z FRONTENDU.
// =========================================================

// Bazowa cena za metr kwadratowy w NOK (przykładowa dla nowej budowy w Trondheim)
// Pamiętaj: to jest orientacyjna wartość, którą należy zweryfikować z lokalnymi cenami rynkowymi.
const BASE_COST_PER_SQM = 55000; // NOK/m²

// Modyfikatory kosztów dla różnych wyborów (procentowe lub stałe kwoty w NOK)
const COST_MODIFIERS = {
    // Style (procentowe modyfikatory od bazowego kosztu za m²)
    style: {
        'nowoczesny_minimalizm': 1.12, // Wyższe koszty za skomplikowane detale, duże przeszklenia
        'klasyczna_elegancja': 1.00,   // Koszt bazowy
        'dworek': 1.25,                // Więcej detali architektonicznych, złożoność
        'modern': 1.12, // Jeśli używane są stare klucze
        'traditional': 1.00,
        'mansion': 1.25
    },
    // Kondygnacje (procentowe modyfikatory od bazowego kosztu za m²)
    floors: {
        'parterowy': 0.95,     // Brak schodów, ale większa powierzchnia dachu/fundamentów
        'poddasze': 1.05,      // Koszty adaptacji poddasza, okna dachowe
        'pietrowy': 1.15       // Skomplikowana konstrukcja piętra, schody, więcej ścian
    },
    // Dach (procentowe modyfikatory od bazowego kosztu za m²)
    roof: {
        'blachodachowka': 1.00,
        'dachowka_ceramiczna': 1.07, // Dachówka ceramiczna jest zazwyczaj droższa w materiale i montażu
        'papa': 0.98, // Papa może być nieco tańsza niż blachodachówka
        'blacha': 1.00, // Jeśli używane są stare klucze
        'dachowka': 1.07,
        'ceramic': 1.07
    },
    // Elewacja (procentowe modyfikatory od bazowego kosztu za m²)
    elev: {
        'Deska elewacyjna': 1.18, // Elewacja drewniana jest droższa niż tynk
        'Tynk mineralny': 1.00,
        'wood': 1.18, // Jeśli używane są stare klucze
        'tynk': 1.00
    },
    // Dodatki (stałe kwoty w NOK) - upewnij się, że klucze (np. 'attached', 'detached', 'none') pasują do frontendu
    garage: {
        'attached': 300000,   // Garaż zintegrowany z bryłą domu
        'detached': 150000,     // Garaż wolnostojący
        'none': 0               // Brak garażu
    },
    basement: {
        'yes': 400000,          // Piwnica (kopanie, wzmocnione fundamenty, hydroizolacja)
        'no': 0
    },
    rental: {
        'yes': 200000,          // Część na wynajem (dodatkowa kuchnia, łazienka, instalacje, osobne wejście)
        'no': 0
    },
    accessibility: {
        'yes': 100000,          // Dostosowanie do standardów dostępności (szersze drzwi, brak progów, rampy, ewentualnie winda)
        'no': 0
    }
};

/**
 * Oblicza szacunkowy koszt budowy domu na podstawie wybranych parametrów.
 * @param {object} options - Obiekt zawierający wybory użytkownika.
 * @param {string} options.style - Wybrany styl domu.
 * @param {number} options.area - Powierzchnia domu w m².
 * @param {string} options.floors - Rodzaj kondygnacji (parterowy, poddasze, pietrowy).
 * @param {string} options.roof - Rodzaj dachu.
 * @param {string} options.elev - Rodzaj elewacji.
 * @param {string} options.garage - Typ garażu (integrated, detached, none).
 * @param {string} options.basement - Czy jest piwnica (yes, no).
 * @param {string} options.rental - Czy jest część na wynajem (yes, no).
 * @param {string} options.accessibility - Czy jest dostosowanie dostępności (yes, no).
 * @returns {number} Szacunkowy całkowity koszt w NOK.
 */
function calculateCost({ style, area, floors, roof, elev, garage, basement, rental, accessibility }) {
    let currentCost = area * BASE_COST_PER_SQM;

    // Aplikacja modyfikatorów procentowych na podstawie stylu, kondygnacji, dachu, elewacji
    // Użyto || 1, aby uniknąć NaN, jeśli klucz nie zostanie znaleziony
    currentCost *= (COST_MODIFIERS.style[style] || 1);
    currentCost *= (COST_MODIFIERS.floors[floors] || 1);

    // Specjalna logika dla dachu w zależności od stylu
    let effectiveRoof = roof;
    if (style === 'modern' || style === 'nowoczesny_minimalizm') {
        // Jeśli styl jest nowoczesny, a użytkownik wybrał coś innego niż blachodachówkę (która może być płaska),
        // to wymuszamy papę jako pokrycie płaskiego dachu.
        if (roof !== 'blachodachowka' && roof !== 'blacha') { // 'blacha' to stary klucz dla blachodachówki
            effectiveRoof = 'papa';
        }
    }
    currentCost *= (COST_MODIFIERS.roof[effectiveRoof] || 1);


    currentCost *= (COST_MODIFIERS.elev[elev] || 1);

    // Dodatki - stałe kwoty
    // Użyto || 0, aby uniknąć NaN, jeśli klucz nie zostanie znaleziony
    currentCost += (COST_MODIFIERS.garage[garage] || 0);
    currentCost += (COST_MODIFIERS.basement[basement] || 0);
    currentCost += (COST_MODIFIERS.rental[rental] || 0);
    currentCost += (COST_MODIFIERS.accessibility[accessibility] || 0);

    // Zaokrągl do pełnych jednostek (NOK)
    return Math.round(currentCost);
}

// =========================================================
// KONIEC LOGIKI WYCENY
// =========================================================


// =========================================================
// GENERATOR PROMPTÓW DLA DALL-E:
// Ta funkcja buduje prompt tekstowy, który DALL-E użyje do wygenerowania obrazu.
// =========================================================

/**
 * Generuje prompt tekstowy dla DALL-E na podstawie wybranych parametrów wizualnych.
 * @param {object} options - Obiekt zawierający wybory użytkownika wpływające na wizualizację.
 * @param {string} options.style - Styl domu.
 * @param {string} options.elev - Rodzaj elewacji.
 * @param {string} options.roof - Rodzaj dachu.
 * @param {string} options.floors - Rodzaj kondygnacji.
 * @param {string} options.garage - Typ garażu.
 * @returns {string} Gotowy prompt dla DALL-E.
 */
function generatePrompt({ style, elev, roof, floors, garage }) {
    let floorsDescription = '';
    // Wzmocnione opisy kondygnacji, aby DALL-E lepiej rozumiał bryłę
    if (floors === 'parterowy') {
        floorsDescription = 'dom JEDNOKONDYGNACYJNY, parterowy, BEZ ŻADNYCH PIĘTER I WYSTĄPIEŃ NAD PARTEREM';
    } else if (floors === 'pietrowy') {
        floorsDescription = 'dom DWUKONDYGNACYJNY, z pełnym piętrem (parter + piętro)';
    } else if (floors === 'poddasze') {
        let kukulkaShape = '';
        // Jeśli styl jest nowoczesny, kukułka też powinna być nowoczesna (prostokątna z płaskim dachem)
        if (style === 'modern' || style === 'nowoczesny_minimalizm') {
            kukulkaShape = 'prostokątna "kukułka" z płaskim dachem w nowoczesnym stylu';
        } else {
            kukulkaShape = 'charakterystyczna "kukułka" na dachu';
        }
        // USUNIĘTO "ze skośnymi ścianami na najwyższej kondygnacji"
        floorsDescription = `dom z parterem i UŻYTKOWYM PODDASZEM (${kukulkaShape})`;
    } else {
        floorsDescription = 'dom'; // Domyślny, awaryjny opis
    }

    let styleSpecifics = '';
    // Dodatkowe wzmocnienia dla stylów, które implikują parterową budowę lub mają specyficzne cechy
    // Ważne: Usunięto 'modern' i 'nowoczesny_minimalizm' z tego warunku,
    // ponieważ ich płaski dach jest już w styleMap, a kondygnacje są obsługiwane przez floorsDescription.
    if (style === 'bungalow' || style === 'parterowy_styl') {
        styleSpecifics += ', WYŁĄCZNIE JEDNOKONDYGNACYJNA BRYŁA, niska zabudowa';
    }

    // Opis garażu dla DALL-E
    let garageDescription = '';
    // Upewnij się, że klucze (np. 'attached', 'detached', 'none') pasują do frontendu
    if (garage === 'attached') { // Przykład: 'attached' -> zintegrowany
        garageDescription = 'z wbudowanym garażem zintegrowanym z główną bryłą domu';
    } else if (garage === 'detached') { // Przykład: 'detached' -> wolnostojący
        garageDescription = 'z wolnostojącym garażem oddzielonym od głównego budynku';
    } else if (garage === 'none') {
        garageDescription = 'BEZ GARAŻU, BRAK JAKIEGOKOLWIEK GARAŻU W WIZUALIZACJI'; // Podwójne wzmocnienie negacji
    }

    // Logika wyboru dachu dla promptu DALL-E
    let roofDescription = '';
    if (style === 'modern' || style === 'nowoczesny_minimalizm') {
        // Jeśli styl jest nowoczesny, zawsze płaski dach. Pokrycie: papa, chyba że wybrano blachodachówkę.
        if (roof === 'blachodachowka' || roof === 'blacha') { // 'blacha' to stary klucz dla blachodachówki
            roofDescription = 'płaski dach pokryty nowoczesną blachodachówką w kolorze antracytowym';
        } else {
            roofDescription = 'płaski dach pokryty papą (bitumiczna)';
        }
    } else {
        // Dla pozostałych stylów, użyj wybranego dachu
        roofDescription = roofMap[roof];
    }


    // Finalny, bardziej precyzyjny prompt dla DALL-E
    // Użyto kropek jako separatorów dla większej klarowności dla AI
    return `Fotorealistyczna wizualizacja domu jednorodzinnego. Styl: ${styleMap[style]}${styleSpecifics}. Typ: ${floorsDescription} dom. Dach: ${roofDescription}. Elewacja: ${elevMap[elev]}. ${garageDescription}. Otoczenie: zielona trawa, drzewa. Oświetlenie naturalne. Widok z zewnątrz.`;
}

// =========================================================
// KONIEC GENERATORA PROMPTÓW
// =========================================================


// 🧠 GŁÓWNY ENDPOINT AI: Generowanie wizualizacji i wyceny
app.post('/api/generate-visualization', async (req, res) => {
  console.log('Otrzymane req.body na serwerze:', req.body); // Log, co serwer otrzymał

  // Destrukturyzacja WSZYSTKICH potrzebnych danych z req.body dla obu operacji
  const { style, elev, roof, floors, area, garage, basement, rental, accessibility } = req.body;

  // Rozszerzona walidacja: Sprawdza, czy wszystkie wymagane pola są obecne i nie są 'undefined'
  if (!style || !elev || !roof || !floors || area === undefined || garage === undefined || basement === undefined || rental === undefined || accessibility === undefined) {
    console.error('Serwer: Błąd - Brak wymaganych danych wejściowych w req.body dla generacji i wyceny.');
    console.error(`Brakujące dane: Style: ${style}, Elewacja: ${elev}, Dach: ${roof}, Kondygnacje: ${floors}, Powierzchnia: ${area}, Garaż: ${garage}, Piwnica: ${basement}, Wynajem: ${rental}, Dostępność: ${accessibility}`);
    return res.status(400).json({ error: 'Brak danych wejściowych.', details: 'Wymagane: style, elev, roof, floors, area, garage, basement, rental, accessibility.' });
  }

  // Generowanie promptu tekstowego dla DALL-E na podstawie wizualnych parametrów
  const prompt = generatePrompt({ style, elev, roof, floors, garage });
  console.log('📤 PROMPT wysłany do DALL-E:', prompt); // <--- TA LINIJA POKAŻE CI PROMPT W TERMINALU SERWERA!

    // Obliczanie szacunkowego kosztu na podstawie WSZYSTKICH danych
    const costEstimate = calculateCost({ style, area, floors, roof, elev, garage, basement, rental, accessibility });
    console.log('💰 Szacunkowy koszt:', costEstimate, 'NOK'); // Log kosztu na serwerze

  try {
    // Wywołanie API DALL-E do generowania obrazu
    const response = await openai.images.generate({
      model: 'dall-e-3', // Model DALL-E 3
      prompt,            // Wygenerowany prompt
      n: 1,               // Generuj 1 obraz
      size: '1024x1024'   // Rozmiar obrazu
    });

    const imageUrl = response.data[0].url; // Pobierz URL wygenerowanego obrazu
    console.log('✅ AI image URL (z OpenAI):', imageUrl); // Log URL obrazu
    // Zwróć URL obrazu i szacunkowy koszt do frontendu
    res.json({ imageUrl, costEstimate });
  } catch (err) {
    console.error('❌ Błąd przy generowaniu obrazu (OpenAI API):', err.message);
    // Zwróć szczegółowy błąd do frontendu
    res.status(500).json({ error: 'Błąd generowania obrazu AI.', details: err.message });
  }
});

// 🖼️ PROXY OBRAZKÓW: Endpoint do omijania problemów z CORS przy wyświetlaniu obrazów z OpenAI
app.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query; // Pobierz URL obrazka do proxy
  if (!url) {
        return res.status(400).send('Brak parametru URL w żądaniu proxy.');
    }
  try {
    // Pobierz obraz jako arraybuffer (dane binarne)
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    // Ustaw nagłówek Content-Type na podstawie odpowiedzi z zewnętrznego serwera (lub domyślnie png)
    res.set('Content-Type', response.headers['content-type'] || 'image/png');
    // Wyślij dane obrazu do klienta
    res.send(response.data);
  } catch (err) {
    console.error('❌ Błąd proxy obrazka:', err.message);
    res.status(500).send('Błąd proxy. Nie udało się pobrać obrazka z zewnętrznego źródła.');
  }
});

// Uruchomienie serwera
app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});
