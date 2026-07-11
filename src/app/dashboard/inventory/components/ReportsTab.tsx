'use client';

import { useState } from 'react';
import { BarChart2, Download, TrendingDown, DollarSign, Package, AlertTriangle } from 'lucide-react';
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
  const [salesData, setSalesData] = useState<{ name: string; unitsSold: number; productId: string }[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesLoaded, setSalesLoaded] = useState(false);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const data = await getSalesByProduct(
        new Date(startDate).toISOString(),
        new Date(endDate + 'T23:59:59').toISOString()
      );
      setSalesData(data);
      setSalesLoaded(true);
    } finally {
      setLoadingSales(false);
    }
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
      ['Product', 'Units Sold'],
      salesData.map(s => [s.name, s.unitsSold])
    );
  };

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
        <h2 className="text-lg font-medium text-ink">Inventory Reports</h2>
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

      {/* Sales by Product */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-medium text-ink">Sales by Product</h3>
          {salesData.length > 0 && (
            <button
              onClick={handleExportSales}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-buttons border border-dove/30 text-xs text-ash hover:text-ink hover:border-ink/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end mb-5">
          <div>
            <label className="block text-xs text-ash mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-fog border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-ash mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-fog border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchSales}
            disabled={loadingSales}
            className="flex items-center gap-2 px-4 py-2 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
          >
            {loadingSales ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <BarChart2 className="w-4 h-4" />
            )}
            Run Report
          </button>
        </div>

        {salesLoaded && (
          salesData.length === 0 ? (
            <p className="text-sm text-ash text-center py-8">No sales found in this period.</p>
          ) : (
            <div className="space-y-2">
              {salesData.map((s, i) => {
                const max = salesData[0].unitsSold;
                const pct = max > 0 ? (s.unitsSold / max) * 100 : 0;
                return (
                  <div key={s.productId} className="flex items-center gap-3">
                    <span className="text-xs text-dove w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-ink truncate">{s.name}</span>
                        <span className="text-sm font-medium text-ink ml-2 shrink-0">{s.unitsSold}</span>
                      </div>
                      <div className="h-1.5 bg-fog rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ink/30 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {!salesLoaded && (
          <p className="text-xs text-ash text-center py-6">
            Select a date range and click Run Report to see sales data.
          </p>
        )}
      </div>

      {/* Low / Out of Stock Summary */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-medium text-ink">Low & Out-of-Stock Products</h3>
            <button
              onClick={handleExportLowStock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-buttons border border-dove/30 text-xs text-ash hover:text-ink hover:border-ink/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ash uppercase tracking-wider bg-fog">
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
