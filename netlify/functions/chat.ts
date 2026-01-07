
import { GoogleGenerativeAI } from '@google/generative-ai';

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing body' }),
            };
        }

        const { userMessage, properties } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API Key not configured on Netlify environment variables.' }),
            };
        }

        const genAI = new GoogleGenerativeAI(API_KEY);

        // Comprehensive fallback strategy for model names
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-pro',
            'gemini-1.0-pro'
        ];

        let lastError = null;
        let finalReply = null;
        let fallbackLog = [];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });

                const propertyContext = (properties || []).map((p: any) =>
                    `- ${p.title} (${p.type}): $${p.price}, ${p.beds} beds, ${p.baths} baths in ${p.location}. ${p.description}`
                ).join('\n');

                const prompt = `
          You are the AI assistant for Lago Realty, a real estate agency in Zulia, Venezuela.
          Context - Available Properties:
          ${propertyContext}
          User Message: "${userMessage}"
          Reply in the user's language. Keep it under 3 sentences.
        `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                finalReply = response.text();

                if (finalReply) {
                    console.log(`Success using model: ${modelName}`);
                    break;
                }
            } catch (err: any) {
                console.error(`Attempt with ${modelName} failed:`, err.message);
                fallbackLog.push(`${modelName}: ${err.message}`);
                lastError = err;
            }
        }

        if (!finalReply) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Todos los modelos de Google (Flash, Pro) fallaron.',
                    details: lastError?.message || 'Error desconocido',
                    log: fallbackLog
                }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: finalReply }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
        };
    }
};
