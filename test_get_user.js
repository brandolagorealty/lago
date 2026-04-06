import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Setup a dummy admin client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY // just use anon key for testing error codes
);

async function test() {
  console.log("Testing with bogus token...");
  const { data, error } = await supabaseAdmin.auth.getUser('bogus_token.which.fails');
  console.log("Bogus token error:", error?.message);

  console.log("Testing with 'bearer ' token...");
  const { data: d2, error: e2 } = await supabaseAdmin.auth.getUser('bearer eyJhbGciOiJIUzI');
  console.log("Bearer token error:", e2?.message);
}

test();
