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

const sqlPath = path.join(__dirname, '../supabase/migrations/20260719001100_scheduling_additions.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  console.log('Running scheduling additions migration (Phase A/B/C) via exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Migration execution failed:', error.message);
    console.log('\n============================================================');
    console.log('PLEASE APPLY THE SCHEMA MANUALLY via Supabase SQL Editor:');
    console.log('Use: /Users/shah/Documents/GitHub/dullbot/supabase/migrations/20260719001100_scheduling_additions.sql');
    console.log('============================================================\n');
  } else {
    console.log('Scheduling additions migration executed successfully via RPC!');
  }
}

run();
