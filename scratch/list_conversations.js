const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, content, fb_message_ids, created_at')
    .eq('conversation_id', 'f8b18b05-a382-4c8a-bdfd-7b4909fff979')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Messages in conversation:');
    console.log(JSON.stringify(data, null, 2));
  }
}

listMessages();
