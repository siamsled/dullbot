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

          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Pair Companion App
          </Link>
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

      {/* ── Security Retention Banner ──────────────────────────── */}
      <div className="p-4 rounded-2xl bg-fog/80 border border-dove/30 text-xs text-graphite flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p>
            <strong className="text-ink font-semibold">Strict Multi-Tenant Isolation & Permanent Retention:</strong>{' '}
            Transaction logs fetched from your Companion App belong exclusively to <span className="font-semibold text-ink">{shop.name}</span>. Logs remain permanently stored in your dashboard database even if your phone is disconnected or sync is paused.
          </p>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ash absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TrxID, sender, device name, or SMS body..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-dove/30 rounded-xl text-xs text-ink placeholder:text-ash focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-ash" />
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="px-3 py-2 bg-white border border-dove/30 rounded-xl text-xs text-ink font-medium focus:outline-none focus:border-ink transition-colors"
          >
            <option value="all">All Gateways</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>
        </div>
      </div>

      {/* ── Transactions Table ────────────────────────────────── */}
      <div className="bg-white border border-dove/20 rounded-2xl overflow-hidden shadow-xs">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-fog border border-dove/30 mx-auto flex items-center justify-center text-ash">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-ink">No Transaction Logs Found</h3>
            <p className="text-xs text-ash max-w-sm mx-auto leading-relaxed">
              {search || filterProvider !== 'all'
                ? 'No transactions match your current search filters.'
                : 'Install and pair the DullBot Companion Android app to automatically stream live bKash/Nagad SMS receipts into your dashboard.'}
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all mt-2"
            >
              Set up Companion App →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-fog border-b border-dove/20 text-[11px] font-semibold text-ash uppercase tracking-wider">
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">TrxID / Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Matching Order</th>
                  <th className="py-3 px-4">Relay Device</th>
                  <th className="py-3 px-4 text-right">Received</th>
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
