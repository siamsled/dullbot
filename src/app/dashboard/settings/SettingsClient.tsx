'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Settings, MessageCircle, Link2, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';

export default function SettingsClient({ shop }: { shop: any }) {
  // variants for staggered animation
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Workspace Settings</h1>
        <p className="text-ash text-lg">Manage your DullBot integrations and AI configurations.</p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Connect Meta Integration Card (Wide Card) */}
        <motion.div variants={item} className="md:col-span-2 bg-white rounded-cards shadow-subtle p-8 flex flex-col justify-between overflow-hidden relative group border border-transparent hover:border-dove/20 transition-colors">
          <div className="relative z-10">
            <div className="h-12 w-12 bg-sky-wash text-blue-600 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-ink mb-3">Meta Integrations</h2>
            
            {shop?.meta_page_name ? (
              <div className="mt-6">
                <div className="flex items-center justify-between p-5 bg-fog rounded-inputs border border-dove/30">
                  <div className="flex items-center gap-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-ink">Connected Page</p>
                      <p className="text-sm text-ash">{shop.meta_page_name}</p>
                    </div>
                  </div>
                  <button className="text-sm text-rust hover:text-red-700 font-medium transition-colors">Disconnect</button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-ash text-sm mb-6 max-w-md leading-relaxed">
                  Connect your Facebook Page to allow DullBot to automatically reply to your customers on Messenger and Instagram.
                </p>
                <Link 
                  href="/api/auth/facebook/login"
                  className="inline-flex items-center px-6 py-3 rounded-buttons bg-ink text-pure-white text-sm font-medium hover:bg-black transition-colors"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect Facebook Page
                </Link>
              </div>
            )}
          </div>
          {/* Decorative background element */}
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-wash/50 rounded-full blur-3xl group-hover:bg-sky-wash transition-colors duration-700" />
        </motion.div>

        {/* AI Agent Toggle (Square Card) */}
        <motion.div variants={item} className="bg-white rounded-cards shadow-subtle p-8 flex flex-col relative overflow-hidden group border border-transparent hover:border-dove/20 transition-colors">
          <div className="h-12 w-12 bg-apricot-wash text-rust rounded-full flex items-center justify-center mb-6">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-ink mb-3">AI Autopilot</h2>
          <p className="text-ash text-sm mb-8 flex-grow leading-relaxed">Let DullBot handle customer queries automatically in the background while you focus on fulfillment.</p>
          
          <div className="flex items-center justify-between mt-auto p-4 bg-fog rounded-inputs">
            <span className="text-sm font-medium text-ink">Status: Active</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-dove/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink"></div>
            </label>
          </div>
        </motion.div>

        {/* Verification Settings */}
        <motion.div variants={item} className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-cards shadow-subtle p-8 border border-transparent hover:border-dove/20 transition-colors relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-ink">Confirmation Tier</h3>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">Choose how rigorous you want order confirmations to be before packing.</p>
            <select className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all cursor-pointer">
              <option value="light">Light (Address Only)</option>
              <option value="otp_verified">OTP Verified (SMS)</option>
              <option value="prepay_verified">Prepay Verified (bKash/Nagad)</option>
            </select>
          </div>

          <div className="bg-white rounded-cards shadow-subtle p-8 border border-transparent hover:border-dove/20 transition-colors relative overflow-hidden group">
             <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-ink">Prepay Number</h3>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">The bKash or Nagad number for collecting customer pre-payments.</p>
            <input 
              type="text" 
              placeholder="e.g. 01712345678" 
              className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all placeholder:text-dove/70" 
            />
          </div>

        </motion.div>

      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10 flex justify-end"
      >
        <button className="flex items-center gap-2 px-8 py-3.5 rounded-buttons bg-ink text-pure-white text-sm font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
          Save Configuration
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
