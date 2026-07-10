import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function dumpMessages() {
  const { data: shop } = await supabase.from('shops').select('id, slug').eq('slug', 'dull-store').single();
  const { data: conversations } = await supabase.from('conversations').select('id, customer_phone').eq('shop_id', shop!.id);
  
  if (conversations) {
    for (const conv of conversations) {
      console.log(`\n--- Conversation with ${conv.customer_phone} ---`);
      const { data: messages } = await supabase.from('messages')
        .select('sender, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
        
      if (messages) {
        messages.forEach(m => console.log(`[${m.created_at}] ${m.sender}: ${m.content}`));
      }
    }
  }
}

dumpMessages();
