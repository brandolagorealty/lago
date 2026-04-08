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
        
        // Usamos la llave de OpenRouter prioritariamente
        const API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || process.env.VITE_GEMINI_SCRAPER_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify.' }),
            };
        }

        // 1. Scraping Manual DuckDuckGo (Bypassing API Tool Errors)
        let searchContext = "";
        try {
            // Buscamos forzando a resultados inmobilliarios para Maracaibo/Zulia
            const searchQuery = encodeURIComponent(query + ' (inmobilia OR conlallave OR encuentra24 OR mercadolibre Zulia)');
            const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
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

        // 2. Inteligencia Artificial (Análisis del contexto en texto plano, sin tools)
        const systemInstructions = `
Actúa como un experto analista inmobiliario cazador de propiedades.
A continuación recibirás una lista de resultados extraídos de la web (títulos, descripciones cortas y URLs).
Determina cuáles son publicaciones reales valiosas (preferiblemente trato directo) basándonos en tu análisis.

ESTRUCTURA JSON REQUERIDA DE SALIDA (DEVUELVE UN ARRAY):
[
  {
    "title": "Un título corto del inmueble extraído de la descripción",
    "price": "Precio inferido o 'No publicado'",
    "url": "Extrae la URL exacta proporcionada en el bloque",
    "isAgent": true o false,
    "reasoning": "Por qué crees, según la descripción, que es dueño (isAgent=false) o agencia/asesor (isAgent=true). Palabras clave asesor: rentahouse, remax, century21, honorarios, somos agencia.",
    "hookMessage": "Mensaje corto de WhatsApp. Si es DUEÑO DIRECTO: preséntate sugerentemente como experto de nuestra agencia Lago Realty ofreciendo ayuda o tu cartera de clientes para vender su casa rápido. NUNCA OFREZCAS COMPRARLA TÚ MISMO. Si es ASESOR: sugiere una alianza táctica."
  }
]
NO DEVUELVAS NADA MÁS QUE EL ARRAY JSON (MÁXIMO LOS 5 MEJORES, DESCARTA LA BASURA O ENLACES CAÍDOS).
`;

        const prompt = `TEXTOS EXTRAÍDOS DE LA WEB PARA LA BÚSQUEDA "${query}":\n\n${searchContext}`;

        const modelsToTry = [
            'liquid/lfm-2.5-1.2b-instruct:free',
            'openrouter/free'
        ];

        let lastError = "";
        let success = false;
        let resultData = null;

        for (const modelName of modelsToTry) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 22000);
                
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 
                        'Authorization': `Bearer ${API_KEY}`,
                        'HTTP-Referer': 'https://lago-realty.netlify.app',
                        'X-Title': 'Lago Realty Hub',
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: "system", content: systemInstructions },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                
                clearTimeout(timeoutId);

                const data = await response.json();

                if (response.ok && data.choices?.[0]?.message?.content) {
                    let responseText = data.choices[0].message.content;
                    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        resultData = JSON.parse(jsonMatch[0]);
                        success = true;
                        break;
                    } else {
                        lastError += `[${modelName}]: No valid JSON array found. Response: ${responseText.substring(0,50)}... `;
                    }
                } else {
                    lastError += `[${modelName}]: ${data.error?.message || JSON.stringify(data)}. `;
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    lastError += `[${modelName}]: Timeout (Cola de OpenRouter excesiva). `;
                } else {
                    lastError += `[${modelName}]: ${err.message}. `;
                }
            }
        }

        if (success) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultData),
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Sobrecarga de IA Gratuita',
                    details: 'Los servidores gratuitos de OpenRouter están congestionados y la app cortó la espera tras 10s para proteger Netlify. ' + lastError 
                }),
            };
        }
    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
