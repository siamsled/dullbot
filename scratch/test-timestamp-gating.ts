import './load-env.js';
import { processIncomingMessage } from '../src/lib/chat-pipeline';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testTimestampGating() {
  const shopSlug = 'dull-store';
  const customerPhone = 'test-mid-conv';
  
  const { data: shop } = await supabase.from('shops').select('id, slug').eq('slug', shopSlug).single();
  
  // 1. Create a conversation and add some old "poisoned" messages
  // First clear any existing conversation for this test phone
  await supabase.from('conversations').delete().eq('customer_phone', customerPhone);
  
  const { data: conversation } = await supabase.from('conversations').insert({
    shop_id: shop!.id,
    customer_phone: customerPhone,
    channel: 'mock'
  }).select().single();
  
  // Insert poisoned history (from BEFORE tuning update)
  const oldTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  await supabase.from('messages').insert([
    { conversation_id: conversation!.id, sender: 'customer', content: 'kire lewra', created_at: oldTime },
    { conversation_id: conversation!.id, sender: 'bot', content: 'Sorry bhai, onno kothao busy chhilam na, just ektu late hoye gelo reply dite. Ami Dull Store theke bolchi, apnar somossa ta khule bolun, ami shob thik kore deyar chesta korchi. Ki dorkar bolen?', created_at: oldTime }
  ]);
  
  console.log("Mid-conversation setup complete with poisoned history.");
  
  // 2. Simulate User clicking "Save AI Settings"
  // This updates tuning_updated_at to NOW
  console.log("Simulating 'Save AI Settings' click (updates tuning_updated_at)...");
  await supabase.from('shops').update({ tuning_updated_at: new Date().toISOString() }).eq('id', shop!.id);
  
  // Wait a second to ensure timestamps are strictly greater
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Send a new message mid-conversation
  console.log("Sending new message mid-conversation...");
  const result = await processIncomingMessage(shopSlug, customerPhone, 'ki ki bechos tui', 'mock');
  
  console.log("Result (Should be formal English, ignoring the poisoned history):");
  console.log(result.message);
}

testTimestampGating();
