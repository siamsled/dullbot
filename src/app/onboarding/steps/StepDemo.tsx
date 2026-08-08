'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Rocket, Check, Sparkles, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { completeOnboarding } from '../../dashboard/actions';
import { useRouter } from 'next/navigation';
import SiriOrb from '@/components/ui/siri-orb';

interface Props {
  shop: any;
  onBack: () => void;
}

export default function StepDemo({ shop, onBack }: Props) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  const handleDeploy = async () => {
    setCompleting(true);
    try {
      await completeOnboarding(shop.id);
    } catch (e) {
      /* no-op */
    }
    setShowDeployModal(true);
    setTimeout(() => {
      router.push('/dashboard?unlocked=1');
    }, 2200);
  };

  const channelList = [
    shop.meta_page_access_token && 'Facebook Messenger',
    shop.instagram_business_id && 'Instagram DMs',
    shop.whatsapp_phone_number_id && 'WhatsApp Business'
  ].filter(Boolean);

  const channelsDisplay = channelList.length > 0 ? channelList.join(' · ') : 'Direct Dashboard Messaging';
  const shopName = shop.name && shop.name !== 'Dull Store' && !shop.name.startsWith('store-') ? shop.name : 'Your Store';

  return (
    <motion.div
      key="step-welcome-launch"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full min-h-0 flex-1 overflow-hidden"
    >
      {/* Scrollable welcoming body */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4 scroll-smooth min-h-0 flex flex-col justify-between">
        <div className="space-y-6 text-center sm:text-left pt-2">

          {/* Hero Celebration Aura */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-gradient-to-r from-emerald-500/15 via-indigo-500/10 to-purple-500/10 rounded-3xl border border-emerald-500/25 shadow-xl backdrop-blur-md">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute inline-flex h-16 w-16 rounded-full bg-emerald-400/20 animate-ping" />
              <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center shadow-2xl relative">
                <SiriOrb size="44px" state="listening" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-extrabold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> AI Engine Online
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
                You&apos;re all set, {shopName}!
              </h1>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                Your AI sales &amp; operations teammate is configured and ready to automate customer responses, manage inventory, and verify payment receipts.
              </p>
            </div>
          </div>

          {/* 3 Summary Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Persona */}
            <div className="p-4 rounded-2xl bg-white/4 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">AI Persona</p>
                <h3 className="font-semibold text-sm text-white capitalize mt-0.5">{shop.tone_template || 'Warm & Respectful'} Tone</h3>
                <p className="text-xs text-white/50 mt-1">Trained on {shop.business_type || 'Retail'} catalog &amp; policies.</p>
              </div>
            </div>

            {/* Card 2: Channels */}
            <div className="p-4 rounded-2xl bg-white/4 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Connected Channels</p>
                <h3 className="font-semibold text-sm text-white truncate mt-0.5">{channelsDisplay}</h3>
                <p className="text-xs text-white/50 mt-1">Listening for customer DMs in real-time.</p>
              </div>
            </div>

            {/* Card 3: Automation */}
            <div className="p-4 rounded-2xl bg-white/4 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Auto Fulfillment</p>
                <h3 className="font-semibold text-sm text-white mt-0.5">MFS &amp; Order Gateway</h3>
                <p className="text-xs text-white/50 mt-1">Automated receipt checks &amp; courier dispatch.</p>
              </div>
            </div>
          </div>

          {/* Encouraging Banner */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/60 leading-relaxed flex items-center gap-3">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You can tune AI prompts, add products, or toggle live channels anytime from your merchant control panel.
            </span>
          </div>

        </div>
      </div>

      {/* Pinned Nav Bar */}
      <div className="flex items-center justify-between pt-3 pb-2 shrink-0 border-t border-white/10 mt-auto z-20 gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white active:scale-[0.98] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleDeploy}
          disabled={completing}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-sm text-black bg-white hover:bg-white/95 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-40 shadow-[0_0_24px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              Launching Control Panel…
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Open Merchant Dashboard →
            </>
          )}
        </button>
      </div>

      {/* Launching Celebration Modal */}
      <AnimatePresence>
        {showDeployModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[rgba(12,13,18,0.95)] backdrop-blur-2xl border border-white/15 rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Welcome to DullBot</h2>
                <p className="text-xs text-white/60">Opening your live merchant control panel…</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
