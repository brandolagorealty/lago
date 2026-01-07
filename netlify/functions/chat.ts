
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

        // Construimos un contexto mucho más rico para la IA
        const baseUrl = 'https://lagorealty.com.ve';
        const propertyContext = (properties || []).map((p: any) =>
            `- [${p.title}] (${p.type}): $${p.price}, ${p.beds} hab, ${p.baths} baños en ${p.location}. Enlace: ${baseUrl}/property/${p.id}`
        ).join('\n');

        const systemInstructions = `
      Eres el Asistente Premium de Lago Realty, una inmobiliaria de élite en Zulia, Venezuela.
      Tu objetivo es ser un vendedor experto y servicial.
      
      REGLAS DE ORO:
      1. Si el usuario busca algo, muestra el enlace directo usando el formato: [Nombre de Propiedad](${baseUrl}/property/[id]).
      2. Siempre pregunta si el usuario prefiere COMPRAR o ALQUILAR si no lo ha especificado.
      3. Si el usuario muestra interés real, ofrécele agendar una cita o visita guiada.
      4. Mantén un tono profesional, elegante y cercano.
      5. Responde brevemente (máximo 4 frases).
      6. Solo usa la información de las propiedades proporcionadas abajo. 
      7. Si no hay una propiedad que encaje exactamente, ofrece la más parecida y menciona que puedes buscar más opciones.

      PROPIEDADES DISPONIBLES:
      ${propertyContext}
    `;

        const prompt = `
      Usuario dice: "${userMessage}"
    `;

        // Modelos confirmados para tu cuenta
        const modelsToTry = [
            'gemini-3-flash-preview',
            'gemini-flash-latest',
            'gemini-pro-latest'
        ];

        let lastErrorDetails = "";

        for (const modelName of modelsToTry) {
            const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

            try {
                const response = await fetch(URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: systemInstructions }]
                        },
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
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
                }
            } catch (err: any) {
                lastErrorDetails += `[${modelName}] error: ${err.message}. `;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Error al procesar la inteligencia del chat.",
                details: lastErrorDetails
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
