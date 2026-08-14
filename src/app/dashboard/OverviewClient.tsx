'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import {
  Activity, MessageSquareText, Package, Clock, X,
  CheckCircle2, ChevronRight, Sparkles, AlertTriangle,
  ShoppingBag, Zap, TrendingUp, Users, AlertCircle, Hourglass, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { saveBusinessType, fetchDashboardStats } from './actions';
import { ShopStats } from '@/lib/analytics';

const BANNER_DISMISSED_KEY = 'dullbot_setup_banner_dismissed';
const NUDGE_DISMISSED_KEY = 'dullbot_nudge_widget_dismissed';

const AI_SPLIT_COLORS = ['#3B82F6', '#A855F7']; // Resolved by AI (Electric Blue), Human Hand-off (Violet)

interface Props {
  shop: any;
  productCount: number;
  stats: ShopStats;
}

export default function OverviewClient({ shop: initialShop, productCount, stats }: Props) {
  const [shop, setShop] = useState(initialShop);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);

  // Dynamic range / calendar stats (Daily, Weekly, Monthly, Yearly, Custom)
  const [rangeType, setRangeType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data: currentStats = stats, isLoading: loadingStats, isFetching } = useQuery({
    queryKey: ['overview-stats', shop.id, rangeType, customStart, customEnd],
    queryFn: async () => {
      if (rangeType === 'custom' && (!customStart || !customEnd)) return stats;
      const res = await fetchDashboardStats(shop.id, rangeType, customStart || undefined, customEnd || undefined);
      return res.success && res.stats ? res.stats : stats;
    },
    initialData: rangeType === 'weekly' && !customStart && !customEnd ? stats : undefined,
    staleTime: 0,
  });

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

  // 1. Dynamic Insight Callout
  const getInsightCallout = () => {
    if (currentStats.revenueTotal > 5000) {
      return "Peak order surge detected: Strong conversion velocity across recent active sessions.";
    }
    if (currentStats.autopilotRate > 80) {
      return `AI Autopilot handled ${currentStats.autopilotRate}% of customer conversations without human intervention.`;
    }
    return "Dhaka metropolitan region is currently your top performing district by confirmed order volume.";
  };

  // If Business Classification is not completed yet — show the type picker
  if (!isClassificationDone) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-pure-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[520px] w-full bg-white rounded-3xl shadow-lg border border-dove/20 p-10 flex flex-col items-center text-center"
        >
          <span className="w-12 h-12 bg-apricot-wash rounded-full flex items-center justify-center text-rust text-xl mb-6 shadow-sm">🎯</span>
          <h1 className="text-3xl font-serif font-bold text-ink tracking-tight mb-2">Welcome to DullBot</h1>
          <p className="text-ash text-sm mb-8 leading-relaxed">
            Let's get your store set up. First, what kind of business do you run? This helps us configure the right automated checkout flows for your customers.
          </p>

          <div className="grid grid-cols-1 gap-3.5 w-full">
            {[
              { id: 'retail', title: 'E-commerce / Retail', desc: 'Manage inventory, variants, shipping, and automated product checkout suggestions.' },
              { id: 'service', title: 'Service-Based', desc: 'Appointments, clinic time slots, or tutoring package schedules.' },
              { id: 'wholesale', title: 'Wholesale / B2B', desc: 'Bulk order sheets, price tiers, and custom quotes.' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={async () => {
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
                className="flex flex-col items-start p-5 rounded-2xl border border-dove/20 hover:border-ink hover:bg-fog transition-all text-left group active:scale-[0.99]"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-bold text-ink group-hover:text-rust transition-colors text-sm">{type.title}</span>
                  <span className="text-[10px] text-ash group-hover:text-ink font-bold uppercase tracking-wider">Select &rarr;</span>
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
  const Sparkline = ({ data, color = '#38BDF8' }: { data: number[]; color?: string }) => {
    const chartData = (data || []).map((v, i) => ({ day: i, val: v }));
    return (
      <div className="h-10 w-full mt-3 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="val"
              stroke={color}
              strokeWidth={2}
              fill={`url(#spark-${color})`}
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
    <div className="flex-1 overflow-y-auto h-full w-full bg-pure-white">
      <div className="max-w-[1240px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── SETUP WARNING ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {!hardRequirementsMet && !isBannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="bg-apricot-wash border border-rust/20 rounded-3xl p-5 flex items-start gap-4 relative pr-12 shadow-xs">
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dove/15 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-serif text-ink tracking-tight font-bold">Overview</h1>
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-wash text-blue-600 border border-blue-200 animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" /> Refreshing…
                </span>
              )}
            </div>
            <p className="text-ash text-xs sm:text-sm mt-1">Live operational pulse, customer activity, and AI assistant performance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Timeframe Selector Pills */}
            <div className="flex items-center gap-1 bg-fog p-1 rounded-full shadow-xs border border-dove/20">
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    rangeType === opt.key 
                      ? 'bg-ink text-white shadow-sm' 
                      : 'text-ash hover:text-ink hover:bg-dove/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {rangeType === 'custom' && (
              <div className="flex items-center gap-1.5 bg-fog p-1 rounded-2xl border border-dove/20">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-white border border-dove/20 rounded-xl px-2.5 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                />
                <span className="text-xs text-ash px-1">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-white border border-dove/20 rounded-xl px-2.5 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── INSIGHT BAR & QUICK ACTION BUTTONS ─────────────────────────── */}
        <div className="bg-white rounded-3xl border border-dove/20 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-ink leading-relaxed">
              <span className="text-purple-600 uppercase tracking-wider text-[10px] mr-1.5">Live Insight:</span>
              {getInsightCallout()}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end shrink-0">
            {/* AI Credits Balance */}
            <Link
              href="/dashboard/credits"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                (currentStats.creditBalance ?? 0) < 50
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-fog text-ink border-dove/20 hover:border-dove/40'
              }`}
              title="Click to manage AI reply credits"
            >
              <Zap className={`w-3.5 h-3.5 ${(currentStats.creditBalance ?? 0) < 50 ? 'text-rose-600 fill-rose-600' : 'text-amber-500 fill-amber-500'}`} />
              <span>{(currentStats.creditBalance ?? 0).toLocaleString()} AI replies</span>
            </Link>

            {/* Quick POS Order Button */}
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-ink text-white text-xs font-bold rounded-full hover:bg-black transition-all shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>New Order</span>
            </Link>
          </div>
        </div>

        {/* ── NEEDS ATTENTION ACTION STRIP ─────────────────────────────────── */}
        {hasNeedsAttention && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-ash uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rust" /> Needs Attention
              </h2>
              <span className="text-[11px] text-ash">Action items requiring merchant review</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Pending Payments / Aging */}
              <Link
                href="/dashboard/orders"
                className={`p-4 rounded-3xl border shadow-xs flex items-center justify-between transition-all group ${
                  (currentStats.pendingOrders ?? 0) > 0
                    ? 'bg-white border-rust/30 hover:border-rust hover:shadow-sm'
                    : 'bg-white border-dove/20 hover:border-dove/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-ink">Pending Verification</span>
                    {(currentStats.pendingAgingCount ?? 0) > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold rounded-full border border-rose-200">
                        {currentStats.pendingAgingCount} aging &gt;2h
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-serif font-bold text-ink leading-none">{currentStats.pendingOrders ?? 0}</p>
                  <span className="text-[10px] text-ash mt-1 block">Awaiting payment check</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-fog group-hover:bg-apricot-wash text-ink group-hover:text-rust flex items-center justify-center transition-colors border border-dove/10">
                  <Clock className="w-5 h-5" />
                </div>
              </Link>

              {/* Payment Discrepancies & Flagged Reviews */}
              <Link
                href="/dashboard/orders"
                className={`p-4 rounded-3xl border shadow-xs flex items-center justify-between transition-all group ${
                  (currentStats.paymentMismatches ?? 0) > 0
                    ? 'bg-white border-rose-300 hover:border-rose-400 hover:shadow-sm'
                    : 'bg-white border-dove/20 hover:border-dove/40'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-ink block mb-1">Flagged for Review</span>
                  <p className="text-2xl font-serif font-bold text-ink leading-none">{currentStats.paymentMismatches ?? 0}</p>
                  <span className="text-[10px] text-ash mt-1 block">Transaction mismatches</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-fog group-hover:bg-rose-100 text-ink group-hover:text-rose-700 flex items-center justify-center transition-colors border border-dove/10">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </Link>

              {/* Low Stock Alerts */}
              <Link
                href="/dashboard/inventory"
                className={`p-4 rounded-3xl border shadow-xs flex items-center justify-between transition-all group ${
                  (currentStats.lowStockProducts ?? 0) > 0
                    ? 'bg-white border-amber-300 hover:border-amber-400 hover:shadow-sm'
                    : 'bg-white border-dove/20 hover:border-dove/40'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-ink block mb-1">Low Stock Products</span>
                  <p className="text-2xl font-serif font-bold text-ink leading-none">{currentStats.lowStockProducts ?? 0}</p>
                  <span className="text-[10px] text-ash mt-1 block">&lt; 5 units left in catalog</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-fog group-hover:bg-amber-100 text-ink group-hover:text-amber-800 flex items-center justify-center transition-colors border border-dove/10">
                  <Package className="w-5 h-5" />
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          {[
            { label: 'Revenue', value: `৳${currentStats.revenueTotal.toLocaleString()}`, series: currentStats.revenueSeries, delta: currentStats.revenueDelta, sub: 'vs prev', icon: Package, color: '#38BDF8' },
            { label: 'Orders', value: currentStats.ordersTotal, series: currentStats.ordersSeries, delta: currentStats.ordersDelta, sub: 'vs prev', icon: ShoppingBag, color: '#3B82F6' },
            { label: 'Avg Order Value', value: `৳${(currentStats.aovTotal ?? 0).toLocaleString()}`, series: currentStats.revenueSeries, delta: currentStats.aovDelta, sub: 'vs prev', icon: TrendingUp, color: '#10B981' },
            { label: 'Conversion %', value: `${currentStats.inquiryConvRate ?? 0}%`, series: currentStats.convSeries, delta: null, sub: 'inquiry → order', icon: Users, color: '#A855F7' },
            { label: 'AI Autopilot Rate', value: `${currentStats.autopilotRate}%`, series: currentStats.autopilotSeries, delta: null, sub: 'resolved by bot', icon: Activity, color: '#06B6D4' },
            { label: 'Customer Pulse', value: `${currentStats.todayNewCustomers ?? 0}n / ${currentStats.todayReturningCustomers ?? 0}r`, series: currentStats.ordersSeries, delta: null, sub: "today's split", icon: Users, color: '#F59E0B' },
          ].map((tile, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-5 border border-dove/20 shadow-xs hover:border-dove/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-ash uppercase tracking-wider">{tile.label}</span>
                  <span className="w-6 h-6 rounded-lg bg-fog text-ink flex items-center justify-center border border-dove/10">
                    <tile.icon className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-2xl font-serif font-bold text-ink tracking-tight leading-none font-mono">{tile.value}</p>
              </div>
              <div className="mt-2">
                <Sparkline data={tile.series} color={tile.color} />
                <div className="flex justify-between items-center text-[10px] text-ash mt-1.5 font-semibold">
                  {tile.delta !== null && tile.delta !== undefined ? (
                    <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${tile.delta >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {tile.delta >= 0 ? '↑' : '↓'} {Math.abs(tile.delta)}%
                    </span>
                  ) : (
                    <span className="text-ash font-mono">live pulse</span>
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
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-dove/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Customer Journey Funnel</h3>
                    <p className="text-xs text-ash">Drop-off rates across communication and checkout stages</p>
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
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-ink">
                      <span>{step.name}</span>
                      <span className="font-mono text-ash font-medium">{step.count} orders ({step.percent}%)</span>
                    </div>
                    <div className="w-full bg-fog rounded-full h-3 overflow-hidden border border-dove/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-ink' : idx === 1 ? 'bg-sky-600' : idx === 2 ? 'bg-[#38BDF8]' : 'bg-emerald-500'
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
          <div className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-dove/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-fog text-ink flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">AI Resolution Split</h3>
                    <p className="text-xs text-ash">Autopilot vs human hand-offs</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-36 h-36 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Resolved by AI', value: currentStats.aiResolved || 1 },
                          { name: 'Human Escalations', value: currentStats.humanEscalated || 0 }
                        ]}
                        innerRadius={42}
                        outerRadius={56}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill={AI_SPLIT_COLORS[0]} />
                        <Cell fill={AI_SPLIT_COLORS[1]} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-ink font-mono leading-none">{currentStats.autopilotRate}%</span>
                    <span className="text-[9px] text-ash font-bold uppercase tracking-wider mt-0.5">Autopilot</span>
                  </div>
                </div>

                {/* Custom Breakdown Rows */}
                <div className="w-full space-y-2 pt-2">
                  <div className="flex justify-between items-center p-2.5 bg-fog rounded-2xl border border-dove/10 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                      <span className="text-ink font-bold">Autopilot Resolved</span>
                    </div>
                    <span className="font-bold text-ink font-mono">{currentStats.aiResolved}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-fog rounded-2xl border border-dove/10 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                      <span className="text-ink font-bold">Human Takeover</span>
                    </div>
                    <span className="font-bold text-ash font-mono">{currentStats.humanEscalated}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── QUICK SHORTCUTS ─────────────────────────────────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <motion.div variants={item} className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-sky-wash text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-200/40">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-ink mb-2">Live Customer Inbox</h3>
              <p className="text-ash text-xs mb-6 leading-relaxed">
                Watch DullBot converse with your customers in real-time across Messenger, Instagram, and WhatsApp. Jump in with one click.
              </p>
            </div>
            <Link href="/dashboard/inbox" className="self-start px-5 py-2.5 bg-fog text-ink font-bold rounded-full border border-dove/20 hover:bg-dove/15 transition-all text-xs shadow-xs">
              Go to Live Inbox &rarr;
            </Link>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl shadow-xs border border-dove/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-4 border border-emerald-200">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-ink mb-2">Order Fulfillment & POS</h3>
              <p className="text-ash text-xs mb-6 leading-relaxed">
                Review captured orders, verify payments, and generate invoices or dispatch courier consignments in batch.
              </p>
            </div>
            <Link href="/dashboard/orders" className="self-start px-5 py-2.5 bg-ink text-white font-bold rounded-full hover:bg-black transition-all text-xs shadow-xs">
              Manage Orders &rarr;
            </Link>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
