import { supabaseAdmin } from '../src/lib/supabase-admin.js';

const PAGE_ID = "1246008781920134";
const SHOP_SLUG = "dull-store";
const SENDER_ID = "test_webhook_user_1234567";

const personasToTest = [
  { id: '59e4eaa3-1e1d-484d-9d94-74d6226a9e3b', name: 'Biplob Uncle' },
  { id: 'd66d5da5-084b-4711-94b4-83f0e9b07925', name: 'Shuvo Bhai' },
  { id: '54fff4d1-e804-4fd7-99d6-06b12590b0be', name: 'Nila' },
  { id: 'b78b75e2-f252-4de3-bc20-2f5c692497e0', name: 'Rakib' }
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function sendWebhookAndGetReply() {
  const payload = {
    object: "page",
    entry: [
      {
        id: PAGE_ID,
        time: Date.now(),
        messaging: [
          {
            sender: { id: SENDER_ID },
            recipient: { id: PAGE_ID },
            timestamp: Date.now(),
            message: {
              mid: "mid.123",
              text: "hi"
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

  if (!res.ok) throw new Error("Webhook failed: " + res.status);
  
  await delay(6000); // Give AI time to process and save to DB

  // Fetch the latest bot message for this user
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('customer_phone', SENDER_ID)
    .single();

  if (!conv) return "No conversation found";

  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('content')
    .eq('conversation_id', conv.id)
    .eq('sender', 'bot')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return msg?.content || "No reply found";
}

async function runTests() {
  console.log("--- Starting Greeting Tests ---");

  for (const persona of personasToTest) {
    console.log(`\nSwapping to Persona: ${persona.name}`);
    
    // Update shop persona
    const { error } = await supabaseAdmin.from('shops').update({ 
      persona_id: persona.id,
      tuning_updated_at: new Date().toISOString() // Force cache invalidation
    }).eq('slug', SHOP_SLUG);
    
    if (error) {
      console.error("Failed to update persona", error);
      continue;
    }
    
    // Delete old test conversation to avoid history bias and reset status
    await supabaseAdmin.from('conversations').delete().eq('customer_phone', SENDER_ID);

    await delay(1000); // Wait for DB

    console.log(`Testing "hi"...`);
    const reply = await sendWebhookAndGetReply();
    console.log(`Reply: ${reply}`);
  }

  console.log("\nTests Complete");
}

runTests().catch(console.error);
