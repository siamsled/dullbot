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
  const { data: conversations, error } = await supabase.from('conversations').select('id, customer_phone, status, created_at');
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log('Conversations count:', conversations.length);
  console.log(JSON.stringify(conversations, null, 2));
}

run().catch(console.error);
