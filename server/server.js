// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;

// Inicjalizacja OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Mapowania stylów, elewacji i dachów dla promptów AI
const styleMap = {
  nowoczesny_minimalizm: 'nowoczesny minimalizm, prosta, geometryczna bryła, duże przeszklenia, płaski dach',
  klasyczna_elegancja:   'klasyczny styl, elegancka i tradycyjna forma, symetryczna fasada',
  dworek:               'klasyczny dworek polski, z kolumnami i gankiem'
};
const elevMap = {
  wood:  'elewacja WYŁĄCZNIE ze skandynawskiej deski elewacyjnej (ciemny dąb)',
  tynk:  'elewacja WYŁĄCZNIE otynkowana na biało'
};
const roofMap = {
  flat:   'płaski dach pokryty papą bitumiczną',
  gabled: 'dach dwuspadowy pokryty dachówką ceramiczną',
  multi:  'dach wielospadowy pokryty dachówką ceramiczną'
};

// Kosztorys
const BASE_COST_PER_SQM = 4200;
const COST_MODIFIERS = {
  style:   { nowoczesny_minimalizm: 1.1, klasyczna_elegancja: 1.0, dworek: 1.2 },
  floors:  { '1': 1.0, '2': 1.3 },
  roof:    { flat: 0.9, gabled: 1.0, multi: 1.2 },
  elev:    { wood: 1.15, tynk: 1.0 },
  garage:  { none: 0, single: 40000, double: 50000 },
  basement:{ yes: 1500, no: 0 }
};
function calculateCost({ area, style, floors, roof, elev, garage, basement }) {
  let cost = BASE_COST_PER_SQM * area;
  cost *= COST_MODIFIERS.style[style]   ?? 1;
  cost *= COST_MODIFIERS.floors[floors] ?? 1;
  cost *= COST_MODIFIERS.roof[roof]     ?? 1;
  cost *= COST_MODIFIERS.elev[elev]     ?? 1;
  cost += COST_MODIFIERS.garage[garage] ?? 0;
  if (basement) cost += area * COST_MODIFIERS.basement.yes;
  return Math.round(cost);
}

// Generowanie promptu dla DALL·E
function generatePrompt({ style, elev, roof }) {
  return `Fotorealistyczna wizualizacja domu. Styl: ${styleMap[style]}. Dach: ${roofMap[roof]}. Elewacja: ${elevMap[elev]}.`;
}

// POST /api/generate-visualization
app.post('/api/generate-visualization', async (req, res) => {
  const { style, elev, roof, floors, area, garage, basement } = req.body;
  if (!style || !elev || !roof || !floors || !area || !garage) {
    return res.status(400).json({ error: 'Brakuje wymaganych danych wejściowych.' });
  }

  const prompt      = generatePrompt({ style, elev, roof });
  const costEstimate = calculateCost({ style, elev, roof, floors, area, garage, basement });

  try {
    const aiResp = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024'
    });
    const imageUrl = aiResp.data[0].url;
    return res.json({ imageUrl, costEstimate });
  } catch (err) {
    console.error('❌ Błąd AI:', err);
    return res.status(500).json({ error: 'Błąd generowania obrazu AI.', details: err.message });
  }
});

// Konfiguracja Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS
  }
});

// Weryfikacja połączenia SMTP
transporter.verify()
  .then(() => console.log('✔ SMTP transporter zweryfikowany.'))
  .catch(err => console.error('❌ Błąd weryfikacji SMTP:', err));

