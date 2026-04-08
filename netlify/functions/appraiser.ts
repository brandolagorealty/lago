export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { ubicacion, superficie, distribucion, estado, extras } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key en Netlify.' }),
            };
        }

        const systemInstructions = `
Actúa como un Perito Evaluador Inmobiliario experto en el mercado inmobiliario de Maracaibo, Zulia, Venezuela.
Tu objetivo es redactar un informe de valoración profesional basado en los datos de inspección proporcionados.

ESTRUCTURA DEL INFORME REQUERIDA (en formato Markdown):
1. **Identificación:** Ubicación exacta y descripción del entorno en Maracaibo.
2. **Memoria Descriptiva:** Detalles constructivos (pisos, paredes, techos, carpintería) y estado de conservación basado en los datos.
3. **Análisis de Mercado:** Evaluación de la zona (servicios, vialidad, demanda actual en ese sector).
4. **Metodología de Valoración:** Aplicación del método de comparación de mercado (homologación). Justifica brevemente.
5. **Conclusión:** Valor final sugerido y consideraciones de cierre, siendo realista con los precios actuales (2024-2026).

TONO Y ESTILO:
- Utiliza un lenguaje técnico-jurídico pero claro.
- Mantén un tono objetivo e imparcial.
- Organiza la información en secciones con encabezados en negrita (usando hashes en Markdown \`##\`).

INSTRUCCIÓN ESPECIAL PARA LA SALIDA:
Devuelve un JSON estrictamente válido con la siguiente estructura:
{
  "markdownReport": "Aquí va el informe completo en texto markdown, usando saltos de línea \\n",
  "suggestedValue": {
    "base": (número estimado principal en USD),
    "high": (número estimado optimista en USD),
    "low": (número estimado liquidación/rebaja en USD)
  }
}
NO DEVUELVAS NADA MÁS QUE EL JSON. Asegúrate de que los valores sean números enteros.
    `;

        const prompt = `
DATOS DE INSPECCIÓN:
- Ubicación / Sector: ${ubicacion}
- Superficie: ${superficie}
- Distribución: ${distribucion}
- Edad / Estado: ${estado}
- Extras: ${extras || 'Ninguno'}

Redacta el informe de valoración siguiendo estrictamente el esquema JSON solicitado y las instrucciones.
    `;

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
                    let text = data.choices[0].message.content;
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    
                    if (!jsonMatch) {
                        lastError += `[${modelName}]: No valid JSON found. Response: ${text.substring(0, 50)}... `;
                        continue;
                    }

                    resultData = JSON.parse(jsonMatch[0]);
                    success = true;
                    break;
                } else {
                    lastError += `[${modelName}]: ${data.error?.message || JSON.stringify(data)}. `;
                    console.warn(`Model ${modelName} failed:`, data.error?.message || data);
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    lastError += `[${modelName}]: Timeout (Cola de IA gratuita). `;
                } else {
                    lastError += `[${modelName}]: ${err.message}. `;
                }
                console.error(`Error with model ${modelName}:`, err);
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
                    details: 'Los servidores de OpenRouter están muy congestionados y la respuesta tomó más de 10 segundos. Se cortó la conexión. ' + lastError 
                }),
            };
        }
    } catch (error: any) {
        console.error("Function exception:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
