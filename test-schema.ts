import { supabaseAdmin } from './src/lib/supabase-admin';

async function checkSchema() {
  const { data } = await supabaseAdmin.from('conversations').select('*').limit(1);
  console.log(Object.keys(data?.[0] || {}));
}
checkSchema();
