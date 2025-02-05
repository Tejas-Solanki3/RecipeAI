import { GoogleGenerativeAI } from '@google/generative-ai';

// Set a timeout for the API request
const TIMEOUT_DURATION = 50000; // 50 seconds

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        console.log('Received request:', req.body);
        
        const { dish } = req.body;
        if (!dish) {
            res.status(400).json({ error: 'Dish name is required' });
            return;
        }

        console.log('Generating recipe for:', dish);
        
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-pro',
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7
            }
        });

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_DURATION);
        });

        // Race between the API call and timeout
        const prompt = `Generate a recipe for ${dish}. Format it exactly as follows:

Ingredients:
- ingredient 1 with measurement
- ingredient 2 with measurement
(list all ingredients with measurements)

Instructions:
1. First step
2. Second step
(number all steps)

Hinglish Instructions:
1. First step in Hinglish
2. Second step in Hinglish
(number all steps)

Keep each section clearly labeled and formatted as shown above.`;

        const result = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
        ]);

        const response = await result.response;
        const recipe = response.text();

        console.log('Generated recipe successfully');
        res.status(200).json({ recipe });
    } catch (error) {
        console.error('Recipe generation error:', error);
        const errorMessage = error.message === 'Request timeout' 
            ? 'Recipe generation took too long. Please try again.'
            : 'Failed to generate recipe';
        res.status(error.message === 'Request timeout' ? 504 : 500)
            .json({ error: errorMessage });
    }
}