
export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userMessage, properties, chatHistory } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_API_KEY;
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify.' }),
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

      Si detectas que el usuario ya dio su Nombre, Teléfono y Correo, confirma con entusiasmo que un agente le contactará.
    `;

        const prompt = `
      Historial:
      ${(chatHistory || []).map((m: any) => `${m.role === 'user' ? 'Usuario' : 'LaGuia'}: ${m.text}`).join('\n')}
      
      Mensaje actual del Usuario: "${userMessage}"
      
      Respuesta de LaGuia:
    `;

        const modelsToTry = [
            'gemini-3-flash-preview',
            'gemini-flash-latest',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash'
        ];

        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                const response = await fetch(URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: systemInstructions }] },
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            response_mime_type: "application/json",
                            response_schema: {
                                type: "object",
                                properties: {
                                    reply: { type: "string" },
                                    leadInfo: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            phone: { type: "string" },
                                            email: { type: "string" },
                                            intent: { type: "string" }
                                        }
                                    }
                                },
                                required: ["reply"]
                            }
                        }
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const result = JSON.parse(data.candidates[0].content.parts[0].text);
                    const { reply, leadInfo } = result;

                    // Intento de guardar Lead (solo si están los 3 datos principales)
                    if (leadInfo?.name && leadInfo?.phone && leadInfo?.email && SUPABASE_URL && SUPABASE_KEY) {
                        try {
                            await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': SUPABASE_KEY,
                                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                                    'Prefer': 'return=minimal'
                                },
                                body: JSON.stringify({
                                    name: leadInfo.name,
                                    phone: leadInfo.phone,
                                    email: leadInfo.email,
                                    intent: leadInfo.intent || 'No especificado',
                                    chat_summary: (chatHistory || []).map((m: any) => m.text).join('\n')
                                })
                            });

                            if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                                const message = `🔔 *¡Nuevo Lead Capturado!*\n\n👤 *Nombre:* ${leadInfo.name}\n📞 *Teléfono:* ${leadInfo.phone}\n📧 *Email:* ${leadInfo.email}\n🏠 *Intención:* ${leadInfo.intent || 'Desconocida'}\n\n✨ *LaGuia* lo ha logrado.`;
                                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' })
                                });
                            }
                        } catch (leadError) {
                            console.error('Error guardando lead:', leadError);
                        }
                    }

                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reply }),
                    };
                } else {
                    lastError += `[${modelName}]: ${data.error?.message || 'Error desconocido'}. `;
                }
            } catch (err: any) {
                lastError += `[${modelName}]: ${err.message}. `;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error en LaGuia", details: lastError }),
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
