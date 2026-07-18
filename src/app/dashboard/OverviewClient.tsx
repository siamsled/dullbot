'use client';

import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Activity, MessageSquareText, Package, Users, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { saveBusinessType } from './actions';

export default function OverviewClient({ shop: initialShop, productCount }: { shop: any; productCount: number }) {
  const [shop, setShop] = useState(initialShop);

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

  // If Business Classification is not completed yet — show the type picker
  const stepsDone = shop.onboarding_steps_done || [];
  const isClassificationDone = stepsDone.includes('classification');

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

  // If onboarding is incomplete — redirect to Launch Control
  if (!shop.onboarding_complete) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-white rounded-cards shadow-subtle border border-dove/10 p-10 flex flex-col items-center text-center"
        >
          <span className="w-14 h-14 bg-apricot-wash rounded-full flex items-center justify-center text-rust text-2xl mb-6 shadow-sm">🚀</span>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-3">Launch Control Required</h1>
          <p className="text-ash text-sm mb-8 leading-relaxed">
            Your store is currently in Setup Mode. Complete the launch checklist to view live analytics and activate DullBot AI Autopilot.
          </p>
          <Link 
            href="/dashboard/launch-control"
            className="px-6 py-3 bg-ink text-pure-white text-sm font-semibold rounded-buttons hover:bg-black transition-all flex items-center gap-2 hover:scale-[1.02] shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Open Launch Control &rarr;
          </Link>
        </motion.div>
      </div>
    );
  }

  // Main dashboard after onboarding is complete
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Overview</h1>
        <p className="text-ash text-lg">Here's what DullBot has been up to today.</p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        {/* Conversations Card */}
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

        {/* AI Autopilot Rate Card */}
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

        {/* Orders Card */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-dove/5 hover:border-dove/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-ash">Orders Captured</span>
            <span className="p-2 bg-fog text-ink rounded-lg"><Package className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-serif font-medium text-ink">8</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-ash">
            <span>1 pending fulfillment</span>
          </div>
        </motion.div>

        {/* Customers Card */}
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

      {/* Quick Actions */}
      <h2 className="text-2xl font-serif text-ink tracking-tight mb-6">Quick Actions</h2>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-8 flex flex-col items-start border border-transparent hover:border-dove/20 transition-colors">
          <div className="w-12 h-12 bg-sky-wash text-blue-600 rounded-full flex items-center justify-center mb-6">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-ink mb-2">Check Live Inbox</h2>
          <p className="text-sm text-ash mb-6 leading-relaxed">
            Monitor real-time conversations. Step in and take over from the AI if a customer needs special attention.
          </p>
          <Link href="/dashboard/inbox" className="mt-auto px-5 py-2.5 rounded-buttons bg-fog text-ink text-sm font-medium hover:bg-dove/20 transition-colors">
            Go to Inbox
          </Link>
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-8 flex flex-col items-start border border-transparent hover:border-dove/20 transition-colors">
          <div className="w-12 h-12 bg-fog text-ink rounded-full flex items-center justify-center mb-6">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-ink mb-2">Fulfill Orders</h2>
          <p className="text-sm text-ash mb-6 leading-relaxed">
            You have 3 new orders waiting for fulfillment. The AI has already collected their orders.
          </p>
          <Link href="/dashboard/orders" className="mt-auto px-5 py-2.5 rounded-buttons bg-ink text-pure-white text-sm font-medium hover:bg-black transition-colors">
            View Orders
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
