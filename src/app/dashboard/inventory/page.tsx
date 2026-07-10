import { supabaseAdmin } from '@/lib/supabase-admin';
import InventoryClient from './InventoryClient';



export default async function InventoryPage() {
  const shopSlug = 'dull-store';

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, website_url')
    .eq('slug', shopSlug)
    .single();

  if (!shop) return <div className="p-8 text-ash">Shop not found.</div>;

  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price, currency, stock_quantity, is_active, source, draft, image_url, scraped_url')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false });

  const liveProducts = (allProducts || []).filter(p => !p.draft);
  const draftProducts = (allProducts || []).filter(p => p.draft);

  return (
    <InventoryClient
      shopId={shop.id}
      liveProducts={liveProducts}
      draftProducts={draftProducts}
      websiteUrl={shop.website_url}
    />
  );
}

