import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://scdztnzkzrvjgyefunkw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZHp0bnprenpydmpneWVmdW5rdyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5MTUwNjkyLCJleHAiOjIwNTQ3MjY2OTJ9.6c43zV2o2cItm90uA1oQ3cQQVw6-pT2X68pA2v1h5D0'
);

async function test() {
  const { data, error } = await supabaseAdmin.auth.getUser('undefined');
  console.log("Error for 'undefined':", error?.message);

  const { data: d2, error: e2 } = await supabaseAdmin.auth.getUser('null');
  console.log("Error for 'null':", e2?.message);
}

test();
