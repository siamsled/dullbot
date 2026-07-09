import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: convs } = await supabase.from('conversations').select('id, customer_phone, last_message_at');
  console.log("Conversations last_message_at:", convs);
}
run();
