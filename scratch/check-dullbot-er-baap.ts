import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDullbotErBaap() {
  const { data: messages } = await supabase.from('messages')
    .select('*')
    .eq('conversation_id', 'f8b18b05-a382-4c8a-bdfd-7b4909fff979')
    .order('created_at', { ascending: true });
    
  console.log("Messages:");
  if (messages) {
    messages.forEach(m => console.log(`[${m.created_at}] ${m.sender}: ${m.content}`));
  }
}

checkDullbotErBaap();
