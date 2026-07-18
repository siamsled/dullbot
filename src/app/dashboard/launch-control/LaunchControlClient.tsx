'use client';

import { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Activity, 
  MessageSquareText, 
  Package, 
  Users, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Lock, 
  Smartphone, 
  Sparkles,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveBusinessType, saveOnboardingProfileAndTone, completeOnboarding } from '../actions';

export default function LaunchControlClient({ shop: initialShop, productCount }: { shop: any; productCount: number }) {
  const [shop, setShop] = useState(initialShop);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const router = useRouter();

  // Form states for Step 4 (Profile & Tone)
  const [shopName, setShopName] = useState(shop.name || '');
  const [aiInstructions, setAiInstructions] = useState(shop.ai_instructions || '');
  const [toneTemplate, setToneTemplate] = useState<'casual' | 'formal' | 'technical' | 'wholesale'>('casual');
  const [isSavingTone, setIsSavingTone] = useState(false);

  // bKash payments setup state (Step 5)
  const [bkashNumber, setBkashNumber] = useState(shop.bkash_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'none' | 'notification_app' | 'merchant_api'>(shop.payment_verification_method || 'none');
  const [isSavingPayments, setIsSavingPayments] = useState(false);

  const [isLaunching, setIsLaunching] = useState(false);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const stepsDone = shop.onboarding_steps_done || [];
  const isClassificationDone = stepsDone.includes('classification');

  // If Business Classification is not completed yet (Step 1)
  if (!isClassificationDone) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-pure-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-white rounded-cards shadow-subtle border border-dove/10 p-10 flex flex-col items-center text-center"
        >
          <span className="w-14 h-14 bg-apricot-wash rounded-full flex items-center justify-center text-rust text-2xl mb-6 shadow-sm">🎯</span>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-3">Welcome to DullBot</h1>
          <p className="text-ash text-sm mb-8 leading-relaxed">
            Let's get your store set up. First, what kind of business do you run? This helps us configure the right automated checkout flows for your customers.
          </p>
          
          <div className="grid grid-cols-1 gap-4 w-full">
            {[
              { id: 'retail', title: 'E-commerce / Retail', desc: 'Manage inventory, variants, shipping, and automated product checkout suggestions.' },
              { id: 'service', title: 'Service-Based', desc: 'Appointments, clinic time slots, or tutoring package schedules.' },
              { id: 'wholesale', title: 'Wholesale / B2B', desc: 'Bulk order sheets, price tiers, and custom quotes.' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={async () => {
                  const res = await saveBusinessType(shop.id, type.id);
                  if (res.success) {
                    setShop((prev: any) => ({
                      ...prev,
                      business_type: type.id,
                      onboarding_steps_done: [...(prev.onboarding_steps_done || []), 'classification']
                    }));
                  } else {
                    alert(res.error);
                  }
                }}
                className="flex flex-col items-start p-5 rounded-inputs border border-dove/20 hover:border-ink hover:bg-fog transition-all text-left group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-ink group-hover:text-rust transition-colors">{type.title}</span>
                  <span className="text-xs text-ash group-hover:text-ink font-medium">Select &rarr;</span>
                </div>
                <p className="text-xs text-ash leading-relaxed">{type.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Onboarding Checklist Steps checks
  const isCatalogDone = productCount > 0;
  const isMetaDone = shop.meta_page_access_token !== null;
  const isProfileToneDone = stepsDone.includes('profile_tone');
  const isPaymentsDone = shop.bkash_number !== null && shop.payment_verification_method !== 'none';
  const isCourierDone = shop.courier_provider !== null;

  const checklistItems = [
    { id: 1, name: 'Business Classification', isDone: true, type: 'classification' },
    { id: 2, name: 'Catalog Setup (Add at least 1 product)', isDone: isCatalogDone, type: 'catalog', link: '/dashboard/inventory', desc: 'Add product models, variants, and base stock so DullBot can lookup inventory and suggest products in chat.' },
    { id: 3, name: 'Connect Facebook Page', isDone: isMetaDone, type: 'meta', link: '/dashboard/settings', desc: 'Hook up page access token so DullBot can receive messages and reply to customer inquiries.' },
    { id: 4, name: 'Brand Profile & Tone', isDone: isProfileToneDone, type: 'profile_tone', desc: 'Set up your business name, context instructions, and select a predefined Bangla agent persona matching your brand tone.' },
    { id: 5, name: 'Payments & Android Companion app', isDone: isPaymentsDone, type: 'payments', desc: 'Enter your bKash/Nagad numbers, choose verification mode, and download the notification app to auto-verify payments.' },
    { id: 6, name: 'Courier Integration', isDone: isCourierDone, type: 'courier', link: '/dashboard/settings', desc: 'Link Steadfast, Pathao, or other courier systems for automated shipment creation on payment verification.' },
  ];

  const completedStepsCount = checklistItems.filter(item => item.isDone).length;
  const progressPercent = Math.round((completedStepsCount / checklistItems.length) * 100);
  const isChecklistComplete = completedStepsCount === checklistItems.length;

  const handleSaveTone = async () => {
    setIsSavingTone(true);
    const res = await saveOnboardingProfileAndTone(shop.id, {
      name: shopName,
      aiInstructions: aiInstructions,
      toneTemplate: toneTemplate
    });
    if (res.success) {
      setShop((prev: any) => ({
        ...prev,
        name: shopName,
        ai_instructions: aiInstructions,
        onboarding_steps_done: [...(prev.onboarding_steps_done || []), 'profile_tone']
      }));
      setActiveStep(null);
    } else {
      alert(res.error);
    }
    setIsSavingTone(false);
  };

  const handleSavePayments = async () => {
    setIsSavingPayments(true);
    // Directly update shop settings using standard saveSettings payload format
    const { saveSettings } = await import('../settings/actions');
    const res = await saveSettings(shop.id, {
      confirmationTier: 'light',
      bkashNumber: bkashNumber,
      agentEnabled: shop.agent_enabled,
      paymentVerificationMethod: paymentMethod,
      bkashConfig: {},
      nagadConfig: {},
      courierProvider: shop.courier_provider || '',
      courierConfig: {}
    });

    if (res.success) {
      setShop((prev: any) => ({
        ...prev,
        bkash_number: bkashNumber,
        payment_verification_method: paymentMethod,
        onboarding_steps_done: [...(prev.onboarding_steps_done || []), 'payments']
      }));
      setActiveStep(null);
    } else {
      alert(res.error);
    }
    setIsSavingPayments(false);
  };

  const handleGoLive = async () => {
    setIsLaunching(true);
    const res = await completeOnboarding(shop.id);
    if (res.success) {
      setShop((prev: any) => ({
        ...prev,
        onboarding_complete: true,
        agent_enabled: true
      }));
      // Redirect to live inbox
      router.push('/dashboard/inbox');
    } else {
      alert(res.error);
    }
    setIsLaunching(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="p-6 bg-fog rounded-cards border border-dove/25 shadow-subtle mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-apricot-wash text-rust mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Setup Mode
            </span>
            <h1 className="text-3xl font-serif text-ink tracking-tight">Launch Control</h1>
            <p className="text-ash text-sm mt-1">Configure DullBot before turning on the AI assistant.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-ash uppercase tracking-wider">Progress</p>
              <p className="text-2xl font-serif text-ink font-semibold">{progressPercent}%</p>
            </div>
            <div className="w-32 bg-white h-3 rounded-full overflow-hidden border border-dove/10">
              <div 
                className="bg-rust h-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Interactive Steps List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checklistItems.map((item, idx) => {
            const isExpanded = activeStep === item.id;
            const hasForm = item.id === 4 || item.id === 5;
            const isSpotlight = completedStepsCount === idx;

            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl border p-4 transition-all duration-300 ${
                  item.isDone 
                    ? 'border-green-200 bg-green-50/20' 
                    : isSpotlight 
                      ? 'border-rust ring-1 ring-rust/35 shadow-subtle' 
                      : 'border-dove/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {item.isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${isSpotlight ? 'text-rust' : 'text-dove'}`} />
                    )}
                    <div>
                      <h3 className={`text-sm font-semibold ${item.isDone ? 'text-ink line-through opacity-70' : 'text-ink'}`}>
                        {item.name}
                      </h3>
                      <p className="text-xs text-ash mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {!item.isDone && (
                    <div className="shrink-0 ml-2">
                      {hasForm ? (
                        <button 
                          onClick={() => setActiveStep(isExpanded ? null : item.id)}
                          className="p-1 rounded hover:bg-fog text-ash"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      ) : item.link ? (
                        <Link href={item.link} className="p-1 text-rust hover:text-ink hover:bg-apricot-wash rounded block">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Expanded Step Form: Brand Profile & Tone */}
                {isExpanded && item.id === 4 && (
                  <div className="mt-4 pt-4 border-t border-dove/10 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">Business Name</label>
                      <input 
                        type="text" 
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink font-medium"
                        placeholder="e.g. Dull Store"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">Brand Tone Template</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'casual', label: 'Casual & Easygoing', desc: 'Types in unpolished, quick-reply Bangla' },
                          { id: 'formal', label: 'Formal & Polite', desc: 'Rumi Apa Energy, traditional boutique' },
                          { id: 'technical', label: 'Tech Explainer', desc: 'Imran Gadget Nerd, detail-heavy' },
                          { id: 'wholesale', label: 'Wholesale & Direct', desc: 'Biplob Uncle energy, negotiation-heavy' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setToneTemplate(t.id as any)}
                            className={`p-3 rounded-lg border text-left flex flex-col justify-between h-20 transition-all ${
                              toneTemplate === t.id 
                                ? 'border-rust bg-apricot-wash/35' 
                                : 'border-dove/20 hover:border-ink'
                            }`}
                          >
                            <span className="text-xs font-semibold text-ink">{t.label}</span>
                            <span className="text-[10px] text-ash line-clamp-2 leading-tight">{t.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">Knowledge Base & AI rules</label>
                      <textarea 
                        rows={4}
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                        className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink"
                        placeholder="Add instructions, e.g. 'We deliver in 2 days. No refunds after opening packages.'"
                      />
                    </div>

                    <button
                      onClick={handleSaveTone}
                      disabled={isSavingTone}
                      className="w-full py-2 bg-ink text-pure-white text-xs font-medium rounded-buttons hover:bg-black flex items-center justify-center gap-1.5"
                    >
                      {isSavingTone && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Brand Settings
                    </button>
                  </div>
                )}

                {/* Expanded Step Form: Payments & Android */}
                {isExpanded && item.id === 5 && (
                  <div className="mt-4 pt-4 border-t border-dove/10 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">bKash Personal Number</label>
                      <input 
                        type="text" 
                        value={bkashNumber}
                        onChange={(e) => setBkashNumber(e.target.value)}
                        className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink font-medium"
                        placeholder="e.g. 01712345678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">Payment Verification Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'notification_app', label: 'Android Sync App', desc: 'Scan code to sync Cash-In SMS instantly' },
                          { id: 'none', label: 'Manual Approval', desc: 'Check and confirm bank transactions manually' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`p-3 rounded-lg border text-left flex flex-col justify-between h-20 transition-all ${
                              paymentMethod === m.id 
                                ? 'border-rust bg-apricot-wash/35' 
                                : 'border-dove/20 hover:border-ink'
                            }`}
                          >
                            <span className="text-xs font-semibold text-ink">{m.label}</span>
                            <span className="text-[10px] text-ash line-clamp-2 leading-tight">{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentMethod === 'notification_app' && (
                      <div className="p-4 bg-fog rounded-xl border border-dove/10 flex flex-col items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs font-semibold text-ink flex items-center gap-1.5 justify-center">
                            <Smartphone className="w-4 h-4 text-rust" /> Android Notification Companion App
                          </p>
                          <p className="text-[10px] text-ash mt-1">Scan to download the companion APK on your phone.</p>
                        </div>
                        
                        <svg className="w-24 h-24 border border-dove/25 p-1 rounded bg-white shadow-sm" viewBox="0 0 100 100" fill="currentColor">
                          <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z" />
                          <path d="M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z" />
                          <path d="M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" />
                          <rect x="45" y="5" width="10" height="10" />
                          <rect x="55" y="15" width="5" height="10" />
                          <rect x="45" y="30" width="15" height="5" />
                          <rect x="5" y="45" width="10" height="10" />
                          <rect x="20" y="55" width="15" height="5" />
                          <rect x="40" y="45" width="20" height="20" />
                          <rect x="65" y="45" width="10" height="10" />
                          <rect x="80" y="55" width="15" height="5" />
                          <rect x="45" y="75" width="10" height="15" />
                          <rect x="65" y="75" width="20" height="10" />
                          <rect x="65" y="90" width="30" height="5" />
                        </svg>

                        <a 
                          href="/android-companion-app.apk" 
                          download 
                          className="text-xs text-rust hover:text-ink font-medium underline"
                        >
                          Or download companion APK link directly
                        </a>
                      </div>
                    )}

                    <button
                      onClick={handleSavePayments}
                      disabled={isSavingPayments}
                      className="w-full py-2 bg-ink text-pure-white text-xs font-medium rounded-buttons hover:bg-black flex items-center justify-center gap-1.5"
                    >
                      {isSavingPayments && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Payment Settings
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Go Live button at bottom of checklist */}
        <div className="mt-8 pt-6 border-t border-dove/15 flex justify-end">
          <button
            onClick={handleGoLive}
            disabled={!isChecklistComplete || isLaunching}
            className={`px-6 py-3 rounded-buttons text-sm font-semibold transition-all flex items-center gap-2 ${
              isChecklistComplete 
                ? 'bg-ink text-pure-white hover:bg-black shadow-subtle hover:scale-[1.02]' 
                : 'bg-fog text-dove border border-dove/10 cursor-not-allowed'
            }`}
          >
            {isLaunching && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isChecklistComplete && <Lock className="w-4 h-4" />}
            Go Live & Activate DullBot AI Autopilot
          </button>
        </div>
      </div>
    </div>
  );
}
