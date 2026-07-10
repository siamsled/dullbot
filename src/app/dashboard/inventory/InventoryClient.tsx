'use client';

import { useState, useTransition } from 'react';
import { Package, Globe, Check, X, Plus, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { approveProduct, rejectProduct, toggleProductActive, addProduct } from './actions';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  source: string;
  draft: boolean;
  image_url?: string | null;
  scraped_url?: string | null;
};

interface Props {
  shopId: string;
  liveProducts: Product[];
  draftProducts: Product[];
  websiteUrl?: string | null;
}

export default function InventoryClient({ shopId, liveProducts, draftProducts, websiteUrl: initialWebsiteUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [scrapeUrl, setScrapeUrl] = useState(initialWebsiteUrl || '');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, stock_quantity: 0, currency: 'BDT' });

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setScrapeLoading(true);
    setScrapeMsg('');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, url: scrapeUrl }),
      });
      const data = await res.json();
      setScrapeMsg(data.message || data.error || 'Done.');
      if (res.ok) window.location.reload();
    } catch {
      setScrapeMsg('Failed to reach scraper.');
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await addProduct(newProduct);
      setNewProduct({ name: '', description: '', price: 0, stock_quantity: 0, currency: 'BDT' });
      setShowAddForm(false);
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Inventory</h1>
          <p className="text-ash text-lg">Manage products the AI knows about and can sell.</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Add product form */}
      {showAddForm && (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 mb-8">
          <h2 className="text-base font-medium text-ink mb-4">New Product</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
              placeholder="Product name" className="bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove col-span-2" />
            <input value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)" className="bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove col-span-2" />
            <div className="flex gap-2">
              <input required type="number" min="0" step="0.01" value={newProduct.price || ''} onChange={e => setNewProduct(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                placeholder="Price" className="flex-1 bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove" />
              <select value={newProduct.currency} onChange={e => setNewProduct(p => ({ ...p, currency: e.target.value }))}
                className="bg-fog border border-transparent rounded-inputs px-3 py-2.5 text-sm text-ink focus:outline-none">
                <option>BDT</option><option>USD</option><option>EUR</option>
              </select>
            </div>
            <input required type="number" min="0" value={newProduct.stock_quantity || ''} onChange={e => setNewProduct(p => ({ ...p, stock_quantity: parseInt(e.target.value) || 0 }))}
              placeholder="Stock quantity" className="bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove" />
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-ash hover:text-ink transition-colors">Cancel</button>
              <button type="submit" disabled={isPending} className="px-5 py-2 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Website import */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-graphite" />
          <h2 className="text-base font-medium text-ink">Import from Website</h2>
        </div>
        <p className="text-sm text-ash mb-4">Paste your product page or shop URL. DullBot will extract products as drafts for your review.</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={scrapeUrl}
            onChange={e => setScrapeUrl(e.target.value)}
            placeholder="https://your-shop.com/products"
            className="flex-1 bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
          />
          <button
            onClick={handleScrape}
            disabled={scrapeLoading || !scrapeUrl}
            className="flex items-center gap-2 px-5 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 shrink-0"
          >
            {scrapeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
          </button>
        </div>
        {scrapeMsg && (
          <p className="mt-3 text-sm text-ash flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rust shrink-0" />
            {scrapeMsg}
          </p>
        )}
      </div>

      {/* Draft products for review */}
      {draftProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-medium text-ink">Pending Review</h2>
            <span className="bg-apricot-wash text-rust text-xs font-semibold px-2 py-0.5 rounded-full">{draftProducts.length}</span>
          </div>
          <p className="text-sm text-ash mb-4">Scraped products awaiting your approval before the AI can sell them.</p>
          <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-fog text-xs text-ash uppercase tracking-wider">
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
                    <td className="px-5 py-3 text-right font-medium text-ink">{p.currency} {p.price.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-ash bg-sky-wash px-2 py-0.5 rounded">Scraped</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startTransition(() => approveProduct(p.id))}
                          disabled={isPending}
                          title="Approve"
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startTransition(() => rejectProduct(p.id))}
                          disabled={isPending}
                          title="Reject"
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live products */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-graphite" />
          <h2 className="text-lg font-medium text-ink">Live Catalogue</h2>
          <span className="text-xs text-ash">({liveProducts.length} products)</span>
        </div>
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-fog text-xs text-ash uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium text-right">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {liveProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ash text-sm">
                    No live products yet. Add one above or import from your website.
                  </td>
                </tr>
              ) : liveProducts.map(p => (
                <tr key={p.id} className={`hover:bg-fog/50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{p.name}</p>
                    {p.description && <p className="text-xs text-ash mt-0.5 line-clamp-1">{p.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-ink">{p.currency} {p.price.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${p.stock_quantity === 0 ? 'text-rust' : 'text-ink'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${p.source === 'scraped' ? 'bg-sky-wash text-blue-700' : 'bg-fog text-graphite'}`}>
                      {p.source}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => startTransition(() => toggleProductActive(p.id, p.is_active))}
                      disabled={isPending}
                      title={p.is_active ? 'Hide from AI' : 'Show to AI'}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${p.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-fog text-dove hover:bg-dove/20'}`}
                    >
                      {p.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
