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
const { data: pages } = await supabase
  .from('shop_meta_pages')
  .select('meta_page_id, meta_page_name, meta_page_access_token')
  .eq('shop_id', '2e2d42b7-397f-4098-a943-a484b1bc5c85');

// The key issue: bluberry post is on Dullbot page (1246008781920134)
// Check if it's subscribed to webhook
for (const page of pages || []) {
  console.log(`\n=== ${page.meta_page_name} (${page.meta_page_id}) ===`);
  
  const res = await fetch(`https://graph.facebook.com/v19.0/${page.meta_page_id}/subscribed_apps?access_token=${page.meta_page_access_token}`);
  const data = await res.json();
  const fields = data.data?.[0]?.subscribed_fields || [];
  console.log('Currently subscribed fields:', fields);
  
  const hasFeed = fields.includes('feed');
  const hasMessages = fields.includes('messages');
  
  if (!hasFeed || !hasMessages) {
    console.log('⚠️  Missing required subscriptions! Fixing...');
    const subRes = await fetch(`https://graph.facebook.com/v19.0/${page.meta_page_id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'feed,messages,messaging_postbacks,message_deliveries,message_reads,standby',
        access_token: page.meta_page_access_token,
      }),
    });
    const subData = await subRes.json();
    console.log('Subscribe result:', subData);
    
    // Verify
    const verRes = await fetch(`https://graph.facebook.com/v19.0/${page.meta_page_id}/subscribed_apps?access_token=${page.meta_page_access_token}`);
    const verData = await verRes.json();
    console.log('After fix - fields:', verData.data?.[0]?.subscribed_fields);
  } else {
    console.log('✅ All required subscriptions present');
  }
}

// Also: directly test fetching comments from the bluberry post
console.log('\n=== Testing comment fetch on bluberry post ===');
const dullbotPage = (pages || []).find(p => p.meta_page_id === '1246008781920134');
if (dullbotPage) {
  const postId = '1246008781920134_122117368719382466'; // bluberry
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${postId}/comments?filter=stream&fields=id,message,from,created_time&limit=50&access_token=${dullbotPage.meta_page_access_token}`
  );
  const data = await res.json();
  if (data.error) {
    console.log('❌ Error fetching comments:', data.error.message, '(code:', data.error.code, ')');
  } else {
    console.log(`✅ Found ${data.data?.length || 0} comments on bluberry post`);
    data.data?.forEach(c => console.log(`  [${c.created_time}] ${c.from?.name}: "${c.message}"`));
  }
}
