'use client';

import { useState, useEffect, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, Building2, Activity, BarChart2, AlertTriangle } from 'lucide-react';
import { InventoryTableSkeleton } from '@/components/ui/SkeletonLoaders';

import dynamic from 'next/dynamic';
import CatalogueTable from './components/CatalogueTable';
import ProductSlideOver, { type Product, type Variant } from './components/ProductSlideOver';
import SuppliersTab, { type Supplier } from './components/SuppliersTab';
import ActivityLog from './components/ActivityLog';
import ReportsTab from './components/ReportsTab';
import ReorderPanel from './components/ReorderPanel';
import CSVImport from './components/CSVImport';

// Dynamically imported — @zxing/browser is browser-only (camera/getUserMedia)
const BarcodeScanner = dynamic(() => import('./components/BarcodeScanner'), { ssr: false });

import {
  approveProduct, rejectProduct,
  bulkDeleteProducts, bulkToggleVisibility, bulkReassignCategory, getShopMovements,
} from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'catalogue' | 'suppliers' | 'activity' | 'reports';

type StockMovement = {
  id: string;
  change_type: 'order' | 'manual_adjust' | 'restock' | 'import' | 'initial_stock';
  quantity_delta: number;
  resulting_stock: number;
  note?: string | null;
  created_at: string;
  variant_id?: string | null;
  supplier_id?: string | null;
  cost_per_unit?: number | null;
  suppliers?: { name?: string } | null;
  products?: { name?: string } | null;
  product_id?: string;
};

interface ReorderCandidate {
  id: string;
  name: string;
  stock: number;
  images: string[];
  dailyVelocity: number;
  daysUntilEmpty: number | null;
  suggestedReorderQty: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  price: number;
}

interface Props {
  shopId: string;
  products: Product[];
  variants: Variant[];
  suppliers: Supplier[];
  movements: StockMovement[];
  reorderCandidates: ReorderCandidate[];
  lowStockProducts: LowStockProduct[];
  inventoryStats: {
    totalRetailValue: number;
    totalCostValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalProducts: number;
  } | null;
  existingCategories: string[];
  websiteUrl: string;
}

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'catalogue', label: 'Live Catalogue', icon: Package },
  { value: 'suppliers', label: 'Suppliers', icon: Building2 },
  { value: 'activity', label: 'Activity', icon: Activity },
  { value: 'reports', label: 'Reports', icon: BarChart2 },
];

