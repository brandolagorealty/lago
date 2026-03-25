import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('Checking properties table...');
    const { data: props, error } = await supabase.from('properties').select('id, title, image_url, images, created_at');
    if (error) throw error;
    
    console.log(`Found ${props.length} properties:`);
    props.forEach(p => {
      console.log(`- [${p.id}] ${p.title}`);
      console.log(`  Image URL: "${p.image_url}"`);
      console.log(`  Created at: ${p.created_at}`);
    });

    console.log('\nChecking storage buckets...');
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
        console.warn('Could not list buckets (expected for anon key):', bucketErr.message);
    } else {
        buckets.forEach(b => console.log(`Bucket: ${b.name}, Public: ${b.public}`));
    }

  } catch (e) {
    console.error('Diagnostic Error:', e.message);
  }
}

run();
