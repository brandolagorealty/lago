const API_KEY = 'AIzaSyCpwlAqAV02AbbxWZtIR-qjtnnHc6XPPho';
const prompt = `Busca en Google con el parámetro site:facebook.com/marketplace/ 'Maracaibo' 'trato directo' apartamento OR casa. Encuentra al menos 5 enlaces directos a publicaciones. Retorna un JSON con los título y el enlace exacto.`;
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
    })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2)));
