'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart2, Download, TrendingDown, DollarSign, Package, AlertTriangle, 
  Calendar, Award, Star, ShoppingBag, Eye, ArrowRight, Loader2, Search, Sparkles
} from 'lucide-react';
import { getSalesByProduct } from '../actions';

const BOM = '\uFEFF';

interface Stats {
  totalRetailValue: number;
  totalCostValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalProducts: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  price: number;
}

interface SalesItem {
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number;
  unitsSold: number;
}

interface Props {
  stats: Stats | null;
  lowStockProducts: LowStockProduct[];
}

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const content = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsTab({ stats, lowStockProducts }: Props) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [salesData, setSalesData] = useState<SalesItem[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [reportSearch, setReportSearch] = useState('');

  // Auto-run report on mount
  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const data = await getSalesByProduct(
        new Date(startDate).toISOString(),
        new Date(endDate + 'T23:59:59').toISOString()
      );
      setSalesData(data as any);
      setSalesLoaded(true);
    } finally {
      setLoadingSales(false);
    }
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    let start = new Date();
    if (days === 0) {
      // Year to date
      start = new Date(end.getFullYear(), 0, 1);
    } else {
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    }
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    setStartDate(startStr);
    setEndDate(endStr);
    
    // Trigger fetch instantly using the newly computed dates
    setLoadingSales(true);
    getSalesByProduct(
      new Date(startStr).toISOString(),
      new Date(endStr + 'T23:59:59').toISOString()
    ).then(data => {
      setSalesData(data as any);
      setSalesLoaded(true);
    }).finally(() => {
      setLoadingSales(false);
    });
  };

  const handleExportLowStock = () => {
    exportCSV(
      'low-stock-report.csv',
      ['Product', 'Current Stock', 'Low Stock Threshold', 'Status'],
      lowStockProducts.map(p => [
        p.name,
        p.stock_quantity,
        p.low_stock_threshold,
        p.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock',
      ])
    );
  };

  const handleExportSales = () => {
    if (!salesData.length) return;
    exportCSV(
      `sales-report-${startDate}-to-${endDate}.csv`,
      ['Product', 'Units Sold', 'Unit Price', 'Est. Revenue'],
      salesData.map(s => [s.name, s.unitsSold, s.price, s.unitsSold * s.price])
    );
  };

  // Filter report results by search term
  const filteredSales = salesData.filter(s => 
    s.name.toLowerCase().includes(reportSearch.toLowerCase())
  );

  // Compute stats aggregates
  const totalUnits = salesData.reduce((acc, s) => acc + s.unitsSold, 0);
  const totalEstRevenue = salesData.reduce((acc, s) => acc + (s.unitsSold * s.price), 0);
  const topProduct = salesData.length > 0 ? salesData[0] : null;

  const valueCards = [
    {
      label: 'Retail Value',
      value: `৳${(stats?.totalRetailValue ?? 0).toLocaleString('en-BD')}`,
      sub: 'stock × selling price',
      color: 'bg-sky-wash',
      icon: DollarSign,
    },
    {
      label: 'Cost Basis',
      value: `৳${(stats?.totalCostValue ?? 0).toLocaleString('en-BD')}`,
      sub: 'stock × cost price',
      color: 'bg-apricot-wash',
      icon: Package,
    },
    {
      label: 'Low Stock',
      value: stats?.lowStockCount ?? 0,
      sub: 'below threshold',
      color: 'bg-white border border-dove/10',
      icon: TrendingDown,
    },
    {
      label: 'Out of Stock',
      value: stats?.outOfStockCount ?? 0,
      sub: 'zero inventory',
      color: 'bg-white border border-dove/10',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-graphite" />
        <h2 className="text-lg font-medium text-ink font-sans">Inventory &amp; Sales Reports</h2>
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {valueCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-cards p-5 shadow-subtle ${card.color}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-ash">{card.label}</p>
                <Icon className="w-4 h-4 text-graphite" />
              </div>
              <p className="text-2xl font-serif text-ink tracking-tight">{card.value}</p>
              <p className="text-xs text-ash mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Sales by Product Section */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dove/10 pb-4">
          <div>
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ink" />
              Sales by Product Performance
            </h3>
            <p className="text-xs text-ash mt-0.5">Identify your highest volume and most valuable products</p>
          </div>
          {salesData.length > 0 && (
            <button
              onClick={handleExportSales}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-buttons border border-dove/30 text-xs text-ash hover:text-ink hover:border-ink/30 transition-colors self-start sm:self-center shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        {/* Filters and Date Pickers */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-fog/50 p-4 rounded-inputs border border-dove/10">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider">From</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-white border border-dove/30 rounded-inputs px-3 py-2 pr-8 text-xs text-ink focus:border-ink/50 focus:outline-none shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider">To</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-white border border-dove/30 rounded-inputs px-3 py-2 pr-8 text-xs text-ink focus:border-ink/50 focus:outline-none shadow-sm"
                />
              </div>
            </div>
            <button
              onClick={fetchSales}
              disabled={loadingSales}
              className="flex items-center gap-1.5 px-4 py-2 rounded-buttons bg-ink text-white text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50 shadow-subtle shrink-0 h-[34px]"
            >
              {loadingSales ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BarChart2 className="w-3.5 h-3.5" />
              )}
              {loadingSales ? 'Running...' : 'Run Report'}
            </button>
          </div>

          {/* Quick Preset buttons */}
          <div className="space-y-1.5 lg:text-right">
            <span className="block text-[10px] font-bold text-graphite uppercase tracking-wider">Quick Presets</span>
            <div className="flex flex-wrap gap-1 bg-white p-1 rounded-inputs border border-dove/25 shadow-sm inline-flex">
              {[
                { label: '7d', days: 7 },
                { label: '30d', days: 30 },
                { label: '90d', days: 90 },
                { label: 'YTD', days: 0 },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.days)}
                  disabled={loadingSales}
                  className="px-2.5 py-1 text-[11px] font-semibold text-ash hover:text-ink rounded-buttons hover:bg-fog transition-colors disabled:opacity-40"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Loading State / Aggregate Cards */}
        {salesLoaded && !loadingSales && salesData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-fog/30 border border-dove/10 rounded-cards p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-wash/50 flex items-center justify-center shrink-0 text-ink">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-graphite font-bold uppercase tracking-wider block">Total Volume Sold</span>
                <p className="text-lg font-serif text-ink tracking-tight mt-0.5">{totalUnits} units</p>
              </div>
            </div>

            <div className="bg-fog/30 border border-dove/10 rounded-cards p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 text-green-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-graphite font-bold uppercase tracking-wider block">Estimated Gross Revenue</span>
                <p className="text-lg font-serif text-ink tracking-tight mt-0.5">৳{totalEstRevenue.toLocaleString('en-BD')}</p>
              </div>
            </div>

            <div className="bg-fog/30 border border-dove/10 rounded-cards p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-apricot-wash/50 flex items-center justify-center shrink-0 text-rust">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-graphite font-bold uppercase tracking-wider block">Top Performer</span>
                <p className="text-sm font-semibold text-ink truncate mt-0.5">{topProduct?.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search bar inside report */}
        {salesLoaded && salesData.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" />
            <input
              type="text"
              placeholder="Search products within this report..."
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              className="w-full bg-white border border-dove/25 rounded-inputs pl-9 pr-4 py-2 text-xs text-ink focus:border-ink/50 focus:outline-none placeholder:text-dove shadow-sm"
            />
          </div>
        )}

        {/* Results List */}
        {loadingSales ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-graphite" />
            <span className="text-xs text-graphite">Generating report...</span>
          </div>
        ) : salesLoaded ? (
          filteredSales.length === 0 ? (
            <p className="text-sm text-ash text-center py-12">No matching products found in this period.</p>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((s, i) => {
                const max = salesData[0].unitsSold;
                const pct = max > 0 ? (s.unitsSold / max) * 100 : 0;
                
                // Top 3 style classes
                const isGold = i === 0;
                const isSilver = i === 1;
                const isBronze = i === 2;
                
                const badgeColor = isGold ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                   isSilver ? 'bg-slate-100 border-slate-200 text-slate-700' :
                                   isBronze ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                   'bg-fog border-dove/10 text-ash';

                return (
                  <div key={s.productId} className="flex items-center gap-4 group p-2 hover:bg-fog/30 rounded-cards transition-colors border border-transparent hover:border-dove/5">
                    {/* Rank Badge */}
                    <div className={`w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${badgeColor}`}>
                      {i + 1}
                    </div>

                    {/* Product Thumbnail */}
                    <div className="w-10 h-10 rounded-images bg-fog border border-dove/10 flex items-center justify-center overflow-hidden shrink-0">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Package className="w-4 h-4 text-graphite" />
                      )}
                    </div>

                    {/* Performance details & slider */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{s.name}</p>
                          <p className="text-[10px] text-graphite font-mono">Unit Price: ৳{s.price.toLocaleString('en-BD')}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-ink">{s.unitsSold} sold</p>
                          <p className="text-[10px] text-green-700 font-semibold font-mono">৳{(s.unitsSold * s.price).toLocaleString('en-BD')}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-fog rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-ink/30 via-ink/65 to-ink"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-dove/20 rounded-inputs p-6 text-center">
            <Calendar className="w-6 h-6 text-graphite" />
            <p className="text-xs text-ash">Select dates or quick presets above to display product sales metrics.</p>
          </div>
        )}
      </div>

      {/* Low / Out of Stock Summary */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-medium text-ink">Low &amp; Out-of-Stock Products</h3>
            <button
              onClick={handleExportLowStock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-buttons border border-dove/30 text-xs text-ash hover:text-ink hover:border-ink/30 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 text-xs text-ash uppercase tracking-wider bg-fog/95 dark:bg-[#13171d]/95 backdrop-blur-md border-b border-dove/15 shadow-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium text-right">Current Stock</th>
                <th className="px-4 py-2.5 font-medium text-right">Threshold</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {lowStockProducts.map(p => (
                <tr key={p.id} className={p.stock_quantity === 0 ? 'opacity-60' : ''}>
                  <td className="px-4 py-2.5 text-ink font-medium">{p.name}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${p.stock_quantity === 0 ? 'text-rust' : 'text-ink'}`}>
                    {p.stock_quantity}
                  </td>
                  <td className="px-4 py-2.5 text-right text-ash">{p.low_stock_threshold}</td>
                  <td className="px-4 py-2.5">
                    {p.stock_quantity === 0 ? (
                      <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-tags font-medium">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="bg-apricot-wash text-rust text-xs px-2 py-0.5 rounded-tags font-medium">
                        Low Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
