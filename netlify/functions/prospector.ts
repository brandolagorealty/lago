import * as cheerio from 'cheerio';

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { query, operacion } = JSON.parse(event.body || '{}');

        if (!query) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Consulta vacía.' }) };
        }
        
        // Priority: new unified key > old dedicated prospector key
        const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_PROSPECTOR_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key de Gemini. Configura GEMINI_API_KEY en Netlify.' }),
            };
        }

        // 1. Serper.dev Google Search API
        let searchContext = "";
        try {
            const SERPER_API_KEY = process.env.SERPER_API_KEY || 'd4829eebc87e8548cacf6ba8029329d5df695ffc';
            const searchQuery = query + ' Zulia Venezuela';
            
            const res = await fetch("https://google.serper.dev/search", {
                method: 'POST',
                headers: {
                    'X-API-KEY': SERPER_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: searchQuery,
                    gl: 've', // Venezuela
                    hl: 'es', // Español
                    tbs: 'qdr:w', // Última semana (garantiza frescura)
                    num: 10 // Get top 10 results
                })
            });
            
            const data = await res.json();
            const results: string[] = [];
            
            if (data.organic && Array.isArray(data.organic)) {
                data.organic.slice(0, 8).forEach((item: any) => {
                    if (item.title && item.snippet) {
                        results.push(`TÍTULO: ${item.title}\nURL: ${item.link || ''}\nDESCRIPCIÓN: ${item.snippet}`);
                    }
                });
            }

            if (results.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'No se encontraron resultados en la web para esta consulta.' }),
                };
            }

            searchContext = results.join('\n\n---\n\n');
        } catch (err: any) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error extrayendo datos de internet', details: err.message }),
            };
        }

        // 2. AI Analysis with model fallback
        const systemInstructions = `
Actúa como un experto analista inmobiliario cazador de propiedades.
A continuación recibirás una lista de resultados extraídos de la web (títulos, descripciones cortas y URLs).
Determina cuáles son publicaciones reales valiosas (preferiblemente trato directo) basándonos en tu análisis.

REGLA ESTRICTA 1: DESCARTA Y ELIMINA CUALQUIER PROPIEDAD QUE NO ESTÉ EN MARACAIBO O EL ESTADO ZULIA (VENEZUELA). Si el texto menciona otros países (ej. Chile, México) o ciudades fuera del Zulia, ignóralo por completo.
REGLA ESTRICTA 2: EL USUARIO ESTÁ BUSCANDO EXCLUSIVAMENTE PROPIEDADES EN **${operacion ? operacion.toUpperCase() : 'VENTA O ALQUILER'}**. Si la publicación evidentemente es de la operación contraria (por ejemplo, buscas Alquiler y dice "Se Vende"), DESCÁRTALA POR COMPLETO Y NO LA INCLUYAS EN EL JSON.
REGLA ESTRICTA 3: SI EL TEXTO MENCIONA A "ANGEL PINTON", "RED90", "REMAX", "CENTURY21", "RENTAHOUSE", "KELLER WILLIAMS", "INMOBILIARIA", "AGENTE INMOBILIARIO", "CORREDOR", "HONORARIOS", "CLIENTES", O SIMILARES, EL CAMPO "isAgent" **TIENE QUE SER TRUE OBLIGATORIAMENTE**. NO LO MARQUES COMO DUEÑO DIRECTO.

ESTRUCTURA JSON REQUERIDA DE SALIDA (DEVUELVE UN ARRAY):
[
  {
    "title": "Un título corto del inmueble extraído de la descripción",
    "price": "Precio inferido o 'No publicado'",
    "url": "Extrae la URL exacta proporcionada en el bloque",
    "isAgent": true o false,
    "operacion": "'Venta' o 'Alquiler' inferido",
    "reasoning": "Breve razón de por qué es dueño o agencia."
  }
]
NO DEVUELVAS NADA MÁS QUE EL ARRAY JSON (MÁXIMO LOS 5 MEJORES, DESCARTA LA BASURA O ENLACES CAÍDOS).
`;

        const prompt = `TEXTOS EXTRAÍDOS DE LA WEB PARA LA BÚSQUEDA "${query}":\n\n${searchContext}`;

        // Fallback chain: newest → oldest
        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
        ];

        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Prospector] Trying model: ${modelName}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: systemInstructions + '\n\n' + prompt }] }
                        ],
                        generationConfig: {
                            temperature: 0.4,
                            responseMimeType: 'application/json'
                        }
                    })
                });

                clearTimeout(timeoutId);
                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const responseText = data.candidates[0].content.parts[0].text;
                    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        console.log(`[Prospector] Success with ${modelName}`);
                        return {
                            statusCode: 200,
                            headers: { 'Content-Type': 'application/json' },
                            body: jsonMatch[0],
                        };
                    } else {
                        lastError += `[${modelName}]: Invalid JSON response. `;
                    }
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
