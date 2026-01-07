
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

        // Usamos los nombres exactos que salieron en TU lista de diagnóstico y que confirmaste que funcionan
        const modelsToTry = [
            'gemini-3-flash-preview',
            'gemini-flash-latest',
            'gemini-pro-latest',
            'gemini-2.0-flash-lite'
        ];

        let lastErrorDetails = "";

        for (const modelName of modelsToTry) {
            console.log(`Intentando ${modelName}...`);
            const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

            try {
                const response = await fetch(URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reply: data.candidates[0].content.parts[0].text }),
                    };
                } else {
                    lastErrorDetails += `[${modelName}]: ${data.error?.message || 'Error'}. `;
                    // Si es cuota excedida en este modelo, probamos el siguiente
                    if (data.error?.message?.toLowerCase().includes('quota')) {
                        continue;
                    }
                }
            } catch (err: any) {
                lastErrorDetails += `[${modelName}] error: ${err.message}. `;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "No se pudo conectar con ningún modelo de Gemini disponible.",
                details: lastErrorDetails,
                hint: 'Tu cuenta parece tener acceso a modelos experimentales (Gemini 3). Verifica que la llave en Netlify sea la correcta.'
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
