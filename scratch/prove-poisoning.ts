import './load-env.js';
import { processIncomingMessage } from '../src/lib/chat-pipeline';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testPoisoning() {
  const { data: shop } = await supabase.from('shops').select('id, slug, credit_balance').eq('slug', 'dull-store').single();
  
  // Clear the cache completely
  await supabase.from('response_cache').delete().eq('shop_id', shop!.id);

  console.log("Sending message on a BRAND NEW customer phone (empty history)...");
  const result = await processIncomingMessage('dull-store', 'brand-new-phone', 'ki ki bechos tui', 'mock');
  console.log("Result (Empty History):", result.message);
}

testPoisoning();
