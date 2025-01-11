require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize APIs
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Configure middleware - order is important
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());  // for parsing application/json
app.use(express.urlencoded({ extended: true }));  // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Add root route handler
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

async function generateImage(dish) {
    try {
        console.log('Starting image generation for:', dish);
        console.log('Stability API Key present:', !!process.env.STABILITY_API_KEY);
        
        const response = await axios({
            method: 'post',
            url: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
            },
            data: {
                text_prompts: [
                    {
                        text: `A professional food photography shot of ${dish}, high-quality, appetizing presentation, restaurant-style plating, soft natural lighting, vibrant colors, garnished beautifully, 4k, detailed, food magazine quality`,
                        weight: 1
                    }
                ],
                cfg_scale: 7,
                height: 768,
                width: 768,
                samples: 1,
                steps: 50,
            }
        });

        console.log('Image API Response Status:', response.status);
        console.log('Response has data:', !!response.data);
        console.log('Response has artifacts:', !!(response.data && response.data.artifacts));
        console.log('Number of artifacts:', response.data?.artifacts?.length || 0);

        if (response.data && response.data.artifacts && response.data.artifacts.length > 0) {
            const base64Image = response.data.artifacts[0].base64;
            console.log('Successfully generated image');
            return `data:image/png;base64,${base64Image}`;
        }
        
        console.log('No image data in response:', response.data);
        return null;
    } catch (error) {
        console.error('Image generation error details:');
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
        console.error('Full error:', error);
        return null;
    }
}

app.post('/api/generate-recipe', async (req, res) => {
    try {
        const { dish } = req.body;
        console.log('Received request for dish:', dish);

        if (!dish) {
            throw new Error('Please specify a dish to cook');
        }

        const prompt = `Create an authentic recipe for "${dish}". 
Format the response exactly as follows:

Ingredients:
- First ingredient with quantity
- Second ingredient with quantity
[Continue with all ingredients]

Instructions:
1. First step in clear, concise English
2. Second step in clear, concise English
[Continue with all steps]

Hinglish Instructions:
1. First step in conversational Hinglish
2. Second step in conversational Hinglish
[Continue with all steps]

Important notes:
- Keep steps clear and numbered
- Use precise measurements
- Include cooking times and temperatures
- Mention specific techniques
- Add serving suggestions`;

        // Generate recipe and image in parallel
        console.log('Generating recipe and image...');
        const [recipeResult, imageUrl] = await Promise.all([
            genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent(prompt),
            generateImage(dish)
        ]);

        if (!recipeResult.response) {
            throw new Error('Failed to generate recipe content');
        }

        const recipe = recipeResult.response.text();
        console.log('Recipe generated successfully');
        
        if (!recipe) {
            throw new Error('Generated recipe is empty');
        }

        res.json({ 
            recipe,
            image: imageUrl
        });

    } catch (error) {
        console.error('Server Error:', error);
        
        let errorMessage = 'Failed to generate recipe';
        if (error.message.includes('API key')) {
            errorMessage = 'Invalid API key';
        } else if (error.message.includes('quota')) {
            errorMessage = 'API quota exceeded';
        } else if (error.message.includes('blocked')) {
            errorMessage = 'Content blocked by safety settings';
        } else if (error.message.includes('empty')) {
            errorMessage = 'Unable to generate recipe at this time';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message 
        });
    }
});

// Update recipe based on available equipment
app.post('/api/update-recipe', async (req, res) => {
    // Temporarily disable premium check for testing
    // if (!req.session?.user?.isPremium) {
    //     return res.status(403).json({ error: 'Premium feature' });
    // }

    try {
        const { recipe, equipment } = req.body;
        
        const prompt = `Given this recipe: "${recipe}", 
        and these available kitchen equipment: ${equipment.join(', ')},
        please modify ONLY the recipe instructions to use only the available equipment.
        If any step requires unavailable equipment, provide alternative methods using the available equipment.
        Keep the instructions clear and numbered.
        Focus on practical alternatives that maintain the recipe's quality.
        Format the response as a numbered list without any additional text.`;

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const updatedInstructions = result.response.text();
        
        res.json({ instructions: updatedInstructions });
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'An unexpected error occurred',
        details: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Using Google API Key:', process.env.GOOGLE_API_KEY ? 'Present' : 'Missing');
});
