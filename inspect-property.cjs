const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) envVars[key.trim()] = val.trim();
    });

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Falta URL o Key en .env.local');
        process.exit(1);
    }

    console.log('Connecting to:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function inspect() {
        console.log('Inspecting table schema...');
        // Supabase doesn't have a direct 'describe table' in the JS client easily, 
        // but we can try to fetch one row and see the keys, or use a RPC if available.
        // Alternatively, we can just try to update a dummy row to test permissions.

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Error:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('✅ Columns found in "properties":');
            console.log(Object.keys(data[0]).join(', '));

            const p = data[0];
            console.log('\nSample Values:');
            console.log('  status:', p.status);
            console.log('  agent_id:', p.agent_id);
            console.log('  agent_notes:', p.agent_notes);
        } else {
            console.log('No data found in properties table.');
        }
    }

    inspect();

} catch (err) {
    console.error('Error:', err);
}
