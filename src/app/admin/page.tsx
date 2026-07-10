import { supabaseAdmin } from '@/lib/supabase-admin';
import AdminClient from './AdminClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // In a real app, you'd check if the user is a super-admin here
  // For demo, we just load it

  // Fetch all shops
  const { data: shopsData } = await supabaseAdmin
    .from('shops')
    .select('id, name, slug, credit_balance, agent_enabled, created_at')
    .order('created_at', { ascending: false });

  // Fetch all usage logs for total spent
  const { data: usageLogs } = await supabaseAdmin
    .from('usage_logs')
    .select('shop_id, billed_credits, raw_cost');

  const shops = (shopsData || []).map(shop => {
    const shopLogs = (usageLogs || []).filter(l => l.shop_id === shop.id);
    const total_spent = shopLogs.reduce((sum, log) => sum + (log.billed_credits || 0), 0);
    return {
      ...shop,
      total_spent
    };
  });

  const totalShops = shops.length;
  const totalCreditsInCirculation = shops.reduce((sum, shop) => sum + (shop.credit_balance || 0), 0);
  const totalCreditsSpentAllTime = shops.reduce((sum, shop) => sum + shop.total_spent, 0);
  const totalRawCostUsd = (usageLogs || []).reduce((sum, log) => sum + (log.raw_cost || 0), 0);

  return (
    <AdminClient
      shops={shops}
      platformMetrics={{
        totalShops,
        totalCreditsInCirculation,
        totalCreditsSpentAllTime,
        totalRawCostUsd
      }}
    />
  );
}
