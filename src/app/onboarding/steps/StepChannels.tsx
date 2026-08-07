'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Loader2, Check, Info, RefreshCw } from 'lucide-react';
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

type PageOption = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_id: string | null;
};

type ConnectedPage = {
  meta_page_id: string;
  meta_page_name: string | null;
  instagram_business_id: string | null;
  is_primary: boolean;
};

interface Props { shop: any; onNext: () => void; onBack: () => void; }
const WA_NUDGE_KEY = 'dullbot_wa_nudge';

export default function StepChannels({ shop, onNext, onBack }: Props) {
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const parseWaRef = (refStr?: string | null) => {
    if (!refStr) return null;
    try { return JSON.parse(refStr); } catch (e) { return null; }
  };
  const parsedWa = parseWaRef(shop.prompt_cache_ref);

  const [waConnected, setWaConnected] = useState(!!parsedWa?.phoneId || !!shop.whatsapp_phone_number_id);

  const messengerConnected = connectedPages.length > 0;
  const instagramConnected = connectedPages.some(p => !!p.instagram_business_id);

  const [showWaModal, setShowWaModal] = useState(false);
  const [waWabaId, setWaWabaId] = useState(parsedWa?.wabaId || shop.whatsapp_business_account_id || '');
  const [waPhoneId, setWaPhoneId] = useState(parsedWa?.phoneId || shop.whatsapp_phone_number_id || '');
  const [waToken, setWaToken] = useState(parsedWa?.token || shop.whatsapp_access_token || '');
  const [waSaving, setWaSaving] = useState(false);
  const [waError, setWaError] = useState('');

  const [advancing, setAdvancing] = useState(false);
  const [disconnectingPageId, setDisconnectingPageId] = useState<string | null>(null);

  const [pageError, setPageError] = useState('');
  const [availablePages, setAvailablePages] = useState<PageOption[]>([]);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [savingPages, setSavingPages] = useState(false);

  const [showIgInfo, setShowIgInfo] = useState(false);
  const [igRefreshing, setIgRefreshing] = useState(false);
  const [igDiagnostic, setIgDiagnostic] = useState<string | null>(null);

  // Load connected pages from DB
  useEffect(() => {
    (async () => {
      try {
        const { getConnectedPages } = await import('../../dashboard/settings/actions');
        const pages = await getConnectedPages(shop.id);
        setConnectedPages(pages);
      } catch (e) {
        console.error('Failed to load connected pages:', e);
      } finally {
        setLoadingPages(false);
      }
    })();
  }, [shop.id]);

  // Handle URL params (OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'NoPagesFound') {
      setPageError('No Facebook Pages found. Make sure you are an Admin of the Page you want to connect.');
    }
    if (params.get('select_page') === 'true' && params.get('pages')) {
      try {
        const raw = decodeURIComponent(params.get('pages')!);
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailablePages(parsed);
          // Cache pages so + Add Page can re-open the picker without re-doing OAuth
          sessionStorage.setItem(`dullbot_pages_${shop.id}`, JSON.stringify(parsed));
          setSelectedPageIds(new Set()); // will be merged after connectedPages load
          setShowPagePicker(true);
        }
      } catch (e) {
        console.error('Failed to parse pages payload:', e);
      }
    }
    if (params.get('ig_permission_missing') === 'true') {
      setIgDiagnostic("Meta App Setting Required: Meta stripped 'instagram_basic' permission during login. Make sure your Facebook account is added as an Admin/Developer under App Roles in developers.facebook.com.");
    }
    // Single-page OAuth callback — re-load connected pages
    if (params.get('messenger') === 'connected') {
      (async () => {
        const { getConnectedPages } = await import('../../dashboard/settings/actions');
        const pages = await getConnectedPages(shop.id);
        setConnectedPages(pages);
        setLoadingPages(false);
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once connectedPages load, pre-check them in the picker if it's open
  useEffect(() => {
    if (showPagePicker && connectedPages.length > 0) {
      setSelectedPageIds(prev => {
        const next = new Set(prev);
        connectedPages.forEach(p => next.add(p.meta_page_id));
        return next;
      });
    }
  }, [showPagePicker, connectedPages]);

  // Open picker using cached pages, or fall back to OAuth
  const handleAddPage = () => {
    // Try in-memory state first, then sessionStorage cache
    let pages = availablePages;
    if (pages.length === 0) {
      try {
        const cached = sessionStorage.getItem(`dullbot_pages_${shop.id}`);
        if (cached) pages = JSON.parse(cached);
      } catch (_) {}
    }
    if (pages.length > 0) {
      setAvailablePages(pages);
      // Pre-check currently connected pages
      setSelectedPageIds(new Set(connectedPages.map(p => p.meta_page_id)));
      setShowPagePicker(true);
    } else {
      // No cached pages — fall back to OAuth (will repopulate cache on return)
      window.location.href = `/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`;
    }
  };

  const handleIgRefresh = async () => {
    setIgRefreshing(true);
    setIgDiagnostic(null);
    try {
      const { checkInstagramForPage } = await import('../../dashboard/settings/actions');
      const res = await checkInstagramForPage(shop.id);
      if (!res.success) {
        setIgDiagnostic(`Error: ${res.error}`);
        return;
      }
      const found = res.results?.filter((r: any) => r.instagramBusinessId);
      if (found && found.length > 0) {
        const { getConnectedPages } = await import('../../dashboard/settings/actions');
        const pages = await getConnectedPages(shop.id);
        setConnectedPages(pages);
        setIgDiagnostic(null);
      } else {
        const firstResult = res.results?.[0];
        const rawMsg = firstResult?.error
          ? `API error: ${firstResult.error}`
          : `No instagram_business_account returned. Raw: ${JSON.stringify(firstResult?.rawResponse)}`;
        setIgDiagnostic(rawMsg);
      }
    } catch (e: any) {
      setIgDiagnostic(`Exception: ${e.message}`);
    } finally {
      setIgRefreshing(false);
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const handleConnectSelected = async () => {
    if (selectedPageIds.size === 0) {
      setPageError('Select at least one Page to connect.');
      return;
    }
    setSavingPages(true);
    setPageError('');
    try {
      const selected = availablePages.filter(p => selectedPageIds.has(p.id));
      const { selectPagesMeta } = await import('../../dashboard/settings/actions');
      const res = await selectPagesMeta(shop.id, selected);
      if (res.success) {
        // Reload connected pages
        const { getConnectedPages } = await import('../../dashboard/settings/actions');
        const pages = await getConnectedPages(shop.id);
        setConnectedPages(pages);
        setShowPagePicker(false);
      } else {
        setPageError(res.error || 'Failed to connect pages');
      }
    } catch (e: any) {
      setPageError(e.message || 'Error connecting pages');
    }
    setSavingPages(false);
  };

  const handleDisconnectPage = async (metaPageId: string) => {
    if (!confirm('Disconnect this Facebook Page?')) return;
    setDisconnectingPageId(metaPageId);
    try {
      const { disconnectMetaPage } = await import('../../dashboard/settings/actions');
      const res = await disconnectMetaPage(shop.id, metaPageId);
      if (res.success) {
        setConnectedPages(prev => prev.filter(p => p.meta_page_id !== metaPageId));
      }
    } catch (e: any) {
      alert(e.message || 'Failed to disconnect page');
    }
    setDisconnectingPageId(null);
  };

  const handleInstagramClick = () => {
    if (messengerConnected && !instagramConnected) {
      setShowIgInfo(true);
    } else if (!messengerConnected) {
      window.location.href = `/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`;
    }
  };

  const hasAnyChannelConnected = messengerConnected || instagramConnected || waConnected;

  const handleSaveWa = async () => {
    setWaError('');
    const cleanWaba = waWabaId.trim();
    const cleanPhone = waPhoneId.trim();
    const cleanToken = waToken.trim();
    if (cleanWaba && !/^\d{10,20}$/.test(cleanWaba)) { setWaError('WABA ID must contain numbers only (10–20 digits).'); return; }
    if (!cleanPhone || !/^\d{10,20}$/.test(cleanPhone)) { setWaError('Phone Number ID must contain numbers only (10–20 digits).'); return; }
    if (!cleanToken || cleanToken.length < 20 || /[^a-zA-Z0-9_-]/.test(cleanToken)) { setWaError('System User Access Token is invalid.'); return; }
    setWaSaving(true);
    try {
      const { saveWhatsAppConfig } = await import('../../dashboard/settings/actions');
      const res = await saveWhatsAppConfig(shop.id, { wabaId: cleanWaba, phoneId: cleanPhone, token: cleanToken });
      if (res.success) { setWaConnected(true); setShowWaModal(false); }
      else setWaError(res.error || 'Failed to save.');
    } catch (e: any) { setWaError(e.message || 'Error'); }
    setWaSaving(false);
  };

  const handleNext = async () => {
    if (!hasAnyChannelConnected) return;
    setAdvancing(true);
    if (!waConnected) localStorage.setItem(WA_NUDGE_KEY, '1');
    await saveOnboardingStep(shop.id, 'context');
    onNext();
  };

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30';

  // Messenger subtitle
  const messengerSubtitle = loadingPages
    ? 'Loading...'
    : connectedPages.length === 0
      ? 'Receive and respond to Page messages'
      : connectedPages.length === 1
        ? `Page: ${connectedPages[0].meta_page_name || connectedPages[0].meta_page_id}`
        : `${connectedPages.length} Pages active`;

  return (
    <motion.div key="step-channels" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full">
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto pb-6 scroll-smooth">
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">Where do your customers reach you?</h1>
          <p className="text-sm text-white/60 mb-4 leading-relaxed">Connect at least one channel to activate your AI agent.</p>

          {pageError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 leading-relaxed flex items-start justify-between gap-2">
              <span>{pageError}</span>
              <button onClick={() => setPageError('')} className="text-white/50 hover:text-white shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {connectedPages.length === 0 && availablePages.length > 0 && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed flex items-center justify-between gap-3">
              <span><strong>Facebook Connected:</strong> Page selection required to finish setup.</span>
              <button onClick={handleAddPage} className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 font-semibold hover:bg-amber-500/30 shrink-0 transition-colors">Select Page(s) →</button>
            </div>
          )}

          <AnimatePresence>
            {showIgInfo && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-100 mb-1">Instagram isn&apos;t linked to your Facebook <em>Page</em></p>
                    <p className="text-amber-200/70 mb-1">Your Instagram may already be linked to your <em>personal</em> Facebook account — but that&apos;s different. DullBot needs Instagram linked directly to your <strong className="text-amber-200">Facebook Page</strong> ({connectedPages[0]?.meta_page_name || 'your Page'}).</p>
                    <p className="text-amber-200/60 mb-3">Go to your Page → <strong className="text-amber-200">Settings → Instagram → Connect account</strong>, then come back here.</p>
                    <div className="flex flex-wrap gap-2">
                      {connectedPages.length > 0 && (
                        <a
                          href={`https://www.facebook.com/${connectedPages[0].meta_page_id}/settings/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 font-semibold transition-colors text-[11px]"
                        >
                          <InstagramIcon className="w-3 h-3" />
                          Open {connectedPages[0].meta_page_name || 'Page'} Settings →
                        </a>
                      )}
                    </div>
                    <p className="text-amber-200/40 mt-2 text-[11px]">After linking on your Page, click <span className="text-amber-200/70 font-medium">+ Add Page</span> to reconnect.</p>
                  </div>
                  <button onClick={() => setShowIgInfo(false)} className="text-amber-400/60 hover:text-amber-200 shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* ─── Channel rows ──────────────────────────────────────────────────────── */}
          <div className="space-y-3">

            {/* Messenger */}
            <div className={`p-4 rounded-xl border transition-all ${messengerConnected ? 'border-white/25 bg-white/8' : 'border-white/10 bg-white/4'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${messengerConnected ? 'bg-white' : 'bg-white/10'}`} style={messengerConnected ? { color: '#0084FF' } : {}}>
                  <MessengerIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-white text-sm block">Facebook Messenger</span>
                  <p className="text-xs text-white/50 mt-0.5">{messengerSubtitle}</p>
                </div>
                {messengerConnected ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/12 text-white text-xs font-semibold border border-white/18">
                      <Check className="w-3.5 h-3.5" /> {connectedPages.length > 1 ? `${connectedPages.length} Pages` : 'Connected'}
                    </div>
                    <button onClick={handleAddPage} className="px-3 py-1.5 rounded-full bg-white/8 text-white/50 hover:bg-white/15 hover:text-white text-xs font-medium border border-white/12 transition-colors">
                      + Add Page
                    </button>
                  </div>
                ) : availablePages.length > 0 ? (
                  <button onClick={handleAddPage} className="inline-flex items-center px-4 py-2 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors shrink-0">
                    Finish Setup (Select Pages)
                  </button>
                ) : (
                  <a href={`/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`} className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">
                    Connect
                  </a>
                )}
              </div>

              {/* Connected pages list */}
              <AnimatePresence>
                {connectedPages.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-3 space-y-1.5">
                    {connectedPages.map((pg) => (
                      <div key={pg.meta_page_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/8">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-[#0084FF]/20 flex items-center justify-center text-[#0084FF] font-bold text-[10px] shrink-0">
                            {(pg.meta_page_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-white/80 font-medium truncate">{pg.meta_page_name || pg.meta_page_id}</span>
                          {pg.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/10 shrink-0">Primary</span>}
                          {pg.instagram_business_id && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#E4405F]/15 text-[#E4405F] border border-[#E4405F]/25 shrink-0">
                              <InstagramIcon className="w-2.5 h-2.5" /> IG
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDisconnectPage(pg.meta_page_id)}
                          disabled={disconnectingPageId === pg.meta_page_id}
                          className="text-red-400/60 hover:text-red-300 text-[11px] font-medium transition-colors disabled:opacity-40 shrink-0 ml-2"
                        >
                          {disconnectingPageId === pg.meta_page_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Instagram */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${instagramConnected ? 'border-white/25 bg-white/8' : 'border-white/10 bg-white/4'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${instagramConnected ? 'bg-white' : 'bg-white/10'}`} style={instagramConnected ? { color: '#E4405F' } : {}}>
                <InstagramIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white text-sm block">Instagram DMs</span>
                <p className="text-xs text-white/50 mt-0.5">
                  {instagramConnected ? 'Instagram Business Account connected' : messengerConnected ? 'No Instagram linked to your connected Pages' : 'Connect via your Facebook Page'}
                </p>
              </div>
              {instagramConnected ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/12 text-white text-xs font-semibold border border-white/18 shrink-0">
                  <Check className="w-3.5 h-3.5" /> Connected
                </div>
              ) : messengerConnected ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleIgRefresh}
                    disabled={igRefreshing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E4405F]/15 border border-[#E4405F]/30 text-[#E4405F] hover:bg-[#E4405F]/25 text-xs font-semibold transition-colors disabled:opacity-40"
                  >
                    {igRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {igRefreshing ? 'Checking…' : 'Refresh'}
                  </button>
                  <button
                    onClick={handleInstagramClick}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-white/60 hover:bg-white/15 border border-white/15 text-xs font-semibold transition-colors"
                  >
                    Learn more
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleInstagramClick}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0"
                >
                  Connect via Facebook
                </button>
              )}
            </div>
            {igDiagnostic && (
              <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-300/80 font-mono break-all leading-relaxed">
                {igDiagnostic}
              </div>
            )}

            {/* WhatsApp */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${waConnected ? 'border-white/25 bg-white/8' : 'border-white/10 bg-white/4'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${waConnected ? 'bg-white' : 'bg-white/10'}`} style={waConnected ? { color: '#25D366' } : {}}>
                <WhatsAppIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white text-sm block">WhatsApp Business</span>
                <p className="text-xs text-white/50 mt-0.5">{waConnected ? 'WhatsApp Cloud API connected' : 'Automate replies via WABA Cloud API'}</p>
              </div>
              {waConnected ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/12 text-white text-xs font-semibold border border-white/18 shrink-0">
                  <Check className="w-3.5 h-3.5" /> Connected
                </div>
              ) : (
                <button onClick={() => { setWaError(''); setShowWaModal(true); }} className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">
                  Connect
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
            Instagram DMs are auto-linked via your Facebook Page through Meta&apos;s API. Multiple Pages can be active simultaneously.
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleNext} disabled={!hasAnyChannelConnected || advancing} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {advancing ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>

      {/* ─── WhatsApp Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWaModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="bg-[rgba(10,12,20,0.93)] backdrop-blur-[40px] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.75)] border border-white/20 w-full max-w-md p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 flex items-center justify-center"><WhatsAppIcon className="w-4 h-4 text-[#25D366]" /></div>
                  <h3 className="font-bold text-base">Connect WhatsApp Business</h3>
                </div>
                <button onClick={() => setShowWaModal(false)} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-white/50 mb-3 leading-relaxed">Requires a Meta Business Account with an approved WhatsApp Business Account (WABA). Not set up yet? Start here:</p>
              <div className="flex flex-wrap gap-2 mb-5">
                <a
                  href="https://developers.facebook.com/apps/1012936751146812/whatsapp-business/api-setup/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 text-[11px] font-semibold transition-colors"
                >
                  <WhatsAppIcon className="w-3 h-3" /> Get WhatsApp API Keys →
                </a>
                <a
                  href="https://business.facebook.com/latest/settings/whatsapp_account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/15 text-white/50 hover:text-white/70 hover:border-white/25 text-[11px] font-medium transition-colors"
                >
                  Meta Business Suite →
                </a>
              </div>
              {waError && <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300">{waError}</div>}
              <div className="space-y-4">
                <div><label className="block text-xs font-semibold text-white/70 mb-1.5">WABA ID <span className="text-white/35 font-normal">(optional)</span></label><input type="text" value={waWabaId} onChange={e => setWaWabaId(e.target.value)} placeholder="e.g. 123456789012345" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-white/70 mb-1.5">Phone Number ID <span className="text-red-400">*</span></label><input type="text" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="e.g. 987654321098765" className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-white/70 mb-1.5">System User Access Token <span className="text-red-400">*</span></label><input type="password" value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="EAAG..." className={inputCls} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowWaModal(false)} className="flex-1 py-2.5 text-xs font-semibold text-white/60 bg-white/8 border border-white/12 rounded-xl hover:bg-white/12 transition-colors">Skip for now</button>
                <button onClick={handleSaveWa} disabled={waSaving || !waPhoneId.trim() || !waToken.trim()} className="flex-1 py-2.5 text-xs font-semibold text-black bg-white rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                  {waSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Page Picker Modal (checkbox multi-select) ──────────────────────────── */}
      <AnimatePresence>
        {showPagePicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="bg-[rgba(10,12,20,0.93)] backdrop-blur-[40px] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.75)] border border-white/20 w-full max-w-lg p-6 text-white">

              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">Choose your Facebook Pages</h3>
                  <p className="text-xs text-white/50 leading-relaxed max-w-sm">Select all Pages DullBot should manage. You can run multiple Pages simultaneously — useful if one ever gets restricted.</p>
                </div>
                <button onClick={() => setShowPagePicker(false)} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-3"><X className="w-4 h-4" /></button>
              </div>

              {pageError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300">{pageError}</div>
              )}

              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-0.5">
                {availablePages.map((pg) => {
                  const isSelected = selectedPageIds.has(pg.id);
                  return (
                    <button
                      key={pg.id}
                      onClick={() => togglePageSelection(pg.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-white/30 bg-white/10 ring-1 ring-white/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-white border-white' : 'border-white/30'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </div>

                      {/* Page avatar */}
                      <div className="w-9 h-9 rounded-xl bg-[#0084FF]/20 text-[#0084FF] flex items-center justify-center font-bold text-sm shrink-0">
                        {pg.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{pg.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-white/35">ID: {pg.id}</span>
                          {pg.instagram_business_id ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#E4405F]/15 border border-[#E4405F]/30 text-[10px] font-semibold text-[#E4405F]">
                              <InstagramIcon className="w-2.5 h-2.5" /> Instagram linked
                            </span>
                          ) : (
                            <a
                              href={`https://www.facebook.com/${pg.id}/settings/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300/70 hover:text-amber-200 hover:border-amber-500/40 transition-colors"
                            >
                              No Instagram · Link via Page Settings →
                            </a>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    {selectedPageIds.size === 0 ? 'Select at least one Page' : `${selectedPageIds.size} Page${selectedPageIds.size > 1 ? 's' : ''} selected`}
                  </p>
                  <a
                    href={`/api/auth/facebook/login?shopId=${shop.id}&source=onboarding`}
                    onClick={() => { try { sessionStorage.removeItem(`dullbot_pages_${shop.id}`); } catch (_) {} }}
                    className="text-[11px] text-white/30 hover:text-white/70 underline underline-offset-2 transition-colors"
                  >
                    Re-connect Facebook
                  </a>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setShowPagePicker(false)} className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors">Cancel</button>
                  <button
                    onClick={handleConnectSelected}
                    disabled={savingPages || selectedPageIds.size === 0}
                    className="px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingPages ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : `Connect${selectedPageIds.size > 0 ? ` (${selectedPageIds.size})` : ''}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
