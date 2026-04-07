const fetch = globalThis.fetch;
(async () => {
  const API_KEY = 'AIzaSyCpwlAqAV02AbbxWZtIR-qjtnnHc6XPPho';
  const model = 'gemini-1.5-flash';
  
  // Test no tools
  try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hola' }] }]
        })
      });
      const data = await res.json();
      console.log('No tools:', res.ok ? 'SUCCESS' : data.error?.message);
  } catch(e) { console.log('Err1', e.message); }

  // Test googleSearch
  try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hola' }] }],
          tools: [{ google_search: {} }] // Trying snake case
        })
      });
      const data = await res.json();
      console.log('google_search:', res.ok ? 'SUCCESS' : data.error?.message || data);
  } catch(e) { console.log('Err2', e.message); }

  // Test googleSearch camelCase
  try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hola' }] }],
          tools: [{ googleSearch: {} }] 
        })
      });
      const data = await res.json();
      console.log('googleSearch:', res.ok ? 'SUCCESS' : data.error?.message || data);
  } catch(e) { console.log('Err3', e.message); }
})();
