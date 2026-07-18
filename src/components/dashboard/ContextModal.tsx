'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, BookOpen, Building2, Palette } from 'lucide-react';
import { saveOnboardingProfileAndTone } from '@/app/dashboard/actions';

const PERSONAS = [
  { id: 'casual', label: 'Casual & Easygoing', desc: 'Friendly, modern Bangla with English mix.' },
  { id: 'formal', label: 'Formal & Polite', desc: 'Rumi Apa Energy, traditional boutique style.' },
  { id: 'technical', label: 'Tech Explainer', desc: 'Detail-heavy, spec-focused (Imran vibe).' },
  { id: 'wholesale', label: 'Wholesale & Direct', desc: 'Negotiation-heavy, straight to the point.' },
];

const RETAIL_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Food', 'Home goods', 'Other'];
const SERVICE_CATEGORIES = ['Clinic', 'Salon', 'Tutoring', 'Consulting', 'Other'];
const WHOLESALE_CATEGORIES = ['Apparel', 'Electronics Component', 'FMCG', 'Industrial Supplies', 'Other'];

export default function ContextModal({
  shop,
  isOpen,
  onClose,
  onSaveSuccess,
}: {
  shop: any;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updatedShop: any) => void;
}) {
  const businessType = shop.business_type || 'retail';

  const [shopName, setShopName] = useState(shop.name || '');
  const [category, setCategory] = useState(shop.category || '');
  const [operatingHours, setOperatingHours] = useState(shop.operating_hours || '');
  const [deliveryAreas, setDeliveryAreas] = useState(shop.delivery_areas || '');
  const [businessOverview, setBusinessOverview] = useState(shop.business_overview || '');
  const [toneTemplate, setToneTemplate] = useState<'casual' | 'formal' | 'technical' | 'wholesale'>(
    shop.tone_template || 'casual'
  );
  const [isSaving, setIsSaving] = useState(false);

  const getCategories = () => {
    if (businessType === 'service') return SERVICE_CATEGORIES;
    if (businessType === 'wholesale') return WHOLESALE_CATEGORIES;
    return RETAIL_CATEGORIES;
  };
  const categories = getCategories();

  const handleSave = async () => {
    if (!businessOverview.trim()) {
      alert("Please fill in the Business Overview — it's the most important field for the AI.");
      return;
    }
    setIsSaving(true);
    const res = await saveOnboardingProfileAndTone(shop.id, {
      name: shopName,
      category,
      operatingHours,
      deliveryAreas,
      businessOverview,
      toneTemplate,
    });

    setIsSaving(false);

    if (res.success) {
      if (onSaveSuccess) {
        onSaveSuccess({
          ...shop,
          name: shopName,
          category,
          operating_hours: operatingHours,
          delivery_areas: deliveryAreas,
          business_overview: businessOverview,
          tone_template: toneTemplate,
          onboarding_steps_done: [
            ...(shop.onboarding_steps_done || []).filter((s: string) => s !== 'context_form'),
            'context_form',
          ],
        });
      }
      onClose();
    } else {
      alert(res.error || 'Failed to save context.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/45 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, x: '-50%', y: '-49%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.98, x: '-50%', y: '-49%' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 w-full max-w-[520px] bg-white rounded-cards shadow-xl border border-dove/20 z-50 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dove/10 shrink-0">
              <div>
                <h2 className="text-xl font-serif font-medium text-ink">Business Context</h2>
                <p className="text-sm text-ash mt-0.5">Tell DullBot what you sell and how to talk to customers.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-ash hover:bg-fog hover:text-ink rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-7">

              {/* Section 1 — Business Overview */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-apricot-wash flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-rust" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink">Business overview</h3>
                </div>
                <textarea
                  rows={3}
                  value={businessOverview}
                  onChange={(e) => setBusinessOverview(e.target.value)}
                  className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2.5 focus:outline-none focus:border-ink resize-none transition-colors"
                  placeholder="What do you sell or offer? Describe it like you'd tell a new employee."
                />
              </section>

              {/* Section 2 — Profile */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-fog flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-ink" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink">Profile</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ash mb-1">Business Name</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                      placeholder="e.g. Dull Store"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ash mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-ink transition-colors"
                    >
                      <option value="" disabled>Select category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ash mb-1">Operating Hours</label>
                    <input
                      type="text"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                      placeholder="e.g. 10am–8pm Sat–Thu"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ash mb-1">
                      {businessType === 'service' ? 'Service Area' : 'Delivery Areas'}
                    </label>
                    <input
                      type="text"
                      value={deliveryAreas}
                      onChange={(e) => setDeliveryAreas(e.target.value)}
                      className="w-full text-sm border border-dove/25 rounded-lg px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                      placeholder={
                        businessType === 'service'
                          ? 'e.g. Dhaka, Gulshan branch'
                          : 'e.g. Dhaka + nationwide courier'
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Section 3 — Brand & Tone */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-fog flex items-center justify-center">
                    <Palette className="w-3.5 h-3.5 text-ink" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink">Brand &amp; tone</h3>
                </div>

                {/* Horizontal persona row */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setToneTemplate(p.id as any)}
                      className={`shrink-0 w-[130px] p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        toneTemplate === p.id
                          ? 'border-rust bg-apricot-wash/50 ring-1 ring-rust/20'
                          : 'border-dove/20 hover:border-ink/40 bg-white'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-ink leading-tight">{p.label}</span>
                      <span className="text-[10px] text-ash leading-snug">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-dove/10 shrink-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-ink text-white text-sm font-semibold rounded-buttons hover:bg-black flex items-center justify-center gap-2 transition-colors shadow-subtle disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save and continue'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
