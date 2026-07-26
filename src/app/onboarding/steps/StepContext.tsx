'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, Check, Sparkles, AlertCircle, Clock, MapPin } from 'lucide-react';
import { saveOnboardingProfileAndTone, generateProfileFromFacebook } from '../../dashboard/actions';

const RETAIL_CATEGORIES = [
  'Fashion & Apparel', 'Electronics & Gadgets', 'Beauty & Cosmetics', 'Food & Bakery',
  'Home & Living', 'Jewelry & Accessories', 'Baby & Kids', 'Books & Stationery', 'Sports & Fitness',
];
const SERVICE_CATEGORIES = [
  'Clinic & Healthcare', 'Salon & Spa', 'Tutoring & Education', 'Consulting & Agency',
  'Event Management', 'Tech Support & Repair', 'Photography & Studio',
];
const RESTAURANT_CATEGORIES = [
  'Casual Dining', 'Fine Dining', 'Fast Food', 'Café & Bakery', 'Cloud Kitchen', 'Buffet',
];
const OPERATING_HOUR_PRESETS = ['24/7', '9:00 AM - 10:00 PM', '10:00 AM - 8:00 PM'];
const VIBE_OPTIONS = [
  { id: 'casual', label: 'Casual & Friendly', desc: 'Friendly, approachable — everyday conversational tone.' },
  { id: 'warm', label: 'Warm & Respectful', desc: 'Polite, formal — builds trust with traditional customers.' },
  { id: 'technical', label: 'Precise & Technical', desc: 'Detail-heavy, spec-focused — for technical products.' },
  { id: 'direct', label: 'Direct & Efficient', desc: 'No-nonsense, fast answers — great for high-volume shops.' },
];

