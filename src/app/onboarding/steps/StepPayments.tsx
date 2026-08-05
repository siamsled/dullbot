'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, CreditCard, Smartphone, Package, Check, Copy } from 'lucide-react';
import { savePaymentChoice } from '../../dashboard/actions';

const COMPANION_NUDGE_KEY = 'dullbot_companion_nudge';
const PAIRING_CODE = Math.floor(100000 + Math.random() * 900000).toString().split('').join(' ');

interface Props { shop: any; onNext: () => void; onBack: () => void; }

export default function StepPayments({ shop, onNext, onBack }: Props) {
  const [choice, setChoice] = useState<'merchant_api' | 'companion_app' | 'skip' | null>(
    shop.payment_verification_method === 'merchant_api' ? 'merchant_api' : shop.payment_verification_method === 'notification_app' ? 'companion_app' : null
  );
  const [bkashAppKey, setBkashAppKey] = useState('');
  const [bkashAppSecret, setBkashAppSecret] = useState('');
  const [bkashUsername, setBkashUsername] = useState('');
  const [bkashPassword, setBkashPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const OPTIONS = [
    { id: 'merchant_api' as const, icon: <CreditCard className="w-5 h-5" />, title: 'Merchant API', desc: 'bKash / gateway credentials' },
    { id: 'companion_app' as const, icon: <Smartphone className="w-5 h-5" />, title: 'Companion App', desc: 'Android notification listener' },
    { id: 'skip' as const, icon: <Package className="w-5 h-5" />, title: 'Cash on Delivery', desc: 'Skip payment setup' },
  ];

  const handleCopy = () => { navigator.clipboard.writeText(PAIRING_CODE.replace(/ /g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleContinue = async () => {
    if (!choice) return;
    setLoading(true);
    try {
      const bkashConfig = choice === 'merchant_api' ? { app_key: bkashAppKey, app_secret: bkashAppSecret, username: bkashUsername, password: bkashPassword, sandbox: false } : undefined;
      const res = await savePaymentChoice(shop.id, choice, bkashConfig);
      if (res.success) { if (choice === 'companion_app') localStorage.setItem(COMPANION_NUDGE_KEY, '1'); onNext(); }
      else { alert(res.error || 'Failed to save'); }
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30';

  return (
    <motion.div key="step-payments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">How would you like to accept payments?</h1>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">Choose how DullBot verifies payments before confirming orders.</p>
        <div className="space-y-3">
          {OPTIONS.map((opt) => {
            const isSelected = choice === opt.id;
            return (
              <div key={opt.id}>
                <button type="button" onClick={() => setChoice(opt.id)} className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all duration-200 ${isSelected ? 'border-white bg-white/15 shadow-lg shadow-white/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>{opt.icon}</div>
                  <div className="flex-1"><h3 className="font-semibold text-sm text-white">{opt.title}</h3><p className="text-xs text-white/60 mt-0.5">{opt.desc}</p></div>
                  {isSelected && <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-black" /></div>}
                </button>
                <AnimatePresence>
                  {isSelected && opt.id === 'merchant_api' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                        <p className="text-xs text-white/60">Enter your bKash Merchant API credentials. You can also do this later from Settings.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-semibold text-white/80 mb-1">bKash API Key</label><input type="text" value={bkashAppKey} onChange={(e) => setBkashAppKey(e.target.value)} placeholder="API key" className={inputCls} /></div>
                          <div><label className="block text-xs font-semibold text-white/80 mb-1">API Secret</label><input type="password" value={bkashAppSecret} onChange={(e) => setBkashAppSecret(e.target.value)} placeholder="API secret" className={inputCls} /></div>
                          <div><label className="block text-xs font-semibold text-white/80 mb-1">Username</label><input type="text" value={bkashUsername} onChange={(e) => setBkashUsername(e.target.value)} placeholder="Username" className={inputCls} /></div>
                          <div><label className="block text-xs font-semibold text-white/80 mb-1">Password</label><input type="password" value={bkashPassword} onChange={(e) => setBkashPassword(e.target.value)} placeholder="Password" className={inputCls} /></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'companion_app' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-white/10 rounded-xl border border-white/20 space-y-3">
                        <p className="text-sm text-white/90">Install the DullBot companion Android app and enter this pairing code:</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex-1 justify-center">
                            {PAIRING_CODE.split(' ').map((digit, i) => <span key={i} className="text-2xl font-bold text-white font-mono">{digit}</span>)}
                          </div>
                          <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors"><Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'skip' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-sm text-white/60">No problem — orders default to Cash on Delivery. You can wire up a gateway later from your dashboard.</p></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={!choice || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
