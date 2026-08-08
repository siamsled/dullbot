import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  const { data: shops } = await supabaseAdmin.from('shops').select('id, name, slug, meta_page_id, meta_page_name, instagram_business_id, meta_page_access_token');
  console.log('Shops in DB:', shops);

  const { data: pages } = await supabaseAdmin.from('shop_meta_pages').select('shop_id, meta_page_id, meta_page_name, instagram_business_id, meta_page_access_token');
  console.log('Shop Meta Pages in DB:', pages);
}

main().catch(console.error);
