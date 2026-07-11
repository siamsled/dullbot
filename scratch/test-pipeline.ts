import './load-env.js';
import { processIncomingMessage } from '../src/lib/chat-pipeline';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testPipeline() {
  const { data: shop } = await supabase.from('shops').select('id, slug, credit_balance').eq('slug', 'dull-store').single();
  
  // Clear the cache completely
  await supabase.from('response_cache').delete().eq('shop_id', shop!.id);

  // Set the conversation status back to bot_active if it was human_takeover
  await supabase.from('conversations').update({ status: 'bot_active' }).eq('customer_phone', 'test-phone-123');
  await supabase.from('conversations').update({ status: 'bot_active' }).eq('customer_phone', 'test-phone-456');

  console.log("Processing message: ki ki ache chobi din...");
  const result = await processIncomingMessage('dull-store', 'test-phone-456', 'ki ki ache chobi din', 'mock');
  console.log("\n--- AI RESPONSE ---");
  console.log(result.message);
  console.log("-------------------\n");
}

testPipeline();
