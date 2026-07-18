'use client';

import { useState, useEffect } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { Activity, MessageSquareText, Package, Users, AlertCircle, X, CheckCircle2, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { saveBusinessType } from './actions';

const BANNER_DISMISSED_KEY = 'dullbot_setup_banner_dismissed';
const NUDGE_DISMISSED_KEY = 'dullbot_nudge_widget_dismissed';

export default function OverviewClient({ shop: initialShop, productCount }: { shop: any; productCount: number }) {
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

  // Main dashboard
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      <AnimatePresence>
        {!hardRequirementsMet && !isBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            className="mb-8 overflow-hidden"
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

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Overview</h1>
          <p className="text-ash text-lg">Here's what DullBot has been up to today.</p>
        </div>
      </motion.div>

      {/* Soft Progress Nudge Widget */}
      <AnimatePresence>
        {!isNudgeDismissed && !allSoftDone && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-10 bg-white rounded-cards shadow-subtle border border-dove/10 overflow-hidden"
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

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-dove/5 hover:border-dove/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-ash">Active Conversations</span>
            <span className="p-2 bg-fog text-ink rounded-lg"><MessageSquareText className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-serif font-medium text-ink">12</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
            <span>&uarr; 15%</span>
            <span className="text-ash font-normal">vs last week</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-dove/5 hover:border-dove/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-ash">AI Autopilot Rate</span>
            <span className="p-2 bg-fog text-ink rounded-lg"><Activity className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-serif font-medium text-ink">91.4%</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
            <span>&uarr; 4.2%</span>
            <span className="text-ash font-normal">vs last week</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-dove/5 hover:border-dove/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-ash">Orders Captured</span>
            <span className="p-2 bg-fog text-ink rounded-lg"><Package className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-serif font-medium text-ink">8</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-ink font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rust"></span>
            <span className="text-ash font-normal">1 pending fulfillment</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-dove/5 hover:border-dove/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-ash">Total Customers</span>
            <span className="p-2 bg-fog text-ink rounded-lg"><Users className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-serif font-medium text-ink">34</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
            <span>&uarr; 8%</span>
            <span className="text-ash font-normal">vs last week</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Action Cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-8 flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif font-medium text-ink mb-2">Live Inbox</h3>
            <p className="text-ash text-sm mb-6 leading-relaxed">
              Watch DullBot interact with your customers in real-time. Jump in and take over any conversation manually if needed.
            </p>
          </div>
          <Link href="/dashboard/inbox" className="self-start px-5 py-2.5 bg-fog text-ink font-medium rounded-buttons hover:bg-dove/20 transition-colors text-sm">
            Go to Inbox
          </Link>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle border border-dove/10 p-8 flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 bg-apricot-wash text-rust rounded-lg flex items-center justify-center mb-4">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif font-medium text-ink mb-2">Fulfill Orders</h3>
            <p className="text-ash text-sm mb-6 leading-relaxed">
              Review captured orders, verify payments, and generate invoices or courier consignments with one click.
            </p>
          </div>
          <Link href="/dashboard/orders" className="self-start px-5 py-2.5 bg-ink text-white font-medium rounded-buttons hover:bg-black transition-colors text-sm">
            View Orders
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
