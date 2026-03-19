
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dump() {
    const { data } = await supabase.from('properties').select('id, title, is_published');
    console.log('START_DUMP');
    data.forEach(p => {
        console.log(`DATA|${p.id}|${p.is_published}|${p.title}`);
    });
    console.log('END_DUMP');
}
dump();
