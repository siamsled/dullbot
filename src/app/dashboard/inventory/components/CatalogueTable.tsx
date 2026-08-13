'use client';

import { getPrimaryImageUrl } from '@/lib/product-images';

import { useState, useMemo, useCallback } from 'react';
import {
  Search, ScanLine, Package, Globe, Loader2, AlertTriangle,
  Check, X, ChevronUp, ChevronDown, Trash2, Eye, EyeOff,
  Tag, Plus, Upload, RefreshCcw
} from 'lucide-react';
import type { Product } from './ProductSlideOver';

const PAGE_SIZE = 25;

type SortField = 'name' | 'price' | 'stock_quantity' | 'updated_at';
type SortDir = 'asc' | 'desc';
type FilterChip = 'all' | 'low_stock' | 'out_of_stock' | 'draft' | 'needs_reorder' | 'manual' | 'scraped';

interface ReorderCandidate { id: string }

interface Props {
  products: Product[];
  reorderCandidates: ReorderCandidate[];
  variantSummaries: Record<string, { count: number; totalStock: number }>;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkToggle: (ids: string[], active: boolean) => void;
  onBulkReassign: (ids: string[], category: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onExportCSV: () => void;
  onOpenImport: () => void;
  onOpenBarcode: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  // Website import
  shopId: string;
  websiteUrl: string;
}

const BOM = '\uFEFF';

function exportCatalogueCSV(products: Product[]) {
  const rows = [
    ['Name', 'Description', 'Price', 'Stock', 'SKU', 'Category', 'Status'],
    ...products.map(p => [
      p.name ?? '',
      p.description ?? '',
      p.price != null ? p.price.toString() : '0',
      p.stock_quantity != null ? p.stock_quantity.toString() : '0',
      p.sku ?? '',
      p.category ?? '',
      p.draft ? 'Draft' : (p.is_active ? 'Live' : 'Hidden'),
    ])
  ];
  const content = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'catalogue-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function CatalogueTable({
  products,
  reorderCandidates,
  variantSummaries,
  onAddProduct,
  onEditProduct,
  onBulkDelete,
  onBulkToggle,
  onBulkReassign,
  onApprove,
  onReject,
  onExportCSV,
  onOpenImport,
  onOpenBarcode,
  searchQuery,
  onSearchQueryChange,
  shopId,
  websiteUrl,
}: Props) {
  const search = searchQuery;
  const setSearch = onSearchQueryChange;
  const [filter, setFilter] = useState<FilterChip>('all');
  const [sort, setSort] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [showBulkCategory, setShowBulkCategory] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Website scrape state (preserved from Phase 3)
  const [syncUrl, setSyncUrl] = useState('');
  const [syncFormat, setSyncFormat] = useState('shopify');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const reorderIds = useMemo(() => new Set(reorderCandidates.map(r => r.id)), [reorderCandidates]);

  const filtered = useMemo(() => {
    let list = [...products];

    // Search: name, SKU, variant SKU placeholder (TODO: add variant SKU column to query)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    }

    // Filter chip
    switch (filter) {
      case 'low_stock':
        list = list.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold ?? 5));
        break;
      case 'out_of_stock':
        list = list.filter(p => p.stock_quantity === 0);
        break;
      case 'draft':
        list = list.filter(p => p.draft);
        break;
      case 'needs_reorder':
        list = list.filter(p => reorderIds.has(p.id));
        break;
      case 'manual':
        list = list.filter(p => p.source === 'manual');
        break;
      case 'scraped':
        list = list.filter(p => p.source === 'scraped');
        break;
    }

    // Sort
    list.sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sort === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sort === 'price') { av = a.price; bv = b.price; }
      else if (sort === 'stock_quantity') { av = a.stock_quantity; bv = b.stock_quantity; }
      else if (sort === 'updated_at') { av = a.updated_at ?? ''; bv = b.updated_at ?? ''; }
      return sortDir === 'asc'
        ? (av < bv ? -1 : av > bv ? 1 : 0)
        : (av > bv ? -1 : av < bv ? 1 : 0);
    });

    return list;
  }, [products, search, filter, sort, sortDir, reorderIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sort === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setSortDir('asc'); }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort !== field) return <ChevronUp className="w-3 h-3 text-dove/50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-ink" />
      : <ChevronDown className="w-3 h-3 text-ink" />;
  };

  const allPageSelected = paged.length > 0 && paged.every(p => selected.has(p.id));
  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected(prev => { const next = new Set(prev); paged.forEach(p => next.delete(p.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); paged.forEach(p => next.add(p.id)); return next; });
    }
  };

  const handleSync = async () => {
    if (!syncUrl) return;
    setSyncLoading(true);
    setSyncMsg('');
    setSyncSuccess(false);

    try {
      const res = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, url: syncUrl, format: syncFormat }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setSyncSuccess(true);
        setSyncMsg(data.message);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncMsg(data.error || 'Sync failed.');
      }
    } catch {
      setSyncMsg('Failed to reach server.');
    } finally {
      setSyncLoading(false);
    }
  };

  const FILTER_CHIPS: { value: FilterChip; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'draft', label: 'Draft' },
    { value: 'needs_reorder', label: 'Needs Reorder' },
    { value: 'manual', label: 'Manual' },
    { value: 'scraped', label: 'Scraped' },
  ];

  const draftProducts = products.filter(p => p.draft);

  return (
    <div className="space-y-6">

      {/* ── Draft Review Banner ──────────────────────────────────────── */}
      {draftProducts.length > 0 && (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-dove/10 flex items-center gap-2">
            <h2 className="text-base font-medium text-ink">Pending Review</h2>
            <span className="bg-apricot-wash text-rust text-xs font-semibold px-2 py-0.5 rounded-full">{draftProducts.length}</span>
            <p className="text-sm text-ash ml-2">Scraped products awaiting approval before the AI can sell them.</p>
          </div>
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-fog/95 dark:bg-[#13171d]/95 backdrop-blur-md text-xs text-ash uppercase tracking-wider border-b border-dove/15 shadow-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {draftProducts.map(p => (
                <tr key={p.id} className="hover:bg-fog/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{p.name}</p>
                    {p.description && <p className="text-xs text-ash mt-0.5 line-clamp-1">{p.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-ink">৳{p.price.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-ash bg-sky-wash px-2 py-0.5 rounded">Scraped</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onApprove(p.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Approve">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onReject(p.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Reject">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── API Sync Widget (floating bottom-right) ──────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Expanded popover */}
        {syncOpen && (
          <div className={`w-80 rounded-cards shadow-subtle border p-4 transition-colors ${
            syncSuccess ? 'bg-green-50 border-green-200' : 'bg-white border-dove/10'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-graphite" />
                <span className="text-xs font-semibold text-ink">API Sync</span>
              </div>
              <button onClick={() => setSyncOpen(false)} className="p-0.5 text-graphite hover:text-ink transition-colors rounded-full">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={syncFormat}
                onChange={(e) => setSyncFormat(e.target.value)}
                disabled={syncLoading}
                className="w-full bg-fog border border-transparent rounded-inputs px-3 py-2 text-xs text-ink focus:border-ink/20 focus:outline-none disabled:opacity-60"
              >
                <option value="shopify">Shopify API</option>
                <option value="custom">Custom API</option>
              </select>

              <input
                type="url"
                value={syncUrl}
                onChange={e => setSyncUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSync()}
                placeholder={syncFormat === 'shopify' ? "https://your-store.myshopify.com/products.json" : "https://api.your-store.com/inventory"}
                disabled={syncLoading}
                className="w-full bg-fog border border-transparent rounded-inputs px-3 py-2 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove disabled:opacity-60"
              />

              <button
                onClick={handleSync}
                disabled={syncLoading || !syncUrl.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-buttons bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {syncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                {syncLoading ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>

            {syncMsg && !syncLoading && (
              <div className={`mt-2 flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-xs ${
                syncSuccess ? 'bg-green-100 text-green-800' : 'bg-apricot-wash text-rust'
              }`}>
                {syncSuccess ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3 h-3 text-rust shrink-0 mt-0.5" />}
                <span>{syncMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Pill toggle button */}
        <button
          onClick={() => setSyncOpen(o => !o)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-buttons shadow-subtle text-xs font-semibold transition-all ${
            syncSuccess
              ? 'bg-green-600 text-white hover:bg-green-700'
              : syncOpen
                ? 'bg-ink text-white hover:bg-black'
                : 'bg-white text-ink border border-dove/20 hover:bg-fog hover:border-dove/40'
          }`}
        >
          {syncLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : syncSuccess
              ? <Check className="w-3.5 h-3.5" />
              : <RefreshCcw className="w-3.5 h-3.5" />
          }
          {syncLoading ? 'Syncing…' : syncSuccess ? 'Synced!' : 'API Sync'}
        </button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name, SKU, barcode…"
            className="w-full bg-white border border-dove/20 rounded-inputs pl-9 pr-10 py-2.5 text-sm text-ink focus:border-ink/30 focus:outline-none placeholder:text-dove shadow-subtle"
          />
          <button
            onClick={onOpenBarcode}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite hover:text-ink transition-colors md:hidden"
            title="Scan barcode"
          >
            <ScanLine className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop barcode button */}
        <button
          onClick={onOpenBarcode}
          className="hidden md:flex items-center gap-1.5 px-3 py-2.5 rounded-inputs border border-dove/20 text-sm text-ash hover:text-ink hover:border-ink/30 transition-colors"
          title="Scan barcode"
        >
          <ScanLine className="w-4 h-4" />
          Scan
        </button>

        {/* Actions */}
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-inputs border border-dove/20 text-sm text-ash hover:text-ink hover:border-ink/30 transition-colors"
        >
          <Upload className="w-4 h-4" />
          CSV Import
        </button>
        <button
          onClick={() => exportCatalogueCSV(filtered)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-inputs border border-dove/20 text-sm text-ash hover:text-ink hover:border-ink/30 transition-colors"
        >
          Export
        </button>
        <button
          onClick={onAddProduct}
          className="flex items-center gap-2 px-4 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map(c => (
          <button
            key={c.value}
            onClick={() => { setFilter(c.value); setPage(0); setSelected(new Set()); }}
            className={`px-3 py-1.5 rounded-tags text-xs font-medium transition-colors ${
              filter === c.value ? 'bg-ink text-white' : 'bg-white border border-dove/20 text-ash hover:text-ink hover:border-ink/30'
            }`}
          >
            {c.label}
            {c.value === 'low_stock' && products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold ?? 5)).length > 0 && (
              <span className="ml-1.5 bg-apricot-wash text-rust text-[10px] px-1 rounded-full">
                {products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold ?? 5)).length}
              </span>
            )}
            {c.value === 'needs_reorder' && reorderCandidates.length > 0 && (
              <span className="ml-1.5 bg-apricot-wash text-rust text-[10px] px-1 rounded-full">
                {reorderCandidates.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-ink text-white rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { onBulkToggle(Array.from(selected), true); setSelected(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tags bg-white/10 hover:bg-white/20 text-xs transition-colors"
            >
              <Eye className="w-3 h-3" />
              Set Live
            </button>
            <button
              onClick={() => { onBulkToggle(Array.from(selected), false); setSelected(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tags bg-white/10 hover:bg-white/20 text-xs transition-colors"
            >
              <EyeOff className="w-3 h-3" />
              Set Hidden
            </button>
            <button
              onClick={() => setShowBulkCategory(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tags bg-white/10 hover:bg-white/20 text-xs transition-colors"
            >
              <Tag className="w-3 h-3" />
              Reassign Category
            </button>
            <button
              onClick={() => { if (confirm(`Delete ${selected.size} products?`)) { onBulkDelete(Array.from(selected)); setSelected(new Set()); } }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tags bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-tags bg-white/10 hover:bg-white/20 text-xs transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
          {showBulkCategory && (
            <div className="flex gap-2 w-full mt-1">
              <input
                value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value)}
                placeholder="Category name"
                className="flex-1 bg-white/10 border border-white/20 rounded-inputs px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
              />
              <button
                onClick={() => {
                  if (bulkCategory.trim()) {
                    onBulkReassign(Array.from(selected), bulkCategory.trim());
                    setSelected(new Set());
                    setShowBulkCategory(false);
                    setBulkCategory('');
                  }
                }}
                className="px-4 py-1.5 rounded-inputs bg-white text-ink text-xs font-medium hover:bg-fog transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main Table ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        // Empty state
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-16 text-center">
          <div className="w-20 h-20 rounded-cards bg-fog flex items-center justify-center mx-auto mb-5">
            <Package className="w-10 h-10 text-dove" />
          </div>
          <h3 className="text-xl font-serif text-ink mb-2">
            {search ? 'No products match your search' : 'No products yet'}
          </h3>
          <p className="text-sm text-ash mb-6">
            {search
              ? 'Try a different name, SKU, or scan a barcode.'
              : 'Add your first product manually or import from your website.'}
          </p>
          {!search && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onAddProduct}
                className="flex items-center gap-2 px-5 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-buttons border border-dove/30 text-sm text-ash hover:text-ink hover:border-ink/30 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Connect API
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-fog/90 dark:bg-[#13171d]/95 backdrop-blur-md text-[10px] font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-2xs">
              <tr>
                <th className="sticky top-0 z-10 bg-fog/90 dark:bg-[#13171d]/95 pl-5 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-dove/30 text-ink focus:ring-ink/30 cursor-pointer"
                  />
                </th>
                <th className="sticky top-0 z-20 bg-fog/90 dark:bg-[#13171d]/95 px-4 py-3 text-[10px] font-bold text-graphite uppercase tracking-wider">Image</th>
                <th className="sticky top-0 z-20 bg-fog/90 dark:bg-[#13171d]/95 px-4 py-3 text-[10px] font-bold text-graphite uppercase tracking-wider">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-[10px] font-bold text-graphite uppercase tracking-wider hover:text-ink transition-colors cursor-pointer">
                    Product <SortIcon field="name" />
                  </button>
                </th>
                <th className="sticky top-0 z-20 bg-fog/90 dark:bg-[#13171d]/95 px-4 py-3 text-right text-[10px] font-bold text-graphite uppercase tracking-wider">
                  <button onClick={() => toggleSort('price')} className="flex items-center gap-1 text-[10px] font-bold text-graphite uppercase tracking-wider hover:text-ink transition-colors ml-auto cursor-pointer">
                    Price <SortIcon field="price" />
                  </button>
                </th>
                <th className="sticky top-0 z-20 bg-fog/90 dark:bg-[#13171d]/95 px-4 py-3 text-right text-[10px] font-bold text-graphite uppercase tracking-wider">
                  <button onClick={() => toggleSort('stock_quantity')} className="flex items-center gap-1 text-[10px] font-bold text-graphite uppercase tracking-wider hover:text-ink transition-colors ml-auto cursor-pointer">
                    Stock <SortIcon field="stock_quantity" />
                  </button>
                </th>
                <th className="sticky top-0 z-20 bg-fog/90 dark:bg-[#13171d]/95 px-4 py-3 text-[10px] font-bold text-graphite uppercase tracking-wider">Source</th>
                <th className="sticky top-0 z-20 bg-fog/90 dark:bg-[#13171d]/95 px-4 py-3 text-[10px] font-bold text-graphite uppercase tracking-wider">
                  <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1 text-[10px] font-bold text-graphite uppercase tracking-wider hover:text-ink transition-colors cursor-pointer">
                    Updated <SortIcon field="updated_at" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {paged.map(p => {
                const variantInfo = variantSummaries[p.id];
                const isLowStock = !variantInfo && p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold ?? 5);
                const isOutOfStock = !variantInfo && p.stock_quantity === 0;
                const needsReorder = reorderIds.has(p.id);
                const isSelected = selected.has(p.id);
                const rawImage = getPrimaryImageUrl((p as any).product_images) || p.images?.[0];
                const primaryImage = rawImage && !rawImage.startsWith('blob:') ? rawImage : null;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onEditProduct(p)}
                    className={`hover:bg-fog/50 transition-colors cursor-pointer ${
                      isOutOfStock ? 'opacity-50' : ''
                    } ${isSelected ? 'bg-sky-wash/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="pl-5 pr-2 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelected(prev => {
                          const next = new Set(prev);
                          isSelected ? next.delete(p.id) : next.add(p.id);
                          return next;
                        })}
                        className="rounded border-dove/30 text-ink focus:ring-ink/30 cursor-pointer"
                      />
                    </td>

                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-images bg-fog flex items-center justify-center overflow-hidden shrink-0">
                        {primaryImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={primaryImage}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-dove" />
                        )}
                      </div>
                    </td>

                    {/* Product name + badges */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ink truncate">{p.name}</p>
                        {p.draft && (
                          <span className="bg-fog text-graphite text-[10px] px-1.5 py-0.5 rounded-tags shrink-0">Draft</span>
                        )}
                        {needsReorder && (
                          <span className="bg-apricot-wash text-rust text-[10px] px-1.5 py-0.5 rounded-tags shrink-0">Reorder</span>
                        )}
                        {!p.is_active && !p.draft && (
                          <span className="bg-fog text-dove text-[10px] px-1.5 py-0.5 rounded-tags shrink-0">Hidden</span>
                        )}
                      </div>
                      {p.sku && <p className="text-xs text-dove mt-0.5">SKU: {p.sku}</p>}
                      {variantInfo && (
                        <p className="text-xs text-ash mt-0.5">
                          {variantInfo.count} variant{variantInfo.count !== 1 ? 's' : ''} · {variantInfo.totalStock} total in stock
                        </p>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-ink">৳{p.price.toLocaleString('en-BD')}</span>
                      {p.compare_at_price && (
                        <p className="text-xs text-dove line-through">৳{p.compare_at_price.toLocaleString('en-BD')}</p>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-right">
                      {variantInfo ? (
                        <span className="font-mono text-sm text-ink">{variantInfo.totalStock}</span>
                      ) : (
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className={`font-mono text-sm ${isOutOfStock ? 'text-rust font-semibold' : 'text-ink'}`}>
                            {p.stock_quantity}
                          </span>
                          {isOutOfStock && (
                            <span className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded-tags font-medium">
                              Out of stock
                            </span>
                          )}
                          {isLowStock && (
                            <span className="bg-apricot-wash text-rust text-[10px] px-1.5 py-0.5 rounded-tags font-medium">
                              Low stock
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.source === 'scraped' ? 'bg-sky-wash text-blue-700' : 'bg-fog text-graphite'
                      }`}>
                        {p.source}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-3 text-xs text-ash whitespace-nowrap">
                      {p.updated_at
                        ? new Date(p.updated_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-dove/10 flex items-center justify-between bg-fog">
              <p className="text-xs text-ash">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} products
              </p>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map(i => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-lg text-xs transition-colors ${
                      page === i ? 'bg-ink text-white' : 'text-ash hover:text-ink hover:bg-dove/20'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
