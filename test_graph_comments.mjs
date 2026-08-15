import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, meta_page_id, meta_page_name, meta_page_access_token');
  
  const { data: metaPages } = await supabase.from('shop_meta_pages').select('*');

  console.log('Shops:', shops?.map(s => ({ name: s.name, pageId: s.meta_page_id, hasToken: !!s.meta_page_access_token })));
  console.log('Meta Pages:', metaPages?.map(p => ({ name: p.meta_page_name, pageId: p.meta_page_id, hasToken: !!p.meta_page_access_token })));

  const allTokens = [
    ...(shops || []).map(s => ({ name: s.name, pageId: s.meta_page_id, token: s.meta_page_access_token })),
    ...(metaPages || []).map(p => ({ name: p.meta_page_name, pageId: p.meta_page_id, token: p.meta_page_access_token })),
  ].filter(t => !!t.token);

  for (const t of allTokens) {
    console.log(`\n=== Testing Page ${t.name} (${t.pageId}) ===`);
    // 1. Fetch posts
    const postRes = await fetch(`https://graph.facebook.com/v19.0/${t.pageId}/posts?fields=id,message,created_time,permalink_url&limit=10&access_token=${t.token}`);
    const postData = await postRes.json();
    console.log('Posts response:', JSON.stringify(postData, null, 2));

    if (postData.data) {
      for (const p of postData.data) {
        console.log(`\n--- Fetching Comments for Post ${p.id} (${p.message}) ---`);
        const commentRes = await fetch(`https://graph.facebook.com/v19.0/${p.id}/comments?fields=id,message,from,created_time&limit=25&access_token=${t.token}`);
        const commentData = await commentRes.json();
        console.log('Comments on', p.id, ':', JSON.stringify(commentData, null, 2));

        // Also test filter=stream
        const streamRes = await fetch(`https://graph.facebook.com/v19.0/${p.id}/comments?filter=stream&fields=id,message,from,created_time&limit=25&access_token=${t.token}`);
        const streamData = await streamRes.json();
        console.log('Stream Comments on', p.id, ':', JSON.stringify(streamData, null, 2));
      }
    }
  }
}

run().catch(console.error);
