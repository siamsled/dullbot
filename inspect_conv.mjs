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
  const { data: targetMsg } = await supabase
    .from('messages')
    .select('*')
    .eq('id', '5920257b-4d70-4bce-8db4-0d9b25e02ec9')
    .single();

  console.log('Target message:', targetMsg);
  if (!targetMsg) return;

  const { data: allMsgs } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', targetMsg.conversation_id)
    .order('created_at', { ascending: true });

  console.log(`\n=== Total ${allMsgs.length} messages in conversation ${targetMsg.conversation_id} ===`);
  for (const m of allMsgs) {
    console.log(`[${m.sender}] (${m.created_at}) id: ${m.id} -> ${JSON.stringify(m.content)}`);
  }
}

run().catch(console.error);
