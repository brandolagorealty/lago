import fetch from 'node-fetch';

async function test() {
    try {
        const response = await fetch('https://lago-realty.netlify.app/.netlify/functions/invite-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleId: '123' }),
        });
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Headers:', response.headers.raw());
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
test();
