import { handler } from '../netlify/functions/prospector.ts';

async function test() {
    const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
            query: 'apartamento alquiler milagro',
            operacion: 'Alquiler'
        })
    };

    console.log("Iniciando prueba de Prospector 360...");
    const response = await handler(event);
    console.log("Status Code:", response.statusCode);
    console.log("Body:", JSON.stringify(JSON.parse(response.body), null, 2));
}

test().catch(console.error);
