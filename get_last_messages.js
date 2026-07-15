const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabaseAdmin.from('messages').select('sender, content, created_at').order('created_at', { ascending: false }).limit(6);
  console.log(JSON.stringify(data, null, 2));
}
run();
