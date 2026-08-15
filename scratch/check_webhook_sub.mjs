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

async function checkWebhookSetup() {
  const { data: pages } = await supabase
    .from('shop_meta_pages')
    .select('meta_page_id, meta_page_name, meta_page_access_token')
    .not('meta_page_access_token', 'is', null);

  const { data: shop } = await supabase
    .from('shops')
    .select('meta_page_id, meta_page_name, meta_page_access_token')
    .eq('id', '2e2d42b7-397f-4098-a943-a484b1bc5c85')
    .single();

  const allPages = [];
  if (shop?.meta_page_id && shop.meta_page_access_token) {
    allPages.push({ id: shop.meta_page_id, name: shop.meta_page_name, token: shop.meta_page_access_token });
  }
  for (const p of pages || []) {
    if (!allPages.some(x => x.id === p.meta_page_id)) {
      allPages.push({ id: p.meta_page_id, name: p.meta_page_name, token: p.meta_page_access_token });
    }
  }

  for (const page of allPages) {
    console.log(`\n=== Page: ${page.name} (${page.id}) ===`);

    // Check page subscribed_fields
    const subRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps?access_token=${page.token}`);
    const subData = await subRes.json();
    console.log('Subscribed apps/webhooks:', JSON.stringify(subData, null, 2));

    // Try to subscribe page to feed + comments
    console.log('\nAttempting to subscribe page to feed + comments...');
    const subscribeRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'feed,messages,message_reactions',
        access_token: page.token,
      }),
    });
    const subscribeData = await subscribeRes.json();
    console.log('Subscribe result:', JSON.stringify(subscribeData, null, 2));

    // Verify after subscribing
    const verifyRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps?access_token=${page.token}`);
    const verifyData = await verifyRes.json();
    console.log('After subscribe - subscribed fields:', JSON.stringify(verifyData, null, 2));
  }
}

checkWebhookSetup();
