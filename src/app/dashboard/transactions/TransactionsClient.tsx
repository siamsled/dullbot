'use client';

import { useState } from 'react';
import {
  ArrowLeftRight,
  RefreshCw,
  Search,
  Smartphone,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { getShopTransactionsAction } from '../actions';

interface CompanionTransaction {
  id: string;
  shop_id: string;
  device_id: string;
  device_name: string;
  trx_id: string;
  amount: number;
  sender: string;
  provider: string;
  raw_message: string;
  is_matched: boolean;
  matched_order_id: string | null;
  received_at: string;
}

interface CompanionDevice {
  id: string;
  shop_id: string;
  device_name: string;
  device_secret: string;
  created_at: string;
  is_active: boolean;
}

interface Props {
  shop: any;
  initialTransactions: CompanionTransaction[];
  initialDevices: CompanionDevice[];
}

export default function TransactionsClient({
  shop,
  initialTransactions,
  initialDevices,
}: Props) {
  const [transactions, setTransactions] = useState<CompanionTransaction[]>(initialTransactions);
  const [devices, setDevices] = useState<CompanionDevice[]>(initialDevices);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getShopTransactionsAction();
      if (res.success) {
        setTransactions(res.transactions || []);
        setDevices(res.devices || []);
      }
    } catch (e) {
      console.error('Failed to refresh transactions:', e);
    }
    setIsRefreshing(false);
  };

  const handleCopy = (trxId: string) => {
    navigator.clipboard.writeText(trxId);
    setCopiedTrx(trxId);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  const filteredTransactions = transactions.filter((t) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      t.trx_id.toLowerCase().includes(query) ||
      t.sender.toLowerCase().includes(query) ||
      t.raw_message.toLowerCase().includes(query) ||
      t.device_name.toLowerCase().includes(query);

    const matchesProvider =
      filterProvider === 'all' ||
      t.provider.toLowerCase() === filterProvider.toLowerCase();

    return matchesSearch && matchesProvider;
  });

  const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const matchedCount = transactions.filter((t) => t.is_matched).length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dove/20 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-ink text-white flex items-center justify-center shadow-sm">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-ink">Transactions & MFS Logs</h1>
              <p className="text-xs text-ash">
                Real-time bKash/Nagad SMS notifications relayed from your paired Companion Android app.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-dove/30 text-ink text-xs font-medium hover:border-ink transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh Logs'}
          </button>

          {devices.length > 0 ? (
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {devices[0].device_name || 'Companion Device'} Active
            </Link>
          ) : (
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Pair Companion App
            </Link>
          )}
        </div>
      </div>

      {/* ── Overview Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-dove/20 shadow-xs">
          <p className="text-[11px] font-medium text-ash uppercase tracking-wider mb-1">Total Logs</p>
          <p className="text-2xl font-serif font-bold text-ink">{transactions.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Permanently Retained</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-dove/20 shadow-xs">
          <p className="text-[11px] font-medium text-ash uppercase tracking-wider mb-1">Total Volume</p>
          <p className="text-2xl font-serif font-bold text-ink">৳ {totalVolume.toLocaleString()}</p>
          <span className="text-[10px] text-ash">Sum of received payments</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-dove/20 shadow-xs">
          <p className="text-[11px] font-medium text-ash uppercase tracking-wider mb-1">Matched Orders</p>
          <p className="text-2xl font-serif font-bold text-emerald-700">{matchedCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Auto-confirmed by AI</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-dove/20 shadow-xs">
          <p className="text-[11px] font-medium text-ash uppercase tracking-wider mb-1">Active Devices</p>
          <p className="text-2xl font-serif font-bold text-ink">{devices.length}</p>
          <span className="text-[10px] text-ash">Encrypted tunnel nodes</span>
        </div>
      </div>

      {/* ── Isolation & Retention Banner ──────────────────────── */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl text-xs text-emerald-900 flex items-start sm:items-center gap-3 shadow-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold">Strict Multi-Tenant Isolation &amp; Permanent Retention:</strong> Transaction logs fetched from your Companion App belong exclusively to <strong className="font-semibold">{shop?.name || 'Your Shop'}</strong>. Logs remain permanently stored in your dashboard database even if your phone is disconnected or sync is paused.
        </p>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ash absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TrxID, sender number, device name..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-dove/25 rounded-xl text-xs text-ink focus:outline-none focus:border-ink transition-colors shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ash hover:text-ink text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-ash shrink-0" />
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="px-3 py-2 bg-white border border-dove/25 rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-ink shadow-xs cursor-pointer"
          >
            <option value="all">All Gateways</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>
        </div>
      </div>

      {/* ── Transactions Table ────────────────────────────────── */}
      <div className="bg-white dark:bg-[#181d26] border border-dove/20 rounded-2xl relative shadow-xs">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-fog flex items-center justify-center mb-3">
              <Smartphone className="w-6 h-6 text-ash" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">
              {search || filterProvider !== 'all' ? 'No transactions match your search' : 'No transactions recorded yet'}
            </p>
            <p className="text-xs text-ash max-w-sm">
              {search || filterProvider !== 'all'
                ? 'Try adjusting your search keywords or gateway filter.'
                : devices.length > 0
                ? 'Your companion app is paired and live. Waiting for new incoming bKash/Nagad SMS payment receipts.'
                : 'Install and pair the DullBot Companion Android app to automatically stream live bKash/Nagad SMS receipts into your dashboard.'}
            </p>
            {search || filterProvider !== 'all' ? (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterProvider('all'); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-dove/30 text-ink text-xs font-semibold hover:border-ink transition-all mt-2 shadow-xs cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : devices.length === 0 ? (
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all mt-2"
              >
                Set up Companion App →
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-dove/20 text-[10px] font-bold text-graphite uppercase tracking-wider">
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 border-b border-dove/20 shadow-xs">Gateway</th>
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 border-b border-dove/20 shadow-xs">TrxID / Reference</th>
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 border-b border-dove/20 shadow-xs">Amount</th>
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 border-b border-dove/20 shadow-xs">Sender</th>
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 border-b border-dove/20 shadow-xs">Matching Order</th>
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 border-b border-dove/20 shadow-xs">Relay Device</th>
                  <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md py-3 px-4 text-right border-b border-dove/20 shadow-xs">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dove/15">
                {filteredTransactions.map((t) => {
                  const isBkash = t.provider.includes('bkash');
                  const isNagad = t.provider.includes('nagad');

                  return (
                    <tr key={t.id} className="hover:bg-fog/50 transition-colors">
                      {/* Provider Badge */}
                      <td className="py-3.5 px-4 font-medium">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isBkash
                              ? 'bg-[#E2136E]/10 text-[#E2136E] border border-[#E2136E]/20'
                              : isNagad
                              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                              : 'bg-dove/20 text-ink border border-dove/30'
                          }`}
                        >
                          {isBkash ? 'bKash' : isNagad ? 'Nagad' : t.provider}
                        </span>
                      </td>

                      {/* TrxID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-ink">
                        <div className="flex items-center gap-1.5">
                          <span>{t.trx_id}</span>
                          <button
                            onClick={() => handleCopy(t.trx_id)}
                            className="p-1 text-ash hover:text-ink transition-colors rounded"
                            title="Copy TrxID"
                          >
                            {copiedTrx === t.trx_id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-serif font-bold text-ink text-sm">
                        ৳ {t.amount.toLocaleString()}
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 text-graphite font-mono">
                        {t.sender}
                      </td>

                      {/* Matching Order */}
                      <td className="py-3.5 px-4">
                        {t.is_matched && t.matched_order_id ? (
                          <Link
                            href={`/dashboard/orders?id=${t.matched_order_id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:underline"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Order #{t.matched_order_id.slice(-6)}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-fog text-ash border border-dove/20">
                            <Clock className="w-3 h-3 text-ash" />
                            Unmatched Log
                          </span>
                        )}
                      </td>

                      {/* Device */}
                      <td className="py-3.5 px-4 text-ash flex items-center gap-1.5">
                        <Smartphone className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{t.device_name}</span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-ash text-right whitespace-nowrap">
                        {new Date(t.received_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
