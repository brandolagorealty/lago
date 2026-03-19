
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dump() {
    const { data } = await supabase.from('properties').select('title');
    console.log('COUNT:' + data.length);
    data.forEach(p => console.log('TITLE:' + p.title));
}
dump();
