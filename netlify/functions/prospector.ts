export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { query } = JSON.parse(event.body);
        
        // Usamos la llave dedicada para scraping, o caemos en la general si no está.
        const API_KEY = process.env.VITE_GEMINI_SCRAPER_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify.' }),
            };
        }

        const systemInstructions = `
Actúa como un agresivo analista experto en captación inmobiliaria. 
Tu misión es ejecutar una búsqueda en internet y extraer las propiedades encontradas basado en la consulta del usuario.
Encuentra propiedades (preferiblemente trato directo o dueño directo) usando la herramienta de Búsqueda de Google.
Extrae los datos y deduce lógicamente si el contacto publicado es DUEÑO DIRECTO o una AGENCIA/ASESOR camuflado.

REGLAS DE BÚSQUEDA:
- Solo devuelve propiedades reales publicadas recientemente.
- Explora portales como conlallave, encuentra24, mercadolibre, inmobilia, o agrupadores.
- Excluye resultados basura o enlaces genéricos.

REGLAS PARA EL VEREDICTO (isAgent):
- Sé muy desconfiado. Si ves palabras clave como: "agencia", "asesores", "REMAX", "Century21", "afiliado", "Código", "honorarios", pon isAgent: true.
- Si ves frases como: "trato directo", "mi casa", "dueño", pon isAgent: false.

ESTRUCTURA JSON REQUERIDA DE SALIDA (DEVUELVE UN ARRAY):
[
  {
    "title": "Un título corto inferido sobre el inmueble",
    "price": "Precio extraído (ej. $35,000) o 'No publicado'",
    "url": "El enlace web de origen hacia la propiedad encontrada",
    "isAgent": true o false,
    "reasoning": "Explicación breve de por qué crees que es dueño o agencia",
    "hookMessage": "Mensaje corto de WhatsApp. Si es DUEÑO DIRECTO: preséntate sugerentemente como experto de Lago Realty ofreciendo ayuda o tu cartera de clientes para vender su casa rápido. NUNCA OFREZCAS COMPRARLA TÚ MISMO. Si es ASESOR: sugiere amablemente una posible alianza. Incluye placeholders como [Tu Nombre]."
  }
]
NO DEVUELVAS NADA MÁS QUE EL JSON (SIN FORMATO MARKDOWN NI NADA, SOLO ESCRITO COMO UN ARRAY JSON VÁLIDO).
`;

        const prompt = `REALIZA LA SIGUIENTE BÚSQUEDA INMOBILIARIA Y DEVUELVE MÁXIMO 5 PROSPECTOS ÚTILES:\n\n${query}`;

        const modelsToTry = [
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro-latest'
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
                        tools: [{ googleSearch: {} }],
                        generationConfig: {
                            response_mime_type: "application/json",
                            response_schema: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        price: { type: "string" },
                                        url: { type: "string" },
                                        isAgent: { type: "boolean" },
                                        reasoning: { type: "string" },
                                        hookMessage: { type: "string" }
                                    },
                                    required: ["title", "price", "url", "isAgent", "reasoning", "hookMessage"]
                                }
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
                    error: 'Error al ejecutar la búsqueda automatizada con Gemini.',
                    details: lastError 
                }),
            };
        }
    } catch (error: any) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
