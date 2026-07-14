

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/messenger';

// Use standard test payloads based on Facebook Messenger format
function buildPayload(pageId, senderId, text) {
  return {
    object: 'page',
    entry: [{
      id: pageId,
      messaging: [{
        sender: { id: senderId },
        message: { text: text }
      }]
    }]
  };
}

async function runTest() {
  // Use a known page ID and sender ID from the dullbot db
  // Usually tests use a fake sender like 'test_sender_999'
  // But the webhook needs a valid mapped pageId to find the shop
  // I will just use 'test_page' and assume there's a shop with meta_page_id 'test_page', 
  // or I can fetch a valid page_id from the DB first.
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: shop } = await supabase.from('shops').select('meta_page_id').not('meta_page_id', 'is', null).limit(1).single();
  
  if (!shop) {
    console.error("No shop found with a meta_page_id configured.");
    return;
  }
  
  const pageId = shop.meta_page_id;
  const senderId = 'test_sender_concurrency_999';
  
  console.log(`Starting concurrency test against page ID: ${pageId}`);

  // Send first request
  console.log(`[${new Date().toISOString()}] Sending Request 1: "Hello, tell me a long story"`);
  const req1 = fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(pageId, senderId, 'Hello, tell me a long story about leather jackets'))
  });

  // Wait 1 second to ensure req1 starts processing and acquires lock
  await new Promise(r => setTimeout(r, 1000));

  // Send second request
  console.log(`[${new Date().toISOString()}] Sending Request 2: "price pls"`);
  const req2 = fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(pageId, senderId, 'price pls'))
  });

  // Wait for both
  await Promise.all([
    req1.then(r => r.text()).then(t => console.log(`[${new Date().toISOString()}] Req 1 completed:`, t)),
    req2.then(r => r.text()).then(t => console.log(`[${new Date().toISOString()}] Req 2 completed:`, t))
  ]);
  
  console.log("Test finished.");
}

runTest().catch(console.error);
