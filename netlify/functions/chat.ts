
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
                body: JSON.stringify({ error: 'API Key not configured on Netlify.' }),
            };
        }

        // Force v1 API and a very specific model name
        const genAI = new GoogleGenerativeAI(API_KEY);

        // We try to use the most stable model name and API version
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ];

        let lastError = null;
        let finalReply = null;

        for (const modelName of modelsToTry) {
            try {
                // Explicitly set apiVersion to 'v1' instead of 'v1beta'
                const model = genAI.getGenerativeModel(
                    { model: modelName },
                    { apiVersion: 'v1' }
                );

                const propertyContext = (properties || []).map((p: any) =>
                    `- ${p.title} (${p.type}): $${p.price}, ${p.beds} beds, ${p.baths} baths in ${p.location}.`
                ).join('\n');

                const prompt = `
          Lago Realty Assistant.
          Properties:
          ${propertyContext}
          User: "${userMessage}"
          Reply concisely in user's language.
        `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                finalReply = response.text();

                if (finalReply) {
                    console.log(`Success with model: ${modelName} on v1 API`);
                    break;
                }
            } catch (err: any) {
                console.error(`Model ${modelName} (v1) failed:`, err.message);
                lastError = err;
            }
        }

        // If v1 fails, try v1beta as a last resort (the default)
        if (!finalReply) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent("Hola");
                const response = await result.response;
                finalReply = response.text();
            } catch (err: any) {
                lastError = err;
            }
        }

        if (!finalReply) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Critical: Gemini API rejected all models and versions.',
                    details: lastError?.message || 'Check API Key permissions at AI Studio.',
                    hint: 'Verify that the API Key is from "Google AI Studio" and has "Generative Language API" enabled.'
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
            body: JSON.stringify({ error: 'Server error', details: error.message }),
        };
    }
};
