// server/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// --- OpenAI config ---
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// --- 1) Generacja zestawu szkiców (4 obrazy) ---
app.post('/api/generate-image', async (req, res) => {
  const { style, area, floors } = req.body;
  if (!style || !area || !floors) {
    return res.status(400).json({ error: 'Brakuje parametrów style, area lub floors' });
  }

  const styleMap  = { modern:'nowoczesny, minimalistyczny', classic:'klasyczny, z dachem dwuspadowym', bungalow:'parterowy komfortowy', custom:'indywidualny, niestandardowy' };
  const floorsMap = { parterowy:'na jednym poziomie', poddasze:'z użytkowym poddaszem', pietrowy:'dwukondygnacyjny' };

  const prompt = `Szkic architektoniczny domu w stylu ${styleMap[style]||style}, o powierzchni ${area} m², ${floorsMap[floors]||floors}. Prosty czarny kontur na białym tle.`;

  try {
    const response = await openai.createImage({
      prompt,
      n: 4,
      size: '512x512',
    });
    const images = response.data.data.map(img => img.url);
    return res.json({ images });
  } catch (err) {
    console.error('[generate-image] Error:', err);
    return res.status(err.status || 500).json({
      error: err.message,
      type: err.type,
      code: err.code,
    });
  }
});

// --- 2) Generacja finalnej wizualizacji + kosztorys ---
app.post('/api/generate-visualization', async (req, res) => {
  try {
    const { style, area, floors, roof, elev } = req.body;
    if (!style||!area||!floors||!roof||!elev) {
      return res.status(400).json({ error: 'Brakuje parametrów konfiguracji' });
    }

    // — TU możesz wstawić openai.createImage z innym promptem —
    // na razie zwracamy placeholder:
    const imageUrl = `https://via.placeholder.com/512x512.png?text=${style}+${floors}+${roof}+${elev}`;

    // Prosty kalkulator kosztu:
    const baseRate   = 2000;         // zł/m²
    const floorFact  = floors==='pietrowy'?1.2:(floors==='poddasze'?1.1:1.0);
    const roofFact   = roof==='tiles'?1.15:1.05;
    const elevFact   = elev==='wood'?1.10:1.00;
    const costEstimate = Math.round(area * baseRate * floorFact * roofFact * elevFact);

    return res.json({ imageUrl, costEstimate });
  } catch (err) {
    console.error('[generate-visualization] Error:', err);
    return res.status(500).json({ error: 'Błąd serwera przy generacji wizualizacji' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
