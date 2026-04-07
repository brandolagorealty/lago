const fetch = globalThis.fetch;
(async () => {
  const API_KEY = 'AIzaSyCpwlAqAV02AbbxWZtIR-qjtnnHc6XPPho';
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
  
  for (const model of models) {
    console.log('Testing', model, 'with googleSearchRetrieval');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hola' }] }],
          tools: [{ googleSearchRetrieval: {} }]
        })
      });
      const data = await res.json();
      if (res.ok) console.log(model, 'SUCCESS');
      else console.log(model, 'ERROR:', data.error?.message || data);
    } catch(e) { console.log(model, 'EXCEPTION', e.message); }
  }
})();
