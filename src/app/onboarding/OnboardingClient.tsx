'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  ShoppingBag, 
  Calendar, 
  Building2, 
  Check, 
  Search, 
  Plus, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  X,
  Palette
} from 'lucide-react';
import { saveBusinessType, saveOnboardingProfileAndTone } from '../dashboard/actions';
import { BD_DISTRICTS } from '@/lib/districts';

// Reference category suggestions per business type (never gating, custom entry always enabled)
const RETAIL_CATEGORIES = [
  'Fashion & Apparel',
  'Electronics & Gadgets',
  'Beauty & Cosmetics',
  'Food & Bakery',
  'Home & Living',
  'Jewelry & Accessories',
  'Baby & Kids',
  'Books & Stationery',
  'Sports & Fitness',
];

const SERVICE_CATEGORIES = [
  'Clinic & Healthcare',
  'Salon & Spa',
  'Tutoring & Education',
  'Consulting & Agency',
  'Event Management',
  'Tech Support & Repair',
  'Photography & Studio',
];

const WHOLESALE_CATEGORIES = [
  'Apparel & Textiles',
  'Electronics Components',
  'FMCG & Groceries',
  'Industrial Supplies',
  'Packaging Materials',
  'Construction Materials',
];

const OPERATING_HOUR_PRESETS = [
  '24/7',
  '9:00 AM - 10:00 PM',
  '10:00 AM - 8:00 PM',
];

const VIBE_OPTIONS = [
  {
    id: 'casual',
    label: 'Casual & Friendly',
    desc: 'Friendly, approachable tone using natural everyday conversational language.',
  },
  {
    id: 'warm',
    label: 'Warm & Respectful',
    desc: 'Polite, formal address that builds deep trust with traditional or older customers.',
  },
  {
    id: 'technical',
    label: 'Precise & Technical',
    desc: 'Detail-heavy, spec-focused explanations tailored for technical products.',
  },
  {
    id: 'direct',
    label: 'Direct & Business-like',
    desc: 'No-nonsense, efficient approach focusing on bulk pricing, terms, and direct quotes.',
  },
];

