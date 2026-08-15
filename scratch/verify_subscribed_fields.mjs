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

async function checkSub() {
  const { data: pages } = await supabase.from('shop_meta_pages').select('*').eq('shop_id', '2e2d42b7-397f-4098-a943-a484b1bc5c85');
  for (const page of pages || []) {
    console.log(`\nPage: ${page.meta_page_name} (${page.meta_page_id})`);
    const subRes = await fetch(`https://graph.facebook.com/v19.0/${page.meta_page_id}/subscribed_apps?access_token=${page.meta_page_access_token}`);
    const subData = await subRes.json();
    console.log('Subscribed fields:', JSON.stringify(subData, null, 2));
  }
}

checkSub();
