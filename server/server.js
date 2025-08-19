// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import axios from 'axios';
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

// Konfiguracja Stability AI
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_HOST = 'https://api.stability.ai';

// ====================================================================
// Mapowania stylów, elewacji i dachów dla promptów
// ====================================================================
const elevMap = {
  'Deska elewacyjna': 'scandinavian wood cladding facade, dark oak wooden panels, horizontal siding',
  'Tynk mineralny':   'smooth white plaster facade, mineral render finish',
  wood:               'scandinavian wood cladding facade, dark oak wooden panels, horizontal siding',
  tynk:               'smooth white plaster facade, mineral render finish'
};

const roofMap = {
  blachodachowka:      'metal tile roof, anthracite color, modern roofing',
  dachowka_ceramiczna: 'ceramic tile roof, traditional red or black tiles',
  papa:                'flat roof with bitumen membrane',
  blacha:              'metal tile roof, anthracite color',
  dachowka:            'ceramic tile roof',
  tiles:               'ceramic tile roof',
  flat:                'flat roof design',
  gabled:              'gabled roof, two slopes',
  multi:               'multi-gabled complex roof'
};

// ====================================================================
// Kosztorys
// ====================================================================
const BASE_COST_PER_SQM = 55000;
const COST_MODIFIERS = {
  style: {
    nowoczesny_minimalizm: 1.12,
    klasyczna_elegancja:   1.00,
    dworek:                1.25,
    modern:                1.12,
    traditional:           1.00,
    mansion:               1.25
  },
  floors: {
    parterowy: 0.95,
    poddasze:  1.05,
    pietrowy:  1.15,
    '1':      0.95,
    '2':      1.15
  },
  roof: {
    blachodachowka:      1.00,
    dachowka_ceramiczna: 1.07,
    papa:                0.98,
    blacha:              1.00,
    dachowka:            1.07,
    ceramic:             1.07,
    flat:                0.98,
    gabled:              1.00,
    multi:               1.20
  },
  elev: {
    'Deska elewacyjna': 1.18,
    'Tynk mineralny':   1.00,
    wood:               1.18,
    tynk:               1.00
  },
  garage: {
    attached: 300000,
    detached: 150000,
    none:          0,
    single:   200000,
    double:   300000
  },
  basement: {
    yes: 400000,
    no:       0
  },
  rental: {
    yes: 200000,
    no:       0
  },
  accessibility: {
    yes: 100000,
    no:       0
  }
};

function calculateCost({ style, area, floors, roof, elev, garage, basement, rental, accessibility }) {
  let totalCost = area * BASE_COST_PER_SQM;
  totalCost *= (COST_MODIFIERS.style[style] || 1);
  totalCost *= (COST_MODIFIERS.floors[floors] || 1);
  
  let effectiveRoof = roof;
  if (style === 'modern' || style === 'nowoczesny_minimalizm') {
    if (roof !== 'blachodachowka' && roof !== 'blacha') {
      effectiveRoof = 'papa';
    }
  }
  totalCost *= (COST_MODIFIERS.roof[effectiveRoof] || 1);
  totalCost *= (COST_MODIFIERS.elev[elev] || 1);
  
  totalCost += (COST_MODIFIERS.garage[garage] || 0);
  totalCost += (COST_MODIFIERS.basement[basement] || 0);
  totalCost += (COST_MODIFIERS.rental[rental] || 0);
  totalCost += (COST_MODIFIERS.accessibility[accessibility] || 0);
  
  return Math.round(totalCost);
}

/**
 * Generuje prompt dla Stability AI - bardziej techniczny i precyzyjny
 */
