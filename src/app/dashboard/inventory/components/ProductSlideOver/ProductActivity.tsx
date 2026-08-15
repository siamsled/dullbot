'use client';

import { Loader2, AlertCircle, Package, TrendingUp, Settings2, RotateCcw } from 'lucide-react';
import { StockMovement } from './productForm.types';

interface ProductActivityProps {
  isNew: boolean;
  movements: StockMovement[];
  movementsLoaded: boolean;
}

const TYPE_TAGS: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  order: { label: 'Order', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/40', text: 'text-blue-700 dark:text-blue-300', icon: Package },
  manual_adjust: { label: 'Manual Adjust', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40', text: 'text-amber-700 dark:text-amber-300', icon: Settings2 },
  restock: { label: 'Restock', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40', text: 'text-emerald-700 dark:text-emerald-300', icon: TrendingUp },
  import: { label: 'Import', bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/50 dark:border-cyan-800/40', text: 'text-cyan-700 dark:text-cyan-300', icon: RotateCcw },
  initial_stock: { label: 'Initial Stock', bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/60 dark:border-zinc-700/60', text: 'text-zinc-700 dark:text-zinc-300', icon: Package },
};

export default function ProductActivity({ isNew, movements, movementsLoaded }: ProductActivityProps) {
  if (isNew) {
    return (
      <div className="p-8 h-[400px] flex items-center justify-center flex-col gap-3 text-zinc-500 text-sm animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">No activity yet</p>
        <p className="text-xs text-zinc-400 text-center max-w-xs">
          Once this product is created, all inventory movements and audits will be tracked here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stock Movement Timeline</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Comprehensive audit log of all quantity changes, restocks, and manual adjustments.</p>
        </div>
        <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
          {movements.length} event{movements.length !== 1 ? 's' : ''}
        </span>
      </div>

      {!movementsLoaded ? (
        <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm py-16">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading activity timeline…
        </div>
      ) : movements.length === 0 ? (
        <div className="flex items-center justify-center flex-col gap-2 text-zinc-400 text-sm py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
          <p className="font-medium text-zinc-600 dark:text-zinc-400">No stock movements recorded yet.</p>
          <p className="text-xs text-zinc-400">Adjust stock or restock to record an inventory movement.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 space-y-6 pb-6">
          {movements.map(m => {
            const isPos = m.quantity_delta > 0;
            const tagCfg = TYPE_TAGS[m.change_type] ?? TYPE_TAGS.manual_adjust;
            const Icon = tagCfg.icon;

            return (
              <div key={m.id} className="relative pl-6 group">
                <span
                  className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-950 shadow-xs transition-transform group-hover:scale-125 ${
                    isPos ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />

                <div className="bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${tagCfg.bg} ${tagCfg.text}`}>
                          <Icon className="w-3 h-3" />
                          {tagCfg.label}
                        </span>

                        {m.product_variants?.name && (
                          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 px-2 py-0.5 rounded-lg">
                            {m.product_variants.name}
                            {m.product_variants.sku && <span className="font-mono ml-1 text-[10px] text-indigo-500 font-normal">({m.product_variants.sku})</span>}
                          </span>
                        )}

                        {m.suppliers?.name && (
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-300/40 dark:border-zinc-700/40">
                            via {m.suppliers.name}
                          </span>
                        )}

                        {m.cost_per_unit != null && (
                          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded-md">
                            ৳{m.cost_per_unit}/unit
                          </span>
                        )}
                      </div>

                      {m.note && <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1">{m.note}</p>}

                      <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                        {new Date(m.created_at).toLocaleString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-right shrink-0 bg-white dark:bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
                      <p className={`text-base font-bold font-mono tracking-tight ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPos ? '+' : ''}
                        {m.quantity_delta}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
                        → {m.resulting_stock} in stock
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
