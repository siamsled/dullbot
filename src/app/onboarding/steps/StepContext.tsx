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

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg py-2.5 px-3.5 text-white text-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-white/30';
  const canContinue = !!(businessOverview.trim() && category);

  return (
    <motion.div key="step-context" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex flex-col h-full overflow-hidden">
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pb-8 pr-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">Give your assistant a brand and a voice.</h1>
          <p className="text-sm text-white/60 mb-4 leading-relaxed">
            {fetching ? <span className="inline-flex items-center gap-1.5 text-white/90"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking your Facebook Page…</span>
              : generatedProfile ? <span className="inline-flex items-center gap-1.5 text-emerald-400"><Sparkles className="w-3.5 h-3.5" /> Pre-filled from your Facebook Page — review and edit.</span>
              : 'Provide details about your brand and choose your AI agent\'s tone.'}
          </p>
          <form id="context-form" onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-1.5">Business Overview <span className="text-rose-400">*</span></label>
              <textarea rows={3} value={businessOverview} required onChange={(e) => setBusinessOverview(e.target.value)} placeholder="We sell authentic products with fast nationwide delivery. Cash on delivery available across Bangladesh." className={inputCls + ' resize-none'} />
              <p className="text-xs text-white/40 mt-1">The AI falls back to this when specifics aren&apos;t available.</p>
              {!businessOverview && <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Business Name <span className="text-rose-400">*</span></label>
                <input type="text" value={shopName} required onChange={(e) => setShopName(e.target.value)} placeholder="Your brand" className={inputCls} />
              </div>
              <div className="relative" ref={categoryRef}>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Category <span className="text-rose-400">*</span></label>
                <input type="text" value={categorySearch} onChange={(e) => { setCategorySearch(e.target.value); setCategory(e.target.value); setIsCategoryOpen(true); }} onFocus={() => setIsCategoryOpen(true)} onBlur={() => setTimeout(() => setIsCategoryOpen(false), 150)} placeholder="Choose a category" className={inputCls} />
                {isCategoryOpen && filteredCategories.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[rgba(15,18,28,0.95)] backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl py-1">
                    {filteredCategories.map((c) => (
                      <button key={c} type="button" onMouseDown={() => { setCategory(c); setCategorySearch(c); setIsCategoryOpen(false); }} className="w-full text-left px-3.5 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">{c}</button>
                    ))}
                  </div>
                )}
                {!category && <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Vibe & Tone</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {VIBE_OPTIONS.map((v) => (
                  <button key={v.id} type="button" onClick={() => setVibe(v.id as any)} className={`p-3 rounded-xl border text-left transition-all ${vibe === v.id ? 'border-white bg-white/15' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="text-xl mb-1">{v.emoji}</div>
                    <div className="font-semibold text-xs text-white">{v.label}</div>
                    <div className="text-[11px] text-white/50 leading-snug">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Operating Hours</label>
                <input type="text" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="10 AM - 10 PM daily" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Delivery Areas</label>
                <input type="text" value={deliveryAreas} onChange={(e) => setDeliveryAreas(e.target.value)} placeholder="All over Bangladesh" className={inputCls} />
              </div>
            </div>
          </form>
        </div>
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-[rgba(10,12,20,0.85)] to-transparent" />
      </div>
      <div className="flex items-center justify-between pt-3 shrink-0 mt-1">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button form="context-form" type="submit" disabled={!canContinue || loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </motion.div>
  );
}
