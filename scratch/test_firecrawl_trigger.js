import fetch from 'node-fetch';

async function testSerperAndFirecrawl() {
    const SERPER_API_KEY = process.env.SERPER_API_KEY || 'd4829eebc87e8548cacf6ba8029329d5df695ffc';
    const FIRECRAWL_API_KEY = 'fc-a33cfdb538db49bb8276f21afa0dea95';
    
    // 1. Serper search
    console.log('Fetching Serper...');
    const res = await fetch("https://google.serper.dev/search", {
        method: 'POST',
        headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            q: 'site:facebook.com apartamento venta Maracaibo',
            gl: 've',
            hl: 'es',
            num: 3
        })
    });
    const data = await res.json();
    
    for (const item of data.organic || []) {
        console.log('--- LINK ---', item.link);
        const isSocialMedia = item.link.includes('facebook.com') || item.link.includes('instagram.com') || item.link.includes('tiktok.com');
        
        console.log('Is Social Media?', isSocialMedia);
        
        if (isSocialMedia) {
            console.log('Triggering Firecrawl...');
            try {
                const responseFC = await fetch('https://api.firecrawl.dev/v1/scrape', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
                    },
                    body: JSON.stringify({ url: item.link, formats: ['markdown'] })
                });
                console.log('Firecrawl Status:', responseFC.status);
                const dataFC = await responseFC.json();
                console.log('Firecrawl Error:', JSON.stringify(dataFC));
            } catch(e) {
                console.error('Firecrawl Error:', e);
            }
        }
    }
}

testSerperAndFirecrawl();
