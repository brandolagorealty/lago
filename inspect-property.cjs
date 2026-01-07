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
        console.log('Fetching properties...');
        const { data, error } = await supabase
            .from('properties')
            .select('id, title, images, features, image_url')
            .limit(5);

        if (error) {
            console.error('❌ Error fetching properties:', error);
            return;
        }

        console.log(`✅ Found ${data.length} properties.`);
        data.forEach((p, i) => {
            console.log(`\nProperty ${i + 1}: ${p.title} (${p.id})`);
            console.log('  image_url:', p.image_url);
            console.log('  images (type):', typeof p.images);
            console.log('  images (value):', JSON.stringify(p.images));
            console.log('  features (type):', typeof p.features);
            console.log('  features (value):', JSON.stringify(p.features));
        });
    }

    inspect();

} catch (err) {
    console.error('Error:', err);
}
