import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  console.log('=== Step 1: Checking DB for Duplicate Pages ===');
  const { data: pages } = await supabaseAdmin.from('shop_meta_pages').select('*');
  const counts: Record<string, number> = {};
  for (const p of pages || []) {
    counts[p.meta_page_id] = (counts[p.meta_page_id] || 0) + 1;
  }
  const dupes = Object.entries(counts).filter(([, c]) => c > 1);
  if (dupes.length === 0) {
    console.log('  SUCCESS: No duplicate meta_page_id entries found in DB! ✓');
  } else {
    console.error('  FAIL: Duplicates found:', dupes);
  }

  console.log('\n=== Step 2: Testing /api/webhooks/health endpoint ===');
  try {
    const res = await fetch('https://dullbot.vercel.app/api/webhooks/health');
    const health = await res.json();
    console.log('  Health Endpoint HTTP Status:', res.status);
    console.log('  App Subscriptions:', JSON.stringify(health.app_subscriptions));
    console.log('  Pages Status:', JSON.stringify(health.pages, null, 2));
  } catch (e: any) {
    console.error('  Health check error:', e.message);
  }

  console.log('\n=== Step 3: End-to-End Instagram DM Webhook Simulation ===');
  const igPayload = {
    object: 'instagram',
    entry: [{
      id: '17841437399145417',
      time: Math.floor(Date.now() / 1000),
      messaging: [{
        sender: { id: 'ig_verify_test_sender_123' },
        recipient: { id: '17841437399145417' },
        timestamp: Math.floor(Date.now() / 1000),
        message: { mid: 'verify_ig_mid_' + Date.now(), text: 'BULLETPROOF VERIFICATION IG TEST' }
      }]
    }]
  };

  const igRes = await fetch('https://dullbot.vercel.app/api/webhooks/messenger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(igPayload)
  });
  console.log('  IG Webhook POST status:', igRes.status, await igRes.text());

  // Wait 2s for DB write
  await new Promise(r => setTimeout(r, 2000));

  const { data: igConv } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('customer_phone', 'ig_verify_test_sender_123')
    .single();

  if (igConv) {
    console.log('  SUCCESS: Instagram DM conversation created in DB! ✓', igConv.id);
    // Cleanup
    await supabaseAdmin.from('messages').delete().eq('conversation_id', igConv.id);
    await supabaseAdmin.from('conversations').delete().eq('id', igConv.id);
  } else {
    console.error('  FAIL: Instagram DM conversation not found!');
  }

  console.log('\n=== Step 4: End-to-End Facebook Messenger Webhook Simulation ===');
  const fbPayload = {
    object: 'page',
    entry: [{
      id: '1246008781920134',
      time: Math.floor(Date.now() / 1000),
      messaging: [{
        sender: { id: 'fb_verify_test_sender_123' },
        recipient: { id: '1246008781920134' },
        timestamp: Math.floor(Date.now() / 1000),
        message: { mid: 'verify_fb_mid_' + Date.now(), text: 'BULLETPROOF VERIFICATION FB TEST' }
      }]
    }]
  };

  const fbRes = await fetch('https://dullbot.vercel.app/api/webhooks/messenger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fbPayload)
  });
  console.log('  FB Webhook POST status:', fbRes.status, await fbRes.text());

  // Wait 2s for DB write
  await new Promise(r => setTimeout(r, 2000));

  const { data: fbConv } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('customer_phone', 'fb_verify_test_sender_123')
    .single();

  if (fbConv) {
    console.log('  SUCCESS: Facebook Messenger conversation created in DB! ✓', fbConv.id);
    // Cleanup
    await supabaseAdmin.from('messages').delete().eq('conversation_id', fbConv.id);
    await supabaseAdmin.from('conversations').delete().eq('id', fbConv.id);
  } else {
    console.error('  FAIL: Facebook Messenger conversation not found!');
  }
}

main().catch(console.error);
