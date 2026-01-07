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
    const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY']; // Note: Listing buckets might require Service Role key depending on RLS, but we'll try anon first.
    // If anon fails, we might need the user to create it manually.

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Falta URL o Key en .env.local');
        process.exit(1);
    }

    console.log('Connecting to:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function checkBuckets() {
        console.log('Listing buckets...');
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('❌ Error listing buckets:', error.message);
            console.log('👉 Note: Listing buckets often requires higher privileges. Assuming "properties" bucket needs to be created or public access enabled.');
            return;
        }

        console.log('✅ Buckets found:');
        if (data.length === 0) {
            console.log('   (No buckets found)');
        } else {
            data.forEach(b => console.log(`   - ${b.name} (public: ${b.public})`));
        }
    }

    checkBuckets();

} catch (err) {
    console.error('Error:', err);
}
