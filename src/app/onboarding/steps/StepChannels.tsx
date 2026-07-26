'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Smartphone, ArrowRight, ArrowLeft, X, Loader2, Check } from 'lucide-react';
import ChannelStatusCard from '../ChannelStatusCard';
import { saveOnboardingStep } from '../../dashboard/actions';

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface Props {
  shop: any;
  onNext: () => void;
  onBack: () => void;
}

const WA_NUDGE_KEY = 'dullbot_wa_nudge';
const IG_NUDGE_KEY = 'dullbot_ig_nudge';

export default function StepChannels({ shop, onNext, onBack }: Props) {
  const [messengerConnected, setMessengerConnected] = useState(!!shop.meta_page_access_token);
  const [instagramConnected, setInstagramConnected] = useState(!!shop.instagram_business_id);
  const [waConnected, setWaConnected] = useState(!!shop.whatsapp_phone_number_id);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waWabaId, setWaWabaId] = useState(shop.whatsapp_business_account_id || '');
  const [waPhoneId, setWaPhoneId] = useState(shop.whatsapp_phone_number_id || '');
  const [waToken, setWaToken] = useState(shop.whatsapp_access_token || '');
  const [waSaving, setWaSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // After OAuth redirect lands back here, re-read search params to detect connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('messenger') === 'connected') {
      setMessengerConnected(true);
    }
    if (params.get('instagram') === 'connected') {
      setInstagramConnected(true);
    }
  }, []);

  const handleSaveWa = async () => {
    setWaSaving(true);
    try {
      const res = await (await import('../../dashboard/settings/actions')).saveWhatsAppConfig(shop.id, {
        wabaId: waWabaId.trim(),
        phoneId: waPhoneId.trim(),
        token: waToken.trim(),
      });
      if (res.success) {
        setWaConnected(true);
        setShowWaModal(false);
      }
    } catch (e) {
      /* swallow */
    }
    setWaSaving(false);
  };

  const handleNext = async () => {
    setAdvancing(true);
    // If Instagram or WA were skipped, set nudge flags for later
    if (!instagramConnected) localStorage.setItem(IG_NUDGE_KEY, '1');
    if (!waConnected) localStorage.setItem(WA_NUDGE_KEY, '1');
    await saveOnboardingStep(shop.id, 'context');
    onNext();
  };

  const inputCls = 'w-full bg-fog border border-transparent rounded-inputs py-2.5 px-3.5 text-ink text-xs focus:border-ink focus:outline-none transition-all placeholder:text-dove/70';

  return (
    <motion.div
      key="step-channels"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="flex flex-col"
    >
      <div className="mb-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl text-ink font-light text-center leading-tight mb-2 tracking-tight">
        Connect your channels
      </h1>
      <p className="text-xs text-ash text-center mb-8 max-w-md mx-auto leading-relaxed">
        Connect Messenger to activate your AI agent. Instagram and WhatsApp can be added now or later.
      </p>

      <div className="space-y-3 mb-8">
        {/* Messenger — required */}
        <ChannelStatusCard
          icon={<Globe className="w-5 h-5" />}
          title="Facebook Messenger"
          subtitle={messengerConnected ? `Connected: ${shop.meta_page_name || 'Your Page'}` : 'Required to activate the AI agent'}
          required
          connected={messengerConnected}
          connectHref={`/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`}
        />

        {/* Instagram — optional */}
        <ChannelStatusCard
          icon={<InstagramIcon className="w-5 h-5" />}
          title="Instagram DMs"
          subtitle={instagramConnected ? 'Instagram Business Account connected' : 'Connects via Facebook Login'}
          required={false}
          optionalLabel="Optional — add later"
          connected={instagramConnected}
          connectHref={`/api/auth/facebook/login?shopId=${shop.id}&source=onboarding_instagram`}
        />

        {/* WhatsApp — optional, manual credentials */}
        <ChannelStatusCard
          icon={<Smartphone className="w-5 h-5" />}
          title="WhatsApp Business"
          subtitle={waConnected ? 'WhatsApp Cloud API connected' : 'Connect WhatsApp Cloud API — requires WABA setup'}
          required={false}
          optionalLabel="Optional — add later"
          connected={waConnected}
          onConnectClick={() => setShowWaModal(true)}
        />
      </div>

      <button
        disabled={!messengerConnected || advancing}
        onClick={handleNext}
        className={`w-full py-3.5 text-xs font-semibold rounded-buttons flex items-center justify-center gap-2 transition-all ${
          messengerConnected
            ? 'bg-ink text-white hover:bg-black'
            : 'bg-fog text-ash cursor-not-allowed border border-dove/20'
        }`}
      >
        {advancing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {messengerConnected ? 'Continue' : 'Connect Messenger to continue'}
            {messengerConnected && <ArrowRight className="w-4 h-4" />}
          </>
        )}
      </button>

      {!messengerConnected && (
        <p className="text-[11px] text-ash/60 text-center mt-3">
          Messenger is required — it&apos;s how DullBot talks to your customers.
        </p>
      )}

      {/* WhatsApp Setup Modal */}
      <AnimatePresence>
        {showWaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-cards shadow-xl border border-dove/10 w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-base text-ink">Connect WhatsApp Cloud API</h3>
                <button onClick={() => setShowWaModal(false)} className="text-ash hover:text-ink p-1 rounded-lg hover:bg-fog transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-ash mb-4 leading-relaxed">
                WhatsApp requires a Meta Business Account and approved WhatsApp Business Account (WABA). 
                You can complete this setup in Meta Business Manager first, then paste your credentials here.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">WABA ID (WhatsApp Business Account ID)</label>
                  <input
                    type="text"
                    value={waWabaId}
                    onChange={(e) => setWaWabaId(e.target.value)}
                    placeholder="e.g. 123456789012345"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Phone Number ID</label>
                  <input
                    type="text"
                    value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)}
                    placeholder="e.g. 987654321098765"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">System User Access Token</label>
                  <input
                    type="password"
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder="Your permanent system user token"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowWaModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-ash bg-fog rounded-buttons hover:bg-dove/10 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSaveWa}
                  disabled={waSaving || !waPhoneId.trim() || !waToken.trim()}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-ink rounded-buttons hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {waSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
