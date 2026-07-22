'use client';

import { useState } from 'react';
import { AlertTriangle, Zap, TrendingDown, Loader2 } from 'lucide-react';
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
  const [restocking, setRestocking] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { qty: string; supplierId: string; note: string }>>({});

  const getForm = (id: string) =>
    forms[id] ?? { qty: String(Math.max(1, candidates.find(c => c.id === id)?.suggestedReorderQty ?? 1)), supplierId: '', note: '' };

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
        form.note || `Restock triggered from Reorder Panel`,
        null,
        form.supplierId || null,
        null
      );
      onRestocked();
    } finally {
      setRestocking(null);
    }
  };

  if (!candidates.length) {
    return (
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-sm font-medium text-ink mb-1">All stock levels look healthy</p>
        <p className="text-xs text-ash">No products need reordering within your configured window.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rust" />
        <h3 className="text-base font-medium text-ink">
          {candidates.length} product{candidates.length !== 1 ? 's' : ''} need reordering
        </h3>
      </div>

      <div className="space-y-3">
        {candidates.map(c => {
          const form = getForm(c.id);
          const isUrgent = (c.daysUntilEmpty ?? 99) <= 3 || c.stock === 0;

          return (
            <div
              key={c.id}
              className={`bg-white rounded-cards shadow-subtle border p-5 ${isUrgent ? 'border-apricot-wash' : 'border-dove/10'}`}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-images bg-fog flex items-center justify-center shrink-0 overflow-hidden">
                  {getPrimaryImageUrl((c as any).product_images) || c.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getPrimaryImageUrl((c as any).product_images) || c.images[0]} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-dove" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-ink truncate">{c.name}</p>
                    {isUrgent && (
                      <span className="bg-apricot-wash text-rust text-xs px-2 py-0.5 rounded-tags font-medium shrink-0">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-ash mb-3">
                    <span className={c.stock === 0 ? 'text-rust font-medium' : ''}>
                      {c.stock === 0 ? 'Out of stock' : `${c.stock} remaining`}
                    </span>
                    <span>Velocity: {c.dailyVelocity}/day</span>
                    {c.daysUntilEmpty !== null && (
                      <span className={c.daysUntilEmpty <= 3 ? 'text-rust font-medium' : ''}>
                        ~{c.daysUntilEmpty} day{c.daysUntilEmpty !== 1 ? 's' : ''} until empty
                      </span>
                    )}
                    {c.suggestedReorderQty > 0 && (
                      <span className="text-graphite">Suggested: {c.suggestedReorderQty} units</span>
                    )}
                  </div>

                  {/* Restock form */}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="block text-xs text-ash mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={form.qty}
                        onChange={e => setForm(c.id, { qty: e.target.value })}
                        className="w-20 bg-fog border border-transparent rounded-inputs px-3 py-1.5 text-sm text-ink focus:border-ink/20 focus:outline-none"
                      />
                    </div>
                    {suppliers.length > 0 && (
                      <div>
                        <label className="block text-xs text-ash mb-1">Supplier</label>
                        <select
                          value={form.supplierId}
                          onChange={e => setForm(c.id, { supplierId: e.target.value })}
                          className="bg-fog border border-transparent rounded-inputs px-3 py-1.5 text-sm text-ink focus:outline-none min-w-[140px]"
                        >
                          <option value="">Select supplier</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs text-ash mb-1">Note</label>
                      <input
                        value={form.note}
                        onChange={e => setForm(c.id, { note: e.target.value })}
                        placeholder="Optional note"
                        className="w-full bg-fog border border-transparent rounded-inputs px-3 py-1.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                    </div>
                    <button
                      onClick={() => handleRestock(c)}
                      disabled={restocking === c.id}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-buttons bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50 shrink-0"
                    >
                      {restocking === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3" />
                      )}
                      Restock
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
