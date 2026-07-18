const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = '/Users/shah/Documents/GitHub/dullbot/.env.local';
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['\"']|['\"']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const migrations = [
    '20260718000500_add_widget_enabled.sql',
    '20260718000600_analytics_columns.sql'
  ];

  for (const m of migrations) {
    const file = path.join('/Users/shah/Documents/GitHub/dullbot/supabase/migrations', m);
    console.log(`Reading migration file: ${file}`);
    const sql = fs.readFileSync(file, 'utf8');
    
    console.log(`Running remote migration for ${m}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Migration ${m} failed:`, error);
    } else {
      console.log(`Migration ${m} executed successfully!`);
    }
  }
}

run().catch(console.error);
