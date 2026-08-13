'use client';

import { useState } from 'react';
import { Activity, Package, TrendingDown, TrendingUp, Settings2, RotateCcw } from 'lucide-react';

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
  product_id?: string;
};

const TYPE_CONFIG = {
  order: { label: 'Order', color: 'text-blue-600 bg-sky-wash', icon: Package },
  manual_adjust: { label: 'Manual Adjust', color: 'text-rust bg-apricot-wash', icon: Settings2 },
  restock: { label: 'Restock', color: 'text-green-700 bg-green-50', icon: TrendingUp },
  import: { label: 'Import', color: 'text-ink bg-fog', icon: RotateCcw },
  initial_stock: { label: 'Initial Stock', color: 'text-graphite bg-fog', icon: Package },
  audit: { label: 'Audit', color: 'text-purple-700 bg-purple-50', icon: Activity },
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-graphite" />
          <h2 className="text-lg font-medium text-ink">Activity Log</h2>
          <span className="text-xs text-ash bg-fog px-2 py-0.5 rounded-tags">
            {allMovements.length} entries
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(0); }}
            className={`px-3 py-1.5 rounded-tags text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-ink text-white'
                : 'bg-fog text-ash hover:text-ink hover:bg-dove/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-12 text-center">
          <Activity className="w-8 h-8 text-dove mx-auto mb-3" />
          <p className="text-sm text-ash">No activity entries yet.</p>
          <p className="text-xs text-dove mt-1">Stock changes from orders, restocks, and adjustments will appear here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151921] rounded-cards shadow-subtle border border-dove/10 relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-dove/15 text-[10px] font-bold text-graphite uppercase tracking-wider">
                <th className="sticky top-0 z-20 bg-fog dark:bg-[#1e2330] backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">Type</th>
                <th className="sticky top-0 z-20 bg-fog dark:bg-[#1e2330] backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">Product</th>
                <th className="sticky top-0 z-20 bg-fog dark:bg-[#1e2330] backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider text-right border-b border-dove/15 shadow-xs">Delta</th>
                <th className="sticky top-0 z-20 bg-fog dark:bg-[#1e2330] backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider text-right border-b border-dove/15 shadow-xs">Resulting Stock</th>
                <th className="sticky top-0 z-20 bg-fog dark:bg-[#1e2330] backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">Note / Supplier</th>
                <th className="sticky top-0 z-20 bg-fog dark:bg-[#1e2330] backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {paged.map(m => {
                const cfg = TYPE_CONFIG[m.change_type] ?? TYPE_CONFIG.manual_adjust;
                const Icon = cfg.icon;
                const isPositive = m.quantity_delta > 0;
                const fmt = new Date(m.created_at);
                const timeStr = fmt.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })
                  + ' · ' + fmt.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={m.id} className="hover:bg-fog/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tags text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink font-medium max-w-[150px] truncate">
                      {m.products?.name ?? '—'}
                      {m.variant_id && <span className="text-dove text-xs ml-1">(variant)</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-medium text-sm ${isPositive ? 'text-green-700' : 'text-rust'}`}>
                        {isPositive ? '+' : ''}{m.quantity_delta}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-mono text-sm ${m.resulting_stock === 0 ? 'text-rust' : 'text-ink'}`}>
                        {m.resulting_stock}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ash max-w-[200px]">
                      <p className="truncate text-xs">{m.note || '—'}</p>
                      {m.suppliers?.name && (
                        <p className="text-xs text-graphite mt-0.5">via {m.suppliers.name}</p>
                      )}
                      {m.cost_per_unit != null && (
                        <p className="text-xs text-graphite">৳{m.cost_per_unit}/unit</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-ash whitespace-nowrap">{timeStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-dove/10 flex items-center justify-between bg-fog">
              <p className="text-xs text-ash">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded-lg text-xs text-ash border border-dove/20 hover:text-ink hover:border-ink/20 transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded-lg text-xs text-ash border border-dove/20 hover:text-ink hover:border-ink/20 transition-colors disabled:opacity-40"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const count = allMovements.filter(m => m.change_type === type).length;
            const Icon = cfg.icon;
            return (
              <div key={type} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-4">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-tags text-xs font-medium mb-2 ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </div>
                <p className="text-2xl font-serif text-ink">{count}</p>
                <p className="text-xs text-ash mt-0.5">movements</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
