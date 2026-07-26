'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, Check, Sparkles, AlertCircle, Clock, MapPin } from 'lucide-react';
import { saveOnboardingProfileAndTone, generateProfileFromFacebook } from '../../dashboard/actions';

const RETAIL_CATEGORIES = ['Fashion & Apparel', 'Electronics & Gadgets', 'Beauty & Cosmetics', 'Food & Bakery', 'Home & Living', 'Jewelry & Accessories', 'Baby & Kids', 'Books & Stationery', 'Sports & Fitness', 'Other'];
const SERVICE_CATEGORIES = ['Clinic & Healthcare', 'Salon & Spa', 'Tutoring & Education', 'Consulting & Agency', 'Event Management', 'Tech Support & Repair', 'Photography & Studio', 'Other'];
const RESTAURANT_CATEGORIES = ['Casual Dining', 'Fine Dining', 'Fast Food', 'Café & Bakery', 'Cloud Kitchen', 'Buffet', 'Other'];
const VIBE_OPTIONS = [
  { id: 'casual', emoji: '😊', label: 'Casual', desc: 'Friendly & approachable' },
  { id: 'warm', emoji: '🙏', label: 'Warm', desc: 'Polite & respectful' },
  { id: 'technical', emoji: '🔬', label: 'Technical', desc: 'Detail & spec-focused' },
  { id: 'direct', emoji: '⚡', label: 'Direct', desc: 'Fast, no-nonsense' },
];

interface Props { shop: any; onNext: () => void; onBack: () => void; }

export default function StepContext({ shop, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState<any>(null);
  const [shopName, setShopName] = useState(() => {
    if (!shop?.name || shop.name === 'Dull Store' || shop.name.startsWith('store-')) return '';
    return shop.name;
  });
  const [category, setCategory] = useState(shop.category || '');
  const [categorySearch, setCategorySearch] = useState(shop.category || '');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [operatingHours, setOperatingHours] = useState(shop.operating_hours || '9:00 AM - 10:00 PM');
  const [deliveryAreas, setDeliveryAreas] = useState(shop.delivery_areas || 'Nationwide');
  const [businessOverview, setBusinessOverview] = useState(shop.business_overview || '');
  const [vibe, setVibe] = useState<'casual' | 'warm' | 'technical' | 'direct'>(shop.tone_template || 'warm');
  const categoryRef = useRef<HTMLDivElement>(null);

  const businessType = shop.business_type || 'retail';
  const referenceCategories = businessType === 'service' ? SERVICE_CATEGORIES : businessType === 'restaurant' ? RESTAURANT_CATEGORIES : RETAIL_CATEGORIES;
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return referenceCategories;
    return referenceCategories.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categorySearch, referenceCategories]);

  useEffect(() => {
    if (!shop.meta_page_id) return;
    setFetching(true);
    generateProfileFromFacebook(shop.id)
      .then((result) => {
        const profile = result.success ? result.profile : null;
        if (profile?.name && (!shopName || shopName === 'My Store')) setShopName(profile.name);
        if (profile?.category && !category) { setCategory(profile.category); setCategorySearch(profile.category); }
        if (profile?.business_overview && !businessOverview) setBusinessOverview(profile.business_overview);
        if (profile) setGeneratedProfile(profile);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessOverview.trim()) return;
    setLoading(true);
    try {
      const res = await saveOnboardingProfileAndTone(shop.id, { name: shopName || 'My Store', category: category || categorySearch || 'General', operatingHours, deliveryAreas, businessOverview, toneTemplate: vibe as any });
      if (res.success) { onNext(); }
      else { alert(res.error || 'Failed to save.'); }
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-800 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400';
  const canContinue = !!(businessOverview.trim() && category);

  return (
    <motion.div key="step-context" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full overflow-hidden">
      {/* Scrollable content with bottom fade hint */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pb-8 pr-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-1">Give your assistant a brand and a voice.</h1>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            {fetching ? <span className="inline-flex items-center gap-1.5 text-blue-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking your Facebook Page…</span>
              : generatedProfile ? <span className="inline-flex items-center gap-1.5 text-green-600"><Sparkles className="w-3.5 h-3.5" /> Pre-filled from your Facebook Page — review and edit.</span>
              : 'Provide details about your brand and choose your AI agent\'s tone.'}
          </p>
          <form id="context-form" onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Overview <span className="text-red-500">*</span></label>
              <textarea rows={3} value={businessOverview} required onChange={(e) => setBusinessOverview(e.target.value)} placeholder="We sell authentic products with fast nationwide delivery. Cash on delivery available across Bangladesh." className={inputCls + ' resize-none'} />
              <p className="text-xs text-slate-400 mt-1">The AI falls back to this when specifics aren&apos;t available.</p>
              {!businessOverview && <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Name <span className="text-red-500">*</span></label>
                <input type="text" value={shopName} required onChange={(e) => setShopName(e.target.value)} placeholder="Your brand" className={inputCls} />
              </div>
              <div className="relative" ref={categoryRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                <input type="text" value={categorySearch} onChange={(e) => { setCategorySearch(e.target.value); setCategory(e.target.value); setIsCategoryOpen(true); }} onFocus={() => setIsCategoryOpen(true)} onBlur={() => setTimeout(() => setIsCategoryOpen(false), 150)} placeholder="Choose a category" className={inputCls} />
                {isCategoryOpen && filteredCategories.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto p-1">
                    {filteredCategories.map((c) => (
                      <button key={c} type="button" onMouseDown={() => { setCategory(c); setCategorySearch(c); setIsCategoryOpen(false); }} className={`w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-blue-50 flex items-center justify-between ${category === c ? 'text-blue-600 font-semibold' : 'text-slate-700'}`}>
                        {c}{category === c && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> Operating Hours</label>
                <input type="text" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="9:00 AM - 10:00 PM" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500" /> Delivery Areas</label>
                <input type="text" value={deliveryAreas} onChange={(e) => setDeliveryAreas(e.target.value)} placeholder="Nationwide / Dhaka Only" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Brand vibe · AI persona</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VIBE_OPTIONS.map((v) => {
                  const isSelected = vibe === v.id;
                  return (
                    <button key={v.id} type="button" onClick={() => setVibe(v.id as any)} className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="text-xl mb-1">{v.emoji}</div>
                      <div className="font-semibold text-xs text-slate-900">{v.label}</div>
                      <div className="text-[11px] text-slate-400 leading-snug">{v.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Scroll fade overlay hint */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent" />
      </div>

      {/* Pinned nav */}
      <div className="flex items-center justify-between pt-3 pb-1 border-t border-slate-100 shrink-0 bg-white z-10">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button type="submit" form="context-form" disabled={loading || !canContinue} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
