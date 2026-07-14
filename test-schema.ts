import { supabaseAdmin } from './src/lib/supabase-admin';

async function check() {
  const { data, error } = await supabaseAdmin.from('messages').select('id, conversation_id, sender, content, created_at').limit(1);
  console.log("Messages test:", JSON.stringify(data, null, 2), error);
}

check();
