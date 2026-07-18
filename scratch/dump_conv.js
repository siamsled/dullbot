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
  const { data: messages } = await supabase.from('messages')
    .select('*')
    .eq('conversation_id', '80373a54-adf2-404b-a41d-5f336f0c26dd')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log('All messages in conversation:');
  messages.forEach(m => console.log(`[${m.created_at}] ${m.sender}: ${m.content}`));
}

run().catch(console.error);
