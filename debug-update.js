import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) envVars[key.trim()] = val.trim();
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Testing Update ---');
    // Fetch first property to get a valid ID
    const { data: props, error: fetchError } = await supabase.from('properties').select('*').limit(1);

    if (fetchError || !props || props.length === 0) {
        console.error('Fetch error:', fetchError);
        return;
    }

    const testId = props[0].id;
    console.log('Testing update on property ID:', testId);
    console.log('Current row data:', JSON.stringify(props[0], null, 2));

    // Test updating just agent_notes first
    const { error: updateError } = await supabase
        .from('properties')
        .update({ agent_notes: 'Debug test note ' + new Date().toISOString() })
        .eq('id', testId);

    if (updateError) {
        console.error('❌ Update Error (agent_notes):', updateError);
    } else {
        console.log('✅ Update success (agent_notes)');
    }

    // Test updating agent_id with '1'
    const { error: agentUpdateError } = await supabase
        .from('properties')
        .update({ agent_id: '1' })
        .eq('id', testId);

    if (agentUpdateError) {
        console.error('❌ Update Error (agent_id):', agentUpdateError);
        console.log('Details:', agentUpdateError.details);
        console.log('Hint:', agentUpdateError.hint);
    } else {
        console.log('✅ Update success (agent_id)');
    }
}

checkSchema();
