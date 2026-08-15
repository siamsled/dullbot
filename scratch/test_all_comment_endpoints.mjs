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

async function test() {
  const { data: pages } = await supabase.from('shop_meta_pages').select('*').eq('shop_id', '2e2d42b7-397f-4098-a943-a484b1bc5c85');
  const dullbot = pages.find(p => p.meta_page_id === '1246008781920134');
  const token = dullbot.meta_page_access_token;
  const pageId = '1246008781920134';
  const fullPostId = '1246008781920134_122117368719382466';
  const cleanPostId = '122117368719382466';

  console.log('Testing page token on Dullbot page:', pageId);

  const tests = [
    `https://graph.facebook.com/v19.0/${fullPostId}/comments?access_token=${token}`,
    `https://graph.facebook.com/v19.0/${cleanPostId}/comments?access_token=${token}`,
    `https://graph.facebook.com/v19.0/${fullPostId}?fields=comments&access_token=${token}`,
    `https://graph.facebook.com/v19.0/${cleanPostId}?fields=comments&access_token=${token}`,
    `https://graph.facebook.com/v19.0/${pageId}_${cleanPostId}/comments?filter=stream&access_token=${token}`,
    `https://graph.facebook.com/v19.0/${pageId}/feed?fields=id,message,comments{id,message,from,created_time}&access_token=${token}`,
    `https://graph.facebook.com/v19.0/${pageId}/published_posts?fields=id,message,comments{id,message,from,created_time}&access_token=${token}`,
    `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,comments{id,message,from,created_time}&access_token=${token}`
  ];

  for (const url of tests) {
    console.log('\n--- GET:', url.replace(token, '[TOKEN]'));
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log('Result:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Err:', e.message);
    }
  }
}

test();
