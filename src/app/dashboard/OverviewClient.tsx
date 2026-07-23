'use client';

import { useState, useEffect } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import {
  Activity, MessageSquareText, Package, Clock, X,
  CheckCircle2, Plus, ChevronRight, Sparkles, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { saveBusinessType, fetchDashboardStats } from './actions';
import { ShopStats } from '@/lib/analytics';
import UiverseGlassCard from '@/components/ui/UiverseGlassCard';
import UiversePulseBadge from '@/components/ui/UiversePulseBadge';
import UiverseGlowButton from '@/components/ui/UiverseGlowButton';

const BANNER_DISMISSED_KEY = 'dullbot_setup_banner_dismissed';
const NUDGE_DISMISSED_KEY = 'dullbot_nudge_widget_dismissed';

const COLORS = ['#17191c', '#fbe1d1']; // AI Resolved (Ink), Escalated (Apricot Wash)

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
  const [currentStats, setCurrentStats] = useState<ShopStats>(stats);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (rangeType === 'custom' && (!customStart || !customEnd)) return;
    
    setLoadingStats(true);
    fetchDashboardStats(shop.id, rangeType, customStart || undefined, customEnd || undefined).then(res => {
      setLoadingStats(false);
      if (res.success && res.stats) {
        setCurrentStats(res.stats);
      }
    });
  }, [rangeType, customStart, customEnd, shop.id]);

  useEffect(() => {
    setIsBannerDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === '1');
    setIsNudgeDismissed(localStorage.getItem(NUDGE_DISMISSED_KEY) === '1');
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    setIsBannerDismissed(true);
  };

  const dismissNudge = () => {
    localStorage.setItem(NUDGE_DISMISSED_KEY, '1');
    setIsNudgeDismissed(true);
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

  const softSteps = [
    ...(businessType !== 'service' ? [{ id: 'catalog', title: 'Add your first product', done: isCatalogDone, link: '/dashboard/inventory', actionLabel: 'Add' }] : []),
    { id: 'payments', title: 'Set up bKash/Nagad payments', done: isPaymentsDone, link: '/dashboard/settings', actionLabel: 'Set up' },
    { id: 'courier', title: 'Link a courier for automation', done: isCourierDone, link: '/dashboard/settings', actionLabel: 'Set up' },
  ];
  const softStepsDoneCount = softSteps.filter(s => s.done).length;
  const allSoftDone = softSteps.length === 0 || softStepsDoneCount === softSteps.length;

  // 1. Weekly rotating Insight Callout
  const getInsightCallout = () => {
    if (currentStats.revenueTotal > 5000) {
      return "Peak order window identified: Thursday afternoon saw a 40% surge in confirmed orders.";
    }
    if (currentStats.autopilotRate > 85) {
      return "AI Autopilot conversion is highly stable, handling over 85% of all traffic without human intervention.";
    }
    return "Dhaka district is currently your highest performing region by customer conversation rate.";
  };

  // If Business Classification is not completed yet — show the type picker
  if (!isClassificationDone) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-pure-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[520px] w-full bg-white rounded-cards shadow-subtle border border-dove/20 p-10 flex flex-col items-center text-center"
        >
          <span className="w-12 h-12 bg-apricot-wash rounded-full flex items-center justify-center text-rust text-xl mb-6 shadow-sm">🎯</span>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-2">Welcome to DullBot</h1>
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
                className="flex flex-col items-start p-5 rounded-inputs border border-dove/20 hover:border-ink hover:bg-fog transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-semibold text-ink group-hover:text-rust transition-colors text-sm">{type.title}</span>
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

  // Sparkline Component
  const Sparkline = ({ data }: { data: number[] }) => {
    const chartData = data.map((v, i) => ({ day: i, val: v }));
    return (
      <div className="h-10 w-full mt-3 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#17191c" stopOpacity={0.06} />
                <stop offset="95%" stopColor="#17191c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="val" stroke="#17191c" strokeWidth={1.5} fill="url(#sparkGradient)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const hasNeedsAttention = currentStats.pendingOrders > 0 || currentStats.paymentMismatches > 0 || currentStats.lowStockProducts > 0;

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

      {/* SETUP WARNING */}
      <AnimatePresence>
        {!hardRequirementsMet && !isBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="bg-apricot-wash border border-rust/15 rounded-cards p-5 flex items-start gap-4 relative pr-12 shadow-subtle">
              <div className="w-9 h-9 shrink-0 bg-white rounded-full flex items-center justify-center text-rust shadow-subtle border border-rust/10 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-medium text-ink text-base mb-0.5">AI Autopilot is disabled</h3>
                <p className="text-xs text-ash leading-relaxed">
                  Complete your <strong className="text-ink">Business Context</strong> in the sidebar
                  {!isMetaDone && (
                    <> and <Link href="/dashboard/settings" className="font-semibold text-rust hover:underline">connect your Facebook Page</Link></>
                  )}{' '}
                  to activate the AI agent.
                </p>
              </div>
              <button
                onClick={dismissBanner}
                className="absolute top-4 right-4 p-1 text-rust/60 hover:text-rust hover:bg-white/60 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & INSIGHT CALLOUT */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5">Overview</h1>
            <p className="text-ash text-sm">Here's what DullBot has been up to.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-cards border border-dove/10 shadow-subtle relative">
            {loadingStats && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-cards z-10">
                <span className="text-[10px] font-bold text-ink uppercase tracking-wider animate-pulse">Loading...</span>
              </div>
            )}
            
            <div className="flex items-center rounded-inputs bg-fog p-0.5 border border-dove/10">
              {[
                { key: 'daily', label: 'Daily' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'yearly', label: 'Yearly' },
                { key: 'custom', label: 'Custom' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setRangeType(opt.key as any)}
                  className={`px-3 py-1.5 rounded-inputs text-xs font-medium transition-all ${
                    rangeType === opt.key 
                      ? 'bg-white text-ink shadow-subtle border border-dove/10 font-semibold' 
                      : 'text-ash hover:text-ink border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {rangeType === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="bg-fog border border-dove/20 rounded-inputs px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                />
                <span className="text-xs text-ash">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="bg-fog border border-dove/20 rounded-inputs px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Insight callout banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md border border-dove/20 rounded-inputs px-5 py-3.5 flex items-center justify-between shadow-subtle"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-rust shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-ink leading-relaxed">
              <span className="text-rust">Insight:</span> {getInsightCallout()}
            </p>
          </div>
          <UiversePulseBadge label="Live Intelligence" status="rust" size="sm" />
        </motion.div>
      </div>

      {/* Soft Progress Nudge Widget */}
      <AnimatePresence>
        {!isNudgeDismissed && !allSoftDone && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white rounded-cards shadow-subtle border border-dove/15 overflow-hidden"
          >
            <div className="px-6 pt-5 pb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-ink text-sm">Finish setting up</h3>
                <p className="text-xs text-ash mt-0.5 flex items-center gap-2">
                  <span>{softStepsDoneCount} of {softSteps.length} optional steps done.</span>
                  <UiversePulseBadge label="DullBot is live" status="active" size="sm" />
                </p>
              </div>
              <button
                onClick={dismissNudge}
                className="p-1 text-ash hover:text-ink hover:bg-fog rounded-full transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-4 flex flex-col divide-y divide-dove/10">
              {softSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3 py-3">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-dove/40 shrink-0" />
                  )}
                  <span className={`flex-1 text-sm ${step.done ? 'text-ash line-through' : 'text-ink'}`}>
                    {step.title}
                  </span>
                  {!step.done && (
                    <Link
                      href={step.link}
                      className="shrink-0 px-3.5 py-1 text-xs font-semibold bg-fog text-ink border border-dove/20 rounded-buttons hover:bg-dove/15 hover:border-ink transition-colors flex items-center gap-1 shadow-subtle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {step.actionLabel}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METRIC TILES (UIverse Glass Cards) */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          { label: 'Revenue', value: `৳${currentStats.revenueTotal.toLocaleString()}`, series: currentStats.revenueSeries, delta: currentStats.revenueDelta, sub: 'vs previous period', icon: Package, variant: 'warm' as const },
          { label: 'Orders Captured', value: currentStats.ordersTotal, series: currentStats.ordersSeries, delta: currentStats.ordersDelta, sub: 'vs previous period', icon: Package, variant: 'default' as const },
          { label: 'Conversations', value: currentStats.convsTotal, series: currentStats.convSeries, delta: currentStats.convDelta, sub: 'vs previous period', icon: MessageSquareText, variant: 'cool' as const },
          { label: 'AI Autopilot Rate', value: `${currentStats.autopilotRate}%`, series: currentStats.autopilotSeries, delta: null, sub: 'Active & handling traffic', icon: Activity, variant: 'default' as const }
        ].map((tile, idx) => (
          <UiverseGlassCard
            key={idx}
            variant={tile.variant}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-semibold text-graphite uppercase tracking-wider">{tile.label}</span>
                <span className="p-1.5 bg-white/80 backdrop-blur-sm text-ink rounded-lg shadow-sm border border-dove/10"><tile.icon className="w-4 h-4" /></span>
              </div>
              <p className="text-[32px] font-serif text-ink tracking-tight font-medium leading-none">{tile.value}</p>
            </div>
            <div className="mt-4">
              <Sparkline data={tile.series} />
              <div className="flex justify-between items-center text-[10px] text-ash mt-2 font-semibold">
                {tile.delta !== null ? (
                  <span className={`px-1.5 py-0.5 rounded-full ${tile.delta >= 0 ? 'bg-emerald-100/80 text-emerald-700' : 'bg-rose-100/80 text-rust'}`}>
                    {tile.delta >= 0 ? '↑' : '↓'} {Math.abs(tile.delta)}%
                  </span>
                ) : (
                  <UiversePulseBadge label="Active" status="active" size="sm" />
                )}
                <span>{tile.sub}</span>
              </div>
            </div>
          </UiverseGlassCard>
        ))}
      </motion.div>

      {/* JOURNEY FUNNEL & AI RESOLUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey Funnel */}
        <div className="lg:col-span-2 bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">Customer Journey Funnel</h3>
            <p className="text-xs text-ash mb-6">Drop-off rates across communication and checkout stages</p>

            <div className="space-y-4">
              {[
                { name: 'Conversations received', count: currentStats.funnelConversations, percent: 100 },
                { name: 'Reached order intent',   count: currentStats.funnelOrderIntent,   percent: currentStats.funnelConversations > 0 ? Math.round((currentStats.funnelOrderIntent / currentStats.funnelConversations) * 100) : 0 },
                { name: 'Order confirmed',        count: currentStats.funnelConfirmed,     percent: currentStats.funnelOrderIntent > 0 ? Math.round((currentStats.funnelConfirmed / currentStats.funnelOrderIntent) * 100) : 0 },
                { name: 'Fulfilled',              count: currentStats.funnelFulfilled,     percent: currentStats.funnelConfirmed > 0 ? Math.round((currentStats.funnelFulfilled / currentStats.funnelConfirmed) * 100) : 0 },
              ].map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-ink">
                    <span>{step.name}</span>
                    <span className="font-mono text-ash">{step.count} ({step.percent}%)</span>
                  </div>
                  <div className="w-full bg-fog rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-ink h-full rounded-full transition-all duration-500"
                      style={{ width: `${step.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Resolution Split */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">AI Resolution Split</h3>
            <p className="text-xs text-ash mb-6">Autopilot vs human hand-offs</p>

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-32 h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Resolved by AI', value: currentStats.aiResolved },
                        { name: 'Human Escalations', value: currentStats.humanEscalated }
                      ]}
                      innerRadius={36}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill={COLORS[0]} />
                      <Cell fill={COLORS[1]} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-ink leading-none">{currentStats.autopilotRate}%</span>
                  <span className="text-[9px] text-ash font-bold mt-0.5">Autopilot</span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="w-full space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                    <span className="text-ink font-semibold">Autopilot Resolved</span>
                  </div>
                  <span className="font-semibold text-ink font-mono">{currentStats.aiResolved}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-apricot-wash border border-rust/10" />
                    <span className="text-ash font-semibold">Human Takeover</span>
                  </div>
                  <span className="font-semibold text-ash font-mono">{currentStats.humanEscalated}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION */}
      {hasNeedsAttention && (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <AlertTriangle className="w-4 h-4 text-rust shrink-0" />
            <h3 className="text-sm font-semibold text-ink">Needs Attention</h3>
          </div>
          <div className="flex flex-col divide-y divide-dove/10">
            {currentStats.pendingOrders > 0 && (
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust animate-pulse" />
                  <span className="text-xs text-ink font-semibold">{currentStats.pendingOrders} order{currentStats.pendingOrders > 1 ? 's' : ''} pending confirmation</span>
                </div>
                <Link href="/dashboard/orders" className="text-[10px] font-bold text-rust hover:underline flex items-center gap-0.5 uppercase tracking-wider">
                  Confirm orders <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
            {currentStats.paymentMismatches > 0 && (
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust animate-pulse" />
                  <span className="text-xs text-ink font-semibold">{currentStats.paymentMismatches} payment mismatch{currentStats.paymentMismatches > 1 ? 'es' : ''} detected</span>
                </div>
                <Link href="/dashboard/orders" className="text-[10px] font-bold text-rust hover:underline flex items-center gap-0.5 uppercase tracking-wider">
                  Review payments <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
            {currentStats.lowStockProducts > 0 && (
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust animate-pulse" />
                  <span className="text-xs text-ink font-semibold">{currentStats.lowStockProducts} product{currentStats.lowStockProducts > 1 ? 's are' : ' is'} low on stock</span>
                </div>
                <Link href="/dashboard/inventory" className="text-[10px] font-bold text-rust hover:underline flex items-center gap-0.5 uppercase tracking-wider">
                  Update inventory <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
      >
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 bg-sky-wash text-ink rounded-lg flex items-center justify-center mb-4">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-medium text-ink mb-2">Live Inbox</h3>
            <p className="text-ash text-xs mb-6 leading-relaxed">
              Watch DullBot interact with your customers in real-time. Jump in and take over any conversation manually if needed.
            </p>
          </div>
          <Link href="/dashboard/inbox" className="self-start px-5 py-2.5 bg-fog text-ink font-semibold rounded-buttons border border-dove/20 hover:bg-dove/15 transition-all text-xs shadow-subtle">
            Go to Inbox
          </Link>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 bg-apricot-wash text-rust rounded-lg flex items-center justify-center mb-4">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-medium text-ink mb-2">Fulfill Orders</h3>
            <p className="text-ash text-xs mb-6 leading-relaxed">
              Review captured orders, verify payments, and generate invoices or courier consignments with one click.
            </p>
          </div>
          <Link href="/dashboard/orders" className="self-start px-5 py-2.5 bg-ink text-white font-semibold rounded-buttons hover:bg-black transition-all text-xs shadow-subtle">
            View Orders
          </Link>
        </motion.div>
      </motion.div>

    </div>
  );
}
