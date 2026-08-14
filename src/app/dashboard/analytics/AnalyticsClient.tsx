'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, Clock, Users, MapPin, Share2, Award, ShieldAlert,
  Percent, ShoppingCart, Truck, Package, ArrowUpRight, CheckCircle2,
  AlertTriangle, ArrowDownRight, Layers, CreditCard, Sparkles, AlertCircle
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

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSIONS = [
  { name: 'Morning', time: '6 AM – 12 PM' },
  { name: 'Afternoon', time: '12 PM – 6 PM' },
  { name: 'Evening', time: '6 PM – 12 AM' },
];

/* ─── High-Contrast Custom Tooltips ────────────────────────────────── */

function CustomRevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-ink text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-white/10 text-xs backdrop-blur-md">
      <p className="text-white/60 font-semibold text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
        <span className="font-bold text-sm text-white font-mono">৳{Number(val).toLocaleString()}</span>
      </div>
      <p className="text-[10px] text-white/50 mt-0.5">Captured Revenue</p>
    </div>
  );
}

function CustomCustomerGrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const newCount = payload.find((p: any) => p.dataKey === 'new')?.value || 0;
  const retCount = payload.find((p: any) => p.dataKey === 'returning')?.value || 0;
  const total = newCount + retCount;
  const retPct = total > 0 ? Math.round((retCount / total) * 100) : 0;

  return (
    <div className="bg-ink text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-white/10 text-xs space-y-1.5 min-w-[150px]">
      <p className="text-white/60 font-semibold text-[10px] uppercase tracking-wider">Week of {label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> New Customers
          </span>
          <span className="font-mono font-bold text-white">{newCount}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-[#A855F7]" /> Returning
          </span>
          <span className="font-mono font-bold text-white">{retCount}</span>
        </div>
      </div>
      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60">
        <span>Total: <strong className="text-white font-mono">{total}</strong></span>
        <span>Returning Share: <strong className="text-[#A855F7] font-mono">{retPct}%</strong></span>
      </div>
    </div>
  );
}

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
  const [activeRange, setActiveRange] = useState(initialRange);
  const [hoveredCell, setHoveredCell] = useState<{ day: string; session: string; count: number; pct: number } | null>(null);

  const initialDataObj = {
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
  };

  const { data, isFetching } = useQuery({
    queryKey: ['analytics-data', activeRange],
    queryFn: async () => {
      const res = await fetchAnalyticsByRange(activeRange);
      return res;
    },
    initialData: activeRange === initialRange ? initialDataObj : undefined,
    staleTime: 0,
  });

  const handleRangeChange = (newRange: number) => {
    setActiveRange(newRange);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newRange === 30) {
        url.searchParams.delete('range');
      } else {
        url.searchParams.set('range', String(newRange));
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const {
    revenueTrend = [],
    peakTimes = [],
    customerGrowth = [],
    topRegions = [],
    channelPerformance = [],
    topProducts = [],
    paymentStats = initialPaymentStats,
    profitMargins = initialProfitMargins,
    basketAnalysis = [],
    inventoryRunway = [],
    courierPerformance = [],
    paymentBreakdown = [],
  } = (data as any) || {};

  // ── Derived Summary Metrics for Revenue Trend Context ──
  const totalPeriodRevenue = (revenueTrend || []).reduce((acc: number, r: any) => acc + (Number(r.revenue) || 0), 0);
  const effectiveDays = activeRange === 0 ? Math.max(revenueTrend.length, 1) : activeRange;
  const avgDailyRevenue = Math.round(totalPeriodRevenue / Math.max(effectiveDays, 1));
  const peakDayObj = (revenueTrend || []).reduce((max: any, curr: any) => (Number(curr.revenue) > (Number(max?.revenue) || 0) ? curr : max), null);

  // ── Heatmap Stats ──
  const totalHeatmapOrders = (peakTimes || []).flatMap((row: any) => row).reduce((a: number, b: number) => a + b, 0);
  const maxPeak = Math.max(...(peakTimes || []).flatMap((row: any) => row), 1);

  // ── Margin Status Helpers ──
  const marginPct = Number(profitMargins?.marginPercent ?? 0);
  const isHealthyMargin = marginPct >= 30;
  const isModerateMargin = marginPct >= 15 && marginPct < 30;

  // ── Verification Auto-Approve Rate ──
  const totalPvs = Number(paymentStats?.total ?? 0);
  const autoApprovedPct = totalPvs > 0 ? (paymentStats.tier1Rate + paymentStats.tier2Rate) : 100;

  return (
    <div className="flex-1 overflow-y-auto h-full w-full bg-pure-white">
      <div className="max-w-[1240px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── 1. HEADER & CONTROLS ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dove/15 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-serif text-ink tracking-tight font-bold">Analytics</h1>
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-wash text-blue-600 border border-blue-200 animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" /> Updating…
                </span>
              )}
            </div>
            <p className="text-ash text-xs sm:text-sm mt-1">
              Business intelligence, conversion velocity, and unit profitability metrics.
            </p>
          </div>

          {/* Date Range Selector Pills */}
          <div className="flex items-center gap-1 bg-fog p-1 rounded-full self-start shadow-xs border border-dove/20">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleRangeChange(d)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  activeRange === d
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ash hover:text-ink hover:bg-dove/10'
                }`}
              >
                {d}d
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleRangeChange(0)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                activeRange === 0
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-ash hover:text-ink hover:bg-dove/10'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* ── 2. EXECUTIVE KPI DECISION STRIP ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Revenue */}
          <div className="bg-white rounded-2xl p-5 border border-dove/20 shadow-xs hover:border-dove/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-ash mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Gross Revenue</span>
                <div className="w-7 h-7 rounded-lg bg-sky-wash text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-ink font-mono tracking-tight">
                ৳{(profitMargins.totalRevenue || totalPeriodRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-dove/10 flex items-center justify-between text-[11px] text-ash font-medium">
              <span>Avg Daily: ৳{avgDailyRevenue.toLocaleString()}</span>
              <span className="font-bold text-ink">{activeRange === 0 ? 'All-Time' : `${activeRange}d window`}</span>
            </div>
          </div>

          {/* Gross Profit & Margin Hero */}
          <div className="bg-white rounded-2xl p-5 border border-dove/20 shadow-xs hover:border-dove/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-ash mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Gross Margin</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                  isHealthyMargin
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isModerateMargin
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {marginPct}% Margin
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 font-mono tracking-tight">
                ৳{(profitMargins.grossProfit || 0).toLocaleString()}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-dove/10 flex items-center justify-between text-[11px] text-ash font-medium">
              <span>Estimated Cost: ৳{(profitMargins.totalCost || 0).toLocaleString()}</span>
              <span className="text-emerald-700 font-semibold">Net profit</span>
            </div>
          </div>

          {/* Peak Performance Day */}
          <div className="bg-white rounded-2xl p-5 border border-dove/20 shadow-xs hover:border-dove/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-ash mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Peak Sales Day</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-ink font-mono tracking-tight">
                ৳{(Number(peakDayObj?.revenue) || 0).toLocaleString()}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-dove/10 flex items-center justify-between text-[11px] text-ash font-medium">
              <span>Date: {peakDayObj?.date ? peakDayObj.date : '—'}</span>
              <span className="font-semibold text-purple-600">Best Velocity</span>
            </div>
          </div>

          {/* Automated Payment Health */}
          <div className="bg-white rounded-2xl p-5 border border-dove/20 shadow-xs hover:border-dove/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-ash mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Auto-Verification</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-ink font-mono tracking-tight">
                {autoApprovedPct}%
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-dove/10 flex items-center justify-between text-[11px] text-ash font-medium">
              <span>Mismatch: {paymentStats.mismatchRate}%</span>
              <span className="text-emerald-700 font-semibold">T1 + T2 Active</span>
            </div>
          </div>
        </div>

        {/* ── 3. REVENUE TREND (HERO VISUALIZATION) ────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-dove/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-ink text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">Revenue Trend</h2>
                <p className="text-xs text-ash">Daily recorded sales earnings throughout the selected duration</p>
              </div>
            </div>

            {/* Context Indicators */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-fog rounded-full text-xs font-semibold text-graphite border border-dove/10">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                Daily Average: <strong className="text-ink font-mono">৳{avgDailyRevenue.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {(!revenueTrend || revenueTrend.length === 0 || totalPeriodRevenue === 0) ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-8 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
              <div className="w-12 h-12 rounded-full bg-dove/10 flex items-center justify-center text-ash mb-3">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">No revenue recorded in this period</h3>
              <p className="text-xs text-ash max-w-sm mt-1">
                Confirmed orders and customer payments will populate this daily revenue trajectory automatically.
              </p>
            </div>
          ) : (
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueLuminousGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `৳${(v / 1000).toFixed(0)}k` : `৳${v}`)}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomRevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    fill="url(#revenueLuminousGrad)"
                    activeDot={{ r: 6, fill: '#0284C7', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── 4. HEATMAP & CUSTOMER GROWTH ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Order Times (Heatmap) */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-dove/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Peak Order Times</h3>
                    <p className="text-xs text-ash">Traffic density grouped by Dhaka local time slots</p>
                  </div>
                </div>

                {hoveredCell && (
                  <span className="text-[11px] font-bold text-ink bg-sky-wash px-2.5 py-1 rounded-full border border-blue-200">
                    {hoveredCell.day} {hoveredCell.session}: {hoveredCell.count} orders ({hoveredCell.pct}%)
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[380px] grid grid-cols-4 gap-2 pt-1">
                  {/* Header Row */}
                  <div className="text-[10px] font-bold text-ash uppercase tracking-wider self-center pl-1">Day</div>
                  {SESSIONS.map((s, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-[11px] font-bold text-ink">{s.name}</p>
                      <p className="text-[9px] text-ash">{s.time}</p>
                    </div>
                  ))}

                  {/* Day Rows */}
                  {DAYS_OF_WEEK_SHORT.map((day, dIdx) => (
                    <React.Fragment key={day}>
                      <div className="text-xs font-bold text-ink flex items-center pl-1">{day}</div>
                      {SESSIONS.map((sess, sIdx) => {
                        const count = peakTimes[dIdx]?.[sIdx] ?? 0;
                        const ratio = count / maxPeak;
                        const pct = totalHeatmapOrders > 0 ? Math.round((count / totalHeatmapOrders) * 100) : 0;

                        // Dynamic Visual Intensity Hierarchy
                        let cellStyle = 'bg-fog text-ash/30 border-dove/10';
                        if (count > 0) {
                          if (ratio >= 0.67) {
                            cellStyle = 'bg-sky-500 text-white font-bold shadow-xs border-sky-400';
                          } else if (ratio >= 0.34) {
                            cellStyle = 'bg-sky-500/35 text-sky-950 dark:text-sky-100 font-semibold border-sky-500/30';
                          } else {
                            cellStyle = 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/20';
                          }
                        }

                        return (
                          <div
                            key={`cell-${dIdx}-${sIdx}`}
                            onMouseEnter={() => setHoveredCell({ day: DAYS_OF_WEEK[dIdx], session: sess.name, count, pct })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`h-10 rounded-xl flex items-center justify-center font-mono text-xs border transition-all duration-150 cursor-pointer hover:scale-[1.04] ${cellStyle}`}
                          >
                            {count > 0 ? count : '—'}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="mt-6 pt-4 border-t border-dove/10 flex items-center justify-between text-[10px] text-ash font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-fog border border-dove/20" /> 0 orders</span>
              <div className="flex-1 mx-4 h-2 rounded-full bg-gradient-to-r from-sky-500/15 via-sky-500/50 to-sky-500" />
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> Peak Volume ({maxPeak})</span>
            </div>
          </div>

          {/* Customer Growth (Stacked Breakdown) */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-dove/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Customer Growth</h3>
                    <p className="text-xs text-ash">New vs returning weekly purchaser breakdown</p>
                  </div>
                </div>
              </div>

              {(!customerGrowth || customerGrowth.length === 0) ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
                  <Users className="w-8 h-8 text-ash opacity-40 mb-2" />
                  <h4 className="text-xs font-bold text-ink">No customer purchases recorded</h4>
                  <p className="text-[11px] text-ash mt-0.5">Purchases across weeks will display cohort retention here.</p>
                </div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerGrowth} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomCustomerGrowthTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={32}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                      />
                      <Bar dataKey="new" name="New Customers" stackId="growth" fill="#3B82F6" barSize={22} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="returning" name="Returning" stackId="growth" fill="#A855F7" barSize={22} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-dove/10 flex items-center justify-between text-xs text-ash">
              <span>New: <strong className="text-[#3B82F6] font-mono font-bold">{(customerGrowth || []).reduce((s: number, g: any) => s + (g.new || 0), 0)}</strong></span>
              <span>Returning: <strong className="text-[#A855F7] font-mono font-bold">{(customerGrowth || []).reduce((s: number, g: any) => s + (g.returning || 0), 0)}</strong></span>
            </div>
          </div>
        </div>

        {/* ── 5. REGIONS & CHANNEL PERFORMANCE ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customer Regions (Ranked Progress Visualization) */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Top Customer Regions</h3>
                <p className="text-xs text-ash">Bangladeshi districts ranked by confirmed order volume & share</p>
              </div>
            </div>

            {(!topRegions || topRegions.length === 0) ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
                <MapPin className="w-6 h-6 text-ash opacity-40 mb-2" />
                <p className="text-xs font-bold text-ink">No geographic delivery data</p>
                <p className="text-[11px] text-ash mt-0.5">Orders with customer delivery addresses will rank here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topRegions.map((r: any, idx: number) => {
                  const maxShare = topRegions[0]?.share || 1;
                  const relativeBar = Math.max((r.share / maxShare) * 100, 8);
                  return (
                    <div key={r.district} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-ink text-white' : 'bg-fog text-graphite border border-dove/10'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-ink">{r.district}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-ash">{r.count} orders</span>
                          <span className="font-bold text-ink px-1.5 py-0.5 bg-fog rounded border border-dove/10">{r.share}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-fog rounded-full overflow-hidden border border-dove/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-ink' : idx === 1 ? 'bg-sky-600' : 'bg-dove'
                          }`}
                          style={{ width: `${relativeBar}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Channel Performance (Conversion Comparison) */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Channel Performance</h3>
                <p className="text-xs text-ash">Inquiry-to-confirmed order conversion rate by messaging channel</p>
              </div>
            </div>

            {(!channelPerformance || channelPerformance.length === 0) ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
                <Share2 className="w-6 h-6 text-ash opacity-40 mb-2" />
                <h4 className="text-xs font-bold text-ink">No channel conversion traffic</h4>
                <p className="text-[11px] text-ash max-w-xs mt-0.5">
                  Once customer inquiries arrive through Messenger, Instagram, or WhatsApp, comparative conversion rates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {channelPerformance.map((ch: any) => {
                  const isInstagram = ch.channel.toLowerCase().includes('instagram');
                  const isMessenger = ch.channel.toLowerCase().includes('messenger') || ch.channel.toLowerCase().includes('facebook');
                  const isWhatsApp = ch.channel.toLowerCase().includes('whatsapp');

                  return (
                    <div key={ch.channel} className="p-3.5 bg-fog rounded-2xl border border-dove/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${
                            isInstagram ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : isWhatsApp ? 'bg-[#25D366]' : 'bg-[#0084FF]'
                          }`} />
                          <span className="font-bold text-xs text-ink">{ch.channel}</span>
                          <span className="text-[10px] text-ash font-mono">({ch.total} conversations)</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 font-mono px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
                          {ch.convRate}% Conv.
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-dove/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isInstagram ? 'bg-gradient-to-r from-pink-500 to-purple-600' : isWhatsApp ? 'bg-[#25D366]' : 'bg-[#0084FF]'
                          }`}
                          style={{ width: `${Math.min(Math.max(ch.convRate, 5), 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 6. TOP PRODUCTS & PAYMENT VERIFICATION ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Top Performing Products</h3>
                <p className="text-xs text-ash">Best-selling catalog inventory ranked by captured revenue</p>
              </div>
            </div>

            {(!topProducts || topProducts.length === 0) ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
                <Package className="w-6 h-6 text-ash opacity-40 mb-2" />
                <h4 className="text-xs font-bold text-ink">No product sales in this timeframe</h4>
                <p className="text-[11px] text-ash mt-0.5">Confirmed order line items will rank top products here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p: any, idx: number) => {
                  const maxRevenue = topProducts[0]?.revenue || 1;
                  const relativePct = Math.max(Math.round((p.revenue / maxRevenue) * 100), 10);
                  return (
                    <div key={p.name} className="p-3 bg-fog rounded-2xl border border-dove/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-black shadow-xs' : 'bg-white text-graphite border border-dove/10'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-ink truncate">{p.name}</span>
                        </div>
                        <span className="font-mono font-bold text-ink shrink-0 text-sm">৳{Number(p.revenue).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-dove/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-ink' : 'bg-sky-600'
                          }`}
                          style={{ width: `${relativePct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Verification Health Panel */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
                <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Verification Health</h3>
                  <p className="text-xs text-ash">Automated payment audits ({activeRange === 0 ? 'All Time' : `${activeRange}d`})</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Tier 1 */}
                <div className="flex items-center justify-between p-3 bg-fog rounded-2xl border border-dove/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-200 shrink-0">
                      T1
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink leading-tight">Companion App Sync</p>
                      <p className="text-[10px] text-ash">Tier 1 Automatic verification</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-700">{paymentStats.tier1Rate}%</span>
                </div>

                {/* Tier 2 */}
                <div className="flex items-center justify-between p-3 bg-fog rounded-2xl border border-dove/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0">
                      T2
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink leading-tight">Merchant API Query</p>
                      <p className="text-[10px] text-ash">Tier 2 Real-time API query</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-700">{paymentStats.tier2Rate}%</span>
                </div>

                {/* Escalation */}
                <div className="flex items-center justify-between p-3 bg-fog rounded-2xl border border-dove/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-[10px] font-bold border border-rose-200 shrink-0">
                      ERR
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink leading-tight">Mismatch / Escalated</p>
                      <p className="text-[10px] text-ash">Manual review required</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-700">{paymentStats.mismatchRate}%</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-dove/10 text-center">
              <span className="text-[11px] text-ash font-medium">
                Audited Cases: <strong className="text-ink font-mono">{paymentStats.total}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── 7. BASKET ANALYSIS & INVENTORY RUNWAY ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basket Analysis: "Customers who bought X also bought Y" */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Basket Cross-Sell Bundles</h3>
                <p className="text-xs text-ash">Complementary products frequently purchased together</p>
              </div>
            </div>

            {(!basketAnalysis || basketAnalysis.length === 0) ? (
              <div className="h-52 flex flex-col items-center justify-center text-center p-6 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
                <ShoppingCart className="w-6 h-6 text-ash opacity-40 mb-2" />
                <h4 className="text-xs font-bold text-ink">Not enough multi-item order history</h4>
                <p className="text-[11px] text-ash max-w-xs mt-0.5">
                  When customers purchase multiple items together, top bundling relationships will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {basketAnalysis.map((pair: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-fog rounded-2xl border border-dove/10 text-xs">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="w-6 h-6 rounded-full bg-white text-ink font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs border border-dove/10">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-ink truncate block">{pair.productA}</span>
                        <span className="text-[11px] text-ash truncate block">+ {pair.productB}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white text-ink font-mono font-bold rounded-full shadow-xs shrink-0 text-xs border border-dove/10">
                      {pair.count} bundles
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Runway & Velocity */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Inventory Runway & Turnover</h3>
                <p className="text-xs text-ash">Days of stock remaining based on recent sales velocity</p>
              </div>
            </div>

            {(!inventoryRunway || inventoryRunway.length === 0) ? (
              <div className="h-52 flex flex-col items-center justify-center text-center p-6 bg-fog/50 rounded-2xl border border-dashed border-dove/20">
                <Package className="w-6 h-6 text-ash opacity-40 mb-2" />
                <h4 className="text-xs font-bold text-ink">No catalog inventory records</h4>
                <p className="text-[11px] text-ash mt-0.5">Add stock quantities to track restock runways.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {inventoryRunway.slice(0, 6).map((item: any) => {
                  const isDead = item.isDeadStock;
                  const isLow = item.daysRemaining > 0 && item.daysRemaining <= 7;
                  const isOut = item.stock <= 0;

                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-fog rounded-2xl border border-dove/10 text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-ink truncate">{item.name}</p>
                        <p className="text-[10px] text-ash font-mono">
                          {item.stock} in stock · {item.soldInPeriod} sold in period
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {isOut ? (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 rounded-full text-[10px] font-bold border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isDead ? (
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200 rounded-full text-[10px] font-bold border border-purple-200">
                            ⚠️ Dead Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200 rounded-full text-[10px] font-bold border border-amber-200 animate-pulse">
                            ~{item.daysRemaining}d Stock (Low)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 rounded-full text-[10px] font-bold border border-emerald-200 font-mono">
                            {item.daysRemaining > 365 ? '>1y Runway' : `~${item.daysRemaining}d Runway`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 8. COURIER BENCHMARKS & PAYMENT METHODS ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Courier Performance Comparison */}
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Courier Delivery Benchmarks</h3>
                <p className="text-xs text-ash">Fulfillment turnaround duration and delivery success benchmarks</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {courierPerformance.map((c: any) => (
                <div key={c.provider} className="flex items-center justify-between p-3.5 bg-fog rounded-2xl border border-dove/10 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-xs border border-dove/10 shrink-0">
                      <CourierLogo provider={c.provider} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span className="font-bold text-ink text-sm block">{c.provider}</span>
                      <span className="text-[10px] text-ash font-mono">{c.totalShipped} orders dispatched</span>
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
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-dove/10">
              <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Payment Method Rails</h3>
                <p className="text-xs text-ash">Distribution of customer payment gateways and options</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {paymentBreakdown.map((pm: any) => (
                <div key={pm.method} className="flex items-center justify-between p-3.5 bg-fog rounded-2xl border border-dove/10 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-ink">{pm.method}</span>
                    <span className="text-[10px] text-ash font-mono">({pm.count} orders)</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-right">
                    <span className="text-xs font-bold text-ink">৳{pm.totalTaka.toLocaleString()}</span>
                    <span className="px-2.5 py-0.5 bg-white text-ink rounded-full border border-dove/15 text-[11px] font-bold shadow-xs">
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
