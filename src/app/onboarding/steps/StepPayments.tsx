'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, CreditCard, Smartphone, Package, Check, Copy, ShieldCheck, AlertCircle } from 'lucide-react';
import { savePaymentChoice, testBkashConnection } from '../../dashboard/actions';

const COMPANION_NUDGE_KEY = 'dullbot_companion_nudge';
const PAIRING_CODE = Math.floor(100000 + Math.random() * 900000).toString().split('').join(' ');

function BkashBadge({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center font-bold font-sans text-[10px] bg-[#E2136E] text-white rounded-md leading-none ${className}`}>
      bK
    </span>
  );
}

interface Props { shop: any; onNext: () => void; onBack: () => void; }

export default function StepPayments({ shop, onNext, onBack }: Props) {
  const [choice, setChoice] = useState<'merchant_api' | 'companion_app' | 'skip' | null>(
    shop.payment_verification_method === 'merchant_api' ? 'merchant_api' : shop.payment_verification_method === 'notification_app' ? 'companion_app' : null
  );

  const initialBkashConfig = shop.bkashConfig || {};
  const [bkashNumber, setBkashNumber] = useState(shop.bkash_number || '');
  const [bkashAppKey, setBkashAppKey] = useState(initialBkashConfig.app_key || '');
  const [bkashAppSecret, setBkashAppSecret] = useState(initialBkashConfig.app_secret || '');
  const [bkashUsername, setBkashUsername] = useState(initialBkashConfig.username || '');
  const [bkashPassword, setBkashPassword] = useState(initialBkashConfig.password || '');
  const [bkashSandbox, setBkashSandbox] = useState<boolean>(initialBkashConfig.sandbox ?? false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingBkash, setTestingBkash] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const OPTIONS = [
    { id: 'merchant_api' as const, icon: <BkashBadge className="w-5 h-5 text-xs font-black" />, title: 'bKash Merchant API', desc: 'Tokenized Checkout v1.2.0 API' },
    { id: 'companion_app' as const, icon: <Smartphone className="w-4.5 h-4.5" />, title: 'Companion App', desc: 'Android notification listener' },
    { id: 'skip' as const, icon: <Package className="w-4.5 h-4.5" />, title: 'Cash on Delivery', desc: 'Skip payment setup for now' },
  ];

  const handleCopy = () => { navigator.clipboard.writeText(PAIRING_CODE.replace(/ /g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleTestBkash = async () => {
    setTestingBkash(true);
    setTestResult(null);
    try {
      const res = await testBkashConnection({
        app_key: bkashAppKey.trim(),
        app_secret: bkashAppSecret.trim(),
        username: bkashUsername.trim(),
        password: bkashPassword.trim(),
        sandbox: bkashSandbox,
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || 'Verification error' });
    }
    setTestingBkash(false);
  };

  const handleContinue = async () => {
    if (!choice) return;
    setLoading(true);
    try {
      const bkashConfig = choice === 'merchant_api' ? {
        app_key: bkashAppKey.trim(),
        app_secret: bkashAppSecret.trim(),
        username: bkashUsername.trim(),
        password: bkashPassword.trim(),
        sandbox: bkashSandbox,
      } : undefined;

      const res = await savePaymentChoice(shop.id, choice, bkashConfig, bkashNumber.trim());
      if (res.success) {
        if (choice === 'companion_app') localStorage.setItem(COMPANION_NUDGE_KEY, '1');
        onNext();
      } else {
        alert(res.error || 'Failed to save payment choice');
      }
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-xs focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-all duration-200 ease-out placeholder:text-white/30';

  return (
    <motion.div key="step-payments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-2 pr-0.5 scroll-smooth">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">How would you like to accept payments?</h1>
        <p className="text-sm text-white/60 mb-3.5 leading-relaxed">Equip DullBot to verify incoming bKash payments before confirming orders.</p>
        <div className="space-y-2.5">
          {OPTIONS.map((opt) => {
            const isSelected = choice === opt.id;
            return (
              <div key={opt.id}>
                <button
                  type="button"
                  onClick={() => setChoice(opt.id)}
                  className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    isSelected
                      ? 'border-white/30 bg-white/12 shadow-md shadow-black/40'
                      : 'border-white/8 bg-white/4 hover:border-white/18 hover:bg-white/8'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${isSelected ? 'bg-white text-black' : 'bg-white/8 text-white/70'}`}>{opt.icon}</div>
                  <div className="flex-1"><h3 className="font-semibold text-sm text-white flex items-center gap-1.5">{opt.title}</h3><p className="text-xs text-white/50 mt-0.5">{opt.desc}</p></div>
                  {isSelected && <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /></div>}
                </button>
                <AnimatePresence>
                  {isSelected && opt.id === 'merchant_api' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-3.5 sm:p-4 bg-white/4 rounded-2xl border border-white/8 space-y-3">
                        
                        {/* Header & Mode Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-2.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <BkashBadge className="w-4 h-4" />
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">bKash Checkout v1.2 API</h4>
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5">Enter your bKash merchant portal credentials to verify payments.</p>
                          </div>
                          
                          {/* Live vs Sandbox toggle */}
                          <div className="flex items-center gap-1 bg-white/6 p-0.5 rounded-lg border border-white/10 shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setBkashSandbox(false)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${!bkashSandbox ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                            >
                              Live Mode
                            </button>
                            <button
                              type="button"
                              onClick={() => setBkashSandbox(true)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${bkashSandbox ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                            >
                              Sandbox
                            </button>
                          </div>
                        </div>

                        {/* bKash Merchant Number */}
                        <div>
                          <label className="block text-xs font-semibold text-white/80 mb-1">
                            bKash Merchant Number <span className="text-white/40 font-normal">(for customer payments)</span>
                          </label>
                          <input
                            type="text"
                            value={bkashNumber}
                            onChange={(e) => setBkashNumber(e.target.value)}
                            placeholder="e.g. 01712345678"
                            className={inputCls}
                          />
                        </div>

                        {/* API Credentials Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">bKash App Key</label>
                            <input type="text" value={bkashAppKey} onChange={(e) => setBkashAppKey(e.target.value)} placeholder="App Key" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">App Secret</label>
                            <input type="password" value={bkashAppSecret} onChange={(e) => setBkashAppSecret(e.target.value)} placeholder="App Secret" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">API Username</label>
                            <input type="text" value={bkashUsername} onChange={(e) => setBkashUsername(e.target.value)} placeholder="Username" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">API Password</label>
                            <input type="password" value={bkashPassword} onChange={(e) => setBkashPassword(e.target.value)} placeholder="Password" className={inputCls} />
                          </div>
                        </div>

                        {/* Connection Test Action */}
                        <div className="pt-1 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={handleTestBkash}
                            disabled={testingBkash || !bkashAppKey.trim() || !bkashUsername.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white/80 hover:text-white text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {testingBkash ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />}
                            {testingBkash ? 'Testing API...' : 'Test bKash Connection'}
                          </button>

                          {testResult && (
                            <div className={`text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                              testResult.success ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {testResult.success ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-rose-400" />}
                              <span className="truncate max-w-[200px]">{testResult.message || testResult.error}</span>
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'companion_app' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 bg-white/6 rounded-2xl border border-white/12 space-y-2.5">
                        <p className="text-xs sm:text-sm text-white/90">Install the DullBot companion Android app and enter this pairing code:</p>
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-xl px-3 py-2 flex-1 justify-center shadow-inner">
                            {PAIRING_CODE.split(' ').map((digit, i) => <span key={i} className="text-xl font-bold text-white font-mono">{digit}</span>)}
                          </div>
                          <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 active:scale-[0.98] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"><Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'skip' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-3.5 bg-white/4 rounded-2xl border border-white/8"><p className="text-xs text-white/50 leading-relaxed">No problem — orders default to Cash on Delivery. You can wire up a gateway later from your dashboard.</p></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-2 pb-0.5 shrink-0 border-t border-white/8 mt-1.5">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white active:scale-[0.98] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={!choice || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
