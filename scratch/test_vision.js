import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

async function testExtraction(url) {
    console.log(`Testing URL: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let firstImageUrl = $('meta[property="og:image"]').attr('content');
        if (!firstImageUrl || !firstImageUrl.startsWith('http')) {
            // Fallback
            $('img').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.startsWith('http') && !firstImageUrl) {
                    if(!src.includes('logo') && !src.includes('icon') && !src.includes('avatar')) {
                        firstImageUrl = src;
                    }
                }
            });
        }
        
        console.log(`First Image Found: ${firstImageUrl}`);
        
        if (firstImageUrl) {
            const start = Date.now();
            const imgRes = await fetch(firstImageUrl);
            console.log(`Image fetched in ${Date.now() - start}ms`);
            console.log(`Status: ${imgRes.status}, Content-Type: ${imgRes.headers.get('content-type')}`);
        } else {
            console.log("No valid image found.");
        }
    } catch(e) {
        console.error(e);
    }
}

// Probemos con un enlace típico de conlallave o mercadolibre si tuviéramos uno,
// pero probaré con algo genérico o le pediré a serper uno real.
async function getLinks() {
    const SERPER_API_KEY = process.env.SERPER_API_KEY || 'd4829eebc87e8548cacf6ba8029329d5df695ffc';
    const res = await fetch("https://google.serper.dev/search", {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'apartamento alquiler milagro Zulia Venezuela', gl: 've', hl: 'es', num: 3 })
    });
    const data = await res.json();
    for (const item of data.organic || []) {
        if(item.link) {
            await testExtraction(item.link);
            console.log('---');
        }
    }
}

getLinks();
