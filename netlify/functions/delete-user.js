// netlify/functions/delete-user.js
// This serverless function securely deletes a user using the Supabase Admin API.
// The SUPABASE_SERVICE_ROLE_KEY is stored safely in Netlify environment variables.

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { userId } = JSON.parse(event.body || '{}');

    if (!userId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'User ID is required.' }) };
    }

    // Initialize admin Supabase client with the secret service role key
    const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the calling user is a superadmin (check their JWT)
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No token provided.' }) };
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
        return { statusCode: 401, body: JSON.stringify({ error: `Unauthorized: Invalid token. Details: ${authError?.message || 'User not found in token'}` }) };
    }

    // Check if the calling user is a superadmin
    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUser.id)
        .single();

    if (roleError || !roleData || roleData.role !== 'superadmin') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only superadmins can delete users.' }) };
    }

    // All checks passed — delete the user using the Supabase Admin API
    const { data: deleteData, error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: deleteError.message })
        };
    }

    // Limpiar el registro huérfano en user_roles
    const { error: roleCleanupError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

    if (roleCleanupError) {
        console.warn('User deleted from auth but failed to clean user_roles:', roleCleanupError.message);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `User deleted successfully.` })
    };
};
