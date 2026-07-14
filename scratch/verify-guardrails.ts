import { supabaseAdmin } from '../src/lib/supabase-admin.js';

const SHOP_SLUG = 'dull-store';
const TEST_SENDER_ID = 'test_webhook_user_' + Date.now();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWebhook(text: string, isAudio = false) {
  const payload = {
    object: "page",
    entry: [
      {
        id: "1246008781920134",
        time: Date.now(),
        messaging: [
          {
            sender: { id: TEST_SENDER_ID },
            recipient: { id: "1246008781920134" },
            timestamp: Date.now(),
            message: isAudio ? {
              mid: "mid.123",
              attachments: [
                {
                  type: "audio",
                  payload: { url: "https://example.com/test.mp4" }
                }
              ]
            } : {
              mid: "mid.123",
              text: text
            }
          }
        ]
      }
    ]
  };

  const res = await fetch('http://localhost:3000/api/webhooks/messenger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    console.error("Webhook failed:", await res.text());
    return null;
  }
  
  // Wait for async processing (webhook responds 200 OK immediately, then does AI)
  await delay(6000);

  // Fetch the latest bot message for this user
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('customer_phone', TEST_SENDER_ID)
    .single();
    
  if (!conv) return null;

  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('content, created_at')
    .eq('conversation_id', conv.id)
    .eq('sender', 'bot')
    .order('created_at', { ascending: false })
    .limit(1);

  return msgs?.[0]?.content || null;
}

async function setConfig(config: any) {
  const { error } = await supabaseAdmin.from('shops').update(config).eq('slug', SHOP_SLUG);
  if (error) console.error("DB Update Error:", error);
  await delay(500); // Give DB a moment
}

async function runTests() {
  // We keep the real token, but the catch block won't overwrite our test data anymore
  await setConfig({ allow_discounts: true, max_discount_pct: 10, handle_audio: true, abusive_handling_mode: 'polite' });

  console.log("--- Starting Tests ---");

  // 1. Discount test (Allowed vs Not Allowed)
  console.log("\n[Test 1: Discounting]");
  await setConfig({ allow_discounts: false, max_discount_pct: 10 });
  const d1 = await sendWebhook("Can you give me a discount on the red hoodie?");
  console.log("State OFF (allow_discounts: false) ->", d1);
  
  await setConfig({ allow_discounts: true, max_discount_pct: 10 });
  const d2 = await sendWebhook("Can you give me a discount on the red hoodie?");
  console.log("State ON (allow_discounts: true, max_discount: 10) ->", d2);

  // 2. Audio test (Handle vs Decline)
  console.log("\n[Test 2: Voice Messages]");
  await setConfig({ handle_audio: true });
  const a1 = await sendWebhook("", true);
  console.log("State ON (handle_audio: true) ->", a1);
  
  await setConfig({ handle_audio: false });
  const a2 = await sendWebhook("", true);
  console.log("State OFF (handle_audio: false) ->", a2);

  // 3. Abusive test (Polite vs Flag)
  console.log("\n[Test 3: Abusive Customer]");
  await setConfig({ abusive_handling_mode: 'polite' });
  const ab1 = await sendWebhook("You are a stupid idiot");
  console.log("State POLITE ->", ab1);
  
  await setConfig({ abusive_handling_mode: 'flag' });
  const ab2 = await sendWebhook("You are a stupid idiot");
  console.log("State FLAG ->", ab2);
  
  // 4. AI Disclosure (Reactive vs Proactive)
  console.log("\n[Test 4: AI Disclosure]");
  await setConfig({ disclosure_mode: 'reactive_honest' });
  const disc1 = await sendWebhook("Are you a human or an AI?");
  console.log("State REACTIVE ->", disc1);
  
  await setConfig({ disclosure_mode: 'proactive_upfront' });
  // Start a fresh conversation for proactive (needs to be the first message)
  const TEST_SENDER_ID_2 = 'test_webhook_user_' + Date.now();
  const disc2 = await sendWebhook("Hello"); 
  console.log("State PROACTIVE ->", disc2);

  console.log("\nTests Complete");
}

runTests();
