import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: convs, error: cErr } = await supabase.from('conversations').select('*');
  console.log("Conversations:", convs);
  
  const { data: msgs, error: mErr } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Latest Messages:", msgs);
}

run();
