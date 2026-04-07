// test_gemini_search.js
const API_KEY = process.env.VITE_GEMINI_API_KEY; // I will pass the general key

async function run() {
    const prompt = "Encuentra 3 publicaciones recientes de casas en venta en Maracaibo que sean 'trato directo' o publicadas por dueño. Dame el título, el precio, y el enlace de origen.";
    
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
}

run();
