'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Smartphone, ArrowRight, ArrowLeft, X, Loader2, Check } from 'lucide-react';
import { saveOnboardingStep } from '../../dashboard/actions';

function MessengerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.45 5.513 3.722 7.216V22l3.376-1.854c.905.25 1.868.388 2.902.388 5.523 0 10-4.145 10-9.276S17.523 2 12 2zm1.08 12.336-2.584-2.756-5.044 2.756 5.548-5.888 2.646 2.756 4.98-2.756-5.546 5.888z" />
    </svg>
  );
}

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.94 9.94 0 0 0 1.332 4.985L2 22l5.166-1.335a9.96 9.96 0 0 0 4.846 1.258h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.039-5.176-2.927-7.062A9.92 9.92 0 0 0 12.012 2zm5.871 14.17c-.247.697-1.437 1.33-1.986 1.387-.52.054-1.185.078-3.391-.832-2.825-1.166-4.63-4.043-4.772-4.232-.14-.188-1.144-1.523-1.144-2.905 0-1.381.724-2.06.98-2.342.256-.282.56-.353.748-.353.187 0 .373.003.535.01.171.007.404-.065.632.483.235.564.796 1.942.866 2.083.07.142.117.307.023.494-.094.188-.141.306-.282.471-.14.165-.296.37-.423.498-.141.14-.288.293-.124.575.164.282.729 1.204 1.564 1.948 1.074.957 1.98 1.254 2.263 1.395.282.141.446.118.61-.07.165-.188.705-.823.892-1.106.188-.282.376-.235.633-.141.258.094 1.644.776 1.925.917.282.141.47.212.54.33.07.117.07.682-.177 1.379z" />
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

  const [waError, setWaError] = useState('');
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const [availablePages, setAvailablePages] = useState<Array<{ id: string; name: string; access_token: string }>>([]);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [selectingPage, setSelectingPage] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('messenger') === 'connected') setMessengerConnected(true);
    if (params.get('instagram') === 'connected') setInstagramConnected(true);
    if (params.get('error') === 'NoPagesFound') {
      setPageError('No Facebook Pages found. Ensure your Facebook account has Admin permissions on the Page you want to connect.');
    }

    if (params.get('select_page') === 'true' && params.get('pages')) {
      try {
        const raw = decodeURIComponent(params.get('pages')!);
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailablePages(parsed);
          setShowPagePicker(true);
        }
      } catch (e) {
        console.error('Failed to parse pages payload:', e);
      }
    }
  }, []);

  const handleSelectPage = async (page: { id: string; name: string; access_token: string }) => {
    setSelectingPage(true);
    try {
      const { selectPageMeta } = await import('../../dashboard/settings/actions');
      const res = await selectPageMeta(shop.id, page);
      if (res.success) {
        setMessengerConnected(true);
        if (res.instagramConnected) setInstagramConnected(true);
        setShowPagePicker(false);
      } else {
        setPageError(res.error || 'Failed to select Facebook Page');
      }
    } catch (e: any) {
      setPageError(e.message || 'Error selecting Facebook Page');
    }
    setSelectingPage(false);
  };

  const hasAnyChannelConnected = messengerConnected || instagramConnected || waConnected;

  const handleSaveWa = async () => {
    setWaError('');
    const cleanWaba = waWabaId.trim();
    const cleanPhone = waPhoneId.trim();
    const cleanToken = waToken.trim();

    if (cleanWaba && !/^\d{10,20}$/.test(cleanWaba)) {
      setWaError('WABA ID must contain numbers only (10-20 digits).');
      return;
    }
    if (!cleanPhone || !/^\d{10,20}$/.test(cleanPhone)) {
      setWaError('Phone Number ID must contain numbers only (10-20 digits).');
      return;
    }
    if (!cleanToken || cleanToken.length < 20 || /[^a-zA-Z0-9_-]/.test(cleanToken)) {
      setWaError('System User Access Token is invalid or contains unexpected characters.');
      return;
    }

    setWaSaving(true);
    try {
      const { saveWhatsAppConfig } = await import('../../dashboard/settings/actions');
      const res = await saveWhatsAppConfig(shop.id, { wabaId: cleanWaba, phoneId: cleanPhone, token: cleanToken });
      if (res.success) { setWaConnected(true); setShowWaModal(false); }
      else { setWaError(res.error || 'Failed to save WhatsApp config.'); }
    } catch (e: any) { setWaError(e.message || 'Error saving WhatsApp config.'); }
    setWaSaving(false);
  };

  const handleDisconnect = async (channelKey: 'messenger' | 'instagram' | 'whatsapp') => {
    if (!confirm(`Are you sure you want to disconnect ${channelKey === 'messenger' ? 'Facebook Messenger' : channelKey === 'instagram' ? 'Instagram' : 'WhatsApp'}?`)) return;
    setDisconnecting(channelKey);
    try {
      const actions = await import('../../dashboard/settings/actions');
      if (channelKey === 'messenger') {
        const res = await actions.disconnectFacebook(shop.id);
        if (res.success) setMessengerConnected(false);
      } else if (channelKey === 'instagram') {
        const res = await actions.disconnectInstagram(shop.id);
        if (res.success) setInstagramConnected(false);
      } else if (channelKey === 'whatsapp') {
        const res = await actions.disconnectWhatsApp(shop.id);
        if (res.success) setWaConnected(false);
      }
    } catch (e: any) { alert(e.message || 'Failed to disconnect'); }
    setDisconnecting(null);
  };

  const handleNext = async () => {
    if (!hasAnyChannelConnected) return;
    setAdvancing(true);
    if (!instagramConnected) localStorage.setItem(IG_NUDGE_KEY, '1');
    if (!waConnected) localStorage.setItem(WA_NUDGE_KEY, '1');
    await saveOnboardingStep(shop.id, 'context');
    onNext();
  };

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30';

  const channels = [
    { key: 'messenger' as const, icon: <MessengerIcon className="w-5 h-5 text-[#0084FF]" />, title: 'Facebook Messenger', subtitle: messengerConnected ? `Connected: ${shop.meta_page_name || 'Your Page'}` : 'Receive and respond to Page messages', required: false, connected: messengerConnected, href: `/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`, onClick: undefined as any },
    { key: 'instagram' as const, icon: <InstagramIcon className="w-5 h-5 text-[#E4405F]" />, title: 'Instagram DMs', subtitle: instagramConnected ? 'Instagram Business Account connected' : 'Connects via Facebook Login', required: false, connected: instagramConnected, href: `/api/auth/facebook/login?shopId=${shop.id}&source=onboarding_instagram`, onClick: undefined as any },
    { key: 'whatsapp' as const, icon: <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />, title: 'WhatsApp Business', subtitle: waConnected ? 'WhatsApp Cloud API connected' : 'Automate replies via WABA Cloud API', required: false, connected: waConnected, href: undefined as any, onClick: () => { setWaError(''); setShowWaModal(true); } },
  ];

  return (
    <motion.div key="step-channels" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      {/* Scrollable content with fade hint */}
      <div className="relative flex-1 min-h-0">
      <div className="h-full overflow-y-auto pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">Where do your customers reach you?</h1>
        <p className="text-sm text-white/60 mb-4 leading-relaxed">Connect at least one channel (Messenger, Instagram, or WhatsApp) to activate your AI agent.</p>
        
        {pageError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 leading-relaxed flex items-center justify-between">
            <span>{pageError}</span>
            <button onClick={() => setPageError('')} className="ml-2 text-white/50 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

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
                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/20"><Check className="w-3.5 h-3.5" /> Connected</div>
                  <button onClick={() => handleDisconnect(ch.key)} disabled={disconnecting === ch.key} className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-medium border border-red-500/30 transition-colors disabled:opacity-40">
                    {disconnecting === ch.key ? <Loader2 className="w-3 h-3 animate-spin text-red-300" /> : 'Disconnect'}
                  </button>
                </div>
              ) : ch.href ? (
                <a href={ch.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">Connect</a>
              ) : (
                <button onClick={ch.onClick} className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">Connect</button>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleNext} disabled={!hasAnyChannelConnected || advancing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {advancing ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {showWaModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="bg-[rgba(10,12,20,0.92)] backdrop-blur-[36px] saturate-[180%] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.75)] border border-white/20 w-full max-w-md p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-white">Connect WhatsApp Cloud API</h3>
                <button onClick={() => setShowWaModal(false)} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-white/60 mb-4 leading-relaxed">Requires a Meta Business Account and approved WhatsApp Business Account (WABA).</p>

              {waError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300">
                  {waError}
                </div>
              )}

              <div className="space-y-4">
                <div><label className="block text-xs font-semibold text-white/80 mb-1.5">WABA ID <span className="text-white/40 font-normal">(optional)</span></label><input type="text" value={waWabaId} onChange={(e) => setWaWabaId(e.target.value)} placeholder="e.g. 123456789012345" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-white/80 mb-1.5">Phone Number ID <span className="text-red-400">*</span></label><input type="text" value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="e.g. 987654321098765" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-white/80 mb-1.5">System User Access Token <span className="text-red-400">*</span></label><input type="password" value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="EAAG..." className={inputCls} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowWaModal(false)} className="flex-1 py-2.5 text-xs font-semibold text-white/70 bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition-colors">Skip for now</button>
                <button onClick={handleSaveWa} disabled={waSaving || !waPhoneId.trim() || !waToken.trim()} className="flex-1 py-2.5 text-xs font-semibold text-black bg-white rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                  {waSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Selection Modal */}
      <AnimatePresence>
        {showPagePicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="bg-[rgba(10,12,20,0.92)] backdrop-blur-[36px] saturate-[180%] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.75)] border border-white/20 w-full max-w-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-white">Select Facebook Page</h3>
                <button onClick={() => setShowPagePicker(false)} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-white/60 mb-5 leading-relaxed">Multiple Facebook Pages were found for your account. Select which Page DullBot should respond to:</p>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {availablePages.map((pg) => (
                  <div key={pg.id} className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#0084FF]/20 text-[#0084FF] flex items-center justify-center font-bold text-sm shrink-0">
                        <MessengerIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{pg.name}</div>
                        <div className="text-[11px] text-white/40">Page ID: {pg.id}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectPage(pg)}
                      disabled={selectingPage}
                      className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-40"
                    >
                      {selectingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : 'Select'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
                <button onClick={() => setShowPagePicker(false)} className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
