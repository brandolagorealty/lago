const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function registerAdmin() {
    // 1. Read .env.local manually
    const envPath = path.resolve(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local not found!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

    if (!urlMatch || !keyMatch) {
        console.error('❌ Could not parse Supabase URL or Key from .env.local');
        process.exit(1);
    }

    const supabaseUrl = urlMatch[1].trim();
    const supabaseKey = keyMatch[1].trim();

    // 2. Initialize Supabase
    console.log(`Connecting to ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Create User
    const email = 'admin@lago.com';
    const password = 'LagoRealtyAdmin!'; // Strong password

    console.log(`Creating user: ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: 'admin' }
        }
    });

    if (error) {
        console.error('❌ Error creating user:', error.message);
        if (error.message.includes('already registered')) {
            console.log('⚠️ The user alreade exists. Try logging in with the credentials.');
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }
    } else {
        console.log('✅ User created successfully!');
        console.log('==========================================');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('==========================================');
        if (data.session) {
            console.log('🎉 Session active. Auto-confirm is likely ON.');
        } else if (data.user && !data.session) {
            console.log('⚠️ User created but NO session. Check your email to confirm the account.');
            console.log('   (Or disable "Confirm Email" in Supabase Dashboard > Authentication > Providers > Email)');
        }
    }
}

registerAdmin();
