import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

async function testFetch(url) {
    console.log(`Testing URL: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        
        $('script, style, noscript, header, footer, nav').remove();
        const fullText = $('body').text().replace(/\s+/g, ' ').trim();
        console.log(`Extracted Text Length: ${fullText.length}`);
        console.log(`Extracted Text Snippet: ${fullText.substring(0, 200)}...`);
        
        const ogImage = $('meta[property="og:image"]').attr('content');
        console.log(`OG Image: ${ogImage}`);
        
    } catch(e) {
        console.error(e);
    }
}

testFetch('https://www.facebook.com/groups/324350764610129/posts/2773150119730169/');
testFetch('https://www.instagram.com/p/some_post_id/');
