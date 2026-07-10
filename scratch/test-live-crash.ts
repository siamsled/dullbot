import './load-env.js';
import { processIncomingMessage } from '../src/lib/chat-pipeline';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testLiveCrash() {
  const shopSlug = 'dull-store';
  const customerPhone = '27695249016829924';

  // Ensure conversation status is bot_active
  await supabase.from('conversations')
    .update({ status: 'bot_active' })
    .eq('customer_phone', customerPhone);

  console.log("Triggering reply for 'kya be bangi'...");
  const result1 = await processIncomingMessage(shopSlug, customerPhone, 'kya be bangi', 'messenger');
  console.log("Result 1:", result1);

  console.log("Triggering reply for 'ki kos buji nai'...");
  const result2 = await processIncomingMessage(shopSlug, customerPhone, 'ki kos buji nai', 'messenger');
  console.log("Result 2:", result2);
}

testLiveCrash();
