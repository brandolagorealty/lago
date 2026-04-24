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
                    tbs: 'qdr:d3', // Máximo 3 días de antigüedad
                    num: 10 // Get top 10 results
                })
            });
            
            const data = await res.json();
            const results: string[] = [];
            
            if (data.organic && Array.isArray(data.organic)) {
                // FASE 1: Deep Crawling - Tomamos los top 6 links para no exceder los 26s
                const topLinks = data.organic.slice(0, 6);
                
                const crawlPromises = topLinks.map(async (item: any) => {
                    if (!item.link) return null;
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5 segs max por link para evitar timeout global
                        
                        const response = await fetch(item.link, { 
                            signal: controller.signal,
                            headers: { 
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'es-419,es;q=0.9,en;q=0.8'
                            }
                        });
                        clearTimeout(timeoutId);
                        
                        if (!response.ok) throw new Error('Bad status');
                        const html = await response.text();
                        const $ = cheerio.load(html);
                        
                        // Extraer primera imagen válida
                        let firstImageUrl = '';
                        $('img').each((i, el) => {
                            const src = $(el).attr('src');
                            if (src && src.startsWith('http') && !firstImageUrl) {
                                firstImageUrl = src;
                            }
                        });

                        // Limpiar elementos no textuales
                        $('script, style, noscript, iframe, img, svg, header, footer, nav, button').remove();
                        const fullText = $('body').text().replace(/\s+/g, ' ').trim();
                        
                        // Si nos bloquean (ej: FB/IG) el texto es muy corto. Fallback al snippet.
                        const validText = fullText.length > 150 ? fullText.substring(0, 3000) : item.snippet;
                        
                        let base64Image = null;
                        let mimeType = '';
                        if (firstImageUrl) {
                            try {
                                const imgController = new AbortController();
                                const imgTimeoutId = setTimeout(() => imgController.abort(), 1500); // 1.5s max
                                const imgResponse = await fetch(firstImageUrl, { signal: imgController.signal });
                                clearTimeout(imgTimeoutId);
                                if (imgResponse.ok) {
                                    const arrayBuffer = await imgResponse.arrayBuffer();
                                    base64Image = Buffer.from(arrayBuffer).toString('base64');
                                    mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';
                                }
                            } catch (e) {
                                // Ignorar error de imagen
                            }
                        }

                        return { title: item.title, link: item.link, text: validText, base64Image, mimeType };
                    } catch (e) {
                        // Fallback natural al snippet de Serper si la web bloquea el bot o tarda mucho
                        return { title: item.title, link: item.link, text: item.snippet, base64Image: null, mimeType: '' };
                    }
                });
                
                const crawledData = await Promise.all(crawlPromises);
                
                crawledData.forEach((item, idx) => {
                    if (item) {
                        results.push(`--- PUBLICACIÓN ${idx + 1} ---\nTÍTULO: ${item.title}\nURL: ${item.link || ''}\nTEXTO EXTRAÍDO: ${item.text}`);
                    }
                });
                
                // Exponer crawledData para usar las imágenes luego
                (data as any).crawledData = crawledData;
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
REGLA ESTRICTA 3: SI EL TEXTO MENCIONA A CUALQUIERA DE ESTAS AGENCIAS O PALABRAS: "ANGEL PINTON", "REMAX", "CENTURY 21", "CENTURY21", "RENT-A-HOUSE", "RENTAHOUSE", "CAUDALIA", "PINEDA", "INMUEBLES ZULIA", "KAREM BERNAL", "EL MILAGRO", "CASA PROPIA", "NEXT HOUSE", "H&J", "REGALADO", "RED90", "INMOBILIARIA", "AGENTE", "CORREDOR", "HONORARIOS", "CLIENTES", EL CAMPO "isAgent" **TIENE QUE SER TRUE OBLIGATORIAMENTE**. Aún así, INCLUYE ESTOS RESULTADOS en el JSON (no los descartes), pero asegúrate de marcarlos correctamente como agencia (isAgent: true).
REGLA ESTRICTA 4 (VISIÓN ARTIFICIAL): Analiza las IMÁGENES adjuntas (si las hay). Si ves marcas de agua, logos o textos superpuestos en las fotos que pertenezcan a Remax, Century 21, Angel Pinton, Rent-A-House o cualquier inmobiliaria, el campo "isAgent" TIENE QUE SER TRUE OBLIGATORIAMENTE, incluso si el texto dice "Dueño Directo".

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
NO DEVUELVAS NADA MÁS QUE EL ARRAY JSON (MÁXIMO LOS 6 MEJORES, INCLUYE AGENCIAS Y DUEÑOS, DESCARTA LA BASURA).
`;

        const prompt = `TEXTOS EXTRAÍDOS DE LA WEB PARA LA BÚSQUEDA "${query}":\n\n${searchContext}`;
        
        const geminiParts: any[] = [{ text: systemInstructions + '\n\n' + prompt }];
        if ((data as any).crawledData) {
            (data as any).crawledData.forEach((item: any, idx: number) => {
                if (item && item.base64Image) {
                    geminiParts.push({ text: `\n[FOTO DE LA PUBLICACIÓN ${idx + 1}]:` });
                    geminiParts.push({
                        inlineData: {
                            data: item.base64Image,
                            mimeType: item.mimeType
                        }
                    });
                }
            });
        }

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
                            { role: 'user', parts: geminiParts }
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
