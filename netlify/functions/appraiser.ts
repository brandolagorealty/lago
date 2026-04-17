export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { ubicacion, superficie, distribucion, estado, extras } = JSON.parse(event.body);
        
        // Priority: new unified key > old dedicated appraiser key
        const API_KEY = process.env.GEMINI_API_KEY 
                     || process.env.VITE_GEMINI_APPRAISER_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key de Gemini. Configura GEMINI_API_KEY en Netlify.' }),
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
DATOS DE INSPECCIÓN DEL INMUEBLE:
- Ubicación / Sector: ${ubicacion}
- Superficie: ${superficie}
- Distribución: ${distribucion}
- Edad / Estado: ${estado}
- Extras: ${extras || 'Ninguno'}

Redacta el informe de valoración siguiendo estrictamente el esquema JSON solicitado y las instrucciones de experto.
    `;

        // Fallback chain: newest → oldest. Whatever the API key supports, one will work.
        const modelsToTry = [
            'gemini-2.5-flash',       // Newest & best (if available)
            'gemini-2.5-flash-lite',  // Fast & cheap tier
            'gemini-2.0-flash',       // Stable previous gen
            'gemini-1.5-flash',       // Older but widely supported
            'gemini-1.5-flash-8b',    // Smallest, guaranteed to exist
        ];

        // JSON schema for structured output (used by models that support it)
        const jsonSchema = {
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
        };

        let lastError = "";
        let resultData = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`[Appraiser] Trying model: ${modelName}`);

                // Try v1beta first (supports more features), fall back to v1
                const apiVersions = ['v1beta', 'v1'];
                
                for (const apiVersion of apiVersions) {
                    try {
                        const URL = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${API_KEY}`;
                        
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s per attempt

                        const requestBody: any = {
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.4,
                                responseMimeType: "application/json",
                            }
                        };

                        // Add system instruction (supported in v1beta)
                        if (apiVersion === 'v1beta') {
                            requestBody.system_instruction = { parts: [{ text: systemInstructions }] };
                            requestBody.generationConfig.responseSchema = jsonSchema;
                        } else {
                            // v1: embed system instructions in the prompt
                            requestBody.contents[0].parts[0].text = systemInstructions + '\n\n' + prompt;
                        }

                        const response = await fetch(URL, {
                            method: 'POST',
                            signal: controller.signal,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody)
                        });

                        clearTimeout(timeoutId);
                        const data = await response.json();

                        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                            let text = data.candidates[0].content.parts[0].text;
                            // Clean potential markdown code blocks
                            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                            resultData = JSON.parse(text);
                            
                            // Validate the response has the required shape
                            if (resultData.markdownReport && resultData.suggestedValue?.base) {
                                console.log(`[Appraiser] Success with ${modelName} (${apiVersion})`);
                                return {
                                    statusCode: 200,
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(resultData),
                                };
                            } else {
                                lastError += `[${modelName}/${apiVersion}]: Response missing required fields. `;
                                continue;
                            }
                        } else {
                            const errMsg = data.error?.message || JSON.stringify(data).substring(0, 200);
                            
                            // If model not found in v1beta, don't bother trying v1 for same model
                            if (errMsg.includes('not found') || errMsg.includes('not supported')) {
                                lastError += `[${modelName}]: Model not available. `;
                                break; // Skip to next model
                            }
                            
                            lastError += `[${modelName}/${apiVersion}]: ${errMsg}. `;
                        }
                    } catch (innerErr: any) {
                        if (innerErr.name === 'AbortError') {
                            lastError += `[${modelName}/${apiVersion}]: Timeout. `;
                        } else if (innerErr instanceof SyntaxError) {
                            lastError += `[${modelName}/${apiVersion}]: Invalid JSON in response. `;
                        } else {
                            lastError += `[${modelName}/${apiVersion}]: ${innerErr.message}. `;
                        }
                    }
                }
            } catch (err: any) {
                lastError += `[${modelName}]: ${err.message}. `;
                console.error(`Error with model ${modelName}:`, err);
            }
        }

        // All models failed
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'No se pudo conectar con la IA después de intentar todos los modelos disponibles.',
                details: lastError 
            }),
        };
    } catch (error: any) {
        console.error("Function exception:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
