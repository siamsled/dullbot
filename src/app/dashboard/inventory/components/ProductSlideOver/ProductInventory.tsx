'use client';

import { Loader2, AlertCircle, RotateCcw, Boxes, AlertTriangle, PackageX, Truck, SlidersHorizontal, Plus } from 'lucide-react';
import { Product } from './productForm.types';
import { VariantWithState } from './hooks/useVariants';

interface ProductInventoryProps {
  isNew: boolean;
  product?: Product;
  variants: VariantWithState[];
  isPending: boolean;
  adjustDelta: string;
  setAdjustDelta: (v: string) => void;
  adjustNote: string;
  setAdjustNote: (v: string) => void;
  adjustError: string;
  adjustVariantId: string;
  setAdjustVariantId: (v: string) => void;
  handleAdjust: (onSuccess: (ns: number) => void) => void;

  showRestockForm: boolean;
  setShowRestockForm: (v: boolean | ((prev: boolean) => boolean)) => void;
  restockQty: string;
  setRestockQty: (v: string) => void;
  restockSupplierId: string;
  setRestockSupplierId: (v: string) => void;
  restockCost: string;
  setRestockCost: (v: string) => void;
  restockNote: string;
  setRestockNote: (v: string) => void;
  restockVariantId: string;
  setRestockVariantId: (v: string) => void;
  handleRestock: (onSuccess: (ns: number) => void) => void;

  suppliers: { id: string; name: string }[];
  onStockUpdated?: (product: Product) => void;
}

const QUICK_ADJUST_REASONS = [
  'Physical Count Audit',
  'Damaged / Defect',
  'Customer Return',
  'Correction',
];

export default function ProductInventory({
  isNew,
  product,
  variants,
  isPending,
  adjustDelta,
  setAdjustDelta,
  adjustNote,
  setAdjustNote,
  adjustError,
  adjustVariantId,
  setAdjustVariantId,
  handleAdjust,
  showRestockForm,
  setShowRestockForm,
  restockQty,
  setRestockQty,
  restockSupplierId,
  setRestockSupplierId,
  restockCost,
  setRestockCost,
  restockNote,
  setRestockNote,
  restockVariantId,
  setRestockVariantId,
  handleRestock,
  suppliers,
  onStockUpdated,
}: ProductInventoryProps) {
  const activeVariants = variants.filter(v => !v._deleted && !v._isNew);
  const hasVariants = activeVariants.length > 0;

  if (isNew) {
    return (
      <div className="p-8 h-[380px] flex items-center justify-center flex-col gap-3 text-zinc-500 text-sm animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <Boxes className="w-6 h-6" />
        </div>
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">Save product first</p>
        <p className="text-xs text-zinc-400 text-center max-w-sm">
          Once the product is created, you can log inventory adjustments, restock shipments, and track full movement history here.
        </p>
      </div>
    );
  }

  const threshold = product?.low_stock_threshold ?? 5;
  let totalStock = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  if (hasVariants) {
    totalStock = activeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    lowStockCount = activeVariants.filter(v => (v.stock || 0) <= threshold && (v.stock || 0) > 0).length;
    outOfStockCount = activeVariants.filter(v => (v.stock || 0) <= 0).length;
  } else {
    totalStock = product?.stock_quantity ?? 0;
    if (totalStock <= 0) outOfStockCount = 1;
    else if (totalStock <= threshold) lowStockCount = 1;
  }

  const onAdjustSuccess = (newStock: number) => {
    onStockUpdated?.({ ...product!, stock_quantity: newStock });
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in">
      {/* ── Status KPI Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Stock */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Stock</span>
            <div className="w-7 h-7 rounded-xl bg-zinc-200/60 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
              {totalStock} <span className="text-xs font-sans font-medium text-zinc-400">units</span>
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {hasVariants ? `${activeVariants.length} Active variant${activeVariants.length !== 1 ? 's' : ''}` : 'Single Product SKU'}
            </p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Low Stock</span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              {lowStockCount} <span className="text-xs font-sans font-medium text-amber-600/70">variant{lowStockCount !== 1 ? 's' : ''}</span>
            </p>
            <p className="text-[11px] text-amber-700/70 dark:text-amber-400/60 mt-0.5">
              Threshold ≤ {threshold} units
            </p>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200/60 dark:border-rose-900/30 rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Out of Stock</span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <PackageX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              {outOfStockCount} <span className="text-xs font-sans font-medium text-rose-600/70">variant{outOfStockCount !== 1 ? 's' : ''}</span>
            </p>
            <p className="text-[11px] text-rose-700/70 dark:text-rose-400/60 mt-0.5">
              {outOfStockCount > 0 ? 'Restock required' : 'All items in stock'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Transaction Operations (2-Column Grid) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Manual Stock Adjustment */}
        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-700/50">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Manual Adjustment</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Correct inventory count for audits, spoilage, or discrepancy.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {hasVariants && (
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Target Variant</label>
                <select
                  value={adjustVariantId}
                  onChange={e => setAdjustVariantId(e.target.value)}
                  className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none cursor-pointer"
                >
                  <option value="">Select variant to adjust...</option>
                  {activeVariants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.sku ? `(SKU: ${v.sku})` : ''} — Current Stock: {v.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-1">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Quantity (±)</label>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value)}
                  placeholder="+5 or -2"
                  className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Reason / Note</label>
                <input
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  placeholder="e.g. Recount audit, damaged item"
                  className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_ADJUST_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAdjustNote(r)}
                  className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100/70 dark:bg-zinc-800/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/70 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>

            {adjustError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {adjustError}
              </p>
            )}

            <button
              type="button"
              onClick={() => handleAdjust(onAdjustSuccess)}
              disabled={isPending || (hasVariants && !adjustVariantId) || !adjustDelta || !adjustNote}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Adjustment'}
            </button>
          </div>
        </section>

        {/* 2. Purchase Restock */}
        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Restock Shipment</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Receive supplier inventory & log purchase cost.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRestockForm(v => !v)}
              className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 border border-zinc-200/60 dark:border-zinc-700/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              {showRestockForm ? 'Collapse' : 'New Restock'}
            </button>
          </div>

          {showRestockForm ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-1">
              {hasVariants && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Target Variant</label>
                  <select
                    value={restockVariantId}
                    onChange={e => setRestockVariantId(e.target.value)}
                    className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select variant to restock...</option>
                    {activeVariants.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.sku ? `(SKU: ${v.sku})` : ''} — Current Stock: {v.stock ?? 0}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Units Received</label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={e => setRestockQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Cost / Unit (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={restockCost}
                    onChange={e => setRestockCost(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                  />
                </div>
              </div>

              {suppliers.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Supplier (Optional)</label>
                  <select
                    value={restockSupplierId}
                    onChange={e => setRestockSupplierId(e.target.value)}
                    className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Restock Note / PO Ref</label>
                <input
                  value={restockNote}
                  onChange={e => setRestockNote(e.target.value)}
                  placeholder="e.g. Batch #42, Factory Delivery"
                  className="w-full bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRestock(onAdjustSuccess)}
                disabled={!restockQty || isPending || (hasVariants && !restockVariantId)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-[0.98] mt-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Confirm Restock
              </button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/40 dark:bg-zinc-900/30">
              <Truck className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
              <p className="text-xs">Click <span className="font-semibold text-zinc-600 dark:text-zinc-300">New Restock</span> to log incoming supplier inventory.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
