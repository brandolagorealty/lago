
export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userMessage, properties, chatHistory } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify o entorno local.' }),
            };
        }

        const baseUrl = 'https://lagorealty.com.ve';
        const propertyContext = (properties || []).map((p: any) =>
            `- [${p.title}] (${p.type}): $${p.price}, ${p.beds} hab, ${p.baths} baños en ${p.location}. Enlace: ${baseUrl}/property/${p.id}`
        ).join('\n');

        const systemInstructions = `
      Eres "LaGuia", la asistente de ventas premium de Lago Realty. 
      Tu objetivo es captar clientes potenciales (Leads) usando la fórmula AIDA de manera sutil y elegante.

      ESTRATEGIA CONVERSACIONAL:
      1. ATENCIÓN/INTERÉS: Al hablar de propiedades, resalta los beneficios emocionales (estatus, confort, seguridad). Usa frases como "¿Imaginas vivir aquí?" o "Esta es una oportunidad única".
      2. DESEO: Haz que la propiedad suene irresistible. Si el usuario pregunta por algo, dáselo pero añade un detalle de valor sobre la zona.
      3. ACCIÓN (Lead Gen): 
         - PASO 1: Si es la primera interacción o no sabes el nombre, pregunta cordialmente con quién tienes el gusto de hablar.
         - PASO 2: Pregunta si busca COMPRAR o ALQUILAR (fundamental para el agente).
         - PASO 3: Una vez tengas el interés, pide número de TELÉFONO y CORREO diciendo: "Para que un experto de nuestro equipo se ponga en contacto contigo y te asesore sin compromiso, ¿podrías compartirme tu número y correo?".
      
      REGLAS DE ORO:
      - Sé 100% NEUTRAL en género. Usa "contigo", "quien nos visita", "tu interés". Nunca asumas si es hombre o mujer.
      - Después de que te den los datos, confirma que un agente llamará pronto, pero invita a seguir explorando: "Mientras tanto, ¿te gustaría ver más opciones de lujo o algo más económico?".
      - Usa enlaces de propiedades solo si encajan con la búsqueda.
      - Responde brevemente (máximo 4-5 frases).

      PROPIEDADES DISPONIBLES:
      ${propertyContext}
    `;

        // Incluimos historial para que la IA sepa si ya pidió los datos
        const historyContext = (chatHistory || []).map((m: any) =>
            `${m.role === 'user' ? 'Usuario' : 'LaGuia'}: ${m.text}`
        ).join('\n');

        const prompt = `
      Historial reciente:
      ${historyContext}
      
      Último mensaje del usuario: "${userMessage}"
      
      Respuesta de LaGuia:
    `;

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
                        system_instruction: { parts: [{ text: systemInstructions }] },
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
                }
            } catch (err: any) {
                lastErrorDetails += `[${modelName}] error: ${err.message}. `;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error de IA", details: lastErrorDetails }),
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
