
import { GoogleGenerativeAI } from '@google/generative-ai';

export const handler = async (event: any) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const { userMessage, properties } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Gemini API Key not configured on server.' }),
            };
        }

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const propertyContext = properties.map((p: any) =>
            `- ${p.title} (${p.type}): $${p.price}, ${p.beds} beds, ${p.baths} baths in ${p.location}. ${p.description}`
        ).join('\n');

        const prompt = `
      You are the AI assistant for Lago Realty, a premium real estate agency in Zulia, Venezuela.
      
      Your Role:
      - Act as a knowledgeable, professional, and friendly real estate agent.
      - Help users find properties from the list provided below.
      - Answer questions about the real estate market in Zulia (Maracaibo, Cabimas, Ciudad Ojeda, etc.).
      - If the user asks about a specific location not in the list (like Miami or Caracas), politely explain you only specialize in Zulia.
      
      Context - Available Properties:
      ${propertyContext}
      
      Context - Company Info:
      - Name: Lago Realty
      - Focus: Luxury and commercial real estate in Zulia, Venezuela.
      - Mission: Redefining real estate experience through integrity.
      
      User Message: "${userMessage}"
      
      Response Guidelines:
      - Keep responses concise (under 3 sentences unless asked for details).
      - If the user speaks Spanish, reply in Spanish. If English, reply in English.
      - Always recommend specific properties from the list if they match the user's criteria.
      - Be helpful and encouraging.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: response.text() }),
        };
    } catch (error: any) {
        console.error('Netlify Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate AI response' }),
        };
    }
};
