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

async function check() {
  console.log('Checking conversations columns...');
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching conversations:', error);
  } else if (data && data.length > 0) {
    console.log('Available columns in conversations:', Object.keys(data[0]));
  } else {
    console.log('No conversations found in the database to inspect.');
    // Let's query from postgres metadata schema
    console.log('Attempting to fetch columns from information_schema via RPC...');
    const { data: cols, error: colErr } = await supabase.rpc('exec_sql', {
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations'"
    });
    if (colErr) {
      console.error('exec_sql failed (expected if not created):', colErr.message);
    } else {
      console.log('Columns:', cols);
    }
  }
}

check();
