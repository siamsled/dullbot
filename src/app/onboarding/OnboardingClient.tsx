'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, BookOpen, Building2, Palette } from 'lucide-react';
import { saveBusinessType, saveOnboardingProfileAndTone } from '../dashboard/actions';

const PERSONAS = [
  { id: 'casual', label: 'Casual & Easygoing', desc: 'Friendly, Bangla-English mix.' },
  { id: 'formal', label: 'Formal & Polite', desc: 'Rumi Apa traditional style.' },
  { id: 'technical', label: 'Tech Explainer', desc: 'Detail-heavy, spec-focused.' },
  { id: 'wholesale', label: 'Wholesale & Direct', desc: 'Negotiation-heavy, straight to point.' },
];

const RETAIL_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Food', 'Home goods', 'Other'];
const SERVICE_CATEGORIES = ['Clinic', 'Salon', 'Tutoring', 'Consulting', 'Other'];
const WHOLESALE_CATEGORIES = ['Apparel', 'Electronics Component', 'FMCG', 'Industrial Supplies', 'Other'];

export default function OnboardingClient({ shop }: { shop: any }) {
  const router = useRouter();
  
  // Resolve starting step: if business classification step is not recorded in metadata, start at classification.
  const [step, setStep] = useState<'classification' | 'context'>(
    shop.onboarding_steps_done?.includes('classification') ? 'context' : 'classification'
  );
  
  const [businessType, setBusinessType] = useState<string>(shop.business_type || 'retail');
  const [shopName, setShopName] = useState(shop.name || '');
  const [category, setCategory] = useState(shop.category || '');
  const [operatingHours, setOperatingHours] = useState(shop.operating_hours || '');
  const [deliveryAreas, setDeliveryAreas] = useState(shop.delivery_areas || '');
  const [businessOverview, setBusinessOverview] = useState(shop.business_overview || '');
  const [toneTemplate, setToneTemplate] = useState<'casual' | 'formal' | 'technical' | 'wholesale'>(
    shop.tone_template || 'casual'
  );
  
  const [isLoading, setIsLoading] = useState(false);

  const categories = 
    businessType === 'service' ? SERVICE_CATEGORIES :
    businessType === 'wholesale' ? WHOLESALE_CATEGORIES :
    RETAIL_CATEGORIES;

  const handleSelectType = async (type: string) => {
    setIsLoading(true);
    setBusinessType(type);
    
    // Set category default if empty
    const currentCategories = 
      type === 'service' ? SERVICE_CATEGORIES :
      type === 'wholesale' ? WHOLESALE_CATEGORIES :
      RETAIL_CATEGORIES;
    setCategory(currentCategories[0]);
    
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

    setIsLoading(true);
    try {
      const res = await saveOnboardingProfileAndTone(shop.id, {
        name: shopName,
        category,
        operatingHours,
        deliveryAreas,
        businessOverview,
        toneTemplate,
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

  return (
    <div className="min-h-screen bg-fog flex flex-col items-center justify-center p-6 select-none">
      {/* Container Card */}
      <div className="max-w-[520px] w-full bg-white rounded-cards shadow-subtle border border-dove/10 p-8 flex flex-col">
        
        {/* Header Branding */}
        <div className="text-center mb-8 border-b border-dove/5 pb-4">
          <span className="font-serif text-3xl tracking-tight text-ink font-light">
            dull<span className="font-normal font-sans text-xl text-ash">bot.</span>
          </span>
          <p className="text-xs text-ash mt-1">Configure your workspace agent</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'classification' ? (
            <motion.div
              key="step-classification"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
            >
              <h2 className="text-lg font-serif font-medium text-ink text-center mb-2">What kind of business do you run?</h2>
              <p className="text-xs text-ash text-center mb-6">
                This helps configure automated response paths and workflows correctly.
              </p>

              <div className="flex flex-col gap-3">
                {[
                  { id: 'retail', title: 'E-commerce / Retail', desc: 'Products, automated checkouts, delivery charges, and inventory levels.' },
                  { id: 'service', title: 'Service-Based', desc: 'Consulting, salon slots, booking schedules, and appointment contexts.' },
                  { id: 'wholesale', title: 'Wholesale / B2B', desc: 'Bulk quantities, custom price sheets, and quote generations.' }
                ].map((type) => (
                  <button
                    key={type.id}
                    disabled={isLoading}
                    onClick={() => handleSelectType(type.id)}
                    className="flex flex-col items-start p-4 rounded-inputs border border-dove/20 hover:border-ink hover:bg-fog transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span className="font-semibold text-sm text-ink group-hover:text-rust transition-colors">{type.title}</span>
                      <span className="text-[10px] text-ash group-hover:text-ink font-medium">Select &rarr;</span>
                    </div>
                    <p className="text-[11px] text-ash leading-relaxed">{type.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-context"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col"
            >
              <div className="mb-4">
                <button 
                  onClick={() => setStep('classification')} 
                  className="text-[11px] text-rust hover:underline font-medium"
                >
                  &larr; Back to business type
                </button>
              </div>

              <h2 className="text-lg font-serif font-medium text-ink mb-1">Business Context</h2>
              <p className="text-xs text-ash mb-6">Explain what you offer and define the chatbot persona.</p>

              <form onSubmit={handleSaveContext} className="flex flex-col gap-5">
                {/* Overview */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-rust" />
                    <span className="text-xs font-semibold text-ink">Business Overview</span>
                  </div>
                  <textarea
                    rows={3}
                    value={businessOverview}
                    required
                    onChange={(e) => setBusinessOverview(e.target.value)}
                    className="w-full text-xs border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink resize-none transition-colors"
                    placeholder="Hand crafted and curated classic bangladeshi style kurti..."
                  />
                </div>

                {/* Grid inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-ash mb-1">Business Name</label>
                    <input
                      type="text"
                      value={shopName}
                      required
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full text-xs border border-dove/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ink transition-colors"
                      placeholder="e.g. Dull Store"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ash mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs border border-dove/25 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-ink transition-colors"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ash mb-1">Operating Hours</label>
                    <input
                      type="text"
                      value={operatingHours}
                      required
                      onChange={(e) => setOperatingHours(e.target.value)}
                      className="w-full text-xs border border-dove/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ink transition-colors"
                      placeholder="e.g. 24/7 or 10am-8pm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ash mb-1">
                      {businessType === 'service' ? 'Service Area' : 'Delivery Areas'}
                    </label>
                    <input
                      type="text"
                      value={deliveryAreas}
                      required
                      onChange={(e) => setDeliveryAreas(e.target.value)}
                      className="w-full text-xs border border-dove/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-ink transition-colors"
                      placeholder={businessType === 'service' ? 'e.g. Dhaka' : 'e.g. Nationwide'}
                    />
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Palette className="w-3.5 h-3.5 text-ink" />
                    <span className="text-xs font-semibold text-ink">Brand &amp; Tone</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PERSONAS.map((p) => (
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors shadow-subtle disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save and launch'
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
