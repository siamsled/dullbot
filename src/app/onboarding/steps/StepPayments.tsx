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

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-800 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400';

  return (
    <motion.div key="step-payments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">How would you like to accept payments?</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">Choose how DullBot verifies payments before confirming orders.</p>
        <div className="space-y-3">
          {OPTIONS.map((opt) => {
            const isSelected = choice === opt.id;
            return (
              <div key={opt.id}>
                <button type="button" onClick={() => setChoice(opt.id)} className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all duration-200 ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{opt.icon}</div>
                  <div className="flex-1"><h3 className="font-semibold text-sm text-slate-900">{opt.title}</h3><p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p></div>
                  {isSelected && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                </button>
                <AnimatePresence>
                  {isSelected && opt.id === 'merchant_api' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <p className="text-xs text-slate-500">Enter your bKash Merchant API credentials. You can also do this later from Settings.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-semibold text-slate-700 mb-1">bKash API Key</label><input type="text" value={bkashAppKey} onChange={(e) => setBkashAppKey(e.target.value)} placeholder="API key" className={inputCls} /></div>
                          <div><label className="block text-xs font-semibold text-slate-700 mb-1">API Secret</label><input type="password" value={bkashAppSecret} onChange={(e) => setBkashAppSecret(e.target.value)} placeholder="API secret" className={inputCls} /></div>
                          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Username</label><input type="text" value={bkashUsername} onChange={(e) => setBkashUsername(e.target.value)} placeholder="Username" className={inputCls} /></div>
                          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Password</label><input type="password" value={bkashPassword} onChange={(e) => setBkashPassword(e.target.value)} placeholder="Password" className={inputCls} /></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'companion_app' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                        <p className="text-sm text-blue-800">Install the DullBot companion Android app and enter this pairing code:</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-3 flex-1 justify-center">
                            {PAIRING_CODE.split(' ').map((digit, i) => <span key={i} className="text-2xl font-bold text-blue-700 font-mono">{digit}</span>)}
                          </div>
                          <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"><Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'skip' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200"><p className="text-sm text-slate-500">No problem — orders default to Cash on Delivery. You can wire up a gateway later from your dashboard.</p></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={!choice || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
