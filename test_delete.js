
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDelete() {
    const targetTitle = 'Ocean View Penthouse';
    console.log(`Searching for: ${targetTitle}`);

    const { data } = await supabase.from('properties').select('id').eq('title', targetTitle).limit(1);

    if (!data || data.length === 0) {
        console.log('Not found in DB.');
        return;
    }

    const id = data[0].id;
    console.log(`Found ID: ${id}. Attempting to delete...`);

    const { error, count } = await supabase
        .from('properties')
        .delete({ count: 'exact' })
        .eq('id', id);

    if (error) {
        console.error('Delete Error:', error);
    } else {
        console.log(`Delete successful. Rows affected: ${count}`);
    }
}
testDelete();
