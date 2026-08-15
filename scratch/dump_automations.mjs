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

// Show ALL post_automations rows
const { data: allPosts, error } = await supabase.from('post_automations').select('*');
console.log('=== ALL post_automations rows ===');
if (error) console.error('Error:', error);
else if (!allPosts?.length) console.log('  EMPTY');
else allPosts.forEach(p => {
  console.log(`\n  ID: ${p.id}`);
  console.log(`  shop_id: ${p.shop_id}`);
  console.log(`  post_id: ${p.post_id}`);
  console.log(`  meta_post_id: ${p.meta_post_id}`);
  console.log(`  caption: ${p.caption}`);
  console.log(`  is_active: ${p.is_active}`);
  console.log(`  created_at: ${p.created_at}`);
});

// Show shop IDs
const { data: shops } = await supabase.from('shops').select('id, name, meta_page_id').limit(5);
console.log('\n=== Shops ===');
shops?.forEach(s => console.log(`  ${s.id} - ${s.name} (page: ${s.meta_page_id})`));

// Show shop_meta_pages
const { data: metaPages } = await supabase.from('shop_meta_pages').select('*').limit(5);
console.log('\n=== shop_meta_pages ===');
metaPages?.forEach(p => console.log(`  shop_id: ${p.shop_id}, page_id: ${p.meta_page_id}, name: ${p.meta_page_name}`));
