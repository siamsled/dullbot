const fs = require('fs');
const envFile = fs.readFileSync('/Users/shah/Documents/GitHub/dullbot/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['\"']|['\"']$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: conv } = await supabase.from('conversations')
    .select('id, customer_phone')
    .eq('shop_id', '84ca459f-b9e3-455d-ab6f-fdb5395c5096')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();
    
  console.log('Active conversation:', conv);
  if (!conv) return;

  const { data: messages } = await supabase.from('messages')
    .select('id, sender, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(15);
    
  console.log('Messages (newest first):');
  messages.forEach(m => {
    console.log(`[${m.created_at}] ${m.sender}: ${m.content}`);
  });
}

run().catch(console.error);
