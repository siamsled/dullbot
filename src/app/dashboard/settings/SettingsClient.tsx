'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Settings, MessageCircle, Link2, ShieldCheck, CreditCard,
  ChevronRight, Lock, Globe, Smartphone, AtSign,
  MessageSquare, Check, Copy, ChevronDown, Pencil, Sparkles,
  BookOpen, Palette, Truck,
} from 'lucide-react';
import { disconnectFacebook, saveSettings, saveWidgetEnabled, saveWhatsAppConfig } from './actions';
import { saveOnboardingProfileAndTone } from '../actions';

/* ─── constants ─────────────────────────────────────────── */
const RETAIL_CATEGORIES      = ['Fashion', 'Electronics', 'Beauty', 'Food', 'Home goods', 'Other'];
const SERVICE_CATEGORIES     = ['Clinic', 'Salon', 'Tutoring', 'Consulting', 'Other'];
const RESTAURANT_CATEGORIES  = ['Casual Dining', 'Fine Dining', 'Fast Food', 'Café & Bakery', 'Cloud Kitchen', 'Buffet', 'Other'];
const PERSONAS = [
  { id: 'casual',    label: 'Casual & Easygoing',   desc: 'Friendly, Bangla-English mix.'         },
  { id: 'formal',    label: 'Formal & Polite',       desc: 'Rumi Apa traditional style.'            },
  { id: 'technical', label: 'Tech Explainer',         desc: 'Detail-heavy, spec-focused.'            },
  { id: 'direct',    label: 'Direct & Efficient',    desc: 'No-nonsense, fast answers.'            },
];