function generateStabilityPrompt({ style, elev, roof, floors, garage }) {
  let basePrompt = "professional architectural visualization, photorealistic house rendering, ";
  
  // Typ domu
  if (floors === 'parterowy') {
    basePrompt += "single-story house, one floor only, low horizontal building, bungalow style, ";
  } else if (floors === 'pietrowy') {
    basePrompt += "two-story house, two floors visible, ";
  } else if (floors === 'poddasze') {
    basePrompt += "house with usable attic, dormer windows, ";
  }
  
  // Styl
  basePrompt += styleMap[style] + ", ";
  
  // Dach
  if (floors === 'parterowy' && (style === 'modern' || style === 'nowoczesny_minimalizm')) {
    basePrompt += "flat roof design, ";
  } else {
    basePrompt += (roofMap[roof] || "modern roof") + ", ";
  }
  
  // Elewacja
  basePrompt += elevMap[elev] + ", ";
  
  // Garaż
  if (garage === 'attached' || garage === 'single' || garage === 'double') {
    basePrompt += "integrated garage, ";
  } else if (garage === 'detached') {
    basePrompt += "separate garage building visible, ";
  }
  
  // Końcówka - techniczne detale
  basePrompt += "daytime, sunny weather, green lawn, professional photography, architectural photography style, high quality, detailed, sharp focus";
  
  // Negative prompt dla Stability AI
  const negativePrompt = floors === 'parterowy' 
    ? "two story, multiple floors, tall building, second floor, upper windows, stairs, multi-level"
    : "abstract, artistic, unrealistic, distorted";
  
  return { prompt: basePrompt, negativePrompt };
}

/**
 * Generowanie obrazu przez Stability AI - Image to Image
 */
