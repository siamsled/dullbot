import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: shop } = await supabase.from('shops').select('meta_page_access_token, meta_page_id').eq('slug', 'dull-store').single();
  
  if (!shop) return console.error("Shop not found");

  const res = await fetch(`https://graph.facebook.com/v19.0/${shop.meta_page_id}?access_token=${shop.meta_page_access_token}`);
  const data = await res.json();
  console.log("Facebook Token Status:", data);
}

run();