/* ─── helpers ────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-ash/70 mb-3 px-0.5">
      {children}
    </p>
  );
}

function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-cards shadow-subtle border border-dove/10 hover:border-dove/30 transition-colors p-6 flex flex-col ${className}`}>
      {children}
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-fog text-ash border border-dove/20">
      Not connected
    </span>
  );
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-apricot-wash text-rust border border-rust/10">
      Coming soon
    </span>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function SettingsClient({ shop }: { shop: any }) {
  const [isPending,     startTransition]     = useTransition();
  const [isSaving,      startSaveTransition] = useTransition();
  const [isProfileSave, startProfileSave]    = useTransition();

  /* autopilot */
  const [agentEnabled, setAgentEnabled] = useState(shop?.agent_enabled ?? true);

  /* payment verification */
  const [confirmationTier,         setConfirmationTier]         = useState<'light' | 'otp_verified' | 'prepay_verified'>(shop?.confirmation_tier ?? 'light');
  const [bkashNumber,              setBkashNumber]              = useState(shop?.bkash_number ?? '');
  const [paymentVerificationMethod, setPaymentVerificationMethod] = useState<'none' | 'merchant_api' | 'notification_app'>(shop?.payment_verification_method ?? 'none');
  const [bkashAppKey,   setBkashAppKey]   = useState(shop?.bkashConfig?.app_key   ?? '');
  const [bkashAppSecret, setBkashAppSecret] = useState(shop?.bkashConfig?.app_secret ?? '');
  const [bkashUsername,  setBkashUsername]  = useState(shop?.bkashConfig?.username   ?? '');
  const [bkashPassword,  setBkashPassword]  = useState(shop?.bkashConfig?.password   ?? '');
  const [bkashSandbox,   setBkashSandbox]   = useState(shop?.bkashConfig?.sandbox    ?? true);
  const [nagadMerchantId, setNagadMerchantId] = useState(shop?.nagadConfig?.merchant_id ?? '');
  const [nagadPrivateKey,  setNagadPrivateKey]  = useState(shop?.nagadConfig?.private_key  ?? '');
  const [nagadPublicKey,   setNagadPublicKey]   = useState(shop?.nagadConfig?.public_key   ?? '');
  
  /* whatsapp */
  const parseWaRef = (refStr?: string | null) => {
    if (!refStr) return null;
    try { return JSON.parse(refStr); } catch (e) { return null; }
  };
  const parsedWaSettings = parseWaRef(shop?.prompt_cache_ref);

  const [waWabaId, setWaWabaId] = useState(parsedWaSettings?.wabaId ?? shop?.whatsapp_business_account_id ?? '');
  const [waPhoneId, setWaPhoneId] = useState(parsedWaSettings?.phoneId ?? shop?.whatsapp_phone_number_id ?? '');
  const [waToken, setWaToken] = useState(parsedWaSettings?.token ?? shop?.whatsapp_access_token ?? '');
  const [isWaSaving, startWaSave] = useTransition();


  /* courier */
  const [courierProvider,    setCourierProvider]    = useState(shop?.courier_provider ?? 'none');
  const [courierClientId,    setCourierClientId]    = useState(shop?.courierConfig?.client_id    ?? '');
  const [courierClientSecret, setCourierClientSecret] = useState(shop?.courierConfig?.client_secret ?? '');
  const [courierUsername,    setCourierUsername]    = useState(shop?.courierConfig?.username    ?? '');
  const [courierPassword,    setCourierPassword]    = useState(shop?.courierConfig?.password    ?? '');
  const [courierStoreId,     setCourierStoreId]     = useState(shop?.courierConfig?.store_id     ?? '');
  const [courierApiKey,      setCourierApiKey]      = useState(shop?.courierConfig?.api_key      ?? '');

  /* website widget */
  const [widgetEnabled, setWidgetEnabled] = useState(shop?.widget_enabled ?? false);
  const [widgetCopied,  setWidgetCopied]  = useState(false);
  const widgetSnippet = `<script src="https://dullbot.io/widget.js" data-shop="${shop?.id}" defer></script>`;

  /* business profile edit panel */
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [shopName,       setShopName]       = useState(shop?.name           ?? '');
  const [category,       setCategory]       = useState(shop?.category       ?? '');
  const [operatingHours, setOperatingHours] = useState(shop?.operating_hours ?? '');
  const [deliveryAreas,  setDeliveryAreas]  = useState(shop?.delivery_areas  ?? '');
  const [bizOverview,    setBizOverview]    = useState(shop?.business_overview ?? '');
  const [toneTemplate,   setToneTemplate]   = useState<'casual' | 'formal' | 'technical' | 'wholesale'>(shop?.tone_template ?? 'casual');
  const [profileSaved,   setProfileSaved]   = useState(false);

  const categories =
    shop?.business_type === 'service'    ? SERVICE_CATEGORIES    :
    shop?.business_type === 'restaurant' ? RESTAURANT_CATEGORIES :
    RETAIL_CATEGORIES;

  const businessTypeLabel: Record<string, string> = {
    retail:     'E-commerce & Retail',
    service:    'Service-Based',
    restaurant: 'Restaurant',
  };
  const toneLabel: Record<string, string> = {
    casual:    'Friendly & casual tone',
    formal:    'Formal & polite tone',
    technical: 'Technical explainer tone',
    wholesale: 'Wholesale & direct tone',
  };

  /* ── handlers ── */
  const handleDisconnect = () => {
    if (confirm('Disconnect your Facebook Page? This will pause AI replies on Messenger and Instagram.')) {
      startTransition(async () => { await disconnectFacebook(shop.id); });
    }
  };

  const handleSaveWhatsApp = () => {
    startWaSave(async () => {
      await saveWhatsAppConfig(shop.id, {
        wabaId: waWabaId.trim(),
        phoneId: waPhoneId.trim(),
        token: waToken.trim()
      });
    });
  };

  const handleWidgetToggle = (next: boolean) => {
    setWidgetEnabled(next);
    startTransition(async () => { await saveWidgetEnabled(shop.id, next); });
  };

  const handleCopyWidget = async () => {
    await navigator.clipboard.writeText(widgetSnippet);
    setWidgetCopied(true);
    setTimeout(() => setWidgetCopied(false), 2000);
  };

  const handleSaveProfile = () => {
    startProfileSave(async () => {
      const res = await saveOnboardingProfileAndTone(shop.id, {
        name: shopName,
        category,
        operatingHours,
        deliveryAreas,
        businessOverview: bizOverview,
        toneTemplate,
      });
      if (res.success) {
        setProfileSaved(true);
        setTimeout(() => { setProfileSaved(false); setProfileOpen(false); }, 1200);
      } else {
        alert(res.error || 'Failed to save profile.');
      }
    });
  };

  const handleSave = () => {
    startSaveTransition(async () => {
      const res = await saveSettings(shop.id, {
        confirmationTier,
        bkashNumber,
        agentEnabled,
        paymentVerificationMethod,
        bkashConfig: { app_key: bkashAppKey, app_secret: bkashAppSecret, username: bkashUsername, password: bkashPassword, sandbox: bkashSandbox },
        nagadConfig:  { merchant_id: nagadMerchantId, private_key: nagadPrivateKey, public_key: nagadPublicKey },
        courierProvider,
        courierConfig: { client_id: courierClientId, client_secret: courierClientSecret, username: courierUsername, password: courierPassword, store_id: courierStoreId, api_key: courierApiKey },
      });
      if (!res.success) alert(`Failed to save: ${res.error}`);
    });
  };

  /* ── shared input class ── */
  const inputCls = 'w-full bg-fog border border-transparent rounded-inputs py-3 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all placeholder:text-dove/70';

  /* ─────────────────────────────────────── JSX ────────────────────────────────────── */
  return (
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">

      {/* PAGE HEADER */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-1">Workspace Settings</h1>
        <p className="text-ash text-sm">Manage your integrations, AI configuration, and business identity.</p>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — BUSINESS PROFILE
          ══════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Business Profile</SectionLabel>
        <SettingsCard>
          {/* identity row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-apricot-wash text-rust flex items-center justify-center text-lg font-bold flex-shrink-0 select-none">
              {(shop?.name || 'D').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{shop?.name || 'Your Business'}</p>
              <p className="text-xs text-ash mt-0.5">
                {businessTypeLabel[shop?.business_type] || 'E-commerce & Retail'}
                {shop?.tone_template ? ` · ${toneLabel[shop.tone_template]}` : ''}
              </p>
            </div>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-buttons text-[11px] font-semibold text-ink border border-dove/30 hover:border-ink hover:bg-fog transition-all flex-shrink-0"
            >
              <Pencil className="w-3 h-3" />
              Edit details
              <ChevronDown className={`w-3 h-3 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* inline edit panel */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                key="profile-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-dove/10 pt-5 space-y-4">
                  {/* overview */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-rust" />
                      <span className="text-xs font-semibold text-ink">Business Overview</span>
                    </div>
                    <textarea
                      rows={3}
                      value={bizOverview}
                      onChange={e => setBizOverview(e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder="Describe what your business offers..."
                    />
                  </div>

                  {/* grid fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-ash mb-1">Business Name</label>
                      <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className={inputCls} placeholder="e.g. Dull Store" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-ash mb-1">Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-ash mb-1">Operating Hours</label>
                      <input type="text" value={operatingHours} onChange={e => setOperatingHours(e.target.value)} className={inputCls} placeholder="e.g. 10am – 8pm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-ash mb-1">
                        {shop?.business_type === 'service' ? 'Service Area' : 'Delivery Areas'}
                      </label>
                      <input type="text" value={deliveryAreas} onChange={e => setDeliveryAreas(e.target.value)} className={inputCls} placeholder="e.g. Nationwide" />
                    </div>
                  </div>

                  {/* tone picker */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Palette className="w-3.5 h-3.5 text-ink" />
                      <span className="text-xs font-semibold text-ink">Brand & Tone</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PERSONAS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setToneTemplate(p.id as any)}
                          className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                            toneTemplate === p.id
                              ? 'border-rust bg-apricot-wash/50 ring-1 ring-rust/10'
                              : 'border-dove/20 hover:border-ink/40 bg-white'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-ink leading-tight">{p.label}</span>
                          <span className="text-[9px] text-ash leading-snug">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* save button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isProfileSave}
                      className="flex items-center gap-2 px-5 py-2 rounded-buttons bg-ink text-white text-xs font-semibold hover:bg-black transition-all disabled:opacity-50"
                    >
                      {profileSaved ? (
                        <><Check className="w-3.5 h-3.5" /> Saved</>
                      ) : isProfileSave ? 'Saving…' : (
                        <><ChevronRight className="w-3.5 h-3.5" /> Save profile</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SettingsCard>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — CHANNELS
          ══════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Channels</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Facebook */}
          <SettingsCard className="min-h-[160px]">
            <div className="w-9 h-9 rounded-xl bg-sky-wash flex items-center justify-center mb-3 flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">Facebook</p>
            <div className="mt-auto pt-3 flex flex-col gap-2">
              <StatusBadge connected={!!shop?.meta_page_name} />
              {shop?.meta_page_name ? (
                <>
                  <p className="text-[10px] text-ash truncate">{shop.meta_page_name}</p>
                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="text-[11px] text-rust hover:text-red-700 font-medium text-left transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <Link
                  href={`/api/auth/facebook/login?shopId=${shop.id}`}
                  className="text-[11px] font-semibold text-ink border border-dove/30 hover:border-ink rounded-lg px-3 py-1.5 text-center transition-colors"
                >
                  Connect
                </Link>
              )}
            </div>
          </SettingsCard>

          {/* WhatsApp */}
          <SettingsCard className="min-h-[160px] md:col-span-2 lg:col-span-1">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-3 flex-shrink-0">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">WhatsApp</p>
            <div className="mt-auto pt-3 flex flex-col gap-2">
              <StatusBadge connected={!!waPhoneId || !!shop?.whatsapp_business_account_id} />
              
              <div className="space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="WhatsApp Business Account ID"
                  value={waWabaId}
                  onChange={e => setWaWabaId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-fog border border-dove/20 rounded text-[11px] focus:outline-none focus:border-ink transition-colors"
                />
                <input
                  type="text"
                  placeholder="Phone Number ID"
                  value={waPhoneId}
                  onChange={e => setWaPhoneId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-fog border border-dove/20 rounded text-[11px] focus:outline-none focus:border-ink transition-colors"
                />
                <input
                  type="password"
                  placeholder="System User Access Token"
                  value={waToken}
                  onChange={e => setWaToken(e.target.value)}
                  className="w-full px-3 py-1.5 bg-fog border border-dove/20 rounded text-[11px] focus:outline-none focus:border-ink transition-colors"
                />
                <button
                  onClick={handleSaveWhatsApp}
                  disabled={isWaSaving}
                  className="w-full px-3 py-1.5 bg-ink text-white rounded text-[11px] font-semibold hover:bg-black transition-colors disabled:opacity-50 mt-1"
                >
                  {isWaSaving ? 'Saving…' : 'Save Config'}
                </button>
              </div>
            </div>
          </SettingsCard>

          {/* Instagram */}
          <SettingsCard className="min-h-[160px]">
            <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center mb-3 flex-shrink-0">
              <AtSign className="w-5 h-5 text-pink-600" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">Instagram</p>
            <div className="mt-auto pt-3 flex flex-col gap-2">
              <StatusBadge connected={!!shop?.meta_page_name} />
              {shop?.meta_page_name ? (
                <p className="text-[10px] text-ash mt-1 leading-relaxed">
                  Instagram DMs are handled automatically via your connected Facebook Page webhook. Make sure Instagram DM access is allowed in Meta Business Suite.
                </p>
              ) : (
                <p className="text-[10px] text-ash mt-1 leading-relaxed">
                  Connect your Facebook Page first to enable Instagram DMs.
                </p>
              )}
            </div>
          </SettingsCard>

          {/* Website Widget */}
          <SettingsCard className="min-h-[160px]">
            <div className="w-9 h-9 rounded-xl bg-fog flex items-center justify-center mb-3 flex-shrink-0">
              <Globe className="w-5 h-5 text-graphite" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">Website Widget</p>
            <div className="mt-auto pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <StatusBadge connected={widgetEnabled} />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={widgetEnabled}
                    onChange={e => handleWidgetToggle(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-dove/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ink" />
                </label>
              </div>
              {widgetEnabled && (
                <div className="relative mt-1">
                  <pre className="text-[9px] font-mono text-graphite bg-fog rounded-lg px-3 py-2 overflow-hidden whitespace-pre-wrap break-all leading-relaxed">
                    {widgetSnippet}
                  </pre>
                  <button
                    onClick={handleCopyWidget}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white border border-dove/30 hover:border-ink transition-colors"
                    title="Copy snippet"
                  >
                    {widgetCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-ash" />}
                  </button>
                </div>
              )}
            </div>
          </SettingsCard>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — AI AND AUTOMATION
          ══════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>AI and Automation</SectionLabel>
        <SettingsCard>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-apricot-wash text-rust flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink mb-0.5">AI Autopilot</p>
              <p className="text-xs text-ash leading-relaxed mb-4">
                Let DullBot handle customer queries automatically in the background while you focus on fulfillment.
              </p>
              <div className="flex items-center justify-between p-4 bg-fog rounded-inputs">
                <span className="text-sm font-medium text-ink">
                  Status: {agentEnabled && shop?.onboarding_complete ? 'Active' : 'Paused'}
                </span>
                {!shop?.onboarding_complete ? (
                  <span className="text-xs text-rust font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Locked
                  </span>
                ) : (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={agentEnabled}
                      onChange={e => setAgentEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-dove/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink" />
                  </label>
                )}
              </div>
            </div>
          </div>
        </SettingsCard>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — PAYMENT VERIFICATION
          ══════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Payment Verification</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Confirmation Tier */}
          <SettingsCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-fog rounded-lg text-graphite flex-shrink-0"><ShieldCheck className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-semibold text-ink">Confirmation Tier</p>
                <p className="text-[11px] text-ash">How rigorous before packing</p>
              </div>
            </div>
            <select
              value={confirmationTier}
              onChange={e => setConfirmationTier(e.target.value as any)}
              className={inputCls}
            >
              <option value="light">Light (Address Only)</option>
              <option value="otp_verified">OTP Verified (SMS)</option>
              <option value="prepay_verified">Prepay Verified (bKash/Nagad)</option>
            </select>
          </SettingsCard>

          {/* Prepay Number */}
          <SettingsCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-fog rounded-lg text-graphite flex-shrink-0"><CreditCard className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-semibold text-ink">Prepay Number</p>
                <p className="text-[11px] text-ash">bKash or Nagad for pre-payments</p>
              </div>
            </div>
            <input
              type="text"
              value={bkashNumber}
              onChange={e => setBkashNumber(e.target.value)}
              placeholder="e.g. 01712345678"
              className={inputCls}
            />
          </SettingsCard>

        </div>

        {/* Payment Verification Integration — full width */}
        <SettingsCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-fog rounded-lg text-graphite flex-shrink-0"><ShieldCheck className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-semibold text-ink">Merchant API Integration</p>
              <p className="text-[11px] text-ash leading-relaxed">Real-time transaction verification via bKash or Nagad merchant credentials</p>
            </div>
          </div>
          <select
            value={paymentVerificationMethod}
            onChange={e => setPaymentVerificationMethod(e.target.value as any)}
            className={`${inputCls} mb-5`}
          >
            <option value="none">None (Manual Checking)</option>
            <option value="merchant_api">Merchant API (bKash/Nagad)</option>
            <option value="notification_app">Android Notification Companion App</option>
          </select>

          {paymentVerificationMethod === 'merchant_api' && (
            <div className="space-y-6 border-t border-dove/10 pt-5">
              <div>
                <h4 className="text-xs font-semibold text-ink mb-3">bKash Merchant Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text"     value={bkashAppKey}    onChange={e => setBkashAppKey(e.target.value)}    placeholder="bKash App Key"       className={inputCls} />
                  <input type="password" value={bkashAppSecret}  onChange={e => setBkashAppSecret(e.target.value)}  placeholder="bKash App Secret"     className={inputCls} />
                  <input type="text"     value={bkashUsername}   onChange={e => setBkashUsername(e.target.value)}   placeholder="bKash API Username"   className={inputCls} />
                  <input type="password" value={bkashPassword}   onChange={e => setBkashPassword(e.target.value)}   placeholder="bKash API Password"   className={inputCls} />
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={bkashSandbox} onChange={e => setBkashSandbox(e.target.checked)} className="rounded text-ink focus:ring-ink" />
                  <span className="text-xs text-ash">Enable Sandbox Mode</span>
                </label>
              </div>
              <div className="border-t border-dove/10 pt-5">
                <h4 className="text-xs font-semibold text-ink mb-3">Nagad Merchant Settings</h4>
                <div className="grid grid-cols-1 gap-3">
                  <input type="text"   value={nagadMerchantId} onChange={e => setNagadMerchantId(e.target.value)} placeholder="Nagad Merchant ID"              className={inputCls} />
                  <textarea           value={nagadPrivateKey}  onChange={e => setNagadPrivateKey(e.target.value)}  placeholder="Nagad Private Key (PEM format)" rows={3} className={`${inputCls} resize-none`} />
                  <textarea           value={nagadPublicKey}   onChange={e => setNagadPublicKey(e.target.value)}   placeholder="Nagad Public Key (PEM format)"  rows={3} className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>
          )}
        </SettingsCard>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — FULFILLMENT
          ══════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Fulfillment</SectionLabel>
        <SettingsCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-fog rounded-lg text-graphite flex-shrink-0"><Truck className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-semibold text-ink">Courier Integration</p>
              <p className="text-[11px] text-ash">Auto-book pickup on order confirmation</p>
            </div>
          </div>
          <select
            value={courierProvider}
            onChange={e => setCourierProvider(e.target.value)}
            className={`${inputCls} mb-5`}
          >
            <option value="none">None (Manual Booking)</option>
            <option value="pathao">Pathao Courier</option>
            <option value="steadfast">Steadfast</option>
            <option value="redx">RedX</option>
            <option value="paperfly">Paperfly</option>
            <option value="ecourier">eCourier</option>
          </select>

          {courierProvider !== 'none' && (
            <div className="border-t border-dove/10 pt-5 space-y-3">
              <h4 className="text-xs font-semibold text-ink capitalize">{courierProvider} Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(courierProvider === 'pathao' || courierProvider === 'ecourier') && (
                  <>
                    <input type="text"     value={courierClientId}     onChange={e => setCourierClientId(e.target.value)}     placeholder="Client ID / API Key"       className={inputCls} />
                    <input type="password" value={courierClientSecret}  onChange={e => setCourierClientSecret(e.target.value)}  placeholder="Client Secret / Secret Key" className={inputCls} />
                    <input type="text"     value={courierUsername}      onChange={e => setCourierUsername(e.target.value)}      placeholder="Username"                  className={inputCls} />
                    <input type="password" value={courierPassword}      onChange={e => setCourierPassword(e.target.value)}      placeholder="Password"                  className={inputCls} />
                    <input type="text"     value={courierStoreId}       onChange={e => setCourierStoreId(e.target.value)}       placeholder="Store / Warehouse ID"      className={`${inputCls} md:col-span-2`} />
                  </>
                )}
                {(courierProvider === 'steadfast' || courierProvider === 'redx' || courierProvider === 'paperfly') && (
                  <>
                    <input type="text" value={courierApiKey} onChange={e => setCourierApiKey(e.target.value)} placeholder="API Key / Token" className={`${inputCls} md:col-span-2`} />
                    {courierProvider === 'paperfly' && (
                      <>
                        <input type="text"     value={courierUsername} onChange={e => setCourierUsername(e.target.value)} placeholder="Paperfly Username" className={inputCls} />
                        <input type="password" value={courierPassword} onChange={e => setCourierPassword(e.target.value)} placeholder="Paperfly Password" className={inputCls} />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </SettingsCard>
      </section>

      {/* ── GLOBAL SAVE BUTTON ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-end pb-4"
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-subtle disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Configuration'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>

    </div>
  </div>
  );
}

