'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, Clock, Users, MapPin, Share2, Award, ShieldAlert,
  Percent, ShoppingCart, Truck, AlertOctagon, Package, ArrowUpRight, Flame, CheckCircle2
} from 'lucide-react';
import { fetchAnalyticsByRange } from './actions';
import { CourierLogo } from '@/components/ui/CourierLogos';

interface Props {
  range: number;
  revenueTrend: any[];
  peakTimes: number[][]; // [7][3]
  customerGrowth: any[];
  topRegions: any[];
  channelPerformance: any[];
  topProducts: any[];
  paymentStats: {
    tier1Rate: number;
    tier2Rate: number;
    mismatchRate: number;
    total: number;
  };
  profitMargins?: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPercent: number;
  };
  basketAnalysis?: Array<{ productA: string; productB: string; count: number }>;
  inventoryRunway?: Array<{ id: string; name: string; stock: number; category: string; soldInPeriod: number; daysRemaining: number; isDeadStock: boolean }>;
  courierPerformance?: Array<{ provider: string; totalShipped: number; deliveredCount: number; avgDays: number; deliverySuccessRate: number }>;
  paymentBreakdown?: Array<{ method: string; count: number; totalTaka: number; share: number }>;
  cancellationBreakdown?: Array<{ reason: string; count: number }>;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid rgba(163, 166, 175, 0.3)',
    borderRadius: '16px',
    fontSize: '11px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    fontFamily: 'var(--font-sohne)',
  },
  labelStyle: { color: '#777b86', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const }
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSIONS = ['Morning (<12 PM)', 'Afternoon (12-6 PM)', 'Evening (>6 PM)'];

