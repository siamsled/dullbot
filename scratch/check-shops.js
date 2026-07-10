const { createClient } = require('@supabase/supabase-js');
// Load dotenv values manually by reading file or run node with dotenv/config if installed
// Since dotenv might not be installed, let's parse .env.local manually
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Credentials missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: shops, error } = await supabase.from('shops').select('*');
  if (error) {
    console.error("Error fetching shops:", error);
    return;
  }
  console.log("Existing shops in db:", shops);

  const existingDullStore = shops.find(s => s.slug === 'dull-store');
  if (!existingDullStore) {
    console.log("dull-store not found, inserting...");
    const { data, error: insertError } = await supabase
      .from('shops')
      .insert({
        name: 'Dull Store',
        slug: 'dull-store',
        onboarding_complete: true,
        agent_enabled: true
      })
      .select();
    if (insertError) {
      console.error("Error inserting dull-store:", insertError);
    } else {
      console.log("Successfully inserted dull-store:", data);
    }
  } else {
    console.log("dull-store already exists!");
  }
}

run();
