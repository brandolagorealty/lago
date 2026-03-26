import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: users, error: selectErr } = await supabaseAdmin.from('user_roles').select('*');
  if (selectErr) {
    console.error('Select error:', selectErr);
    return;
  }
  
  // Try to update using service role (bypass RLS) works.
  console.log('Got users via service role:', users.length);
}

test();
