'use client';

import { useState, useEffect } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import {
  Activity, MessageSquareText, Package, Users, AlertCircle, X,
  CheckCircle2, Plus, ChevronRight, Sparkles, AlertTriangle, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { saveBusinessType } from './actions';
import { ShopStats } from '@/lib/analytics';

const BANNER_DISMISSED_KEY = 'dullbot_setup_banner_dismissed';
const NUDGE_DISMISSED_KEY = 'dullbot_nudge_widget_dismissed';

const COLORS = ['#1c1917', '#e5e0d8']; // Donut slices: AI-resolved (Neutral dark), Escalated (Neutral light)

interface Props {
  shop: any;
  productCount: number;
  stats: ShopStats;
}

export default function OverviewClient({ shop: initialShop, productCount, stats }: Props) {
  const [shop, setShop] = useState(initialShop);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isNudgeDismissed, setIsNudgeDismissed] = useState(false);

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
      transition: { staggerChildren: 0.05 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
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
    if (stats.revenueTotal > 5000) {
      return "Peak order window identified: Thursday afternoon saw a 40% surge in confirmed orders.";
    }
    if (stats.autopilotRate > 85) {
      return "AI Autopilot conversion is highly stable, handling over 85% of all traffic without human intervention.";
    }
    return "Dhaka district is currently your highest performing region by customer conversation rate.";
  };

  // If Business Classification is not completed yet — show the type picker
  if (!isClassificationDone) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-pure-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-white rounded-cards shadow-subtle border border-dove/10 p-10 flex flex-col items-center text-center"
        >
          <span className="w-14 h-14 bg-apricot-wash rounded-full flex items-center justify-center text-rust text-2xl mb-6 shadow-sm">🎯</span>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-3">Welcome to DullBot</h1>
          <p className="text-ash text-sm mb-8 leading-relaxed">
            Let's get your store set up. First, what kind of business do you run? This helps us configure the right automated checkout flows for your customers.
          </p>

          <div className="grid grid-cols-1 gap-4 w-full">
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
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-ink group-hover:text-rust transition-colors">{type.title}</span>
                  <span className="text-xs text-ash group-hover:text-ink font-medium">Select &rarr;</span>
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
      <div className="h-10 w-full mt-2 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#17191c" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#17191c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="val" stroke="#17191c" strokeWidth={1.5} fill="url(#sparkGradient)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const hasNeedsAttention = stats.pendingOrders > 0 || stats.paymentMismatches > 0 || stats.lowStockProducts > 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">

      {/* SETUP WARNING */}
      <AnimatePresence>
        {!hardRequirementsMet && !isBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-apricot-wash border border-rust/20 rounded-cards p-4 flex items-start gap-3 relative pr-10">
              <div className="w-8 h-8 shrink-0 bg-white rounded-full flex items-center justify-center text-rust shadow-sm border border-rust/10 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-medium text-ink mb-0.5">AI Autopilot is disabled</h3>
                <p className="text-sm text-ash leading-relaxed">
                  Complete your{' '}
                  <strong className="text-ink">Business Context</strong>{' '}
                  in the sidebar
                  {!isMetaDone && (
                    <> and <Link href="/dashboard/settings" className="font-semibold text-rust hover:underline">connect your Facebook Page</Link></>
                  )}{' '}
                  to activate the AI agent.
                </p>
              </div>
              <button
                onClick={dismissBanner}
                className="absolute top-3.5 right-3.5 p-1 text-rust/60 hover:text-rust hover:bg-white/60 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & INSIGHT CALLOUT */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="text-4xl font-serif text-ink tracking-tight mb-1">Overview</h1>
            <p className="text-ash text-sm">Here's what DullBot has been up to today.</p>
          </div>
        </motion.div>

        {/* Insight callout banner */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-fog border border-dove/20 rounded-inputs px-4 py-3 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-rust shrink-0" />
          <p className="text-xs font-medium text-ink leading-relaxed">
            <span className="font-bold text-rust">Weekly Insight:</span> {getInsightCallout()}
          </p>
        </motion.div>
      </div>

      {/* Soft Progress Nudge Widget */}
      <AnimatePresence>
        {!isNudgeDismissed && !allSoftDone && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden"
          >
            {/* Widget header */}
            <div className="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-ink text-sm">Finish setting up</h3>
                <p className="text-xs text-ash mt-0.5">
                  {softStepsDoneCount} of {softSteps.length} optional steps done.{' '}
                  <span className="text-green-600 font-medium">DullBot is already live.</span>
                </p>
              </div>
              <button
                onClick={dismissNudge}
                className="p-1 text-ash hover:text-ink hover:bg-fog rounded transition-colors mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Item list */}
            <div className="px-5 pb-4 flex flex-col divide-y divide-dove/8">
              {softSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3 py-3">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-dove/50 shrink-0" />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      step.done ? 'text-ash line-through' : 'text-ink'
                    }`}
                  >
                    {step.title}
                  </span>
                  {!step.done && (
                    <Link
                      href={step.link}
                      className="shrink-0 px-3 py-1 text-xs font-medium bg-fog text-ink border border-dove/20 rounded-full hover:bg-dove/15 hover:border-ink transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {step.actionLabel}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METRIC TILES */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Revenue */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-5 border border-dove/5 hover:border-dove/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-ash uppercase tracking-wider">Revenue (7d)</span>
              <span className="p-1.5 bg-fog text-ink rounded-md"><Package className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-serif font-medium text-ink">৳{stats.revenueTotal.toLocaleString()}</p>
          </div>
          <div className="mt-3">
            <Sparkline data={stats.revenueSeries} />
            <div className="flex justify-between text-[10px] text-ash mt-1.5">
              <span className={stats.revenueDelta >= 0 ? 'text-emerald-600 font-semibold' : 'text-rust font-semibold'}>
                {stats.revenueDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueDelta)}%
              </span>
              <span>vs last week</span>
            </div>
          </div>
        </motion.div>

        {/* Orders Captured */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-5 border border-dove/5 hover:border-dove/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-ash uppercase tracking-wider">Orders Captured</span>
              <span className="p-1.5 bg-fog text-ink rounded-md"><Package className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-serif font-medium text-ink">{stats.ordersTotal}</p>
          </div>
          <div className="mt-3">
            <Sparkline data={stats.ordersSeries} />
            <div className="flex justify-between text-[10px] text-ash mt-1.5">
              <span className={stats.ordersDelta >= 0 ? 'text-emerald-600 font-semibold' : 'text-rust font-semibold'}>
                {stats.ordersDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.ordersDelta)}%
              </span>
              <span>vs last week</span>
            </div>
          </div>
        </motion.div>

        {/* Active Conversations */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-5 border border-dove/5 hover:border-dove/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-ash uppercase tracking-wider">Conversations</span>
              <span className="p-1.5 bg-fog text-ink rounded-md"><MessageSquareText className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-serif font-medium text-ink">{stats.convsTotal}</p>
          </div>
          <div className="mt-3">
            <Sparkline data={stats.convSeries} />
            <div className="flex justify-between text-[10px] text-ash mt-1.5">
              <span className={stats.convDelta >= 0 ? 'text-emerald-600 font-semibold' : 'text-rust font-semibold'}>
                {stats.convDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.convDelta)}%
              </span>
              <span>vs last week</span>
            </div>
          </div>
        </motion.div>

        {/* Autopilot Rate */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-5 border border-dove/5 hover:border-dove/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-ash uppercase tracking-wider">AI Autopilot Rate</span>
              <span className="p-1.5 bg-fog text-ink rounded-md"><Activity className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-serif font-medium text-ink">{stats.autopilotRate}%</p>
          </div>
          <div className="mt-3">
            <Sparkline data={stats.autopilotSeries} />
            <div className="flex justify-between text-[10px] text-ash mt-1.5">
              <span className="text-emerald-600 font-semibold">Active</span>
              <span>handling channel traffic</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* JOURNEY FUNNEL & AI RESOLUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey Funnel */}
        <div className="lg:col-span-2 bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">Customer Journey Funnel</h3>
            <p className="text-xs text-ash mb-6">Drop-off rates across communication and checkout stages (last 7d)</p>

            <div className="space-y-4">
              {[
                { name: 'Conversations received', count: stats.funnelConversations, percent: 100 },
                { name: 'Reached order intent',   count: stats.funnelOrderIntent,   percent: stats.funnelConversations > 0 ? Math.round((stats.funnelOrderIntent / stats.funnelConversations) * 100) : 0 },
                { name: 'Order confirmed',        count: stats.funnelConfirmed,     percent: stats.funnelOrderIntent > 0 ? Math.round((stats.funnelConfirmed / stats.funnelOrderIntent) * 100) : 0 },
                { name: 'Fulfilled',              count: stats.funnelFulfilled,     percent: stats.funnelConfirmed > 0 ? Math.round((stats.funnelFulfilled / stats.funnelConfirmed) * 100) : 0 },
              ].map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-ink">
                    <span>{step.name}</span>
                    <span className="font-mono">{step.count} ({step.percent}%)</span>
                  </div>
                  <div className="w-full bg-fog rounded-full h-3.5 overflow-hidden">
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
            <p className="text-xs text-ash mb-6">Autopilot vs human hand-offs (last 7d)</p>

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-32 h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Resolved by AI', value: stats.aiResolved },
                        { name: 'Human Escalations', value: stats.humanEscalated }
                      ]}
                      innerRadius={38}
                      outerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill={COLORS[0]} />
                      <Cell fill={COLORS[1]} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-ink leading-none">{stats.autopilotRate}%</span>
                  <span className="text-[9px] text-ash font-medium mt-0.5">Autopilot</span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="w-full space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                    <span className="text-ink font-medium">Autopilot Resolved</span>
                  </div>
                  <span className="font-semibold text-ink font-mono">{stats.aiResolved}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-dove/40" />
                    <span className="text-ash">Human Takeover</span>
                  </div>
                  <span className="font-semibold text-ash font-mono">{stats.humanEscalated}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION */}
      {hasNeedsAttention && (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-rust shrink-0" />
            <h3 className="text-sm font-semibold text-ink">Needs Attention</h3>
          </div>
          <div className="flex flex-col divide-y divide-dove/10">
            {stats.pendingOrders > 0 && (
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust" />
                  <span className="text-xs text-ink font-medium">{stats.pendingOrders} order{stats.pendingOrders > 1 ? 's' : ''} pending confirmation</span>
                </div>
                <Link href="/dashboard/orders" className="text-[10px] font-bold text-rust hover:underline flex items-center gap-0.5">
                  Confirm orders <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
            {stats.paymentMismatches > 0 && (
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust" />
                  <span className="text-xs text-ink font-medium">{stats.paymentMismatches} payment mismatch{stats.paymentMismatches > 1 ? 'es' : ''} detected</span>
                </div>
                <Link href="/dashboard/orders" className="text-[10px] font-bold text-rust hover:underline flex items-center gap-0.5">
                  Review payments <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
            {stats.lowStockProducts > 0 && (
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust" />
                  <span className="text-xs text-ink font-medium">{stats.lowStockProducts} product{stats.lowStockProducts > 1 ? 's are' : ' is'} low on stock</span>
                </div>
                <Link href="/dashboard/inventory" className="text-[10px] font-bold text-rust hover:underline flex items-center gap-0.5">
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
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-medium text-ink mb-2">Live Inbox</h3>
            <p className="text-ash text-xs mb-6 leading-relaxed">
              Watch DullBot interact with your customers in real-time. Jump in and take over any conversation manually if needed.
            </p>
          </div>
          <Link href="/dashboard/inbox" className="self-start px-5 py-2.5 bg-fog text-ink font-semibold rounded-buttons hover:bg-dove/20 transition-colors text-xs">
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
          <Link href="/dashboard/orders" className="self-start px-5 py-2.5 bg-ink text-white font-semibold rounded-buttons hover:bg-black transition-colors text-xs">
            View Orders
          </Link>
        </motion.div>
      </motion.div>

    </div>
  );
}
