import { GoogleGenerativeAI } from '@google/generative-ai';

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
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `Generate a detailed recipe for ${dish}. Include the following sections:
            1. Ingredients (with measurements)
            2. Step-by-step instructions
            3. Hinglish instructions (Hindi-English mix language instructions)
            
            Format each section clearly with headers. Number the steps in instructions and Hinglish sections.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const recipe = response.text();

        console.log('Generated recipe successfully');
        res.status(200).json({ recipe });
    } catch (error) {
        console.error('Recipe generation error:', error);
        res.status(500).json({ error: 'Failed to generate recipe' });
    }
}