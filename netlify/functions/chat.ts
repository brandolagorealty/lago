
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

        // Pista segura para que el usuario verifique si Netlify tomó la llave nueva
        const keyHint = `(Termina en: ...${API_KEY.slice(-4)})`;

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

        // Intentamos los modelos que vimos en TU lista de diagnóstico
        const modelsToTry = [
            { name: 'gemini-2.0-flash', version: 'v1beta' },
            { name: 'gemini-flash-latest', version: 'v1' },
            { name: 'gemini-pro-latest', version: 'v1' }
        ];

        let lastErrorDetails = "";

        for (const m of modelsToTry) {
            console.log(`Intentando ${m.name} en ${m.version}...`);
            const URL = `https://generativelanguage.googleapis.com/${m.version}/models/${m.name}:generateContent?key=${API_KEY}`;

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
                    lastErrorDetails += `[${m.name} ${m.version}]: ${data.error?.message || 'Error'}. `;
                    // Si el error dice "leaked", rompemos el ciclo porque la llave está muerta
                    if (data.error?.message?.toLowerCase().includes('leaked')) {
                        break;
                    }
                }
            } catch (err: any) {
                lastErrorDetails += `[${m.name}] Error de red: ${err.message}. `;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `Error de configuración en Google API. ${keyHint}`,
                details: lastErrorDetails,
                hint: 'Si ves el mensaje "leaked", es que Netlify aún está usando tu llave vieja. Asegúrate de haber guardado la nueva y haber hecho un "Clear cache and deploy site".'
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
