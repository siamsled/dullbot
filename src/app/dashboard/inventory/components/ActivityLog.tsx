'use client';

import { useState } from 'react';
import { Activity, Package, TrendingUp, Settings2, RotateCcw, ShieldCheck } from 'lucide-react';

type Movement = {
  id: string;
  change_type: 'order' | 'manual_adjust' | 'restock' | 'import' | 'initial_stock' | 'audit';
  quantity_delta: number;
  resulting_stock: number;
  supplier_id?: string | null;
  cost_per_unit?: number | null;
  note?: string | null;
  created_at: string;
  variant_id?: string | null;
  suppliers?: { name?: string } | null;
  products?: { name?: string } | null;
  product_variants?: { name?: string; sku?: string | null } | null;
  product_id?: string;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  order: { 
    label: 'Order', 
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40', 
    icon: Package 
  },
  manual_adjust: { 
    label: 'Manual Adjust', 
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40', 
    icon: Settings2 
  },
  restock: { 
    label: 'Restock', 
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40', 
    icon: TrendingUp 
  },
  import: { 
    label: 'Import', 
    color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-800/40', 
    icon: RotateCcw 
  },
  initial_stock: { 
    label: 'Initial Stock', 
    color: 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60', 
    icon: Package 
  },
  audit: { 
    label: 'Audit', 
    color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40', 
    icon: ShieldCheck 
  },
};

interface Props {
  movements: Movement[];
}

const PAGE_SIZE = 25;

export default function ActivityLog({ movements: allMovements }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const filtered = filter === 'all'
    ? allMovements
    : allMovements.filter(m => m.change_type === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'order', label: 'Orders' },
    { value: 'restock', label: 'Restocks' },
    { value: 'manual_adjust', label: 'Manual' },
    { value: 'import', label: 'Imports' },
    { value: 'initial_stock', label: 'Initial' },
    { value: 'audit', label: 'Audits' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filter chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Activity Log</h2>
              <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                {allMovements.length} {allMovements.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
          {filters.map(f => {
            const isActive = filter === f.value;
            const count = f.value === 'all' 
              ? allMovements.length 
              : allMovements.filter(m => m.change_type === f.value).length;

            return (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(0); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive 
                    ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-950' 
                    : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      {paged.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950/80 rounded-3xl shadow-xs border border-dove/20 dark:border-zinc-800/80 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-400 dark:text-zinc-600">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No activity entries found</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {filter === 'all' 
              ? 'Stock changes from manual adjustments, API syncs, product edits, and orders will appear here.'
              : `No activity found for filter "${filter}". Try selecting "All".`}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-950/80 rounded-3xl shadow-xs border border-dove/20 dark:border-zinc-800/80 overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-dove/15 dark:border-zinc-800/80 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/80 dark:bg-zinc-900/60">
                  <th className="px-5 py-3.5 font-bold">Type</th>
                  <th className="px-5 py-3.5 font-bold">Product</th>
                  <th className="px-5 py-3.5 font-bold text-right">Delta</th>
                  <th className="px-5 py-3.5 font-bold text-right">Resulting Stock</th>
                  <th className="px-5 py-3.5 font-bold">Note / Supplier</th>
                  <th className="px-5 py-3.5 font-bold text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dove/10 dark:divide-zinc-800/60">
                {paged.map(m => {
                  const cfg = TYPE_CONFIG[m.change_type] ?? TYPE_CONFIG.manual_adjust;
                  const Icon = cfg.icon;
                  const isPositive = m.quantity_delta > 0;
                  const fmt = new Date(m.created_at);
                  const timeStr = fmt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                    + ' · ' + fmt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-900 dark:text-zinc-100 font-semibold max-w-[220px]">
                        <div className="truncate text-sm">{m.products?.name ?? (m.product_id ? 'Product' : 'Storewide')}</div>
                        {m.product_variants?.name ? (
                          <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1 mt-0.5">
                            <span className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/40 px-1.5 py-0.2 rounded">
                              {m.product_variants.name}
                            </span>
                            {m.product_variants.sku && (
                              <span className="font-mono text-[10px] text-zinc-400">({m.product_variants.sku})</span>
                            )}
                          </div>
                        ) : m.variant_id ? (
                          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-normal">(variant)</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-sm">
                        {m.quantity_delta === 0 ? (
                          <span className="text-zinc-400 dark:text-zinc-600">0</span>
                        ) : (
                          <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-mono text-sm font-semibold ${
                          m.resulting_stock === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {m.resulting_stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400 max-w-[240px]">
                        <p className="truncate text-xs text-zinc-800 dark:text-zinc-200">{m.note || '—'}</p>
                        {m.suppliers?.name && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">via {m.suppliers.name}</p>
                        )}
                        {m.cost_per_unit != null && (
                          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">৳{m.cost_per_unit}/unit</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap text-right">
                        {timeStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-dove/10 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      {allMovements.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const count = allMovements.filter(m => m.change_type === type).length;
            const Icon = cfg.icon;
            return (
              <div key={type} className="bg-white dark:bg-zinc-950/80 rounded-2xl shadow-xs border border-dove/20 dark:border-zinc-800/80 p-3.5">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mb-2 ${cfg.color}`}>
                  <Icon className="w-2.5 h-2.5" />
                  {cfg.label}
                </div>
                <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-none">{count}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider font-medium">events</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
