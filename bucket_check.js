import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('Listing buckets...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    
    console.log('Found buckets:');
    buckets.forEach(b => {
      console.log(`- name: ${b.name}, public: ${b.public}`);
    });

  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
