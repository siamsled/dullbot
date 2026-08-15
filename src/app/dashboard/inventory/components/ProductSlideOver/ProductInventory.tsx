import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Product, Variant } from './productForm.types';
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

export default function ProductInventory({
  isNew, product, variants, isPending,
  adjustDelta, setAdjustDelta, adjustNote, setAdjustNote, adjustError, adjustVariantId, setAdjustVariantId, handleAdjust,
  showRestockForm, setShowRestockForm, restockQty, setRestockQty, restockSupplierId, setRestockSupplierId, restockCost, setRestockCost, restockNote, setRestockNote, restockVariantId, setRestockVariantId, handleRestock,
  suppliers, onStockUpdated
}: ProductInventoryProps) {
  
  const activeVariants = variants.filter(v => !v._deleted && !v._isNew);
  const hasVariants = activeVariants.length > 0;

  if (isNew) {
    return (
      <div className="p-6 h-[400px] flex items-center justify-center flex-col gap-2 text-ash text-sm animate-in fade-in">
        <AlertCircle className="w-6 h-6 text-dove" />
        <p>Save the product first to enable inventory transactions.</p>
        <p className="text-xs text-dove text-center max-w-sm">
          Initial stock levels can be set directly in the Overview (for simple products) or Variants grid.
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
    <div className="p-6 space-y-8 animate-in fade-in">
      
      {/* Summary */}
      <section className="bg-white border border-dove/20 shadow-sm rounded-xl p-6">
        <h3 className="text-[10px] font-bold text-ash uppercase tracking-wider mb-6">Inventory Status</h3>
        
        <div className="grid grid-cols-3 gap-6 divide-x divide-dove/10">
          <div>
            <p className="text-3xl font-medium text-ink tracking-tight">{totalStock}</p>
            <p className="text-xs text-ash mt-1">Total Stock</p>
          </div>
          <div className="pl-6">
            <p className="text-3xl font-medium text-amber-600 tracking-tight">{lowStockCount}</p>
            <p className="text-xs text-ash mt-1">Low Stock Variants</p>
          </div>
          <div className="pl-6">
            <p className="text-3xl font-medium text-rust tracking-tight">{outOfStockCount}</p>
            <p className="text-xs text-ash mt-1">Out of Stock</p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Manual Adjust */}
        <section className="bg-fog border border-transparent rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Manual Adjustment</h3>
            <p className="text-xs text-ash mt-1">For audits, damage, or discrepancy fixes.</p>
          </div>
          
          <div className="space-y-3">
            {hasVariants && (
              <select
                value={adjustVariantId}
                onChange={e => setAdjustVariantId(e.target.value)}
                className="w-full bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none"
              >
                <option value="">Select variant</option>
                {activeVariants.map(v => (
                  <option key={v.id} value={v.id}>{v.name} {v.sku ? `(${v.sku})` : ''} - Stock: {v.stock}</option>
                ))}
              </select>
            )}
            
            <div className="flex gap-2">
              <input
                type="number"
                value={adjustDelta}
                onChange={e => setAdjustDelta(e.target.value)}
                placeholder="+10 or -5"
                className="w-24 bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
              />
              <input
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Reason (required)"
                className="flex-1 bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
              />
            </div>
            {adjustError && <p className="text-xs text-rust flex items-center gap-1"><AlertCircle className="w-3 h-3" />{adjustError}</p>}
            
            <button
              type="button"
              onClick={() => handleAdjust(onAdjustSuccess)}
              disabled={isPending || (hasVariants && !adjustVariantId) || !adjustDelta || !adjustNote}
              className="w-full py-2.5 rounded-inputs bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Adjustment'}
            </button>
          </div>
        </section>

        {/* Restock */}
        <section className="bg-fog border border-transparent rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Restock</h3>
              <p className="text-xs text-ash mt-1">Receive new inventory from supplier.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRestockForm(v => !v)}
              className="text-xs text-graphite hover:text-ink transition-colors px-3 py-1.5 rounded-md hover:bg-white"
            >
              {showRestockForm ? 'Cancel' : 'New Restock'}
            </button>
          </div>

          {showRestockForm && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              {hasVariants && (
                <select
                  value={restockVariantId}
                  onChange={e => setRestockVariantId(e.target.value)}
                  className="w-full bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none"
                >
                  <option value="">Select variant</option>
                  {activeVariants.map(v => (
                    <option key={v.id} value={v.id}>{v.name} {v.sku ? `(${v.sku})` : ''} - Stock: {v.stock}</option>
                  ))}
                </select>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  placeholder="Quantity"
                  className="bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={restockCost}
                  onChange={e => setRestockCost(e.target.value)}
                  placeholder="Cost per unit (৳)"
                  className="bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                />
              </div>
              
              {suppliers.length > 0 && (
                <select
                  value={restockSupplierId}
                  onChange={e => setRestockSupplierId(e.target.value)}
                  className="w-full bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:outline-none"
                >
                  <option value="">Select supplier (optional)</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              
              <input
                value={restockNote}
                onChange={e => setRestockNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full bg-white border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
              />
              
              <button
                type="button"
                onClick={() => handleRestock(onAdjustSuccess)}
                disabled={!restockQty || isPending || (hasVariants && !restockVariantId)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-inputs bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Confirm Restock
              </button>
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
