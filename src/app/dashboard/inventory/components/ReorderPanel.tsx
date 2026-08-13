'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, TrendingDown, Loader2, ChevronDown, ChevronUp, Check, Package } from 'lucide-react';
import { restockProduct } from '../actions';
import { getPrimaryImageUrl } from '@/lib/product-images';

type Candidate = {
  id: string;
  name: string;
  stock: number;
  images: string[];
  dailyVelocity: number;
  daysUntilEmpty: number | null;
  suggestedReorderQty: number;
};

interface Props {
  candidates: Candidate[];
  suppliers: { id: string; name: string }[];
  onRestocked: () => void;
}

export default function ReorderPanel({ candidates, suppliers, onRestocked }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [restocking, setRestocking] = useState<string | null>(null);
  const [restockedIds, setRestockedIds] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Record<string, { qty: string; supplierId: string; note: string }>>({});

  const getForm = (id: string) =>
    forms[id] ?? {
      qty: String(Math.max(10, candidates.find(c => c.id === id)?.suggestedReorderQty ?? 10)),
      supplierId: '',
      note: '',
    };

  const setForm = (id: string, patch: Partial<typeof forms[string]>) => {
    setForms(prev => ({ ...prev, [id]: { ...getForm(id), ...patch } }));
  };

  const handleRestock = async (c: Candidate) => {
    const form = getForm(c.id);
    const qty = parseInt(form.qty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setRestocking(c.id);
    try {
      await restockProduct(
        c.id,
        qty,
        form.note || `Restock triggered from Reorder Bar`,
        null,
        form.supplierId || null,
        null
      );
      setRestockedIds(prev => new Set(prev).add(c.id));
      setTimeout(() => {
        onRestocked();
      }, 800);
    } finally {
      setRestocking(null);
    }
  };

  if (!candidates.length) return null;

  const outOfStockCount = candidates.filter(c => c.stock <= 0).length;
  const lowStockCount = candidates.length - outOfStockCount;

  return (
    <div className="bg-apricot-wash/70 rounded-cards border border-rust/20 overflow-hidden shadow-subtle transition-all mb-6">
      {/* Sleek Top Banner Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-rust/10 flex items-center justify-center text-rust shrink-0">
            <AlertTriangle className="w-4 h-4 text-rust" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-ink truncate">
              {candidates.length} product{candidates.length !== 1 ? 's' : ''} need reordering
            </span>
            {outOfStockCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-100/90 text-rust border border-rust/20 rounded-full text-[10px] font-bold">
                {outOfStockCount} out of stock
              </span>
            )}
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100/80 text-amber-900 border border-amber-300/40 rounded-full text-[10px] font-bold">
                {lowStockCount} running low
              </span>
            )}
          </div>
        </div>

        {/* Toggle Minimize/Expand CTA */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-buttons bg-white text-ink border border-dove/20 hover:border-ink text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? 'Minimize' : 'Quick Restock'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible Item List */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-t border-rust/10 bg-white/60 divide-y divide-dove/10"
          >
            <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
              {candidates.map(c => {
                const form = getForm(c.id);
                const isDone = restockedIds.has(c.id);
                const isOutOfStock = c.stock <= 0;

                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-inputs bg-white border border-dove/15 shadow-2xs hover:border-dove/30 transition-all text-xs"
                  >
                    {/* Left: Thumbnail & Name & Stats */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-fog border border-dove/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {getPrimaryImageUrl((c as any).product_images) || c.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getPrimaryImageUrl((c as any).product_images) || c.images[0]}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-ash" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate leading-tight">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ash">
                          <span className={isOutOfStock ? 'text-rust font-bold' : 'text-amber-800 font-semibold'}>
                            {isOutOfStock ? 'Out of stock' : `${c.stock} left`}
                          </span>
                          <span>·</span>
                          <span>Velocity: {c.dailyVelocity || 0}/day</span>
                          {c.daysUntilEmpty !== null && c.daysUntilEmpty !== undefined && (
                            <>
                              <span>·</span>
                              <span>~{c.daysUntilEmpty}d runway</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Inline Restock Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-1 bg-fog rounded border border-dove/20 px-2 py-1">
                        <span className="text-[10px] text-ash font-medium">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={form.qty}
                          onChange={e => setForm(c.id, { qty: e.target.value })}
                          className="w-12 bg-transparent text-xs font-bold text-ink font-mono focus:outline-none text-right"
                        />
                      </div>

                      {suppliers.length > 0 && (
                        <select
                          value={form.supplierId}
                          onChange={e => setForm(c.id, { supplierId: e.target.value })}
                          className="bg-fog border border-dove/20 rounded px-2 py-1 text-[11px] text-ink focus:outline-none max-w-[110px]"
                        >
                          <option value="">Supplier (Auto)</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => handleRestock(c)}
                        disabled={restocking === c.id || isDone}
                        className={`flex items-center gap-1 px-3 py-1 rounded-buttons text-xs font-semibold transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-ink text-white hover:bg-black shadow-xs'
                        }`}
                      >
                        {restocking === c.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isDone ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            Restocked
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3" />
                            Restock
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
