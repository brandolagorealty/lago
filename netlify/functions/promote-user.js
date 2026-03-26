// netlify/functions/promote-user.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { roleId } = JSON.parse(event.body || '{}');

    if (!roleId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Role ID is required.' }) };
    }

    // Initialize admin Supabase client with the secret service role key
    const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the calling user is a superadmin
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No token provided.' }) };
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid token.' }) };
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUser.id)
        .single();

    if (roleError || !roleData || roleData.role !== 'superadmin') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only superadmins can promote users.' }) };
    }

    // All checks passed — update the user role
    const { data: updateData, error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'superadmin' })
        .eq('id', roleId);

    if (updateError) {
        console.error('Supabase update error:', updateError);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: updateError.message })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `User promoted successfully.` })
    };
};
