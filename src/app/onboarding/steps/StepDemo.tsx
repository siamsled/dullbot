'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
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
    }, 1800);
  };

  const channelList = [
    shop.meta_page_access_token && 'Messenger',
    shop.instagram_business_id && 'Instagram',
    shop.whatsapp_phone_number_id && 'WhatsApp'
  ].filter(Boolean);

  const channelsDisplay = channelList.length > 0 ? channelList.join(' · ') : 'Direct Messaging';
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
      {/* Editorial Content */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4 scroll-smooth min-h-0 flex flex-col justify-center items-center text-center px-4">
        <div className="max-w-md space-y-6 flex flex-col items-center my-auto py-6">
          
          {/* Siri Orb */}
          <div className="relative flex items-center justify-center py-2">
            <SiriOrb size="56px" state="listening" />
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
              DullBot is ready for {shopName}.
            </h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
              Your AI shop assistant is online and prepared to answer customer inquiries, manage orders, and verify payments.
            </p>
          </div>

          {/* Minimalist Summary Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-3.5 py-1.5 rounded-full bg-white/6 border border-white/12 text-xs font-medium text-white/70">
              Tone: <strong className="text-white capitalize">{shop.tone_template || 'Warm'}</strong>
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/6 border border-white/12 text-xs font-medium text-white/70">
              Channels: <strong className="text-white">{channelsDisplay}</strong>
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/6 border border-white/12 text-xs font-medium text-white/70">
              Gateway: <strong className="text-white">{shop.courier_provider ? shop.courier_provider : 'Manual'}</strong>
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
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-sm text-black bg-white hover:bg-white/90 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-40 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              Opening Dashboard…
            </>
          ) : (
            <>
              Open Merchant Dashboard →
            </>
          )}
        </button>
      </div>

      {/* Launching Overlay */}
      <AnimatePresence>
        {showDeployModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[rgba(12,13,18,0.95)] backdrop-blur-2xl border border-white/15 rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center shadow-xl">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Opening Dashboard</h2>
                <p className="text-xs text-white/60">Taking you to your live control panel…</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
