import { supabaseAdmin } from './src/lib/supabase-admin';

async function checkSchema() {
  const { data } = await supabaseAdmin.from('response_cache').select('*').limit(1);
  console.log(Object.keys(data?.[0] || {}));
}
checkSchema();