interface Props {
  shop: any;
  onNext: () => void;
  onBack: () => void;
}

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
  const [operatingPreset, setOperatingPreset] = useState<string>(() => {
    if (!shop.operating_hours) return '24/7';
    if (OPERATING_HOUR_PRESETS.includes(shop.operating_hours)) return shop.operating_hours;
    return 'custom';
  });
  const [deliveryPreset, setDeliveryPreset] = useState<string>(() => {
    if (!shop.delivery_areas) return 'Nationwide';
    if (['Nationwide', 'Dhaka Only'].includes(shop.delivery_areas)) return shop.delivery_areas;
    return 'custom';
  });
  const [businessOverview, setBusinessOverview] = useState(shop.business_overview || '');
  const [vibe, setVibe] = useState<'casual' | 'warm' | 'technical' | 'direct'>(shop.tone_template || 'casual');
  const [fbPhoto, setFbPhoto] = useState<string | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Auto-fetch from Facebook Page on mount (graceful failure)
  useEffect(() => {
    if (!shop.meta_page_access_token) return;
    setFetching(true);
    generateProfileFromFacebook(shop.id)
      .then((res) => {
        if (res.success && res.profile) {
          const p = res.profile;
          if (p.name && !shopName) setShopName(p.name);
          if (p.category && !category) { setCategory(p.category); setCategorySearch(p.category); }
          if (p.business_overview && !businessOverview) setBusinessOverview(p.business_overview);
          if (p.tone_template) setVibe(p.tone_template as any);
          if ((res as any).fbData?.picture) setFbPhoto((res as any).fbData.picture);
          setGeneratedProfile(res.profile);
        }
      })
      .catch(() => { /* fail silently */ })
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const businessType = shop.business_type || 'retail';
  const referenceCategories = businessType === 'service' ? SERVICE_CATEGORIES : businessType === 'restaurant' ? RESTAURANT_CATEGORIES : RETAIL_CATEGORIES;
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return referenceCategories;
    return referenceCategories.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categorySearch, referenceCategories]);

  const renderBadge = (field: string) => {
    if (!generatedProfile?.confidence_flags) return null;
    const flag = generatedProfile.confidence_flags[field];
    if (flag === 'high') return <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold uppercase tracking-widest"><Check className="w-3 h-3" /> Auto-filled</span>;
    if (flag === 'inferred') return <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold uppercase tracking-widest"><Sparkles className="w-3 h-3" /> Inferred</span>;
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessOverview.trim()) return;
    setLoading(true);
    try {
      const res = await saveOnboardingProfileAndTone(shop.id, {
        name: shopName || 'My Store',
        category: category || categorySearch || 'General',
        operatingHours: operatingPreset,
        deliveryAreas: deliveryPreset,
        businessOverview,
        toneTemplate: vibe as any,
      });
      if (res.success) {
        onNext();
      } else {
        alert(res.error || 'Failed to save. Please try again.');
      }
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <motion.div
      key="step-context"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="flex flex-col"
    >
      <div className="mb-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-rust hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl text-ink font-light leading-tight mb-1 tracking-tight">
        Tell us about your business
      </h1>
      <p className="text-xs text-ash mb-5 leading-relaxed">
        {fetching ? (
          <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Checking your Facebook Page for details…</span>
        ) : generatedProfile ? (
          <span className="inline-flex items-center gap-1.5 text-green-700"><Sparkles className="w-3 h-3" /> Pre-filled from your Facebook Page — review and edit.</span>
        ) : (
          'Provide details about your brand and choose your AI agent\'s tone.'
        )}
      </p>

      {fbPhoto && (
        <div className="flex items-center gap-3 mb-5 p-3 bg-fog/50 rounded-inputs border border-dove/15">
          <img src={fbPhoto} alt="Page photo" className="w-12 h-12 rounded-full object-cover border border-dove/20 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-ink">{shopName || 'Your Page'}</p>
            <p className="text-[11px] text-ash">Profile photo from Facebook</p>
          </div>
          <button onClick={() => setFbPhoto(null)} className="ml-auto text-ash/50 hover:text-ash text-xs">Remove</button>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Overview */}
        <div className="bg-fog/50 p-4 rounded-cards border border-dove/15">
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Business Overview * {renderBadge('business_overview')}
          </label>
          <textarea
            rows={3}
            value={businessOverview}
            required
            onChange={(e) => setBusinessOverview(e.target.value)}
            placeholder="We are a family-run boutique specialising in..."
            className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink resize-none"
          />
          {!businessOverview && <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required — the AI uses this to answer questions</p>}
        </div>

        {/* Name + Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Business Name * {renderBadge('name')}</label>
            <input
              type="text"
              value={shopName}
              required
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Mango Boutique"
              className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink"
            />
          </div>
          <div className="relative" ref={categoryRef}>
            <label className="block text-xs font-semibold text-ink mb-1.5">Category * {renderBadge('category')}</label>
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => { setCategorySearch(e.target.value); setCategory(e.target.value); setIsCategoryOpen(true); }}
              onFocus={() => setIsCategoryOpen(true)}
              onBlur={() => setTimeout(() => setIsCategoryOpen(false), 150)}
              placeholder="Search or type your category…"
              className="w-full text-xs border border-dove/25 rounded-inputs px-3.5 py-2.5 bg-white focus:outline-none focus:border-ink"
            />
            {isCategoryOpen && filteredCategories.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-dove/20 rounded-inputs shadow-subtle max-h-44 overflow-y-auto p-1">
                {filteredCategories.map((c) => (
                  <button key={c} type="button" onMouseDown={() => { setCategory(c); setCategorySearch(c); setIsCategoryOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs rounded hover:bg-fog/60 flex items-center justify-between ${category === c ? 'text-rust font-semibold' : 'text-ink'}`}>
                    {c}{category === c && <Check className="w-3 h-3 text-rust" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operating Hours */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-rust" /> Operating Hours</label>
          <div className="flex flex-wrap gap-2">
            {[...OPERATING_HOUR_PRESETS, 'Custom'].map((p) => (
              <button key={p} type="button" onClick={() => setOperatingPreset(p === 'Custom' ? 'custom' : p)} className={`px-3 py-1.5 text-[11px] rounded-full border transition-all ${operatingPreset === (p === 'Custom' ? 'custom' : p) ? 'border-rust bg-apricot-wash text-rust font-semibold' : 'border-dove/25 bg-white text-ash hover:text-ink'}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Delivery Areas */}
        {businessType !== 'restaurant' && (
          <div>
            <label className="block text-xs font-semibold text-ink mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rust" /> Delivery Areas</label>
            <div className="flex flex-wrap gap-2">
              {['Nationwide', 'Dhaka Only', 'Custom'].map((p) => (
                <button key={p} type="button" onClick={() => setDeliveryPreset(p === 'Custom' ? 'custom' : p)} className={`px-3 py-1.5 text-[11px] rounded-full border transition-all ${deliveryPreset === (p === 'Custom' ? 'custom' : p) ? 'border-rust bg-apricot-wash text-rust font-semibold' : 'border-dove/25 bg-white text-ash hover:text-ink'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* Brand Vibe */}
        <div className="bg-fog/40 p-5 rounded-cards border border-dove/15">
          <label className="block text-xs font-semibold text-ink mb-3">Brand Tone & Voice {renderBadge('tone_template')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VIBE_OPTIONS.map((v) => (
              <button key={v.id} type="button" onClick={() => setVibe(v.id as any)} className={`p-3.5 rounded-inputs border text-left transition-all ${vibe === v.id ? 'border-2 border-rust bg-apricot-wash/60' : 'border-dove/20 bg-white hover:bg-fog/60'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-ink">{v.label}</span>
                  {vibe === v.id && <Check className="w-3 h-3 text-rust" />}
                </div>
                <span className="text-[11px] text-ash">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !businessOverview.trim()}
          className="w-full py-3.5 bg-ink text-white text-xs font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </motion.div>
  );
}
