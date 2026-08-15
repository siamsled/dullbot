import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check each critical table
const checks = ['post_automations', 'post_comments', 'shop_meta_pages', 'shops', 'conversations'];
for (const table of checks) {
  const { data, error } = await supabase.from(table).select('id').limit(1);
  const exists = !error || (error.code !== '42P01' && error.code !== 'PGRST205');
  console.log(`${exists ? '✅' : '❌'} ${table}: ${error ? error.message : `OK (${data?.length || 0} rows checked)`}`);
}

// Also check the post_automations structure
console.log('\n=== post_automations columns (if exists) ===');
const { data: cols, error: colErr } = await supabase.from('post_automations').select('*').limit(0);
if (colErr) {
  console.log('Error:', colErr.message);
} else {
  console.log('Table exists and is accessible');
}
