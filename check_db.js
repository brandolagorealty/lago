
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpProperties() {
    console.log('--- STARTING DB DUMP ---');
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('id, title, is_published, featured');

        if (error) {
            console.error('Database Error:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('Database is empty (0 properties found).');
        } else {
            console.log(`Found ${data.length} properties:`);
            data.forEach(p => {
                console.log(`[${p.is_published ? 'PUB' : 'DRF'}] [${p.featured ? 'FEAT' : 'NORM'}] ${p.id}: ${p.title}`);
            });
        }
    } catch (e) {
        console.error('Script Error:', e);
    }
    console.log('--- END ---');
}

dumpProperties();
