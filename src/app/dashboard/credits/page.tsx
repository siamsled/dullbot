import { supabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import { Zap, TrendingDown, Clock, AlertTriangle, CreditCard } from 'lucide-react';



function formatCredits(n: number) {
  return n.toFixed(4);
}

function formatBDT(usd: number) {
  const bdt = usd * 120; // Approx exchange rate
  // For tiny fractional costs, we might still want to see the decimal precision
  return `৳${bdt.toFixed(4)}`;
}

export const dynamic = 'force-dynamic';

export default async function CreditsPage() {
  const shopSlug = 'dull-store';

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, credit_balance, low_balance_notified_at')
    .eq('slug', shopSlug)
    .single();

  if (!shop) return <div className="p-8 text-ash">Shop not found.</div>;

  const { data: logs } = await supabaseAdmin
    .from('usage_logs')
    .select('*')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: topups } = await supabaseAdmin
    .from('credit_topups')
    .select('*')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch the triggering customer message for each log
  const logMessages = await Promise.all((logs || []).map(async (log) => {
    if (!log.conversation_id) return null;
    const { data } = await supabaseAdmin
      .from('messages')
      .select('content')
      .eq('conversation_id', log.conversation_id)
      .eq('sender', 'customer')
      .lte('created_at', log.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data?.content || null;
  }));

  const totalSpent = logs?.reduce((s, l) => s + (l.billed_credits ?? 0), 0) ?? 0;
  const lastTopup = topups?.[0];
  const isLowBalance = lastTopup && shop.credit_balance <= lastTopup.credits_granted * 0.20;
  const isCritical = lastTopup && shop.credit_balance <= lastTopup.credits_granted * 0.05;

  return (
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Credits</h1>
        <p className="text-ash text-lg">Your AI usage balance and history.</p>
      </div>

      {/* Balance + low-balance warning */}
      {(isLowBalance || isCritical) && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-inputs mb-6 border ${isCritical ? 'bg-red-50 border-red-200 text-red-800' : 'bg-apricot-wash border-rust/20 text-rust'}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">
            {isCritical ? 'Critical: your credits are nearly exhausted. Recharge now to avoid service interruption.' : 'Low balance — your AI may stop responding soon. Recharge credits.'}
          </p>
          <Link href="/dashboard/settings" className="ml-auto text-xs font-semibold underline shrink-0">Recharge →</Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-36 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ash">Current Balance</p>
            <div className="p-2 bg-sky-wash rounded-lg text-blue-600"><Zap className="w-4 h-4" /></div>
          </div>
          <div>
            <p className="text-3xl font-serif text-ink">{formatCredits(shop.credit_balance ?? 0)}</p>
            <p className="text-xs text-ash">credits remaining</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-sky-wash opacity-20 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </div>

        <div className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-36 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ash">Total Spent</p>
            <div className="p-2 bg-apricot-wash rounded-lg text-rust"><TrendingDown className="w-4 h-4" /></div>
          </div>
          <div>
            <p className="text-3xl font-serif text-ink">{formatCredits(totalSpent)}</p>
            <p className="text-xs text-ash">credits used (last 20 calls)</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-apricot-wash opacity-20 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </div>

        <div className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-36 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ash">Last Recharge</p>
            <div className="p-2 bg-fog rounded-lg text-graphite"><CreditCard className="w-4 h-4" /></div>
          </div>
          <div>
            {lastTopup ? (
              <>
                <p className="text-3xl font-serif text-ink">৳{lastTopup.amount_taka}</p>
                <p className="text-xs text-ash capitalize">{lastTopup.payment_method} · {lastTopup.verified ? 'Verified' : 'Pending'}</p>
              </>
            ) : (
              <p className="text-sm text-ash">No recharges yet</p>
            )}
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-fog opacity-50 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </div>
      </div>

      {/* Usage log table */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
        <div className="p-6 border-b border-dove/10 flex items-center gap-2">
          <Clock className="w-4 h-4 text-graphite" />
          <h2 className="text-base font-medium text-ink">Recent Usage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-fog text-xs text-ash uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Message</th>
                <th className="px-5 py-3 font-medium text-right">Input Tokens</th>
                <th className="px-5 py-3 font-medium text-right">Output Tokens</th>
                <th className="px-5 py-3 font-medium text-right">Cost (BDT)</th>
                <th className="px-5 py-3 font-medium text-right">Credits Billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {!logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ash text-sm">No usage logged yet.</td>
                </tr>
              ) : logs.map((log, index) => (
                <tr key={log.id} className="hover:bg-fog/50 transition-colors">
                  <td className="px-5 py-3 text-ash text-xs">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {log.cache_hit ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-sky-wash text-blue-700">Cache Hit</span>
                    ) : log.prefilter_hit ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-fog text-graphite">Pre-filter</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-apricot-wash text-rust">AI Reply</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-graphite max-w-[200px] truncate">
                    {logMessages[index] ? `"${logMessages[index]}"` : <span className="text-ash italic">System check</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-graphite text-xs">{log.input_tokens?.toLocaleString() ?? 0}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-graphite text-xs">{log.output_tokens?.toLocaleString() ?? 0}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-graphite text-xs">{formatBDT(log.raw_cost ?? 0)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-ink text-xs">{formatCredits(log.billed_credits ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  );
}
