import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: shops } = await supabase.from('shops').select('id, name');
  console.log('Shops in DB:', shops);

  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('*');

  console.log('Conversations count:', convs?.length, 'Error:', convErr);
  for (const c of convs || []) {
    console.log(`\n=== Conv ID: ${c.id}, Customer: ${c.customer_name || c.meta_name}, Channel: ${c.channel} ===`);
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: true });
    for (const m of msgs || []) {
      console.log(`[${m.sender}]: ${m.content}`);
    }
  }
}

run().catch(console.error);
