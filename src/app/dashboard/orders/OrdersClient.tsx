'use client';

import { motion, Variants } from 'framer-motion';
import { Package, Clock, CheckCircle, Search, Filter } from 'lucide-react';

export default function OrdersClient() {
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
        className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Orders</h1>
          <p className="text-ash text-lg">Track and manage your customer purchases.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              className="pl-9 pr-4 py-2.5 bg-white border border-dove/30 rounded-inputs text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all w-64 shadow-subtle"
            />
          </div>
          <button className="p-2.5 bg-white border border-dove/30 rounded-inputs text-ink hover:bg-fog transition-colors shadow-subtle">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        {/* Stat Cards */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">Total Orders</p>
            <div className="p-2 bg-fog rounded-lg text-ink">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif text-ink z-10">0</p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-fog rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">Pending</p>
            <div className="p-2 bg-apricot-wash rounded-lg text-rust">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif text-ink z-10">0</p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-apricot-wash opacity-30 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </motion.div>

        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-6 border border-transparent hover:border-dove/20 transition-colors flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10">
            <p className="text-sm font-medium text-ash">Delivered</p>
            <div className="p-2 bg-sky-wash rounded-lg text-blue-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-serif text-ink z-10">0</p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-sky-wash opacity-30 rounded-full group-hover:scale-150 transition-transform duration-500" />
        </motion.div>
      </motion.div>

      {/* Main Table Card */}
      <motion.div 
        variants={item}
        initial="hidden"
        animate="show"
        className="bg-white rounded-cards shadow-subtle border border-transparent overflow-hidden"
      >
        <div className="p-6 border-b border-dove/20 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <h2 className="text-xl font-medium text-ink">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dove/20 bg-fog/50">
                <th className="px-6 py-4 text-xs font-medium text-graphite uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-medium text-graphite uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-medium text-graphite uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-graphite uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {/* Empty State */}
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-fog rounded-full flex items-center justify-center mb-4 text-graphite">
                      <Package className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-ink font-medium mb-1">No orders yet</p>
                    <p className="text-ash text-sm max-w-sm">When your AI agent or customers place orders, they will appear here automatically.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
