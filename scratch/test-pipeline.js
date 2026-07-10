require('dotenv').config({ path: '.env.local' });
const { processMessage } = require('./src/lib/chat-pipeline');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPipeline() {
  const { data: shop } = await supabase.from('shops').select('id, slug').eq('slug', 'dull-store').single();
  const { data: conversation, error: convError } = await supabase.from('conversations').insert({
    shop_id: shop.id,
    customer_id: 'test-cust',
    platform: 'mock',
    channel_id: 'mock-123',
    status: 'bot_active'
  }).select().single();
  
  if (convError) {
    console.error("conv error", convError);
    return;
  }
  
  console.log("Processing message...");
  const result = await processMessage('dull-store', conversation.id, 'kire lewra');
  console.log("Result:", result);
}

testPipeline();
