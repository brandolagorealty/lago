export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { text } = JSON.parse(event.body);
        
        // Usamos la llave dedicada para scraping, o caemos en la general si no está.
        const API_KEY = process.env.VITE_GEMINI_SCRAPER_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify.' }),
            };
        }

        const systemInstructions = `
Actúa como un analista experto en captación inmobiliaria en Maracaibo, Zulia.
Te pasaré el texto crudo (sucio) copiado de una publicación de clasificados (Probablemente Facebook Marketplace o grupos de WhatsApp).
Tu misión es extraer los datos clave, deducir con lógica agresiva si quien publica es un DUEÑO DIRECTO o una AGENCIA/ASESOR INMOBILIARIO camuflado, y redactar un guion breve para abordarlo.

REGLAS PARA EL VEREDICTO (isAgent):
- Sé muy desconfiado. Si ves palabras clave como: "somos", "agencia", "asesor", "honorarios", "afiliado", "código", "franquicia", o múltiples propiedades a la venta, pon isAgent: true.
- Si ves frases como: "mi casa", "trato directo", "sin intermediarios", "dueño", pon isAgent: false.

ESTRUCTURA JSON REQUERIDA DE SALIDA:
{
  "title": "Un título corto inferido sobre el inmueble",
  "price": "Precio extraído (incluye moneda) o 'No publicado'",
  "isAgent": true o false,
  "reasoning": "Explicación de 1 o 2 líneas de por qué crees que es dueño o asesor.",
  "hookMessage": "Un mensaje corto (Rompehielos) de WhatsApp. Si es DUEÑO DIRECTO: preséntate sugerentemente como experto de Lago Realty ofreciendo ayuda gratuita o tu cartera de clientes para vender su casa rápido. NUNCA OFREZCAS COMPRARLA TÚ MISMO. Si es ASESOR: sugiere una posible alianza o pregunta por el inmueble cordialmente."
}
NO DEVUELVAS NADA MÁS QUE EL JSON.
    `;

        const prompt = `
TEXTO DE LA PUBLICACIÓN A ANALIZAR:
"""
${text}
"""
    `;

        const modelsToTry = [
            'gemini-flash-latest',
            'gemini-1.5-flash-latest',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash'
        ];

        let lastError = "";
        let success = false;
        let resultData = null;

        for (const modelName of modelsToTry) {
            try {
                const cleanModelName = modelName.trim().replace(' ', '');
                const URL = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${API_KEY}`;
                
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
                                    title: { type: "string" },
                                    price: { type: "string" },
                                    isAgent: { type: "boolean" },
                                    reasoning: { type: "string" },
                                    hookMessage: { type: "string" }
                                },
                                required: ["title", "price", "isAgent", "reasoning", "hookMessage"]
                            }
                        }
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    let responseText = data.candidates[0].content.parts[0].text;
                    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                    resultData = JSON.parse(responseText);
                    success = true;
                    break;
                } else {
                    lastError += `[${cleanModelName}]: ${data.error?.message || JSON.stringify(data)}. `;
                }
            } catch (err: any) {
                lastError += `[${modelName}]: ${err.message}. `;
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
                    error: 'Error al procesar el texto del prospecto con Gemini.',
                    details: lastError 
                }),
            };
        }
    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
