import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function resetConversations() {
  const { data: shop } = await supabase.from('shops').select('id, slug').eq('slug', 'dull-store').single();
  
  if (shop) {
    console.log("Closing all active conversations for Dull Store to force a fresh history...");
    const { error } = await supabase.from('conversations')
      .update({ status: 'closed' })
      .eq('shop_id', shop.id)
      .neq('status', 'closed');
      
    if (error) {
      console.error("Failed to close conversations:", error);
    } else {
      console.log("Successfully closed conversations. The next message from ANY user will start a brand new context window.");
    }
  }
}

resetConversations();
