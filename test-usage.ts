import { supabaseAdmin } from './src/lib/supabase-admin';

async function check() {
  const { data } = await supabaseAdmin.from('usage_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Latest usage logs:", JSON.stringify(data, null, 2));
}

check();
