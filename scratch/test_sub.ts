import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  const { data: pages } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('*');

  console.log(`Found ${pages?.length || 0} pages in shop_meta_pages`);

  for (const pageRow of pages || []) {
    if (!pageRow.meta_page_id || !pageRow.meta_page_access_token) continue;
    console.log(`\nSubscribing Page: ${pageRow.meta_page_name} (${pageRow.meta_page_id})...`);
    
    try {
      const pageSubRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageRow.meta_page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads,feed&access_token=${pageRow.meta_page_access_token}`,
        { method: 'POST' }
      );
      const resJson = await pageSubRes.json();
      console.log(`Page ${pageRow.meta_page_name} sub response:`, resJson);
    } catch (e: any) {
      console.error(`Error subscribing page ${pageRow.meta_page_id}:`, e.message);
    }
  }

  // Also check shops table
  const { data: shops } = await supabaseAdmin.from('shops').select('*');
  for (const shopRow of shops || []) {
    if (!shopRow.meta_page_id || !shopRow.meta_page_access_token) continue;
    console.log(`\nSubscribing Shop Primary Page: ${shopRow.meta_page_name} (${shopRow.meta_page_id})...`);
    try {
      const shopSubRes = await fetch(
        `https://graph.facebook.com/v19.0/${shopRow.meta_page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads,feed&access_token=${shopRow.meta_page_access_token}`,
        { method: 'POST' }
      );
      const resJson = await shopSubRes.json();
      console.log(`Shop Primary ${shopRow.meta_page_name} sub response:`, resJson);
    } catch (e: any) {
      console.error(`Error subscribing shop page ${shopRow.meta_page_id}:`, e.message);
    }
  }
}

main().catch(console.error);
