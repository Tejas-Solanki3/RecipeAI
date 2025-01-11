import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { dish } = req.body;
        if (!dish) {
            return res.status(400).json({ message: 'Dish name is required' });
        }

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

        res.status(200).json({ recipe });
    } catch (error) {
        console.error('Recipe generation error:', error);
        res.status(500).json({ message: 'Error generating recipe', error: error.message });
    }
}