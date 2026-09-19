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

  // RBAC permission check: if staff member doesn't have overview permission, redirect to permitted tab
  if (!shop.isOwner && !shop.permissions?.includes('*') && !shop.permissions?.includes('overview')) {
    if (shop.permissions?.includes('orders') || shop.permissions?.includes('pos')) {
      redirect('/dashboard/orders');
    } else if (shop.permissions?.includes('inbox')) {
      redirect('/dashboard/inbox');
    } else if (shop.permissions?.includes('inventory')) {
      redirect('/dashboard/inventory');
    } else if (shop.permissions?.includes('analytics')) {
      redirect('/dashboard/analytics');
    } else if (shop.permissions?.includes('settings')) {
      redirect('/dashboard/settings');
    }
  }

  // Fetch product count for checklist verification
  const { count: productCount } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shop.id);

  // Pre-fetch all standard ranges so client toggles are instant
  const [daily, weekly, monthly, yearly] = await Promise.all([
    getShopStats(shop.id, 'daily'),
    getShopStats(shop.id, 'weekly'),
    getShopStats(shop.id, 'monthly'),
    getShopStats(shop.id, 'yearly')
  ]);

  const initialStats = { daily, weekly, monthly, yearly };

  return <OverviewClient shop={shop} productCount={productCount || 0} initialStats={initialStats} />;
}

