import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

app.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    
    const generateResponse = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        //Buraya https://stablehorde.net sitesinden aldığınız apikey gelecek
        'apikey': 'APIKEYINIZ'
      },
      body: JSON.stringify({
        prompt: prompt,
        params: {
          steps: 30,
          width: 512,
          height: 512,
        },
        nsfw: false,
        censor_nsfw: true,
        trusted_workers: true,
      })
    });

    const { id } = await generateResponse.json();

    
    let imageUrl = null;
    for (let i = 0; i < 30; i++) {
      const checkResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`);
      const status = await checkResponse.json();
      
      if (status.done) {
        const resultResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`);
        const result = await resultResponse.json();
        imageUrl = result.generations[0].img;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!imageUrl) {
      throw new Error('Image generation timed out');
    }

    res.json({
      success: true,
      data: imageUrl
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({
      success: false,
      error: 'Image generation failed'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});