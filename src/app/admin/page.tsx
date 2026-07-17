import { supabaseAdmin } from '@/lib/supabase-admin';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Fetch all shops
  const { data: shopsData } = await supabaseAdmin
    .from('shops')
    .select('id, name, slug, credit_balance, agent_enabled, created_at, updated_at')
    .order('created_at', { ascending: false });

  // Fetch all usage logs for total spent
  const { data: usageLogs } = await supabaseAdmin
    .from('usage_logs')
    .select('shop_id, billed_credits, raw_cost, created_at');

  // Fetch pending escalations (mismatch or failed verifications)
  const { data: escalationsData } = await supabaseAdmin
    .from('payment_verifications')
    .select('*, orders!inner(*, products(name))')
    .in('status', ['mismatch', 'failed'])
    .order('created_at', { ascending: false });

  // Fetch recent compliance audit logs
  const { data: auditLogs } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const shops = (shopsData || []).map(shop => {
    const shopLogs = (usageLogs || []).filter(l => l.shop_id === shop.id);
    const total_spent = shopLogs.reduce((sum, log) => sum + (log.billed_credits || 0), 0);
    const total_cost = shopLogs.reduce((sum, log) => sum + (log.raw_cost || 0), 0);
    
    // Check if shop is quiet/churn-risk (no active logs in last 5 days)
    const lastLogDate = shopLogs.length > 0 
      ? new Date(Math.max(...shopLogs.map(l => new Date(l.created_at).getTime()))) 
      : null;
    const isQuiet = lastLogDate 
      ? (Date.now() - lastLogDate.getTime() > 5 * 24 * 60 * 60 * 1000) 
      : true;

    return {
      ...shop,
      total_spent,
      total_cost,
      isQuiet
    };
  });

  const totalShops = shops.length;
  const totalCreditsInCirculation = shops.reduce((sum, shop) => sum + (shop.credit_balance || 0), 0);
  const totalCreditsSpentAllTime = shops.reduce((sum, shop) => sum + shop.total_spent, 0);
  const totalRawCostUsd = (usageLogs || []).reduce((sum, log) => sum + (log.raw_cost || 0), 0);

  // Platform error count (messages starting with [SYSTEM ERROR])
  const { count: systemErrorsCount } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .ilike('content', '%[SYSTEM ERROR]%');

  return (
    <AdminClient
      shops={shops}
      platformMetrics={{
        totalShops,
        totalCreditsInCirculation,
        totalCreditsSpentAllTime,
        totalRawCostUsd,
        systemErrorsCount: systemErrorsCount || 0
      }}
      escalations={escalationsData || []}
      auditLogs={auditLogs || []}
    />
  );
}
