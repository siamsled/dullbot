'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Smartphone, Package, Check, Copy, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { savePaymentChoice, testBkashConnection, getPairingCodeAction, checkCompanionDeviceStatusAction } from '../../dashboard/actions';

const COMPANION_NUDGE_KEY = 'dullbot_companion_nudge';

export function BkashLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 48L68 8L48 92L30 58L12 48Z" fill="#E2136E" />
      <path d="M68 8L92 48L48 92L68 8Z" fill="#AD1457" />
      <path d="M68 8L30 58L48 92L68 8Z" fill="#C2185B" />
      <path d="M68 8L40 32L12 48L68 8Z" fill="#F06292" />
    </svg>
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
  const [pairingCode, setPairingCode] = useState<string>('718087');
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const [pairedDeviceId, setPairedDeviceId] = useState<string | null>(null);
  const [userHasManuallyChosen, setUserHasManuallyChosen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    // Initial pairing code fetch
    (async () => {
      try {
        const res = await getPairingCodeAction(shop.id);
        if (isMounted && res.success && res.code) {
          setPairingCode(res.code);
        }
      } catch (e) {}
    })();

    // Poll for companion device pairing status every 2 seconds
    const checkStatus = async () => {
      try {
        const status = await checkCompanionDeviceStatusAction(shop.id);
        if (isMounted) {
          if (status.isPaired) {
            setPairedDeviceName(status.deviceName || 'Android Companion Device');
            setPairedDeviceId(status.deviceId || null);
            if (!userHasManuallyChosen) {
              setChoice(prev => prev || 'companion_app');
            }
          } else {
            setPairedDeviceName(null);
            setPairedDeviceId(null);
          }
        }
      } catch (e) {}
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [shop.id, userHasManuallyChosen]);

  const OPTIONS = [
    { id: 'merchant_api' as const, icon: <BkashLogo className="w-6 h-6 shrink-0" />, title: 'bKash Merchant API', desc: 'Tokenized Checkout v1.2.0 API' },
    { id: 'companion_app' as const, icon: <Smartphone className="w-5 h-5" />, title: 'Companion App', desc: 'Android notification listener' },
    { id: 'skip' as const, icon: <Package className="w-5 h-5" />, title: 'Cash on Delivery', desc: 'Skip payment setup for now' },
  ];

  const handleCopy = () => { navigator.clipboard.writeText(pairingCode.replace(/ /g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleContinue = async () => {
    if (!choice) return;
    setLoading(true);
    setApiError(null);

    try {
      if (choice === 'merchant_api') {
        const appKey = bkashAppKey.trim();
        const appSecret = bkashAppSecret.trim();
        const username = bkashUsername.trim();
        const password = bkashPassword.trim();
        const number = bkashNumber.trim();

        if (!number || !appKey || !appSecret || !username || !password) {
          setApiError('Please fill in your bKash merchant number and all API credentials.');
          setLoading(false);
          return;
        }

        // Background bKash API connection validation
        const testRes = await testBkashConnection({
          app_key: appKey,
          app_secret: appSecret,
          username,
          password,
          sandbox: bkashSandbox,
        });

        if (!testRes.success) {
          setApiError(testRes.error || 'Invalid bKash API credentials. Please check your Key, Secret, Username, and Password.');
          setLoading(false);
          return;
        }

        const bkashConfig = {
          app_key: appKey,
          app_secret: appSecret,
          username,
          password,
          sandbox: bkashSandbox,
        };

        const res = await savePaymentChoice(shop.id, choice, bkashConfig, number);
        if (res.success) {
          onNext();
        } else {
          setApiError(res.error || 'Failed to save bKash configuration.');
        }
      } else {
        const res = await savePaymentChoice(shop.id, choice);
        if (res.success) {
          if (choice === 'companion_app') localStorage.setItem(COMPANION_NUDGE_KEY, '1');
          onNext();
        } else {
          setApiError(res.error || 'Failed to save payment choice.');
        }
      }
    } catch (e: any) {
      setApiError(e.message || 'An unexpected error occurred while verifying credentials.');
    }
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
                  onClick={() => {
                    setUserHasManuallyChosen(true);
                    setChoice(opt.id);
                    setApiError(null);
                  }}
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
                              <BkashLogo className="w-4 h-4 shrink-0" />
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">bKash Checkout v1.2 API</h4>
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5">Enter your bKash merchant portal credentials to verify payments.</p>
                          </div>
                          
                          {/* Live vs Sandbox toggle */}
                          <div className="flex items-center gap-1 bg-white/6 p-0.5 rounded-lg border border-white/10 shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => { setBkashSandbox(false); setApiError(null); }}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${!bkashSandbox ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                            >
                              Live Mode
                            </button>
                            <button
                              type="button"
                              onClick={() => { setBkashSandbox(true); setApiError(null); }}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${bkashSandbox ? 'bg-[#E2136E] text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
                            >
                              Sandbox
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-white/80 mb-1">bKash Merchant / Agent Number</label>
                            <input type="text" value={bkashNumber} onChange={(e) => { setBkashNumber(e.target.value); setApiError(null); }} placeholder="e.g. 01700000000" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">App Key</label>
                            <input type="text" value={bkashAppKey} onChange={(e) => { setBkashAppKey(e.target.value); setApiError(null); }} placeholder="App Key" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">App Secret</label>
                            <input type="password" value={bkashAppSecret} onChange={(e) => { setBkashAppSecret(e.target.value); setApiError(null); }} placeholder="App Secret" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">API Username</label>
                            <input type="text" value={bkashUsername} onChange={(e) => { setBkashUsername(e.target.value); setApiError(null); }} placeholder="Username" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-white/80 mb-1">API Password</label>
                            <input type="password" value={bkashPassword} onChange={(e) => { setBkashPassword(e.target.value); setApiError(null); }} placeholder="Password" className={inputCls} />
                          </div>
                        </div>

                        {/* Inline Error Notification Banner */}
                        {apiError && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
                          >
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="leading-normal">{apiError}</span>
                          </motion.div>
                        )}

                      </div>
                    </motion.div>
                  )}
                  {isSelected && opt.id === 'companion_app' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-visible">
                      <div className="mt-3">
                        <AnimatePresence mode="wait">
                          {!pairedDeviceName ? (
                            <motion.div
                              key="unpaired-qr-card"
                              initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, scale: 0.94, filter: 'blur(8px)', transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                              className="p-4 bg-white/8 rounded-2xl border border-white/15 space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* QR Code */}
                                <div className="p-3 bg-white rounded-2xl shadow-lg shrink-0 flex flex-col items-center justify-center min-w-[124px] min-h-[124px]">
                                  {mounted ? (
                                    <QRCodeSVG
                                      value={JSON.stringify({
                                        url: typeof window !== 'undefined' ? window.location.origin : 'https://dullbot.vercel.app',
                                        code: pairingCode,
                                        shop_id: shop.id,
                                        shop_name: shop.name || 'DullBot Shop'
                                      })}
                                      size={108}
                                      level="M"
                                      bgColor="#FFFFFF"
                                      fgColor="#000000"
                                      includeMargin={false}
                                    />
                                  ) : (
                                    <div className="w-[108px] h-[108px] bg-neutral-100 rounded flex items-center justify-center text-neutral-400">
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold text-neutral-900 mt-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <QrCode className="w-3 h-3 text-neutral-900" /> Scan in App
                                  </span>
                                </div>

                                {/* 6-Digit Code */}
                                <div className="flex-1 space-y-2 text-left w-full sm:w-auto">
                                  <p className="text-xs text-white/90 font-medium leading-relaxed">
                                    Scan this QR code with the DullBot Companion App camera, or enter the 6-digit pairing code:
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 flex-1 justify-center shadow-inner tracking-[0.2em]">
                                      {pairingCode.split('').map((digit, i) => (
                                        <span key={i} className="text-xl font-bold text-white font-mono">{digit}</span>
                                      ))}
                                    </div>
                                    <button
                                      onClick={handleCopy}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 active:scale-[0.98] transition-all shrink-0"
                                    >
                                      <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="paired-connected-card"
                              initial={{ opacity: 0, scale: 0.94, y: 10, filter: 'blur(8px)' }}
                              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
                              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-emerald-600/10 border border-emerald-500/35 text-emerald-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="relative flex items-center justify-center shrink-0">
                                  <span className="absolute inline-flex h-10 w-10 rounded-full bg-emerald-400/30 animate-ping" />
                                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-lg font-bold">
                                    <Smartphone className="w-5 h-5 text-black" />
                                  </div>
                                </div>
                                <div className="text-left space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-serif font-bold text-sm text-white truncate">{pairedDeviceName}</p>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-widest">
                                      • Live Relay Active
                                    </span>
                                  </div>
                                  <p className="text-xs text-emerald-200/80">Encrypted MFS sync connected. Automatically verifying bKash &amp; Nagad payments.</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (pairedDeviceId) {
                                    const { revokeCompanionDeviceAction } = await import('../../dashboard/actions');
                                    await revokeCompanionDeviceAction(shop.id, pairedDeviceId);
                                  }
                                  setPairedDeviceName(null);
                                  setPairedDeviceId(null);
                                  setUserHasManuallyChosen(true);
                                  setChoice(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/25 hover:text-rose-200 text-white/80 border border-white/20 text-xs font-semibold transition-all shrink-0 active:scale-[0.98]"
                              >
                                Unpair Device
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
      <div className="flex items-center justify-between pt-3 pb-2 shrink-0 border-t border-white/8 mt-auto z-20">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white active:scale-[0.98] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-1"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={!choice || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
