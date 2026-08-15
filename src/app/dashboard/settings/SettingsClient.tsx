'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Settings, MessageCircle, Link2, ShieldCheck, CreditCard,
  ChevronRight, Lock, Globe, Smartphone, AtSign,
  MessageSquare, Check, Copy, ChevronDown, Pencil, Sparkles,
  BookOpen, Palette, Truck, X, Loader2, Coins, Banknote,
  Camera, UploadCloud, Trash2, Image as ImageIcon, FileText,
  Sliders, UserCheck, ExternalLink, HelpCircle, AlertCircle,
  KeyRound, Layers, Users, Store, Phone, MapPin, Eye, EyeOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { disconnectFacebook, saveSettings, saveWidgetEnabled, saveWhatsAppConfig, saveShopLogo, getConnectedPages, selectPagesMeta } from './actions';
import { saveOnboardingProfileAndTone } from '../actions';
import StaffManagementSection from './staff/StaffManagementSection';
import ReceiptCustomizerSection from './ReceiptCustomizerSection';

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

const SETTINGS_TABS = [
  { id: 'all',       label: 'Overview',              icon: Layers },
  { id: 'profile',   label: 'Business Profile',      icon: Store },
  { id: 'channels',  label: 'Channels',              icon: MessageSquare },
  { id: 'ai',        label: 'AI Autopilot',          icon: Sparkles },
  { id: 'payments',  label: 'Payments & Deposits',   icon: CreditCard },
  { id: 'courier',   label: 'Courier & Logistics',   icon: Truck },
  { id: 'receipts',  label: 'Invoices & Receipts',   icon: Palette },
  { id: 'staff',     label: 'Team & Permissions',    icon: Users },
];

