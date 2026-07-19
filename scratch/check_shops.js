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
      if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = match[2].trim().replace(/^"|"$/g, '');
      if (match[1] === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = match[2].trim().replace(/^"|"$/g, '');
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkShops() {
  const { data: shops } = await supabase.from('shops').select('id, name, meta_page_access_token');
  console.log('Shops in database:');
  shops.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Has Token: ${s.meta_page_access_token !== null}`);
  });

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, customer_phone, shop_id, meta_name')
    .eq('customer_phone', '27695249016829924');
  console.log('\nConversation check:');
  console.log(convs);
}

checkShops();
