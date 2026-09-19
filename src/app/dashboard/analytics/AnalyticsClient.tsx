'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import {
  TrendingUp, Clock, Users, MapPin, Share2, Award, ShieldAlert,
  Percent, ShoppingCart, Truck, Package, ArrowUpRight, CheckCircle2,
  AlertTriangle, ArrowDownRight, Layers, CreditCard, Sparkles, AlertCircle,
  BarChart2, Activity
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

/* ─── Steep-Aligned Chart Colors ──────────────────────────────────────── */
// Data viz: warm rust (#c2410c tints) + cool sky (#0ea5e9 tints) only
const CHART_BLUE = '#0ea5e9';   // Sky-500
const CHART_BLUE_SOFT = 'rgba(14,165,233,0.18)';
const CHART_RUST = '#c2410c';   // Rust accent
const CHART_RUST_SOFT = 'rgba(194,65,12,0.14)';
const CHART_VIOLET = '#7c3aed'; // Violet for secondary bars
const CHART_EMERALD = '#059669';

/* ─── Custom Tooltips ────────────────────────────────────────────────── */

function CustomRevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-ink text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 text-xs backdrop-blur-md min-w-[140px]">
      <p className="text-white/50 font-bold text-[10px] uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
        <span className="font-bold text-base text-white font-mono">৳{Number(val).toLocaleString()}</span>
      </div>
      <p className="text-[10px] text-white/40 mt-1">Captured Revenue</p>
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
    <div className="bg-ink text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 text-xs space-y-2 min-w-[160px]">
      <p className="text-white/50 font-bold text-[10px] uppercase tracking-widest">Week of {label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" /> New Customers
          </span>
          <span className="font-mono font-bold text-white">{newCount}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" /> Returning
          </span>
          <span className="font-mono font-bold text-white">{retCount}</span>
        </div>
      </div>
      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
        <span>Total: <strong className="text-white font-mono">{total}</strong></span>
        <span>Ret. Share: <strong className="text-violet-300 font-mono">{retPct}%</strong></span>
      </div>
    </div>
  );
}