export default function InventoryClient({
  shopId,
  products: initialProducts,
  variants: initialVariants,
  suppliers: initialSuppliers,
  movements: initialMovements,
  reorderCandidates,
  lowStockProducts,
  inventoryStats,
  existingCategories,
  websiteUrl,
}: Props) {
  const [tab, setTab] = useState<Tab>('catalogue');
  const [isPending, startTransition] = useTransition();

  const { data: fetchedProducts = initialProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['inventory-products', shopId],
    queryFn: () => initialProducts,
    initialData: initialProducts,
    staleTime: 1000 * 60 * 5,
  });

  const [products, setProducts] = useState<Product[]>(fetchedProducts);

  useEffect(() => {
    setProducts(fetchedProducts);
  }, [fetchedProducts]);

  // Movements state
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);

  const refreshMovements = async () => {
    const latest = await getShopMovements(shopId);
    setMovements(latest as StockMovement[]);
  };

  // Slide-over
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [slideOverProduct, setSlideOverProduct] = useState<Product | undefined>(undefined);
  const [slideOverVariants, setSlideOverVariants] = useState<Variant[]>([]);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Modals
  const [showBarcode, setShowBarcode] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Build variant summaries map
  const variantSummaries: Record<string, { count: number; totalStock: number }> = {};
  for (const v of initialVariants) {
    if (!variantSummaries[v.product_id]) {
      variantSummaries[v.product_id] = { count: 0, totalStock: 0 };
    }
    variantSummaries[v.product_id].count += 1;
    variantSummaries[v.product_id].totalStock += v.stock;
  }

  const openAddProduct = () => {
    setSlideOverProduct(undefined);
    setSlideOverVariants([]);
    setIsNewProduct(true);
    setSlideOverOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setSlideOverProduct(product);
    setSlideOverVariants(initialVariants.filter(v => v.product_id === product.id));
    setIsNewProduct(false);
    setSlideOverOpen(true);
  };

  const handleProductSaved = (saved: Product, isNew: boolean) => {
    if (isNew) {
      setProducts(prev => [{ ...saved, updated_at: new Date().toISOString() }, ...prev]);
    } else {
      setProducts(prev => prev.map(p => p.id === saved.id ? { ...p, ...saved } : p));
    }
    setSlideOverOpen(false);
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveProduct(id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, draft: false, is_active: true } : p));
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      await rejectProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    startTransition(async () => {
      await bulkDeleteProducts(ids);
      setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    });
  };

  const handleBulkToggle = (ids: string[], active: boolean) => {
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_active: active } : p));
    startTransition(async () => {
      await bulkToggleVisibility(ids, active);
    });
  };

  const handleBulkReassign = (ids: string[], category: string) => {
    startTransition(async () => {
      await bulkReassignCategory(ids, category);
      setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, category } : p));
    });
  };

  const lowStockCount = products.filter(
    p => !p.draft && p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold ?? 5)
  ).length;
  const outOfStockCount = products.filter(p => !p.draft && p.stock_quantity === 0).length;

  return (
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-serif text-ink tracking-tight mb-2">Inventory</h1>
            <p className="text-ash text-base">
              {products.filter(p => !p.draft).length} live product{products.filter(p => !p.draft).length !== 1 ? 's' : ''}
              {lowStockCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-rust text-sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lowStockCount} low stock
                </span>
              )}
              {outOfStockCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-rust text-sm font-medium">
                  · {outOfStockCount} out of stock
                </span>
              )}
            </p>
          </div>

          {/* Summary stats */}
          {inventoryStats && (
            <div className="flex gap-4">
              <div className="bg-sky-wash rounded-xl px-4 py-2.5 text-right">
                <p className="text-xs text-ash">Retail Value</p>
                <p className="text-lg font-serif text-ink">৳{inventoryStats.totalRetailValue.toLocaleString('en-BD')}</p>
              </div>
              <div className="bg-apricot-wash rounded-xl px-4 py-2.5 text-right">
                <p className="text-xs text-ash">Cost Basis</p>
                <p className="text-lg font-serif text-ink">৳{inventoryStats.totalCostValue.toLocaleString('en-BD')}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Reorder alert (Sleek & Minimizable) */}
      {reorderCandidates.length > 0 && tab === 'catalogue' && (
        <ReorderPanel
          candidates={reorderCandidates}
          suppliers={initialSuppliers}
          onRestocked={() => window.location.reload()}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-dove/10">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ash hover:text-ink hover:border-dove/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {tab === 'catalogue' && (
          <CatalogueTable
            products={products}
            variants={initialVariants}
            reorderCandidates={reorderCandidates}
            variantSummaries={variantSummaries}
            onAddProduct={openAddProduct}
            onEditProduct={openEditProduct}
            onBulkDelete={handleBulkDelete}
            onBulkToggle={handleBulkToggle}
            onBulkReassign={handleBulkReassign}
            onApprove={handleApprove}
            onReject={handleReject}
            onExportCSV={() => {}}
            onOpenImport={() => setShowCSVImport(true)}
            onOpenBarcode={() => setShowBarcode(true)}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            shopId={shopId}
            websiteUrl={websiteUrl}
          />
        )}

        {tab === 'suppliers' && (
          <SuppliersTab suppliers={initialSuppliers} />
        )}

        {tab === 'activity' && (
          <ActivityLog movements={movements} />
        )}

        {tab === 'reports' && (
          <ReportsTab stats={inventoryStats} lowStockProducts={lowStockProducts} />
        )}
      </motion.div>

      {/* Product Slide-Over */}
      {slideOverOpen && (
        <ProductSlideOver
          isNew={isNewProduct}
          product={slideOverProduct}
          variants={slideOverVariants}
          suppliers={initialSuppliers}
          existingCategories={existingCategories}
          shopId={shopId}
          onClose={() => setSlideOverOpen(false)}
          onSaved={handleProductSaved}
          onMovementAdded={refreshMovements}
        />
      )}

      {/* Barcode Scanner */}
      {showBarcode && (
        <BarcodeScanner
          onResult={(text) => {
            setShowBarcode(false);
            setSearchQuery(text);
          }}
          onClose={() => setShowBarcode(false)}
        />
      )}

      {/* CSV Import */}
      {showCSVImport && (
        <CSVImport
          onClose={() => setShowCSVImport(false)}
          onImported={() => {
            setShowCSVImport(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  </div>
  );
}
