import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
  const { data, error } = await supabaseAdmin.from('shops').select('slug');
  console.log('Shops:', data);
  console.log('Error:', error);
}
run();
