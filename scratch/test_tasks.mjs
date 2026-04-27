import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('tasks').select('*');
  console.log('Tasks Count:', data?.length);
  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('First task assignee_ids:', data[0].assignee_ids);
    console.log('Type of assignee_ids:', typeof data[0].assignee_ids, Array.isArray(data[0].assignee_ids));
  }
}

check();