export default function AnalyticsClient({
  range: initialRange,
  revenueTrend: initialRevenueTrend,
  peakTimes: initialPeakTimes,
  customerGrowth: initialCustomerGrowth,
  topRegions: initialTopRegions,
  channelPerformance: initialChannelPerformance,
  topProducts: initialTopProducts,
  paymentStats: initialPaymentStats,
  profitMargins: initialProfitMargins = { totalRevenue: 0, totalCost: 0, grossProfit: 0, marginPercent: 0 },
  basketAnalysis: initialBasketAnalysis = [],
  inventoryRunway: initialInventoryRunway = [],
  courierPerformance: initialCourierPerformance = [],
  paymentBreakdown: initialPaymentBreakdown = [],
  cancellationBreakdown: initialCancellationBreakdown = [],
}: Props) {
  // ── Local state: switching pills is instant — no router navigation ──────
  const [activeRange, setActiveRange] = useState(initialRange);

  // ── React Query: fetches new data via server action when range changes ──
  const { data } = useQuery({
    queryKey: ['analytics', activeRange],
    queryFn: () => fetchAnalyticsByRange(activeRange),
    initialData: {
      revenueTrend: initialRevenueTrend,
      peakTimes: initialPeakTimes,
      customerGrowth: initialCustomerGrowth,
      topRegions: initialTopRegions,
      channelPerformance: initialChannelPerformance,
      topProducts: initialTopProducts,
      paymentStats: initialPaymentStats,
      profitMargins: initialProfitMargins,
      basketAnalysis: initialBasketAnalysis,
      inventoryRunway: initialInventoryRunway,
      courierPerformance: initialCourierPerformance,
      paymentBreakdown: initialPaymentBreakdown,
      cancellationBreakdown: initialCancellationBreakdown,
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });

  const {
    revenueTrend,
    peakTimes,
    customerGrowth,
    topRegions,
    channelPerformance,
    topProducts,
    paymentStats,
    profitMargins = initialProfitMargins,
    basketAnalysis = initialBasketAnalysis,
    inventoryRunway = initialInventoryRunway,
    courierPerformance = initialCourierPerformance,
    paymentBreakdown = initialPaymentBreakdown,
    cancellationBreakdown = initialCancellationBreakdown,
  } = (data as any) || {};

  const maxPeak = Math.max(...(peakTimes || []).flatMap((row: any) => row), 1);

  return (
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

      {/* HEADER & DATE RANGE FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5">Analytics</h1>
          <p className="text-ash text-sm">Understand your sales performance, customer trends, and conversion channels.</p>
        </div>
        {/* Pills switch activeRange instantly — no navigation, no disabled state */}
        <div className="flex gap-1 bg-fog p-1 rounded-inputs self-start shadow-subtle border border-dove/5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setActiveRange(d)}
              className={`px-3.5 py-1.5 rounded-buttons text-xs font-semibold transition-all ${
                activeRange === d
                  ? 'bg-white text-ink shadow-subtle'
                  : 'text-ash hover:text-ink'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => setActiveRange(0)}
            className={`px-3.5 py-1.5 rounded-buttons text-xs font-semibold transition-all ${
              activeRange === 0
                ? 'bg-white text-ink shadow-subtle'
                : 'text-ash hover:text-ink'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* REVENUE TREND */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp className="w-4 h-4 text-ink" />
          <div>
            <h3 className="text-sm font-semibold text-ink">Revenue Trend</h3>
            <p className="text-xs text-ash">Daily aggregated store earnings over time</p>
          </div>
        </div>
        {revenueTrend.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-ash text-xs">
            <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
            No sales recorded in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#17191c" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#17191c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#17191c" strokeWidth={1.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* HEATMAP & CUSTOMER GROWTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <Clock className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Peak Order Times</h3>
                <p className="text-xs text-ash">Order distribution grouped by Dhaka local time</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[420px] grid grid-cols-4 gap-2 pt-1">
                {/* Header row */}
                <div />
                {SESSIONS.map((s, idx) => (
                  <div key={idx} className="text-[10px] font-semibold text-graphite text-center truncate">{s}</div>
                ))}

                {/* Day rows */}
                {DAYS_OF_WEEK.map((day, dIdx) => (
                  <div key={day} className="contents">
                    <div className="text-[10px] font-semibold text-ink flex items-center">{day}</div>
                    {SESSIONS.map((_, sIdx) => {
                      const count = peakTimes[dIdx]?.[sIdx] ?? 0;
                      const opacity = count > 0 ? 0.08 + (count / maxPeak) * 0.92 : 0.02;
                      return (
                        <div
                          key={`cell-${dIdx}-${sIdx}`}
                          className="h-10 rounded-inputs flex items-center justify-center font-mono text-[10px] font-bold text-ink transition-all hover:scale-[1.03]"
                          style={{
                            backgroundColor: `rgba(23, 25, 28, ${opacity})`,
                            border: '1px solid rgba(23, 25, 28, 0.05)'
                          }}
                          title={`${count} orders on ${day} ${SESSIONS[sIdx].split(' ')[0]}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Color scale legend */}
          <div className="mt-6 flex items-center justify-between text-[10px] text-graphite font-semibold">
            <span>Fewer orders</span>
            <div className="flex-1 mx-4 h-1.5 rounded-full bg-gradient-to-r from-ink/5 to-ink" />
            <span>More orders</span>
          </div>
        </div>

        {/* Stacked Customer Growth */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <Users className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Customer Growth</h3>
                <p className="text-xs text-ash">Stacked breakdown of new vs returning purchases per week</p>
              </div>
            </div>
            {customerGrowth.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-ash text-xs">
                <Users className="w-8 h-8 opacity-20 mb-2" />
                No purchases in this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={customerGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-sohne)' }} />
                  <Bar dataKey="new" name="New Customers" stackId="a" fill="#17191c" barSize={20} />
                  <Bar dataKey="returning" name="Returning" stackId="a" fill="#fbe1d1" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* REGIONS & CHANNEL PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regions */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <MapPin className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Top Customer Regions</h3>
              <p className="text-xs text-ash">Bangladeshi districts ranked by confirmed order share</p>
            </div>
          </div>
          {topRegions.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ash text-xs">No address data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topRegions} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="district" type="category" tick={{ fontSize: 10, fill: '#17191c', fontWeight: 500 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Order Share']} />
                <Bar dataKey="share" fill="#17191c" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel Performance */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Share2 className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Channel Performance</h3>
              <p className="text-xs text-ash">Conversion rate (conversations to confirmed order) per channel</p>
            </div>
          </div>
          {channelPerformance.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ash text-xs">No conversation traffic recorded</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={channelPerformance} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 10, fill: '#17191c', fontWeight: 500 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Conv. Rate']} />
                <Bar dataKey="convRate" fill="#fbe1d1" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TOP PRODUCTS & PAYMENT STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-2 bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Award className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Top Products</h3>
              <p className="text-xs text-ash">Best selling catalog products ranked by revenue</p>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ash text-xs">No sales details to display</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1eeea" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#777b86' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#17191c', fontWeight: 500 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`৳${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#17191c" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Verification Tiles */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <ShieldAlert className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Verification Stats</h3>
                <p className="text-xs text-ash">Payment check audits ({activeRange === 0 ? 'all time' : `last ${activeRange}d`})</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center text-[10px] font-bold border border-green-150">T1</div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink leading-tight">Companion App Confirmation</p>
                    <p className="text-[9px] text-graphite mt-0.5">Tier 1 Automatic verification</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-ink">{paymentStats.tier1Rate}%</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-150">T2</div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink leading-tight">Merchant API Confirmation</p>
                    <p className="text-[9px] text-graphite mt-0.5">Tier 2 Real-time API query</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-ink">{paymentStats.tier2Rate}%</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-fog rounded-inputs border border-dove/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-red-750 flex items-center justify-center text-[10px] font-bold border border-red-150">ERR</div>
                  <div>
                    <p className="text-[11px] font-semibold text-ink leading-tight">Mismatch / Escalation Rate</p>
                    <p className="text-[9px] text-graphite mt-0.5">Transferred to manual review</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-rust">{paymentStats.mismatchRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: UNIT ECONOMICS & GROSS PROFIT MARGIN */}
      <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Percent className="w-4 h-4 text-emerald-700" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Gross Margin & Unit Economics</h3>
              <p className="text-xs text-ash">True profitability calculated using product cost price vs captured revenue</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
            {profitMargins.marginPercent}% Gross Margin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-fog rounded-inputs border border-dove/5">
            <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">Gross Revenue</span>
            <p className="text-2xl font-serif font-medium text-ink font-mono">৳{(profitMargins.totalRevenue || 0).toLocaleString()}</p>
            <span className="text-[10px] text-ash">Total order value</span>
          </div>

          <div className="p-4 bg-fog rounded-inputs border border-dove/5">
            <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">Estimated COGS</span>
            <p className="text-2xl font-serif font-medium text-ash font-mono">৳{(profitMargins.totalCost || 0).toLocaleString()}</p>
            <span className="text-[10px] text-ash">Product cost basis</span>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-inputs border border-emerald-150">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Gross Profit</span>
            <p className="text-2xl font-serif font-medium text-emerald-700 font-mono">৳{(profitMargins.grossProfit || 0).toLocaleString()}</p>
            <span className="text-[10px] text-emerald-600/80">Net profit before overhead</span>
          </div>

          <div className="p-4 bg-fog rounded-inputs border border-dove/5">
            <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">Profitability Ratio</span>
            <p className="text-2xl font-serif font-medium text-ink font-mono">{profitMargins.marginPercent}%</p>
            <span className="text-[10px] text-ash">৳{profitMargins.marginPercent > 0 ? (profitMargins.marginPercent / 100 * 100).toFixed(0) : '0'} profit per ৳100</span>
          </div>
        </div>
      </div>

      {/* SECTION 5: BASKET ANALYSIS & INVENTORY RUNWAY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Basket Analysis: "Customers who bought X also bought Y" */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <ShoppingCart className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Basket Cross-Sell Analysis</h3>
                <p className="text-xs text-ash">"Customers who bought X also bought Y" — top complementary pairs</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {(!basketAnalysis || basketAnalysis.length === 0) ? (
                <div className="h-44 flex flex-col items-center justify-center text-ash text-xs text-center p-4">
                  <ShoppingCart className="w-6 h-6 opacity-30 mb-1" />
                  No multi-item purchase patterns detected yet.
                </div>
              ) : (
                basketAnalysis.map((pair: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-fog rounded-inputs border border-dove/5 text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-white text-ink font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-ink truncate block">{pair.productA}</span>
                        <span className="text-[10px] text-ash truncate block">+ {pair.productB}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white text-ink font-mono font-bold rounded shadow-xs shrink-0 text-[11px]">
                      {pair.count} bundles
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Inventory Runway & Dead Stock Alerts */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Package className="w-4 h-4 text-ink" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Inventory Turnover & Runway</h3>
                <p className="text-xs text-ash">Days of stock remaining based on sales velocity</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {(!inventoryRunway || inventoryRunway.length === 0) ? (
                <div className="h-44 flex flex-col items-center justify-center text-ash text-xs text-center p-4">
                  <Package className="w-6 h-6 opacity-30 mb-1" />
                  No inventory tracking data available.
                </div>
              ) : (
                inventoryRunway.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-fog rounded-inputs border border-dove/5 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-ink truncate leading-tight">{item.name}</p>
                      <p className="text-[10px] text-ash font-mono">{item.stock} in stock · {item.soldInPeriod} sold in period</p>
                    </div>

                    <div className="shrink-0 text-right">
                      {item.isDeadStock ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rust rounded text-[10px] font-bold">
                          ⚠️ Dead Stock
                        </span>
                      ) : (
                        <span className={`font-mono font-bold text-xs ${item.daysRemaining < 7 ? 'text-rust' : 'text-emerald-700'}`}>
                          {item.daysRemaining > 365 ? '>1 yr runway' : `~${item.daysRemaining}d stock`}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: COURIER DELIVERY BENCHMARKS & PAYMENT RAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Courier Performance Comparison */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Truck className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Courier Delivery Benchmarks</h3>
              <p className="text-xs text-ash">Fulfillment turnaround time and delivery success rates</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {courierPerformance.map((c: any) => (
              <div key={c.provider} className="flex items-center justify-between p-3 bg-fog rounded-inputs border border-dove/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1.5 shadow-xs border border-dove/10 shrink-0">
                    <CourierLogo provider={c.provider} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="font-semibold text-ink block">{c.provider}</span>
                    <span className="text-[10px] text-ash font-mono">{c.totalShipped} orders shipped</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-right">
                  <div>
                    <span className="text-xs font-bold text-ink block">~{c.avgDays} days</span>
                    <span className="text-[9px] text-ash">Avg fulfillment</span>
                  </div>
                  <div className="w-px h-6 bg-dove/20" />
                  <div>
                    <span className="text-xs font-bold text-emerald-700 block">{c.deliverySuccessRate}%</span>
                    <span className="text-[9px] text-ash">Delivered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Rails Breakdown */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Share2 className="w-4 h-4 text-ink" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Payment Method Breakdown</h3>
              <p className="text-xs text-ash">Distribution of customer payment preferences</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {paymentBreakdown.map((pm: any) => (
              <div key={pm.method} className="flex items-center justify-between p-3 bg-fog rounded-inputs border border-dove/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-ink">{pm.method}</span>
                  <span className="text-[10px] text-ash font-mono">({pm.count} orders)</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-right">
                  <span className="text-xs font-bold text-ink">৳{pm.totalTaka.toLocaleString()}</span>
                  <span className="px-2 py-0.5 bg-white text-ink rounded border border-dove/10 text-[10px] font-bold">
                    {pm.share}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  </div>
  );
}
