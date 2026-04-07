require('dotenv').config({ path: '.env.local' });

async function run() {
    const API_KEY = process.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("No API KEY found");
        return;
    }
    
    // El objetivo es buscar explícitamente en Facebook Marketplace
    const prompt = `Usa la herramienta de búsqueda de Google. Busca en el sitio facebook.com/marketplace/ enlaces a propiedades en venta en Maracaibo publicadas recientemente (últimas 24 horas a 7 días). Retorna un JSON con los enlaces (links) encontrados y el título que veas en los resultados de búsqueda.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ googleSearch: {} }]
            })
        });
        
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
