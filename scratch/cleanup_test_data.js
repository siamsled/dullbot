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

async function run() {
  console.log('Cleaning up TEST_ conversations via client...');
  
  // 1. Delete where customer_phone starts with TEST_
  const { data: d1, error: e1 } = await supabase
    .from('conversations')
    .delete()
    .like('customer_phone', 'TEST_%');
    
  if (e1) console.error('Error 1:', e1);
  else console.log('Cleaned up customer_phone starting with TEST_');

  // 2. Delete where customer_phone starts with test_
  const { data: d2, error: e2 } = await supabase
    .from('conversations')
    .delete()
    .like('customer_phone', 'test_%');
    
  if (e2) console.error('Error 2:', e2);
  else console.log('Cleaned up customer_phone starting with test_');
  
  // 3. Delete where customer_phone starts with test-sender-
  const { data: d3, error: e3 } = await supabase
    .from('conversations')
    .delete()
    .like('customer_phone', 'test-sender-%');
    
  if (e3) console.error('Error 3:', e3);
  else console.log('Cleaned up customer_phone starting with test-sender-');
}

run();
