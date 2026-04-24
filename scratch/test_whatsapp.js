// test_whatsapp.js
async function testWhatsApp() {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_WHATSAPP_TOKEN;
  
  if (!phoneId || !token) {
      console.error('Faltan variables de entorno META_PHONE_ID o META_WHATSAPP_TOKEN');
      return;
  }

  const body = {
    messaging_product: 'whatsapp',
    to: '584141234567', // Fake number to see if it reaches Meta
    type: 'template',
    template: {
      name: 'alerta_tarea_pendiente',
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Brando Lanchez' },
            { type: 'text', text: 'Tarea de prueba' },
            { type: 'text', text: '12 de Mayo' },
            { type: 'text', text: 'https://lago-hub.netlify.app' },
          ],
        },
      ],
    },
  };

  try {
      const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      console.log('STATUS:', response.status);
      console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch(e) {
      console.error('Fetch error:', e);
  }
}

testWhatsApp();
