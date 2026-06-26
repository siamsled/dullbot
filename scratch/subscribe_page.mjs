import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: shop, error } = await supabase.from('shops').select('meta_page_id, meta_page_access_token').eq('slug', 'dull-store').single();
  
  if (error || !shop) {
    console.error("Error fetching shop", error);
    return;
  }
  
  const pageId = shop.meta_page_id;
  const pageAccessToken = shop.meta_page_access_token;
  
  // POST to Graph API to subscribe the page
  const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscribed_fields: ['messages'],
      access_token: pageAccessToken
    })
  });
  
  const json = await response.json();
  console.log("Subscription Response:", json);
}

run();
