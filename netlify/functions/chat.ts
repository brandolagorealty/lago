
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

        // Intentamos con la API v1 directamente usando fetch para evitar problemas de la librería
        const MODEL = 'gemini-1.5-flash';
        const URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`;

        console.log(`Llamando a Google API v1 con modelo ${MODEL}...`);

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error de Google API:', data);

            // Si falla la v1, intentamos v1beta como plan B (también por fetch)
            const URL_BETA = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
            console.log("Reintentando con v1beta...");

            const retryResponse = await fetch(URL_BETA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const retryData = await retryResponse.json();

            if (!retryResponse.ok) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: 'Google rechazó la petición en v1 y v1beta.',
                        details: retryData.error?.message || 'Error desconocido'
                    }),
                };
            }

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply: retryData.candidates[0].content.parts[0].text }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: data.candidates[0].content.parts[0].text }),
        };

    } catch (error: any) {
        console.error('Error interno:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
        };
    }
};
