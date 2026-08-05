'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Smartphone, ArrowRight, ArrowLeft, X, Loader2, Check } from 'lucide-react';
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

interface Props { shop: any; onNext: () => void; onBack: () => void; }
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('messenger') === 'connected') setMessengerConnected(true);
    if (params.get('instagram') === 'connected') setInstagramConnected(true);
  }, []);

  const handleSaveWa = async () => {
    setWaSaving(true);
    try {
      const res = await (await import('../../dashboard/settings/actions')).saveWhatsAppConfig(shop.id, { wabaId: waWabaId.trim(), phoneId: waPhoneId.trim(), token: waToken.trim() });
      if (res.success) { setWaConnected(true); setShowWaModal(false); }
    } catch (e) { /* swallow */ }
    setWaSaving(false);
  };

  const handleNext = async () => {
    setAdvancing(true);
    if (!instagramConnected) localStorage.setItem(IG_NUDGE_KEY, '1');
    if (!waConnected) localStorage.setItem(WA_NUDGE_KEY, '1');
    await saveOnboardingStep(shop.id, 'context');
    onNext();
  };

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30';

  const channels = [
    { icon: <Globe className="w-5 h-5" />, title: 'Facebook Messenger', subtitle: messengerConnected ? `Connected: ${shop.meta_page_name || 'Your Page'}` : 'Receive and respond to Page messages', required: true, connected: messengerConnected, href: `/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`, onClick: undefined as any },
    { icon: <InstagramIcon className="w-5 h-5" />, title: 'Instagram DMs', subtitle: instagramConnected ? 'Instagram Business Account connected' : 'Connects via Facebook Login', required: false, connected: instagramConnected, href: `/api/auth/facebook/login?shopId=${shop.id}&source=onboarding_instagram`, onClick: undefined as any },
    { icon: <Smartphone className="w-5 h-5" />, title: 'WhatsApp Business', subtitle: waConnected ? 'WhatsApp Cloud API connected' : 'Automate replies via WABA Cloud API', required: false, connected: waConnected, href: undefined as any, onClick: () => setShowWaModal(true) },
  ];

  return (
    <motion.div key="step-channels" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content with fade hint */}
      <div className="relative flex-1 min-h-0">
      <div className="h-full overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">Where do your customers reach you?</h1>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">Connect Messenger to activate your AI agent. Instagram and WhatsApp can be added now or later.</p>
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.title} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${ch.connected ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ch.connected ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>{ch.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{ch.title}</span>
                  {ch.required && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white/90 uppercase tracking-wide border border-white/20">Required</span>}
                </div>
                <p className="text-xs text-white/60 mt-0.5">{ch.subtitle}</p>
              </div>
              {ch.connected ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold shrink-0 border border-white/20"><Check className="w-3.5 h-3.5" /> Connected</div>
              ) : ch.href ? (
                <a href={ch.href} className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">Connect</a>
              ) : (
                <button onClick={ch.onClick} className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">Connect</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[rgba(10,12,20,0.85)] to-transparent" />
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleNext} disabled={!messengerConnected || advancing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {advancing ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {showWaModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base text-slate-900">Connect WhatsApp Cloud API</h3>
                <button onClick={() => setShowWaModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">Requires a Meta Business Account and approved WhatsApp Business Account (WABA).</p>
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">WABA ID</label><input type="text" value={waWabaId} onChange={(e) => setWaWabaId(e.target.value)} placeholder="e.g. 123456789012345" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number ID</label><input type="text" value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="e.g. 987654321098765" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1.5">System User Access Token</label><input type="password" value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="Your permanent system user token" className={inputCls} /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowWaModal(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Skip for now</button>
                <button onClick={handleSaveWa} disabled={waSaving || !waPhoneId.trim() || !waToken.trim()} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