/* ─── KPI Card Sub-component ─────────────────────────────────────────── */
function KpiCard({
  label, value, sub, subLabel, badge, badgeColor, icon: Icon, accentColor, footer
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  subLabel?: string;
  badge?: React.ReactNode;
  badgeColor?: string;
  icon: React.ElementType;
  accentColor: 'blue' | 'rust' | 'violet' | 'emerald';
  footer?: React.ReactNode;
}) {
  const accents = {
    blue:    { bg: 'bg-sky-50',     icon: 'bg-sky-100 text-sky-700',     ring: 'border-sky-100' },
    rust:    { bg: 'bg-orange-50',  icon: 'bg-apricot-wash text-rust',    ring: 'border-orange-100' },
    violet:  { bg: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-700',ring: 'border-violet-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', ring: 'border-emerald-100' },
  }[accentColor];

  return (
    <div className={`bg-white rounded-3xl p-5 border border-dove/20 shadow-subtle hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-bold text-ash uppercase tracking-widest">{label}</span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${accents.icon} ${accents.ring}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {badge && <div className="mb-2">{badge}</div>}
        <p className="text-2xl sm:text-[28px] font-serif font-bold text-ink tracking-tight leading-none">
          {value}
        </p>
      </div>
      <div className="mt-4 pt-3 border-t border-dove/10 flex items-center justify-between text-[11px]">
        {footer || (
          <>
            <span className="text-ash font-medium">{sub}</span>
            {subLabel && <span className="font-bold text-ink">{subLabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────────── */
function SectionCard({
  title, subtitle, icon: Icon, children, className = '', headerRight
}: {
  title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode; className?: string; headerRight?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-3xl shadow-subtle border border-dove/15 overflow-hidden ${className}`}>
      <div className="px-6 pt-6 pb-4 border-b border-dove/10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center shadow-xs shrink-0">
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight leading-tight">{title}</h2>
            <p className="text-[11px] text-ash mt-0.5 leading-snug">{subtitle}</p>
          </div>
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-fog/50 rounded-2xl border border-dashed border-dove/25">
      <div className="w-11 h-11 rounded-2xl bg-dove/10 flex items-center justify-center text-ash mb-3 border border-dove/10">
        <Icon className="w-5 h-5 opacity-50" />
      </div>
      <h4 className="text-xs font-bold text-ink">{title}</h4>
      <p className="text-[11px] text-ash max-w-xs mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

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

  const [dataCache, setDataCache] = useState<Record<number, any>>({
    [initialRange]: initialDataObj,
  });

  const { data, isFetching } = useQuery({
    queryKey: ['analytics-data', activeRange],
    queryFn: async () => {
      const res = await fetchAnalyticsByRange(activeRange);
      if (res) {
        setDataCache(prev => ({ ...prev, [activeRange]: res }));
      }
      return res;
    },
    placeholderData: (previousData) => previousData || dataCache[activeRange],
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const currentData = data || dataCache[activeRange] || (activeRange === initialRange ? initialDataObj : dataCache[initialRange] || initialDataObj);

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
    cancellationBreakdown = [],
  } = (currentData as any) || {};

  // ── Derived Summary Metrics ──
  const totalPeriodRevenue = (revenueTrend || []).reduce((acc: number, r: any) => acc + (Number(r?.revenue) || 0), 0);
  const effectiveDays = activeRange === 0 ? Math.max((revenueTrend || []).length * 30, 30) : activeRange;
  const avgDailyRevenue = Math.round(totalPeriodRevenue / Math.max(effectiveDays, 1));
  const peakDayObj = (revenueTrend || []).reduce((max: any, curr: any) => (Number(curr?.revenue || 0) > Number(max?.revenue || 0) ? curr : max), null);

  // ── Heatmap Stats ──
  const totalHeatmapOrders = (peakTimes || []).flatMap((row: any) => row || []).reduce((a: number, b: number) => (Number(a) || 0) + (Number(b) || 0), 0);
  const maxPeak = Math.max(...(peakTimes || []).flatMap((row: any) => row || []), 1);

  // ── Margin Status ──
  const marginPct = Number(profitMargins?.marginPercent ?? 0);
  const isHealthyMargin = marginPct >= 30;
  const isModerateMargin = marginPct >= 15 && marginPct < 30;

  // ── Auto-Approve Rate ──
  const totalPvs = Number(paymentStats?.total ?? 0);
  const autoApprovedPct = totalPvs > 0 ? (paymentStats.tier1Rate + paymentStats.tier2Rate) : 100;

  const rangeLabel = activeRange === 0 ? 'All Time' : `${activeRange}d`;

  return (
    <div className="flex-1 overflow-y-auto h-full w-full bg-fog">
      <div className="max-w-[1240px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-7">

        {/* ── 1. HEADER & CONTROLS ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-dove/15">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-serif text-ink tracking-tight font-bold">Analytics</h1>
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-wash text-sky-700 border border-sky-200 animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" /> Recalculating…
                </span>
              )}
            </div>
            <p className="text-ash text-xs sm:text-sm">Business intelligence, conversion velocity, and unit profitability metrics.</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-full self-start shadow-subtle border border-dove/20">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleRangeChange(d)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  activeRange === d
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ash hover:text-ink hover:bg-fog'
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
                  : 'text-ash hover:text-ink hover:bg-fog'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* ── 2. EXECUTIVE KPI STRIP ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Revenue */}
          <KpiCard
            label="Gross Revenue"
            value={<>৳{(profitMargins.totalRevenue || totalPeriodRevenue || 0).toLocaleString()}</>}
            sub={`Avg Daily: ৳${avgDailyRevenue.toLocaleString()}`}
            subLabel={activeRange === 0 ? 'All-Time' : `${activeRange}d window`}
            icon={TrendingUp}
            accentColor="blue"
          />

          {/* Gross Margin */}
          <KpiCard
            label="Gross Margin"
            value={<span className="text-emerald-700">৳{(profitMargins.grossProfit || 0).toLocaleString()}</span>}
            icon={Percent}
            accentColor="emerald"
            badge={
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isHealthyMargin ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isModerateMargin ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {marginPct}% Margin
              </span>
            }
            footer={
              <>
                <span className="text-ash font-medium text-[11px]">Est. Cost: ৳{(profitMargins.totalCost || 0).toLocaleString()}</span>
                <span className="text-emerald-700 font-bold text-[11px]">Net profit</span>
              </>
            }
          />

          {/* Peak Sales Day */}
          <KpiCard
            label="Peak Sales Day"
            value={<>৳{(Number(peakDayObj?.revenue) || 0).toLocaleString()}</>}
            sub={`Date: ${peakDayObj?.date || '—'}`}
            subLabel="Best Velocity"
            icon={Award}
            accentColor="violet"
          />

          {/* Auto-Verification */}
          <KpiCard
            label="Auto-Verification"
            value={<>{autoApprovedPct}%</>}
            sub={`Mismatch: ${paymentStats.mismatchRate}%`}
            subLabel="T1 + T2 Active"
            icon={CheckCircle2}
            accentColor="emerald"
          />
        </div>

        {/* ── 3. REVENUE TREND (HERO CHART) ──────────────────────────────── */}
        <SectionCard
          title="Revenue Trend"
          subtitle="Daily recorded sales earnings throughout the selected duration"
          icon={BarChart2}
          headerRight={
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-fog rounded-full text-xs font-semibold text-graphite border border-dove/15 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Daily Avg: <strong className="text-ink font-mono">৳{avgDailyRevenue.toLocaleString()}</strong>
            </span>
          }
        >
          {(!revenueTrend || revenueTrend.length === 0 || totalPeriodRevenue === 0) ? (
            <EmptyState
              icon={TrendingUp}
              title="No revenue recorded in this period"
              desc="Confirmed orders and customer payments will populate this daily revenue trajectory automatically."
            />
          ) : (
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.22} />
                      <stop offset="85%" stopColor={CHART_BLUE} stopOpacity={0.03} />
                      <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `৳${(v / 1000).toFixed(0)}k` : `৳${v}`)}
                    domain={[0, 'auto']}
                    width={52}
                  />
                  <Tooltip content={<CustomRevenueTooltip />} cursor={{ stroke: CHART_BLUE, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                  {avgDailyRevenue > 0 && (
                    <ReferenceLine
                      y={avgDailyRevenue}
                      stroke={CHART_RUST}
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{ value: 'Avg', position: 'insideTopRight', fill: CHART_RUST, fontSize: 10, fontWeight: 700 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_BLUE}
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                    activeDot={{ r: 5, fill: '#0284C7', stroke: '#ffffff', strokeWidth: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* ── 4. HEATMAP & CUSTOMER GROWTH ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Peak Order Times Heatmap */}
          <div className="bg-white rounded-3xl shadow-subtle border border-dove/15 p-6 sm:p-7">
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-dove/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Peak Order Times</h3>
                  <p className="text-[11px] text-ash mt-0.5">Traffic density by Dhaka local time slot</p>
                </div>
              </div>
              {hoveredCell && (
                <span className="text-[10px] font-bold text-sky-700 bg-sky-wash px-2.5 py-1 rounded-full border border-sky-200 shrink-0">
                  {hoveredCell.day} {hoveredCell.session}: {hoveredCell.count} ({hoveredCell.pct}%)
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[380px] grid grid-cols-4 gap-2">
                {/* Header Row */}
                <div className="text-[10px] font-bold text-ash uppercase tracking-widest self-center">Day</div>
                {SESSIONS.map((s, idx) => (
                  <div key={idx} className="text-center py-1">
                    <p className="text-[11px] font-bold text-ink">{s.name}</p>
                    <p className="text-[9px] text-ash">{s.time}</p>
                  </div>
                ))}

                {/* Day Rows */}
                {DAYS_OF_WEEK_SHORT.map((day, dIdx) => (
                  <React.Fragment key={day}>
                    <div className="text-xs font-bold text-ink flex items-center">{day}</div>
                    {SESSIONS.map((sess, sIdx) => {
                      const count = peakTimes[dIdx]?.[sIdx] ?? 0;
                      const ratio = count / maxPeak;
                      const pct = totalHeatmapOrders > 0 ? Math.round((count / totalHeatmapOrders) * 100) : 0;

                      let cellBg = 'bg-fog border-dove/10 text-ash/30';
                      if (count > 0) {
                        if (ratio >= 0.67) cellBg = 'bg-sky-500 text-white border-sky-400 font-bold shadow-sm';
                        else if (ratio >= 0.34) cellBg = 'bg-sky-200 text-sky-900 border-sky-200 font-semibold';
                        else cellBg = 'bg-sky-50 text-sky-700 border-sky-100';
                      }

                      return (
                        <div
                          key={`cell-${dIdx}-${sIdx}`}
                          onMouseEnter={() => setHoveredCell({ day: DAYS_OF_WEEK[dIdx], session: sess.name, count, pct })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`h-10 rounded-xl flex items-center justify-center font-mono text-xs border transition-all duration-150 cursor-pointer hover:scale-105 hover:shadow-md ${cellBg}`}
                        >
                          {count > 0 ? count : '—'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-dove/10 flex items-center justify-between text-[10px] text-ash font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-fog border border-dove/20" /> 0 orders</span>
              <div className="flex-1 mx-4 h-2 rounded-full bg-gradient-to-r from-sky-50 via-sky-300 to-sky-500 border border-sky-100" />
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-500" /> Peak ({maxPeak})</span>
            </div>
          </div>

          {/* Customer Growth */}
          <div className="bg-white rounded-3xl shadow-subtle border border-dove/15 p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-dove/10">
              <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Customer Growth</h3>
                <p className="text-[11px] text-ash mt-0.5">New vs returning weekly purchaser breakdown</p>
              </div>
            </div>

            {(!customerGrowth || customerGrowth.length === 0) ? (
              <EmptyState
                icon={Users}
                title="No customer purchases recorded"
                desc="Purchases across weeks will display cohort retention here."
              />
            ) : (
              <>
                <div className="w-full h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerGrowth} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomCustomerGrowthTooltip />} cursor={{ fill: 'rgba(148,163,184,0.07)' }} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        height={28}
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                      />
                      <Bar dataKey="new" name="New Customers" stackId="growth" fill={CHART_BLUE} barSize={20} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="returning" name="Returning" stackId="growth" fill={CHART_VIOLET} barSize={20} radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 pt-3 border-t border-dove/10 flex items-center justify-between text-xs text-ash">
                  <span>New: <strong className="font-mono font-bold" style={{ color: CHART_BLUE }}>{(customerGrowth || []).reduce((s: number, g: any) => s + (g.new || 0), 0)}</strong></span>
                  <span>Returning: <strong className="font-mono font-bold" style={{ color: CHART_VIOLET }}>{(customerGrowth || []).reduce((s: number, g: any) => s + (g.returning || 0), 0)}</strong></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 5. REGIONS & CHANNEL PERFORMANCE ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customer Regions */}
          <SectionCard title="Top Customer Regions" subtitle="Districts ranked by confirmed order volume & share" icon={MapPin}>
            {(!topRegions || topRegions.length === 0) ? (
              <EmptyState icon={MapPin} title="No geographic delivery data" desc="Orders with customer delivery addresses will rank here." />
            ) : (
              <div className="space-y-3.5">
                {topRegions.map((r: any, idx: number) => {
                  const maxShare = topRegions[0]?.share || 1;
                  const relativeBar = Math.max((r.share / maxShare) * 100, 6);
                  return (
                    <div key={r.district} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            idx === 0 ? 'bg-ink text-white shadow-xs' : 'bg-fog text-graphite border border-dove/15'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-ink">{r.district}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-ash">{r.count} orders</span>
                          <span className="font-bold text-ink px-2 py-0.5 bg-fog rounded-full border border-dove/15">{r.share}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-fog rounded-full overflow-hidden border border-dove/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${idx === 0 ? 'bg-ink' : 'bg-sky-400'}`}
                          style={{ width: `${relativeBar}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Channel Performance */}
          <SectionCard title="Channel Performance" subtitle="Inquiry-to-order conversion rate by messaging channel" icon={Share2}>
            {(!channelPerformance || channelPerformance.length === 0) ? (
              <EmptyState
                icon={Share2}
                title="No channel conversion traffic"
                desc="Once customer inquiries arrive through Messenger, Instagram, or WhatsApp, conversion rates will appear here."
              />
            ) : (
              <div className="space-y-3.5">
                {channelPerformance.map((ch: any) => {
                  const isInstagram = ch.channel.toLowerCase().includes('instagram');
                  const isWhatsApp = ch.channel.toLowerCase().includes('whatsapp');
                  const channelColor = isInstagram ? 'from-yellow-400 via-pink-500 to-purple-600'
                    : isWhatsApp ? '#25D366' : '#0084FF';

                  return (
                    <div key={ch.channel} className="p-4 bg-fog/60 rounded-2xl border border-dove/10 space-y-2.5 hover:border-dove/25 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full shrink-0 ${
                            isInstagram ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                            : isWhatsApp ? 'bg-[#25D366]' : 'bg-[#0084FF]'
                          }`} />
                          <span className="font-bold text-xs text-ink">{ch.channel}</span>
                          <span className="text-[10px] text-ash font-mono">({ch.total} conversations)</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 font-mono px-2.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
                          {ch.convRate}% Conv.
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-dove/10">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isInstagram ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                            : isWhatsApp ? 'bg-[#25D366]' : 'bg-[#0084FF]'
                          }`}
                          style={{ width: `${Math.min(Math.max(ch.convRate, 5), 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── 6. TOP PRODUCTS & PAYMENT VERIFICATION ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="lg:col-span-2">
            <SectionCard title="Top Performing Products" subtitle="Best-selling catalog inventory ranked by captured revenue" icon={Award}>
              {(!topProducts || topProducts.length === 0) ? (
                <EmptyState icon={Package} title="No product sales in this timeframe" desc="Confirmed order line items will rank top products here." />
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p: any, idx: number) => {
                    const maxRevenue = topProducts[0]?.revenue || 1;
                    const relativePct = Math.max(Math.round((p.revenue / maxRevenue) * 100), 8);
                    return (
                      <div key={p.name} className="p-3.5 bg-fog/60 rounded-2xl border border-dove/10 space-y-2 hover:border-dove/25 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              idx === 0 ? 'bg-amber-400 text-black shadow-xs' : 'bg-white text-graphite border border-dove/15'
                            }`}>
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-ink truncate">{p.name}</span>
                          </div>
                          <span className="font-mono font-bold text-ink shrink-0">৳{Number(p.revenue).toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-dove/10">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${idx === 0 ? 'bg-ink' : 'bg-sky-400'}`}
                            style={{ width: `${relativePct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Payment Verification Health */}
          <SectionCard title="Verification Health" subtitle={`Automated payment audits (${rangeLabel})`} icon={ShieldAlert}>
            <div className="space-y-3">
              {/* Tier 1 */}
              <div className="flex items-center justify-between p-3.5 bg-fog/60 rounded-2xl border border-dove/10 hover:border-dove/25 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-200 shrink-0">
                    T1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink leading-tight">Companion App Sync</p>
                    <p className="text-[10px] text-ash">Tier 1 Auto-verification</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-700">{paymentStats.tier1Rate}%</span>
              </div>

              {/* Tier 2 */}
              <div className="flex items-center justify-between p-3.5 bg-fog/60 rounded-2xl border border-dove/10 hover:border-dove/25 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center text-[10px] font-bold border border-sky-200 shrink-0">
                    T2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink leading-tight">Merchant API Query</p>
                    <p className="text-[10px] text-ash">Tier 2 Real-time API</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-sky-700">{paymentStats.tier2Rate}%</span>
              </div>

              {/* Escalation */}
              <div className="flex items-center justify-between p-3.5 bg-fog/60 rounded-2xl border border-dove/10 hover:border-dove/25 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-[10px] font-bold border border-rose-200 shrink-0">
                    ERR
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink leading-tight">Mismatch / Escalated</p>
                    <p className="text-[10px] text-ash">Manual review required</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-rose-700">{paymentStats.mismatchRate}%</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-dove/10 text-center">
              <span className="text-[11px] text-ash">
                Total Audited: <strong className="text-ink font-mono">{paymentStats.total}</strong> cases
              </span>
            </div>
          </SectionCard>
        </div>

        {/* ── 7. BASKET ANALYSIS & INVENTORY RUNWAY ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basket Cross-Sell */}
          <SectionCard title="Basket Cross-Sell Bundles" subtitle="Complementary products frequently purchased together" icon={ShoppingCart}>
            {(!basketAnalysis || basketAnalysis.length === 0) ? (
              <EmptyState
                icon={ShoppingCart}
                title="Not enough multi-item order history"
                desc="When customers purchase multiple items together, top bundling relationships will appear here."
              />
            ) : (
              <div className="space-y-2.5">
                {basketAnalysis.map((pair: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-fog/60 rounded-2xl border border-dove/10 text-xs hover:border-dove/25 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="w-7 h-7 rounded-full bg-white text-ink font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs border border-dove/10">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-ink truncate block">{pair.productA}</span>
                        <span className="text-[11px] text-ash truncate block">+ {pair.productB}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-white text-ink font-mono font-bold rounded-full shadow-xs shrink-0 text-xs border border-dove/10">
                      {pair.count} bundles
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Inventory Runway */}
          <SectionCard title="Inventory Runway & Turnover" subtitle="Days of stock remaining based on recent sales velocity" icon={Package}>
            {(!inventoryRunway || inventoryRunway.length === 0) ? (
              <EmptyState icon={Package} title="No catalog inventory records" desc="Add stock quantities to track restock runways." />
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {inventoryRunway.slice(0, 6).map((item: any) => {
                  const isDead = item.isDeadStock;
                  const isLow = item.daysRemaining > 0 && item.daysRemaining <= 7;
                  const isOut = item.stock <= 0;

                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-fog/60 rounded-2xl border border-dove/10 text-xs hover:border-dove/25 transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-ink truncate">{item.name}</p>
                        <p className="text-[10px] text-ash font-mono">{item.stock} in stock · {item.soldInPeriod} sold</p>
                      </div>
                      <div className="shrink-0">
                        {isOut ? (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold border border-rose-200">Out of Stock</span>
                        ) : isDead ? (
                          <span className="px-2.5 py-0.5 bg-violet-50 text-violet-700 rounded-full text-[10px] font-bold border border-violet-200">⚠️ Dead Stock</span>
                        ) : isLow ? (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200 animate-pulse">~{item.daysRemaining}d (Low)</span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200 font-mono">
                            {item.daysRemaining > 365 ? '>1y Runway' : `~${item.daysRemaining}d`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── 8. COURIER BENCHMARKS & PAYMENT METHODS ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Courier Performance */}
          <SectionCard title="Courier Delivery Benchmarks" subtitle="Fulfillment turnaround and delivery success rates" icon={Truck}>
            {(!courierPerformance || courierPerformance.length === 0) ? (
              <EmptyState icon={Truck} title="No courier data available" desc="Once orders are dispatched through a courier integration, benchmarks will appear here." />
            ) : (
              <div className="space-y-3">
                {courierPerformance.map((c: any) => (
                  <div key={c.provider} className="flex items-center justify-between p-4 bg-fog/60 rounded-2xl border border-dove/10 text-xs hover:border-dove/25 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-xs border border-dove/10 shrink-0">
                        <CourierLogo provider={c.provider} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <span className="font-bold text-ink text-sm block">{c.provider}</span>
                        <span className="text-[10px] text-ash font-mono">{c.totalShipped} dispatched</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-right">
                      <div>
                        <span className="text-sm font-bold text-ink block">~{c.avgDays}d</span>
                        <span className="text-[9px] text-ash">Avg fulfillment</span>
                      </div>
                      <div className="w-px h-8 bg-dove/20" />
                      <div>
                        <span className="text-sm font-bold text-emerald-700 block">{c.deliverySuccessRate}%</span>
                        <span className="text-[9px] text-ash">Delivered</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Payment Method Rails */}
          <SectionCard title="Payment Method Rails" subtitle="Distribution of customer payment gateways" icon={CreditCard}>
            {(!paymentBreakdown || paymentBreakdown.length === 0) ? (
              <EmptyState icon={CreditCard} title="No payment data" desc="Payment gateway usage and distribution will appear here once orders are processed." />
            ) : (
              <div className="space-y-3">
                {paymentBreakdown.map((pm: any) => (
                  <div key={pm.method} className="flex items-center justify-between p-4 bg-fog/60 rounded-2xl border border-dove/10 text-xs hover:border-dove/25 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-ink">{pm.method}</span>
                      <span className="text-[10px] text-ash font-mono">({pm.count} orders)</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-right">
                      <span className="text-sm font-bold text-ink">৳{pm.totalTaka.toLocaleString()}</span>
                      <span className="px-2.5 py-0.5 bg-white text-ink rounded-full border border-dove/15 text-[11px] font-bold shadow-xs">
                        {pm.share}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

      </div>
    </div>
  );
}
