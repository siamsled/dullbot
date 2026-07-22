import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_change_type_check;
    ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_change_type_check CHECK (change_type IN ('order', 'manual_adjust', 'restock', 'import', 'initial_stock', 'audit'));
  `;
  
  // Try via rpc or raw pg if available, or postgres execution
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.log("RPC exec_sql error (expected if not installed):", error.message);
  } else {
    console.log("RPC exec_sql success!");
  }
}

run();
