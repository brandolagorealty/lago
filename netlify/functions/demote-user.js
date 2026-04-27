// netlify/functions/demote-user.js
// Degrada un superadmin a asesor. Solo puede ser ejecutado por otro superadmin.
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { roleId } = JSON.parse(event.body || '{}');

    if (!roleId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Role ID is required.' }) };
    }

    const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar que el llamante es superadmin
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No token provided.' }) };
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
        return { statusCode: 401, body: JSON.stringify({ error: `Unauthorized: Invalid token.` }) };
    }

    const { data: callerRole, error: callerRoleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerUser.id)
        .single();

    if (callerRoleError || !callerRole || callerRole.role !== 'superadmin') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only superadmins can demote users.' }) };
    }

    // Evitar que un superadmin se degrade a sí mismo
    const { data: targetRole } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('id', roleId)
        .single();

    if (targetRole && targetRole.user_id === callerUser.id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No puedes degradarte a ti mismo.' }) };
    }

    // Degradar de superadmin → asesor
    const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'asesor' })
        .eq('id', roleId);

    if (updateError) {
        console.error('Supabase demote error:', updateError);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: updateError.message })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'User demoted to asesor successfully.' })
    };
};
