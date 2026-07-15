const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabaseAdmin.from('messages').select('content, created_at').like('content', '%SYSTEM ERROR%').order('created_at', { ascending: false }).limit(2);
  console.log(JSON.stringify(data, null, 2));
}
run();
