import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking recent properties...');
  const { data: props, error } = await supabase
    .from('properties')
    .select('id, title, image_url, images')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }

  console.log(`Found ${props.length} properties.`);
  for (const p of props) {
    console.log(`--- Property: ${p.title} (${p.id}) ---`);
    console.log(`Main Image URL: "${p.image_url}"`);
    if (p.image_url && p.image_url.startsWith('http')) {
        try {
            const res = await fetch(p.image_url, { method: 'HEAD' });
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.status === 404) console.log('CAUTION: 404 Not Found - URL might be wrong or bucket not public.');
        } catch (e) {
            console.log(`Fetch Error: ${e.message}`);
        }
    } else {
        console.log('Main Image URL is EMPTY or INVALID.');
    }
  }
}

check();
