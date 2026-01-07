
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

        const keyHint = `(Key: ...${API_KEY.slice(-4)})`;

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

        // Basado en el último error:
        // 1. v1 NO encuentra los modelos (da 404).
        // 2. gemini-2.0-flash tiene CUOTA 0 (bloqueado por Google para tu cuenta).
        // 3. Vamos a usar v1beta con los modelos 1.5 que son los más estables.
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro'
        ];

        let lastErrorDetails = "";

        for (const modelName of modelsToTry) {
            console.log(`Intentando ${modelName} en v1beta...`);
            // Forzamos v1beta para todos porque v1 está fallando en tu región/cuenta
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
                    // Si es un error de cuota o de llave filtrada, no seguimos intentando
                    if (data.error?.message?.toLowerCase().includes('quota') || data.error?.message?.toLowerCase().includes('leaked')) {
                        break;
                    }
                }
            } catch (err: any) {
                lastErrorDetails += `[${modelName}] red error: ${err.message}. `;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `Error de Google API ${keyHint}.`,
                details: lastErrorDetails,
                hint: 'Google dice que no tienes cuota (limit: 0). Esto ocurre a veces con cuentas nuevas de Google Cloud. Verifica en Google AI Studio si puedes chatear ahí directamente con el modelo 1.5 Flash.'
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
