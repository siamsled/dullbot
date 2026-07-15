const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabaseAdmin.from('shops').select('id, name, meta_page_id, meta_page_access_token');
  console.log(JSON.stringify(data, null, 2));
}
run();
