import { getCurrentShop } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OverviewClient from './OverviewClient';

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

  return <OverviewClient shop={shop} productCount={productCount || 0} />;
}

