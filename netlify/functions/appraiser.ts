export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { ubicacion, superficie, distribucion, estado, extras } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

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
                // Limpiamos el nombre por si hay espacios accidentales
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
                                    markdownReport: { type: "string" },
                                    suggestedValue: {
                                        type: "object",
                                        properties: {
                                            base: { type: "integer" },
                                            high: { type: "integer" },
                                            low: { type: "integer" }
                                        },
                                        required: ["base", "high", "low"]
                                    }
                                },
                                required: ["markdownReport", "suggestedValue"]
                            }
                        }
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    let text = data.candidates[0].content.parts[0].text;
                    // Limpieza de posibles bloques de código markdown
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    resultData = JSON.parse(text);
                    success = true;
                    break;
                } else {
                    lastError += `[${cleanModelName}]: ${data.error?.message || JSON.stringify(data)}. `;
                    console.warn(`Model ${cleanModelName} failed:`, data.error?.message || data);
                }
            } catch (err: any) {
                lastError += `[${modelName}]: ${err.message}. `;
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
                    error: 'Error al conectar con Gemini tras varios intentos.',
                    details: lastError 
                }),
            };
        }
    } catch (error: any) {
        console.error("Function exception:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
