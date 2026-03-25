// netlify/functions/invite-user.js
// This serverless function securely invites a new team member using the Supabase Admin API.
// The SUPABASE_SERVICE_ROLE_KEY is stored safely in Netlify environment variables.

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
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
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Invalid token.' }) };
    }

    // Check if the calling user is a superadmin
    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUser.id)
        .single();

    if (roleError || !roleData || roleData.role !== 'superadmin') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only superadmins can invite users.' }) };
    }

    // All checks passed — invite the user using the Supabase Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.URL}/admin`, // Netlify automatically sets the URL env var
    });

    if (inviteError) {
        console.error('Supabase invite error:', inviteError);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: inviteError.message })
        };
    }

    // Insert the new user's role as 'asesor' in the user_roles table
    const newUserId = inviteData?.user?.id;
    if (newUserId) {
        await supabaseAdmin
            .from('user_roles')
            .insert([{ user_id: newUserId, email: email, role: 'asesor' }]);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: `Invitation sent to ${email}` })
    };
};