/* ─── helpers ────────────────────────────────────────────── */
function SectionLabel({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4 px-0.5">
      <p className="text-[11px] font-bold tracking-widest uppercase text-ash">
        {children}
      </p>
      {subtitle && <p className="text-xs text-ash/80 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function SettingsCard({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`bg-pure-white dark:bg-[#121214] rounded-3xl shadow-subtle border border-dove/15 dark:border-white/10 hover:border-dove/30 dark:hover:border-white/20 transition-all duration-200 p-6 sm:p-7 flex flex-col ${className}`}>
      {children}
    </div>
  );
}

interface Props {
  shop: any;
}

export default function SettingsClient({ shop }: Props) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isProfileSave, startProfileSave] = useTransition();
  const [saveToast, setSaveToast] = useState(false);

  /* autopilot */
  const [agentEnabled, setAgentEnabled] = useState(shop?.agent_enabled ?? true);

  /* payment verification */
  const parseWaRef = (refStr?: string | null) => {
    if (!refStr) return null;
    try { return JSON.parse(refStr); } catch (e) { return null; }
  };
  const parsedMetaSettings = parseWaRef(shop?.prompt_cache_ref);

  const [confirmationTier, setConfirmationTier] = useState<'light' | 'deposit_verified' | 'otp_verified' | 'prepay_verified'>(
    shop?.confirmation_tier ?? 'light'
  );
  
  /* Multi-scenario advance deposit states */
  const [depositRuleType, setDepositRuleType] = useState<'delivery_split' | 'fixed_amount' | 'percentage' | 'high_value_only' | 'custom_policy'>(
    parsedMetaSettings?.depositRuleType ?? (parsedMetaSettings?.deliveryInsideDhaka ? 'delivery_split' : 'delivery_split')
  );
  const [deliveryInsideDhaka, setDeliveryInsideDhaka] = useState<number>(parsedMetaSettings?.deliveryInsideDhaka ?? 80);
  const [deliveryOutsideDhaka, setDeliveryOutsideDhaka] = useState<number>(parsedMetaSettings?.deliveryOutsideDhaka ?? 150);
  const [fixedDepositAmount, setFixedDepositAmount] = useState<number>(parsedMetaSettings?.fixedAmount ?? parsedMetaSettings?.depositAmount ?? 200);
  const [depositPercentage, setDepositPercentage] = useState<number>(parsedMetaSettings?.percentage ?? 50);
  const [highValueThreshold, setHighValueThreshold] = useState<number>(parsedMetaSettings?.highValueThreshold ?? 3000);
  const [highValueDepositAmount, setHighValueDepositAmount] = useState<number>(parsedMetaSettings?.highValueDepositAmount ?? 500);
  const [depositReason, setDepositReason] = useState<string>(parsedMetaSettings?.depositReason ?? 'ডেলিভারি চার্জ অগ্রিম প্রযোজ্য');

  const [acceptScreenshot, setAcceptScreenshot] = useState<boolean>(parsedMetaSettings?.acceptScreenshot ?? true);
  const [acceptLast3Digits, setAcceptLast3Digits] = useState<boolean>(parsedMetaSettings?.acceptLast3Digits ?? true);
  const [acceptTrxId, setAcceptTrxId] = useState<boolean>(parsedMetaSettings?.acceptTrxId ?? true);

  const [simLocation, setSimLocation] = useState<'dhaka' | 'outside' | 'high_val'>('dhaka');

  const [bkashNumber, setBkashNumber] = useState(shop?.bkash_number ?? '');
  const [paymentVerificationMethod, setPaymentVerificationMethod] = useState<'none' | 'merchant_api' | 'notification_app'>(
    shop?.payment_verification_method ?? 'none'
  );
  const [bkashAppKey, setBkashAppKey] = useState(shop?.bkashConfig?.app_key ?? '');
  const [bkashAppSecret, setBkashAppSecret] = useState(shop?.bkashConfig?.app_secret ?? '');
  const [bkashUsername, setBkashUsername] = useState(shop?.bkashConfig?.username ?? '');
  const [bkashPassword, setBkashPassword] = useState(shop?.bkashConfig?.password ?? '');
  const [bkashSandbox, setBkashSandbox] = useState(shop?.bkashConfig?.sandbox ?? true);
  const [nagadMerchantId, setNagadMerchantId] = useState(shop?.nagadConfig?.merchant_id ?? '');
  const [nagadPrivateKey, setNagadPrivateKey] = useState(shop?.nagadConfig?.private_key ?? '');
  const [nagadPublicKey, setNagadPublicKey] = useState(shop?.nagadConfig?.public_key ?? '');
  
  /* whatsapp */
  const [waWabaId, setWaWabaId] = useState(parsedMetaSettings?.wabaId ?? shop?.whatsapp_business_account_id ?? '');
  const [waPhoneId, setWaPhoneId] = useState(parsedMetaSettings?.phoneId ?? shop?.whatsapp_phone_number_id ?? '');
  const [waToken, setWaToken] = useState(parsedMetaSettings?.token ?? shop?.whatsapp_access_token ?? '');
  const [isWaSaving, startWaSave] = useTransition();
  const [showWaModal, setShowWaModal] = useState(false);
  const [waSavedSuccess, setWaSavedSuccess] = useState(false);

  /* courier */
  const [courierProvider, setCourierProvider] = useState(shop?.courier_provider ?? 'none');
  const [courierClientId, setCourierClientId] = useState(shop?.courierConfig?.client_id ?? '');
  const [courierClientSecret, setCourierClientSecret] = useState(shop?.courierConfig?.client_secret ?? '');
  const [courierUsername, setCourierUsername] = useState(shop?.courierConfig?.username ?? '');
  const [courierPassword, setCourierPassword] = useState(shop?.courierConfig?.password ?? '');
  const [courierStoreId, setCourierStoreId] = useState(shop?.courierConfig?.store_id ?? '');
  const [courierApiKey, setCourierApiKey] = useState(shop?.courierConfig?.api_key ?? '');

  /* website widget */
  const [widgetEnabled, setWidgetEnabled] = useState(shop?.widget_enabled ?? false);
  const [widgetCopied, setWidgetCopied] = useState(false);
  const widgetSnippet = `<script src="https://dullbot.io/widget.js" data-shop="${shop?.id}" defer></script>`;

  /* business profile edit panel */
  const [profileOpen, setProfileOpen] = useState(false);
  const [shopName, setShopName] = useState(shop?.name ?? '');
  const [category, setCategory] = useState(shop?.category ?? '');
  const [operatingHours, setOperatingHours] = useState(shop?.operating_hours ?? '');
  const [deliveryAreas, setDeliveryAreas] = useState(shop?.delivery_areas ?? '');
  const [logoUrl, setLogoUrl] = useState<string>(parsedMetaSettings?.logoUrl ?? '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  
  const [bizOverview, setBizOverview] = useState(
    shop?.business_overview ? shop.business_overview.split('---TERMS---')[0].trim() : ''
  );
  const [terms, setTerms] = useState(
    shop?.business_overview?.includes('---TERMS---') ? shop.business_overview.split('---TERMS---')[1].trim() : ''
  );
  
  const [toneTemplate, setToneTemplate] = useState<'casual' | 'formal' | 'technical' | 'wholesale'>(shop?.tone_template ?? 'casual');
  const [profileSaved, setProfileSaved] = useState(false);

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

  /* multi-page meta channels */
  const [connectedPages, setConnectedPages] = useState<any[]>([]);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [savingPages, setSavingPages] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    getConnectedPages(shop.id).then(pages => {
      setConnectedPages(pages);
      if (pages.length > 0) {
        setSelectedPageIds(new Set(pages.map((p: any) => p.meta_page_id)));
      }
    });

    if (typeof window !== 'undefined') {
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
            setSelectedPageIds(new Set(parsed.map((p: any) => p.id)));
            setShowPagePicker(true);
          }
        } catch (e) {}
      }
    }
  }, [shop.id]);

  /* Keyboard shortcut ⌘S / Ctrl+S to save */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    confirmationTier, depositRuleType, deliveryInsideDhaka, deliveryOutsideDhaka,
    fixedDepositAmount, depositPercentage, highValueThreshold, highValueDepositAmount,
    depositReason, acceptScreenshot, acceptLast3Digits, acceptTrxId, bkashNumber,
    agentEnabled, paymentVerificationMethod, bkashAppKey, bkashAppSecret, bkashUsername,
    bkashPassword, bkashSandbox, nagadMerchantId, nagadPrivateKey, nagadPublicKey,
    courierProvider, courierClientId, courierClientSecret, courierUsername, courierPassword,
    courierStoreId, courierApiKey
  ]);

  const handleDisconnect = () => {
    if (!confirm('Are you sure you want to disconnect Facebook and Instagram?')) return;
    startTransition(async () => {
      const res = await disconnectFacebook(shop.id);
      if (!res.success) alert(res.error || 'Failed to disconnect.');
      else {
        setConnectedPages([]);
        setSelectedPageIds(new Set());
      }
    });
  };

  const handleSaveWhatsApp = () => {
    startWaSave(async () => {
      const res = await saveWhatsAppConfig(shop.id, {
        wabaId: waWabaId.trim(),
        phoneId: waPhoneId.trim(),
        token: waToken.trim(),
      });
      if (res.success) {
        setWaSavedSuccess(true);
        setTimeout(() => {
          setWaSavedSuccess(false);
          setShowWaModal(false);
        }, 1200);
      } else {
        alert(res.error || 'Failed to save WhatsApp config.');
      }
    });
  };

  const handleWidgetToggle = (val: boolean) => {
    setWidgetEnabled(val);
    startTransition(async () => {
      const res = await saveWidgetEnabled(shop.id, val);
      if (!res.success) {
        setWidgetEnabled(!val);
        alert(res.error || 'Failed to update widget status.');
      }
    });
  };

  const handleCopyWidget = async () => {
    await navigator.clipboard.writeText(widgetSnippet);
    setWidgetCopied(true);
    setTimeout(() => setWidgetCopied(false), 2000);
  };

  const handleSaveProfile = () => {
    startProfileSave(async () => {
      const combinedOverview = terms.trim() 
        ? `${bizOverview.trim()}\n\n---TERMS---\n${terms.trim()}`
        : bizOverview.trim();

      const res = await saveOnboardingProfileAndTone(shop.id, {
        name: shopName,
        category,
        operatingHours,
        deliveryAreas,
        businessOverview: combinedOverview,
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

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/inventory/upload-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setLogoUrl(data.url);
        await saveShopLogo(shop.id, data.url);
        try {
          const existing = localStorage.getItem('dullbot_receipt_custom_config');
          const parsed = existing ? JSON.parse(existing) : {};
          localStorage.setItem('dullbot_receipt_custom_config', JSON.stringify({ ...parsed, logoUrl: data.url }));
        } catch {}
      } else {
        alert(data.error || 'Failed to upload logo.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error uploading logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl('');
    await saveShopLogo(shop.id, '');
    try {
      const existing = localStorage.getItem('dullbot_receipt_custom_config');
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem('dullbot_receipt_custom_config', JSON.stringify({ ...parsed, logoUrl: '' }));
    } catch {}
  };

  const handleSave = () => {
    startSaveTransition(async () => {
      const res = await saveSettings(shop.id, {
        confirmationTier,
        depositSettings: {
          depositRuleType,
          deliveryInsideDhaka: Number(deliveryInsideDhaka) || 80,
          deliveryOutsideDhaka: Number(deliveryOutsideDhaka) || 150,
          fixedAmount: Number(fixedDepositAmount) || 200,
          percentage: Number(depositPercentage) || 50,
          highValueThreshold: Number(highValueThreshold) || 3000,
          highValueDepositAmount: Number(highValueDepositAmount) || 500,
          depositReason: depositReason.trim(),
          acceptScreenshot,
          acceptLast3Digits,
          acceptTrxId,
          depositAmount: depositRuleType === 'fixed_amount' ? Number(fixedDepositAmount) : (depositRuleType === 'delivery_split' ? Number(deliveryOutsideDhaka) : Number(fixedDepositAmount)),
        },
        bkashNumber,
        agentEnabled,
        paymentVerificationMethod,
        bkashConfig: { app_key: bkashAppKey, app_secret: bkashAppSecret, username: bkashUsername, password: bkashPassword, sandbox: bkashSandbox },
        nagadConfig:  { merchant_id: nagadMerchantId, private_key: nagadPrivateKey, public_key: nagadPublicKey },
        courierProvider,
        courierConfig: { client_id: courierClientId, client_secret: courierClientSecret, username: courierUsername, password: courierPassword, store_id: courierStoreId, api_key: courierApiKey },
      });
      if (res.success) {
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2500);
      } else {
        alert(`Failed to save: ${res.error}`);
      }
    });
  };

  /* ── shared input class ── */
  const inputCls = 'w-full bg-fog border border-dove/20 rounded-xl py-2.5 px-3.5 text-ink text-xs focus:border-ink focus:bg-white focus:ring-1 focus:ring-ink focus:outline-none transition-all placeholder:text-dove';

  const isTabVisible = (tabId: string) => activeTab === 'all' || activeTab === tabId;

  /* ─────────────────────────────────────── JSX ────────────────────────────────────── */
  return (
    <div className="flex-1 overflow-y-auto h-full w-full bg-[#fbfbfa]">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 pb-32">

        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dove/15 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-serif text-ink tracking-tight">Settings & Integrations</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-fog text-graphite rounded-full border border-dove/20">
                Workspace
              </span>
            </div>
            <p className="text-xs text-ash">
              Configure communication channels, payment verification, AI automated workflows, and dispatch rules.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-subtle disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving Changes…' : 'Save Changes'}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] bg-white/20 rounded font-mono text-white/90">⌘S</kbd>
            </button>
          </div>
        </div>

        {/* CATEGORY FILTER TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-dove/10">
          {SETTINGS_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-ash hover:text-ink hover:bg-fog/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-ash'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION 1 — BUSINESS PROFILE
            ══════════════════════════════════════════════════ */}
        {isTabVisible('profile') && (
          <section id="section-profile" className="space-y-3">
            <SectionLabel subtitle="Manage store identity, brand voice, and customer operating guidelines.">
              Business Profile & Identity
            </SectionLabel>
            
            <SettingsCard>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative group flex-shrink-0">
                    <div 
                      onClick={() => logoFileInputRef.current?.click()}
                      className="w-16 h-16 rounded-2xl bg-apricot-wash text-rust flex items-center justify-center text-xl font-bold select-none overflow-hidden border-2 border-dove/20 group-hover:border-ink transition-all cursor-pointer shadow-xs"
                      title="Click to upload or change store logo"
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt={shop?.name || 'Store'} className="w-full h-full object-cover" />
                      ) : (
                        (shop?.name || 'D').charAt(0).toUpperCase()
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-ink text-white shadow-subtle flex items-center justify-center border-2 border-white cursor-pointer hover:scale-110 transition-transform"
                      title="Upload Store Logo"
                    >
                      {isUploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </button>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-ink truncate">{shop?.name || 'Your Business'}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-fog text-graphite rounded-md border border-dove/20">
                        {businessTypeLabel[shop?.business_type] || 'E-commerce & Retail'}
                      </span>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-[10px] text-ash hover:text-rust underline cursor-pointer"
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-ash mt-1 flex items-center gap-2">
                      <span>{shop?.category || 'Retail'}</span>
                      <span>·</span>
                      <span>{shop?.operating_hours || '10:00 AM – 10:00 PM'}</span>
                      <span>·</span>
                      <span className="text-graphite font-medium">{toneLabel[shop?.tone_template] || 'Casual tone'}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-ink border border-dove/30 hover:border-ink hover:bg-fog transition-all flex-shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{profileOpen ? 'Close Editor' : 'Edit Profile & Voice'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Inline Edit Panel */}
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
                    <div className="border-t border-dove/10 pt-6 mt-6 space-y-5">
                      
                      {/* Store Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">Business Name</label>
                          <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className={inputCls} placeholder="e.g. Dull Store" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">Category</label>
                          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">Operating Hours</label>
                          <input type="text" value={operatingHours} onChange={e => setOperatingHours(e.target.value)} className={inputCls} placeholder="e.g. 10am – 8pm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                            {shop?.business_type === 'service' ? 'Service Area' : 'Delivery Areas'}
                          </label>
                          <input type="text" value={deliveryAreas} onChange={e => setDeliveryAreas(e.target.value)} className={inputCls} placeholder="e.g. Nationwide" />
                        </div>
                      </div>

                      {/* Brand Voice Picker */}
                      <div>
                        <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-2">Brand Voice & Persona Style</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {PERSONAS.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setToneTemplate(p.id as any)}
                              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                toneTemplate === p.id
                                  ? 'border-ink bg-ink text-white shadow-xs'
                                  : 'border-dove/20 bg-white hover:border-dove/40 hover:bg-fog text-ink'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${toneTemplate === p.id ? 'text-white' : 'text-ink'}`}>{p.label}</span>
                                {toneTemplate === p.id && <Check className="w-3 h-3 text-amber-300" />}
                              </div>
                              <span className={`text-[10px] ${toneTemplate === p.id ? 'text-white/70' : 'text-ash'}`}>{p.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Overview & Policies */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-rust" /> Business Overview & Catalog Summary
                          </label>
                          <textarea
                            rows={3}
                            value={bizOverview}
                            onChange={e => setBizOverview(e.target.value)}
                            className={`${inputCls} resize-none`}
                            placeholder="Describe what you sell, main categories, and brand story..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-rust" /> Store Policies & Customer Guidelines
                          </label>
                          <textarea
                            rows={3}
                            value={terms}
                            onChange={e => setTerms(e.target.value)}
                            className={`${inputCls} resize-none`}
                            placeholder="Delivery timelines, exchange policy, return window..."
                          />
                        </div>
                      </div>

                      {/* Save Profile Button */}
                      <div className="flex justify-end pt-2 border-t border-dove/10">
                        <button
                          onClick={handleSaveProfile}
                          disabled={isProfileSave}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {profileSaved ? (
                            <><Check className="w-3.5 h-3.5 text-emerald-400" /> Saved</>
                          ) : isProfileSave ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                          ) : (
                            <><Check className="w-3.5 h-3.5" /> Save Business Profile</>
                          )}
                        </button>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </SettingsCard>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 2 — CHANNELS & INTEGRATIONS (REDESIGNED)
            ══════════════════════════════════════════════════ */}
        {isTabVisible('channels') && (
          <section id="section-channels" className="space-y-4">
            <SectionLabel subtitle="Connect your official social media pages and website chat widgets for automated sales.">
              Connected Communication Channels
            </SectionLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* 1. FACEBOOK PAGES */}
              <div className="group relative bg-pure-white dark:bg-[#121214] rounded-3xl p-6 border border-dove/15 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-500/30 shadow-subtle hover:shadow-card transition-all duration-300 flex flex-col justify-between overflow-hidden">
                {/* Subtle Ambient Brand Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

                <div className="relative z-10">
                  {/* Card Header: Icon & Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#0066CC] text-white flex items-center justify-center shadow-md shadow-blue-500/20 ring-4 ring-blue-500/10">
                      <MessageSquare className="w-6 h-6 fill-current" />
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-xs transition-all ${
                      connectedPages.length > 0 || !!shop?.meta_page_name
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs'
                        : 'bg-fog dark:bg-white/5 text-ash border border-dove/20 dark:border-white/10'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        connectedPages.length > 0 || !!shop?.meta_page_name ? 'bg-emerald-500 animate-pulse' : 'bg-ash'
                      }`} />
                      {connectedPages.length > 0
                        ? `${connectedPages.length} Connected`
                        : !!shop?.meta_page_name
                        ? 'Connected'
                        : 'Offline'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-base font-bold text-ink dark:text-white leading-snug">Facebook Pages</h4>
                  <p className="text-xs text-ash mt-1 leading-relaxed">
                    Messenger automated sales & post comments.
                  </p>

                  {/* Connected Pages Body */}
                  <div className="mt-4 space-y-2">
                    {connectedPages.length > 0 ? (
                      connectedPages.slice(0, 2).map(p => (
                        <div
                          key={p.meta_page_id}
                          className="flex items-center justify-between text-xs bg-fog/80 dark:bg-white/[0.04] p-2.5 rounded-xl border border-dove/15 dark:border-white/10 hover:border-dove/30 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-semibold text-ink dark:text-white truncate text-xs">
                              {p.meta_page_name}
                            </span>
                          </div>
                          {p.instagram_business_id && (
                            <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full shrink-0">
                              + IG
                            </span>
                          )}
                        </div>
                      ))
                    ) : shop?.meta_page_name ? (
                      <div className="flex items-center gap-2 text-xs bg-fog/80 dark:bg-white/[0.04] p-2.5 rounded-xl border border-dove/15 dark:border-white/10 font-semibold text-ink dark:text-white truncate">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">{shop.meta_page_name}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-ash/80 bg-fog/60 dark:bg-white/[0.03] p-3 rounded-xl border border-dove/10 dark:border-white/5 leading-relaxed">
                        No Facebook Page linked. Connect to auto-reply to customer DMs.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="relative z-10 pt-5 mt-4 border-t border-dove/10 dark:border-white/10 flex items-center justify-between gap-2.5">
                  <Link
                    href={`/api/auth/facebook/login?shopId=${shop.id}`}
                    className="flex-1 text-center py-2.5 px-3.5 rounded-xl bg-ink text-pure-white dark:bg-white dark:text-black hover:opacity-90 text-xs font-bold transition-all shadow-subtle flex items-center justify-center gap-1.5"
                  >
                    <span>{connectedPages.length > 0 || shop?.meta_page_name ? 'Manage Pages' : 'Connect Facebook'}</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                  {(connectedPages.length > 0 || shop?.meta_page_name) && (
                    <button
                      onClick={handleDisconnect}
                      disabled={isPending}
                      className="px-3 py-2.5 text-xs font-semibold text-rust hover:text-red-700 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      title="Disconnect Facebook"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

              {/* 2. WHATSAPP BUSINESS API */}
              <div className="group relative bg-pure-white dark:bg-[#121214] rounded-3xl p-6 border border-dove/15 dark:border-white/10 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 shadow-subtle hover:shadow-card transition-all duration-300 flex flex-col justify-between overflow-hidden">
                {/* Subtle Ambient Brand Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

                <div className="relative z-10">
                  {/* Card Header: Icon & Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 ring-4 ring-emerald-500/10">
                      <Smartphone className="w-6 h-6" />
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-xs transition-all ${
                      !!waPhoneId || !!shop?.whatsapp_business_account_id
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs'
                        : 'bg-fog dark:bg-white/5 text-ash border border-dove/20 dark:border-white/10'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        !!waPhoneId || !!shop?.whatsapp_business_account_id ? 'bg-emerald-500 animate-pulse' : 'bg-ash'
                      }`} />
                      {!!waPhoneId || !!shop?.whatsapp_business_account_id ? 'API Active' : 'Not Configured'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-base font-bold text-ink dark:text-white leading-snug">WhatsApp Business</h4>
                  <p className="text-xs text-ash mt-1 leading-relaxed">
                    Official Cloud API for 24/7 WhatsApp chat.
                  </p>

                  {/* WhatsApp Content Box */}
                  <div className="mt-4">
                    {waPhoneId || shop?.whatsapp_phone_number_id ? (
                      <div className="space-y-1.5 bg-fog/80 dark:bg-white/[0.04] p-3 rounded-xl border border-dove/15 dark:border-white/10 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-ash font-medium">Phone ID</span>
                          <span className="font-mono text-ink dark:text-white font-semibold text-xs truncate max-w-[140px]">
                            {waPhoneId || shop?.whatsapp_phone_number_id}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-dove/10 dark:border-white/10 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Cloud Webhook Connected</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-ash/80 bg-fog/60 dark:bg-white/[0.03] p-3 rounded-xl border border-dove/10 dark:border-white/5 leading-relaxed">
                        Add your Meta Cloud Phone ID & Access Token to activate WhatsApp sales.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="relative z-10 pt-5 mt-4 border-t border-dove/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowWaModal(true)}
                    className="w-full text-center py-2.5 px-3.5 rounded-xl bg-pure-white dark:bg-white/5 hover:bg-fog dark:hover:bg-white/10 text-ink dark:text-white border border-dove/25 dark:border-white/15 hover:border-ink dark:hover:border-white/40 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>{waPhoneId || shop?.whatsapp_phone_number_id ? 'Configure API' : 'Setup WhatsApp'}</span>
                    <Sliders className="w-3.5 h-3.5 text-ash" />
                  </button>
                </div>
              </div>

              {/* 3. INSTAGRAM */}
              <div className="group relative bg-pure-white dark:bg-[#121214] rounded-3xl p-6 border border-dove/15 dark:border-white/10 hover:border-pink-500/30 dark:hover:border-pink-500/30 shadow-subtle hover:shadow-card transition-all duration-300 flex flex-col justify-between overflow-hidden">
                {/* Subtle Ambient Brand Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

                {(() => {
                  const igPage = connectedPages.find(p => !!p.instagram_business_id);
                  const isIgConnected = !!igPage || !!shop?.instagram_business_id;

                  return (
                    <>
                      <div className="relative z-10">
                        {/* Card Header: Icon & Status */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FFB700] via-[#FF1361] to-[#8800FF] text-white flex items-center justify-center shadow-md shadow-pink-500/25 ring-4 ring-pink-500/10">
                            <AtSign className="w-6 h-6" />
                          </div>

                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight backdrop-blur-xs transition-all ${
                            isIgConnected
                              ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 shadow-xs'
                              : 'bg-fog dark:bg-white/5 text-ash border border-dove/20 dark:border-white/10'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              isIgConnected ? 'bg-pink-500 animate-pulse' : 'bg-ash'
                            }`} />
                            {isIgConnected ? 'Linked' : 'Not Linked'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-base font-bold text-ink dark:text-white leading-snug">Instagram DMs</h4>
                        <p className="text-xs text-ash mt-1 leading-relaxed">
                          Direct messages, stories, and post comments.
                        </p>

                        {/* Instagram Content Box */}
                        <div className="mt-4">
                          {isIgConnected ? (
                            <div className="space-y-1 bg-pink-500/5 dark:bg-pink-500/10 p-3 rounded-xl border border-pink-500/20 text-xs">
                              <p className="text-pink-700 dark:text-pink-300 font-bold truncate flex items-center gap-1">
                                <span>@{igPage?.meta_page_name || shop?.meta_page_name || 'Instagram Account'}</span>
                              </p>
                              <p className="text-pink-600/80 dark:text-pink-400/80 text-[11px] font-medium flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Auto-reply active on DMs & posts
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-ash/80 bg-fog/60 dark:bg-white/[0.03] p-3 rounded-xl border border-dove/10 dark:border-white/5 leading-relaxed">
                              Connect via Facebook Page OAuth with Instagram Professional enabled.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="relative z-10 pt-5 mt-4 border-t border-dove/10 dark:border-white/10">
                        <Link
                          href={`/api/auth/facebook/login?shopId=${shop.id}`}
                          className={`block w-full text-center py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            isIgConnected
                              ? 'bg-pure-white dark:bg-white/5 hover:bg-fog dark:hover:bg-white/10 text-ink dark:text-white border border-dove/25 dark:border-white/15 hover:border-ink dark:hover:border-white/40'
                              : 'bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:opacity-95 shadow-md shadow-pink-500/20'
                          }`}
                        >
                          {isIgConnected ? 'Manage Account' : 'Link Instagram'}
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 4. WEBSITE WIDGET */}
              <div className="group relative bg-pure-white dark:bg-[#121214] rounded-3xl p-6 border border-dove/15 dark:border-white/10 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 shadow-subtle hover:shadow-card transition-all duration-300 flex flex-col justify-between overflow-hidden">
                {/* Subtle Ambient Brand Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />

                <div className="relative z-10">
                  {/* Card Header: Icon & Toggle Switch */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white flex items-center justify-center shadow-md shadow-indigo-500/20 ring-4 ring-indigo-500/10">
                      <Globe className="w-6 h-6" />
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={widgetEnabled}
                        onChange={e => handleWidgetToggle(e.target.checked)}
                      />
                      <div className="w-10 h-6 bg-dove/30 dark:bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-emerald-500" />
                    </label>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-base font-bold text-ink dark:text-white leading-snug">Website Chat Widget</h4>
                  <p className="text-xs text-ash mt-1 leading-relaxed">
                    Embed live AI sales bubble on any website.
                  </p>

                  {/* Widget Code Box */}
                  <div className="mt-4">
                    {widgetEnabled ? (
                      <div className="space-y-2">
                        <div className="bg-fog/90 dark:bg-[#18181c] rounded-xl px-3 py-2 border border-dove/15 dark:border-white/10 font-mono text-[10px] text-graphite dark:text-ash break-all leading-relaxed select-all">
                          {`<script src="https://dullbot.com/widget.js" data-shop="${shop.id}"></script>`}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyWidget}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-pure-white dark:bg-white/5 border border-dove/25 dark:border-white/15 text-xs font-bold text-ink dark:text-white hover:border-ink dark:hover:border-white/40 transition-all cursor-pointer shadow-xs"
                        >
                          {widgetCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-ash" />
                              <span>Copy Script Tag</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-ash/80 bg-fog/60 dark:bg-white/[0.03] p-3 rounded-xl border border-dove/10 dark:border-white/5 leading-relaxed">
                        Toggle switch above to enable live website visitor AI sales on your storefront.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Status */}
                <div className="relative z-10 pt-5 mt-4 border-t border-dove/10 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-ash font-medium">Widget Status</span>
                  <span className={`inline-flex items-center gap-1.5 font-bold ${
                    widgetEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-ash'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${widgetEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-ash/50'}`} />
                    {widgetEnabled ? 'Live on Store' : 'Disabled'}
                  </span>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 3 — AI AUTOPILOT
            ══════════════════════════════════════════════════ */}
        {isTabVisible('ai') && (
          <section id="section-ai" className="space-y-3">
            <SectionLabel subtitle="Manage background autonomous AI behavior and customer response workflows.">
              AI Sales Assistant & Autopilot
            </SectionLabel>
            
            <SettingsCard>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-apricot-wash text-rust flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink mb-0.5">Autonomous AI Sales Agent</h3>
                    <p className="text-xs text-ash leading-relaxed max-w-xl">
                      When active, DullBot automatically replies to customer product questions, recommends sizes, checks real-time inventory, and takes order details in Messenger, Instagram, and WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-fog p-4 rounded-2xl border border-dove/15 shrink-0 self-start sm:self-auto">
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink">
                      {agentEnabled && shop?.onboarding_complete ? 'Autopilot Active' : 'Autopilot Paused'}
                    </p>
                    <p className="text-[10px] text-ash">
                      {agentEnabled ? 'Replies autonomously' : 'Manual operator mode'}
                    </p>
                  </div>

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
            </SettingsCard>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 4 — PAYMENT VERIFICATION & ADVANCE DEPOSIT
            ══════════════════════════════════════════════════ */}
        {isTabVisible('payments') && (
          <section id="section-payments" className="space-y-4">
            <SectionLabel subtitle="Configure upfront deposit requirements, payment verification methods, and bKash/Nagad accounts.">
              Payment Verification & Advance Deposits
            </SectionLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Confirmation Tier */}
              <SettingsCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-fog rounded-xl text-graphite flex-shrink-0"><ShieldCheck className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Order Confirmation Rule</h4>
                    <p className="text-[11px] text-ash">How strictly to verify before packing</p>
                  </div>
                </div>
                <select
                  value={confirmationTier}
                  onChange={e => setConfirmationTier(e.target.value as any)}
                  className={inputCls}
                >
                  <option value="light">Light (100% Cash on Delivery — Address Only)</option>
                  <option value="deposit_verified">Advance Deposit Required (e.g. Delivery Charge)</option>
                  <option value="prepay_verified">Full Advance Payment (100% Prepayment via bKash/Nagad)</option>
                  <option value="otp_verified">OTP SMS Verification (Phone OTP)</option>
                </select>
              </SettingsCard>

              {/* Prepay Number */}
              <SettingsCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-fog rounded-xl text-graphite flex-shrink-0"><CreditCard className="w-5 h-5" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Store bKash / Nagad Number</h4>
                    <p className="text-[11px] text-ash">Number sent to customers for advance money</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={bkashNumber}
                  onChange={e => setBkashNumber(e.target.value)}
                  placeholder="e.g. 01712-345678 (Personal / Merchant)"
                  className={inputCls}
                />
              </SettingsCard>

              {/* Multi-Scenario Advance Deposit Policy Builder */}
              <AnimatePresence>
                {confirmationTier === 'deposit_verified' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:col-span-2 space-y-4"
                  >
                    <div className="bg-white rounded-2xl shadow-subtle border border-amber-500/20 bg-amber-500/[0.01] p-6 space-y-6">
                      
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl flex-shrink-0">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-ink">Advance Deposit Configuration & Scenarios</h4>
                            <p className="text-xs text-ash mt-0.5">
                              Select your exact business model below. The AI will calculate and request the right amount from customers.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Scenario Selector Tabs */}
                      <div>
                        <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-2">
                          Choose Deposit Model
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'delivery_split', label: 'Delivery Fee Split', sub: 'Inside vs Outside City', icon: Truck },
                            { id: 'fixed_amount', label: 'Fixed Amount', sub: 'Universal Flat Deposit', icon: Coins },
                            { id: 'percentage', label: '% of Order Total', sub: 'For Made-to-Order items', icon: Banknote },
                            { id: 'high_value_only', label: 'High-Value Only', sub: 'COD for normal orders', icon: ShieldCheck },
                            { id: 'custom_policy', label: 'Custom Policy', sub: 'Freeform instructions', icon: Sparkles },
                          ].map(tab => {
                            const Icon = tab.icon;
                            const isSelected = depositRuleType === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setDepositRuleType(tab.id as any)}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-ink bg-ink text-white shadow-subtle'
                                    : 'border-dove/20 bg-white hover:border-dove/40 hover:bg-fog text-ink'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-graphite'}`} />
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-amber-300" />}
                                </div>
                                <div>
                                  <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-ink'}`}>{tab.label}</p>
                                  <p className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-white/70' : 'text-ash'}`}>{tab.sub}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Contextual Scenario Inputs */}
                      <div className="bg-fog p-5 rounded-2xl border border-dove/15 space-y-4">
                        
                        {/* SCENARIO 1: Delivery Fee Split */}
                        {depositRuleType === 'delivery_split' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Inside Dhaka Delivery Fee (৳ BDT)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash text-xs font-mono font-bold">৳</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={deliveryInsideDhaka}
                                    onChange={e => setDeliveryInsideDhaka(Number(e.target.value) || 0)}
                                    placeholder="80"
                                    className={`${inputCls} pl-8 font-mono font-semibold bg-white`}
                                  />
                                </div>
                                <p className="text-[10px] text-ash mt-1">Requested when customer delivery address is in Dhaka</p>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Outside Dhaka Delivery Fee (৳ BDT)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash text-xs font-mono font-bold">৳</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={deliveryOutsideDhaka}
                                    onChange={e => setDeliveryOutsideDhaka(Number(e.target.value) || 0)}
                                    placeholder="150"
                                    className={`${inputCls} pl-8 font-mono font-semibold bg-white`}
                                  />
                                </div>
                                <p className="text-[10px] text-ash mt-1">Requested for all other districts across Bangladesh</p>
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <span className="text-[10px] font-bold text-ash uppercase tracking-wider">Quick Presets:</span>
                              {[
                                { label: '৳80 Inside / ৳150 Outside', inVal: 80, outVal: 150 },
                                { label: '৳70 Inside / ৳130 Outside', inVal: 70, outVal: 130 },
                                { label: '৳60 Inside / ৳120 Outside', inVal: 60, outVal: 120 },
                                { label: '৳100 Inside / ৳160 Outside', inVal: 100, outVal: 160 },
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setDeliveryInsideDhaka(preset.inVal);
                                    setDeliveryOutsideDhaka(preset.outVal);
                                  }}
                                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                    deliveryInsideDhaka === preset.inVal && deliveryOutsideDhaka === preset.outVal
                                      ? 'bg-ink text-white border-ink'
                                      : 'bg-white text-ash border-dove/20 hover:text-ink hover:border-dove/40'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SCENARIO 2: Flat Fixed Amount */}
                        {depositRuleType === 'fixed_amount' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Universal Deposit (৳ BDT)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash text-xs font-mono font-bold">৳</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={fixedDepositAmount}
                                    onChange={e => setFixedDepositAmount(Number(e.target.value) || 0)}
                                    placeholder="200"
                                    className={`${inputCls} pl-8 font-mono font-semibold bg-white`}
                                  />
                                </div>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Reason / Policy Note
                                </label>
                                <input
                                  type="text"
                                  value={depositReason}
                                  onChange={e => setDepositReason(e.target.value)}
                                  placeholder="e.g. বুকিং কনফার্মেশন ডিপোজিট / Booking confirmation"
                                  className={`${inputCls} bg-white`}
                                />
                              </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <span className="text-[10px] font-bold text-ash uppercase tracking-wider">Presets:</span>
                              {[100, 150, 200, 300, 500].map(amt => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setFixedDepositAmount(amt)}
                                  className={`px-3 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                    fixedDepositAmount === amt
                                      ? 'bg-ink text-white border-ink'
                                      : 'bg-white text-ash border-dove/20 hover:text-ink'
                                  }`}
                                >
                                  ৳{amt} Flat
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SCENARIO 3: Percentage of Total Order */}
                        {depositRuleType === 'percentage' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Advance Percentage (%)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash text-xs font-mono font-bold">%</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={depositPercentage}
                                    onChange={e => setDepositPercentage(Number(e.target.value) || 0)}
                                    placeholder="50"
                                    className={`${inputCls} pl-8 font-mono font-semibold bg-white`}
                                  />
                                </div>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Reason / Policy Explanation
                                </label>
                                <input
                                  type="text"
                                  value={depositReason}
                                  onChange={e => setDepositReason(e.target.value)}
                                  placeholder="e.g. 50% advance for customized crafted items"
                                  className={`${inputCls} bg-white`}
                                />
                              </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <span className="text-[10px] font-bold text-ash uppercase tracking-wider">Presets:</span>
                              {[20, 30, 50, 70].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setDepositPercentage(pct)}
                                  className={`px-3 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                    depositPercentage === pct
                                      ? 'bg-ink text-white border-ink'
                                      : 'bg-white text-ash border-dove/20 hover:text-ink'
                                  }`}
                                >
                                  {pct}% Advance
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SCENARIO 4: High-Value Orders Only */}
                        {depositRuleType === 'high_value_only' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  High Value Threshold (৳ BDT)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash text-xs font-mono font-bold">৳</span>
                                  <input
                                    type="number"
                                    min={500}
                                    value={highValueThreshold}
                                    onChange={e => setHighValueThreshold(Number(e.target.value) || 0)}
                                    placeholder="3000"
                                    className={`${inputCls} pl-8 font-mono font-semibold bg-white`}
                                  />
                                </div>
                                <p className="text-[10px] text-ash mt-1">Orders below this amount remain 100% Cash on Delivery</p>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                                  Required Advance Deposit (৳ BDT)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash text-xs font-mono font-bold">৳</span>
                                  <input
                                    type="number"
                                    min={50}
                                    value={highValueDepositAmount}
                                    onChange={e => setHighValueDepositAmount(Number(e.target.value) || 0)}
                                    placeholder="500"
                                    className={`${inputCls} pl-8 font-mono font-semibold bg-white`}
                                  />
                                </div>
                                <p className="text-[10px] text-ash mt-1">Required when total bill meets or exceeds threshold</p>
                              </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <span className="text-[10px] font-bold text-ash uppercase tracking-wider">Presets:</span>
                              {[
                                { label: '> ৳2,000 → ৳300 Advance', thr: 2000, dep: 300 },
                                { label: '> ৳3,000 → ৳500 Advance', thr: 3000, dep: 500 },
                                { label: '> ৳5,000 → ৳1,000 Advance', thr: 5000, dep: 1000 },
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setHighValueThreshold(preset.thr);
                                    setHighValueDepositAmount(preset.dep);
                                  }}
                                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                    highValueThreshold === preset.thr && highValueDepositAmount === preset.dep
                                      ? 'bg-ink text-white border-ink'
                                      : 'bg-white text-ash border-dove/20 hover:text-ink'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SCENARIO 5: Custom Policy */}
                        {depositRuleType === 'custom_policy' && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                              Custom Deposit & Prepayment Policy
                            </label>
                            <textarea
                              rows={3}
                              value={depositReason}
                              onChange={e => setDepositReason(e.target.value)}
                              placeholder="e.g. ঢাকা ও চট্টগ্রামে ফুল ক্যাশ অন ডেলিভারি, অন্য সব জেলায় ১৫০ টাকা অগ্রিম প্রযোজ্য।"
                              className={`${inputCls} bg-white resize-none`}
                            />
                            <p className="text-[10px] text-ash">
                              Your AI sales assistant will strictly follow these instructions when taking orders.
                            </p>
                          </div>
                        )}

                      </div>

                      {/* Payment Verification Proofs Accepted */}
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-2">
                          Customer Payment Proof Requirements (Select all that apply)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[
                            { id: 'ss', label: 'Payment Screenshot (SS)', checked: acceptScreenshot, toggle: () => setAcceptScreenshot(v => !v) },
                            { id: 'last3', label: 'Last 3 Digits of Sender Number', checked: acceptLast3Digits, toggle: () => setAcceptLast3Digits(v => !v) },
                            { id: 'trx', label: 'Transaction ID (TrxID)', checked: acceptTrxId, toggle: () => setAcceptTrxId(v => !v) },
                          ].map(proof => (
                            <div
                              key={proof.id}
                              onClick={proof.toggle}
                              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                                proof.checked
                                  ? 'bg-amber-500/[0.08] border-amber-500/40 text-ink'
                                  : 'bg-white border-dove/20 text-ash hover:border-dove/40'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                proof.checked ? 'bg-ink border-ink text-white' : 'border-dove/40 bg-white'
                              }`}>
                                {proof.checked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-semibold">{proof.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Live AI Script Simulation Preview */}
                      <div className="bg-fog rounded-2xl p-4 border border-dove/15 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                            <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                            <span>Live AI Response Preview</span>
                          </div>

                          {/* Simulation Condition Switcher */}
                          {depositRuleType === 'delivery_split' && (
                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-dove/20 text-[10px] font-semibold">
                              <button
                                type="button"
                                onClick={() => setSimLocation('dhaka')}
                                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${simLocation === 'dhaka' ? 'bg-ink text-white' : 'text-ash hover:text-ink'}`}
                              >
                                Inside Dhaka
                              </button>
                              <button
                                type="button"
                                onClick={() => setSimLocation('outside')}
                                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${simLocation === 'outside' ? 'bg-ink text-white' : 'text-ash hover:text-ink'}`}
                              >
                                Outside Dhaka
                              </button>
                            </div>
                          )}

                          {depositRuleType === 'high_value_only' && (
                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-dove/20 text-[10px] font-semibold">
                              <button
                                type="button"
                                onClick={() => setSimLocation('dhaka')}
                                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${simLocation === 'dhaka' ? 'bg-ink text-white' : 'text-ash hover:text-ink'}`}
                              >
                                Order &lt; ৳{highValueThreshold} (COD)
                              </button>
                              <button
                                type="button"
                                onClick={() => setSimLocation('high_val')}
                                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${simLocation === 'high_val' ? 'bg-ink text-white' : 'text-ash hover:text-ink'}`}
                              >
                                Order &ge; ৳{highValueThreshold} (Advance)
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Chat Bubble Simulation */}
                        <div className="bg-white rounded-xl p-3.5 border border-dove/20 shadow-xs flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            ⚡
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-graphite mb-1">DullBot Sales AI</p>
                            <p className="text-xs text-ink leading-relaxed">
                              {(() => {
                                const bkash = bkashNumber || '017XXXXXXXX';
                                const proofs = [];
                                if (acceptScreenshot) proofs.push('স্ক্রিনশট');
                                if (acceptLast3Digits) proofs.push('লাস্ট ৩ ডিজিট');
                                if (acceptTrxId) proofs.push('TrxID');
                                const proofText = proofs.length > 0 ? proofs.join(', ') : 'পেমেন্ট প্রুফ';

                                if (depositRuleType === 'delivery_split') {
                                  if (simLocation === 'dhaka') {
                                    return `জি ভাইয়া, আপনার ঢাকা সিটির অর্ডারের জন্য ডেলিভারি চার্জ ৳${deliveryInsideDhaka} আমাদের বিকাশ/নগদে (${bkash}) অগ্রিম পাঠাতে হবে। পাঠানো হলে ${proofText} জানিয়ে দিন, আমরা অর্ডার সাথে সাথে কনফার্ম করে দিচ্ছি।`;
                                  } else {
                                    return `জি ভাইয়া, ঢাকার বাইরে ডেলিভারির জন্য ডেলিভারি চার্জ ৳${deliveryOutsideDhaka} আমাদের বিকাশ/নগদে (${bkash}) অগ্রিম পাঠাতে হবে। পাঠানো হলে ${proofText} জানিয়ে দিন, আমরা পার্সেল বুক করে দিচ্ছি।`;
                                  }
                                } else if (depositRuleType === 'percentage') {
                                  return `জি ভাইয়া, আমাদের এই কাস্টম অর্ডারের জন্য মোট বিলের ${depositPercentage}% বিকাশ/নগদে (${bkash}) অগ্রিম পাঠাতে হবে। পাঠানো হলে ${proofText} দিন, আমরা প্রোডাকশন শুরু করছি।`;
                                } else if (depositRuleType === 'high_value_only') {
                                  if (simLocation === 'high_val') {
                                    return `জি ভাইয়া, যেহেতু আপনার মোট অর্ডার ৳${highValueThreshold} টাকার বেশি, তাই বুকিং কনফার্ম করতে ৳${highValueDepositAmount} অগ্রিম বিকাশ/নগদে (${bkash}) পাঠাতে হবে। পাঠানোর পর ${proofText} জানান।`;
                                  } else {
                                    return `জি ভাইয়া, আপনার অর্ডারটি ক্যাশ অন ডেলিভারিতে (Cash on Delivery) কনফার্ম করা হয়েছে। পার্সেল হাতে পেয়ে মূল্য পরিশোধ করতে পারবেন।`;
                                  }
                                } else if (depositRuleType === 'custom_policy') {
                                  return `জি ভাইয়া, আমাদের পলিসি অনুযায়ী "${depositReason}" এর জন্য বিকাশ/নগদে (${bkash}) টাকা পাঠিয়ে ${proofText} জানান, অর্ডার কনফার্ম করে দিচ্ছি।`;
                                } else {
                                  return `জি ভাইয়া, আপনার অর্ডারটি কনফার্ম করতে ${depositReason || 'বুকিং ডিপোজিট'} ৳${fixedDepositAmount} বিকাশ/নগদে (${bkash}) অগ্রিম পাঠাতে হবে। পাঠানো হলে ${proofText} জানিয়ে দিন।`;
                                }
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Merchant API & Real-time Verification */}
            <SettingsCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-fog rounded-xl text-graphite flex-shrink-0"><ShieldCheck className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Automated Transaction Verification</h4>
                  <p className="text-[11px] text-ash">Verify bKash & Nagad payments in real-time without manual checking</p>
                </div>
              </div>

              <select
                value={paymentVerificationMethod}
                onChange={e => setPaymentVerificationMethod(e.target.value as any)}
                className={`${inputCls} mb-5`}
              >
                <option value="none">Manual Checking (Operator verifies SMS / Statement)</option>
                <option value="merchant_api">Merchant API (Direct bKash / Nagad API verification)</option>
                <option value="notification_app">Android Companion App (Real-time SMS notification tunnel)</option>
              </select>

              {paymentVerificationMethod === 'merchant_api' && (
                <div className="space-y-6 border-t border-dove/10 pt-5">
                  <div className="bg-[#E2136E]/[0.02] p-4 rounded-xl border border-[#E2136E]/20 space-y-3">
                    <h4 className="text-xs font-bold text-[#E2136E] uppercase tracking-wider">bKash Merchant Credentials</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" value={bkashAppKey} onChange={e => setBkashAppKey(e.target.value)} placeholder="bKash App Key" className={inputCls} />
                      <input type="password" value={bkashAppSecret} onChange={e => setBkashAppSecret(e.target.value)} placeholder="bKash App Secret" className={inputCls} />
                      <input type="text" value={bkashUsername} onChange={e => setBkashUsername(e.target.value)} placeholder="bKash API Username" className={inputCls} />
                      <input type="password" value={bkashPassword} onChange={e => setBkashPassword(e.target.value)} placeholder="bKash API Password" className={inputCls} />
                    </div>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input type="checkbox" checked={bkashSandbox} onChange={e => setBkashSandbox(e.target.checked)} className="rounded text-ink focus:ring-ink" />
                      <span className="text-xs text-ash font-medium">Enable Sandbox Mode (Test Transactions)</span>
                    </label>
                  </div>

                  <div className="bg-[#F7941D]/[0.02] p-4 rounded-xl border border-[#F7941D]/20 space-y-3">
                    <h4 className="text-xs font-bold text-[#F7941D] uppercase tracking-wider">Nagad Merchant Credentials</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <input type="text" value={nagadMerchantId} onChange={e => setNagadMerchantId(e.target.value)} placeholder="Nagad Merchant ID" className={inputCls} />
                      <textarea value={nagadPrivateKey} onChange={e => setNagadPrivateKey(e.target.value)} placeholder="Nagad Private Key (PEM format)" rows={2} className={`${inputCls} resize-none font-mono text-[11px]`} />
                      <textarea value={nagadPublicKey} onChange={e => setNagadPublicKey(e.target.value)} placeholder="Nagad Public Key (PEM format)" rows={2} className={`${inputCls} resize-none font-mono text-[11px]`} />
                    </div>
                  </div>
                </div>
              )}

              {paymentVerificationMethod === 'notification_app' && (
                <div className="border-t border-dove/10 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-ink">Android Companion App Pairing</h4>
                  <div className="p-4 bg-fog rounded-2xl border border-dove/20 flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl shadow-xs shrink-0 flex flex-col items-center justify-center">
                      <QRCodeSVG
                        value={JSON.stringify({
                          url: typeof window !== 'undefined' ? window.location.origin : 'https://dullbot.vercel.app',
                          code: '718087',
                          shop_id: shop?.id,
                          shop_name: shop?.name || 'DullBot Shop'
                        })}
                        size={110}
                        level="M"
                      />
                      <span className="text-[9px] font-bold text-ash mt-1 uppercase tracking-wider">Scan in App</span>
                    </div>
                    <div className="flex-1 space-y-2 text-left">
                      <p className="text-xs text-graphite font-medium leading-relaxed">
                        Install the DullBot Android Companion app on your payment SIM phone and scan this code to enable automatic SMS payment verification.
                      </p>
                      <div className="p-3 bg-white border border-dove/20 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                        <span className="text-xs text-ash font-medium">Relay Status:</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-0.5">
                          ● Encrypted Relay Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SettingsCard>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 5 — COURIER & LOGISTICS
            ══════════════════════════════════════════════════ */}
        {isTabVisible('courier') && (
          <section id="section-courier" className="space-y-3">
            <SectionLabel subtitle="Connect Pathao, Steadfast, RedX, Paperfly, or eCourier for 1-click consignment creation.">
              Courier & Delivery Logistics
            </SectionLabel>

            <SettingsCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-fog rounded-xl text-graphite flex-shrink-0"><Truck className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Primary Courier Service</h4>
                  <p className="text-[11px] text-ash">Automate consignment generation and tracking ID sync</p>
                </div>
              </div>

              <select
                value={courierProvider}
                onChange={e => setCourierProvider(e.target.value)}
                className={`${inputCls} mb-5`}
              >
                <option value="none">None (Manual Booking / Direct Handover)</option>
                <option value="pathao">Pathao Courier</option>
                <option value="steadfast">Steadfast Courier</option>
                <option value="redx">RedX Delivery</option>
                <option value="paperfly">Paperfly</option>
                <option value="ecourier">eCourier</option>
              </select>

              {courierProvider !== 'none' && (
                <div className="border-t border-dove/10 pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-ink capitalize">{courierProvider} API Credentials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(courierProvider === 'pathao' || courierProvider === 'ecourier') && (
                      <>
                        <input type="text" value={courierClientId} onChange={e => setCourierClientId(e.target.value)} placeholder="Client ID / API Key" className={inputCls} />
                        <input type="password" value={courierClientSecret} onChange={e => setCourierClientSecret(e.target.value)} placeholder="Client Secret" className={inputCls} />
                        <input type="text" value={courierUsername} onChange={e => setCourierUsername(e.target.value)} placeholder="Username / Registered Email" className={inputCls} />
                        <input type="password" value={courierPassword} onChange={e => setCourierPassword(e.target.value)} placeholder="Password" className={inputCls} />
                        <input type="text" value={courierStoreId} onChange={e => setCourierStoreId(e.target.value)} placeholder="Warehouse / Store ID" className={`${inputCls} md:col-span-2`} />
                      </>
                    )}
                    {(courierProvider === 'steadfast' || courierProvider === 'redx' || courierProvider === 'paperfly') && (
                      <>
                        <input type="text" value={courierApiKey} onChange={e => setCourierApiKey(e.target.value)} placeholder="API Key / Token" className={`${inputCls} md:col-span-2`} />
                        {courierProvider === 'paperfly' && (
                          <>
                            <input type="text" value={courierUsername} onChange={e => setCourierUsername(e.target.value)} placeholder="Paperfly Username" className={inputCls} />
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
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 6 — INVOICE & RECEIPT CUSTOMIZER
            ══════════════════════════════════════════════════ */}
        {isTabVisible('receipts') && (
          <section id="section-receipts" className="space-y-3">
            <SectionLabel subtitle="Configure full-color A4 invoices and 80mm thermal receipt formats for printing.">
              Receipt & Invoice Customization
            </SectionLabel>

            <SettingsCard>
              <ReceiptCustomizerSection
                shopName={shopName || shop?.name || 'Dull Store'}
                shopPhone={bkashNumber || shop?.bkash_number || '+880 1700-000000'}
                shopAddress={deliveryAreas || shop?.location_address || 'Dhaka, Bangladesh'}
                shopLogo={logoUrl}
              />
            </SettingsCard>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 7 — STAFF & PERMISSIONS (RBAC)
            ══════════════════════════════════════════════════ */}
        {isTabVisible('staff') && (
          <section id="section-staff" className="space-y-3">
            <SectionLabel subtitle="Manage team members, assign custom role designations, and control module permissions.">
              Team & Staff Management
            </SectionLabel>
            <StaffManagementSection shopId={shop.id} isOwner={shop.isOwner !== false} />
          </section>
        )}


        {/* ── WHATSAPP API CONFIGURATION MODAL ── */}
        <AnimatePresence>
          {showWaModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="bg-white rounded-2xl border border-dove/20 shadow-2xl w-full max-w-lg p-6 text-ink space-y-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-ink">WhatsApp Cloud API Setup</h3>
                      <p className="text-xs text-ash">Enter your Meta for Developers Cloud credentials.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWaModal(false)}
                    className="text-ash hover:text-ink p-1 rounded-lg hover:bg-fog transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1708479923601722"
                      value={waWabaId}
                      onChange={e => setWaWabaId(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1186729607864971"
                      value={waPhoneId}
                      onChange={e => setWaPhoneId(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">
                      System User Permanent Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="EAAG..."
                      value={waToken}
                      onChange={e => setWaToken(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Webhook Callback Info Box */}
                  <div className="bg-fog p-3.5 rounded-xl border border-dove/20 text-xs space-y-1.5">
                    <p className="font-bold text-ink text-[11px]">Webhook Setup in Meta Dashboard:</p>
                    <div className="text-[10px] font-mono text-graphite bg-white p-2 rounded-lg border border-dove/15 select-all">
                      Callback URL: https://dullbot.vercel.app/api/webhooks/whatsapp
                    </div>
                    <div className="text-[10px] font-mono text-graphite bg-white p-2 rounded-lg border border-dove/15 select-all">
                      Verify Token: dullbot_verify_token
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-dove/10">
                  <button
                    onClick={() => setShowWaModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-ash hover:text-ink transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWhatsApp}
                    disabled={isWaSaving}
                    className="px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isWaSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : waSavedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                    <span>{waSavedSuccess ? 'Saved Successfully!' : isWaSaving ? 'Saving…' : 'Save WhatsApp API'}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Page Selection Modal for Multi-Page Facebook & Instagram Connections ── */}
        <AnimatePresence>
          {showPagePicker && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} className="bg-white rounded-2xl border border-dove/20 shadow-xl w-full max-w-lg p-6 text-ink">

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-ink mb-1">Choose Facebook Pages & Instagram Accounts</h3>
                    <p className="text-xs text-ash leading-relaxed">Select which Facebook Pages and Instagram accounts DullBot should manage.</p>
                  </div>
                  <button onClick={() => setShowPagePicker(false)} className="text-ash hover:text-ink p-1 rounded-lg hover:bg-fog transition-colors shrink-0 ml-3"><X className="w-4 h-4" /></button>
                </div>

                {pageError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-rust font-medium">{pageError}</div>
                )}

                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-0.5">
                  {availablePages.map((pg) => {
                    const isSelected = selectedPageIds.has(pg.id);
                    return (
                      <button
                        key={pg.id}
                        onClick={() => {
                          const next = new Set(selectedPageIds);
                          if (next.has(pg.id)) next.delete(pg.id);
                          else next.add(pg.id);
                          setSelectedPageIds(next);
                        }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-ink bg-fog'
                            : 'border-dove/20 hover:bg-fog/50 hover:border-dove/40'
                        }`}
                      >
                        <div className={`flex items-center justify-center shrink-0 transition-all w-4 h-4 rounded ${
                          isSelected ? 'bg-ink border-ink text-white' : 'border border-dove/40 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink text-sm truncate">{pg.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {pg.instagram_business_id ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-pink-50 border border-pink-200 text-[10px] font-bold text-pink-700">
                                <AtSign className="w-2.5 h-2.5" /> Instagram Linked
                              </span>
                            ) : (
                              <span className="text-[10px] text-ash">No Instagram linked</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-dove/10 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-ash font-medium">
                    {selectedPageIds.size === 0 ? 'Select at least one Page' : `${selectedPageIds.size} Page${selectedPageIds.size > 1 ? 's' : ''} selected`}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setShowPagePicker(false)} className="px-4 py-2 text-xs font-medium text-ash hover:text-ink transition-colors">Cancel</button>
                    <button
                      onClick={async () => {
                        setSavingPages(true);
                        try {
                          const pagesToSave = availablePages.filter(p => selectedPageIds.has(p.id));
                          await selectPagesMeta(shop.id, pagesToSave);
                          setShowPagePicker(false);
                          const pages = await getConnectedPages(shop.id);
                          setConnectedPages(pages);
                        } catch (err: any) {
                          setPageError(err?.message || 'Failed to connect pages.');
                        } finally {
                          setSavingPages(false);
                        }
                      }}
                      disabled={savingPages || selectedPageIds.size === 0}
                      className="px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingPages ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : `Save & Connect (${selectedPageIds.size})`}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Confirmation Toast */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/20"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Workspace Settings successfully updated!</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

