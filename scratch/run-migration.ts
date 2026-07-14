import { supabaseAdmin } from '../src/lib/supabase-admin.js';

async function run() {
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;"
  });
  if (error) {
    console.error('Error running migration via RPC:', error);
    // If RPC is not available, we can just do a direct pg call if we had the connection string,
    // but typically you can't run DDL via PostgREST unless there's an rpc.
    // Let's just see if this works.
  } else {
    console.log('Migration successful via RPC');
  }
}
run();
