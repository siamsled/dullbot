import { useState, useEffect, useTransition } from 'react';
import { Product, StockMovement, Variant } from '../productForm.types';
import { manualStockAdjust, restockProduct, getStockMovements } from '../../../actions';

export function useInventory(product?: Product, activeVariants: Variant[] = []) {
  const [isPending, startTransition] = useTransition();

  // Movements
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoaded, setMovementsLoaded] = useState(false);

  // Adjust
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjustVariantId, setAdjustVariantId] = useState('');

  // Restock
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [restockQty, setRestockQty] = useState('');
  const [restockSupplierId, setRestockSupplierId] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockNote, setRestockNote] = useState('');
  const [restockVariantId, setRestockVariantId] = useState('');

  useEffect(() => {
    if (product) {
      getStockMovements(product.id).then((data: unknown) => {
        setMovements(data as StockMovement[]);
        setMovementsLoaded(true);
      });
    } else {
      setMovementsLoaded(true);
    }
  }, [product]);

  const hasVariants = activeVariants.length > 0;

  const handleAdjust = async (onSuccess: (newStock: number) => void) => {
    if (!product) return;
    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta) || delta === 0) { setAdjustError('Enter a non-zero quantity'); return; }
    if (!adjustNote.trim()) { setAdjustError('A reason note is required'); return; }
    if (hasVariants && !adjustVariantId) { setAdjustError('Select a variant'); return; }
    
    setAdjustError('');
    startTransition(async () => {
      const res = await manualStockAdjust(product.id, delta, adjustNote, adjustVariantId || undefined);
      if (res?.error) { setAdjustError(res.error); return; }
      
      setAdjustDelta('');
      setAdjustNote('');
      if (res && 'resultingStock' in res) {
        onSuccess(res.resultingStock ?? 0);
      }
      getStockMovements(product.id).then((data: unknown) => setMovements(data as StockMovement[]));
    });
  };

  const handleRestock = async (onSuccess: (newStock: number) => void) => {
    if (!product) return;
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) return;
    if (hasVariants && !restockVariantId) return;

    startTransition(async () => {
      const res = await restockProduct(
        product.id,
        qty,
        restockNote || 'Restock',
        restockVariantId || null,
        restockSupplierId || null,
        restockCost ? parseFloat(restockCost) : null
      );
      setShowRestockForm(false);
      setRestockQty('');
      setRestockNote('');
      setRestockCost('');
      setRestockSupplierId('');
      if (res && 'resultingStock' in res) {
        onSuccess(res.resultingStock ?? 0);
      }
      getStockMovements(product.id).then((data: unknown) => setMovements(data as StockMovement[]));
    });
  };

  return {
    state: {
      isPending,
      movements,
      movementsLoaded,
      
      adjustDelta,
      adjustNote,
      adjustError,
      adjustVariantId,
      
      showRestockForm,
      restockQty,
      restockSupplierId,
      restockCost,
      restockNote,
      restockVariantId,
    },
    setters: {
      setAdjustDelta,
      setAdjustNote,
      setAdjustVariantId,
      
      setShowRestockForm,
      setRestockQty,
      setRestockSupplierId,
      setRestockCost,
      setRestockNote,
      setRestockVariantId,
    },
    handleAdjust,
    handleRestock,
  };
}
