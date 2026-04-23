import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAgents() {
    const { data, error } = await supabase
        .from('agents')
        .select('name, phone, role');

    if (error) {
        console.error('Error fetching agents:', error);
    } else {
        console.table(data);
    }
}

listAgents();
