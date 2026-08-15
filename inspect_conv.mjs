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
  const { data: etaMsgs, error } = await supabase
    .from('messages')
    .select('*')
    .ilike('content', '%eta%');

  console.log('Found eta messages:', etaMsgs?.length, 'Error:', error);
  for (const m of etaMsgs || []) {
    console.log('\n--- Message ID:', m.id, 'Sender:', m.sender, 'Created:', m.created_at, 'Conv ID:', m.conversation_id);
    console.log('Full Raw Content:', m.content);

    // Fetch surrounding messages in this conversation
    const { data: surrounding } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', m.conversation_id)
      .order('created_at', { ascending: true });

    console.log('\n--- Full conversation history (' + surrounding?.length + ' messages) ---');
    for (const s of surrounding || []) {
      console.log(`[${s.sender}] (${s.created_at}): ${JSON.stringify(s.content)}`);
    }
  }
}

run().catch(console.error);
