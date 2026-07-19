const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const sql = fs.readFileSync('/Users/shah/.gemini/antigravity-ide/brain/9c7da53e-bebb-4ccb-bd1b-275f1f84091d/run_this_in_supabase_phase13.sql', 'utf-8');

async function run() {
  console.log("Running Phase 13 migration on cloud Supabase via exec_sql...");
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } else {
    console.log("Migration executed successfully!");
    process.exit(0);
  }
}

run();
