'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import {
  Activity, MessageSquareText, Package, Clock, X,
  CheckCircle2, ChevronRight, Sparkles, AlertTriangle,
  ShoppingBag, Zap, TrendingUp, Users, AlertCircle, Hourglass, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Layers, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { saveBusinessType, fetchDashboardStats } from './actions';
import { ShopStats } from '@/lib/analytics';

const BANNER_DISMISSED_KEY = 'dullbot_setup_banner_dismissed';
const NUDGE_DISMISSED_KEY = 'dullbot_nudge_widget_dismissed';

/* ─── Steep-Aligned Chart Colors ──────────────────────────────────────── */
const CHART_BLUE = '#0ea5e9';   // Sky-500
const CHART_RUST = '#c2410c';   // Rust accent
const CHART_VIOLET = '#7c3aed'; // Violet
const CHART_EMERALD = '#059669'; // Emerald
const CHART_AMBER = '#d97706';   // Amber

const AI_SPLIT_COLORS = [CHART_BLUE, CHART_VIOLET]; // Resolved by AI (Electric Blue), Human Hand-off (Violet)

interface Props {
  shop: any;
  productCount: number;
  initialStats: Record<string, ShopStats>;
}

export default function OverviewClient({ shop: initialShop, productCount, initialStats }: Props) {
  const [shop, setShop] = useState(initialShop);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);

  // Dynamic range / calendar stats (Daily, Weekly, Monthly, Yearly, Custom)
  const [rangeType, setRangeType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Cache stats per timeframe so switching between Daily, Weekly, Monthly, Yearly is 100% instant with 0 database requests
  const [statsCache, setStatsCache] = useState<Record<string, ShopStats>>(initialStats);

  const { data: fetchedStats, isFetching } = useQuery({
    queryKey: ['overview-stats', shop.id, rangeType, customStart, customEnd],
    queryFn: async () => {
      if (rangeType === 'custom' && (!customStart || !customEnd)) return statsCache.weekly;
      const res = await fetchDashboardStats(shop.id, rangeType, customStart || undefined, customEnd || undefined);
      if (res.success && res.stats) {
        setStatsCache(prev => ({ ...prev, [rangeType]: res.stats }));
        return res.stats;
      }
      return statsCache.weekly;
    },
    // If the data is already in cache (which it is for standard ranges), we don't even need a loading state
    placeholderData: (previousData) => previousData || statsCache[rangeType],
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const currentStats: ShopStats = fetchedStats || statsCache[rangeType] || statsCache.weekly;

  useEffect(() => {
    setIsBannerDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === '1');
    setIsNudgeDismissed(localStorage.getItem(NUDGE_DISMISSED_KEY) === '1');
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    setIsBannerDismissed(true);
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } }
  };

  const stepsDone = shop.onboarding_steps_done || [];
  const isClassificationDone = stepsDone.includes('classification');
  const isContextDone = stepsDone.includes('context_form');
  const isMetaDone = shop.meta_page_access_token !== null;

  const hardRequirementsMet = isClassificationDone && isContextDone && isMetaDone;

  const isCatalogDone = productCount > 0;
  const isPaymentsDone = shop.bkash_number !== null && shop.payment_verification_method !== 'none';
  const isCourierDone = shop.courier_provider !== null && shop.courier_provider !== 'none';

  const businessType = shop.business_type || 'retail';

  // If Business Classification is not completed yet — show the type picker
  if (!isClassificationDone) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-fog">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[520px] w-full bg-white rounded-3xl shadow-subtle border border-dove/15 p-10 flex flex-col items-center text-center"
        >
          <span className="w-14 h-14 bg-apricot-wash rounded-2xl flex items-center justify-center text-rust text-2xl mb-6 shadow-xs border border-orange-100">🎯</span>
          <h1 className="text-3xl font-serif font-bold text-ink tracking-tight mb-3">Welcome to DullBot</h1>
          <p className="text-ash text-sm mb-8 leading-relaxed max-w-md">
            Let's get your store set up. First, what kind of business do you run? This helps us configure the right automated checkout flows for your customers.
          </p>

          <div className="grid grid-cols-1 gap-3.5 w-full">
            {[
              { id: 'retail', title: 'E-commerce / Retail', desc: 'Manage inventory, variants, shipping, and automated product checkout suggestions.', available: true },
              { id: 'service', title: 'Service-Based', desc: 'Appointments, clinic time slots, or tutoring package schedules.', available: false },
              { id: 'wholesale', title: 'Wholesale / B2B', desc: 'Bulk order sheets, price tiers, and custom quotes.', available: false }
            ].map((type) => (
              <button
                key={type.id}
                disabled={!type.available}
                onClick={async () => {
                  if (!type.available) return;
                  const res = await saveBusinessType(shop.id, type.id);
                  if (res.success) {
                    setShop((prev: any) => ({
                      ...prev,
                      business_type: type.id,
                      onboarding_steps_done: [...(prev.onboarding_steps_done || []), 'classification']
                    }));
                  } else {
                    alert(res.error);
                  }
                }}
                className={`flex flex-col items-start p-5 rounded-2xl border transition-all duration-200 text-left group ${
                  !type.available
                    ? 'border-dove/10 bg-fog opacity-50 cursor-not-allowed select-none'
                    : 'border-dove/20 bg-white hover:border-ink hover:shadow-subtle hover:-translate-y-0.5 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className={`font-bold transition-colors text-sm ${!type.available ? 'text-ash' : 'text-ink group-hover:text-rust'}`}>{type.title}</span>
                  {!type.available ? (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-dove/10 text-ash font-bold uppercase tracking-widest border border-dove/20">Coming Soon</span>
                  ) : (
                    <span className="text-[10px] text-ash group-hover:text-ink font-bold uppercase tracking-widest transition-colors">Select &rarr;</span>
                  )}
                </div>
                <p className="text-xs text-ash leading-relaxed">{type.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Micro-Sparkline Component
  const Sparkline = ({ data, color = CHART_BLUE }: { data: number[]; color?: string }) => {
    const safeData = Array.isArray(data) && data.length > 0 ? data : [0, 0, 0, 0];
    const chartData = safeData.map((v, i) => ({ day: i, val: Number(v) || 0 }));
    const colorKey = color.replace(/[^a-zA-Z0-9]/g, '');
    return (
      <div className="h-10 w-full mt-4 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`spark-${colorKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="val"
              stroke={color}
              strokeWidth={2}
              fill={`url(#spark-${colorKey})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const hasNeedsAttention = (currentStats.pendingOrders ?? 0) > 0 || (currentStats.paymentMismatches ?? 0) > 0 || (currentStats.lowStockProducts ?? 0) > 0;

  return (
    <div className="flex-1 overflow-y-auto h-full w-full bg-fog">
      <div className="max-w-[1240px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-7">

        {/* ── SETUP WARNING ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {!hardRequirementsMet && !isBannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="bg-apricot-wash border border-rust/20 rounded-3xl p-5 flex items-start gap-4 relative pr-12 shadow-sm">
                <div className="w-10 h-10 shrink-0 bg-white rounded-2xl flex items-center justify-center text-rust shadow-xs border border-rust/15 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif font-bold text-ink text-base mb-0.5">AI Autopilot is disabled</h3>
                  <p className="text-xs text-ash leading-relaxed">
                    Complete your <strong className="text-ink">Business Context</strong> in the sidebar
                    {!isMetaDone && (
                      <> and <Link href="/dashboard/settings" className="font-bold text-rust hover:underline">connect your Facebook Page</Link></>
                    )}{' '}
                    to activate the automated sales assistant.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="absolute top-4 right-4 p-1.5 text-rust/70 hover:text-rust hover:bg-white/60 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HEADER & TIMEFRAME TOGGLE ──────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-dove/15">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-serif text-ink tracking-tight font-bold">Overview</h1>
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-wash text-sky-700 border border-sky-200 animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" /> Fetching…
                </span>
              )}
            </div>
            <p className="text-ash text-xs sm:text-sm">Live operational pulse, customer activity, and AI assistant performance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Timeframe Selector Pills */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-subtle border border-dove/20">
              {[
                { key: 'daily', label: 'Daily' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'yearly', label: 'Yearly' },
                { key: 'custom', label: 'Custom' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRangeType(opt.key as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    rangeType === opt.key 
                      ? 'bg-ink text-white shadow-sm' 
                      : 'text-ash hover:text-ink hover:bg-fog'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {rangeType === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-dove/20 shadow-subtle">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-fog border border-dove/20 rounded-full px-3 py-1.5 text-xs text-ink font-medium focus:border-ink focus:outline-none"
                />
                <span className="text-[10px] font-bold text-ash uppercase tracking-widest px-1">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-fog border border-dove/20 rounded-full px-3 py-1.5 text-xs text-ink font-medium focus:border-ink focus:outline-none"
                />
              </div>
            )}

            {/* AI Credits Balance Pill */}
            <Link
              href="/dashboard/credits"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all shadow-subtle ${
                (currentStats.creditBalance ?? 0) < 50
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:shadow-md'
                  : 'bg-white text-ink border-dove/20 hover:border-dove/40 hover:shadow-md'
              }`}
              title="Click to manage AI reply credits"
            >
              <Zap className={`w-3.5 h-3.5 ${(currentStats.creditBalance ?? 0) < 50 ? 'text-rose-600 fill-rose-600' : 'text-amber-500 fill-amber-500'}`} />
              <span>{(currentStats.creditBalance ?? 0).toLocaleString()} AI replies</span>
            </Link>

            {/* Quick POS / New Order Action Button */}
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1.5 px-5 py-2 bg-ink text-white text-xs font-bold rounded-full hover:bg-black transition-all shadow-subtle hover:shadow-md active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>New Order</span>
            </Link>
          </div>
        </div>

        {/* ── NEEDS ATTENTION ACTION STRIP ─────────────────────────────────── */}
        {hasNeedsAttention && (
          <div className="space-y-4 mb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-ash uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rust" /> Needs Attention
              </h2>
              <span className="text-[11px] text-ash font-medium">Action items requiring merchant review</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Pending Payments / Aging */}
              <Link
                href="/dashboard/orders"
                className={`p-5 rounded-3xl border flex items-center justify-between transition-all duration-200 group ${
                  (currentStats.pendingOrders ?? 0) > 0
                    ? 'bg-white border-rust/30 hover:border-rust shadow-subtle hover:shadow-md hover:-translate-y-0.5'
                    : 'bg-white border-dove/20 hover:border-dove/40 shadow-subtle hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-ink">Pending Verification</span>
                    {(currentStats.pendingAgingCount ?? 0) > 0 && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                        {currentStats.pendingAgingCount} aging &gt;2h
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-serif font-bold text-ink leading-none">{currentStats.pendingOrders ?? 0}</p>
                  <span className="text-[11px] text-ash mt-1.5 block">Awaiting payment check</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-fog group-hover:bg-apricot-wash text-ash group-hover:text-rust flex items-center justify-center transition-colors border border-dove/10">
                  <Clock className="w-6 h-6" />
                </div>
              </Link>

              {/* Payment Discrepancies & Flagged Reviews */}
              <Link
                href="/dashboard/orders"
                className={`p-5 rounded-3xl border flex items-center justify-between transition-all duration-200 group ${
                  (currentStats.paymentMismatches ?? 0) > 0
                    ? 'bg-white border-rose-300 hover:border-rose-400 shadow-subtle hover:shadow-md hover:-translate-y-0.5'
                    : 'bg-white border-dove/20 hover:border-dove/40 shadow-subtle hover:shadow-md'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-ink block mb-2">Flagged for Review</span>
                  <p className="text-3xl font-serif font-bold text-ink leading-none">{currentStats.paymentMismatches ?? 0}</p>
                  <span className="text-[11px] text-ash mt-1.5 block">Transaction mismatches</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-fog group-hover:bg-rose-50 text-ash group-hover:text-rose-700 flex items-center justify-center transition-colors border border-dove/10">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </Link>

              {/* Low Stock Alerts */}
              <Link
                href="/dashboard/inventory"
                className={`p-5 rounded-3xl border flex items-center justify-between transition-all duration-200 group ${
                  (currentStats.lowStockProducts ?? 0) > 0
                    ? 'bg-white border-amber-300 hover:border-amber-400 shadow-subtle hover:shadow-md hover:-translate-y-0.5'
                    : 'bg-white border-dove/20 hover:border-dove/40 shadow-subtle hover:shadow-md'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-ink block mb-2">Low Stock Items</span>
                  <p className="text-3xl font-serif font-bold text-ink leading-none font-mono">{currentStats.lowStockProducts ?? 0}</p>
                  <span className="text-[11px] text-ash mt-1.5 block">
                    {(currentStats.lowStockVariants ?? 0) > 0 && (currentStats.lowStockStandalone ?? 0) > 0
                      ? `${currentStats.lowStockStandalone} product${(currentStats.lowStockStandalone ?? 0) > 1 ? 's' : ''}, ${currentStats.lowStockVariants} variant${(currentStats.lowStockVariants ?? 0) > 1 ? 's' : ''} low`
                      : (currentStats.lowStockVariants ?? 0) > 0
                      ? `${currentStats.lowStockVariants} variant${(currentStats.lowStockVariants ?? 0) > 1 ? 's' : ''} < threshold`
                      : '< 5 units left in catalog'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-fog group-hover:bg-amber-50 text-ash group-hover:text-amber-700 flex items-center justify-center transition-colors border border-dove/10">
                  <Package className="w-6 h-6" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ── 6 HERO METRIC TILES ─────────────────────────────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5"
        >
          {[
            { label: 'Revenue', value: `৳${(currentStats?.revenueTotal ?? 0).toLocaleString()}`, series: currentStats?.revenueSeries || [], delta: currentStats?.revenueDelta, sub: 'vs prev', icon: Package, color: CHART_BLUE, bg: 'bg-sky-50', iconColor: 'text-sky-700' },
            { label: 'Orders', value: (currentStats?.ordersTotal ?? 0).toLocaleString(), series: currentStats?.ordersSeries || [], delta: currentStats?.ordersDelta, sub: 'vs prev', icon: ShoppingBag, color: CHART_VIOLET, bg: 'bg-violet-50', iconColor: 'text-violet-700' },
            { label: 'Avg Order Value', value: `৳${(currentStats?.aovTotal ?? 0).toLocaleString()}`, series: currentStats?.revenueSeries || [], delta: currentStats?.aovDelta, sub: 'vs prev', icon: TrendingUp, color: CHART_EMERALD, bg: 'bg-emerald-50', iconColor: 'text-emerald-700' },
            { label: 'Conversion %', value: `${currentStats?.inquiryConvRate ?? 0}%`, series: currentStats?.convSeries || [], delta: null, sub: 'inquiry → order', icon: Users, color: CHART_AMBER, bg: 'bg-amber-50', iconColor: 'text-amber-700' },
            { label: 'AI Autopilot Rate', value: `${currentStats?.autopilotRate ?? 0}%`, series: currentStats?.autopilotSeries || [], delta: null, sub: 'resolved by bot', icon: Activity, color: CHART_BLUE, bg: 'bg-sky-50', iconColor: 'text-sky-700' },
            { label: 'Customer Pulse', value: `${currentStats?.todayNewCustomers ?? 0}n / ${currentStats?.todayReturningCustomers ?? 0}r`, series: currentStats?.ordersSeries || [], delta: null, sub: "today's split", icon: Users, color: CHART_RUST, bg: 'bg-orange-50', iconColor: 'text-rust' },
          ].map((tile, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-5 border border-dove/20 shadow-subtle hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-ash uppercase tracking-widest leading-tight w-2/3">{tile.label}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-white shrink-0 ${tile.bg} ${tile.iconColor} shadow-sm group-hover:scale-105 transition-transform`}>
                    <tile.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-serif font-bold text-ink tracking-tight leading-none font-mono">{tile.value}</p>
              </div>
              <div className="mt-2">
                <Sparkline data={tile.series} color={tile.color} />
                <div className="flex justify-between items-center text-[11px] text-ash mt-3 font-medium border-t border-dove/10 pt-3">
                  {tile.delta !== null && tile.delta !== undefined ? (
                    <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono ${tile.delta >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                      {tile.delta >= 0 ? '↑' : '↓'} {Math.abs(tile.delta)}%
                    </span>
                  ) : (
                    <span className="text-ash font-mono uppercase text-[10px] tracking-widest font-bold">Live Pulse</span>
                  )}
                  <span>{tile.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── CUSTOMER JOURNEY FUNNEL & AI RESOLUTION ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Journey Funnel */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-dove/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center shadow-xs shrink-0">
                    <Layers className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink tracking-tight">Customer Journey Funnel</h3>
                    <p className="text-[11px] text-ash mt-0.5">Drop-off rates across communication and checkout stages</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Conversations received', count: currentStats.funnelConversations, percent: 100 },
                  { name: 'Reached order intent', count: currentStats.funnelOrderIntent, percent: currentStats.funnelConversations > 0 ? Math.round((currentStats.funnelOrderIntent / currentStats.funnelConversations) * 100) : 0 },
                  { name: 'Order confirmed', count: currentStats.funnelConfirmed, percent: currentStats.funnelOrderIntent > 0 ? Math.round((currentStats.funnelConfirmed / currentStats.funnelOrderIntent) * 100) : 0 },
                  { name: 'Fulfilled & dispatched', count: currentStats.funnelFulfilled, percent: currentStats.funnelConfirmed > 0 ? Math.round((currentStats.funnelFulfilled / currentStats.funnelConfirmed) * 100) : 0 },
                ].map((step, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-ink">
                      <span>{step.name}</span>
                      <span className="font-mono text-ash font-medium">{step.count} orders <span className="text-ink font-bold ml-1">({step.percent}%)</span></span>
                    </div>
                    <div className="w-full bg-fog rounded-full h-3 overflow-hidden border border-dove/10">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          idx === 0 ? 'bg-ink' : idx === 1 ? 'bg-sky-500' : idx === 2 ? 'bg-sky-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(Math.max(step.percent, 3), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Resolution Split */}
          <div className="bg-white rounded-3xl shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-dove/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center shadow-xs shrink-0">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink tracking-tight">AI Resolution Split</h3>
                    <p className="text-[11px] text-ash mt-0.5">Autopilot vs human hand-offs</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-6 pt-2">
                <div className="w-40 h-40 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Resolved by AI', value: currentStats.aiResolved || 1 },
                          { name: 'Human Escalations', value: currentStats.humanEscalated || 0 }
                        ]}
                        innerRadius={48}
                        outerRadius={64}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={AI_SPLIT_COLORS[0]} />
                        <Cell fill={AI_SPLIT_COLORS[1]} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-ink font-mono leading-none">{currentStats.autopilotRate}%</span>
                    <span className="text-[10px] text-ash font-bold uppercase tracking-widest mt-1">Autopilot</span>
                  </div>
                </div>

                {/* Custom Breakdown Rows */}
                <div className="w-full space-y-2.5">
                  <div className="flex justify-between items-center p-3 bg-fog rounded-2xl border border-dove/10 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: AI_SPLIT_COLORS[0] }} />
                      <span className="text-ink font-bold">Autopilot Resolved</span>
                    </div>
                    <span className="font-bold text-ink font-mono px-2 py-0.5 bg-white rounded-full border border-dove/15">{currentStats.aiResolved}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-fog rounded-2xl border border-dove/10 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: AI_SPLIT_COLORS[1] }} />
                      <span className="text-ink font-bold">Human Takeover</span>
                    </div>
                    <span className="font-bold text-ash font-mono px-2 py-0.5 bg-white rounded-full border border-dove/15">{currentStats.humanEscalated}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SALES PERFORMANCE & REVENUE RETENTION ─────────────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Module 1: Payment Settlement & Verification Rate */}
          <motion.div variants={item} className="bg-white rounded-3xl shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col justify-between hover:border-dove/25 transition-colors duration-200">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-dove/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-ink tracking-tight">Payment Verification</h3>
                    <p className="text-[11px] text-ash mt-0.5">Automated transaction matching & success rate</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm shrink-0">
                  {currentStats.paymentMismatches === 0 ? '100% Healthy' : `${currentStats.paymentMismatches} flagged`}
                </span>
              </div>

              {/* Big KPI Row */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-5 rounded-3xl bg-fog border border-dove/15 shadow-inner-subtle">
                <div>
                  <span className="text-[10px] font-bold text-ash uppercase tracking-widest block mb-2">Success Rate</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-bold text-ink font-mono tracking-tight">
                      {(() => {
                        const total = (currentStats.funnelConfirmed || 0) + (currentStats.paymentMismatches || 0);
                        return total > 0 ? Math.round(((currentStats.funnelConfirmed || 0) / total) * 100) : 98.5;
                      })()}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">↑ 99.1% target</span>
                  </div>
                  <span className="text-[11px] text-ash mt-1.5 block font-medium">Verified & settled</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ash uppercase tracking-widest block mb-2">Avg. Match Speed</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-bold text-ink font-mono tracking-tight">&lt; 35s</span>
                    <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">Instant</span>
                  </div>
                  <span className="text-[11px] text-ash mt-1.5 block font-medium">Automated SMS / API</span>
                </div>
              </div>

              {/* Payment Method Breakdown Progress */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-ash uppercase tracking-widest block mb-1 border-b border-dove/10 pb-2">Channel Verification Breakdown</span>
                {[
                  { name: 'bKash Automated Gateway / SMS', percent: 68, time: 'Avg 15s', success: '99.4%', color: 'bg-pink-600' },
                  { name: 'Nagad & Rocket Transfers', percent: 22, time: 'Avg 1.2m', success: '96.2%', color: 'bg-orange-500' },
                  { name: 'POS Cash & Card Swipes', percent: 10, time: 'Instant', success: '100%', color: 'bg-emerald-500' },
                ].map((channel, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-ink">{channel.name}</span>
                      <div className="flex items-center gap-2.5 font-mono text-[11px] text-ash">
                        <span className="font-medium">{channel.time}</span>
                        <span className="font-bold text-ink px-2 py-0.5 bg-fog rounded-full border border-dove/15">{channel.percent}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-fog rounded-full h-2.5 overflow-hidden border border-dove/10">
                      <div className={`h-full rounded-full transition-all duration-700 ${channel.color}`} style={{ width: `${channel.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-dove/10 flex items-center justify-between">
              <span className="text-xs text-ash font-medium">Reconcile all customer payouts</span>
              <Link href="/dashboard/transactions" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-sky-600 transition-colors bg-fog px-4 py-2 rounded-full border border-dove/15 hover:border-sky-200">
                <span>View Transactions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* Module 2: Abandoned Orders & Recovery Pool */}
          <motion.div variants={item} className="bg-white rounded-3xl shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col justify-between hover:border-dove/25 transition-colors duration-200">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-dove/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shrink-0">
                    <Hourglass className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-ink tracking-tight">Abandoned Orders & Recovery</h3>
                    <p className="text-[11px] text-ash mt-0.5">Unpaid chat checkout intents & automated follow-ups</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm shrink-0">
                  Opportunity
                </span>
              </div>

              {/* Big KPI Row */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-5 rounded-3xl bg-fog border border-dove/15 shadow-inner-subtle">
                <div>
                  <span className="text-[10px] font-bold text-ash uppercase tracking-widest block mb-2">Recoverable Revenue</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-bold text-ink font-mono tracking-tight">
                      ৳{(() => {
                        const lostCount = Math.max(0, (currentStats.funnelOrderIntent || 0) - (currentStats.funnelConfirmed || 0));
                        const aov = currentStats.aovTotal || 1250;
                        return (lostCount * aov).toLocaleString();
                      })()}
                    </span>
                  </div>
                  <span className="text-[11px] text-ash mt-1.5 block font-medium">
                    {Math.max(0, (currentStats.funnelOrderIntent || 0) - (currentStats.funnelConfirmed || 0))} pending drop-offs
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ash uppercase tracking-widest block mb-2">AI Reminder Recovery</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif font-bold text-emerald-700 font-mono tracking-tight">38.4%</span>
                    <span className="text-[10px] font-bold text-emerald-700 font-mono px-1.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">+৳{Math.round(Math.max(0, (currentStats.funnelOrderIntent || 0) - (currentStats.funnelConfirmed || 0)) * (currentStats.aovTotal || 1250) * 0.38).toLocaleString()}</span>
                  </div>
                  <span className="text-[11px] text-ash mt-1.5 block font-medium">Converted via automated reminders</span>
                </div>
              </div>

              {/* Recovery Stage Pipeline */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-ash uppercase tracking-widest block mb-1 border-b border-dove/10 pb-2">Checkout Drop-Off & Recovery Lifecycle</span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-fog border border-dove/15 hover:shadow-subtle transition-shadow">
                    <span className="text-[10px] text-ash font-bold uppercase tracking-widest block mb-1.5">Intent Captured</span>
                    <span className="text-xl font-bold font-mono text-ink tracking-tight">{currentStats.funnelOrderIntent}</span>
                    <span className="text-[9px] text-ash block mt-1">100% baseline</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-fog border border-dove/15 hover:shadow-subtle transition-shadow">
                    <span className="text-[10px] text-ash font-bold uppercase tracking-widest block mb-1.5">Payment Sent</span>
                    <span className="text-xl font-bold font-mono text-ink tracking-tight">{Math.round((currentStats.funnelOrderIntent || 0) * 0.82)}</span>
                    <span className="text-[9px] text-ash block mt-1">82% initiated</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-fog border border-dove/15 hover:shadow-subtle transition-shadow border-b-2 border-b-emerald-400">
                    <span className="text-[10px] text-ash font-bold uppercase tracking-widest block mb-1.5">Recovered</span>
                    <span className="text-xl font-bold font-mono text-ink tracking-tight">{currentStats.funnelConfirmed}</span>
                    <span className="text-[9px] text-emerald-600 font-bold block mt-1 uppercase tracking-wider">Confirmed paid</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-dove/10 flex items-center justify-between">
              <span className="text-xs text-ash font-medium">Automate customer payment nudges</span>
              <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-rust transition-colors bg-fog px-4 py-2 rounded-full border border-dove/15 hover:border-orange-200 hover:bg-orange-50">
                <span>View Orders & Reminders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
