const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function run() {
  const { data: shop } = await supabase
    .from('shops')
    .select('id, tuning_updated_at, credit_balance')
    .eq('slug', 'dull-store')
    .single();
  console.log("Shop Info:", shop);

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, status')
    .eq('customer_phone', '27695249016829924')
    .single();
  console.log("Conversation Info:", conv);

  let historyQuery = supabase
    .from('messages')
    .select('sender, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false });

  if (shop.tuning_updated_at) {
    historyQuery = historyQuery.gt('created_at', shop.tuning_updated_at);
  }

  const { data: history } = await historyQuery.limit(10);
  console.log("Gated History:", history);
}

run();
