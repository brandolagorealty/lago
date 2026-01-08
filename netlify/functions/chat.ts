
export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userMessage, properties, chatHistory, language } = JSON.parse(event.body);
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
            `- [${p.title}] (${p.type}): $${p.price}, ${p.beds} ${p.beds === 1 ? 'bed' : 'beds'}, ${p.baths} ${p.baths === 1 ? 'bath' : 'baths'} in ${p.location}. Link: ${baseUrl}/property/${p.id}`
        ).join('\n');

        const systemInstructions = `
      You are "LaGuia", the expert virtual assistant from Lago Realty. 
      Your mission is to capture leads in a direct, elegant, and persuasive way.

      LANGUAGE RULE:
      - ALWAYS respond in the SAME LANGUAGE the user is using (e.g., if they write in English, respond in English; if in Spanish, respond in Spanish).

      RESPONSE STYLE:
      - CONCISE: Get to the point. Maximum 2 or 3 sentences. No unnecessary verbosity.
      - VISUAL: Use **bold** to highlight the data you are requesting.

      CONVERSATION FLOW (Only one question at a time):
      1. GREETING: Only in the first message. Then, go straight to the value.
      2. PERSUASION (AIDA): Connect desire with short benefits.
      3. PROGRESSIVE CAPTURE:
         - If you don't know their name: Respond and ask "What is your **name**?".
         - If intention is missing: "Are you looking to **buy** or **rent**?".
         - To close: "Give me your **phone number** and **email** so an agent can advise you today".
      
      CRITICAL RULES:
      - Use GENDER NEUTRAL language.
      - Don't repeat questions if you already have the data.
      - Use the property information provided below to answer questions about availability.

      If you detect the user has already provided their Name, Phone, and Email, enthusiastically confirm that an agent will contact them.
    `;

        const prompt = `
      USER PREFERRED LANGUAGE: ${language === 'en' ? 'English' : 'Spanish'}

      AVAILABLE PROPERTIES:
      ${propertyContext || 'No properties available at the moment.'}

      CHAT HISTORY:
      ${(chatHistory || []).map((m: any) => `${m.role === 'user' ? 'User' : 'LaGuia'}: ${m.text}`).join('\n')}
      
      CURRENT USER MESSAGE: "${userMessage}"
      
      REPLY AS LAGUIA:
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
