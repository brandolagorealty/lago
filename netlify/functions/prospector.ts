import * as cheerio from 'cheerio';

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { query } = JSON.parse(event.body);

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

        // 1. Scraping Manual DuckDuckGo
        let searchContext = "";
        try {
            const searchQuery = encodeURIComponent(query + ' (inmobilia OR conlallave OR encuentra24 OR mercadolibre Zulia)');
            const url = `https://html.duckduckgo.com/html/?q=${searchQuery}&df=m`;
            const res = await fetch(url, { 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' 
                } 
            });
            const html = await res.text();
            
            const $ = cheerio.load(html);
            const results: string[] = [];
            
            $('.result').slice(0, 8).each((_, el) => {
                const title = $(el).find('.result__title').text().trim();
                const link = $(el).find('.result__url').attr('href') || '';
                const snippet = $(el).find('.result__snippet').text().trim();
                
                if (title && snippet) {
                    results.push(`TÍTULO: ${title}\nURL: ${link}\nDESCRIPCIÓN: ${snippet}`);
                }
            });

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

REGLA ESTRICTA: DESCARTA Y ELIMINA CUALQUIER PROPIEDAD QUE NO ESTÉ EN MARACAIBO O EL ESTADO ZULIA (VENEZUELA). Si el texto menciona otros países (ej. Chile, México) o ciudades fuera del Zulia, ignóralo por completo.

ESTRUCTURA JSON REQUERIDA DE SALIDA (DEVUELVE UN ARRAY):
[
  {
    "title": "Un título corto del inmueble extraído de la descripción",
    "price": "Precio inferido o 'No publicado'",
    "url": "Extrae la URL exacta proporcionada en el bloque",
    "isAgent": true o false,
    "operacion": "'Venta' o 'Alquiler' inferido",
    "reasoning": "Por qué crees, según la descripción, que es dueño (isAgent=false) o agencia/asesor (isAgent=true). Palabras clave asesor: rentahouse, remax, century21, honorarios, somos agencia."
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
