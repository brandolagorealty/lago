
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
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

    console.log('Testing connection to:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function check() {
        // 1. Verificar si existe la tabla insertando un dummy (que fallará por validación o RLS si existe, o por "table not found" si no)
        // Mejor: intentar hacer un select simple
        const { data, error } = await supabase
            .from('properties')
            .select('count')
            .limit(1);

        if (error) {
            console.log('❌ Error de conexión/tabla:', error.message);
            console.log('Code:', error.code);
            if (error.code === '42P01') {
                console.log('👉 CONCLUSIÓN: La tabla "properties" NO existe. Debes correr el script SQL.');
            } else if (error.code === '42501') {
                console.log('👉 CONCLUSIÓN: Error de permisos (RLS). Revisa las políticas de seguridad.');
            }
        } else {
            console.log('✅ Conexión exitosa. La tabla "properties" existe.');
        }
    }

    check();

} catch (err) {
    console.error('Error leyendo .env.local', err);
}
