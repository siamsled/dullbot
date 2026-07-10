import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkCache() {
  const { data: cache } = await supabase.from('response_cache').select('*');
  console.log("Cache entries:", cache);
}

checkCache();
