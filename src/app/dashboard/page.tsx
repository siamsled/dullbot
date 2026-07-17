import { supabaseAdmin } from '@/lib/supabase-admin';
import OverviewClient from './OverviewClient';

export default async function DashboardOverview() {
  const shopSlug = 'dull-store';
  const { data: shop, error } = await supabaseAdmin
    .from('shops')
    .select('id, name, business_type, onboarding_complete, onboarding_steps_done, payment_verification_method, meta_page_access_token, agent_enabled')
    .eq('slug', shopSlug)
    .single();

  if (error || !shop) {
    console.error('SUPABASE ERROR IN OVERVIEW PAGE:', error);
    return <div>Shop not found. Error: {error ? JSON.stringify(error) : 'No data returned'}</div>;
  }

  // Fetch product count for checklist verification
  const { count: productCount } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shop.id);

  return <OverviewClient shop={shop} productCount={productCount || 0} />;
}