async function generateWithStabilityImg2Img(prompt, negativePrompt, baseImagePath) {
  const engineId = 'stable-diffusion-xl-1024-v1-0';
  
  // Wczytaj bazowy obraz
  const fs = await import('fs');
  const FormData = (await import('form-data')).default;
  
  // Sprawdź czy plik istnieje
  try {
    await fs.promises.access(baseImagePath);
  } catch (error) {
    console.error(`❌ Brak pliku bazowego: ${baseImagePath}`);
    throw new Error(`Brak pliku bazowego: ${baseImagePath}`);
  }
  
  const formData = new FormData();
  
  // Dodaj obraz bazowy
  const imageStream = fs.createReadStream(baseImagePath);
  formData.append('init_image', imageStream);
  
  // Dodaj parametry
  formData.append('init_image_mode', 'IMAGE_STRENGTH');
  formData.append('image_strength', '0.35');
  formData.append('text_prompts[0][text]', prompt);
  formData.append('text_prompts[0][weight]', '1');
  formData.append('text_prompts[1][text]', negativePrompt);
  formData.append('text_prompts[1][weight]', '-1');
  formData.append('cfg_scale', '7');
  formData.append('samples', '1');
  formData.append('steps', '30');
  formData.append('style_preset', 'photographic');
  
  try {
    const response = await axios.post(
      `${STABILITY_API_HOST}/v1/generation/${engineId}/image-to-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'application/json'
        },
      }
    );
    
    const image = response.data.artifacts[0];
    return `data:image/png;base64,${image.base64}`;
  } catch (error) {
    console.error('❌ Błąd Stability AI:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Wybór bazowego obrazu na podstawie typu domu, stylu i dachu
 */
function getBaseImagePath(floors, style, roof) {
  // Rozbudowana struktura bazowych obrazów
  const baseImages = {
    // STYL NOWOCZESNY
    modern: {
      parterowy: {
        flat: './base-images/modern-single-flat-roof.jpg',           // nowoczesny parterowy płaski dach
        gabled: './base-images/modern-single-barn.jpg',              // nowoczesna stodoła parterowa
        default: './base-images/modern-single-flat-roof.jpg'
      },
      pietrowy: {
        flat: './base-images/modern-two-story-flat-roof.jpg',        // nowoczesny piętrowy płaski dach
        gabled: './base-images/modern-two-story-barn.jpg',           // nowoczesna stodoła piętrowa
        aframe: './base-images/modern-aframe.jpg',                   // A-Frame (zawsze piętrowy)
        default: './base-images/modern-two-story-flat-roof.jpg'
      }
    },
    nowoczesny_minimalizm: {
      parterowy: {
        flat: './base-images/modern-single-flat-roof.jpg',
        gabled: './base-images/modern-single-barn.jpg',
        default: './base-images/modern-single-flat-roof.jpg'
      },
      pietrowy: {
        flat: './base-images/modern-two-story-flat-roof.jpg',
        gabled: './base-images/modern-two-story-barn.jpg',
        aframe: './base-images/modern-aframe.jpg',
        default: './base-images/modern-two-story-flat-roof.jpg'
      }
    },
    
    // STYL KLASYCZNA ELEGANCJA (skandynawski)
    traditional: {
      parterowy: {
        torpet: './base-images/scandi-torpet.jpg',                   // torpet - nowoczesny parterowy dom skandynawski
        rorbu: './base-images/scandi-rorbu.jpg',                     // rorbu (domek rybacki)
        default: './base-images/scandi-torpet.jpg'
      },
      pietrowy: {
        rorbu: './base-images/scandi-rorbu-two-story.jpg',           // rorbu piętrowy
        default: './base-images/scandi-rorbu-two-story.jpg'
      }
    },
    klasyczna_elegancja: {
      parterowy: {
        torpet: './base-images/scandi-torpet.jpg',                   // torpet - nowoczesny parterowy dom skandynawski
        rorbu: './base-images/scandi-rorbu.jpg',                     // rorbu (domek rybacki)
        default: './base-images/scandi-torpet.jpg'
      },
      pietrowy: {
        rorbu: './base-images/scandi-rorbu-two-story.jpg',           // rorbu piętrowy
        default: './base-images/scandi-rorbu-two-story.jpg'
      }
    },
    
    // STYL DWOREK (zawsze piętrowy)
    mansion: {
      pietrowy: {
        gustawianski: './base-images/manor-gustavian.jpg',           // dworek gustawiański
        rokoko: './base-images/manor-rococo-baroque.jpg',            // rokokowo-barokowy
        empire: './base-images/manor-empire.jpg',                    // empire
        default: './base-images/manor-gustavian.jpg'
      },
      parterowy: {
        // Dworki są zawsze piętrowe, ale na wszelki wypadek
        default: './base-images/manor-gustavian.jpg'
      }
    },
    dworek: {
      pietrowy: {
        gustawianski: './base-images/manor-gustavian.jpg',
        rokoko: './base-images/manor-rococo-baroque.jpg',
        empire: './base-images/manor-empire.jpg',
        default: './base-images/manor-gustavian.jpg'
      },
      parterowy: {
        default: './base-images/manor-gustavian.jpg'
      }
    }
  };
  
  // Logika wyboru obrazu
  const styleImages = baseImages[style];
  if (!styleImages) {
    console.warn(`⚠️ Nieznany styl: ${style}, używam modern`);
    return baseImages.modern.parterowy.default;
  }
  
  const floorImages = styleImages[floors] || styleImages.pietrowy;
  
  // Dla nowoczesnego stylu - wybór na podstawie dachu
  if (style === 'modern' || style === 'nowoczesny_minimalizm') {
    if (roof === 'flat' || roof === 'papa') {
      return floorImages.flat || floorImages.default;
    } else if (roof === 'gabled' || roof === 'dachowka_ceramiczna') {
      return floorImages.gabled || floorImages.default;
    } else if (roof === 'aframe') {
      return floorImages.aframe || floorImages.default;
    }
  }
  
  // Dla klasycznego stylu - możesz dodać logikę wyboru podtypu
  // Na razie zwracamy domyślny
  
  return floorImages.default || './base-images/fallback.jpg';
}

/**
 * Rozszerzone mapowania stylów z podtypami
 */
const styleMap = {
  // Nowoczesny z podtypami
  nowoczesny_minimalizm: 'modern minimalist architecture, clean geometric shapes, large windows',
  modern_barn: 'modern barn style house, contemporary farmhouse, black metal roof',
  modern_aframe: 'modern A-frame house, triangular architecture, dramatic roofline',
  
  // Klasyczny skandynawski z podtypami  
  torpet: 'modern Scandinavian single-story house, functional one-floor design, large windows, open floor plan',
  rorbu: 'traditional Norwegian rorbu, fishermans cabin style, red walls',
  
  // Dworek z podtypami
  gustawianski: 'Gustavian manor house, Swedish neoclassical style, light colors',
  rokoko: 'Rococo baroque manor, ornate decorations, pastel colors',
  empire: 'Empire style manor house, neoclassical symmetry, columns',
  
  // Podstawowe (dla kompatybilności)
  modern: 'modern minimalist architecture, clean geometric shapes, large windows',
  traditional: 'modern Scandinavian architecture, functional design, clean lines',
  mansion: 'classical manor house, elegant Polish dworek style',
  klasyczna_elegancja: 'modern Scandinavian architecture, functional design, clean lines',
  dworek: 'classical Polish manor house, dworek architecture'
};

/**
 * Generuje prompt dla Stability AI Image-to-Image
 */
function generateStabilityImg2ImgPrompt({ style, elev, roof, floors, garage }) {
  // Krótszy prompt skupiony na modyfikacjach
  let prompt = "high quality architectural photo, ";
  
  // Elewacja - to główna zmiana wizualna
  if (elev === 'wood' || elev === 'Deska elewacyjna') {
    prompt += "scandinavian dark wood cladding facade, horizontal wooden panels, ";
  } else {
    prompt += "smooth white plaster facade, clean minimalist walls, ";
  }
  
  // Dach - jeśli specyficzny
  if (roof === 'blachodachowka' || roof === 'blacha') {
    prompt += "anthracite metal roof tiles, ";
  } else if (roof === 'dachowka_ceramiczna' || roof === 'dachowka') {
    prompt += "red ceramic roof tiles, ";
  }
  
  // Garaż
  if (garage === 'attached' || garage === 'single') {
    prompt += "with integrated garage door visible, ";
  } else if (garage === 'none') {
    prompt += "no garage, ";
  }
  
  // Otoczenie
  prompt += "green lawn, sunny day, professional photography";
  
  // Negative prompt - czego nie zmieniać
  const negativePrompt = "changing building structure, changing number of floors, distorted proportions, unrealistic";
  
  return { prompt, negativePrompt };
}

// Endpoint: Generowanie wizualizacji i wyceny
app.post('/api/generate-visualization', async (req, res) => {
  console.log('▶ Otrzymano żądanie /api/generate-visualization z danymi:', req.body);

  const { style, elev, roof, floors, area, garage, basement, rent, availability, customPrompt, useStability } = req.body;
  
  if (style === undefined || elev === undefined || roof === undefined || 
      floors === undefined || area === undefined || garage === undefined || 
      basement === undefined || rent === undefined) {
    console.error('❌ Brak wymaganych danych wejściowych');
    return res.status(400).json({ 
      error: 'Brak danych wejściowych.', 
      details: 'Wymagane pola: style, elev, roof, floors, area, garage, basement, rent.' 
    });
  }
  
  // Mapowanie danych
  const rental = rent ? 'yes' : 'no';
  const accessibility = availability ? 'yes' : 'no';
  const basementValue = basement ? 'yes' : 'no';
  const floorsValue = floors === 1 ? 'parterowy' : floors === 2 ? 'pietrowy' : 'poddasze';
  
  console.log('📊 Mapowane dane:', {
    floorsValue,
    basementValue,
    rental,
    accessibility
  });

  try {
    let imageUrl;
    
    // Wybór między Stability AI a DALL-E
    if (useStability || floorsValue === 'parterowy') {
      // Użyj Stability AI Image-to-Image
      const useImg2Img = true; // Możesz to kontrolować z frontendu
      
      if (useImg2Img) {
        // Image-to-Image workflow
        const baseImagePath = getBaseImagePath(floorsValue, style, roof);
        const { prompt, negativePrompt } = generateStabilityImg2ImgPrompt({ 
          style, elev, roof, floors: floorsValue, garage 
        });
        
        console.log('\n========== STABILITY AI IMG2IMG ==========');
        console.log('📸 Bazowy obraz:', baseImagePath);
        console.log('🏠 Styl:', style, '| Piętro:', floorsValue, '| Dach:', roof);
        console.log('📤 Prompt:', prompt);
        console.log('🚫 Negative:', negativePrompt);
        console.log('=========================================\n');
        
        imageUrl = await generateWithStabilityImg2Img(prompt, negativePrompt, baseImagePath);
        
      } else {
        // Text-to-Image workflow (stary sposób)
        const { prompt, negativePrompt } = generateStabilityPrompt({ 
          style, elev, roof, floors: floorsValue, garage 
        });
        
        console.log('\n========== PROMPT DLA STABILITY AI ==========');
        console.log('📤 Prompt:', prompt);
        console.log('🚫 Negative:', negativePrompt);
        console.log('============================================\n');
        
        imageUrl = await generateWithStability(prompt, negativePrompt);
      }
      
    } else {
      // Użyj DALL-E dla pozostałych
      const prompt = generatePrompt({ style, elev, roof, floors: floorsValue, garage });
      
      console.log('\n========== PROMPT DLA DALL-E ==========');
      console.log('📤 Prompt:', prompt);
      console.log('=====================================\n');
      
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      });
      
      imageUrl = response.data[0].url;
    }
    
    console.log('✅ Obraz wygenerowany pomyślnie');

    // Obliczanie kosztu
    const costEstimate = calculateCost({ 
      style, area, floors: floorsValue, roof, elev, garage, 
      basement: basementValue, rental, accessibility 
    });
    console.log('💰 Szacunkowy koszt budowy:', costEstimate, 'NOK');

    return res.json({ 
      imageUrl, 
      costEstimate,
      engine: useStability || floorsValue === 'parterowy' ? 'stability' : 'dalle'
    });
    
  } catch (err) {
    console.error('❌ Błąd podczas generowania obrazu:', err);
    return res.status(500).json({ 
      error: 'Błąd generowania obrazu AI.', 
      details: err.message 
    });
  }
});

// Funkcja generatePrompt dla DALL-E (gdy używamy DALL-E)
function generatePrompt({ style, elev, roof, floors, garage }) {
  let floorsDescription = '';
  if (floors === 'parterowy') {
    floorsDescription = 'dom JEDNOKONDYGNACYJNY, parterowy (bez piętra)';
  } else if (floors === 'pietrowy') {
    floorsDescription = 'dom DWUKONDYGNACYJNY, z pełnym piętrem (parter + piętro)';
  } else if (floors === 'poddasze') {
    const dormer = (style === 'modern' || style === 'nowoczesny_minimalizm')
      ? 'prostokątna nowoczesna lukarna z płaskim dachem'
      : 'tradycyjna lukarna na dachu';
    floorsDescription = `dom z parterem i UŻYTKOWYM PODDASZEM (${dormer})`;
  }

  let garageDescription = '';
  if (garage === 'attached' || garage === 'single' || garage === 'double') {
    garageDescription = 'z wbudowanym garażem w bryle budynku';
  } else if (garage === 'detached') {
    garageDescription = 'z wolnostojącym garażem obok domu';
  } else if (garage === 'none' || garage === 'brak') {
    garageDescription = 'bez garażu';
  }

  let roofDescription = roofMap[roof] || '';

  return `Fotorealistyczna wizualizacja domu jednorodzinnego. Styl: ${styleMap[style]}. Typ: ${floorsDescription}. Dach: ${roofDescription}. Elewacja: ${elevMap[elev]}. ${garageDescription.charAt(0).toUpperCase() + garageDescription.slice(1)}. Otoczenie: zielony trawnik, drzewa w tle. Naturalne oświetlenie, widok z zewnątrz.`;
}

// Endpoint: Proxy obrazków
app.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Brak parametru URL w żądaniu.');
  }
  try {
    const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
    res.set('Content-Type', imageResponse.headers['content-type'] || 'image/png');
    res.send(imageResponse.data);
  } catch (err) {
    console.error('❌ Błąd podczas proxy obrazka:', err);
    res.status(500).send('Nie udało się pobrać obrazka z podanego URL.');
  }
});

// Debugowanie zmiennych środowiskowych
console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM ? 'załadowany' : 'BRAK!');
console.log('🔑 EMAIL_PASS:', process.env.EMAIL_PASS ? 'załadowany' : 'BRAK!');
console.log('🎨 STABILITY_API_KEY:', process.env.STABILITY_API_KEY ? 'załadowany' : 'BRAK!');

// Konfiguracja Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify()
  .then(() => console.log('✔ SMTP transporter poprawnie zweryfikowany.'))
  .catch(err => console.error('❌ Błąd weryfikacji SMTP:', err));

// Endpoint: Wysyłanie oferty
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