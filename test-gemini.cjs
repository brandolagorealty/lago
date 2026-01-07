const API_KEY = "AIzaSyBQR-_na8_7fwJm-2mPS45xYTPO2ORkjuQ"; // El usuario debe poner su llave aquí
const MODEL = 'gemini-1.5-flash';

async function test() {
    console.log("--- Diagnóstico Profundo de Gemini API ---");

    // 1. Primero intentar listar modelos para ver qué tienes disponible
    console.log("\n1. Listando modelos disponibles para tu llave...");
    const LIST_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const listResponse = await fetch(LIST_URL);
        const listData = await listResponse.json();

        if (listResponse.ok) {
            console.log("✅ Modelos encontrados:");
            if (listData.models) {
                listData.models.forEach(m => console.log(`   - ${m.name} (Soporta: ${m.supportedGenerationMethods.join(', ')})`));
            } else {
                console.log("   No se devolvieron modelos en la lista.");
            }
        } else {
            console.log("❌ Error al listar modelos:");
            console.log(JSON.stringify(listData, null, 2));
        }
    } catch (err) {
        console.log("💥 Error al conectar para listar:", err.message);
    }

    // 2. Intentar una prueba con un modelo genérico 'models/gemini-pro' (sin versionado)
    console.log("\n2. Probando modelo genérico 'gemini-pro'...");
    const v = 'v1beta';
    const MODEL_PATH = 'models/gemini-pro';
    const URL = `https://generativelanguage.googleapis.com/${v}/${MODEL_PATH}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Responde solo 'LISTO'." }] }]
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ ¡ÉXITO! Respuesta: ${data.candidates[0].content.parts[0].text}`);
        } else {
            console.log(`❌ FALLO: ${data.error?.message || JSON.stringify(data)}`);
        }
    } catch (err) {
        console.log(`💥 ERROR de red:`, err.message);
    }
}
test();
