'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, CreditCard, Smartphone, SkipForward, Check } from 'lucide-react';
import { savePaymentChoice } from '../../dashboard/actions';

const COMPANION_NUDGE_KEY = 'dullbot_companion_nudge';

interface Props {
  shop: any;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPayments({ shop, onNext, onBack }: Props) {
  const [choice, setChoice] = useState<'merchant_api' | 'companion_app' | 'skip' | null>(
    shop.payment_verification_method === 'merchant_api' ? 'merchant_api'
    : shop.payment_verification_method === 'notification_app' ? 'companion_app'
    : null
  );
  const [bkashAppKey, setBkashAppKey] = useState('');
  const [bkashAppSecret, setBkashAppSecret] = useState('');
  const [bkashUsername, setBkashUsername] = useState('');
  const [bkashPassword, setBkashPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const OPTIONS = [
    {
      id: 'merchant_api' as const,
      icon: <CreditCard className="w-5 h-5" />,
      title: 'Merchant API',
      desc: 'Verify bKash / Nagad payments automatically via API. Requires merchant credentials.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      id: 'companion_app' as const,
      icon: <Smartphone className="w-5 h-5" />,
      title: 'Companion App',
      desc: 'Pair our mobile app — receive payment notifications and confirm with one tap.',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      id: 'skip' as const,
      icon: <SkipForward className="w-5 h-5" />,
      title: 'Skip for now',
      desc: 'Handle payment verification manually. You can set this up later in Settings.',
      color: 'text-ash',
      bg: 'bg-fog',
    },
  ];

  const handleContinue = async () => {
    if (!choice) return;
    setLoading(true);
    try {
      const bkashConfig = choice === 'merchant_api' ? {
        app_key: bkashAppKey, app_secret: bkashAppSecret,
        username: bkashUsername, password: bkashPassword, sandbox: false,
      } : undefined;

      const res = await savePaymentChoice(shop.id, choice, bkashConfig);
      if (res.success) {
        if (choice === 'companion_app') {
          localStorage.setItem(COMPANION_NUDGE_KEY, '1');
        }
        onNext();
      } else {
        alert(res.error || 'Failed to save');
      }
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink';

  return (
    <motion.div
      key="step-payments"
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
      <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">Payment verification</h1>
      <p className="text-xs text-ash mb-6 leading-relaxed">How should DullBot verify payments before confirming orders?</p>

      <div className="space-y-3 mb-6">
        {OPTIONS.map((opt) => {
          const isSelected = choice === opt.id;
          return (
            <div key={opt.id}>
              <button
                type="button"
                onClick={() => setChoice(opt.id)}
                className={`w-full p-4 rounded-cards border-2 text-left flex items-center gap-4 transition-all duration-200 ${
                  isSelected ? 'border-rust bg-apricot-wash/30 shadow-subtle' : 'border-dove/20 bg-white hover:border-ink/30 hover:bg-fog/60'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-rust' : opt.bg}`}>
                  <span className={isSelected ? 'text-white' : opt.color}>{opt.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-ink">{opt.title}</h3>
                  <p className="text-xs text-ash mt-0.5">{opt.desc}</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-rust shrink-0" />}
              </button>

              {/* Merchant API credentials — shown inline when selected */}
              <AnimatePresence>
                {isSelected && opt.id === 'merchant_api' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-4 bg-fog/60 rounded-inputs border border-dove/15 space-y-3">
                      <p className="text-[11px] text-ash leading-relaxed">Enter your bKash Merchant API credentials. You can also do this later from Settings.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink mb-1">App Key</label>
                          <input type="text" value={bkashAppKey} onChange={(e) => setBkashAppKey(e.target.value)} placeholder="bKash app key" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink mb-1">App Secret</label>
                          <input type="password" value={bkashAppSecret} onChange={(e) => setBkashAppSecret(e.target.value)} placeholder="bKash app secret" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink mb-1">Username</label>
                          <input type="text" value={bkashUsername} onChange={(e) => setBkashUsername(e.target.value)} placeholder="Merchant username" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-ink mb-1">Password</label>
                          <input type="password" value={bkashPassword} onChange={(e) => setBkashPassword(e.target.value)} placeholder="Merchant password" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isSelected && opt.id === 'companion_app' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-4 bg-blue-50 rounded-inputs border border-blue-100 space-y-2">
                      <p className="text-xs font-semibold text-blue-800">Download the DullBot Companion App</p>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        Install the app on your phone, tap &quot;Pair new shop&quot;, and scan the QR code from the Settings page after launch.
                        You can continue the setup now without waiting for pairing to complete.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <a href="/dashboard/settings" className="text-[11px] text-blue-700 font-semibold underline">
                          View pairing instructions after launch →
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!choice || loading}
        className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
      </button>
    </motion.div>
  );
}
