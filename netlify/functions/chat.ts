
export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userMessage, properties, chatHistory, language } = JSON.parse(event.body);
        
        // Priority: new unified key > old dedicated chat key
        const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_CHAT_KEY;
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key de Gemini. Configura GEMINI_API_KEY en Netlify.' }),
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

        // Fallback chain: newest → oldest
        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
        ];

        // Build history in Gemini format
        const geminiContents = [
            { role: 'user', parts: [{ text: systemInstructions }] },
            { role: 'model', parts: [{ text: 'Entendido. Estoy listo para asistir.' }] },
            ...(chatHistory || []).map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            })),
            { role: 'user', parts: [{ text: prompt }] }
        ];

        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Chat] Trying model: ${modelName}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: geminiContents,
                        generationConfig: { temperature: 0.9 }
                    })
                });

                clearTimeout(timeoutId);
                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const reply = data.candidates[0].content.parts[0].text.trim();

                    // Try to extract lead info heuristically for Supabase saving
                    const fullChat = (chatHistory || []).map((m: any) => m.text).join('\n') + '\n' + userMessage + '\n' + reply;
                    const nameLine = fullChat.match(/nombre[:\s]+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s[A-ZÁÉÍÓÚ][a-záéíóú]+)?)/i);
                    const phoneLine = fullChat.match(/(\+?\d[\d\s\-]{6,14}\d)/);
                    const emailLine = fullChat.match(/([\w._%+-]+@[\w.-]+\.[a-z]{2,})/i);

                    if (nameLine && phoneLine && emailLine && SUPABASE_URL && SUPABASE_KEY) {
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
                                    name: nameLine[1],
                                    phone: phoneLine[1],
                                    email: emailLine[1],
                                    intent: 'Captado vía Chat LaGuia',
                                    chat_summary: fullChat
                                })
                            });

                            if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                                const message = `🔔 *¡Nuevo Lead!*\n👤 ${nameLine[1]}\n📞 ${phoneLine[1]}\n📧 ${emailLine[1]}`;
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

                    console.log(`[Chat] Success with ${modelName}`);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reply }),
                    };
                } else {
                    const errMsg = data.error?.message || JSON.stringify(data).substring(0, 200);
                    if (errMsg.includes('not found') || errMsg.includes('not supported')) {
                        lastError += `[${modelName}]: Model not available. `;
                        continue;
                    }
                    lastError += `[${modelName}]: ${errMsg}. `;
                }
            } catch (err: any) {
                const isTimeout = err.name === 'AbortError';
                lastError += `[${modelName}]: ${isTimeout ? 'Timeout' : err.message}. `;
            }
        }

        // All models failed
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'No se pudo conectar con la IA después de intentar todos los modelos.', details: lastError }),
        };

    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
