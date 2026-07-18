import { getCurrentShop } from '@/lib/supabase-admin';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import OverviewClient from './OverviewClient';
import { getShopStats } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const shop = await getCurrentShop();

  if (!shop) {
    redirect('/login');
  }

  // Fetch product count for checklist verification
  const { count: productCount } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shop.id);

  // Fetch real analytics stats
  const stats = await getShopStats(shop.id);

  return <OverviewClient shop={shop} productCount={productCount || 0} stats={stats} />;
}