// POST /api/send-offer
app.post('/api/send-offer', async (req, res) => {
  const { name, phone, email, imageUrl, estimate } = req.body;
  if (!name || !phone || !email || !imageUrl || !estimate) {
    return res.status(400).json({ error: 'Brakuje danych do wysłania oferty.' });
  }

  console.log('✉ Przygotowuję mail do:', email);

  const mailOptions = {
    from:    `"Scandura Homes" <${process.env.EMAIL_FROM}>`,
    to:      email,
    subject: 'Twoja oferta Scandura Homes',
    html: `
      <p>Cześć ${name},</p>
      <p>Dziękujemy za skorzystanie z konfiguratora. Oto Twoja wizualizacja i wycena:</p>
      <img src="${imageUrl}" alt="Wizualizacja domu" style="width:100%;max-width:600px;border-radius:8px;"/>
      <p><strong>Szacunkowy koszt budowy: ${estimate} NOK</strong></p>
      <p>Skontaktujemy się wkrótce telefonicznie: ${phone}</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✔ Mail wysłany, messageId=', info.messageId);
    console.log('✔ SMTP response:', info.response);
    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Błąd sendMail():', err);
    return res.status(500).json({ error: 'Nie udało się wysłać maila.', details: err.message });
  }
});

// Start serwera
app.listen(port, () => {
  console.log(`🚀 Serwer działa na http://localhost:${port}`);
});
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import axios from 'axios';  // Dodano import axios do proxy obrazków
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;

// Inicjalizacja OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ====================================================================
// Mapowania stylów, elewacji i dachów dla promptów DALL-E
// Klucze muszą odpowiadać wartościom z frontendu (np. data-style, data-elev, data-roof, itp.)
// ====================================================================
const styleMap = {
  nowoczesny_minimalizm: 'nowoczesny minimalizm, prosta, geometryczna bryła, duże przeszklenia, płaski dach',
  klasyczna_elegancja:   'klasyczny styl, elegancka i tradycyjna forma, symetryczna fasada',
  dworek:                'klasyczny dworek polski, z kolumnami, gankiem',
  // Dodatkowe klucze (synonimy) jeśli używane w frontendzie:
  modern:                'nowoczesny minimalizm, prosta geometryczna bryła, duże przeszklenia, płaski dach',
  traditional:           'klasyczny styl, elegancka tradycyjna forma, symetryczna fasada',
  mansion:               'klasyczny dworek polski, z kolumnami, gankiem',
  bungalow:              'parterowy dom w stylu bungalow, rozłożysta niska bryła',   // jeśli taka opcja występuje
  parterowy_styl:        'parterowy dom jednorodzinny, rozłożysta bryła'            // jeśli taka opcja występuje
};
const elevMap = {
  'Deska elewacyjna': 'elewacja WYŁĄCZNIE ze skandynawskiej deski elewacyjnej (ciemnobrązowy dąb), wąskie panele, wyraźne usłojenie',
  'Tynk mineralny':   'elewacja WYŁĄCZNIE otynkowana na biało, gładka powierzchnia',
  // Synonimy (np. gdy frontend używa skrótowych angielskich kluczy):
  wood:               'elewacja WYŁĄCZNIE ze skandynawskiej deski elewacyjnej (ciemnobrązowy dąb), wąskie panele, wyraźne usłojenie',
  tynk:               'elewacja WYŁĄCZNIE otynkowana na biało, gładka powierzchnia'
};
const roofMap = {
  blachodachowka:      'dach pokryty nowoczesną, modułową blachodachówką w kolorze antracytowym',
  dachowka_ceramiczna: 'dach pokryty tradycyjną dachówką ceramiczną (czerwoną lub czarną)',
  papa:                'dach pokryty papą (bitumiczną), dach płaski',
  // Dodatkowe klucze/aliasy:
  blacha:              'dach pokryty nowoczesną, modułową blachodachówką w kolorze antracytowym',   // alias blachodachówki
  dachowka:            'dach pokryty tradycyjną dachówką ceramiczną (czerwoną lub czarną)',         // alias dachówki ceramicznej
  tiles:               'dach pokryty tradycyjną dachówką ceramiczną (czerwoną lub czarną)',         // alias dachówki ceramicznej
  // Jeśli frontend używał ogólnych typów dachu:
  flat:                'płaski dach pokryty papą (bitumiczną)',
  gabled:              'dach dwuspadowy pokryty dachówką ceramiczną',
  multi:               'dach wielospadowy pokryty dachówką ceramiczną'
};

// ====================================================================
// Kosztorys – parametry kosztowe (przykładowe wartości dla Trondheim, Norwegia)
// ====================================================================
const BASE_COST_PER_SQM = 55000;  // bazowy koszt za m² (NOK)
const COST_MODIFIERS = {
  // Modyfikatory kosztów w zależności od wybranego stylu
  style: {
    nowoczesny_minimalizm: 1.12,   // nowoczesny styl nieco droższy (duże przeszklenia, niestandardowe rozwiązania)
    klasyczna_elegancja:   1.00,   // styl klasyczny bazowy koszt
    dworek:                1.25,   // dworek bardziej kosztowny (detale architektoniczne)
    // ewentualne aliasy stylów:
    modern:                1.12,
    traditional:           1.00,
    mansion:               1.25
  },
  // Modyfikatory kosztów dla kondygnacji (parterowy, z poddaszem, piętrowy)
  floors: {
    parterowy: 0.95,  // dom parterowy: brak schodów, ale większy fundament i dach
    poddasze:  1.05,  // poddasze użytkowe: okna dachowe, lukarny, itd.
    pietrowy:  1.15,  // dom piętrowy: dodatkowe ściany, strop, schody (drożej)
    // Jeśli frontend wysyła liczby jako string (zabezpieczenie na wypadek innego formatu):
    '1':      0.95,
    '2':      1.15
  },
  // Modyfikatory kosztów dla dachu (rodzaj pokrycia/konstrukcji)
  roof: {
    blachodachowka:      1.00,  // blachodachówka (modułowa, metalowa) – bazowy koszt
    dachowka_ceramiczna: 1.07,  // dachówka ceramiczna – droższa zarówno materiał, jak i montaż
    papa:                0.98,  // papa na dachu płaskim – nieco tańsza opcja
    // aliasy:
    blacha:              1.00,
    dachowka:            1.07,
    ceramic:             1.07,
    // jeżeli używane są klucze ogólne od kształtu dachu:
    flat:                0.98,  // płaski dach (pokrycie papą)
    gabled:              1.00,  // dach dwuspadowy (pokrycie dachówką ceramiczną)
    multi:               1.20   // dach wielospadowy (bardziej skomplikowana więźba)
  },
  // Modyfikatory kosztów dla elewacji
  elev: {
    'Deska elewacyjna': 1.18,  // drewniana elewacja droższa niż tynk
    'Tynk mineralny':   1.00,  // tynk jako baza
    wood:               1.18,
    tynk:               1.00
  },
  // Dodatkowe koszty stałe (niezależne od powierzchni)
  garage: {
    attached: 300000,  // garaż w bryle budynku (zintegrowany)
    detached: 150000,  // garaż wolnostojący
    none:          0,  // brak garażu
    // jeśli frontend pozostał przy 'single' / 'double':
    single:   200000,  // (przybliżony koszt garażu jednostanowiskowego)
    double:   300000   // (przybliżony koszt garażu dwustanowiskowego)
  },
  basement: {
    yes: 400000,  // piwnica: znaczny koszt dodatkowy (wykop, izolacja, itd.)
    no:       0
  },
  rental: {
    yes: 200000,  // dodatkowa część na wynajem: dodatkowe wyposażenie, osobne wejście itp.
    no:       0
  },
  accessibility: {
    yes: 100000,  // dostosowanie domu dla osób niepełnosprawnych (np. szersze drzwi, podjazdy)
    no:       0
  }
};

/**
 * Oblicza szacunkowy koszt budowy domu na podstawie wybranych opcji.
 * Zwraca całkowity koszt w NOK.
 */
function calculateCost({ style, area, floors, roof, elev, garage, basement, rental, accessibility }) {
  let totalCost = area * BASE_COST_PER_SQM;

  // Zastosowanie modyfikatorów procentowych
  totalCost *= (COST_MODIFIERS.style[style] || 1);
  totalCost *= (COST_MODIFIERS.floors[floors] || 1);

  // Specjalna logika dla dachu przy stylu nowoczesnym – wymuszenie dachu płaskiego
  let effectiveRoof = roof;
  if (style === 'modern' || style === 'nowoczesny_minimalizm') {
    // Jeśli wybrany styl jest nowoczesny, a użytkownik nie wybrał blachodachówki (która może być stosowana na dachach płaskich),
    // to zakładamy dach płaski kryty papą.
    if (roof !== 'blachodachowka' && roof !== 'blacha') {
      effectiveRoof = 'papa';
    }
  }
  totalCost *= (COST_MODIFIERS.roof[effectiveRoof] || 1);
  totalCost *= (COST_MODIFIERS.elev[elev] || 1);

  // Dodanie kosztów stałych za dodatkowe elementy
  totalCost += (COST_MODIFIERS.garage[garage] || 0);
  totalCost += (COST_MODIFIERS.basement[basement] || 0);
  totalCost += (COST_MODIFIERS.rental[rental] || 0);
  totalCost += (COST_MODIFIERS.accessibility[accessibility] || 0);

  return Math.round(totalCost);
}

/**
 * Generuje opisowy prompt dla DALL-E na podstawie wybranych parametrów domu.
 */
function generatePrompt({ style, elev, roof, floors, garage }) {
  // Opis kondygnacji / bryły budynku
  let floorsDescription = '';
  if (floors === 'parterowy') {
    floorsDescription = 'dom JEDNOKONDYGNACYJNY, parterowy (bez piętra)';
  } else if (floors === 'pietrowy') {
    floorsDescription = 'dom DWUKONDYGNACYJNY, z pełnym piętrem (parter + piętro)';
  } else if (floors === 'poddasze') {
    // Opis lukarny ("kukułki") w zależności od stylu
    const dormer = (style === 'modern' || style === 'nowoczesny_minimalizm')
      ? 'prostokątna nowoczesna lukarna z płaskim dachem'
      : 'tradycyjna lukarna na dachu';
    floorsDescription = \`dom z parterem i UŻYTKOWYM PODDASZEM (\${dormer})\`;
  } else {
    floorsDescription = 'dom';  // domyślny opis, gdy brak dopasowania
  }

  // Dodatkowe cechy stylu – np. wymuszenie parterowej bryły dla bungalow
  let styleSpecifics = '';
  if (style === 'bungalow' || style === 'parterowy_styl') {
    styleSpecifics = ', wyłącznie jednokondygnacyjna bryła (tylko parter)';
  }

  // Opis garażu
  let garageDescription = '';
  if (garage === 'attached' || garage === 'single' || garage === 'double') {
    garageDescription = 'z wbudowanym garażem w bryle budynku';
  } else if (garage === 'detached') {
    garageDescription = 'z wolnostojącym garażem obok domu';
  } else if (garage === 'none' || garage === 'brak') {
    garageDescription = 'bez garażu';
  }

  // Opis dachu (uwzględnia styl nowoczesny = dach płaski)
  let roofDescription = '';
  if (style === 'modern' || style === 'nowoczesny_minimalizm') {
    // Dla nowoczesnego stylu zawsze stosujemy dach płaski:
    if (roof === 'blachodachowka' || roof === 'blacha') {
      roofDescription = 'płaski dach pokryty nowoczesną blachodachówką (antracyt)';
    } else {
      roofDescription = 'płaski dach pokryty papą (bitumiczną)';
    }
  } else {
    roofDescription = roofMap[roof] || '';  // dla innych stylów używamy zdefiniowanego opisu dachu
  }

  // Złożenie pełnego promptu
  return \`Fotorealistyczna wizualizacja domu jednorodzinnego. Styl: \${styleMap[style]}\${styleSpecifics}. Typ: \${floorsDescription}. Dach: \${roofDescription}. Elewacja: \${elevMap[elev]}. \${garageDescription.charAt(0).toUpperCase() + garageDescription.slice(1)}. Otoczenie: zielony trawnik, drzewa w tle. Naturalne oświetlenie, widok z zewnątrz.\`;
}

// Endpoint: Generowanie wizualizacji i wyceny
app.post('/api/generate-visualization', async (req, res) => {
  console.log('▶ Otrzymano żądanie /api/generate-visualization z danymi:', req.body);

  // Pobranie wszystkich wymaganych danych z requestu
  const { style, elev, roof, floors, area, garage, basement, rental, accessibility } = req.body;

  // Walidacja wejścia – sprawdzamy czy wszystkie pola są uzupełnione
  if (style === undefined || elev === undefined || roof === undefined || 
      floors === undefined || area === undefined || garage === undefined || 
      basement === undefined || rental === undefined || accessibility === undefined) {
    console.error('❌ Brak wymaganych danych wejściowych:', { style, elev, roof, floors, area, garage, basement, rental, accessibility });
    return res.status(400).json({ 
      error: 'Brak danych wejściowych.', 
      details: 'Wymagane pola: style, elev, roof, floors, area, garage, basement, rental, accessibility.' 
    });
  }

  // Generowanie promptu dla DALL-E na podstawie parametrów
  const prompt = generatePrompt({ style, elev, roof, floors, garage });
  console.log('📤 Wygenerowany prompt dla DALL-E:', prompt);

  // Obliczanie szacunkowego kosztu budowy
  const costEstimate = calculateCost({ style, area, floors, roof, elev, garage, basement, rental, accessibility });
  console.log('💰 Szacunkowy koszt budowy:', costEstimate, 'NOK');

  try {
    // Wywołanie API OpenAI (DALL-E) do wygenerowania obrazu
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024'
    });
    const imageUrl = response.data[0].url;
    console.log('✅ URL wygenerowanego obrazu:', imageUrl);

    // Zwrócenie URL-a obrazu oraz kosztorysu do frontendu
    return res.json({ imageUrl, costEstimate });
  } catch (err) {
    console.error('❌ Błąd podczas generowania obrazu:', err);
    return res.status(500).json({ 
      error: 'Błąd generowania obrazu AI.', 
      details: err.message 
    });
  }
});

// Endpoint: Proxy obrazków (rozwiązuje ewentualne problemy CORS przy ładowaniu obrazów bezpośrednio z URL)
app.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Brak parametru URL w żądaniu.');
  }
  try {
    // Pobieramy obraz z zewnętrznego URL (OpenAI) jako dane binarne
    const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
    // Ustawiamy odpowiedni Content-Type i zwracamy obraz
    res.set('Content-Type', imageResponse.headers['content-type'] || 'image/png');
    res.send(imageResponse.data);
  } catch (err) {
    console.error('❌ Błąd podczas proxy obrazka:', err);
    res.status(500).send('Nie udało się pobrać obrazka z podanego URL.');
  }
});

// Konfiguracja Nodemailer (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS
  }
});

// Weryfikacja połączenia SMTP
transporter.verify()
  .then(() => console.log('✔ SMTP transporter poprawnie zweryfikowany.'))
  .catch(err => console.error('❌ Błąd weryfikacji SMTP:', err));

// Endpoint: Wysyłanie oferty (wiadomość e-mail z wizualizacją i wyceną)
app.post('/api/send-offer', async (req, res) => {
  const { name, phone, email, imageUrl, estimate } = req.body;
  if (!name || !phone || !email || !imageUrl || !estimate) {
    return res.status(400).json({ error: 'Brakuje danych do wysłania oferty.' });
  }

  console.log('✉ Przygotowanie wiadomości e-mail do:', email);

  const mailOptions = {
    from: `"Scandura Homes" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Twoja oferta - Scandura Homes',
    html: `
      <p>Cześć ${name},</p>
      <p>Dziękujemy za skorzystanie z naszego konfiguratora domu. Poniżej przesyłamy Twoją spersonalizowaną wizualizację oraz wstępną wycenę:</p>
      <img src="${imageUrl}" alt="Wizualizacja domu" style="width:100%;max-width:600px;border-radius:8px;"/>
      <p><strong>Szacunkowy koszt budowy: ${estimate} NOK</strong></p>
      <p>Wkrótce skontaktujemy się z Tobą telefonicznie pod numerem: ${phone}</p>
      <p>Pozdrawiamy,<br>Zespół Scandura Homes</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✔ E-mail wysłany, messageId:', info.messageId);
    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Błąd sendMail():', err);
    return res.status(500).json({ 
      error: 'Nie udało się wysłać maila.', 
      details: err.message 
    });
  }
});

// Uruchomienie serwera
app.listen(port, () => {
  console.log(`🚀 Serwer uruchomiony na http://localhost:${port}`);
});
