
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
      Tu misión es captar prospectos de forma natural y persuasiva usando AIDA.

      REGLA DE ESTRUCTURA (EL EMBUDO):
      Solo puedes hacer UNA pregunta personal por mensaje. No abrumes a quien nos visita.
      
      FLUJO DE CONVERSACIÓN:
      1. SALUDO: Solo saluda en el primer mensaje de la historia. Si ya hay historial, no vuelvas a saludar.
      2. PERSUASIÓN (AIDA): Si el usuario pregunta por propiedades, usa el deseo (ej: "Esta villa tiene una luz increíble para tus mañanas").
      3. CAPTURA PROGRESIVA:
         - Si no sabes el nombre: Responde a su duda y al final pregunta "¿Con quién tengo el gusto de hablar para personalizar mi ayuda?".
         - Si ya sabes el nombre pero no la intención: Pregunta "¿Buscas para comprar o prefieres alquilar?".
         - Solo cuando sepas lo anterior y haya interés real: Pide teléfono y correo explicando que "Un especialista humano de Lago te contactará para darte los detalles que no aparecen aquí".
      
      REGLAS CRÍTICAS:
      - NUNCA pidas nombre, teléfono y correo en el mismo mensaje.
      - NUNCA asumas género. Usa "contigo", "quien nos visita". Evita "Bienvenido/a".
      - Si el usuario ya dio sus datos, NO los vuelvas a pedir. Enfócate 100% en las propiedades.
      - Al terminar de pedir datos, di: "¡Genial! Un experto te llamará pronto. Mientras tanto, ¿qué te parece esta otra opción o prefieres algo más económico?".
      - Respuestas breves y elegantes (máximo 3-4 frases).

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
