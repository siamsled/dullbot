const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const shopId = '84ca459f-b9e3-455d-ab6f-fdb5395c5096';
  const { data: shop } = await supabaseAdmin.from('shops').select('meta_page_access_token').eq('id', shopId).single();
  
  // Find a recent conversation to get a valid customer_phone
  const { data: conv } = await supabaseAdmin.from('conversations').select('customer_phone').eq('shop_id', shopId).limit(1).single();
  
  const token = shop.meta_page_access_token;
  const psid = conv.customer_phone;
  
  console.log(`Sending to PSID: ${psid}`);
  
  const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: psid },
      message: { text: "Test message from API" }
    })
  });
  
  const result = await fbRes.json();
  console.log(result);
}
run();
