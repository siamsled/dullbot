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

const sql = `
-- Add columns to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_profile_pic TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_checked_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_summary JSONB;

-- Mark conversations starting with TEST_ or test_ as test data
UPDATE conversations 
SET is_test = true 
WHERE customer_phone LIKE 'TEST_%' 
   OR customer_phone LIKE 'test_%'
   OR customer_phone LIKE 'test-sender-%';

-- Enable Realtime for conversations, messages and orders if not already done
-- (Supabase cli does this via publication, let's verify or add safely)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;
`;

async function run() {
  console.log('Running RPC exec_sql...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error executing SQL migration:', error);
  } else {
    console.log('Migration successful. Columns added and existing test records marked.');
    
    // Now let's perform cleanup: delete test conversations
    console.log('Deleting test conversations...');
    const { data: delData, error: delError } = await supabase
      .from('conversations')
      .delete()
      .eq('is_test', true);
      
    if (delError) {
      console.error('Error deleting test data:', delError);
    } else {
      console.log('Test data cleaned up successfully.');
    }
  }
}

run();
