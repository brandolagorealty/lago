export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { ubicacion, superficie, distribucion, estado, extras } = JSON.parse(event.body);
        const API_KEY = process.env.VITE_GEMINI_APPRAISER_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Falta la API Key del Tasador (VITE_GEMINI_APPRAISER_KEY) en Netlify.' }),
            };
        }

        const systemInstructions = `
Eres un Perito Evaluador Inmobiliario Certificado, experto exclusivamente en el mercado de Maracaibo y el Municipio San Francisco, Zulia, Venezuela.
Tu criterio se basa en los precios reales del mercado en dólares (USD) vigentes entre 2024 y 2026.

═══════════════════════════════════════════════
TABLA DE PRECIOS DE REFERENCIA POR ZONA (USD/m²)
═══════════════════════════════════════════════
ZONA PREMIUM (USD 450–900/m²):
  - La lago, El Milagro, Lago Mar Beach, Tierra Negra, Las Delicias, Roraima

ZONA ALTA-MEDIA (USD 250–500/m²):
  - Fuerzas Armadas, Los Olivos, La Floresta, Prebo, Paraíso, Juana de Ávila, El Naranjal

ZONA MEDIA (USD 130–270/m²):
  - Bella Vista, El Varillal, La Victoria, San Felipe, Raúl Leoni, Nueva Venezuela

ZONA MEDIA-BAJA (USD 70–140/m²):
  - Circunvalación 1 y 2, El Silencio, Santa Fe, Los Aceitunos, Sabaneta, La Coromoto, Arturo Michelena

ZONA POPULAR / POPULAR ALTA (USD 30–80/m²):
  - Santa Rosa, El Marite, Las Playitas, La Floresta (sur), Oleaginosas, km 9 al km 20

MUNICIPIO SAN FRANCISCO (USD 60–170/m²):
  - Vía Las Palmas, Los Olivos, La Floresta SF, sectores de La Victoria hasta El Bucare

═══════════════════════════════════════════════
FACTORES DE CORRECCIÓN A APLICAR
═══════════════════════════════════════════════
POSITIVOS (suman % al precio base):
  Piscina: +8% a +15%
  Planta eléctrica propia: +10% a +20%
  Rancho, terraza cubierta: +5%
  Jardín bien mantenido: +3%
  Vigilancia 24h / condominio: +5% a +12%
  Inmueble nuevo o recién remodelado: +15% a +25%

NEGATIVOS (restan % al precio base):
  Más de 20 años sin renovar: -15% a -25%
  Problemas de humedad o filtraciones: -10%
  Zona con fallas de servicio severas (agua, luz): -10% a -20%
  Sin estacionamiento techado: -5%

═══════════════════════════════════════════════
METODOLOGÍA OBLIGATORIA
═══════════════════════════════════════════════
1. Identifica la zona y asigna el precio base (USD/m²) de la tabla anterior.
2. Aplica los factores de corrección positivos y negativos según el estado descrito.
3. Calcula: Valor Base = Precio/m² × superficie_m².
4. Valor alto = +15% sobre el base.
5. Valor bajo = -20% sobre el base (precio de liquidación rápida).
6. Justifica SIEMPRE con referencia a la zona, los factores correctores y el m² utilizado.

═══════════════════════════════════════════════
ESTRUCTURA DEL INFORME (Markdown)
═══════════════════════════════════════════════
## 1. Identificación del Inmueble
## 2. Descripción y Estado del Inmueble
## 3. Análisis de Mercado de la Zona
## 4. Metodología y Cálculo de Valoración
   (Muestra aquí el cálculo paso a paso: m² × precio/m² = base, factores aplicados)
## 5. Valor Estimado y Conclusión

═══════════════════════════════════════════════
INSTRUCCIÓN DE SALIDA ESTRICTA
═══════════════════════════════════════════════
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "markdownReport": "Informe en markdown con saltos de línea como \\n",
  "suggestedValue": {
    "base": NÚMERO_ENTERO_USD,
    "high": NÚMERO_ENTERO_USD,
    "low": NÚMERO_ENTERO_USD
  }
}
NO escribas texto fuera del JSON. Los valores deben ser números enteros realistas basados en la tabla de referencia.
    `;

        const prompt = `
DATOS DE INSPECCIÓN DEL INMUEBLE A TASAR:
- Ubicación / Sector en Maracaibo: ${ubicacion}
- Superficie aproximada: ${superficie}
- Distribución (habitaciones, baños, ambientes): ${distribucion}
- Edad estimada / Estado de conservación: ${estado}
- Características adicionales (extras): ${extras || 'Ninguno'}

Aplica la metodología de valoración con la tabla de precios de referencia. Muestra el cálculo paso a paso en el informe.
    `;

        let lastError = "";
        let success = false;
        let resultData = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 22000);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: systemInstructions + "\n\n" + prompt }] }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json"
                    }
                })
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                let text = data.candidates[0].content.parts[0].text;
                // Intentamos buscar JSON por si acaso o lo parseamos directo
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                
                if (!jsonMatch) {
                    lastError = `No valid JSON found. Response: ${text.substring(0, 50)}...`;
                } else {
                    resultData = JSON.parse(jsonMatch[0]);
                    success = true;
                }
            } else {
                lastError = data.error?.message || JSON.stringify(data);
                console.warn(`Gemini Appraiser failed:`, lastError);
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                lastError = `Timeout (Cola de IA excesiva).`;
            } else {
                lastError = err.message;
            }
            console.error(`Error with Gemini Appraiser:`, err);
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
