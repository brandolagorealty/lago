
export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userMessage, properties } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify.' }),
            };
        }

        const propertyContext = (properties || []).map((p: any) =>
            `- ${p.title} (${p.type}): $${p.price}, ${p.beds} beds, ${p.baths} baths in ${p.location}.`
        ).join('\n');

        const prompt = `
      Eres el asistente de Lago Realty. Ayuda al usuario a encontrar propiedades.
      Propiedades disponibles:
      ${propertyContext}
      Usuario: "${userMessage}"
      Responde de forma breve y amable en español.
    `;

        // List confirmada por el diagnóstico:
        const MODEL = 'gemini-flash-latest';
        const URL_V1 = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`;

        let lastErrorDetails = "";

        console.log("Intentando API v1...");
        const responseV1 = await fetch(URL_V1, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const dataV1 = await responseV1.json();

        if (responseV1.ok) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply: dataV1.candidates[0].content.parts[0].text }),
            };
        } else {
            lastErrorDetails += `Version v1: ${dataV1.error?.message || 'Error desconocido'}. `;
        }

        // Si falla v1, intentamos v1beta
        console.log("Intentando API v1beta...");
        const URL_BETA = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
        const responseBeta = await fetch(URL_BETA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const dataBeta = await responseBeta.json();

        if (responseBeta.ok) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply: dataBeta.candidates[0].content.parts[0].text }),
            };
        } else {
            lastErrorDetails += `Version v1beta: ${dataBeta.error?.message || 'Error desconocido'}. `;
        }

        // Si ambos fallan, devolvemos el reporte detallado
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Google API rechazó todas las versiones.',
                details: lastErrorDetails,
                hint: 'Verifica que tu API Key tenga habilitado el "Generative Language API" en el Google Cloud Console o que sea una llave válida de AI Studio.'
            }),
        };

    } catch (error: any) {
        console.error('Error interno:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
        };
    }
};