export default function OnboardingClient({ shop }: { shop: any }) {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<'classification' | 'context'>(
    shop.onboarding_steps_done?.includes('classification') ? 'context' : 'classification'
  );

  // Form state
  const [businessType, setBusinessType] = useState<string>(shop.business_type || 'retail');
  
  // Bug fix (Part 2): Do not pre-fill test strings like "Dull Store" for genuine new signups
  const [shopName, setShopName] = useState(() => {
    if (!shop?.name || shop.name === 'Dull Store' || shop.name.startsWith('store-')) {
      return '';
    }
    return shop.name;
  });

  const [category, setCategory] = useState(shop.category || '');
  const [categorySearch, setCategorySearch] = useState(shop.category || '');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Operating Hours
  const [operatingPreset, setOperatingPreset] = useState<string>(() => {
    if (!shop.operating_hours) return '24/7';
    if (OPERATING_HOUR_PRESETS.includes(shop.operating_hours)) return shop.operating_hours;
    return 'custom';
  });
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('20:00');

  // Delivery Areas
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
  const [vibe, setVibe] = useState<'casual' | 'warm' | 'technical' | 'direct'>(
    shop.tone_template || 'casual'
  );

  const [isLoading, setIsLoading] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setIsDistrictDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter category suggestions
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

  // Filter districts
  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return BD_DISTRICTS;
    const query = districtSearch.toLowerCase();
    return BD_DISTRICTS.filter(d => d.toLowerCase().includes(query));
  }, [districtSearch]);

  const handleSelectType = async (type: string) => {
    setIsLoading(true);
    setBusinessType(type);

    const defaultCat = 
      type === 'service' ? SERVICE_CATEGORIES[0] :
      type === 'wholesale' ? WHOLESALE_CATEGORIES[0] :
      RETAIL_CATEGORIES[0];
    
    if (!category) {
      setCategory(defaultCat);
      setCategorySearch(defaultCat);
    }

    const res = await saveBusinessType(shop.id, type);
    setIsLoading(false);

    if (res.success) {
      setStep('context');
    } else {
      alert(res.error || 'Failed to save business type.');
    }
  };

  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessOverview.trim()) {
      alert('Please describe your business in the overview section.');
      return;
    }

    // Resolve operating hours string
    let finalHours = operatingPreset;
    if (operatingPreset === 'custom') {
      finalHours = `${customStartTime} - ${customEndTime}`;
    }

    // Resolve delivery areas string
    let finalDelivery = deliveryPreset;
    if (deliveryPreset === 'custom') {
      finalDelivery = selectedDistricts.length > 0 ? selectedDistricts.join(', ') : 'Nationwide';
    }

    const finalCategory = category || categorySearch || 'General';

    setIsLoading(true);
    try {
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
    setSelectedDistricts(prev => 
      prev.includes(d) ? prev.filter(item => item !== d) : [...prev, d]
    );
  };

  return (
    <div className="min-h-screen bg-fog flex flex-col items-center justify-start sm:justify-center py-6 px-4 select-none font-sans">
      {/* Outer Card Container */}
      <div className="max-w-[760px] w-full bg-white rounded-cards shadow-subtle border border-dove/15 p-6 sm:p-8 flex flex-col my-auto">
        
        {/* Header Branding (Clean & Compact) */}
        <div className="flex flex-col items-center text-center mb-5 border-b border-dove/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl sm:text-3xl tracking-tight text-ink font-light">
              dull<span className="font-normal font-sans text-lg sm:text-xl text-ash">bot.</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rust animate-pulse" />
          </div>
          <p className="text-[11px] sm:text-xs text-ash mt-0.5">Configure your shop assistant</p>

          {/* Sleek 2-Segment Progress Bar */}
          <div className="w-full max-w-xs flex gap-2 mt-3">
            <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === 'classification' || step === 'context' ? 'bg-rust' : 'bg-dove/20'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === 'context' ? 'bg-rust' : 'bg-dove/20'}`} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'classification' ? (
            <motion.div
              key="step-classification"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Oversized Serif Headline (Part 5) */}
              <h1 className="font-serif text-3xl sm:text-4xl text-ink font-light text-center leading-tight mb-2 tracking-tight">
                What kind of business do you run?
              </h1>
              <p className="text-xs text-ash text-center mb-8 max-w-md mx-auto">
                Select your primary business model so DullBot configures the correct response workflows for you.
              </p>

              {/* Side-by-Side Cards (Part 5) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    id: 'retail',
                    title: 'E-commerce / Retail',
                    desc: 'Physical products, automated checkouts, delivery charges, and inventory levels.',
                    icon: ShoppingBag,
                  },
                  {
                    id: 'service',
                    title: 'Service-Based',
                    desc: 'Consulting, salon slots, booking schedules, and appointment contexts.',
                    icon: Calendar,
                  },
                  {
                    id: 'wholesale',
                    title: 'Wholesale / B2B',
                    desc: 'Bulk quantities, custom price sheets, and direct quote generation.',
                    icon: Building2,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = businessType === item.id;
                  return (
                    <button
                      key={item.id}
                      disabled={isLoading}
                      onClick={() => handleSelectType(item.id)}
                      className={`p-6 rounded-cards border text-left flex flex-col justify-between transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group relative ${
                        isSelected
                          ? 'border-2 border-rust bg-apricot-wash/60 shadow-subtle -translate-y-1 scale-[1.02]'
                          : 'border-dove/20 bg-white hover:border-ink/30 hover:bg-fog/60 hover:-translate-y-1 hover:shadow-subtle'
                      }`}
                    >
                      <div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors ${
                          isSelected ? 'bg-rust text-white' : 'bg-fog text-rust group-hover:bg-rust group-hover:text-white'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm text-ink mb-1.5">{item.title}</h3>
                        <p className="text-xs text-ash leading-relaxed">{item.desc}</p>
                      </div>

                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-dove/10">
                        <span className="text-[11px] font-medium text-rust group-hover:underline">
                          Select business &rarr;
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-rust text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-context"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <div className="mb-2">
                <button 
                  onClick={() => setStep('classification')} 
                  className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to business type
                </button>
              </div>

              {/* Serif Headline */}
              <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">
                Tell us about your business
              </h1>
              <p className="text-xs text-ash mb-4">
                Provide details about your brand and select your AI agent&apos;s tone of voice.
              </p>

              <form onSubmit={handleSaveContext} className="flex flex-col gap-4">
                
                {/* Business Overview */}
                <div className="bg-fog/50 p-4 rounded-cards border border-dove/15">
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Business Overview *
                  </label>
                  <textarea
                    rows={3}
                    value={businessOverview}
                    required
                    onChange={(e) => setBusinessOverview(e.target.value)}
                    className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink resize-none transition-colors"
                    placeholder="Handcrafted Bangladeshi boutique selling traditional jamsani and cotton kurtis..."
                  />
                </div>

                {/* Core Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Business Name (Part 2 fix: empty by default with placeholder) */}
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={shopName}
                      required
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink transition-colors"
                      placeholder="e.g. Dull Store or Artisan Crafters"
                    />
                  </div>

                  {/* Open-Ended Category Search (Part 3) */}
                  <div className="relative" ref={categoryRef}>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Category *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          setCategory(e.target.value);
                          setIsCategoryOpen(true);
                        }}
                        onFocus={() => setIsCategoryOpen(true)}
                        className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink transition-colors pr-8"
                        placeholder="Type or search category..."
                      />
                      <Search className="w-3.5 h-3.5 text-ash absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {/* Live filtered suggestion dropdown */}
                    {isCategoryOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-dove/20 rounded-inputs shadow-subtle max-h-48 overflow-y-auto p-1">
                        {filteredCategories.map((catItem) => (
                          <button
                            key={catItem}
                            type="button"
                            onClick={() => {
                              setCategory(catItem);
                              setCategorySearch(catItem);
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-apricot-wash/50 flex items-center justify-between ${
                              category === catItem ? 'font-semibold text-rust bg-apricot-wash/30' : 'text-ink'
                            }`}
                          >
                            <span>{catItem}</span>
                            {category === catItem && <Check className="w-3 h-3 text-rust" />}
                          </button>
                        ))}

                        {/* Always-visible custom entry option (Part 3) */}
                        {categorySearch.trim() && !filteredCategories.includes(categorySearch.trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCategory(categorySearch.trim());
                              setIsCategoryOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-rust hover:bg-apricot-wash/50 border-t border-dove/10 flex items-center gap-1.5 mt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add &quot;{categorySearch.trim()}&quot; as custom category</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operating Hours (Part 4: structured presets + custom time range picker) */}
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rust" /> Operating Hours
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {OPERATING_HOUR_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setOperatingPreset(preset)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                            operatingPreset === preset
                              ? 'border-rust bg-apricot-wash text-rust font-semibold'
                              : 'border-dove/25 bg-white text-ash hover:border-ink'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOperatingPreset('custom')}
                        className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                          operatingPreset === 'custom'
                            ? 'border-rust bg-apricot-wash text-rust font-semibold'
                            : 'border-dove/25 bg-white text-ash hover:border-ink'
                        }`}
                      >
                        Custom Range...
                      </button>
                    </div>

                    {operatingPreset === 'custom' && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="time"
                          value={customStartTime}
                          onChange={(e) => setCustomStartTime(e.target.value)}
                          className="text-xs border border-dove/25 rounded px-2 py-1 bg-white"
                        />
                        <span className="text-xs text-ash">to</span>
                        <input
                          type="time"
                          value={customEndTime}
                          onChange={(e) => setCustomEndTime(e.target.value)}
                          className="text-xs border border-dove/25 rounded px-2 py-1 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Delivery Areas (Part 4: presets + custom district multi-select reusing BD_DISTRICTS) */}
                  <div className="relative" ref={districtRef}>
                    <label className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rust" /> Delivery Areas
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['Nationwide', 'Dhaka Only'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDeliveryPreset(preset)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                            deliveryPreset === preset
                              ? 'border-rust bg-apricot-wash text-rust font-semibold'
                              : 'border-dove/25 bg-white text-ash hover:border-ink'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryPreset('custom');
                          setIsDistrictDropdownOpen(true);
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                          deliveryPreset === 'custom'
                            ? 'border-rust bg-apricot-wash text-rust font-semibold'
                            : 'border-dove/25 bg-white text-ash hover:border-ink'
                        }`}
                      >
                        Custom Districts ({selectedDistricts.length})...
                      </button>
                    </div>

                    {/* District Multi-Select Dropdown */}
                    {deliveryPreset === 'custom' && isDistrictDropdownOpen && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-dove/20 rounded-inputs shadow-subtle p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-ink">Select Delivery Districts</span>
                          <button 
                            type="button" 
                            onClick={() => setIsDistrictDropdownOpen(false)}
                            className="text-ash hover:text-ink"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={districtSearch}
                          onChange={(e) => setDistrictSearch(e.target.value)}
                          placeholder="Search districts..."
                          className="w-full text-xs border border-dove/25 rounded px-2.5 py-1.5 mb-2 focus:outline-none"
                        />
                        <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-1 pr-1">
                          {filteredDistricts.map((d) => {
                            const isChecked = selectedDistricts.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleDistrict(d)}
                                className={`text-left px-2 py-1 text-[11px] rounded flex items-center justify-between ${
                                  isChecked ? 'bg-apricot-wash/50 text-rust font-medium' : 'hover:bg-fog text-ink'
                                }`}
                              >
                                <span>{d}</span>
                                {isChecked && <Check className="w-3 h-3 text-rust" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Vibe Selection & Copy Rule (Part 1: zero internal codenames in user-facing copy) */}
                <div className="bg-fog/40 p-5 rounded-cards border border-dove/15">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-rust" />
                    <div>
                      <h3 className="text-xs font-semibold text-ink">Brand Vibe &amp; Tone</h3>
                      <p className="text-[11px] text-ash">
                        Select the tone DullBot will use when responding to customers. This automatically maps to your AI Tuning persona.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VIBE_OPTIONS.map((v) => {
                      const isSelected = vibe === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVibe(v.id as any)}
                          className={`p-3.5 rounded-inputs border text-left flex flex-col justify-between transition-all duration-200 ${
                            isSelected
                              ? 'border-2 border-rust bg-apricot-wash/60 ring-1 ring-rust/10 shadow-sm'
                              : 'border-dove/20 bg-white hover:border-ink/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-ink">{v.label}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-rust text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-ash leading-relaxed">{v.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors shadow-subtle disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving workspace...
                    </>
                  ) : (
                    <>
                      Save and launch <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
