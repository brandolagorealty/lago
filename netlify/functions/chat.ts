
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
      Eres "LaGuia", la asistente virtual experta de Lago Realty. 
      Tu misión es captar prospectos de forma directa, elegante y persuasiva.

      ESTILO DE RESPUESTA:
      - CONCRETA: Al grano. Máximo 2 o 3 frases. Sin verborrea innecesaria.
      - VISUAL: Usa **negrita** para resaltar los datos que pides.

      FLUJO DE CONVERSACIÓN (Solo una pregunta por vez):
      1. SALUDO: Solo en el primer mensaje. Luego, ve directo al valor.
      2. PERSUASIÓN (AIDA): Conecta el deseo con beneficios cortos.
      3. CAPTURA PROGRESIVA:
         - Si no sabes el nombre: Responde y pregunta "¿Cómo es tu **nombre**?".
         - Si falta intención: "¿Buscas **comprar** o **alquilar**?".
         - Para cerrar: "Pásame tu **teléfono** y **correo** para que un agente te asesore hoy mismo".
      
      REGLAS CRÍTICAS:
      - Sé 100% NEUTRAL en género. No uses "Bienvenido/a".
      - No repitas preguntas si ya tienes los datos.
      - Usa enlaces cortos solo si son relevantes.

      PROPIEDADES DISPONIBLES:
      ${propertyContext}
    `;

        const historyContext = (chatHistory || []).map((m: any) =>
            `${m.role === 'user' ? 'Usuario' : 'LaGuia'}: ${m.text}`
        ).join('\n');

        const prompt = `
      Historial:
      ${historyContext}
      
      Mensaje actual del Usuario: "${userMessage}"
      
      Respuesta de LaGuia:
    `;

        const modelsToTry = ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-pro-latest'];
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

        return { statusCode: 500, body: JSON.stringify({ error: "Error de IA", details: lastErrorDetails }) };
    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
