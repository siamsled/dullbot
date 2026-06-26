'use client';

import { motion, Variants } from 'framer-motion';
import { Activity, MessageSquareText, Package, Users, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function OverviewClient() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {/* Active Conversations */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">Active Chats</p>
            <div className="p-2 bg-sky-wash rounded-lg text-blue-600">
              <MessageSquareText className="w-5 h-5" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-serif text-ink mb-1">12</p>
            <p className="text-xs text-ash flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-500" /> 4 since yesterday</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-sky-wash opacity-30 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </motion.div>

        {/* AI Success Rate */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">AI Automation</p>
            <div className="p-2 bg-apricot-wash rounded-lg text-rust">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-serif text-ink mb-1">92%</p>
            <p className="text-xs text-ash">Queries handled without human</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-apricot-wash opacity-30 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </motion.div>

        {/* Pending Orders */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">Pending Orders</p>
            <div className="p-2 bg-fog rounded-lg text-ink">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-serif text-ink mb-1">3</p>
            <p className="text-xs text-ash">Awaiting fulfillment</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-fog opacity-50 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </motion.div>

        {/* Unique Customers */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">Customers Reached</p>
            <div className="p-2 bg-fog rounded-lg text-ink">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-serif text-ink mb-1">1,048</p>
            <p className="text-xs text-ash">Total interactions</p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-fog opacity-50 rounded-full group-hover:scale-125 transition-transform duration-500" />
        </motion.div>
      </motion.div>

      {/* Main Sections */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Quick Action: Inbox */}
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

        {/* Quick Action: Orders */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-8 flex flex-col items-start border border-transparent hover:border-dove/20 transition-colors">
          <div className="w-12 h-12 bg-fog text-ink rounded-full flex items-center justify-center mb-6">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-ink mb-2">Fulfill Orders</h2>
          <p className="text-sm text-ash mb-6 leading-relaxed">
            You have 3 new orders waiting for fulfillment. The AI has already collected their addresses.
          </p>
          <Link href="/dashboard/orders" className="mt-auto px-5 py-2.5 rounded-buttons bg-ink text-pure-white text-sm font-medium hover:bg-black transition-colors">
            View Orders
          </Link>
        </motion.div>

      </motion.div>
    </div>
  );
}
