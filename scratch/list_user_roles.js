import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listUserRoles() {
    const { data, error } = await supabase
        .from('user_roles')
        .select('*');

    if (error) {
        console.error('Error fetching user_roles:', error);
    } else {
        console.table(data);
    }
}

listUserRoles();
