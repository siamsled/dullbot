const fs = require('fs');

const oldOnboarding = fs.readFileSync('scratch/old_onboarding.tsx', 'utf-8');

// I will output a fully merged OnboardingClient.tsx
const newOnboarding = `
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Loader2, ShoppingBag, Calendar, Building2, Check, Search, Plus, Clock, MapPin, 
  Sparkles, ArrowRight, ArrowLeft, X, Palette, Facebook, Instagram, MessageCircle, AlertCircle
} from 'lucide-react';
import UiverseGridBackground from '@/components/ui/UiverseGridBackground';
import UiverseInput from '@/components/ui/UiverseInput';
import UiverseLoader from '@/components/ui/UiverseLoader';
import { saveBusinessType, saveOnboardingProfileAndTone, generateProfileFromFacebook } from '../dashboard/actions';
import { BD_DISTRICTS } from '@/lib/districts';

// ... (Constants from old_onboarding)
const RETAIL_CATEGORIES = [
  'Fashion & Apparel', 'Electronics & Gadgets', 'Beauty & Cosmetics', 'Food & Bakery',
  'Home & Living', 'Jewelry & Accessories', 'Baby & Kids', 'Books & Stationery', 'Sports & Fitness',
];
const SERVICE_CATEGORIES = [
  'Clinic & Healthcare', 'Salon & Spa', 'Tutoring & Education', 'Consulting & Agency',
  'Event Management', 'Tech Support & Repair', 'Photography & Studio',
];
const WHOLESALE_CATEGORIES = [
  'Apparel & Textiles', 'Electronics Components', 'FMCG & Groceries',
  'Industrial Supplies', 'Packaging Materials', 'Construction Materials',
];
const OPERATING_HOUR_PRESETS = ['24/7', '9:00 AM - 10:00 PM', '10:00 AM - 8:00 PM'];
const VIBE_OPTIONS = [
  { id: 'casual', label: 'Casual & Friendly', desc: 'Friendly, approachable tone using natural everyday conversational language.' },
  { id: 'warm', label: 'Warm & Respectful', desc: 'Polite, formal address that builds deep trust with traditional or older customers.' },
  { id: 'technical', label: 'Precise & Technical', desc: 'Detail-heavy, spec-focused explanations tailored for technical products.' },
  { id: 'direct', label: 'Direct & Business-like', desc: 'No-nonsense, efficient approach focusing on bulk pricing, terms, and direct quotes.' },
];

export default function OnboardingClient({ shop }: { shop: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'connect' | 'analyzing' | 'review' | 'classification' | 'context'>(
    shop.onboarding_steps_done?.includes('classification') ? 'context' : 'connect'
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [generatedProfile, setGeneratedProfile] = useState<any>(null);
  const [importedProductsCount, setImportedProductsCount] = useState(0);

  // Form state
  const [businessType, setBusinessType] = useState<string>(shop.business_type || 'retail');
  const [shopName, setShopName] = useState(() => {
    if (!shop?.name || shop.name === 'Dull Store' || shop.name.startsWith('store-')) return '';
    return shop.name;
  });
  const [category, setCategory] = useState(shop.category || '');
  const [categorySearch, setCategorySearch] = useState(shop.category || '');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const [operatingPreset, setOperatingPreset] = useState<string>(() => {
    if (!shop.operating_hours) return '24/7';
    if (OPERATING_HOUR_PRESETS.includes(shop.operating_hours)) return shop.operating_hours;
    return 'custom';
  });
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('20:00');

  const [deliveryPreset, setDeliveryPreset] = useState<string>(() => {
    if (!shop.delivery_areas) return 'Nationwide';
    if (['Nationwide', 'Dhaka Only'].includes(shop.delivery_areas)) return shop.delivery_areas;
    return 'custom';
  });
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(() => {
    if (shop.delivery_areas && !['Nationwide', 'Dhaka Only'].includes(shop.delivery_areas)) {
      return shop.delivery_areas.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return ['Dhaka'];
  });
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);

  const [businessOverview, setBusinessOverview] = useState(shop.business_overview || '');
  const [vibe, setVibe] = useState<'casual' | 'warm' | 'technical' | 'direct'>(shop.tone_template || 'casual');

  const [isLoading, setIsLoading] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setIsCategoryOpen(false);
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) setIsDistrictDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const currentStep = searchParams.get('step');
    const err = searchParams.get('error');
    if (err) setErrorMsg('Could not find any Facebook Pages to connect.');
    if (currentStep === 'ai_analysis' && step === 'connect') {
      setStep('analyzing');
      runAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const runAnalysis = async () => {
    try {
      const res = await generateProfileFromFacebook(shop.id);
      if (res.success) {
        setGeneratedProfile(res.profile);
        setImportedProductsCount(res.importedProducts || 0);
        
        // Pre-fill fields
        setShopName(res.profile.name || '');
        setCategory(res.profile.category || '');
        setCategorySearch(res.profile.category || '');
        setBusinessType(res.profile.business_type || 'retail');
        setBusinessOverview(res.profile.business_overview || '');
        setVibe(res.profile.tone_template || 'casual');
        
        if (OPERATING_HOUR_PRESETS.includes(res.profile.operating_hours)) {
          setOperatingPreset(res.profile.operating_hours);
        } else if (res.profile.operating_hours) {
          setOperatingPreset('custom');
          // simple parsing attempt could go here
        }
        
        if (['Nationwide', 'Dhaka Only'].includes(res.profile.delivery_areas)) {
          setDeliveryPreset(res.profile.delivery_areas);
        }

        setStep('review');
      } else {
        setErrorMsg(res.error || 'Failed to analyze page.');
        setStep('classification'); // Fallback
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred.');
      setStep('classification'); // Fallback
    }
  };

  const referenceCategories = useMemo(() => {
    if (businessType === 'service') return SERVICE_CATEGORIES;
    if (businessType === 'wholesale') return WHOLESALE_CATEGORIES;
    return RETAIL_CATEGORIES;
  }, [businessType]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return referenceCategories;
    const query = categorySearch.toLowerCase();
    return referenceCategories.filter(c => c.toLowerCase().includes(query));
  }, [categorySearch, referenceCategories]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return BD_DISTRICTS;
    const query = districtSearch.toLowerCase();
    return BD_DISTRICTS.filter(d => d.toLowerCase().includes(query));
  }, [districtSearch]);

  const handleSelectType = async (type: string) => {
    setBusinessType(type);
    const defaultCat = type === 'service' ? SERVICE_CATEGORIES[0] : type === 'wholesale' ? WHOLESALE_CATEGORIES[0] : RETAIL_CATEGORIES[0];
    if (!category) {
      setCategory(defaultCat);
      setCategorySearch(defaultCat);
    }
    if (step === 'classification') {
      setIsLoading(true);
      const res = await saveBusinessType(shop.id, type);
      setIsLoading(false);
      if (res.success) {
        setStep('context');
      } else {
        alert(res.error || 'Failed to save business type.');
      }
    }
  };

  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessOverview.trim()) {
      alert('Please describe your business in the overview section.');
      return;
    }

    let finalHours = operatingPreset;
    if (operatingPreset === 'custom') finalHours = \`\${customStartTime} - \${customEndTime}\`;

    let finalDelivery = deliveryPreset;
    if (deliveryPreset === 'custom') finalDelivery = selectedDistricts.length > 0 ? selectedDistricts.join(', ') : 'Nationwide';

    const finalCategory = category || categorySearch || 'General';

    setIsLoading(true);
    try {
      if (step === 'review') {
         await saveBusinessType(shop.id, businessType);
      }
      
      const res = await saveOnboardingProfileAndTone(shop.id, {
        name: shopName || 'My Store',
        category: finalCategory,
        operatingHours: finalHours,
        deliveryAreas: finalDelivery,
        businessOverview,
        toneTemplate: vibe,
      });

      setIsLoading(false);
      if (res.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        alert(res.error || 'Failed to save onboarding details.');
      }
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      alert(err.message || 'An error occurred while saving.');
    }
  };

  const toggleDistrict = (d: string) => {
    setSelectedDistricts(prev => prev.includes(d) ? prev.filter(item => item !== d) : [...prev, d]);
  };

  const renderBadge = (field: string) => {
    if (!generatedProfile || !generatedProfile.confidence_flags) return null;
    const flag = generatedProfile.confidence_flags[field];
    if (flag === 'high') {
      return (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold uppercase tracking-widest">
          <Check className="w-3 h-3" /> Auto-filled
        </span>
      );
    }
    if (flag === 'inferred') {
      return (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold uppercase tracking-widest">
          <Sparkles className="w-3 h-3" /> Inferred, please confirm
        </span>
      );
    }
    return null;
  };

  return (
    <UiverseGridBackground variant="grid">
      <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center py-6 px-4 select-none font-sans relative z-10">
      
      <div className="max-w-[760px] w-full bg-white rounded-cards shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col my-auto">
        <div className="flex flex-col items-center text-center mb-5 border-b border-dove/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl sm:text-3xl tracking-tight text-ink font-light">
              dull<span className="font-normal font-sans text-lg sm:text-xl text-ash">bot.</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rust animate-pulse" />
          </div>
          <p className="text-[11px] sm:text-xs text-ash mt-0.5">Configure your shop assistant</p>
          
          {(step === 'classification' || step === 'context') && (
            <div className="w-full max-w-xs flex gap-2 mt-3">
              <div className={\`h-1 flex-1 rounded-full transition-colors duration-300 \${step === 'classification' || step === 'context' ? 'bg-rust' : 'bg-dove/20'}\`} />
              <div className={\`h-1 flex-1 rounded-full transition-colors duration-300 \${step === 'context' ? 'bg-rust' : 'bg-dove/20'}\`} />
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'connect' && (
            <motion.div key="connect" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col">
              <h1 className="font-serif text-3xl sm:text-4xl text-ink font-light text-center leading-tight mb-2 tracking-tight">
                Connect your channels
              </h1>
              <p className="text-xs text-ash text-center mb-8 max-w-md mx-auto">
                DullBot will autonomously learn your business context, operating hours, and tone by reading your Page.
              </p>
              
              <div className="space-y-4 max-w-md mx-auto w-full">
                <a href={\`/api/auth/facebook/login?shopId=\${shop.id}&source=onboarding\`} className="group w-full flex items-center justify-between p-5 bg-white rounded-2xl border-2 border-rust shadow-sm hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Facebook size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-ink">Connect Facebook Page</h3>
                      <p className="text-xs text-ash">Best auto-fill experience</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-rust group-hover:translate-x-1 transition-all" />
                </a>

                <div className="w-full flex items-center justify-between p-5 bg-fog/50 rounded-2xl border-2 border-transparent opacity-75 cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
                      <Instagram size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-ink">Connect Instagram</h3>
                      <p className="text-xs text-ash">Coming soon</p>
                    </div>
                  </div>
                </div>

                <div className="w-full flex items-center justify-between p-5 bg-fog/50 rounded-2xl border-2 border-transparent opacity-75 cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                      <MessageCircle size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-ink">Connect WhatsApp</h3>
                      <p className="text-xs text-ash">Requires manual setup</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 text-center border-t border-dove/20 mt-6">
                  <button onClick={() => setStep('classification')} className="text-xs font-semibold text-ash hover:text-ink underline">
                    Skip and set up manually
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center justify-center">
              <UiverseLoader />
              <p className="mt-8 text-sm font-semibold text-ink animate-pulse">
                Reading your posts and catalog...
              </p>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
              <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">
                Review your workspace
              </h1>
              <p className="text-xs text-ash mb-4">
                DullBot has inferred the following from your Facebook Page. Please confirm and edit where necessary.
              </p>
              
              {importedProductsCount > 0 && (
                <div className="mb-6 bg-apricot-wash text-rust p-4 rounded-xl flex items-start gap-3 border border-rust/20">
                  <ShoppingBag className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Catalog Imported!</h4>
                    <p className="text-xs mt-1 text-rust/80">We found a Facebook Shop and imported {importedProductsCount} products. They are saved as drafts—please review them in your Inventory later.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveContext} className="flex flex-col gap-6">
                
                {/* Business Type Review */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Business Model {renderBadge('business_type')}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { id: 'retail', title: 'Retail' },
                      { id: 'service', title: 'Service' },
                      { id: 'wholesale', title: 'Wholesale' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectType(item.id)}
                        className={\`p-3 rounded-lg border text-left flex items-center justify-between transition-all \${
                          businessType === item.id ? 'border-rust bg-apricot-wash/60 shadow-subtle' : 'border-dove/20 bg-white hover:bg-fog/60'
                        }\`}
                      >
                        <span className="font-semibold text-xs text-ink">{item.title}</span>
                        {businessType === item.id && <Check className="w-3 h-3 text-rust" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid for Name & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Business Name {renderBadge('name')}
                    </label>
                    <input
                      type="text"
                      value={shopName}
                      required
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Category {renderBadge('category')}
                    </label>
                    <input
                      type="text"
                      value={categorySearch}
                      required
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setCategory(e.target.value);
                      }}
                      className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>

                {/* Overview */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Business Overview {renderBadge('business_overview')}
                  </label>
                  <textarea
                    rows={3}
                    value={businessOverview}
                    required
                    onChange={(e) => setBusinessOverview(e.target.value)}
                    className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink resize-none"
                  />
                  {!businessOverview && <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Needs your input</p>}
                </div>

                {/* Vibe Selection */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-2">
                    Brand Vibe &amp; Tone {renderBadge('tone_template')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VIBE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVibe(v.id as any)}
                        className={\`p-3 rounded-inputs border text-left transition-all \${
                          vibe === v.id ? 'border-rust bg-apricot-wash/60' : 'border-dove/20 bg-white'
                        }\`}
                      >
                        <div className="flex justify-between">
                          <span className="text-xs font-bold text-ink">{v.label}</span>
                          {vibe === v.id && <Check className="w-3 h-3 text-rust" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit CTA */}
                <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors mt-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Confirm & Launch</>}
                </button>
              </form>
            </motion.div>
          )}

          {/* ... Manual Classification and Context flows (same as old) ... */}
          {step === 'classification' && (
            <motion.div key="step-classification" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col">
              <h1 className="font-serif text-3xl sm:text-4xl text-ink font-light text-center leading-tight mb-2 tracking-tight">What kind of business do you run?</h1>
              <p className="text-xs text-ash text-center mb-8 max-w-md mx-auto">Select your primary business model so DullBot configures the correct response workflows for you.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'retail', title: 'E-commerce / Retail', desc: 'Physical products, automated checkouts, delivery charges, and inventory levels.', icon: ShoppingBag },
                  { id: 'service', title: 'Service-Based', desc: 'Consulting, salon slots, booking schedules, and appointment contexts.', icon: Calendar },
                  { id: 'wholesale', title: 'Wholesale / B2B', desc: 'Bulk quantities, custom price sheets, and direct quote generation.', icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = businessType === item.id;
                  return (
                    <button key={item.id} disabled={isLoading} onClick={() => handleSelectType(item.id)} className={\`p-6 rounded-cards border text-left flex flex-col justify-between transition-all duration-200 group relative \${isSelected ? 'border-2 border-rust bg-apricot-wash/60 scale-[1.02]' : 'border-dove/20 bg-white hover:bg-fog/60 hover:-translate-y-1'}\`}>
                      <div>
                        <div className={\`w-10 h-10 rounded-full flex items-center justify-center mb-4 \${isSelected ? 'bg-rust text-white' : 'bg-fog text-rust'}\`}><Icon className="w-5 h-5" /></div>
                        <h3 className="font-semibold text-sm text-ink mb-1.5">{item.title}</h3>
                        <p className="text-xs text-ash leading-relaxed">{item.desc}</p>
                      </div>
                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-dove/10">
                        <span className="text-[11px] font-medium text-rust">Select business &rarr;</span>
                        {isSelected && <span className="w-5 h-5 rounded-full bg-rust text-white flex items-center justify-center"><Check className="w-3 h-3" /></span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 'context' && (
             <motion.div key="step-context" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col">
              <div className="mb-2"><button onClick={() => setStep('classification')} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium"><ArrowLeft className="w-3.5 h-3.5" /> Back to business type</button></div>
              <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">Tell us about your business</h1>
              <p className="text-xs text-ash mb-4">Provide details about your brand and select your AI agent's tone of voice.</p>
              
              <form onSubmit={handleSaveContext} className="flex flex-col gap-4">
                <div className="bg-fog/50 p-4 rounded-cards border border-dove/15">
                  <label className="block text-xs font-semibold text-ink mb-1.5">Business Overview *</label>
                  <textarea rows={3} value={businessOverview} required onChange={(e) => setBusinessOverview(e.target.value)} className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink resize-none" placeholder="Handcrafted boutique..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <UiverseInput label="Business Name *" type="text" value={shopName} required onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Dull Store" />
                  </div>
                  <div className="relative" ref={categoryRef}>
                    <UiverseInput label="Category *" type="text" value={categorySearch} onChange={(e) => { setCategorySearch(e.target.value); setCategory(e.target.value); setIsCategoryOpen(true); }} onFocus={() => setIsCategoryOpen(true)} placeholder="Search or enter category..." />
                    {isCategoryOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-dove/20 rounded-inputs shadow-subtle max-h-48 overflow-y-auto p-1">
                        {filteredCategories.map((catItem) => (
                          <button key={catItem} type="button" onClick={() => { setCategory(catItem); setCategorySearch(catItem); setIsCategoryOpen(false); }} className={\`w-full text-left px-3 py-1.5 text-xs rounded flex items-center justify-between \${category === catItem ? 'text-rust bg-apricot-wash/30' : 'text-ink'}\`}>
                            <span>{catItem}</span>{category === catItem && <Check className="w-3 h-3 text-rust" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-rust" /> Operating Hours</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {OPERATING_HOUR_PRESETS.map((preset) => (
                        <button key={preset} type="button" onClick={() => setOperatingPreset(preset)} className={\`px-2.5 py-1 text-[11px] rounded-full border \${operatingPreset === preset ? 'border-rust bg-apricot-wash text-rust' : 'border-dove/25 bg-white text-ash'}\`}>{preset}</button>
                      ))}
                      <button type="button" onClick={() => setOperatingPreset('custom')} className={\`px-2.5 py-1 text-[11px] rounded-full border \${operatingPreset === 'custom' ? 'border-rust bg-apricot-wash text-rust' : 'border-dove/25 bg-white text-ash'}\`}>Custom Range...</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rust" /> Delivery Areas</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['Nationwide', 'Dhaka Only'].map((preset) => (
                        <button key={preset} type="button" onClick={() => setDeliveryPreset(preset)} className={\`px-2.5 py-1 text-[11px] rounded-full border \${deliveryPreset === preset ? 'border-rust bg-apricot-wash text-rust' : 'border-dove/25 bg-white text-ash'}\`}>{preset}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-fog/40 p-5 rounded-cards border border-dove/15">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VIBE_OPTIONS.map((v) => (
                      <button key={v.id} type="button" onClick={() => setVibe(v.id as any)} className={\`p-3.5 rounded-inputs border text-left \${vibe === v.id ? 'border-2 border-rust bg-apricot-wash/60' : 'border-dove/20 bg-white'}\`}>
                        <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-ink">{v.label}</span></div>
                        <span className="text-[11px] text-ash">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons flex items-center justify-center gap-2 mt-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save and launch <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
             </motion.div>
          )}
        </AnimatePresence>

      </div>
      </div>
    </UiverseGridBackground>
  );
}
`;

fs.writeFileSync('src/app/onboarding/OnboardingClient.tsx', newOnboarding);
