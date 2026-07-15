const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  await supabaseAdmin.from('conversations').update({ status: 'bot_active', ticket_reason: null }).eq('status', 'human_takeover');
  console.log("Fixed status");
}
run();
