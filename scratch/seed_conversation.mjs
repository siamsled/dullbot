import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Get shop
  const { data: shop } = await supabase.from('shops').select('id').eq('slug', 'dull-store').single();
  
  if (!shop) {
    console.log("Shop not found");
    return;
  }

  // Create conversation
  const { data: conv } = await supabase.from('conversations').insert({
    shop_id: shop.id,
    customer_phone: 'Siam Sled (Test User)',
    channel: 'messenger',
    status: 'bot_active'
  }).select().single();

  // Insert a message
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    sender: 'customer',
    content: 'Hi! Is the black leather jacket still available?'
  });
  
  // Insert a bot reply
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    sender: 'bot',
    content: 'Hello! Yes, the Black Leather Jacket is currently in stock. Would you like to know the price or available sizes?'
  });

  console.log("Seed complete");
}

run();
